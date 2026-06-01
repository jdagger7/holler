'use client'

import { useState } from 'react'
import HollerLogo from '@/components/HollerLogo'

type Props = {
  bandName: string
  onConfirm: (value: string, type: 'email' | 'phone') => void
}

export default function ContactPrompt({ bandName, onConfirm }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function detectType(val: string): 'email' | 'phone' {
    return val.includes('@') ? 'email' : 'phone'
  }

  function validate(val: string): string | null {
    const trimmed = val.trim()
    if (!trimmed) return 'Please enter your email or phone number.'
    if (trimmed.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address.'
    } else {
      const digits = trimmed.replace(/\D/g, '')
      if (digits.length < 10) return 'Please enter a valid phone number.'
    }
    return null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate(value)
    if (err) { setError(err); return }
    onConfirm(value.trim(), detectType(value.trim()))
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>

        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
          <HollerLogo variant="wordmark" size={40} />
        </div>

        <div className="star-divider" style={{ marginBottom: '32px' }}>
          <span style={{ color: 'var(--star)', fontSize: '10px' }}>✦</span>
        </div>

        <div className="card-ornate" style={{ textAlign: 'left' }}>
          <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
          <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>

          <p className="label-accent" style={{ marginBottom: '12px' }}>Before you request</p>
          <h2 style={{ fontSize: '22px', marginBottom: '8px', lineHeight: '1.3' }}>
            Where should we send your receipt?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.8' }}>
            Enter your email or phone. We'll use it to confirm your request and refund your tip if the song doesn't get played.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>
                Email or phone
              </label>
              <input
                className="input"
                type="text"
                value={value}
                onChange={e => { setValue(e.target.value); setError('') }}
                placeholder="you@email.com or (615) 000-0000"
                autoFocus
                autoComplete="email"
                inputMode="email"
              />
            </div>

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '12px' }}>{error}</p>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Let's go →
            </button>
          </form>

          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', lineHeight: '1.7' }}>
            We only use this to send receipts and process refunds. Nothing else.
          </p>
        </div>

      </div>
    </main>
  )
}
