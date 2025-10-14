import { Suspense } from "react"

import { AdminDashboardContent } from "@/components/admin/dashboard/dashboard-content"
import { AdminDashboardSkeleton } from "@/components/admin/dashboard/dashboard-skeleton"
import { getSession } from "@/lib/auth"

export default async function AdminDashboardPage() {
  const session = await getSession()
  const userName = session?.user?.name ?? "관리자"

  return (
    <Suspense fallback={<AdminDashboardSkeleton />}>
      <AdminDashboardContent userName={userName} />
    </Suspense>
  )
}
