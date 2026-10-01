'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

function RateRow({ c, row, onSaved }) {
  const [value, setValue] = useState(row ? String(row.kes_per_unit) : '');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/admin/fx-rates/update', {
        method: 'POST',
        body: JSON.stringify({ currency_code: c.code, kes_per_unit: value }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td>{c.code} — {c.name}</td>
      <td colSpan={3}>
        <form onSubmit={onSubmit} className="pe-inline-form">
          <input type="number" step="0.0001" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: 120 }} required />
          <span style={{ fontSize: 11.5, color: 'var(--slate-lt)' }}>{row ? new Date(row.updated_at).toLocaleString('en-KE') : 'not set'}</span>
          <button className="btn btn-dark btn-sm" type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update'}</button>
        </form>
      </td>
    </tr>
  );
}

export default function AdminFxRates() {
  const [data, setData] = useState(null);

  function load() {
    apiFetch('/api/admin/fx-rates').then(setData).catch(() => setData({ rates: [], supported: [] }));
  }

  useEffect(() => { load(); }, []);

  if (!data) return null;
  const { rates, supported } = data;

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Currency</th><th>1 unit = ? KES</th><th>Last Updated</th><th></th></tr></thead>
          <tbody>
            {supported.filter((c) => c.code !== 'KES').map((c) => {
              const row = rates.find((r) => r.currency_code === c.code);
              return <RateRow key={c.code} c={c} row={row} onSaved={load} />;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
