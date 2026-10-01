'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';
import MockupEditor from './MockupEditor';

function tierUnitPrice(tiers, basePrice, qty) {
  const matches = (tiers || []).filter((t) => qty >= t.min_qty && (t.max_qty == null || qty <= t.max_qty));
  if (!matches.length) return basePrice;
  return matches.sort((a, b) => b.min_qty - a.min_qty)[0].unit_price;
}

export default function ProductConfigurator({ product, providers, pricing }) {
  const { user } = useAuth();
  const router = useRouter();
  const mockupRef = useRef(null);

  const optionGroups = pricing?.options || [];
  const tiers = pricing?.tiers || [];

  const [quantity, setQuantity] = useState(product.min_quantity || 1);
  const [selections, setSelections] = useState(() => {
    const initial = {};
    optionGroups.forEach((opt) => {
      const def = opt.values.find((v) => v.is_default) || opt.values[0];
      if (def) initial[opt.id] = def.id;
    });
    return initial;
  });
  const [brief, setBrief] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const unitPrice = useMemo(() => {
    let unit = tierUnitPrice(tiers, product.base_price, quantity);
    optionGroups.forEach((opt) => {
      const chosenId = selections[opt.id];
      const val = opt.values.find((v) => v.id === chosenId);
      if (val) unit += Number(val.price_delta) || 0;
    });
    return unit;
  }, [selections, quantity, tiers, product.base_price, optionGroups]);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const mockup_data = mockupRef.current?.exportDataUrl() || null;
    try {
      await apiFetch('/api/marketplace/cart/add', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          quantity,
          brief,
          mockup_data,
          optionValueIds: selections,
        }),
      });
      router.push('/marketplace/cart');
    } catch (err) {
      setError(err.body?.message || err.message || 'Could not add this to your cart.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div>
        <MockupEditor product={product} ref={mockupRef} />
      </div>

      <div>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>{product.name}</h1>
        <p style={{ color: 'var(--slate-lt)', marginBottom: 18 }}>{product.description}</p>
        <div style={{ fontFamily: 'var(--display)', fontSize: 30, color: 'var(--rust)', marginBottom: 4 }}>
          KES {Number(product.base_price).toLocaleString()} <span style={{ fontSize: 14, color: 'var(--slate-lt)', fontFamily: 'var(--body)' }}>/ unit (base)</span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--slate-lt)', marginBottom: 24 }}>Minimum order quantity: {product.min_quantity}</div>

        <div className="card">
          <h3>Step 1 · Provider</h3>
          {!providers.length ? (
            <p style={{ color: 'var(--slate-lt)', fontSize: 13 }}>Auto-assigned by TrioCraft based on capacity — no action needed.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Provider</th><th>Specialty</th><th>Turnaround</th><th>Rating</th></tr></thead>
                <tbody>
                  {providers.map((pv) => (
                    <tr key={pv.id}>
                      <td>{pv.name} {pv.vetted ? <span className="badge badge-completed">Vetted</span> : null}</td>
                      <td>{pv.specialty || '—'}</td>
                      <td>{pv.turnaround_days} days</td>
                      <td>★ {pv.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {tiers.length > 0 && (
          <div className="card">
            <h3>Volume Pricing</h3>
            <div className="table-wrap">
              <table className="tier-table">
                <thead><tr><th>Quantity</th><th>Unit Price (KES)</th></tr></thead>
                <tbody>
                  {tiers.map((t) => (
                    <tr key={t.id}><td>{t.min_qty}{t.max_qty ? `–${t.max_qty}` : '+'} units</td><td>KES {Number(t.unit_price).toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tier-note">The best-matching tier for your quantity is applied automatically.</div>
          </div>
        )}

        <div className="card">
          <h3>Step 2 · {user ? 'Configure & Add to Order' : 'Request a Quote'}</h3>
          {!user && (
            <p style={{ fontSize: 12.5, color: 'var(--slate-lt)', marginBottom: 14 }}>
              No account needed — add it to your cart, then give us your details at checkout and we&rsquo;ll follow up with pricing and lead time.
            </p>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="price-estimate">
            <div>
              <div className="lbl">Estimated Total</div>
              <div className="amt">KES {(unitPrice * quantity).toLocaleString()}</div>
            </div>
            <div className="per-unit">KES {unitPrice.toLocaleString()} / unit</div>
          </div>

          <form onSubmit={onSubmit}>
            {optionGroups.map((opt) => (
              <div className="opt-group" key={opt.id}>
                <div className="opt-group-lbl">{opt.name}</div>
                <div className="opt-values">
                  {opt.values.map((v) => (
                    <label className={`opt-value${selections[opt.id] === v.id ? ' checked' : ''}`} key={v.id}>
                      <input
                        type="radio"
                        name={`opt_${opt.id}`}
                        checked={selections[opt.id] === v.id}
                        onChange={() => setSelections((s) => ({ ...s, [opt.id]: v.id }))}
                      />
                      <span>{v.label}</span>
                      {v.price_delta ? <span className="delta">{v.price_delta > 0 ? '+' : ''}KES {Number(v.price_delta).toLocaleString()}</span> : null}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="field">
              <label>Quantity</label>
              <input
                type="number"
                min={product.min_quantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(product.min_quantity || 1, Number(e.target.value) || 1))}
                required
              />
            </div>
            <div className="field">
              <label>Brief / customisation notes (optional)</label>
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Colours, placement, deadline, anything the design team should know" />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : (user ? 'Add to Cart →' : 'Request Quote →')}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
