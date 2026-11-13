"""PBAG logo family in the official format (as on the Ithaka cia Kamĩrĩĩthũ poster):
purple wordmark whose "A" is a brushed blue ring holding the two theatre masks, blue name line beneath.
Vector redraw — replace with PBAG's own master artwork when available.
Run: python3 scripts/logos.py [path-to-montserrat-files]  -> public/assets/img/logos/*.svg"""
import os, re, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FD = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/buildtools/node_modules/@fontsource/montserrat/files'
OUT = os.path.join(ROOT, 'public/assets/img/logos'); os.makedirs(OUT, exist_ok=True)
FONTS = {w: TTFont(os.path.join(FD, f'montserrat-latin-{w}-normal.woff2')) for w in (500, 600)}
PURPLE, BLUE, WHITE = '#6D2C82', '#1F6FBF', '#FFFFFF'


def text(s, w, size, x, y, fill, track=0):
    f = FONTS[w]; gs = f.getGlyphSet(); cmap = f.getBestCmap(); sc = size / f['head'].unitsPerEm; hm = f['hmtx']
    adv = 0; parts = []
    for i, ch in enumerate(s):
        g = cmap.get(ord(ch))
        if g and ch != ' ':
            pen = SVGPathPen(gs); gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, x + adv, y)))
            parts.append(re.sub(r'(\d+\.\d{2})\d+', r'\1', pen.getCommands()))
        adv += (hm[g][0] * sc if g else size * .3) + (track if i < len(s) - 1 else 0)
    return f'<path fill="{fill}" d="{" ".join(parts)}"/>', adv


def emblem(cx, cy, r):
    """Brushed ring + comedy/tragedy masks, centred at (cx, cy) with outer radius r."""
    k = r / 50.0

    def P(d):
        return re.sub(r'-?\d+\.?\d*', lambda m: f'{float(m.group()) * k:.2f}', d)
    ri = r * .86
    ring = (f'<path fill="{BLUE}" fill-rule="evenodd" d="M{cx - r:.2f} {cy:.2f}a{r:.2f} {r:.2f} 0 1 0 {2 * r:.2f} 0a{r:.2f} {r:.2f} 0 1 0 {-2 * r:.2f} 0Z'
            f'M{cx - ri - r * .05:.2f} {cy - r * .05:.2f}a{ri:.2f} {ri:.2f} 0 1 0 {2 * ri:.2f} 0a{ri:.2f} {ri:.2f} 0 1 0 {-2 * ri:.2f} 0Z"/>')
    T = f'transform="translate({cx:.2f} {cy:.2f})"'
    tail = f'<path fill="{BLUE}" {T} d="{P("M26 34 C34 38 44 46 52 50 C54 44 50 34 42 24 C38 30 32 33 26 34Z")}"/>'
    m1 = P('M-30 -16 C-22 -22 -10 -22 -2 -16 C0 2 -4 20 -16 28 C-28 20 -32 2 -30 -16Z')
    m2 = P('M2 -24 C10 -30 24 -30 32 -24 C34 -6 30 12 18 20 C6 12 0 -6 2 -24Z')
    f1 = P('M-25 -8 q4 -4 8 0 q-4 3 -8 0Z M-13 -8 q4 -4 8 0 q-4 3 -8 0Z M-24 6 q8 10 16 0 q-8 4 -16 0Z')
    f2 = P('M7 -16 q4 -4 8 0 q-4 3 -8 0Z M19 -16 q4 -4 8 0 q-4 3 -8 0Z M9 6 q8 -9 16 0 q-8 -4 -16 0Z')
    g = (f'<g {T}><path fill="{BLUE}" d="{m2}"/><path fill="{WHITE}" d="{f2}"/>'
         f'<path fill="{PURPLE}" stroke="{WHITE}" stroke-width="{1.6 * k:.2f}" d="{m1}"/><path fill="{WHITE}" d="{f1}"/></g>')
    return ring + tail + g


def wordmark(pre, post, sub, size=92):
    """`pre` + emblem + `post` in purple, `sub` in blue beneath. Returns (body, w, h), origin 0,0."""
    cap = size * .70; base = cap + 6; x = 0; body = ''
    if pre:
        p, w = text(pre, 500, size, x, base, PURPLE, track=size * .02); body += p; x += w + size * .07
    r = cap * .56; body += emblem(x + r, base - cap / 2, r); x += 2 * r + size * .12
    if post:
        p, w = text(post, 500, size, x, base, PURPLE, track=size * .02); body += p; x += w
    W = x
    ssize = size * .50; _, sw = text(sub, 600, ssize, 0, 0, BLUE)
    track = max(0, min((W - sw) / max(1, len(sub) - 1), ssize * .28))
    _, sw2 = text(sub, 600, ssize, 0, 0, BLUE, track)
    if sw2 > W:  # long names: shrink to the wordmark width
        ssize *= W / sw2; track = 0; _, sw2 = text(sub, 600, ssize, 0, 0, BLUE)
    sy = base + ssize * .72 + size * .16
    p, _ = text(sub, 600, ssize, (W - sw2) / 2, sy, BLUE, track); body += p
    return body, W, sy + size * .08


def svg(w, h, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'


def write(name, s):
    open(os.path.join(OUT, name), 'w').write(s)


SET = [
    ('pbag-consortium', 'PBAG Consortium', 'PB', 'G', 'CONSORTIUM'),
    ('pbag-community-theatre', 'PBAG Theatre', 'PB', 'G', 'THEATRE'),
    ('pbag-bunge', 'PBAG Bunge', 'PB', 'G', 'BUNGE'),
    ('peers-got-talanta', 'Peers Got Talanta (PGT)', '', 'PGT', 'PEERS GOT TALANTA'),
    ('peatice-productions', 'Peatice Productions', '', 'PEATICE', 'PRODUCTIONS'),
]
mark = svg(120, 120, f'<circle cx="60" cy="60" r="60" fill="{WHITE}"/>' + emblem(56, 58, 42), 'PBAG emblem')
for slug, title, pre, post, sub in SET:
    body, w, h = wordmark(pre, post, sub)
    px, py = 26, 20
    # transparent, for light backgrounds
    write(f'{slug}-light.svg', svg(w + 8, h + 6, f'<g transform="translate(4 3)">{body}</g>', title + ' logo'))
    # white plate, for dark backgrounds (as on the poster)
    plate = f'<rect width="{w + 2 * px:.0f}" height="{h + 2 * py:.0f}" rx="18" fill="{WHITE}"/><g transform="translate({px} {py})">{body}</g>'
    write(f'{slug}.svg', svg(w + 2 * px, h + 2 * py, plate, title + ' logo'))
    write(f'{slug}-mark.svg', mark)
body, w, h = wordmark('PB', 'G', 'CONSORTIUM')
write('pbag-consortium-compact.svg', svg(w + 28, h + 20, f'<rect width="{w + 28:.0f}" height="{h + 20:.0f}" rx="14" fill="{WHITE}"/><g transform="translate(14 10)">{body}</g>', 'PBAG Consortium'))
print('logos written to', OUT)
