'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import HollerLogo from '@/components/HollerLogo'

type TipWithRequest = {
  id: string
  amount_cents: number
  status: 'held' | 'captured' | 'refunded'
  created_at: string
  tracking_token: string
  request: {
    id: string
    title: string
    artist: string
    status: 'pending' | 'accepted' | 'played' | 'rejected'
    reject_reason: string | null
    played_at: string | null
    session: {
      venue_name: string | null
      band: {
        name: string
      }
    }
  }
}

const REJECT_LABELS: Record<string, string> = {
  dont_know: "They don't know this one",
  not_tonight: "Not on the setlist tonight",
  already_played: "Already played earlier",
}

export default function TrackingPage() {
  const params = useParams()
  const token = params.token as string

  const [tip, setTip] = useState<TipWithRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tips')
        .select(`
          id, amount_cents, status, created_at, tracking_token,
          request:requests(
            id, title, artist, status, reject_reason, played_at,
            session:sessions(
              venue_name,
              band:bands(name)
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

  // Real-time updates
  useEffect(() => {
    if (!tip) return
    const channel = supabase
      .channel(`tip-${tip.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'requests',
        filter: `id=eq.${tip.request.id}`,
      }, (payload) => {
        setTip(prev => prev ? {
          ...prev,
          request: { ...prev.request, ...payload.new as any }
        } : prev)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tips',
        filter: `id=eq.${tip.id}`,
      }, (payload) => {
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
  const amount = `$${(tip.amount_cents / 100).toFixed(0)}`
  const bandName = (request.session as any)?.band?.name ?? 'the band'
  const venue = (request.session as any)?.venue_name

  const statusConfig = {
    pending: {
      label: 'In the queue',
      color: 'var(--text-muted)',
      borderColor: 'var(--border)',
      message: `Your request is in the queue. ${bandName} will see it shortly.`,
    },
    accepted: {
      label: 'Coming up',
      color: 'var(--success)',
      borderColor: 'var(--success)',
      message: `${bandName} has accepted your request — it's coming up soon.`,
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
      message: request.reject_reason && request.reject_reason_public !== false
        ? REJECT_LABELS[request.reject_reason] ?? 'The band passed on this one.'
        : 'The band passed on this one.',
    },
  }

  const config = statusConfig[request.status] ?? statusConfig.pending

  return (
    <main style={{ minHeight: '100vh', padding: '40px 20px', maxWidth: '420px', margin: '0 auto' }}>

      <div style={{ marginBottom: '32px' }}>
        <HollerLogo variant="wordmark" size={32} />
      </div>

      <div className="card-ornate">
        <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
        <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>

        {/* Status badge */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: config.color,
            border: `1px solid ${config.borderColor}`,
            padding: '4px 10px',
            display: 'inline-block',
          }}>
            {config.label}
          </span>
        </div>

        {/* Song */}
        <h2 style={{ fontSize: '26px', marginBottom: '4px' }}>{request.title}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>{request.artist}</p>

        <div className="star-divider" style={{ marginBottom: '20px' }}>
          <span style={{ color: 'var(--star)' }}>✦</span>
        </div>

        {/* Details */}
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

        {/* Status message */}
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.8', padding: '14px', background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          {config.message}
        </p>
      </div>

    </main>
  )
}
