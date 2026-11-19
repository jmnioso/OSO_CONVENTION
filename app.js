'use strict';
const CAT_LABELS = {cosplay:'Cosplay',medieval:'Médiéval',geek:'Geek','rencontre-acteur':'Rencontre Acteur'};
const CAT_ICONS = {cosplay:'◇',medieval:'⚔',geek:'✦','rencontre-acteur':'✧'};
const $ = id => document.getElementById(id);
let allEvents=[], currentCat='all', currentSort='date_asc', showPast=false, onlyFavorites=false, period='all', currentView='list';
let mapData=null, mapError=false, previousFocus=null, modalEvent=null, toastTimer;
const today=new Date(); today.setHours(0,0,0,0);
const todayStr=localDate(today);
let calendarMonth=new Date(today.getFullYear(),today.getMonth(),1);
let favorites=readFavorites();
function localDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function addDays(date,n){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return localDate(d);}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function safeUrl(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?escapeHtml(u.href):'';}catch{return '';}}
function formatDate(d){return d?new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'';}
function shortDate(d){return new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'});}
function getDayNum(d){return d.slice(8);}
function getMonthAbbr(d){return new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{month:'short'}).replace('.','');}
function getYear(d){return d.slice(0,4);}
function isPast(d){return d<todayStr;}
function genSerial(id){let hash=2166136261;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619);return '#'+(hash>>>0).toString(16).padStart(8,'0').toUpperCase();}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;}
function normalized(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function readFavorites(){try{const value=JSON.parse(localStorage.getItem('oso-favorites-v1')||'[]');return new Set(Array.isArray(value)?value.filter(v=>typeof v==='string'):[]);}catch{return new Set();}}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
function updateFavoriteButtons(){
 $('favorite-count').textContent=favorites.size;
 ['nav-favorites','favorites-filter'].forEach(id=>{$(id).setAttribute('aria-pressed',String(onlyFavorites));$(id).classList.toggle('active',onlyFavorites);});
 document.querySelectorAll('[data-favorite]').forEach(b=>{const saved=favorites.has(b.dataset.favorite);b.setAttribute('aria-pressed',String(saved));b.classList.toggle('saved',saved);b.textContent=saved?'♥':'♡';b.setAttribute('aria-label',(saved?'Retirer des favoris : ':'Ajouter aux favoris : ')+(allEvents.find(e=>e.id===b.dataset.favorite)?.title||''));});
}
function toggleFavorite(id){
 if(!allEvents.some(e=>e.id===id))return;
 favorites.has(id)?favorites.delete(id):favorites.add(id);
 let persisted=true;try{localStorage.setItem('oso-favorites-v1',JSON.stringify([...favorites]));}catch{persisted=false;}
 updateFavoriteButtons();if(onlyFavorites)renderEvents();
 toast(persisted?(favorites.has(id)?'Ajouté à vos favoris.':'Retiré de vos favoris.'):'Favoris gardés pour cette visite : le stockage du navigateur est indisponible.');
}
function favoriteButton(e){return `<button class="favorite ${favorites.has(e.id)?'saved':''}" data-favorite="${e.id}" aria-pressed="${favorites.has(e.id)}" aria-label="${favorites.has(e.id)?'Retirer des favoris':'Ajouter aux favoris'} : ${escapeHtml(e.title)}">${favorites.has(e.id)?'♥':'♡'}</button>`;}
const DEFAULT_VISUALS = {"geek": "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20480%20480%22%3E%3Crect%20width%3D%22480%22%20height%3D%22480%22%20fill%3D%22%23183e50%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f2e5cb%22%20opacity%3D%22.12%22%3E%3Ccircle%20cx%3D%22240%22%20cy%3D%22240%22%20r%3D%22205%22%2F%3E%3Ccircle%20cx%3D%22240%22%20cy%3D%22240%22%20r%3D%22170%22%2F%3E%3Cpath%20d%3D%22M0%200l480%20480M480%200%200%20480%22%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f2e5cb%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M140%20180h200l45%20160q5%2030-25%2030l-65-50H185l-65%2050q-30%200-25-30z%22%2F%3E%3Cpath%20d%3D%22M160%20235v65m-32-32h64%22%2F%3E%3Ccircle%20cx%3D%22300%22%20cy%3D%22250%22%20r%3D%229%22%2F%3E%3Ccircle%20cx%3D%22330%22%20cy%3D%22282%22%20r%3D%229%22%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%22%23f2e5cb%22%3E%3Cpath%20d%3D%22m408%2055%206%2018%2018%206-18%206-6%2018-6-18-18-6%2018-6z%22%2F%3E%3Ccircle%20cx%3D%2263%22%20cy%3D%22330%22%20r%3D%225%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22240%22%20y%3D%22432%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-size%3D%2217%22%20fill%3D%22%23f2e5cb%22%20letter-spacing%3D%223%22%3EGEEK%20CULTURE%3C%2Ftext%3E%3C%2Fsvg%3E", "medieval": "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20480%20480%22%3E%3Crect%20width%3D%22480%22%20height%3D%22480%22%20fill%3D%22%23575b3b%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f2e5cb%22%20opacity%3D%22.12%22%3E%3Ccircle%20cx%3D%22240%22%20cy%3D%22240%22%20r%3D%22205%22%2F%3E%3Ccircle%20cx%3D%22240%22%20cy%3D%22240%22%20r%3D%22170%22%2F%3E%3Cpath%20d%3D%22M0%200l480%20480M480%200%200%20480%22%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f2e5cb%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M100%20350V190h50v45h40v-45h50v160M240%20350V145h50v45h40v-45h50v205M80%20350h320M190%20350v-65q25-40%2050%200v65%22%2F%3E%3Cpath%20d%3D%22M265%20145V80l65%2020-65%2020%22%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%22%23f2e5cb%22%3E%3Cpath%20d%3D%22m408%2055%206%2018%2018%206-18%206-6%2018-6-18-18-6%2018-6z%22%2F%3E%3Ccircle%20cx%3D%2263%22%20cy%3D%22330%22%20r%3D%225%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22240%22%20y%3D%22432%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-size%3D%2217%22%20fill%3D%22%23f2e5cb%22%20letter-spacing%3D%223%22%3EMONDES%20M%C3%89DI%C3%89VAUX%3C%2Ftext%3E%3C%2Fsvg%3E", "rencontre-acteur": "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20480%20480%22%3E%3Crect%20width%3D%22480%22%20height%3D%22480%22%20fill%3D%22%23614367%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f2e5cb%22%20opacity%3D%22.12%22%3E%3Ccircle%20cx%3D%22240%22%20cy%3D%22240%22%20r%3D%22205%22%2F%3E%3Ccircle%20cx%3D%22240%22%20cy%3D%22240%22%20r%3D%22170%22%2F%3E%3Cpath%20d%3D%22M0%200l480%20480M480%200%200%20480%22%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f2e5cb%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%22105%22%20y%3D%22190%22%20width%3D%22270%22%20height%3D%22170%22%20rx%3D%2212%22%2F%3E%3Cpath%20d%3D%22m105%20190-12-70%20266-47%2012%2070zM145%20110l40%2064m35-78%2040%2064m35-78%2040%2064%22%2F%3E%3Cpath%20d%3D%22m215%20230%2065%2040-65%2040z%22%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%22%23f2e5cb%22%3E%3Cpath%20d%3D%22m408%2055%206%2018%2018%206-18%206-6%2018-6-18-18-6%2018-6z%22%2F%3E%3Ccircle%20cx%3D%2263%22%20cy%3D%22330%22%20r%3D%225%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22240%22%20y%3D%22432%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-size%3D%2217%22%20fill%3D%22%23f2e5cb%22%20letter-spacing%3D%223%22%3ERENCONTRES%20%26%20%C3%89MOTIONS%3C%2Ftext%3E%3C%2Fsvg%3E", "cosplay": "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20480%20480%22%3E%3Crect%20width%3D%22480%22%20height%3D%22480%22%20fill%3D%22%239b423c%22%2F%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f2e5cb%22%20opacity%3D%22.12%22%3E%3Ccircle%20cx%3D%22240%22%20cy%3D%22240%22%20r%3D%22205%22%2F%3E%3Ccircle%20cx%3D%22240%22%20cy%3D%22240%22%20r%3D%22170%22%2F%3E%3Cpath%20d%3D%22M0%200l480%20480M480%200%200%20480%22%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%23f2e5cb%22%20stroke-width%3D%228%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M95%20200q70-70%20145%200%2075-70%20145%200l-20%20110q-70%2065-125-5-55%2070-125%205z%22%2F%3E%3Cpath%20d%3D%22M135%20240q35-20%2070%200-35%2040-70%200zm140%200q35-20%2070%200-35%2040-70%200z%22%2F%3E%3Cpath%20d%3D%22M240%20150v-65m-90%2070-40-50m220%2050%2040-50%22%2F%3E%3C%2Fg%3E%3Cg%20fill%3D%22%23f2e5cb%22%3E%3Cpath%20d%3D%22m408%2055%206%2018%2018%206-18%206-6%2018-6-18-18-6%2018-6z%22%2F%3E%3Ccircle%20cx%3D%2263%22%20cy%3D%22330%22%20r%3D%225%22%2F%3E%3C%2Fg%3E%3Ctext%20x%3D%22240%22%20y%3D%22432%22%20text-anchor%3D%22middle%22%20font-family%3D%22monospace%22%20font-size%3D%2217%22%20fill%3D%22%23f2e5cb%22%20letter-spacing%3D%223%22%3EL%E2%80%99ART%20DU%20COSPLAY%3C%2Ftext%3E%3C%2Fsvg%3E"};
function visual(e,cls=''){
 const fallback=DEFAULT_VISUALS[e.category]||DEFAULT_VISUALS.geek;
 const src=safeUrl(e.image?.url)||fallback;
 return `<div class="event-visual ${cls}" data-cat="${e.category}"><img src="${src}" alt="${e.image?escapeHtml(e.image.alt||'Visuel officiel de '+e.title):''}" loading="lazy" decoding="async" data-fallback="${fallback}"><span class="visual-caption">${e.image?(e.image.kind==='ambiance'?'Ambiance du festival':'Visuel organisateur'):escapeHtml(CAT_LABELS[e.category])}</span></div>`;
}
function dateRange(e){return e.date_start===e.date_end?formatDate(e.date_start):`${shortDate(e.date_start)} – ${shortDate(e.date_end)} ${getYear(e.date_end)}`;}
function guestList(e,full=false){
 const guests=e.guests||[];
 if(!guests.length)return `<p class="guest-unknown">Invités à consulter sur le <a href="${safeUrl(e.website)}" target="_blank" rel="noopener noreferrer">site officiel</a>.</p>`;
 const visible=full?guests:guests.slice(0,6);
 return `<ul class="guest-list">${visible.map(g=>`<li><span class="guest-initial" aria-hidden="true">${escapeHtml(g.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</span><div><strong>${escapeHtml(g.name)}</strong>${g.known_for?`<span>${escapeHtml(g.known_for)}</span>`:''}<small>${g.days?.length?g.days.map(shortDate).join(' · '):'Jours de présence à consulter'}</small></div></li>`).join('')}</ul>${!full&&guests.length>6?`<button class="text-button" data-open="${e.id}">Voir les ${guests.length} invités renseignés</button>`:''}<p class="guest-disclaimer">Sélection non exhaustive · Présence susceptible de modification.<br>Vérifiée le ${formatDate(e.guests_verified_at||e.verified_at)} · <a href="${safeUrl(e.guests_source_url||e.source_url)}" target="_blank" rel="noopener noreferrer">Annonce officielle</a></p>`;
}
function guestRibbon(e){return e.guests?.length?`<details class="guest-ribbon"><summary><span>✧ ${e.guests.length} invité${e.guests.length>1?'s':''} à découvrir</span><span class="chevron" aria-hidden="true">⌄</span></summary><div class="guest-content">${guestList(e)}</div></details>`:guestList(e);}
function eventCard(e){return `<article class="event-card ${isPast(e.date_end)?'past':''}" data-cat="${e.category}"><div class="ticket-stub"><strong>${getDayNum(e.date_start)}</strong><span>${getMonthAbbr(e.date_start)}</span><small>${getYear(e.date_start)}</small><span class="stub-icon" aria-hidden="true">${CAT_ICONS[e.category]}</span></div><div class="card-visual">${visual(e)}</div><div class="ticket-body"><div class="ticket-top"><span class="cat-badge cat-${e.category}">${CAT_LABELS[e.category]}</span>${favoriteButton(e)}</div><h3><button data-open="${e.id}">${escapeHtml(e.title)}</button></h3><p class="event-location">${escapeHtml(e.location_city)} <span>· ${escapeHtml(e.location_country)}</span></p><p class="ticket-desc">${escapeHtml(e.description)}</p><div class="ticket-meta"><span>${dateRange(e)}</span>${isPast(e.date_end)?'<span class="past-label">Passé</span>':''}</div><div class="card-actions"><button class="text-button" data-open="${e.id}">Découvrir l’événement</button><button class="calendar-add" data-ics="${e.id}" aria-label="Ajouter au calendrier : ${escapeHtml(e.title)}">▦ <span>Calendrier</span></button></div>${guestRibbon(e)}</div></article>`;}
async function loadEvents(){
 $('events-grid').setAttribute('aria-busy','true');
 try{
  const response=await fetch('data/events.json',{cache:'no-cache'});if(!response.ok)throw Error('Chargement');const catalog=await response.json();const ids=new Set();
  if(!Array.isArray(catalog.events))throw Error('Catalogue');
  allEvents=catalog.events.map(e=>{if(!/^[a-z0-9-]+$/.test(e.id)||ids.has(e.id)||!CAT_LABELS[e.category]||!e.title||!e.location_city||!e.location_country||!validDate(e.date_start)||!validDate(e.date_end)||e.date_end<e.date_start)throw Error('Événement invalide');ids.add(e.id);return e;});
  favorites=new Set([...favorites].filter(id=>ids.has(id)));
  $('country-filter').innerHTML='<option value="">Tous les pays</option>'+[...new Set(allEvents.map(e=>e.location_country))].sort((a,b)=>a.localeCompare(b,'fr')).map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  $('catalog-note').textContent=`Catalogue européen non exhaustif · Dates vérifiées le ${formatDate(catalog.updated_at)}. Consultez l’organisateur avant votre déplacement.`;
  updateStats();renderFeatured();renderEvents();updateFavoriteButtons();
 }catch(error){$('events-grid').innerHTML='<div class="empty"><h3>Impossible de charger l’agenda</h3><p>Vérifiez votre connexion et réessayez.</p><button id="retry-load" class="primary">Réessayer</button></div>';$('retry-load').addEventListener('click',loadEvents);$('catalog-note').textContent='Agenda temporairement indisponible.';console.error(error);}
 finally{$('events-grid').setAttribute('aria-busy','false');}
}
function updateStats(){const upcoming=allEvents.filter(e=>!isPast(e.date_end));$('stat-total').textContent=upcoming.length;$('stat-month').textContent=upcoming.filter(e=>e.date_start<=localDate(new Date(today.getFullYear(),today.getMonth()+1,0))).length;$('stat-cities').textContent=new Set(upcoming.map(e=>e.location_city+e.location_country)).size;}
function renderFeatured(){
 const upcoming=allEvents.filter(e=>!isPast(e.date_end)).sort((a,b)=>a.date_start.localeCompare(b.date_start));
 const selected=[];for(const category of ['geek','rencontre-acteur','medieval']){const e=upcoming.find(e=>e.category===category&&(e.image||e.guests?.length))||upcoming.find(e=>e.category===category);if(e)selected.push(e);}
 $('featured-grid').innerHTML=selected.map(e=>`<article class="featured-card" data-cat="${e.category}"><button class="featured-image" data-open="${e.id}" aria-label="Découvrir ${escapeHtml(e.title)}">${visual(e)}</button>${favoriteButton(e)}<div class="featured-copy"><span class="cat-badge">${CAT_LABELS[e.category]}</span><h3><button data-open="${e.id}">${escapeHtml(e.title)}</button></h3><p>${dateRange(e)}</p><span class="muted">${escapeHtml(e.location_city)} · ${escapeHtml(e.location_country)}</span></div></article>`).join('');
}
function periodBounds(value){
 if(value==='next-month')return [localDate(new Date(today.getFullYear(),today.getMonth()+1,1)),localDate(new Date(today.getFullYear(),today.getMonth()+2,0))];
 if(value==='weekend'){const weekday=today.getDay();const saturday=addDays(todayStr,weekday===0?-1:(6-weekday));return [saturday,addDays(saturday,1)];}
 return null;
}
function getFilteredSorted(ignoreCountry=false){
 const q=normalized($('search-input').value.trim()),country=$('country-filter').value,year=$('year-filter').value,dateFrom=$('date-from-filter').value,bounds=periodBounds(period);
 return allEvents.filter(e=>(showPast||!isPast(e.date_end))&&(!onlyFavorites||favorites.has(e.id))&&(!country||ignoreCountry||e.location_country===country)&&(!year||(e.date_start<=`${year}-12-31`&&e.date_end>=`${year}-01-01`))&&(currentCat==='all'||e.category===currentCat||(e.tags||[]).includes(currentCat))&&(!q||normalized([e.title,e.location_city,e.location_country,e.location_name,e.description,e.organizer,...(e.guests||[]).map(g=>g.name+' '+g.known_for)].join(' ')).includes(q))&&(!dateFrom||e.date_end>=dateFrom)&&(!bounds||(e.date_start<=bounds[1]&&e.date_end>=bounds[0]))).sort((a,b)=>currentSort==='title_asc'?a.title.localeCompare(b.title,'fr'):currentSort==='date_desc'?b.date_start.localeCompare(a.date_start):a.date_start.localeCompare(b.date_start));
}
function renderEvents(){
 const events=getFilteredSorted();$('results-info').textContent=`${events.length} événement${events.length>1?'s':''}${onlyFavorites?' dans vos favoris':''}`;
 $('calendar-panel').hidden=currentView!=='calendar';$('map-panel').hidden=currentView!=='map';$('events-grid').hidden=currentView==='calendar';
 if(currentView==='calendar')renderCalendar(events);else $('events-grid').innerHTML=events.length?events.map(eventCard).join(''):`<div class="empty"><span>✦</span><h3>Aucun événement trouvé</h3><p>${onlyFavorites?'Ajoutez des événements avec le cœur, ou élargissez vos filtres.':'Essayez une autre recherche ou affichez les événements passés.'}</p><button class="secondary" data-reset>Réinitialiser les filtres</button></div>`;
 if(currentView==='map')renderMap();
 updateFavoriteButtons();
}
function togglePast(){showPast=!showPast;$('toggle-past').textContent=showPast?'Masquer les événements passés':'Voir les événements passés';$('toggle-past').setAttribute('aria-pressed',String(showPast));$('toggle-past').classList.toggle('active',showPast);renderEvents();}
function resetFilters(){currentCat='all';currentSort='date_asc';showPast=false;onlyFavorites=false;period='all';['search-input','country-filter','year-filter','date-from-filter'].forEach(id=>$(id).value='');$('sort-select').value='date_asc';$('date-from-clear').hidden=true;$('toggle-past').textContent='Voir les événements passés';$('toggle-past').setAttribute('aria-pressed','false');$('toggle-past').classList.remove('active');syncChoices();renderEvents();}
function syncChoices(){document.querySelectorAll('[data-cat].filter-btn').forEach(b=>{b.classList.toggle('active',b.dataset.cat===currentCat);b.setAttribute('aria-pressed',String(b.dataset.cat===currentCat));});document.querySelectorAll('[data-period]').forEach(b=>{b.classList.toggle('active',b.dataset.period===period);b.setAttribute('aria-pressed',String(b.dataset.period===period));});}
function setView(view){currentView=view;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view));});if(view==='calendar'){const first=getFilteredSorted()[0];if(first)calendarMonth=new Date((first.date_start<=todayStr&&first.date_end>=todayStr?todayStr:first.date_start)+'T12:00:00');calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1);}renderEvents();}
function renderCalendar(events){
 $('calendar-title').textContent=calendarMonth.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
 const start=new Date(calendarMonth);start.setDate(1-((start.getDay()+6)%7));let html=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d=>`<div class="calendar-weekday">${d}</div>`).join('');
 for(let i=0;i<42;i++){const date=addDays(localDate(start),i),day=new Date(date+'T12:00:00'),items=events.filter(e=>e.date_start<=date&&e.date_end>=date);html+=`<div class="calendar-day ${day.getMonth()!==calendarMonth.getMonth()?'outside':''} ${date===todayStr?'today':''}"><time datetime="${date}">${day.getDate()}</time>${items.slice(0,3).map(e=>`<button class="calendar-event" data-cat="${e.category}" data-open="${e.id}" title="${escapeHtml(e.title+' · '+e.location_city)}">${escapeHtml(e.title)}</button>`).join('')}${items.length>3?`<details class="calendar-more"><summary>+ ${items.length-3} autres</summary>${items.slice(3).map(e=>`<button class="calendar-event" data-open="${e.id}">${escapeHtml(e.title)}</button>`).join('')}</details>`:''}</div>`;}
 $('calendar-grid').innerHTML=html;
 const monthStart=localDate(calendarMonth),monthEnd=localDate(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0));const count=events.filter(e=>e.date_start<=monthEnd&&e.date_end>=monthStart).length;
 $('results-info').textContent=`${count} événement${count>1?'s':''} ce mois · ${events.length} avec vos filtres`;
}
const MAP_CENTERS={'France':[2,46.5],'Allemagne':[10.5,51.1],'Belgique':[4.7,50.7],'Pays-Bas':[5.5,53],'Royaume-Uni':[-3,55],'Suisse':[8.2,46.8],'Autriche':[14,47.5],'Italie':[12.8,42.5],'Espagne':[-3.5,40],'Portugal':[-8,39.5],'Suède':[16,62],'Lituanie':[24,55.5],'Tchéquie':[15.5,50],'Roumanie':[25,45.9]};
function project([x,y]){return [(x+15)*14,(72-y)*21];}
async function renderMap(){
 const events=getFilteredSorted(true),counts={};events.forEach(e=>counts[e.location_country]=(counts[e.location_country]||0)+1);const selected=$('country-filter').value;
 $('map-countries').innerHTML=Object.entries(counts).sort(([a],[b])=>a.localeCompare(b,'fr')).map(([country,n])=>`<button class="quick ${country===selected?'active':''}" data-country="${escapeHtml(country)}" aria-pressed="${country===selected}">${escapeHtml(country)} <strong>${n}</strong></button>`).join('')||'<p>Aucun pays avec ces filtres.</p>';
 if(!mapData&&!mapError){try{const r=await fetch('data/europe.json');if(!r.ok)throw Error('Carte');mapData=await r.json();}catch{mapError=true;}}
 if(currentView!=='map')return;
 if(!mapData){$('europe-map').innerHTML='<p class="empty">Le fond de carte est indisponible. Choisissez un pays avec les boutons ci-dessous.</p>';return;}
 // Counts may have changed while loading the local geographic data.
 const liveCounts={};getFilteredSorted(true).forEach(e=>liveCounts[e.location_country]=(liveCounts[e.location_country]||0)+1);const liveCountry=$('country-filter').value;
 $('europe-map').innerHTML=`<svg viewBox="0 0 770 800" role="img" aria-label="Carte des événements par pays, sélection accessible avec les boutons sous la carte"><defs><clipPath id="map-clip"><rect width="770" height="800" rx="20"/></clipPath></defs><g clip-path="url(#map-clip)">${mapData.map(f=>`<path d="${f.path}" class="map-land ${liveCounts[f.name]?'has-events':''} ${f.name===liveCountry?'selected':''}"/>`).join('')}${Object.entries(liveCounts).filter(([c])=>MAP_CENTERS[c]).map(([c,n])=>{const [x,y]=project(MAP_CENTERS[c]);return `<g class="map-pin ${c===liveCountry?'selected':''}" data-country="${escapeHtml(c)}" transform="translate(${x},${y})"><title>${escapeHtml(c)} : ${n} événements</title><circle r="17"/><text text-anchor="middle" dy="5">${n}</text></g>`;}).join('')}</g></svg>`;
}
function icsEscape(value){return String(value??'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
function foldICS(line){let result='',current='',bytes=0;for(const ch of line){const size=new TextEncoder().encode(ch).length;if(bytes+size>75){result+=current+'\r\n';current=' ';bytes=1;}current+=ch;bytes+=size;}return result+current;}
function createICS(e){const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//OSO Convention//Agenda Europe//FR','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${e.id}@oso-convention`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;VALUE=DATE:${e.date_start.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${addDays(e.date_end,1).replace(/-/g,'')}`,`SUMMARY:${icsEscape(e.title)}`,`LOCATION:${icsEscape([e.location_name,e.location_city,e.location_country].filter(Boolean).join(', '))}`,`DESCRIPTION:${icsEscape(e.description+'\nVérifiez les informations : '+e.website)}`,`URL:${e.website}`,'END:VEVENT','END:VCALENDAR'];return lines.map(foldICS).join('\r\n')+'\r\n';}
function downloadICS(id){const e=allEvents.find(e=>e.id===id);if(!e)return;const url=URL.createObjectURL(new Blob([createICS(e)],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=e.id+'.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Fichier calendrier téléchargé. Ouvrez-le dans votre agenda.');}
function openModal(id){
 const e=allEvents.find(e=>e.id===id);if(!e)return;previousFocus=document.activeElement;modalEvent=e;
 $('modal-title').textContent=e.title;$('modal-cat').innerHTML=`<span class="cat-badge cat-${e.category}">${CAT_ICONS[e.category]} ${CAT_LABELS[e.category]}</span>`;
 $('modal-visual').innerHTML=visual(e);$('modal-info').innerHTML=[['Dates',dateRange(e)],['Lieu',[e.location_name,e.location_city,e.location_country].filter(Boolean).join(' · ')],['Adresse',e.location_address],['Tarif',e.price],['Organisateur',e.organizer]].filter(([,v])=>v).map(([k,v])=>`<div><span>${k}</span><strong>${escapeHtml(v)}</strong></div>`).join('');
 $('modal-desc').textContent=e.description;$('modal-guests').innerHTML='<h3>Les invités</h3>'+guestList(e,true);
 $('modal-source').innerHTML=`Informations vérifiées le ${formatDate(e.verified_at)} · <a href="${safeUrl(e.source_url)}" target="_blank" rel="noopener noreferrer">Source de l’annonce</a>${e.image?`<br>Visuel : <a href="${safeUrl(e.image.source_url||e.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(e.image.credit||'Organisateur')}</a>`:''}`;
 $('modal-serial').textContent=`Référence ${genSerial(e.id)}`;
 const mapUrl='https://www.openstreetmap.org/search?query='+encodeURIComponent([e.location_address||e.location_name,e.location_city,e.location_country].filter(Boolean).join(', '));
 $('modal-link').innerHTML=`<a class="primary" href="${safeUrl(e.ticket_url||e.website)}" target="_blank" rel="noopener noreferrer">${e.ticket_url?'Billetterie officielle':'Site officiel & billets'}</a><button class="secondary" data-ics="${e.id}">Ajouter au calendrier</button><a class="secondary" href="${safeUrl(mapUrl)}" target="_blank" rel="noopener noreferrer">Voir le lieu</a>${favoriteButton(e)}`;
 $('modal-overlay').hidden=false;document.body.style.overflow='hidden';$('main-content').inert=true;document.querySelector('.site-header').inert=true;document.querySelector('footer').inert=true;$('modal-close').focus();
}
function closeModal(){$('modal-overlay').hidden=true;document.body.style.overflow='';$('main-content').inert=false;document.querySelector('.site-header').inert=false;document.querySelector('footer').inert=false;modalEvent=null;if(previousFocus?.isConnected)previousFocus.focus();else $('nav-favorites').focus();}
function favoriteFilter(){onlyFavorites=!onlyFavorites;renderEvents();$('agenda').scrollIntoView({behavior:'smooth',block:'start'});}
document.addEventListener('click',event=>{
 const target=event.target.closest('button, [data-country]');if(!target)return;
 if(target.dataset.favorite){toggleFavorite(target.dataset.favorite);return;}
 if(target.dataset.open){openModal(target.dataset.open);return;}
 if(target.dataset.ics){downloadICS(target.dataset.ics);return;}
 if(target.dataset.country){$('country-filter').value=target.dataset.country;renderEvents();return;}
 if(target.hasAttribute('data-reset')){resetFilters();return;}
 if(target.dataset.cat&&target.classList.contains('filter-btn')){currentCat=target.dataset.cat;syncChoices();renderEvents();return;}
 if(target.dataset.period){period=target.dataset.period;syncChoices();renderEvents();return;}
 if(target.dataset.view)setView(target.dataset.view);
});
document.addEventListener('error',event=>{const img=event.target;if(img.tagName==='IMG'&&img.dataset.fallback){const fallback=img.dataset.fallback;delete img.dataset.fallback;img.src=fallback;img.alt='';const caption=img.parentElement.querySelector('.visual-caption');if(caption)caption.textContent='Illustration de catégorie';}},true);
$('search-input').addEventListener('input',renderEvents);
['country-filter','year-filter'].forEach(id=>$(id).addEventListener('change',()=>{if(currentView==='calendar'&&id==='year-filter'&&$(id).value)calendarMonth=new Date(Number($(id).value),0,1);renderEvents();}));
$('sort-select').addEventListener('change',e=>{currentSort=e.target.value;renderEvents();});
$('date-from-filter').addEventListener('change',()=>{$('date-from-clear').hidden=!$('date-from-filter').value;renderEvents();});
$('date-from-clear').addEventListener('click',()=>{$('date-from-filter').value='';$('date-from-clear').hidden=true;renderEvents();});
$('toggle-past').addEventListener('click',togglePast);$('reset-filters').addEventListener('click',resetFilters);
$('nav-favorites').addEventListener('click',favoriteFilter);$('favorites-filter').addEventListener('click',favoriteFilter);
$('mobile-filters').addEventListener('click',()=>{const open=$('filter-panel').classList.toggle('expanded');$('mobile-filters').setAttribute('aria-expanded',String(open));});
$('month-prev').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);renderEvents();});
$('month-next').addEventListener('click',()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);renderEvents();});
$('calendar-today').addEventListener('click',()=>{calendarMonth=new Date(today.getFullYear(),today.getMonth(),1);renderEvents();});
$('map-reset').addEventListener('click',()=>{$('country-filter').value='';renderEvents();});
$('modal-close').addEventListener('click',closeModal);$('modal-overlay').addEventListener('click',e=>{if(e.target===$('modal-overlay'))closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('modal-overlay').hidden)closeModal();});
$('modal-content').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...e.currentTarget.querySelectorAll('button, a[href], summary')];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
window.addEventListener('storage',e=>{if(e.key==='oso-favorites-v1'){favorites=readFavorites();renderEvents();if(modalEvent)updateFavoriteButtons();}});
loadEvents();
