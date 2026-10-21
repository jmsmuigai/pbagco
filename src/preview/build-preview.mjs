// Builds dist/pbagco-preview.html — the whole site in ONE offline file (mock API, simulated payments).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..'), pub = path.join(root, 'public');
const b64 = (f, mime) => `data:${mime};base64,${fs.readFileSync(f).toString('base64')}`;
const MIME = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', woff2: 'font/woff2' };
const inlineAssets = (s) => s.replace(/\/assets\/(img|fonts)\/([\w.-]+\.(webp|png|jpg|woff2))/g, (m, d, f, ext) => b64(path.join(pub, 'assets', d, f), MIME[ext]))
  .replaceAll('/assets/img/icons.svg#', '#');
const js = (await build({ entryPoints: [path.join(here, 'entry.js')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020' })).outputFiles[0].text;
const pages = ['index', 'about', 'subsidiaries', 'theatre', 'tickets', 'book', 'consultancy', 'contact'];
const main = (f) => { const h = fs.readFileSync(path.join(pub, f + '.html'), 'utf8'); return { body: h.split('<main id="main">')[1].split('</main>')[0], title: h.match(/<title>(.*?)<\/title>/)[1] }; };
const idx = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
const header = idx.slice(idx.indexOf('<header'), idx.indexOf('<main'));
const footer = idx.slice(idx.indexOf('</main>') + 7, idx.indexOf('<script type="module"'));
const sections = pages.map((p) => { const m = main(p); return `<section data-page="${p}" data-title="${m.title.replace(/"/g, '&quot;')}" hidden>${m.body}</section>`; }).join('\n');
const css = fs.readFileSync(path.join(pub, 'assets/css/site.css'), 'utf8');
const sprite = fs.readFileSync(path.join(pub, 'assets/img/icons.svg'), 'utf8');
const gallery = fs.readFileSync(path.join(pub, 'data/gallery.json'), 'utf8');
const vendor = fs.readFileSync(path.join(pub, 'assets/vendor/qrcode.js'), 'utf8') + '\n;window.qrcode=qrcode;\n' + fs.readFileSync(path.join(pub, 'assets/vendor/jspdf.umd.min.js'), 'utf8');
let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PBAG Consortium — preview</title>
<style>${css}
.preview-flag{position:fixed;left:12px;bottom:12px;z-index:96;background:#ffc23d;color:#1a1205;font:700 12px/1.3 'DM Sans',sans-serif;padding:7px 12px;border-radius:999px;box-shadow:0 8px 20px rgba(0,0,0,.5)}</style></head>
<body>${sprite}<a class="skip" href="#main">Skip to content</a><div class="curtains" aria-hidden="true"><i></i><i></i></div>${header}<main id="main">${sections}</main>${footer}
<div class="preview-flag">Preview · payments simulated</div>
<script>window.PBAG_STATIC={};window.__GALLERY__=${gallery};<\/script><script>${vendor.replace(/<\/script/gi, '<\\/script')}<\/script><script>${js.replace(/<\/script/gi, '<\\/script')}<\/script></body></html>`;
html = inlineAssets(html);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/pbagco-preview.html'), html);
console.log('dist/pbagco-preview.html', (html.length / 1024 / 1024).toFixed(2) + ' MB');
