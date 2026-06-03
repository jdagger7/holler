'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import NavWordmark from '@/components/NavWordmark'
import Modal from '@/components/Modal'
import QRModal from '@/components/QRModal'

type Request = {
  id: string; title: string; artist: string
  spotify_album_art_url: string | null
  status: 'pending' | 'accepted' | 'played' | 'rejected'
  reject_reason: string | null; created_at: string; tip_total: number
}
type Session = { id: string; venue_name: string | null; started_at: string; ended_at: string | null; status: string; band_id: string }

const REJECT_REASONS = [
  { value: 'dont_know', label: "Don't know it" },
  { value: 'not_tonight', label: 'Not tonight' },
  { value: 'already_played', label: 'Already played it' },
]

const F = "'Arvo', serif"

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
  const [undoToast, setUndoToast] = useState<{ id: string; label: string; action: () => void } | null>(null)
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://holler.live'
  const queueUrl = bandSlug ? `${appUrl}/${bandSlug}` : ''

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from('requests')
      .select('id, title, artist, spotify_album_art_url, status, reject_reason, created_at, tips(amount_cents, status)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (data) {
      setRequests(data.map((r: any) => ({
        ...r,
        tip_total: (r.tips ?? []).filter((t: any) => t.status === 'held' || t.status === 'captured').reduce((s: number, t: any) => s + t.amount_cents, 0),
      })))
    }
  }, [sessionId])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }
      const { data: s } = await supabase.from('sessions').select('id, venue_name, started_at, ended_at, status, band_id').eq('id', sessionId).single()
      if (!s) { router.push('/dashboard'); return }
      setSession(s)
      const { data: b } = await supabase.from('bands').select('slug').eq('id', s.band_id).single()
      if (b) setBandSlug(b.slug)
      await fetchRequests()
      setLoading(false)
    }
    load()
  }, [sessionId, router, fetchRequests])

  useEffect(() => {
    if (!session || session.status !== 'active') return
    const ch = supabase.channel(`session-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests', filter: `session_id=eq.${sessionId}` }, fetchRequests)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tips' }, fetchRequests)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId, session, fetchRequests])

  function showUndo(label: string, undoFn: () => void) {
    if (undoTimer) clearTimeout(undoTimer)
    setUndoToast({ id: Date.now().toString(), label, action: undoFn })
    const t = setTimeout(() => setUndoToast(null), 5000)
    setUndoTimer(t)
  }

  async function handleAccept(id: string) {
    await supabase.from('requests').update({ status: 'accepted' }).eq('id', id)
    fetchRequests()
    showUndo('Accepted', async () => {
      await supabase.from('requests').update({ status: 'pending' }).eq('id', id)
      fetchRequests()
    })
  }

  async function handlePlayed(id: string) {
    await supabase.from('requests').update({ status: 'played', played_at: new Date().toISOString() }).eq('id', id)
    fetch('/api/stripe/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: id }) }).catch(console.error)
    fetchRequests()
    showUndo('Marked played', async () => {
      await supabase.from('requests').update({ status: 'accepted', played_at: null }).eq('id', id)
      // Note: can't un-capture Stripe — just a UI undo for accidents before payment processes
      fetchRequests()
    })
  }

  async function handleReject(id: string, reason: string) {
    await supabase.from('requests').update({ status: 'rejected', reject_reason: reason }).eq('id', id)
    fetch('/api/stripe/refund', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: id }) }).catch(console.error)
    setRejectingId(null)
    fetchRequests()
    showUndo('Passed', async () => {
      await supabase.from('requests').update({ status: 'pending', reject_reason: null }).eq('id', id)
      fetchRequests()
    })
  }

  async function confirmEnd() {
    setEnding(true); setShowEndModal(false)
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
    setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000)
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p className="label">Loading...</p>
    </main>
  )

  // ── ENDED ─────────────────────────────────────────
  if (session?.status === 'ended') {
    const played = requests.filter(r => r.status === 'played')
    const totalTips = requests.reduce((s, r) => s + r.tip_total, 0)
    return (
      <main style={{ minHeight: '100vh' }}>
        <div className="top-rail">
          <NavWordmark size={28} />
          <a href="/dashboard" className="btn-ghost" style={{ textDecoration: 'none', width: 'auto' }}>Dashboard</a>
        </div>
        <div style={{ padding: '28px 20px', textAlign: 'center', borderBottom: '1px solid var(--border-warm)', background: 'var(--bg-raised)' }}>
          <p className="label" style={{ marginBottom: '8px' }}>Session ended</p>
          <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{session.venue_name ?? 'No venue'}</h2>
          <p style={{ fontFamily: F, fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            {new Date(session.started_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginBottom: '28px' }}>
            <div>
              <p style={{ fontFamily: "'Teko', sans-serif", fontSize: '52px', color: 'var(--accent)', lineHeight: 1 }}>{played.length}</p>
              <p className="label">Played</p>
            </div>
            {totalTips > 0 && (
              <div>
                <p style={{ fontFamily: "'Teko', sans-serif", fontSize: '52px', color: 'var(--accent)', lineHeight: 1 }}>${(totalTips / 100).toFixed(0)}</p>
                <p className="label">In tips</p>
              </div>
            )}
          </div>
          <button onClick={handleRevive} className="btn-ghost" style={{ width: 'auto', opacity: reviving ? 0.5 : 1 }} disabled={reviving}>
            {reviving ? 'Reopening...' : 'Reopen session'}
          </button>
        </div>
        {played.length > 0 && (
          <div>
            <div className="section-header"><span className="label">Played tonight</span><span className="label">{played.length}</span></div>
            {played.map(req => (
              <div key={req.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
                {req.spotify_album_art_url && <img src={req.spotify_album_art_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: F, fontSize: '15px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</p>
                  <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--text-muted)' }}>{req.artist}</p>
                </div>
                {req.tip_total > 0 && <p style={{ fontFamily: "'Teko', sans-serif", fontSize: '20px', color: 'var(--success)', flexShrink: 0 }}>${(req.tip_total / 100).toFixed(0)}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    )
  }

  // ── ACTIVE ─────────────────────────────────────────
  const pending = requests.filter(r => r.status === 'pending')
  const accepted = requests.filter(r => r.status === 'accepted')
  const played = requests.filter(r => r.status === 'played')
  const rejected = requests.filter(r => r.status === 'rejected')
  const startTime = session ? new Date(session.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''

  return (
    <main style={{ minHeight: '100vh' }}>
      {showEndModal && (
        <Modal title="End session" onClose={() => setShowEndModal(false)}>
          <h2 style={{ fontSize: '22px', marginBottom: '12px' }}>Call it a night?</h2>
          <p style={{ fontFamily: F, color: 'var(--text-muted)', fontSize: '15px', lineHeight: '1.7', marginBottom: '24px' }}>
            This closes the session and refunds any pending tips.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" style={{ background: 'var(--danger)', opacity: ending ? 0.6 : 1 }} onClick={confirmEnd} disabled={ending}>
              {ending ? 'Ending...' : 'End session'}
            </button>
            <button className="btn-ghost" style={{ width: 'auto' }} onClick={() => setShowEndModal(false)}>Keep going</button>
          </div>
        </Modal>
      )}
      {showQR && <QRModal url={queueUrl} bandName={session?.venue_name ?? bandSlug} onClose={() => setShowQR(false)} />}

      {/* Undo toast */}
      {undoToast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--border-warm)',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '16px',
          zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
        }}>
          <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--text-muted)' }}>{undoToast.label}</p>
          <button onClick={() => { undoToast.action(); setUndoToast(null) }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: F, fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            Undo
          </button>
        </div>
      )}

      {/* Top rail */}
      <div className="top-rail">
        <NavWordmark size={28} />
        <button onClick={() => setShowEndModal(true)} className="btn-ghost"
          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '11px', width: 'auto' }}>
          End session
        </button>
      </div>

      {/* Session header — single cohesive block */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '3px solid var(--border-warm)' }}>

        {/* Venue + time + live badge */}
        <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '20px', fontWeight: 700, marginBottom: '3px' }}>
              {session?.venue_name ?? 'No venue set'}
            </h2>
            <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-muted)' }}>
              {new Date(session?.started_at ?? '').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · started {startTime}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--accent-pale)', border: '1px solid var(--accent-dim)', padding: '4px 10px', flexShrink: 0 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 5px var(--danger)' }} />
            <span style={{ fontFamily: F, fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)' }}>Live</span>
          </div>
        </div>

        {/* Action buttons row — QR, link, copy */}
        <div style={{ display: 'flex', gap: '6px', padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
          <button className="btn-ghost" style={{ fontSize: '10px', whiteSpace: 'nowrap', width: 'auto', padding: '6px 12px', flex: 1 }} onClick={() => setShowQR(true)}>QR Code</button>
          <a href={queueUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '10px', whiteSpace: 'nowrap', width: 'auto', padding: '6px 12px', flex: 1, textDecoration: 'none' }}>Public link ↗</a>
          <button className="btn-ghost" style={{ fontSize: '10px', whiteSpace: 'nowrap', width: 'auto', padding: '6px 12px', flex: 1 }} onClick={handleCopyLink}>{copiedLink ? 'Copied ✓' : 'Copy link'}</button>
        </div>

        {/* Stats row — full width, evenly spaced */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'Requests', value: requests.filter(r => r.status !== 'rejected').length },
            { label: 'Played', value: played.length },
            { label: 'Tips', value: `$${(requests.reduce((s, r) => s + r.tip_total, 0) / 100).toFixed(0)}` },
          ].map((stat, i) => (
            <div key={stat.label} style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <p style={{ fontFamily: "'Teko', sans-serif", fontSize: '28px', color: 'var(--accent)', lineHeight: 1 }}>{stat.value}</p>
              <p className="label" style={{ fontSize: '8px', marginTop: '2px' }}>{stat.label}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Up next */}
      {accepted.length > 0 && (
        <div>
          <div className="section-header-accent">
            <span className="label-accent">Up next</span>
            <span className="label-accent">{accepted.length}</span>
          </div>
          {accepted.map(req => (
            <BandRow key={req.id} req={req} rejectingId={rejectingId}
              onPlayed={() => handlePlayed(req.id)}
              onRejectStart={() => setRejectingId(req.id)}
              onReject={r => handleReject(req.id, r)}
              onRejectCancel={() => setRejectingId(null)}
              highlight
            />
          ))}
        </div>
      )}

      {/* Requests */}
      <div>
        <div className="section-header">
          <span className="label">Requests</span>
          <span className="label">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <p style={{ padding: '24px 16px', fontFamily: F, color: 'var(--text-muted)', fontSize: '14px' }}>No requests yet.</p>
        ) : (
          pending.map(req => (
            <BandRow key={req.id} req={req} rejectingId={rejectingId}
              onAccept={() => handleAccept(req.id)}
              onRejectStart={() => setRejectingId(req.id)}
              onReject={r => handleReject(req.id, r)}
              onRejectCancel={() => setRejectingId(null)}
            />
          ))
        )}
      </div>

      {/* Played */}
      {played.length > 0 && (
        <div>
          <div className="section-header"><span className="label">Played ({played.length})</span></div>
          {played.map(req => (
            <div key={req.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border)', opacity: 0.45 }}>
              {req.spotify_album_art_url && <img src={req.spotify_album_art_url} alt="" style={{ width: '36px', height: '36px', objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F, fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</p>
                <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-muted)' }}>{req.artist}</p>
              </div>
              {req.tip_total > 0 && <p style={{ fontFamily: "'Teko', sans-serif", fontSize: '18px', color: 'var(--success)', flexShrink: 0 }}>${(req.tip_total / 100).toFixed(0)}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Passed */}
      {rejected.length > 0 && (
        <div>
          <div className="section-header"><span className="label">Passed ({rejected.length})</span></div>
          {rejected.map(req => (
            <div key={req.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border)', opacity: 0.3 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: F, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</p>
                <p style={{ fontFamily: F, fontSize: '12px', color: 'var(--text-muted)' }}>{req.artist}</p>
              </div>
              <p style={{ fontFamily: F, fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{REJECT_REASONS.find(r => r.value === req.reject_reason)?.label ?? 'Passed'}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

function BandRow({ req, onAccept, onPlayed, onRejectStart, rejectingId, onReject, onRejectCancel, highlight }: {
  req: Request; onAccept?: () => void; onPlayed?: () => void
  onRejectStart: () => void; rejectingId: string | null
  onReject: (r: string) => void; onRejectCancel: () => void; highlight?: boolean
}) {
  const isRejecting = rejectingId === req.id
  const isAccepted = req.status === 'accepted'
  const F = "'Arvo', serif"

  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: highlight ? 'var(--bg-card)' : 'var(--bg-raised)', borderLeft: highlight ? '4px solid var(--accent)' : '4px solid transparent' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '13px 16px' }}>
        {req.spotify_album_art_url
          ? <img src={req.spotify_album_art_url} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: '48px', height: '48px', background: 'var(--bg)', flexShrink: 0, border: '1px solid var(--border-warm)' }} />
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: F, fontSize: '17px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{req.title}</p>
          <p style={{ fontFamily: F, fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.artist}</p>
        </div>
        {req.tip_total > 0 && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontFamily: "'Teko', sans-serif", fontSize: '24px', color: 'var(--accent)', lineHeight: 1 }}>${(req.tip_total / 100).toFixed(0)}</p>
            <p style={{ fontFamily: F, fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>tips</p>
          </div>
        )}
      </div>

      {isRejecting ? (
        <div style={{ padding: '0 16px 14px' }}>
          <p className="label" style={{ marginBottom: '10px' }}>Why are you passing?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {REJECT_REASONS.map(r => (
              <button key={r.value} onClick={() => onReject(r.value)}
                style={{ background: 'var(--bg)', border: '1px solid var(--border-warm)', color: 'var(--text)', fontFamily: F, fontSize: '15px', padding: '12px 14px', textAlign: 'left', cursor: 'pointer', minHeight: '48px' }}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={onRejectCancel} className="btn-ghost" style={{ width: '100%', fontSize: '11px' }}>Cancel</button>
        </div>
      ) : (
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: '8px' }}>
          {isAccepted ? (
            <>
              <button onClick={onPlayed} className="btn-primary" style={{ flex: 1, fontSize: '18px', padding: '12px' }}>Played</button>
              <button onClick={onRejectStart} className="btn-ghost" style={{ padding: '12px 20px', minHeight: '48px', width: 'auto' }}>Pass</button>
            </>
          ) : (
            <>
              <button onClick={onAccept} className="btn-primary" style={{ flex: 1, fontSize: '18px', padding: '12px' }}>Accept</button>
              <button onClick={onRejectStart} className="btn-ghost" style={{ padding: '12px 20px', minHeight: '48px', width: 'auto' }}>Pass</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
