import fs from 'node:fs';

const site = JSON.parse(fs.readFileSync('docs/data/site.json', 'utf8'));
const errors = [];
const htmlFiles = fs.readdirSync('docs').filter(name => name.endsWith('.html')).map(name => `docs/${name}`);

const publicDataFiles = [
  'docs/data/trip.json',
  'docs/data/food.json',
  'docs/data/places.json',
  'docs/data/guide.json',
  'docs/data/prep.json',
  'docs/data/transport.json',
  'docs/data/hotels.json',
  'docs/data/pages.json',
  'docs/data/passes.json'
];

const historyPatterns = [
  ['«ny kandidat»', /ny kandidat/i],
  ['«ny hovedkandidat»', /ny hovedkandidat/i],
  ['«nedgradert»', /nedgradert/i],
  ['«beholdes»', /beholdes/i],
  ['«fjernes fra kortlisten»', /fjernes fra kortlisten/i],
  ['«vi har lagt»', /vi har lagt/i],
  ['«nettopp»', /nettopp/i],
  ['«lagt inn ennå»', /lagt inn ennå/i],
  ['«ikke avklart»', /ikke avklart/i],
  ['«ekstra kandidat»', /ekstra kandidat/i]
];

for (const file of [...htmlFiles, ...publicDataFiles, 'docs/assets/app.js']) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of historyPatterns) {
    if (pattern.test(text)) errors.push(`${file}: offentlig tekst inneholder endringsloggspråk ${label}`);
  }
}

const technicalUiPatterns = [
  ['map-pois.json', /map-pois\.json/i],
  ['places.json', /places\.json/i],
  ['food.json', /food\.json/i],
  ['MapLibre-biblioteket', /MapLibre-biblioteket/i],
  ['kanonisk', /kanonisk/i]
];

for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of technicalUiPatterns) {
    if (pattern.test(text)) errors.push(`${file}: teknisk implementasjonsdetalj i offentlig UI: ${label}`);
  }

  for (const match of text.matchAll(/assets\/(?:style\.css|app\.js)\?v=([0-9.]+)/g)) {
    if (match[1] !== site.version) errors.push(`${file}: assetversjon ${match[1]} samsvarer ikke med site.json ${site.version}`);
  }
}

const app = fs.readFileSync('docs/assets/app.js', 'utf8');
if (/Ikke kontrollert/i.test(app)) {
  errors.push('docs/assets/app.js: UI skal skjule uverifiserte felter, ikke vise «Ikke kontrollert»');
}
if (/Ingen konkret bestillingsanbefaling lagt inn ennå/i.test(app)) {
  errors.push('docs/assets/app.js: UI inneholder research-placeholder for bestillingsforslag');
}

if (errors.length) {
  console.error('Innholdsstilfeil:\n' + errors.map(x => `- ${x}`).join('\n'));
  process.exit(1);
}

console.log(`OK: offentlig tekst er tidløs, tekniske detaljer er skjult, og assets bruker v${site.version}.`);
