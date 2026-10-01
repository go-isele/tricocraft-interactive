'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import DashSidebar from './DashSidebar';
import DashTopbar from './DashTopbar';

// Gates a whole dashboard page behind login (and optionally a role list),
// rendering the dashboard shell once the session is confirmed. Client-side
// only — the API itself is the real authority (every /api/admin* and
// /api/vendor* route still checks the session server-side via
// requireRole()), this just avoids flashing dashboard content at a logged-out
// visitor before the redirect kicks in.
export default function RequireAuth({ role, active, children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (role && user.role !== role) {
      router.replace(user.role === 'admin' ? '/admin' : user.role === 'vendor' ? '/vendor' : '/marketplace');
    }
  }, [loading, user, role, router, pathname]);

  if (loading || !user || (role && user.role !== role)) return null;

  return (
    <div className="dash">
      <DashSidebar role={role || user.role} active={active} />
      <div className="dash-main">
        <DashTopbar />
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}
