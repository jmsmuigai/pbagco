import { $, $$, api, esc, icon, kes, fmt, poster, getRef, toast } from './app.js';
import { Calendar } from './calendar.js';
import { ticketHTML, downloadPDF, downloadPNG, gcalLink, ticketUrl } from './ticket-render.js';

const S = { events: [], ev: null, perf: null, tier: null, qty: 1, buyer: {}, order: null, method: 'mpesa', pay: {}, step: 1 };
const body = $('#stepBody');
let cal;
try { S.buyer = JSON.parse(localStorage.getItem('pbag-buyer') || '{}'); } catch {}

/* ---------------- list + calendar ---------------- */
function marks() {
  const m = {};
  for (const e of S.events) for (const p of e.performances) (m[fmt.ymd(p.startsAt)] ||= []).push({ color: e.palette[0], label: e.title });
  return m;
}
function renderList(dateKey) {
  const list = dateKey ? S.events.filter((e) => e.performances.some((p) => fmt.ymd(p.startsAt) === dateKey)) : S.events;
  $('#listTitle').textContent = dateKey ? `Shows on ${fmt.short(dateKey + 'T12:00:00+03:00')}` : 'All upcoming shows';
  $('#clearDate').hidden = !dateKey;
  $('#showList').innerHTML = list.map((e) => `
    <button class="show-row${S.ev?.id === e.id ? ' on' : ''}" type="button" data-slug="${e.slug}">
      <span class="mini">${poster(e, { compact: true })}</span>
      <span><h4>${esc(e.title)}</h4><small>${fmt.short(e.performances[0].startsAt)}${e.performances.length > 1 ? ` · ${e.performances.length} shows` : ` · ${fmt.time(e.performances[0].startsAt)}`}</small><small>${esc(e.venue)}</small></span>
      <span class="price" style="font-size:1.1rem"><small>from</small>${kes(e.fromPrice)}</span>
    </button>`).join('') || '<p class="muted">No shows on this date.</p>';
}
$('#showList').addEventListener('click', (e) => { const b = e.target.closest('[data-slug]'); if (b) pick(b.dataset.slug, cal.selected); });
$('#clearDate').addEventListener('click', () => { cal.select(null); renderList(null); });

