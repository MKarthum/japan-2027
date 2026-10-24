import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const transport=JSON.parse(read('docs/data/transport.json'));
const routeHtml=read('docs/route.html'),app=read('docs/assets/app.js');
const shared=read('docs/assets/map-shared.js'),css=read('docs/assets/style.css');
const valid=new Set(['used','alternative','intermediate']);
const names=[...new Set(transport.legs.flatMap(x=>x.stations.map(s=>s.name)))];
assert.equal(names.length,14);
assert(names.every(name=>valid.has(transport.stationRoles[name])));
assert.deepEqual(Object.keys(transport.stationRoles).sort(),names.sort());
const used=['Shinjuku','Odawara','Hakone-Yumoto','Kyoto','Himeji','Hiroshima','Shin-Osaka','Osaka Station'];
assert(used.every(n=>transport.stationRoles[n]==='used'));
assert(['Nagoya','Shin-Kobe','Okayama'].every(n=>transport.stationRoles[n]==='alternative'));
assert(['Gifu-Hashima','Maibara','Fukuyama'].every(n=>transport.stationRoles[n]==='intermediate'));
for(const leg of transport.legs){
 assert(leg.stations.length>=2);
 assert.equal(leg.stations[0].name,leg.from);
 assert.equal(leg.stations.at(-1).name,leg.to);
 assert.equal(leg.stations[0].elapsedMin,0);
 assert.equal(leg.stations.at(-1).elapsedMin,leg.durationMin);
 assert(leg.stations.every((s,i)=>i===0||s.elapsedMin>leg.stations[i-1].elapsedMin));
}
assert(transport.stationNote.toLowerCase().includes('ikke en fullstendig stoppplan'));
assert(routeHtml.includes('id="journey-stops"'));
assert(app.includes('journeyStops.innerHTML=transport.legs.map'));
assert(app.includes('<details class="journey-leg"'));
assert.equal((app.match(/map\.on\('click',selectRouteLine\)/g)||[]).length,1);
assert(!app.includes('popupForLeg('));
assert(app.includes("closest?.('.maplibregl-marker')"));
assert(app.includes('const hits=map.queryRenderedFeatures(event.point,{layers:routeHitLayerIds})'));
assert(app.includes('if(first)showLegDetail('));
// Exercise the real click selector, including the exact case that previously opened multiple overlays.
const handlerStart=app.indexOf('  const selectRouteLine=(event)=>{');
const handlerEnd=app.indexOf('  const addRoutePart =',handlerStart);
assert(handlerStart>=0 && handlerEnd>handlerStart);
const handlerSource=app.slice(handlerStart,handlerEnd);
const selection=[];
const firstLeg=transport.legs[0];
const secondLeg=transport.legs[1];
const fakeMap={queryRenderedFeatures:()=>[
 {properties:{journeyId:firstLeg.id}},
 {properties:{journeyId:secondLeg.id}}
]};
const selector=new Function('map','routeHitLayerIds','legById','showLegDetail',handlerSource+';return selectRouteLine;')(
 fakeMap,['a-hit','b-hit'],new Map(transport.legs.map(x=>[x.id,x])),leg=>selection.push(leg.id)
);
selector({point:{x:1,y:1},originalEvent:{target:{closest:()=>null}}});
assert.deepEqual(selection,[firstLeg.id],'Multiple line hits may only select one leg');
selector({point:{x:1,y:1},originalEvent:{target:{closest:()=>({className:'maplibregl-marker'})}}});
assert.deepEqual(selection,[firstLeg.id],'A route marker may not select underlying lines');

assert(css.includes('.map-stop:not(.daytrip){') && css.includes('width:42px;height:42px;display:grid;place-items:center'));
assert(app.includes('const updateRouteMarkerScale=()=>'));
assert(app.includes('mapRouteStopElement(trip,p,{number:i+1})'));
assert(app.includes('mapRouteStopElement(trip,p,{dayTrip:true})'));
assert(shared.includes('function mapRouteStopElement('));
assert(app.includes("map.on('zoom',updateRouteMarkerScale)"));
assert(app.includes("map.getZoom()>=9?'detail':'overview'"));
assert(css.includes('.map-object-label{')&&shared.includes('routeStop:{minZoom:8.8,priority:600}'));
assert(css.includes('width:24px;height:24px;border-radius:8px;font-size:.73rem'));
assert(css.includes('width:42px;height:42px;display:grid;place-items:center'));
assert(css.includes('background:rgba(250,252,255,.36)')&&css.includes('backdrop-filter:blur(1px) saturate(110%)'),'Route markers should reveal map details, not fog the basemap');
assert(css.includes('@media(prefers-reduced-transparency:reduce)'));
assert(css.includes('.map-station-dot.alternative .map-station-face'));
assert(css.includes('.map-station-dot.intermediate .map-station-face'));
assert(shared.includes("if(['base','dagstur'].includes(x.type))continue"));
assert(shared.includes("currentKind==='experience'&&['base','dagstur'].includes(current.type)"));
const context={
 JapanState:{keys:{map:'m'},readJson:()=>({}),writeLocal:()=>{}},
 destinationColor:()=> '#234567',
 document:{createElement:tag=>({tagName:tag,style:{props:{},setProperty(k,v){this.props[k]=v}},setAttribute(k,v){this[k]=v}})},
 window:{dispatchEvent:()=>{}},CustomEvent:class{}
};
vm.runInNewContext(shared+';globalThis.test={mapStationRole,mapStationElement}',context);
for(const [name,role] of Object.entries(transport.stationRoles)){
 assert.equal(context.test.mapStationRole(transport,name),role);
 const el=context.test.mapStationElement(name,['#abcdef'],role);
 assert(el.className.includes(role));
 assert(el.title.includes(name));
}
console.log('PASS: 14 station classifications across 5 legs, single route-line selection, no duplicate popup, no arbitrary base markers, optional route timeline.');
