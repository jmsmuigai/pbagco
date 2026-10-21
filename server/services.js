// Business logic for ticketing, bookings and the staff dashboard.
import crypto from 'node:crypto';
import { SUBSIDIARIES } from './content.js';

const SECRET = process.env.TICKET_SECRET || 'dev-only-ticket-secret-change-me';
const HOLD_MINUTES = 15;
export const PLATFORM_FEE = Number(process.env.PLATFORM_FEE_RATE ?? 0); // e.g. 0.05 to add a 5% booking fee

const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function rid(n = 8) {
  const b = crypto.randomBytes(n);
  return Array.from(b, (x) => B32[x % B32.length]).join('');
}
const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url').slice(0, 10);
export const ticketCode = (ticketId) => `${ticketId}.${sign(ticketId)}`;
export function verifyCode(raw = '') {
  const m = String(raw).trim().match(/([A-Z2-9]{10})\.([A-Za-z0-9_-]{10})/);
  if (!m) return null;
  const [, id, sig] = m;
  const ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(id)));
  return ok ? id : null;
}

const now = () => new Date().toISOString();
const phoneNorm = (p = '') => {
  const d = String(p).replace(/\D/g, '');
  if (d.startsWith('254')) return d;
  if (d.startsWith('0')) return '254' + d.slice(1);
  if (d.length === 9) return '254' + d;
  return d;
};

export function publicEvent(e) {
  const sub = SUBSIDIARIES.find((s) => s.slug === e.subsidiary);
  return {
    id: e.id, slug: e.slug, title: e.title, tagline: e.tagline, description: e.description, category: e.category,
    venue: e.venue, subsidiary: e.subsidiary, subsidiaryName: sub?.name, palette: e.palette, status: e.status,
    performances: e.performances,
    tiers: e.tiers.map((t) => ({
      id: t.id, name: t.name, price: t.price, salesEnd: t.salesEnd || null,
      remaining: Math.max(0, t.capacity - (t.sold || 0) - (t.held || 0)),
      onSale: !t.salesEnd || new Date(t.salesEnd) > new Date(),
    })),
    fromPrice: Math.min(...e.tiers.map((t) => t.price)),
  };
}

export async function listEvents(db, { upcomingOnly = true } = {}) {
  const evs = await db.list('events');
  const t = Date.now();
  return evs
    .filter((e) => e.status !== 'draft')
    .filter((e) => !upcomingOnly || e.performances.some((p) => new Date(p.startsAt).getTime() > t - 6 * 3600e3))
    .sort((a, b) => new Date(a.performances[0].startsAt) - new Date(b.performances[0].startsAt))
    .map(publicEvent);
}

export async function getEvent(db, idOrSlug) {
  let e = await db.get('events', idOrSlug);
  if (!e) e = (await db.list('events', [['slug', '==', idOrSlug]]))[0];
  return e || null;
}

