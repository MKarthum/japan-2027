import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const data=JSON.parse(fs.readFileSync('docs/data/flights.json','utf8'));
const trip=JSON.parse(fs.readFileSync('docs/data/trip.json','utf8'));
const fx=JSON.parse(fs.readFileSync('docs/data/fx.json','utf8'));
const source=fs.readFileSync('docs/assets/flights-page.js','utf8');
const page=fs.readFileSync('docs/flights.html','utf8');
const home=fs.readFileSync('docs/index.html','utf8');
const focus=data.nextFlightFocus;
const round=data.research.searchRounds.find(r=>r.id===data.research.currentRoundRef);
assert.equal(focus.stage,'regional-japan-search');
assert.equal(focus.hubAirport,'PVG');
assert.deepEqual(focus.patterns.map(p=>p.id),['osaka-in','tokyo-in']);
assert.equal(round.searchRuns.length,45);
assert.ok(round.completeOptions.length>=4,'Older research is retained');
assert.doesNotMatch(JSON.stringify(focus),/AY912|HO1608|HO1607|AY915|Mytrip|2027-03-18T08:40|2027-04-05T09:25|booking.?ref|PNR/i);
assert.equal(focus.marketObservation.partyDescription.includes('Fire passasjerer'),true);
assert.equal(focus.airportExpansion.items.length,5);
assert.match(page,/renderFlightsResearch/);
assert.match(home,/renderHomeFlightTeaser/);

const elements=new Map();
const element=id=>{
 if(!elements.has(id))elements.set(id,{
  id,innerHTML:'',textContent:'',value:'',hidden:false,
  handlers:{},addEventListener(type,fn){this.handlers[type]=fn},
  setAttribute(){},scrollIntoView(){},querySelectorAll(){return []},querySelector(){return {addEventListener(){}}}
 });
 return elements.get(id);
};
const nb=new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0});
const context={
 document:{getElementById:element}, URL, console,
 nav(){},footer(){},applyPageCopy:async()=>{},
 json:async path=>path==='data/flights.json'?data:path==='data/trip.json'?trip:Promise.reject(Error(path)),
 loadFx:async()=>fx,
 fmtNok:n=>nb.format(Math.round(n))+' kr',
 fmtJpy:n=>'¥'+nb.format(Math.round(n)),
 jpyFromNok:(n,rate)=>n*rate.jpyPerNok,
 dualMoneyHtml:(p,s)=>'<span class="money-dual"><span>'+p+'</span><small>ca. '+s+'</small></span>'
};
vm.runInNewContext(source,context,{filename:'docs/assets/flights-page.js'});
await context.renderFlightsResearch();
const cards=element('flight-r-pick-list').innerHTML;
const branches=element('flight-hub-branches').innerHTML;
assert.equal((cards.match(/<article class="flight-r-pick"/g)||[]).length,2);
assert.equal((branches.match(/class="flight-hub-branch"/g)||[]).length,2);
assert.match(cards,/Osaka inn/);
assert.match(cards,/Tokyo inn/);
assert.match(cards,/1 295/);
assert.match(cards,/1 801/);
assert.match(cards,/Economy Light/);
assert.match(cards,/Ikke|ikke/);
assert.match(element('flight-r-airport-results').innerHTML,/KIX/);
assert.match(element('flight-r-airport-results').innerHTML,/UKB/);
assert.match(element('flight-r-airport-results').innerHTML,/NGO/);
assert.match(element('flight-r-airport-results').innerHTML,/HIJ/);
assert.match(element('flight-r-airport-results').innerHTML,/FUK/);
assert.doesNotMatch(cards,/47 055 kr|47 706 kr|25 233 kr/);
assert.match(element('flight-r-overview').innerHTML,/Shanghai/);
assert.match(element('flight-r-search-results').innerHTML,/Historiske flysøk/);
assert.ok(element('flight-r-count').textContent.includes('arkiverte søk'));
assert.equal(element('flight-hub-reset').hidden,true);
await context.renderHomeFlightTeaser();
assert.equal((element('home-flight-options').innerHTML.match(/class="flight-hub-preview"/g)||[]).length,2);
assert.doesNotMatch(element('home-flight-options').innerHTML,/47 055 kr|47 706 kr|25 233 kr/);
assert.match(element('home-flight-options').innerHTML,/kr/);
console.log('Flight page: PASS – private-safe market fares, five airport options, archived research and home preview.');
