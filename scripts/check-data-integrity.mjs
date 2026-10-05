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
const passes = readJson('docs/data/passes.json');
const flights = readJson('docs/data/flights.json');
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
  home:['whyEyebrow','whyTitle','whyIntro','useEyebrow','useTitle','useIntro','navFlights'],
  flights:['eyebrow','title','intro','patternsEyebrow','patternsTitle','patternsIntro','datesEyebrow','datesTitle','datesIntro','routesEyebrow','routesTitle','routesIntro','pricesEyebrow','pricesTitle','pricesIntro','safetyEyebrow','safetyTitle','safetyIntro','packagesEyebrow','packagesTitle','packagesIntro','searchEyebrow','searchTitle','searchIntro','captureEyebrow','captureTitle','captureIntro','sourcesEyebrow','sourcesTitle','sourcesIntro'],
  route:['eyebrow','listEyebrow','listTitle','listIntro','transportTitle','mapNote'],
  places:['eyebrow','title','intro','filterLabel'],
  food:['eyebrow','title','intro','filterLabel','watchTitle'],
  hotels:['eyebrow','title','intro','typesTitle','baseFilterLabel','typeFilterLabel'],
  prep:['eyebrow','title','intro','audienceEyebrow','audienceTitle','audienceIntro'],
  practical:['eyebrow','title','intro','transportTitle','passesEyebrow','passesTitle','passesIntro','bookingTitle','phrasesTitle','namesTitle','etiquetteTitle'],
  budget:['eyebrow','title','intro','distributionTitle'],
  sources:['eyebrow','title','intro'],
  privacy:['eyebrow','title','intro','publicTitle'],
  phrases:['eyebrow','title','intro','basicsTitle','basicsIntro','audioNote']
};
for(const [page,keys] of Object.entries(requiredPageCopy)){
  if(!pages[page]) errors.push(`pages.json: mangler ${page}`);
  else for(const key of keys) if(typeof pages[page][key]!=='string'||!pages[page][key].trim()) errors.push(`pages.json: ${page}.${key} mangler`);
}

