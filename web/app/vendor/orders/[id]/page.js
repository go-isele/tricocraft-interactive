'use client';

import { use } from 'react';
import RequireAuth from '@/components/dash/RequireAuth';
import VendorOrderDetail from '@/components/vendor/VendorOrderDetail';

export default function VendorOrderDetailPage({ params }) {
  const { id } = use(params);
  return (
    <RequireAuth role="vendor" active="orders">
      <VendorOrderDetail id={id} />
    </RequireAuth>
  );
}
