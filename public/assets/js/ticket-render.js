// Ticket rendering: on-screen HTML (SVG QR), downloadable PNG and PDF.
import { esc, fmt, t as _t } from './app.js';

let qrLib;
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); }); }
export async function ensureQR() { if (!qrLib) { if (!window.qrcode) await loadScript('/assets/vendor/qrcode.js'); qrLib = window.qrcode; } return qrLib; }
const ORIGIN = /^https?:/.test(location.origin) ? location.origin : 'https://pbagco.com';
const STATIC = window.PBAG_STATIC;
export const ticketUrl = (code) => (STATIC?.base ? `${ORIGIN}${STATIC.base}tickets#verify=${code}` : `${ORIGIN}/t/${code}`);
function makeQR(text) { const q = qrLib(0, 'M'); q.addData(text); q.make(); return q; }

export async function ticketHTML(t, color = '#3b82f6') {
  await ensureQR();
  const svg = makeQR(ticketUrl(t.code)).createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  return `<article class="e-ticket" style="--c:${color}" data-code="${esc(t.code)}">
    <div class="et-main">
      <div class="et-brand"><img src="/assets/img/pbag-logo.webp" alt="PBAG" width="60" height="34"><span>Admit one · ${esc(t.tierName)}</span></div>
      <h3>${esc(t.eventTitle)}</h3>
      <dl>
        <div><dt>${_t('Date')}</dt><dd>${fmt.date(t.startsAt)}</dd></div>
        <div><dt>${_t('Time')}</dt><dd>${fmt.time(t.startsAt)}</dd></div>
        <div><dt>${_t('Venue')}</dt><dd>${esc(t.venue)}</dd></div>
        <div><dt>${_t('Holder')}</dt><dd>${esc(t.holder)}</dd></div>
        <div><dt>${_t('Ticket')}</dt><dd>${esc(t.seat)}</dd></div>
        <div><dt>${_t('Tier')}</dt><dd>${esc(t.tierName)}</dd></div>
      </dl>
    </div>
    <div class="et-stub"><div class="qr" role="img" aria-label="${_t('Ticket QR code')}">${svg}</div><code>${esc(t.id)}</code><small style="color:#6d6883;font-size:.7rem">${_t('Show this QR at the gate')}</small></div>
    ${t.status === 'used' ? `<div class="used">${_t('SCANNED')}</div>` : STATIC ? '<div class="used" style="font-size:2rem">PREVIEW · NOT VALID</div>' : ''}
  </article>`;
}

let logoImg;
const loadImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
function wrapText(ctx, text, x, y, maxW, lh, maxLines = 2) {
  const words = String(text).split(' '); let line = '', n = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; if (++n >= maxLines - 1) break; } else line = test;
  }
  ctx.fillText(line, x, y); return y + lh;
}

