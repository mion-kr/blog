"use client"

import { useId, useState } from "react"

import { cn } from "@/lib/utils"

interface DeleteConfirmButtonProps {
  formId: string
  label?: string
  confirmLabel?: string
  cancelLabel?: string
  className?: string
  description?: string
}

export function DeleteConfirmButton({
  formId,
  label = '삭제',
  confirmLabel = '삭제하기',
  cancelLabel = '취소',
  className,
  description,
}: DeleteConfirmButtonProps) {
  const [open, setOpen] = useState(false)
  const descriptionId = useId()

  const handleConfirm = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null
    form?.requestSubmit()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'rounded-lg border border-red-400/60 px-3 py-2 text-xs font-medium text-red-200 transition hover:border-red-300 hover:text-red-100',
          className
        )}
      >
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-lg shadow-slate-950">
            <h4 className="text-sm font-semibold text-slate-50">정말로 삭제할까요?</h4>
            <p id={descriptionId} className="mt-2 text-xs text-slate-400">
              {description ?? '삭제하면 되돌릴 수 없어요. 이 작업을 진행하시겠어요?'}
            </p>
            <div className="mt-5 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg bg-red-500 px-3 py-1.5 font-medium text-red-950 transition hover:bg-red-400"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
