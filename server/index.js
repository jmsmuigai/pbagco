// PBAG Consortium — pbagco.com
// One small Node service for Google Cloud Run: static site + JSON API +
// Gemini usher + MCP endpoint. Start: `npm start` (dev: memory DB, mock payments).
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import crypto from 'node:crypto';
import path from 'node:path';
import { createStore } from './db.js';
import { ORG, SUBSIDIARIES, BOOKING_SERVICES, AI_SERVICES, FAQ } from './content.js';
import * as S from './services.js';
import { methods, startPayment, parseMpesaCallback } from './payments.js';
import { chat, spark } from './gemini.js';
import { mountMcp } from './mcp.js';

const PORT = process.env.PORT || 8080;
const STAFF_PIN = process.env.STAFF_PIN || '2468';
const db = await createStore();
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://i.ytimg.com', 'https://commons.wikimedia.org', 'https://upload.wikimedia.org', 'https://tile.openstreetmap.org', 'https://server.arcgisonline.com', 'https://*.tile.opentopomap.org'],
      frameSrc: ['https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://www.google.com'],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'", 'blob:'],
      upgradeInsecureRequests: process.env.K_SERVICE ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use((req, res, next) => { res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()'); next(); });
app.use(compression());
app.use(express.json({ limit: '100kb' }));

// --- tiny rate limiter -------------------------------------------------------
const hits = new Map();
const limit = (n, windowMs) => (req, res, next) => {
  const k = req.ip + req.path; const t = Date.now();
  const h = (hits.get(k) || []).filter((x) => t - x < windowMs); h.push(t); hits.set(k, h);
  if (h.length > n) return res.status(429).json({ error: 'Too many requests — take an intermission and try again shortly.' });
  next();
};
setInterval(() => hits.clear(), 10 * 60e3).unref();

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => {
  if (!e.status) console.error(e);
  res.status(e.status || 500).json({ error: e.status ? e.message : 'Something went wrong backstage. Please try again.' });
});
const staffOnly = (req, res, next) => {
  const pin = String(req.get('x-staff-pin') || '');
  const ok = pin.length === STAFF_PIN.length && crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(STAFF_PIN));
  if (!ok) return res.status(401).json({ error: 'Staff PIN required' });
  req.staff = String(req.get('x-staff-name') || 'staff').slice(0, 40);
  next();
};

// --- public API ---------------------------------------------------------------
app.get('/api/health', (_req, res) => res.json({ ok: true, db: db.kind, payments: methods().mode, ai: !!process.env.GEMINI_API_KEY }));

app.get('/api/site', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ org: ORG, subsidiaries: SUBSIDIARIES, bookingServices: BOOKING_SERVICES, aiServices: AI_SERVICES, faq: FAQ, payments: methods() });
});

app.get('/api/events', wrap(async (_req, res) => { res.set('Cache-Control', 'public, max-age=30'); res.json(await S.listEvents(db)); }));
app.get('/api/events/:slug', wrap(async (req, res) => {
  const e = await S.getEvent(db, req.params.slug);
  if (!e) return res.status(404).json({ error: 'Event not found' });
  res.json(S.publicEvent(e));
}));

app.get('/api/videos', wrap(async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=120');
  res.json({ channelPlaylist: ORG.youtubeUploads, videos: (await db.list('videos')).filter((v) => !v.retired).sort((a, b) => (a.section === 'pbag' ? 0 : 1) - (b.section === 'pbag' ? 0 : 1) || a.order - b.order) });
}));

const publicOrder = (o, tickets) => ({
  id: o.id, status: o.status, eventTitle: o.eventTitle, startsAt: o.startsAt, venue: o.venue, tierName: o.tierName, qty: o.qty,
  total: o.total, currency: o.currency, buyer: { name: o.buyer.name }, payment: o.payment ? { method: o.payment.method, ref: o.payment.ref, simulated: !!o.payment.simulated } : null,
  tickets: (tickets || []).map((t) => ({ id: t.id, code: t.code, holder: t.holder, tierName: t.tierName, seat: t.seat, status: t.status, startsAt: t.startsAt, venue: t.venue, eventTitle: t.eventTitle })),
});

app.post('/api/orders', limit(20, 60e3), wrap(async (req, res) => {
  const o = await S.createOrder(db, req.body, { channel: 'online' });
  const key = crypto.randomBytes(12).toString('base64url');
  await db.update('orders', o.id, { accessKey: key });
  res.status(201).json({ ...publicOrder(o), key, expiresAt: o.expiresAt, subtotal: o.subtotal, fee: o.fee });
}));

