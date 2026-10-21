// Reusable month calendar. mode 'events': highlight days with shows (coloured dots).
// mode 'availability': every future day selectable except `busy` dates.
import { icon, fmt } from './app.js';
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function Calendar(el, opts) {
  const o = { mode: 'events', marks: {}, busy: new Set(), legend: [], minLead: 0, onSelect: () => {}, ...opts };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const first = o.start ? new Date(o.start + 'T00:00:00') : today;
  let view = new Date(first.getFullYear(), first.getMonth(), 1);
  let selected = o.selected || null;
  const minDate = new Date(today.getTime() + o.minLead * 864e5);

  function draw() {
    const y = view.getFullYear(), m = view.getMonth();
    const startPad = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < startPad; i++) cells += '<span class="cal-day out"></span>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d), key = ymd(date), cls = ['cal-day'];
      const past = date < (o.mode === 'availability' ? minDate : today);
      const marks = o.marks[key] || [];
      if (past) cls.push('past');
      if (+date === +today) cls.push('today');
      if (o.mode === 'events' && marks.length) cls.push('has');
      if (o.mode === 'availability' && !past) cls.push(o.busy.has(key) ? 'busy' : 'free');
      if (selected === key) cls.push('sel');
      const clickable = !past && ((o.mode === 'events' && marks.length) || (o.mode === 'availability' && !o.busy.has(key)));
      const label = date.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' }) + (marks.length ? ` — ${marks.map((x) => x.label).join(', ')}` : '') + (o.busy.has(key) ? ' — unavailable' : '');
      cells += `<${clickable ? 'button type="button"' : 'span'} class="${cls.join(' ')}" data-d="${key}" aria-label="${label}" ${selected === key ? 'aria-pressed="true"' : ''}>${d}${marks.length ? `<span class="dots">${marks.slice(0, 3).map((x) => `<i style="--dc:${x.color}"></i>`).join('')}</span>` : ''}</${clickable ? 'button' : 'span'}>`;
    }
    const canPrev = new Date(y, m, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
    el.innerHTML = `<div class="cal">
      <div class="cal-head"><h3>${view.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}</h3>
        <div class="row"><button type="button" data-nav="-1" aria-label="Previous month" ${canPrev ? '' : 'disabled style="opacity:.3"'}>${icon('chevron-left')}</button><button type="button" data-nav="1" aria-label="Next month">${icon('chevron-right')}</button></div></div>
      <div class="cal-grid">${DOW.map((d) => `<span class="cal-dow">${d}</span>`).join('')}${cells}</div>
      ${o.legend.length ? `<div class="cal-legend">${o.legend.map((l) => `<span><i style="--dc:${l.color}"></i>${l.label}</span>`).join('')}</div>` : ''}
    </div>`;
  }
  el.addEventListener('click', (e) => {
    const n = e.target.closest('[data-nav]');
    if (n && !n.disabled) { view = new Date(view.getFullYear(), view.getMonth() + Number(n.dataset.nav), 1); draw(); return; }
    const d = e.target.closest('button.cal-day');
    if (d) { selected = selected === d.dataset.d && o.mode === 'events' ? null : d.dataset.d; draw(); o.onSelect(selected); }
  });
  draw();
  return {
    set(next) { Object.assign(o, next); draw(); },
    select(key) { selected = key; if (key) { const d = new Date(key + 'T00:00:00'); view = new Date(d.getFullYear(), d.getMonth(), 1); } draw(); },
    get selected() { return selected; },
  };
}
export { ymd };
