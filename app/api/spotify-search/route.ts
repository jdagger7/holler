import { NextRequest, NextResponse } from 'next/server'

async function getSpotifyToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    next: { revalidate: 3500 }, // cache token for ~1hr
  })

  const data = await res.json()
  return data.access_token
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ tracks: [] })
  }

  try {
    const token = await getSpotifyToken()

    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=6`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    const data = await res.json()
    const tracks = (data.tracks?.items ?? []).map((track: any) => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album.name,
      album_art: track.album.images?.[1]?.url ?? track.album.images?.[0]?.url ?? null,
    }))

    return NextResponse.json({ tracks })
  } catch (err) {
    console.error('Spotify search error:', err)
    return NextResponse.json({ tracks: [] }, { status: 500 })
  }
}
