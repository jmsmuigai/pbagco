// HTML → translatable segments, and back. Used by the build (to render /sw/ pages from the
// English source + src/i18n/sw.json) and by scripts/translate.mjs (to fill sw.json via Gemini).
// A "segment" is a run of text and inline tags inside one block, so word order can change freely.
const INLINE = new Set(['a', 'span', 'em', 'strong', 'b', 'i', 'br', 'small', 'abbr', 'mark', 'sup', 'sub', 'code', 'time', 'q', 'cite', 'u', 's', 'kbd', 'wbr']);
const RAW = new Set(['script', 'style', 'svg', 'template', 'textarea', 'pre']);
const ATTRS = ['alt', 'title', 'placeholder', 'aria-label', 'data-tip', 'data-label'];
const META = /^(description|og:title|og:description|twitter:title|twitter:description)$/;
const ICON = /^((?:\s|\{\{i:[\w -]+\}\})*)([\s\S]*?)((?:\s|\{\{i:[\w -]+\}\})*)$/;
export const norm = (s) => s.replace(/\s+/g, ' ').trim();
const worthy = (s) => /\p{L}{2,}/u.test(s.replace(/<[^>]+>/g, '').replace(/\{\{[^}]+\}\}/g, '').replace(/&\w+;/g, ''));

function tokenize(html) {
  const out = []; const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g; let last = 0, m;
  while ((m = re.exec(html))) {
    if (m.index > last) out.push({ t: 'text', s: html.slice(last, m.index) });
    if (m[0].startsWith('<!--')) out.push({ t: 'raw', s: m[0] });
    else {
      const name = m[2].toLowerCase(); const tok = { t: m[1] ? 'close' : 'open', name, s: m[0], self: !!m[3] || name === 'br' || name === 'wbr' };
      out.push(tok);
      if (!m[1] && RAW.has(name)) { // swallow raw content
        const end = html.toLowerCase().indexOf(`</${name}`, re.lastIndex); const stop = end < 0 ? html.length : end;
        out.push({ t: 'raw', s: html.slice(re.lastIndex, stop) }); re.lastIndex = stop;
      }
    }
    last = re.lastIndex;
  }
  if (last < html.length) out.push({ t: 'text', s: html.slice(last) });
  return out;
}
const isInline = (k) => k.t === 'text' || ((k.t === 'open' || k.t === 'close') && INLINE.has(k.name));

// Walk a run of inline tokens: if it has text at depth 0 it's one segment, else recurse into children.
function runSegments(toks, fn) {
  let depth = 0, top = '';
  for (const k of toks) { if (k.t === 'text' && depth === 0) top += k.s; if (k.t === 'open' && !k.self) depth++; if (k.t === 'close') depth--; }
  if (depth !== 0 || norm(top.replace(/\{\{i:[\w -]+\}\}/g, '')) || toks.length < 2) return segment(toks.map((k) => k.s).join(''), fn);
  let out = '', i = 0;
  while (i < toks.length) {
    const k = toks[i];
    if (k.t === 'open' && !k.self) {
      let d = 0, j = i;
      for (; j < toks.length; j++) { if (toks[j].t === 'open' && !toks[j].self) d++; if (toks[j].t === 'close') d--; if (d === 0) break; }
      out += k.s + runSegments(toks.slice(i + 1, j), fn) + (toks[j]?.s || ''); i = j + 1;
    } else { out += k.s; i++; }
  }
  return out;
}
function segment(html, fn) {
  const [, pre, body, post] = html.match(ICON);
  if (!worthy(body)) return html;
  const r = fn(norm(body));
  return pre + (r == null ? body : r) + post;
}

// fn(englishSegment) => translation | null(keep). Returns new HTML.
export function mapHtml(html, fn) {
  const toks = tokenize(html); let out = '', run = [];
  const flush = () => {
    if (!run.length) return;
    // unmatched open/close tags (element began or ends outside this run) act as separators
    const st = [], bad = new Set();
    run.forEach((k, i) => { if (k.t === 'open' && !k.self) st.push(i); else if (k.t === 'close') { if (st.length && run[st.at(-1)].name === k.name) st.pop(); else bad.add(i); } });
    st.forEach((i) => bad.add(i));
    let sub = [];
    run.forEach((k, i) => { if (bad.has(i)) { if (sub.length) out += runSegments(sub, fn); sub = []; out += k.s; } else sub.push(k); });
    if (sub.length) out += runSegments(sub, fn);
    run = [];
  };
  for (const k of toks) { if (isInline(k)) run.push(k); else { flush(); out += k.s; } }
  flush();
  // attributes (after text so segment keys contain English attribute values)
  return out.replace(/<([a-zA-Z][\w-]*)\b([^>]*)>/g, (tag, name, attrs) => {
    if (RAW.has(name.toLowerCase()) && name.toLowerCase() !== 'svg') return tag;
    const isMeta = name.toLowerCase() === 'meta' && META.test((attrs.match(/(?:name|property)="([^"]+)"/) || [])[1] || '');
    return tag.replace(/\s([\w-]+)="([^"]*)"/g, (a, k, v) => {
      if (!(ATTRS.includes(k) || (isMeta && k === 'content')) || !worthy(v)) return a;
      const r = fn(norm(v)); return r == null ? a : ` ${k}="${r.replace(/"/g, '&quot;')}"`;
    });
  });
}
export function extract(html) { const set = new Set(); mapHtml(html, (s) => { set.add(s); return null; }); return [...set]; }
