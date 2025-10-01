"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import { useFormStatus } from "react-dom"
import { Globe } from "lucide-react"

import type { SettingsActionState } from "@/lib/admin/settings-types"

interface BlogInfoFormProps {
  initialData: {
    siteTitle: string
    siteDescription: string
    siteUrl: string
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

export function BlogInfoForm({ initialData, action }: BlogInfoFormProps) {
  const [state, formAction] = useActionState<SettingsActionState, FormData>(
    action,
    { success: false }
  )
  const [siteTitle, setSiteTitle] = useState(initialData.siteTitle)
  const [siteDescription, setSiteDescription] = useState(initialData.siteDescription)
  const [siteUrl, setSiteUrl] = useState(initialData.siteUrl)
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
  const siteTitleErrors = getFieldErrors("siteTitle")
  const siteDescriptionErrors = getFieldErrors("siteDescription")
  const siteUrlErrors = getFieldErrors("siteUrl")

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
    setSiteTitle(initialData.siteTitle)
    setSiteDescription(initialData.siteDescription)
    setSiteUrl(initialData.siteUrl)
    setShowSuccess(false)
    setErrorMessage(null)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold text-slate-50">
        <Globe className="h-5 w-5" />
        <h2>블로그 기본 정보</h2>
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
          <label htmlFor="site-title" className="block text-sm font-medium text-slate-300">
            사이트 제목 <span className="text-red-400">*</span>
          </label>
          <input
            id="site-title"
            name="siteTitle"
            type="text"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
            maxLength={60}
            required
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Mion's Blog"
          />
          <p className="mt-1 text-xs text-slate-500">
            → 브라우저 탭과 검색 결과에 표시돼요 ({siteTitle.length}/60)
          </p>
          {siteTitleErrors.map((message, index) => (
            <p key={`${message}-${index}`} className="mt-1 text-xs text-red-300">
              {message}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="site-description" className="block text-sm font-medium text-slate-300">
            사이트 설명 <span className="text-red-400">*</span>
          </label>
          <textarea
            id="site-description"
            name="siteDescription"
            value={siteDescription}
            onChange={(e) => setSiteDescription(e.target.value)}
            maxLength={160}
            rows={3}
            required
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="개발과 기술에 관한 이야기를 나눕니다."
          />
          <p className="mt-1 text-xs text-slate-500">
            → 검색 엔진과 SNS 공유 시 표시돼요 ({siteDescription.length}/160)
          </p>
          {siteDescriptionErrors.map((message, index) => (
            <p key={`${message}-${index}`} className="mt-1 text-xs text-red-300">
              {message}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="site-url" className="block text-sm font-medium text-slate-300">
            사이트 URL <span className="text-red-400">*</span>
          </label>
          <input
            id="site-url"
            name="siteUrl"
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            required
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="https://mionblog.com"
          />
          <p className="mt-1 text-xs text-slate-500">→ 정식 URL을 입력해주세요</p>
          {siteUrlErrors.map((message, index) => (
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
