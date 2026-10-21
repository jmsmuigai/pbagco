import { $, $$, api, poster, stub, observeReveals, icon, esc } from './app.js';

// Now-showing marquee carousel + upcoming grid
(async () => {
  const board = $('#board'), grid = $('#eventGrid');
  let events = [];
  try { events = await api('/api/events'); } catch { grid.innerHTML = '<p class="muted">The programme is loading slowly — please refresh, or call 0720 960 180.</p>'; return; }
  grid.innerHTML = events.map(stub).join('');
  observeReveals(grid);
  if (!events.length) return;

  board.innerHTML = events.map((e, i) => `<a class="slide${i ? '' : ' on'}" href="/tickets?event=${e.slug}" aria-label="${esc(e.title)} — get tickets" ${i ? 'tabindex="-1"' : ''}>${poster(e)}</a>`).join('') +
    `<div class="board-nav">${events.map((e, i) => `<button type="button" class="${i ? '' : 'on'}" aria-label="Show ${esc(e.title)}"></button>`).join('')}</div>`;
  const slides = $$('.slide', board), dots = $$('.board-nav button', board);
  let i = 0, timer;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const go = (n) => {
    slides[i].classList.remove('on'); slides[i].tabIndex = -1; dots[i].classList.remove('on');
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('on'); slides[i].tabIndex = 0; void dots[i].offsetWidth; dots[i].classList.add('on');
  };
  const play = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => go(i + 1), 6000); };
  dots.forEach((d, n) => d.addEventListener('click', (ev) => { ev.preventDefault(); go(n); play(); }));
  board.addEventListener('mouseenter', () => clearInterval(timer));
  board.addEventListener('mouseleave', play);
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : play()));
  play();
})();

// Virtual theatre teaser: first programme thumbnail as a facade
(async () => {
  const s = $('#teaserScreen'); if (!s) return;
  try {
    const { videos } = await api('/api/videos');
    const v = videos[0]; if (!v) return;
    s.innerHTML = `<div class="facade"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360"><span class="play">${icon('play')}</span><div class="np"><small class="muted">Now screening</small><b>${esc(v.title)}</b></div></div>`;
  } catch {}
})();
