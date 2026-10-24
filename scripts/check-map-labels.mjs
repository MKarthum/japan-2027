
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const shared=fs.readFileSync('docs/assets/map-shared.js','utf8');
const css=fs.readFileSync('docs/assets/style.css','utf8');
const htmlFiles=['docs/place.html','docs/restaurant.html','docs/hotel.html'];
const context={
 JapanState:{keys:{map:'map-test'},readJson:()=>({}),writeLocal:()=>{}},
 escapeSiteHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),
 themeStyle:()=>'',destinationTheme:()=>({})
};
vm.runInNewContext(shared+';globalThis.test={mapMicroText,mapSelectNonOverlappingLabels,mapLabelBoxesOverlap,sharedMapPopupHtml};',context);
const {mapMicroText,mapSelectNonOverlappingLabels,mapLabelBoxesOverlap,sharedMapPopupHtml}=context.test;
const box=(l,t,r,b)=>({left:l,top:t,right:r,bottom:b});
const make=(owner,priority,l,t,r,b)=>({owner,priority,centerDistance:0,box:box(l,t,r,b)});
const a=make('experience',325,100,100,180,123);
const b=make('food',200,125,101,202,126);
const c=make('hotel',100,250,100,322,125);
assert.deepEqual(Array.from(mapSelectNonOverlappingLabels([b,c,a],[],5)),['experience','hotel'],
 'Experience wins collisions with food; unrelated hotel label remains');
assert.deepEqual(Array.from(mapSelectNonOverlappingLabels([a,b,c],[{owner:'current-label',box:box(90,95,200,135)}],5)),['hotel'],
 'Current place label always has highest precedence');
assert.deepEqual(Array.from(mapSelectNonOverlappingLabels([a,b,c],[],1)),['experience'],
 'Mobile labels respect a strict cap');
assert(mapLabelBoxesOverlap(box(1,1,20,20),box(23,1,44,20)),'Five-pixel breathing room matters');
assert(!mapLabelBoxesOverlap(box(1,1,20,20),box(50,30,80,50)),'Non-overlap must not hide unrelated labels');
const why={name:'Shibuya',description:'Shibuya er en bydel i Tokyo med livlige gater. Mer forklaring som ikke skal vises.'};
assert.equal(mapMicroText(why,'experience'),'Shibuya er en bydel i Tokyo med livlige gater.');
assert.equal(mapMicroText({why:'Kort omtale av mat.'},'food'),'Kort omtale av mat.');
assert(mapMicroText({description:'a '.repeat(100)},'experience').length<=142);
const popup=sharedMapPopupHtml({},'bydel · Tokyo','Shibuya',why,'place.html?id=shibuya','Se detaljer',mapMicroText(why,'experience'));
assert(popup.includes('bydel · Tokyo'));
assert(popup.includes('Shibuya er en bydel i Tokyo'));
assert(popup.includes('href="place.html?id=shibuya"'),'Only the popup contains the navigation link');
assert(popup.includes('Se detaljer'));
assert(!popup.includes('window.location'));
const unsafe=sharedMapPopupHtml({},'Bydel','X',{},'place.html?id=x','Se detaljer','<script>');assert(unsafe.includes('&lt;script&gt;'));
assert(css.includes('.map-object-label{'));
assert(css.includes('.is-label-visible .map-object-label'));
assert(css.includes('pointer-events:none;visibility:hidden;opacity:0;'));
assert(css.includes('.map-popup-micro{'));
assert(css.includes('prefers-reduced-transparency:reduce'));
assert(shared.includes("reserve('current-label',root.querySelector('.map-current-label'))"),'The fixed selected label must be reserved');
assert(shared.includes("reserve('current-icon',root.querySelector('.map-poi-dot.is-current'))"));
assert(shared.includes("interest==='strong'?25"),'Editorial interest only breaks ties within a category');
assert(shared.includes('mobile?5:10'));
assert(shared.includes('experience:{minZoom:13.2')&&shared.includes('food:{minZoom:14.1')&&shared.includes('hotel:{minZoom:14.8'),'Gradual disclosure');
assert(shared.includes("for(const event of ['load','moveend','zoomend','resize'])map.on(event,request)"));
assert(shared.includes("const openEntry=entries.find("));
assert(shared.includes("if(context==='detail'&&openEntry)continue"));
assert(shared.includes("label.textContent=String(name||'')"),'All label text must be safe');
assert(shared.includes("popup.on('open',()=>{element.classList.add('is-popup-open')"));
for(const file of htmlFiles)assert(fs.readFileSync(file,'utf8').includes('assets/map-shared.js?v='));
assert.equal((shared.match(/new maplibregl.Map\(/g)||[]).length,1,'Do not introduce extra map implementations');
assert(shared.includes('function createMapLabelController('));
assert(app.includes("createMapLabelController({map,root:routeMapRoot,context:'route'})"));
assert(app.includes("labels.register({marker,popup,element:el,kind:'routeStop'"));
assert(app.includes("labels.register({marker,popup,element:el,kind:'dayTrip'"));
for(const kind of ['experience','food','hotel','stations']){
 assert(app.includes("labels.register({marker,popup,element:el,kind:'"+kind+"'"));
}
assert(shared.includes("labels.register({marker,popup,element:el,kind:'stations'"));
assert(shared.includes("context==='detail'&&kind==='stations'"),'Detail maps retain the no-permanent-station-label choice');
assert(shared.includes("openEntry.element.classList.add('is-label-visible')"),'Selected label must override zoom/collisions');
assert(shared.includes('const limit=Math.max(0,(mobile?5:10)-selectedCount)'));
assert(css.includes('top:calc(100% + 5px)')&&css.includes('pointer-events:none;visibility:hidden;opacity:0'));
const dom={JapanState:{keys:{map:'test'},readJson:()=>({}),writeLocal:()=>{}},
 document:{createElement:tag=>({tag,className:'',textContent:'',style:{setProperty(){}},attrs:{},append(child){(this.children||=[]).push(child)},setAttribute(k,v){this.attrs[k]=v}})},
 destinationColor:()=> '#735436',escapeSiteHtml:s=>String(s),window:{dispatchEvent(){}},CustomEvent:class{}};
vm.runInNewContext(shared+';globalThis.domTest={appendMapMarkerLabel,mapRouteStopElement,JAPAN_MAP_LABEL_POLICY};',dom);
const holder={append(child){this.label=child}};
dom.domTest.appendMapMarkerLabel(holder,'Navn <b> og &');
assert.equal(holder.label.textContent,'Navn <b> og &','Name is inserted through textContent, never HTML');
const numbered=dom.domTest.mapRouteStopElement({}, {name:'Osaka'}, {number:6});
assert.equal(numbered.attrs['aria-label'],'Reiserutens stopp 6: Osaka');
assert.equal(numbered.children[0].textContent,'6');
const daytrip=dom.domTest.mapRouteStopElement({}, {name:'Nara'}, {dayTrip:true});
assert(daytrip.className.includes('daytrip'));
assert.equal(daytrip.children[0].textContent,'↗');
assert.equal(dom.domTest.JAPAN_MAP_LABEL_POLICY.routeStop.priority,600);
assert(dom.domTest.JAPAN_MAP_LABEL_POLICY.stations.minZoom>dom.domTest.JAPAN_MAP_LABEL_POLICY.hotel.minZoom);
console.log('PASS: common label engine, safe labels, route stops, type-based priority, popup-first navigation.');
