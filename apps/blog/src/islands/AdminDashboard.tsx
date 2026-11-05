import { AdminDashboardContent } from '@/components/admin/dashboard/dashboard-content';
import type { AdminDashboardData } from '@/features/admin/server/get-admin-dashboard';
import { RouterProvider } from 'next/navigation';

export default function AdminDashboard({ url, userName, data, error }: { url: string; userName: string; data: AdminDashboardData | null; error: string | null }) {
  return (
    <RouterProvider url={url}>
      <AdminDashboardContent userName={userName} initialData={data} initialError={error} />
    </RouterProvider>
  );
}
