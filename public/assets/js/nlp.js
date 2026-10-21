import { $, api, t } from './app.js';
$('#nlpJoin').addEventListener('submit', async (e) => {
  e.preventDefault(); const m = $('#nMsg'); m.className = 'form-msg err';
  const c = $('#nContact').value.trim(); if (!c) return (m.textContent = t('Add a phone number or email.'));
  try { await api('/api/auditions/subscribe', { method: 'POST', body: { name: $('#nName').value.trim(), ...(c.includes('@') ? { email: c } : { phone: c }), categories: [$('#nRole').value], list: 'nlp', website: $('#nWeb').value } });
    m.className = 'form-msg ok'; m.textContent = t('Asante! You are on the list for the community of practice and iLab.'); }
  catch (err) { m.textContent = err.message; }
});
