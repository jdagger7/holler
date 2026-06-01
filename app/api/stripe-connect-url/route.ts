import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: band } = await supabase
    .from('bands')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!band) {
    return NextResponse.json({ error: 'Band not found' }, { status: 404 })
  }

  const clientId = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://holler-virid.vercel.app'
  const redirectUri = `${appUrl}/api/stripe/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId!,
    scope: 'read_write',
    redirect_uri: redirectUri,
    state: band.id, // pass band ID through so callback knows which band to update
  })

  const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`
  return NextResponse.json({ url })
}
