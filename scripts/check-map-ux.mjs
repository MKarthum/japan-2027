
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const shared=fs.readFileSync('docs/assets/map-shared.js','utf8');
const app=fs.readFileSync('docs/assets/app.js','utf8');
const css=fs.readFileSync('docs/assets/style.css','utf8');
class Element {
 constructor(tag){this.tag=tag;this.style={props:{},setProperty:(k,v)=>{this.style.props[k]=v}};this.attributes={};this.className='';this.classList={added:[],removed:[],add:x=>this.classList.added.push(x),remove:x=>this.classList.removed.push(x)};}
 setAttribute(k,v){this.attributes[k]=v;}
}
const ctx={
 JapanState:{keys:{map:'japan-2027-map-layers-v1'},readJson:()=>({food:false}),writeLocal:()=>{}},
 destinationColor:()=> '#b6473d',
 document:{createElement:tag=>new Element(tag)},
 window:{dispatchEvent:()=>{}},
 CustomEvent:class {constructor(type,{detail}){this.type=type;this.detail=detail}},
};
vm.runInNewContext(shared+';globalThis.testApi={mapPoiElement,mapStationElement,mapCurrentPlaceElement,watchMapMarker,mapSymbolSvg,mapLayerToggleHtml,readMapLayers};',ctx);
const a=ctx.testApi;
const symbols=['experience','food','hotel','stations'].map(x=>a.mapSymbolSvg(x));
assert.equal(new Set(symbols).size,4,'Each layer has a distinct visual silhouette');
assert(symbols[0].includes('map-symbol-surface') && symbols[1].includes('map-symbol-detail'));
assert(symbols[2].includes('map-symbol-detail') && symbols[3].includes('<rect'));
for(const k of ['experience','food','hotel']){
 const el=a.mapPoiElement({}, {name:'Teststed'},k);
 assert.equal(el.tag,'button');
 assert(el.innerHTML.includes('<svg'));
 assert(el.attributes['aria-label'].includes('Teststed'));
 assert.equal(el.style.props['--area-color'],'#b6473d');
}
const single=a.mapStationElement('Shinjuku',['#123456']);
assert.equal(single.tag,'button');assert(single.innerHTML.includes('map-station-face'));
assert.equal(single.style.props['--station-fill'],'#123456');
assert.equal(single.attributes['aria-label'],'Planlagt knutepunkt: Shinjuku');
const sharedStation=a.mapStationElement('Osaka',['#123456','#abcdef','#123456']);
assert(sharedStation.style.props['--station-fill'].startsWith('conic-gradient('));
assert(sharedStation.style.props['--station-fill'].includes('#abcdef'));
const active=a.mapCurrentPlaceElement({}, {name:'Hakone'});
assert.equal(active.tag,'button');
assert(active.innerHTML.includes('<circle')&&active.innerHTML.includes('<path'));
let hooks={};
const marker={getElement:()=>active};
const popup={on:(name,fn)=>{hooks[name]=fn}};
assert.equal(a.watchMapMarker(marker,popup),marker);
hooks.open();hooks.close();
assert.deepEqual(active.classList.added,['is-selected']);
assert.deepEqual(active.classList.removed,['is-selected']);
const layerHtml=a.mapLayerToggleHtml({experience:31,food:22,hotel:15,stations:11},{experience:true,food:false,hotel:true,stations:true});
assert.equal((layerHtml.match(/data-map-layer=/g)||[]).length,4);
assert.equal((layerHtml.match(/class="map-category-icon"/g)||[]).length,4);
assert(layerHtml.includes('aria-pressed="false"'));
assert(layerHtml.includes('Knutepunkter')&&layerHtml.includes('Opplevelser'));
assert.equal(a.readMapLayers().food,false);
assert(css.includes('width:42px;height:42px'),'Markers need sufficiently large touch targets');
assert(css.includes('width:26px;height:26px'),'Station needs a visibly larger diamond');
assert(css.includes('transform:rotate(45deg)'),'Stations must be visually diamond-shaped');
assert(css.includes('.map-layer-toggle .map-category-icon'),'Toolbar icons must match map markers');
assert(app.includes('mapStationElement(s.name,s.memberships.map('));
assert(shared.includes('mapStationElement(station.name,colors,mapStationRole(transport,station.name))'));
assert(shared.includes('mapCurrentPlaceElement(trip,current)'));
assert(shared.includes('watchMapMarker(marker,popup)') && app.includes('watchMapMarker(marker,popup)'));
assert(!app.includes("className='map-station-dot'"),'Map station rendering should only live in map-shared');
const route=fs.readFileSync('docs/route.html','utf8');
const place=fs.readFileSync('docs/place.html','utf8');
assert(route.includes('assets/map-shared.js')&&place.includes('assets/map-shared.js'));
console.log('PASS: four distinct shared shapes, touch targets, selected location, accessible labels, area colors, multi-base stations, toolbar legend and selection lifecycle');
