'use client';

import { Suspense } from 'react';
import RequireAuth from '@/components/dash/RequireAuth';
import AdminOrdersList from '@/components/admin/AdminOrdersList';

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <RequireAuth role="admin" active="orders">
        <AdminOrdersList />
      </RequireAuth>
    </Suspense>
  );
}
