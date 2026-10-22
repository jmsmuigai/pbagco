"""Generate the PBAG family of logos as self-contained SVGs (text converted to paths).
Run: python3 scripts/logos.py  -> public/assets/img/logos/*.svg"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = os.path.join(ROOT, 'public/assets/fonts')
OUT = os.path.join(ROOT, 'public/assets/img/logos'); os.makedirs(OUT, exist_ok=True)
FONTS = {k: TTFont(os.path.join(F, v)) for k, v in {
  'display': 'big-shoulders-display-latin-900-normal.woff2',
  'sans': 'dm-sans-latin-800-normal.woff2',
  'sans6': 'dm-sans-latin-600-normal.woff2',
  'serif': 'instrument-serif-latin-400-italic.woff2'}.items()}

def text(s, font, size, x, y, fill, track=0, anchor='start'):
    """Return (svg_path, width) for string s, baseline at y."""
    f = FONTS[font]; gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f['head'].unitsPerEm; sc = size / upm
    hmtx = f['hmtx']; adv = 0; parts = []
    widths = []
    for ch in s:
        g = cmap.get(ord(ch)); w = hmtx[g][0] * sc if g else size * .3
        widths.append((g, w))
    total = sum(w for _, w in widths) + track * (len(s) - 1)
    if anchor == 'middle': x -= total / 2
    elif anchor == 'end': x -= total
    for g, w in widths:
        if g:
            pen = SVGPathPen(gs); tp = TransformPen(pen, (sc, 0, 0, -sc, x + adv, y)); gs[g].draw(tp)
            d = __import__('re').sub(r'(\d+\.\d{2})\d+', r'\1', pen.getCommands())
            if d: parts.append(d)
        adv += w + track
    return f'<path fill="{fill}" d="{" ".join(parts)}"/>', total

def svg(w, h, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'

GOLD, MAG, PUR, TEAL, BLUE, ORANGE, INK = '#FFC23D', '#F2456E', '#8B5CF6', '#22C7B8', '#3B82F6', '#FF8A3D', '#0A0912'

# ---------- emblems (drawn in a 120x120 box) ----------
def em_consortium():
    # four arms: four rounded petals in a pinwheel around a gold star — the Consortium's four subsidiaries
    petal = 'M60 60 C60 30 74 14 96 14 C100 36 88 56 60 60Z'
    cols = [GOLD, MAG, PUR, TEAL]
    g = ''.join(f'<path d="{petal}" fill="{c}" transform="rotate({i*90} 60 60)"/>' for i, c in enumerate(cols))
    star = 'M60 44 L64.7 55.3 L76 60 L64.7 64.7 L60 76 L55.3 64.7 L44 60 L55.3 55.3Z'
    return f'<circle cx="60" cy="60" r="58" fill="{INK}" stroke="#FFFFFF" stroke-opacity=".18" stroke-width="2"/>{g}<circle cx="60" cy="60" r="15" fill="{INK}"/><path d="{star}" fill="#fff"/>'

def em_bunge():
    cols = ''.join(f'<rect x="{30+i*13}" y="62" width="7" height="26" rx="2" fill="{GOLD}"/>' for i in range(5))
    return (f'<circle cx="60" cy="60" r="58" fill="#2A1D5C"/><circle cx="60" cy="60" r="52" fill="none" stroke="{GOLD}" stroke-opacity=".35" stroke-width="2"/>'
            f'<path d="M30 56 A30 26 0 0 1 90 56Z" fill="{GOLD}"/><rect x="57" y="22" width="6" height="10" rx="2" fill="{GOLD}"/>'
            f'<rect x="25" y="56" width="70" height="5" rx="2" fill="#fff"/>{cols}<rect x="22" y="89" width="76" height="6" rx="2" fill="#fff"/>')

def em_theatre():
    # stage arch with drawn curtains and three heads (community) in the spotlight
    return (f'<circle cx="60" cy="60" r="58" fill="#3A0D24"/>'
            f'<path d="M14 26 Q60 8 106 26 L106 34 Q60 18 14 34Z" fill="{GOLD}"/>'
            f'<path d="M14 30 C30 34 34 62 30 100 L14 100Z" fill="{MAG}"/><path d="M106 30 C90 34 86 62 90 100 L106 100Z" fill="{MAG}"/>'
            f'<path d="M60 30 L84 98 L36 98Z" fill="#fff" opacity=".12"/>'
            f'<circle cx="46" cy="66" r="7" fill="#fff"/><path d="M36 92 Q46 74 56 92Z" fill="#fff"/>'
            f'<circle cx="74" cy="66" r="7" fill="#fff"/><path d="M64 92 Q74 74 84 92Z" fill="#fff"/>'
            f'<circle cx="60" cy="58" r="8.5" fill="{GOLD}"/><path d="M48 92 Q60 70 72 92Z" fill="{GOLD}"/>'
            f'<rect x="20" y="96" width="80" height="5" rx="2" fill="{GOLD}"/>')

def em_pgt():
    import math
    pts = []
    for i in range(10):
        r = 44 if i % 2 == 0 else 19; a = -math.pi / 2 + i * math.pi / 5
        pts.append(f'{60 + r*math.cos(a):.1f} {58 + r*math.sin(a):.1f}')
    star = 'M' + ' L'.join(pts) + 'Z'
    rays = ''.join(f'<rect x="58.5" y="4" width="3" height="10" rx="1.5" fill="{GOLD}" opacity=".7" transform="rotate({i*30} 60 60)"/>' for i in range(12))
    p, _ = text('PGT', 'display', 22, 60, 67, INK, track=.5, anchor='middle')
    return f'<circle cx="60" cy="60" r="58" fill="#3D1A06"/>{rays}<path d="{star}" fill="{GOLD}" stroke="{ORANGE}" stroke-width="3" stroke-linejoin="round"/>{p}'

def em_peatice():
    # clapperboard whose slate smiles — comedy, screen and content
    stripes = ''.join(f'<path d="M{24+i*16} 30 L{34+i*16} 30 L{28+i*16} 44 L{18+i*16} 44Z" fill="{INK}"/>' for i in range(5))
    return (f'<circle cx="60" cy="60" r="58" fill="#0B2A5C"/>'
            f'<g transform="rotate(-10 22 44)"><rect x="18" y="30" width="84" height="14" rx="3" fill="#fff"/>{stripes}</g>'
            f'<rect x="18" y="48" width="84" height="48" rx="6" fill="#fff"/>'
            f'<circle cx="44" cy="66" r="5" fill="{BLUE}"/><circle cx="76" cy="66" r="5" fill="{BLUE}"/>'
            f'<path d="M40 78 Q60 94 80 78" fill="none" stroke="{TEAL}" stroke-width="6" stroke-linecap="round"/>')

# ---------- lockups ----------
def lockup(slug, title, emblem, line1, line2, tag, accent, light=False):
    fg = INK if light else '#FFFFFF'; sub = '#3B3550' if light else '#C9C3DA'
    if light: accent = {GOLD: '#A86B00', MAG: '#C2185B', ORANGE: '#C2500A', TEAL: '#0B7F75'}.get(accent, accent)
    p1, w1 = text(line1, 'display', 64, 150, 70, fg, track=1)
    p2, w2 = text(line2, 'sans', 17, 152, 98, accent, track=3.2)
    p3, w3 = text(tag, 'serif', 18, 152, 124, sub) if tag else ('', 0)
    W = int(max(150 + w1, 152 + w2, 152 + w3) + 18)
    body = f'<g transform="translate(6 10)">{emblem}</g>{p1}{p2}{p3}'
    open(os.path.join(OUT, f'{slug}{"-light" if light else ""}.svg'), 'w').write(svg(W, 140, body, title))
    if not light:
        open(os.path.join(OUT, f'{slug}-mark.svg'), 'w').write(svg(120, 120, emblem, title + ' emblem'))

SET = [
  ('pbag-consortium', 'PBAG Consortium logo', em_consortium(), 'PBAG', 'CONSORTIUM', 'Peers Best Art Group · since 2011', GOLD),
  ('pbag-bunge', 'PBAG Bunge logo', em_bunge(), 'PBAG BUNGE', 'LEAD SUBSIDIARY · GOVERNANCE', 'Lead. Oversee. Account.', GOLD),
  ('pbag-community-theatre', 'PBAG Community Theatre logo', em_theatre(), 'PBAG', 'COMMUNITY THEATRE', 'Stories from the soil we stand on', MAG),
  ('peers-got-talanta', 'Peers Got Talanta (PGT) logo', em_pgt(), 'PEERS GOT TALANTA', 'PGT · COMMUNITY BASED ORGANISATION', 'Discover. Nurture. Shine.', ORANGE),
  ('peatice-productions', 'Peatice Productions logo', em_peatice(), 'PEATICE', 'PRODUCTIONS', 'Comedy · Screen · Content', TEAL),
]
for s in SET:
    lockup(*s); lockup(*s, light=True)
print('logos written to', OUT)

# compact header lockup (no tagline) for the site header and footer
p1, w1 = text('PBAG', 'display', 70, 138, 72, '#FFFFFF', track=1)
p2, w2 = text('CONSORTIUM', 'sans', 15.5, 140, 100, GOLD, track=3.6)
W = int(max(138 + w1, 140 + w2) + 8)
open(os.path.join(OUT, 'pbag-consortium-compact.svg'), 'w').write(svg(W, 120, f'<g>{em_consortium()}</g>{p1}{p2}', 'PBAG Consortium'))
