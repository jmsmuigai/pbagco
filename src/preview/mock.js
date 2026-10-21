// In-browser stand-in for the PBAG API so the preview runs as one file, offline.
import { SEED_EVENTS, SEED_VIDEOS, ORG, SUBSIDIARIES, BOOKING_SERVICES, AI_SERVICES, FAQ } from '../../server/content.js';

try { const rs = history.replaceState.bind(history); history.replaceState = (...a) => { try { rs(...a); } catch {} }; } catch {}

// window.PBAG_STATIC = { base: '/repo/', persist: true } on GitHub Pages; absent in the single-file preview.
const CFG = window.PBAG_STATIC || {}, BASE = (CFG.base || '/').replace(/\/?$/, '/');
const KEY = 'pbag-static-db';
let saved = null; try { saved = CFG.persist && JSON.parse(localStorage.getItem(KEY)); } catch {}
const events = structuredClone(SEED_EVENTS);
const orders = saved?.orders || {}, tickets = saved?.tickets || {}, bookings = [];
if (saved?.sold) events.forEach((e) => e.tiers.forEach((t) => { t.sold = saved.sold[e.id + '/' + t.id] || 0; }));
const save = () => { if (!CFG.persist) return; try { const sold = {}; events.forEach((e) => e.tiers.forEach((t) => (sold[e.id + '/' + t.id] = t.sold || 0))); localStorage.setItem(KEY, JSON.stringify({ orders, tickets, sold })); } catch {} };
const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rid = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => B32[x % 32]).join('');
const subName = (s) => SUBSIDIARIES.find((x) => x.slug === s)?.name;
const pub = (e) => ({ ...e, subsidiaryName: subName(e.subsidiary), tiers: e.tiers.map((t) => ({ id: t.id, name: t.name, price: t.price, salesEnd: t.salesEnd || null, remaining: t.capacity - (t.sold || 0), onSale: !t.salesEnd || new Date(t.salesEnd) > new Date() })), fromPrice: Math.min(...e.tiers.map((t) => t.price)) });
const norm = (p = '') => { const d = String(p).replace(/\D/g, ''); return d.startsWith('254') ? d : d.startsWith('0') ? '254' + d.slice(1) : d; };
const pubOrder = (o) => ({ ...o, tickets: (o.ticketIds || []).map((id) => tickets[id]) });
const ok = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
const err = (m, s = 400) => ok({ error: m }, s);
const faq = (q) => { const s = q.toLowerCase(), h = (...w) => w.some((x) => s.includes(x));
  if (h('ticket', 'show', 'buy', 'price', 'event', 'month')) return 'Upcoming: ' + events.map((e) => `**${e.title}** (${new Date(e.performances[0].startsAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })})`).join(', ') + '. Book on the [Tickets page](/tickets).';
  if (h('m-pesa', 'mpesa', 'pay')) return 'Pick your tickets, choose M-Pesa and an STK prompt appears on your phone — enter your PIN and your QR ticket shows instantly. [Get tickets](/tickets)';
  if (h('hire', 'book', 'event', 'perform')) return 'Choose a service and a free date on [Book Us](/book) — the team confirms within a working day.';
  if (h('ai', 'consult', 'gemini')) return 'PBAG AI Studio offers Generative AI consultancy: creative production, smart bots, analytics, AI literacy, responsible AI and AI-powered Theatre for Development. [Explore AI Studio](/consultancy)';
  if (h('comedy', 'watch', 'recommend', 'laugh')) return 'Try **Njugush Ame Nduthika** or **Usicheze na Conductor wa Mat za Mwihoko** in the [Virtual Theatre](/theatre) 🍿';
  return `I’m Cue, PBAG’s AI usher. Ask me about shows, tickets, hiring PBAG, our AI Studio or joining a subsidiary. (Preview mode — live answers use Gemini.)`; };

