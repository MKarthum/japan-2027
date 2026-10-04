import fs from 'node:fs';
import path from 'node:path';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const foodData = readJson('docs/data/food.json');
const food = foodData.restaurants || [];
const places = readJson('docs/data/places.json');
const prep = readJson('docs/data/prep.json');
const trip = readJson('docs/data/trip.json');
const routeGeometry = readJson('docs/data/route-geometry.json');
const transport = readJson('docs/data/transport.json');
const guide = readJson('docs/data/guide.json');
const sources = readJson('docs/data/sources.json');
const hotelData = readJson('docs/data/hotels.json');
const hotels = hotelData.hotels || [];
const fx = readJson('docs/data/fx.json');
const site = readJson('docs/data/site.json');
const pages = readJson('docs/data/pages.json');
const errors = [];

function uniqueIds(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (!item.id) errors.push(`${label}: post mangler id`);
    else if (seen.has(item.id)) errors.push(`${label}: duplikat id ${item.id}`);
    seen.add(item.id);
  }
}

function validMap(item) {
  return item.map &&
    Number.isFinite(item.map.lat) && item.map.lat >= -90 && item.map.lat <= 90 &&
    Number.isFinite(item.map.lng) && item.map.lng >= -180 && item.map.lng <= 180 &&
    typeof item.map.showOnRouteMap === 'boolean';
}

function dateDays(a,b) {
  return (Date.parse(b) - Date.parse(a)) / 86400000;
}

