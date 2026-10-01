'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '';
  const { refresh } = useAuth();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.target;
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.email.value, password: form.password.value, next }),
      });
      await refresh();
      router.push(data.redirectTo || '/marketplace');
    } catch (err) {
      setError(err.body?.message || err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-card">
      <h2>Log In</h2>
      <p className="sub">Access your Production Marketplace dashboard.</p>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field"><label>Email</label><input type="email" name="email" required autoFocus /></div>
        <div className="field"><label>Password</label><input type="password" name="password" required /></div>
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? 'Logging in…' : 'Log In'}</button>
      </form>
      <div className="form-note">New here? <Link href="/register" style={{ color: 'var(--rust)', fontWeight: 600 }}>Create an account</Link></div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
