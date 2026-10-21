// End-to-end API smoke test against a running server: npm start, then npm test
const B = process.env.BASE || 'http://localhost:8080';
const j = async (p, o = {}) => { const r = await fetch(B + p, { ...o, headers: { 'content-type': 'application/json', ...(o.headers || {}) }, body: o.body && JSON.stringify(o.body) }); const x = await r.json(); if (!r.ok) throw new Error(`${p} ${r.status} ${x.error}`); return x; };
const ok = (c, m) => { if (!c) throw new Error('FAIL ' + m); console.log('✓', m); };
const evs = await j('/api/events'); ok(evs.length > 0, `${evs.length} events listed`);
const e = evs[0], t = e.tiers[0];
const o = await j('/api/orders', { method: 'POST', body: { eventId: e.id, performanceId: e.performances[0].id, tierId: t.id, qty: 2, buyer: { name: 'Smoke Test', phone: '0712345678' } } });
ok(o.status === 'pending', 'order created & seats held');
await j(`/api/orders/${o.id}/pay`, { method: 'POST', body: { key: o.key, method: 'mpesa', phone: '0712345678' } });
let paid; for (let i = 0; i < 10 && !paid; i++) { await new Promise((r) => setTimeout(r, 1000)); const s = await j(`/api/orders/${o.id}?k=${o.key}`); if (s.status === 'paid') paid = s; }
ok(paid?.tickets.length === 2, 'payment confirmed, 2 tickets issued');
const pin = { 'x-staff-pin': process.env.STAFF_PIN || '2468' };
ok((await j('/api/staff/scan', { method: 'POST', headers: pin, body: { code: paid.tickets[0].code } })).result === 'admit', 'first scan admits');
ok((await j('/api/staff/scan', { method: 'POST', headers: pin, body: { code: paid.tickets[0].code } })).result === 'used', 'second scan rejected');
ok((await j('/api/staff/scan', { method: 'POST', headers: pin, body: { code: 'ABCDEFGHJK.forgedcode' } })).result === 'invalid', 'forged code rejected');
ok((await j('/api/chat', { method: 'POST', body: { messages: [{ role: 'user', text: 'what shows are on?' }] } })).text, 'Cue answers');
console.log('All good.');
