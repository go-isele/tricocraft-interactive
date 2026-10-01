'use client';

import RequireAuth from '@/components/dash/RequireAuth';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminDashboardPage() {
  return (
    <RequireAuth role="admin" active="dashboard">
      <div className="dash-hd"><div><h1>Admin Dashboard</h1><p>Executive overview of the Production Marketplace.</p></div></div>
      <AdminDashboard />
    </RequireAuth>
  );
}
