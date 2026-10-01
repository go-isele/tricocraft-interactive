'use client';

import RequireAuth from '@/components/dash/RequireAuth';
import AdminClients from '@/components/admin/AdminClients';

export default function AdminClientsPage() {
  return (
    <RequireAuth role="admin" active="clients">
      <div className="dash-hd"><div><h1>Corporate Accounts</h1><p>Verify clients for Net 30/60/90 LPO checkout and record their KRA PIN for e-TIMS invoicing.</p></div></div>
      <AdminClients />
    </RequireAuth>
  );
}
