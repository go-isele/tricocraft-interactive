'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function CurrencySwitcher() {
  const [currencies, setCurrencies] = useState([]);
  const [currency, setCurrency] = useState('KES');

  useEffect(() => {
    apiFetch('/api/site-config')
      .then((data) => {
        setCurrencies(data.supportedCurrencies || []);
        setCurrency(data.currency || 'KES');
      })
      .catch(() => {});
  }, []);

  async function onChange(e) {
    const code = e.target.value;
    setCurrency(code);
    try {
      await apiFetch('/api/marketplace/currency', {
        method: 'POST',
        body: JSON.stringify({ currency: code }),
      });
    } catch {
      // non-critical — worst case the display currency doesn't switch
    }
    // Currency affects prices shown throughout the marketplace; a full
    // refresh is the simplest way to make every already-rendered price
    // (server + client components) reflect the new session currency.
    window.location.reload();
  }

  if (!currencies.length) return null;

  return (
    <div className="currency-switcher">
      <select value={currency} onChange={onChange} aria-label="Display currency">
        {currencies.map((c) => (
          <option key={c.code} value={c.code}>{c.code}</option>
        ))}
      </select>
    </div>
  );
}
