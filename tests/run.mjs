import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

process.env.TZ = 'Europe/Paris';

const catalog = JSON.parse(readFileSync(new URL('../data/events.json', import.meta.url)));
const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0,10) === value;
assert(validDate(catalog.updated_at));
assert(catalog.events.length > 0);
assert.equal(new Set(catalog.events.map(e => e.id)).size, catalog.events.length);
for (const e of catalog.events) {
  assert(/^[a-z0-9-]+$/.test(e.id));
  for (const key of ['title', 'location_city', 'location_name', 'description']) assert.equal(typeof e[key], 'string');
  assert(e.title && e.location_city && e.location_country);
  assert(['2026', '2027'].includes(e.date_start.slice(0,4)));
  assert(e.tags.includes(e.category));
  assert(['geek','medieval','cosplay','rencontre-acteur'].includes(e.category));
  assert(e.tags.every(tag => ['geek','medieval','cosplay','rencontre-acteur'].includes(tag)));
  assert(validDate(e.date_start) && validDate(e.date_end) && validDate(e.verified_at));
  assert(e.date_start <= e.date_end);
  for (const key of ['source_url', 'website']) assert.equal(new URL(e[key]).protocol, 'https:');
}

function element() {
  return {value:'',textContent:'',innerHTML:'',style:{},dataset:{},
    classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},focus(){}};
}
async function boot({events=catalog.events, fail=false, date='2026-11-19T00:05:00+01:00'}={}) {
  const elements = new Map();
  const document = {getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    querySelectorAll(){return [];},addEventListener(){},body:{style:{}},activeElement:element()};
  const RealDate = Date;
  class FixedDate extends RealDate { constructor(...args){super(...(args.length ? args : [date]));} }
  const ctx = vm.createContext({document,Date:FixedDate,URL,console:{error(){}},
    fetch:async () => ({ok:!fail,status:fail?503:200,json:async()=>({...catalog,events})})});
  vm.runInContext(source,ctx);
  await new Promise(resolve=>setImmediate(resolve));
  return {run:code=>vm.runInContext(code,ctx),elements};
}
const upcoming = catalog.events.filter(e => e.date_end >= '2026-11-19');
const app = await boot();
assert.equal(app.run('todayStr'),'2026-11-19','Local midnight must not use the previous UTC day');
assert.equal(app.run('getFilteredSorted().length'), upcoming.length);
assert.equal(app.elements.get('stat-total').textContent, upcoming.length);
assert.equal(app.elements.get('stat-month').textContent, upcoming.filter(e => e.date_start <= '2026-11-30').length);
app.run("currentCat = 'cosplay'");
assert.equal(app.run('getFilteredSorted().length'),upcoming.filter(e => e.tags.includes('cosplay')).length,'Cosplay includes conventions tagged cosplay');
app.run("currentCat = 'medieval'");
assert.equal(app.run('getFilteredSorted().length'),upcoming.filter(e => e.tags.includes('medieval')).length);
app.elements.get('search-input').value='Provins';
assert.equal(app.run('getFilteredSorted().length'),2);
app.elements.get('date-from-filter').value='2027-01-01';
assert.equal(app.run('getFilteredSorted().length'),1);
app.elements.get('search-input').value='does-not-exist';
app.run('renderEvents()');
assert(app.elements.get('events-grid').innerHTML.includes('Aucun événement trouvé'));
app.elements.get('search-input').value='';app.elements.get('date-from-filter').value='';
app.run("currentCat='all'; currentSort='date_desc'");
assert.equal(app.run('getFilteredSorted()[0].date_start'),catalog.events.map(e => e.date_start).sort().at(-1));
app.run("openModal('provins-medievales-2027')");
assert.equal(app.elements.get('modal-title').textContent,'Les Médiévales de Provins 2027');
assert(app.elements.get('modal-source').innerHTML.includes('https://provins-medievales.com/'));
assert.equal(app.run("safeUrl('javascript:alert(1)')"),'');
assert.equal(app.run("escapeHtml('<script>')"),'&lt;script&gt;');
assert.equal(new Set(app.run('allEvents.map(e=>genSerial(e.id))')).size,catalog.events.length);
app.run("currentCat='rencontre-acteur'");
assert(app.run('getFilteredSorted().length') > 0);
assert(app.run("getFilteredSorted().every(e => e.category === 'rencontre-acteur' || e.tags.includes('rencontre-acteur'))"));
app.elements.get('country-filter').value='Allemagne';
app.elements.get('year-filter').value='2027';
assert(app.run('getFilteredSorted().length') > 0);
assert(app.run("getFilteredSorted().every(e => e.location_country === 'Allemagne' && e.date_start.startsWith('2027'))"));
app.run('openModal(getFilteredSorted()[0].id)');
assert(app.elements.get('modal-cat').innerHTML.includes('Rencontre Acteur'));
assert(app.elements.get('modal-info').innerHTML.includes('Allemagne'));
app.elements.get('country-filter').value='';
app.elements.get('year-filter').value='2026';
app.run("currentCat='all'; showPast=true");
assert.equal(app.run('getFilteredSorted().length'),catalog.events.filter(e => e.date_start.startsWith('2026')).length);
app.elements.get('search-input').value='Suède';
assert(app.run('getFilteredSorted().length') > 0,'Country search includes past European events');
const event = {...catalog.events[0],date_start:'2026-11-18',date_end:'2026-11-20',title:'<img src=x onerror=alert(1)>'};
const ongoing = await boot({events:[event]});
assert.equal(ongoing.run('getFilteredSorted().length'),1,'Keep an ongoing multi-day event');
assert(ongoing.elements.get('events-grid').innerHTML.includes('&lt;img'));
const ended = await boot({events:[{...event,date_end:'2026-11-18'}]});
assert.equal(ended.run('getFilteredSorted().length'),0);
ended.run('togglePast()');
assert.equal(ended.run('getFilteredSorted().length'),1);
const failure=await boot({fail:true});
assert(failure.elements.get('events-grid').innerHTML.includes('Réessayer'));
const invalid=await boot({events:[catalog.events[0],catalog.events[0]]});
assert(invalid.elements.get('events-grid').innerHTML.includes('Impossible de charger'));
console.log(`OK : ${catalog.events.length} entrées valides ; recherche, catégories, dates, tri, fiches, erreurs et échappement vérifiés.`);
