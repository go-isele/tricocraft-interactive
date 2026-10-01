'use client';

import RequireAuth from '@/components/dash/RequireAuth';
import VendorOrdersList from '@/components/vendor/VendorOrdersList';

export default function VendorDashboardPage() {
  return (
    <RequireAuth role="vendor" active="orders">
      <div className="dash-hd"><div><h1>Assigned Orders</h1><p>Orders TrioCraft has routed to your production line.</p></div></div>
      <VendorOrdersList />
    </RequireAuth>
  );
}
