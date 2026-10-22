import fs from 'node:fs';
import path from 'node:path';
import { Script } from 'node:vm';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const foodData = readJson('docs/data/food.json');
const food = foodData.restaurants || [];
const places = readJson('docs/data/places.json');
const dayIdeas=readJson('docs/data/day-ideas.json');
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
  flights:['eyebrow','title','intro','patternsEyebrow','patternsTitle','patternsIntro','methodEyebrow','methodTitle','methodIntro','flexEyebrow','flexTitle','flexIntro','hubsEyebrow','hubsTitle','hubsIntro','checksEyebrow','checksTitle','checksIntro','sourcesEyebrow','sourcesTitle','sourcesIntro','privacyTitle','privacyIntro'],
  route:['eyebrow','listEyebrow','listTitle','listIntro','transportTitle','mapNote'],
  places:['eyebrow','title','intro','filterLabel'],
  dayIdeas:['eyebrow','title','intro','principle','flexibility','filterLabel'],
  food:['eyebrow','title','intro','filterLabel','watchTitle'],
  hotels:['eyebrow','title','intro','typesTitle','baseFilterLabel','typeFilterLabel'],
  prep:['eyebrow','title','intro','audienceEyebrow','audienceTitle','audienceIntro'],
  practical:['eyebrow','title','intro','etiquetteTitle'],
  language:['eyebrow','title','intro','basicsTitle','wordsTitle','namesTitle','audioNote'],
  transport:['eyebrow','title','intro','transportTitle','passesTitle'],
  tickets:['eyebrow','title','intro','bookingTitle'],
  myChoices:['eyebrow','title','intro','storageNote'],
  budget:['eyebrow','title','intro','distributionTitle'],
  sources:['eyebrow','title','intro'],
  privacy:['eyebrow','title','intro','publicTitle'],
  phrases:['eyebrow','title','intro','basicsTitle','basicsIntro','audioNote']
};
for(const [page,keys] of Object.entries(requiredPageCopy)){
  if(!pages[page]) errors.push(`pages.json: mangler ${page}`);
  else for(const key of keys) if(typeof pages[page][key]!=='string'||!pages[page][key].trim()) errors.push(`pages.json: ${page}.${key} mangler`);
}

// Generic public flight-search guidance only. No historic observations or booking details.
const legacyFlightFields=['searchRuns','candidates','directChecks','fareObservations','manualSearches','bookingSignals','planningWindow','nextFlightFocus','comparison','research'];
for (const key of legacyFlightFields) if (key in flights) errors.push(`flights.json: research-felt ${key} skal ikke publiseres`);
for (const [key,min] of [['examples',3],['checklist',5],['sources',3]]) {
  if (!Array.isArray(flights[key]) || flights[key].length < min) errors.push(`flights.json: ${key} mangler`);
  else if (key==='examples') uniqueIds(flights[key], 'flights.json examples');
}
for (const x of flights.examples||[]) if (!x.title||!x.route||!x.description||!x.setup||!x.tradeoff||!Array.isArray(x.steps)||x.steps.length<3||x.steps.some(step=>!step)) errors.push('flights.json: søkeeksempel mangler konkrete trinn og vurderinger');

const flightRouteCodes={
  'multi-east-west':['OSL-TYO','OSA-OSL'],
  'multi-west-east':['OSL-OSA','TYO-OSL'],
  'roundtrip-tokyo':['OSL-TYO'],
  'roundtrip-osaka':['OSL-OSA']
};
for(const x of flights.examples||[]){
  const expected=flightRouteCodes[x.id]||[];
  if(!x.linkHelp||!Array.isArray(x.searchLegs)||x.searchLegs.length!==expected.length||!expected.length){
    errors.push(`flights.json: ${x.id} mangler komplette rutespesifikke lenker`);
    continue;
  }
  x.searchLegs.forEach((leg,i)=>{
    if(!leg.code||leg.code!==expected[i]||!leg.label) errors.push(`flights.json: ${x.id} har feil flystrekning ${i+1}`);
    for(const [provider,host] of [['googleUrl','www.google.com'],['finnUrl','www.finn.no']]){
      try{
        const url=new URL(leg[provider]);
        if(url.protocol!=='https:'||url.hostname!==host||!url.pathname.includes('flights-from-')&&provider==='googleUrl'||!url.pathname.includes('/reise/flybilletter/')&&provider==='finnUrl') errors.push(`flights.json: ${x.id} har ikke rutespesifikk lenke til ${provider}`);
        if(url.search||url.hash||url.username||url.password) errors.push(`flights.json: ${x.id} har unødige søkeparametre/privat informasjon i ${provider}`);
      }catch{errors.push(`flights.json: ${x.id} mangler gyldig ${provider}`);}
    }
  });
}

