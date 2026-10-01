'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function CatalogueGrid({ activeCat: initialActiveCat }) {
  const [data, setData] = useState(null);
  const [activeCat, setActiveCat] = useState(initialActiveCat || null);

  useEffect(() => {
    const qs = activeCat ? `?category=${encodeURIComponent(activeCat)}` : '';
    apiFetch(`/api/marketplace/products${qs}`).then(setData).catch(() => setData({ categories: [], products: [] }));
  }, [activeCat]);

  if (!data) return null;
  const { categories, products } = data;

  return (
    <>
      <div className="cat-filter">
        <a href="/marketplace" className={!activeCat ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveCat(null); window.history.pushState({}, '', '/marketplace'); }}>All</a>
        {categories.map((c) => (
          <a
            key={c.slug}
            href={`/marketplace?category=${c.slug}`}
            className={activeCat === c.slug ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); setActiveCat(c.slug); window.history.pushState({}, '', `/marketplace?category=${c.slug}`); }}
          >
            {c.icon} {c.name}
          </a>
        ))}
      </div>

      {!products.length ? (
        <div className="empty-state"><div className="ico">⊞</div><p>No products in this category yet.</p></div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <Link className="product-card" href={`/marketplace/product/${p.slug}`} key={p.slug}>
              <div className="thumb">
                {p.image ? <img src={p.image} alt={p.name} /> : ((categories.find((c) => c.id === p.category_id) || {}).icon || '▢')}
              </div>
              <div className="body">
                <div className="cat">{p.category_name}</div>
                <h4>{p.name}</h4>
                <div className="price">KES {Number(p.base_price).toLocaleString()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
