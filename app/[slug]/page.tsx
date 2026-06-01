'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import HollerLogo from '@/components/HollerLogo'
import ContactPrompt from '@/components/ContactPrompt'
import TipModal from '@/components/TipModal'
import { useRequesterContact } from '@/hooks/useRequesterContact'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Band = { id: string; name: string; slug: string; min_tip_cents: number; stripe_account_id: string | null; venmo_handle: string | null }
type Session = { id: string; venue_name: string | null; status: string }
type QueueRequest = {
  id: string
  title: string
  artist: string
  spotify_album_art_url: string | null
  status: 'pending' | 'accepted' | 'played' | 'rejected'
  tip_total: number
  tip_count: number
}
type SpotifyTrack = {
  id: string; title: string; artist: string; album: string; album_art: string | null
}
type Step = 'queue' | 'search' | 'confirm' | 'payment' | 'boost' | 'submitted'

export default function RequesterPage() {
  const params = useParams()
  const slug = params.slug as string
  const { contact, setContact, clearContact, loaded: contactLoaded } = useRequesterContact()

  const [band, setBand] = useState<Band | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [queue, setQueue] = useState<QueueRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('queue')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSong, setSelectedSong] = useState<SpotifyTrack | null>(null)
  const [freeTextMode, setFreeTextMode] = useState(false)
  const [freeTextTitle, setFreeTextTitle] = useState('')
  const [freeTextArtist, setFreeTextArtist] = useState('')
  const [boostingRequest, setBoostingRequest] = useState<QueueRequest | null>(null)

  const [showTipModal, setShowTipModal] = useState(false)
  const [tipAmount, setTipAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [trackingToken, setTrackingToken] = useState('')

  // Stripe payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const minTip = band ? band.min_tip_cents / 100 : 5

  const fetchQueue = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('requests')
      .select('id, title, artist, spotify_album_art_url, status, tips(amount_cents, status)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (data) {
      const merged = new Map<string, QueueRequest>()
      for (const r of data as any[]) {
        const key = `${r.title.toLowerCase()}||${r.artist.toLowerCase()}`
        const activeTips = (r.tips ?? []).filter((t: any) => t.status === 'held' || t.status === 'captured')
        const tipTotal = activeTips.reduce((s: number, t: any) => s + t.amount_cents, 0)
        if (merged.has(key)) {
          const ex = merged.get(key)!
          ex.tip_total += tipTotal
          ex.tip_count += activeTips.length
          const rank: Record<string, number> = { accepted: 3, pending: 2, played: 1, rejected: 0 }
          if ((rank[r.status] ?? 0) > (rank[ex.status] ?? 0)) { ex.status = r.status; ex.id = r.id }
        } else {
          merged.set(key, { id: r.id, title: r.title, artist: r.artist, spotify_album_art_url: r.spotify_album_art_url, status: r.status, tip_total: tipTotal, tip_count: activeTips.length })
        }
      }
      setQueue(Array.from(merged.values()))
    }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: bandData } = await supabase.from('bands').select('id, name, slug, min_tip_cents, stripe_account_id, venmo_handle').eq('slug', slug).single()
      if (!bandData) { setLoading(false); return }
      setBand(bandData)
      const { data: sessionData } = await supabase.from('sessions').select('id, venue_name, status').eq('band_id', bandData.id).eq('status', 'active').single()
      if (sessionData) { setSession(sessionData); await fetchQueue(sessionData.id) }
      setLoading(false)
    }
    load()
  }, [slug, fetchQueue])

  useEffect(() => {
    if (!session) return
    const channel = supabase.channel(`queue-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `session_id=eq.${session.id}` }, () => fetchQueue(session.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tips' }, () => fetchQueue(session.id))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session, fetchQueue])

  useEffect(() => {
    if (freeTextMode) return
    if (searchQuery.trim().length < 2) { setSearchResults([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/spotify-search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setSearchResults(data.tracks ?? [])
      } catch { setSearchResults([]) }
      setSearching(false)
    }, 350)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery, freeTextMode])

  function getDefaultTipAmounts() {
    const min = minTip
    return [...new Set([min, min * 2, min * 4].map(v => Math.ceil(v)))]
  }

  // Step 1: Create request + PaymentIntent, then show payment form
  async function handleProceedToPayment(isBoost = false) {
    if (!session || !band || !contact) return

    const finalAmount = tipAmount === null
      ? Math.round(parseFloat(customAmount) * 100)
      : tipAmount * 100

    if (!finalAmount || finalAmount < band.min_tip_cents) {
      setSubmitError(`Minimum tip is $${minTip}.`)
      return
    }

    setSubmitting(true)
    setSubmitError('')

    let requestId: string

    if (isBoost && boostingRequest) {
      requestId = boostingRequest.id
    } else {
      const title = freeTextMode ? freeTextTitle.trim() : selectedSong!.title
      const artist = freeTextMode ? freeTextArtist.trim() : selectedSong!.artist

      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .insert({
          session_id: session.id,
          title,
          artist,
          spotify_track_id: freeTextMode ? null : selectedSong!.id,
          spotify_album_art_url: freeTextMode ? null : selectedSong!.album_art,
          requester_email: contact.type === 'email' ? contact.value : null,
          requester_phone: contact.type === 'phone' ? contact.value : null,
          status: 'pending',
        })
        .select('id').single()

      if (requestError || !requestData) {
        setSubmitError('Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      requestId = requestData.id
    }

    setPendingRequestId(requestId)

    // If band has Stripe connected, create real PaymentIntent
    if (band.stripe_account_id) {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, amount_cents: finalAmount, band_id: band.id }),
      })
      const { client_secret, payment_intent_id, error } = await res.json()

      if (error || !client_secret) {
        setSubmitError('Payment setup failed. Please try again.')
        setSubmitting(false)
        return
      }

      setClientSecret(client_secret)
      setPaymentIntentId(payment_intent_id)
      setSubmitting(false)
      setStep('payment')
    } else {
      // No Stripe yet — save placeholder tip (pilot mode)
      await savePlaceholderTip(requestId, finalAmount)
    }
  }

  async function savePlaceholderTip(requestId: string, amountCents: number) {
    if (!contact) return
    const token = crypto.randomUUID()
    await supabase.from('tips').insert({
      request_id: requestId,
      amount_cents: amountCents,
      requester_email: contact.type === 'email' ? contact.value : null,
      requester_phone: contact.type === 'phone' ? contact.value : null,
      stripe_payment_intent_id: `placeholder_${token}`,
      tracking_token: token,
      status: 'held',
    })
    setTrackingToken(token)
    setStep('submitted')
    setSubmitting(false)
  }

  // Called by Stripe PaymentElement after card is confirmed
  async function handlePaymentSuccess(paymentIntentId: string) {
    if (!contact || !pendingRequestId) return

    const finalAmount = tipAmount === null
      ? Math.round(parseFloat(customAmount) * 100)
      : tipAmount * 100

    const token = crypto.randomUUID()
    await supabase.from('tips').insert({
      request_id: pendingRequestId,
      amount_cents: finalAmount,
      requester_email: contact.type === 'email' ? contact.value : null,
      requester_phone: contact.type === 'phone' ? contact.value : null,
      stripe_payment_intent_id: paymentIntentId,
      tracking_token: token,
      status: 'held',
    })
    setTrackingToken(token)
    setStep('submitted')
  }

  function handleBoost(req: QueueRequest) {
    setBoostingRequest(req)
    setTipAmount(minTip)
    setCustomAmount('')
    setSubmitError('')
    setStep('boost')
  }

  function resetRequest() {
    setStep('queue')
    setSelectedSong(null)
    setBoostingRequest(null)
    setFreeTextMode(false)
    setFreeTextTitle('')
    setFreeTextArtist('')
    setSearchQuery('')
    setTipAmount(null)
    setCustomAmount('')
    setSubmitError('')
    setClientSecret(null)
    setPaymentIntentId(null)
    setPendingRequestId(null)
  }

  if (!contactLoaded || loading) {
    return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p className="label">Loading...</p></main>
  }

  if (!band) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p className="label" style={{ marginBottom: '12px' }}>Artist not found</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Check the link and try again.</p>
        </div>
      </main>
    )
  }

  if (!contact) return <ContactPrompt onConfirm={(value, type) => setContact({ value, type })} />

  if (!session) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}><HollerLogo variant="wordmark" size={40} /></div>
          <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>{band.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8' }}>No active session right now. Check back when the music starts.</p>
        </div>
      </main>
    )
  }

  const tipAmounts = getDefaultTipAmounts()
  const pendingQueue = queue.filter(r => r.status === 'pending')
  const acceptedQueue = queue.filter(r => r.status === 'accepted')
  const playedQueue = queue.filter(r => r.status === 'played')

  function TipPicker() {
    return (
      <div style={{ marginBottom: '24px' }}>
        <p className="label" style={{ marginBottom: '12px' }}>How much?</p>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tipAmounts.length + 1}, 1fr)`, gap: '8px', marginBottom: '12px' }}>
          {tipAmounts.map(amt => (
            <button key={amt} onClick={() => { setTipAmount(amt); setCustomAmount('') }}
              style={{ background: tipAmount === amt ? 'var(--accent)' : 'var(--bg-raised)', border: `1px solid ${tipAmount === amt ? 'var(--accent)' : 'var(--border-warm)'}`, color: tipAmount === amt ? '#221a0a' : 'var(--text)', fontFamily: "'Teko', sans-serif", fontSize: '20px', fontWeight: 500, padding: '12px 8px', cursor: 'pointer', transition: 'all 0.1s' }}>
              ${amt}
            </button>
          ))}
          <button onClick={() => { setTipAmount(null); setCustomAmount('') }}
            style={{ background: tipAmount === null ? 'var(--accent)' : 'var(--bg-raised)', border: `1px solid ${tipAmount === null ? 'var(--accent)' : 'var(--border-warm)'}`, color: tipAmount === null ? '#221a0a' : 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.08em', padding: '12px 4px', cursor: 'pointer', transition: 'all 0.1s' }}>
            OTHER
          </button>
        </div>
        {tipAmount === null && (
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '15px' }}>$</span>
            <input className="input" type="number" min={minTip} step="1" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder={String(minTip)} style={{ paddingLeft: '28px' }} autoFocus />
          </div>
        )}
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Minimum ${minTip}. Only charged if the song gets played.
        </p>
      </div>
    )
  }

  // ── PAYMENT STEP ──────────────────────────────────────────
  if (step === 'payment' && clientSecret) {
    const stripeOptions = {
      clientSecret,
      appearance: {
        theme: 'night' as const,
        variables: {
          colorBackground: '#2e2210',
          colorText: '#f2ead8',
          colorPrimary: '#d4882a',
          colorDanger: '#c04040',
          fontFamily: 'IBM Plex Mono, monospace',
          borderRadius: '0px',
          colorInputBackground: '#2a2010',
          colorInputBorder: '#524020',
        },
      },
      paymentMethodTypes: ['card'],
    }

    return (
      <main style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '480px', margin: '0 auto' }}>
        <button onClick={() => setStep('confirm')} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '28px', padding: 0 }}>
          ← Back
        </button>

        <h2 style={{ fontSize: '22px', marginBottom: '24px' }}>Payment details</h2>

        <Elements stripe={stripePromise} options={stripeOptions}>
          <PaymentForm
            onSuccess={handlePaymentSuccess}
            onError={(msg) => setSubmitError(msg)}
            amount={tipAmount === null ? Math.round(parseFloat(customAmount) * 100) : tipAmount * 100}
            minTip={minTip}
          />
        </Elements>

        <ContactFooter contact={contact.value} onClear={clearContact} />
      </main>
    )
  }

  // ── SUBMITTED ──────────────────────────────────────────────
  if (step === 'submitted') {
    const songTitle = boostingRequest?.title ?? (freeTextMode ? freeTextTitle : selectedSong?.title)
    const songArtist = boostingRequest?.artist ?? (freeTextMode ? freeTextArtist : selectedSong?.artist)

    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div className="card-ornate" style={{ padding: '40px 32px' }}>
            <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
            <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
            <p className="label-accent" style={{ marginBottom: '16px' }}>{boostingRequest ? 'Tip added' : 'Request sent'}</p>
            <h2 style={{ fontSize: '26px', marginBottom: '8px' }}>{songTitle}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>{songArtist}</p>
            <div className="star-divider" style={{ marginBottom: '24px' }}><span style={{ color: 'var(--star)' }}>✦</span></div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8', marginBottom: '24px' }}>
              Your tip is held until the song is played. No play = full refund.
            </p>
            <a href={`/track/${trackingToken}`} style={{ display: 'block', padding: '12px', background: 'var(--accent-pale)', border: '1px solid var(--accent-dim)', color: 'var(--accent)', fontSize: '12px', letterSpacing: '0.08em', textDecoration: 'none', marginBottom: '12px' }}>
              Track your request →
            </a>
            <button onClick={resetRequest} className="btn-ghost" style={{ width: '100%', fontSize: '11px' }}>← Back to queue</button>
          </div>
        </div>
      </main>
    )
  }

  // ── BOOST ──────────────────────────────────────────────────
  if (step === 'boost' && boostingRequest) {
    return (
      <main style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '480px', margin: '0 auto' }}>
        <button onClick={resetRequest} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '28px', padding: 0 }}>← Back</button>
        <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>Add to this request</h2>
        <div className="card" style={{ marginBottom: '24px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          {boostingRequest.spotify_album_art_url && <img src={boostingRequest.spotify_album_art_url} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', flexShrink: 0 }} />}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{boostingRequest.title}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{boostingRequest.artist}</p>
            {boostingRequest.tip_total > 0 && <p style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>${(boostingRequest.tip_total / 100).toFixed(0)} already in the pool</p>}
          </div>
        </div>
        <TipPicker />
        {submitError && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{submitError}</p>}
        <button className="btn-primary" style={{ width: '100%', opacity: submitting ? 0.6 : 1 }} onClick={() => handleProceedToPayment(true)} disabled={submitting}>
          {submitting ? 'Setting up...' : 'Continue →'}
        </button>
        <ContactFooter contact={contact.value} onClear={clearContact} />
      </main>
    )
  }

  // ── CONFIRM ────────────────────────────────────────────────
  if (step === 'confirm') {
    const song = freeTextMode ? { title: freeTextTitle, artist: freeTextArtist, album_art: null } : selectedSong!
    const rejectedMatch = queue.find(r => r.status === 'rejected' && r.title.toLowerCase() === song.title.toLowerCase() && r.artist.toLowerCase() === song.artist.toLowerCase())
    const existingActive = queue.find(r => r.status !== 'rejected' && r.title.toLowerCase() === song.title.toLowerCase() && r.artist.toLowerCase() === song.artist.toLowerCase())

    return (
      <main style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '480px', margin: '0 auto' }}>
        <button onClick={() => setStep('search')} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '28px', padding: 0 }}>← Change song</button>
        <div className="card" style={{ marginBottom: '20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          {song.album_art && <img src={song.album_art} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', flexShrink: 0 }} />}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</p>
          </div>
        </div>
        {rejectedMatch && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', background: 'var(--bg-raised)', border: '1px solid var(--border-warm)' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7' }}>The artist passed on this song earlier. You can still request it.</p>
          </div>
        )}
        {existingActive && existingActive.tip_total > 0 && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', background: 'var(--accent-pale)', border: '1px solid var(--accent-dim)' }}>
            <p style={{ fontSize: '13px', color: 'var(--accent)', lineHeight: '1.7' }}>
              {existingActive.tip_count} {existingActive.tip_count === 1 ? 'person has' : 'people have'} already tipped <strong>${(existingActive.tip_total / 100).toFixed(0)}</strong> for this song.
            </p>
          </div>
        )}
        <TipPicker />
        {submitError && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{submitError}</p>}
        <button className="btn-primary" style={{ width: '100%', opacity: submitting ? 0.6 : 1 }} onClick={() => handleProceedToPayment(false)} disabled={submitting}>
          {submitting ? 'Setting up...' : 'Continue →'}
        </button>
        <ContactFooter contact={contact.value} onClear={clearContact} />
      </main>
    )
  }

  // ── SEARCH ────────────────────────────────────────────────
  if (step === 'search') {
    return (
      <main style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '480px', margin: '0 auto' }}>
        <button onClick={() => setStep('queue')} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '28px', padding: 0 }}>← Back</button>
        <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>What do you want to hear?</h2>
        {!freeTextMode ? (
          <>
            <input className="input" type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search for a song..." autoFocus style={{ marginBottom: '12px' }} />
            {searching && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Searching...</p>}
            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                {searchResults.map(track => (
                  <button key={track.id} onClick={() => { setSelectedSong(track); setTipAmount(minTip); setStep('confirm') }}
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-warm)', color: 'var(--text)', padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left', width: '100%', transition: 'border-color 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-warm)')}>
                    {track.album_art && <img src={track.album_art} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '14px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist} · {track.album}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setFreeTextMode(true)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0, textDecoration: 'underline' }}>Can't find it? Enter manually</button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Song title</label>
              <input className="input" type="text" value={freeTextTitle} onChange={e => setFreeTextTitle(e.target.value)} placeholder="e.g. Brown Eyed Girl" autoFocus />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Artist</label>
              <input className="input" type="text" value={freeTextArtist} onChange={e => setFreeTextArtist(e.target.value)} placeholder="e.g. Van Morrison" />
            </div>
            <button onClick={() => { if (freeTextTitle.trim() && freeTextArtist.trim()) { setTipAmount(minTip); setStep('confirm') } }} className="btn-primary" style={{ width: '100%', marginBottom: '12px' }} disabled={!freeTextTitle.trim() || !freeTextArtist.trim()}>
              Use this song →
            </button>
            <button onClick={() => setFreeTextMode(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0, textDecoration: 'underline' }}>Back to search</button>
          </>
        )}
      </main>
    )
  }

  // ── QUEUE ─────────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <HollerLogo variant="wordmark" size={36} />
          <button onClick={clearContact} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', padding: 0 }}>
            Not {contact.value.includes('@') ? contact.value.split('@')[0] : contact.value.slice(-4)}?
          </button>
        </div>
        <h2 style={{ fontSize: '22px', marginBottom: '4px' }}>{band.name}</h2>
        {session.venue_name && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{session.venue_name}</p>}
      </div>

      {showTipModal && (
        <TipModal
          bandId={band.id}
          bandName={band.name}
          venmoHandle={(band as any).venmo_handle ?? null}
          minTip={minTip}
          onClose={() => setShowTipModal(false)}
        />
      )}

      <button className="btn-primary" style={{ width: '100%', marginBottom: '12px', fontSize: '18px', padding: '14px' }} onClick={() => setStep('search')}>
        Request a song →
      </button>
      <button
        className="btn-ghost"
        style={{ width: '100%', marginBottom: '28px', fontSize: '13px' }}
        onClick={() => setShowTipModal(true)}
      >
        Tip the artist
      </button>

      {acceptedQueue.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <p className="label-accent" style={{ marginBottom: '12px' }}>Up next</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {acceptedQueue.map(req => <RequestRow key={req.id} req={req} onBoost={() => handleBoost(req)} showBoost />)}
          </div>
        </div>
      )}

      {pendingQueue.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <p className="label" style={{ marginBottom: '12px' }}>In the queue</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingQueue.map(req => <RequestRow key={req.id} req={req} onBoost={() => handleBoost(req)} showBoost />)}
          </div>
        </div>
      )}

      {acceptedQueue.length === 0 && pendingQueue.length === 0 && (
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8' }}>No requests yet — be the first.</p>
        </div>
      )}

      {playedQueue.length > 0 && (
        <div>
          <p className="label" style={{ marginBottom: '12px' }}>Played tonight</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {playedQueue.map(req => <RequestRow key={req.id} req={req} showBoost={false} />)}
          </div>
        </div>
      )}
    </main>
  )
}

