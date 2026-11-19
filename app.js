
'use strict';
const CAT_LABELS = { cosplay:'Cosplay', medieval:'Médiéval', geek:'Geek', foire:'Foire', autre:'Autre' };
const CAT_ICONS  = { cosplay:'🎭', medieval:'⚔️', geek:'🎮', foire:'🎪', autre:'✦' };
let allEvents = [], currentCat = 'all', currentSort = 'date_asc', showPast = false;
const today = new Date(); today.setHours(0,0,0,0);
const todayStr = localDate(today);
function localDate(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
function safeUrl(value) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? escapeHtml(u.href) : ''; } catch { return ''; } }

function formatDate(d) {
  if (!d) return '';
  return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
}
function getDayNum(d) { return d ? String(new Date(d+'T00:00:00').getDate()).padStart(2,'0') : ''; }
function getMonthAbbr(d) { return d ? new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{month:'short'}).replace('.','').toUpperCase() : ''; }
function getYear(d) { return d ? new Date(d+'T00:00:00').getFullYear() : ''; }
function isPast(d) { return d < todayStr; }
function genSerial(id) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return '#' + (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function makeDateRight(dateStart, dateEnd) {
  const hasEnd = dateEnd && dateEnd !== dateStart;
  if (!hasEnd) {
    return `<div class="ticket-right">
      <div class="date-block">
        <span class="date-lbl">Date</span>
        <div class="date-day">${getDayNum(dateStart)}</div>
        <div class="date-myr">${getMonthAbbr(dateStart)} ${getYear(dateStart)}</div>
      </div>
    </div>`;
  }
  return `<div class="ticket-right">
    <div class="date-block">
      <span class="date-lbl">Début</span>
      <div class="date-day">${getDayNum(dateStart)}</div>
      <div class="date-myr">${getMonthAbbr(dateStart)} ${getYear(dateStart)}</div>
    </div>
    <div class="date-sep"></div>
    <div class="date-block">
      <span class="date-lbl">Fin</span>
      <div class="date-day">${getDayNum(dateEnd)}</div>
      <div class="date-myr">${getMonthAbbr(dateEnd)} ${getYear(dateEnd)}</div>
    </div>
  </div>`;
}

async function loadEvents() {
  const grid = document.getElementById('events-grid');
  grid.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('data/events.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    if (!Array.isArray(catalog.events)) throw new Error('Catalogue invalide');
    const ids = new Set();
    allEvents = catalog.events.map(event => {
      if (!event.id || !/^[a-z0-9-]+$/.test(event.id) || ids.has(event.id) ||
          !['geek', 'medieval', 'cosplay'].includes(event.category) ||
          !event.title || !event.location_city || !/^\d{4}-\d{2}-\d{2}$/.test(event.date_start) ||
          !event.date_end || event.date_end < event.date_start) throw new Error('Événement invalide');
      ids.add(event.id);
      return event;
    });
    document.getElementById('catalog-note').textContent = `Sélection d’événements en France · Mise à jour le ${formatDate(catalog.updated_at)}. Consultez le site officiel avant votre déplacement.`;
    updateStats();
    renderEvents();
  } catch (error) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><h3>Impossible de charger l’agenda</h3><p>Veuillez réessayer dans quelques instants.</p><button class="filter-btn" id="retry-load">Réessayer</button></div>`;
    document.getElementById('retry-load').addEventListener('click', loadEvents);
    document.getElementById('catalog-note').textContent = 'Agenda temporairement indisponible.';
    console.error('Chargement de l’agenda :', error);
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

function updateStats() {
  const upcoming = allEvents.filter(e => !isPast(e.date_end || e.date_start));
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const thisMonth = upcoming.filter(e => e.date_start <= localDate(endOfMonth));
  const cities = new Set(upcoming.map(e => e.location_city));
  document.getElementById('stat-total').textContent = upcoming.length;
  document.getElementById('stat-month').textContent = thisMonth.length;
  document.getElementById('stat-cities').textContent = cities.size;
}

function getFilteredSorted() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  const dateFrom = document.getElementById('date-from-filter').value;
  let arr = allEvents.filter(e => showPast || !isPast(e.date_end || e.date_start));
  if (currentCat !== 'all') arr = arr.filter(e => (e.category === currentCat || (e.tags || []).includes(currentCat)));
  if (q) arr = arr.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.location_city.toLowerCase().includes(q) ||
    (e.location_name && e.location_name.toLowerCase().includes(q)) ||
    (e.description && e.description.toLowerCase().includes(q))
  );
  if (dateFrom) arr = arr.filter(e => (e.date_end || e.date_start) >= dateFrom);
  arr.sort((a,b) => {
    if (currentSort === 'date_asc')  return a.date_start.localeCompare(b.date_start);
    if (currentSort === 'date_desc') return b.date_start.localeCompare(a.date_start);
    if (currentSort === 'title_asc') return a.title.localeCompare(b.title, 'fr');
    return 0;
  });
  return arr;
}

function renderEvents() {
  const arr = getFilteredSorted();
  const grid = document.getElementById('events-grid');
  const info = document.getElementById('results-info');
  info.textContent = arr.length === 0 ? '' : `${arr.length} événement${arr.length>1?'s':''} répertorié${arr.length>1?'s':''}`;
  if (arr.length === 0) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">🎟️</div><h3>Aucun événement trouvé</h3><p>Essayez une autre recherche, une autre date ou une autre catégorie.</p></div>`;
    return;
  }
  grid.innerHTML = arr.map(e => {
    const past = isPast(e.date_end || e.date_start);
    return `
    <div role="button" tabindex="0" class="event-card${past?' past':''}" data-cat="${e.category}" data-event-id="${e.id}" aria-label="${escapeHtml(e.title)} — ${formatDate(e.date_start)}">
      <div class="ticket-stub">
        <div class="stub-day">${getDayNum(e.date_start)}</div>
        <div class="stub-month">${getMonthAbbr(e.date_start)}</div>
        <div class="stub-year">${getYear(e.date_start)}</div>
        <div class="stub-divider"></div>
        <div class="stub-cat-label">${CAT_ICONS[e.category]} ${CAT_LABELS[e.category]}</div>
      </div>
      <div class="ticket-body">
        <div class="ticket-top">
          <div class="ticket-title">${escapeHtml(e.title)}</div>
          <div class="ticket-serial">${genSerial(e.id)}</div>
        </div>
        ${e.description ? `<div class="ticket-desc">${escapeHtml(e.description)}</div>` : ''}
        <div class="ticket-dates-mobile">${formatDate(e.date_start)}${e.date_end !== e.date_start ? ` au ${formatDate(e.date_end)}` : ''}</div>
        <div class="ticket-meta">
          <div class="ticket-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${e.location_name ? escapeHtml(e.location_name)+', ' : ''}${escapeHtml(e.location_city)}
          </div>
          ${past ? '<span class="past-label">Passé</span>' : ''}
          ${e.price ? `<span class="price-tag">${escapeHtml(e.price)}</span>` : ''}
        </div>
      </div>
      ${makeDateRight(e.date_start, e.date_end)}
    </div>`;
  }).join('');
}

