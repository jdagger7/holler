'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setError(error.message)
    else setSubmitted(true)
  }

  if (submitted) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <div className="card" style={{ borderColor: 'var(--accent-dim)' }}>
            <p className="label" style={{ color: 'var(--accent)', marginBottom: '16px' }}>Magic link sent</p>
            <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>Check your inbox</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
              We sent a link to <span style={{ color: 'var(--text)' }}>{email}</span>. 
              Click it to finish setting up your band account.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>

        <div style={{ marginBottom: '48px' }}>
          <h1 style={{ fontSize: '52px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Holler
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Live song requests for bands.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label className="label" style={{ display: 'block', marginBottom: '8px' }}>
              Band email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="band@email.com"
              style={{
                width: '100%',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '14px',
                padding: '12px 16px',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>{error}</p>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Send magic link
          </button>
        </form>

        <p style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in</a>
        </p>

      </div>
    </main>
  )
}
