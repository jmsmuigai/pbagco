// Payments. All money lands in PBAG's single central account (per the brief);
// producer/seller payouts are settled on a schedule from the dashboard figures.
//
// PAYMENTS_MODE=mock     -> every method auto-confirms after a few seconds (demo/dev)
// PAYMENTS_MODE=sandbox  -> M-Pesa Daraja sandbox
// PAYMENTS_MODE=live     -> M-Pesa Daraja production (needs shortcode/passkey secrets)
// Card & PayPal: enabled when PESAPAL_* / PAYPAL_* secrets are present; otherwise
// they are shown as "coming soon" (mock mode simulates them for demos).

const MODE = process.env.PAYMENTS_MODE || 'mock';
const DARAJA = MODE === 'live' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

export function methods() {
  return {
    mode: MODE,
    mpesa: MODE === 'mock' || !!process.env.MPESA_CONSUMER_KEY, // STK prompt needs Daraja credentials
    card: !!process.env.PESAPAL_CONSUMER_KEY,
    paypal: !!process.env.PAYPAL_CLIENT_ID,
    cash: true, // POS only
  };
}

let tokenCache = { token: null, exp: 0 };
async function darajaToken() {
  if (tokenCache.token && tokenCache.exp > Date.now()) return tokenCache.token;
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const r = await fetch(`${DARAJA}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } });
  if (!r.ok) throw new Error('Daraja auth failed');
  const j = await r.json();
  tokenCache = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) - 60) * 1000 };
  return tokenCache.token;
}

/** Start a payment. `onConfirm(ref)` / `onFail(reason)` are called for mock mode. */
export async function startPayment({ method, order, phone, baseUrl }, { onConfirm, onFail }) {
  if (method === 'cash') return onConfirm({ method: 'cash', ref: 'CASH-' + Date.now().toString(36).toUpperCase() });

  if (MODE === 'mock') {
    const ref = (method === 'mpesa' ? 'SIM' : method.toUpperCase()) + Math.random().toString(36).slice(2, 10).toUpperCase();
    setTimeout(() => onConfirm({ method, ref, simulated: true }).catch(() => {}), method === 'mpesa' ? 4500 : 2500);
    return { status: 'pending', message: method === 'mpesa' ? 'Check your phone and enter your M-Pesa PIN (simulated)' : 'Processing (simulated)' };
  }

  if (method === 'mpesa') {
    const shortcode = process.env.MPESA_SHORTCODE || '174379';
    const passkey = process.env.MPESA_PASSKEY;
    const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const password = Buffer.from(shortcode + passkey + ts).toString('base64');
    const token = await darajaToken();
    const r = await fetch(`${DARAJA}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode, Password: password, Timestamp: ts,
        TransactionType: process.env.MPESA_TYPE || 'CustomerPayBillOnline',
        Amount: Math.ceil(order.total), PartyA: phone, PartyB: shortcode, PhoneNumber: phone,
        CallBackURL: `${process.env.PUBLIC_URL || baseUrl}/api/pay/mpesa/callback`,
        AccountReference: order.id, TransactionDesc: `PBAG ${order.id}`,
      }),
    });
    const j = await r.json();
    if (j.ResponseCode !== '0') { await onFail('stk_rejected'); throw Object.assign(new Error(j.errorMessage || j.ResponseDescription || 'M-Pesa request failed'), { status: 502 }); }
    return { status: 'pending', checkoutRequestId: j.CheckoutRequestID, message: 'Check your phone and enter your M-Pesa PIN' };
  }

  // Card (Pesapal) / PayPal integrations plug in here once credentials exist.
  throw Object.assign(new Error(`${method} payments are not enabled yet`), { status: 501 });
}

/** Parse a Daraja STK callback body -> { orderRef?, checkoutRequestId, ok, receipt } */
export function parseMpesaCallback(body) {
  const cb = body?.Body?.stkCallback;
  if (!cb) return null;
  const items = Object.fromEntries((cb.CallbackMetadata?.Item || []).map((i) => [i.Name, i.Value]));
  return { checkoutRequestId: cb.CheckoutRequestID, ok: cb.ResultCode === 0, resultDesc: cb.ResultDesc, receipt: items.MpesaReceiptNumber, amount: items.Amount, phone: items.PhoneNumber };
}
