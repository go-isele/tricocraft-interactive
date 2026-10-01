// Cross-border Intra-EAC delivery — country list + an illustrative parcel
// cost calculator for orders shipping outside Kenya. This is a rate-card
// estimate, not a live courier-API quote: no single EAC-wide courier
// rate API exists to call here, so `CROSS_BORDER_RATE_CARD` below is a
// starting reference table your logistics team should confirm/update
// against your actual courier contracts (DHL, G4S Regional, Fargo
// Cross-Border, etc.) before relying on it commercially.

const EAC_COUNTRIES = [
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'UG', name: 'Uganda', currency: 'UGX' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF' },
];

const CROSS_BORDER_PARTNERS = ['DHL Express', 'G4S Regional', 'Fargo Cross-Border'];

// KES cost by destination country + weight tier (kg). Parcel/courier rates
// vary constantly by weight, volume, and route — treat these as a rough
// planning estimate shown to the client, not a binding quote.
const CROSS_BORDER_RATE_CARD = {
  UG: [{ maxKg: 2, kes: 2800 }, { maxKg: 5, kes: 4200 }, { maxKg: 10, kes: 6800 }, { maxKg: Infinity, kes: 9500 }],
  TZ: [{ maxKg: 2, kes: 3200 }, { maxKg: 5, kes: 4800 }, { maxKg: 10, kes: 7600 }, { maxKg: Infinity, kes: 10800 }],
  RW: [{ maxKg: 2, kes: 3600 }, { maxKg: 5, kes: 5400 }, { maxKg: 10, kes: 8600 }, { maxKg: Infinity, kes: 12200 }],
};

/** @returns {{ costKes: number, tier: string } | null} null if destination is Kenya or unrecognised. */
function estimateCrossBorderCost(destCountryCode, weightKg) {
  const card = CROSS_BORDER_RATE_CARD[destCountryCode];
  if (!card) return null;
  const w = Math.max(0.1, Number(weightKg) || 1);
  const match = card.find((tier) => w <= tier.maxKg) || card[card.length - 1];
  return { costKes: match.kes, tier: `up to ${match.maxKg === Infinity ? '10kg+' : match.maxKg + 'kg'}` };
}

module.exports = { EAC_COUNTRIES, CROSS_BORDER_PARTNERS, estimateCrossBorderCost };
