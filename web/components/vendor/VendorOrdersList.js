'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function VendorOrdersList() {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch('/api/vendor/orders').then(setData).catch(() => setData({ orders: [], providers: [], STATUS_LABELS: {} }));
  }, []);

  if (!data) return null;
  const { orders, providers, STATUS_LABELS } = data;

  return (
    <>
      {providers?.length > 0 && (
        <div className="card">
          <h3>Your Production Line</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {providers.map((p) => (
              <div className="pe-chip" style={{ fontSize: 12.5, padding: '6px 14px' }} key={p.id}>
                <strong>{p.name}</strong>{p.specialty && <> · {p.specialty}</>} · {p.turnaround_days}d turnaround
              </div>
            ))}
          </div>
        </div>
      )}

      {!orders.length ? (
        <div className="empty-state"><div className="ico">🏭</div><p>No orders assigned yet.</p></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Client</th><th>Qty</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.title}</td>
                    <td>{o.client_name}</td>
                    <td>{o.quantity}</td>
                    <td><span className={`badge badge-${o.status}`}>{STATUS_LABELS[o.status]}</span></td>
                    <td><Link className="btn btn-outline btn-sm" href={`/vendor/orders/${o.id}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
