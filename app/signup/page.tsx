'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import HollerLogo from '@/components/HollerLogo'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

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

  if (submitted) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div className="card-ornate" style={{ padding: '40px 32px' }}>
            <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
            <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
            <p className="label-accent" style={{ marginBottom: '20px' }}>Ride's on its way</p>
            <h2 style={{ fontSize: '32px', marginBottom: '16px', fontStyle: 'italic' }}>
              Check your inbox
            </h2>
            <div className="star-divider" style={{ justifyContent: 'center', marginBottom: '20px' }}>
              <span style={{ color: 'var(--star)' }}>✦</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.9' }}>
              Sent a link to <span style={{ color: 'var(--text)' }}>{email}</span>.<br />
              Click it to get your band on the boards.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>

        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
          <HollerLogo variant="full" size={420} />
        </div>

        <p className="label" style={{ marginBottom: '32px' }}>
          Live song requests
        </p>

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
              />
            </div>

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '12px' }}>{error}</p>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              Send magic link
            </button>
          </form>
        </div>

        <p style={{ marginTop: '24px', color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.06em' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in →</a>
        </p>

      </div>
    </main>
  )
}
