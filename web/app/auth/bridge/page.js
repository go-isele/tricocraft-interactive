'use client';

// The hand-off point: by the time someone lands here, Clerk has already
// confirmed their Google identity client-side. This page's only job is to
// call our server-side bridge route (POST /auth/clerk-sync), which verifies
// that Clerk session again server-side (never trusting the browser) and
// exchanges it for our own ordinary session cookie — the same kind
// /api/auth/login sets. Once that's done, this account works exactly like
// any email+password account everywhere else in the app.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function AuthBridgePage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/auth/clerk-sync', { method: 'POST', credentials: 'include' });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.message || "We couldn't finish signing you in.");
        }
        if (cancelled) return;
        await refresh();
        router.replace(data?.redirectTo || '/marketplace');
      } catch (err) {
        if (!cancelled) setError(err.message || 'Something went wrong finishing sign-in.');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="form-card" style={{ textAlign: 'center' }}>
      {error ? (
        <>
          <h2>Sign-in didn&apos;t finish</h2>
          <div className="form-error">{error}</div>
          <p className="form-note"><a href="/login" style={{ color: 'var(--rust)', fontWeight: 600 }}>Back to log in</a></p>
        </>
      ) : (
        <p className="sub">Setting up your account…</p>
      )}
    </div>
  );
}