// ---- Orders -------------------------------------------------------------
export async function createOrder(db, input, { channel = 'online', staff = null } = {}) {
  const { eventId, performanceId, tierId, buyer = {}, ref } = input;
  const qty = Math.max(1, Math.min(10, parseInt(input.qty, 10) || 1));
  if (!buyer.name || !(buyer.phone || buyer.email)) throw httpErr(400, 'Name and phone or email are required');

  let seller = null;
  const code = String(ref || '').trim().toUpperCase();
  if (code) {
    seller = await db.get('sellers', code);
    if (!seller || !seller.active) seller = null;
  }

  const orderId = 'PB' + rid(8);
  const order = await db.transact(async (t) => {
    const e = await t.get('events', eventId);
    if (!e || e.status !== 'on_sale') throw httpErr(404, 'Event not on sale');
    const perf = e.performances.find((p) => p.id === performanceId);
    if (!perf) throw httpErr(400, 'Pick a show date');
    const tier = e.tiers.find((x) => x.id === tierId);
    if (!tier) throw httpErr(400, 'Pick a ticket type');
    if (tier.salesEnd && new Date(tier.salesEnd) < new Date()) throw httpErr(400, `${tier.name} sales have closed`);
    const remaining = tier.capacity - (tier.sold || 0) - (tier.held || 0);
    if (remaining < qty) throw httpErr(409, remaining > 0 ? `Only ${remaining} ${tier.name} left` : `${tier.name} is sold out`);
    tier.held = (tier.held || 0) + qty;
    t.update('events', e.id, { tiers: e.tiers });

    const subtotal = tier.price * qty;
    const fee = Math.round(subtotal * PLATFORM_FEE);
    const rate = seller ? (seller.commissionRate ?? e.commissionRate ?? 0.1) : 0;
    const selfReferral = seller && seller.phone && phoneNorm(seller.phone) === phoneNorm(buyer.phone);
    const o = {
      id: orderId, eventId: e.id, eventTitle: e.title, performanceId, startsAt: perf.startsAt, venue: e.venue,
      tierId, tierName: tier.name, unitPrice: tier.price, qty, subtotal, fee, total: subtotal + fee, currency: 'KES',
      buyer: { name: String(buyer.name).slice(0, 80), phone: phoneNorm(buyer.phone), email: String(buyer.email || '').toLowerCase().slice(0, 120) },
      channel, staff, sellerCode: seller?.code || null, attribution: seller ? (input.refMethod || 'code') : null,
      commission: seller && !selfReferral ? Math.round(subtotal * rate) : 0, flags: selfReferral ? ['self_referral'] : [],
      status: 'pending', createdAt: now(), expiresAt: new Date(Date.now() + HOLD_MINUTES * 60e3).toISOString(),
    };
    t.set('orders', orderId, o);
    return o;
  });
  await audit(db, 'order.created', { orderId, channel, sellerCode: order.sellerCode });
  return order;
}

export async function markPaid(db, orderId, payment) {
  const result = await db.transact(async (t) => {
    const o = await t.get('orders', orderId);
    if (!o) throw httpErr(404, 'Order not found');
    if (o.status === 'paid') return { order: o, tickets: null };
    if (o.status !== 'pending' && o.status !== 'verifying') throw httpErr(409, `Order is ${o.status}`);
    const e = await t.get('events', o.eventId);
    const tier = e.tiers.find((x) => x.id === o.tierId);
    tier.held = Math.max(0, (tier.held || 0) - o.qty);
    tier.sold = (tier.sold || 0) + o.qty;
    t.update('events', e.id, { tiers: e.tiers });
    const tickets = [];
    for (let i = 0; i < o.qty; i++) {
      const id = rid(10);
      const tk = { id, code: ticketCode(id), orderId, eventId: o.eventId, eventTitle: o.eventTitle, performanceId: o.performanceId,
        startsAt: o.startsAt, venue: o.venue, tierName: o.tierName, holder: o.buyer.name, seat: `${i + 1} of ${o.qty}`,
        status: 'valid', issuedAt: now(), usedAt: null };
      t.set('tickets', id, tk);
      tickets.push(tk);
    }
    const patch = { status: 'paid', paidAt: now(), payment, ticketIds: tickets.map((x) => x.id) };
    t.update('orders', orderId, patch);
    return { order: { ...o, ...patch }, tickets };
  });
  await audit(db, 'order.paid', { orderId, method: payment?.method, ref: payment?.ref });
  return result;
}

export async function failOrder(db, orderId, reason = 'payment_failed') {
  await db.transact(async (t) => {
    const o = await t.get('orders', orderId);
    if (!o || (o.status !== 'pending' && o.status !== 'verifying')) return;
    const e = await t.get('events', o.eventId);
    const tier = e.tiers.find((x) => x.id === o.tierId);
    tier.held = Math.max(0, (tier.held || 0) - o.qty);
    t.update('events', e.id, { tiers: e.tiers });
    t.update('orders', orderId, { status: reason === 'expired' ? 'expired' : 'failed', failReason: reason });
  });
}

