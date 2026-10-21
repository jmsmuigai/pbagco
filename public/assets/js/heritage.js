import { $, $$, esc, icon, t } from './app.js';
const base = window.PBAG_STATIC?.base || '/';
const CATS = {
  culture: [t('Culture & memory'), '#ffc23d', '★'], colonial: [t('Colonial economy & admin'), '#b07a4a', '⚑'], land: [t('Land & removals'), '#e0703c', '⌂'],
  memorial: [t('Conflict & memorial'), '#c0392b', '✝'], forest: [t('Forests & Mau Mau'), '#4f8a4a', '♣'], resistance: [t('Resistance & chiefs'), '#8b5cf6', '⚔'],
  sacred: [t('Sacred & natural'), '#22c7b8', '◈'], nature: [t('Natural landmark'), '#5aa9e6', '~'], physical: [t('Physical features'), '#0e9f8e', '▲'],
};
const loadCSS = (h) => new Promise((ok) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; l.onload = ok; document.head.append(l); });
const loadJS = (s) => new Promise((ok, no) => { const e = document.createElement('script'); e.src = s; e.onload = ok; e.onerror = no; document.head.append(e); });

(async () => {
  await Promise.all([loadCSS(base + 'assets/vendor/leaflet/leaflet.css'), loadJS(base + 'assets/vendor/leaflet/leaflet.js')]);
  const L = window.L;
  const [heritage, bounds] = await Promise.all([fetch(base + 'data/heritage.json').then((r) => r.json()), fetch(base + 'data/boundaries.json').then((r) => r.json())]);

  const map = L.map('map', { zoomControl: false, attributionControl: true, minZoom: 8, maxZoom: 18 }).setView([-1.11, 36.63], 13);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
  const osmAttr = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: osmAttr, maxZoom: 19 });
  const colonial = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: osmAttr + ' · sepia "colonial survey" styling by PBAG', maxZoom: 19, className: 'tiles-colonial' });
  const esriAttr = 'Imagery © Esri, Maxar, Earthstar Geographics';
  const hybrid = L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: esriAttr, maxZoom: 18 }),
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, opacity: .8 }),
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 }),
  ]);
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: osmAttr + ', SRTM · © OpenTopoMap (CC-BY-SA)', maxZoom: 17 });
  colonial.addTo(map);

  // Boundaries
  const style = { Kiambu: { color: '#7a1f12', weight: 2.5, dashArray: '8 6', fillOpacity: 0.02 }, Limuru: { color: '#ffc23d', weight: 3, fillColor: '#ffc23d', fillOpacity: 0.07 }, Lari: { color: '#4f8a4a', weight: 2.5, fillColor: '#4f8a4a', fillOpacity: 0.06 } };
  const bLayers = {};
  for (const f of bounds.features) {
    const key = f.name.split(' ')[0];
    bLayers[key] = L.geoJSON(f.geometry, { style: style[key] }).bindTooltip(f.name === 'Kiambu County' ? 'Kiambu County' : `${f.name} constituency / sub-county`, { sticky: true });
  }
  const boundaryGroup = L.layerGroup(Object.values(bLayers)).addTo(map);

  // Forests (approximate extents) and routes
  const forests = L.layerGroup(heritage.sites.filter((s) => s.radius).map((s) => L.circle([s.lat, s.lon], { radius: s.radius, color: '#2f6b2a', weight: 1, dashArray: '3 4', fillColor: '#4f8a4a', fillOpacity: 0.22 }).bindTooltip(`${s.name} (approx. extent)`))).addTo(map);
  const routes = L.layerGroup(heritage.routes.map((r) => L.polyline(r.coords, { color: '#c0392b', weight: 3.5, dashArray: '2 9', lineCap: 'round', opacity: 0.9 }).bindPopup(`<b>${esc(r.name)}</b><br><small>${esc(r.note)}</small>`))).addTo(map);

  // Sites
  const markers = {};
  const pin = (s) => L.divIcon({ className: 'pin-wrap', html: `<span class="pin${s.approx ? ' approx' : ''}" style="--c:${CATS[s.cat][1]}"><i>${CATS[s.cat][2]}</i></span>`, iconSize: [30, 38], iconAnchor: [15, 36], popupAnchor: [0, -32] });
  const sitesLayer = L.layerGroup().addTo(map);
  for (const s of heritage.sites) {
    const m = L.marker([s.lat, s.lon], { icon: pin(s), title: s.name, riseOnHover: true }).bindPopup(`<div class="pop">
      <span class="tag" style="background:${CATS[s.cat][1]}">${esc(CATS[s.cat][0])}</span>
      <h3>${esc(s.name)}</h3><small>${esc(s.period)}${s.approx ? ' · location approximate' : ''}</small>
      <p><b>${t('Used for:')}</b> ${esc(s.used)}</p><p>${esc(s.desc)}</p><p class="src">Source: ${esc(s.src)}</p>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}" target="_blank" rel="noopener">Directions ↗</a> · <a href="${base}ithaka#sites">${t('Read the story')}</a></div>`, { maxWidth: 320 });
    m.addTo(sitesLayer); markers[s.id] = { m, s };
  }
  L.control.layers({ [t('Colonial survey (sepia)')]: colonial, [t('Street map')]: street, [t('Hybrid satellite')]: hybrid, [t('Topographic')]: topo },
    { [t('Historic sites')]: sitesLayer, [t('Boundaries: Kiambu · Limuru · Lari')]: boundaryGroup, [t('Forests (approx.)')]: forests, [t('Mau Mau routes (indicative)')]: routes }, { position: 'topright', collapsed: innerWidth < 900 }).addTo(map);

  // Compass rose + legend
  const Compass = L.Control.extend({ onAdd() { const d = L.DomUtil.create('div', 'compass'); d.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="rgba(239,227,200,.92)" stroke="#7a1f12" stroke-width="2"/><path d="M50 8 L58 50 L50 92 L42 50 Z" fill="#2b2117"/><path d="M50 8 L58 50 L50 50 Z" fill="#7a1f12"/><path d="M8 50 L50 43 L92 50 L50 57 Z" fill="#6b5a44" opacity=".6"/><text x="50" y="22" text-anchor="middle" font-size="14" font-family="Georgia" fill="#7a1f12" font-weight="bold">N</text></svg>'; return d; } });
  new Compass({ position: 'topleft' }).addTo(map);

  // Sidebar: categories, list, search
  const active = new Set(Object.keys(CATS));
  $('#cats').innerHTML = Object.entries(CATS).filter(([k]) => heritage.sites.some((s) => s.cat === k)).map(([k, [n, c, g]]) => `<button class="chip on" type="button" data-cat="${k}" style="--cc:${c}"><span class="dot" style="background:${c}">${g}</span>${n}</button>`).join('') +
    `<span class="chip legend-route">┄ Mau Mau route (indicative)</span>`;
  const list = $('#siteList');
  const renderList = () => {
    const q = $('#siteSearch').value.trim().toLowerCase();
    const show = heritage.sites.filter((s) => active.has(s.cat) && (!q || (s.name + ' ' + s.desc + ' ' + s.used).toLowerCase().includes(q)));
    list.innerHTML = show.map((s) => `<li><button type="button" data-site="${s.id}"><span class="dot" style="background:${CATS[s.cat][1]}">${CATS[s.cat][2]}</span><span><b>${esc(s.name)}</b><small>${esc(s.period)}${s.approx ? ' ◌' : ''}</small></span></button></li>`).join('') || `<li class="muted">${t('No sites match.')}</li>`;
    for (const { m, s } of Object.values(markers)) { const vis = show.includes(s); vis ? sitesLayer.addLayer(m) : sitesLayer.removeLayer(m); }
  };
  $('#cats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; const k = b.dataset.cat; active.has(k) ? active.delete(k) : active.add(k); b.classList.toggle('on'); renderList(); });
  $('#siteSearch').addEventListener('input', renderList);
  const openSite = (id) => { const x = markers[id]; if (!x) return; map.flyTo([x.s.lat, x.s.lon], Math.max(map.getZoom(), 14), { duration: 0.8 }); setTimeout(() => x.m.openPopup(), 850); if (innerWidth < 900) togglePanel(false); };
  list.addEventListener('click', (e) => { const b = e.target.closest('[data-site]'); if (b) openSite(b.dataset.site); });
  renderList();

  // Focus buttons
  const focus = { kiambu: () => map.flyToBounds(bLayers.Kiambu.getBounds(), { padding: [20, 20] }), limuru: () => map.flyToBounds(bLayers.Limuru.getBounds(), { padding: [20, 20] }), lari: () => map.flyToBounds(bLayers.Lari.getBounds(), { padding: [20, 20] }), kamiriithu: () => map.flyTo([-1.1101, 36.6246], 15) };
  $$('[data-focus]').forEach((b) => b.addEventListener('click', () => { $$('[data-focus]').forEach((x) => x.classList.toggle('on', x === b)); focus[b.dataset.focus](); }));

  // Mobile panel toggle
  const panel = $('#panel'), tgl = $('#panelToggle');
  const togglePanel = (open = !panel.classList.contains('open')) => { panel.classList.toggle('open', open); tgl.setAttribute('aria-expanded', open); setTimeout(() => map.invalidateSize(), 300); };
  tgl.addEventListener('click', () => togglePanel());
  if (innerWidth >= 900) panel.classList.add('open');

  const want = new URLSearchParams(location.search).get('site');
  if (want) openSite(want);
})();
