"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Loader2, LogIn } from "lucide-react"

interface AdminSignInButtonProps {
  callbackUrl: string
}

export function AdminSignInButton({ callbackUrl }: AdminSignInButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    try {
      setLoading(true)
      await signIn("google", { callbackUrl })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
      {loading ? '로그인 진행 중...' : 'Google 계정으로 로그인'}
    </button>
  )
}
