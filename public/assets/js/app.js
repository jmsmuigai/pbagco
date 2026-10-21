// PBAG — shared front-end module (no framework, ~8KB)
document.documentElement.classList.remove('no-js');
import { SW } from './i18n.js';
export const LANG = document.documentElement.lang === 'sw' ? 'sw' : 'en';
/** Translate a UI string (English is the key). */
export const t = (s) => (LANG === 'sw' && SW[s]) || s;
export const L = (path) => (LANG === 'sw' ? '/sw' : '') + path; // language-aware internal link (unbased; prefer plain paths — the /sw rewrite below handles them)
// On Kiswahili pages, keep every internal page link inside /sw/ (covers links rendered by scripts too).
if (LANG === 'sw') {
  const BASE = window.PBAG_STATIC?.base || '/';
  const PAGES = /^(about|subsidiaries|theatre|tickets|book|consultancy|contact|ithaka|heritage-map|ai-film|events|auditions|nlp)?([?#].*)?$/;
  const fix = (root) => root.querySelectorAll?.('a[href]').forEach((a) => {
    const h = a.getAttribute('href'); if (!h.startsWith(BASE) || h.startsWith(BASE + 'sw/') || a.hasAttribute('hreflang')) return;
    const rest = h.slice(BASE.length); if (PAGES.test(rest)) a.setAttribute('href', BASE + 'sw/' + rest);
  });
  fix(document);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && fix(n.parentElement || n)))).observe(document.documentElement, { childList: true, subtree: true });
}

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const icon = (n, c = '') => `<svg class="i ${c}" aria-hidden="true"><use href="/assets/img/icons.svg#i-${n}"/></svg>`;
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const kes = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');
const TZ = { timeZone: 'Africa/Nairobi' };
const LOC = document.documentElement.lang === 'sw' ? 'sw-KE' : 'en-KE';
export const fmt = {
  day: (iso) => new Date(iso).toLocaleDateString(LOC, { ...TZ, day: 'numeric' }),
  mon: (iso) => new Date(iso).toLocaleDateString(LOC, { ...TZ, month: 'short' }),
  date: (iso) => new Date(iso).toLocaleDateString(LOC, { ...TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
  short: (iso) => new Date(iso).toLocaleDateString(LOC, { ...TZ, weekday: 'short', day: 'numeric', month: 'short' }),
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
    ${bare ? '' : `<div class="p-by">${esc(e.subsidiaryName || 'PBAG')} ${t('presents')}</div>`}
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
      <div class="meta"><span>${icon('map-pin')} ${esc(e.venue)}</span><span>${icon('clock')} ${e.performances.length > 1 ? e.performances.length + ' ' + t('shows') : fmt.time(p)}</span></div>
      <div class="s-foot"><span class="price"><small>${t('from')}</small>${kes(e.fromPrice)}</span><span class="btn btn-gold btn-sm btn-ticket">${icon('ticket')} ${t('Book')}</span></div>
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

/* ---------- Cue: robot usher chat ---------- */
const cue = $('#cue'), fab = $('.cue-fab'), log = $('.cue-log'), form = $('.cue-form'), input = $('#cueInput'), sugg = $('.cue-sugg');
const bubbleEl = $('#roboBubble');
let history = [];
try { history = JSON.parse(sessionStorage.getItem('pbag-cue') || '[]'); } catch {}
const md = (x) => esc(x)
  .replace(/\[([^\]]+)\]\(((?:\/|https:\/\/wa\.me\/)[^)\s]*)\)/g, (m, a, h) => `<a href="${h.startsWith('/') ? (window.PBAG_STATIC?.base || '/') + h.slice(1) : h}">${a}</a>`)
  .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|\s)\*([^*]+)\*/g, '$1<i>$2</i>');
