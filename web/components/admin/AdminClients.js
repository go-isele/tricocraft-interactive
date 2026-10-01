'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

function ClientRow({ c, onSaved }) {
  const [accountType, setAccountType] = useState(c.account_type);
  const [verified, setVerified] = useState(!!c.corporate_verified);
  const [creditTermsDays, setCreditTermsDays] = useState(c.credit_terms_days ? String(c.credit_terms_days) : '');
  const [kraPin, setKraPin] = useState(c.kra_pin || '');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/admin/clients/${c.id}/update`, {
        method: 'POST',
        body: JSON.stringify({
          account_type: accountType,
          corporate_verified: verified,
          credit_terms_days: creditTermsDays || null,
          kra_pin: kraPin,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td>{c.company || c.name}<div style={{ fontSize: 11, color: 'var(--slate-lt)' }}>{c.email}</div></td>
      <td>
        <form onSubmit={onSubmit} className="pe-inline-form">
          <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            <option value="retail">Retail</option>
            <option value="corporate">Corporate</option>
          </select>
          <label style={{ fontSize: 11.5, color: 'var(--slate-lt)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={verified} onChange={(e) => setVerified(e.target.checked)} /> Verified
          </label>
          <select value={creditTermsDays} onChange={(e) => setCreditTermsDays(e.target.value)}>
            <option value="">No credit</option>
            <option value="30">Net 30</option>
            <option value="60">Net 60</option>
            <option value="90">Net 90</option>
          </select>
          <input type="text" value={kraPin} onChange={(e) => setKraPin(e.target.value)} placeholder="KRA PIN" style={{ width: 140 }} />
          <button className="btn btn-dark btn-sm" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </form>
      </td>
    </tr>
  );
}

export default function AdminClients() {
  const [clients, setClients] = useState(null);

  function load() {
    apiFetch('/api/admin/clients').then((d) => setClients(d.clients)).catch(() => setClients([]));
  }

  useEffect(() => { load(); }, []);

  if (!clients) return null;

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Client</th><th>Account Settings</th></tr></thead>
          <tbody>
            {clients.map((c) => <ClientRow key={c.id} c={c} onSaved={load} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