export async function sweepExpired(db) {
  const pend = await db.list('orders', [['status', '==', 'pending']]);
  for (const o of pend) if (new Date(o.expiresAt) < new Date()) await failOrder(db, o.id, 'expired');
}

export async function orderWithTickets(db, orderId) {
  const o = await db.get('orders', orderId);
  if (!o) return null;
  const tickets = o.status === 'paid' ? await db.list('tickets', [['orderId', '==', orderId]]) : [];
  return { order: o, tickets };
}

export async function lookupOrder(db, orderId, contact) {
  const r = await orderWithTickets(db, String(orderId || '').trim().toUpperCase());
  if (!r) return null;
  const c = String(contact || '').trim().toLowerCase();
  const ok = c && (r.order.buyer.email === c || r.order.buyer.phone === phoneNorm(c));
  return ok ? r : null;
}

// ---- Gate scanning --------------------------------------------------------
export async function scanTicket(db, raw, staff) {
  const id = verifyCode(raw);
  if (!id) { await audit(db, 'scan.invalid', { raw: String(raw).slice(0, 60), staff }); return { result: 'invalid', message: 'Not a genuine PBAG ticket' }; }
  const r = await db.transact(async (t) => {
    const tk = await t.get('tickets', id);
    if (!tk) return { result: 'invalid', message: 'Ticket not found' };
    if (tk.status === 'used') return { result: 'used', message: `Already scanned at ${new Date(tk.usedAt).toLocaleTimeString('en-KE', { timeZone: 'Africa/Nairobi' })}`, ticket: tk };
    if (tk.status !== 'valid') return { result: 'invalid', message: `Ticket ${tk.status}`, ticket: tk };
    const patch = { status: 'used', usedAt: now(), usedBy: staff || 'gate' };
    t.update('tickets', id, patch);
    return { result: 'admit', message: 'Admit', ticket: { ...tk, ...patch } };
  });
  await audit(db, 'scan.' + r.result, { ticketId: id, staff });
  return r;
}

// ---- Bookings ("Book Us") ------------------------------------------------
export async function createBooking(db, b) {
  if (!b.name || !(b.phone || b.email) || !b.date || !b.service) throw httpErr(400, 'Name, contact, service and date are required');
  const id = 'BK' + rid(6);
  const doc = {
    id, service: String(b.service).slice(0, 40), date: String(b.date).slice(0, 10), slot: String(b.slot || '').slice(0, 20),
    name: String(b.name).slice(0, 80), org: String(b.org || '').slice(0, 120), phone: phoneNorm(b.phone), email: String(b.email || '').slice(0, 120),
    location: String(b.location || '').slice(0, 120), audience: String(b.audience || '').slice(0, 20), notes: String(b.notes || '').slice(0, 1500),
    source: b.source || 'web', status: 'requested', createdAt: now(),
  };
  await db.set('bookings', id, doc);
  await audit(db, 'booking.created', { id, service: doc.service, date: doc.date });
  return doc;
}

export async function busyDates(db) {
  const evs = await db.list('events');
  const bks = await db.list('bookings');
  const dates = new Set();
  for (const e of evs) for (const p of e.performances) dates.add(p.startsAt.slice(0, 10));
  for (const b of bks) if (b.status === 'confirmed') dates.add(b.date);
  return [...dates];
}

