import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const bandId = request.nextUrl.searchParams.get('band_id')

  if (!bandId) {
    return NextResponse.json({ error: 'Missing band_id' }, { status: 400 })
  }

  const clientId = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://holler-virid.vercel.app'
  const redirectUri = `${appUrl}/api/stripe/callback`

  if (!clientId) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    redirect_uri: redirectUri,
    state: bandId,
  })

  const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`
  return NextResponse.json({ url })
}
