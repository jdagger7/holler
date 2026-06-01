'use client'

import { useState } from 'react'
import HollerLogo from '@/components/HollerLogo'

type Props = {
  onConfirm: (value: string, type: 'email' | 'phone') => void
}

export default function ContactPrompt({ onConfirm }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function detectType(val: string): 'email' | 'phone' {
    return val.includes('@') ? 'email' : 'phone'
  }

  function validate(val: string): string | null {
    const trimmed = val.trim()
    if (!trimmed) return 'Required.'
    if (trimmed.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Invalid email.'
    } else {
      if (val.replace(/\D/g, '').length < 10) return 'Invalid phone number.'
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
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '360px', width: '100%' }}>

        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
          <HollerLogo variant="wordmark" size={40} />
        </div>

        <form onSubmit={handleSubmit}>
          <label className="label" style={{ display: 'block', marginBottom: '10px' }}>
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
          />
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '8px' }}>{error}</p>
          )}
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }}>
            Continue →
          </button>
        </form>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px', lineHeight: '1.7', textAlign: 'center' }}>
          Used for receipts and refunds only.
        </p>

      </div>
    </main>
  )
}
