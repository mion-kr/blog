"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Info, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

type StatusType = "created" | "updated" | "deleted" | "error"

const STATUS_CONFIG: Record<StatusType, { icon: typeof CheckCircle2; className: string; label: string }> = {
  created: {
    icon: CheckCircle2,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    label: "새 포스트가 저장되었어요!",
  },
  updated: {
    icon: CheckCircle2,
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    label: "변경 사항이 저장되었어요!",
  },
  deleted: {
    icon: Info,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    label: "포스트가 삭제되었어요.",
  },
  error: {
    icon: XCircle,
    className: "border-red-500/40 bg-red-500/10 text-red-200",
    label: "저장 중 오류가 발생했어요.",
  },
}

interface AdminStatusBannerProps {
  status?: StatusType | null
  message?: string | null
  dismissAfter?: number
}

export function AdminStatusBanner({ status, message, dismissAfter = 3500 }: AdminStatusBannerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!status) return

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("status")
      params.delete("message")
      const queryString = params.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    }, dismissAfter)

    return () => clearTimeout(timer)
  }, [status, dismissAfter, pathname, router, searchParams])

  if (!status) return null

  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm",
        "transition-opacity duration-300",
        config.className
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold">{config.label}</p>
        {message ? <p className="text-xs opacity-80">{message}</p> : null}
      </div>
    </div>
  )
}
