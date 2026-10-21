import { $, $$, api, esc, icon, fmt, t } from './app.js';
const CATS = ['acting', 'comedy', 'singing', 'dance', 'poetry', 'music', 'film', 'content', 'tech'];
const LABEL = { acting: '🎭 Acting', comedy: '😂 Comedy', singing: '🎤 Singing', dance: '💃 Dance', poetry: '📜 Poetry', music: '🎶 Music', film: '🎬 Film', content: '📱 Content', tech: '💻 Tech' };
const picks = (el) => { el.innerHTML = CATS.map((c) => `<button type="button" class="chip" data-c="${c}" aria-pressed="false">${t(LABEL[c])}</button>`).join(''); el.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); } }); };
const chosen = (el) => $$('.chip.on', el).map((b) => b.dataset.c);
picks($('#aCats')); picks($('#sCats'));
const daysLeft = (d) => Math.ceil((new Date(d + 'T23:59:00+03:00') - Date.now()) / 864e5);
let calls = [];
(async () => {
  try { calls = await api('/api/auditions'); } catch { $('#callGrid').innerHTML = `<p class="muted">${t('Calls are loading slowly — please refresh.')}</p>`; return; }
  $('#callGrid').innerHTML = calls.map((a) => { const left = daysLeft(a.deadline);
    return `<article class="card aud-card" id="apply-${a.id}">
      <div class="row" style="justify-content:space-between"><span class="badge ${a.status === 'open' ? 'ok' : 'blue'}">${a.status === 'open' ? t('Open') : t('Coming soon')}</span>${left >= 0 ? `<span class="countdown">${icon('clock')} ${left} ${t('days to apply')}</span>` : `<span class="badge bad">${t('Closed')}</span>`}</div>
      <h3 class="display" style="font-size:1.7rem;margin:10px 0 4px">${esc(a.title)}</h3><small class="muted">${esc(a.by)}</small>
      <div class="meta aud-meta"><span>${icon('calendar-days')} ${fmt.date(a.date + 'T' + a.time + ':00+03:00')} · ${a.time}</span><span>${icon('map-pin')} ${esc(a.venue)}</span></div>
      <ul class="roles-list">${a.roles.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      <p class="muted" style="font-size:.92rem">${icon('info')} ${esc(a.requirements)}</p>
      <div class="row">${a.categories.map((c) => `<span class="chip">${t(LABEL[c] || c)}</span>`).join('')}</div>
      <button class="btn btn-gold mt" type="button" data-apply="${a.id}" ${a.status === 'open' && left >= 0 ? '' : 'disabled'}>${icon('send')} ${t('Apply for this call')}</button>
    </article>`; }).join('');
  $('#aCall').innerHTML = calls.filter((a) => a.status === 'open').map((a) => `<option value="${a.id}">${esc(a.title)}</option>`).join('');
  const setRoles = () => { const a = calls.find((x) => x.id === $('#aCall').value); $('#roleList').innerHTML = (a?.roles || []).map((r) => `<option value="${esc(r)}">`).join(''); };
  $('#aCall').addEventListener('change', setRoles); setRoles();
  $$('[data-apply]').forEach((b) => b.addEventListener('click', () => { $('#aCall').value = b.dataset.apply; setRoles(); $('#apply').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => $('#aName').focus(), 500); }));
  const want = location.hash.match(/apply-([\w-]+)/); if (want) { $('#aCall').value = want[1]; setRoles(); }
})();
$('#aAge').addEventListener('change', () => { $('#guardianWrap').hidden = $('#aAge').value !== 'under18'; });
$('#applyForm').addEventListener('submit', async (e) => {
  e.preventDefault(); const m = $('#aMsg'); m.className = 'form-msg err';
  const b = { auditionId: $('#aCall').value, name: $('#aName').value.trim(), phone: $('#aPhone').value.trim(), email: $('#aEmail').value.trim(), ageGroup: $('#aAge').value, categories: chosen($('#aCats')), role: $('#aRole').value, link: $('#aLink').value.trim(), bio: $('#aBio').value.trim(), location: $('#aLoc').value.trim(), consent: $('#aConsent').checked, guardianConsent: $('#aGuardian').checked, subscribe: $('#aSub').checked, website: $('#aWeb').value };
  if (!b.name || !b.phone) return (m.textContent = t('Please add your name and phone number.'));
  if (!b.ageGroup) return (m.textContent = t('Please choose your age group.'));
  if (!b.consent) return (m.textContent = t('Please tick the consent box so we can process your application.'));
  try {
    const r = await api('/api/auditions/apply', { method: 'POST', body: b });
    e.target.innerHTML = `<div class="stack" style="text-align:center;place-items:center;padding:16px 0"><span class="icon-tile" style="--c:var(--ok);margin:0">${icon('check-circle-2', 'i-lg')}</span>
      <h2 class="display" style="font-size:2.2rem">${t('Application received!')}</h2><p class="muted">${t('Your reference is')} <b class="gold mono" style="font-size:1.3rem">${esc(r.id)}</b><br>${esc(r.auditionTitle)}</p>
      <p class="muted" style="font-size:.9rem">${t('Save it — you can track your status below. Break a leg!')} 🎭</p>
      <a class="btn btn-sm" target="_blank" rel="noopener" href="https://wa.me/254720960180?text=${encodeURIComponent('Hi PBAG, I applied for ' + r.auditionTitle + ' — reference ' + r.id)}">${icon('whatsapp')} ${t('Share reference with PBAG')}</a></div>`;
    $('#tRef').value = r.id; $('#tContact').value = b.phone;
  } catch (err) { m.textContent = err.message; }
});
$('#subscribe').addEventListener('submit', async (e) => {
  e.preventDefault(); const m = $('#sMsg'); m.className = 'form-msg err';
  const c = $('#sContact').value.trim(); if (!c) return (m.textContent = t('Add a phone number or email.'));
  try { const r = await api('/api/auditions/subscribe', { method: 'POST', body: { name: $('#sName').value.trim(), ...(c.includes('@') ? { email: c } : { phone: c }), categories: chosen($('#sCats')), channel: $('[name=sChan]:checked').value, website: $('#sWeb').value } });
    m.className = 'form-msg ok'; m.textContent = r.updated ? t('Your alert preferences were updated. Asante!') : t('You are subscribed! We will alert you when a matching call opens.'); }
  catch (err) { m.textContent = err.message; }
});
const STEPS = ['submitted', 'shortlisted', 'invited', 'callback', 'selected'];
$('#track').addEventListener('submit', async (e) => {
  e.preventDefault(); const m = $('#tMsg'); m.className = 'form-msg'; m.textContent = t('Checking…');
  try {
    const r = await api('/api/auditions/status', { method: 'POST', body: { ref: $('#tRef').value, contact: $('#tContact').value } }); m.textContent = '';
    const idx = STEPS.indexOf(r.status);
    $('#tOut').innerHTML = `<p><b>${esc(r.name)}</b> · ${esc(r.auditionTitle)}</p>
      <ol class="status-track">${STEPS.map((s, i) => `<li class="${r.status === 'not_selected' ? '' : i < idx ? 'done' : i === idx ? 'on' : ''}">${t(s[0].toUpperCase() + s.slice(1))}</li>`).join('')}</ol>
      ${r.status === 'not_selected' ? `<p class="muted">${t('Thank you for auditioning. You were not selected this time — we would love to see you at the next call!')}</p>` : ''}
      ${r.slot ? `<p class="gold"><b>${icon('calendar-check')} ${t('Your audition slot')}: ${esc(r.slot)}</b> · ${esc(r.venue || '')}</p>` : ''}`;
  } catch (err) { m.className = 'form-msg err'; m.textContent = err.message; }
});
