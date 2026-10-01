const express = require('express');
const db = require('../db/db');
const { notify } = require('../lib/mailer');
const { PROJECTS, PROJECT_CATEGORIES, getFeaturedProjects } = require('../data/projects');

// Static testimonials until a reviews/testimonials table exists — swap for
// real client quotes as they come in.
const TESTIMONIALS = [
  { quote: "TrioCraft turned our office from a plain floor into something clients comment on the moment they walk in.", name: 'James Kariuki', role: 'Founder, Savanna Coffee' },
  { quote: "One brief, one invoice, one team to chase — and the stand still looked better than anything else at the summit.", name: 'Grace Wanjiku', role: 'Events Lead, Nairobi Tech Hub' },
  { quote: "We needed 200 polos in under a week. TrioCraft's network delivered on day six.", name: 'David Otieno', role: 'Operations, Urban Threads' },
];

// v6 — Capability Statement content for the /services page. Per-category
// production specs (material standards / finishing options / LPO-invoicing
// behaviour) rather than third-party certifications TrioCraft doesn't hold —
// keeps the enterprise/government/NGO/political framing honest instead of
// implying a compliance credential that isn't real.
const CAPABILITY_SPECS = {
  'graphic-design-creative': {
    materialStandards: 'Print-ready CMYK/Pantone-matched artwork files; vector source retained for future reprints.',
    finishingOptions: 'Matte/gloss lamination on collateral; foil or emboss finishing on premium company profiles.',
    lpoCompliance: 'Deliverables invoiced against approved LPOs with itemised design-hour or per-deliverable line items.',
  },
  'apparel-wearable-branding': {
    materialStandards: '180–320gsm cotton/poly-cotton blends; reflective-grade tape placement on safety wear.',
    finishingOptions: 'Embroidery, screen print, DTF transfer, or heat-seal — chosen per fabric and wash-durability need.',
    lpoCompliance: 'Bulk uniform/apparel orders quoted per size-run and invoiced against LPO with a delivery note attached.',
  },
  'large-format-environmental': {
    materialStandards: '440–510gsm PVC/mesh banners (wind-slit mesh for outdoor exposure), self-adhesive vinyl for walls.',
    finishingOptions: 'Matte or gloss laminate, hemmed/eyeletted banner edges, radius-cut wall graphics.',
    lpoCompliance: 'Site-measured before production; signed-off dimensions and install date logged against the LPO.',
  },
  'vehicle-branding': {
    materialStandards: 'Cast vinyl for full wraps (multi-year outdoor durability), reflective-grade film for safety branding.',
    finishingOptions: 'Full wrap, partial/door-panel branding, or cut-vinyl decals — laminated for UV and abrasion resistance.',
    lpoCompliance: 'Fleet branding scheduled per vehicle and invoiced against a single consolidated LPO across the fleet.',
  },
  'print-marketing-materials': {
    materialStandards: '250–400gsm art/board stock; soft-touch/suede laminate available on premium business cards.',
    finishingOptions: "Spot UV, foil stamping, embossing, die-cutting — matched to the paper stock's weight.",
    lpoCompliance: 'Print runs quoted per quantity tier and invoiced against LPO with a delivered-quantity reconciliation.',
  },
  'promotional-merchandise': {
    materialStandards: 'Food-safe ceramic/stainless steel for drinkware; wipeable soft-touch/PU covers for notebooks.',
    finishingOptions: 'Full-colour wraparound print, laser engraving, or single-logo pad print, per item and quantity.',
    lpoCompliance: 'Corporate gift-set orders itemised per SKU and invoiced against LPO ahead of dispatch.',
  },
  'packaging-branded-bags': {
    materialStandards: '300–400gsm rigid board for boxes; 80–100gsm non-woven polypropylene for tote bags.',
    finishingOptions: 'Foil stamping, spot UV, structural (3D) die-cutting for rigid packaging.',
    lpoCompliance: 'Packaging runs quoted per unit and invoiced against LPO with a sample sign-off before full production.',
  },
  'event-branding-activation': {
    materialStandards: 'Fire-rated fabric for stage backdrops where venue policy requires it; reusable modular exhibition panels.',
    finishingOptions: 'Tension-fabric or PVC backdrop prints, modular booth panelling, branded giveaway kitting.',
    lpoCompliance: "Event-day setup/teardown scheduled against the LPO's activation window with an on-site sign-off.",
  },
  'brand-strategy-consultation': {
    materialStandards: 'Structured positioning/strategy deliverables — workshop output, brand book, or campaign plan document.',
    finishingOptions: 'Delivered as a formal report/deck; political or corporate advisory sessions logged under confidentiality terms.',
    lpoCompliance: 'Engagements scoped and invoiced per session/deliverable, against an agreed statement of work.',
  },
  'project-management-execution': {
    materialStandards: 'Vendor QA/QC checklists and production timelines maintained per engagement (see the vendor Job Card workflow).',
    finishingOptions: 'Dedicated project manager assigned for multi-vendor or multi-site rollouts.',
    lpoCompliance: 'Coordination fee invoiced against the LPO alongside — or independent of — the underlying production line items.',
  },
  'digital-innovation': {
    materialStandards: "Editable source files matched to the client's Brand Vault assets.",
    finishingOptions: 'Social, presentation, and signage template packs; ongoing TrioCraft Interactive portal access.',
    lpoCompliance: 'Digital deliverables invoiced against LPO on hand-off, with usage/licence terms confirmed in writing.',
  },
};

