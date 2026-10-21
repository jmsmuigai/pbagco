// Fill/refresh the Kiswahili dictionary with Gemini.
//   GEMINI_API_KEY=... npm run translate            -> translate only missing segments
//   GEMINI_API_KEY=... npm run translate -- --all   -> re-translate everything (review the diff!)
// Output: src/i18n/sw/50-gemini.json (later files override earlier ones at build time).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from '../src/i18n/segment.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const key = process.env.GEMINI_API_KEY; if (!key) { console.error('Set GEMINI_API_KEY (e.g. from Secret Manager: gcloud secrets versions access latest --secret=GEMINI_API_KEY)'); process.exit(1); }
const MODEL = process.env.GEMINI_MODEL?.split(',')[0] || 'gemini-2.5-pro';
const dir = path.join(root, 'src/i18n/sw'); const OUT = path.join(dir, '50-gemini.json');
const have = Object.assign({}, ...fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== '50-gemini.json').sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const segs = new Set();
for (const f of ['partials/header.html', 'partials/footer.html', 'partials/layout.html', ...fs.readdirSync(path.join(root, 'src/pages')).filter((f) => f.endsWith('.html') && f !== 'staff.html').map((f) => 'pages/' + f)]) {
  let s = fs.readFileSync(path.join(root, 'src', f), 'utf8'); const m = s.match(/^<!--(\{.*?\})-->\n?/);
  if (m) { const meta = JSON.parse(m[1]); [meta.title, meta.desc].filter(Boolean).forEach((x) => segs.add(x)); s = s.slice(m[0].length); }
  extract(s).forEach((x) => segs.add(x));
}
const todo = [...segs].filter((s) => process.argv.includes('--all') || !(s in have || s in out));
console.log(`${segs.size} segments, ${todo.length} to translate with ${MODEL}`);
const PROMPT = `You translate the website of PBAG Consortium (Peers Best Art Group), a community theatre, comedy and talent organisation in Limuru, Kenya, from English into clear, natural standard Kiswahili (Kiswahili sanifu) as used in Kenya.
Rules: keep every HTML tag and attribute exactly as given (translate only human-readable text); keep names of people, places, organisations, products and Gĩkũyũ words unchanged; keep numbers, dates, phone numbers, emails and URLs; keep {{...}} placeholders; warm, respectful tone.
Return ONLY a JSON object mapping each input string (verbatim) to its translation.`;
for (let i = 0; i < todo.length; i += 40) {
  const batch = todo.slice(i, i + 40);
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: PROMPT + '\n\nInput:\n' + JSON.stringify(batch) }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }),
  });
  if (!r.ok) { console.error('Gemini', r.status, (await r.text()).slice(0, 300)); process.exit(1); }
  const j = await r.json(); const txt = (j.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text).join('');
  const map = JSON.parse(txt);
  for (const s of batch) if (typeof map[s] === 'string' && (s.match(/</g) || []).length === (map[s].match(/</g) || []).length) out[s] = map[s]; else console.warn('skipped (tag mismatch or missing):', s.slice(0, 70));
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/","/g, '",\n"')); console.log(`  ${Math.min(i + 40, todo.length)}/${todo.length}`);
}
console.log('Done. Rebuild with `npm run build` and review src/i18n/sw/50-gemini.json.');
