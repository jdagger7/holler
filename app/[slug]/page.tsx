'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import HollerLogo from '@/components/HollerLogo'
import ContactPrompt from '@/components/ContactPrompt'
import { useRequesterContact } from '@/hooks/useRequesterContact'
import TipModal from '@/components/TipModal'
import NavWordmark from '@/components/NavWordmark'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
const F = "'Arvo', serif"

type Band = { id: string; name: string; slug: string; min_tip_cents: number; stripe_account_id: string | null; venmo_handle: string | null }
type Session = { id: string; venue_name: string | null; status: string; started_at: string }
type QueueRequest = { id: string; title: string; artist: string; spotify_album_art_url: string | null; status: string; tip_total: number; tip_count: number }
type SpotifyTrack = { id: string; title: string; artist: string; album: string; album_art: string | null }
type Step = 'queue' | 'search' | 'confirm' | 'boost' | 'submitted'

// ── Confirm + Payment — single progressive screen ─────────────────
function ConfirmScreen({
  song, band, session, contact, contactDisplay, onBack, onClearContact, onSuccess, isBoost, boostRequest
}: {
  song: SpotifyTrack | { title: string; artist: string; album_art: null }
  band: Band; session: Session
  contact: { value: string; type: 'email' | 'phone' }
  contactDisplay: string
  onBack: () => void
  onClearContact: () => void
  onSuccess: (token: string) => void
  isBoost: boolean
  boostRequest: QueueRequest | null
}) {
  const minTip = band.min_tip_cents / 100
  const tipOptions = [...new Set([minTip, minTip * 2, minTip * 4].map(v => Math.ceil(v)))]

  const [tipAmount, setTipAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const [loadingIntent, setLoadingIntent] = useState(false)
  const [error, setError] = useState('')

  const finalAmountCents = tipAmount !== null
    ? tipAmount * 100
    : Math.round(parseFloat(customAmount || '0') * 100)

  // When a tip amount is selected, immediately create the PaymentIntent
  async function handleSelectTip(amt: number | null) {
    setTipAmount(amt)
    setCustomAmount('')
    setClientSecret(null)
    setPendingRequestId(null)
    setError('')

    // Don't load until we have a real amount
    if (amt === null) return

    const amountCents = amt * 100
    await setupPaymentIntent(amountCents)
  }

  async function handleCustomAmountBlur() {
    const amountCents = Math.round(parseFloat(customAmount || '0') * 100)
    if (amountCents < band.min_tip_cents) return
    setClientSecret(null)
    setPendingRequestId(null)
    await setupPaymentIntent(amountCents)
  }

  async function setupPaymentIntent(amountCents: number) {
    if (!band.stripe_account_id) return
    setLoadingIntent(true)
    setError('')
    try {
      const body: any = {
        band_id: band.id,
        amount_cents: amountCents,
        session_id: session.id,
        requester_email: contact.type === 'email' ? contact.value : null,
        requester_phone: contact.type === 'phone' ? contact.value : null,
        title: isBoost && boostRequest ? boostRequest.title : song.title,
        artist: isBoost && boostRequest ? boostRequest.artist : song.artist,
        spotify_album_art_url: isBoost && boostRequest ? boostRequest.spotify_album_art_url : (song as SpotifyTrack).album_art ?? null,
        spotify_track_id: (!isBoost && (song as SpotifyTrack).id) ? (song as SpotifyTrack).id : null,
      }
      if (isBoost && boostRequest) body.existing_request_id = boostRequest.id

      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.error || !data.client_secret) {
        setError('Payment setup failed. Try again.')
        setLoadingIntent(false)
        return
      }
      setClientSecret(data.client_secret)
      setPendingRequestId(data.request_id)
    } catch {
      setError('Payment setup failed. Try again.')
    }
    setLoadingIntent(false)
  }

  async function handlePaymentSuccess(paymentIntentId: string) {
    if (!pendingRequestId) return
    const token = crypto.randomUUID()
    await supabase.from('requests').update({ status: 'pending' }).eq('id', pendingRequestId)
    await supabase.from('tips').insert({
      request_id: pendingRequestId, amount_cents: finalAmountCents,
      requester_email: contact.type === 'email' ? contact.value : null,
      requester_phone: contact.type === 'phone' ? contact.value : null,
      stripe_payment_intent_id: paymentIntentId, tracking_token: token, status: 'held',
    })
    onSuccess(token)
  }

  async function handlePaymentAbandoned() {
    if (pendingRequestId) {
      await supabase.from('requests').delete().eq('id', pendingRequestId).eq('status', 'pending_payment')
    }
  }

  const stripeOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorBackground: '#1e1508',
        colorText: '#f5eed8',
        colorPrimary: '#e09030',
        colorDanger: '#c04040',
        fontFamily: 'Arvo, serif',
        borderRadius: '0px',
        colorInputBackground: '#120d04',
        colorInputBorder: '#6b4e20',
        spacingUnit: '5px',
      },
      rules: {
        '.Tab': { border: '1px solid #6b4e20', padding: '10px 16px', fontFamily: 'Arvo, serif' },
        '.Tab--selected': { border: '1px solid #e09030', color: '#e09030' },
        '.Tab:hover': { border: '1px solid #a07830' },
        '.Label': { fontFamily: 'Arvo, serif', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8a870' },
        '.Input': { fontFamily: 'Arvo, serif', fontSize: '16px', padding: '12px 14px' },
      }
    }
  } : null

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border-warm)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => { handlePaymentAbandoned(); onBack() }}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: F, fontSize: '14px', padding: 0, flexShrink: 0 }}>
          ←
        </button>
        <p style={{ fontFamily: F, fontSize: '16px', fontWeight: 700 }}>
          {isBoost ? 'Boost this request' : 'Request a song'}
        </p>
      </div>

      <div style={{ flex: 1, padding: '20px' }}>

        {/* Song card */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-warm)', marginBottom: '24px' }}>
          {(song as SpotifyTrack).album_art || (isBoost && boostRequest?.spotify_album_art_url)
            ? <img src={(isBoost && boostRequest?.spotify_album_art_url) || (song as SpotifyTrack).album_art!} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: '52px', height: '52px', background: 'var(--bg)', flexShrink: 0, border: '1px solid var(--border)' }} />
          }
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: F, fontSize: '17px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
              {isBoost && boostRequest ? boostRequest.title : song.title}
            </p>
            <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isBoost && boostRequest ? boostRequest.artist : song.artist}
            </p>
            {isBoost && boostRequest && boostRequest.tip_total > 0 && (
              <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--accent)', marginTop: '3px' }}>
                ${(boostRequest.tip_total / 100).toFixed(0)} already tipped
              </p>
            )}
          </div>
        </div>

        {/* Tip selector */}
        <div style={{ marginBottom: tipAmount !== null || customAmount ? '24px' : '0' }}>
          <p className="label" style={{ marginBottom: '10px' }}>
            {isBoost ? 'Add to the tip' : 'How much to tip?'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tipOptions.length + 1}, 1fr)`, gap: '8px' }}>
            {tipOptions.map(amt => (
              <button key={amt} onClick={() => handleSelectTip(amt)}
                style={{
                  background: tipAmount === amt ? 'var(--accent)' : 'var(--bg-card)',
                  border: `1px solid ${tipAmount === amt ? 'var(--accent)' : 'var(--border-warm)'}`,
                  color: tipAmount === amt ? '#120d04' : 'var(--text)',
                  fontFamily: "'Teko', sans-serif", fontSize: '24px', fontWeight: 600,
                  padding: '14px 4px', cursor: 'pointer',
                  transition: 'background 0.1s, border-color 0.1s',
                }}>
                ${amt}
              </button>
            ))}
            <button onClick={() => { setTipAmount(null); setCustomAmount(''); setClientSecret(null); setPendingRequestId(null) }}
              style={{
                background: tipAmount === null && customAmount !== '' ? 'var(--accent)' : 'var(--bg-card)',
                border: `1px solid ${tipAmount === null && customAmount !== '' ? 'var(--accent)' : 'var(--border-warm)'}`,
                color: tipAmount === null && customAmount !== '' ? '#120d04' : 'var(--text-muted)',
                fontFamily: F, fontSize: '11px', letterSpacing: '0.08em',
                padding: '14px 4px', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 700,
              }}>
              Other
            </button>
          </div>

          {/* Custom amount input */}
          {tipAmount === null && (
            <div style={{ position: 'relative', marginTop: '10px' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: F, fontSize: '17px' }}>$</span>
              <input className="input" type="number" min={minTip} step="1"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setClientSecret(null) }}
                onBlur={handleCustomAmountBlur}
                placeholder={String(minTip)}
                style={{ paddingLeft: '30px' }}
                autoFocus
              />
            </div>
          )}

          <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px', lineHeight: 1.5 }}>
            Minimum ${minTip} · Only charged if the song gets played
          </p>
        </div>

        {/* Payment section — appears after tip selected */}
        {(tipAmount !== null || (customAmount && parseFloat(customAmount) >= minTip)) && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            {loadingIntent && (
              <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Setting up payment...
              </p>
            )}

            {error && (
              <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--danger)', marginBottom: '16px' }}>{error}</p>
            )}

            {!band.stripe_account_id && (
              <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                This artist hasn't connected Stripe yet — tip will be recorded without payment.
              </p>
            )}

            {clientSecret && stripeOptions && (
              <Elements stripe={stripePromise} options={stripeOptions}>
                <PaymentForm
                  onSuccess={handlePaymentSuccess}
                  onError={setError}
                  amount={finalAmountCents}
                />
              </Elements>
            )}
          </div>
        )}

        {/* Contact line */}
        <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-dim)', marginTop: '16px', textAlign: 'center' }}>
          Receipt to {contactDisplay}.{' '}
          <button onClick={onClearContact} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: F, fontSize: '12px', padding: 0, textDecoration: 'underline' }}>
            Not you?
          </button>
        </p>
      </div>
    </main>
  )
}

function PaymentForm({ onSuccess, onError, amount }: {
  onSuccess: (id: string) => void
  onError: (m: string) => void
  amount: number
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
    if (error) { onError(error.message ?? 'Payment failed.'); setProcessing(false) }
    else if (paymentIntent) onSuccess(paymentIntent.id)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <PaymentElement options={{
          layout: { type: 'tabs', defaultCollapsed: false },
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }} />
      </div>
      <button type="submit" className="btn-primary"
        style={{ opacity: processing || !stripe ? 0.6 : 1, fontSize: '20px', padding: '14px' }}
        disabled={processing || !stripe}>
        {processing ? 'Processing...' : `Hold $${(amount / 100).toFixed(0)}`}
      </button>
    </form>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function RequesterPage() {
  const params = useParams()
  const slug = params.slug as string
  const { contact, setContact, clearContact, loaded: contactLoaded } = useRequesterContact()

  const [band, setBand] = useState<Band | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [queue, setQueue] = useState<QueueRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('queue')
  const [showTipModal, setShowTipModal] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSong, setSelectedSong] = useState<SpotifyTrack | null>(null)
  const [freeTextMode, setFreeTextMode] = useState(false)
  const [freeTextTitle, setFreeTextTitle] = useState('')
  const [freeTextArtist, setFreeTextArtist] = useState('')
  const [boostingRequest, setBoostingRequest] = useState<QueueRequest | null>(null)
  const [trackingToken, setTrackingToken] = useState('')

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const fetchQueue = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('requests')
      .select('id, title, artist, spotify_album_art_url, status, tips(amount_cents, status)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (data) {
      const merged = new Map<string, QueueRequest>()
      for (const r of data as any[]) {
        if (r.status === 'pending_payment') continue
        const key = `${r.title.toLowerCase()}||${r.artist.toLowerCase()}`
        const activeTips = (r.tips ?? []).filter((t: any) => t.status === 'held' || t.status === 'captured')
        const tipTotal = activeTips.reduce((s: number, t: any) => s + t.amount_cents, 0)
        if (merged.has(key)) {
          const ex = merged.get(key)!
          ex.tip_total += tipTotal; ex.tip_count += activeTips.length
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
      const { data: sessionData } = await supabase.from('sessions').select('id, venue_name, status, started_at').eq('band_id', bandData.id).eq('status', 'active').single()
      if (sessionData) { setSession(sessionData); await fetchQueue(sessionData.id) }
      setLoading(false)
    }
    load()
  }, [slug, fetchQueue])

  useEffect(() => {
    if (!session) return
    const ch = supabase.channel(`queue-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `session_id=eq.${session.id}` }, () => fetchQueue(session.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tips' }, () => fetchQueue(session.id))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [session, fetchQueue])

  useEffect(() => {
    if (step === 'search') setTimeout(() => searchInputRef.current?.focus(), 100)
  }, [step])

  useEffect(() => {
    if (freeTextMode || step !== 'search') return
    if (searchQuery.trim().length < 2) { setSearchResults([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/spotify-search?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults((await res.json()).tracks ?? [])
      } catch { setSearchResults([]) }
      setSearching(false)
    }, 350)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery, freeTextMode, step])

  function handleBoost(req: QueueRequest) {
    setBoostingRequest(req); setStep('confirm')
  }

  function reset() {
    setStep('queue'); setSelectedSong(null); setBoostingRequest(null)
    setFreeTextMode(false); setFreeTextTitle(''); setFreeTextArtist('')
    setSearchQuery(''); setSearchResults([]); setTrackingToken('')
  }

  const contactDisplay = contact
    ? contact.type === 'email' ? contact.value.split('@')[0] : `···${contact.value.slice(-4)}`
    : ''

  if (!contactLoaded || loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="label">Loading...</p>
    </main>
  )
  if (!band) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <p style={{ fontFamily: F, color: 'var(--text-muted)' }}>Artist not found.</p>
    </main>
  )
  if (!contact) return <ContactPrompt onConfirm={(value, type) => setContact({ value, type })} />
  if (!session) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div>
        <HollerLogo variant="wordmark" size={40} />
        <h2 style={{ fontSize: '22px', margin: '16px 0 8px' }}>{band.name}</h2>
        <p style={{ fontFamily: F, color: 'var(--text-muted)', fontSize: '15px' }}>No open session right now.</p>
      </div>
    </main>
  )

  // ── SUBMITTED ──
  if (step === 'submitted') {
    const title = boostingRequest?.title ?? (freeTextMode ? freeTextTitle : selectedSong?.title)
    const artist = boostingRequest?.artist ?? (freeTextMode ? freeTextArtist : selectedSong?.artist)
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center' }}>
        <p className="label-accent" style={{ marginBottom: '24px' }}>Request sent</p>
        <h2 style={{ fontSize: '30px', marginBottom: '6px' }}>{title}</h2>
        <p style={{ fontFamily: F, color: 'var(--text-muted)', fontSize: '16px', marginBottom: '40px' }}>{artist}</p>
        <a href={`/track/${trackingToken}`} style={{ display: 'block', width: '100%', maxWidth: '360px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-warm)', color: 'var(--accent)', fontFamily: F, fontSize: '15px', textDecoration: 'none', marginBottom: '12px', textAlign: 'center' }}>
          Track your request
        </a>
        <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: F, fontSize: '14px', padding: '8px' }}>
          Request another song
        </button>
      </main>
    )
  }

  // ── CONFIRM (new unified screen) ──
  if (step === 'confirm') {
    const song = boostingRequest
      ? { title: boostingRequest.title, artist: boostingRequest.artist, album_art: boostingRequest.spotify_album_art_url }
      : freeTextMode
      ? { title: freeTextTitle, artist: freeTextArtist, album_art: null }
      : selectedSong!

    return (
      <ConfirmScreen
        song={song as any}
        band={band}
        session={session}
        contact={contact}
        contactDisplay={contactDisplay}
        onBack={() => setStep(boostingRequest ? 'queue' : 'search')}
        onClearContact={clearContact}
        onSuccess={token => { setTrackingToken(token); setStep('submitted') }}
        isBoost={!!boostingRequest}
        boostRequest={boostingRequest}
      />
    )
  }

  // ── SEARCH ──
  if (step === 'search') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'var(--bg-raised)', borderBottom: '2px solid var(--accent)', padding: '14px 20px' }}>
          <button onClick={() => setStep('queue')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: F, fontSize: '14px', padding: '0 0 10px', display: 'block' }}>
            ← Back
          </button>
          {!freeTextMode ? (
            <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search for a song..."
              style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: F, fontSize: '22px', padding: '4px 0' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input className="input" type="text" value={freeTextTitle} onChange={e => setFreeTextTitle(e.target.value)} placeholder="Song title" autoFocus />
              <input className="input" type="text" value={freeTextArtist} onChange={e => setFreeTextArtist(e.target.value)} placeholder="Artist" />
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {!freeTextMode ? (
            <>
              {searching && <p style={{ padding: '16px 20px', fontFamily: F, color: 'var(--text-muted)', fontSize: '14px' }}>Searching...</p>}
              {!searching && searchQuery.length > 1 && searchResults.length === 0 && (
                <p style={{ padding: '16px 20px', fontFamily: F, color: 'var(--text-muted)', fontSize: '14px' }}>No results. Try typing it in below.</p>
              )}
              {searchResults.map(track => (
                <button key={track.id} onClick={() => { setSelectedSong(track); setStep('confirm') }}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', padding: '13px 20px', display: 'flex', gap: '14px', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
                  {track.album_art && <img src={track.album_art} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: F, fontSize: '16px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{track.title}</p>
                    <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</p>
                  </div>
                </button>
              ))}
              <div style={{ padding: '20px', textAlign: 'center', borderTop: searchResults.length > 0 ? '1px solid var(--border)' : 'none' }}>
                <button onClick={() => setFreeTextMode(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: F, fontSize: '14px', textDecoration: 'underline' }}>
                  Not finding it? Type it in
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn-primary" onClick={() => { if (freeTextTitle.trim() && freeTextArtist.trim()) setStep('confirm') }} disabled={!freeTextTitle.trim() || !freeTextArtist.trim()}>
                Use this song
              </button>
              <button onClick={() => { setFreeTextMode(false); setFreeTextTitle(''); setFreeTextArtist('') }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: F, fontSize: '14px', textDecoration: 'underline', padding: '8px' }}>
                Back to search
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  // ── QUEUE ──
  const accepted = queue.filter(r => r.status === 'accepted')
  const pending = queue.filter(r => r.status === 'pending')
  const played = queue.filter(r => r.status === 'played')

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showTipModal && (
        <TipModal bandId={band.id} bandName={band.name} venmoHandle={band.venmo_handle} minTip={band.min_tip_cents / 100} onClose={() => setShowTipModal(false)} />
      )}

      {/* Top rail */}
      <div className="top-rail">
        <NavWordmark size={28} />
        <button onClick={clearContact} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: F, fontSize: '12px', padding: 0 }}>
          Not {contactDisplay}?
        </button>
      </div>

      {/* Marquee header */}
      <MarqueeHeader
        bandName={band.name}
        venueName={session.venue_name}
        startedAt={session.started_at}
      />

      {/* CTAs */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', background: 'var(--bg)', borderBottom: '1px solid var(--border-warm)' }}>
        <button className="btn-primary" style={{ flex: 1, fontSize: '20px', padding: '13px' }} onClick={() => setStep('search')}>
          Request a song
        </button>
        <button className="btn-ghost" style={{ padding: '13px 28px', width: 'auto' }} onClick={() => setShowTipModal(true)}>
          Tip
        </button>
      </div>

      {/* Up next */}
      {accepted.length > 0 && (
        <div>
          <div className="section-header-accent">
            <span className="label-accent">Up next</span>
            <span className="label-accent">{accepted.length}</span>
          </div>
          {accepted.map(req => <QueueRow key={req.id} req={req} onBoost={() => handleBoost(req)} variant="upnext" />)}
        </div>
      )}

      {/* Requested */}
      {pending.length > 0 && (
        <div>
          <div className="section-header">
            <span className="label">Requested</span>
            <span className="label">{pending.length}</span>
          </div>
          {pending.map(req => <QueueRow key={req.id} req={req} onBoost={() => handleBoost(req)} variant="pending" />)}
        </div>
      )}

      {accepted.length === 0 && pending.length === 0 && (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontFamily: F, color: 'var(--text-muted)', fontSize: '16px' }}>No requests yet. Be the first.</p>
        </div>
      )}

      {/* Played */}
      {played.length > 0 && (
        <div style={{ marginTop: 'auto' }}>
          <div className="section-header-played">
            <span className="label" style={{ color: 'var(--text-dim)' }}>Played tonight</span>
            <span className="label" style={{ color: 'var(--text-dim)' }}>{played.length}</span>
          </div>
          {played.map(req => <QueueRow key={req.id} req={req} variant="played" />)}
        </div>
      )}
    </main>
  )
}

