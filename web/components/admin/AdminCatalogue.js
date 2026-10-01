'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

function AddProductForm({ categories, onAdded }) {
  const [submitting, setSubmitting] = useState(false);
  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const form = e.target;
    try {
      await apiFetch('/api/admin/catalogue/products/add', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.value,
          category_id: form.category_id.value,
          description: form.description.value,
          base_price: form.base_price.value,
          min_quantity: form.min_quantity.value,
        }),
      });
      form.reset();
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="card">
      <h3>Add Product</h3>
      <form onSubmit={onSubmit}>
        <div className="field"><label>Name</label><input type="text" name="name" required /></div>
        <div className="field">
          <label>Category</label>
          <select name="category_id" required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field"><label>Description</label><textarea name="description" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label>Base Price (KES)</label><input type="number" name="base_price" required /></div>
          <div className="field"><label>Min Quantity</label><input type="number" name="min_quantity" defaultValue={1} /></div>
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add Product'}</button>
      </form>
    </div>
  );
}

function AddProviderForm({ categories, onAdded }) {
  const [submitting, setSubmitting] = useState(false);
  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const form = e.target;
    try {
      await apiFetch('/api/admin/catalogue/providers/add', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.value,
          category_id: form.category_id.value,
          turnaround_days: form.turnaround_days.value,
          location: form.location.value,
          specialty: form.specialty.value,
          notes: form.notes.value,
        }),
      });
      form.reset();
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="card">
      <h3>Add Provider</h3>
      <form onSubmit={onSubmit}>
        <div className="field"><label>Name</label><input type="text" name="name" required /></div>
        <div className="field">
          <label>Primary Category</label>
          <select name="category_id">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label>Turnaround (days)</label><input type="number" name="turnaround_days" defaultValue={7} /></div>
          <div className="field"><label>Location</label><input type="text" name="location" defaultValue="Nairobi, Kenya" /></div>
        </div>
        <div className="field"><label>Specialty</label><input type="text" name="specialty" placeholder="e.g. Screen Printing, Large Format Vinyl, Offset Litho" /></div>
        <div className="field"><label>Notes</label><textarea name="notes" /></div>
        <button className="btn btn-dark btn-block" type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add Provider'}</button>
      </form>
    </div>
  );
}

function AddOptionValueForm({ optionId, onAdded }) {
  async function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    await apiFetch(`/api/admin/catalogue/options/${optionId}/values/add`, {
      method: 'POST',
      body: JSON.stringify({ label: form.label.value, price_delta: form.price_delta.value, is_default: form.is_default.checked }),
    });
    form.reset();
    onAdded();
  }
  return (
    <form onSubmit={onSubmit} className="pe-inline-form">
      <input type="text" name="label" placeholder="Value label (e.g. 300gsm Matte)" required />
      <input type="number" name="price_delta" placeholder="Price delta (KES)" defaultValue={0} style={{ width: 150 }} />
      <label style={{ fontSize: 11.5, color: 'var(--slate-lt)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="checkbox" name="is_default" style={{ width: 'auto' }} /> default
      </label>
      <button className="btn btn-outline btn-sm" type="submit">+ Add Value</button>
    </form>
  );
}

function AddOptionGroupForm({ productId, onAdded }) {
  async function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    await apiFetch(`/api/admin/catalogue/products/${productId}/options/add`, {
      method: 'POST',
      body: JSON.stringify({ name: form.name.value }),
    });
    form.reset();
    onAdded();
  }
  return (
    <form onSubmit={onSubmit} className="pe-inline-form" style={{ marginTop: 8 }}>
      <input type="text" name="name" placeholder="New option group name (e.g. Paper Stock)" required />
      <button className="btn btn-dark btn-sm" type="submit">+ Add Option Group</button>
    </form>
  );
}

function AddTierForm({ productId, onAdded }) {
  async function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    await apiFetch(`/api/admin/catalogue/products/${productId}/tiers/add`, {
      method: 'POST',
      body: JSON.stringify({ min_qty: form.min_qty.value, max_qty: form.max_qty.value, unit_price: form.unit_price.value }),
    });
    form.reset();
    onAdded();
  }
  return (
    <form onSubmit={onSubmit} className="pe-inline-form">
      <input type="number" name="min_qty" placeholder="Min qty" required style={{ width: 100 }} />
      <input type="number" name="max_qty" placeholder="Max qty (blank = open-ended)" style={{ width: 180 }} />
      <input type="number" name="unit_price" placeholder="Unit price (KES)" required style={{ width: 150 }} />
      <button className="btn btn-outline btn-sm" type="submit">+ Add Tier</button>
    </form>
  );
}

