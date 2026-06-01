'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import HollerLogo from '@/components/HollerLogo'

export default function SettingsPage() {
  const [band, setBand] = useState<{ id: string; name: string; min_tip_cents: number } | null>(null)
  const [minTip, setMinTip] = useState('5')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }
      const { data } = await supabase
        .from('bands')
        .select('id, name, min_tip_cents')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setBand(data)
        setMinTip(String(data.min_tip_cents / 100))
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amount = parseInt(minTip)
    if (isNaN(amount) || amount < 1) { setError('Minimum tip must be at least $1.'); return }
    if (amount > 100) { setError('Maximum allowed minimum is $100.'); return }

    setSaving(true)
    const { error: err } = await supabase
      .from('bands')
      .update({ min_tip_cents: amount * 100 })
      .eq('id', band!.id)

    if (err) { setError(err.message); setSaving(false); return }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="label">Loading...</p>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px', maxWidth: '480px', margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <HollerLogo variant="wordmark" size={36} />
        <a href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
          ← Dashboard
        </a>
      </div>

      <div className="star-divider" style={{ marginBottom: '36px' }}>
        <span style={{ color: 'var(--star)', fontSize: '10px' }}>✦ ✦ ✦</span>
      </div>

      <h1 style={{ fontSize: '28px', marginBottom: '32px' }}>Settings</h1>

      <form onSubmit={handleSave}>
        <div className="card-ornate" style={{ marginBottom: '24px' }}>
          <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
          <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>

          <p className="label-accent" style={{ marginBottom: '20px' }}>Tip settings</p>

          <div style={{ marginBottom: '8px' }}>
            <label className="label" style={{ display: 'block', marginBottom: '10px' }}>
              Minimum tip amount
            </label>
            <div style={{ position: 'relative', maxWidth: '160px' }}>
              <span style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '15px',
              }}>$</span>
              <input
                className="input"
                type="number"
                min="1"
                max="100"
                step="1"
                value={minTip}
                onChange={e => setMinTip(e.target.value)}
                style={{ paddingLeft: '28px' }}
              />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', lineHeight: '1.7' }}>
              The least someone can tip for a request. Default is $5.
            </p>
          </div>
        </div>

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
        )}

        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', opacity: saving ? 0.6 : 1 }}
          disabled={saving}
        >
          {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save settings'}
        </button>
      </form>

    </main>
  )
}