function togglePast() {
  showPast = !showPast;
  const btn = document.getElementById('toggle-past');
  btn.textContent = showPast ? '🙈 Masquer les événements passés' : '🕓 Voir aussi les événements passés';
  btn.classList.toggle('active', showPast);
  btn.setAttribute('aria-pressed', String(showPast));
  renderEvents();
}

let previousFocus = null;
function openModal(id) {
  previousFocus = document.activeElement;
  const e = allEvents.find(x => x.id === id);
  if (!e) return;
  document.getElementById('modal-title').textContent = e.title;
  document.getElementById('modal-cat').innerHTML = `<span class="cat-badge cat-${e.category}">${CAT_ICONS[e.category]} ${CAT_LABELS[e.category]}</span>`;
  const dateStr = e.date_end && e.date_end !== e.date_start
    ? `${formatDate(e.date_start)} → ${formatDate(e.date_end)}`
    : formatDate(e.date_start);
  document.getElementById('modal-info').innerHTML = `
    <div class="modal-info-item"><label>📅 Date</label><span>${dateStr}</span></div>
    <div class="modal-info-item"><label>📍 Lieu</label><span>${escapeHtml(e.location_name)}, ${escapeHtml(e.location_city)}</span></div>
    ${e.location_address ? `<div class="modal-info-item"><label>🗺️ Adresse</label><span>${escapeHtml(e.location_address)}</span></div>` : ''}
    ${e.price ? `<div class="modal-info-item"><label>💶 Tarif</label><span>${escapeHtml(e.price)}</span></div>` : ''}
    ${e.organizer ? `<div class="modal-info-item"><label>👤 Organisateur</label><span>${escapeHtml(e.organizer)}</span></div>` : ''}
  `;
  document.getElementById('modal-desc').textContent = e.description || 'Aucune description disponible.';
  document.getElementById('modal-serial').textContent = `Référence : ${genSerial(e.id)}`;
  document.getElementById('modal-source').innerHTML = `Vérifié le ${formatDate(e.verified_at)} · <a href="${safeUrl(e.source_url)}" target="_blank" rel="noopener noreferrer">Source de l’annonce</a>`;
  document.getElementById('modal-link').innerHTML = safeUrl(e.website)
    ? `<a href="${safeUrl(e.website)}" target="_blank" rel="noopener noreferrer" class="modal-btn">Site officiel</a>` : '';
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('modal-close').focus();
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target === document.getElementById('modal-overlay')) closeModal(); });
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); document.body.style.overflow = ''; previousFocus?.focus(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.getElementById('search-input').addEventListener('input', renderEvents);
document.getElementById('date-from-filter').addEventListener('change', function() {
  document.getElementById('date-from-clear').style.display = this.value ? 'block' : 'none';
  renderEvents();
});
document.getElementById('date-from-clear').addEventListener('click', function() {
  document.getElementById('date-from-filter').value = '';
  this.style.display = 'none';
  renderEvents();
});
document.getElementById('sort-select').addEventListener('change', e => { currentSort = e.target.value; renderEvents(); });
document.querySelectorAll('.filter-btn[data-cat]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn[data-cat]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    currentCat = btn.dataset.cat;
    renderEvents();
  });
});

loadEvents();

document.getElementById('events-grid').addEventListener('click', e => {
  const card = e.target.closest('[data-event-id]');
  if (card) openModal(card.dataset.eventId);
});
document.getElementById('events-grid').addEventListener('keydown', e => {
  const card = e.target.closest('[data-event-id]');
  if (card && ['Enter', ' '].includes(e.key)) { e.preventDefault(); openModal(card.dataset.eventId); }
});
document.getElementById('modal-content').addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const items = [...e.currentTarget.querySelectorAll('button, a[href]')];
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
