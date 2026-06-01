import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PLATFORM_FEE_PERCENT = 0.05 // 5%

export async function POST(request: NextRequest) {
  try {
    const { request_id, amount_cents, band_id } = await request.json()

    if (!request_id || !amount_cents || !band_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (amount_cents < 500) {
      return NextResponse.json({ error: 'Minimum tip is $5' }, { status: 400 })
    }

    // Use service role to bypass RLS
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

    const { data: req } = await supabase
      .from('requests')
      .select('title, artist')
      .eq('id', request_id)
      .single()

    const platformFee = Math.round(amount_cents * PLATFORM_FEE_PERCENT)

    // Create PaymentIntent on the connected account with application fee
    // capture_method: 'manual' = hold only, capture when song is played
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      capture_method: 'manual',
      payment_method_types: ['card'], // card only — no Klarna, Cash App etc.
      application_fee_amount: platformFee,
      transfer_data: {
        destination: band.stripe_account_id,
      },
      description: req
        ? `Holler: "${req.title}" by ${req.artist} — ${band.name}`
        : `Holler tip for ${band.name}`,
      metadata: { request_id, band_id },
    })

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    })
  } catch (err: any) {
    console.error('Create PaymentIntent error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
