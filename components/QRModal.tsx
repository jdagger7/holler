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
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: 320,
      margin: 2,
      color: {
        dark: '#f0e8d5',  // warm off-white — matches --text
        light: '#191108', // dark card background — matches --bg-card
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
      <div style={{ textAlign: 'center' }}>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.7' }}>
          Put this on screen or share the link so your audience can send requests.
        </p>

        {/* QR code */}
        <div style={{
          display: 'inline-block',
          padding: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-warm)',
          marginBottom: '20px',
        }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>

        {/* URL display */}
        <p style={{
          fontSize: '13px',
          color: 'var(--accent)',
          marginBottom: '20px',
          wordBreak: 'break-all',
          letterSpacing: '0.02em',
        }}>
          {url}
        </p>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-primary"
            style={{ flex: 1, fontSize: '15px' }}
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
