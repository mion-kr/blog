"use client"

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-950 to-slate-950 p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="h-6 w-40 rounded-md bg-slate-800/80" />
            <div className="h-4 w-64 rounded-md bg-slate-800/60" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-9 w-36 rounded-lg border border-slate-800 bg-slate-900" />
            <div className="h-9 w-32 rounded-lg border border-slate-800 bg-slate-900" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm shadow-slate-950"
          >
            <div className="flex items-center justify-between text-sm text-slate-400">
              <div className="h-4 w-20 rounded-md bg-slate-800/70" />
              <div className="h-4 w-4 rounded-full bg-emerald-800/60" />
            </div>
            <div className="mt-4 h-6 w-16 rounded-md bg-slate-800/70" />
            <div className="mt-2 h-3 w-24 rounded-md bg-slate-800/60" />
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-28 rounded-md bg-slate-800/70" />
              <div className="h-4 w-48 rounded-md bg-slate-800/60" />
            </div>
            <div className="h-4 w-16 rounded-md bg-slate-800/70" />
          </div>
          <div className="mt-6 space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-4"
              >
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded-md bg-slate-800/70" />
                  <div className="h-3 w-24 rounded-md bg-slate-800/50" />
                </div>
                <div className="h-3 w-12 rounded-md bg-slate-800/60" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="h-5 w-24 rounded-md bg-slate-800/70" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-4 w-32 rounded-md bg-slate-800/60" />
            ))}
          </div>
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="h-3 w-full rounded-md bg-slate-800/50" />
          </div>
        </div>
      </section>
    </div>
  )
}
