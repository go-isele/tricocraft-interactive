// M-Pesa Daraja 2.0 — STK Push ("Lipa Na M-Pesa Online").
//
// Like lib/mailer.js, this degrades gracefully with zero setup: without
// MPESA_CONSUMER_KEY/SECRET/SHORTCODE/PASSKEY in .env, initiateSTKPush()
// returns a clearly-labelled simulated response instead of throwing, so the
// checkout flow is fully clickable in dev/demo without Safaricom credentials.
// Add real Daraja credentials (sandbox or production) and it starts making
// real API calls — no code changes needed.
//
// IMPORTANT: MPESA_CALLBACK_URL must be a publicly reachable HTTPS URL
// (Safaricom cannot call back to localhost) — use ngrok or your deployed
// domain. Get sandbox credentials at https://developer.safaricom.co.ke.

const isConfigured = !!(
  process.env.MPESA_CONSUMER_KEY &&
  process.env.MPESA_CONSUMER_SECRET &&
  process.env.MPESA_SHORTCODE &&
  process.env.MPESA_PASSKEY
);

const BASE_URL = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

function timestampNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function stkPassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

/** Normalises a Kenyan phone number to Daraja's expected 2547XXXXXXXX / 2541XXXXXXXX format. */
function normalizeMsisdn(raw) {
  let n = String(raw || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '254' + n.slice(1);
  if (n.startsWith('7') || n.startsWith('1')) n = '254' + n;
  if (n.startsWith('+254')) n = n.slice(1);
  return n;
}

async function getAccessToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Daraja OAuth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

/**
 * Initiates an STK Push prompt on the client's phone.
 * @param {{ phone: string, amount: number, accountRef: string, description: string }} params
 * @returns {Promise<{ success: boolean, simulated?: boolean, checkoutRequestId?: string, merchantRequestId?: string, reason?: string, raw?: object }>}
 */
async function initiateSTKPush({ phone, amount, accountRef, description }) {
  const msisdn = normalizeMsisdn(phone);
  const roundedAmount = Math.max(1, Math.round(amount));

  if (!isConfigured) {
    console.log('\n[mpesa] Daraja not configured — simulating STK Push:');
    console.log(`  Phone:    ${msisdn}`);
    console.log(`  Amount:   KES ${roundedAmount}`);
    console.log(`  Account:  ${accountRef}`);
    console.log('[mpesa] Set MPESA_CONSUMER_KEY / SECRET / SHORTCODE / PASSKEY in .env for real STK pushes.\n');
    return {
      success: true,
      simulated: true,
      checkoutRequestId: `SIM-${Date.now()}`,
      merchantRequestId: `SIM-MR-${Date.now()}`,
    };
  }

  try {
    const token = await getAccessToken();
    const timestamp = timestampNow();
    const shortcode = process.env.MPESA_SHORTCODE;
    const password = stkPassword(shortcode, process.env.MPESA_PASSKEY, timestamp);

    const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: roundedAmount,
        PartyA: msisdn,
        PartyB: shortcode,
        PhoneNumber: msisdn,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: accountRef.slice(0, 12),
        TransactionDesc: description.slice(0, 13),
      }),
    });
    const data = await res.json();
    if (!res.ok || data.ResponseCode !== '0') {
      return { success: false, reason: data.errorMessage || data.ResponseDescription || 'STK push rejected', raw: data };
    }
    return {
      success: true,
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      raw: data,
    };
  } catch (err) {
    console.error('[mpesa] STK push failed:', err.message);
    return { success: false, reason: err.message };
  }
}

module.exports = { initiateSTKPush, normalizeMsisdn, isConfigured };
