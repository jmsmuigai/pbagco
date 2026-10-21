// PBAG — shared front-end module (no framework, ~8KB)
document.documentElement.classList.remove('no-js');

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const icon = (n, c = '') => `<svg class="i ${c}" aria-hidden="true"><use href="/assets/img/icons.svg#i-${n}"/></svg>`;
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const kes = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');
const TZ = { timeZone: 'Africa/Nairobi' };
export const fmt = {
  day: (iso) => new Date(iso).toLocaleDateString('en-KE', { ...TZ, day: 'numeric' }),
  mon: (iso) => new Date(iso).toLocaleDateString('en-KE', { ...TZ, month: 'short' }),
  date: (iso) => new Date(iso).toLocaleDateString('en-KE', { ...TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
  short: (iso) => new Date(iso).toLocaleDateString('en-KE', { ...TZ, weekday: 'short', day: 'numeric', month: 'short' }),
  time: (iso) => new Date(iso).toLocaleTimeString('en-KE', { ...TZ, hour: 'numeric', minute: '2-digit' }),
  ymd: (iso) => new Date(iso).toLocaleDateString('en-CA', TZ),
};

export async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Network error — please try again'), { status: r.status });
  return j;
}

export function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.role = 'status'; t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 2800);
}

const SUB_ICON = { 'pbag-theatre': 'drama', 'peatice-productions': 'clapperboard', 'peers-got-talanta': 'trophy', 'pbag-bunge': 'landmark' };
/** Generated, lightweight event poster (pure HTML/CSS — no image download). */
export function poster(e, { compact = false, bare = false } = {}) {
  const [a, b] = e.palette || ['#3b82f6', '#8b5cf6'];
  const first = e.performances?.[0]?.startsAt;
  return `<div class="poster" style="--a:${a};--b:${b}">
    <i class="p-spot"></i><span class="p-word" aria-hidden="true">${esc(e.category || 'Live')}</span>
    ${icon(SUB_ICON[e.subsidiary] || 'theater', 'p-icon')}
    ${bare ? '' : `<div class="p-by">${esc(e.subsidiaryName || 'PBAG')} presents</div>`}
    <div class="p-title">${esc(e.title)}</div>
    ${compact ? '' : `<div class="p-tag">${esc(e.tagline || '')}</div>`}
    ${compact || bare ? '' : `<div class="p-foot"><span>${first ? fmt.short(first) : ''}${e.performances?.length > 1 ? ` +${e.performances.length - 1}` : ''}</span><span>${esc((e.venue || '').split(',').pop().trim())}</span></div>`}
  </div>`;
}

export function stub(e) {
  const p = e.performances[0].startsAt;
  return `<a class="stub reveal" href="/tickets?event=${e.slug}" style="--c:${e.palette?.[0]}">
    <div class="s-art">${poster(e, { bare: true })}</div>
    <span class="datebox"><b>${fmt.day(p)}</b><span>${fmt.mon(p)}</span></span>
    <div class="s-body">
      <span class="badge">${esc(e.category)}</span>
      <h3 class="sr-only">${esc(e.title)}</h3>
      <div class="meta"><span>${icon('map-pin')} ${esc(e.venue)}</span><span>${icon('clock')} ${e.performances.length > 1 ? e.performances.length + ' shows' : fmt.time(p)}</span></div>
      <div class="s-foot"><span class="price"><small>from</small>${kes(e.fromPrice)}</span><span class="btn btn-gold btn-sm btn-ticket">${icon('ticket')} Book</span></div>
    </div></a>`;
}

/* ---------- header, drawer, dropdown ---------- */
const header = $('.site-header');
const onScroll = () => header?.classList.toggle('solid', scrollY > 10);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const drawer = $('#drawer'), menuBtn = $('.menu-btn');
const setDrawer = (open) => { drawer?.classList.toggle('open', open); drawer?.setAttribute('aria-hidden', !open); menuBtn?.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : ''; };
menuBtn?.addEventListener('click', () => setDrawer(true));
$('.menu-close')?.addEventListener('click', () => setDrawer(false));
drawer?.addEventListener('click', (e) => { if (e.target === drawer || e.target.closest('a')) setDrawer(false); });
$$('.dd > button').forEach((b) => b.addEventListener('click', () => { const dd = b.parentElement; const o = dd.classList.toggle('open'); b.setAttribute('aria-expanded', o); }));
document.addEventListener('click', (e) => { if (!e.target.closest('.dd')) $$('.dd.open').forEach((d) => d.classList.remove('open')); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setDrawer(false); closeCue(); } });
if (location.pathname.startsWith('/subsidiaries')) $('.dd > button')?.setAttribute('aria-current', 'page');
$$('[data-year]').forEach((n) => (n.textContent = new Date().getFullYear()));

