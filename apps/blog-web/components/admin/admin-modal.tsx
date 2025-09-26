"use client"

import { ReactNode, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

interface AdminModalProps {
  title?: string
  description?: string
  children: ReactNode
  returnQuery?: Record<string, string | undefined>
}

export function AdminModal({ title, description, children, returnQuery }: AdminModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const close = () => {
    const params = new URLSearchParams(returnQuery ? Object.entries(returnQuery).flatMap(([key, value]) => (value ? [[key, value]] : [])) : [])
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={close}
        aria-label="모달 닫기"
      />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-slate-950">
        <div className="mb-4 flex items-start justify-between">
          <div className="space-y-1">
            {title ? <h3 className="text-lg font-semibold text-slate-50">{title}</h3> : null}
            {description ? <p className="text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
          >
            닫기
          </button>
        </div>
        <div className={cn('max-h-[70vh] overflow-y-auto pr-1 text-slate-100')}>{children}</div>
      </div>
    </div>
  )
}
