import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminMobileNav, AdminSidebar } from "@/components/admin";
import type { AdminNavItem } from "@/components/admin/admin-sidebar";
import { getJwt, getSession } from "@/lib/auth";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

const NAV_ITEMS: AdminNavItem[] = [
  {
    label: "대시보드",
    href: "/admin",
    icon: "dashboard",
  },
  {
    label: "포스트 관리",
    href: "/admin/posts",
    icon: "posts",
  },
  {
    label: "카테고리",
    href: "/admin/categories",
    icon: "categories",
  },
  {
    label: "태그",
    href: "/admin/tags",
    icon: "tags",
  },
  {
    label: "설정",
    href: "/admin/settings",
    icon: "settings",
  },
];

function formatRemainingTime(milliseconds: number) {
  const minutes = Math.max(0, Math.round(milliseconds / 60000));
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
  }
  return `${minutes}분`;
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [session, jwt] = await Promise.all([getSession(), getJwt()]);

  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/admin")}`);
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const expiresAt = typeof jwt?.exp === "number" ? jwt.exp * 1000 : null;
  const remainingMs =
    typeof expiresAt === "number" ? expiresAt - Date.now() : null;
  const shouldWarn =
    typeof remainingMs === "number" &&
    remainingMs > 0 &&
    remainingMs < 10 * 60 * 1000;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen w-full">
        <AdminSidebar items={NAV_ITEMS} user={session.user} />

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-800 bg-slate-950/60 px-4 py-4 backdrop-blur sm:px-6">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-100">
                  관리자 콘솔
                </h1>
                <p className="text-sm text-slate-400">
                  콘텐츠와 메타데이터를 한 곳에서 관리하세요.
                </p>
              </div>
              <div className="hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300 md:block">
                <span className="font-medium text-emerald-200">관리자</span>{" "}
                권한으로 접속 중
              </div>
            </div>
          </header>

          <AdminMobileNav items={NAV_ITEMS} />

          {shouldWarn && remainingMs ? (
            <div className="border-b border-amber-400/40 bg-amber-500/10 px-6 py-3 text-sm text-amber-200">
              세션이 곧 만료돼요. 약 {formatRemainingTime(remainingMs)} 내에
              다시 로그인해야 합니다.
            </div>
          ) : null}

          <main
            id="main"
            className="flex-1 overflow-y-auto bg-slate-950 px-4 py-6 sm:px-6 lg:px-8"
          >
            <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
