'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

function parseNotes(raw) {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

export default function BrandVault() {
  const [assets, setAssets] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [addingColor, setAddingColor] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    apiFetch('/api/marketplace/brand-vault').then((d) => setAssets(d.assets)).catch(() => setAssets([]));
  }

  useEffect(() => { load(); }, []);

  async function onUpload(e) {
    e.preventDefault();
    setError(null);
    const form = e.target;
    const file = form.file.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('asset_type', form.asset_type.value);
    fd.append('label', form.label.value);
    fd.append('file', file);
    try {
      await apiFetch('/api/marketplace/brand-vault/upload', { method: 'POST', body: fd });
      form.reset();
      load();
    } catch (err) {
      setError(err.body?.message || err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function onAddColor(e) {
    e.preventDefault();
    setError(null);
    const form = e.target;
    setAddingColor(true);
    try {
      await apiFetch('/api/marketplace/brand-vault/color', {
        method: 'POST',
        body: JSON.stringify({ label: form.label.value, hex: form.hex.value }),
      });
      form.reset();
      load();
    } catch (err) {
      setError(err.body?.message || err.message || 'Could not add colour.');
    } finally {
      setAddingColor(false);
    }
  }

  async function onDelete(id) {
    if (!confirm('Remove this asset?')) return;
    await apiFetch(`/api/marketplace/brand-vault/${id}`, { method: 'DELETE' });
    load();
  }

  if (!assets) return null;

  return (
    <>
      {error && <div className="form-error">{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <h3>Upload a File</h3>
          <form onSubmit={onUpload}>
            <div className="field">
              <label>Asset Type</label>
              <select name="asset_type" defaultValue="logo">
                <option value="logo">Logo</option>
                <option value="guideline">Brand Guideline</option>
                <option value="font">Font</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field"><label>Label</label><input type="text" name="label" placeholder="e.g. Primary Logo — Full Colour" /></div>
            <div className="field"><label>File</label><input type="file" name="file" required /></div>
            <button className="btn btn-primary btn-block" type="submit" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</button>
          </form>
          <p style={{ fontSize: 11.5, color: 'var(--slate-lt)', marginTop: 10 }}>Every upload runs a quick pre-press check automatically: resolution, likely colour space (RGB vs print-ready CMYK/vector), and a bleed reminder — flagged below each file.</p>
        </div>

        <div className="card">
          <h3>Add a Brand Colour</h3>
          <form onSubmit={onAddColor}>
            <div className="field"><label>Label</label><input type="text" name="label" placeholder="e.g. Primary Rust" /></div>
            <div className="field"><label>Hex Code</label><input type="text" name="hex" placeholder="#C4451A" pattern="^#?[0-9A-Fa-f]{6}$" required /></div>
            <button className="btn btn-dark btn-block" type="submit" disabled={addingColor}>{addingColor ? 'Adding…' : 'Add Colour'}</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h3>Vault Contents</h3>
        {!assets.length ? (
          <div className="empty-state"><div className="ico">◉</div><p>Nothing uploaded yet — add your logo and brand colours to get started.</p></div>
        ) : (
          <div className="vault-grid">
            {assets.map((a) => {
              const notes = parseNotes(a.preflight_notes);
              return (
                <div className="vault-tile" key={a.id}>
                  <button type="button" title="Remove" onClick={() => onDelete(a.id)}>✕</button>
                  {a.asset_type === 'color_palette' ? (
                    <div className="swatch" style={{ background: a.value }} />
                  ) : (
                    <div className="swatch" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--canvas)' }}>📎</div>
                  )}
                  <div className="name">{a.label}</div>
                  <div className="type">{a.asset_type.replace('_', ' ')} {a.verified ? '· ✓ verified' : ''}</div>
                  {a.likely_color_space && (
                    <div className="preflight-box">
                      <div className="dims">{a.likely_color_space}{a.width_px ? ` · ${a.width_px}×${a.height_px}px` : ''}</div>
                      {notes.length > 0 && (
                        <ul>
                          {notes.map((n, i) => (
                            <li key={i} className={/RGB/.test(n) ? 'warn-rgb' : (/resolution|DPI|low-resolution/.test(n) ? 'warn-res' : '')}>{n}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