if ((flights.examples||[]).length!==4 || (flights.workflow||[]).length<5 || (flights.variations||[]).length<2 || (flights.hubExamples||[]).length<3) errors.push('flights.json: eksemplene må dekke fire reiseoppsett, metode, datofleks og knutepunkter');
for (const x of flights.workflow||[]) if(!Number.isInteger(x.number)||!x.title||!x.detail) errors.push('flights.json: metode mangler');
for (const x of flights.variations||[]) if(!x.label||!Array.isArray(x.shifts)||x.shifts.length<3||!x.description) errors.push('flights.json: datomatrise mangler');
for (const x of flights.hubExamples||[]) if(!x.title||!x.setup||!x.check) errors.push('flights.json: knutepunkteksempel mangler');
for (const x of flights.checklist||[]) if (!x.title||!x.detail) errors.push('flights.json: ufullstendig sjekkliste');
for (const x of flights.sources||[]) if (!x.title||!x.description||!/^https:\/\//.test(x.url||'')||/[?&](token|session|pnr|user)=/.test(x.url)) errors.push('flights.json: ugyldig åpen søkelenke');
if (!flights.privacy) errors.push('flights.json: personverninformasjon mangler');
const publicResearch=JSON.stringify(flights);
if (/\\b(?:NH\\d{3,4}|AY\\d{3,4}|HO\\d{3,4})\\b/.test(publicResearch)||/20(?:26|27)-\\d{2}-\\d{2}/.test(publicResearch)||/checkedAt|departDate|returnDate|priceNok|PNR/i.test(publicResearch)) errors.push('flights.json: konkrete flyobservasjoner eller reisedatoer er ikke tillatt');

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

const totalNights=trip.route.reduce((n,x)=>n+x.nights,0);
if(totalNights!==14||trip.route[0]?.from!==1||trip.route.at(-1)?.to!==15) errors.push('trip.json: ruten må dekke 14 netter og dag 1–15');
if(trip.route.find(x=>x.id==='tokyo')?.nights!==4||trip.route.find(x=>x.id==='osaka')?.nights!==3) errors.push('trip.json: fordeling 4 Tokyo / 3 Osaka må stemme');
if(/20(?:26|27)-\\d{2}-\\d{2}/.test(JSON.stringify(trip.route)) || /20(?:26|27)-\\d{2}-\\d{2}/.test(JSON.stringify(trip.dayTrips))) errors.push('trip.json: ruten skal bruke reisedager, ikke bekreftede datoer');

const placeIds = new Set(places.map(x => x.id));
const placeById = new Map(places.map(x => [x.id,x]));

const familyGlossaryTerms=['hanami','sakura','matcha','shinto','tatami','ryokan','onsen','torii','shinkansen'];
for (const term of familyGlossaryTerms) {
  const entry=(guide.placeWords||[]).find(item=>item.term===term);
  if (!entry?.meaning || !entry.japanese || !entry.speech) {
    errors.push(`Praktisk ordliste: ${term} mangler forklaring og japansk skrivemåte`);
  }
}
const hanamiPlace=placeById.get('shinjuku-gyoen');
const hanamiVisibleOnBothPages=hanamiPlace?.simple==='Stor park og fleksibel mulighet for hanami';
const hanamiEntry=guide.placeWords.find(x=>x.term==='hanami');
if(!hanamiVisibleOnBothPages||hanamiEntry?.inline!==true||!hanamiEntry.meaning){
  errors.push('Hanami skal fortsatt stå i Shinjuku Gyoens opprinnelige undertittel og ha en aktiv forklaring i datalaget');
}

if (!/hanami/i.test(hanamiPlace?.simple||'') || !/torii/i.test(placeById.get('fushimi-inari')?.description||'')) {
  errors.push('Steder: hanami/torii må fremdeles vises som ord for den felles klikkbare ordforklaringen');
}
const activated=guide.placeWords.filter(x=>x.inline===true);
if(activated.length<25)errors.push('Praktisk: den interaktive ordlisten mangler sentrale japanske fagord');
const allAliases=new Set();
for(const entry of guide.placeWords){
  if(!entry.term||!entry.meaning)errors.push('Praktisk: ordlistepost mangler begrep/betydning');
  if(entry.inline===true){
    for(const alias of [entry.term,...(entry.aliases||[])]){
      if(!alias?.trim()||allAliases.has(alias.toLocaleLowerCase('nb-NO')))errors.push(`Praktisk: duplisert eller tomt oppslagsord ${alias}`);
      allAliases.add(alias.toLocaleLowerCase('nb-NO'));
    }
  }
}
if(activated.some(x=>/booking|pnr|kontakt/i.test(x.term)))errors.push('Praktisk: privat bookingbegrep må ikke være interaktivt');

const qualityChecklist={
  torii:[/port/i,/hellig/i,/overgang|gren[se]/i],
  ryokan:[/vertshus/i,/madrass|overnatting/i],
  onsen:[/bad/i,/vann/i,/vasker|før/i],
  shinto:[/religion/i,/helligdom/i],
  hanami:[/tradisjon/i,/blomstrende|blomstr/i],
  maiko:[/lærling/i,/dans|musikk/i],
  'Studio Pass':[/inngangsbillett/i,/park/i],
  honbasho:[/offisiell/i,/sumo/i,/rangering|resultat/i],
  'nikutama-soba':[/Hiroshima/i,/nudler/i],
  Nozomi:[/høyhastighetstog/i,/Tokyo|Kyoto|Osaka/i]
};
for(const entry of activated){
  const meaning=entry.meaning.trim();
  // Structural checks help, but editors must still judge whether each popup
  // stands alone without relying on another specialist term.
  if(meaning.length<90 || meaning.length>330 || !/[.!?]$/.test(meaning)){
    errors.push(`Ordliste: ${entry.term} trenger en selvstendig, kort forklaring med avsluttet setning (90–330 tegn)`);
  }
}
for(const [term,tests] of Object.entries(qualityChecklist)){
  const entry=activated.find(x=>x.term===term);
  if(!entry || tests.some(re=>!re.test(entry.meaning))){
    errors.push(`Ordliste: ${term} må være selvstendig og forklare hva begrepet betyr, ikke bare gi eksempler`);
  }
}
const expectedUsedTermFiles={
  anago:'docs/data/food.json',bento:'docs/data/food.json',tempura:'docs/data/food.json',
  yakisoba:'docs/data/food.json',negiyaki:'docs/data/food.json','mochi-cheese':'docs/data/food.json',
  'nikutama-soba':'docs/data/food.json',onigiri:'docs/data/prep.json',
  gyoza:'docs/data/prep.json',Hikari:'docs/data/transport.json',Mizuho:'docs/data/passes.json'
};
for(const [term,filename] of Object.entries(expectedUsedTermFiles)){
  const entry=activated.find(x=>x.term===term);
  if(!entry || !fs.readFileSync(filename,'utf8').toLocaleLowerCase('nb').includes(term.toLocaleLowerCase('nb'))){
    errors.push(`Ordliste: ${term} skal være et faktisk brukt begrep og forklart i datalaget`);
  }
}
if(activated.some(x=>x.term.toLocaleLowerCase('nb')==='soba')){
  errors.push('Ordliste: ikke annoter soba isolert; nikutama-soba er en annen rett enn bokhvetenudler');
}



const placeTopics=new Set(Object.keys(pages.places.topicLabels).filter(x=>x!=='all'));
const placeFeatures=new Set(Object.keys(pages.places.featureLabels).filter(x=>x!=='all'));
for(const p of places){
  if(!Array.isArray(p.topics)||!p.topics.length||p.topics.some(x=>!placeTopics.has(x))) errors.push(`places.json: ${p.id} har ugyldig temamerking`);
  if(!Array.isArray(p.features)||p.features.some(x=>!placeFeatures.has(x))) errors.push(`places.json: ${p.id} har ugyldig praktisk merking`);
}
for(const r of food){
  if(r.links?.menu && !/^https:\/\//.test(r.links.menu)) errors.push(`food.json: ${r.id} har ugyldig menylenke`);
  if(r.links?.menuIncludesWebsite && r.links.menu!==r.links.website) errors.push(`food.json: ${r.id} markerer samme nettsted feil`);
}
const interestValues=new Set(['strong','candidate','extra','context']);
for(const p of places){
  if(!interestValues.has(p.planInterest)) errors.push(`places.json: ${p.id} mangler gyldig redaksjonell interessekategori`);
}
if(places.filter(p=>p.planInterest==='strong').length>15) errors.push('Steder: redaksjonelle høydepunkter kan ikke omfatte nesten alt');
uniqueIds(dayIdeas.ideas||[],'day-ideas.json');
if(!Array.isArray(dayIdeas.ideas)||dayIdeas.ideas.length<10||!dayIdeas.interestLabels||!dayIdeas.choicePolicy?.note){
  errors.push('day-ideas.json mangler forslag eller forklaring på lokal lagring');
}
const ideaBases=new Set();
for(const idea of dayIdeas.ideas||[]){
  const stop=trip.route.find(x=>x.id===idea.baseId);
  if(!stop||!idea.title||!idea.logic||!idea.effort||!idea.watch) errors.push(`day-ideas.json: ufullstendig idé ${idea.id}`);
  if(!Array.isArray(idea.corePlaceIds)||idea.corePlaceIds.length<1||!Array.isArray(idea.optionalPlaceIds)) errors.push(`day-ideas.json: ${idea.id} mangler core/optional`);
  const allIds=[...(idea.corePlaceIds||[]),...(idea.optionalPlaceIds||[])];
  if(new Set(allIds).size!==allIds.length) errors.push(`day-ideas.json: ${idea.id} har gjentatte steder`);
  for(const id of allIds){
    const place=placeById.get(id);
    if(!place) errors.push(`day-ideas.json: ukjent sted ${id} i ${idea.id}`);
    else if(stop && place.id!==stop.id && place.destinationId!==stop.id && place.baseId!==stop.id && !(stop.theme?.areas||[]).includes(place.area)){
      errors.push(`day-ideas.json: ${id} ligger ikke i ${stop.id}`);
    }
  }
  if(idea.bookingAnchorId&&!allIds.includes(idea.bookingAnchorId)) errors.push(`day-ideas.json: ${idea.id} har anker som ikke inngår i idéen`);
  if(stop)ideaBases.add(stop.id);
}
for(const stop of trip.route)if(!ideaBases.has(stop.id))errors.push(`day-ideas.json: mangler eksempler under ${stop.id}`);
if(dayIdeas.ideas?.filter(x=>x.baseId==='tokyo').length < 4)errors.push('day-ideas.json: Tokyo trenger valgmuligheter, ikke bare én fast dagsplan');
if(/\\b(?:confirmedFlight|bookingRef|passenger|flightNumber)\\b/i.test(JSON.stringify(dayIdeas)))errors.push('day-ideas.json: private bookingopplysninger');


const placesForStop=(stop)=>places.filter(p=>p.destinationId===stop.id || p.baseId===stop.id ||
  p.id===stop.id || (!p.destinationId && !p.baseId && (stop.theme?.areas||[]).includes(p.area)));
const routeGroups=trip.route.map(stop=>({stop,items:placesForStop(stop)}));
const groupedPlaceIds=routeGroups.flatMap(group=>group.items.map(p=>p.id));

// Day-trip attractions must form one contiguous subsection below their base,
// rather than be interleaved with the main city's alphabetically sorted places.
const nestedDayTripPlaceIds=new Set();
for (const dayTrip of trip.dayTrips||[]) {
  const dayTripPlace=placeById.get(dayTrip.id);
  const baseStop=trip.route.find(stop=>stop.id===dayTrip.baseId);
  const basePlace=placeById.get(dayTrip.baseId);
  if (!dayTripPlace || !baseStop || !basePlace) {
    errors.push(`Steder: dagsturen ${dayTrip.id} mangler sted eller base`);
    continue;
  }
  if (dayTripPlace.area===basePlace.area) errors.push(`Steder: dagsturen ${dayTrip.id} mangler eget område`);
  const members=placesForStop(baseStop);
  const nested=members.filter(p=>p.id===dayTrip.id || p.area===dayTripPlace.area);
  if (!nested.some(p=>p.id===dayTrip.id)) errors.push(`Steder: dagsturen ${dayTrip.id} vises ikke under ${baseStop.id}`);
  for (const p of nested) {
    if (nestedDayTripPlaceIds.has(p.id)) errors.push(`Steder: ${p.id} er knyttet til flere dagsturer`);
    nestedDayTripPlaceIds.add(p.id);
  }
  if (nested.length<2) errors.push(`Steder: dagsturen ${dayTrip.id} må samle både hovedstedet og minst én tilhørende attraksjon`);
}
if (!nestedDayTripPlaceIds.has('todaiji') || !nestedDayTripPlaceIds.has('itsukushima-shrine')) {
  errors.push('Steder: Tōdai-ji skal ligge under Nara, og Itsukushima Shrine under Miyajima');
}

if (groupedPlaceIds.length!==places.length || new Set(groupedPlaceIds).size!==places.length) {
  errors.push('Steder: alle kuraterte steder må vises nøyaktig én gang i riktig reiserutegruppe');
}
if (!places.some(p=>p.id==='tokyo-tower' && p.area==='Tokyo' && p.map?.showOnRouteMap)) {
  errors.push('Steder: Tokyo Tower skal være et kartvisbart Tokyo-sted');
}
if (places.some(p=>p.priority || p.primaryChoice || p.secondaryChoice || p.rank)) {
  errors.push('Steder: unaturlig primær-/sekundærrangering skal ikke brukes');
}

// The grouped Places view must map every place into exactly one existing route group.
const placesByDestination=new Map(trip.route.map(stop=>[stop.id,[]]));
for (const place of places) {
  const possible=trip.route.filter(stop=>stop.id===place.id || stop.theme?.areas?.includes(place.area));
  // Direct route match always wins, including the Himeji pass-through.
  const direct=trip.route.find(stop=>stop.id===place.id);
  const matched=direct || trip.route.find(stop=>stop.theme?.areas?.includes(place.area));
  if(!matched) errors.push(`places.json: ${place.id} has no route destination group`);
  else placesByDestination.get(matched.id).push(place);
}
for (const stop of trip.route) {
  if(!(placesByDestination.get(stop.id)||[]).length) errors.push(`trip.json: route group ${stop.id} is empty`);
}
const tower=placeById.get('tokyo-tower');
if (!tower || tower.area!=='Tokyo' || tower.type!=='utsiktspunkt' ||
    !tower.links?.some(x=>x.kind==='official') ||
    !tower.experienceOptions?.some(x=>x.id==='tokyo-tower-main-deck') ||
    !tower.experienceOptions?.some(x=>x.id==='tokyo-tower-top-deck')) {
  errors.push('places.json: Tokyo Tower needs official info and separate outdoor/observation options');
}

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
  if (!Number.isInteger(stop.from)||!Number.isInteger(stop.to)||stop.from<1||stop.to<stop.from||stop.to-stop.from!==stop.nights) {
    errors.push(`trip.json: ${stop.id} har ugyldige reisedager eller antall netter`);
  }
  const next=trip.route[i+1];
  if (next && stop.to !== next.from) errors.push(`trip.json: gap i reisedager mellom ${stop.id} og ${next.id}`);
}

for (const dayTrip of trip.dayTrips || []) {
  if (!placeIds.has(dayTrip.id)) errors.push(`trip.json: dagstur ${dayTrip.id} mangler i places.json`);
  if (!dayTrip.baseId || !routeIds.has(dayTrip.baseId)) errors.push(`trip.json: dagstur ${dayTrip.id} mangler gyldig baseId`);
  const baseStop=trip.route.find(x=>x.id===dayTrip.baseId);
  if (!Number.isInteger(dayTrip.suggestedDay)||!baseStop||dayTrip.suggestedDay<baseStop.from||dayTrip.suggestedDay>=baseStop.to) errors.push(`trip.json: dagstur ${dayTrip.id} ligger utenfor sin base`);
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
  if (!price || !['free','fixed','dynamic','from','pending'].includes(price.status)) {
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

for (const place of places) {
  if (place.experienceOptions) {
    const ids=new Set();
    for (const option of place.experienceOptions) {
      if (!option.id || ids.has(option.id)) errors.push(`places.json: duplikat/ugyldig alternativ i ${place.id}`);
      ids.add(option.id);
      if (!option.name || !option.kind || !option.status || !option.description || !option.fit || !option.whenToCheck || !option.checked || !Array.isArray(option.links) || !option.links.every(link=>link.label && /^https:\/\//.test(link.url))) errors.push(`places.json: alternativet ${option.id} er ufullstendig`);
      if (option.price && (!option.price.note || (option.price.adultYen && (!Number.isFinite(option.price.adultYen) || !/^https:\/\//.test(option.price.source||''))))) errors.push(`places.json: alternativet ${option.id} har ugyldig prisgrunnlag`);
    }
  }
}

if ('images' in guide || 'placeExtras' in guide) {
  errors.push('guide.json skal ikke eie stedsbilder eller placeExtras; dette hører til places.json');
}
for (const item of guide.bookingRadar || []) {
  const p=placeById.get(item.placeId);
  if (!p) errors.push(`guide.json: bookingRadar har ukjent placeId ${item.placeId}`);
  if (item.optionId && !(p?.experienceOptions||[]).some(o=>o.id===item.optionId)) errors.push(`guide.json: bookingRadar har ukjent optionId ${item.optionId}`);

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
  if (!item.term || !item.meaning || (item.showInGuide!==false && (!item.japanese || !item.speech))) errors.push('guide.json: oppslagsord mangler norsk forklaring eller nødvendig japansk skrift/uttale for uttaleguiden');
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
      const archiveReference=(item.links||[]).find(x=>x.kind==='reference');
      if (!item.streamingChecked || !stream || (!imdb && !(item.archive===true && archiveReference))) {
        errors.push(`prep.json: ${item.id} mangler IMDb/arkivreferanse, strømmetjeneste eller kontrolldato`);
      }
      if (item.archive!=null && item.archive!==true) errors.push(`prep.json: ${item.id} har ugyldig archive-flagg`);
      if (stream) {
        const canonicalStreamUrl = {
          'Netflix': /^https:\/\/www\.netflix\.com\/title\/\d+$/,
          'Disney+': /^https:\/\/www\.disneyplus\.com\/browse\/entity-[0-9a-f-]+$/i,
          'Apple TV': /^https:\/\/tv\.apple\.com\/no\/(?:movie|show)\/[^/?#]+\/umc\.cmc\.[A-Za-z0-9]+$/,
          'Filmoteket (nett)': /^https:\/\/filmoteket\.no\/film\/\d+$/,
          'NRK TV': /^https:\/\/tv\.nrk\.no\/serie\/[a-z0-9-]+(?:\/sesong\/\d+)?$/i,
          'Telia Play': /^https:\/\/www\.teliaplay\.no\/series\/s-[A-Za-z0-9-]+$/
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
  if (item.links?.menu && !/^https:\/\//.test(item.links.menu)) errors.push(`food.json: ${item.id} har ugyldig menylenke`);
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

const onsen=hotelData.onsenOptions;
if(onsen?.baseId!=='hakone'||!onsen?.title||!onsen?.intro||!onsen?.planningNote||
   !Array.isArray(onsen.options)||onsen.options.length!==4){
  errors.push('hotels.json: Hakone må ha fire åpne onsenalternativer med felles forklaring');
}
uniqueIds(onsen?.options||[],'hotels.json onsenOptions');
const onsenHotelIds=new Set(hotels.map(x=>x.id));
const expectedOnsenIds=['hakone-yutowa-private','hakone-tenyu-room-bath','hakone-mikawaya-villa','hakone-yuryo-private'];
for(const id of expectedOnsenIds)if(!onsen?.options?.some(x=>x.id===id))errors.push(`hotels.json: onsenalternativ ${id} mangler`);
if((onsen?.options||[]).filter(x=>x.kind==='overnatting').length!==3 ||
   (onsen?.options||[]).filter(x=>x.kind==='dagbesok').length!==1)errors.push('hotels.json: skille mellom tre overnattinger og ett separat badebesøk mangler');
for(const x of onsen?.options||[]){
  if(!['overnatting','dagbesok'].includes(x.kind)||!x.subtitle||!x.description||!x.tradeoff||
     !x.familyNote||!x.priceNote||!x.checked||!/^https:\/\//.test(x.officialUrl||'')){
    errors.push(`hotels.json: onsenalternativ ${x.id} mangler fakta, forbehold eller offisiell kilde`);
  }
  if(x.hotelId && (!onsenHotelIds.has(x.hotelId)||x.name))errors.push(`hotels.json: ${x.id} skal referere til eksisterende hotell-ID uten duplisert navn`);
  if(!x.hotelId&&!x.name)errors.push(`hotels.json: onsenalternativ ${x.id} må ha navn eller gyldig hotell-ID`);
  if(/booket|bestilt|bekreftet som kjøpt/i.test(JSON.stringify(x)))errors.push(`hotels.json: ${x.id} må være et åpent alternativ, ikke en bekreftet bestilling`);
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
const copyDrivenPages=new Set(['index.html','flights.html','route.html','places.html','day-ideas.html','food.html','hotels.html','prep.html','practical.html','budget.html','sources.html','privacy.html','language.html','transport-guide.html','tickets.html','my-choices.html']);
for (const name of htmlFiles) {
  const file=`docs/${name}`;
  const html=fs.readFileSync(file,'utf8');
  if (!/<html lang="nb">/.test(html)) errors.push(`${file}: mangler lang="nb"`);
  if (!/<meta name="viewport"/.test(html)) errors.push(`${file}: mangler viewport`);
  if (copyDrivenPages.has(name) && !html.includes('data-copy=')) errors.push(`${file}: sidebudskap skal komme fra pages.json via data-copy`);
  const assetVersions=[...html.matchAll(/assets\/(?:style\.css|app\.js)\?v=([0-9.]+)/g)].map(m=>m[1]);
  if(name!=='phrases.html' && (!html.includes('<script src="assets/state.js?v='+site.version+'"></script>') || html.indexOf('assets/state.js')>html.indexOf('assets/app.js'))) errors.push(file+': state.js må lastes før app.js');
  if(name!=='phrases.html' && !html.includes(`<script src="assets/glossary.js?v=${site.version}"></script>`))errors.push(`${file}: felles ordlistekomponent mangler eller har feil versjon`);
  if(name!=='phrases.html' && !html.includes(`<script src="assets/choices.js?v=${site.version}"></script>`))errors.push(`${file}: felles interessevalg og søk mangler eller har feil versjon`);

  if (name!=='phrases.html' && (!assetVersions.length || assetVersions.some(v=>v!==site.version))) errors.push(`${file}: assetversjon samsvarer ikke med site.json (${site.version})`);
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
for (const required of ['docs/language.html','docs/transport-guide.html','docs/tickets.html','docs/my-choices.html','docs/assets/choices.js','docs/assets/map-shared.js','docs/assets/state.js','docs/day-ideas.html','docs/data/day-ideas.json','docs/assets/day-ideas.js','docs/flights.html','docs/data/flights.json','docs/place.html','docs/restaurant.html','docs/hotels.html','docs/hotel.html','docs/phrases.html','docs/prep-item.html','docs/data/pages.json','docs/data/passes.json']) {
  if (!fs.existsSync(required)) errors.push(`${required} mangler`);
}
const placeHtml=fs.readFileSync('docs/place.html','utf8');
if (!placeHtml.includes('id="place-map"') || !placeHtml.includes('maplibre-gl.js')) errors.push('place.html mangler generisk kartvisning');
if (placeHtml.includes('id="place-map-fallback"')) errors.push('place.html: kartfallback skal opprettes ved reell fatal kartfeil, ikke ligge skjult i HTML');

const app = fs.readFileSync('docs/assets/app.js', 'utf8');
const onsenIdea=dayIdeas.ideas?.find(x=>x.id==='hakone-ryokan');
if(!onsenIdea?.links?.some(x=>x.url==='place.html?id=hakone#place-onsen-options') ||
   !onsenIdea?.links?.some(x=>x.url==='hotels.html?base=hakone#hakone-onsen-options')){
  errors.push('Dagidéer: Hakone må lenke tydelig til onsenalternativer både på Steder og Overnatting');
}
const dayIdeaRenderer=fs.readFileSync('docs/assets/day-ideas.js','utf8');
if(!dayIdeaRenderer.includes('idea.links?.length'))errors.push('Dagidéer: valgbare innholdslenker skal rendres');
const placeDetailHtml=fs.readFileSync('docs/place.html','utf8');
if(!placeDetailHtml.includes('id="place-onsen-options"')||!app.includes('renderOnsenOptionsHtml(hotelData.onsenOptions')){
  errors.push('Steder: Hakone må faktisk vise alle onsenalternativer på stedsdetaljen');
}
if(!app.includes('renderOnsenOptionsHtml(data.onsenOptions') || !app.includes('id="hakone-onsen-options"')){
  errors.push('Overnatting: Hakone må vise samme onsenalternativer i baseoversikten');
}

const style = fs.readFileSync('docs/assets/style.css', 'utf8');
if(!style.includes('.onsen-options-grid') || !style.includes('@media(max-width:850px)')){
  errors.push('Onsen: sammenligningskortene mangler mobilresponsiv styling');
}

const glossaryJs=fs.readFileSync('docs/assets/glossary.js','utf8');
const shinjukuDetail=fs.readFileSync('docs/place.html','utf8');
if(!shinjukuDetail.includes('id="simple" class="kicker" data-glossary-text')||
   !glossaryJs.includes("td,small,[data-glossary-text]")){
  errors.push('Hanami-popup må fungere i en dynamisk detalj-undertittel (div.kicker), ikke bare i vanlige paragrafer');
}

try { new Script(glossaryJs,{filename:'docs/assets/glossary.js'}); }
catch(error){errors.push(`glossary.js: syntaksfeil ${error.message}`);}
for(const token of ["json('data/guide.json')","x.inline===true","MutationObserver","NodeFilter.SHOW_TEXT","aria-expanded","aria-controls","keydown","Escape","pointerdown","getBoundingClientRect"]){
  if(!glossaryJs.includes(token))errors.push(`glossary.js: mangler ${token}`);
}
if(glossaryJs.includes('const definitions=')||glossaryJs.includes('const glossaryTerms='))errors.push('glossary.js: ordforklaringer skal bare ligge i datalaget');
for(const token of ['.glossary-term{','.glossary-popover[hidden]{display:none}','.glossary-term:focus-visible','.glossary-popover-close:focus-visible']){
  if(!style.includes(token))errors.push(`style.css: tilgjengelig ordlisteutseende mangler ${token}`);
}

const ideaJs=fs.readFileSync('docs/assets/day-ideas.js','utf8');
try{new Script(ideaJs,{filename:'docs/assets/day-ideas.js'});}catch(error){errors.push(`day-ideas.js: syntaksfeil ${error.message}`);}
const ideaHtml=fs.readFileSync('docs/day-ideas.html','utf8');
for(const token of ['renderDayIdeas()','id="day-ideas-list"','id="idea-choices-summary"','id="idea-copy-choices"','data-copy=','day-ideas.js?v=']){
  if(!ideaHtml.includes(token))errors.push(`day-ideas.html: mangler ${token}`);
}
if(!pages.navigation?.sections?.some(g=>g.items?.some(x=>x.key==='dayIdeas')) || !app.includes('place-taxonomy-tags') || !app.includes('day-ideas.html?base=')){
  errors.push('app.js: Steder og navigasjon peker ikke til Dagidéer');
}
if(!ideaJs.includes("JapanChoices.set('place',id,button.dataset.setChoice)") || !ideaJs.includes('idea-copy-choices') || !ideaJs.includes("button.dataset.setChoice")){
  errors.push('Dagidéer: lokal enkel beslutningsfunksjon eller kopiering mangler');
}
if(ideaJs.includes('bookingRef') || ideaJs.includes('navigator.sendBeacon')) errors.push('Dagidéer må ikke overføre private vurderinger');
if(!style.includes('.day-idea-cards') || !style.includes('.idea-choice-buttons')) errors.push('Dagidéer mangler responsiv visning');

if (!app.includes("trip.route") || !app.includes('place-destination-group') ||
  !app.includes("sort((a,b)=>a.name.localeCompare(b.name,'nb'))") ||
  !app.includes('setupJourneyFilters(filters,trip,places,places,draw)')) {
  errors.push('Steder: sortering etter reiserute, nøytral alfabetisering eller filter mangler');
}
if (!style.includes('.place-destination-heading') || !style.includes('.place-destination-items')) {
  errors.push('Steder: destinasjonsgrupper mangler felles styling');
}
if (!style.includes('#places-grid.place-list{gap:30px}') ||
    !style.includes('border:1px solid color-mix(in srgb,var(--area-color) 22%,var(--line))') ||
    !style.includes('background:color-mix(in srgb,var(--area-color) 5%,var(--paper))') ||
    !style.includes('.place-destination-group{padding:11px;border-radius:17px}')) {
  errors.push('Steder: lett innramming rundt hver destinasjon og mobiltilpasning mangler');
}

if (!app.includes('class="place-destination-heading-link"') ||
    !app.includes('aria-label="Les om ${base.name}:') ||
    !app.includes('class="place-destination-overview-label"') ||
    !app.includes('class="place-destination-heading-arrow"')) {
  errors.push('Steder: stedsnavn og tydelig om-stedet-lenke må være samlet i en stor klikkbar overskrift');
}
if (!style.includes('.place-destination-heading-link:focus-visible') ||
    !style.includes('.place-destination-heading-link:hover') ||
    !style.includes('.place-destination-overview-label') ||
    !style.includes('.place-destination-overview{')) {
  errors.push('Steder: synlig og tastaturtilgjengelig lenke til stedsoversikt mangler styling');
}
if (app.includes('class="place-destination-overview">Om ${base.name} →')) {
  errors.push('Steder: liten isolert oversiktsknapp ytterst til høyre må ikke gjeninnføres');
}

try {
  new Script(app,{filename:'docs/assets/app.js'});
} catch (error) {
  errors.push(`docs/assets/app.js: syntaksfeil ${error.message}`);
}
const flightHtml=fs.readFileSync('docs/flights.html','utf8');
if (!flightHtml.includes('renderFlightGuide()') || !flightHtml.includes('id="flight-pattern-list"') ||
    !flightHtml.includes('id="flight-pattern-detail"') || !flightHtml.includes('id="flight-workflow"') ||
    !flightHtml.includes('id="flight-variations"') || !flightHtml.includes('id="flight-hub-examples"') ||
    !flightHtml.includes('id="flight-checklist"') || !flightHtml.includes('id="flight-sources"')) {
  errors.push('flights.html: guiden mangler visningskomponenter');
}
if (flightHtml.includes('flights-page.js') || flightHtml.includes('flights-page.css') ||
    fs.existsSync('docs/assets/flights-page.js') || fs.existsSync('docs/assets/flights-page.css')) {
  errors.push('Flyresearchens gamle sideressurser skal ikke være aktive');
}
if (/\\b(?:renderFlightsResearch|flight-copy-template|flight-r-matrix)\\b/.test(app + flightHtml)) {
  errors.push('Spor fra historiske flysøkegrensesnitt er fortsatt i aktiv kode');
}

if (!style.includes('.map-error[hidden]{display:none}')) errors.push('style.css: skjulte kartfeil må forbli skjult selv om .map-error setter display');
if (!app.includes('async function renderFlightGuide()') || !app.includes("json('data/flights.json')")) errors.push('app.js mangler åpen flysøksguide');
if (!pages.navigation?.sections?.some(g=>g.items?.some(x=>x.key==='flights')) || !app.includes('data-pattern-id')) errors.push('app.js mangler synlig navigasjon eller interaktive flysøkoppsett');
if (!app.includes('leg.googleUrl')||!app.includes('leg.finnUrl')||!app.includes('flight-guide-link-list')) errors.push('app.js: hver søkekandidat skal vise rutespesifikke Google Flights- og FINN-lenker');
if (app.includes('renderFlightsResearch')||app.includes('flight-copy-template')) errors.push('app.js skal ikke ha historisk flyresearchvisning');
if (!app.includes('async function renderRestaurant()') || !app.includes('restaurant.html?id=')) errors.push('app.js mangler generisk restaurantdetalj');
if (!app.includes('async function renderHotels()') || !app.includes('async function renderHotel()') || !app.includes('hotel.html?id=')) errors.push('app.js mangler overnattingsvisninger');
if (!app.includes('async function renderPlace()') || !app.includes("json('data/places.json')")) errors.push('app.js mangler kanonisk stedsvisning');
if (!app.includes('places.filter(p=>destinationId(trip,p)===stop.id &&') || !app.includes("sort((a,b)=>a.name.localeCompare(b.name,'nb'))") || !app.includes('place-destination-group')) errors.push('app.js: steder må grupperes etter reiserute og sorteres nøytralt alfabetisk');
if (!app.includes('async function loadFx()') || !app.includes('providers=ecb')) errors.push('app.js mangler live ECB-kurs');
const directFxLoads=[...app.matchAll(/json\('data\/fx\.json'\)/g)].length;
if (directFxLoads !== 1) errors.push('app.js skal bare lese fx.json inne i loadFx()');
if (!app.includes('footer-version') || !app.includes("json('data/site.json')")) errors.push('footer mangler versjon/sist oppdatert');
if (!app.includes('1 NOK =') || !app.includes('1 JPY =')) errors.push('footer viser ikke kurs begge veier');
if (!app.includes('place-list-card')) errors.push('Steder bruker ikke kompakt kortliste');
if (!app.includes('const dayTripGroups=(trip.dayTrips||[])') || !app.includes('const dayTripItemIds=new Set(') || !app.includes('localAttractions=attractions.filter(') || !app.includes('place-daytrip-group')) errors.push('Steder: dagsturer er ikke samlet i egne undergrupper under basen');
if (!style.includes('.place-daytrip-group') || !style.includes('.place-daytrip-heading')) errors.push('Steder: undergrupper for dagsturer mangler styling');
if (!app.includes('setupJourneyFilters')) errors.push('app.js mangler felles filter for del av reisen');
if (!app.includes('routeContextLinksHtml') || !app.includes('places.html?base=') || !app.includes('food.html?base=') || !app.includes('hotels.html?base=')) {
  errors.push('app.js: rutesiden mangler kontekstnavigasjon videre til steder, mat eller overnatting');
}
if (!fs.readFileSync('docs/assets/state.js','utf8').includes('params.has(param)')) errors.push('State: URL må kunne overstyre lagret valg');
if (!app.includes('selectJourneyBase(trip,value,{param})') || !app.includes('selectedJourneyBase(trip,{param})') || !app.includes('JapanState.keys.base'))errors.push('app.js: reisebasefilter må følge brukeren mellom oversikter og støtte eksplisitt ?base=');
if (!ideaJs.includes('selectedJourneyBase(trip)') || !ideaJs.includes('selectJourneyBase(trip,value)'))errors.push('Dagidéer: mangler felles reisebasefilter');
if (!style.includes('/* Canonical place-list component */') || !style.includes('grid-template-columns:112px minmax(0,1fr) 26px') || !style.includes('.place-list-primary-link::after')) {
  errors.push('style.css: mobil stedsrad mangler kanonisk kompakt grid/klikkflate');
}
if (style.includes('.place-list-card>a{') || style.includes('v0.17: robust compact place rows')) {
  errors.push('style.css: gammel parallell stedskort-layout finnes fortsatt');
}
if (app.includes('<a class="route-thumb-wrap"')) errors.push('app.js: rute-thumbnail må ikke være ytre lenke rundt bildekreditering');
if (!app.includes('place-list-primary-link')) errors.push('app.js: stedskort mangler gyldig primærlenke uten nested anchor');
if(app.includes('Detaljer under kartet ↓'))errors.push('Kartpopup må ha presis lenke til sted eller reiseetappe, ikke generisk scroll');
if(!app.includes("'Se restauranten'")||!app.includes("'Se overnattingen'")||!app.includes("'Se stedet'"))errors.push('Kartpopup mangler direkte detaljlenker');
if (!app.includes('showPlaceDetail') || !app.includes('showFoodDetail') || !app.includes('showHotelDetail') || !app.includes('showStopDetail')) {
  errors.push('app.js: kartvalg synkroniserer ikke detaljpanelet for valgt innhold');
}
const popupSyncCount=[...app.matchAll(/popup\.on\('open'/g)].length;
if (popupSyncCount < 5) errors.push('app.js: detaljpanelet må bindes til faktisk åpnet kart-popup, ikke separate klikkhendelser');
const mapShared=fs.readFileSync('docs/assets/map-shared.js','utf8');
if (!mapShared.includes("function renderDetailContextMap(") || !mapShared.includes("onFatal:()=>") || !mapShared.includes("onReady:()=>root.querySelector('.map-error')?.remove()")) {
  errors.push('map-shared.js: felles detaljkart skal ha håndtering av fatal feil og opprydding når det blir brukbart');
}
const choicesShared=fs.readFileSync('docs/assets/choices.js','utf8');
for(const [name,code] of [['map-shared.js',mapShared],['choices.js',choicesShared]]){
 try{new Script(code,{filename:name});}catch(error){errors.push(name+': syntaksfeil '+error.message);}
}
if(!mapShared.includes('experience:true,food:true,hotel:true,stations:true')||!mapShared.includes('JapanState.writeLocal(JAPAN_MAP_LAYER_KEY')||!app.includes('readMapLayers()'))errors.push('Kart: alle lag må starte aktivert og brukerens valg må deles mellom kart');
if(!app.includes('mapPoiElement(trip,')||!app.includes('sharedMapPopupHtml(trip,')||!placeHtml.includes('id="place-map-layers"'))errors.push('Kart: rutekart og stedskart skal dele markører, popup og lagkontroller');
if(!choicesShared.includes('const key=JapanState.keys.choices')||!choicesShared.includes('japan-2027-idea-choices-v1')||!ideaJs.includes("JapanChoices.set('place'"))errors.push('Mine valg: lokalt, delt valg med migrering fra dagidéer mangler');
if(!choicesShared.includes('async function renderMyChoices()')||!choicesShared.includes('async function openSiteSearch()'))errors.push('Mine valg eller felles søk mangler');
if (!app.includes("json('data/pages.json')") || !app.includes('applyPageCopy')) errors.push('app.js: mangler sentral sidecopy fra pages.json');
if (!app.includes("json('data/passes.json')") || !app.includes('pass-watchlist')) errors.push('app.js: passvurdering hentes ikke fra passes.json');
if (!app.includes('renderPricePartySelector') || !app.includes('partyMultiplier') || app.includes('trip.planningParty')) errors.push('app.js: prisscenarier er ikke sentralisert');
if ((app.match(/mapSelectionPopupHtml/g)||[]).length < 7) errors.push('app.js: rutekartet bruker ikke felles kompakt popup-renderer');
if (!app.includes('installMapLoadFallback') || !app.includes("map.once('load'")) errors.push('app.js: kartfeil må skille fatal lastfeil fra enkeltressurser/fliser');
if (!app.includes('placePriceSummaryHtml') || !app.includes('placePriceDetailHtml')) errors.push('app.js: stedspriser vises ikke konsistent i liste og detalj');
if (!app.includes("json('data/prep.json')")) errors.push('app.js henter ikke kanonisk prep.json for stedskoblinger');
if (!app.includes('renderLanguage') || !app.includes('speechSynthesis') || !app.includes('renderPrepItem')) errors.push('app.js: språklyd, utvidet fraseliste eller detaljside for små mål mangler');
if (!app.includes('prepAudienceHtml') || !app.includes("link.kind==='stream'") || !app.includes('target="_blank" rel="noopener"')) errors.push('app.js: tydelig målgruppevisning eller sikker ekstern strømmenavigasjon mangler');
if (app.includes('bindPrepStreamLinks') || app.includes('data-stream-app-url')) errors.push('app.js: custom-scheme strømmenavigasjon skal ikke brukes');
if (!mapShared.includes('Knutepunkter') || !transport.stationNote) errors.push('rutekartet forklarer ikke at stasjonene er utvalgte knutepunkter');
const toolbarOrder=['Opplevelser','Mat','Overnatting','Knutepunkter'].map(x=>mapShared.indexOf(x));
if(toolbarOrder.some(x=>x<0)||toolbarOrder.some((x,i)=>i>0&&x<=toolbarOrder[i-1]))errors.push('Kart: kartlagene har feil rekkefølge');
if (app.includes('guide.images') || app.includes('guide.placeExtras') || app.includes('areaImageKey(')) errors.push('app.js har gammel parallell stedsdata');
if (!app.includes('mapStationElement(s.name,s.memberships.map(m=>destinationColor(trip,m.leg.toRouteId)))') || !mapShared.includes('stationGroups.get(key).colors.push(destinationColor(trip,leg.toRouteId))')) errors.push('stasjonsmarkører på rute- og detaljkart følger ikke destinasjonsfargene');
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
