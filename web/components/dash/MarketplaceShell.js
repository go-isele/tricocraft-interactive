'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import DashSidebar from './DashSidebar';
import DashTopbar from './DashTopbar';

// Wraps the marketplace pages that are open to both logged-in clients and
// guests (catalogue, product detail, cart, custom brief) — logged-in users
// get the full dashboard shell (sidebar/topbar), guests get the lighter
// public-site shell with the regular site header (rendered by the root
// layout) and a "public-shell" content wrapper instead.
export default function MarketplaceShell({ active, title, subtitle, publicHeading, publicSub, children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // avoid a flash of the wrong shell while /api/auth/me resolves

  if (user) {
    return (
      <div className="dash">
        <DashSidebar role="client" active={active} />
        <div className="dash-main">
          <DashTopbar />
          <div className="dash-content">
            {title && (
              <div className="dash-hd">
                <div><h1>{title}</h1><p>{subtitle}</p></div>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-shell">
      {publicHeading && (
        <div className="public-hd">
          <h1>{publicHeading}</h1>
          <p>{publicSub}</p>
        </div>
      )}
      {children}
    </div>
  );
}

export function GuestUpsell() {
  return (
    <span>
      No account required. <Link href="/register" style={{ color: 'var(--rust)', fontWeight: 600 }}>Create an account</Link> to track orders directly.
    </span>
  );
}