// ── Marquee ────────────────────────────────────────────────────────
function MarqueeText({ text, fontSize, color }: { text: string; fontSize: number; color: string }) {
  const chars = text.split('')
  const jitterScale = Math.min(fontSize / 40, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap', overflow: 'hidden', width: '100%' }}>
      {chars.map((ch, i) => {
        const seed = (i * 13 + ch.charCodeAt(0) * 7) % 100
        const rot = ((seed % 9) - 4) * 0.12 * jitterScale
        const nudgeY = (((seed * 3) % 5) * 0.3 - 0.6) * jitterScale
        const extraSpace = Math.round((seed % 3 - 1) * jitterScale)
        return (
          <span key={i} className="marquee-letter" style={{
            fontSize: `${fontSize}px`, color,
            transform: `rotate(${rot}deg) translateY(${nudgeY}px)`,
            marginRight: ch === ' ' ? `${Math.round(fontSize * 0.22)}px` : `${Math.max(0, extraSpace)}px`,
            display: 'inline-block', flexShrink: 0,
          }}>
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        )
      })}
    </div>
  )
}

function MarqueeHeader({ bandName, venueName, startedAt }: { bandName: string; venueName: string | null; startedAt: string }) {
  const date = new Date(startedAt)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
  const nameLine = bandName.toUpperCase()
  const nameFontSize = Math.max(24, Math.min(40, Math.floor(320 / Math.max(nameLine.length, 8))))
  const bulbCount = 24

  return (
    <div className="marquee-wrap">
      <div className="marquee-bulbs">
        {Array.from({ length: bulbCount }).map((_, i) => (
          <div key={i} className={`marquee-bulb${i % 4 === 2 ? ' dim' : ''}`} />
        ))}
      </div>
      <div className="marquee-panel">
        <div className="marquee-track">
          <MarqueeText text={nameLine} fontSize={nameFontSize} color="#1a1008" />
        </div>
        <div className="marquee-track" style={{ minHeight: '40px' }}>
          {venueName
            ? <MarqueeText text={`${venueName.toUpperCase()}  ·  ${dateStr}`} fontSize={18} color="#3a2808" />
            : <MarqueeText text={dateStr} fontSize={18} color="#3a2808" />
          }
        </div>
      </div>
      <div className="marquee-bulbs-bottom">
        {Array.from({ length: bulbCount }).map((_, i) => (
          <div key={i} className={`marquee-bulb${i % 4 === 0 ? ' dim' : ''}`} />
        ))}
      </div>
    </div>
  )
}

