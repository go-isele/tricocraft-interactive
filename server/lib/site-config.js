// Real TrioCraft contact details, pulled from the company's own invoice/
// quotation letterhead so the public site matches what's already on file.
// Centralised here so header, footer, contact page, and the WhatsApp float
// all stay in sync — change once, updates everywhere.

// v7 — client confirmed +254 111 206 420 replaces BOTH capability-statement
// lines (+254 712 157 358 / +254 716 795 777) as the single sitewide number,
// and is also used for WhatsApp (no separate number was specified).
const whatsappNumber = process.env.WHATSAPP_NUMBER || '254111206420';

module.exports = {
  phoneDisplay: '+254 111 206 420',
  phonePrimaryTel: '+254111206420', // for tel: links
  email: 'triocraft.brands@gmail.com',
  address: 'Emperor Plaza, Koinange Street, Nairobi, Kenya',
  hours: 'Mon–Fri, 8:30am–5:30pm EAT · Sat, 9am–1pm EAT',
  whatsappNumber,
  whatsappLink: `https://wa.me/${whatsappNumber}`,
  tagline: 'Crafting Dreams, Forged in Brotherhood.',
  mapsEmbedSrc: 'https://www.google.com/maps?q=Emperor+Plaza+Koinange+Street+Nairobi&output=embed',
  // v7 — social handles, added at the client's request (same handle across
  // all three platforms).
  social: {
    instagram: 'https://instagram.com/triocraft.brands',
    facebook: 'https://facebook.com/triocraft.brands',
    tiktok: 'https://tiktok.com/@triocraft.brands',
  },
  // v5 — real brand mark supplied by the client (public/img/triocraft-icon.svg
  // + .png). Orange is sampled directly from that file (#ED5B00), not the
  // approximate #E05A47 originally floated — an explicit call on this. Navy
  // is the client's stated brand navy, used for header/PDF accents only — it
  // does NOT replace the existing --ink/--rust design tokens already tuned
  // across the rest of the UI, to avoid an unrequested full recolor.
  brand: {
    navy: '#002B49',
    orange: '#ED5B00',
    iconSvg: '/static/img/triocraft-icon.svg',
    iconPng: '/static/img/triocraft-icon.png', // transparent PNG — pdfkit can't embed SVG
  },
};
