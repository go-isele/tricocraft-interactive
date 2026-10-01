'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';
import GoogleSignInButton from '@/components/GoogleSignInButton';

// See the matching comment in web/app/login/page.js.
const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.target;
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          company: form.company.value,
          phone: form.phone.value,
          password: form.password.value,
        }),
      });
      await refresh();
      router.push(data.redirectTo || '/marketplace');
    } catch (err) {
      setError(err.body?.message || err.message || 'Something went wrong creating your account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-card">
      <h2>Create an Account</h2>
      <p className="sub">Get access to the Product Catalogue, Brand Vault, and order tracking.</p>
      {error && <div className="form-error">{error}</div>}
      {CLERK_ENABLED && (
        <>
          <GoogleSignInButton />
          <div className="form-note" style={{ textAlign: 'center', margin: '0.6em 0 1em' }}>or create an account with your email</div>
        </>
      )}
      <form onSubmit={onSubmit}>
        <div className="field"><label>Full Name</label><input type="text" name="name" required autoFocus /></div>
        <div className="field"><label>Email</label><input type="email" name="email" required /></div>
        <div className="field"><label>Company / Organisation</label><input type="text" name="company" /></div>
        <div className="field"><label>Phone</label><input type="text" name="phone" /></div>
        <div className="field"><label>Password</label><input type="password" name="password" required minLength={6} /></div>
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create Account'}</button>
      </form>
      <div className="form-note">Already have an account? <Link href="/login" style={{ color: 'var(--rust)', fontWeight: 600 }}>Log in</Link></div>
    </div>
  );
}
