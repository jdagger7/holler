'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import Modal from '@/components/Modal'

type Props = {
  url: string
  bandName: string
  onClose: () => void
}

export default function QRModal({ url, bandName, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    // Responsive size — fit within container minus padding
    const containerWidth = containerRef.current.offsetWidth
    const size = Math.min(300, containerWidth - 32)

    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      color: {
        dark:  '#f2ead8',
        light: '#2e2210',
      },
    })
  }, [url])

  async function handleCopyLink() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `holler-qr-${bandName.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  return (
    <Modal title="Audience QR code" onClose={onClose}>
      <div ref={containerRef} style={{ textAlign: 'center' }}>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.7' }}>
          Put this on screen or share the link so your audience can send requests.
        </p>

        {/* QR code — centered, never wider than container */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '16px',
        }}>
          <div style={{
            padding: '12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-warm)',
            display: 'inline-block',
          }}>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
          </div>
        </div>

        {/* URL */}
        <p style={{
          fontSize: '12px',
          color: 'var(--accent)',
          marginBottom: '20px',
          wordBreak: 'break-all',
          letterSpacing: '0.02em',
        }}>
          {url}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-primary"
            style={{ flex: 1, fontSize: '15px', padding: '12px 8px' }}
            onClick={handleDownload}
          >
            Download PNG
          </button>
          <button
            className="btn-ghost"
            style={{ flex: 1 }}
            onClick={handleCopyLink}
          >
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>

      </div>
    </Modal>
  )
}
