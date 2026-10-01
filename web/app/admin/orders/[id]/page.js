'use client';

import { use } from 'react';
import RequireAuth from '@/components/dash/RequireAuth';
import AdminOrderDetail from '@/components/admin/AdminOrderDetail';

export default function AdminOrderDetailPage({ params }) {
  const { id } = use(params);
  return (
    <RequireAuth role="admin" active="orders">
      <AdminOrderDetail id={id} />
    </RequireAuth>
  );
}
