// Static build for GitHub Pages (or any static host): public/ -> _site/
// The Node API is replaced by an in-browser stand-in (src/preview/mock.js), so this
// build is a PREVIEW: payments are simulated and tickets are watermarked "not valid".
// BASE = path the site is served from, e.g. "/pbaginternational/" (project page) or "/" (custom domain).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '..');
const BASE = (process.env.BASE || '/').replace(/^\/?/, '/').replace(/\/?$/, '/');
const out = path.join(root, '_site');
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'public'), out, { recursive: true });
fs.rmSync(path.join(out, 'staff.html'), { force: true }); // staff console needs the real API

await build({ entryPoints: [path.join(here, 'preview/mock.js')], bundle: true, format: 'iife', minify: true, outfile: path.join(out, 'assets/js/static-mock.js'), target: 'es2020' });

const SEG = 'manifest.webmanifest|assets|api|data|about|subsidiaries|theatre|tickets|book|consultancy|contact|ithaka|heritage-map|ai-film|events|t/';
const rebase = (s) => s
  .replace(new RegExp(`(["'\`(,]\\s?)/(${SEG})`, 'g'), `$1${BASE}$2`)
  .replace(/(href|src|action)="\/"/g, `$1="${BASE}"`);
const banner = `<div class="preview-flag" role="note">Preview site · ticket sales open soon — payments are simulated</div>`;
const head = `<script>window.PBAG_STATIC={base:${JSON.stringify(BASE)},persist:true}</script><script src="${BASE}assets/js/static-mock.js"></script>
<style>.preview-flag{position:fixed;left:12px;bottom:12px;z-index:96;max-width:calc(100vw - 120px);background:#ffc23d;color:#1a1205;font:700 12px/1.3 'DM Sans',sans-serif;padding:7px 12px;border-radius:999px;box-shadow:0 8px 20px rgba(0,0,0,.5)}</style>`;

for (const f of fs.readdirSync(out, { recursive: true })) {
  const p = path.join(out, f);
  if (fs.statSync(p).isDirectory() || p.includes('/vendor/') || p.endsWith('static-mock.js')) continue;
  if (/\.(html|css|js|json|webmanifest|txt|xml)$/.test(p)) {
    let s = fs.readFileSync(p, 'utf8');
    if (p.endsWith('.html')) {
      s = s.replace(/<a href="\/staff"[^>]*>Staff<\/a> · /, '');
      s = rebase(s).replace('</head>', head + '\n</head>').replace('</body>', banner + '\n</body>');
    } else if (!/\.(txt|xml)$/.test(p)) s = rebase(s);
    fs.writeFileSync(p, s);
  }
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n'); // keep preview out of search engines
console.log(`_site built for BASE=${BASE}`);