const real = window.fetch.bind(window);
window.fetch = async (url, opts = {}) => {
  const u = new URL(url, location.href.startsWith('http') ? location.href : 'https://pbagco.com/');
  const p = '/' + u.pathname.slice(u.pathname.startsWith(BASE) ? BASE.length : 1);
  if (!p.startsWith('/api/') && !p.startsWith('/data/')) return real(url, opts);
  const m = (opts.method || 'GET').toUpperCase(), body = opts.body ? JSON.parse(opts.body) : {};
  await new Promise((r) => setTimeout(r, 150));
  if (p.startsWith('/data/')) return p === '/data/gallery.json' && window.__GALLERY__ ? ok(window.__GALLERY__) : real(url, opts);
  if (p === '/api/events') return ok(events.map(pub));
  let em; if ((em = p.match(/^\/api\/events\/([\w-]+)$/))) { const e = events.find((x) => x.slug === em[1] || x.id === em[1]); return e ? ok(pub(e)) : err('Event not found', 404); }
  if (p === '/api/videos') return ok({ channelPlaylist: ORG.youtubeUploads, videos: SEED_VIDEOS });
  if (p === '/api/site') return ok({ org: ORG, subsidiaries: SUBSIDIARIES, bookingServices: BOOKING_SERVICES, aiServices: AI_SERVICES, faq: FAQ, payments: { mode: 'mock', mpesa: true, card: true, paypal: true } });
  if (p === '/api/bookings/busy') return ok(events.flatMap((e) => e.performances.map((x) => x.startsAt.slice(0, 10))));
  if (p === '/api/bookings') { if (!body.name || !body.date) return err('Missing details'); const b = { ...body, id: 'BK' + rid(6) }; bookings.push(b); return ok(b, 201); }
  if (p === '/api/contact') return ok({ ok: true }, 201);
  if (p === '/api/chat') return ok({ text: faq(body.messages.at(-1).text).replaceAll('](/', `](${BASE}`), offline: true });
  if (p === '/api/ai/spark') { const t = body.topic || 'youth'; return ok({ offline: true, text: { tagline: `1. ${t} — live on stage, straight from Limuru.\n2. Come for the laughs, stay for the truth.\n3. Hii si story — it's theatre.`, scene: `WANJIRU: Three hours in this queue, and for what?\nOTIENO: They say change is coming... "soon".\nWANJIRU: Soon has been coming since my first-born was in class one.\nOTIENO: So — do we wait, or speak up?\n(Both turn to the audience.) What would YOU do about ${t}?`, caption: `1. The stage is set! PBAG brings "${t}" to life — grab your seat on pbagco.com 🎭 #PBAG #KenyanTheatre\n2. Laugh, think, talk about it. "${t}" — live with PBAG. #Limuru` }[body.kind] }); }
  if (p === '/api/orders' && m === 'POST') {
    const e = events.find((x) => x.id === body.eventId), t = e?.tiers.find((x) => x.id === body.tierId), perf = e?.performances.find((x) => x.id === body.performanceId);
    if (!t || !perf) return err('Pick a show and ticket type');
    const qty = +body.qty || 1; if (t.capacity - (t.sold || 0) < qty) return err('Not enough tickets left', 409);
    const code = String(body.ref || '').toUpperCase();
    const o = { id: 'PB' + rid(8), key: rid(12), status: 'pending', eventId: e.id, eventTitle: e.title, startsAt: perf.startsAt, venue: e.venue, tierId: t.id, tierName: t.name, qty, subtotal: t.price * qty, fee: 0, total: t.price * qty, currency: 'KES', buyer: { ...body.buyer, phone: norm(body.buyer.phone) }, sellerCode: code === 'PBAG10' ? code : null, expiresAt: new Date(Date.now() + 9e5).toISOString() };
    orders[o.id] = o; save(); return ok(pubOrder(o), 201);
  }
  let mm;
  if ((mm = p.match(/^\/api\/orders\/(\w+)\/pay$/))) {
    const o = orders[mm[1]]; if (!o) return err('Order not found', 404);
    setTimeout(() => { const e = events.find((x) => x.id === o.eventId); e.tiers.find((x) => x.id === o.tierId).sold += o.qty;
      o.ticketIds = Array.from({ length: o.qty }, (_, i) => { const id = rid(10); tickets[id] = { id, code: `${id}.${rid(10)}`, holder: o.buyer.name, tierName: o.tierName, seat: `${i + 1} of ${o.qty}`, status: 'valid', startsAt: o.startsAt, venue: o.venue, eventTitle: o.eventTitle }; return id; });
      o.status = 'paid'; o.payment = { method: body.method, ref: 'SIM' + rid(8), simulated: true }; save(); }, body.method === 'mpesa' ? 4000 : 2200);
    return ok({ status: 'pending', message: body.method === 'mpesa' ? 'Check your phone and enter your M-Pesa PIN (simulated)' : 'Processing (simulated)' });
  }
  if (p === '/api/orders/lookup') { const o = orders[String(body.orderId).toUpperCase()]; return o && (o.buyer.phone === norm(body.contact) || o.buyer.email === body.contact) ? ok(pubOrder(o)) : err('No order matches that number and contact', 404); }
  if ((mm = p.match(/^\/api\/orders\/(\w+)$/))) { const o = orders[mm[1]]; return o ? ok(pubOrder(o)) : err('Order not found', 404); }
  if ((mm = p.match(/^\/api\/tickets\/verify\/(.+)$/))) { const t = tickets[decodeURIComponent(mm[1]).split('.')[0]]; return ok(t ? { genuine: true, status: t.status, event: t.eventTitle, startsAt: t.startsAt, tier: t.tierName } : { genuine: false }); }
  return err('Not available in preview', 404);
};
