'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Band = {
  id: string
  name: string
  slug: string
}

export default function DashboardPage() {
  const [band, setBand] = useState<Band | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const { data } = await supabase
        .from('bands')
        .select('id, name, slug')
        .eq('user_id', user.id)
        .single()

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
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '640px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '48px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700' }}>Holler</h1>
        <button onClick={handleSignOut} className="btn-ghost" style={{ padding: '8px 16px', fontSize: '11px' }}>
          Sign out
        </button>
      </div>

      {/* Band section */}
      <div style={{ marginBottom: '40px' }}>
        <p className="label" style={{ marginBottom: '16px' }}>Your band</p>
        {band ? (
          <div className="card">
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{band.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              holler.live/<span style={{ color: 'var(--accent)' }}>{band.slug}</span>
            </p>
            <button className="btn-primary">
              Start a session
            </button>
          </div>
        ) : (
          <div className="card">
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '13px' }}>
              Set up your band profile to start accepting requests.
            </p>
            <a href="/setup" className="btn-primary" style={{ textDecoration: 'none' }}>
              Set up band profile
            </a>
          </div>
        )}
      </div>

      {/* Sessions */}
      <div>
        <p className="label" style={{ marginBottom: '16px' }}>Sessions</p>
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {band ? 'No sessions yet. Start one above.' : 'Set up your band profile to start a session.'}
          </p>
        </div>
      </div>

    </main>
  )
}
