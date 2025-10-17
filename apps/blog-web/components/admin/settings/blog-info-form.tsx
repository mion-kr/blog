"use client"

import { useActionState, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { useFormStatus } from "react-dom"
import { Globe, ImageIcon, Loader2, Trash2, Upload } from "lucide-react"
import { uuidv7 } from "uuidv7"

import type {
  ApiResponse,
  PreSignedUploadRequestDto,
  PreSignedUploadResponseDto,
} from "@repo/shared"

import type { SettingsActionState } from "@/lib/admin/settings-types"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

async function requestPreSignedUpload(
  payload: PreSignedUploadRequestDto,
): Promise<PreSignedUploadResponseDto> {
  const response = await fetch("/api/admin/uploads/pre-signed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const data = (await response.json()) as ApiResponse<PreSignedUploadResponseDto>

  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.message ?? "업로드 URL을 발급받지 못했어요.")
  }

  return data.data
}

async function uploadFileToSignedUrl(uploadUrl: string, file: File) {
  const result = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  })

  if (!result.ok) {
    throw new Error("MinIO에 파일을 업로드하지 못했어요.")
  }
}

interface BlogInfoFormProps {
  initialData: {
    siteTitle: string
    siteDescription: string
    siteUrl: string
    profileImageUrl?: string | null
  }
  action: (
    prevState: SettingsActionState,
    formData: FormData
  ) => Promise<SettingsActionState>
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="flex-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "저장 중..." : "저장하기"}
    </button>
  )
}

function ResetButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className="rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-50"
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
  const [savedSiteTitle, setSavedSiteTitle] = useState(initialData.siteTitle)
  const [savedSiteDescription, setSavedSiteDescription] = useState(initialData.siteDescription)
  const [savedSiteUrl, setSavedSiteUrl] = useState(initialData.siteUrl)
  const [savedProfileImageUrl, setSavedProfileImageUrl] = useState(initialData.profileImageUrl ?? "")

  const [siteTitle, setSiteTitle] = useState(initialData.siteTitle)
  const [siteDescription, setSiteDescription] = useState(initialData.siteDescription)
  const [siteUrl, setSiteUrl] = useState(initialData.siteUrl)
  const [profileImageUrl, setProfileImageUrl] = useState(initialData.profileImageUrl ?? "")
  const [profileImageRemove, setProfileImageRemove] = useState(false)
  const [profileImageError, setProfileImageError] = useState("")
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const draftUuidRef = useRef(uuidv7())
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const profileImageUrlErrors = getFieldErrors("profileImageUrl")

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

  useEffect(() => {
    if (state.updatedSettings) {
      const nextSiteTitle = state.updatedSettings.siteTitle ?? savedSiteTitle
      const nextSiteDescription = state.updatedSettings.siteDescription ?? savedSiteDescription
      const nextSiteUrl = state.updatedSettings.siteUrl ?? savedSiteUrl
      const nextProfileImageUrl = state.updatedSettings.profileImageUrl ?? ""
      setSavedSiteTitle(nextSiteTitle)
      setSavedSiteDescription(nextSiteDescription)
      setSavedSiteUrl(nextSiteUrl)
      setSavedProfileImageUrl(nextProfileImageUrl)

      setSiteTitle(nextSiteTitle)
      setSiteDescription(nextSiteDescription)
      setSiteUrl(nextSiteUrl)
      setProfileImageUrl(nextProfileImageUrl)
      setProfileImageRemove(false)
      setProfileImageError("")
    }
  }, [savedSiteDescription, savedSiteTitle, savedSiteUrl, state.updatedSettings])

  const handleReset = () => {
    setSiteTitle(savedSiteTitle)
    setSiteDescription(savedSiteDescription)
    setSiteUrl(savedSiteUrl)
    setProfileImageUrl(savedProfileImageUrl)
    setProfileImageRemove(false)
    setProfileImageError("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setShowSuccess(false)
    setErrorMessage(null)
  }

  const handleProfileImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setProfileImageError("지원하지 않는 파일 형식입니다. JPEG, PNG, WEBP만 업로드할 수 있어요.")
      event.target.value = ""
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setProfileImageError(`파일 용량이 너무 커요. 최대 ${formatFileSize(MAX_FILE_SIZE)}까지 가능합니다.`)
      event.target.value = ""
      return
    }

    setProfileImageError("")
    setIsUploadingProfileImage(true)

    try {
      const payload: PreSignedUploadRequestDto = {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        draftUuid: draftUuidRef.current,
        type: "about",
      }

      const { uploadUrl, publicUrl } = await requestPreSignedUpload(payload)
      await uploadFileToSignedUrl(uploadUrl, file)

      setProfileImageUrl(publicUrl)
      setProfileImageRemove(false)
    } catch (error) {
      console.error(error)
      setProfileImageError(
        error instanceof Error
          ? error.message
          : "이미지 업로드 중 문제가 발생했어요. 다시 시도해 주세요.",
      )
      setProfileImageUrl(initialData.profileImageUrl ?? "")
    } finally {
      setIsUploadingProfileImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveProfileImage = () => {
    setProfileImageUrl("")
    setProfileImageRemove(true)
    setProfileImageError("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="flex items-center gap-2 text-lg font-semibold text-slate-50">
        <Globe className="h-5 w-5" />
        <h2>블로그 기본 정보</h2>
      </div>

      {showSuccess && (
        <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
          <p className="text-sm text-emerald-200">{state.message ?? "✓ 설정이 저장되었어요."}</p>
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
        <input type="hidden" name="profileImageUrl" value={profileImageUrl} readOnly />
        <input
          type="hidden"
          name="profileImageRemove"
          value={profileImageRemove ? "true" : "false"}
          readOnly
        />

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

        <div>
          <label className="block text-sm font-medium text-slate-300">프로필 이미지</label>
          <p className="mt-1 text-xs text-slate-500">
            JPEG, PNG, WEBP · 최대 {formatFileSize(MAX_FILE_SIZE)}. 저장 전에는 draft 경로에서 임시로 관리돼요.
          </p>

          <div className="mt-3 flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_MIME_TYPES.join(",")}
              className="hidden"
              onChange={handleProfileImageChange}
            />

            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
              {profileImageUrl && !profileImageRemove ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImageUrl}
                  alt="업로드한 프로필 이미지"
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 flex-col items-center justify-center gap-2 text-slate-500">
                  <ImageIcon className="h-6 w-6" aria-hidden />
                  <p className="text-xs">대표 이미지를 업로드하면 About 페이지에 노출돼요.</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200 disabled:opacity-60"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingProfileImage}
              >
                {isUploadingProfileImage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                )}
                {isUploadingProfileImage ? "업로드 중..." : "이미지 선택"}
              </button>

              {profileImageUrl && !isUploadingProfileImage ? (
                <button
                  type="button"
                  onClick={handleRemoveProfileImage}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-red-500/60 hover:text-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  이미지 제거
                </button>
              ) : null}
            </div>

            {profileImageRemove ? (
              <p className="text-xs text-slate-400">저장하면 프로필 이미지가 제거돼요.</p>
            ) : null}
            {profileImageError ? (
              <p className="text-xs text-red-400">{profileImageError}</p>
            ) : null}
            {profileImageUrlErrors.map((message, index) => (
              <p key={`${message}-${index}`} className="text-xs text-red-300">
                {message}
              </p>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <ResetButton onClick={handleReset} disabled={isUploadingProfileImage} />
          <SubmitButton disabled={isUploadingProfileImage} />
        </div>
      </form>
    </div>
  )
}
