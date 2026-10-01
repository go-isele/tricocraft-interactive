'use client';

import RequireAuth from '@/components/dash/RequireAuth';
import AdminFxRates from '@/components/admin/AdminFxRates';

export default function AdminFxRatesPage() {
  return (
    <RequireAuth role="admin" active="fx">
      <div className="dash-hd"><div><h1>FX Rates</h1><p>Display-only exchange rates for the EAC currency switcher — KES stays the one transaction currency. These are NOT a live feed; update them from a source your finance team trusts.</p></div></div>
      <AdminFxRates />
    </RequireAuth>
  );
}
