'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

function OrderRow({ o, showProgress }) {
  return (
    <tr>
      <td>{o.title}</td>
      <td>{o.quantity}</td>
      {showProgress && <td>{o.provider_name || '—'}</td>}
      <td><span className={`badge badge-${o.status}`}>{o.STATUS_LABELS?.[o.status] || o.status}</span></td>
      {showProgress && (
        <td style={{ width: 120 }}>
          <div className="progress-bar"><div style={{ width: `${o.progress}%` }} /></div>
        </td>
      )}
      <td><Link className="btn btn-outline btn-sm" href={`/marketplace/orders/${o.id}`}>View</Link></td>
    </tr>
  );
}

export default function OrdersList() {
  const searchParams = useSearchParams();
  const created = searchParams.get('created') === '1';
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch('/api/marketplace/orders').then(setData).catch(() => setData({ active: [], history: [], STATUS_LABELS: {} }));
  }, []);

  if (!data) return null;
  const { active, history, STATUS_LABELS } = data;
  const withLabels = (list) => list.map((o) => ({ ...o, STATUS_LABELS }));

  return (
    <>
      {created && <div className="form-success">Order(s) submitted — TrioCraft will confirm quotation and provider shortly.</div>}

      <div className="card">
        <h3>Active Orders ({active.length})</h3>
        {!active.length ? (
          <div className="empty-state"><div className="ico">📦</div><p>No active orders right now.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Qty</th><th>Provider</th><th>Status</th><th>Progress</th><th></th></tr></thead>
              <tbody>{withLabels(active).map((o) => <OrderRow key={o.id} o={o} showProgress />)}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Order History ({history.length})</h3>
        {!history.length ? (
          <div className="empty-state"><div className="ico">◎</div><p>Completed orders will show up here.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Qty</th><th>Status</th><th></th></tr></thead>
              <tbody>{withLabels(history).map((o) => <OrderRow key={o.id} o={o} showProgress={false} />)}</tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
