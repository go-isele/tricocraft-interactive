'use client';

import { use } from 'react';
import RequireAuth from '@/components/dash/RequireAuth';
import OrderDetail from '@/components/OrderDetail';

export default function OrderDetailPage({ params }) {
  const { id } = use(params);
  return (
    <RequireAuth active="orders">
      <OrderDetail id={id} />
    </RequireAuth>
  );
}
