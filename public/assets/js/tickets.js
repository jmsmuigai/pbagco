// Box office: what's on, dates, prices — and a hand-off to PBAG's ticketing partner (Ticketvort).
import { $, api, esc, icon, kes, fmt, poster, t } from './app.js';
import { Calendar } from './calendar.js';

const S = { events: [], ev: null };
const body = $('#stepBody');
let cal;

function marks() {
  const m = {};
  for (const e of S.events) for (const p of e.performances) (m[fmt.ymd(p.startsAt)] ||= []).push({ color: e.palette[0], label: e.title });
  return m;
}
function renderList(dateKey) {
  const list = dateKey ? S.events.filter((e) => e.performances.some((p) => fmt.ymd(p.startsAt) === dateKey)) : S.events;
  $('#listTitle').textContent = dateKey ? `${t('Shows on')} ${fmt.short(dateKey + 'T12:00:00+03:00')}` : t('All upcoming shows');
  $('#clearDate').hidden = !dateKey;
  $('#showList').innerHTML = list.map((e) => `
    <button class="show-row${S.ev?.id === e.id ? ' on' : ''}" type="button" data-slug="${e.slug}">
      <span class="mini">${poster(e, { compact: true })}</span>
      <span><h4>${esc(e.title)}</h4><small>${fmt.short(e.performances[0].startsAt)}${e.performances.length > 1 ? ` · ${e.performances.length} ${t('shows')}` : ` · ${fmt.time(e.performances[0].startsAt)}`}</small><small>${esc(e.venue)}</small></span>
      <span class="price" style="font-size:1.1rem"><small>${t('from')}</small>${kes(e.fromPrice)}</span>
    </button>`).join('') || `<p class="muted">${t('No shows on this date.')}</p>`;
}
$('#showList').addEventListener('click', (e) => { const b = e.target.closest('[data-slug]'); if (b) pick(b.dataset.slug, cal.selected); });
$('#clearDate').addEventListener('click', () => { cal.select(null); renderList(null); });

const tierNote = (x) => x.gateOnly ? t('At the venue on the day')
  : x.salesEnd && new Date(x.salesEnd) < new Date() ? t('Sales closed')
  : x.salesEnd ? `${t('until')} ${fmt.short(x.salesEnd)}` : t('On sale now');

function pick(slug, dateKey, scroll = true) {
  const ev = S.events.find((e) => e.slug === slug); if (!ev) return;
  S.ev = ev;
  $('#coPoster').innerHTML = poster(ev); $('#coHead').classList.remove('empty');
  $('#coCat').textContent = `${ev.category} · ${ev.subsidiaryName}`;
  $('#coTitle').textContent = ev.title;
  $('#coTag').textContent = ev.tagline || '';
  $('#coDesc').textContent = ev.description;
  renderList(cal.selected);
  if (scroll) history.replaceState(null, '', `?event=${slug}${location.hash}`);

  const wa = `https://wa.me/254720960180?text=${encodeURIComponent(`Hi PBAG, I would like tickets for ${ev.title}`)}`;
  const cta = ev.ticketUrl
    ? `<a class="btn btn-gold btn-ticket btn-lg" href="${esc(ev.ticketUrl)}" target="_blank" rel="noopener" data-buy>${icon('ticket')} ${t('Buy tickets on')} ${esc(ev.ticketVendor || 'Ticketvort')} ${icon('external-link')}</a>
       <p class="muted" style="margin:10px 0 0;font-size:.88rem">${icon('shield-check')} ${t('You will pay and receive your ticket on the secure site of our ticketing partner.')}</p>`
    : `<a class="btn btn-gold btn-lg" href="${wa}" target="_blank" rel="noopener">${icon('whatsapp')} ${t('Reserve on WhatsApp')}</a>
       <p class="muted" style="margin:10px 0 0;font-size:.88rem">${t('Online sales for this event are not open yet — reserve by WhatsApp or call')} <a class="gold" href="tel:+254720960180">0720 960 180</a>.</p>`;
  body.innerHTML = `
    <div class="grid g2 show-info" style="align-items:start;gap:18px">
      <div>
        <h3 class="h3" style="font-size:1.05rem;margin:0 0 10px">${icon('calendar-days')} ${t('Dates & times')}</h3>
        <div class="perf-chips">${ev.performances.map((p) => `<span class="perf-chip${dateKey && fmt.ymd(p.startsAt) === dateKey ? ' on' : ''}"><b>${fmt.short(p.startsAt)}</b><small>${fmt.time(p.startsAt)}</small></span>`).join('')}</div>
        <p class="muted" style="margin:14px 0 0">${icon('map-pin')} ${esc(ev.venue)}</p>
        ${ev.crew ? `<p class="muted" style="margin:6px 0 0;font-size:.9rem">${ev.crew.map((c) => `${esc(c.name)} — ${esc(t(c.role))}`).join(' · ')}</p>` : ''}
      </div>
      <div>
        <h3 class="h3" style="font-size:1.05rem;margin:0 0 10px">${icon('ticket')} ${t('Ticket prices')}</h3>
        <div class="tier-list">${ev.tiers.map((x) => `<div class="tier static${x.salesEnd && new Date(x.salesEnd) < new Date() ? ' off' : ''}"><div><b>${esc(t(x.name))}</b><small>${tierNote(x)}</small></div><span class="price">${kes(x.price)}</span></div>`).join('')}</div>
      </div>
    </div>
    <div class="buy-bar">${cta}</div>
    ${ev.slug === 'ithaka-cia-kamiriithu' ? `<p style="margin:16px 0 0"><a class="gold" href="${(window.PBAG_STATIC?.base || '/') + (document.documentElement.lang === 'sw' ? 'sw/' : '')}ithaka">${icon('book-open')} ${t('Read the story behind the play')} →</a></p>` : ''}`;
  if (scroll && innerWidth < 960) $('#checkout').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

(async () => {
  try { S.events = await api('/api/events'); } catch { $('#showList').innerHTML = `<p class="muted">${t('The programme couldn’t load. Please refresh.')}</p>`; return; }
  const legend = S.events.map((e) => ({ color: e.palette[0], label: e.title }));
  const want = new URLSearchParams(location.search).get('event');
  const first = S.events.find((e) => e.slug === want) || S.events[0];
  cal = Calendar($('#cal'), { mode: 'events', marks: marks(), legend, start: first && fmt.ymd(first.performances[0].startsAt), onSelect: (d) => {
    renderList(d);
    if (d) { const evs = S.events.filter((e) => e.performances.some((p) => fmt.ymd(p.startsAt) === d)); if (evs.length) pick((evs.find((e) => e.id === S.ev?.id) || evs[0]).slug, d); }
  } });
  renderList(null);
  if (first) pick(first.slug, null, false);
})();
