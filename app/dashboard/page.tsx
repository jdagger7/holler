'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import HollerLogo from '@/components/HollerLogo'

type Band = { id: string; name: string; slug: string }
type Session = { id: string; venue_name: string | null; started_at: string; status: string }

export default function DashboardPage() {
  const [band, setBand] = useState<Band | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const { data: bandData } = await supabase
        .from('bands')
        .select('id, name, slug')
        .eq('user_id', user.id)
        .single()

      if (bandData) {
        setBand(bandData)
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('id, venue_name, started_at, status')
          .eq('band_id', bandData.id)
          .order('started_at', { ascending: false })
          .limit(10)
        setSessions(sessionData ?? [])
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function handleStartSession() {
    if (!band) return
    setStarting(true)

    const venueName = window.prompt("Where are you playing tonight? (optional — press OK to skip)")

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        band_id: band.id,
        venue_name: venueName?.trim() || null,
        status: 'active',
      })
      .select('id')
      .single()

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

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '600px', margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <HollerLogo variant="wordmark" size={48} />
        <button onClick={handleSignOut} className="btn-ghost">Sign out</button>
      </div>

      <div className="star-divider" style={{ marginBottom: '40px' }}>
        <span style={{ color: 'var(--star)', fontSize: '10px' }}>✦ ✦ ✦</span>
      </div>

      {/* Band card */}
      <div style={{ marginBottom: '36px' }}>
        <p className="label" style={{ marginBottom: '14px' }}>Your outfit</p>
        {band ? (
          <div className="card-ornate">
            <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
            <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '26px', marginBottom: '6px' }}>{band.name}</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  holler.live/<span style={{ color: 'var(--accent)' }}>{band.slug}</span>
                </p>
              </div>
              <span className="label-accent" style={{ fontSize: '9px', border: '1px solid var(--accent-dim)', padding: '4px 8px' }}>
                ✦ Ready
              </span>
            </div>
            <div className="star-divider" style={{ marginBottom: '20px' }}>
              <span style={{ color: 'var(--border-bright)', fontSize: '8px' }}>✦</span>
            </div>
            {activeSession ? (
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                  You have an active session in progress.
                </p>
                <button
                  className="btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => router.push(`/session/${activeSession.id}`)}
                >
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
                {starting ? 'Starting...' : 'Start tonight\'s session →'}
              </button>
            )}
          </div>
        ) : (
          <div className="card-ornate">
            <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
            <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px', lineHeight: '1.9' }}>
              Before the requests come rollin' in, we need to know who's playing.
            </p>
            <a href="/setup" className="btn-primary" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
              Set up your band
            </a>
          </div>
        )}
      </div>

      {/* Past sessions */}
      <div>
        <p className="label" style={{ marginBottom: '14px' }}>Past sessions</p>
        {sessions.filter(s => s.status !== 'active').length === 0 ? (
          <div className="card" style={{ padding: '40px 28px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.08em' }}>
              No sessions on the books yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessions.filter(s => s.status !== 'active').map(session => (
              <div key={session.id} className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13px', marginBottom: '2px' }}>
                    {session.venue_name ?? 'No venue set'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="label" style={{ fontSize: '10px' }}>{session.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  )
}