function validateImage(img,label) {
  if (!img?.type || !['licensed','ai'].includes(img.type)) {
    errors.push(`${label}: image.type må være licensed eller ai`);
    return;
  }
  if (!img.url || !img.alt) {
    errors.push(`${label}: bilde mangler url/alt`);
    return;
  }

  if (img.type === 'licensed') {
    if (!img.source || !img.credit || !img.license || !img.licenseUrl) {
      errors.push(`${label}: lisensiert bilde mangler source/credit/license/licenseUrl`);
      return;
    }
    const commons = img.source.startsWith('https://commons.wikimedia.org/wiki/File:');
    const explicitlyAllowed = img.ownedByProject === true || Boolean(img.permissionUrl);
    if (!commons && !explicitlyAllowed) {
      errors.push(`${label}: bildekilden har ikke dokumentert gjenbruksgrunnlag`);
    }
  }

  if (img.type === 'ai') {
    if (!img.generatedAt) errors.push(`${label}: AI-bilde mangler generatedAt`);
    if (/^https?:\/\//.test(img.url)) errors.push(`${label}: AI-bilde skal lagres lokalt i repoet, ikke som ekstern URL`);
    const target=path.resolve('docs',img.url);
    if (!fs.existsSync(target)) errors.push(`${label}: AI-bildefilen finnes ikke: ${img.url}`);
  }
}

uniqueIds(food, 'food.json');
uniqueIds(places, 'places.json');
uniqueIds(hotels, 'hotels.json');

const requiredPageCopy={
  home:['whyEyebrow','whyTitle','whyIntro','useEyebrow','useTitle','useIntro'],
  route:['eyebrow','listEyebrow','listTitle','listIntro','transportTitle','mapNote'],
  places:['eyebrow','title','intro','filterLabel'],
  food:['eyebrow','title','intro','filterLabel','watchTitle'],
  hotels:['eyebrow','title','intro','typesTitle','baseFilterLabel','typeFilterLabel'],
  prep:['eyebrow','title','intro'],
  practical:['eyebrow','title','intro','transportTitle','bookingTitle','phrasesTitle','namesTitle','etiquetteTitle'],
  budget:['eyebrow','title','intro','distributionTitle'],
  sources:['eyebrow','title','intro'],
  privacy:['eyebrow','title','intro','publicTitle']
};
for(const [page,keys] of Object.entries(requiredPageCopy)){
  if(!pages[page]) errors.push(`pages.json: mangler ${page}`);
  else for(const key of keys) if(typeof pages[page][key]!=='string'||!pages[page][key].trim()) errors.push(`pages.json: ${page}.${key} mangler`);
}

const placeIds = new Set(places.map(x => x.id));
const placeById = new Map(places.map(x => [x.id,x]));
const routeIds = new Set(trip.route.map(x => x.id));
const themedAreas = new Set();

for (let i=0;i<trip.route.length;i++) {
  const stop=trip.route[i];
  if (!placeIds.has(stop.id)) errors.push(`trip.json: rutestopp ${stop.id} mangler i places.json`);
  for (const duplicateKey of ['name','lat','lng']) {
    if (duplicateKey in stop) errors.push(`trip.json: ${stop.id} dupliserer ${duplicateKey}; stedet eies av places.json`);
  }
  if (!stop.filterLabel) errors.push(`trip.json: ${stop.id} mangler filterLabel`);
  if (!stop.theme || !/^#[0-9A-Fa-f]{6}$/.test(stop.theme.color || '')) {
    errors.push(`trip.json: ${stop.id} mangler gyldig theme.color`);
  }
  if (!Array.isArray(stop.theme?.areas) || stop.theme.areas.length === 0) {
    errors.push(`trip.json: ${stop.id} mangler theme.areas`);
  }
  for (const area of stop.theme?.areas || []) {
    if (themedAreas.has(area)) errors.push(`trip.json: området ${area} er koblet til flere destinasjonstemaer`);
    themedAreas.add(area);
  }
  if (dateDays(stop.from,stop.to) !== stop.nights) {
    errors.push(`trip.json: ${stop.id} har ${stop.nights} netter, men datospennet er ${dateDays(stop.from,stop.to)}`);
  }
  const next=trip.route[i+1];
  if (next && stop.to !== next.from) errors.push(`trip.json: dato-gap mellom ${stop.id} og ${next.id}`);
}

for (const dayTrip of trip.dayTrips || []) {
  if (!placeIds.has(dayTrip.id)) errors.push(`trip.json: dagstur ${dayTrip.id} mangler i places.json`);
  if (!dayTrip.baseId || !routeIds.has(dayTrip.baseId)) errors.push(`trip.json: dagstur ${dayTrip.id} mangler gyldig baseId`);
  for (const duplicateKey of ['name','base','lat','lng','summary','destinationId']) {
    if (duplicateKey in dayTrip) errors.push(`trip.json: dagstur ${dayTrip.id} dupliserer ${duplicateKey}; bruk places.json/baseId`);
  }
}

for (const item of [...places, ...food.filter(x => x.status === 'active')]) {
  if (!themedAreas.has(item.area)) errors.push(`${item.id}: området ${item.area} mangler destinasjonstema i trip.json`);
}

const placeImageUrls=new Map();
for (const item of places) {
  for (const key of ['id','name','area','type','simple','description','why']) {
    if (!item[key]) errors.push(`places.json: ${item.id||'(uten id)'} mangler ${key}`);
  }
  if (!Array.isArray(item.highlights)) errors.push(`places.json: ${item.id} mangler highlights-liste`);
  if ('prep' in item || 'acShadows' in item) errors.push(`places.json: ${item.id} lagrer gammel forberedelsesdata; bruk prep.json`);
  if (!Array.isArray(item.links) || item.links.length === 0) errors.push(`places.json: ${item.id} mangler eksterne lenker`);
  if (!validMap(item)) errors.push(`places.json: ${item.id} mangler komplett map-data`);
  validateImage(item.image,`places.json image ${item.id}`);
  if (item.image?.url) {
    if (placeImageUrls.has(item.image.url)) {
      errors.push(`places.json: ${item.id} og ${placeImageUrls.get(item.image.url)} bruker samme stedbilde`);
    } else {
      placeImageUrls.set(item.image.url,item.id);
    }
  }
}

if ('images' in guide || 'placeExtras' in guide) {
  errors.push('guide.json skal ikke eie stedsbilder eller placeExtras; dette hører til places.json');
}
for (const item of guide.bookingRadar || []) {
  const p=placeById.get(item.placeId);
  if (!p) errors.push(`guide.json: bookingRadar har ukjent placeId ${item.placeId}`);
  for (const duplicateKey of ['title','area','url']) {
    if (duplicateKey in item) errors.push(`guide.json: bookingRadar ${item.placeId} dupliserer ${duplicateKey}; bruk places.json`);
  }
  if (!item.priority || !item.when || !item.why || !item.checked) errors.push(`guide.json: bookingRadar ${item.placeId} mangler felter`);
  if (p && !(p.links||[]).some(x=>x.kind==='ticket' || x.kind==='official')) {
    errors.push(`places.json: ${item.placeId} mangler billett/offisiell lenke for bookingradar`);
  }
}
if ('connections' in guide) {
  errors.push('guide.json: connections skal ikke finnes; forberedelser og stedskoblinger eies av prep.json');
}

const prepIds=new Set();
for (const group of prep) {
  if (!group.category || !Array.isArray(group.items) || group.items.length===0) errors.push('prep.json: gruppe mangler category/items');
  for (const item of group.items || []) {
    if (!item.id) errors.push(`prep.json: ${group.category} har post uten id`);
    else if (prepIds.has(item.id)) errors.push(`prep.json: duplikat id ${item.id}`);
    else prepIds.add(item.id);
    if (!item.title || !item.for || !item.why || !item.action) errors.push(`prep.json: ${item.id||item.title||'(uten id)'} mangler innhold`);
    if (!Array.isArray(item.placeIds)) errors.push(`prep.json: ${item.id||item.title} mangler placeIds`);
    else for (const id of item.placeIds) if (!placeIds.has(id)) errors.push(`prep.json: ${item.id} peker på ukjent placeId ${id}`);
    if (item.url && !/^https:\/\//.test(item.url)) errors.push(`prep.json: ${item.id} har ugyldig url`);
  }
}

const legIds=new Set(transport.legs.map(x=>x.id));
if (transport.legs.length !== trip.route.length-1) errors.push('transport.json: antall etapper samsvarer ikke med hovedruten');
for (let i=0;i<transport.legs.length;i++) {
  const leg=transport.legs[i];
  const from=trip.route[i], to=trip.route[i+1];
  if (!from || !to || leg.fromRouteId!==from.id || leg.toRouteId!==to.id) {
    errors.push(`transport.json: etappe ${leg.id} følger ikke hovedrutens rekkefølge`);
  }
  if (leg.fare?.family2a2cYen !== leg.fare?.adultYen*2 + leg.fare?.childYen*2) errors.push(`transport.json: familiepris stemmer ikke for ${leg.id}`);
  const elapsed=(leg.stations||[]).map(s=>s.elapsedMin);
  if (elapsed.some((n,j)=>!Number.isFinite(n)||(j>0&&n<elapsed[j-1]))) errors.push(`transport.json: stasjonstidene er ugyldige for ${leg.id}`);
}

for (const part of routeGeometry.parts || []) {
  if (!legIds.has(part.journeyId)) errors.push(`route-geometry.json: ukjent journeyId ${part.journeyId}`);
  if ('color' in part) errors.push(`route-geometry.json: ${part.journeyId} lagrer color; fargen skal avledes fra trip.json`);
  if (!Number.isFinite(part.offset)) errors.push(`route-geometry.json: ${part.journeyId} mangler numerisk offset`);
  if (!Array.isArray(part.coords) || part.coords.length < 2) errors.push(`route-geometry.json: ${part.journeyId} mangler geometri`);
}

for (const item of food.filter(x => x.status === 'active')) {
  if (!validMap(item)) errors.push(`food.json: aktiv kandidat ${item.id} mangler gyldig map-data`);
  if (!item.factsChecked) errors.push(`food.json: ${item.id} mangler factsChecked`);
  if (!Array.isArray(item.orderRecommendations) || item.orderRecommendations.length === 0) errors.push(`food.json: ${item.id} mangler bestillingsforslag`);
  if (!item.links?.googleMaps) errors.push(`food.json: ${item.id} mangler Google Maps-lenke`);
  if (!item.links?.menu) errors.push(`food.json: ${item.id} mangler menylenke`);
  if (!item.ratings?.checked) errors.push(`food.json: ${item.id} mangler dato for ratingkontroll`);
  if (!item.ratings?.google?.url || !Number.isFinite(item.ratings?.google?.score)) errors.push(`food.json: ${item.id} mangler verifisert Google-rating`);
  if (!item.ratings?.tripadvisor?.url || !Number.isFinite(item.ratings?.tripadvisor?.score)) errors.push(`food.json: ${item.id} mangler verifisert Tripadvisor-rating`);
  if (item.image) validateImage(item.image,`food.json image ${item.id}`);
}

const overnightBaseIds=trip.route.filter(x=>x.nights>0).map(x=>x.id);
for (const baseId of overnightBaseIds) {
  const count=hotels.filter(x=>x.baseId===baseId).length;
  if (count < 3) errors.push(`hotels.json: ${baseId} har bare ${count} hotellkandidater`);
}
const accommodationTypeIds=new Set((hotelData.accommodationTypes||[]).map(x=>x.id));
if (!hotelData.partyBasis) errors.push('hotels.json: partyBasis mangler');
if (!Array.isArray(hotelData.accommodationTypes) || hotelData.accommodationTypes.length < 4) errors.push('hotels.json: minst fire overnattingsformer skal beskrives');
for (const type of hotelData.accommodationTypes || []) {
  if (!type.id || !type.label || !type.description) errors.push('hotels.json: overnattingsform mangler id/label/description');
}
for (const example of hotelData.alternativeExamples || []) {
  if (!routeIds.has(example.baseId)) errors.push(`hotels.json: alternativ ${example.name} har ugyldig baseId ${example.baseId}`);
  if (!accommodationTypeIds.has(example.kind)) errors.push(`hotels.json: alternativ ${example.name} har ukjent kind ${example.kind}`);
  if (!example.name || !example.description || !/^https:\/\//.test(example.url||'')) errors.push('hotels.json: alternativt overnattingsspor mangler navn/beskrivelse/url');
}
for (const item of hotels) {
  if (!routeIds.has(item.baseId)) errors.push(`hotels.json: ${item.id} har ugyldig baseId ${item.baseId}`);
  if (!accommodationTypeIds.has(item.kind)) errors.push(`hotels.json: ${item.id} har ukjent kind ${item.kind}`);
  if (!validMap(item)) errors.push(`hotels.json: ${item.id} mangler gyldig kartposisjon`);
  if (!item.factsChecked) errors.push(`hotels.json: ${item.id} mangler factsChecked`);
  if (!Array.isArray(item.planningFamilyNightYen) || item.planningFamilyNightYen.length !== 2 || !item.planningFamilyNightYen.every(Number.isFinite)) errors.push(`hotels.json: ${item.id} mangler familieprisintervall`);
  if (!item.familyOption || !item.why || !item.logistics || !item.tradeoff) errors.push(`hotels.json: ${item.id} mangler vurderingstekst`);
  if (!item.links?.official || !item.links?.googleMaps) errors.push(`hotels.json: ${item.id} mangler offisiell side eller Google Maps`);
  if (!Array.isArray(item.sources) || item.sources.length === 0) errors.push(`hotels.json: ${item.id} mangler kilder`);
}

if (!/^https:\/\//.test(fx.liveEndpoint || '')) errors.push('fx.json: liveEndpoint må være HTTPS');
if (!/^https:\/\//.test(fx.sourceUrl || '')) errors.push('fx.json: sourceUrl må være HTTPS');
if (!Number.isFinite(fx.jpyPerNok) || !Number.isFinite(fx.nokPerJpy)) errors.push('fx.json: fallback-kurser mangler');
else if (Math.abs((fx.jpyPerNok * fx.nokPerJpy) - 1) > 0.000001) errors.push('fx.json: fallback-kursene er ikke inverse');
if (!fx.asOf) errors.push('fx.json: fallback mangler asOf');

const canonicalNarrativeFiles=[
  ['trip.json',trip],
  ['places.json',places],
  ['food.json',foodData],
  ['hotels.json',hotelData],
  ['transport.json',transport],
  ['guide.json',guide],
  ['prep.json',prep]
];
const narrativeOwners=new Map();
const collectNarrative=(value,file,pathLabel='
for (const item of sources) {
  if (!item.title || !item.url || !item.use) errors.push('sources.json: kilde mangler title/url/use');
  if (sourceUrls.has(item.url)) errors.push(`sources.json: duplikat URL ${item.url}`);
  sourceUrls.add(item.url);
}

const htmlFiles=fs.readdirSync('docs').filter(name=>name.endsWith('.html'));
for (const name of htmlFiles) {
  const file=`docs/${name}`;
  const html=fs.readFileSync(file,'utf8');
  if (!/<html lang="nb">/.test(html)) errors.push(`${file}: mangler lang="nb"`);
  if (!/<meta name="viewport"/.test(html)) errors.push(`${file}: mangler viewport`);
  const assetVersions=[...html.matchAll(/assets\/(?:style\.css|app\.js)\?v=([0-9.]+)/g)].map(m=>m[1]);
  if (!assetVersions.length || assetVersions.some(v=>v!==site.version)) errors.push(`${file}: assetversjon samsvarer ikke med site.json (${site.version})`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref=match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
    const clean=ref.split('#')[0].split('?')[0];
    if (!clean) continue;
    const target=path.resolve('docs',clean);
    if (!fs.existsSync(target)) errors.push(`${file}: lokal referanse finnes ikke: ${ref}`);
  }
}

if (fs.existsSync('docs/data/map-pois.json')) errors.push('docs/data/map-pois.json skal ikke finnes');
for (const required of ['docs/place.html','docs/restaurant.html','docs/hotels.html','docs/hotel.html']) {
  if (!fs.existsSync(required)) errors.push(`${required} mangler`);
}
const placeHtml=fs.readFileSync('docs/place.html','utf8');
if (!placeHtml.includes('id="place-map"') || !placeHtml.includes('maplibre-gl.js')) errors.push('place.html mangler generisk kartvisning');

const app = fs.readFileSync('docs/assets/app.js', 'utf8');
const style = fs.readFileSync('docs/assets/style.css', 'utf8');
if (!app.includes('async function renderRestaurant()') || !app.includes('restaurant.html?id=')) errors.push('app.js mangler generisk restaurantdetalj');
if (!app.includes('async function renderHotels()') || !app.includes('async function renderHotel()') || !app.includes('hotel.html?id=')) errors.push('app.js mangler overnattingsvisninger');
if (!app.includes('async function renderPlace()') || !app.includes("json('data/places.json')")) errors.push('app.js mangler kanonisk stedsvisning');
if (!app.includes('async function loadFx()') || !app.includes('providers=ecb')) errors.push('app.js mangler live ECB-kurs');
const directFxLoads=[...app.matchAll(/json\('data\/fx\.json'\)/g)].length;
if (directFxLoads !== 1) errors.push('app.js skal bare lese fx.json inne i loadFx()');
if (!app.includes('footer-version') || !app.includes("json('data/site.json')")) errors.push('footer mangler versjon/sist oppdatert');
if (!app.includes('1 NOK =') || !app.includes('1 JPY =')) errors.push('footer viser ikke kurs begge veier');
if (!app.includes('place-list-card')) errors.push('Steder bruker ikke kompakt kortliste');
if (!app.includes('setupJourneyFilters')) errors.push('app.js mangler felles filter for del av reisen');
if (!app.includes('routeContextLinksHtml') || !app.includes('places.html?base=') || !app.includes('food.html?base=') || !app.includes('hotels.html?base=')) {
  errors.push('app.js: rutesiden mangler kontekstnavigasjon videre til steder, mat eller overnatting');
}
if (!app.includes("new URLSearchParams(location.search).get(param)")) errors.push('app.js: reise-/basefilter kan ikke åpnes direkte fra URL');
if (!style.includes('grid-template-columns:112px minmax(0,1fr) 26px!important') || !style.includes('.place-list-primary-link::after')) {
  errors.push('style.css: mobil stedsrad mangler robust kompakt grid/klikkflate');
}
if (app.includes('<a class="route-thumb-wrap"')) errors.push('app.js: rute-thumbnail må ikke være ytre lenke rundt bildekreditering');
if (!app.includes('place-list-primary-link')) errors.push('app.js: stedskort mangler gyldig primærlenke uten nested anchor');
if (!app.includes('showPlaceDetail') || !app.includes('showFoodDetail') || !app.includes('showHotelDetail') || !app.includes('showStopDetail')) {
  errors.push('app.js: kartvalg synkroniserer ikke detaljpanelet for valgt innhold');
}
if (!app.includes("json('data/prep.json')")) errors.push('app.js henter ikke kanonisk prep.json for stedskoblinger');
if (!app.includes('Knutepunkter') || !transport.stationNote) errors.push('rutekartet forklarer ikke at stasjonene er utvalgte knutepunkter');
if (app.includes('guide.images') || app.includes('guide.placeExtras') || app.includes('areaImageKey(')) errors.push('app.js har gammel parallell stedsdata');
if (!app.includes('stationColors') || !app.includes('destinationColor(trip,m.leg.toRouteId)')) errors.push('stasjonsmarkører følger ikke destinasjonsfargene');
if (!app.includes("img.type==='ai'")) errors.push('app.js mangler tydelig AI-bildemerking');
if (app.includes('map-pois.json') || app.includes('mapPois')) errors.push('app.js refererer fortsatt til avledet map-pois-data');
for (const dataFile of ['food.json','places.json','hotels.json']) {
  if (!app.includes(`json('data/${dataFile}')`)) errors.push(`app.js henter ikke data/${dataFile}`);
}


if (!trip.overview?.hero?.placeId || !placeIds.has(trip.overview.hero.placeId)) {
  errors.push('trip.json: overview.hero.placeId mangler eller peker på ukjent sted');
}
if (!trip.overview?.hero?.eyebrow || !trip.overview?.hero?.title || !trip.overview?.hero?.intro) {
  errors.push('trip.json: overview.hero mangler offentlig inngangstekst');
}
if (!Array.isArray(trip.overview?.reasons) || trip.overview.reasons.length < 3 || trip.overview.reasons.some(x=>!x.title||!x.text)) {
  errors.push('trip.json: overview.reasons må ha minst tre komplette begrunnelser');
}
if (!trip.overview?.plan?.title || !trip.overview?.plan?.text) {
  errors.push('trip.json: overview.plan mangler title/text');
}
if (!transport.strategy) errors.push('transport.json: strategy mangler');

if (!Array.isArray(foodData.priceBands) || foodData.priceBands.length === 0) {
  errors.push('food.json: priceBands mangler');
} else {
  for (const band of foodData.priceBands) {
    if (!band.label) errors.push('food.json: prisbånd mangler label');
    if (band.minYen != null && !Number.isFinite(band.minYen)) errors.push(`food.json: prisbånd ${band.label} har ugyldig minYen`);
    if (band.maxYen != null && !Number.isFinite(band.maxYen)) errors.push(`food.json: prisbånd ${band.label} har ugyldig maxYen`);
  }
}
for (const note of foodData.planningNotes || []) {
  if (note.placeId && !placeIds.has(note.placeId)) errors.push(`food.json: planningNote har ukjent placeId ${note.placeId}`);
  if (!note.title || !note.body) errors.push('food.json: planningNote mangler title/body');
}

const allowedSiteKeys=new Set(['version','released']);
for (const key of Object.keys(site)) {
  if (!allowedSiteKeys.has(key)) errors.push(`site.json: ${key} hører ikke hjemme i offentlig release-metadata`);
}

const domainTerms=[
  ...places.map(x=>x.id),
  ...new Set(places.map(x=>x.area)),
  ...places.map(x=>x.name),
  ...food.map(x=>x.name),
  ...hotels.map(x=>x.name)
].filter(Boolean);
for (const term of domainTerms) {
  if (app.includes(`'${term}'`) || app.includes(`"${term}"`)) {
    errors.push(`app.js hardkoder domenedata "${term}"; flytt detaljen eller kurateringen til JSON`);
  }
}
for (const name of htmlFiles) {
  const file=`docs/${name}`;
  const html=fs.readFileSync(file,'utf8');
  for (const term of [...new Set([...places.map(x=>x.name),...food.map(x=>x.name),...hotels.map(x=>x.name)])]) {
    if (term && html.includes(term)) errors.push(`${file}: hardkoder domenedata "${term}"; vis via JSON`);
  }
}
if (!app.includes('entityMediaHtml') || app.includes('cardImageHtml')) {
  errors.push('app.js: felles entityMediaHtml-primitiv mangler eller gammel cardImageHtml brukes fortsatt');
}
if (!app.includes('relatedEntityCardHtml') || app.includes('class="restaurant-alt ')) {
  errors.push('app.js: relaterte objekter bruker ikke felles relatedEntityCardHtml');
}

if (errors.length) {
  console.error('Dataintegritetsfeil:\n' + errors.map(x => `- ${x}`).join('\n'));
  process.exit(1);
}
console.log(`OK: ${places.length} steder, ${food.filter(x=>x.status==='active').length} restauranter og ${hotels.length} overnattingskandidater bruker kanoniske data.`);
)=>{
  if(typeof value==='string'){
    const text=value.trim();
    if(text.length<18 || /^https?:\/\//.test(text) || /^CC\b/.test(text)) return;
    const key=text.toLocaleLowerCase('nb-NO');
    const rows=narrativeOwners.get(key)||[];
    rows.push({file,path:pathLabel,text});
    narrativeOwners.set(key,rows);
    return;
  }
  if(Array.isArray(value)) return value.forEach((item,i)=>collectNarrative(item,file,`${pathLabel}[${i}]`));
  if(value&&typeof value==='object') for(const [key,item] of Object.entries(value)) collectNarrative(item,file,`${pathLabel}.${key}`);
};
for(const [file,value] of canonicalNarrativeFiles) collectNarrative(value,file);
for(const rows of narrativeOwners.values()){
  const files=new Set(rows.map(x=>x.file));
  if(files.size>1) errors.push(`Kanonisk tekst duplisert på tvers av domener: "${rows[0].text}" (${[...files].join(', ')})`);
}

const sourceUrls=new Set();
for (const item of sources) {
  if (!item.title || !item.url || !item.use) errors.push('sources.json: kilde mangler title/url/use');
  if (sourceUrls.has(item.url)) errors.push(`sources.json: duplikat URL ${item.url}`);
  sourceUrls.add(item.url);
}

const htmlFiles=fs.readdirSync('docs').filter(name=>name.endsWith('.html'));
for (const name of htmlFiles) {
  const file=`docs/${name}`;
  const html=fs.readFileSync(file,'utf8');
  if (!/<html lang="nb">/.test(html)) errors.push(`${file}: mangler lang="nb"`);
  if (!/<meta name="viewport"/.test(html)) errors.push(`${file}: mangler viewport`);
  const assetVersions=[...html.matchAll(/assets\/(?:style\.css|app\.js)\?v=([0-9.]+)/g)].map(m=>m[1]);
  if (!assetVersions.length || assetVersions.some(v=>v!==site.version)) errors.push(`${file}: assetversjon samsvarer ikke med site.json (${site.version})`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref=match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
    const clean=ref.split('#')[0].split('?')[0];
    if (!clean) continue;
    const target=path.resolve('docs',clean);
    if (!fs.existsSync(target)) errors.push(`${file}: lokal referanse finnes ikke: ${ref}`);
  }
}

if (fs.existsSync('docs/data/map-pois.json')) errors.push('docs/data/map-pois.json skal ikke finnes');
for (const required of ['docs/place.html','docs/restaurant.html','docs/hotels.html','docs/hotel.html']) {
  if (!fs.existsSync(required)) errors.push(`${required} mangler`);
}
const placeHtml=fs.readFileSync('docs/place.html','utf8');
if (!placeHtml.includes('id="place-map"') || !placeHtml.includes('maplibre-gl.js')) errors.push('place.html mangler generisk kartvisning');

const app = fs.readFileSync('docs/assets/app.js', 'utf8');
const style = fs.readFileSync('docs/assets/style.css', 'utf8');
if (!app.includes('async function renderRestaurant()') || !app.includes('restaurant.html?id=')) errors.push('app.js mangler generisk restaurantdetalj');
if (!app.includes('async function renderHotels()') || !app.includes('async function renderHotel()') || !app.includes('hotel.html?id=')) errors.push('app.js mangler overnattingsvisninger');
if (!app.includes('async function renderPlace()') || !app.includes("json('data/places.json')")) errors.push('app.js mangler kanonisk stedsvisning');
if (!app.includes('async function loadFx()') || !app.includes('providers=ecb')) errors.push('app.js mangler live ECB-kurs');
const directFxLoads=[...app.matchAll(/json\('data\/fx\.json'\)/g)].length;
if (directFxLoads !== 1) errors.push('app.js skal bare lese fx.json inne i loadFx()');
if (!app.includes('footer-version') || !app.includes("json('data/site.json')")) errors.push('footer mangler versjon/sist oppdatert');
if (!app.includes('1 NOK =') || !app.includes('1 JPY =')) errors.push('footer viser ikke kurs begge veier');
if (!app.includes('place-list-card')) errors.push('Steder bruker ikke kompakt kortliste');
if (!app.includes('setupJourneyFilters')) errors.push('app.js mangler felles filter for del av reisen');
if (!app.includes('routeContextLinksHtml') || !app.includes('places.html?base=') || !app.includes('food.html?base=') || !app.includes('hotels.html?base=')) {
  errors.push('app.js: rutesiden mangler kontekstnavigasjon videre til steder, mat eller overnatting');
}
if (!app.includes("new URLSearchParams(location.search).get(param)")) errors.push('app.js: reise-/basefilter kan ikke åpnes direkte fra URL');
if (!style.includes('grid-template-columns:112px minmax(0,1fr) 26px!important') || !style.includes('.place-list-primary-link::after')) {
  errors.push('style.css: mobil stedsrad mangler robust kompakt grid/klikkflate');
}
if (app.includes('<a class="route-thumb-wrap"')) errors.push('app.js: rute-thumbnail må ikke være ytre lenke rundt bildekreditering');
if (!app.includes('place-list-primary-link')) errors.push('app.js: stedskort mangler gyldig primærlenke uten nested anchor');
if (!app.includes('showPlaceDetail') || !app.includes('showFoodDetail') || !app.includes('showHotelDetail') || !app.includes('showStopDetail')) {
  errors.push('app.js: kartvalg synkroniserer ikke detaljpanelet for valgt innhold');
}
if (!app.includes("json('data/prep.json')")) errors.push('app.js henter ikke kanonisk prep.json for stedskoblinger');
if (!app.includes('Knutepunkter') || !transport.stationNote) errors.push('rutekartet forklarer ikke at stasjonene er utvalgte knutepunkter');
if (app.includes('guide.images') || app.includes('guide.placeExtras') || app.includes('areaImageKey(')) errors.push('app.js har gammel parallell stedsdata');
if (!app.includes('stationColors') || !app.includes('destinationColor(trip,m.leg.toRouteId)')) errors.push('stasjonsmarkører følger ikke destinasjonsfargene');
if (!app.includes("img.type==='ai'")) errors.push('app.js mangler tydelig AI-bildemerking');
if (app.includes('map-pois.json') || app.includes('mapPois')) errors.push('app.js refererer fortsatt til avledet map-pois-data');
for (const dataFile of ['food.json','places.json','hotels.json']) {
  if (!app.includes(`json('data/${dataFile}')`)) errors.push(`app.js henter ikke data/${dataFile}`);
}


if (!trip.overview?.hero?.placeId || !placeIds.has(trip.overview.hero.placeId)) {
  errors.push('trip.json: overview.hero.placeId mangler eller peker på ukjent sted');
}
if (!trip.overview?.hero?.eyebrow || !trip.overview?.hero?.title || !trip.overview?.hero?.intro) {
  errors.push('trip.json: overview.hero mangler offentlig inngangstekst');
}
if (!Array.isArray(trip.overview?.reasons) || trip.overview.reasons.length < 3 || trip.overview.reasons.some(x=>!x.title||!x.text)) {
  errors.push('trip.json: overview.reasons må ha minst tre komplette begrunnelser');
}
if (!trip.overview?.plan?.title || !trip.overview?.plan?.text) {
  errors.push('trip.json: overview.plan mangler title/text');
}
if (!transport.strategy) errors.push('transport.json: strategy mangler');

if (!Array.isArray(foodData.priceBands) || foodData.priceBands.length === 0) {
  errors.push('food.json: priceBands mangler');
} else {
  for (const band of foodData.priceBands) {
    if (!band.label) errors.push('food.json: prisbånd mangler label');
    if (band.minYen != null && !Number.isFinite(band.minYen)) errors.push(`food.json: prisbånd ${band.label} har ugyldig minYen`);
    if (band.maxYen != null && !Number.isFinite(band.maxYen)) errors.push(`food.json: prisbånd ${band.label} har ugyldig maxYen`);
  }
}
for (const note of foodData.planningNotes || []) {
  if (note.placeId && !placeIds.has(note.placeId)) errors.push(`food.json: planningNote har ukjent placeId ${note.placeId}`);
  if (!note.title || !note.body) errors.push('food.json: planningNote mangler title/body');
}

const allowedSiteKeys=new Set(['version','released']);
for (const key of Object.keys(site)) {
  if (!allowedSiteKeys.has(key)) errors.push(`site.json: ${key} hører ikke hjemme i offentlig release-metadata`);
}

const domainTerms=[
  ...places.map(x=>x.id),
  ...new Set(places.map(x=>x.area)),
  ...places.map(x=>x.name),
  ...food.map(x=>x.name),
  ...hotels.map(x=>x.name)
].filter(Boolean);
for (const term of domainTerms) {
  if (app.includes(`'${term}'`) || app.includes(`"${term}"`)) {
    errors.push(`app.js hardkoder domenedata "${term}"; flytt detaljen eller kurateringen til JSON`);
  }
}
for (const name of htmlFiles) {
  const file=`docs/${name}`;
  const html=fs.readFileSync(file,'utf8');
  for (const term of [...new Set([...places.map(x=>x.name),...food.map(x=>x.name),...hotels.map(x=>x.name)])]) {
    if (term && html.includes(term)) errors.push(`${file}: hardkoder domenedata "${term}"; vis via JSON`);
  }
}
if (!app.includes('entityMediaHtml') || app.includes('cardImageHtml')) {
  errors.push('app.js: felles entityMediaHtml-primitiv mangler eller gammel cardImageHtml brukes fortsatt');
}
if (!app.includes('relatedEntityCardHtml') || app.includes('class="restaurant-alt ')) {
  errors.push('app.js: relaterte objekter bruker ikke felles relatedEntityCardHtml');
}

if (errors.length) {
  console.error('Dataintegritetsfeil:\n' + errors.map(x => `- ${x}`).join('\n'));
  process.exit(1);
}
console.log(`OK: ${places.length} steder, ${food.filter(x=>x.status==='active').length} restauranter og ${hotels.length} overnattingskandidater bruker kanoniske data.`);