/* ---------- curtains (home only, once per session) ---------- */
const curtains = $('.curtains');
if (curtains) {
  let seen = false; try { seen = sessionStorage.getItem('pbag-curtain'); sessionStorage.setItem('pbag-curtain', 1); } catch {}
  if (seen) curtains.classList.add('gone'); else setTimeout(() => curtains.classList.add('gone'), 2000);
}

/* ---------- reveal on scroll ---------- */
export function observeReveals(root = document) {
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' }) : null;
  $$('.reveal:not(.in)', root).forEach((el) => (io ? io.observe(el) : el.classList.add('in')));
}
observeReveals();

/* ---------- referral capture (?ref=CODE, kept 30 days) ---------- */
try {
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref) localStorage.setItem('pbag-ref', JSON.stringify({ code: ref.toUpperCase().slice(0, 12), method: new URLSearchParams(location.search).get('via') === 'qr' ? 'qr' : 'link', exp: Date.now() + 30 * 864e5 }));
} catch {}
export function getRef() {
  try { const r = JSON.parse(localStorage.getItem('pbag-ref')); return r && r.exp > Date.now() ? r : null; } catch { return null; }
}

/* ---------- Cue: AI usher chat ---------- */
const cue = $('#cue'), fab = $('.cue-fab'), log = $('.cue-log'), form = $('.cue-form'), input = $('#cueInput'), sugg = $('.cue-sugg');
let history = [];
try { history = JSON.parse(sessionStorage.getItem('pbag-cue') || '[]'); } catch {}
const md = (t) => esc(t)
  .replace(/\[([^\]]+)\]\(((?:\/|https:\/\/wa\.me\/)[^)\s]*)\)/g, '<a href="$2">$1</a>')
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
function bubble(role, text) {
  const d = document.createElement('div'); d.className = 'msg ' + (role === 'user' ? 'me' : 'bot');
  d.innerHTML = role === 'user' ? esc(text) : md(text); log.append(d); log.scrollTop = log.scrollHeight; return d;
}
const SUGG = ["What's showing this month?", 'How do I pay with M-Pesa?', 'Hire PBAG for an event', 'Tell me about your AI consultancy', 'Recommend a comedy to watch'];
function renderCue() {
  log.innerHTML = '';
  bubble('assistant', 'Karibu! I’m **Cue**, PBAG’s AI usher 🎭 Ask me about shows, tickets, hiring PBAG, joining a subsidiary or our AI Studio.');
  history.forEach((m) => bubble(m.role, m.text));
  sugg.innerHTML = history.length ? '' : SUGG.map((s) => `<button class="chip" type="button">${esc(s)}</button>`).join('');
}
export function openCue(prefill) {
  if (!cue) return;
  if (!log.childElementCount) renderCue();
  cue.classList.add('open'); fab.setAttribute('aria-expanded', 'true'); fab.style.visibility = 'hidden';
  setTimeout(() => input.focus(), 150);
  if (prefill) send(prefill);
}
function closeCue() { if (!cue?.classList.contains('open')) return; cue.classList.remove('open'); fab.setAttribute('aria-expanded', 'false'); fab.style.visibility = ''; }
async function send(text) {
  text = text.trim(); if (!text) return;
  sugg.innerHTML = '';
  history.push({ role: 'user', text }); bubble('user', text); input.value = '';
  const typing = document.createElement('div'); typing.className = 'msg bot typing'; typing.innerHTML = '<i></i><i></i><i></i>'; log.append(typing); log.scrollTop = log.scrollHeight;
  try {
    const r = await api('/api/chat', { method: 'POST', body: { messages: history } });
    typing.remove(); history.push({ role: 'assistant', text: r.text }); bubble('assistant', r.text);
  } catch (e) {
    typing.remove(); bubble('assistant', `Sorry, I lost my line (${e.message}). You can call 0720 960 180.`);
  }
  history = history.slice(-16);
  try { sessionStorage.setItem('pbag-cue', JSON.stringify(history)); } catch {}
}
fab?.addEventListener('click', () => openCue());
$('.cue-close')?.addEventListener('click', closeCue);
form?.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
sugg?.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) send(b.textContent); });
document.addEventListener('click', (e) => { const b = e.target.closest('[data-ask]'); if (b) { e.preventDefault(); openCue(b.dataset.ask || undefined); } });
