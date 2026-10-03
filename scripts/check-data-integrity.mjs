import fs from 'node:fs';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const food = readJson('docs/data/food.json');
const places = readJson('docs/data/places.json');
const trip = readJson('docs/data/trip.json');
const routeGeometry = readJson('docs/data/route-geometry.json');
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

uniqueIds(food, 'food.json');
uniqueIds(places, 'places.json');
uniqueIds(hotels, 'hotels.json');

const routeIds = new Set(trip.route.map(x => x.id));
const themedAreas = new Set();
for (const stop of trip.route) {
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
}
for (const dayTrip of trip.dayTrips || []) {
  if (!dayTrip.destinationId || !routeIds.has(dayTrip.destinationId)) {
    errors.push(`trip.json: dagstur ${dayTrip.id} mangler gyldig destinationId`);
  }
}
for (const item of [...places, ...food.filter(x => x.status === 'active')]) {
  if (!themedAreas.has(item.area)) errors.push(`${item.id}: området ${item.area} mangler destinasjonstema i trip.json`);
}
for (const part of routeGeometry.parts || []) {
  if ('color' in part) errors.push(`route-geometry.json: ${part.journeyId} lagrer color; fargen skal avledes fra trip.json`);
  if (!Number.isFinite(part.offset)) errors.push(`route-geometry.json: ${part.journeyId} mangler numerisk offset`);
}

for (const item of food.filter(x => x.status === 'active')) {
  if (!validMap(item)) errors.push(`food.json: aktiv kandidat ${item.id} mangler gyldig map.lat/map.lng`);
  if (!item.factsChecked) errors.push(`food.json: ${item.id} mangler factsChecked`);
  if (!Array.isArray(item.orderRecommendations) || item.orderRecommendations.length === 0) errors.push(`food.json: ${item.id} mangler bestillingsforslag`);
  if (!item.links?.googleMaps) errors.push(`food.json: ${item.id} mangler Google Maps-lenke`);
  if (!item.links?.menu) errors.push(`food.json: ${item.id} mangler menylenke`);
  if (!item.ratings?.checked) errors.push(`food.json: ${item.id} mangler dato for ratingkontroll`);
  if (!item.ratings?.google?.url || !Number.isFinite(item.ratings?.google?.score)) errors.push(`food.json: ${item.id} mangler verifisert Google-rating`);
  if (!item.ratings?.tripadvisor?.url || !Number.isFinite(item.ratings?.tripadvisor?.score)) errors.push(`food.json: ${item.id} mangler verifisert Tripadvisor-rating`);
  if (item.image && (!item.image.url || !item.image.source || !item.image.credit || !item.image.license)) errors.push(`food.json: ${item.id} har bilde uten full kreditering/lisens`);
}
for (const item of places.filter(x => x.map?.showOnRouteMap !== false && x.map)) {
  if (!validMap(item)) errors.push(`places.json: ${item.id} har ugyldig kartposisjon`);
}

for (const item of hotels) {
  if (!routeIds.has(item.baseId)) errors.push(`hotels.json: ${item.id} har ugyldig baseId ${item.baseId}`);
  if (!validMap(item)) errors.push(`hotels.json: ${item.id} mangler gyldig kartposisjon`);
  if (!item.factsChecked) errors.push(`hotels.json: ${item.id} mangler factsChecked`);
  if (!Array.isArray(item.planningFamilyNightYen) || item.planningFamilyNightYen.length !== 2 || !item.planningFamilyNightYen.every(Number.isFinite)) errors.push(`hotels.json: ${item.id} mangler familieprisintervall`);
  if (!item.links?.official || !item.links?.googleMaps) errors.push(`hotels.json: ${item.id} mangler offisiell side eller Google Maps`);
  if (!Array.isArray(item.sources) || item.sources.length === 0) errors.push(`hotels.json: ${item.id} mangler kilder`);
}

if (fs.existsSync('docs/data/map-pois.json')) {
  errors.push('docs/data/map-pois.json skal ikke finnes; kartdata skal ligge i kanoniske detaljfiler');
}

if (!fs.existsSync('docs/hotel.html') || !fs.existsSync('docs/hotels.html')) {
  errors.push('hotellvisningene mangler');
}

if (!fs.existsSync('docs/restaurant.html')) {
  errors.push('docs/restaurant.html mangler; restauranter skal bruke én generisk detaljvisning');
}

const app = fs.readFileSync('docs/assets/app.js', 'utf8');
if (!app.includes('async function renderRestaurant()') || !app.includes('restaurant.html?id=')) {
  errors.push('app.js mangler generisk restaurantdetalj eller direkte restaurantlenker');
}
if (!app.includes('restaurant-order') || !app.includes('restaurant-ratings')) {
  errors.push('restaurantdetaljen mangler bestillingsforslag eller ratingvisning');
}
if (!app.includes('stationColors') || !app.includes('destinationColor(trip,m.leg.toRouteId)')) {
  errors.push('stasjonsmarkører følger ikke destinasjonsfargene');
}
if (!app.includes('renderHotels()') || !app.includes('renderHotel()') || !app.includes("data-map-layer=\"hotel\"")) {
  errors.push('hotellindeks, detaljvisning eller kartlag mangler');
}
if (app.includes('map-pois.json') || app.includes('mapPois')) {
  errors.push('app.js refererer fortsatt til avledet map-pois-data');
}
if (!app.includes("json('data/food.json')") || !app.includes("json('data/places.json')") || !app.includes("json('data/hotels.json')")) {
  errors.push('appen henter ikke eksplisitt food.json, places.json og hotels.json');
}

if (errors.length) {
  console.error('Dataintegritetsfeil:\n' + errors.map(x => `- ${x}`).join('\n'));
  process.exit(1);
}

console.log(`OK: ${food.filter(x=>x.status==='active').length} aktive restauranter og ${places.filter(x=>validMap(x)).length} kartfestede steder bruker kanoniske detaljkilder.`);
