import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const PLATFORM_FEE_PERCENT = 0.05

export async function POST(request: NextRequest) {
  const debugLog: string[] = []

  try {
    const body = await request.json()
    const {
      band_id, amount_cents, session_id, title, artist,
      spotify_track_id, spotify_album_art_url,
      requester_email, requester_phone, existing_request_id,
    } = body

    debugLog.push(`body_received: band_id=${band_id}, amount_cents=${amount_cents}, session_id=${session_id}`)

    if (!band_id || !amount_cents || !session_id) {
      return NextResponse.json({ error: 'Missing required fields', debug: debugLog }, { status: 400 })
    }
    if (amount_cents < 100) {
      return NextResponse.json({ error: 'Minimum tip is $1', debug: debugLog }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    debugLog.push('supabase_client_created')

    const { data: band, error: bandError } = await supabase
      .from('bands').select('stripe_account_id, name').eq('id', band_id).single()

    debugLog.push(`band_fetch: ${bandError ? 'ERROR: ' + bandError.message : 'ok, stripe=' + band?.stripe_account_id}`)

    if (!band?.stripe_account_id) {
      return NextResponse.json({ error: 'Artist has not connected Stripe', debug: debugLog }, { status: 400 })
    }

    let requestId = existing_request_id
    if (!requestId) {
      const { data: req, error: reqError } = await supabase
        .from('requests')
        .insert({
          session_id, title, artist,
          spotify_track_id: spotify_track_id ?? null,
          spotify_album_art_url: spotify_album_art_url ?? null,
          requester_email: requester_email ?? null,
          requester_phone: requester_phone ?? null,
          status: 'pending_payment',
        })
        .select('id').single()

      debugLog.push(`request_insert: ${reqError ? 'ERROR: ' + reqError.message + ' code=' + reqError.code : 'ok, id=' + req?.id}`)

      if (reqError || !req) {
        return NextResponse.json({ error: 'Failed to create request: ' + reqError?.message, debug: debugLog }, { status: 500 })
      }
      requestId = req.id
    }

    debugLog.push(`creating_payment_intent: amount=${amount_cents}, dest=${band.stripe_account_id}`)

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

    debugLog.push(`payment_intent_created: ${paymentIntent.id}`)

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      request_id: requestId,
      debug: debugLog,
    })
  } catch (err: any) {
    debugLog.push(`caught_exception: ${err.message}`)
    return NextResponse.json({ error: err.message, debug: debugLog }, { status: 500 })
  }
}
