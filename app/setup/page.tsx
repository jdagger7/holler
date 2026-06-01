'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavWordmark from '@/components/NavWordmark'

export default function SetupPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!slugManuallyEdited && name) {
      const generated = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      setSlug(generated)
    }
  }, [name, slugManuallyEdited])

  useEffect(() => {
    if (!slug) { setSlugAvailable(null); return }
    const timeout = setTimeout(async () => {
      setChecking(true)
      const { data } = await supabase.from('bands').select('id').eq('slug', slug).single()
      setSlugAvailable(!data)
      setChecking(false)
    }, 400)
    return () => clearTimeout(timeout)
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!slugAvailable) { setError("That URL's already been claimed."); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signup'); return }
    const { error } = await supabase.from('bands').insert({ name, slug, email: user.email, user_id: user.id })
    if (error) { setError(error.message); setSaving(false) }
    else router.push('/dashboard')
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <NavWordmark size={36} />
          <a href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            ← Back
          </a>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <p className="label-accent" style={{ marginBottom: '8px' }}>Set up your act</p>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>What are you called?</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Takes 30 seconds. You can change it later.
          </p>
        </div>

        <div className="card-ornate">
          <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
          <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '10px' }}>
                Artist / act name
              </label>
              <input
                className="input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="e.g. The Honky Tonk Devils"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '10px' }}>
                Your Holler link
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px', pointerEvents: 'none', userSelect: 'none' }}>
                  holler.live/
                </span>
                <input
                  className="input"
                  type="text"
                  value={slug}
                  onChange={e => { setSlugManuallyEdited(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }}
                  required
                  placeholder="your-act-name"
                  style={{
                    paddingLeft: '104px',
                    borderColor: slugAvailable === false ? 'var(--danger)' : slugAvailable === true ? 'var(--success)' : undefined,
                  }}
                />
              </div>
              <p style={{ fontSize: '11px', marginTop: '8px', color: slugAvailable === false ? 'var(--danger)' : slugAvailable === true ? 'var(--success)' : 'var(--text-muted)' }}>
                {checking ? 'Checking...' : slugAvailable === true ? '✦ All yours' : slugAvailable === false ? '✗ Already claimed' : "The link you'll put on your QR code"}
              </p>
            </div>

            {error && <p style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '16px' }}>{error}</p>}

            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={saving || slugAvailable !== true}>
              {saving ? 'Saving...' : 'Hang my shingle →'}
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}
