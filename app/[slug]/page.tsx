'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import HollerLogo from '@/components/HollerLogo'

type Band = { id: string; name: string; slug: string }
type Session = { id: string; venue_name: string | null; status: string }
type QueueRequest = {
  id: string
  title: string
  artist: string
  status: string
  tip_total: number
  tip_count: number
}
type SpotifyTrack = {
  id: string
  title: string
  artist: string
  album: string
  album_art: string | null
}

type Step = 'queue' | 'search' | 'confirm' | 'submitted'

export default function RequesterPage() {
  const params = useParams()
  const slug = params.slug as string

  const [band, setBand] = useState<Band | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [queue, setQueue] = useState<QueueRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>('queue')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedSong, setSelectedSong] = useState<SpotifyTrack | null>(null)
  const [freeTextMode, setFreeTextMode] = useState(false)
  const [freeTextTitle, setFreeTextTitle] = useState('')
  const [freeTextArtist, setFreeTextArtist] = useState('')

  // Tip state
  const [tipAmount, setTipAmount] = useState<number>(5)
  const [customAmount, setCustomAmount] = useState('')
  const [contact, setContact] = useState('')
  const [contactType, setContactType] = useState<'email' | 'phone'>('email')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [trackingToken, setTrackingToken] = useState('')

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchQueue = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('requests')
      .select('id, title, artist, status, tips(amount_cents, status)')
      .eq('session_id', sessionId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: true })

    if (data) {
      const withTotals: QueueRequest[] = data.map((r: any) => {
        const activeTips = (r.tips ?? []).filter((t: any) =>
          t.status === 'held' || t.status === 'captured'
        )
        return {
          id: r.id,
          title: r.title,
          artist: r.artist,
          status: r.status,
          tip_total: activeTips.reduce((s: number, t: any) => s + t.amount_cents, 0),
          tip_count: activeTips.length,
        }
      })
      setQueue(withTotals)
    }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: bandData } = await supabase
        .from('bands')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()

      if (!bandData) { setLoading(false); return }
      setBand(bandData)

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, venue_name, status')
        .eq('band_id', bandData.id)
        .eq('status', 'active')
        .single()

      if (sessionData) {
        setSession(sessionData)
        await fetchQueue(sessionData.id)
      }

      setLoading(false)
    }
    load()
  }, [slug, fetchQueue])

  // Real-time queue updates
  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel(`queue-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'requests',
        filter: `session_id=eq.${session.id}`,
      }, () => fetchQueue(session.id))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tips',
      }, () => fetchQueue(session.id))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session, fetchQueue])

  // Spotify search with debounce
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
      } catch {
        setSearchResults([])
      }
      setSearching(false)
    }, 350)

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQuery, freeTextMode])

  async function handleSubmit() {
    if (!session || !band) return
    if (!contact.trim()) { setSubmitError('Please enter your email or phone number.'); return }

    const finalAmount = tipAmount === 0 ? Math.round(parseFloat(customAmount) * 100) : tipAmount * 100
    if (!finalAmount || finalAmount < 500) { setSubmitError('Minimum tip is $5.'); return }

    setSubmitting(true)
    setSubmitError('')

    const title = freeTextMode ? freeTextTitle.trim() : selectedSong!.title
    const artist = freeTextMode ? freeTextArtist.trim() : selectedSong!.artist
    const spotify_track_id = freeTextMode ? null : selectedSong!.id
    const spotify_album_art_url = freeTextMode ? null : selectedSong!.album_art

    const isEmail = contact.includes('@')
    const requestPayload: any = {
      session_id: session.id,
      title,
      artist,
      spotify_track_id,
      spotify_album_art_url,
      requester_email: isEmail ? contact.trim() : null,
      requester_phone: !isEmail ? contact.trim() : null,
      status: 'pending',
    }

    const { data: requestData, error: requestError } = await supabase
      .from('requests')
      .insert(requestPayload)
      .select('id')
      .single()

    if (requestError || !requestData) {
      setSubmitError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    // Insert tip row (no Stripe yet — placeholder until Phase 4)
    const token = crypto.randomUUID()
    const { error: tipError } = await supabase
      .from('tips')
      .insert({
        request_id: requestData.id,
        amount_cents: finalAmount,
        requester_email: isEmail ? contact.trim() : null,
        requester_phone: !isEmail ? contact.trim() : null,
        stripe_payment_intent_id: `placeholder_${token}`, // replaced in Phase 4
        tracking_token: token,
        status: 'held',
      })

    if (tipError) {
      setSubmitError('Something went wrong saving your tip. Please try again.')
      setSubmitting(false)
      return
    }

    setTrackingToken(token)
    setStep('submitted')
    setSubmitting(false)
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="label">Loading...</p>
      </main>
    )
  }

  if (!band) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p className="label" style={{ marginBottom: '12px' }}>Band not found</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Check the link and try again.</p>
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
            <HollerLogo variant="wordmark" size={40} />
          </div>
          <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>{band.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8' }}>
            No active session right now. Check back when the music starts.
          </p>
        </div>
      </main>
    )
  }

  // ── SUBMITTED ──────────────────────────────────────────────
  if (step === 'submitted') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div className="card-ornate" style={{ padding: '40px 32px' }}>
            <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
            <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
            <p className="label-accent" style={{ marginBottom: '16px' }}>Request sent</p>
            <h2 style={{ fontSize: '26px', marginBottom: '8px' }}>
              {freeTextMode ? freeTextTitle : selectedSong?.title}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              {freeTextMode ? freeTextArtist : selectedSong?.artist}
            </p>
            <div className="star-divider" style={{ marginBottom: '24px' }}>
              <span style={{ color: 'var(--star)' }}>✦</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8', marginBottom: '24px' }}>
              Your tip is held until the song is played. If it doesn't get played, you'll get your money back automatically.
            </p>
            <a
              href={`/track/${trackingToken}`}
              style={{
                display: 'block',
                padding: '12px',
                background: 'var(--accent-pale)',
                border: '1px solid var(--accent-dim)',
                color: 'var(--accent)',
                fontSize: '12px',
                letterSpacing: '0.08em',
                textDecoration: 'none',
                marginBottom: '16px',
              }}
            >
              Track your request →
            </a>
            <button
              onClick={() => {
                setStep('queue')
                setSelectedSong(null)
                setFreeTextMode(false)
                setFreeTextTitle('')
                setFreeTextArtist('')
                setSearchQuery('')
                setContact('')
                setTipAmount(5)
              }}
              className="btn-ghost"
              style={{ width: '100%', fontSize: '11px' }}
            >
              Request another song
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── CONFIRM (song selected, enter tip + contact) ──────────
  if (step === 'confirm') {
    const song = freeTextMode
      ? { title: freeTextTitle, artist: freeTextArtist, album_art: null }
      : selectedSong!

    const existingRequest = queue.find(
      r => r.title.toLowerCase() === song.title.toLowerCase() &&
           r.artist.toLowerCase() === song.artist.toLowerCase()
    )

    return (
      <main style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '480px', margin: '0 auto' }}>

        <button
          onClick={() => setStep('search')}
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '28px', padding: 0 }}
        >
          ← Change song
        </button>

        {/* Selected song */}
        <div className="card" style={{ marginBottom: '24px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          {song.album_art && (
            <img src={song.album_art} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {song.title}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {song.artist}
            </p>
          </div>
        </div>

        {/* Existing tip pool info */}
        {existingRequest && existingRequest.tip_total > 0 && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', background: 'var(--accent-pale)', border: '1px solid var(--accent-dim)' }}>
            <p style={{ fontSize: '13px', color: 'var(--accent)', lineHeight: '1.7' }}>
              {existingRequest.tip_count} {existingRequest.tip_count === 1 ? 'person has' : 'people have'} already tipped <strong>${(existingRequest.tip_total / 100).toFixed(0)}</strong> for this song. Add yours to boost it.
            </p>
          </div>
        )}

        {/* Tip amount */}
        <div style={{ marginBottom: '24px' }}>
          <p className="label" style={{ marginBottom: '12px' }}>How much?</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {[5, 10, 20].map(amt => (
              <button
                key={amt}
                onClick={() => { setTipAmount(amt); setCustomAmount('') }}
                style={{
                  background: tipAmount === amt ? 'var(--accent)' : 'var(--bg-raised)',
                  border: `1px solid ${tipAmount === amt ? 'var(--accent)' : 'var(--border-warm)'}`,
                  color: tipAmount === amt ? '#0e0b08' : 'var(--text)',
                  fontFamily: "'Teko', sans-serif",
                  fontSize: '20px',
                  fontWeight: 500,
                  padding: '12px 8px',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                ${amt}
              </button>
            ))}
            <button
              onClick={() => { setTipAmount(0); setCustomAmount('') }}
              style={{
                background: tipAmount === 0 ? 'var(--accent)' : 'var(--bg-raised)',
                border: `1px solid ${tipAmount === 0 ? 'var(--accent)' : 'var(--border-warm)'}`,
                color: tipAmount === 0 ? '#0e0b08' : 'var(--text-muted)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px',
                letterSpacing: '0.08em',
                padding: '12px 4px',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            >
              OTHER
            </button>
          </div>
          {tipAmount === 0 && (
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '15px' }}>$</span>
              <input
                className="input"
                type="number"
                min="5"
                step="1"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                placeholder="5"
                style={{ paddingLeft: '28px' }}
              />
            </div>
          )}
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Minimum $5. You're only charged if the song gets played.
          </p>
        </div>

        {/* Contact */}
        <div style={{ marginBottom: '28px' }}>
          <p className="label" style={{ marginBottom: '12px' }}>Where should we send your receipt?</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {(['email', 'phone'] as const).map(type => (
              <button
                key={type}
                onClick={() => setContactType(type)}
                style={{
                  background: contactType === type ? 'var(--accent)' : 'var(--bg-raised)',
                  border: `1px solid ${contactType === type ? 'var(--accent)' : 'var(--border-warm)'}`,
                  color: contactType === type ? '#0e0b08' : 'var(--text-muted)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                }}
              >
                {type}
              </button>
            ))}
          </div>
          <input
            className="input"
            type={contactType === 'email' ? 'email' : 'tel'}
            value={contact}
            onChange={e => setContact(e.target.value)}
            placeholder={contactType === 'email' ? 'you@email.com' : '(615) 000-0000'}
          />
        </div>

        {submitError && (
          <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{submitError}</p>
        )}

        <button
          className="btn-primary"
          style={{ width: '100%', opacity: submitting ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Sending...' : 'Send request →'}
        </button>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'center', lineHeight: '1.7' }}>
          Your tip is held — not charged — until the song is played. No play = full refund.
        </p>
      </main>
    )
  }

  // ── SEARCH ────────────────────────────────────────────────
  if (step === 'search') {
    return (
      <main style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '480px', margin: '0 auto' }}>

        <button
          onClick={() => setStep('queue')}
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '28px', padding: 0 }}
        >
          ← Back
        </button>

        <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>What do you want to hear?</h2>

        {!freeTextMode ? (
          <>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                className="input"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for a song..."
                autoFocus
              />
              {searching && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Searching...</p>
              )}
            </div>

            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                {searchResults.map(track => (
                  <button
                    key={track.id}
                    onClick={() => { setSelectedSong(track); setStep('confirm') }}
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-warm)',
                      color: 'var(--text)',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      textAlign: 'left',
                      transition: 'border-color 0.1s',
                      width: '100%',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--text-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-warm)')}
                  >
                    {track.album_art && (
                      <img src={track.album_art} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '14px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.title}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {track.artist} · {track.album}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setFreeTextMode(true)}
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', letterSpacing: '0.06em', padding: 0, textDecoration: 'underline' }}
            >
              Can't find it? Enter manually
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Song title</label>
              <input
                className="input"
                type="text"
                value={freeTextTitle}
                onChange={e => setFreeTextTitle(e.target.value)}
                placeholder="e.g. Brown Eyed Girl"
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Artist</label>
              <input
                className="input"
                type="text"
                value={freeTextArtist}
                onChange={e => setFreeTextArtist(e.target.value)}
                placeholder="e.g. Van Morrison"
              />
            </div>
            <button
              onClick={() => { if (freeTextTitle.trim() && freeTextArtist.trim()) setStep('confirm') }}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '12px' }}
              disabled={!freeTextTitle.trim() || !freeTextArtist.trim()}
            >
              Use this song →
            </button>
            <button
              onClick={() => setFreeTextMode(false)}
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0, textDecoration: 'underline' }}
            >
              Back to search
            </button>
          </>
        )}
      </main>
    )
  }

  // ── QUEUE (landing view) ──────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', padding: '32px 20px', maxWidth: '480px', margin: '0 auto' }}>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '8px' }}>
          <HollerLogo variant="wordmark" size={36} />
        </div>
        <h2 style={{ fontSize: '22px', marginBottom: '4px' }}>{band.name}</h2>
        {session.venue_name && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{session.venue_name}</p>
        )}
      </div>

      <button
        className="btn-primary"
        style={{ width: '100%', marginBottom: '32px', fontSize: '18px', padding: '14px' }}
        onClick={() => setStep('search')}
      >
        Request a song →
      </button>

      {queue.length > 0 ? (
        <div>
          <p className="label" style={{ marginBottom: '14px' }}>In the queue</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {queue.map(req => (
              <div key={req.id} className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '14px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {req.title}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.artist}</p>
                </div>
                <div style={{ marginLeft: '12px', textAlign: 'right', flexShrink: 0 }}>
                  {req.tip_total > 0 && (
                    <>
                      <p style={{ fontSize: '16px', color: 'var(--accent)', fontFamily: "'Teko', sans-serif", lineHeight: 1 }}>
                        ${(req.tip_total / 100).toFixed(0)}
                      </p>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                        {req.tip_count} {req.tip_count === 1 ? 'tip' : 'tips'}
                      </p>
                    </>
                  )}
                  <span style={{
                    display: 'inline-block',
                    marginTop: '4px',
                    fontSize: '9px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: req.status === 'accepted' ? 'var(--success)' : 'var(--text-muted)',
                    border: `1px solid ${req.status === 'accepted' ? 'var(--success)' : 'var(--border)'}`,
                    padding: '2px 6px',
                  }}>
                    {req.status === 'accepted' ? 'Up next' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '36px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8' }}>
            No requests yet — be the first.
          </p>
        </div>
      )}

    </main>
  )
}
