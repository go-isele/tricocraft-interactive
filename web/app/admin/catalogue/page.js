'use client';

import RequireAuth from '@/components/dash/RequireAuth';
import AdminCatalogue from '@/components/admin/AdminCatalogue';

export default function AdminCataloguePage() {
  return (
    <RequireAuth role="admin" active="catalogue">
      <div className="dash-hd"><div><h1>Catalogue &amp; Providers</h1><p>Manage the products clients can order, their print pricing engine, and the vetted network that fulfils them.</p></div></div>
      <AdminCatalogue />
    </RequireAuth>
  );
}
