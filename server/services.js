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
    if (o.status !== 'pending') throw httpErr(409, `Order is ${o.status}`);
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
    if (!o || o.status !== 'pending') return;
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
