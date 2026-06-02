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
const F = "'Rokkitt', serif"

type Band = { id: string; name: string; slug: string; min_tip_cents: number; stripe_account_id: string | null; venmo_handle: string | null }
type Session = { id: string; venue_name: string | null; status: string; started_at: string }
type QueueRequest = {
  id: string; title: string; artist: string
  spotify_album_art_url: string | null
  status: string; tip_total: number; tip_count: number
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

  function getTipAmounts() {
    return [...new Set([minTip, minTip * 2, minTip * 4].map(v => Math.ceil(v)))]
  }

  async function handleProceedToPayment(isBoost = false) {
    if (!session || !band || !contact) return
    const finalAmount = tipAmount === null ? Math.round(parseFloat(customAmount) * 100) : tipAmount * 100
    if (!finalAmount || finalAmount < band.min_tip_cents) { setSubmitError(`Minimum tip is $${minTip}.`); return }
    setSubmitting(true); setSubmitError('')

    if (band.stripe_account_id) {
      const body: any = {
        band_id: band.id, amount_cents: finalAmount, session_id: session.id,
        requester_email: contact.type === 'email' ? contact.value : null,
        requester_phone: contact.type === 'phone' ? contact.value : null,
      }
      if (isBoost && boostingRequest) {
        body.existing_request_id = boostingRequest.id
        body.title = boostingRequest.title; body.artist = boostingRequest.artist
      } else {
        body.title = freeTextMode ? freeTextTitle.trim() : selectedSong!.title
        body.artist = freeTextMode ? freeTextArtist.trim() : selectedSong!.artist
        body.spotify_track_id = freeTextMode ? null : selectedSong!.id
        body.spotify_album_art_url = freeTextMode ? null : selectedSong!.album_art
      }
      const res = await fetch('/api/stripe/create-payment-intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const { client_secret, request_id, error } = await res.json()
      if (error || !client_secret) { setSubmitError('Payment setup failed. Try again.'); setSubmitting(false); return }
      setClientSecret(client_secret); setPendingRequestId(request_id); setSubmitting(false); setStep('payment')
    } else {
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
        stripe_payment_intent_id: `placeholder_${token}`, tracking_token: token, status: 'held',
      })
      setTrackingToken(token); setStep('submitted'); setSubmitting(false)
    }
  }

  async function handlePaymentSuccess(paymentIntentId: string) {
    if (!contact || !pendingRequestId) return
    const finalAmount = tipAmount === null ? Math.round(parseFloat(customAmount) * 100) : tipAmount * 100
    const token = crypto.randomUUID()
    await supabase.from('requests').update({ status: 'pending' }).eq('id', pendingRequestId)
    await supabase.from('tips').insert({
      request_id: pendingRequestId, amount_cents: finalAmount,
      requester_email: contact.type === 'email' ? contact.value : null,
      requester_phone: contact.type === 'phone' ? contact.value : null,
      stripe_payment_intent_id: paymentIntentId, tracking_token: token, status: 'held',
    })
    setTrackingToken(token); setStep('submitted')
  }

  async function handlePaymentAbandoned() {
    if (pendingRequestId) await supabase.from('requests').delete().eq('id', pendingRequestId).eq('status', 'pending_payment')
    setClientSecret(null); setPendingRequestId(null); setStep('confirm')
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

  // Contact display helper
  const contactDisplay = contact
    ? contact.type === 'email'
      ? contact.value.split('@')[0]
      : `···${contact.value.slice(-4)}`
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

  const accepted = queue.filter(r => r.status === 'accepted')
  const pending = queue.filter(r => r.status === 'pending')
  const played = queue.filter(r => r.status === 'played')
  const tipAmounts = getTipAmounts()

  const stripeAppearance = {
    theme: 'night' as const,
    variables: {
      colorBackground: '#1e1508', colorText: '#f5eed8', colorPrimary: '#e09030',
      colorDanger: '#c04040', fontFamily: 'Rokkitt, serif',
      borderRadius: '0px', colorInputBackground: '#120d04', colorInputBorder: '#6b4e20',
    },
  }

  // ── PAYMENT ──
  if (step === 'payment' && clientSecret) {
    return (
      <main style={{ minHeight: '100vh' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-warm)', background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={handlePaymentAbandoned} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: F, fontSize: '14px', padding: 0 }}>← Back</button>
          <p style={{ fontFamily: F, color: 'var(--text-muted)', fontSize: '14px' }}>${(tipAmount ?? parseFloat(customAmount) || 0)} tip</p>
        </div>
        <div style={{ padding: '24px 20px' }}>
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
            <PaymentForm onSuccess={handlePaymentSuccess} onError={setSubmitError} amount={tipAmount === null ? Math.round(parseFloat(customAmount)*100) : tipAmount*100} />
          </Elements>
          {submitError && <p style={{ color: 'var(--danger)', fontFamily: F, fontSize: '14px', marginTop: '12px' }}>{submitError}</p>}
          <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'center', lineHeight: '1.6' }}>
            Your card is authorized now and charged only if the song gets played.
          </p>
        </div>
      </main>
    )
  }

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

  // ── BOOST ──
  if (step === 'boost' && boostingRequest) {
    return (
      <main style={{ minHeight: '100vh' }}>
        <PageHeader onBack={reset} title="Add to this request" />
        <div style={{ padding: '20px' }}>
          <SongCard title={boostingRequest.title} artist={boostingRequest.artist} albumArt={boostingRequest.spotify_album_art_url} tipTotal={boostingRequest.tip_total} />
          <TipPicker amounts={tipAmounts} tipAmount={tipAmount} setTipAmount={setTipAmount} customAmount={customAmount} setCustomAmount={setCustomAmount} minTip={minTip} />
          {submitError && <p style={{ color: 'var(--danger)', fontFamily: F, fontSize: '14px', marginBottom: '12px' }}>{submitError}</p>}
          <button className="btn-primary" style={{ opacity: submitting ? 0.6 : 1 }} onClick={() => handleProceedToPayment(true)} disabled={submitting}>
            {submitting ? 'Setting up...' : 'Continue'}
          </button>
          <ContactLine contact={contactDisplay} onClear={clearContact} />
        </div>
      </main>
    )
  }

  // ── CONFIRM ──
  if (step === 'confirm') {
    const song = freeTextMode ? { title: freeTextTitle, artist: freeTextArtist, album_art: null } : selectedSong!
    const rejectedMatch = queue.find(r => r.status === 'rejected' && r.title.toLowerCase() === song.title.toLowerCase() && r.artist.toLowerCase() === song.artist.toLowerCase())
    return (
      <main style={{ minHeight: '100vh' }}>
        <PageHeader onBack={() => setStep('search')} title="Confirm request" />
        <div style={{ padding: '20px' }}>
          <SongCard title={song.title} artist={song.artist} albumArt={(song as any).album_art} />
          {rejectedMatch && (
            <div style={{ padding: '14px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border-warm)', marginBottom: '20px' }}>
              <p style={{ fontFamily: F, fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>The artist passed on this one earlier. You can still try.</p>
            </div>
          )}
          <TipPicker amounts={tipAmounts} tipAmount={tipAmount} setTipAmount={setTipAmount} customAmount={customAmount} setCustomAmount={setCustomAmount} minTip={minTip} />
          {submitError && <p style={{ color: 'var(--danger)', fontFamily: F, fontSize: '14px', marginBottom: '12px' }}>{submitError}</p>}
          <button className="btn-primary" style={{ opacity: submitting ? 0.6 : 1 }} onClick={() => handleProceedToPayment(false)} disabled={submitting}>
            {submitting ? 'Setting up...' : 'Continue'}
          </button>
          <ContactLine contact={contactDisplay} onClear={clearContact} />
        </div>
      </main>
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
                <button key={track.id} onClick={() => { setSelectedSong(track); setTipAmount(minTip); setStep('confirm') }}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', padding: '13px 20px', display: 'flex', gap: '14px', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
                  {track.album_art && <img src={track.album_art} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: F, fontSize: '16px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{track.title}</p>
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
              <button className="btn-primary" onClick={() => { if (freeTextTitle.trim() && freeTextArtist.trim()) { setTipAmount(minTip); setStep('confirm') } }} disabled={!freeTextTitle.trim() || !freeTextArtist.trim()}>
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
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showTipModal && (
        <TipModal bandId={band.id} bandName={band.name} venmoHandle={band.venmo_handle} minTip={minTip} onClose={() => setShowTipModal(false)} />
      )}

      {/* Marquee header */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '2px solid var(--border-warm)', padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              fontFamily: "'Teko', sans-serif",
              fontSize: '36px',
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1,
              marginBottom: '6px',
            }}>
              {band.name}
            </div>
            {session.venue_name && (
              <div style={{ fontFamily: F, fontSize: '14px', color: 'var(--accent)', letterSpacing: '0.04em' }}>
                {session.venue_name}
              </div>
            )}
          </div>
          <button onClick={clearContact} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: F, fontSize: '12px', padding: '4px', flexShrink: 0, marginTop: '2px' }}>
            Not {contactDisplay}?
          </button>
        </div>
      </div>

      {/* CTAs */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', background: 'var(--bg)', borderBottom: '1px solid var(--border-warm)' }}>
        <button className="btn-primary" style={{ flex: 1, fontSize: '20px', padding: '13px' }} onClick={() => setStep('search')}>
          Request a song
        </button>
        <button className="btn-ghost" style={{ padding: '13px 24px', width: 'auto' }} onClick={() => setShowTipModal(true)}>
          Tip
        </button>
      </div>

      {/* Up next — most prominent */}
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

      {/* Played — visually separated, pushed down, dimmed */}
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

// ── Queue row — three visual variants ──────────────────
function QueueRow({ req, onBoost, variant }: {
  req: QueueRequest
  onBoost?: () => void
  variant: 'upnext' | 'pending' | 'played'
}) {
  const isUpNext = variant === 'upnext'
  const isPlayed = variant === 'played'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: isUpNext ? '14px 16px' : '11px 16px',
      borderBottom: '1px solid var(--border)',
      background: isUpNext ? 'var(--bg-card)' : 'var(--bg-raised)',
      opacity: isPlayed ? 0.4 : 1,
      borderLeft: isUpNext ? '4px solid var(--accent)' : '4px solid transparent',
    }}>
      {req.spotify_album_art_url
        ? <img src={req.spotify_album_art_url} alt="" style={{ width: isUpNext ? '48px' : '40px', height: isUpNext ? '48px' : '40px', objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: isUpNext ? '48px' : '40px', height: isUpNext ? '48px' : '40px', background: 'var(--bg)', flexShrink: 0, border: '1px solid var(--border-warm)' }} />
      }
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontFamily: "'Rokkitt', serif", fontSize: isUpNext ? '17px' : '15px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px', color: 'var(--text)' }}>{req.title}</p>
        <p style={{ fontFamily: "'Rokkitt', serif", fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.artist}</p>
      </div>
      {/* Tip + boost grouped together on right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {req.tip_total > 0 && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: "'Teko', sans-serif", fontSize: isUpNext ? '22px' : '18px', color: 'var(--accent)', lineHeight: 1 }}>${(req.tip_total / 100).toFixed(0)}</p>
          </div>
        )}
        {onBoost && !isPlayed && (
          <button onClick={onBoost} style={{ background: 'var(--accent-pale)', border: '1px solid var(--accent-dim)', color: 'var(--accent)', fontFamily: "'Teko', sans-serif", fontSize: '15px', padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
        <p style={{ fontFamily: "'Rokkitt', serif", fontSize: '18px', fontWeight: 600, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
        <p style={{ fontFamily: "'Rokkitt', serif", fontSize: '14px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist}</p>
        {tipTotal && tipTotal > 0 && <p style={{ fontFamily: "'Rokkitt', serif", fontSize: '13px', color: 'var(--accent)', marginTop: '4px' }}>${(tipTotal / 100).toFixed(0)} already tipped</p>}
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
          style={{ background: tipAmount === null ? 'var(--accent)' : 'var(--bg-card)', border: `1px solid ${tipAmount === null ? 'var(--accent)' : 'var(--border-warm)'}`, color: tipAmount === null ? '#120d04' : 'var(--text-muted)', fontFamily: "'Rokkitt', serif", fontSize: '12px', letterSpacing: '0.08em', padding: '14px 4px', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 600 }}>
          Other
        </button>
      </div>
      {tipAmount === null && (
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: "'Rokkitt', serif", fontSize: '17px' }}>$</span>
          <input className="input" type="number" min={minTip} step="1" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder={String(minTip)} style={{ paddingLeft: '30px' }} autoFocus />
        </div>
      )}
      <p style={{ fontFamily: "'Rokkitt', serif", fontSize: '13px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.5 }}>
        Minimum ${minTip}. Only charged if the song gets played.
      </p>
    </div>
  )
}

function PageHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-warm)', background: 'var(--bg-raised)', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: "'Rokkitt', serif", fontSize: '14px', padding: 0, flexShrink: 0 }}>←</button>
      <p style={{ fontFamily: "'Rokkitt', serif", fontSize: '17px', fontWeight: 600, color: 'var(--text)' }}>{title}</p>
    </div>
  )
}

function ContactLine({ contact, onClear }: { contact: string; onClear: () => void }) {
  return (
    <p style={{ fontFamily: "'Rokkitt', serif", fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'center' }}>
      Receipt to {contact}.{' '}
      <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: "'Rokkitt', serif", fontSize: '13px', padding: 0, textDecoration: 'underline' }}>Not you?</button>
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
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, confirmParams: { return_url: window.location.href }, redirect: 'if_required' })
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
