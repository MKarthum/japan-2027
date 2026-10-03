import fs from 'node:fs';
import path from 'node:path';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const food = readJson('docs/data/food.json');
const places = readJson('docs/data/places.json');
const trip = readJson('docs/data/trip.json');
const routeGeometry = readJson('docs/data/route-geometry.json');
const transport = readJson('docs/data/transport.json');
const guide = readJson('docs/data/guide.json');
const sources = readJson('docs/data/sources.json');
const hotelData = readJson('docs/data/hotels.json');
const hotels = hotelData.hotels || [];
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
    Number.isFinite(item.map.lng) && item.map.lng >= -180 && item.map.lng <= 180;
}

function dateDays(a,b) {
  return (Date.parse(b) - Date.parse(a)) / 86400000;
}

function validateImage(img,label) {
  if (!img?.url || !img?.source || !img?.credit || !img?.license || !img?.licenseUrl) {
    errors.push(`${label}: bilde mangler url/source/credit/license/licenseUrl`);
    return;
  }
  const commons = img.source.startsWith('https://commons.wikimedia.org/wiki/File:');
  const explicitlyAllowed = img.ownedByProject === true || Boolean(img.permissionUrl);
  if (!commons && !explicitlyAllowed) {
    errors.push(`${label}: bildekilden har ikke dokumentert gjenbruksgrunnlag`);
  }
}

uniqueIds(food, 'food.json');
uniqueIds(places, 'places.json');
uniqueIds(hotels, 'hotels.json');

const placeIds = new Set(places.map(x => x.id));
const routeIds = new Set(trip.route.map(x => x.id));
const themedAreas = new Set();

for (let i=0;i<trip.route.length;i++) {
  const stop=trip.route[i];
  if (!placeIds.has(stop.id)) errors.push(`trip.json: rutestopp ${stop.id} mangler i places.json`);
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
  if (!dayTrip.destinationId || !routeIds.has(dayTrip.destinationId)) {
    errors.push(`trip.json: dagstur ${dayTrip.id} mangler gyldig destinationId`);
  }
}

for (const item of [...places, ...food.filter(x => x.status === 'active')]) {
  if (!themedAreas.has(item.area)) errors.push(`${item.id}: området ${item.area} mangler destinasjonstema i trip.json`);
}

const legIds=new Set(transport.legs.map(x=>x.id));
if (transport.legs.length !== trip.route.length-1) {
  errors.push('transport.json: antall etapper samsvarer ikke med hovedruten');
}
for (let i=0;i<transport.legs.length;i++) {
  const leg=transport.legs[i];
  const from=trip.route[i], to=trip.route[i+1];
  if (!from || !to || leg.fromRouteId!==from.id || leg.toRouteId!==to.id) {
    errors.push(`transport.json: etappe ${leg.id} følger ikke hovedrutens rekkefølge`);
  }
  if (leg.fare?.family2a2cYen !== leg.fare?.adultYen*2 + leg.fare?.childYen*2) {
    errors.push(`transport.json: familiepris stemmer ikke for ${leg.id}`);
  }
  const elapsed=(leg.stations||[]).map(s=>s.elapsedMin);
  if (elapsed.some((n,j)=>!Number.isFinite(n)||(j>0&&n<elapsed[j-1]))) {
    errors.push(`transport.json: stasjonstidene er ugyldige for ${leg.id}`);
  }
}

for (const part of routeGeometry.parts || []) {
  if (!legIds.has(part.journeyId)) errors.push(`route-geometry.json: ukjent journeyId ${part.journeyId}`);
  if ('color' in part) errors.push(`route-geometry.json: ${part.journeyId} lagrer color; fargen skal avledes fra trip.json`);
  if (!Number.isFinite(part.offset)) errors.push(`route-geometry.json: ${part.journeyId} mangler numerisk offset`);
  if (!Array.isArray(part.coords) || part.coords.length < 2) errors.push(`route-geometry.json: ${part.journeyId} mangler geometri`);
}

for (const item of places) {
  for (const key of ['id','name','area','type','simple','description','why']) {
    if (!item[key]) errors.push(`places.json: ${item.id||'(uten id)'} mangler ${key}`);
  }
  if (!Array.isArray(item.highlights) || !Array.isArray(item.prep)) errors.push(`places.json: ${item.id} mangler highlights/prep-lister`);
  if (item.map && !validMap(item)) errors.push(`places.json: ${item.id} har ugyldig kartposisjon`);
}

