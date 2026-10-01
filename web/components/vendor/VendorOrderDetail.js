'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, PUBLIC_API_URL } from '@/lib/api';

export default function VendorOrderDetail({ id }) {
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [checked, setChecked] = useState([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch(`/api/vendor/orders/${id}`)
      .then((d) => { setData(d); setChecked([]); setNote(''); })
      .catch((err) => { if (err.status === 404) setNotFound(true); });
  }

  useEffect(() => { load(); }, [id]);

  function toggleItem(item) {
    setChecked((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  }

  async function onAdvance(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/api/vendor/orders/${id}/advance`, {
        method: 'POST',
        body: JSON.stringify({ note, checklist_items: checked }),
      });
      load();
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="ico">⚠</div><p>Order not found.</p><br />
        <Link className="btn btn-primary" href="/vendor">Back to Assigned Orders →</Link>
      </div>
    );
  }
  if (!data) return null;

  const { order, timeline, payments, options, aiBrief, category, STATUS_LABELS, NEXT_STATUS, DELIVERY_METHODS, EAC_COUNTRIES, jobCard } = data;
  const next = NEXT_STATUS[order.status];

  return (
    <>
      <div className="crumbs" style={{ marginBottom: 18 }}><Link href="/vendor">Assigned Orders</Link> &nbsp;/&nbsp; Order #{order.id}</div>
      <div className="dash-hd">
        <div><h1>{order.title}</h1><p>Client: {order.client_name}</p></div>
        <span className={`badge badge-${order.status}`} style={{ fontSize: 13, padding: '6px 16px' }}>{STATUS_LABELS[order.status]}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        <div className="card">
          <h3>Update Status</h3>
          {next ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--slate-lt)', marginBottom: 14 }}>Move this order forward to <strong>{STATUS_LABELS[next]}</strong>.</p>
              <form onSubmit={onAdvance}>
                {jobCard && (
                  <div className="job-card-checklist">
                    <div className="stage-lbl">{jobCard.title}</div>
                    {jobCard.items.map((item, i) => (
                      <label key={i} className={checked.includes(item) ? 'checked' : ''}>
                        <input type="checkbox" checked={checked.includes(item)} onChange={() => toggleItem(item)} /> {item}
                      </label>
                    ))}
                  </div>
                )}
                <div className="field">
                  <label>Note (optional)</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Production notes for the client / TrioCraft team" />
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
                  {submitting ? 'Advancing…' : `Advance to ${STATUS_LABELS[next]} →`}
                </button>
              </form>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--slate-lt)' }}>This order isn&rsquo;t in a production stage you can advance right now.</p>
          )}

          <div style={{ marginTop: 16, fontSize: 13.5, lineHeight: 2 }}>
            {category && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--slate-lt)' }}>Service Category</span>
                <span><span className="cat-code-pill">{category.service_code}</span> {category.name}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Quantity</span><span>{order.quantity}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Deadline</span><span>{order.deadline || '—'}</span></div>
          </div>
          {order.brief && <div style={{ marginTop: 12, fontSize: 13, color: 'var(--slate-lt)' }}><strong>Brief:</strong> {order.brief}</div>}

          {order.mockup_filename && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 8 }}>Logo Placement Preview</div>
              <a href={`${PUBLIC_API_URL}/uploads/mockups/${order.mockup_filename}`} target="_blank" rel="noopener">
                <img src={`${PUBLIC_API_URL}/uploads/mockups/${order.mockup_filename}`} alt="Logo placement preview" style={{ maxWidth: 200, borderRadius: 'var(--r-sm)', border: '0.5px solid var(--border-md)' }} />
              </a>
            </div>
          )}

          {aiBrief && (
            <div className="ai-brief-summary" style={{ marginTop: 12 }}>
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

          {order.delivery_method && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 8 }}>Delivery</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {(DELIVERY_METHODS.find((m) => m.value === order.delivery_method) || {}).label || order.delivery_method}
                {order.delivery_partner && <> via {order.delivery_partner}</>}
                {order.delivery_country && <><br />Destination: {(EAC_COUNTRIES.find((c) => c.code === order.delivery_country) || {}).name || order.delivery_country}</>}
                {order.cross_border_cost_kes && <><br />Est. logistics cost: KES {order.cross_border_cost_kes.toLocaleString()}</>}
                {order.delivery_town && <><br />{order.delivery_town}</>}
              </div>
            </div>
          )}
        </div>

        <div>
          {payments?.length > 0 && (
            <div className="card">
              <h3>Payment Status</h3>
              {payments.map((p) => (
                <div className="pay-row" key={p.id}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>KES {p.amount.toLocaleString()} · {p.method.toUpperCase()}</div>
                    <div className="meta">{new Date(p.created_at).toLocaleString('en-KE')}{p.mpesa_receipt && <> · Receipt: {p.mpesa_receipt}</>}</div>
                  </div>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}

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
