import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const band_id = searchParams.get('band_id')

    if (!band_id) {
      return NextResponse.json({ error: 'Missing band_id' }, { status: 400 })
    }

    const clientId = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://holler.live'
    const redirectUri = `${appUrl}/api/stripe/callback`

    if (!clientId) {
      return NextResponse.json({ error: 'Stripe client ID not configured' }, { status: 500 })
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state: band_id,
    })

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`
    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('Stripe connect URL error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