/** Draw a ticket to a canvas (1400x600) for PNG/PDF export. */
export async function ticketCanvas(t, color = '#3b82f6') {
  await ensureQR(); await document.fonts?.ready;
  logoImg ||= await loadImg('/assets/img/pbag-logo.png');
  const W = 1400, H = 600, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#f7f2e8'; x.beginPath(); x.roundRect(0, 0, W, H, 36); x.fill();
  const g = x.createLinearGradient(0, 0, 900, 600); g.addColorStop(0, color + '40'); g.addColorStop(.6, '#f7f2e800');
  x.fillStyle = g; x.fillRect(0, 0, 1000, H);
  x.fillStyle = color; x.fillRect(0, 0, 14, H);
  // perforation
  x.strokeStyle = '#cfc6b3'; x.setLineDash([14, 12]); x.lineWidth = 4; x.beginPath(); x.moveTo(1000, 30); x.lineTo(1000, H - 30); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#ffffff'; [[1000, 0], [1000, H]].forEach(([cx, cy]) => { x.save(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(cx, cy, 26, 0, 7); x.fill(); x.restore(); });
  if (logoImg) x.drawImage(logoImg, 60, 46, 120, 120 * logoImg.height / logoImg.width);
  x.fillStyle = '#5b5670'; x.font = '700 22px "DM Sans", sans-serif'; x.textAlign = 'right'; x.fillText(`ADMIT ONE · ${t.tierName.toUpperCase()}`, 950, 76); x.textAlign = 'left';
  x.fillStyle = '#0e0b18'; x.font = '900 76px "Big Shoulders Display", Impact, sans-serif';
  let y = wrapText(x, t.eventTitle.toUpperCase(), 60, 210, 880, 74);
  const rows = [['DATE', fmt.date(t.startsAt)], ['TIME', fmt.time(t.startsAt)], ['VENUE', t.venue], ['HOLDER', t.holder], ['TICKET', t.seat], ['ORDER', t.orderId || '']];
  y = Math.max(y + 10, 300);
  rows.forEach(([k, v], i) => {
    const cx = 60 + (i % 2) * 460, cy = y + Math.floor(i / 2) * 82;
    x.fillStyle = '#6d6883'; x.font = '700 18px "DM Sans", sans-serif'; x.fillText(k, cx, cy);
    x.fillStyle = '#1b1726'; x.font = '700 28px "DM Sans", sans-serif'; wrapText(x, v, cx, cy + 34, 430, 30, 1);
  });
  const q = makeQR(ticketUrl(t.code)), n = q.getModuleCount(), size = 300, cell = size / n, qx = 1050, qy = 110;
  x.fillStyle = '#fff'; x.fillRect(qx - 16, qy - 16, size + 32, size + 32); x.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.isDark(r, col)) x.fillRect(qx + col * cell, qy + r * cell, Math.ceil(cell), Math.ceil(cell));
  x.fillStyle = '#4a4560'; x.font = '700 22px ui-monospace, monospace'; x.textAlign = 'center'; x.fillText(t.id, qx + size / 2, qy + size + 56);
  x.font = '500 18px "DM Sans", sans-serif'; x.fillStyle = '#6d6883'; x.fillText('Scan at the gate · pbagco.com', qx + size / 2, qy + size + 90);
  if (STATIC) { x.save(); x.translate(500, 330); x.rotate(-0.22); x.fillStyle = 'rgba(200,30,50,.38)'; x.font = '900 86px "Big Shoulders Display", Impact, sans-serif'; x.textAlign = 'center'; x.fillText('PREVIEW · NOT VALID', 0, 0); x.restore(); }
  return c;
}

export async function downloadPNG(t, color) {
  const c = await ticketCanvas(t, color);
  const a = document.createElement('a'); a.download = `PBAG-ticket-${t.id}.png`; a.href = c.toDataURL('image/png'); a.click();
}
export async function downloadPDF(tickets, color, name = 'PBAG-tickets') {
  if (!window.jspdf) await loadScript('/assets/vendor/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [210, 100] });
  for (const [i, t] of tickets.entries()) {
    if (i) pdf.addPage([210, 100], 'landscape');
    const c = await ticketCanvas(t, color);
    pdf.addImage(c.toDataURL('image/jpeg', .92), 'JPEG', 5, 5, 200, 85.7);
    pdf.setFontSize(7); pdf.setTextColor(120); pdf.text('Non-transferable copies are void once scanned. Help: 0720 960 180 · info@pbagco.com', 105, 96, { align: 'center' });
  }
  pdf.save(`${name}.pdf`);
}
export function gcalLink(t) {
  const s = new Date(t.startsAt), e = new Date(s.getTime() + 3 * 3600e3);
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t.eventTitle + ' — PBAG')}&dates=${f(s)}/${f(e)}&location=${encodeURIComponent(t.venue)}&details=${encodeURIComponent('Your PBAG ticket: ' + ticketUrl(t.code))}`;
}
