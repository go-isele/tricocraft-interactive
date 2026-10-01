// Cross-border mobile money — MTN Mobile Money (Uganda) and Airtel Money
// (Tanzania/Rwanda). Same graceful-degradation contract as lib/mpesa.js:
// without real API credentials, each initiate function logs a clearly
// simulated push to the console and returns a success-shaped response, so
// the regional checkout flow is fully clickable/testable before you have
// live MTN/Airtel developer access. Add real credentials to .env and these
// start calling the real sandbox/production APIs — no code changes needed.
//
// MTN MoMo: https://momodeveloper.mtn.com (Collections product — Uganda).
// Airtel Money: https://developers.airtel.africa (Collection API — Tanzania & Rwanda).
// Both providers issue per-market API keys; a single set of credentials
// does not cover every country, so confirm which markets your subscription
// includes before flipping this to live.

const momoConfigured = !!(process.env.MOMO_SUBSCRIPTION_KEY && process.env.MOMO_API_USER && process.env.MOMO_API_KEY);
const airtelConfigured = !!(process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET);

const MOMO_BASE_URL = process.env.MOMO_ENV === 'production'
  ? 'https://proxy.momoapi.mtn.com'
  : 'https://sandbox.momodeveloper.mtn.com';

const AIRTEL_BASE_URL = process.env.AIRTEL_ENV === 'production'
  ? 'https://openapi.airtel.africa'
  : 'https://openapiuat.airtel.africa';

/**
 * MTN Mobile Money — request-to-pay (Uganda).
 * @param {{ phone: string, amount: number, currency: string, reference: string, description: string }} params
 */
async function initiateMtnMomo({ phone, amount, currency = 'UGX', reference, description }) {
  if (!momoConfigured) {
    console.log('\n[momo] MTN MoMo not configured — simulating Request-to-Pay:');
    console.log(`  Phone:     ${phone}`);
    console.log(`  Amount:    ${currency} ${Math.round(amount)}`);
    console.log(`  Reference: ${reference}`);
    console.log('[momo] Set MOMO_SUBSCRIPTION_KEY / MOMO_API_USER / MOMO_API_KEY in .env for real MTN MoMo pushes.\n');
    return { success: true, simulated: true, referenceId: `SIM-MOMO-${Date.now()}` };
  }
  try {
    const referenceId = crypto_randomUUID();
    const token = await momoAccessToken();
    const res = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': process.env.MOMO_ENV === 'production' ? 'mtnuganda' : 'sandbox',
        'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(Math.round(amount)),
        currency,
        externalId: reference,
        payer: { partyIdType: 'MSISDN', partyId: phone.replace(/\D/g, '') },
        payerMessage: description,
        payeeNote: description,
      }),
    });
    if (!res.ok && res.status !== 202) {
      const errText = await res.text().catch(() => '');
      return { success: false, reason: `MoMo request-to-pay rejected (${res.status}): ${errText}` };
    }
    return { success: true, referenceId };
  } catch (err) {
    console.error('[momo] Request-to-pay failed:', err.message);
    return { success: false, reason: err.message };
  }
}

async function momoAccessToken() {
  const auth = Buffer.from(`${process.env.MOMO_API_USER}:${process.env.MOMO_API_KEY}`).toString('base64');
  const res = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY },
  });
  if (!res.ok) throw new Error(`MoMo OAuth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

/**
 * Airtel Money — collection request (Tanzania / Rwanda).
 * @param {{ phone: string, amount: number, currency: string, reference: string, country: 'TZ'|'RW' }} params
 */
async function initiateAirtelMoney({ phone, amount, currency = 'TZS', reference, country = 'TZ' }) {
  if (!airtelConfigured) {
    console.log('\n[airtel-money] Airtel Money not configured — simulating collection request:');
    console.log(`  Phone:     ${phone}`);
    console.log(`  Amount:    ${currency} ${Math.round(amount)}`);
    console.log(`  Country:   ${country}`);
    console.log(`  Reference: ${reference}`);
    console.log('[airtel-money] Set AIRTEL_CLIENT_ID / AIRTEL_CLIENT_SECRET in .env for real Airtel Money pushes.\n');
    return { success: true, simulated: true, transactionId: `SIM-AIRTEL-${Date.now()}` };
  }
  try {
    const token = await airtelAccessToken();
    const res = await fetch(`${AIRTEL_BASE_URL}/merchant/v1/payments/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Country': country,
        'X-Currency': currency,
      },
      body: JSON.stringify({
        reference,
        subscriber: { country, currency, msisdn: phone.replace(/\D/g, '') },
        transaction: { amount: Math.round(amount), country, currency, id: reference },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, reason: data?.status?.message || `Airtel Money rejected (${res.status})` };
    return { success: true, transactionId: data?.data?.transaction?.id || reference };
  } catch (err) {
    console.error('[airtel-money] Collection request failed:', err.message);
    return { success: false, reason: err.message };
  }
}

async function airtelAccessToken() {
  const res = await fetch(`${AIRTEL_BASE_URL}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AIRTEL_CLIENT_ID,
      client_secret: process.env.AIRTEL_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Airtel OAuth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

function crypto_randomUUID() {
  // Node 18+ has crypto.randomUUID globally available; wrapped here so a
  // missing global (very old Node) degrades to a timestamp-based fallback
  // instead of throwing.
  try { return require('crypto').randomUUID(); } catch (e) { return `uuid-${Date.now()}-${Math.floor(Math.random() * 1e6)}`; }
}

module.exports = { initiateMtnMomo, initiateAirtelMoney, momoConfigured, airtelConfigured };
