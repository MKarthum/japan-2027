import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const data=JSON.parse(fs.readFileSync('docs/data/flights.json','utf8'));
const trip=JSON.parse(fs.readFileSync('docs/data/trip.json','utf8'));
const fx=JSON.parse(fs.readFileSync('docs/data/fx.json','utf8'));
const page=fs.readFileSync('docs/flights.html','utf8');
const source=fs.readFileSync('docs/assets/flights-page.js','utf8');
const round=data.research.searchRounds.find(r=>r.id===data.research.currentRoundRef);
assert.ok(round);
assert.equal(round.counts.uniqueRouteDateCombinations,35);
assert.equal(round.candidates.length,7);
assert.match(page,/renderFlightsResearch/);

const elements=new Map();
const routes=['ALL','A','B','C','D'].map(route=>({
 dataset:{flightRoute:route},
 addEventListener(type,fn){this.handler=fn},
 setAttribute(){}
}));
function el(id){
 if(!elements.has(id)) elements.set(id,{
  id,innerHTML:'',textContent:'',value:'',
  querySelectorAll(){return routes},
  querySelector(){return {addEventListener(){}}}
 });
 return elements.get(id);
}
el('flight-r-sort').value='date';
el('flight-r-query').value='';
const document={getElementById:el};
const nb=new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0});
const ctx={
 document,
 URL,
 console,
 nav(){},
 footer(){},
 applyPageCopy:async()=>({}),
 json:async name=>{
  if(name==='data/flights.json')return data;
  if(name==='data/trip.json')return trip;
  throw Error(name);
 },
 loadFx:async()=>fx,
 fmtNok:n=>nb.format(Math.round(n))+' kr',
 fmtJpy:n=>'¥'+nb.format(Math.round(n)),
 jpyFromNok:(n,v)=>n*v.jpyPerNok,
 dualMoneyHtml:(p,s)=>'<span class="money-dual"><span>'+p+'</span><small>ca. '+s+'</small></span>',
 dualFromJpy:(v,f)=>'¥'+nb.format(v)+' · ca. '+nb.format(v*f.nokPerJpy)+' kr',
 fmtLongDate:value=>value,
};
vm.runInNewContext(source,ctx,{filename:'docs/assets/flights-page.js'});
await ctx.renderFlightsResearch();
const picks=el('flight-r-pick-list').innerHTML;
const results=el('flight-r-search-results').innerHTML;
const countRows=text=>(text.match(/<tr>/g)||[]).length;
assert.equal((picks.match(/<article class="flight-r-pick"/g)||[]).length,7,'Seven candidate cards');
assert.equal(countRows(results),35,'35 unique routes and date pairs');
assert.match(el('flight-r-count').textContent,/35 av 35/);
assert.match(picks.replace(/\s/g,' '),/65 768 kr/,'Carrier price shown');
assert.match(picks,/Gjenta samme datosøk/);
assert.doesNotMatch(picks,/Søkt total for 2\+2|FINN Best · 2\+2/,'No old fare-party copy');
assert.ok((results.match(/requestedDepartureDate=/g)||[]).length>=35,'Deep search links for all rows');
const sourceURLs=[...results.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
assert.ok(sourceURLs.every(u=>u.startsWith('https://')),'All links HTTPS');
assert.ok(sourceURLs.every(u=>!/api_key=|departure_token=|booking_token=|session=/i.test(u)),'No private tokens');
assert.match(results.replace(/\s/g,' '),/65 573 kr/,'Latest recheck observed');
routes[2].handler();
assert.match(el('flight-r-count').textContent,/15 av 35/,'B-direction filter');
assert.equal(countRows(el('flight-r-search-results').innerHTML),15);
el('flight-r-query').value='21. mar';
routes[0].handler();
assert.ok(countRows(el('flight-r-search-results').innerHTML)>0);
console.log('Flight page: PASS – 7 candidate cards, 35 unique deep-linked search rows, route filters, prices, safe URLs.');
