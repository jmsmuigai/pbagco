// Tiny static-site build: src/pages/*.html + partials -> public/*.html
// Page files start with a JSON header line: <!--{"title":"..","desc":"..","nav":"tickets","js":"tickets"}-->
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
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
  html = html.replace(/data-nav="([\w-]+)"/g, (s, n) => (n === meta.nav ? `${s} aria-current="page"` : s));
  fs.writeFileSync(path.join(pub, f), icon(html));
}
console.log('built', V);
