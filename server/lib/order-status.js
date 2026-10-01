// Centralized print-shop order lifecycle — previously copy-pasted
// identically across routes/marketplace.js, routes/admin.js, and
// routes/vendor.js. See db/schema.sql's CHECK constraint on orders.status
// for the authoritative list of allowed values.

const STATUS_LABELS = {
  new: 'New Inquiry',
  quotation: 'Quotation Sent',
  approved: 'Quotation Approved',
  prepress: 'Pre-Press Review',
  prepress_approved: 'Pre-Press Approved',
  in_production: 'In Production',
  quality_check: 'Quality Check',
  ready_for_dispatch: 'Ready for Dispatch',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_PROGRESS = {
  new: 5,
  quotation: 12,
  approved: 20,
  prepress: 30,
  prepress_approved: 42,
  in_production: 60,
  quality_check: 78,
  ready_for_dispatch: 88,
  out_for_delivery: 95,
  completed: 100,
  cancelled: 0,
};

// A production partner (vendor) may only push a job forward through this
// fixed sequence — the segment of the lifecycle that actually happens on
// their floor. Everything before `prepress` (quoting/approval) is handled
// by TrioCraft admin; `out_for_delivery` → `completed` is confirmed once
// the courier/rider reports the parcel delivered.
const NEXT_STATUS = {
  prepress: 'prepress_approved',
  prepress_approved: 'in_production',
  in_production: 'quality_check',
  quality_check: 'ready_for_dispatch',
  ready_for_dispatch: 'out_for_delivery',
};

// v5 — production job cards: a short real-world checklist for the stage the
// vendor is currently completing, shown alongside the "Advance" action.
// Purely a documentation/accountability aid (nothing blocks advancing if a
// box is left unchecked) — whatever the vendor ticks gets folded into the
// timeline note automatically.
const JOB_CARD_CHECKLISTS = {
  prepress: {
    title: 'Pre-Press Checklist',
    items: [
      'Artwork resolution & DPI confirmed print-ready',
      'Bleed (3mm) & safe margin confirmed',
      'Colour mode (CMYK) verified',
      'Client sign-off on file received',
    ],
  },
  prepress_approved: {
    title: 'CMYK Colour Proofing',
    items: [
      'Proof pulled and compared to brand/Pantone reference',
      'Colour density within tolerance',
      'No visible registration or banding issues',
    ],
  },
  in_production: {
    title: 'Substrate Inspection',
    items: [
      'Substrate/material matches job spec',
      'No visible defects on sample run (tears, warping, discolouration)',
      'Produced quantity on track to match order',
    ],
  },
  quality_check: {
    title: 'Final Quality Check',
    items: [
      'Finished items match the approved proof',
      'Spot-check count matches order quantity',
      'No damage or defects found',
    ],
  },
  ready_for_dispatch: {
    title: 'Packaging & Dispatch',
    items: [
      'Items packaged to prevent transit damage',
      'Delivery address/partner confirmed',
      'Handed to courier/rider with tracking noted',
    ],
  },
};

// v6 — resolves an order's Service Category (A–K) for invoice line-item
// tagging and job-card display: a catalogue-product order derives it from
// products.category_id; a product-less Custom Brief order carries its own
// orders.category_id instead.
function resolveOrderCategory(db, order) {
  if (order.product_id) {
    return db.prepare(
      `SELECT c.name, c.slug, c.service_code FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?`
    ).get(order.product_id) || null;
  }
  if (order.category_id) {
    return db.prepare('SELECT name, slug, service_code FROM categories WHERE id = ?').get(order.category_id) || null;
  }
  return null;
}

function addTimeline(db, orderId, stage, notes) {
  db.prepare('INSERT INTO order_timeline (order_id, stage, notes) VALUES (?, ?, ?)').run(orderId, stage, notes || null);
}

module.exports = {
  STATUS_LABELS,
  STATUS_PROGRESS,
  NEXT_STATUS,
  JOB_CARD_CHECKLISTS,
  resolveOrderCategory,
  addTimeline,
};