// ---- Dashboard -------------------------------------------------------------
export async function dashboard(db) {
  const [evs, orders, tickets, sellers, bookings] = await Promise.all([
    db.list('events'), db.list('orders', [['status', '==', 'paid']]), db.list('tickets'), db.list('sellers'), db.list('bookings'),
  ]);
  const byEvent = evs.map((e) => {
    const os = orders.filter((o) => o.eventId === e.id);
    const ts = tickets.filter((t) => t.eventId === e.id);
    return {
      id: e.id, title: e.title, sold: ts.length, scanned: ts.filter((t) => t.status === 'used').length,
      capacity: e.tiers.reduce((a, t) => a + t.capacity, 0), revenue: os.reduce((a, o) => a + o.total, 0),
      online: os.filter((o) => o.channel === 'online').reduce((a, o) => a + o.qty, 0),
      pos: os.filter((o) => o.channel === 'pos').reduce((a, o) => a + o.qty, 0),
      tiers: e.tiers.map((t) => ({ name: t.name, sold: t.sold || 0, capacity: t.capacity, price: t.price })),
    };
  });
  const bySeller = sellers.map((s) => {
    const os = orders.filter((o) => o.sellerCode === s.code);
    return { code: s.code, name: s.name, tickets: os.reduce((a, o) => a + o.qty, 0), revenue: os.reduce((a, o) => a + o.subtotal, 0), commission: os.reduce((a, o) => a + o.commission, 0), flags: os.flatMap((o) => o.flags || []).length };
  });
  return {
    totals: { revenue: orders.reduce((a, o) => a + o.total, 0), tickets: tickets.length, scanned: tickets.filter((t) => t.status === 'used').length, orders: orders.length, commission: orders.reduce((a, o) => a + o.commission, 0) },
    byEvent, bySeller,
    recent: orders.sort((a, b) => b.paidAt.localeCompare(a.paidAt)).slice(0, 15).map((o) => ({ id: o.id, event: o.eventTitle, tier: o.tierName, qty: o.qty, total: o.total, channel: o.channel, method: o.payment?.method, seller: o.sellerCode, at: o.paidAt })),
    bookings: bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30),
  };
}

export async function audit(db, type, data) {
  const id = Date.now().toString(36) + rid(4);
  try { await db.set('audit', id, { type, data, at: now() }); } catch {}
}

export function httpErr(status, message) { const e = new Error(message); e.status = status; return e; }
export { phoneNorm };


// ---- Paybill / bank: paste-the-code verification -----------------------------------
// M-Pesa confirmation codes are 10 characters (letters + digits), e.g. SJK3H5X8QP.
export const MPESA_CODE = /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{10}$/;
const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Record a Safaricom C2B confirmation (Paybill). Auto-pays a matching order. */
export async function recordC2B(db, body) {
  const code = normCode(body.TransID);
  if (!MPESA_CODE.test(code)) return null;
  const rec = { id: 'MP_' + code, code, method: 'paybill', amount: Number(body.TransAmount) || 0, account: String(body.BillRefNumber || '').toUpperCase().trim(),
    msisdn: String(body.MSISDN || '').replace(/^(\d{6})\d+(\d{2})$/, '$1****$2'), name: String(body.FirstName || '').slice(0, 30), at: now(), usedBy: null };
  if (!(await db.get('payments', rec.id))) await db.set('payments', rec.id, rec);
  const o = rec.account && (await db.get('orders', rec.account));
  if (o && (o.status === 'pending' || o.status === 'verifying') && rec.amount >= o.total) await claimAndPay(db, o.id, code, 'paybill', 'c2b');
  await audit(db, 'mpesa.c2b', { code, account: rec.account, amount: rec.amount });
  return rec;
}

async function claimAndPay(db, orderId, code, method, verifiedBy) {
  await db.transact(async (t) => {
    const p = await t.get('payments', 'MP_' + code);
    if (p?.usedBy && p.usedBy !== orderId) throw httpErr(409, 'This payment code has already been used for another order');
    if (p) t.update('payments', 'MP_' + code, { usedBy: orderId, usedAt: now() });
    else t.set('payments', 'MP_' + code, { code, method, usedBy: orderId, usedAt: now(), at: now(), source: verifiedBy });
  });
  return markPaid(db, orderId, { method, ref: code, verifiedBy });
}

