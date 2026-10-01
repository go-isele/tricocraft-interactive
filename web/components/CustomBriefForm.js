'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { apiFetch } from '@/lib/api';

export default function CustomBriefForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [categoryRef, setCategoryRef] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [brief, setBrief] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState(null);
  const [paymentTerms, setPaymentTerms] = useState('due_on_delivery');
  const [aiBrief, setAiBrief] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/marketplace/custom-brief/meta').then((data) => {
      setMeta(data);
      if (data.categories?.length) setCategoryRef(data.categories[0].slug);
      if (data.deliveryMethods?.length) setDeliveryMethod(data.deliveryMethods[0].value);
    }).catch(() => {});
  }, []);

  async function onAiAssist() {
    if (!brief.trim()) { alert('Write a few words in the Brief field first.'); return; }
    setAiLoading(true);
    try {
      const data = await apiFetch('/api/marketplace/custom-brief/ai-assist', {
        method: 'POST',
        body: JSON.stringify({ description: brief }),
      });
      setAiBrief(data);
      if (data.suggestedCategorySlug) setCategoryRef(data.suggestedCategorySlug);
      if (data.quantityGuess) setQuantity(data.quantityGuess);
    } catch {
      alert('AI Assist is unavailable right now — you can still fill in the form manually.');
    } finally {
      setAiLoading(false);
    }
  }

  function waLink() {
    const msg = `Hi TrioCraft! I have a custom project brief:\n\nProject: ${title || '(untitled project)'}\n\n${brief || '(no details yet)'}\n\nCould we discuss quantity, pricing, and timeline?`;
    return `https://wa.me/${meta?.site?.whatsappNumber || '254111206420'}?text=${encodeURIComponent(msg)}`;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.target;
    const payload = {
      title,
      category_ref: categoryRef,
      quantity,
      brief,
      deadline: form.deadline.value,
      delivery_method: deliveryMethod,
      delivery_partner: form.delivery_partner?.value,
      delivery_town: form.delivery_town.value,
      delivery_address: form.delivery_address.value,
      delivery_country: form.delivery_country?.value,
      parcel_weight_kg: form.parcel_weight_kg?.value,
      payment_terms: paymentTerms,
      lpo_number: form.lpo_number?.value,
      ai_brief_json: aiBrief ? JSON.stringify(aiBrief) : undefined,
    };
    if (!user) {
      payload.guest_name = form.guest_name.value;
      payload.guest_email = form.guest_email.value;
      payload.guest_company = form.guest_company.value;
      payload.guest_phone = form.guest_phone.value;
    }
    try {
      await apiFetch('/api/marketplace/custom-brief', { method: 'POST', body: JSON.stringify(payload) });
      router.push('/marketplace/orders?created=1');
    } catch (err) {
      setError(err.body?.message || err.message || 'Something went wrong submitting your brief.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!meta) return null;
  const { categories, deliveryMethods, eacCountries, crossBorderPartners, canUseCredit, creditTermsDays } = meta;
  const isCrossBorder = deliveryMethods.find((m) => m.value === deliveryMethod)?.value === 'cross_border_eac';

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={onSubmit}>
        {!user && (
          <div style={{ background: 'var(--canvas)', border: '0.5px solid var(--border-md)', borderRadius: 'var(--r-sm)', padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 10 }}>Your Details</div>
            <div className="field"><label>Full Name</label><input type="text" name="guest_name" required /></div>
            <div className="field"><label>Email</label><input type="email" name="guest_email" required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field"><label>Company (optional)</label><input type="text" name="guest_company" /></div>
              <div className="field"><label>Phone (optional)</label><input type="text" name="guest_phone" /></div>
            </div>
          </div>
        )}

        <div className="field"><label>Project Title</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Product Launch — Full Brand Identity" /></div>
        <div className="field">
          <label>Category (for reference)</label>
          <select value={categoryRef} onChange={(e) => setCategoryRef(e.target.value)}>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Estimated Quantity / Scope</label><input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} /></div>
        <div className="field"><label>Deadline</label><input type="date" name="deadline" /></div>
        <div className="field">
          <label>Brief</label>
          <textarea value={brief} onChange={(e) => setBrief(e.target.value)} required placeholder="Describe what you need, your brand context, and any references." style={{ minHeight: 130 }} />
          <button type="button" className="ai-assist-btn" onClick={onAiAssist} disabled={aiLoading}>
            {aiLoading ? '✨ Structuring…' : '✨ AI Assist — structure this brief'}
          </button>
          {aiBrief && (
            <div className="ai-brief-summary">
              <span className="tag">{aiBrief.method === 'ai' ? 'AI-Structured' : 'Heuristic'}</span>
              {aiBrief.dimensions && <div><strong>Dimensions:</strong> {aiBrief.dimensions}</div>}
              <div><strong>Colour mode:</strong> {aiBrief.colorMode || '—'}</div>
              {aiBrief.keyElements?.length > 0 && <div><strong>Key elements:</strong> {aiBrief.keyElements.join(', ')}</div>}
              {aiBrief.placementNotes?.length > 0 && <ul>{aiBrief.placementNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
            </div>
          )}
        </div>

        {deliveryMethods.length > 0 && (
          <>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--slate-lt)', marginBottom: 10 }}>Delivery (once ready)</div>
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
              </div>
            )}
          </>
        )}

        {canUseCredit && (
          <div className="credit-terms-box">
            <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Payment Terms <span className="corporate-pill">Corporate Account</span></div>
            <label className="opt"><input type="radio" name="payment_terms" checked={paymentTerms === 'due_on_delivery'} onChange={() => setPaymentTerms('due_on_delivery')} /> Pay on delivery via M-Pesa / regional mobile money</label>
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

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="submit" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Brief →'}
          </button>
          <a className="wa-cta-outline" href={waLink()} target="_blank" rel="noopener">
            <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16.02 3C9.4 3 4 8.36 4 15c0 2.34.64 4.53 1.75 6.4L3 29l7.8-2.68A11.9 11.9 0 0 0 16.02 27C22.63 27 28 21.64 28 15S22.63 3 16.02 3Z" /></svg>
            Discuss on WhatsApp instead
          </a>
        </div>
      </form>
    </div>
  );
}
