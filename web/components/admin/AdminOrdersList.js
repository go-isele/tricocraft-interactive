'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function AdminOrdersList() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || null;
  const [data, setData] = useState(null);

  useEffect(() => {
    const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    apiFetch(`/api/admin/orders${qs}`).then(setData).catch(() => setData({ orders: [], STATUS_LABELS: {} }));
  }, [statusFilter]);

  if (!data) return null;
  const { orders, STATUS_LABELS } = data;

  return (
    <>
      <div className="dash-hd">
        <div>
          <h1>All Orders</h1>
          <p>{orders.length} order(s){statusFilter ? ` · filtered by ${STATUS_LABELS[statusFilter] || statusFilter}` : ''}</p>
        </div>
      </div>

      <div className="cat-filter">
        <Link href="/admin/orders" className={!statusFilter ? 'active' : ''}>All</Link>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <Link key={k} href={`/admin/orders?status=${k}`} className={statusFilter === k ? 'active' : ''}>{v}</Link>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Client</th><th>Qty</th><th>Provider</th><th>Status</th><th>Progress</th><th></th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.title}</td>
                  <td>{o.client_company || o.client_name}</td>
                  <td>{o.quantity}</td>
                  <td>{o.provider_name || '—'}</td>
                  <td><span className={`badge badge-${o.status}`}>{STATUS_LABELS[o.status]}</span></td>
                  <td style={{ width: 110 }}><div className="progress-bar"><div style={{ width: `${o.progress}%` }} /></div></td>
                  <td><Link className="btn btn-outline btn-sm" href={`/admin/orders/${o.id}`}>Manage</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
