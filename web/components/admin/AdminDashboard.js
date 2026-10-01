'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiFetch('/api/admin/stats').then(setData).catch(() => setData(null));
  }, []);

  if (!data) return null;
  const { stats, recentOrders, STATUS_LABELS } = data;

  return (
    <>
      <div className="stat-row">
        <div className="stat-tile"><div className="lbl">Total Orders</div><div className="val">{stats.orders}</div></div>
        <div className="stat-tile"><div className="lbl">Active Orders</div><div className="val">{stats.activeOrders}</div></div>
        <div className="stat-tile"><div className="lbl">Clients</div><div className="val">{stats.clients}</div></div>
        <div className="stat-tile"><div className="lbl">Quoted Pipeline (KES)</div><div className="val">{stats.revenueQuoted.toLocaleString()}</div></div>
      </div>
      <div className="stat-row">
        <div className="stat-tile"><div className="lbl">Pending Payments</div><div className="val">{stats.pendingPayments}</div></div>
        <div className="stat-tile"><div className="lbl">Corporate Accounts</div><div className="val">{stats.corporateAccounts}</div></div>
        <div className="stat-tile"><div className="lbl">Overdue Invoices</div><div className="val" style={stats.overdueInvoices ? { color: 'var(--rust)' } : undefined}>{stats.overdueInvoices}</div></div>
      </div>

      <div className="card">
        <h3>Recent Orders</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Client</th><th>Qty</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>{o.title}</td>
                  <td>{o.client_company || o.client_name}</td>
                  <td>{o.quantity}</td>
                  <td><span className={`badge badge-${o.status}`}>{STATUS_LABELS[o.status]}</span></td>
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
