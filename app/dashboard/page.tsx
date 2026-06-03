'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import NavWordmark from '@/components/NavWordmark'
import Modal from '@/components/Modal'
import QRModal from '@/components/QRModal'

type Band = {
  id: string; name: string; slug: string; min_tip_cents: number
  stripe_account_id: string | null; venmo_handle: string | null
}
type Session = { id: string; venue_name: string | null; started_at: string; status: string }

const F = "'Arvo', serif"

function DashboardContent() {
  const [band, setBand] = useState<Band | null>(null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [pastSessions, setPastSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [startingSession, setStartingSession] = useState(false)
  const [showNewSession, setShowNewSession] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [showQR, setShowQR] = useState(false)
  const venueInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://holler.live'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const { data: bandData } = await supabase.from('bands').select('id, name, slug, min_tip_cents, stripe_account_id, venmo_handle').eq('user_id', user.id).single()
      if (!bandData) { router.push('/setup'); return }
      setBand(bandData)

      const { data: sessions } = await supabase.from('sessions').select('id, venue_name, started_at, status').eq('band_id', bandData.id).order('started_at', { ascending: false })
      if (sessions) {
        setActiveSession(sessions.find(s => s.status === 'active') ?? null)
        setPastSessions(sessions.filter(s => s.status === 'ended').slice(0, 10))
      }
      setLoading(false)
    }
    load()
  }, [router, searchParams])

  async function startSession() {
    if (!band) return
    setStartingSession(true)
    const { data } = await supabase.from('sessions').insert({
      band_id: band.id,
      venue_name: venueName.trim() || null,
      status: 'active',
      started_at: new Date().toISOString(),
    }).select('id').single()
    if (data) router.push(`/session/${data.id}`)
    else setStartingSession(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="label">Loading...</p>
    </main>
  )

  const queueUrl = band ? `${appUrl}/${band.slug}` : ''
  const minTip = band ? band.min_tip_cents / 100 : 5

  return (
    <main style={{ minHeight: '100vh' }}>
      {showQR && band && <QRModal url={queueUrl} bandName={band.name} onClose={() => setShowQR(false)} />}

      {showNewSession && (
        <Modal title="Start a session" onClose={() => setShowNewSession(false)}>
          <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>Where are you playing?</h2>
          <input
            ref={venueInputRef}
            id="venue-autocomplete"
            className="input"
            type="text"
            value={venueName}
            onChange={e => setVenueName(e.target.value)}
            placeholder="Venue name (optional)"
            style={{ marginBottom: '20px' }}
            autoFocus
          />
          <button className="btn-primary" style={{ opacity: startingSession ? 0.6 : 1 }} onClick={startSession} disabled={startingSession}>
            {startingSession ? 'Starting...' : 'Start session'}
          </button>
        </Modal>
      )}

      {/* Nav */}
      <div className="top-rail">
        <NavWordmark size={28} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <a href="/settings" className="btn-ghost" style={{ textDecoration: 'none', width: 'auto' }}>Settings</a>
          <button className="btn-ghost" style={{ width: 'auto' }} onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      <div style={{ padding: '28px 20px' }}>
        <div className="star-divider" style={{ marginBottom: '28px' }}>
          <span style={{ color: 'var(--star)', fontSize: '10px' }}>✦ ✦ ✦</span>
        </div>

        {/* Active session CTA — shown when live */}
        {activeSession && (
          <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--accent-pale)', border: '2px solid var(--accent-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 6px var(--danger)', flexShrink: 0 }} />
              <p className="label-accent">Live now</p>
            </div>
            <p style={{ fontFamily: F, fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
              {activeSession.venue_name ?? 'Session in progress'}
            </p>
            <a href={`/session/${activeSession.id}`} className="btn-primary" style={{ textDecoration: 'none', fontSize: '18px', padding: '12px' }}>
              Back to live queue →
            </a>
          </div>
        )}

        {/* Act summary card */}
        {band && (
          <div style={{ marginBottom: '24px' }}>
            <p className="label" style={{ marginBottom: '14px' }}>Your act</p>
            <div className="card-ornate">
              <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
              <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>

              <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '22px', marginBottom: '16px' }}>{band.name}</h2>

              {/* Single clean config summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <ConfigRow icon="⬡" label="Link" value={`${appUrl}/${band.slug}`} isLink href={queueUrl} />
                <ConfigRow icon="$" label="Min request tip" value={`$${minTip}`} />
                <ConfigRow icon="◈" label="Stripe" value={band.stripe_account_id ? 'Connected' : 'Not connected'} valueColor={band.stripe_account_id ? 'var(--success)' : 'var(--danger)'} />
                {band.venmo_handle && <ConfigRow icon="V" label="Venmo" value={`@${band.venmo_handle}`} />}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                <a href="/settings" style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', letterSpacing: '0.05em' }}>
                  Edit in Settings →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Start new session */}
        {!activeSession && (
          <div style={{ marginBottom: '32px' }}>
            <button className="btn-primary" style={{ fontSize: '20px', padding: '16px' }} onClick={() => setShowNewSession(true)}>
              ✦ Start a session
            </button>
            {!band?.stripe_account_id && (
              <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center', lineHeight: '1.7' }}>
                Connect Stripe in{' '}
                <a href="/settings" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Settings</a>
                {' '}to accept card tips.
              </p>
            )}
          </div>
        )}

        {/* Past sessions */}
        {pastSessions.length > 0 && (
          <div>
            <p className="label" style={{ marginBottom: '14px' }}>Past sessions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {pastSessions.map(s => (
                <a key={s.id} href={`/session/${s.id}`} style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontFamily: F, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{s.venue_name ?? 'No venue set'}</p>
                    <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(s.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <p className="label" style={{ flexShrink: 0 }}>Ended</p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function ConfigRow({ icon, label, value, isLink, href, valueColor }: {
  icon: string; label: string; value: string
  isLink?: boolean; href?: string; valueColor?: string
}) {
  const F = "'Arvo', serif"
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
      <span style={{ fontFamily: F, fontSize: '13px', color: 'var(--text-dim)', width: '14px', textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', width: '110px', flexShrink: 0 }}>{label}</span>
      {isLink && href ? (
        <a href={href} style={{ fontFamily: F, fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</a>
      ) : (
        <span style={{ fontFamily: F, fontSize: '13px', color: valueColor ?? 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
      )}
    </div>
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
