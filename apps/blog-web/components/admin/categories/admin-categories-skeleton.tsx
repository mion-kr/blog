"use client"

export function AdminCategoriesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-56 rounded-md bg-slate-800/70 animate-pulse" />
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-2 bg-slate-950/70 px-4 py-3 text-xs uppercase text-slate-500">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="h-3 w-16 rounded bg-slate-900/80" />
          ))}
        </div>
        <div className="divide-y divide-slate-800 bg-slate-950/30">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-2 px-4 py-5">
              <div className="space-y-2">
                <div className="h-4 w-40 rounded-md bg-slate-800/70 animate-pulse" />
                <div className="h-3 w-24 rounded-md bg-slate-800/60 animate-pulse" />
              </div>
              <div className="h-3 w-32 rounded-md bg-slate-800/60 animate-pulse" />
              <div className="h-3 w-16 rounded-md bg-slate-800/60 animate-pulse" />
              <div className="h-3 w-16 rounded-md bg-slate-800/60 animate-pulse" />
              <div className="h-3 w-12 rounded-md bg-slate-800/60 animate-pulse justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
