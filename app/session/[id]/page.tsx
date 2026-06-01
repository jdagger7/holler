'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import NavWordmark from '@/components/NavWordmark'
import Modal from '@/components/Modal'
import QRModal from '@/components/QRModal'

type Request = {
  id: string
  title: string
  artist: string
  spotify_album_art_url: string | null
  status: 'pending' | 'accepted' | 'played' | 'rejected'
  reject_reason: string | null
  created_at: string
  tip_total: number
}

type Session = {
  id: string
  venue_name: string | null
  started_at: string
  ended_at: string | null
  status: string
  band_id: string
}

const REJECT_REASONS = [
  { value: 'dont_know', label: "Don't know it" },
  { value: 'not_tonight', label: 'Not tonight' },
  { value: 'already_played', label: 'Already played it' },
]

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.id as string
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [ending, setEnding] = useState(false)
  const [reviving, setReviving] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [bandSlug, setBandSlug] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://holler.live'
  const queueUrl = bandSlug ? `${appUrl}/${bandSlug}` : ''
  const displayUrl = bandSlug ? `holler.live/${bandSlug}` : '—'

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from('requests')
      .select('id, title, artist, spotify_album_art_url, status, reject_reason, created_at, tips(amount_cents, status)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (data) {
      const withTotals: Request[] = data.map((r: any) => ({
        ...r,
        tip_total: (r.tips ?? [])
          .filter((t: any) => t.status === 'held' || t.status === 'captured')
          .reduce((sum: number, t: any) => sum + t.amount_cents, 0),
      }))
      setRequests(withTotals)
    }
  }, [sessionId])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }
      const { data: sessionData } = await supabase
        .from('sessions').select('id, venue_name, started_at, ended_at, status, band_id')
        .eq('id', sessionId).single()
      if (!sessionData) { router.push('/dashboard'); return }
      setSession(sessionData)
      const { data: bandData } = await supabase.from('bands').select('slug').eq('id', sessionData.band_id).single()
      if (bandData) setBandSlug(bandData.slug)
      await fetchRequests()
      setLoading(false)
    }
    load()
  }, [sessionId, router, fetchRequests])

  useEffect(() => {
    if (!session || session.status !== 'active') return
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `session_id=eq.${sessionId}` }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tips' }, () => fetchRequests())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId, session, fetchRequests])

  async function handleAccept(id: string) {
    await supabase.from('requests').update({ status: 'accepted' }).eq('id', id)
    fetchRequests()
  }

  async function handlePlayed(id: string) {
    await supabase.from('requests').update({ status: 'played', played_at: new Date().toISOString() }).eq('id', id)
    fetchRequests()
  }

  async function handleReject(id: string, reason: string) {
    await supabase.from('requests').update({ status: 'rejected', reject_reason: reason }).eq('id', id)
    setRejectingId(null)
    fetchRequests()
  }

  async function confirmEndSession() {
    setEnding(true)
    setShowEndModal(false)
    await supabase.from('requests').update({ status: 'rejected', reject_reason: 'not_tonight' }).eq('session_id', sessionId).in('status', ['pending', 'accepted'])
    await supabase.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', sessionId)
    router.push('/dashboard')
  }

  async function handleRevive() {
    setReviving(true)
    await supabase.from('sessions').update({ status: 'active', ended_at: null }).eq('id', sessionId)
    setSession(prev => prev ? { ...prev, status: 'active', ended_at: null } : prev)
    setReviving(false)
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(queueUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="label">Loading session...</p>
      </main>
    )
  }

  // ── ENDED SESSION ─────────────────────────────────────────
  if (session?.status === 'ended') {
    const played = requests.filter(r => r.status === 'played')
    const totalTips = requests.reduce((sum, r) => sum + r.tip_total, 0)

    return (
      <main style={{ minHeight: '100vh', padding: '24px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <NavWordmark size={36} />
          <a href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>← Dashboard</a>
        </div>

        <div className="card-ornate" style={{ marginBottom: '24px', textAlign: 'center', padding: '32px 24px' }}>
          <span className="side-ornament side-ornament-left">✦ ✦ ✦</span>
          <span className="side-ornament side-ornament-right">✦ ✦ ✦</span>
          <p className="label" style={{ marginBottom: '12px' }}>Session ended</p>
          <h2 style={{ fontSize: '24px', marginBottom: '6px' }}>{session.venue_name ?? 'No venue set'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
            {new Date(session.started_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <div className="star-divider" style={{ marginBottom: '24px' }}><span style={{ color: 'var(--star)' }}>✦</span></div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '28px' }}>
            <div>
              <p style={{ fontFamily: "'Teko', sans-serif", fontSize: '48px', color: 'var(--accent)', lineHeight: 1 }}>{played.length}</p>
              <p className="label" style={{ marginTop: '4px' }}>Songs played</p>
            </div>
            {totalTips > 0 && (
              <div>
                <p style={{ fontFamily: "'Teko', sans-serif", fontSize: '48px', color: 'var(--accent)', lineHeight: 1 }}>${(totalTips / 100).toFixed(0)}</p>
                <p className="label" style={{ marginTop: '4px' }}>In tips</p>
              </div>
            )}
          </div>
          <button onClick={handleRevive} className="btn-ghost" style={{ fontSize: '11px', opacity: reviving ? 0.5 : 1 }} disabled={reviving}>
            {reviving ? 'Reopening...' : 'Reopen this session'}
          </button>
        </div>

        {played.length > 0 && (
          <div>
            <p className="label" style={{ marginBottom: '12px' }}>Played tonight</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {played.map(req => (
                <div key={req.id} className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '14px', marginBottom: '2px' }}>{req.title}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.artist}</p>
                  </div>
                  {req.tip_total > 0 && <p style={{ fontSize: '15px', color: 'var(--success)', fontFamily: "'Teko', sans-serif" }}>${(req.tip_total / 100).toFixed(0)}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    )
  }

  // ── ACTIVE SESSION ────────────────────────────────────────
  const pending  = requests.filter(r => r.status === 'pending')
  const accepted = requests.filter(r => r.status === 'accepted')
  const played   = requests.filter(r => r.status === 'played')
  const rejected = requests.filter(r => r.status === 'rejected')

  return (
    <main style={{ minHeight: '100vh', padding: '20px', maxWidth: '680px', margin: '0 auto', overflowX: 'hidden' }}>

      {showEndModal && (
        <Modal title="End session" onClose={() => setShowEndModal(false)}>
          <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>Call it a night?</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8', marginBottom: '24px' }}>
            This will close the session and automatically refund any pending requests that weren't played.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" style={{ flex: 1, background: 'var(--danger)', opacity: ending ? 0.6 : 1 }} onClick={confirmEndSession} disabled={ending}>
              {ending ? 'Ending...' : 'End session'}
            </button>
            <button className="btn-ghost" onClick={() => setShowEndModal(false)}>Keep going</button>
          </div>
        </Modal>
      )}

      {showQR && bandSlug && (
        <QRModal url={queueUrl} bandName={session?.venue_name ?? bandSlug} onClose={() => setShowQR(false)} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '12px' }}>
        <NavWordmark size={32} />
        <button onClick={() => setShowEndModal(true)} className="btn-ghost"
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          End session
        </button>
      </div>

      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session?.venue_name && <><span style={{ color: 'var(--text)' }}>{session.venue_name}</span> &nbsp;·&nbsp; </>}
          Started {session ? new Date(session.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
        </p>
      </div>

      {/* Audience link — uses env var, clickable */}
      <div className="card" style={{ marginBottom: '24px', padding: '18px 20px' }}>
        <p className="label" style={{ marginBottom: '8px' }}>Audience link</p>
        <a
          href={queueUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '15px', color: 'var(--accent)', marginBottom: '14px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
        >
          {displayUrl}
        </a>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-primary" style={{ flex: 1, fontSize: '14px', padding: '10px 12px' }} onClick={() => setShowQR(true)}>
            Show QR code
          </button>
          <button className="btn-ghost" style={{ fontSize: '11px', padding: '10px 14px' }} onClick={handleCopyLink}>
            {copiedLink ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>
      </div>

      {accepted.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <p className="label-accent" style={{ marginBottom: '12px' }}>Up next ({accepted.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {accepted.map(req => (
              <RequestCard key={req.id} req={req} onPlayed={() => handlePlayed(req.id)} onRejectStart={() => setRejectingId(req.id)} rejectingId={rejectingId} onReject={(r) => handleReject(req.id, r)} onRejectCancel={() => setRejectingId(null)} />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '28px' }}>
        <p className="label" style={{ marginBottom: '12px' }}>Incoming {pending.length > 0 ? `(${pending.length})` : ''}</p>
        {pending.length === 0 ? (
          <div className="card" style={{ padding: '28px 20px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No requests yet — share your link.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pending.map(req => (
              <RequestCard key={req.id} req={req} onAccept={() => handleAccept(req.id)} onRejectStart={() => setRejectingId(req.id)} rejectingId={rejectingId} onReject={(r) => handleReject(req.id, r)} onRejectCancel={() => setRejectingId(null)} />
            ))}
          </div>
        )}
      </div>

      {played.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <p className="label" style={{ marginBottom: '12px' }}>Played ({played.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {played.map(req => (
              <div key={req.id} className="card" style={{ padding: '12px 16px', opacity: 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px' }}>{req.title}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.artist}</p>
                </div>
                {req.tip_total > 0 && <p style={{ fontSize: '13px', color: 'var(--success)' }}>${(req.tip_total / 100).toFixed(0)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <p className="label" style={{ marginBottom: '12px' }}>Passed on ({rejected.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rejected.map(req => (
              <div key={req.id} className="card" style={{ padding: '12px 16px', opacity: 0.4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px' }}>{req.title}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.artist}</p>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {REJECT_REASONS.find(r => r.value === req.reject_reason)?.label ?? 'Passed'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

function RequestCard({ req, onAccept, onPlayed, onRejectStart, rejectingId, onReject, onRejectCancel }: {
  req: Request; onAccept?: () => void; onPlayed?: () => void
  onRejectStart: () => void; rejectingId: string | null
  onReject: (r: string) => void; onRejectCancel: () => void
}) {
  const isRejecting = rejectingId === req.id
  const isAccepted = req.status === 'accepted'

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
          <p style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.artist}</p>
        </div>
        {req.tip_total > 0 && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: '20px', color: 'var(--accent)', fontFamily: "'Teko', sans-serif", lineHeight: 1 }}>${(req.tip_total / 100).toFixed(0)}</p>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>IN TIPS</p>
          </div>
        )}
      </div>
      {isRejecting ? (
        <div>
          <p className="label" style={{ marginBottom: '10px' }}>Why are you passing?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {REJECT_REASONS.map(r => (
              <button key={r.value} onClick={() => onReject(r.value)}
                style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-warm)', color: 'var(--text)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', padding: '12px 14px', textAlign: 'left', cursor: 'pointer', minHeight: '44px' }}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={onRejectCancel} className="btn-ghost" style={{ width: '100%', fontSize: '11px' }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAccepted ? (
            <>
              <button onClick={onPlayed} className="btn-primary" style={{ flex: 1, fontSize: '15px', padding: '12px', minHeight: '48px' }}>✓ Mark as played</button>
              <button onClick={onRejectStart} className="btn-ghost" style={{ fontSize: '12px', padding: '12px 16px', minHeight: '48px' }}>Pass</button>
            </>
          ) : (
            <>
              <button onClick={onAccept} className="btn-primary" style={{ flex: 1, fontSize: '15px', padding: '12px', minHeight: '48px' }}>Accept</button>
              <button onClick={onRejectStart} className="btn-ghost" style={{ fontSize: '12px', padding: '12px 16px', minHeight: '48px' }}>Pass</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
