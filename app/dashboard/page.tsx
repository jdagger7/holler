'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import HollerLogo from '@/components/HollerLogo'

type Band = { id: string; name: string; slug: string }

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
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '600px', margin: '0 auto' }}>

      {/* Header */}
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
            <button className="btn-primary" style={{ width: '100%' }}>
              Start tonight's session
            </button>
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

      {/* Sessions */}
      <div>
        <p className="label" style={{ marginBottom: '14px' }}>Past sessions</p>
        <div className="card" style={{ padding: '40px 28px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.08em' }}>
            No sessions on the books yet.
          </p>
        </div>
      </div>

    </main>
  )
}
