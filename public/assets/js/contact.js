import { $, api, esc, t } from './app.js';
api('/api/site').then((s) => { $('#faq').innerHTML = s.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join(''); }).catch(() => {});
$('#contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const o = $('#cOut'); o.className = 'form-msg err';
  const b = { name: $('#cName').value.trim(), phone: $('#cPhone').value.trim(), email: $('#cEmail').value.trim(), subject: $('#cSubject').value, message: $('#cMsg').value.trim(), website: $('#cWeb').value };
  if (!b.name || !b.message) return (o.textContent = t('Please add your name and a message.'));
  if (!b.phone && !b.email) return (o.textContent = t('Add a phone number or email so we can reply.'));
  try { await api('/api/contact', { method: 'POST', body: b }); e.target.reset(); o.className = 'form-msg ok'; o.textContent = 'Asante! Your message is with the PBAG team — we’ll be in touch soon.'; }
  catch (err) { o.textContent = err.message; }
});
