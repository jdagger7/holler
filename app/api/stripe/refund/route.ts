import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { request_id } = await request.json()
    if (!request_id) return NextResponse.json({ error: 'Missing request_id' }, { status: 400 })

    const supabase = await createSupabaseServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get all held tips for this request
    const { data: tips } = await supabase
      .from('tips')
      .select('id, stripe_payment_intent_id')
      .eq('request_id', request_id)
      .eq('status', 'held')

    if (!tips || tips.length === 0) {
      return NextResponse.json({ refunded: 0 })
    }

    const realTips = tips.filter(t => !t.stripe_payment_intent_id.startsWith('placeholder_'))

    let refunded = 0
    const errors: string[] = []

    for (const tip of realTips) {
      try {
        // Cancel uncaptured PaymentIntent — automatically refunds the hold
        await stripe.paymentIntents.cancel(tip.stripe_payment_intent_id)
        await supabase.from('tips').update({ status: 'refunded' }).eq('id', tip.id)
        refunded++
      } catch (err: any) {
        // If already cancelled or captured, just mark refunded in DB
        if (err.code === 'payment_intent_unexpected_state') {
          await supabase.from('tips').update({ status: 'refunded' }).eq('id', tip.id)
          refunded++
        } else {
          errors.push(`Tip ${tip.id}: ${err.message}`)
        }
      }
    }

    // Also mark placeholder tips as refunded
    const placeholderTips = tips.filter(t => t.stripe_payment_intent_id.startsWith('placeholder_'))
    for (const tip of placeholderTips) {
      await supabase.from('tips').update({ status: 'refunded' }).eq('id', tip.id)
    }

    return NextResponse.json({ refunded, errors })
  } catch (err: any) {
    console.error('Refund error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
