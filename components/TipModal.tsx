'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import Modal from '@/components/Modal'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Props = {
  bandId: string
  bandName: string
  venmoHandle: string | null
  minTip: number
  onClose: () => void
}

export default function TipModal({ bandId, bandName, venmoHandle, minTip, onClose }: Props) {
  const [amount, setAmount] = useState<number>(5)
  const [customAmount, setCustomAmount] = useState('')
  const [mode, setMode] = useState<'choose' | 'card' | 'done'>('choose')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const finalAmount = amount === 0
    ? Math.round(parseFloat(customAmount || '0') * 100)
    : amount * 100

  const tipAmounts = [5, 10, 20]

  function venmoUrl() {
    const note = encodeURIComponent(`Tip for ${bandName} via Holler`)
    const amt = (finalAmount / 100).toFixed(2)
    return `venmo://paycharge?txn=pay&recipients=${venmoHandle}&amount=${amt}&note=${note}`
  }

  async function handleCardTip() {
    if (finalAmount < 100) { setError('Minimum tip is $1.'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/stripe/create-direct-tip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ band_id: bandId, amount_cents: finalAmount }),
    })
    const { client_secret, error: apiError } = await res.json()

    if (apiError || !client_secret) {
      setError(apiError ?? 'Something went wrong. Try again.')
      setLoading(false)
      return
    }

    setClientSecret(client_secret)
    setMode('card')
    setLoading(false)
  }

  const stripeOptions = {
    clientSecret: clientSecret!,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorBackground: '#2e2210',
        colorText: '#f2ead8',
        colorPrimary: '#d4882a',
        colorDanger: '#c04040',
        fontFamily: 'IBM Plex Mono, monospace',
        borderRadius: '0px',
        colorInputBackground: '#2a2010',
        colorInputBorder: '#524020',
      },
    },
  }

  if (mode === 'done') {
    return (
      <Modal title="Thanks!" onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>✦</p>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Tip sent</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.8', marginBottom: '24px' }}>
            {bandName} appreciates it.
          </p>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={onClose}>Done</button>
        </div>
      </Modal>
    )
  }

  if (mode === 'card' && clientSecret) {
    return (
      <Modal title={`Tip ${bandName}`} onClose={onClose}>
        <Elements stripe={stripePromise} options={stripeOptions}>
          <CardTipForm
            amount={finalAmount}
            onSuccess={() => setMode('done')}
            onBack={() => setMode('choose')}
            onError={setError}
          />
        </Elements>
        {error && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '12px' }}>{error}</p>}
      </Modal>
    )
  }

  return (
    <Modal title={`Tip ${bandName}`} onClose={onClose}>
      {/* Amount picker */}
      <div style={{ marginBottom: '24px' }}>
        <p className="label" style={{ marginBottom: '12px' }}>Amount</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          {tipAmounts.map(amt => (
            <button key={amt} onClick={() => { setAmount(amt); setCustomAmount('') }}
              style={{ background: amount === amt ? 'var(--accent)' : 'var(--bg-raised)', border: `1px solid ${amount === amt ? 'var(--accent)' : 'var(--border-warm)'}`, color: amount === amt ? '#221a0a' : 'var(--text)', fontFamily: "'Teko', sans-serif", fontSize: '20px', fontWeight: 500, padding: '10px 4px', cursor: 'pointer' }}>
              ${amt}
            </button>
          ))}
          <button onClick={() => { setAmount(0); setCustomAmount('') }}
            style={{ background: amount === 0 ? 'var(--accent)' : 'var(--bg-raised)', border: `1px solid ${amount === 0 ? 'var(--accent)' : 'var(--border-warm)'}`, color: amount === 0 ? '#221a0a' : 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', letterSpacing: '0.06em', padding: '10px 4px', cursor: 'pointer' }}>
            OTHER
          </button>
        </div>
        {amount === 0 && (
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '15px' }}>$</span>
            <input className="input" type="number" min="1" step="1" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="1" style={{ paddingLeft: '28px' }} autoFocus />
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}

      {/* Payment options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          className="btn-primary"
          style={{ width: '100%', opacity: loading ? 0.6 : 1 }}
          onClick={handleCardTip}
          disabled={loading || finalAmount < 100}
        >
          {loading ? 'Setting up...' : 'Tip with card →'}
        </button>

        {venmoHandle && (
          <a
            href={venmoUrl()}
            className="btn-ghost"
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            Tip on Venmo (@{venmoHandle})
          </a>
        )}
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '14px', textAlign: 'center', lineHeight: '1.7' }}>
        Card tips go directly to {bandName}.
      </p>
    </Modal>
  )
}

function CardTipForm({ amount, onSuccess, onBack, onError }: {
  amount: number
  onSuccess: () => void
  onBack: () => void
  onError: (msg: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (error) {
      onError(error.message ?? 'Payment failed.')
      setProcessing(false)
    } else if (paymentIntent) {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '20px' }}>
        <PaymentElement options={{
          layout: {
            type: 'accordion',
            defaultCollapsed: false,
            radios: false,
            spacedAccordionItems: false,
          },
          paymentMethodOrder: ['apple_pay', 'google_pay', 'card'],
        }} />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" className="btn-primary" style={{ flex: 1, opacity: processing ? 0.6 : 1 }} disabled={processing || !stripe}>
          {processing ? 'Processing...' : `Send $${(amount / 100).toFixed(0)} →`}
        </button>
        <button type="button" className="btn-ghost" onClick={onBack} style={{ fontSize: '11px' }}>Back</button>
      </div>
    </form>
  )
}
