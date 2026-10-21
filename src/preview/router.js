// Single-file preview router: every page lives in <section data-page>; internal links switch sections.
const pages = [...document.querySelectorAll('[data-page]')];
function go(href, push = true) {
  const u = new URL(href, 'https://pbagco.com');
  let name = u.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'index';
  if (!pages.some((p) => p.dataset.page === name)) name = 'index';
  pages.forEach((p) => (p.hidden = p.dataset.page !== name));
  document.querySelectorAll('[data-nav]').forEach((a) => (a.dataset.nav === name ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  document.title = document.querySelector(`[data-page="${name}"]`).dataset.title;
  const q = u.searchParams;
  setTimeout(() => {
    if (name === 'tickets' && q.get('event')) document.querySelector(`#showList [data-slug="${q.get('event')}"]`)?.click();
    if (name === 'theatre' && q.get('v')) document.querySelector(`.vcard[data-id="${q.get('v')}"]`)?.click();
    if (name === 'theatre' && q.get('mood')) document.querySelector(`#moods [data-mood="${q.get('mood')}"]`)?.click();
    if (name === 'book' && q.get('service')) document.querySelector(`#services [data-s="${q.get('service')}"]`)?.click();
    if (name === 'tickets' && u.hash.startsWith('#verify=')) { location.hash = u.hash; }
    const id = u.hash.slice(1);
    const el = id && !id.includes('=') && document.getElementById(id);
    el ? el.scrollIntoView() : scrollTo(0, 0);
    document.querySelectorAll('.reveal').forEach((r) => r.classList.add('in'));
  }, 60);
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]'); if (!a) return;
  const h = a.getAttribute('href');
  if (h.startsWith('/') && !h.startsWith('//')) { e.preventDefault(); go(h); }
  else if (h.startsWith('#') && h.length > 1 && !document.getElementById(h.slice(1))?.closest('[data-page]:not([hidden])')) { /* in-page anchor on another page: ignore */ }
});
go('/');
