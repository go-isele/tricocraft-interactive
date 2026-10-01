'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, PUBLIC_API_URL } from '@/lib/api';

function WaIcon() {
  return (
    <svg viewBox="0 0 32 32" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M16.02 3C9.4 3 4 8.36 4 15c0 2.34.64 4.53 1.75 6.4L3 29l7.8-2.68A11.9 11.9 0 0 0 16.02 27C22.63 27 28 21.64 28 15S22.63 3 16.02 3Z" />
    </svg>
  );
}

export default function OrderDetail({ id }) {
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState(null); // 'sent' | 'error'
  const [paying, setPaying] = useState(false);

  function load() {
    apiFetch(`/api/marketplace/orders/${id}`)
      .then(setData)
      .catch((err) => { if (err.status === 404 || err.status === 403) setNotFound(true); });
  }

  useEffect(() => { load(); }, [id]);

  async function onPayMpesa(e) {
    e.preventDefault();
    setPaying(true);
    setMpesaStatus(null);
    const phone = e.target.phone.value;
    try {
      const result = await apiFetch(`/api/marketplace/orders/${id}/pay-mpesa`, {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setMpesaStatus(result.success ? 'sent' : 'error');
      load();
    } catch {
      setMpesaStatus('error');
    } finally {
      setPaying(false);
    }
  }

  async function onPayRegional(e) {
    e.preventDefault();
    setPaying(true);
    setMpesaStatus(null);
    const phone = e.target.phone.value;
    const provider = e.target.provider.value;
    try {
      const result = await apiFetch(`/api/marketplace/orders/${id}/pay-regional`, {
        method: 'POST',
        body: JSON.stringify({ phone, provider }),
      });
      setMpesaStatus(result.success ? 'sent' : 'error');
      load();
    } catch {
      setMpesaStatus('error');
    } finally {
      setPaying(false);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="ico">⚠</div><p>Order not found.</p><br />
        <Link className="btn btn-primary" href="/marketplace/orders">Back to My Orders →</Link>
      </div>
    );
  }
  if (!data) return null;

  const { order, timeline, payments, options, aiBrief, category, STATUS_LABELS, DELIVERY_METHODS, eacCountries, waLink } = data;
  const quotedTotal = order.quoted_price ? order.quoted_price * order.quantity : null;
  const estimateTotal = order.calculated_unit_price ? order.calculated_unit_price * order.quantity : null;
  const priceDisplay = quotedTotal
    ? `KES ${quotedTotal.toLocaleString()}`
    : estimateTotal
      ? `KES ${estimateTotal.toLocaleString()} (estimate)`
      : 'Pending';
  const payableTotal = quotedTotal || estimateTotal || 0;

  return (
    <>
      <div className="crumbs" style={{ marginBottom: 18 }}>
        <Link href="/marketplace/orders">My Orders</Link> &nbsp;/&nbsp; Order #{order.id}
      </div>
      <div className="dash-hd">
        <div><h1>{order.title}</h1><p>Placed {new Date(order.created_at).toLocaleDateString('en-KE')}</p></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a className="wa-cta-outline" href={waLink} target="_blank" rel="noopener" title="Message us about this order">
            <WaIcon />
          </a>
          <span className={`badge badge-${order.status}`} style={{ fontSize: 13, padding: '6px 16px' }}>
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
      </div>

      {mpesaStatus === 'sent' && <div className="form-success">Payment prompt sent — check your phone and enter your PIN to complete payment.</div>}
      {mpesaStatus === 'error' && <div className="form-error">Couldn&rsquo;t start the payment — check the phone number and try again.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 20 }}>
        <div className="card">
          <h3>Order Details</h3>
          <div style={{ fontSize: 13.5, lineHeight: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Product</span><span>{order.product_name || 'Custom Brief'}</span></div>
            {category && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--slate-lt)' }}>Service Category</span>
                <span><span className="cat-code-pill">{category.service_code}</span> {category.name}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Quantity</span><span>{order.quantity}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Provider</span><span>{order.provider_name || 'To be assigned'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Quoted Price</span><span>{priceDisplay}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Payment</span><span className={`badge badge-${order.payment_status}`}>{order.payment_status}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--slate-lt)' }}>Deadline</span><span>{order.deadline || '—'}</span></div>
          </div>
          <div className="progress-bar" style={{ marginTop: 16 }}><div style={{ width: `${order.progress}%` }} /></div>
          {order.brief && <div style={{ marginTop: 16, fontSize: 13, color: 'var(--slate-lt)' }}><strong>Brief:</strong> {order.brief}</div>}

          {order.mockup_filename && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 8 }}>Logo Placement Preview</div>
              <a href={`${PUBLIC_API_URL}/uploads/mockups/${order.mockup_filename}`} target="_blank" rel="noopener">
                <img src={`${PUBLIC_API_URL}/uploads/mockups/${order.mockup_filename}`} alt="Logo placement preview" style={{ maxWidth: 220, borderRadius: 'var(--r-sm)', border: '0.5px solid var(--border-md)' }} />
              </a>
              <div style={{ fontSize: 11, color: 'var(--slate-lt)', marginTop: 4 }}>From the live mockup editor — a placement preview, not a colour-accurate proof.</div>
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
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 8 }}>Configuration</div>
              {options.map((o, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                  <span style={{ color: 'var(--slate-lt)' }}>{o.optionName}</span>
                  <span>{o.valueLabel}{o.priceDelta ? ` (${o.priceDelta > 0 ? '+' : ''}KES ${o.priceDelta.toLocaleString()})` : ''}</span>
                </div>
              ))}
            </div>
          )}

          {order.delivery_method && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 8 }}>Delivery</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {(DELIVERY_METHODS.find((m) => m.value === order.delivery_method) || {}).label || order.delivery_method}
                {order.delivery_partner && <> via {order.delivery_partner}</>}
                {order.delivery_country && <><br />Destination: {(eacCountries.find((c) => c.code === order.delivery_country) || {}).name || order.delivery_country}</>}
                {order.cross_border_cost_kes && <><br />Est. logistics cost: KES {order.cross_border_cost_kes.toLocaleString()}</>}
                {order.delivery_town && <><br />{order.delivery_town}</>}
                {order.delivery_address && <><br />{order.delivery_address}</>}
              </div>
            </div>
          )}

          {order.payment_terms && order.payment_terms !== 'due_on_delivery' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 8 }}>Credit Terms</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {order.payment_terms.replace('net', 'Net ')} days{order.lpo_number && <> · LPO No: {order.lpo_number}</>}
                <br />Invoice: <span className={`badge badge-${order.invoice_status}`}>{order.invoice_status.replace('_', ' ')}</span>
                {order.invoice_due_date && <> · due {order.invoice_due_date}</>}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <a className="btn btn-outline btn-sm" href={`${PUBLIC_API_URL}/api/marketplace/orders/${order.id}/invoice.pdf`} target="_blank" rel="noopener">
              📄 Download {order.invoice_status === 'not_invoiced' ? 'Proforma Invoice' : 'Tax Invoice'}
            </a>
          </div>
        </div>

        <div>
          <div className="card">
            <h3>Payment</h3>
            {!payments.length ? (
              <p style={{ fontSize: 13, color: 'var(--slate-lt)', marginBottom: 12 }}>No payment attempts yet.</p>
            ) : (
              payments.map((p) => (
                <div className="pay-row" key={p.id}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.currency || 'KES'} {p.amount.toLocaleString()} · {p.method.toUpperCase()}</div>
                    <div className="meta">{new Date(p.created_at).toLocaleString('en-KE')}{p.mpesa_receipt && <> · Receipt: {p.mpesa_receipt}</>}</div>
                  </div>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                </div>
              ))
            )}
            {order.payment_status !== 'paid' && payableTotal > 0 && (
              <>
                <form onSubmit={onPayMpesa} className="mpesa-form">
                  <input type="tel" name="phone" placeholder="07XX XXX XXX" required />
                  <button className="btn btn-dark btn-sm" type="submit" disabled={paying}>Pay with M-Pesa</button>
                </form>
                {order.currency && order.currency !== 'KES' && (
                  <form onSubmit={onPayRegional} className="mpesa-form" style={{ marginTop: 8 }}>
                    <input type="tel" name="phone" placeholder="Mobile money number" required />
                    <input type="hidden" name="provider" value={order.currency === 'UGX' ? 'momo' : 'airtel_money'} />
                    <button className="btn btn-outline btn-sm" type="submit" disabled={paying}>
                      {order.currency === 'UGX' ? 'Pay with MTN MoMo' : 'Pay with Airtel Money'}
                    </button>
                  </form>
                )}
                <p style={{ fontSize: 11, color: 'var(--slate-lt)', marginTop: 8 }}>You&rsquo;ll get a payment prompt on your phone for KES {payableTotal.toLocaleString()}.</p>
              </>
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