/** Buyer pastes an M-Pesa (or bank) code. Returns { status: 'paid'|'verifying' }. */
export async function submitPaymentCode(db, orderId, rawCode, method = 'paybill', mode = 'mock') {
  const code = normCode(rawCode);
  const o = await db.get('orders', orderId);
  if (!o) throw httpErr(404, 'Order not found');
  if (o.status === 'paid') return { status: 'paid' };
  if (o.status !== 'pending' && o.status !== 'verifying') throw httpErr(409, `Order is ${o.status}`);
  if (method === 'paybill' && !MPESA_CODE.test(code)) throw httpErr(400, 'That doesn\'t look like an M-Pesa code — it is 10 letters and numbers, e.g. SJK3H5X8QP');
  if (method === 'bank' && (code.length < 6 || code.length > 24)) throw httpErr(400, 'Enter the bank transaction reference (6–24 characters)');
  const key = 'MP_' + code;
  const p = await db.get('payments', key);
  if (p?.usedBy && p.usedBy !== orderId) { await audit(db, 'payment.code_reuse', { orderId, code }); throw httpErr(409, 'This payment code has already been used. Each code can generate tickets only once.'); }
  // 1) Safaricom already confirmed this code (C2B) and it matches the order
  if (p && !p.usedBy && p.amount >= o.total && (!p.account || p.account === o.id)) { await claimAndPay(db, o.id, code, method, 'c2b'); return { status: 'paid' }; }
  if (p && !p.usedBy && p.amount < o.total) throw httpErr(400, `The payment for ${code} was KES ${p.amount}, but this order needs KES ${o.total}. Contact PBAG for help.`);
  // 2) Demo mode: accept well-formed codes instantly
  if (mode === 'mock') { await claimAndPay(db, o.id, code, method, 'simulated'); return { status: 'paid', simulated: true }; }
  // 3) Otherwise hold for verification (C2B arrives shortly, or staff reconcile against the statement)
  await db.transact(async (t) => {
    const cur = await t.get('payments', key);
    if (cur?.usedBy && cur.usedBy !== orderId) throw httpErr(409, 'This payment code has already been used.');
    t.set('payments', key, { ...(cur || { code, method, at: now() }), id: key, claimedBy: orderId, claimedAt: now() });
    t.update('orders', orderId, { status: 'verifying', claim: { code, method, at: now() }, expiresAt: new Date(Date.now() + 24 * 3600e3).toISOString() });
  });
  await audit(db, 'payment.claim', { orderId, code, method });
  return { status: 'verifying' };
}

export async function staffVerify(db, orderId, approve, staff) {
  const o = await db.get('orders', orderId);
  if (!o || o.status !== 'verifying') throw httpErr(409, 'Order is not awaiting verification');
  if (!approve) { await failOrder(db, orderId, 'payment_rejected'); await audit(db, 'payment.rejected', { orderId, staff }); return { status: 'failed' }; }
  const r = await claimAndPay(db, orderId, o.claim.code, o.claim.method, 'staff:' + staff);
  return { status: 'paid', tickets: r.tickets?.length };
}

// ---- Escalation to Board / management -----------------------------------------------
export async function escalate(db, b) {
  if (!b.question || !(b.phone || b.email)) throw httpErr(400, 'Please share your question and a phone number or email so management can reply');
  const id = 'ES' + rid(6);
  await db.set('escalations', id, { id, name: String(b.name || 'Website visitor').slice(0, 80), phone: phoneNorm(b.phone || ''), email: String(b.email || '').slice(0, 120),
    question: String(b.question).slice(0, 2000), context: String(b.context || '').slice(0, 2000), to: 'PBAG Board & Management', status: 'open', source: b.source || 'cue', createdAt: now() });
  await audit(db, 'escalation.created', { id });
  return { id };
}

