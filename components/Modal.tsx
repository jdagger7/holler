'use client'

import { useEffect, useRef } from 'react'

type Props = {
  title: string
  children: React.ReactNode
  onClose?: () => void
  /** If provided, shows a close button in the corner */
  dismissible?: boolean
}

export default function Modal({ title, children, onClose, dismissible = true }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && onClose) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current && onClose) onClose()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14, 11, 8, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-warm)',
          boxShadow: 'inset 0 0 0 3px var(--bg-card), inset 0 0 0 4px var(--border)',
          padding: '32px',
          position: 'relative',
        }}
      >
        {/* Corner ornaments */}
        <div style={{ position: 'absolute', top: '-7px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', color: 'var(--accent-dim)', fontSize: '8px', letterSpacing: '6px', padding: '0 8px', whiteSpace: 'nowrap' }}>
          ◆ ◆ ◆ ◆
        </div>
        <div style={{ position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', color: 'var(--accent-dim)', fontSize: '8px', letterSpacing: '6px', padding: '0 8px', whiteSpace: 'nowrap' }}>
          ◆ ◆ ◆ ◆
        </div>

        {dismissible && onClose && (
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '4px' }}
            aria-label="Close"
          >
            ×
          </button>
        )}

        <p className="label-accent" style={{ marginBottom: '12px' }}>{title}</p>

        {children}
      </div>
    </div>
  )
}
