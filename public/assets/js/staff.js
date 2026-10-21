import { $, $$, api, esc, icon, kes, fmt, toast } from './app.js';
import { ensureQR, ticketHTML } from './ticket-render.js';

let auth = null; try { auth = JSON.parse(sessionStorage.getItem('pbag-staff')); } catch {}
const sapi = (p, o = {}) => api(p, { ...o, headers: { 'x-staff-pin': auth?.pin || '', 'x-staff-name': auth?.name || '' } });

async function login(name, pin) {
  auth = { name, pin };
  await sapi('/api/staff/login', { method: 'POST', body: {} });
  try { sessionStorage.setItem('pbag-staff', JSON.stringify(auth)); } catch {}
  $('#login').hidden = true; $('#console').hidden = false; $('#logout').hidden = false;
  show(location.hash.slice(1) || 'dash');
}
$('#login').addEventListener('submit', async (e) => { e.preventDefault(); try { await login($('#sName').value.trim(), $('#sPin').value); } catch (err) { auth = null; $('#loginMsg').textContent = err.message; } });
$('#logout').addEventListener('click', () => { sessionStorage.removeItem('pbag-staff'); location.reload(); });

const loaders = { dash, pos, bookings, sellers, scan: () => {}, programme: () => {} };
function show(tab) {
  if (!loaders[tab]) tab = 'dash';
  $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
  $$('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== tab));
  history.replaceState(null, '', '#' + tab);
  if (tab !== 'scan') stopCam();
  loaders[tab]();
}
$$('[data-tab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));

/* ---------- dashboard ---------- */
let dashTimer;
async function dash() {
  const el = $('[data-panel="dash"]');
  const d = await sapi('/api/staff/dashboard').catch((e) => ({ error: e.message }));
  if (d.error) return (el.innerHTML = `<p class="form-msg err">${esc(d.error)}</p>`);
  el.innerHTML = `<div class="kpis">
      <div class="kpi"><span>Revenue</span><b>${kes(d.totals.revenue)}</b></div>
      <div class="kpi"><span>Tickets sold</span><b>${d.totals.tickets}</b></div>
      <div class="kpi"><span>Scanned in</span><b>${d.totals.scanned}</b></div>
      <div class="kpi"><span>Orders</span><b>${d.totals.orders}</b></div>
      <div class="kpi"><span>Commission owed</span><b>${kes(d.totals.commission)}</b></div></div>
    <h3 class="h3 mt" style="margin-bottom:10px">By event</h3>
    <div class="scroll-x"><table class="table"><thead><tr><th>Event</th><th>Sold / capacity</th><th>Scanned</th><th>Online</th><th>Door</th><th>Revenue</th></tr></thead><tbody>
    ${d.byEvent.map((e) => `<tr><td><b>${esc(e.title)}</b><br><small class="muted">${e.tiers.map((t) => `${esc(t.name)} ${t.sold}/${t.capacity}`).join(' · ')}</small></td><td style="min-width:140px">${e.sold} / ${e.capacity}<div class="bar"><i style="width:${Math.min(100, (e.sold / e.capacity) * 100)}%"></i></div></td><td>${e.scanned}</td><td>${e.online}</td><td>${e.pos}</td><td>${kes(e.revenue)}</td></tr>`).join('')}</tbody></table></div>
    <div class="grid g2 mt">
      <div><h3 class="h3" style="margin-bottom:10px">Sellers</h3><div class="scroll-x"><table class="table"><thead><tr><th>Code</th><th>Tickets</th><th>Revenue</th><th>Commission</th><th>Flags</th></tr></thead><tbody>${d.bySeller.map((s) => `<tr><td><b>${esc(s.code)}</b><br><small class="muted">${esc(s.name)}</small></td><td>${s.tickets}</td><td>${kes(s.revenue)}</td><td>${kes(s.commission)}</td><td>${s.flags ? `<span class="badge bad">${s.flags}</span>` : '—'}</td></tr>`).join('')}</tbody></table></div></div>
      <div><h3 class="h3" style="margin-bottom:10px">Recent orders</h3><div class="scroll-x"><table class="table"><thead><tr><th>Order</th><th>Event</th><th>Qty</th><th>Total</th><th>Via</th></tr></thead><tbody>${d.recent.map((o) => `<tr><td><b>${o.id}</b><br><small class="muted">${fmt.short(o.at)} ${fmt.time(o.at)}</small></td><td>${esc(o.event)}<br><small class="muted">${esc(o.tier)}</small></td><td>${o.qty}</td><td>${kes(o.total)}</td><td>${o.channel}/${esc(o.method || '')}${o.seller ? `<br><small class="gold">${esc(o.seller)}</small>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No sales yet</td></tr>'}</tbody></table></div></div>
    </div>`;
  clearTimeout(dashTimer); dashTimer = setTimeout(() => { if (!$('[data-panel="dash"]').hidden) dash(); }, 15000);
}

/* ---------- gate scanner ---------- */
let stream, detector, scanning = false, last = '', lastAt = 0, jsQR;
async function check(code) {
  const r = await sapi('/api/staff/scan', { method: 'POST', body: { code } }).catch((e) => ({ result: 'invalid', message: e.message }));
  const box = $('#scanResult'); box.className = 'scan-result ' + r.result;
  box.innerHTML = `${r.result === 'admit' ? '✓ Admit' : r.result === 'used' ? 'Already used' : '✕ Invalid'}<small>${esc(r.message)}${r.ticket ? ` · ${esc(r.ticket.holder)} · ${esc(r.ticket.tierName)} · ${esc(r.ticket.eventTitle)}` : ''}</small>`;
  navigator.vibrate?.(r.result === 'admit' ? 80 : [60, 60, 60]);
  $('#scanLog').insertAdjacentHTML('afterbegin', `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0"><span>${new Date().toLocaleTimeString()} · ${esc(r.ticket?.holder || code.slice(-21))}</span><span class="badge ${r.result === 'admit' ? 'ok' : 'bad'}">${r.result}</span></div>`);
}
async function startCam() {
  const v = $('#scanVideo');
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); } catch { return toast('Camera unavailable — type the code instead'); }
  v.srcObject = stream; await v.play(); scanning = true; $('#camBtn').innerHTML = `${icon('x')} Stop camera`;
  if ('BarcodeDetector' in window) detector = new BarcodeDetector({ formats: ['qr_code'] });
  else if (!window.jsQR) await new Promise((ok) => { const s = document.createElement('script'); s.src = '/assets/vendor/jsQR.js'; s.onload = ok; document.head.append(s); });
  const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
  const tick = async () => {
    if (!scanning) return;
    let val = null;
    try {
      if (detector) { const r = await detector.detect(v); val = r[0]?.rawValue; }
      else if (v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; ctx.drawImage(v, 0, 0); const img = ctx.getImageData(0, 0, c.width, c.height); val = window.jsQR(img.data, c.width, c.height)?.data; }
    } catch {}
    if (val && !(val === last && Date.now() - lastAt < 4000)) { last = val; lastAt = Date.now(); await check(val); }
    setTimeout(tick, 250);
  };
  tick();
}
function stopCam() { scanning = false; stream?.getTracks().forEach((t) => t.stop()); stream = null; const b = $('#camBtn'); if (b) b.innerHTML = `${icon('camera')} Start camera`; }
$('#camBtn').addEventListener('click', () => (scanning ? stopCam() : startCam()));
$('#manual').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#manualCode').value.trim(); if (v) check(v); $('#manualCode').value = ''; });

/* ---------- door sales (POS) ---------- */
async function pos() {
  const el = $('[data-panel="pos"]');
  const events = await api('/api/events');
  el.innerHTML = `<form class="card stack" id="posForm" style="max-width:640px">
    <h3>Sell at the door</h3>
    <div class="field"><label for="pEv">Event &amp; show</label><select class="input" id="pEv">${events.map((e) => e.performances.map((p) => `<option value="${e.id}|${p.id}">${esc(e.title)} — ${fmt.short(p.startsAt)} ${fmt.time(p.startsAt)}</option>`).join('')).join('')}</select></div>
    <div class="grid g2" style="gap:12px"><div class="field"><label for="pTier">Ticket type</label><select class="input" id="pTier"></select></div><div class="field"><label for="pQty">Quantity</label><input class="input" id="pQty" type="number" min="1" max="10" value="1"></div></div>
    <div class="grid g2" style="gap:12px"><div class="field"><label for="pName">Buyer name (optional)</label><input class="input" id="pName" placeholder="Walk-in"></div><div class="field"><label for="pPhone">Phone (needed for M-Pesa)</label><input class="input" id="pPhone" inputmode="tel"></div></div>
    <div class="row"><label class="chip"><input type="radio" name="pm" value="cash" checked> Cash</label><label class="chip"><input type="radio" name="pm" value="mpesa"> M-Pesa STK</label></div>
    <p class="form-msg" id="pMsg"></p><button class="btn btn-gold">${icon('ticket')} Issue tickets</button></form><div id="posOut" class="stack mt"></div>`;
  const tiers = () => { const [eid] = $('#pEv').value.split('|'); const e = events.find((x) => x.id === eid); $('#pTier').innerHTML = e.tiers.map((t) => `<option value="${t.id}" ${t.remaining < 1 ? 'disabled' : ''}>${esc(t.name)} · ${kes(t.price)} (${t.remaining} left)</option>`).join(''); };
  $('#pEv').addEventListener('change', tiers); tiers();
  $('#posForm').addEventListener('submit', async (ev) => {
    ev.preventDefault(); const m = $('#pMsg'); m.className = 'form-msg'; m.textContent = 'Processing…';
    const [eventId, performanceId] = $('#pEv').value.split('|');
    try {
      let o = await sapi('/api/staff/pos', { method: 'POST', body: { eventId, performanceId, tierId: $('#pTier').value, qty: $('#pQty').value, buyerName: $('#pName').value, phone: $('#pPhone').value, method: $('[name=pm]:checked').value } });
      if (o.status === 'pending') {
        m.textContent = o.message || 'Waiting for M-Pesa…';
        for (let i = 0; i < 40 && o.status === 'pending'; i++) { await new Promise((r) => setTimeout(r, 2500)); o = { ...o, ...(await api(`/api/orders/${o.id}?k=${encodeURIComponent(o.key)}`)) }; }
      }
      if (o.status !== 'paid') throw new Error('Payment not completed (' + o.status + ')');
      m.className = 'form-msg ok'; m.textContent = `Sold ${o.qty} × ${o.tierName} · ${kes(o.total)} · order ${o.id}`;
      $('#posOut').innerHTML = (await Promise.all(o.tickets.map((t) => ticketHTML({ ...t, orderId: o.id })))).join('') + `<button class="btn" type="button" id="posPrint">${icon('printer')} Print</button>`;
      $('#posPrint').onclick = () => print();
      tiers();
    } catch (err) { m.className = 'form-msg err'; m.textContent = err.message; }
  });
}

/* ---------- bookings ---------- */
async function bookings() {
  const el = $('[data-panel="bookings"]');
  const d = await sapi('/api/staff/dashboard');
  el.innerHTML = `<div class="scroll-x"><table class="table"><thead><tr><th>Ref</th><th>Service</th><th>Date</th><th>Client</th><th>Notes</th><th>Status</th></tr></thead><tbody>${d.bookings.map((b) => `<tr><td><b>${b.id}</b></td><td>${esc(b.service)}</td><td>${esc(b.date)}<br><small class="muted">${esc(b.slot)}</small></td><td>${esc(b.name)}${b.org ? `<br><small>${esc(b.org)}</small>` : ''}<br><small class="muted">${esc(b.phone)} ${esc(b.email)}</small></td><td style="max-width:260px"><small>${esc(b.notes)}</small></td><td><select class="input" data-b="${b.id}" style="min-height:38px;padding:6px">${['requested', 'confirmed', 'declined', 'done'].map((s) => `<option ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No booking requests yet</td></tr>'}</tbody></table></div>`;
  $$('[data-b]', el).forEach((s) => s.addEventListener('change', async () => { await sapi(`/api/staff/bookings/${s.dataset.b}`, { method: 'PATCH', body: { status: s.value } }); toast('Booking updated'); }));
}

/* ---------- programme ---------- */
$('#addVideo').addEventListener('submit', async (e) => {
  e.preventDefault(); const m = $('#vMsg');
  try { const v = await sapi('/api/staff/videos', { method: 'POST', body: { url: $('#vUrl').value, title: $('#vTitle').value, channel: $('#vChannel').value, mood: $('#vMood').value, section: $('#vSection').value } }); m.className = 'form-msg ok'; m.textContent = `Added “${v.title}” — it’s live in the Virtual Theatre.`; e.target.reset(); }
  catch (err) { m.className = 'form-msg err'; m.textContent = err.message; }
});

/* ---------- sellers ---------- */
async function sellers() {
  const el = $('[data-panel="sellers"]');
  const d = await sapi('/api/staff/dashboard'); await ensureQR();
  const card = (s) => { const url = `${location.origin}/tickets?ref=${s.code}&via=qr`; const q = window.qrcode(0, 'M'); q.addData(url); q.make();
    return `<div class="card" style="display:grid;grid-template-columns:110px 1fr;gap:16px;align-items:center"><div style="background:#fff;padding:6px;border-radius:8px">${q.createSvgTag({ cellSize: 3, margin: 0, scalable: true })}</div><div><b>${esc(s.code)}</b> · ${esc(s.name)}<br><small class="muted">${s.tickets} tickets · ${kes(s.commission)} commission</small><br><code class="gold" style="font-size:.78rem;word-break:break-all">${location.origin}/tickets?ref=${esc(s.code)}</code></div></div>`; };
  el.innerHTML = `<div class="grid g2" style="align-items:start"><form class="card stack" id="sellerForm"><h3>Register a seller</h3>
    <div class="field"><label for="slName">Name</label><input class="input" id="slName" required></div>
    <div class="grid g2" style="gap:12px"><div class="field"><label for="slCode">Code</label><input class="input" id="slCode" required placeholder="JANE10" style="text-transform:uppercase"></div><div class="field"><label for="slRate">Commission % (blank = event default)</label><input class="input" id="slRate" type="number" min="0" max="50"></div></div>
    <div class="field"><label for="slPhone">Phone (used to flag self-referrals)</label><input class="input" id="slPhone" inputmode="tel"></div>
    <p class="form-msg" id="slMsg"></p><button class="btn btn-gold">${icon('plus')} Create seller</button></form>
    <div class="stack">${d.bySeller.map(card).join('')}</div></div>`;
  $('#sellerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await sapi('/api/staff/sellers', { method: 'POST', body: { name: $('#slName').value, code: $('#slCode').value, rate: $('#slRate').value, phone: $('#slPhone').value } }); toast('Seller created'); sellers(); }
    catch (err) { $('#slMsg').className = 'form-msg err'; $('#slMsg').textContent = err.message; }
  });
}

if (auth) login(auth.name, auth.pin).catch(() => { auth = null; sessionStorage.removeItem('pbag-staff'); });