if (!flights.asOf || !Number.isInteger(flights.planningWindow?.flexDays) || flights.planningWindow.flexDays !== 3 || !flights.planningWindow?.summary) {
  errors.push('flights.json: planleggingsvindu er ufullstendig');
}
if ('baselineDepart' in (flights.planningWindow||{}) || 'baselineReturn' in (flights.planningWindow||{}) || 'datePairs' in flights) {
  errors.push('flights.json: reisedatoer eies av trip.json; flydata skal bare lagre fleksibilitetsregelen');
}
if (!Number.isFinite(flights.bookingSignals?.tokyo?.bestWeeksBefore) || !Number.isFinite(flights.bookingSignals?.osaka?.bestWeeksBefore)) {
  errors.push('flights.json: bookingSignals mangler');
}
for (const [key,min] of [['itineraryPatterns',4],['carrierOptions',6],['fareObservations',3],['packageChecks',3],['manualSearches',6]]) {
  if (!Array.isArray(flights[key]) || flights[key].length < min) errors.push(`flights.json: ${key} mangler tilstrekkelig beslutningsgrunnlag`);
  else uniqueIds(flights[key],`flights.json ${key}`);
}
if (!Array.isArray(flights.sources) || flights.sources.length < 8) errors.push('flights.json: kildelisten er for svak');
const httpsOnly=(url)=>/^https:\/\//.test(url||'') && !/[?&](?:token|session|account|profile|user|booking(?:ref|reference)|pnr)=/i.test(url||'');
for (const row of flights.carrierOptions || []) {
  if (!row.airline || !row.hub || !row.fit || !row.tokyo || !row.osaka || !row.why || !httpsOnly(row.officialSearch) || !httpsOnly(row.routeSource)) {
    errors.push(`flights.json: flyselskap ${row.id||'(uten id)'} er ufullstendig eller har privat/ugyldig lenke`);
  }
}
for (const row of flights.fareObservations || []) {
  if (!row.kind || !row.route || !row.dates || !row.basis || !row.use || !row.checked || !httpsOnly(row.source)) errors.push(`flights.json: prisobservasjon ${row.id||'(uten id)'} er ufullstendig`);
}
for (const row of flights.packageChecks || []) {
  if (!row.provider || !row.kind || !row.dates || !row.signal || !row.compareAs || !row.checked || !httpsOnly(row.url)) errors.push(`flights.json: pakkesjekk ${row.id||'(uten id)'} er ufullstendig`);
}
for (const row of flights.manualSearches || []) {
  if (!['start','compare','direct','package'].includes(row.stage) || !row.priority || !row.title || !row.instruction || !row.captureKey || !httpsOnly(row.url)) errors.push(`flights.json: manuelt søk ${row.id||'(uten id)'} er ufullstendig`);
}
const startSearches=(flights.manualSearches||[]).filter(x=>x.stage==='start');
if (!startSearches.some(x=>/google\.com\/travel\/flights/.test(x.url)) || !startSearches.some(x=>/finn\.no\/reise\/flybilletter/.test(x.url))) errors.push('flights.json: første søketrinn skal inneholde både Google Flights og FINN Reise');
if ((flights.itineraryPatterns||[]).some(x=>/open-jaw|åpen kjeve/i.test(JSON.stringify(x))) || /open-jaw|åpen kjeve/i.test(JSON.stringify(pages.flights||{}))) errors.push('flysiden skal bruke forståelig språk for ulik inn-/utreiseby, ikke open-jaw/åpen kjeve');
for (const row of flights.sources || []) {
  if (!row.title || !row.use || !httpsOnly(row.url)) errors.push('flights.json: kilde er ufullstendig eller har ugyldig lenke');
}
if (!flights.safety?.euList?.checked || !httpsOnly(flights.safety?.euList?.source) || !flights.safety?.airspaceWatch?.checked || !httpsOnly(flights.safety?.airspaceWatch?.source)) {
  errors.push('flights.json: sikkerhetsgrunnlaget mangler datert regulatorisk/luftromskilde');
}
if (!Array.isArray(flights.capture?.fields) || flights.capture.fields.length < 8 || !flights.capture?.instruction) errors.push('flights.json: resultatmal mangler');
if ((flights.manualSearches||[]).some(x=>/booking|checkout|payment|manage-booking/i.test(x.url||''))) errors.push('flights.json: manuelle søk skal bruke offentlige søke-/destinasjonssider, ikke booking-sessioner');

