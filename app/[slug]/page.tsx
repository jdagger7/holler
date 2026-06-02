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

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const FONT = "'Arvo', serif"
const FONT_MUTED: React.CSSProperties = { fontFamily: FONT, color: 'var(--text-muted)', fontSize: '14px' }
const FONT_BODY: React.CSSProperties = { fontFamily: FONT, color: 'var(--text)', fontSize: '15px' }

type Band = { id: string; name: string; slug: string; min_tip_cents: number; stripe_account_id: string | null; venmo_handle: string | null }
type Session = { id: string; venue_name: string | null; status: string }
type QueueRequest = {
  id: string; title: string; artist: string
  spotify_album_art_url: string | null
  status: string
  tip_total: number; tip_count: number
}
type SpotifyTrack = { id: string; title: string; artist: string; album: string; album_art: string | null }
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
  const [showTipModal, setShowTipModal] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSong, setSelectedSong] = useState<SpotifyTrack | null>(null)
  const [freeTextMode, setFreeTextMode] = useState(false)
  const [freeTextTitle, setFreeTextTitle] = useState('')
  const [freeTextArtist, setFreeTextArtist] = useState('')
  const [boostingRequest, setBoostingRequest] = useState<QueueRequest | null>(null)

  const [tipAmount, setTipAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [trackingToken, setTrackingToken] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
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
        // Skip requests that haven't had payment confirmed yet
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
        const data = await res.json()
        setSearchResults(data.tracks ?? [])
      } catch { setSearchResults([]) }
      setSearching(false)
    }, 350)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery, freeTextMode, step])

  function getTipAmounts() {
    return [...new Set([minTip, minTip * 2, minTip * 4].map(v => Math.ceil(v)))]
  }

  async function handleProceedToPayment(isBoost = false) {
    if (!session || !band || !contact) return
    const finalAmount = tipAmount === null ? Math.round(parseFloat(customAmount) * 100) : tipAmount * 100
    if (!finalAmount || finalAmount < band.min_tip_cents) { setSubmitError(`Minimum tip is $${minTip}.`); return }
    setSubmitting(true); setSubmitError('')

    if (band.stripe_account_id) {
      // For Stripe flow: create PaymentIntent (which also creates the request server-side)
      const body: any = {
        band_id: band.id,
        amount_cents: finalAmount,
        session_id: session.id,
        requester_email: contact.type === 'email' ? contact.value : null,
        requester_phone: contact.type === 'phone' ? contact.value : null,
      }

      if (isBoost && boostingRequest) {
        body.existing_request_id = boostingRequest.id
        body.title = boostingRequest.title
        body.artist = boostingRequest.artist
      } else {
        body.title = freeTextMode ? freeTextTitle.trim() : selectedSong!.title
        body.artist = freeTextMode ? freeTextArtist.trim() : selectedSong!.artist
        body.spotify_track_id = freeTextMode ? null : selectedSong!.id
        body.spotify_album_art_url = freeTextMode ? null : selectedSong!.album_art
      }

      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const { client_secret, request_id, error } = await res.json()
      if (error || !client_secret) { setSubmitError('Payment setup failed. Try again.'); setSubmitting(false); return }
      setClientSecret(client_secret)
      setPendingRequestId(request_id)
      setSubmitting(false)
      setStep('payment')
    } else {
      // No Stripe — create request directly and save placeholder tip
      let requestId: string
      if (isBoost && boostingRequest) {
        requestId = boostingRequest.id
      } else {
        const { data, error } = await supabase.from('requests').insert({
          session_id: session.id,
          title: freeTextMode ? freeTextTitle.trim() : selectedSong!.title,
          artist: freeTextMode ? freeTextArtist.trim() : selectedSong!.artist,
          spotify_track_id: freeTextMode ? null : selectedSong!.id,
          spotify_album_art_url: freeTextMode ? null : selectedSong!.album_art,
          requester_email: contact.type === 'email' ? contact.value : null,
          requester_phone: contact.type === 'phone' ? contact.value : null,
          status: 'pending',
        }).select('id').single()
        if (error || !data) { setSubmitError('Something went wrong. Try again.'); setSubmitting(false); return }
        requestId = data.id
      }
      const token = crypto.randomUUID()
      await supabase.from('tips').insert({
        request_id: requestId, amount_cents: finalAmount,
        requester_email: contact.type === 'email' ? contact.value : null,
        requester_phone: contact.type === 'phone' ? contact.value : null,
        stripe_payment_intent_id: `placeholder_${token}`,
        tracking_token: token, status: 'held',
      })
      setTrackingToken(token); setStep('submitted'); setSubmitting(false)
    }
  }

  async function handlePaymentSuccess(paymentIntentId: string) {
    if (!contact || !pendingRequestId) return
    const finalAmount = tipAmount === null ? Math.round(parseFloat(customAmount) * 100) : tipAmount * 100
    const token = crypto.randomUUID()

    // Promote request from pending_payment to pending now that payment is confirmed
    await supabase.from('requests').update({ status: 'pending' }).eq('id', pendingRequestId)

    await supabase.from('tips').insert({
      request_id: pendingRequestId, amount_cents: finalAmount,
      requester_email: contact.type === 'email' ? contact.value : null,
      requester_phone: contact.type === 'phone' ? contact.value : null,
      stripe_payment_intent_id: paymentIntentId,
      tracking_token: token, status: 'held',
    })
    setTrackingToken(token); setStep('submitted')
  }

  async function handlePaymentAbandoned() {
    // Clean up the pending_payment request if user goes back
    if (pendingRequestId) {
      await supabase.from('requests').delete().eq('id', pendingRequestId).eq('status', 'pending_payment')
    }
    setClientSecret(null)
    setPendingRequestId(null)
    setStep('confirm')
  }

  function handleBoost(req: QueueRequest) {
    setBoostingRequest(req); setTipAmount(minTip); setCustomAmount(''); setSubmitError(''); setStep('boost')
  }

  function reset() {
    setStep('queue'); setSelectedSong(null); setBoostingRequest(null)
    setFreeTextMode(false); setFreeTextTitle(''); setFreeTextArtist('')
    setSearchQuery(''); setSearchResults([]); setTipAmount(null)
    setCustomAmount(''); setSubmitError(''); setClientSecret(null); setPendingRequestId(null)
  }

  if (!contactLoaded || loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="label">Loading...</p>
    </main>
  )

  if (!band) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <p style={FONT_MUTED}>Artist not found.</p>
    </main>
  )

  if (!contact) return <ContactPrompt onConfirm={(value, type) => setContact({ value, type })} />

  if (!session) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div>
        <HollerLogo variant="wordmark" size={40} />
        <h2 style={{ fontSize: '22px', margin: '16px 0 8px' }}>{band.name}</h2>
        <p style={FONT_MUTED}>No open session right now.</p>
      </div>
    </main>
  )

  const accepted = queue.filter(r => r.status === 'accepted')
  const pending = queue.filter(r => r.status === 'pending')
  const played = queue.filter(r => r.status === 'played')
  const tipAmounts = getTipAmounts()

  // ── PAYMENT ──────────────────────────────────────────
  if (step === 'payment' && clientSecret) {
    const stripeOptions = {
      clientSecret,
      appearance: {
        theme: 'night' as const,
        variables: {
          colorBackground: '#1e1508', colorText: '#f5eed8', colorPrimary: '#e09030',
          colorDanger: '#c04040', fontFamily: 'Arvo, serif',
          borderRadius: '0px', colorInputBackground: '#120d04', colorInputBorder: '#6b4e20',
          fontSizeBase: '16px',
        },
        rules: {
          '.Label': { fontFamily: 'Arvo, serif', fontSize: '13px', letterSpacing: '0.05em' },
          '.Input': { fontFamily: 'Arvo, serif', fontSize: '16px' },
          '.Tab': { fontFamily: 'Arvo, serif' },
        }
      },
    }
    return (
      <main style={{ minHeight: '100vh', maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-warm)', background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={handlePaymentAbandoned} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', ...FONT_MUTED, padding: 0 }}>← Back</button>
          <p style={FONT_MUTED}>${tipAmount === null ? (parseFloat(customAmount)||0).toFixed(0) : tipAmount} tip</p>
        </div>
        <div style={{ padding: '24px 20px' }}>
          <Elements stripe={stripePromise} options={stripeOptions}>
            <PaymentForm onSuccess={handlePaymentSuccess} onError={setSubmitError} amount={tipAmount === null ? Math.round(parseFloat(customAmount) * 100) : tipAmount * 100} />
          </Elements>
          {submitError && <p style={{ color: 'var(--danger)', ...FONT_BODY, marginTop: '12px' }}>{submitError}</p>}
          <p style={{ ...FONT_MUTED, fontSize: '13px', marginTop: '16px', textAlign: 'center', lineHeight: '1.6' }}>
            Your card is authorized now and charged only if the song gets played.
          </p>
        </div>
      </main>
    )
  }

  // ── SUBMITTED ──────────────────────────────────────
  if (step === 'submitted') {
    const title = boostingRequest?.title ?? (freeTextMode ? freeTextTitle : selectedSong?.title)
    const artist = boostingRequest?.artist ?? (freeTextMode ? freeTextArtist : selectedSong?.artist)
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', textAlign: 'center', maxWidth: '680px', margin: '0 auto' }}>
        <p className="label-accent" style={{ marginBottom: '24px' }}>Request sent</p>
        <h2 style={{ fontSize: '30px', marginBottom: '6px' }}>{title}</h2>
        <p style={{ ...FONT_MUTED, marginBottom: '40px' }}>{artist}</p>
        <a href={`/track/${trackingToken}`} style={{ display: 'block', width: '100%', maxWidth: '360px', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-warm)', color: 'var(--accent)', ...FONT_BODY, textDecoration: 'none', marginBottom: '12px', textAlign: 'center' }}>
          Track your request
        </a>
        <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', ...FONT_MUTED, padding: '8px' }}>
          Request another song
        </button>
      </main>
    )
  }

  // ── BOOST ──────────────────────────────────────────
  if (step === 'boost' && boostingRequest) {
    return (
      <main style={{ minHeight: '100vh', maxWidth: '680px', margin: '0 auto' }}>
        <PageHeader onBack={reset} title="Add to this request" />
        <div style={{ padding: '20px' }}>
          <SongCard title={boostingRequest.title} artist={boostingRequest.artist} albumArt={boostingRequest.spotify_album_art_url} tipTotal={boostingRequest.tip_total} />
          <TipPicker amounts={tipAmounts} tipAmount={tipAmount} setTipAmount={setTipAmount} customAmount={customAmount} setCustomAmount={setCustomAmount} minTip={minTip} />
          {submitError && <p style={{ color: 'var(--danger)', ...FONT_BODY, marginBottom: '12px' }}>{submitError}</p>}
          <button className="btn-primary" style={{ opacity: submitting ? 0.6 : 1 }} onClick={() => handleProceedToPayment(true)} disabled={submitting}>
            {submitting ? 'Setting up...' : 'Continue'}
          </button>
          <ContactLine contact={contact.value} onClear={clearContact} />
        </div>
      </main>
    )
  }

  // ── CONFIRM ────────────────────────────────────────
  if (step === 'confirm') {
    const song = freeTextMode ? { title: freeTextTitle, artist: freeTextArtist, album_art: null } : selectedSong!
    const rejectedMatch = queue.find(r => r.status === 'rejected' && r.title.toLowerCase() === song.title.toLowerCase() && r.artist.toLowerCase() === song.artist.toLowerCase())
    return (
      <main style={{ minHeight: '100vh', maxWidth: '680px', margin: '0 auto' }}>
        <PageHeader onBack={() => setStep('search')} title="Confirm request" />
        <div style={{ padding: '20px' }}>
          <SongCard title={song.title} artist={song.artist} albumArt={(song as any).album_art} />
          {rejectedMatch && (
            <div style={{ padding: '14px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border-warm)', marginBottom: '20px' }}>
              <p style={{ ...FONT_MUTED, lineHeight: '1.6' }}>The artist passed on this one earlier. You can still try.</p>
            </div>
          )}
          <TipPicker amounts={tipAmounts} tipAmount={tipAmount} setTipAmount={setTipAmount} customAmount={customAmount} setCustomAmount={setCustomAmount} minTip={minTip} />
          {submitError && <p style={{ color: 'var(--danger)', ...FONT_BODY, marginBottom: '12px' }}>{submitError}</p>}
          <button className="btn-primary" style={{ opacity: submitting ? 0.6 : 1 }} onClick={() => handleProceedToPayment(false)} disabled={submitting}>
            {submitting ? 'Setting up...' : 'Continue'}
          </button>
          <ContactLine contact={contact.value} onClear={clearContact} />
        </div>
      </main>
    )
  }

  // ── SEARCH ─────────────────────────────────────────
  if (step === 'search') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', maxWidth: '680px', margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-raised)', borderBottom: '2px solid var(--accent)', padding: '14px 20px' }}>
          <button onClick={() => setStep('queue')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', padding: '0 0 10px', display: 'block' }}>
            ← Back
          </button>
          {!freeTextMode ? (
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search for a song..."
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontFamily: FONT, fontSize: '22px', padding: '4px 0',
              }}
            />
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
              {searching && <p style={{ padding: '16px 20px', ...FONT_MUTED }}>Searching...</p>}
              {!searching && searchQuery.length > 1 && searchResults.length === 0 && (
                <p style={{ padding: '16px 20px', ...FONT_MUTED }}>No results. Try typing it in below.</p>
              )}
              {searchResults.map(track => (
                <button key={track.id} onClick={() => { setSelectedSong(track); setTipAmount(minTip); setStep('confirm') }}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', padding: '13px 20px', display: 'flex', gap: '14px', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
                  {track.album_art && <img src={track.album_art} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: FONT, fontSize: '16px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{track.title}</p>
                    <p style={{ fontFamily: FONT, fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.artist}</p>
                  </div>
                </button>
              ))}
              <div style={{ padding: '20px', textAlign: 'center', borderTop: searchResults.length > 0 ? '1px solid var(--border)' : 'none' }}>
                <button onClick={() => setFreeTextMode(true)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', textDecoration: 'underline' }}>
                  Not finding it? Type it in
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn-primary" onClick={() => { if (freeTextTitle.trim() && freeTextArtist.trim()) { setTipAmount(minTip); setStep('confirm') } }} disabled={!freeTextTitle.trim() || !freeTextArtist.trim()}>
                Use this song
              </button>
              <button onClick={() => { setFreeTextMode(false); setFreeTextTitle(''); setFreeTextArtist('') }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: FONT, fontSize: '14px', textDecoration: 'underline', padding: '8px' }}>
                Back to search
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  // ── QUEUE ──────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', maxWidth: '680px', margin: '0 auto' }}>

      {showTipModal && (
        <TipModal bandId={band.id} bandName={band.name} venmoHandle={band.venmo_handle} minTip={minTip} onClose={() => setShowTipModal(false)} />
      )}

      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-warm)', background: 'var(--bg-raised)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '22px', marginBottom: '2px' }}>{band.name}</h2>
            {session.venue_name && <p style={{ fontFamily: FONT, fontSize: '14px', color: 'var(--text-muted)' }}>{session.venue_name}</p>}
          </div>
          <button onClick={clearContact} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: FONT, fontSize: '12px', padding: '4px', flexShrink: 0, marginTop: '2px' }}>
            Not you?
          </button>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-warm)', display: 'flex', gap: '10px' }}>
        <button className="btn-primary" style={{ flex: 1, fontSize: '20px', padding: '14px' }} onClick={() => setStep('search')}>
          Request a song
        </button>
        <button className="btn-ghost" style={{ padding: '14px 18px', width: 'auto' }} onClick={() => setShowTipModal(true)}>
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
          {accepted.map(req => <QueueRow key={req.id} req={req} onBoost={() => handleBoost(req)} highlight />)}
        </div>
      )}

      {/* Requested */}
      {pending.length > 0 && (
        <div>
          <div className="section-header">
            <span className="label">Requested</span>
            <span className="label">{pending.length}</span>
          </div>
          {pending.map(req => <QueueRow key={req.id} req={req} onBoost={() => handleBoost(req)} />)}
        </div>
      )}

      {accepted.length === 0 && pending.length === 0 && (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ ...FONT_MUTED, fontSize: '16px' }}>No requests yet. Be the first.</p>
        </div>
      )}

      {/* Played */}
      {played.length > 0 && (
        <div style={{ marginTop: 'auto' }}>
          <div className="section-header">
            <span className="label">Played tonight</span>
            <span className="label">{played.length}</span>
          </div>
          {played.map(req => <QueueRow key={req.id} req={req} dim />)}
        </div>
      )}
    </main>
  )
}

