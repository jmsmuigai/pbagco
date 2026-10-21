import { $, $$, api, esc, icon, fmt, t } from './app.js';
import { Calendar } from './calendar.js';

const st = { svc: null, date: null, slot: null };
const params = new URLSearchParams(location.search);
let services = [], cal;

function renderServices() {
  $('#services').innerHTML = services.map((s) => `<button type="button" class="svc${st.svc?.id === s.id ? ' on' : ''}" data-s="${s.id}" aria-pressed="${st.svc?.id === s.id}">${icon(s.icon)}<b>${esc(s.name)}</b><small>${esc(s.note)}</small><small class="gold">${esc(s.duration)}</small></button>`).join('');
}
function renderSlots() {
  $('#slotWrap').hidden = !(st.svc && st.date);
  $('#slots').innerHTML = (st.svc?.slots || []).map((s) => `<button type="button" class="chip${st.slot === s ? ' on' : ''}" data-slot="${esc(s)}">${esc(s)}</button>`).join('');
  $('#sumSvc').textContent = st.svc?.name || '—';
  $('#sumDate').textContent = st.date ? fmt.date(st.date + 'T12:00:00+03:00') : t('Pick a date');
  $('#sumSlot').textContent = st.slot || '—';
}
$('#services').addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (!b) return; st.svc = services.find((s) => s.id === b.dataset.s); st.slot = null; renderServices(); renderSlots(); });
$('#slots').addEventListener('click', (e) => { const b = e.target.closest('[data-slot]'); if (!b) return; st.slot = b.dataset.slot; renderSlots(); });

const ics = (b) => {
  const d = b.date.replace(/-/g, '');
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PBAG//Booking//EN', 'BEGIN:VEVENT', `UID:${b.id}@pbagco.com`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${d}`, `SUMMARY:PBAG booking request ${b.id} (${st.svc.name})`, 'DESCRIPTION:Pending confirmation by PBAG — 0720 960 180', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'));
};

$('#bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const m = $('#bMsg'); m.className = 'form-msg err';
  const b = { service: st.svc?.id, date: st.date, slot: st.slot, name: $('#fName').value.trim(), org: $('#fOrg').value.trim(), phone: $('#fPhone').value.trim(), email: $('#fEmail').value.trim(), location: $('#fLoc').value.trim(), audience: $('#fAud').value, notes: $('#fNotes').value.trim(), website: $('#fWeb').value };
  if (!b.service) return (m.textContent = t('Choose a service first.'));
  if (!b.date) return (m.textContent = t('Pick a date on the calendar.'));
  if (!b.name) return (m.textContent = t('Please add your name.'));
  if (!b.phone && !b.email) return (m.textContent = t('Add a phone number or email so we can confirm.'));
  const btn = $('#bSubmit'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sending…';
  try {
    const r = await api('/api/bookings', { method: 'POST', body: b });
    $('#bookForm').innerHTML = `<div class="stack" style="text-align:center;place-items:center;padding:20px 0">
      <span class="icon-tile" style="--c:var(--ok);margin:0">${icon('calendar-check', 'i-lg')}</span>
      <h2 class="display" style="font-size:2.4rem">${t('Request received')}</h2>
      <p class="muted">${t('Reference ')}<b class="gold">${esc(r.id)}</b> · ${esc(st.svc.name)} on ${fmt.date(b.date + 'T12:00:00+03:00')}${b.slot ? ' · ' + esc(b.slot) : ''}. The PBAG team will confirm with you shortly.</p>
      <div class="row" style="justify-content:center"><a class="btn btn-sm" download="PBAG-${r.id}.ics" href="${ics({ ...b, id: r.id })}">${icon('calendar-days')} Save to calendar</a><a class="btn btn-sm btn-gold" target="_blank" rel="noopener" href="https://wa.me/254720960180?text=${encodeURIComponent(`Hi PBAG, following up on booking ${r.id}`)}">${icon('whatsapp')} Follow up on WhatsApp</a></div></div>`;
  } catch (err) { m.textContent = err.message; btn.disabled = false; btn.innerHTML = `${icon('send')} Send booking request`; }
});

(async () => {
  const [site, busy] = await Promise.all([api('/api/site'), api('/api/bookings/busy').catch(() => [])]);
  services = site.bookingServices;
  st.svc = services.find((s) => s.id === params.get('service')) || null;
  renderServices();
  cal = Calendar($('#bcal'), { mode: 'availability', busy: new Set(busy), minLead: 2, legend: [{ color: '#ffc23d', label: 'Selected' }, { color: '#6f6b86', label: 'Unavailable / PBAG show' }], onSelect: (d) => { st.date = d; renderSlots(); } });
  renderSlots();
})();
