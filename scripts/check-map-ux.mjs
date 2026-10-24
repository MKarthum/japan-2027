
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
 escapeSiteHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
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
 assert(el.style.props['--map-glass-clip']?.startsWith('path("M'),'Clipping must match the shape for '+k);
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
assert(active.innerHTML.includes(a.mapSymbolSvg('experience'))&&active.innerHTML.includes('>Hakone</span>'),'Selected experience must keep its category icon and show its actual name');
assert(!active.innerHTML.includes('Dette stedet'));
assert.equal(active.title,'Hakone');
const escaped=a.mapCurrentPlaceElement({}, {name:'En test <onload=foo> & venner'},'experience');
assert(escaped.innerHTML.includes('En test &lt;onload=foo&gt; &amp; venner'),'Escape labels in generated HTML');
for(const kind of ['food','hotel']){
 const chosen=a.mapCurrentPlaceElement({}, {name:'Teststed'},kind);
 assert(chosen.innerHTML.includes(a.mapSymbolSvg(kind)),'Selected '+kind+' must keep its silhouette');
 assert(chosen.innerHTML.includes('map-current-label')&&chosen.innerHTML.includes('>Teststed</span>'));
 assert(chosen.attributes['aria-label'].includes('Valgt på kartet'));
}
let hooks={};
const marker={getElement:()=>active};
const popup={on:(name,fn)=>{hooks[name]=fn}};
assert.equal(a.watchMapMarker(marker,popup),marker);
hooks.open();hooks.close();
assert.deepEqual(active.classList.added,['is-current','is-selected']);
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
assert(shared.includes('mapCurrentPlaceElement(trip,current,currentKind)'));
assert(css.includes('.map-poi-dot.is-current{'));
assert(shared.includes("createMapLabelController({map,root,context:'detail'})"));
assert(app.includes("createMapLabelController({map,root:routeMapRoot,context:'route'})"));
assert(shared.includes('function mapRouteStopElement('));
assert(css.includes('.map-current-label{'));
assert(!css.includes('.map-poi-dot:not(.is-current)::before{'),'Glass must not be another box around the symbol');
assert(css.includes('.map-poi-dot::before{')&&css.includes('clip-path:var(--map-glass-clip)'),'Glass must be clipped to the icon silhouette');
assert(css.includes('fill-opacity:var(--map-symbol-alpha,.48)'),'Real SVG alpha is required; a pale opaque colour is insufficient');
assert(!css.includes('fill:color-mix(in srgb,var(--area-color'),'SVG alpha must not depend on color-mix support');
assert(css.includes('border-radius:50%;background:rgba(255,255,255,.08)'),'Current marker must not cover the map with a white disk');
assert(css.includes('background:linear-gradient(145deg,rgba(255,255,255,.14)'),'Silhouette highlight must not hide map detail');
assert(css.includes('fill-opacity:1;stroke:#fff'),'High contrast and reduced transparency must be opaque');
assert(css.includes('.map-layer-toggle .map-symbol-surface{fill:currentColor;fill-opacity:1}'),'Toolbar legend remains fully visible');
assert(!css.includes('.map-place-label'),'No obsolete route label selectors remain');
assert(shared.includes('JAPAN_MAP_ICON_PATHS[kind].match('),'Clip silhouette comes from the canonical SVG, not a duplicate shape');
assert(css.includes('.map-station-dot .map-station-face::before{'),'Train symbols must put transparency inside their diamonds');
assert(css.includes('opacity:.5'),'Station colour must be translucent, preserving the map underneath');
assert(css.includes('background:rgba(255,253,249,.87)'),'Popups must be lightly translucent');
assert(css.includes('background:rgba(255,255,255,.72)'),'Selected object name must be translucent but legible');
assert(css.includes('max-width:min(240px,calc(100vw - 46px))'),'Long current names should fit on mobile');
assert(css.includes('(prefers-contrast:more)'),'Honor high-contrast preferences');
assert.equal((app.match(/new maplibregl\.Map\(/g)||[]).length,1,'Only one route map implementation is supported');
assert.equal((shared.match(/new maplibregl\.Map\(/g)||[]).length,1,'Only one detail map implementation is supported');
assert(shared.includes('watchMapMarker(marker,popup)') && app.includes('watchMapMarker(marker,popup)'));
assert(!app.includes("className='map-station-dot'"),'Map station rendering should only live in map-shared');
const route=fs.readFileSync('docs/route.html','utf8');
const place=fs.readFileSync('docs/place.html','utf8');
assert(route.includes('assets/map-shared.js')&&place.includes('assets/map-shared.js'));
console.log('PASS: four distinct shared shapes, touch targets, selected location, accessible labels, area colors, multi-base stations, toolbar legend and selection lifecycle');