function QueueRow({ req, onBoost, highlight, dim }: { req: QueueRequest; onBoost?: () => void; highlight?: boolean; dim?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      background: highlight ? 'var(--bg-card)' : 'var(--bg-raised)',
      opacity: dim ? 0.45 : 1,
      borderLeft: highlight ? '3px solid var(--accent)' : '3px solid transparent',
    }}>
      {req.spotify_album_art_url
        ? <img src={req.spotify_album_art_url} alt="" style={{ width: '44px', height: '44px', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: '44px', height: '44px', background: 'var(--bg)', flexShrink: 0, border: '1px solid var(--border-warm)' }} />
      }
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontFamily: "'Arvo', serif", fontSize: '16px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px', color: 'var(--text)' }}>{req.title}</p>
        <p style={{ fontFamily: "'Arvo', serif", fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.artist}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {req.tip_total > 0 && <p style={{ fontFamily: "'Teko', sans-serif", fontSize: '20px', color: 'var(--accent)', lineHeight: 1 }}>${(req.tip_total / 100).toFixed(0)}</p>}
        {onBoost && !dim && (
          <button onClick={onBoost} style={{ background: 'var(--accent-pale)', border: '1px solid var(--accent-dim)', color: 'var(--accent)', fontFamily: "'Teko', sans-serif", fontSize: '16px', padding: '6px 10px', cursor: 'pointer', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            + Boost
          </button>
        )}
      </div>
    </div>
  )
}

function SongCard({ title, artist, albumArt, tipTotal }: { title: string; artist: string; albumArt: string | null; tipTotal?: number }) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-warm)', marginBottom: '24px' }}>
      {albumArt ? <img src={albumArt} alt="" style={{ width: '60px', height: '60px', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: '60px', height: '60px', background: 'var(--bg)', flexShrink: 0, border: '1px solid var(--border-warm)' }} />}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: "'Arvo', serif", fontSize: '18px', fontWeight: 700, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
        <p style={{ fontFamily: "'Arvo', serif", fontSize: '14px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist}</p>
        {tipTotal && tipTotal > 0 && <p style={{ fontFamily: "'Arvo', serif", fontSize: '13px', color: 'var(--accent)', marginTop: '4px' }}>${(tipTotal / 100).toFixed(0)} already tipped</p>}
      </div>
    </div>
  )
}

