// Tiny static-site build: src/pages/*.html + partials -> public/*.html
// Page files start with a JSON header line: <!--{"title":"..","desc":"..","nav":"tickets","js":"tickets"}-->
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const { SEED_EVENTS, SUBSIDIARIES } = await import('../server/content.js');
const SITE = 'https://pbagco.com';
import { mapHtml } from './i18n/segment.mjs';
const PARENT = { ithaka: 'shows', theatre: 'shows', tickets: 'shows', events: 'services', aifilm: 'services', consultancy: 'services', book: 'services', nlp: 'services' };
const eventLd = SEED_EVENTS.flatMap((e) => e.performances.map((p) => ({
  '@context': 'https://schema.org', '@type': 'TheaterEvent', name: e.title, description: e.description, startDate: p.startsAt,
  eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: { '@type': 'Place', name: e.venue, address: { '@type': 'PostalAddress', addressLocality: e.venue.split(',').pop().trim(), addressCountry: 'KE' } },
  organizer: { '@type': 'PerformingGroup', name: SUBSIDIARIES.find((x) => x.slug === e.subsidiary)?.name || 'PBAG Consortium', url: SITE },
  image: [e.poster ? `${SITE}/assets/img/og-ithaka.jpg` : `${SITE}/assets/img/og-image.jpg`],
  ...(e.crew ? { director: { '@type': 'Person', name: e.crew[0].name }, contributor: e.crew.map((c) => ({ '@type': 'Person', name: c.name, jobTitle: c.role })) } : {}),
  offers: e.tiers.map((t) => ({ '@type': 'Offer', name: t.name, price: t.price, priceCurrency: 'KES', availability: 'https://schema.org/InStock', url: `${SITE}/tickets?event=${e.slug}`, ...(t.salesStart ? { validFrom: t.salesStart } : {}), ...(t.salesEnd ? { validThrough: t.salesEnd } : {}) })),
})));
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const sitemap = [];
const pub = path.resolve(here, '../public');
const V = Date.now().toString(36); // cache-buster for /assets
const part = (n, lang = 'en') => { const f = path.join(here, 'partials', `${n}${lang === 'sw' ? '.sw' : ''}.html`); return fs.readFileSync(fs.existsSync(f) ? f : path.join(here, 'partials', n + '.html'), 'utf8'); };
const icon = (s) => s.replace(/\{\{i:([\w-]+)(?:\s+([\w-]+))?\}\}/g, (_, n, c) => `<svg class="i${c ? ' ' + c : ''}" aria-hidden="true"><use href="/assets/img/icons.svg#i-${n}"/></svg>`);
// Kiswahili: every public page is rendered a second time under /sw/ from the English source,
// using the segment dictionary in src/i18n/sw/*.json (fill/refresh it with `npm run translate`).
const SW = Object.assign({}, ...fs.readdirSync(path.join(here, 'i18n', 'sw')).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(here, 'i18n', 'sw', f), 'utf8'))));
const swMissing = new Set(); const SWOUT = new Set(Object.values(SW));
const tr = (s) => { if (s in SW) return SW[s]; if (!SWOUT.has(s)) swMissing.add(s); return null; };
const SWLINK = /(href=")\/(about|subsidiaries|theatre|tickets|book|consultancy|contact|ithaka|heritage-map|ai-film|events|auditions|nlp|governance)?((?:[?#][^"]*)?")/g;
const EN_ONLY = new Set(['staff.html']);
const allPages = fs.readdirSync(path.join(here, 'pages')).filter((f) => f.endsWith('.html'));
const swPages = new Set(allPages.filter((f) => !EN_ONLY.has(f)));
fs.mkdirSync(path.join(pub, 'sw'), { recursive: true });
const jobs = [...allPages.map((f) => ['en', f]), ...[...swPages].map((f) => ['sw', f])];
for (const [lang, f] of jobs) {
  let src = fs.readFileSync(path.join(here, 'pages', f), 'utf8');
  const m = src.match(/^<!--(\{.*?\})-->\n?/);
  const meta = m ? JSON.parse(m[1]) : {};
  if (lang === 'sw') { if (meta.title) meta.title = tr(meta.title) ?? meta.title; if (meta.desc) meta.desc = tr(meta.desc) ?? meta.desc; }
  src = src.slice(m ? m[0].length : 0);
  const slug = f.replace('.html', '');
  const pth = (l, sl) => (l === 'sw' ? '/sw/' : '/') + (sl === 'index' ? '' : sl);
  const url = SITE + pth(lang, slug);
  const altLang = lang === 'sw' ? 'en' : 'sw';
  const hasAlt = lang === 'sw' || swPages.has(f);
  const altPath = hasAlt ? pth(altLang, slug) : pth(altLang, 'index');
  const hreflang = hasAlt && !meta.noindex ? `<link rel="alternate" hreflang="en" href="${SITE + pth('en', slug)}"><link rel="alternate" hreflang="sw" href="${SITE + pth('sw', slug)}"><link rel="alternate" hreflang="x-default" href="${SITE + pth('en', slug)}">` : '';
  let html = part('layout')
    .replace('{{head}}', part('head', lang) + hreflang)
    .replace('{{header}}', meta.bare ? '' : part('header', lang))
    .replace('{{footer}}', meta.bare ? '' : part('footer', lang))
    .replace('{{body}}', src)
    .replaceAll('{{title}}', meta.title || 'PBAG Consortium')
    .replaceAll('{{desc}}', meta.desc || 'PBAG Consortium — Peers Best Art Group. Theatre, comedy, talent and civic leadership from Limuru, Kenya.')
    .replaceAll('{{url}}', url)
    .replaceAll('{{robots}}', meta.noindex ? 'noindex, nofollow' : 'index, follow')
    .replaceAll('{{bodyclass}}', meta.bodyclass || '')
    // One module URL per page; page modules import ./app.js, so app.js always has a single URL (no ?v) => one instance.
    .replaceAll('{{pagejs}}', `<script type="module" src="/assets/js/${meta.js || 'app'}.js"></script>`)
    .replaceAll('{{curtains}}', meta.curtains ? '<div class="curtains" aria-hidden="true"><i></i><i></i></div>' : '')
    .replaceAll('{{og}}', meta.og || '/assets/img/og-image.jpg')
    .replaceAll('{{v}}', V)
    .replaceAll('{{lang}}', lang)
    .replaceAll('{{locale}}', lang === 'sw' ? 'sw_KE' : 'en_KE')
    .replaceAll('{{alt}}', altPath)
    .replaceAll('{{altlang}}', altLang)
    .replaceAll('{{altlabel}}', lang === 'sw' ? 'English' : 'Kiswahili')
    .replaceAll('{{altshort}}', lang === 'sw' ? 'EN' : 'SW');
  if (lang === 'sw') {
    html = mapHtml(html, tr)
      .replace(SWLINK, (a, h, pg, rest) => (a.includes('hreflang') ? a : `${h}/sw/${pg || ''}${rest}`));
    html = html.replace(/<a [^>]*hreflang="en"[^>]*>/g, (tag) => tag.replace('href="/sw/', 'href="/')); // keep the EN switch pointing at English
  }
  html = html.replace(/data-nav="([\w-]+)"/g, (s, n) => (n === meta.nav || n === PARENT[meta.nav] ? `${s} aria-current="page"` : s));
  // Structured data
  let extra = '';
  if (slug !== 'index') extra += ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: (meta.title || slug).split(/ [—|] /)[0], item: url }].map((x) => (x.position === 1 && lang === 'sw' ? { ...x, name: 'Nyumbani', item: SITE + '/sw/' } : x)) });
  if (slug === 'index' || slug === 'tickets' || slug === 'events') extra += eventLd.map(ld).join('');
  if (meta.schema === 'article') extra += ld({ '@context': 'https://schema.org', '@type': 'Article', inLanguage: lang, headline: 'Ithaka cia Kamĩrĩĩthũ — The Story of Kamĩrĩĩthũ, Limuru', author: { '@type': 'Organization', name: 'PBAG Community Theatre' }, contributor: [{ '@type': 'Person', name: 'Boni Kanyuira', jobTitle: 'Director & Executive Producer' }, { '@type': 'Person', name: 'Samuel Gitonga', jobTitle: 'Producer' }, { '@type': 'Person', name: 'Mwaniki Njache', jobTitle: 'Head Writer' }], publisher: { '@type': 'Organization', name: 'PBAG Consortium', logo: { '@type': 'ImageObject', url: SITE + '/assets/img/logos/pbag-consortium.png' } }, datePublished: '2026-10-21', image: [SITE + '/assets/img/og-image.jpg'], about: ['Kamĩrĩĩthũ', 'Limuru', 'Lari Massacre', 'Mau Mau', 'Ngũgĩ wa Thiong\'o', 'Kiambu County'], mainEntityOfPage: url });
  html = html.replace('</head>', extra + '\n</head>');
  if (!meta.noindex) sitemap.push(`<url><loc>${url}</loc>${hasAlt ? `<xhtml:link rel="alternate" hreflang="en" href="${SITE + pth('en', slug)}"/><xhtml:link rel="alternate" hreflang="sw" href="${SITE + pth('sw', slug)}"/>` : ''}<changefreq>${slug === 'tickets' || slug === 'index' ? 'daily' : 'weekly'}</changefreq><priority>${slug === 'index' ? '1.0' : slug === 'ithaka' || slug === 'tickets' ? '0.9' : '0.7'}</priority></url>`);
  fs.writeFileSync(path.join(pub, lang === 'sw' ? 'sw' : '', f), icon(html));
}
fs.writeFileSync(path.join(pub, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${sitemap.join('')}</urlset>\n`);
if (swMissing.size) fs.writeFileSync(path.join(here, 'i18n', 'missing-sw.json'), JSON.stringify([...swMissing], null, 1)); else fs.rmSync(path.join(here, 'i18n', 'missing-sw.json'), { force: true });
if (swMissing.size) console.warn(`[i18n] ${swMissing.size} Kiswahili segment(s) missing — run \`npm run translate\`:\n  ` + [...swMissing].slice(0, 40).map((x) => x.slice(0, 120)).join('\n  '));
console.log('built', V, `(${jobs.length} pages: en + sw)`);
