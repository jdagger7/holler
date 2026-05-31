'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Band = { id: string; name: string; slug: string }

export default function DashboardPage() {
  const [band, setBand] = useState<Band | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }
      const { data } = await supabase.from('bands').select('id, name, slug').eq('user_id', user.id).single()
      setBand(data)
      setLoading(false)
    }
    load()
  }, [router])

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

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '600px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
        <div className="wordmark" style={{ fontSize: '48px' }}>Holler</div>
        <button onClick={handleSignOut} className="btn-ghost">Sign out</button>
      </div>

      <div className="rule-double" style={{ marginBottom: '40px' }} />

      {/* Band card */}
      <div style={{ marginBottom: '40px' }}>
        <p className="label" style={{ marginBottom: '14px' }}>Your outfit</p>
        {band ? (
          <div className="card card-ticket">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '26px', marginBottom: '6px' }}>{band.name}</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  holler.live/<span style={{ color: 'var(--accent)' }}>{band.slug}</span>
                </p>
              </div>
              <span className="label-accent" style={{ fontSize: '9px', border: '1px solid var(--accent-dim)', padding: '4px 8px' }}>
                Active
              </span>
            </div>
            <hr className="rule" style={{ marginBottom: '20px' }} />
            <button className="btn-primary" style={{ fontSize: '18px' }}>
              Start tonight's session →
            </button>
          </div>
        ) : (
          <div className="card">
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px', lineHeight: '1.8' }}>
              Before you can take requests, we need to know who's playing.
            </p>
            <a href="/setup" className="btn-primary" style={{ textDecoration: 'none', fontSize: '18px' }}>
              Set up your band →
            </a>
          </div>
        )}
      </div>

      {/* Sessions */}
      <div>
        <p className="label" style={{ marginBottom: '14px' }}>Past sessions</p>
        <div className="card" style={{ padding: '40px 28px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.06em' }}>
            No sessions on the books yet.
          </p>
        </div>
      </div>

    </main>
  )
}
