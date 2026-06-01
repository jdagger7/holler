import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const bandId = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://holler-virid.vercel.app'

  if (error || !code || !bandId) {
    return NextResponse.redirect(`${appUrl}/dashboard?stripe=cancelled`)
  }

  try {
    // Exchange code for connected account ID
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    })

    const connectedAccountId = response.stripe_user_id

    // Save to band record
    const supabase = await createSupabaseServerClient()
    await supabase
      .from('bands')
      .update({ stripe_account_id: connectedAccountId })
      .eq('id', bandId)

    return NextResponse.redirect(`${appUrl}/dashboard?stripe=connected`)
  } catch (err) {
    console.error('Stripe Connect error:', err)
    return NextResponse.redirect(`${appUrl}/dashboard?stripe=error`)
  }
}
