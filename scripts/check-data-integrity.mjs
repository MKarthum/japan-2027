import fs from 'node:fs';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const food = readJson('docs/data/food.json');
const places = readJson('docs/data/places.json');
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

for (const item of food.filter(x => x.status === 'active')) {
  if (!validMap(item)) errors.push(`food.json: aktiv kandidat ${item.id} mangler gyldig map.lat/map.lng`);
}
for (const item of places.filter(x => x.map?.showOnRouteMap !== false && x.map)) {
  if (!validMap(item)) errors.push(`places.json: ${item.id} har ugyldig kartposisjon`);
}

if (fs.existsSync('docs/data/map-pois.json')) {
  errors.push('docs/data/map-pois.json skal ikke finnes; kartdata skal ligge i kanoniske detaljfiler');
}

const app = fs.readFileSync('docs/assets/app.js', 'utf8');
if (app.includes('map-pois.json') || app.includes('mapPois')) {
  errors.push('app.js refererer fortsatt til avledet map-pois-data');
}
if (!app.includes("json('data/food.json?v=0.10.1')") || !app.includes("json('data/places.json?v=0.10.1')")) {
  errors.push('rutekartet henter ikke eksplisitt de kanoniske food/places-kildene');
}

if (errors.length) {
  console.error('Dataintegritetsfeil:\n' + errors.map(x => `- ${x}`).join('\n'));
  process.exit(1);
}

console.log(`OK: ${food.filter(x=>x.status==='active').length} aktive restauranter og ${places.filter(x=>validMap(x)).length} kartfestede steder bruker kanoniske detaljkilder.`);
