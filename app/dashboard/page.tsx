'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/signup')
      } else {
        setUser(data.user)
      }
      setLoading(false)
    })
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

      {/* Band setup prompt */}
      <div style={{ marginBottom: '40px' }}>
        <p className="label" style={{ marginBottom: '16px' }}>Your band</p>
        <div className="card">
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '13px' }}>
            Set up your band profile to start accepting requests.
          </p>
          <button className="btn-primary">
            Set up band profile
          </button>
        </div>
      </div>

      {/* Sessions section — placeholder */}
      <div>
        <p className="label" style={{ marginBottom: '16px' }}>Sessions</p>
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            No sessions yet. Set up your band profile to start one.
          </p>
        </div>
      </div>

    </main>
  )
}
