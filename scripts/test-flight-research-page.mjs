import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const data=JSON.parse(fs.readFileSync('docs/data/flights.json','utf8'));
const trip=JSON.parse(fs.readFileSync('docs/data/trip.json','utf8'));
const fx=JSON.parse(fs.readFileSync('docs/data/fx.json','utf8'));
const source=fs.readFileSync('docs/assets/flights-page.js','utf8');
const page=fs.readFileSync('docs/flights.html','utf8');
const home=fs.readFileSync('docs/index.html','utf8');
const round=data.research.searchRounds.find(r=>r.id===data.research.currentRoundRef);
assert.ok(round);
assert.equal(round.searchRuns.length,45);
assert.equal(round.completeOptions.length,4);
assert.equal(round.hypotheses.length,4);
assert.ok(round.completeOptions.every(o=>o.flightTotalNok>0&&o.longhaul.id));
assert.ok(round.completeOptions.filter(o=>o.hub==='shanghai').every(o=>o.regional?.id));
assert.equal(round.hypotheses.find(h=>h.id==='beijing').status,'Ikke ferdig priset');
assert.match(round.directRouteCheck.finding,/Oslo–Beijing.*direkte/);
assert.doesNotMatch(round.directRouteCheck.finding,/Oslo–Shanghai.*direktefly/);
assert.match(page,/renderFlightsResearch/);
assert.match(home,/renderHomeFlightTeaser/);

const els=new Map();
function element(id) {
  if(!els.has(id)) {
    const handlers={};
    const children=['shanghai','beijing','bangkok','japan'].map(hub=>({dataset:{hub},setAttribute(){},addEventListener(type,fn){this.handler=fn}}));
    els.set(id,{
      innerHTML:'',textContent:'',value:'',dataset:{},handlers,
      addEventListener(type,fn){handlers[type]=fn},
      setAttribute(){},scrollIntoView(){},
      querySelectorAll(){return children},
      querySelector(){return {addEventListener(){}}}
    });
  }
  return els.get(id);
}
const doc={getElementById:element};
const nb=new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0});
const ctx={
  document:doc, URL, console,
  nav(){},footer(){},applyPageCopy:async()=>{},
  json:async path=>path==='data/flights.json'?data:path==='data/trip.json'?trip:Promise.reject(Error(path)),
  loadFx:async()=>fx,
  fmtNok:n=>nb.format(Math.round(n))+' kr',
  fmtJpy:n=>'¥'+nb.format(Math.round(n)),
  jpyFromNok:(n,rate)=>n*rate.jpyPerNok,
  dualMoneyHtml:(p,s)=>'<span class="money-dual"><span>'+p+'</span><small>ca. '+s+'</small></span>'
};
vm.runInNewContext(source,ctx,{filename:'docs/assets/flights-page.js'});
await ctx.renderFlightsResearch();
const cards=element('flight-r-pick-list').innerHTML;
const branches=element('flight-hub-branches').innerHTML;
const archive=element('flight-r-search-results').innerHTML;
assert.equal((cards.match(/<article class="flight-r-pick"/g)||[]).length,4,'Four choice cards');
assert.equal((branches.match(/class="flight-hub-branch"/g)||[]).length,4,'Four hub hypotheses');
assert.match(cards.replace(/\s/g,' '),/47 055 kr/);
assert.match(cards.replace(/\s/g,' '),/47 706 kr/);
assert.match(cards,/14/);
assert.match(cards,/Risiko/);
assert.match(archive,/FINN Reise/);
assert.match(archive,/Trip\.com/);
assert.match(archive,/Eldre flyresearch/);
assert.match(element('flight-r-count').textContent,/45 av 45/);
const hrefs=[...cards.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
assert.ok(hrefs.every(url=>url.startsWith('https://')));
assert.ok(hrefs.every(url=>!/token=|session=|pnr=|checkout=/i.test(url)));
await ctx.renderHomeFlightTeaser();
assert.equal((element('home-flight-options').innerHTML.match(/class="flight-hub-preview"/g)||[]).length,3);
console.log('Flight page: PASS – four hub hypotheses, four choice cards, 45 saved search operations, historic archive and home teaser.');
