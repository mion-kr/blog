"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

const NAV_ICON_MAP = {
  dashboard: LayoutDashboard,
  posts: FileText,
  categories: BarChart3,
  tags: Tags,
  settings: Settings,
} as const satisfies Record<string, LucideIcon>

export type AdminNavIcon = keyof typeof NAV_ICON_MAP

export interface AdminNavItem {
  label: string
  description?: string
  href: string
  icon: AdminNavIcon
}

export function getAdminNavIcon(icon: AdminNavIcon): LucideIcon {
  return NAV_ICON_MAP[icon] ?? LayoutDashboard
}

export function isAdminNavActive(
  pathname: string | null,
  href: string
): boolean {
  if (!pathname) {
    return false
  }

  if (pathname === href || pathname === `${href}/`) {
    return true
  }

  if (href === '/admin') {
    return false
  }

  return pathname.startsWith(`${href}/`)
}

interface AdminSidebarProps {
  items: AdminNavItem[]
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function AdminSidebar({ items, user }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950/60 backdrop-blur lg:flex lg:flex-col">
      <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
          {(user?.name ?? "M").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-100">
            {user?.name ?? "관리자"}
          </span>
          <span className="text-xs text-slate-400">{user?.email ?? "admin"}</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const Icon = getAdminNavIcon(item.icon)
          const isActive = isAdminNavActive(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.description ? (
                <span className="text-xs text-slate-500">{item.description}</span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 pb-6 text-xs text-slate-500">
        © {new Date().getFullYear()} Mion Admin Console
      </div>
    </aside>
  )
}
