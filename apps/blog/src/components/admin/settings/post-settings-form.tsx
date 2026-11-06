"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import { useFormStatus } from "react-dom"
import { FileText } from "lucide-react"

import type { SettingsActionState } from "@/lib/admin/settings-types"

interface PostSettingsFormProps {
  initialData: {
    postsPerPage: number
  }
  action: (
    prevState: SettingsActionState,
    formData: FormData
  ) => Promise<SettingsActionState>
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
    >
      {pending ? "저장 중..." : "저장하기"}
    </button>
  )
}

function ResetButton({ onClick }: { onClick: () => void }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/60 disabled:opacity-50"
    >
      취소
    </button>
  )
}

export function PostSettingsForm({ initialData, action }: PostSettingsFormProps) {
  const [state, formAction] = useActionState<SettingsActionState, FormData>(
    action,
    { success: false }
  )
  const [postsPerPage, setPostsPerPage] = useState(initialData.postsPerPage)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const getFieldErrors = useMemo(() => {
    const fieldErrors = state.fieldErrors ?? {}

    return (field: string) => {
      const direct = fieldErrors[field] ?? []
      const nested = fieldErrors[`payload.${field}`] ?? []
      return [...direct, ...nested]
    }
  }, [state.fieldErrors])

  const globalFieldErrors = getFieldErrors("global")
  const postsPerPageErrors = getFieldErrors("postsPerPage")

  useEffect(() => {
    if (state.success) {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
    setShowSuccess(false)
    return undefined
  }, [state.success])

  useEffect(() => {
    if (state.error) {
      setErrorMessage(state.error)
    } else if (globalFieldErrors.length > 0) {
      setErrorMessage(globalFieldErrors.join("\n"))
    } else {
      setErrorMessage(null)
    }
  }, [state.error, globalFieldErrors])

  const handleReset = () => {
    setPostsPerPage(initialData.postsPerPage)
    setShowSuccess(false)
    setErrorMessage(null)
  }

  const handleSliderChange = (value: number) => {
    if (Number.isNaN(value)) {
      return
    }

    const clampedValue = Math.min(50, Math.max(5, value))
    setPostsPerPage(clampedValue)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold text-slate-50">
        <FileText className="h-5 w-5" />
        <h2>포스트 기본 설정</h2>
      </div>

      {showSuccess && (
        <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
          <p className="text-sm text-emerald-200">{state.message ?? '✓ 설정이 저장되었어요.'}</p>
        </div>
      )}

      {(errorMessage || globalFieldErrors.length > 0) && (
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-4 space-y-1">
          {errorMessage && <p className="text-sm text-red-200">{errorMessage}</p>}
          {globalFieldErrors.map((message, index) => (
            <p key={`${message}-${index}`} className="text-xs text-red-200">
              {message}
            </p>
          ))}
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-5">
        <div>
          <label htmlFor="posts-per-page" className="block text-sm font-medium text-slate-300">
            페이지당 포스트 수
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="posts-per-page"
              name="postsPerPage"
              type="number"
              value={postsPerPage}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              min={5}
              max={50}
              required
              className="w-24 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-400">개</span>
          </div>
          <input
            type="range"
            value={postsPerPage}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            min={5}
            max={50}
            className="mt-3 w-full accent-emerald-500"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-500">
            <span>5</span>
            <span>50</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            → 목록 페이지에서 한 번에 보여줄 포스트 개수를 설정해요
          </p>
          {postsPerPageErrors.map((message, index) => (
            <p key={`${message}-${index}`} className="mt-1 text-xs text-red-300">
              {message}
            </p>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <ResetButton onClick={handleReset} />
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}