// Interactive observations are dated evidence, never a second trip calendar.
for (const key of ['searchRuns','candidates','directChecks']) {
  if (!Array.isArray(flights[key]) || !flights[key].length) errors.push(`flights.json: ${key} mangler`);
  else uniqueIds(flights[key],`flights.json ${key}`);
}
const patternIds=new Set((flights.itineraryPatterns||[]).map(x=>x.id));
const candidateIds=new Set((flights.candidates||[]).map(x=>x.id));
const isoDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x||'') && Number.isFinite(Date.parse(x));
const checkedTime=x=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?Z$/.test(x||'') && Number.isFinite(Date.parse(x));
const positive=x=>Number.isFinite(x)&&x>0;
const actualPrice=p=>p && positive(p.amount) && p.currency==='NOK' && ['family-total','per-person'].includes(p.basis) && ['search-offer','carrier-selected-total','payment-total'].includes(p.stage);
function checkObservation(row,label) {
  if (!patternIds.has(row.patternId) || !isoDate(row.departDate) || !isoDate(row.returnDate) || dateDays(row.departDate,row.returnDate)<=0 || !checkedTime(row.checkedAt) || !row.service || !httpsOnly(row.publicUrl) || row.partyRef!=='standardFamily' || !Number.isInteger(row.party?.adults) || !Number.isInteger(row.party?.children) || row.party.adults!==trip.priceParties.standardFamily.adults || row.party.children!==trip.priceParties.standardFamily.children || !row.party.childCategory) errors.push(`${label}: mangler gyldig søk, reisefølge, datoer eller kontrolltid`);
  if (row.publicUrl?.includes('finn.no/reise/flybilletter/resultat/')) {
    const params=new URL(row.publicUrl).searchParams;
    const finnDate=date=>date?.split('-').reverse().join('.');
    if (params.get('requestedDepartureDate')!==finnDate(row.departDate) || params.get('requestedReturnDate')!==finnDate(row.returnDate) || Number(params.get('adults'))!==row.party?.adults || Number(params.get('children'))!==row.party?.children) errors.push(`${label}: offentlig søkelenke motsier datoer/reisefølge`);
  }
}
const researchAnchors=new Set();
for (const row of flights.searchRuns||[]) {
  checkObservation(row,`flysøk ${row.id}`);
  if(row.evidence!=='interactive-search' || row.priceBasis!=='family-total' || row.currency!=='NOK' || !row.scope || !Number.isInteger(row.shiftDays) || Math.abs(row.shiftDays)>flights.planningWindow.flexDays || ![-1,0,1].includes(row.lengthDeltaDays)) errors.push(`flysøk ${row.id}: ugyldig evidens eller fleksibilitet`);
  for (const kind of ['best','cheapest','fastest']) {
    const s=row.summaries?.[kind];
    if(!positive(s?.priceNok)||!positive(s?.outboundDurationMin)||!positive(s?.inboundDurationMin)) errors.push(`flysøk ${row.id}: ${kind} mangler pris/reisetid`);
  }
  researchAnchors.add(`${Date.parse(row.departDate)-row.shiftDays*86400000}/${Date.parse(row.returnDate)-(row.shiftDays+row.lengthDeltaDays)*86400000}`);
}
if(researchAnchors.size!==1) errors.push('flysøk: forskyvning/lengde skal referere til samme historiske søkegrunnlag, uten en ny autoritativ baseline');
for(const id of patternIds) {
  for(let shift=-flights.planningWindow.flexDays;shift<=flights.planningWindow.flexDays;shift++) {
    if(!(flights.searchRuns||[]).some(x=>x.patternId===id&&x.shiftDays===shift&&x.lengthDeltaDays===0)) errors.push(`flysøk: mangler ${id} forskyvning ${shift}`);
  }
}
for (const c of flights.candidates||[]) {
  checkObservation(c,`flykandidat ${c.id}`);
  if(c.kind!=='concrete-search-price'||c.evidence!=='interactive-search-details'||!actualPrice(c.price)||!c.provider||!c.label||!c.why||!Array.isArray(c.airlines)||!c.airlines.length||!(c.operatingAirlines===null||Array.isArray(c.operatingAirlines))||!['no-self-transfer-warning','protected','self-transfer','unknown'].includes(c.connection?.status)||!c.connection?.note||!c.baggage?.evidence) errors.push(`flykandidat ${c.id}: ufullstendig pris-/forbindelsesgrunnlag`);
  for(const leg of [c.outbound,c.inbound]) {
    if(!/^[A-Z]{3}$/.test(leg?.from||'')||!/^[A-Z]{3}$/.test(leg?.to||'')||!positive(leg?.durationMin)||!Number.isInteger(leg?.stops)||leg.stops<0||!Array.isArray(leg.transferAirports)||!Array.isArray(leg.transferMinutes)||leg.stops!==leg.transferAirports.length||leg.stops!==leg.transferMinutes.length||leg.transferAirports.some(x=>!/^[A-Z]{3}$/.test(x))||leg.transferMinutes.some(x=>!positive(x))) errors.push(`flykandidat ${c.id}: ugyldig flyplass/stopp/reisetid`);
  }
  if(c.longestTransferMin!==Math.max(0,...(c.outbound?.transferMinutes||[]),...(c.inbound?.transferMinutes||[]))) errors.push(`flykandidat ${c.id}: lengste transfer stemmer ikke`);
  for(const key of ['checkedPiecesPerPerson','cabinPiecesPerPerson']) if(c.baggage?.[key]!=null&&(!Number.isInteger(c.baggage[key])||c.baggage[key]<0)) errors.push(`flykandidat ${c.id}: ugyldig bagasje`);
  if(c.connection?.status==='protected'&&!c.connection.protectionEvidence) errors.push(`flykandidat ${c.id}: beskyttet billett krever eksplisitt evidens`);
}
for(const c of flights.directChecks||[]) {
  if(!candidateIds.has(c.candidateId)||!checkedTime(c.checkedAt)||!c.service||!c.finding||!httpsOnly(c.publicUrl)||!['priced','incomplete','unsupported-itinerary'].includes(c.status)) errors.push(`direktesøk ${c.id}: ufullstendig dokumentasjon`);
  if(c.status==='priced'&&(!actualPrice(c.price)||!c.ticketType||!c.baggage||!c.terms)) errors.push(`direktesøk ${c.id}: fullført pris krever prisgrunnlag, billettype, bagasje og vilkår`);
  if(c.status!=='priced'&&c.price) errors.push(`direktesøk ${c.id}: ufullført søk skal ikke ha en bekreftet pris`);
}
for(const pair of flights.comparison?.pairs||[]) if(!candidateIds.has(pair.leftId)||!candidateIds.has(pair.rightId)||!pair.finding) errors.push('flysammenligning: ugyldig kandidatreferanse');
const railReturn=(transport.flightReturnComparisons||[]).find(x=>x.id===flights.comparison?.transportRef);
if(!railReturn||!positive(railReturn.standardFamilyYen)||railReturn.standardFamilyYen!==railReturn.adultYen*trip.priceParties.standardFamily.railFareMix.adult+railReturn.childYen*trip.priceParties.standardFamily.railFareMix.child||!positive(railReturn.fastestTrainMin)||!httpsOnly(railReturn.source)||!httpsOnly(railReturn.durationSource)) errors.push('flysammenligning: returtransport må ha eget kanonisk pris-/tidsgrunnlag for familiens togbillettkategorier');
function checkFlightUrls(value,label='flights.json') {
  if(typeof value==='string'&&/^https?:\/\//.test(value)) {
    let u;try{u=new URL(value);}catch{errors.push(`${label}: ugyldig URL`);return;}
    if(u.protocol!=='https:'||u.username||u.password||/checkout|payment|manage-booking/i.test(u.pathname)||[...u.searchParams.keys()].some(k=>/token|session|account|profile|user|bookingref|reference|pnr|timestamp|signature|auth/i.test(k))) errors.push(`${label}: privat/session-/checkout-lenke`);
  } else if(Array.isArray(value)) value.forEach((x,i)=>checkFlightUrls(x,`${label}[${i}]`));
  else if(value&&typeof value==='object') Object.entries(value).forEach(([k,v])=>checkFlightUrls(v,`${label}.${k}`));
}
checkFlightUrls(flights);
if((flights.fareObservations||[]).some(x=>!['indexed-dated-fare','published-2027-fare','dated-airline-fare','current-route-from','search-engine-from','historical-market'].includes(x.kind))) errors.push('flypris: indekserte tilbud/fra-priser/historikk skal ha eksplisitt grunnlag og ikke utgis for interaktivt søk');

