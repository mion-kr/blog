"use client"

import Link from "next/link"
import {
  ChangeEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react"
import { useFormStatus } from "react-dom"
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react"
import { uuidv7 } from "uuidv7"

import type {
  ApiResponse,
  Category,
  PreSignedUploadRequestDto,
  PreSignedUploadResponseDto,
  Tag,
} from "@repo/shared"

import { cn } from "@/lib/utils"
import { TagMultiSelect } from "./tag-multi-select"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface PostFormProps {
  action: (formData: FormData) => Promise<void>
  categories: Category[]
  tags: Tag[]
  defaultDraftUuid?: string
  defaultValues?: {
    slug?: string
    title?: string
    content?: string
    excerpt?: string
    coverImage?: string
    published?: boolean
    categoryId?: string
    tagIds?: string[]
  }
  submitLabel?: string
  cancelHref?: string
}

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

  if (!response.ok || !data.success) {
    throw new Error(data.message ?? "업로드 URL을 발급받지 못했어요.")
  }

  if (!data.data) {
    throw new Error("서버가 예상한 응답을 반환하지 않았어요.")
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

function SubmitButton({
  label,
  disabled,
}: {
  label: string
  disabled: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending || disabled}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending ? "저장 중..." : label}
    </button>
  )
}

export function PostForm({
  action,
  categories,
  tags,
  defaultDraftUuid,
  defaultValues,
  submitLabel = "저장하기",
  cancelHref,
}: PostFormProps) {
  const [published, setPublished] = useState<boolean>(defaultValues?.published ?? false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(defaultValues?.tagIds ?? [])
  const [tagError, setTagError] = useState<string>("")
  const [coverImageUrl, setCoverImageUrl] = useState<string>(defaultValues?.coverImage ?? "")
  const [coverImageKey, setCoverImageKey] = useState<string>("")
  const [uploadError, setUploadError] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)

  const draftUuidRef = useRef<string>(defaultDraftUuid ?? uuidv7())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categoryOptions = useMemo(
    () => categories.slice().sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [categories],
  )
  const tagOptions = useMemo(
    () => tags.slice().sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [tags],
  )

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]

      if (!file) {
        return
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setUploadError("지원하지 않는 파일 형식입니다. JPEG, PNG, WEBP만 업로드할 수 있어요.")
        event.target.value = ""
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`파일 용량이 너무 커요. 최대 ${formatFileSize(MAX_FILE_SIZE)}까지 가능합니다.`)
        event.target.value = ""
        return
      }

      setUploadError("")
      setIsUploading(true)

      try {
        const payload: PreSignedUploadRequestDto = {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          draftUuid: draftUuidRef.current,
          type: "thumbnail",
        }

        const { uploadUrl, objectKey, publicUrl } = await requestPreSignedUpload(payload)

        await uploadFileToSignedUrl(uploadUrl, file)

        setCoverImageUrl(publicUrl)
        setCoverImageKey(objectKey)
      } catch (error) {
        console.error(error)
        setUploadError(
          error instanceof Error
            ? error.message
            : "이미지 업로드 중 문제가 발생했어요. 다시 시도해 주세요.",
        )
        setCoverImageUrl("")
        setCoverImageKey("")
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    },
    [],
  )

  const handleRemoveImage = useCallback(() => {
    setCoverImageUrl("")
    setCoverImageKey("")
    setUploadError("")
  }, [])

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      if (isUploading) {
        setUploadError("이미지를 업로드하는 중입니다. 완료될 때까지 잠시만 기다려 주세요.")
        return
      }

      if (selectedTagIds.length === 0) {
        setTagError("최소 1개 이상의 태그를 선택해야 합니다.")
        return
      }

      setTagError("")
      setUploadError("")

      formData.set("coverImage", coverImageUrl ?? "")
      formData.set("coverImageKey", coverImageKey ?? "")
      formData.set("draftUuid", draftUuidRef.current)

      return action(formData)
    },
    [action, coverImageKey, coverImageUrl, isUploading, selectedTagIds],
  )

  return (
    <form
      action={handleSubmit}
      className={cn(
        "space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm shadow-slate-950"
      )}
    >
      {defaultValues?.slug ? (
        <input type="hidden" name="slug" defaultValue={defaultValues.slug} />
      ) : null}

      <input type="hidden" name="coverImage" value={coverImageUrl} readOnly />
      <input type="hidden" name="coverImageKey" value={coverImageKey} readOnly />
      <input type="hidden" name="draftUuid" value={draftUuidRef.current} readOnly />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="title">
            제목
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={defaultValues?.title}
            placeholder="예) Next.js 15 관리자 대시보드 구축"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-200">
            대표 이미지
          </label>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950 px-4 py-4">
            {coverImageUrl ? (
              <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt="업로드한 대표 이미지"
                  className="h-40 w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-900 text-slate-500">
                <ImageIcon className="h-6 w-6" aria-hidden />
                <p className="text-xs">썸네일 이미지를 업로드하면 미리보기로 확인할 수 있어요.</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_MIME_TYPES.join(",")}
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200 disabled:opacity-60"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                )}
                {isUploading ? "업로드 중..." : "이미지 선택"}
              </button>

              {coverImageUrl ? (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-red-500/60 hover:text-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  이미지 제거
                </button>
              ) : null}
            </div>

            <p className="text-xs text-slate-500">
              지원 형식: JPG, PNG, WEBP • 최대 {formatFileSize(MAX_FILE_SIZE)}
            </p>
            {uploadError ? <p className="text-xs text-red-400">{uploadError}</p> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="excerpt">
          요약 (선택)
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={defaultValues?.excerpt}
          rows={2}
          placeholder="간단한 요약을 입력하면 목록에서 더 잘 보일 수 있어요."
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="content">
          본문 (MDX)
        </label>
        <textarea
          id="content"
          name="content"
          required
          defaultValue={defaultValues?.content}
          rows={12}
          placeholder={"# 제목\n\n여기에 MDX 콘텐츠를 입력해 주세요."}
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="flex h-full flex-col gap-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="categoryId">
            카테고리
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={defaultValues?.categoryId ?? ""}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          >
            <option value="" disabled>
              카테고리를 선택하세요
            </option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex h-full flex-col gap-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="tag-search">
            태그 선택 (필수)
          </label>
          <TagMultiSelect
            tags={tagOptions}
            name="tagIds"
            defaultValues={defaultValues?.tagIds ?? []}
            onChange={setSelectedTagIds}
            className="flex-1"
            error={tagError}
            inputId="tag-search"
          />
        </div>
      </div>

      <p className="text-xs text-slate-500">최소 1개 이상의 태그를 선택해주세요.</p>

      <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
        <label className="flex items-center gap-3 text-sm text-slate-200" htmlFor="published">
          <input
            id="published"
            name="published"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-400 focus:ring-emerald-500"
            defaultChecked={defaultValues?.published}
            onChange={(event) => setPublished(event.currentTarget.checked)}
          />
          발행 상태로 저장하기
        </label>
        <span className="text-xs text-slate-500">
          {published
            ? "저장 시 바로 공개됩니다."
            : "초안으로 저장되어 관리자만 볼 수 있어요."}
        </span>
      </div>

      <div className="flex items-center justify-end gap-3">
        {cancelHref ? (
          <Link
            href={cancelHref}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            취소
          </Link>
        ) : null}
        <SubmitButton label={submitLabel} disabled={isUploading} />
      </div>
    </form>
  )
}
