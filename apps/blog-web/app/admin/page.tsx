import { AdminDashboardContent } from "@/components/admin/dashboard/dashboard-content"
import { getAuthorizationToken, getSession } from "@/lib/auth"
import { getAdminDashboard } from "@/features/admin/server/get-admin-dashboard"

export default async function AdminDashboardPage() {
  const [session, token] = await Promise.all([getSession(), getAuthorizationToken()])
  const userName = session?.user?.name ?? "관리자"
  const { data, error } = await getAdminDashboard({ token })

  return (
    <AdminDashboardContent userName={userName} initialData={data} initialError={error} />
  )
}