if (!passes.updated || !passes.principle || !Array.isArray(passes.options) || passes.options.length < 3) {
  errors.push('passes.json: mangler oppdatert beslutningsgrunnlag');
} else {
  uniqueIds(passes.options,'passes.json options');
  for (const item of passes.options) {
    if (!item.name || !item.kind || !item.status || !item.statusLabel || !item.short || !item.when || !item.current || !/^https:\/\//.test(item.sourceUrl||'')) {
      errors.push(`passes.json: ${item.id||'(uten id)'} er ufullstendig`);
    }
  }
}
if (!passes.haveFunJapanReview?.checked || !passes.haveFunJapanReview?.summary ||
    !Array.isArray(passes.haveFunJapanReview?.plannedMatches) ||
    !Array.isArray(passes.haveFunJapanReview?.usefulAdjacent) ||
    !Array.isArray(passes.haveFunJapanReview?.doNotCountOn)) {
  errors.push('passes.json: Have Fun-gjennomgangen mangler detaljgrunnlag');
}
for (const row of [...(passes.haveFunJapanReview?.plannedMatches||[]), ...(passes.haveFunJapanReview?.doNotCountOn||[])]) {
  if (row.placeId && !places.some(p=>p.id===row.placeId)) errors.push(`passes.json: ukjent placeId ${row.placeId}`);
}

