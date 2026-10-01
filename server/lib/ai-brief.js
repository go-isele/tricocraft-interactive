// Turns a free-text project description (e.g. "Design a roll-up banner for
// a tech conference in Nairobi with blue accents") into a structured,
// pre-flighted brief a designer/production team can act on immediately:
// suggested category, quantity guess, dimensions if mentioned, colour mode
// reminder, key visual elements, and a placement/production note.
//
// This is NOT a text-to-vector-artwork generator — no code here produces
// actual design files. It structures the *brief*, not the artwork.
//
// With ANTHROPIC_API_KEY set, it calls the real Claude API for a genuinely
// understood structuring pass. Without a key, it degrades to a keyword/regex
// heuristic — cruder, but still real and still useful, so the "AI Assist"
// button never just breaks in a demo/dev environment with no key configured.

const isConfigured = !!process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_BRIEF_MODEL || 'claude-3-5-haiku-20241022';

// v6 — the 11-division capability-statement taxonomy (see db/seed.js).
// Each slug's keyword list doubles as what the heuristic fallback scans for
// AND documents, at a glance, what "this category" actually covers when
// read by a human maintaining this file.
const CATEGORY_KEYWORDS = {
  'graphic-design-creative': ['brand guideline', 'logo', 'identity system', 'company profile', 'packaging design', 'pitch deck', 'presentation design'],
  'apparel-wearable-branding': ['t-shirt', 'tshirt', 'polo', 'hoodie', 'uniform', 'cap', 'leso', 'scarf', 'reflector jacket', 'safety wear'],
  'large-format-environmental': ['banner', 'roll-up', 'roll up', 'rollup', 'flag', 'mesh', 'tent', 'wall branding', 'office branding', 'reception', 'signage', 'exhibition stand'],
  'vehicle-branding': ['vehicle wrap', 'van branding', 'fleet', 'car branding', 'car wrap', 'reflective safety', 'partial wrap', 'door decal'],
  'print-marketing-materials': ['business card', 'flyer', 'brochure', 'catalogue', 'sticker', 'label', 'menu', 'loyalty card'],
  'promotional-merchandise': ['mug', 'pen', 'umbrella', 'diary', 'keyholder', 'wristband', 'gift set', 'merch'],
  'packaging-branded-bags': ['gift bag', 'tote bag', 'non-woven bag', 'gift box', 'product box', '3d packaging'],
  'event-branding-activation': ['conference', 'exhibition', 'backdrop', 'stage', 'launch event', 'product launch', 'expo', 'activation', 'booth', 'giveaway'],
  'brand-strategy-consultation': ['positioning', 'reposition', 'rebrand', 'rebranding', 'campaign strategy', 'brand strategy', 'advisory', 'advisor', 'political client', 'identity refresh'],
  'project-management-execution': ['vendor sourcing', 'project manager', 'project management', 'quality assurance', 'qa/qc', 'production supervision', 'multi-site', 'multiple vendors', 'coordinate'],
  'digital-innovation': ['client portal', 'real-time tracking', 'ai-assisted', 'digital template', 'digital asset'],
};

// v6 — category-specific follow-up prompts appended to placementNotes once
// a category is identified (heuristic OR AI path — see the shared
// enrichPlacementNotes() step below), covering the extra context the
// capability statement calls out: campaign advisory scope, vehicle wrap
// specs, and event activation timelines.
const CATEGORY_FOLLOW_UPS = {
  'brand-strategy-consultation': 'Brand Strategy & Consultation brief — confirm campaign objectives, target audience, and whether this is a full rebrand/identity refresh or a positioning refresh; flag if political or corporate advisory sensitivities apply.',
  'vehicle-branding': 'Vehicle Branding brief — confirm vehicle make/model or fleet size, full wrap vs. partial/door-panel branding, and whether reflective/safety-grade vinyl is required.',
  'event-branding-activation': 'Event Branding & Activation brief — confirm the event date and setup/teardown window, venue dimensions if known, and which activation elements (backdrop, booth, giveaways) are in scope.',
  'project-management-execution': 'Project Management brief — confirm number of sites/vendors involved and whether TrioCraft is coordinating third-party production partners already engaged by the client.',
  'digital-innovation': 'Digital & Innovation brief — confirm which digital assets/templates are needed and whether ongoing TrioCraft Interactive portal access is expected.',
};

const COLOR_WORDS = ['blue', 'red', 'green', 'yellow', 'black', 'white', 'gold', 'orange', 'purple', 'pink', 'maroon', 'navy', 'teal', 'rust', 'brown'];