const DIFFERENTIATORS = [
  { title: 'End-to-End Delivery', body: 'From concept to execution, TrioCraft handles the full branding lifecycle.' },
  { title: 'Scalable Production Model', body: 'A curated vendor network enables flexibility, speed, and cost efficiency at any order size.' },
  { title: 'Quality Assurance System', body: 'Every project undergoes strict quality checks before delivery.' },
  { title: 'Fast Turnaround Times', body: 'Optimised workflows ensure timely delivery without compromising quality.' },
  { title: 'Custom-Tailored Solutions', body: 'Each project is scoped and designed to meet specific client objectives.' },
  { title: 'Multi-Sector Experience', body: 'Proven capacity across government institutions, NGOs & development partners, SMEs & corporates, and political campaigns.' },
];

const METHODOLOGY_STEPS = [
  { title: 'Discovery & Briefing', body: 'Understanding client needs, objectives, and target audience.' },
  { title: 'Concept Development', body: 'Creative design and strategy alignment.' },
  { title: 'Design Approval', body: 'Client review and refinement.' },
  { title: 'Production & Execution', body: 'High-quality production through vetted partners.' },
  { title: 'Quality Control', body: 'Inspection and assurance before delivery.' },
  { title: 'Delivery & Support', body: 'On-time delivery and post-project support.' },
];

const QUALITY_POINTS = [
  'Use of premium materials and modern production technologies.',
  'Strict adherence to client specifications.',
  'Transparent pricing and procurement processes.',
  'Commitment to ethical business practices.',
  'Reliable delivery timelines.',
];

const VALUE_PROPS = [
  'Consistency across all branding outputs.',
  'Visibility through high-impact designs.',
  'Efficiency in execution and turnaround.',
  'Scalability for both small and large projects.',
  'Professionalism in handling institutional assignments.',
];

// v7 — a fully-developed, dedicated service page for Division A (Graphic
// Design & Creative), built out beyond the generic capability card.
const GRAPHIC_DESIGN_PAGE = {
  subServices: [
    { icon: '🔤', title: 'Logo & Brand Identity Design', body: 'A logo suite, colour system, and typography rules — the foundation every other design decision builds on.', productSlug: 'logo-brand-identity-design' },
    { icon: '📘', title: 'Brand Guidelines & Company Profile', body: 'A formal usage guide and company profile document — how your brand should look, sound, and behave everywhere.', productSlug: 'company-profile-brand-guidelines' },
    { icon: '🎨', title: 'Custom Illustration & Artwork', body: "Bespoke illustration for packaging, murals, merchandise, or a campaign that needs something no stock asset can give it.", productSlug: 'custom-illustration-artwork' },
    { icon: '📱', title: 'Social Media Content Design', body: 'On-brand templates for posts, stories, and carousels — built once, reused every week.', productSlug: 'social-media-content-pack' },
    { icon: '📦', title: 'Packaging & Label Design', body: 'Structural and print-ready packaging artwork, designed alongside our Packaging & Branded Bags production line.', productSlug: null },
    { icon: '🖨️', title: 'Print Collateral Design', body: "Brochures, business cards, and letterheads designed print-ready — colour-calibrated for exactly how they'll be produced.", productSlug: null },
  ],
  process: [
    { title: 'Discovery Brief', body: 'A short intake on your audience, competitors, and what "on-brand" needs to mean for you.' },
    { title: 'Concept & Moodboard', body: '2–3 distinct creative directions, shown as a moodboard before a single pixel of final artwork is drawn.' },
    { title: 'Design Development', body: 'The chosen direction built out into full artwork — logo lockups, colour system, typography, applied to real examples.' },
    { title: 'Client Revision Round', body: 'Structured feedback, one consolidated revision pass — no endless back-and-forth threads.' },
    { title: 'Final File Handoff', body: 'Every format you need — see Deliverables below — plus a short usage walkthrough.' },
    { title: 'Production Handover', body: "If it's going to print or production, the same team carries it straight into TrioCraft's vetted vendor network." },
  ],
  deliverables: [
    'Vector source files (AI / EPS / SVG) for anything that will ever be resized or reprinted',
    'Print-ready CMYK/Pantone-matched PDFs for anything going straight to a printer',
    'Web-ready PNG/JPG exports at the sizes you actually need (social, web, presentations)',
    'A one-page usage reference — logo clear-space, minimum size, colour codes, do/don\'t examples',
    'A full Brand Guidelines PDF, on the Company Profile & Brand Guidelines engagement',
  ],
  faqs: [
    { q: 'How many revision rounds are included?', a: "One structured revision round is included in every design engagement's base price — feedback is consolidated into a single pass rather than open-ended back-and-forth. Additional rounds can be quoted if needed." },
    { q: 'What file formats do I actually receive?', a: 'Vector source (AI/EPS/SVG), print-ready CMYK PDFs, and web-ready PNG/JPG exports — see Deliverables above. You always get the source files, not just flattened exports.' },
    { q: 'Do you design for packaging, signage, and social media too — not just logos?', a: "Yes — this category covers logo & identity, brand guidelines, illustration, social content, packaging/label artwork, and print collateral design. Anything physical it produces is then handed to TrioCraft's own production lines (Large Format & Environmental, Packaging & Branded Bags, Print & Marketing Materials) rather than a separate vendor." },
    { q: 'How long does a logo or brand identity project take?', a: 'A typical Logo & Brand Identity Design engagement runs 2–3 weeks from discovery brief to final handoff; a full Company Profile & Brand Guidelines document typically adds another 1–2 weeks on top of an existing identity.' },
    { q: "Can this be invoiced against our organisation's LPO?", a: "Yes — like every category, design deliverables are invoiced against an approved LPO with itemised design-hour or per-deliverable line items (see the Capability Statement's LPO / Invoicing notes for this category)." },
  ],
};

