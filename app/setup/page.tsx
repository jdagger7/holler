'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // Auto-generate slug from band name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setSlug(generated)
    }
  }, [name, slugManuallyEdited])

  // Check slug availability
  useEffect(() => {
    if (!slug) { setSlugAvailable(null); return }
    const timeout = setTimeout(async () => {
      setChecking(true)
      const { data } = await supabase
        .from('bands')
        .select('id')
        .eq('slug', slug)
        .single()
      setSlugAvailable(!data)
      setChecking(false)
    }, 400)
    return () => clearTimeout(timeout)
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!slugAvailable) { setError('That URL is already taken.'); return }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signup'); return }

    const { error } = await supabase.from('bands').insert({
      name,
      slug,
      email: user.email,
      user_id: user.id,
    })

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>

        <div style={{ marginBottom: '40px' }}>
          <a href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            ← Back
          </a>
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>
          Set up your band
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '13px' }}>
          This takes 30 seconds. You can change anything later.
        </p>

        <form onSubmit={handleSubmit}>

          {/* Band name */}
          <div style={{ marginBottom: '24px' }}>
            <label className="label" style={{ display: 'block', marginBottom: '8px' }}>
              Band name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="The Midnight Cowboys"
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

          {/* Slug */}
          <div style={{ marginBottom: '32px' }}>
            <label className="label" style={{ display: 'block', marginBottom: '8px' }}>
              Your Holler URL
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                fontSize: '13px',
                pointerEvents: 'none',
                userSelect: 'none',
              }}>
                holler.live/
              </div>
              <input
                type="text"
                value={slug}
                onChange={e => {
                  setSlugManuallyEdited(true)
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }}
                required
                placeholder="your-band-name"
                style={{
                  width: '100%',
                  background: 'var(--bg-raised)',
                  border: `1px solid ${slugAvailable === false ? 'var(--danger)' : slugAvailable === true ? 'var(--success)' : 'var(--border)'}`,
                  color: 'var(--text)',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '14px',
                  padding: '12px 16px 12px 100px',
                  outline: 'none',
                }}
              />
            </div>
            <p style={{ fontSize: '12px', marginTop: '8px', color: slugAvailable === false ? 'var(--danger)' : slugAvailable === true ? 'var(--success)' : 'var(--text-muted)' }}>
              {checking ? 'Checking...' : slugAvailable === true ? '✓ Available' : slugAvailable === false ? '✗ Already taken' : 'This is the link you\'ll share with your audience'}
            </p>
          </div>

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', opacity: saving ? 0.6 : 1 }}
            disabled={saving || slugAvailable !== true}
          >
            {saving ? 'Saving...' : 'Create band profile'}
          </button>

        </form>
      </div>
    </main>
  )
}