const DIMENSION_PATTERN = /(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*(cm|mm|m|in|ft)?/i;

function heuristicStructure(rawText) {
  const text = (rawText || '').toLowerCase();

  // v6 — score every category by how many of its keywords appear (rather
  // than stopping at the first category with any match at all) since a
  // handful of terms legitimately overlap across categories (e.g. "office
  // branding" vs. a brief that's really about coordinating that rollout,
  // not the branding itself). Highest score wins; ties go to whichever
  // category is declared first.
  let category = null;
  let bestScore = 0;
  for (const [slug, words] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; category = slug; }
  }

  const dimMatch = DIMENSION_PATTERN.exec(text);
  const dimensions = dimMatch ? `${dimMatch[1]}×${dimMatch[2]}${dimMatch[3] ? dimMatch[3] : 'cm'}` : null;

  const qtyMatch = /(\d{1,6})\s*(units?|pieces?|pcs|copies|shirts?|mugs?|banners?)/i.exec(text);
  const quantityGuess = qtyMatch ? Number(qtyMatch[1]) : null;

  const colors = COLOR_WORDS.filter((c) => text.includes(c));

  const locationMatch = /\b(nairobi|mombasa|kisumu|nakuru|eldoret|kampala|dar es salaam|kigali)\b/i.exec(text);

  const placementNotes = [
    dimensions ? `Sized at approximately ${dimensions} based on the brief text — confirm exact trim size before pre-press.` : 'No explicit size mentioned — confirm final dimensions with the client before production.',
    colors.length ? `Colour cues mentioned: ${colors.join(', ')}.` : null,
    locationMatch ? `Location context: ${locationMatch[0]}.` : null,
  ].filter(Boolean);

  return {
    method: 'heuristic',
    suggestedCategorySlug: category,
    quantityGuess,
    dimensions,
    colorMode: 'Confirm CMYK for print — this brief text alone can\'t determine colour mode.',
    keyElements: colors,
    placementNotes: enrichPlacementNotes(placementNotes, category),
    bleedReminder: 'Reminder: include a minimum 3mm bleed and keep key text/logos inside a 3mm safe margin from the trim edge.',
  };
}

// v6 — shared by both the heuristic and AI paths so a category-specific
// follow-up prompt (campaign advisory scope, vehicle wrap specs, event
// activation timeline, etc.) always gets appended once a category is
// identified, regardless of which structuring method found it.
function enrichPlacementNotes(notes, categorySlug) {
  const followUp = categorySlug && CATEGORY_FOLLOW_UPS[categorySlug];
  return followUp ? [...notes, followUp] : notes;
}

/**
 * @param {string} rawText - the client's free-text project description
 * @returns {Promise<{method:string, suggestedCategorySlug:string|null, quantityGuess:number|null, dimensions:string|null, colorMode:string, keyElements:string[], placementNotes:string[], bleedReminder:string}>}
 */
async function structureBrief(rawText) {
  if (!rawText || !rawText.trim()) return heuristicStructure(rawText);

  if (!isConfigured) return heuristicStructure(rawText);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: `Structure this branding/print/campaign project brief for a full-service branding agency's production team (TrioCraft Brands Ltd — services span graphic design, apparel & wearable branding, large format & environmental branding, vehicle branding, print & marketing materials, promotional merchandise, packaging, event branding & activation, brand strategy & consultation, project management, and digital/portal services). Brief: "${rawText}"` }],
        tools: [{
          name: 'structured_brief',
          description: 'Return a structured production brief extracted from the client\'s free-text description.',
          input_schema: {
            type: 'object',
            properties: {
              suggestedCategorySlug: { type: ['string', 'null'], enum: [...Object.keys(CATEGORY_KEYWORDS), null] },
              quantityGuess: { type: ['number', 'null'] },
              dimensions: { type: ['string', 'null'], description: 'e.g. "85x200cm" if a size is implied or stated' },
              colorMode: { type: 'string', description: 'A short note on likely colour mode / matching needs' },
              keyElements: { type: 'array', items: { type: 'string' }, description: 'Colours, motifs, or brand elements mentioned' },
              placementNotes: { type: 'array', items: { type: 'string' }, description: 'Short notes for the design/production team' },
            },
            required: ['colorMode', 'keyElements', 'placementNotes'],
          },
        }],
        tool_choice: { type: 'tool', name: 'structured_brief' },
      }),
    });

    if (!res.ok) {
      console.error(`[ai-brief] Anthropic API returned ${res.status} — falling back to heuristic structuring.`);
      return heuristicStructure(rawText);
    }
    const data = await res.json();
    const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
    if (!toolUse) return heuristicStructure(rawText);

    return {
      method: 'ai',
      suggestedCategorySlug: toolUse.input.suggestedCategorySlug || null,
      quantityGuess: toolUse.input.quantityGuess || null,
      dimensions: toolUse.input.dimensions || null,
      colorMode: toolUse.input.colorMode,
      keyElements: toolUse.input.keyElements || [],
      placementNotes: enrichPlacementNotes(toolUse.input.placementNotes || [], toolUse.input.suggestedCategorySlug),
      bleedReminder: 'Reminder: include a minimum 3mm bleed and keep key text/logos inside a 3mm safe margin from the trim edge.',
    };
  } catch (err) {
    console.error('[ai-brief] Structuring call failed, falling back to heuristic:', err.message);
    return heuristicStructure(rawText);
  }
}

module.exports = { structureBrief, isConfigured };
