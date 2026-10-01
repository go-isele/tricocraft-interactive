'use client';

import RequireAuth from '@/components/dash/RequireAuth';
import BrandVault from '@/components/BrandVault';

export default function BrandVaultPage() {
  return (
    <RequireAuth role="client" active="vault">
      <div className="dash-hd">
        <div><h1>Brand Vault</h1><p>Upload your logo, colours, fonts, and guidelines once — every order pulls from these approved assets.</p></div>
      </div>
      <BrandVault />
    </RequireAuth>
  );
}