// ---- Auditions ------------------------------------------------------------------------
export async function listAuditions(db) {
  return (await db.list('auditions')).filter((a) => a.status !== 'closed').sort((a, b) => a.date.localeCompare(b.date));
}
export async function subscribe(db, b) {
  const phone = phoneNorm(b.phone || ''), email = String(b.email || '').trim().toLowerCase().slice(0, 120);
  if (!phone && !email) throw httpErr(400, 'Add a phone number or email to get alerts');
  const id = 'SB_' + (phone || email).replace(/[^a-z0-9]/gi, '');
  const cur = await db.get('subscribers', id);
  const cats = [...new Set([...(cur?.categories || []), ...(Array.isArray(b.categories) ? b.categories : [])].map(String))].slice(0, 12);
  await db.set('subscribers', id, { id, name: String(b.name || cur?.name || '').slice(0, 80), phone, email, categories: cats, lists: [...new Set([...(cur?.lists || []), b.list || 'auditions'])], channel: b.channel || 'whatsapp', consent: true, createdAt: cur?.createdAt || now(), updatedAt: now() });
  return { ok: true, updated: !!cur };
}
export async function applyAudition(db, b) {
  const a = await db.get('auditions', b.auditionId);
  if (!a || a.status === 'closed') throw httpErr(404, 'That audition is not open');
  if (!b.name || !b.phone || !b.consent) throw httpErr(400, 'Name, phone and consent are required');
  if (b.ageGroup === 'under18' && !b.guardianConsent) throw httpErr(400, 'Applicants under 18 need a parent or guardian\'s consent');
  const link = String(b.link || '').trim();
  if (link && !/^https:\/\/[\w.-]+\.[a-z]{2,}\//i.test(link)) throw httpErr(400, 'Performance link must be a full https:// link (YouTube, TikTok, Instagram, Drive…)');
  const id = 'AU' + rid(6);
  const doc = { id, auditionId: a.id, auditionTitle: a.title, name: String(b.name).slice(0, 80), phone: phoneNorm(b.phone), email: String(b.email || '').slice(0, 120),
    ageGroup: ['under18', '18-25', '26-35', '36+'].includes(b.ageGroup) ? b.ageGroup : '', categories: (b.categories || []).slice(0, 6), role: String(b.role || '').slice(0, 80),
    link, bio: String(b.bio || '').slice(0, 1200), location: String(b.location || '').slice(0, 80), status: 'submitted', slot: null, createdAt: now(), history: [{ status: 'submitted', at: now() }] };
  await db.set('applications', id, doc);
  if (b.subscribe) await subscribe(db, { name: doc.name, phone: doc.phone, email: doc.email, categories: doc.categories });
  await audit(db, 'audition.applied', { id, auditionId: a.id });
  return { id, status: 'submitted', auditionTitle: a.title, date: a.date };
}
export async function applicationStatus(db, ref, contact) {
  const d = await db.get('applications', String(ref || '').toUpperCase().trim());
  const c = String(contact || '').trim().toLowerCase();
  if (!d || !(d.phone === phoneNorm(c) || (d.email && d.email === c))) return null;
  const a = await db.get('auditions', d.auditionId);
  return { id: d.id, name: d.name, auditionTitle: d.auditionTitle, status: d.status, slot: d.slot, venue: a?.venue, date: a?.date, history: d.history };
}
/** Staff status change. Inviting auto-assigns the next free 10-minute slot. */
export async function setApplicationStatus(db, id, status, staff) {
  const OK = ['submitted', 'shortlisted', 'invited', 'callback', 'selected', 'not_selected'];
  if (!OK.includes(status)) throw httpErr(400, 'Bad status');
  const d = await db.get('applications', id); if (!d) throw httpErr(404, 'Not found');
  const patch = { status, history: [...(d.history || []), { status, at: now(), by: staff }] };
  if (status === 'invited' && !d.slot) {
    const a = await db.get('auditions', d.auditionId);
    const taken = (await db.list('applications', [['auditionId', '==', d.auditionId]])).map((x) => x.slot).filter(Boolean);
    const [h, m] = (a.time || '09:00').split(':').map(Number);
    let k = 0, slot; do { const mins = h * 60 + m + k * 10; slot = `${a.date} ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`; k++; } while (taken.includes(slot) && k < 200);
    patch.slot = slot;
  }
  await db.update('applications', id, patch);
  return { ...d, ...patch };
}
