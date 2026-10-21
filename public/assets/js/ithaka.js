import { $, $$, api, esc, icon, fmt, kes, t } from './app.js';

export const CATS = {
  culture: [t('Culture & memory'), '#ffc23d'], colonial: [t('Colonial economy & admin'), '#b07a4a'], land: [t('Land & removals'), '#e0703c'],
  memorial: [t('Conflict & memorial'), '#c0392b'], forest: [t('Forests & Mau Mau'), '#4f8a4a'], resistance: [t('Resistance & chiefs'), '#8b5cf6'],
  sacred: [t('Sacred & natural'), '#22c7b8'], nature: [t('Natural landmark'), '#5aa9e6'], physical: [t('Physical features'), '#0e9f8e'],
};
const base = (window.PBAG_STATIC?.base || '/');

// 3D hero — only when visible, WebGL available and not on save-data
(() => {
  const c = $('#ith3d'); if (!c) return;
  const gl = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
  if (!gl || navigator.connection?.saveData) { c.remove(); return; }
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return; io.disconnect();
    try { const m = await import('./ithaka3d.js'); m.start(c, $('#clanTip')); document.querySelector('.ith-hero').classList.add('live'); }
    catch (err) { console.warn('3D unavailable', err); c.remove(); }
  });
  io.observe(c);
})();

// Lite YouTube cards
$$('.video-card[data-yt]').forEach((el) => {
  const id = el.dataset.yt;
  el.innerHTML = `<button type="button" class="facade" aria-label="Play ${esc(el.dataset.title)}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="play">${icon('play')}</span><span class="np"><small class="muted">${t('Watch')}</small><b>${esc(el.dataset.title)}</b></span></button>`;
  el.querySelector('button').addEventListener('click', () => { el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${esc(el.dataset.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`; });
});

// Gazetteer of historic sites
(async () => {
  const g = $('#siteGrid'); if (!g) return;
  try {
    const d = await fetch(base + 'data/heritage.json').then((r) => r.json());
    g.innerHTML = d.sites.map((s) => `<article class="site-card" style="--c:${CATS[s.cat]?.[1]}">
      <span class="tag" style="background:${CATS[s.cat]?.[1]}">${esc(CATS[s.cat]?.[0] || s.cat)}</span>
      <h3>${esc(s.name)}</h3><small>${esc(s.period)}${s.approx ? ' · location approximate' : ''}</small>
      <p><b>${t('Used for:')}</b> ${esc(s.used)}</p><p class="muted">${esc(s.desc)}</p>
      <div class="row" style="justify-content:space-between"><a class="btn btn-sm" href="/heritage-map?site=${s.id}">${icon('map-pin')} On the map</a><small class="src">Source: ${esc(s.src)}</small></div></article>`).join('');
  } catch { g.innerHTML = '<p class="muted">Site list unavailable — please refresh.</p>'; }
})();

// Performances of the play
(async () => {
  const box = $('#playDates'); if (!box) return;
  try {
    const e = await api('/api/events/ithaka-cia-kamiriithu');
    box.innerHTML = `<h3>${esc(e.title)}</h3><p class="muted" style="margin:4px 0 14px">${icon('map-pin')} ${esc(e.venue)} · from <b class="gold">${kes(e.fromPrice)}</b></p>
      <div class="stack">${e.performances.map((p) => `<a class="show-row" href="/tickets?event=${e.slug}"><span class="mini" style="display:grid;place-items:center;background:var(--ink-3);text-align:center;line-height:1"><b class="display" style="font-size:1.8rem">${fmt.day(p.startsAt)}</b><small>${fmt.mon(p.startsAt)}</small></span><span><h4>${new Date(p.startsAt).toLocaleDateString('en-KE', { weekday: 'long', timeZone: 'Africa/Nairobi' })}</h4><small>${fmt.time(p.startsAt)} curtain</small></span><span class="badge">${t('Book')}</span></a>`).join('')}</div>`;
  } catch { box.innerHTML = `<h3>${t('Performances')}</h3><p class="muted">${t('Dates are being confirmed — follow PBAG or call 0720 960 180.')}</p>`; }
})();
