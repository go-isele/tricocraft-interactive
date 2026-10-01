'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, PUBLIC_API_URL } from '@/lib/api';

export default function AdminOrderDetail({ id }) {
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [form, setForm] = useState(null);

  function load() {
    apiFetch(`/api/admin/orders/${id}`)
      .then((d) => {
        setData(d);
        setForm({
          status: d.order.status,
          provider_id: d.order.provider_id || '',
          quoted_price: d.order.quoted_price || '',
          payment_status: d.order.payment_status,
          delivery_method: d.order.delivery_method || '',
          delivery_partner: d.order.delivery_partner || '',
          delivery_town: d.order.delivery_town || '',
          delivery_address: d.order.delivery_address || '',
          note: '',
        });
      })
      .catch((err) => { if (err.status === 404) setNotFound(true); });
  }

  useEffect(() => { load(); }, [id]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/admin/orders/${id}/update`, { method: 'POST', body: JSON.stringify(form) });
      load();
    } finally {
      setSaving(false);
    }
  }

  async function onIssueInvoice() {
    if (!confirm('Issue a formal invoice for this order? This notifies the client by email and WhatsApp.')) return;
    setInvoicing(true);
    try {
      await apiFetch(`/api/admin/orders/${id}/invoice`, { method: 'POST' });
      load();
    } finally {
      setInvoicing(false);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="ico">⚠</div><p>Order not found.</p><br />
        <Link className="btn btn-primary" href="/admin/orders">Back to All Orders →</Link>
      </div>
    );
  }
  if (!data || !form) return null;

  const { order, timeline, providers, payments, options, aiBrief, category, STATUS_LABELS, DELIVERY_METHODS } = data;

  return (
    <>
      <div className="crumbs" style={{ marginBottom: 18 }}><Link href="/admin/orders">All Orders</Link> &nbsp;/&nbsp; Order #{order.id}</div>
      <div className="dash-hd">
        <div>
          <h1>{order.title}</h1>
          <p>
            {order.client_company || order.client_name} · {order.client_email}
            {order.client_account_type === 'corporate' && (
              <span className="corporate-pill">Corporate{order.client_corporate_verified ? '' : ' (unverified)'}</span>
            )}
          </p>
        </div>
        <span className={`badge badge-${order.status}`} style={{ fontSize: 13, padding: '6px 16px' }}>{STATUS_LABELS[order.status]}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        <div className="card">
          <h3>Manage Order</h3>
          <form onSubmit={onSave}>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Provider</label>
              <select value={form.provider_id} onChange={(e) => setField('provider_id', e.target.value)}>
                <option value="">— Unassigned —</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.specialty ? ` — ${p.specialty}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Quoted Unit Price (KES)</label><input type="number" value={form.quoted_price} onChange={(e) => setField('quoted_price', e.target.value)} /></div>
            <div className="field">
              <label>Payment Status</label>
              <select value={form.payment_status} onChange={(e) => setField('payment_status', e.target.value)}>
                <option value="unpaid">Unpaid</option>
                <option value="deposit">Deposit Paid</option>
                <option value="paid">Paid in Full</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', margin: '18px 0 10px' }}>Delivery</div>
            <div className="field">
              <label>Method</label>
              <select value={form.delivery_method} onChange={(e) => setField('delivery_method', e.target.value)}>
                <option value="">— Not set —</option>
                {DELIVERY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="field"><label>Partner</label><input type="text" value={form.delivery_partner} onChange={(e) => setField('delivery_partner', e.target.value)} placeholder="e.g. Sendy, EASY COACH, In-house Rider" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field"><label>Town</label><input type="text" value={form.delivery_town} onChange={(e) => setField('delivery_town', e.target.value)} /></div>
              <div className="field"><label>Address</label><input type="text" value={form.delivery_address} onChange={(e) => setField('delivery_address', e.target.value)} /></div>
            </div>

            <div className="field"><label>Timeline Note (optional)</label><textarea value={form.note} onChange={(e) => setField('note', e.target.value)} placeholder="Add context for the client, e.g. quote details or a delay reason" /></div>
            <button className="btn btn-primary btn-block" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </form>
        </div>

        <div>
          <div className="card">
            <h3>Order Details</h3>
            <div style={{ fontSize: 13.5, lineHeight: 2 }}>
              {category && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-lt)' }}>Service Category</span>
                  <span><span className="cat-code-pill">{category.service_code}</span> {category.name}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Quantity</span><span>{order.quantity}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Deadline</span><span>{order.deadline || '—'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Submitted</span><span>{new Date(order.created_at).toLocaleString('en-KE')}</span></div>
              {order.calculated_unit_price && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Pricing-engine estimate</span><span>KES {order.calculated_unit_price.toLocaleString()} / unit</span></div>
              )}
            </div>
            {order.brief && <div style={{ marginTop: 14, fontSize: 13, color: 'var(--slate-lt)' }}><strong>Brief:</strong> {order.brief}</div>}
            {order.mockup_filename && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 8 }}>Logo Placement Preview</div>
                <a href={`${PUBLIC_API_URL}/uploads/mockups/${order.mockup_filename}`} target="_blank" rel="noopener">
                  <img src={`${PUBLIC_API_URL}/uploads/mockups/${order.mockup_filename}`} alt="Logo placement preview" style={{ maxWidth: 200, borderRadius: 'var(--r-sm)', border: '0.5px solid var(--border-md)' }} />
                </a>
              </div>
            )}
            {aiBrief && (
              <div className="ai-brief-summary" style={{ marginTop: 14 }}>
                <span className="tag">{aiBrief.method === 'ai' ? 'AI-Structured Brief' : 'Structured Brief'}</span>
                {aiBrief.dimensions && <div><strong>Dimensions:</strong> {aiBrief.dimensions}</div>}
                <div><strong>Colour mode:</strong> {aiBrief.colorMode}</div>
                {aiBrief.placementNotes?.length > 0 && <ul>{aiBrief.placementNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
              </div>
            )}
            {options?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 8 }}>Configuration</div>
                {options.map((o, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                    <span style={{ color: 'var(--slate-lt)' }}>{o.optionName}</span><span>{o.valueLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3>Billing &amp; Invoicing</h3>
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--slate-lt)' }}>Payment Terms</span>
                <span>{order.payment_terms === 'due_on_delivery' ? 'Due on delivery' : `${order.payment_terms.replace('net', 'Net ')} days`}</span>
              </div>
              {order.lpo_number && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-lt)' }}>LPO No.</span>
                  <span>{order.lpo_number}{order.lpo_filename && <> · <a href={`${PUBLIC_API_URL}/uploads/lpo/${order.lpo_filename}`} target="_blank" rel="noopener">view document</a></>}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Invoice</span><span className={`badge badge-${order.invoice_status}`}>{order.invoice_status.replace('_', ' ')}</span></div>
              {order.invoice_number && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Invoice No.</span><span>{order.invoice_number}</span></div>}
              {order.invoice_due_date && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Due Date</span><span>{order.invoice_due_date}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>KRA e-TIMS</span><span className={`badge badge-${order.etims_status}`}>{order.etims_status.replace('_', ' ')}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {order.invoice_status === 'not_invoiced' && (
                <button className="btn btn-dark btn-sm" type="button" onClick={onIssueInvoice} disabled={invoicing}>{invoicing ? 'Issuing…' : 'Issue Invoice'}</button>
              )}
              <a className="btn btn-outline btn-sm" href={`${PUBLIC_API_URL}/api/marketplace/orders/${order.id}/invoice.pdf`} target="_blank" rel="noopener">📄 Download PDF</a>
            </div>
          </div>

          <div className="card">
            <h3>Payments</h3>
            {!payments.length ? (
              <p style={{ fontSize: 13, color: 'var(--slate-lt)' }}>No payment attempts recorded yet.</p>
            ) : (
              payments.map((p) => (
                <div className="pay-row" key={p.id}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.currency || 'KES'} {p.amount.toLocaleString()} · {p.method.toUpperCase()}{p.phone && <> · {p.phone}</>}</div>
                    <div className="meta">{new Date(p.created_at).toLocaleString('en-KE')}{p.mpesa_receipt && <> · Receipt: {p.mpesa_receipt}</>}{p.result_desc && <> · {p.result_desc}</>}</div>
                  </div>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <h3>Timeline</h3>
            <div className="timeline">
              {timeline.map((t) => (
                <div className="item" key={t.id}>
                  <div className="stage">{t.stage}</div>
                  {t.notes && <div className="notes">{t.notes}</div>}
                  <div className="when">{new Date(t.created_at).toLocaleString('en-KE')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