module.exports = function (app) {
  const router = express.Router();

  router.get('/api/home', async (req, res) => {
    const categories = await db.all('SELECT * FROM categories ORDER BY sort_order');
    const posts = await db.all('SELECT * FROM blog_posts ORDER BY published_at DESC LIMIT 3');
    const providerCount = (await db.get('SELECT COUNT(*) AS n FROM providers')).n;
    res.json({
      categories, posts, providerCount,
      featuredProjects: getFeaturedProjects(4),
      testimonials: TESTIMONIALS,
    });
  });

  router.get('/api/work', (req, res) => {
    res.json({ projects: PROJECTS, projectCategories: PROJECT_CATEGORIES });
  });

  router.get('/api/services', async (req, res) => {
    // v6 — the Capability Statement: all 11 divisions (A–K) as expandable
    // cards, each carrying its production specs, plus the surrounding
    // company-overview / differentiators / methodology / quality /
    // value-proposition sections from TrioCraft's formal capability statement.
    const rawCategories = await db.all('SELECT * FROM categories ORDER BY sort_order');
    const categories = rawCategories.map((c) => ({ ...c, specs: CAPABILITY_SPECS[c.slug] || null }));
    res.json({ categories, DIFFERENTIATORS, METHODOLOGY_STEPS, QUALITY_POINTS, VALUE_PROPS });
  });

  // v7 — the fully-developed Graphic Design & Creative division page. Sits
  // alongside (not instead of) /services and the marketplace category filter.
  router.get('/api/services/graphic-design-creative', async (req, res) => {
    const category = await db.get('SELECT * FROM categories WHERE slug = ?', ['graphic-design-creative']);
    const slugs = GRAPHIC_DESIGN_PAGE.subServices.map((s) => s.productSlug).filter(Boolean);
    const products = slugs.length
      ? await db.all(`SELECT * FROM products WHERE slug IN (${slugs.map(() => '?').join(',')}) AND active = 1`, slugs)
      : [];
    const productsBySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
    const caseStudy = PROJECTS.find((p) => p.slug === 'finovation-office-rebrand') || null;
    res.json({ category, page: GRAPHIC_DESIGN_PAGE, productsBySlug, caseStudy });
  });

  router.post('/api/contact', async (req, res) => {
    const { name, email, company, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'missing_fields', message: 'Please fill in your name, email, and message.' });
    }
    await db.run('INSERT INTO contact_messages (name, email, company, message) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim(), company || null, message.trim()]);

    await notify({
      subject: `New website enquiry — ${name}${company ? ' (' + company + ')' : ''}`,
      replyTo: email,
      text: `New contact form submission from triocraft.org\n\nName: ${name}\nEmail: ${email}\nCompany: ${company || '—'}\n\nMessage:\n${message}`,
    });

    res.status(201).json({ sent: true });
  });

  app.use('/', router);
};