const areaImageFallback={Tokyo:'tokyo','Hakone / Fuji':'hakone',Kyoto:'kyoto',Nara:'nara',Himeji:'himeji',Hiroshima:'hiroshima',Miyajima:'hiroshima',Osaka:'osaka'};
const idImageFallback={tokyo:'tokyo',hakone:'hakone',kyoto:'kyoto',himeji:'himeji',hiroshima:'hiroshima',osaka:'osaka'};
const resolvedImages=new Map();
for (const [id,extra] of Object.entries(guide.placeExtras||{})) {
  if (!placeIds.has(id)) errors.push(`guide.json: placeExtras har ukjent sted ${id}`);
  if (extra.image && !guide.images?.[extra.image]) errors.push(`guide.json: ${id} peker til ukjent bilde ${extra.image}`);
}
for (const item of places) {
  const key=guide.placeExtras?.[item.id]?.image || areaImageFallback[item.area] || idImageFallback[item.id];
  const img=guide.images?.[key];
  if (!img) {
    errors.push(`guide.json: ${item.id} mangler representativt bilde`);
    continue;
  }
  validateImage(img,`guide.json image ${key}`);
  if (resolvedImages.has(img.url)) {
    errors.push(`guide.json: ${item.id} og ${resolvedImages.get(img.url)} bruker samme stedbilde`);
  } else {
    resolvedImages.set(img.url,item.id);
  }
}
for (const [key,img] of Object.entries(guide.images||{})) validateImage(img,`guide.json image ${key}`);

for (const item of food.filter(x => x.status === 'active')) {
  if (!validMap(item)) errors.push(`food.json: aktiv kandidat ${item.id} mangler gyldig map.lat/map.lng`);
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
for (const item of hotels) {
  if (!routeIds.has(item.baseId)) errors.push(`hotels.json: ${item.id} har ugyldig baseId ${item.baseId}`);
  if (!validMap(item)) errors.push(`hotels.json: ${item.id} mangler gyldig kartposisjon`);
  if (!item.factsChecked) errors.push(`hotels.json: ${item.id} mangler factsChecked`);
  if (!Array.isArray(item.planningFamilyNightYen) || item.planningFamilyNightYen.length !== 2 || !item.planningFamilyNightYen.every(Number.isFinite)) errors.push(`hotels.json: ${item.id} mangler familieprisintervall`);
  if (!item.familyOption || !item.why || !item.logistics || !item.tradeoff) errors.push(`hotels.json: ${item.id} mangler vurderingstekst`);
  if (!item.links?.official || !item.links?.googleMaps) errors.push(`hotels.json: ${item.id} mangler offisiell side eller Google Maps`);
  if (!Array.isArray(item.sources) || item.sources.length === 0) errors.push(`hotels.json: ${item.id} mangler kilder`);
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
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref=match[1];
    if (/^(?:https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
    const clean=ref.split('#')[0].split('?')[0];
    if (!clean) continue;
    const target=path.resolve('docs',clean);
    if (!fs.existsSync(target)) errors.push(`${file}: lokal referanse finnes ikke: ${ref}`);
  }
}

if (fs.existsSync('docs/data/map-pois.json')) {
  errors.push('docs/data/map-pois.json skal ikke finnes; kartdata skal ligge i kanoniske detaljfiler');
}
for (const required of ['docs/place.html','docs/restaurant.html','docs/hotels.html','docs/hotel.html']) {
  if (!fs.existsSync(required)) errors.push(`${required} mangler`);
}

const app = fs.readFileSync('docs/assets/app.js', 'utf8');
if (!app.includes('async function renderRestaurant()') || !app.includes('restaurant.html?id=')) errors.push('app.js mangler generisk restaurantdetalj');
if (!app.includes('async function renderHotels()') || !app.includes('async function renderHotel()') || !app.includes('hotel.html?id=')) errors.push('app.js mangler hotellvisninger');
if (!app.includes('stationColors') || !app.includes('destinationColor(trip,m.leg.toRouteId)')) errors.push('stasjonsmarkører følger ikke destinasjonsfargene');
if (!app.includes('imageCreditHtml') || !app.includes('licenseUrl')) errors.push('app.js viser ikke dokumentert bildekreditering');
if (app.includes('map-pois.json') || app.includes('mapPois')) errors.push('app.js refererer fortsatt til avledet map-pois-data');
for (const dataFile of ['food.json','places.json','hotels.json']) {
  if (!app.includes(`json('data/${dataFile}')`)) errors.push(`app.js henter ikke data/${dataFile}`);
}

if (errors.length) {
  console.error('Dataintegritetsfeil:\n' + errors.map(x => `- ${x}`).join('\n'));
  process.exit(1);
}

console.log(`OK: ${food.filter(x=>x.status==='active').length} restauranter, ${hotels.length} hoteller og ${places.length} steder er konsistente og kilde-/bildesjekket.`);