function pick(slug, dateKey, scroll = true) {
  const ev = S.events.find((e) => e.slug === slug); if (!ev) return;
  Object.assign(S, { ev, perf: null, tier: null, qty: 1, order: null });
  const onDay = dateKey && ev.performances.filter((p) => fmt.ymd(p.startsAt) === dateKey);
  if (ev.performances.length === 1) S.perf = ev.performances[0];
  else if (onDay?.length === 1) S.perf = onDay[0];
  $('#coPoster').innerHTML = poster(ev); $('#coHead').classList.remove('empty');
  $('#coCat').textContent = `${ev.category} · ${ev.subsidiaryName}`;
  $('#coTitle').textContent = ev.title;
  $('#coDesc').textContent = ev.description;
  renderList(cal.selected);
  if (scroll) history.replaceState(null, '', `?event=${slug}${location.hash}`);
  go(S.perf ? 2 : 1);
  if (scroll && innerWidth < 960) $('#checkout').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------------- steps ---------------- */
function go(n) {
  S.step = n;
  $$('#steps li').forEach((li) => { const s = +li.dataset.s; li.className = s === n ? 'on' : s < n ? 'done' : ''; });
  ({ 1: stepDate, 2: stepTickets, 3: stepDetails, 4: stepPay, 5: stepDone })[n]();
}

function stepDate() {
  if (!S.ev) { body.innerHTML = `<p class="muted">${icon('calendar-days')} Choose a show from the calendar or list to see dates and prices.</p>`; return; }
  body.innerHTML = `<h3 class="h3" style="font-size:1.1rem;margin-bottom:12px">Choose a date &amp; time</h3>
    <div class="perf-chips">${S.ev.performances.map((p) => `<button type="button" class="perf-chip${S.perf?.id === p.id ? ' on' : ''}" data-p="${p.id}"><b>${fmt.short(p.startsAt)}</b><small>${fmt.time(p.startsAt)}</small></button>`).join('')}</div>
    <p class="muted mt" style="font-size:.9rem">${icon('map-pin')} ${esc(S.ev.venue)}</p>`;
  $$('[data-p]', body).forEach((b) => b.addEventListener('click', () => { S.perf = S.ev.performances.find((p) => p.id === b.dataset.p); go(2); }));
}

function stepTickets() {
  const ev = S.ev;
  if (!S.tier) S.tier = ev.tiers.find((t) => t.remaining > 0 && t.onSale) || null;
  body.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:12px"><h3 class="h3" style="font-size:1.1rem">Choose your tickets</h3>
      <button class="chip" type="button" data-back="1">${icon('calendar-days')} ${fmt.short(S.perf.startsAt)} · ${fmt.time(S.perf.startsAt)}</button></div>
    <div role="radiogroup" aria-label="Ticket type">${ev.tiers.map((t) => {
      const off = !t.onSale || t.remaining < 1;
      return `<div class="tier${S.tier?.id === t.id ? ' on' : ''}${off ? ' soldout' : ''}" role="radio" tabindex="${off ? -1 : 0}" aria-checked="${S.tier?.id === t.id}" data-t="${t.id}">
        <div><h4>${esc(t.name)}</h4><small>${off ? (t.onSale ? 'Sold out' : 'Sales closed') : t.remaining <= 20 ? `<span class="magenta">Only ${t.remaining} left</span>` : `${t.remaining} available`}${t.salesEnd && t.onSale ? ` · until ${fmt.short(t.salesEnd)}` : ''}</small></div>
        <span class="price">${kes(t.price)}</span>
      </div>`; }).join('')}</div>
    <div class="row mt" style="justify-content:space-between">
      <div class="qty" aria-label="Quantity"><button type="button" data-q="-1" aria-label="One less">${icon('minus')}</button><output id="qty">${S.qty}</output><button type="button" data-q="1" aria-label="One more">${icon('plus')}</button></div>
      <div class="price" id="sub">${kes((S.tier?.price || 0) * S.qty)}</div>
    </div>
    <div class="row mt" style="justify-content:flex-end"><button class="btn btn-gold" id="next2" ${S.tier ? '' : 'disabled'}>Continue ${icon('arrow-right')}</button></div>`;
  const upd = () => { $('#qty').textContent = S.qty; $('#sub').textContent = kes((S.tier?.price || 0) * S.qty); };
  $$('[data-t]', body).forEach((el) => {
    const sel = () => { const t = ev.tiers.find((x) => x.id === el.dataset.t); if (!t.onSale || t.remaining < 1) return; S.tier = t; S.qty = Math.min(S.qty, t.remaining); go(2); };
    el.addEventListener('click', sel); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel(); } });
  });
  $$('[data-q]', body).forEach((b) => b.addEventListener('click', () => { S.qty = Math.max(1, Math.min(10, S.tier?.remaining || 10, S.qty + Number(b.dataset.q))); upd(); }));
  $('[data-back]', body).addEventListener('click', () => go(1));
  $('#next2').addEventListener('click', () => go(3));
}

function stepDetails() {
  const ref = getRef();
  body.innerHTML = `<form class="stack" id="det" novalidate>
    <h3 class="h3" style="font-size:1.1rem">Who’s coming?</h3>
    <div class="field"><label for="bName">Full name (printed on tickets)</label><input class="input" id="bName" required autocomplete="name" value="${esc(S.buyer.name || '')}"></div>
    <div class="grid g2" style="gap:12px">
      <div class="field"><label for="bPhone">M-Pesa / phone number</label><input class="input" id="bPhone" required inputmode="tel" autocomplete="tel" placeholder="0712 345 678" value="${esc(S.buyer.phone || '')}"></div>
      <div class="field"><label for="bEmail">Email (optional, for receipts)</label><input class="input" id="bEmail" type="email" autocomplete="email" value="${esc(S.buyer.email || '')}"></div>
    </div>
    <div class="field"><label for="bRef">Seller / promo code (optional)</label><input class="input" id="bRef" placeholder="e.g. JANE10" style="text-transform:uppercase" value="${esc(ref?.code || '')}"></div>
    ${summary()}
    <p class="form-msg err" id="detMsg" role="alert"></p>
    <div class="row" style="justify-content:space-between"><button type="button" class="btn btn-ghost" data-back>${icon('chevron-left')} Back</button><button class="btn btn-gold" id="toPay">Continue to payment ${icon('arrow-right')}</button></div>
  </form>`;
  $('[data-back]', body).addEventListener('click', () => go(2));
  $('#det').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#bName').value.trim(), phone = $('#bPhone').value.trim(), email = $('#bEmail').value.trim();
    if (name.length < 2) return ($('#detMsg').textContent = 'Please enter your name.');
    if (!/^(\+?254|0)?[17]\d{8}$/.test(phone.replace(/\s|-/g, ''))) return ($('#detMsg').textContent = 'Please enter a valid Kenyan phone number, e.g. 0712 345 678.');
    S.buyer = { name, phone, email };
    try { localStorage.setItem('pbag-buyer', JSON.stringify(S.buyer)); } catch {}
    const btn = $('#toPay'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Holding your seats…';
    try {
      const code = $('#bRef').value.trim();
      S.order = await api('/api/orders', { method: 'POST', body: { eventId: S.ev.id, performanceId: S.perf.id, tierId: S.tier.id, qty: S.qty, buyer: S.buyer, ref: code, refMethod: ref && ref.code === code.toUpperCase() ? ref.method : 'code' } });
      go(4);
    } catch (err) { $('#detMsg').textContent = err.message; btn.disabled = false; btn.innerHTML = `Continue to payment ${icon('arrow-right')}`; }
  });
}
const summary = () => `<div class="summary">
  <div><span>${esc(S.ev.title)}</span><span>${fmt.short(S.perf.startsAt)}</span></div>
  <div><span>${S.qty} × ${esc(S.tier.name)}</span><span>${kes(S.tier.price * S.qty)}</span></div>
  ${S.order?.fee ? `<div><span>Booking fee</span><span>${kes(S.order.fee)}</span></div>` : ''}
  <div class="total"><span>Total</span><span>${kes(S.order?.total ?? S.tier.price * S.qty)}</span></div></div>`;

let site;
async function stepPay() {
  site ||= await api('/api/site').catch(() => ({ payments: { mpesa: true } }));
  const pm = site.payments || {};
  const hold = Math.max(1, Math.round((new Date(S.order.expiresAt) - Date.now()) / 60000));
  body.innerHTML = `<h3 class="h3" style="font-size:1.1rem;margin-bottom:6px">How would you like to pay?</h3>
    <p class="muted" style="font-size:.88rem">${icon('clock')} Seats held for ${hold} minutes · Order <b style="color:#fff">${S.order.id}</b></p>
    <div class="pay-methods">
      <button type="button" class="pay-m" data-m="mpesa"><span class="logo" style="background:#e8f5e9;color:#1b5e20">M-PESA</span><span><b>M-Pesa</b><small class="muted" style="display:block">STK prompt</small></span></button>
      <button type="button" class="pay-m" data-m="card" ${pm.card ? '' : 'disabled'}><span class="logo" style="background:#e3f2fd;color:#0d47a1">${icon('credit-card')}</span><span><b>Card</b><small class="muted" style="display:block">${pm.card ? 'Visa · Mastercard' : 'Coming soon'}</small></span></button>
      <button type="button" class="pay-m" data-m="paypal" ${pm.paypal ? '' : 'disabled'}><span class="logo" style="background:#fff8e1;color:#003087">PP</span><span><b>PayPal</b><small class="muted" style="display:block">${pm.paypal ? 'International' : 'Coming soon'}</small></span></button>
    </div>
    <div id="payArea" class="mt"></div>`;
  const area = $('#payArea');
  const draw = () => {
    $$('.pay-m', body).forEach((b) => b.classList.toggle('on', b.dataset.m === S.method));
    area.innerHTML = (S.method === 'mpesa' ? `<div class="field"><label for="pPhone">Safaricom number to receive the prompt</label><input class="input" id="pPhone" inputmode="tel" value="${esc(S.buyer.phone)}"></div>` : '') +
      summary() + `<p class="form-msg err" id="payMsg" role="alert"></p>
      <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:.8rem">${icon('shield-check')} Secure · paid to PBAG Consortium${pm.mode === 'mock' ? ' · <b class="gold">demo mode</b>' : ''}</span><button class="btn btn-gold" id="payBtn">${icon('wallet')} Pay ${kes(S.order.total)}</button></div>`;
    $('#payBtn').addEventListener('click', pay);
  };
  $$('.pay-m', body).forEach((b) => b.addEventListener('click', () => { S.method = b.dataset.m; draw(); }));
  draw();
}

