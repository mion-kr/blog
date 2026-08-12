"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Loader2, LogIn } from "lucide-react"

import { getSafeCallbackUrl } from "@/lib/auth/callback-url"

interface AdminSignInButtonProps {
  callbackUrl: string
}

export function AdminSignInButton({ callbackUrl }: AdminSignInButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const safeCallbackUrl = getSafeCallbackUrl(callbackUrl)

  const handleSignIn = async () => {
    try {
      setLoading(true)
      const result = await signIn("google", {
        callbackUrl: safeCallbackUrl,
        redirect: false,
      })

      if (result?.ok) {
        router.push(safeCallbackUrl)
        router.refresh()
      }
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
