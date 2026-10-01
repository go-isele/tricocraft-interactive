// Local + cross-border delivery/logistics options shown at checkout and on
// the custom brief form. `cross_border_eac` triggers the extra destination
// country / weight fields in cart-body.ejs / custom-brief-form.ejs and an
// estimated cost from lib/cross-border.js.

const { CROSS_BORDER_PARTNERS } = require('./cross-border');

const DELIVERY_METHODS = [
  { value: 'pickup', label: 'Pickup at Emperor Plaza, Koinange Street', partners: ['Self Pickup'] },
  { value: 'nairobi_rider', label: 'Nairobi Metro — Rider/Boda Dispatch', partners: ['In-house Rider', 'Sendy', 'Farasi'] },
  { value: 'upcountry_courier', label: 'Upcountry — Parcel Bus / Courier', partners: ['EASY COACH', 'Fargo Courier', 'SpeedAF', 'G4S'] },
  { value: 'cross_border_eac', label: 'Cross-Border — Uganda, Tanzania, or Rwanda', partners: CROSS_BORDER_PARTNERS },
];

module.exports = { DELIVERY_METHODS };
