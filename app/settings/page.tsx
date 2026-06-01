'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavWordmark from '@/components/NavWordmark'
import Modal from '@/components/Modal'

type Band = {
  id: string
  name: string
  slug: string
  min_tip_cents: number
  venmo_handle: string | null
}

export default function SettingsPage() {
  const [band, setBand] = useState<Band | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [minTip, setMinTip] = useState('5')
  const [venmoHandle, setVenmoHandle] = useState('')

  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [showSlugWarning, setShowSlugWarning] = useState(false)

  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }
      const { data } = await supabase
        .from('bands')
        .select('id, name, slug, min_tip_cents, venmo_handle')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setBand(data)
        setName(data.name)
        setSlug(data.slug)
        setMinTip(String(data.min_tip_cents / 100))
        setVenmoHandle(data.venmo_handle ?? '')
      }
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!slugManuallyEdited && name && band && name !== band.name) {
      const generated = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      setSlug(generated)
    }
  }, [name, slugManuallyEdited, band])

  useEffect(() => {
    if (!band || slug === band.slug) { setSlugAvailable(null); return }
    if (!slug) { setSlugAvailable(null); return }
    const timeout = setTimeout(async () => {
      setCheckingSlug(true)
      const { data } = await supabase.from('bands').select('id').eq('slug', slug).single()
      setSlugAvailable(!data)
      setCheckingSlug(false)
    }, 400)
    return () => clearTimeout(timeout)
  }, [slug, band])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amount = parseInt(minTip)
    if (isNaN(amount) || amount < 1) { setError('Minimum tip must be at least $1.'); return }
    if (amount > 100) { setError('Maximum allowed minimum is $100.'); return }
    if (!name.trim()) { setError('Act name is required.'); return }
    if (!slug.trim()) { setError('Holler link is required.'); return }
    if (slug !== band?.slug && slugAvailable === false) { setError('That URL is already taken.'); return }
    if (slug !== band?.slug) { setShowSlugWarning(true); return }
    save()
  }

  async function save() {
    if (!band) return
    setSaving(true)
    setShowSlugWarning(false)

    // Clean venmo handle — strip @ if present
    const cleanVenmo = venmoHandle.trim().replace(/^@/, '') || null

    const { error: err } = await supabase
      .from('bands')
      .update({
        name: name.trim(),
        slug: slug.trim(),
        min_tip_cents: parseInt(minTip) * 100,
        venmo_handle: cleanVenmo,
      })
      .eq('id', band.id)

    if (err) { setError(err.message); setSaving(false); return }

    setBand(prev => prev ? { ...prev, name: name.trim(), slug: slug.trim(), min_tip_cents: parseInt(minTip) * 100, venmo_handle: cleanVenmo } : prev)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="label">Loading...</p>
      </main>
    )
  }

  const slugChanged = slug !== band?.slug

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '480px', margin: '0 auto' }}>

      {showSlugWarning && (
        <Modal title="Change your Holler link?" onClose={() => setShowSlugWarning(false)}>
          <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>Heads up</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8', marginBottom: '8px' }}>
            Your link is changing from{' '}
            <span style={{ color: 'var(--text)' }}>holler.live/{band?.slug}</span>{' '}
            to{' '}
            <span style={{ color: 'var(--accent)' }}>holler.live/{slug}</span>.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8', marginBottom: '24px' }}>
            Any existing QR codes pointing to the old link will stop working.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={save}>Change it</button>
            <button className="btn-ghost" onClick={() => setShowSlugWarning(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', marginBottom: '12px', gap: '12px' }}>
        <NavWordmark size={36} />
        <a href="/dashboard" className="btn-ghost" style={{ textDecoration: 'none' }}>← Dashboard</a>
      </div>

      <div className="star-divider" style={{ marginBottom: '36px' }}>
        <span style={{ color: 'var(--star)', fontSize: '10px' }}>✦ ✦ ✦</span>
      </div>

      <h1 style={{ fontSize: '28px', marginBottom: '32px' }}>Settings</h1>

      <form onSubmit={handleSubmit}>

        {/* Act details */}
        <div className="card-ornate" style={{ marginBottom: '24px' }}>
          <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
          <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
          <p className="label-accent" style={{ marginBottom: '24px' }}>Your act</p>

          <div style={{ marginBottom: '24px' }}>
            <label className="label" style={{ display: 'block', marginBottom: '10px' }}>Artist / act name</label>
            <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. The Honky Tonk Devils" />
          </div>

          <div>
            <label className="label" style={{ display: 'block', marginBottom: '10px' }}>Holler link</label>
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
                style={{ paddingLeft: '104px', borderColor: slugChanged && slugAvailable === false ? 'var(--danger)' : slugChanged && slugAvailable === true ? 'var(--success)' : undefined }}
              />
            </div>
            {slugChanged && (
              <p style={{ fontSize: '11px', marginTop: '8px', color: slugAvailable === false ? 'var(--danger)' : slugAvailable === true ? 'var(--success)' : 'var(--text-muted)' }}>
                {checkingSlug ? 'Checking...' : slugAvailable === true ? '✦ Available' : slugAvailable === false ? '✗ Already taken' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Tip settings */}
        <div className="card-ornate" style={{ marginBottom: '24px' }}>
          <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
          <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
          <p className="label-accent" style={{ marginBottom: '24px' }}>Tip settings</p>

          <div style={{ marginBottom: '24px' }}>
            <label className="label" style={{ display: 'block', marginBottom: '10px' }}>Minimum tip amount</label>
            <div style={{ position: 'relative', maxWidth: '160px' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '15px' }}>$</span>
              <input className="input" type="number" min="1" max="100" step="1" value={minTip} onChange={e => setMinTip(e.target.value)} style={{ paddingLeft: '28px' }} />
            </div>
          </div>

          <div>
            <label className="label" style={{ display: 'block', marginBottom: '10px' }}>Venmo handle</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '15px' }}>@</span>
              <input
                className="input"
                type="text"
                value={venmoHandle}
                onChange={e => setVenmoHandle(e.target.value.replace(/^@/, ''))}
                placeholder="your-venmo"
                style={{ paddingLeft: '28px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.7' }}>
              Optional — lets audience tip you directly on Venmo.
            </p>
          </div>
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', opacity: saving ? 0.6 : 1 }}
          disabled={saving || (slugChanged && slugAvailable === false)}
        >
          {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save settings'}
        </button>
      </form>

    </main>
  )
}
