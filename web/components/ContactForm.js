'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.target;
    const payload = {
      name: form.name.value,
      email: form.email.value,
      company: form.company.value,
      message: form.message.value,
    };
    try {
      await apiFetch('/api/contact', { method: 'POST', body: JSON.stringify(payload) });
      setSent(true);
      form.reset();
    } catch (err) {
      setError(err.body?.message || err.message || 'Something went wrong sending your message.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-card" style={{ margin: 0 }}>
      <h2>Send a Message</h2>
      <p className="sub">Tell us what you&rsquo;d like branded — we&rsquo;ll follow up directly.</p>

      {sent && <div className="form-success">Thanks — your message has been received. We&rsquo;ll be in touch shortly.</div>}
      {error && <div className="form-error">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="field"><label>Full Name</label><input type="text" name="name" required /></div>
        <div className="field"><label>Email</label><input type="email" name="email" required /></div>
        <div className="field"><label>Company / Organisation</label><input type="text" name="company" /></div>
        <div className="field"><label>Message</label><textarea name="message" required placeholder="What would you like branded?" /></div>
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}
