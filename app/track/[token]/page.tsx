'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import HollerLogo from '@/components/HollerLogo'

type TipData = {
  id: string
  amount_cents: number
  status: 'held' | 'captured' | 'refunded'
  created_at: string
  request: {
    id: string
    title: string
    artist: string
    status: 'pending' | 'accepted' | 'played' | 'rejected'
    reject_reason: string | null
    played_at: string | null
    session: {
      id: string
      venue_name: string | null
      band: {
        name: string
        slug: string
      }
    }
  }
}

const REJECT_LABELS: Record<string, string> = {
  dont_know: "They don't know this one",
  not_tonight: 'Not on the setlist tonight',
  already_played: 'Already played earlier',
}

export default function TrackingPage() {
  const params = useParams()
  const token = params.token as string

  const [tip, setTip] = useState<TipData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tips')
        .select(`
          id, amount_cents, status, created_at,
          request:requests(
            id, title, artist, status, reject_reason, played_at,
            session:sessions(
              id, venue_name,
              band:bands(name, slug)
            )
          )
        `)
        .eq('tracking_token', token)
        .single()

      if (data) setTip(data as any)
      setLoading(false)
    }
    load()
  }, [token])

  useEffect(() => {
    if (!tip) return
    const channel = supabase
      .channel(`tip-${tip.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${tip.request.id}` }, (payload) => {
        setTip(prev => prev ? { ...prev, request: { ...prev.request, ...payload.new as any } } : prev)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tips', filter: `id=eq.${tip.id}` }, (payload) => {
        setTip(prev => prev ? { ...prev, ...payload.new as any } : prev)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tip])

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="label">Loading...</p>
      </main>
    )
  }

  if (!tip) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p className="label" style={{ marginBottom: '12px' }}>Request not found</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>This link may be invalid or expired.</p>
        </div>
      </main>
    )
  }

  const { request } = tip
  const session = request.session as any
  const bandName = session?.band?.name ?? 'the band'
  const bandSlug = session?.band?.slug ?? ''
  const venue = session?.venue_name
  const amount = `$${(tip.amount_cents / 100).toFixed(0)}`

  const statusConfig = {
    pending: {
      label: 'In the queue',
      color: 'var(--text-muted)',
      borderColor: 'var(--border)',
      message: `Your request is in the queue. ${bandName} will see it shortly.`,
    },
    accepted: {
      label: 'Coming up ✦',
      color: 'var(--success)',
      borderColor: 'var(--success)',
      message: `${bandName} accepted your request — it's coming up soon.`,
    },
    played: {
      label: 'Played ✓',
      color: 'var(--accent)',
      borderColor: 'var(--accent)',
      message: `${bandName} played your song! Your tip of ${amount} has been collected. Hope you enjoyed it.`,
    },
    rejected: {
      label: 'Passed on',
      color: 'var(--text-muted)',
      borderColor: 'var(--border)',
      message: request.reject_reason
        ? REJECT_LABELS[request.reject_reason] ?? 'The band passed on this one.'
        : 'The band passed on this one.',
    },
  }

  const config = statusConfig[request.status] ?? statusConfig.pending

  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px', maxWidth: '420px', margin: '0 auto' }}>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <HollerLogo variant="wordmark" size={32} />
        {bandSlug && (
          <a
            href={`/${bandSlug}`}
            style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}
          >
            ← Back to queue
          </a>
        )}
      </div>

      <div className="card-ornate">
        <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
        <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>

        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: config.color, border: `1px solid ${config.borderColor}`, padding: '4px 10px', display: 'inline-block' }}>
            {config.label}
          </span>
        </div>

        <h2 style={{ fontSize: '26px', marginBottom: '4px' }}>{request.title}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>{request.artist}</p>

        <div className="star-divider" style={{ marginBottom: '20px' }}>
          <span style={{ color: 'var(--star)' }}>✦</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Tip</span>
            <span style={{ color: request.status === 'played' ? 'var(--success)' : 'var(--text)' }}>
              {amount} {request.status === 'played' ? '(collected)' : request.status === 'rejected' ? '(refunded)' : '(held)'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Artist</span>
            <span>{bandName}</span>
          </div>
          {venue && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Venue</span>
              <span>{venue}</span>
            </div>
          )}
          {request.played_at && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Played at</span>
              <span>{new Date(request.played_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          )}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.8', padding: '14px', background: 'var(--bg-raised)', border: '1px solid var(--border)', marginBottom: '20px' }}>
          {config.message}
        </p>

        {bandSlug && (
          <a
            href={`/${bandSlug}`}
            className="btn-primary"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginBottom: '10px' }}
          >
            Request another song →
          </a>
        )}
      </div>

    </main>
  )
}
