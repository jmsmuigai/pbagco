// End-to-end API smoke test against a running server: npm start, then npm test
const B = process.env.BASE || 'http://localhost:8080';
const raw = (p, o = {}) => fetch(B + p, { ...o, headers: { 'content-type': 'application/json', ...(o.headers || {}) }, body: o.body && JSON.stringify(o.body) });
const j = async (p, o = {}) => { const r = await raw(p, o); const x = await r.json(); if (!r.ok) throw new Error(`${p} ${r.status} ${x.error}`); return x; };
const ok = (c, m) => { if (!c) throw new Error('FAIL ' + m); console.log('✓', m); };

const site = await j('/api/site');
const evs = await j('/api/events'); ok(evs.length > 0, `${evs.length} events listed`);
ok(evs[0].slug === 'ithaka-cia-kamiriithu', 'featured production (Ithaka) is listed first');
const ith = evs[0];
ok(/^https:\/\/ticketvort\.com\//.test(ith.ticketUrl), 'Ithaka links to the ticketing partner');
ok(ith.performances.length === 6 && ith.performances[0].startsAt.startsWith('2026-12-17'), 'Ithaka runs 17–20 December (6 shows)');
ok(ith.tiers.map((t) => t.price).join() === '1000,1500,2000', 'poster prices: 1,000 / 1,500 / 2,000');
ok((await raw('/api/orders', { method: 'POST', body: { eventId: ith.id, performanceId: 'p1', tierId: 'advance', qty: 1, buyer: { name: 'Smoke', phone: '0712345678' } } })).status === 403, 'built-in checkout refuses partner-ticketed shows');

if (site.salesOpen) { // only when TICKET_SALES=open (built-in box office enabled)
  const e = evs.find((x) => !x.ticketUrl), t = e.tiers.find((x) => x.onSale);
  const o = await j('/api/orders', { method: 'POST', body: { eventId: e.id, performanceId: e.performances[0].id, tierId: t.id, qty: 2, buyer: { name: 'Smoke Test', phone: '0712345678' } } });
  ok(o.status === 'pending', 'order created & seats held');
  await j(`/api/orders/${o.id}/pay`, { method: 'POST', body: { key: o.key, method: 'mpesa', phone: '0712345678' } });
  let paid; for (let i = 0; i < 10 && !paid; i++) { await new Promise((r) => setTimeout(r, 1000)); const s = await j(`/api/orders/${o.id}?k=${o.key}`); if (s.status === 'paid') paid = s; }
  ok(paid?.tickets.length === 2, 'payment confirmed, 2 tickets issued');
  const pin = { 'x-staff-pin': process.env.STAFF_PIN || '2468' };
  ok((await j('/api/staff/scan', { method: 'POST', headers: pin, body: { code: paid.tickets[0].code } })).result === 'admit', 'first scan admits');
  ok((await j('/api/staff/scan', { method: 'POST', headers: pin, body: { code: paid.tickets[0].code } })).result === 'used', 'second scan rejected');
}
const subs = site.subsidiaries || [];
ok(subs.length === 4 && subs.every((s) => s.email && s.stat), 'each subsidiary has its own email and headline figure');
ok((await j('/api/chat', { method: 'POST', body: { messages: [{ role: 'user', text: 'how do I buy tickets?' }] } })).text.includes('icketvort'), 'Ask PBAG points ticket buyers to Ticketvort');
ok((await raw('/api/staff/dashboard')).status === 401, 'staff area requires a PIN');
console.log('All good.');
