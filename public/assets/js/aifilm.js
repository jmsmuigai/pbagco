import { $, $$, api, esc, icon } from './app.js';
const STAGES = [
  { tool: 'NotebookLM', c: '#4285f4', label: 'Research', i: 'search' },
  { tool: 'Gemini', c: '#8b5cf6', label: 'Script', i: 'wand-sparkles' },
  { tool: 'Nano Banana', c: '#ffc23d', label: 'Storyboard', i: 'sparkles' },
  { tool: 'Veo + Flow', c: '#f2456e', label: 'Previz', i: 'clapperboard' },
  { tool: 'Gemini + Nano Banana', c: '#ff8a3d', label: 'Campaign', i: 'megaphone' },
  { tool: 'AI Studio + Antigravity → Cloud Run', c: '#34d399', label: 'Launch', i: 'globe' },
];
const P = {
  ithaka: { title: 'Ithaka cia Kamĩrĩĩthũ', palette: ['#2a1730', '#d9773a', '#f2b25c'], topic: 'land, memory and the village theatre of Kamĩrĩĩthũ',
    lines: [
      'Grounded notebook built from 12 sources: Lari, Tigoni removals, the chiefs, Kamĩrĩĩthũ centre (1976–82). 41 cited facts flagged for elder review.',
      'Logline: "On a Limuru ridge, three generations fight for the same soil — and for the right to tell its story." 9-scene beat sheet in Gĩkũyũ & English.',
      '6 boards: dawn ridge · mũgumo council · 1939 removal · forest night · village stage · return of the land. Character sheets kept consistent.',
      '6 × 8-second previz shots generated for the opening sequence; director marks 2 for re-shoot, 4 approved.',
      'Key art + 3 social cut-downs; captions in Gĩkũyũ, Kiswahili, English. Every asset labelled "AI-assisted".',
      'Ticket page, schools booking form and Cue FAQ updated; deployed to Cloud Run. Human sign-off ✓ at every stage.'],
    shots: ['Dawn over the ridge', 'Council at the mũgumo', '1939: the removal', 'Forest at night', 'The village stage', 'The land returns'] },
  comedy: { title: 'Peatice Comedy Night', palette: ['#13204a', '#2f6fd6', '#8b5cf6'], topic: 'matatu life and Limuru market banter',
    lines: [
      'Audience insights from last season\'s ticket and social data: top themes — matatu, campus life, in-laws.',
      '20 sketch premises generated; writers keep 5 and punch them up live in the writers\' room.',
      'Thumbnail and poster concepts in Peatice colours; comics\' approved likenesses only.',
      '15-second vertical teaser assembled from 4 generated shots + real rehearsal clips.',
      'Posting calendar with seller referral codes for each influencer.',
      'Event page live with M-Pesa checkout and QR tickets; gate scanner ready. Human sign-off ✓.'],
    shots: ['Matatu at rush hour', 'Market banter', 'Campus hostel', 'In-laws arrive', 'Mic drop', 'Full house'] },
  pgt: { title: 'PGT Festival — Season 7', palette: ['#3a2005', '#f2a516', '#e8445a'], topic: 'young talent rising in Ndeiya',
    lines: [
      'Past seasons summarised: categories, winners and community partners.',
      'Call-for-auditions script and radio spot in Kiswahili and Gĩkũyũ.',
      'Festival identity: trophy motif, Ndeiya landscapes, category icons.',
      'Hype reel previz: 6 shots mixing generated transitions with archive footage.',
      'Registration campaign with QR posters for Royoh & Kamangu centres.',
      'Registration and voting pages deployed; results dashboard for judges. Human sign-off ✓.'],
    shots: ['Ndeiya plains', 'Auditions queue', 'Dance crew', 'Comedy round', 'Tech & digital', 'Crowning night'] },
};
let proj = 'ithaka', running = false;
const pipe = $('#pipeline'), cons = $('#simConsole'), board = $('#simBoard');
pipe.innerHTML = STAGES.map((s, i) => `<li style="--c:${s.c}" data-i="${i}"><span class="node">${icon(s.i)}</span><b>${s.label}</b><small>${s.tool}</small><i class="bar"><i></i></i></li>`).join('');

