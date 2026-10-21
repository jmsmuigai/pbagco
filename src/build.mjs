// Tiny static-site build: src/pages/*.html + partials -> public/*.html
// Page files start with a JSON header line: <!--{"title":"..","desc":"..","nav":"tickets","js":"tickets"}-->
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const { SEED_EVENTS, SUBSIDIARIES } = await import('../server/content.js');
const SITE = 'https://pbagco.com';
const PARENT = { ithaka: 'shows', theatre: 'shows', tickets: 'shows', events: 'services', aifilm: 'services', consultancy: 'services', book: 'services' };
const eventLd = SEED_EVENTS.flatMap((e) => e.performances.map((p) => ({
  '@context': 'https://schema.org', '@type': 'TheaterEvent', name: e.title, description: e.description, startDate: p.startsAt,
  eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: { '@type': 'Place', name: e.venue, address: { '@type': 'PostalAddress', addressLocality: e.venue.split(',').pop().trim(), addressCountry: 'KE' } },
  organizer: { '@type': 'PerformingGroup', name: SUBSIDIARIES.find((x) => x.slug === e.subsidiary)?.name || 'PBAG Consortium', url: SITE },
  image: [`${SITE}/assets/img/og-image.jpg`],
  offers: e.tiers.map((t) => ({ '@type': 'Offer', name: t.name, price: t.price, priceCurrency: 'KES', availability: 'https://schema.org/InStock', url: `${SITE}/tickets?event=${e.slug}` })),
})));
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const sitemap = [];
const pub = path.resolve(here, '../public');
const V = Date.now().toString(36); // cache-buster for /assets
const part = (n) => fs.readFileSync(path.join(here, 'partials', n + '.html'), 'utf8');
const icon = (s) => s.replace(/\{\{i:([\w-]+)(?:\s+([\w-]+))?\}\}/g, (_, n, c) => `<svg class="i${c ? ' ' + c : ''}" aria-hidden="true"><use href="/assets/img/icons.svg#i-${n}"/></svg>`);
for (const f of fs.readdirSync(path.join(here, 'pages')).filter((f) => f.endsWith('.html'))) {
  let src = fs.readFileSync(path.join(here, 'pages', f), 'utf8');
  const m = src.match(/^<!--(\{.*?\})-->\n?/);
  const meta = m ? JSON.parse(m[1]) : {};
  src = src.slice(m ? m[0].length : 0);
  const slug = f.replace('.html', '');
  const url = 'https://pbagco.com/' + (slug === 'index' ? '' : slug);
  let html = part('layout')
    .replace('{{head}}', part('head'))
    .replace('{{header}}', meta.bare ? '' : part('header'))
    .replace('{{footer}}', meta.bare ? '' : part('footer'))
    .replace('{{body}}', src)
    .replaceAll('{{title}}', meta.title || 'PBAG Consortium')
    .replaceAll('{{desc}}', meta.desc || 'PBAG Consortium — Peers Best Art Group. Theatre, comedy, talent and civic leadership from Limuru, Kenya.')
    .replaceAll('{{url}}', url)
    .replaceAll('{{robots}}', meta.noindex ? 'noindex, nofollow' : 'index, follow')
    .replaceAll('{{bodyclass}}', meta.bodyclass || '')
    // One module URL per page; page modules import ./app.js, so app.js always has a single URL (no ?v) => one instance.
    .replaceAll('{{pagejs}}', `<script type="module" src="/assets/js/${meta.js || 'app'}.js"></script>`)
    .replaceAll('{{curtains}}', meta.curtains ? '<div class="curtains" aria-hidden="true"><i></i><i></i></div>' : '')
    .replaceAll('{{v}}', V);
  html = html.replace(/data-nav="([\w-]+)"/g, (s, n) => (n === meta.nav || n === PARENT[meta.nav] ? `${s} aria-current="page"` : s));
  // Structured data
  let extra = '';
  if (slug !== 'index') extra += ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: (meta.title || slug).split(/ [—|] /)[0], item: url }] });
  if (slug === 'index' || slug === 'tickets' || slug === 'events') extra += eventLd.map(ld).join('');
  if (meta.schema === 'article') extra += ld({ '@context': 'https://schema.org', '@type': 'Article', headline: 'Ithaka cia Kamĩrĩĩthũ — The Story of Kamĩrĩĩthũ, Limuru', author: { '@type': 'Person', name: 'Boniface Kanyuira' }, publisher: { '@type': 'Organization', name: 'PBAG Consortium', logo: { '@type': 'ImageObject', url: SITE + '/assets/img/pbag-logo.png' } }, datePublished: '2026-10-21', image: [SITE + '/assets/img/og-image.jpg'], about: ['Kamĩrĩĩthũ', 'Limuru', 'Lari Massacre', 'Mau Mau', 'Ngũgĩ wa Thiong\'o', 'Kiambu County'], mainEntityOfPage: url, inLanguage: 'en' });
  html = html.replace('</head>', extra + '\n</head>');
  if (!meta.noindex) sitemap.push(`<url><loc>${url}</loc><changefreq>${slug === 'tickets' || slug === 'index' ? 'daily' : 'weekly'}</changefreq><priority>${slug === 'index' ? '1.0' : slug === 'ithaka' || slug === 'tickets' ? '0.9' : '0.7'}</priority></url>`);
  fs.writeFileSync(path.join(pub, f), icon(html));
}
fs.writeFileSync(path.join(pub, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemap.join('')}</urlset>\n`);
console.log('built', V);