// ── Queue row ──────────────────────────────────────────────────────
function QueueRow({ req, onBoost, variant }: { req: QueueRequest; onBoost?: () => void; variant: 'upnext' | 'pending' | 'played' }) {
  const isUpNext = variant === 'upnext'
  const isPlayed = variant === 'played'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: isUpNext ? '16px 16px' : '11px 16px',
      borderBottom: `1px solid ${isUpNext ? 'var(--accent-dim)' : 'var(--border)'}`,
      background: isUpNext ? '#2a1a06' : isPlayed ? 'var(--bg)' : 'var(--bg-raised)',
      opacity: isPlayed ? 0.35 : 1,
      borderLeft: isUpNext ? '5px solid var(--accent)' : '5px solid transparent',
    }}>
      {req.spotify_album_art_url
        ? <img src={req.spotify_album_art_url} alt="" style={{ width: isUpNext ? '52px' : '42px', height: isUpNext ? '52px' : '42px', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: isUpNext ? '52px' : '42px', height: isUpNext ? '52px' : '42px', background: 'var(--bg)', flexShrink: 0, border: '1px solid var(--border-warm)' }} />
      }
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontFamily: "'Arvo', serif", fontSize: isUpNext ? '17px' : '15px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px', color: 'var(--text)' }}>{req.title}</p>
        <p style={{ fontFamily: "'Arvo', serif", fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.artist}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {req.tip_total > 0 && <p style={{ fontFamily: "'Teko', sans-serif", fontSize: isUpNext ? '24px' : '19px', color: 'var(--accent)', lineHeight: 1 }}>${(req.tip_total / 100).toFixed(0)}</p>}
        {onBoost && !isPlayed && (
          <button onClick={onBoost} style={{ background: 'var(--accent-pale)', border: '1px solid var(--accent-dim)', color: 'var(--accent)', fontFamily: "'Teko', sans-serif", fontSize: '15px', padding: '6px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            + Boost
          </button>
        )}
      </div>
    </div>
  )
}