function ProductBlock({ p, onChanged }) {
  async function onDeactivate() {
    if (!confirm('Deactivate this product?')) return;
    await apiFetch(`/api/admin/catalogue/products/${p.id}/delete`, { method: 'POST' });
    onChanged();
  }
  async function onDeleteGroup(optionId) {
    if (!confirm('Delete this option group and all its values?')) return;
    await apiFetch(`/api/admin/catalogue/options/${optionId}/delete`, { method: 'POST' });
    onChanged();
  }
  async function onDeleteTier(tierId) {
    await apiFetch(`/api/admin/catalogue/tiers/${tierId}/delete`, { method: 'POST' });
    onChanged();
  }

  return (
    <div className="pe-block" style={{ borderTop: 'none', paddingTop: 0, marginTop: 0, marginBottom: 28, paddingBottom: 24, borderBottom: '0.5px solid var(--border-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div><strong>{p.name}</strong> <span style={{ color: 'var(--slate-lt)', fontSize: 12.5 }}>· {p.category_name} · KES {p.base_price.toLocaleString()} base · min {p.min_quantity}</span></div>
        <button className="btn btn-outline btn-sm" type="button" onClick={onDeactivate}>{p.active ? 'Deactivate' : 'Inactive'}</button>
      </div>

      <div className="pe-block">
        <h5>Option Groups (e.g. Paper Stock, Finish, Size)</h5>
        {!p.options.length && <p style={{ fontSize: 12, color: 'var(--slate-lt)', marginBottom: 10 }}>No option groups yet.</p>}
        {p.options.map((opt) => (
          <div style={{ marginBottom: 10 }} key={opt.id}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
              {opt.name}{' '}
              <button className="btn btn-outline btn-sm" type="button" style={{ padding: '2px 10px', fontSize: 10.5 }} onClick={() => onDeleteGroup(opt.id)}>Delete Group</button>
            </div>
            <div className="pe-list">
              {opt.values.map((v) => (
                <span className="pe-chip" key={v.id}>
                  {v.label} {v.price_delta ? `${v.price_delta > 0 ? '+' : ''}KES ${v.price_delta.toLocaleString()}` : ''}{v.is_default ? ' · default' : ''}
                </span>
              ))}
            </div>
            <AddOptionValueForm optionId={opt.id} onAdded={onChanged} />
          </div>
        ))}
        <AddOptionGroupForm productId={p.id} onAdded={onChanged} />
      </div>

      <div className="pe-block">
        <h5>Quantity Tiers (volume pricing)</h5>
        {!p.tiers.length && <p style={{ fontSize: 12, color: 'var(--slate-lt)', marginBottom: 10 }}>No volume tiers yet — the base price applies at every quantity.</p>}
        <div className="pe-list">
          {p.tiers.map((t) => (
            <span className="pe-chip" key={t.id}>
              {t.min_qty}{t.max_qty ? `–${t.max_qty}` : '+'} units = KES {t.unit_price.toLocaleString()}{' '}
              <button type="button" onClick={() => onDeleteTier(t.id)}>✕</button>
            </span>
          ))}
        </div>
        <AddTierForm productId={p.id} onAdded={onChanged} />
      </div>
    </div>
  );
}

export default function AdminCatalogue() {
  const [data, setData] = useState(null);

  function load() {
    apiFetch('/api/admin/catalogue').then(setData).catch(() => setData({ categories: [], products: [], providers: [] }));
  }

  useEffect(() => { load(); }, []);

  if (!data) return null;
  const { categories, products, providers } = data;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <AddProductForm categories={categories} onAdded={load} />
        <AddProviderForm categories={categories} onAdded={load} />
      </div>

      <div className="card">
        <h3>Products &amp; Pricing Engine</h3>
        {products.map((p) => <ProductBlock key={p.id} p={p} onChanged={load} />)}
      </div>

      <div className="card">
        <h3>Providers</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Category</th><th>Specialty</th><th>Turnaround</th><th>Location</th><th>Rating</th></tr></thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td><td>{p.category_name || '—'}</td><td>{p.specialty || '—'}</td>
                  <td>{p.turnaround_days} days</td><td>{p.location}</td><td>★ {p.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
