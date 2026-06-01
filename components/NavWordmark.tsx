'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import HollerLogo from '@/components/HollerLogo'

type Props = {
  size?: number
}

export default function NavWordmark({ size = 36 }: Props) {
  const [href, setHref] = useState('/')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHref(data.user ? '/dashboard' : '/')
    })
  }, [])

  return (
    <a href={href} style={{ textDecoration: 'none', display: 'inline-block', lineHeight: 1 }}>
      <HollerLogo variant="wordmark" size={size} />
    </a>
  )
}
