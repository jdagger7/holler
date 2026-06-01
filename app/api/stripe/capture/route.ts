import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { request_id } = await request.json()
    if (!request_id) return NextResponse.json({ error: 'Missing request_id' }, { status: 400 })

    const supabase = await createSupabaseServerClient()

    // Verify the band owns this request
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get all held tips for this request
    const { data: tips } = await supabase
      .from('tips')
      .select('id, stripe_payment_intent_id, amount_cents')
      .eq('request_id', request_id)
      .eq('status', 'held')

    if (!tips || tips.length === 0) {
      return NextResponse.json({ captured: 0 })
    }

    // Filter out placeholders (pre-Stripe tips)
    const realTips = tips.filter(t => !t.stripe_payment_intent_id.startsWith('placeholder_'))

    let captured = 0
    const errors: string[] = []

    for (const tip of realTips) {
      try {
        await stripe.paymentIntents.capture(tip.stripe_payment_intent_id)
        await supabase.from('tips').update({ status: 'captured', notified_at: new Date().toISOString() }).eq('id', tip.id)
        captured++
      } catch (err: any) {
        errors.push(`Tip ${tip.id}: ${err.message}`)
      }
    }

    return NextResponse.json({ captured, errors })
  } catch (err: any) {
    console.error('Capture error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
