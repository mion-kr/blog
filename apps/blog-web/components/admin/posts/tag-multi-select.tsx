"use client"

import { useMemo, useState } from "react"

import type { Tag } from "@repo/shared"
import { cn } from "@/lib/utils"

interface TagMultiSelectProps {
  tags: Tag[]
  name: string
  defaultValues?: string[]
  onChange?: (tagIds: string[]) => void
  error?: string
}

export function TagMultiSelect({ tags, name, defaultValues = [], onChange, error }: TagMultiSelectProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>(defaultValues)
  const [isDropdownOpen, setDropdownOpen] = useState(false)

  const available = useMemo(() => {
    const lower = query.trim().toLowerCase()
    return tags
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      .filter((tag) =>
      !selected.includes(tag.id) &&
      (!lower || tag.name.toLowerCase().includes(lower) || tag.slug.toLowerCase().includes(lower))
    )
  }, [query, selected, tags])

  const remove = (id: string) => {
    const newSelected = selected.filter((value) => value !== id)
    setSelected(newSelected)
    onChange?.(newSelected)
  }

  const add = (id: string) => {
    if (!selected.includes(id)) {
      const newSelected = [...selected, id]
      setSelected(newSelected)
      setQuery('')
      onChange?.(newSelected)
    }
    setDropdownOpen(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
        {selected.length === 0 ? (
          <span className="text-xs text-slate-500">선택된 태그가 없습니다.</span>
        ) : (
          selected.map((id) => {
            const tag = tags.find((item) => item.id === id)
            if (!tag) return null
            return (
              <button
                key={id}
                type="button"
                onClick={() => remove(id)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700/80"
              >
                {tag.name}
                <span className="text-slate-500">×</span>
              </button>
            )
          })
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setDropdownOpen(true)
          }}
          placeholder="태그 이름 또는 슬러그 입력"
          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          aria-autocomplete="list"
          aria-expanded={isDropdownOpen && available.length > 0}
          onFocus={() => setDropdownOpen(true)}
          onBlur={() => {
            // 지연시켜 리스트 아이템 클릭이 먼저 처리되도록 한다
            requestAnimationFrame(() => setDropdownOpen(false))
          }}
        />
        {isDropdownOpen ? (
          <div className="absolute z-20 mt-2 max-h-56 w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-sm shadow-lg shadow-slate-950">
            {available.length > 0 ? (
              <ul className="max-h-56 overflow-auto">
                {available.map((tag) => (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => add(tag.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-slate-200 hover:bg-slate-800"
                    >
                      <span>{tag.name}</span>
                      <span className="text-xs text-slate-500">/{tag.slug}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-xs text-slate-500">등록된 태그가 없거나 검색 결과가 없어요.</div>
            )}
          </div>
        ) : null}
      </div>

      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : null}
    </div>
  )
}
