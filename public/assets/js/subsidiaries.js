import { $$, api, poster, esc, icon } from './app.js';
(async () => {
  const [gal, events] = await Promise.all([fetch('/data/gallery.json').then((r) => r.json()).catch(() => ({})), api('/api/events').catch(() => [])]);
  for (const el of $$('[data-gallery]')) {
    const slug = el.dataset.gallery, g = gal[slug] || {};
    const tiles = [];
    for (const e of events.filter((x) => x.subsidiary === slug)) tiles.push(`<a href="/tickets?event=${e.slug}" aria-label="${esc(e.title)} tickets">${poster(e)}</a>`);
    for (const p of g.photos || []) tiles.push(`<div><img src="${esc(p.src)}" alt="${esc(p.alt || '')}" loading="lazy" decoding="async" style="object-position:${esc(p.pos || 'center')}"></div>`);
    for (const v of g.videos || []) tiles.push(`<a href="/theatre?v=${esc(v)}" style="position:relative"><img src="https://i.ytimg.com/vi/${esc(v)}/hqdefault.jpg" alt="" loading="lazy"><span class="badge" style="position:absolute;left:10px;bottom:10px">${icon('play')} Watch</span></a>`);
    tiles.push(`<a class="g-cta" href="https://www.youtube.com/channel/UCFV2mTNumJFcQG6-s-xg_Ew" target="_blank" rel="noopener">${icon('youtube', 'i-lg')}<b style="color:#fff">More on PBAG’s YouTube</b><span>Performances, behind-the-scenes and festival highlights</span></a>`);
    el.innerHTML = tiles.join('');
  }
})();