function TipPicker({ amounts, tipAmount, setTipAmount, customAmount, setCustomAmount, minTip }: {
  amounts: number[]; tipAmount: number | null; setTipAmount: (n: number | null) => void
  customAmount: string; setCustomAmount: (s: string) => void; minTip: number
}) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p className="label" style={{ marginBottom: '12px' }}>Tip amount</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${amounts.length + 1}, 1fr)`, gap: '8px', marginBottom: '12px' }}>
        {amounts.map(amt => (
          <button key={amt} onClick={() => { setTipAmount(amt); setCustomAmount('') }}
            style={{ background: tipAmount === amt ? 'var(--accent)' : 'var(--bg-card)', border: `1px solid ${tipAmount === amt ? 'var(--accent)' : 'var(--border-warm)'}`, color: tipAmount === amt ? '#120d04' : 'var(--text)', fontFamily: "'Teko', sans-serif", fontSize: '24px', fontWeight: 600, padding: '14px 4px', cursor: 'pointer' }}>
            ${amt}
          </button>
        ))}
        <button onClick={() => { setTipAmount(null); setCustomAmount('') }}
          style={{ background: tipAmount === null ? 'var(--accent)' : 'var(--bg-card)', border: `1px solid ${tipAmount === null ? 'var(--accent)' : 'var(--border-warm)'}`, color: tipAmount === null ? '#120d04' : 'var(--text-muted)', fontFamily: "'Arvo', serif", fontSize: '12px', letterSpacing: '0.08em', padding: '14px 4px', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 700 }}>
          Other
        </button>
      </div>
      {tipAmount === null && (
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: "'Arvo', serif", fontSize: '17px' }}>$</span>
          <input className="input" type="number" min={minTip} step="1" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder={String(minTip)} style={{ paddingLeft: '30px' }} autoFocus />
        </div>
      )}
      <p style={{ fontFamily: "'Arvo', serif", fontSize: '13px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.5 }}>
        Minimum ${minTip}. Only charged if the song gets played.
      </p>
    </div>
  )
}

function PageHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-warm)', background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: "'Arvo', serif", fontSize: '14px', padding: 0, flexShrink: 0 }}>←</button>
      <p style={{ fontFamily: "'Arvo', serif", fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{title}</p>
    </div>
  )
}

function ContactLine({ contact, onClear }: { contact: string; onClear: () => void }) {
  return (
    <p style={{ fontFamily: "'Arvo', serif", fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'center' }}>
      Receipt to {contact}.{' '}
      <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: "'Arvo', serif", fontSize: '13px', padding: 0, textDecoration: 'underline' }}>Not you?</button>
    </p>
  )
}

function PaymentForm({ onSuccess, onError, amount }: { onSuccess: (id: string) => void; onError: (m: string) => void; amount: number }) {
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
      <div style={{ marginBottom: '24px' }}><PaymentElement options={{ layout: { type: 'accordion', defaultCollapsed: false } }} /></div>
      <button type="submit" className="btn-primary" style={{ opacity: processing ? 0.6 : 1 }} disabled={processing || !stripe}>
        {processing ? 'Processing...' : `Hold $${(amount / 100).toFixed(0)}`}
      </button>
    </form>
  )
}
