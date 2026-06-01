import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const PLATFORM_FEE_PERCENT = 0.05

export async function POST(request: NextRequest) {
  try {
    const { band_id, amount_cents } = await request.json()

    if (!band_id || !amount_cents) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (amount_cents < 100) {
      return NextResponse.json({ error: 'Minimum tip is $1' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: band } = await supabase
      .from('bands')
      .select('stripe_account_id, name')
      .eq('id', band_id)
      .single()

    if (!band?.stripe_account_id) {
      return NextResponse.json({ error: 'Artist has not connected Stripe' }, { status: 400 })
    }

    const platformFee = Math.round(amount_cents * PLATFORM_FEE_PERCENT)

    // Direct charge — no hold, instant capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      capture_method: 'automatic', // charge immediately
      payment_method_types: ['card'],
      application_fee_amount: platformFee,
      transfer_data: { destination: band.stripe_account_id },
      description: `Holler direct tip for ${band.name}`,
      metadata: { band_id, type: 'direct_tip' },
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    })
  } catch (err: any) {
    console.error('Direct tip error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
