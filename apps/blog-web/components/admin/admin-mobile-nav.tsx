"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  getAdminNavIcon,
  isAdminNavActive,
  type AdminNavItem,
} from "./admin-sidebar"
import { cn } from "@/lib/utils"

interface AdminMobileNavProps {
  items: AdminNavItem[]
}

export function AdminMobileNav({ items }: AdminMobileNavProps) {
  const pathname = usePathname()

  return (
    <nav className="grid gap-2 px-4 py-4 lg:hidden">
      {items.map((item) => {
        const Icon = getAdminNavIcon(item.icon)
        const isActive = isAdminNavActive(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              isActive
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-slate-800 bg-slate-900/50 text-slate-200 hover:border-slate-700 hover:bg-slate-900"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <div className="flex flex-1 flex-col">
              <span className="font-medium">{item.label}</span>
              {item.description ? (
                <span className="text-xs text-slate-500">{item.description}</span>
              ) : null}
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