const priceParties=trip.priceParties;
if (!priceParties || !Number.isInteger(priceParties.standardFamily?.adults) || priceParties.standardFamily.adults < 1 ||
    !Number.isInteger(priceParties.standardFamily?.children) || priceParties.standardFamily.children < 0) {
  errors.push('trip.json: priceParties.standardFamily må angi gyldig antall voksne/barn');
}
const priceScenarioIds=new Set((priceParties?.scenarios||[]).map(x=>x.id));
if (!Array.isArray(priceParties?.scenarios) || priceParties.scenarios.length < 2 ||
    priceParties.scenarios.some(x=>!x.id||!x.label||!Number.isInteger(x.families)||x.families<1)) {
  errors.push('trip.json: priceParties.scenarios må ha komplette prisscenarier');
}
if (!priceScenarioIds.has(priceParties?.defaultScenarioId)) errors.push('trip.json: defaultScenarioId peker ikke på et prisscenario');
const railFareMix=priceParties?.standardFamily?.railFareMix;
if (!Number.isInteger(railFareMix?.adult) || railFareMix.adult < 0 ||
    !Number.isInteger(railFareMix?.child) || railFareMix.child < 0 ||
    railFareMix.adult + railFareMix.child !== (priceParties?.standardFamily?.adults||0) + (priceParties?.standardFamily?.children||0)) {
  errors.push('trip.json: standardFamily.railFareMix er ugyldig');
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
  const price=item.price;
  if (!price || !['free','fixed','dynamic','from'].includes(price.status)) {
    errors.push(`places.json: ${item.id} mangler prisstatus`);
  } else {
    if (!price.checked || !/^https:\/\//.test(price.source||'')) errors.push(`places.json: ${item.id} mangler prisens checked/source`);
    if (price.status==='free' && (!Array.isArray(price.standardFamilyRangeYen) || price.standardFamilyRangeYen[0]!==0 || price.standardFamilyRangeYen[1]!==0)) {
      errors.push(`places.json: ${item.id} er gratis, men standardFamilyRangeYen er ikke 0–0`);
    }
    if (['fixed','dynamic'].includes(price.status) && (!Array.isArray(price.standardFamilyRangeYen) || price.standardFamilyRangeYen.length!==2 || !price.standardFamilyRangeYen.every(Number.isFinite))) {
      errors.push(`places.json: ${item.id} mangler standardFamilyRangeYen`);
    }
    if (price.status==='from' && !Number.isFinite(price.adultFromYen)) errors.push(`places.json: ${item.id} mangler dokumentert fra-pris`);
  }
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
for (const item of guide.placeWords || []) {
  if (!item.term || !item.meaning || !item.japanese || !item.speech) errors.push('guide.json: stedsord mangler romanisering, japanske tegn eller uttale');
}
for (const item of guide.phrases || []) {
  if (!item.jp || !item.no || !item.japanese || !item.speech) errors.push('guide.json: hovedfrase mangler romanisering, japanske tegn eller uttale');
}
if (!Array.isArray(guide.morePhrases) || guide.morePhrases.length < 4) {
  errors.push('guide.json: utvidet fraseliste mangler');
} else {
  for (const group of guide.morePhrases) {
    if (!group.category || !Array.isArray(group.items) || !group.items.length) errors.push('guide.json: frasegruppe er ufullstendig');
    for (const item of group.items || []) if (!item.jp || !item.no || !item.japanese || !item.speech) errors.push(`guide.json: frase i ${group.category||'ukjent gruppe'} er ufullstendig`);
  }
}

const prepIds=new Set();
let adultPrepCount=0;
let historyPrepCount=0;
const audienceIds=new Set(['family','older-kids','teens','adults']);
for (const group of prep) {
  if (!group.category || !Array.isArray(group.items) || group.items.length===0) errors.push('prep.json: gruppe mangler category/items');
  for (const item of group.items || []) {
    if (!item.id) errors.push(`prep.json: ${group.category} har post uten id`);
    else if (prepIds.has(item.id)) errors.push(`prep.json: duplikat id ${item.id}`);
    else prepIds.add(item.id);
    if (!item.title || !item.why || !item.action) errors.push(`prep.json: ${item.id||item.title||'(uten id)'} mangler innhold`);
    if (!item.audience?.id || !audienceIds.has(item.audience.id) || !item.audience?.label) errors.push(`prep.json: ${item.id} mangler gyldig strukturert målgruppe`);
    if ('for' in item) errors.push(`prep.json: ${item.id} bruker gammel fri tekst for målgruppe`);
    if (item.audience?.id==='adults') adultPrepCount++;
    if (group.category==='Historie') historyPrepCount++;
    if (!Array.isArray(item.placeIds)) errors.push(`prep.json: ${item.id||item.title} mangler placeIds`);
    else for (const id of item.placeIds) if (!placeIds.has(id)) errors.push(`prep.json: ${item.id} peker på ukjent placeId ${id}`);
    if (item.url && !/^https:\/\//.test(item.url)) errors.push(`prep.json: ${item.id} har ugyldig url`);
    for (const link of item.links || []) {
      if (!link.label || !/^https:\/\//.test(link.url||'')) errors.push(`prep.json: ${item.id} har ugyldig lenke`);
      if (link.appUrl) errors.push(`prep.json: ${item.id} skal ikke bruke custom-scheme for strømmetjenester; bruk direkte HTTPS-innholdsside`);
    }
    if (['Film','TV og serier'].includes(group.category)) {
      const imdb=(item.links||[]).find(x=>x.kind==='imdb');
      const stream=(item.links||[]).find(x=>x.kind==='stream');
      if (!item.streamingChecked || !imdb || !stream) {
        errors.push(`prep.json: ${item.id} mangler IMDb, strømmetjeneste eller kontrolldato`);
      }
      if (stream) {
        const canonicalStreamUrl = {
          'Netflix': /^https:\/\/www\.netflix\.com\/title\/\d+$/,
          'Disney+': /^https:\/\/www\.disneyplus\.com\/browse\/entity-[0-9a-f-]+$/i,
          'Apple TV': /^https:\/\/tv\.apple\.com\/no\/(?:movie|show)\/[^/?#]+\/umc\.cmc\.[A-Za-z0-9]+$/,
          'Filmoteket (nett)': /^https:\/\/filmoteket\.no\/film\/\d+$/,
          'NRK TV': /^https:\/\/tv\.nrk\.no\/serie\/[a-z0-9-]+\/sesong\/\d+$/i
        };
        const pattern=canonicalStreamUrl[stream.label];
        if (!pattern) errors.push(`prep.json: ${item.id} bruker ukjent strømmetjenesteformat ${stream.label}`);
        else if (!pattern.test(stream.url||'')) errors.push(`prep.json: ${item.id} bruker ikke kanonisk direkte lenke for ${stream.label}`);
        if (stream.appUrl || /sharesource=|[?&](?:token|session|account|profile|user)=/i.test(stream.url||'')) {
          errors.push(`prep.json: ${item.id} har app-/delings-/kontoformat i strømmetjenestelenken`);
        }
      }
    }
    if (group.category==='Mat' && !(item.links||[]).some(x=>x.kind==='recipe')) errors.push(`prep.json: ${item.id} mangler oppskriftslenke`);
    if (group.category==='Små mål' && (!item.detail?.summary || !Array.isArray(item.detail?.steps) || item.detail.steps.length < 3)) errors.push(`prep.json: ${item.id} mangler detaljert gjennomføring`);
  }
}

if (adultPrepCount < 4) errors.push('prep.json: vokseninnhold er for svakt representert');
if (historyPrepCount < 4) errors.push('prep.json: Historie skal ha en reell læringssti');

const legIds=new Set(transport.legs.map(x=>x.id));
if (transport.legs.length !== trip.route.length-1) errors.push('transport.json: antall etapper samsvarer ikke med hovedruten');
for (let i=0;i<transport.legs.length;i++) {
  const leg=transport.legs[i];
  const from=trip.route[i], to=trip.route[i+1];
  if (!from || !to || leg.fromRouteId!==from.id || leg.toRouteId!==to.id) {
    errors.push(`transport.json: etappe ${leg.id} følger ikke hovedrutens rekkefølge`);
  }
  const expectedFamilyFare=leg.fare?.adultYen*railFareMix.adult + leg.fare?.childYen*railFareMix.child;
  if (leg.fare?.standardFamilyYen !== expectedFamilyFare) errors.push(`transport.json: standardfamilie-pris stemmer ikke for ${leg.id}`);
  for (const oldKey of ['family2a2cYen','planningPartyYen']) if (oldKey in (leg.fare||{})) errors.push(`transport.json: ${leg.id} bruker gammel party-spesifikk fare-key ${oldKey}`);
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
  if (!Array.isArray(item.standardFamilyEstimateYen) || item.standardFamilyEstimateYen.length!==2 || !item.standardFamilyEstimateYen.every(Number.isFinite)) errors.push(`food.json: ${item.id} mangler standardFamilyEstimateYen`);
  if ('familyEstimateYen' in item) errors.push(`food.json: ${item.id} bruker gammel familyEstimateYen`);
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
  if (!Array.isArray(item.standardFamilyNightYen) || item.standardFamilyNightYen.length !== 2 || !item.standardFamilyNightYen.every(Number.isFinite)) errors.push(`hotels.json: ${item.id} mangler standardFamilyNightYen`);
  if ('planningFamilyNightYen' in item) errors.push(`hotels.json: ${item.id} bruker gammel planningFamilyNightYen`);
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
  ['prep.json',prep],
  ['flights.json',flights]
];
const narrativeOwners=new Map();
const collectNarrative=(value,file,pathLabel='$')=>{
  if(typeof value==='string'){
    const text=value.trim();
    if(/\.(?:id|placeId|baseId|destinationId)$/.test(pathLabel) || /\.placeIds\[\d+\]$/.test(pathLabel)) return;
    if(text.length<18 || /^https?:\/\//.test(text) || /^CC\b/.test(text)) return;
    const key=text.toLocaleLowerCase('nb-NO');
    const rows=narrativeOwners.get(key)||[];
    rows.push({file,path:pathLabel,text});
    narrativeOwners.set(key,rows);
    return;
  }
  if(Array.isArray(value)) return value.forEach((item,j)=>collectNarrative(item,file,`${pathLabel}[${j}]`));
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
const copyDrivenPages=new Set(['index.html','flights.html','route.html','places.html','food.html','hotels.html','prep.html','practical.html','budget.html','sources.html','privacy.html','phrases.html']);
for (const name of htmlFiles) {
  const file=`docs/${name}`;
  const html=fs.readFileSync(file,'utf8');
  if (!/<html lang="nb">/.test(html)) errors.push(`${file}: mangler lang="nb"`);
  if (!/<meta name="viewport"/.test(html)) errors.push(`${file}: mangler viewport`);
  if (copyDrivenPages.has(name) && !html.includes('data-copy=')) errors.push(`${file}: sidebudskap skal komme fra pages.json via data-copy`);
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
for (const required of ['docs/flights.html','docs/data/flights.json','docs/place.html','docs/restaurant.html','docs/hotels.html','docs/hotel.html','docs/phrases.html','docs/prep-item.html','docs/data/pages.json','docs/data/passes.json']) {
  if (!fs.existsSync(required)) errors.push(`${required} mangler`);
}
const placeHtml=fs.readFileSync('docs/place.html','utf8');
if (!placeHtml.includes('id="place-map"') || !placeHtml.includes('maplibre-gl.js')) errors.push('place.html mangler generisk kartvisning');
if (placeHtml.includes('id="place-map-fallback"')) errors.push('place.html: kartfallback skal opprettes ved reell fatal kartfeil, ikke ligge skjult i HTML');

const app = fs.readFileSync('docs/assets/app.js', 'utf8');
const style = fs.readFileSync('docs/assets/style.css', 'utf8');
if (!app.includes("fallback.id='place-map-fallback'") || !app.includes("document.getElementById('place-map-fallback')?.remove()")) {
  errors.push('app.js: stedskartets fallback må opprettes ved fatal feil og fjernes når kartet blir brukbart');
}
if (!style.includes('.map-error[hidden]{display:none}')) errors.push('style.css: skjulte kartfeil må forbli skjult selv om .map-error setter display');
if (!app.includes('async function renderFlights()') || !app.includes("json('data/flights.json')") || !app.includes("['flights.html','Fly','flights']")) errors.push('app.js mangler flyplanleggingsvisning eller navigasjon');
if (!app.includes('flight-copy-template') || !app.includes('navigator.clipboard.writeText')) errors.push('app.js: flyfunn kan ikke kopieres tilbake til chat');
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
if (!style.includes('/* Canonical place-list component */') || !style.includes('grid-template-columns:112px minmax(0,1fr) 26px') || !style.includes('.place-list-primary-link::after')) {
  errors.push('style.css: mobil stedsrad mangler kanonisk kompakt grid/klikkflate');
}
if (style.includes('.place-list-card>a{') || style.includes('v0.17: robust compact place rows')) {
  errors.push('style.css: gammel parallell stedskort-layout finnes fortsatt');
}
if (app.includes('<a class="route-thumb-wrap"')) errors.push('app.js: rute-thumbnail må ikke være ytre lenke rundt bildekreditering');
if (!app.includes('place-list-primary-link')) errors.push('app.js: stedskort mangler gyldig primærlenke uten nested anchor');
if (!app.includes('showPlaceDetail') || !app.includes('showFoodDetail') || !app.includes('showHotelDetail') || !app.includes('showStopDetail')) {
  errors.push('app.js: kartvalg synkroniserer ikke detaljpanelet for valgt innhold');
}
const popupSyncCount=[...app.matchAll(/popup\.on\('open'/g)].length;
if (popupSyncCount < 5) errors.push('app.js: detaljpanelet må bindes til faktisk åpnet kart-popup, ikke separate klikkhendelser');
if (!app.includes("const layerState={stations:false,experience:true,food:false,hotel:false}")) errors.push('app.js: knutepunkter skal være avslått som standard for å redusere kart-overlapp');
if (!app.includes("json('data/pages.json')") || !app.includes('applyPageCopy')) errors.push('app.js: mangler sentral sidecopy fra pages.json');
if (!app.includes("json('data/passes.json')") || !app.includes('pass-watchlist')) errors.push('app.js: passvurdering hentes ikke fra passes.json');
if (!app.includes('renderPricePartySelector') || !app.includes('partyMultiplier') || app.includes('trip.planningParty')) errors.push('app.js: prisscenarier er ikke sentralisert');
if ((app.match(/mapSelectionPopupHtml/g)||[]).length < 7) errors.push('app.js: rutekartet bruker ikke felles kompakt popup-renderer');
if (!app.includes('installMapLoadFallback') || !app.includes("map.once('load'")) errors.push('app.js: kartfeil må skille fatal lastfeil fra enkeltressurser/fliser');
if (!app.includes('placePriceSummaryHtml') || !app.includes('placePriceDetailHtml')) errors.push('app.js: stedspriser vises ikke konsistent i liste og detalj');
if (!app.includes("json('data/prep.json')")) errors.push('app.js henter ikke kanonisk prep.json for stedskoblinger');
if (!app.includes('renderPhraseGuide') || !app.includes('speechSynthesis') || !app.includes('renderPrepItem')) errors.push('app.js: språklyd, utvidet fraseliste eller detaljside for små mål mangler');
if (!app.includes('prepAudienceHtml') || !app.includes("link.kind==='stream'") || !app.includes('target="_blank" rel="noopener"')) errors.push('app.js: tydelig målgruppevisning eller sikker ekstern strømmenavigasjon mangler');
if (app.includes('bindPrepStreamLinks') || app.includes('data-stream-app-url')) errors.push('app.js: custom-scheme strømmenavigasjon skal ikke brukes');
if (!app.includes('Knutepunkter') || !transport.stationNote) errors.push('rutekartet forklarer ikke at stasjonene er utvalgte knutepunkter');
const toolbarStart=app.indexOf('const renderLayerToolbar=');
const toolbarEnd=app.indexOf("map.on('load'",toolbarStart);
const toolbarSource=toolbarStart>=0&&toolbarEnd>toolbarStart?app.slice(toolbarStart,toolbarEnd):'';
const toolbarOrder=['Opplevelser','Mat','Overnatting','Knutepunkter'].map(x=>toolbarSource.indexOf(x));
if (toolbarOrder.some(x=>x<0) || toolbarOrder.some((x,i)=>i>0 && x<=toolbarOrder[i-1])) errors.push('app.js: kartlag skal vises som Opplevelser, Mat, Overnatting, Knutepunkter');
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
