'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';

export default function CartBody() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [guestError, setGuestError] = useState(null);
  const [deliveryMethod, setDeliveryMethod] = useState(null);
  const [paymentTerms, setPaymentTerms] = useState('due_on_delivery');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch('/api/marketplace/cart').then((d) => {
      setData(d);
      if (d.deliveryMethods?.length) setDeliveryMethod(d.deliveryMethods[0].value);
    }).catch(() => setData({ items: [], total: 0, deliveryMethods: [], eacCountries: [], crossBorderPartners: [] }));
  }

  useEffect(() => { load(); }, []);

  async function removeItem(idx) {
    await apiFetch(`/api/marketplace/cart/remove/${idx}`, { method: 'POST' });
    load();
  }

  async function onCheckout(e) {
    e.preventDefault();
    setSubmitting(true);
    setGuestError(null);
    const form = e.target;
    const payload = {
      delivery_method: deliveryMethod,
      delivery_partner: form.delivery_partner?.value || undefined,
      delivery_town: form.delivery_town?.value,
      delivery_address: form.delivery_address?.value,
      delivery_country: form.delivery_country?.value,
      parcel_weight_kg: form.parcel_weight_kg?.value,
      payment_terms: paymentTerms,
      lpo_number: form.lpo_number?.value,
    };
    if (!user) {
      payload.guest_name = form.guest_name.value;
      payload.guest_email = form.guest_email.value;
      payload.guest_company = form.guest_company.value;
      payload.guest_phone = form.guest_phone.value;
    }
    try {
      await apiFetch('/api/marketplace/cart/checkout', { method: 'POST', body: JSON.stringify(payload) });
      router.push('/marketplace/orders?created=1');
    } catch (err) {
      if (err.status === 400 && err.body?.error === 'guest_details_required') {
        setGuestError(err.body.message);
      } else {
        setGuestError(err.body?.message || err.message || 'Something went wrong submitting your order.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) return null;
  const { items, total, deliveryMethods, eacCountries, crossBorderPartners, canUseCredit, creditTermsDays, waLink } = data;

  if (!items.length) {
    return (
      <div className="empty-state">
        <div className="ico">🛒</div><p>Your cart is empty.</p><br />
        <a className="btn btn-primary" href="/marketplace">Browse the Catalogue →</a>
      </div>
    );
  }

  const selectedMethod = deliveryMethods.find((m) => m.value === deliveryMethod);
  const isCrossBorder = selectedMethod?.value === 'cross_border_eac';

  return (
    <>
      {guestError && <div className="form-error">{guestError}</div>}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Options</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th><th></th></tr></thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>
                    {item.product.name}
                    {item.brief && <div style={{ fontSize: 11.5, color: 'var(--slate-lt)' }}>&ldquo;{item.brief}&rdquo;</div>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--slate-lt)' }}>
                    {item.selections?.length
                      ? item.selections.map((s, si) => <div key={si}>{s.optionName}: {s.valueLabel}</div>)
                      : '—'}
                  </td>
                  <td>{item.quantity}</td>
                  <td>
                    KES {Number(item.unitPrice).toLocaleString()}
                    {item.tierApplied && <div style={{ fontSize: 10.5, color: 'var(--forest)' }}>volume rate</div>}
                  </td>
                  <td>KES {Number(item.lineTotal).toLocaleString()}</td>
                  <td><button className="btn btn-outline btn-sm" type="button" onClick={() => removeItem(i)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {waLink && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Want to negotiate pricing or ask a question before submitting?</div>
          <a className="wa-cta-outline" href={waLink} target="_blank" rel="noopener">
            <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16.02 3C9.4 3 4 8.36 4 15c0 2.34.64 4.53 1.75 6.4L3 29l7.8-2.68A11.9 11.9 0 0 0 16.02 27C22.63 27 28 21.64 28 15S22.63 3 16.02 3Z" /></svg>
            Continue on WhatsApp
          </a>
        </div>
      )}

      <div className="card">
        <form onSubmit={onCheckout}>
          {!user && (
            <div style={{ background: 'var(--canvas)', border: '0.5px solid var(--border-md)', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginBottom: 18 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 10 }}>Your Details — so we can send your quotation</div>
              <div className="field"><label>Full Name</label><input type="text" name="guest_name" required /></div>
              <div className="field"><label>Email</label><input type="email" name="guest_email" required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field"><label>Company (optional)</label><input type="text" name="guest_company" /></div>
                <div className="field"><label>Phone (optional)</label><input type="text" name="guest_phone" /></div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 10 }}>Delivery</div>
          <div className="delivery-options">
            {deliveryMethods.map((m) => (
              <label key={m.value} className={`delivery-option${deliveryMethod === m.value ? ' checked' : ''}`}>
                <div className="hd">
                  <input type="radio" name="delivery_method" value={m.value} checked={deliveryMethod === m.value} onChange={() => setDeliveryMethod(m.value)} />
                  <span>{m.label}</span>
                </div>
                <div className="partners">Partners: {m.partners.join(', ')}</div>
                {m.value !== 'cross_border_eac' && m.partners.length > 1 && deliveryMethod === m.value && (
                  <select className="delivery-partner-select" name="delivery_partner" defaultValue={m.partners[0]}>
                    {m.partners.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                )}
              </label>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Town / Area</label><input type="text" name="delivery_town" placeholder="e.g. Westlands, Nairobi" /></div>
            <div className="field"><label>Delivery Address (optional)</label><input type="text" name="delivery_address" placeholder="Building, street, landmark" /></div>
          </div>

          {isCrossBorder && (
            <div className="cross-border-box">
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Cross-Border Destination</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Destination Country</label>
                  <select name="delivery_country">
                    {eacCountries.filter((c) => c.code !== 'KE').map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Partner</label>
                  <select name="delivery_partner">
                    {crossBorderPartners.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Approx. Parcel Weight (kg)</label><input type="number" name="parcel_weight_kg" defaultValue={1} min="0.1" step="0.1" /></div>
              <p style={{ fontSize: 11, color: 'var(--slate-lt)' }}>Cross-border cost is a planning estimate — TrioCraft&rsquo;s logistics team will confirm the final rate with your assigned courier before dispatch.</p>
            </div>
          )}

          {canUseCredit && (
            <div className="credit-terms-box">
              <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Payment Terms <span className="corporate-pill">Corporate Account</span></div>
              <label className="opt"><input type="radio" name="payment_terms" checked={paymentTerms === 'due_on_delivery'} onChange={() => setPaymentTerms('due_on_delivery')} /> Pay now via M-Pesa / regional mobile money</label>
              {[30, 60, 90].filter((d) => d <= (creditTermsDays || 0)).map((d) => (
                <label className="opt" key={d}>
                  <input type="radio" name="payment_terms" checked={paymentTerms === `net${d}`} onChange={() => setPaymentTerms(`net${d}`)} /> Net {d} days — invoice against an LPO
                </label>
              ))}
              {paymentTerms !== 'due_on_delivery' && (
                <div style={{ marginTop: 10 }}>
                  <div className="field"><label>LPO Number</label><input type="text" name="lpo_number" placeholder="e.g. LPO-2026-0451" /></div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginTop: 6 }}>
            <div>
              <div style={{ fontSize: 12.5, color: 'var(--slate-lt)' }}>Estimated Total</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 26 }}>KES {Number(total).toLocaleString()}</div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Order to TrioCraft →'}
            </button>
          </div>
        </form>
      </div>
      <p style={{ fontSize: 12, color: 'var(--slate-lt)' }}>Submitting creates one order per line item. TrioCraft&rsquo;s team will confirm the final quotation and assigned provider before production begins.</p>
    </>
  );
}
