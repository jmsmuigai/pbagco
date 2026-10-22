import { $, $$, api, icon, esc, toast, t } from './app.js';

const screen = $('#screen'), prog = $('#programme');
const params = new URLSearchParams(location.search);
let videos = [], channel = '', current = null, mood = params.get('mood') || '';
const thumb = (id, q = 'hqdefault') => `https://i.ytimg.com/vi/${id}/${q}.jpg`;

function facade(v) {
  current = v;
  screen.innerHTML = `<button class="facade" type="button" aria-label="Play ${esc(v.title)}">
    <img src="${thumb(v.id, 'maxresdefault')}" alt="" width="1280" height="720">
    <span class="play">${icon('play')}</span>
    <span class="np"><small class="muted">Now screening · ${esc(v.channel || 'PBAG')}</small><b>${esc(v.title)}</b></span></button>`;
  const im = $('img', screen);
  im.addEventListener('error', () => { im.src = thumb(v.id); }, { once: true });
  im.addEventListener('load', () => { if (im.naturalWidth <= 120) im.src = thumb(v.id); }, { once: true }); // maxres missing -> 120px grey placeholder
  $('.facade', screen).addEventListener('click', () => roll(`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`, v.title));
  $$('.vcard').forEach((c) => c.classList.toggle('now', c.dataset.id === v.id));
}
function roll(src, title) {
  // curtains part, then the film rolls
  screen.innerHTML = `<iframe src="${src}" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="eager"></iframe>`;
  const p = $('.proscenium'); p.animate([{ filter: 'brightness(.3)' }, { filter: 'brightness(1)' }], { duration: 900, easing: 'ease-out' });
}
function channelView() {
  current = null;
  screen.innerHTML = `<button class="facade" type="button" aria-label="${t('Play PBAG channel')}"><img src="/assets/img/team-1100.webp" alt=""><span class="play">${icon('play')}</span><span class="np"><small class="muted">PBAG — Peers Best Art Group</small><b>${t('Latest uploads')}</b></span></button>`;
  $('.facade', screen).addEventListener('click', () => roll(`https://www.youtube-nocookie.com/embed/videoseries?list=${channel}&autoplay=1&rel=0`, 'PBAG channel'));
}
const SECTIONS = [
  { key: 'pbag', title: 'PBAG Originals', kicker: t('From our own stage'), note: 'Sketches, stage plays, poetry and festival moments by PBAG RAW, PBAG Community Theatre, PBAG Generation and PGT.' },
  { key: 'kenya', title: t('Kenyan Comedy Greats'), kicker: t('The scene we celebrate'), note: 'Hand-picked from the official channels of Kenya’s best-loved comics and shows.' },
];
function card(v) {
  return `<button class="vcard reveal in" type="button" data-id="${esc(v.id)}">
      <span class="vthumb"><img src="${thumb(v.id, 'mqdefault')}" alt="" loading="lazy" width="320" height="180">
        ${v.section === 'pbag' ? `<span class="ribbon">${t('PBAG Original')}</span>` : ''}<span class="pv">${icon('play')} ${t('Preview')}</span><span class="vplay">${icon('play')}</span></span>
      <h4>${esc(v.title)}</h4><small>${esc(v.channel || '')}</small>
    </button>`;
}
function render() {
  const list = mood ? videos.filter((v) => v.mood?.includes(mood)) : videos;
  const shown = list.length ? list : videos;
  prog.innerHTML = SECTIONS.map((sec) => {
    const vs = shown.filter((v) => (v.section || 'kenya') === sec.key);
    if (!vs.length) return '';
    return `<section class="rail"><div class="rail-head"><div><span class="scene-no">${sec.kicker}</span><h3 class="display rail-title">${sec.title} <span class="count">${vs.length}</span></h3><p class="muted">${sec.note}</p></div>
      ${sec.key === 'pbag' ? `<a class="btn btn-sm" href="https://www.youtube.com/channel/UCFV2mTNumJFcQG6-s-xg_Ew?sub_confirmation=1" target="_blank" rel="noopener">${icon('youtube')} Subscribe</a>` : ''}</div>
      <div class="programme">${vs.map(card).join('')}</div></section>`;
  }).join('');
  $$('.vcard', prog).forEach((c) => {
    const id = c.dataset.id, img = $('img', c); let t, f = 0;
    // Animated preview: cycle YouTube's auto-generated frames (1/2/3.jpg) — zero video bytes.
    const start = () => { clearInterval(t); t = setInterval(() => { f = (f % 3) + 1; img.src = thumb(id, String(f)); }, 650); };
    const stop = () => { clearInterval(t); f = 0; img.src = thumb(id, 'mqdefault'); };
    img.addEventListener('load', () => { if (img.naturalWidth && img.naturalWidth <= 120) c.closest('.vcard').hidden = true; }); // unavailable video -> hide
    c.addEventListener('mouseenter', start); c.addEventListener('mouseleave', stop);
    c.addEventListener('touchstart', start, { passive: true }); c.addEventListener('touchend', stop);
    c.addEventListener('click', () => { stop(); facade(videos.find((v) => v.id === id)); history.replaceState(null, '', `?v=${id}`); scrollTo({ top: 0, behavior: 'smooth' }); });
  });
  if (current) $$('.vcard').forEach((c) => c.classList.toggle('now', c.dataset.id === current.id));
}

$('#moods').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mood]'); if (!b) return;
  mood = b.dataset.mood; $$('#moods [data-mood]').forEach((x) => x.classList.toggle('on', x === b)); render();
});
$$('[data-tab]').forEach((t) => t.addEventListener('click', () => {
  $$('[data-tab]').forEach((x) => x.setAttribute('aria-selected', x === t));
  t.dataset.tab === 'channel' ? channelView() : facade(current || videos[0]);
}));
$('#lights').addEventListener('click', (e) => {
  const on = document.body.classList.toggle('lights-down'); e.currentTarget.setAttribute('aria-pressed', on);
  e.currentTarget.innerHTML = `${icon(on ? 'lightbulb' : 'lightbulb-off')} ${on ? t('Lights up') : t('House lights')}`;
});
$('#share').addEventListener('click', async () => {
  const url = location.href;
  try { if (navigator.share) await navigator.share({ title: 'PBAG Virtual Theatre', url }); else { await navigator.clipboard.writeText(url); toast('Link copied — share the laughs!'); } } catch {}
});

(async () => {
  try { ({ videos, channelPlaylist: channel } = await api('/api/videos')); } catch { prog.innerHTML = `<p class="muted">${t('The programme couldn’t load. Please refresh.')}</p>`; return; }
  if (mood) $$('#moods [data-mood]').forEach((x) => x.classList.toggle('on', x.dataset.mood === mood));
  render();
  facade(videos.find((v) => v.id === params.get('v')) || videos[0]);
})();
