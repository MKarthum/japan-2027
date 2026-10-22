// Shared, browser-local cartographic preferences. No user account or server writes.
const JAPAN_MAP_LAYER_KEY=JapanState.keys.map;
const JAPAN_MAP_LAYER_DEFAULTS=Object.freeze({experience:true,food:true,hotel:true,stations:true});
const JAPAN_MAP_LAYER_INFO=Object.freeze({
 experience:{label:'Opplevelser'},
 food:{label:'Mat'},
 hotel:{label:'Overnatting'},
 stations:{label:'Knutepunkter'}
});
function readMapLayers(){
 let stored={};try{stored=JapanState.readJson(JAPAN_MAP_LAYER_KEY,{})||{};}catch{}
 return Object.fromEntries(Object.entries(JAPAN_MAP_LAYER_DEFAULTS).map(([k,def])=>[k,typeof stored[k]==='boolean'?stored[k]:def]));
}
function storeMapLayers(state){
 JapanState.writeLocal(JAPAN_MAP_LAYER_KEY,JSON.stringify(Object.fromEntries(Object.keys(JAPAN_MAP_LAYER_DEFAULTS).map(k=>[k,!!state[k]]))));
 window.dispatchEvent(new CustomEvent('japan-map-layers-change',{detail:readMapLayers()}));
}
const JAPAN_MAP_ICON_PATHS=Object.freeze({
 experience:`<path class="map-symbol-surface" d="M18 2.4 22.6 12.1 33.3 13.8 25.5 21.4 27.4 32.2 18 27.1 8.6 32.2 10.5 21.4 2.7 13.8 13.4 12.1Z"/>`,
 food:`<path class="map-symbol-surface" d="M11 3.9h14L33 18l-8 14.1H11L3 18Z"/><path class="map-symbol-detail" d="M12 11v6m3-6v6m-6-6v6m0 0q3 4 6 0m-3 2v7M24 11q-3 2-3 7v3h3v5"/>`,
 hotel:`<path class="map-symbol-surface" d="M4.8 15.3 18 4.2 31.2 15.3V31H4.8Z"/><path class="map-symbol-detail" d="M14.2 30v-10h7.6v10M9.7 17.4h3.2m10.2 0h3.2"/>`,
 stations:`<rect x="10.3" y="8.6" width="15.4" height="18.2" rx="3" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M11 19.1h14M14.5 13.4h7M14 27l-2 2m10-2 2 2" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/><circle cx="14.6" cy="23" r="1" fill="currentColor"/><circle cx="21.4" cy="23" r="1" fill="currentColor"/>`
});
function mapSymbolSvg(kind){
 if(!JAPAN_MAP_ICON_PATHS[kind])throw new Error(`Ukjent kartsymbol: ${kind}`);
 return `<svg class="map-category-icon" viewBox="0 0 36 36" aria-hidden="true" focusable="false">${JAPAN_MAP_ICON_PATHS[kind]}</svg>`;
}
function mapSymbolHtml(kind){
 return kind==='stations' ? `<span class="map-station-face">${mapSymbolSvg(kind)}</span>` : mapSymbolSvg(kind);
}
function mapPoiElement(trip,subject,kind){
 if(!['experience','food','hotel'].includes(kind))throw new Error(`Ukjent POI-type: ${kind}`);
 const el=document.createElement('button');
 el.type='button';el.className=`map-poi-dot ${kind}`;
 el.style.setProperty('--area-color',destinationColor(trip,subject));
 el.innerHTML=mapSymbolHtml(kind);
 el.setAttribute('aria-label',`${JAPAN_MAP_LAYER_INFO[kind].label}: ${subject.name}`);
 el.title=`${JAPAN_MAP_LAYER_INFO[kind].label}: ${subject.name}`;
 return el;
}
function mapStationElement(name,colors=[]){
 const el=document.createElement('button');
 el.type='button';el.className='map-station-dot';
 const unique=[...new Set(colors.filter(Boolean))];
 if(unique.length===1)el.style.setProperty('--station-fill',unique[0]);
 if(unique.length>1){
  const arc=360/unique.length;
  el.style.setProperty('--station-fill',`conic-gradient(${unique.map((c,i)=>`${c} ${Math.round(i*arc)}deg ${Math.round((i+1)*arc)}deg`).join(',')})`);
 }
 el.innerHTML=mapSymbolHtml('stations');
 el.setAttribute('aria-label',`Knutepunkt: ${name}`);
 el.title=`Knutepunkt: ${name}`;
 return el;
}
function mapCurrentPlaceElement(trip,subject){
 const el=document.createElement('button');
 el.type='button';el.className='place-detail-marker';
 el.style.setProperty('--area-color',destinationColor(trip,subject));
 el.innerHTML='<svg viewBox="0 0 36 36" aria-hidden="true" focusable="false"><circle cx="18" cy="18" r="13" fill="var(--area-color)" stroke="#fff" stroke-width="3"/><path d="M18 7v7m0 8v7M7 18h7m8 0h7" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><circle cx="18" cy="18" r="2.5" fill="#fff"/></svg>';
 el.setAttribute('aria-label',`Dette stedet: ${subject.name}`);
 return el;
}
function watchMapMarker(marker,popup){
 const el=marker.getElement();
 popup.on('open',()=>el.classList.add('is-selected'));
 popup.on('close',()=>el.classList.remove('is-selected'));
 return marker;
}
function sharedMapPopupHtml(trip,meta,title,subject,href,label){
 const theme=subject?`destination-themed" style="${themeStyle(destinationTheme(trip,subject))}`:'';
 return `<div class="map-popup map-popup-selection ${theme}"><div class="meta">${escapeSiteHtml(meta)}</div><h3>${escapeSiteHtml(title)}</h3>${href?`<a href="${href}">${label||'Se detaljer'} →</a>`:`<a href="#route-detail">${label||'Se detaljer under kartet'} ↓</a>`}</div>`;
}
function mapLayerToggleHtml(counts,state){
 return `<span class="map-layer-title" title="Farge viser reisebase, form viser type">Kartnøkkel</span>${Object.entries(JAPAN_MAP_LAYER_INFO).map(([k,x])=>`<button type="button" class="map-layer-toggle ${k}" data-map-layer="${k}" aria-pressed="${String(state[k])}">${mapSymbolHtml(k)}<span>${x.label}</span><b>${counts[k]||0}</b></button>`).join('')}<button type="button" class="map-layer-reset" data-map-reset="true" title="Slå på alle kartlag">Vis alle</button>`;
}
function wireMapLayerToolbar(toolbar,{counts,onToggle,state,extra=''}) {
 toolbar.innerHTML=mapLayerToggleHtml(counts,state)+extra;
 toolbar.addEventListener('click',e=>{
  const btn=e.target.closest('[data-map-layer]');
  if(btn){const key=btn.dataset.mapLayer;onToggle(key,!state[key]);return;}
  if(e.target.closest('[data-map-reset]'))Object.keys(JAPAN_MAP_LAYER_DEFAULTS).forEach(k=>onToggle(k,true));
 });
}
