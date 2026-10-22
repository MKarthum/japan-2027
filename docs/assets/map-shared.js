// Shared, browser-local cartographic preferences. No user account or server writes.
const JAPAN_MAP_LAYER_KEY='japan-2027-map-layers-v1';
const JAPAN_MAP_LAYER_DEFAULTS=Object.freeze({experience:true,food:true,hotel:true,stations:true});
const JAPAN_MAP_LAYER_INFO=Object.freeze({
 experience:{label:'Opplevelser',symbol:'★'},
 food:{label:'Mat',symbol:'●'},
 hotel:{label:'Overnatting',symbol:'H'},
 stations:{label:'Knutepunkter',symbol:'●'}
});
function readMapLayers(){
 let stored={};try{stored=JSON.parse(localStorage.getItem(JAPAN_MAP_LAYER_KEY)||'{}')||{};}catch{}
 return Object.fromEntries(Object.entries(JAPAN_MAP_LAYER_DEFAULTS).map(([k,def])=>[k,typeof stored[k]==='boolean'?stored[k]:def]));
}
function storeMapLayers(state){
 try{localStorage.setItem(JAPAN_MAP_LAYER_KEY,JSON.stringify(Object.fromEntries(Object.keys(JAPAN_MAP_LAYER_DEFAULTS).map(k=>[k,!!state[k]]))));}catch{}
 window.dispatchEvent(new CustomEvent('japan-map-layers-change',{detail:readMapLayers()}));
}
function mapPoiElement(trip,subject,kind){
 const el=document.createElement('button');
 el.type='button';el.className=`map-poi-dot ${kind}`;
 el.style.setProperty('--area-color',destinationColor(trip,subject));
 el.textContent=JAPAN_MAP_LAYER_INFO[kind].symbol;
 el.setAttribute('aria-label',subject.name);
 return el;
}
function sharedMapPopupHtml(trip,meta,title,subject,href,label){
 const theme=subject?`destination-themed" style="${themeStyle(destinationTheme(trip,subject))}`:'';
 return `<div class="map-popup map-popup-selection ${theme}"><div class="meta">${escapeSiteHtml(meta)}</div><h3>${escapeSiteHtml(title)}</h3>${href?`<a href="${href}">${label||'Se detaljer'} →</a>`:`<a href="#route-detail">${label||'Se detaljer under kartet'} ↓</a>`}</div>`;
}
function mapLayerToggleHtml(counts,state){
 return `<span class="map-layer-title">Vis på kartet</span>${Object.entries(JAPAN_MAP_LAYER_INFO).map(([k,x])=>`<button type="button" class="map-layer-toggle ${k}" data-map-layer="${k}" aria-pressed="${String(state[k])}">${x.label} <b>${counts[k]||0}</b></button>`).join('')}<button type="button" class="map-layer-reset" data-map-reset="true" title="Slå på alle kartlag">Vis alle</button>`;
}
function wireMapLayerToolbar(toolbar,{counts,onToggle,state,extra=''}) {
 toolbar.innerHTML=mapLayerToggleHtml(counts,state)+extra;
 toolbar.addEventListener('click',e=>{
  const btn=e.target.closest('[data-map-layer]');
  if(btn){const key=btn.dataset.mapLayer;onToggle(key,!state[key]);return;}
  if(e.target.closest('[data-map-reset]'))Object.keys(JAPAN_MAP_LAYER_DEFAULTS).forEach(k=>onToggle(k,true));
 });
}
