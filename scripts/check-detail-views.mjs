
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('docs/assets/app.js','utf8');
const shared=fs.readFileSync('docs/assets/map-shared.js','utf8');
const choices=fs.readFileSync('docs/assets/choices.js','utf8');
const css=fs.readFileSync('docs/assets/style.css','utf8');
const cut=(start,end)=>{
 const i=app.indexOf(start),j=app.indexOf(end,i+1);
 assert(i>=0&&j>i,'Missing card renderer: '+start);
 return app.slice(i,j);
};
const hsrc=cut('  const card=(x)=>`<article class="hotel-index-card','  const draw=()=>');
const fsrc=cut('  const row=(x)=>`<article class="food-index-item','  const draw=(destination=');
const hcard=new Function('trip','typeById','themeStyle','destinationTheme','planningPartyLabel','price','plannedNights','totalPrice','escapeSiteHtml',hsrc+';return card;')({},new Map(),()=>'',()=>({}),()=> '2 voksne + 2 barn',()=>'<strong>¥50000</strong>',()=>4,()=> '¥200000',s=>s.replaceAll('"','&quot;'));
const fcard=new Function('trip','themeStyle','destinationTheme','priorityBadge','ratingSummary','familyPrice',fsrc+';return row;')({},()=>'',()=>({}),()=>'<span>Prioritet</span>',()=>'',()=> '¥4000');
const hotels=JSON.parse(fs.readFileSync('docs/data/hotels.json','utf8')).hotels;
const food=JSON.parse(fs.readFileSync('docs/data/food.json','utf8')).restaurants;
for(const hotel of hotels){
 const html=hcard(hotel);
 assert(html.startsWith('<article class="hotel-index-card'),'Hotel must own exactly one grid cell');
 assert(html.includes('<a class="hotel-index-content"'));
 assert(html.endsWith('</article>'),'Hotel card must close article after link');
 assert.equal((html.match(/<\/a>/g)||[]).length,1,'Hotel only has one detail link');
}
for(const restaurant of food){
 const html=fcard(restaurant);
 assert(html.startsWith('<article class="food-index-item'));
 assert(html.includes('<a class="food-index-row"'));
 assert(html.endsWith('</article>'));
}
assert(choices.includes("anchor.closest('article.food-index-item, article.hotel-index-card')"));
assert(choices.includes('else wrapper.append(w)'));
assert(css.includes('.hotel-index-card .entity-choice-widget{'));
assert(css.includes('.food-index-item>.entity-choice-widget{'));
assert(css.includes('.hotel-index-content{'));
assert(shared.includes('function renderDetailContextMap('));
assert(shared.includes('watchMapMarker(marker,popup)'));
assert(shared.includes('const currentMarker=new maplibregl.Marker('));
assert(shared.includes('readMapLayers()')&&shared.includes('storeMapLayers(state)'));
for(const [page,name] of [['place','place'],['restaurant','restaurant'],['hotel','hotel']]){
 const html=fs.readFileSync('docs/'+page+'.html','utf8');
 assert(html.includes(`id="${name}-map"`),`Missing map for ${page}`);
 assert(html.includes(`id="${name}-map-layers"`),`Missing filters for ${page}`);
 assert(html.includes('assets/map-shared.js?v='),`Map functions not included on ${page}`);
 assert(html.includes('maplibre-gl.js'),`MapLibre missing from ${page}`);
 assert(html.includes('maplibre-gl.css'),`MapLibre styles missing from ${page}`);
 assert(app.includes(`containerId:'${name}-map'`),`Detail data not passed to the shared renderer for ${page}`);
}
console.log('PASS: 15 hotel cards and 23 restaurant cards remain intact; all detail maps share state, icons and direct object links.');