function PaymentForm({ onSuccess, onError, amount, minTip }: {
  onSuccess: (paymentIntentId: string) => void
  onError: (msg: string) => void
  amount: number
  minTip: number
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (error) {
      onError(error.message ?? 'Payment failed. Please try again.')
      setProcessing(false)
    } else if (paymentIntent) {
      onSuccess(paymentIntent.id)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '24px' }}>
        <PaymentElement options={{
          layout: {
            type: 'accordion',
            defaultCollapsed: false,
          },
          paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
        }} />
      </div>
      <button type="submit" className="btn-primary" style={{ width: '100%', opacity: processing ? 0.6 : 1 }} disabled={processing || !stripe}>
        {processing ? 'Processing...' : `Hold $${(amount / 100).toFixed(0)} →`}
      </button>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center', lineHeight: '1.7' }}>
        Your card is authorized but not charged until the song is played.
      </p>
    </form>
  )
}

function RequestRow({ req, onBoost, showBoost }: { req: QueueRequest; onBoost?: () => void; showBoost: boolean }) {
  return (
    <div className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', opacity: req.status === 'played' ? 0.55 : 1 }}>
      <div style={{ minWidth: 0, flex: 1, display: 'flex', gap: '10px', alignItems: 'center' }}>
        {req.spotify_album_art_url && <img src={req.spotify_album_art_url} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '14px', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.artist}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {req.tip_total > 0 && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '15px', color: 'var(--accent)', fontFamily: "'Teko', sans-serif", lineHeight: 1 }}>${(req.tip_total / 100).toFixed(0)}</p>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>{req.tip_count} {req.tip_count === 1 ? 'tip' : 'tips'}</p>
          </div>
        )}
        {showBoost && onBoost && (
          <button onClick={onBoost} style={{ background: 'var(--accent-pale)', border: '1px solid var(--accent-dim)', color: 'var(--accent)', fontFamily: "'Teko', sans-serif", fontSize: '15px', fontWeight: 500, padding: '6px 10px', cursor: 'pointer', letterSpacing: '0.04em', flexShrink: 0 }}>
            + Boost
          </button>
        )}
        {req.status === 'played' && <span style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Played</span>}
      </div>
    </div>
  )
}

function ContactFooter({ contact, onClear }: { contact: string; onClear: () => void }) {
  return (
    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px', textAlign: 'center', lineHeight: '1.7' }}>
      Receipt to {contact} ·{' '}
      <button onClick={onClear} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: 0, textDecoration: 'underline' }}>Not you?</button>
    </p>
  )
}