function frame(ctx, w, h, pal, seed, label) {
  const rnd = (n) => { seed = (seed * 9301 + 49297) % 233280; return (seed / 233280) * n; };
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, pal[0]); g.addColorStop(.65, pal[1]); g.addColorStop(1, pal[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,240,200,.85)'; ctx.beginPath(); ctx.arc(rnd(w), h * (.25 + rnd(.25)), 14 + rnd(18), 0, 7); ctx.fill();
  for (let l = 0; l < 3; l++) {
    ctx.fillStyle = `rgba(10,8,16,${.35 + l * .25})`; ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * (.55 + l * .12) + Math.sin(x * .03 + rnd(6)) * (10 - l * 2));
    ctx.lineTo(w, h); ctx.fill();
  }
  const n = 1 + Math.floor(rnd(4));
  for (let k = 0; k < n; k++) { // silhouettes
    const x = w * (.2 + rnd(.6)), y = h * .82, s = 16 + rnd(10);
    ctx.fillStyle = '#07050a'; ctx.beginPath(); ctx.arc(x, y - s * 2.1, s * .35, 0, 7); ctx.fill(); ctx.fillRect(x - s * .3, y - s * 1.8, s * .6, s * 1.6);
  }
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, h - 22, w, 22); ctx.fillStyle = '#fff'; ctx.font = '600 11px DM Sans, sans-serif'; ctx.fillText(label, 8, h - 7);
}
function renderBoard(p, upto) {
  board.innerHTML = p.shots.map((s, i) => `<figure class="${i < upto ? 'on' : ''}"><canvas width="240" height="135"></canvas><figcaption>Shot ${i + 1}</figcaption></figure>`).join('');
  $$('canvas', board).forEach((c, i) => frame(c.getContext('2d'), 240, 135, p.palette, (i + 3) * 97 + p.title.length, p.shots[i]));
}
async function run() {
  if (running) return; running = true; $('#simRun').disabled = true;
  const p = P[proj]; cons.innerHTML = `<p class="gold"><b>▶ ${esc(p.title)}</b> — production run started</p>`; renderBoard(p, 0);
  $$('li', pipe).forEach((li) => li.className = '');
  // Live touch: a Gemini-written tagline (falls back to a sample offline)
  const live = api('/api/ai/spark', { method: 'POST', body: { kind: 'tagline', topic: p.topic } }).catch(() => null);
  for (let i = 0; i < STAGES.length; i++) {
    const li = $(`li[data-i="${i}"]`, pipe); li.className = 'run';
    await new Promise((r) => setTimeout(r, 1100));
    li.className = 'done';
    cons.insertAdjacentHTML('beforeend', `<p><span class="tagc" style="background:${STAGES[i].c}">${STAGES[i].label}</span> ${esc(p.lines[i])}</p>`);
    if (i === 2) renderBoard(p, 6);
    if (i === 3) $$('figure', board).forEach((f) => f.classList.add('moving'));
    if (i === 4) { const r = await live; if (r?.text) cons.insertAdjacentHTML('beforeend', `<p class="spark"><b>${r.offline ? 'Sample' : 'Live Gemini'} taglines:</b><br>${esc(r.text).replace(/\n/g, '<br>')}</p>`); }
    cons.scrollTop = cons.scrollHeight;
  }
  cons.insertAdjacentHTML('beforeend', `<p class="ok">✓ Ready for opening night. <a href="/book?service=ai" class="gold">Want this pipeline for your production? Talk to PBAG →</a></p>`);
  running = false; $('#simRun').disabled = false;
}
$('#simRun').addEventListener('click', run);
$$('#simProjects [data-p]').forEach((b) => b.addEventListener('click', () => { if (running) return; proj = b.dataset.p; $$('#simProjects [data-p]').forEach((x) => x.setAttribute('aria-selected', x === b)); renderBoard(P[proj], 0); cons.innerHTML = '<p class="muted">Press <b>Run production</b> to start.</p>'; $$('li', pipe).forEach((li) => li.className = ''); }));
renderBoard(P[proj], 0);