async function pay() {
  const btn = $('#payBtn'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Starting payment…';
  try {
    const r = await api(`/api/orders/${S.order.id}/pay`, { method: 'POST', body: { key: S.order.key, method: S.method, phone: $('#pPhone')?.value } });
    $('#payArea').innerHTML = `<div class="phone-prompt">
      ${S.method === 'mpesa' ? `<div class="phone"><div class="sms"><b>M-PESA</b><br>Pay ${kes(S.order.total)} to PBAG CONSORTIUM?<br>Enter M-PESA PIN:<br>••••</div></div>` : '<span class="spinner" style="width:48px;height:48px"></span>'}
      <b>${esc(r.message || 'Waiting for confirmation…')}</b><span class="muted" style="font-size:.88rem">This page updates automatically once payment is confirmed.</span><span class="spinner"></span></div>`;
    poll();
  } catch (e) { $('#payMsg').textContent = e.message; btn.disabled = false; btn.innerHTML = `${icon('wallet')} Try again`; }
}
async function poll(tries = 0) {
  try {
    const o = await api(`/api/orders/${S.order.id}?k=${encodeURIComponent(S.order.key)}`);
    if (o.status === 'paid') { S.order = { ...S.order, ...o }; saveWallet(S.order); refreshEvents(); return go(5); }
    if (o.status !== 'pending') { $('#payArea').innerHTML = `<p class="form-msg err">Payment ${esc(o.status)}. Your seats were released — please start again.</p><button class="btn" id="restart">${icon('rotate-ccw')} Start again</button>`; $('#restart').onclick = () => { S.order = null; go(3); }; return; }
  } catch {}
  if (tries > 60) { $('#payArea').insertAdjacentHTML('beforeend', `<p class="muted">Still waiting… if you completed payment, check <a class="gold" href="#my-tickets">My tickets</a> with order ${S.order.id}.</p>`); return; }
  setTimeout(() => poll(tries + 1), 2500);
}

async function stepDone() {
  const o = S.order, color = S.ev?.palette?.[0];
  body.innerHTML = `<div class="stack"><div class="row"><span class="badge ok">${icon('check-circle-2')} Paid</span><span class="muted" style="font-size:.88rem">Order ${o.id} · ${esc(o.payment?.method?.toUpperCase() || '')} ref ${esc(o.payment?.ref || '')}</span></div>
    <h3 class="display" style="font-size:2.2rem">Break a leg, ${esc(o.buyer.name.split(' ')[0])}! 🎭</h3>
    <p class="muted" style="margin:0">Your tickets are below and saved on this device. Screenshot or download them — each QR admits one person once.</p>
    ${walletActions(o)}<div class="stack" id="tix"></div></div>`;
  $('#tix').innerHTML = (await Promise.all(o.tickets.map((t) => ticketHTML({ ...t, orderId: o.id }, color)))).join('');
  bindWallet(body, o, color);
}
const walletActions = (o) => `<div class="row"><button class="btn btn-gold btn-sm" data-pdf>${icon('download')} Download PDF</button><button class="btn btn-sm" data-png>${icon('download')} Save image${o.tickets.length > 1 ? 's' : ''}</button><a class="btn btn-sm" target="_blank" rel="noopener" href="${gcalLink(o.tickets[0])}">${icon('calendar-check')} Add to calendar</a><button class="btn btn-sm btn-ghost" data-print>${icon('printer')} Print</button></div>`;
function bindWallet(root, o, color) {
  const tix = o.tickets.map((t) => ({ ...t, orderId: o.id }));
  $('[data-pdf]', root).onclick = async (e) => { e.target.disabled = true; await downloadPDF(tix, color, `PBAG-${o.id}`); e.target.disabled = false; };
  $('[data-png]', root).onclick = async () => { for (const t of tix) await downloadPNG(t, color); };
  $('[data-print]', root).onclick = () => print();
}
function saveWallet(o) { try { const w = JSON.parse(localStorage.getItem('pbag-wallet') || '[]').filter((x) => x.id !== o.id); w.unshift({ id: o.id, key: o.key }); localStorage.setItem('pbag-wallet', JSON.stringify(w.slice(0, 10))); } catch {} }

/* ---------------- lookup + wallet ---------------- */
async function showOrder(o) {
  const ev = S.events.find((e) => e.title === o.eventTitle);
  $('#lkResult').innerHTML = `<div class="row" style="justify-content:space-between"><b>${esc(o.eventTitle)}</b><span class="badge ${o.status === 'paid' ? 'ok' : 'bad'}">${esc(o.status)}</span></div>${o.tickets.length ? walletActions(o) : ''}<div class="stack" id="lkTix"></div>`;
  $('#lkTix').innerHTML = (await Promise.all(o.tickets.map((t) => ticketHTML({ ...t, orderId: o.id }, ev?.palette?.[0])))).join('') || '<p class="muted">No tickets were issued for this order.</p>';
  if (o.tickets.length) bindWallet($('#lkResult'), o, ev?.palette?.[0]);
}
$('#lookup').addEventListener('submit', async (e) => {
  e.preventDefault(); const m = $('#lkMsg'); m.className = 'form-msg'; m.textContent = 'Searching…';
  try { const o = await api('/api/orders/lookup', { method: 'POST', body: { orderId: $('#lkOrder').value, contact: $('#lkContact').value } }); m.textContent = ''; showOrder(o); }
  catch (err) { m.className = 'form-msg err'; m.textContent = err.message; }
});
async function loadWallet() {
  let w = []; try { w = JSON.parse(localStorage.getItem('pbag-wallet') || '[]'); } catch {}
  if (!w.length) return;
  const orders = (await Promise.all(w.slice(0, 5).map((x) => api(`/api/orders/${x.id}?k=${encodeURIComponent(x.key)}`).then((o) => ({ ...o, key: x.key })).catch(() => null)))).filter((o) => o?.status === 'paid');
  if (!orders.length) return;
  $('#lkResult').innerHTML = `<p class="scene-no">Saved on this device</p>` + orders.map((o) => `<button class="show-row" type="button" data-o="${o.id}"><span class="mini" style="display:grid;place-items:center;background:var(--ink-3)">${icon('ticket', 'i-lg')}</span><span><h4>${esc(o.eventTitle)}</h4><small>${o.qty} × ${esc(o.tierName)} · ${fmt.short(o.startsAt)}</small></span><span class="badge ok">View</span></button>`).join('');
  $$('[data-o]').forEach((b) => b.addEventListener('click', () => showOrder(orders.find((o) => o.id === b.dataset.o))));
}

/* ---------------- verify (QR opened by a phone camera) ---------------- */
async function verify() {
  const m = location.hash.match(/verify=([^&]+)/); if (!m) return;
  const box = $('#verifyBox'); $('#verify').hidden = false;
  const r = await api(`/api/tickets/verify/${encodeURIComponent(decodeURIComponent(m[1]))}`).catch(() => ({ genuine: false }));
  box.innerHTML = r.genuine
    ? `<div class="row">${icon('shield-check', 'i-lg')}<div><b class="display" style="font-size:1.8rem">Genuine PBAG ticket</b><p class="muted" style="margin:0">${esc(r.event)} · ${esc(r.tier)} · ${fmt.date(r.startsAt)} — status: <b class="${r.status === 'valid' ? 'gold' : 'magenta'}">${r.status === 'valid' ? 'not yet scanned' : 'already used'}</b></p></div></div>`
    : `<div class="row">${icon('alert-triangle', 'i-lg')}<div><b class="display" style="font-size:1.8rem">Not recognised</b><p class="muted" style="margin:0">This code isn’t a valid PBAG ticket. Buy only on pbagco.com or from registered PBAG sellers.</p></div></div>`;
  $('#verify').scrollIntoView();
}

/* ---------------- boot ---------------- */
async function refreshEvents() { try { S.events = await api('/api/events'); } catch {} }
(async () => {
  await refreshEvents();
  const legend = S.events.map((e) => ({ color: e.palette[0], label: e.title }));
  cal = Calendar($('#cal'), { mode: 'events', marks: marks(), legend, start: S.events[0] && fmt.ymd(S.events[0].performances[0].startsAt), onSelect: (d) => {
    renderList(d);
    if (d) { const evs = S.events.filter((e) => e.performances.some((p) => fmt.ymd(p.startsAt) === d)); if (evs.length === 1) pick(evs[0].slug, d); }
  } });
  renderList(null);
  const want = new URLSearchParams(location.search).get('event');
  if (want && S.events.some((e) => e.slug === want)) pick(want);
  else if (S.events.length && innerWidth >= 960) pick(S.events[0].slug, null, false);
  else { $('#coHead').classList.add('empty'); go(1); }
  loadWallet(); verify();
  addEventListener('hashchange', verify);
})();
