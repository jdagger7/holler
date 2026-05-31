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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
    else setSubmitted(true)
  }

  if (submitted) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '420px', width: '100%' }}>
          <div className="card card-ticket">
            <p className="label-accent" style={{ marginBottom: '20px' }}>— Link on its way —</p>
            <h2 style={{ fontSize: '30px', marginBottom: '12px' }}>Check your inbox</h2>
            <hr className="rule" style={{ marginBottom: '20px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8' }}>
              We sent a magic link to{' '}
              <span style={{ color: 'var(--text)' }}>{email}</span>.
              <br />
              Click it to finish setting up your account.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>

        <div style={{ marginBottom: '52px' }}>
          <div className="wordmark">Holler</div>
          <div className="rule-double" style={{ marginTop: '8px', marginBottom: '16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Live song requests &nbsp;·&nbsp; Nashville & beyond
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '8px' }}>
            <label className="label" style={{ display: 'block', marginBottom: '10px' }}>
              Band email address
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
            <p style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '12px', marginTop: '8px' }}>{error}</p>
          )}

          <div style={{ marginTop: '20px' }}>
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px 28px', fontSize: '20px' }}>
              Send magic link
            </button>
          </div>
        </form>

        <p style={{ marginTop: '28px', color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.06em' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in →</a>
        </p>

      </div>
    </main>
  )
}
