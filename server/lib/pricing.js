// Variable matrix pricing for print products: quantity tiers (volume
// discounting) composed with option-value deltas (paper stock, finish,
// size, etc). This is the engine behind the product configurator on
// views/marketplace/product.ejs and the price shown in the cart.

const db = require('../db/db');

/** All configurable options + volume tiers for a product, in display order. */
async function getProductPricing(productId) {
  const rawOptions = await db.all(
    'SELECT * FROM product_options WHERE product_id = ? ORDER BY sort_order, id',
    [productId]
  );
  const options = await Promise.all(rawOptions.map(async (opt) => ({
    ...opt,
    values: await db.all(
      'SELECT * FROM product_option_values WHERE option_id = ? ORDER BY sort_order, id',
      [opt.id]
    ),
  })));

  const tiers = await db.all(
    'SELECT * FROM product_quantity_tiers WHERE product_id = ? ORDER BY min_qty',
    [productId]
  );

  return { options, tiers };
}

/** The volume-tier unit price that applies at this quantity, or the product's base price if none matches. */
function tierUnitPrice(tiers, basePrice, quantity) {
  const matches = tiers.filter((t) => quantity >= t.min_qty && (t.max_qty == null || quantity <= t.max_qty));
  if (!matches.length) return basePrice;
  // Prefer the tier with the highest min_qty that still qualifies (most specific/best discount).
  return matches.sort((a, b) => b.min_qty - a.min_qty)[0].unit_price;
}

/**
 * Resolves a set of submitted option-value IDs against the DB (so a client
 * can't forge a price by posting an arbitrary delta) and computes the final
 * per-unit and line price.
 *
 * @param {number} productId
 * @param {number} quantity
 * @param {number[]} optionValueIds - one chosen value ID per option group (missing groups fall back to their default value)
 * @returns {Promise<{ unitPrice: number, lineTotal: number, selections: Array<{optionName:string, valueLabel:string, priceDelta:number}>, tierApplied: boolean }>}
 */
async function computeOrderPricing(productId, quantity, optionValueIds = []) {
  const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
  if (!product) throw new Error('Unknown product');

  const { options, tiers } = await getProductPricing(productId);
  const qty = Math.max(1, Number(quantity) || 1);
  const wantedIds = new Set((optionValueIds || []).map(Number));

  const selections = [];
  for (const opt of options) {
    let chosen = opt.values.find((v) => wantedIds.has(v.id));
    if (!chosen) chosen = opt.values.find((v) => v.is_default) || opt.values[0];
    if (chosen) selections.push({ optionName: opt.name, valueLabel: chosen.label, priceDelta: chosen.price_delta });
  }

  const baseTierPrice = tierUnitPrice(tiers, product.base_price, qty);
  const deltaTotal = selections.reduce((sum, s) => sum + (s.priceDelta || 0), 0);
  const unitPrice = baseTierPrice + deltaTotal;

  return {
    unitPrice,
    lineTotal: unitPrice * qty,
    selections,
    tierApplied: baseTierPrice !== product.base_price,
  };
}

module.exports = { getProductPricing, tierUnitPrice, computeOrderPricing };
