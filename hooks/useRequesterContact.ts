'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'holler_requester_contact'

type ContactInfo = {
  value: string
  type: 'email' | 'phone'
}

export function useRequesterContact() {
  const [contact, setContactState] = useState<ContactInfo | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setContactState(JSON.parse(stored))
    } catch {}
    setLoaded(true)
  }, [])

  function setContact(info: ContactInfo) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info))
    } catch {}
    setContactState(info)
  }

  function clearContact() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    setContactState(null)
  }

  return { contact, setContact, clearContact, loaded }
}
