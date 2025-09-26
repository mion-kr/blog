"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { Loader2, Wand2 } from "lucide-react"

import type { CreateCategoryDto } from "@repo/shared"
import { generateSlug } from "@repo/shared"
import { cn } from "@/lib/utils"

interface CategoryFormProps {
  action: (formData: FormData) => Promise<void>
  defaultValues?: Partial<CreateCategoryDto> & { slug?: string }
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
      {pending ? '저장 중...' : label}
    </button>
  )
}

export function CategoryForm({
  action,
  defaultValues,
  submitLabel = '저장하기',
  cancelHref,
}: CategoryFormProps) {
  const [nameValue, setNameValue] = useState(defaultValues?.name ?? '')
  const [slugValue, setSlugValue] = useState(defaultValues?.slug ?? '')
  const [slugEdited, setSlugEdited] = useState(Boolean(defaultValues?.slug))

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setNameValue(value)
    if (!slugEdited) {
      setSlugValue(generateSlug(value))
    }
  }

  const handleSlugChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSlugValue(event.target.value)
    setSlugEdited(true)
  }

  const applyAutoSlug = () => {
    if (!nameValue) return
    setSlugValue(generateSlug(nameValue))
    setSlugEdited(true)
  }

  return (
    <form
      action={action}
      className={cn('space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm shadow-slate-950')}
    >
      {defaultValues?.slug ? (
        <input type="hidden" name="slug" value={defaultValues.slug} />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="name">
            카테고리 이름
          </label>
          <input
            id="name"
            name="name"
            required={!defaultValues?.name}
            defaultValue={defaultValues?.name}
            placeholder="예) 프론트엔드"
            onChange={handleNameChange}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-200" htmlFor="slug">
            슬러그
          </label>
          <div className="flex gap-2">
            <input
              id="slug"
              name={defaultValues?.slug ? 'nextSlug' : 'slug'}
              required
              value={slugValue}
              onChange={handleSlugChange}
              placeholder="예) frontend"
              className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={applyAutoSlug}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            >
              <Wand2 className="h-3.5 w-3.5" aria-hidden /> 자동 생성
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="description">
          설명 (선택)
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description}
          rows={3}
          placeholder="카테고리에 대한 간단한 설명을 입력하세요."
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-200" htmlFor="color">
          대표 색상 (선택)
        </label>
        <input
          id="color"
          name="color"
          type="color"
          defaultValue={defaultValues?.color ?? '#0f172a'}
          className="h-10 w-24 cursor-pointer rounded border border-slate-700 bg-slate-950"
        />
        <p className="text-xs text-slate-500">카테고리 배지에 사용될 색상을 지정할 수 있어요.</p>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        {cancelHref ? (
          <Link href={cancelHref} className="text-sm text-slate-400 transition hover:text-slate-200">
            취소
          </Link>
        ) : null}
      </div>
    </form>
  )
}