app.post('/api/orders/:id/pay', limit(10, 60e3), wrap(async (req, res) => {
  const o = await db.get('orders', req.params.id);
  if (!o || o.accessKey !== req.body.key) return res.status(404).json({ error: 'Order not found' });
  if (o.status !== 'pending') return res.status(409).json({ error: `Order is ${o.status}` });
  const method = ['mpesa', 'card', 'paypal'].includes(req.body.method) ? req.body.method : 'mpesa';
  const phone = S.phoneNorm(req.body.phone || o.buyer.phone);
  if (method === 'mpesa' && !/^2547\d{8}$|^2541\d{8}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid Safaricom number, e.g. 0712 345 678' });
  const r = await startPayment({ method, order: o, phone, baseUrl: `${req.protocol}://${req.get('host')}` }, {
    onConfirm: (payment) => S.markPaid(db, o.id, payment),
    onFail: (reason) => S.failOrder(db, o.id, reason),
  });
  if (r?.checkoutRequestId) await db.update('orders', o.id, { checkoutRequestId: r.checkoutRequestId, payMethod: method });
  res.json({ status: 'pending', message: r?.message });
}));

app.get('/api/orders/:id', wrap(async (req, res) => {
  const r = await S.orderWithTickets(db, req.params.id);
  if (!r || r.order.accessKey !== req.query.k) return res.status(404).json({ error: 'Order not found' });
  if (r.order.status === 'pending' && new Date(r.order.expiresAt) < new Date()) { await S.failOrder(db, r.order.id, 'expired'); r.order.status = 'expired'; }
  res.set('Cache-Control', 'no-store');
  res.json(publicOrder(r.order, r.tickets));
}));

app.post('/api/orders/lookup', limit(10, 60e3), wrap(async (req, res) => {
  const r = await S.lookupOrder(db, req.body.orderId, req.body.contact);
  if (!r) return res.status(404).json({ error: 'No order matches that number and contact' });
  res.json({ ...publicOrder(r.order, r.tickets), key: r.order.accessKey });
}));

// Daraja posts here (configure CallBackURL = https://pbagco.com/api/pay/mpesa/callback)
app.post('/api/pay/mpesa/callback', wrap(async (req, res) => {
  const cb = parseMpesaCallback(req.body);
  if (cb) {
    const [o] = await db.list('orders', [['checkoutRequestId', '==', cb.checkoutRequestId]]);
    if (o) cb.ok ? await S.markPaid(db, o.id, { method: 'mpesa', ref: cb.receipt, amount: cb.amount }) : await S.failOrder(db, o.id, 'mpesa_' + cb.resultDesc);
    await S.audit(db, 'mpesa.callback', cb);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}));

app.get('/api/tickets/verify/:code', limit(30, 60e3), wrap(async (req, res) => {
  const id = S.verifyCode(req.params.code);
  const t = id && (await db.get('tickets', id));
  res.json(t ? { genuine: true, status: t.status, event: t.eventTitle, startsAt: t.startsAt, tier: t.tierName } : { genuine: false });
}));

app.get('/api/bookings/busy', wrap(async (_req, res) => res.json(await S.busyDates(db))));
app.post('/api/bookings', limit(5, 60e3), wrap(async (req, res) => {
  if (req.body.website) return res.json({ id: 'OK' }); // honeypot
  const b = await S.createBooking(db, req.body);
  res.status(201).json({ id: b.id, service: b.service, date: b.date, slot: b.slot });
}));

app.post('/api/contact', limit(5, 60e3), wrap(async (req, res) => {
  const { name, email, phone, subject, message, website } = req.body || {};
  if (website) return res.json({ ok: true });
  if (!name || !(email || phone) || !message) return res.status(400).json({ error: 'Name, a way to reach you, and a message are required' });
  const id = 'MS' + S.rid(6);
  await db.set('messages', id, { name: String(name).slice(0, 80), email: String(email || '').slice(0, 120), phone: String(phone || '').slice(0, 20), subject: String(subject || '').slice(0, 80), message: String(message).slice(0, 3000), status: 'new', createdAt: new Date().toISOString() });
  res.status(201).json({ ok: true, id });
}));

app.post('/api/chat', limit(15, 60e3), wrap(async (req, res) => {
  const msgs = Array.isArray(req.body.messages) ? req.body.messages.filter((m) => m && typeof m.text === 'string') : [];
  if (!msgs.length) return res.status(400).json({ error: 'No message' });
  res.json(await chat(db, msgs));
}));

app.post('/api/ai/spark', limit(6, 60e3), wrap(async (req, res) => res.json(await spark(req.body.kind, req.body.topic))));

// --- staff API -------------------------------------------------------------------
app.post('/api/staff/login', limit(8, 60e3), staffOnly, (req, res) => res.json({ ok: true, name: req.staff }));
app.get('/api/staff/dashboard', staffOnly, wrap(async (_req, res) => { res.set('Cache-Control', 'no-store'); res.json(await S.dashboard(db)); }));
app.post('/api/staff/scan', staffOnly, wrap(async (req, res) => res.json(await S.scanTicket(db, req.body.code, req.staff))));
app.post('/api/staff/pos', staffOnly, wrap(async (req, res) => {
  const o = await S.createOrder(db, { ...req.body, buyer: { name: req.body.buyerName || 'Walk-in', phone: req.body.phone || '0700000000' } }, { channel: 'pos', staff: req.staff });
  const method = req.body.method === 'mpesa' ? 'mpesa' : 'cash';
  if (method === 'cash') {
    const r = await S.markPaid(db, o.id, { method: 'cash', ref: 'CASH-' + req.staff });
    return res.json(publicOrder(r.order, r.tickets));
  }
  const key = crypto.randomBytes(12).toString('base64url');
  await db.update('orders', o.id, { accessKey: key });
  const r = await startPayment({ method, order: o, phone: S.phoneNorm(req.body.phone), baseUrl: `${req.protocol}://${req.get('host')}` }, {
    onConfirm: (p) => S.markPaid(db, o.id, p), onFail: (x) => S.failOrder(db, o.id, x),
  });
  res.json({ ...publicOrder(o), key, message: r?.message });
}));
app.post('/api/staff/videos', staffOnly, wrap(async (req, res) => {
  const m = String(req.body.url || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || String(req.body.url || '').match(/^([\w-]{11})$/);
  if (!m) return res.status(400).json({ error: 'Paste a YouTube link' });
  const vids = await db.list('videos');
  const v = { id: m[1], section: req.body.section === 'pbag' ? 'pbag' : 'kenya', title: String(req.body.title || 'Untitled').slice(0, 120), channel: String(req.body.channel || '').slice(0, 60), mood: String(req.body.mood || '').split(',').map((s) => s.trim()).filter(Boolean), order: vids.length, addedAt: new Date().toISOString() };
  await db.set('videos', v.id, v);
  res.status(201).json(v);
}));
app.patch('/api/staff/bookings/:id', staffOnly, wrap(async (req, res) => {
  const status = ['requested', 'confirmed', 'declined', 'done'].includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ error: 'Bad status' });
  await db.update('bookings', req.params.id, { status, updatedAt: new Date().toISOString(), updatedBy: req.staff });
  res.json({ ok: true });
}));
app.post('/api/staff/sellers', staffOnly, wrap(async (req, res) => {
  const code = String(req.body.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (code.length < 3 || !req.body.name) return res.status(400).json({ error: 'Name and a 3–12 character code are required' });
  const s = { code, name: String(req.body.name).slice(0, 80), phone: S.phoneNorm(req.body.phone || ''), commissionRate: req.body.rate ? Number(req.body.rate) / 100 : null, active: true, createdAt: new Date().toISOString() };
  await db.set('sellers', code, s);
  res.status(201).json(s);
}));

mountMcp(app, db);

// --- static site -------------------------------------------------------------------
const pub = path.resolve('public');
// CSS/images/fonts are fingerprinted (?v=) or stable -> long cache. JS modules keep stable URLs -> revalidate (cheap 304s).
app.use('/assets', express.static(path.join(pub, 'assets'), { maxAge: '30d', immutable: true, setHeaders: (res, p) => { if (p.endsWith('.js') && !p.includes('/vendor/')) res.setHeader('Cache-Control', 'no-cache'); } }));
app.use(express.static(pub, { extensions: ['html'], setHeaders: (res, p) => { if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
app.get('/t/:code', (req, res) => res.redirect(302, `/tickets.html#verify=${encodeURIComponent(req.params.code)}`));
app.use((req, res) => res.status(404).sendFile(path.join(pub, '404.html')));

setInterval(() => S.sweepExpired(db).catch(() => {}), 60e3).unref();
app.listen(PORT, () => console.log(`PBAG ▸ http://localhost:${PORT}  db=${db.kind} payments=${methods().mode} ai=${process.env.GEMINI_API_KEY ? 'gemini' : 'offline-faq'}`));