function bubble(role, text) {
  const d = document.createElement('div'); d.className = 'msg ' + (role === 'user' ? 'me' : 'bot');
  d.innerHTML = role === 'user' ? esc(text) : md(text); log.append(d); log.scrollTop = log.scrollHeight; return d;
}
const SUGG = [t("What's showing this month?"), t('How do I pay with M-Pesa Paybill?'), t('Upcoming auditions'), t('Hire PBAG for an event'), t('Talk to a person')];
function renderCue() {
  log.innerHTML = '';
  bubble('assistant', t('Karibu! 🤖 I’m **Cue**, PBAG’s robot usher. I’m happy to help with shows, tickets, auditions, hiring PBAG or our AI services — and if I can’t answer, I’ll pass your question to the PBAG Board & Management.'));
  history.forEach((m) => bubble(m.role, m.text));
  sugg.innerHTML = history.length ? '' : SUGG.map((x) => `<button class="chip" type="button">${esc(x)}</button>`).join('');
}
export function openCue(prefill) {
  if (!cue) return;
  if (!log.childElementCount) renderCue();
  if (bubbleEl) bubbleEl.hidden = true;
  cue.classList.add('open'); fab.setAttribute('aria-expanded', 'true'); document.body.classList.add('cue-on');
  setTimeout(() => input.focus(), 150);
  if (prefill) send(prefill);
}
function closeCue() { if (!cue?.classList.contains('open')) return; cue.classList.remove('open'); fab.setAttribute('aria-expanded', 'false'); document.body.classList.remove('cue-on'); }
function escalateForm(question = '') {
  const d = document.createElement('form'); d.className = 'msg bot esc-form';
  d.innerHTML = `<b>${t('Send to PBAG Board & Management')}</b>
    <textarea class="input" name="question" rows="3" required placeholder="${t('Your question')}">${esc(question)}</textarea>
    <input class="input" name="name" placeholder="${t('Your name')}" autocomplete="name">
    <input class="input" name="phone" placeholder="${t('Phone / WhatsApp or email')}" required>
    <input class="hp" name="website" tabindex="-1" autocomplete="off">
    <button class="btn btn-gold btn-sm">${icon('send')} ${t('Send to management')}</button><small class="esc-msg"></small>`;
  d.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = new FormData(d), c = String(f.get('phone') || '');
    const body = { question: f.get('question'), name: f.get('name'), website: f.get('website'), context: history.slice(-6).map((m) => `${m.role}: ${m.text}`).join('\n'), ...(c.includes('@') ? { email: c } : { phone: c }) };
    try { const r = await api('/api/escalate', { method: 'POST', body }); d.replaceWith(bubble('assistant', `${t('Thank you! Your question has been sent to the PBAG Board & Management')} (${t('reference')} **${r.id}**). ${t('Someone will reply to you soon.')} 🙏`)); }
    catch (err) { d.querySelector('.esc-msg').textContent = err.message; }
  });
  log.append(d); log.scrollTop = log.scrollHeight;
}
async function send(text) {
  text = text.trim(); if (!text) return;
  sugg.innerHTML = '';
  if (/^(talk to a (person|human)|ongea na mtu|human)$/i.test(text) || text === t('Talk to a person')) { bubble('user', text); return escalateForm(); }
  history.push({ role: 'user', text }); bubble('user', text); input.value = '';
  const typing = document.createElement('div'); typing.className = 'msg bot typing'; typing.innerHTML = '<i></i><i></i><i></i>'; log.append(typing); log.scrollTop = log.scrollHeight;
  try {
    const r = await api('/api/chat', { method: 'POST', body: { messages: history, lang: LANG } });
    typing.remove(); history.push({ role: 'assistant', text: r.text }); bubble('assistant', r.text);
    if (r.escalate) escalateForm(text);
  } catch (e) {
    typing.remove(); bubble('assistant', t('Sorry, I lost my line for a moment. You can call 0720 960 180, or send your question to management:')); escalateForm(text);
  }
  history = history.slice(-16);
  try { sessionStorage.setItem('pbag-cue', JSON.stringify(history)); } catch {}
}
fab?.addEventListener('click', () => (cue.classList.contains('open') ? closeCue() : openCue()));
$('.cue-close')?.addEventListener('click', closeCue);
$('.cue-human')?.addEventListener('click', () => { if (!log.childElementCount) renderCue(); escalateForm(); });
form?.addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
sugg?.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) send(b.textContent); });
document.addEventListener('click', (e) => { const b = e.target.closest('[data-ask]'); if (b) { e.preventDefault(); openCue(b.dataset.ask || undefined); } });
// Robot pops up to offer help (once per session, after a short pause)
if (bubbleEl) {
  $('.robo-open', bubbleEl)?.addEventListener('click', () => openCue());
  $('.robo-x', bubbleEl)?.addEventListener('click', () => { bubbleEl.hidden = true; });
  let seen = false; try { seen = sessionStorage.getItem('pbag-robo'); sessionStorage.setItem('pbag-robo', 1); } catch {}
  if (!seen && !location.pathname.includes('staff')) setTimeout(() => { if (!cue.classList.contains('open')) { bubbleEl.hidden = false; $('.robo')?.classList.add('wave'); setTimeout(() => { bubbleEl.hidden = true; }, 14000); } }, 5000);
}
