'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-3xl font-bold mb-4">Check your email</h1>
          <p className="text-zinc-400">
            We sent a magic link to <span className="text-white">{email}</span>. 
            Click it to finish setting up your band account.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-bold mb-2">Holler</h1>
        <p className="text-zinc-400 mb-8">
          Live song requests for bands.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">
              Band email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="band@email.com"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-400"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-white text-black font-semibold rounded-lg px-4 py-3 hover:bg-zinc-200 transition-colors"
          >
            Send magic link
          </button>
        </form>
      </div>
    </main>
  )
}
