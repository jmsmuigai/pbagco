import { $, $$, api, esc, icon, t } from './app.js';
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


/* ---------- Film manager simulation ---------- */
const COLS = [['dev', 'Development'], ['pre', 'Pre-production'], ['prod', 'Production'], ['post', 'Post-production'], ['dist', 'Distribution']];
const TASKS = [
  { id: 't1', title: 'Script breakdown', tool: 'Gemini', col: 'dev', c: '#8b5cf6', log: 'Gemini broke the 12-page script into 9 scenes, 6 locations, 7 speaking roles and 41 props.', budget: 0, days: 0 },
  { id: 't2', title: 'Research & authenticity notes', tool: 'NotebookLM', col: 'dev', c: '#4285f4', log: 'NotebookLM grounded the story in Ndeiya oral history; 3 details flagged for elders to confirm.', budget: 15000 },
  { id: 't3', title: 'Casting from PBAG auditions', tool: 'AI Studio app', col: 'pre', c: '#22c7b8', log: 'Casting assistant matched 18 audition applicants to 7 roles; director shortlists 11 for callbacks.', budget: 40000 },
  { id: 't4', title: 'Storyboards & look book', tool: 'Nano Banana', col: 'pre', c: '#ffc23d', log: 'Nano Banana produced 36 storyboard frames and costume boards with consistent characters.', budget: 20000 },
  { id: 't5', title: 'Schedule & call sheets', tool: 'Gemini', col: 'pre', c: '#8b5cf6', log: 'Gemini grouped scenes by location and light: 4 shoot days at Ndeiya, golden-hour first. Call sheets drafted.', budget: 0, days: 4 },
  { id: 't6', title: 'Previz of the cliff sequence', tool: 'Veo + Flow', col: 'prod', c: '#f2456e', log: 'Veo/Flow generated 8 previz shots of the cliff sequence; crew uses them to plan drone and camera moves.', budget: 35000 },
  { id: 't7', title: 'Shoot (human crew)', tool: 'PBAG crew', col: 'prod', c: '#e0703c', log: 'Producer approved day 1–4 plans. Real cast and crew shoot on location — AI never replaces the performance.', budget: 260000 },
  { id: 't8', title: 'Edit assist & VFX cleanup', tool: 'Gemini + Flow', col: 'post', c: '#ff8a3d', log: 'Rough-cut notes generated from the script; sky replacements and clean-ups prototyped in Flow.', budget: 60000 },
  { id: 't9', title: 'Subtitles: Kiswahili & Gĩkũyũ', tool: 'Gemini', col: 'post', c: '#8b5cf6', log: 'Subtitles drafted in Kiswahili and Gĩkũyũ, then corrected by native-speaker reviewers.', budget: 10000 },
  { id: 't10', title: 'Poster & trailer cut-downs', tool: 'Nano Banana + Veo', col: 'dist', c: '#ffc23d', log: 'Key art and 3 vertical teasers produced; all labelled as AI-assisted.', budget: 25000 },
  { id: 't11', title: 'Screening page & tickets', tool: 'Antigravity → Cloud Run', col: 'dist', c: '#34d399', log: 'Screening event, M-Pesa ticketing and Cue FAQ deployed to Cloud Run.', budget: 15000 },
];
const fmBoard = document.querySelector('#fmBoard');
if (fmBoard) {
  const state = Object.fromEntries(TASKS.map((x) => [x.id, 'todo']));
  const draw = () => {
    fmBoard.innerHTML = COLS.map(([k, n]) => `<div class="fm-col"><h4>${t(n)}</h4>${TASKS.filter((x) => x.col === k).map((x) => `<div class="fm-card ${state[x.id]}" style="--c:${x.c}"><b>${t(x.title)}</b><small>${x.tool}</small><i class="fm-st">${state[x.id] === 'done' ? '✓ ' + t('approved') : state[x.id] === 'run' ? t('agent working…') : t('to do')}</i></div>`).join('')}</div>`).join('');
  };
  const gantt = document.querySelector('#fmGantt');
  const drawGantt = (n) => { gantt.innerHTML = `<h4>${t('Schedule')}</h4>` + COLS.map(([k, name], i) => `<div class="g-row"><span>${t(name)}</span><i style="--s:${i * 18}%;--w:${n > i ? 22 : 0}%;--c:${['#8b5cf6', '#22c7b8', '#f2456e', '#ff8a3d', '#34d399'][i]}"></i></div>`).join('') + `<div class="g-axis"><span>${t('Week')} 1</span><span>3</span><span>5</span><span>7</span><span>9</span></div>`; };
  draw(); drawGantt(0);
  let busy = false;
  document.querySelector('#fmRun').addEventListener('click', async () => {
    if (busy) return; busy = true; const log = document.querySelector('#fmLog'); log.innerHTML = '';
    let budget = 0, done = 0, days = 0;
    TASKS.forEach((x) => (state[x.id] = 'todo')); draw();
    for (const x of TASKS) {
      state[x.id] = 'run'; draw(); await new Promise((r) => setTimeout(r, 700));
      state[x.id] = 'done'; done++; budget += x.budget || 0; days += x.days || 0; draw();
      log.insertAdjacentHTML('beforeend', `<p><span class="tagc" style="background:${x.c}">${x.tool}</span> ${t(x.log)} <em class="ok">✓ ${t('Producer approved')}</em></p>`); log.scrollTop = log.scrollHeight;
      document.querySelector('#fmProg').textContent = Math.round((done / TASKS.length) * 100) + '%';
      document.querySelector('#fmBudget').textContent = 'KES ' + budget.toLocaleString('en-KE');
      document.querySelector('#fmDays').textContent = days || '—'; document.querySelector('#fmAppr').textContent = done;
      drawGantt(COLS.findIndex(([k]) => k === x.col) + 1);
    }
    log.insertAdjacentHTML('beforeend', `<p class="ok"><b>✓ ${t('Ready for the premiere.')}</b> <a class="gold" href="/book?service=ai">${t('Want this workflow for your film? Contact PBAG →')}</a></p>`);
    busy = false;
  });
}
