"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import type { Category, Tag } from "@repo/shared"
import { cn } from "@/lib/utils"
import { TagMultiSelect } from "./tag-multi-select"

interface PostFormProps {
  action: (formData: FormData) => Promise<void>
  categories: Category[]
  tags: Tag[]
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

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
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
  defaultValues,
  submitLabel = "저장하기",
  cancelHref,
}: PostFormProps) {
  const [published, setPublished] = useState<boolean>(defaultValues?.published ?? false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(defaultValues?.tagIds ?? [])
  const [tagError, setTagError] = useState<string>("")

  const categoryOptions = categories.sort((a, b) => a.name.localeCompare(b.name))
  const tagOptions = tags.sort((a, b) => a.name.localeCompare(b.name))

  const handleSubmit = async (formData: FormData) => {
    // 태그 필수 검증
    if (selectedTagIds.length === 0) {
      setTagError("최소 1개 이상의 태그를 선택해야 합니다.")
      return
    }
    setTagError("")
    return action(formData)
  }

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
          <label className="text-sm font-medium text-slate-200" htmlFor="coverImage">
            대표 이미지 URL
          </label>
          <input
            id="coverImage"
            name="coverImage"
            defaultValue={defaultValues?.coverImage}
            placeholder="https://"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          />
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

      <p className="text-xs text-slate-500">
        최소 1개 이상의 태그를 선택해주세요.
      </p>

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

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        {cancelHref ? (
          <Link
            href={cancelHref}
            className="text-sm text-slate-400 transition hover:text-slate-200"
          >
            취소
          </Link>
        ) : null}
      </div>
    </form>
  )
}
