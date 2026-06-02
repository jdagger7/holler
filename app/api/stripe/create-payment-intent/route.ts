import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const PLATFORM_FEE_PERCENT = 0.05

export async function POST(request: NextRequest) {
  try {
    const {
      band_id,
      amount_cents,
      // Song details — request created here so it only appears after payment intent is created
      session_id,
      title,
      artist,
      spotify_track_id,
      spotify_album_art_url,
      requester_email,
      requester_phone,
      // For boosts, pass existing request_id instead
      existing_request_id,
    } = await request.json()

    if (!band_id || !amount_cents || !session_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (amount_cents < 500) {
      return NextResponse.json({ error: 'Minimum tip is $5' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: band } = await supabase
      .from('bands').select('stripe_account_id, name').eq('id', band_id).single()

    if (!band?.stripe_account_id) {
      return NextResponse.json({ error: 'Artist has not connected Stripe' }, { status: 400 })
    }

    // Create the request row now — but mark it as 'pending_payment'
    // so it doesn't show in the public queue until payment is confirmed
    let requestId = existing_request_id
    if (!requestId) {
      const { data: req, error: reqError } = await supabase
        .from('requests')
        .insert({
          session_id,
          title,
          artist,
          spotify_track_id: spotify_track_id ?? null,
          spotify_album_art_url: spotify_album_art_url ?? null,
          requester_email: requester_email ?? null,
          requester_phone: requester_phone ?? null,
          status: 'pending_payment', // hidden from queue until payment confirmed
        })
        .select('id').single()

      if (reqError || !req) {
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
      }
      requestId = req.id
    }

    const platformFee = Math.round(amount_cents * PLATFORM_FEE_PERCENT)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: 'usd',
      capture_method: 'manual',
      payment_method_types: ['card'],
      application_fee_amount: platformFee,
      transfer_data: { destination: band.stripe_account_id },
      description: `Holler: "${title}" by ${artist} — ${band.name}`,
      metadata: { request_id: requestId, band_id, session_id },
    })

    console.log('PaymentIntent created:', paymentIntent.id, 'request:', requestId)

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      request_id: requestId,
    })
  } catch (err: any) {
    console.error('Create PaymentIntent error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
