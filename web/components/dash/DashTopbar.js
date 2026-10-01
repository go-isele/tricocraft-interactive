'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import CurrencySwitcher from '@/components/CurrencySwitcher';

export default function DashTopbar() {
  const { user, logout } = useAuth();

  async function onLogout() {
    await logout();
    window.location.href = '/';
  }

  return (
    <div className="dash-topbar">
      <div style={{ fontSize: 13, color: 'var(--slate-lt)' }}>{user ? (user.company || user.name) : ''}</div>
      <div className="hdr-actions">
        <CurrencySwitcher />
        <Link className="btn btn-outline btn-sm" href="/">View Site</Link>
        <button className="btn btn-dark btn-sm" type="button" onClick={onLogout}>Log Out</button>
      </div>
    </div>
  );
}
