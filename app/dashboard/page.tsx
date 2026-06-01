'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import NavWordmark from '@/components/NavWordmark'
import Modal from '@/components/Modal'

type Band = {
  id: string
  name: string
  slug: string
  min_tip_cents: number
  stripe_account_id: string | null
}
type Session = { id: string; venue_name: string | null; started_at: string; status: string }

function DashboardContent() {
  const [band, setBand] = useState<Band | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [showVenueModal, setShowVenueModal] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [venuePlaceId, setVenuePlaceId] = useState<string | null>(null)
  const [venueAddress, setVenueAddress] = useState<string | null>(null)
  const [stripeMessage, setStripeMessage] = useState<string | null>(null)
  const venueInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle Stripe Connect redirect messages
    const stripe = searchParams.get('stripe')
    if (stripe === 'connected') setStripeMessage('Stripe connected successfully.')
    if (stripe === 'error') setStripeMessage('Something went wrong connecting Stripe. Try again.')
    if (stripe === 'cancelled') setStripeMessage(null)
    if (stripe) {
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('stripe')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }
      const { data: bandData } = await supabase
        .from('bands')
        .select('id, name, slug, min_tip_cents, stripe_account_id')
        .eq('user_id', user.id)
        .single()
      if (bandData) {
        setBand(bandData)
        const { data: sessionData } = await supabase
          .from('sessions').select('id, venue_name, started_at, status')
          .eq('band_id', bandData.id).order('started_at', { ascending: false }).limit(10)
        setSessions(sessionData ?? [])
      }
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!showVenueModal) return
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) return

    function initAutocomplete() {
      if (!venueInputRef.current || !(window as any).google) return
      const autocomplete = new (window as any).google.maps.places.Autocomplete(
        venueInputRef.current,
        { types: ['establishment'], fields: ['name', 'place_id', 'formatted_address'] }
      )
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.name) {
          setVenueName(place.name)
          setVenuePlaceId(place.place_id ?? null)
          setVenueAddress(place.formatted_address ?? null)
        }
      })
    }

    if ((window as any).google?.maps) {
      initAutocomplete()
    } else {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.onload = initAutocomplete
      document.head.appendChild(script)
    }
  }, [showVenueModal])

  async function handleConnectStripe() {
    setConnectingStripe(true)
    const res = await fetch(`/api/stripe-connect-url?band_id=${band?.id}`)
    const { url, error } = await res.json()
    if (error || !url) {
      setStripeMessage('Could not start Stripe setup. Try again.')
      setConnectingStripe(false)
      return
    }
    window.location.href = url
  }

  async function handleStartSession() {
    setVenueName('')
    setVenuePlaceId(null)
    setVenueAddress(null)
    setShowVenueModal(true)
  }

  async function confirmStartSession() {
    if (!band) return
    setStarting(true)
    setShowVenueModal(false)
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        band_id: band.id,
        venue_name: venueName.trim() || null,
        venue_place_id: venuePlaceId,
        venue_address: venueAddress,
        status: 'active',
      })
      .select('id').single()
    if (error || !data) {
      alert('Something went wrong starting the session. Try again.')
      setStarting(false)
      return
    }
    router.push(`/session/${data.id}`)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/signup')
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="label">Loading...</p>
      </main>
    )
  }

  const activeSession = sessions.find(s => s.status === 'active')
  const stripeConnected = !!band?.stripe_account_id

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '600px', margin: '0 auto' }}>

      {showVenueModal && (
        <Modal title="Starting a session" onClose={() => setShowVenueModal(false)}>
          <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>Where are you playing?</h2>
          <div style={{ marginBottom: '20px' }}>
            <label className="label" style={{ display: 'block', marginBottom: '10px' }}>Venue name</label>
            <input
              ref={venueInputRef}
              className="input"
              type="text"
              value={venueName}
              onChange={e => { setVenueName(e.target.value); setVenuePlaceId(null); setVenueAddress(null) }}
              placeholder="e.g. Robert's Western World"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') confirmStartSession() }}
            />
            {venueAddress && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{venueAddress}</p>
            )}
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Optional — shown to your audience on the request page.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={confirmStartSession}>
              Start session →
            </button>
            <button className="btn-ghost" onClick={() => setShowVenueModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', marginBottom: '12px', gap: '12px' }}>
        <NavWordmark size={48} />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
          <a href="/settings" className="btn-ghost" style={{ textDecoration: 'none' }}>Settings</a>
          <button onClick={handleSignOut} className="btn-ghost">Sign out</button>
        </div>
      </div>

      <div className="star-divider" style={{ marginBottom: '40px' }}>
        <span style={{ color: 'var(--star)', fontSize: '10px' }}>✦ ✦ ✦</span>
      </div>

      {/* Stripe message banner */}
      {stripeMessage && (
        <div style={{ marginBottom: '24px', padding: '14px 18px', background: 'var(--accent-pale)', border: '1px solid var(--accent-dim)' }}>
          <p style={{ fontSize: '13px', color: 'var(--accent)' }}>{stripeMessage}</p>
        </div>
      )}

      <div style={{ marginBottom: '36px' }}>
        <p className="label" style={{ marginBottom: '14px' }}>Your act</p>
        {band ? (
          <div className="card-ornate">
            <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
            <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '12px' }}>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '26px', marginBottom: '6px' }}>{band.name}</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Min tip: <span style={{ color: 'var(--accent)' }}>${band.min_tip_cents / 100}</span>
                  &nbsp;·&nbsp;
                  <a href="/settings" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>change</a>
                </p>
              </div>
              <span className="label-accent" style={{
                fontSize: '9px',
                border: '1px solid var(--accent-dim)',
                padding: '4px 8px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                alignSelf: 'flex-start',
              }}>
                {stripeConnected ? '✦ Ready' : '◦ Setup needed'}
              </span>
            </div>

            <div className="star-divider" style={{ marginBottom: '20px' }}>
              <span style={{ color: 'var(--border-bright)', fontSize: '8px' }}>✦</span>
            </div>

            {/* Stripe Connect section */}
            {!stripeConnected ? (
              <div style={{ marginBottom: '20px', padding: '16px 18px', background: 'var(--bg-raised)', border: '1px solid var(--border-warm)' }}>
                <p className="label-accent" style={{ marginBottom: '8px' }}>Connect Stripe to get paid</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.7' }}>
                  Link your Stripe account so tips go directly to you when songs are played.
                </p>
                <button
                  className="btn-primary"
                  style={{ width: '100%', opacity: connectingStripe ? 0.6 : 1 }}
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                >
                  {connectingStripe ? 'Redirecting...' : 'Connect Stripe →'}
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '12px', color: 'var(--success)' }}>✓ Stripe connected</p>
                <button
                  onClick={handleConnectStripe}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Reconnect
                </button>
              </div>
            )}

            {activeSession ? (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                  You have an active session in progress.
                </p>
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => router.push(`/session/${activeSession.id}`)}>
                  Back to live queue →
                </button>
              </div>
            ) : (
              <button
                className="btn-primary"
                style={{ width: '100%', opacity: starting ? 0.6 : 1 }}
                onClick={handleStartSession}
                disabled={starting}
              >
                {starting ? 'Starting...' : "Start tonight's session →"}
              </button>
            )}
          </div>
        ) : (
          <div className="card-ornate">
            <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
            <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Set up your act to get started.
            </p>
            <a href="/setup" className="btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Set up your act
            </a>
          </div>
        )}
      </div>

      <div>
        <p className="label" style={{ marginBottom: '14px' }}>Past sessions</p>
        {sessions.filter(s => s.status !== 'active').length === 0 ? (
          <div className="card" style={{ padding: '40px 28px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.08em' }}>No sessions on the books yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.filter(s => s.status !== 'active').map(session => (
              <a key={session.id} href={`/session/${session.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <div>
                    <p style={{ fontSize: '13px', marginBottom: '2px', color: 'var(--text)' }}>{session.venue_name ?? 'No venue set'}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="label" style={{ fontSize: '10px' }}>{session.status}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="label">Loading...</p>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  )
}
