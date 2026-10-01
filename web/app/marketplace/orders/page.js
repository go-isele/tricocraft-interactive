'use client';

import { Suspense } from 'react';
import RequireAuth from '@/components/dash/RequireAuth';
import OrdersList from '@/components/OrdersList';

export default function OrdersPage() {
  return (
    <Suspense>
      <RequireAuth role="client" active="orders">
        <div className="dash-hd"><div><h1>My Orders</h1><p>Track every order from submission to delivery.</p></div></div>
        <OrdersList />
      </RequireAuth>
    </Suspense>
  );
}
