'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import HollerLogo from '@/components/HollerLogo'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard')
      else setChecking(false)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
    else setSubmitted(true)
  }

  if (checking) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="label">Loading...</p>
      </main>
    )
  }

  if (submitted) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div className="card-ornate" style={{ padding: '40px 32px' }}>
            <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
            <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
            <p className="label-accent" style={{ marginBottom: '20px' }}>Link on its way</p>
            <h2 style={{ fontSize: '30px', marginBottom: '12px' }}>Check your inbox</h2>
            <div className="star-divider" style={{ marginBottom: '20px' }}>
              <span style={{ color: 'var(--star)' }}>✦</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.9' }}>
              Sent a magic link to{' '}
              <span style={{ color: 'var(--text)' }}>{email}</span>.
              <br />
              Click it to sign in.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>

        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
          <HollerLogo variant="full" size={320} />
        </div>

        <p className="label" style={{ marginBottom: '40px' }}>Live Song Requests</p>

        <div className="card-ornate" style={{ textAlign: 'left' }}>
          <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
          <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '10px' }}>
                Band email
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@band.com"
                autoFocus
              />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.7' }}>
                New or returning — we'll send you a sign-in link either way.
              </p>
            </div>

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '12px' }}>{error}</p>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              Send magic link
            </button>
          </form>
        </div>

        {/* Bottom tagline — readable color, not dim */}
        <p style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.7' }}>
          Looking to request a song?{' '}
          <span style={{ color: 'var(--text-muted)' }}>Scan the QR code at the venue.</span>
        </p>

      </div>
    </main>
  )
}
