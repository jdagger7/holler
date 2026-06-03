'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavWordmark from '@/components/NavWordmark'
import Modal from '@/components/Modal'

type Band = { id: string; name: string; slug: string; min_tip_cents: number; venmo_handle: string | null; stripe_account_id: string | null }

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
  const [stripeLoading, setStripeLoading] = useState(false)
  const router = useRouter()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://holler.live'
  // Show only the domain part for the slug prefix
  const appDomain = appUrl.replace(/^https?:\/\//, '')
  // On mobile, use just the shortest identifiable part
  const slugPrefix = appDomain.length > 22 ? appDomain.split('.')[0] + '/...' : appDomain + '/'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }
      const { data } = await supabase.from('bands').select('id, name, slug, min_tip_cents, venmo_handle, stripe_account_id').eq('user_id', user.id).single()
      if (data) { setBand(data); setName(data.name); setSlug(data.slug); setMinTip(String(data.min_tip_cents / 100)); setVenmoHandle(data.venmo_handle ?? '') }
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!slugManuallyEdited && name && band && name !== band.name) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }, [name, slugManuallyEdited, band])

  useEffect(() => {
    if (!band || slug === band.slug) { setSlugAvailable(null); return }
    if (!slug) { setSlugAvailable(null); return }
    const t = setTimeout(async () => {
      setCheckingSlug(true)
      const { data } = await supabase.from('bands').select('id').eq('slug', slug).single()
      setSlugAvailable(!data); setCheckingSlug(false)
    }, 400)
    return () => clearTimeout(t)
  }, [slug, band])

  async function handleConnectStripe() {
    if (!band) return
    setStripeLoading(true)
    try {
      const res = await fetch(`/api/stripe/connect-url?band_id=${band.id}`)
      const { url, error } = await res.json()
      if (error || !url) { setError('Could not start Stripe setup. Try again.'); setStripeLoading(false); return }
      window.location.href = url
    } catch { setError('Could not start Stripe setup. Try again.'); setStripeLoading(false) }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const amount = parseInt(minTip)
    if (isNaN(amount) || amount < 1) { setError('Minimum must be at least $1.'); return }
    if (amount > 100) { setError('Maximum is $100.'); return }
    if (!name.trim()) { setError('Act name is required.'); return }
    if (!slug.trim()) { setError('Holler link is required.'); return }
    if (slug !== band?.slug && slugAvailable === false) { setError('That URL is already taken.'); return }
    if (slug !== band?.slug) { setShowSlugWarning(true); return }
    save()
  }

  async function save() {
    if (!band) return
    setSaving(true); setShowSlugWarning(false)
    const cleanVenmo = venmoHandle.trim().replace(/^@/, '') || null
    const { error: err } = await supabase.from('bands').update({
      name: name.trim(), slug: slug.trim(),
      min_tip_cents: parseInt(minTip) * 100,
      venmo_handle: cleanVenmo,
    }).eq('id', band.id)
    if (err) { setError(err.message); setSaving(false); return }
    setBand(prev => prev ? { ...prev, name: name.trim(), slug: slug.trim(), min_tip_cents: parseInt(minTip) * 100, venmo_handle: cleanVenmo } : prev)
    setSaved(true); setSaving(false); setTimeout(() => setSaved(false), 2500)
  }

  const F = "'Arvo', serif"

  if (loading) return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p className="label">Loading...</p></main>

  return (
    <main style={{ minHeight: '100vh' }}>
      {showSlugWarning && (
        <Modal title="Change your Holler link?" onClose={() => setShowSlugWarning(false)}>
          <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>Heads up</h2>
          <p style={{ fontFamily: F, color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.8', marginBottom: '8px' }}>
            Your link is changing from <span style={{ color: 'var(--text)' }}>{appDomain}/{band?.slug}</span> to <span style={{ color: 'var(--accent)' }}>{appDomain}/{slug}</span>.
          </p>
          <p style={{ fontFamily: F, color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.8', marginBottom: '24px' }}>
            Any existing QR codes pointing to the old link will stop working.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={save}>Change it</button>
            <button className="btn-ghost" style={{ width: 'auto' }} onClick={() => setShowSlugWarning(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      <div className="top-rail">
        <NavWordmark size={28} />
        <a href="/dashboard" className="btn-ghost" style={{ textDecoration: 'none', width: 'auto' }}>← Dashboard</a>
      </div>

      <div style={{ padding: '28px 24px 40px', maxWidth: '480px', margin: '0 auto' }}>
        <div className="star-divider" style={{ marginBottom: '28px' }}>
          <span style={{ color: 'var(--star)', fontSize: '10px' }}>✦ ✦ ✦</span>
        </div>
        <h1 style={{ fontSize: '26px', marginBottom: '28px' }}>Settings</h1>

        <form onSubmit={handleSubmit}>
          {/* Your act */}
          <div className="card-ornate" style={{ marginBottom: '24px' }}>
            <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
            <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
            <p className="label-accent" style={{ marginBottom: '22px' }}>Your act</p>

            <div style={{ marginBottom: '20px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Artist / act name</label>
              <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. The Honky Tonk Devils" />
            </div>

            <div>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Your handle</label>
              <input className="input" type="text" value={slug}
                onChange={e => { setSlugManuallyEdited(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }}
                required
                placeholder="your-handle"
                style={{ borderColor: slug !== band?.slug && slugAvailable === false ? 'var(--danger)' : slug !== band?.slug && slugAvailable === true ? 'var(--success)' : undefined }}
              />
              <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px', letterSpacing: '0.02em' }}>
                ↳ {appUrl}/{slug || '…'}
              </p>
              {slug !== band?.slug && (
                <p style={{ fontFamily: F, fontSize: '11px', marginTop: '4px', color: slugAvailable === false ? 'var(--danger)' : slugAvailable === true ? 'var(--success)' : 'var(--text-muted)' }}>
                  {checkingSlug ? 'Checking...' : slugAvailable === true ? '✦ Available' : slugAvailable === false ? '✗ Already taken' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Payment settings */}
          <div className="card-ornate" style={{ marginBottom: '24px' }}>
            <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
            <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
            <p className="label-accent" style={{ marginBottom: '22px' }}>Payment settings</p>

            {/* Stripe connection */}
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Stripe</label>
              {band?.stripe_account_id ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--success)' }}>✓ Connected</p>
                  <button type="button" onClick={handleConnectStripe} disabled={stripeLoading}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: F, fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                    {stripeLoading ? 'Loading...' : 'Reconnect'}
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: '1.6' }}>
                    Connect Stripe to accept card payments.
                  </p>
                  <button type="button" onClick={handleConnectStripe} disabled={stripeLoading} className="btn-ghost" style={{ width: '100%' }}>
                    {stripeLoading ? 'Loading...' : 'Connect Stripe →'}
                  </button>
                </div>
              )}
            </div>

            {/* Min request amount */}
            <div style={{ marginBottom: '20px' }}>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Minimum request amount</label>
              <div style={{ position: 'relative', maxWidth: '140px' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontFamily: F, fontSize: '15px' }}>$</span>
                <input className="input" type="number" min="1" max="100" step="1" value={minTip} onChange={e => setMinTip(e.target.value)} style={{ paddingLeft: '28px' }} />
              </div>
              <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Applies to song requests only, not general tips.</p>
            </div>

            {/* Venmo */}
            <div>
              <label className="label" style={{ display: 'block', marginBottom: '8px' }}>Venmo handle</label>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border-warm)', borderRight: 'none', padding: '13px 12px', fontFamily: F, fontSize: '15px', color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>@</div>
                <input className="input" type="text" value={venmoHandle} onChange={e => setVenmoHandle(e.target.value.replace(/^@/, ''))} placeholder="your-venmo" style={{ flex: 1 }} />
              </div>
              <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>Optional. Lets audience tip you directly on Venmo.</p>
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontFamily: F, fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

          <button type="submit" className="btn-primary" style={{ opacity: saving ? 0.6 : 1 }} disabled={saving || (slug !== band?.slug && slugAvailable === false)}>
            {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save settings'}
          </button>
        </form>
      </div>
    </main>
  )
}
