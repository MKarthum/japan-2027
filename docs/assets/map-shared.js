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
 // One outline source drives both the SVG silhouette and its clipped glass.
 const outline=JAPAN_MAP_ICON_PATHS[kind].match(/<path class="map-symbol-surface" d="([^"]+)"/)?.[1];
 if(outline)el.style.setProperty('--map-glass-clip',`path("${outline}")`);
 el.innerHTML=mapSymbolHtml(kind);
 el.setAttribute('aria-label',`${JAPAN_MAP_LAYER_INFO[kind].label}: ${subject.name}`);
 el.title=`${JAPAN_MAP_LAYER_INFO[kind].label}: ${subject.name}`;
 return el;
}
function mapStationRole(transport,name){
 return transport?.stationRoles?.[name]||'intermediate';
}
function mapStationElement(name,colors=[],role='used'){
 const el=document.createElement('button');
 el.type='button';el.className=`map-station-dot ${['used','alternative','intermediate'].includes(role)?role:'intermediate'}`;
 const unique=[...new Set(colors.filter(Boolean))];
 if(unique.length===1)el.style.setProperty('--station-fill',unique[0]);
 if(unique.length>1){
  const arc=360/unique.length;
  el.style.setProperty('--station-fill',`conic-gradient(${unique.map((c,i)=>`${c} ${Math.round(i*arc)}deg ${Math.round((i+1)*arc)}deg`).join(',')})`);
 }
 el.innerHTML=mapSymbolHtml('stations');
 const roleText={used:'Planlagt knutepunkt',alternative:'Mulig alternativ',intermediate:'Stasjon underveis'}[role]||'Stasjon underveis';
 el.setAttribute('aria-label',`${roleText}: ${name}`);
 el.title=`${roleText}: ${name}`;
 return el;
}
function mapCurrentPlaceElement(trip,subject,kind='experience'){
 // Selected objects use their normal category silhouette: ring and label indicate selection.
 const el=mapPoiElement(trip,subject,kind);
 el.classList.add('is-current');
 el.innerHTML+=`<span class="map-current-label">${escapeSiteHtml(subject.name)}</span>`;
 el.setAttribute('aria-label',`Valgt på kartet · ${JAPAN_MAP_LAYER_INFO[kind].label}: ${subject.name}`);
 el.title=subject.name;
 return el;
}
function watchMapMarker(marker,popup){
 const el=marker.getElement();
 popup.on('open',()=>el.classList.add('is-selected'));
 popup.on('close',()=>el.classList.remove('is-selected'));
 return marker;
}
function mapMicroText(subject,kind){
 const raw=kind==='experience'?subject.description:subject.why||subject.description;
 const text=String(raw||'').replace(/\s+/g,' ').trim();
 if(!text)return '';
 const sentence=text.match(/^.{1,150}?[.!?](?=\s|$)/)?.[0];
 if(sentence)return sentence;
 if(text.length<=140)return text;
 return text.slice(0,140).replace(/\s+\S*$/,'').trimEnd()+'…';
}
function sharedMapPopupHtml(trip,meta,title,subject,href,label,micro=''){
 const theme=subject?`destination-themed" style="${themeStyle(destinationTheme(trip,subject))}`:'';
 return `<div class="map-popup map-popup-selection ${theme}"><div class="meta">${escapeSiteHtml(meta)}</div><h3>${escapeSiteHtml(title)}</h3>${micro?`<p class="map-popup-micro">${escapeSiteHtml(micro)}</p>`:''}${href?`<a href="${href}">${label||'Se detaljer'} →</a>`:`<a href="#route-detail">${label||'Se detaljer under kartet'} ↓</a>`}</div>`;
}
// Pure label collision selection, independent of the mapping library.
function mapLabelBoxesOverlap(a,b,gap=5){
 return a.left<b.right+gap && a.right+gap>b.left
  && a.top<b.bottom+gap && a.bottom+gap>b.top;
}
function mapSelectNonOverlappingLabels(candidates,obstacles,limit){
 const chosen=[],occupied=[...obstacles];
 for(const candidate of [...candidates].sort((a,b)=>b.priority-a.priority||a.centerDistance-b.centerDistance)){
  if(chosen.length>=limit)break;
  if(occupied.some(item=>item.owner!==candidate.owner&&mapLabelBoxesOverlap(candidate.box,item.box)))continue;
  chosen.push(candidate);
  occupied.push({owner:candidate.owner,box:candidate.box});
 }
 return chosen.map(item=>item.owner);
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



/* One controller for labels, priorities, zoom and collision across all maps. */
const JAPAN_MAP_LABEL_POLICY=Object.freeze({
 routeStop:{minZoom:8.8,priority:600},
 dayTrip:{minZoom:10.5,priority:500},
 experience:{minZoom:13.2,priority:300},
 food:{minZoom:14.1,priority:200},
 hotel:{minZoom:14.8,priority:100},
 stations:{minZoom:15.5,priority:50}
});
/* Separate icon visibility from text visibility: labels alone cannot declutter a map. */
const JAPAN_MAP_MARKER_MIN_ZOOM=Object.freeze({
 route:Object.freeze({routeStop:0,dayTrip:8.2,stations:10.1,experience:10.7,hotel:12,food:12.2}),
 detail:Object.freeze({routeStop:0,dayTrip:0,stations:12.5,experience:11.1,hotel:12,food:12})
});
function mapMarkerIsEligible({context,kind,zoom,compact=false,selected=false,clustered=false}){
 if(clustered)return false;
 if(selected)return true;
 const threshold=JAPAN_MAP_MARKER_MIN_ZOOM[context]?.[kind]??0;
 return zoom>=threshold+(compact&&threshold>0?.35:0);
}
/* Pure screen-space grouping prevents nearby route stops hiding each other on phones. */
function mapClusterNearbyPoints(points,minDistance=44){
 const groups=[];
 for(const point of points){
  const matches=groups.filter(group=>group.some(item=>Math.hypot(item.point.x-point.point.x,item.point.y-point.point.y)<minDistance));
  if(!matches.length){groups.push([point]);continue;}
  const primary=matches[0];
  primary.push(point);
  for(const group of matches.slice(1)){primary.push(...group);groups.splice(groups.indexOf(group),1);}
 }
 return groups;
}
function createMapRouteStopClusters({map,labels}){
 const stops=[],clusters=new Map();
 const register=(marker,number,name)=>{
  stops.push({marker,number,name,element:marker.getElement()});
 };
 const refresh=()=>{
  if(!stops.length)return;
  for(const stop of stops)stop.element.classList.remove('is-clustered');
  const eligible=stops.filter(stop=>stop.element.isConnected&&!stop.element.classList.contains('is-popup-open'));
  const minDistance=map.getContainer().clientWidth<540?48:42;
  const groups=mapClusterNearbyPoints(eligible.map(stop=>({...stop,point:map.project(stop.marker.getLngLat())})),minDistance);
  const current=new Set();
  for(const group of groups.filter(g=>g.length>1)){
   group.sort((a,b)=>a.number-b.number);
   const key=group.map(stop=>stop.number).join('-');
   current.add(key);
   for(const stop of group)stop.element.classList.add('is-clustered');
   let cluster=clusters.get(key);
   if(!cluster){
    const button=document.createElement('button');
    button.type='button';button.className='map-stop-cluster';
    cluster=new maplibregl.Marker({element:button,anchor:'center'});
    clusters.set(key,cluster);
   }
   const button=cluster.getElement();
   const names=group.map(stop=>stop.name).join(', ');
   button.textContent=group.length<=3?group.map(stop=>stop.number).join(' · '):group.length+' stopp';
   button.setAttribute('aria-label',group.length+' rutestopp samlet: '+names+'. Trykk for å zoome inn.');
   button.title=names+' · Zoom inn';
   button.onclick=()=>{
    const bounds=new maplibregl.LngLatBounds();
    for(const stop of group)bounds.extend(stop.marker.getLngLat());
    map.fitBounds(bounds,{padding:Math.max(35,Math.min(85,Math.round(map.getContainer().clientWidth*.13))),maxZoom:12,duration:450});
   };
   const lngs=group.map(stop=>stop.marker.getLngLat());
   cluster.setLngLat([lngs.reduce((n,p)=>n+p.lng,0)/lngs.length,lngs.reduce((n,p)=>n+p.lat,0)/lngs.length]).addTo(map);
  }
  for(const [key,marker] of clusters)if(!current.has(key)){marker.remove();clusters.delete(key);}
  labels.request();
 };
 for(const event of ['moveend','zoomend','resize'])map.on(event,refresh);
 return {register,refresh};
}
function installMapExpandControl(map,root){
 const button=document.createElement('button');
 button.type='button';button.className='map-expand-control';
 const update=()=>{
  const expanded=root.classList.contains('is-map-expanded');
  button.textContent=expanded?'↙ Mindre kart':'⤢ Større kart';
  button.setAttribute('aria-pressed',String(expanded));
  button.setAttribute('aria-label',expanded?'Vis vanlig kartstørrelse':'Utvid kartet');
 };
 button.addEventListener('click',()=>{
  root.classList.toggle('is-map-expanded');
  update();map.resize();
 });
 update();root.append(button);
 return button;
}
function appendMapMarkerLabel(element,name){
 const label=document.createElement('span');
 label.className='map-object-label';
 label.textContent=String(name||'');
 element.append(label);
 return label;
}
function mapRouteStopElement(trip,subject,{number,dayTrip=false}={}){
 const el=document.createElement('button');
 el.type='button';
 el.className=dayTrip?'map-stop daytrip destination-themed':'map-stop destination-themed';
 el.style.setProperty('--area-color',destinationColor(trip,subject));
 const pin=document.createElement('span');
 pin.className='map-pin';
 pin.textContent=dayTrip?'↗':String(number);
 if(dayTrip)pin.setAttribute('aria-hidden','true');
 el.append(pin);
 el.setAttribute('aria-label',dayTrip?'Dagstur: '+subject.name:'Reiserutens stopp '+number+': '+subject.name);
 el.title=(dayTrip?'Dagstur':'Stopp '+number)+' · '+subject.name;
 return el;
}
function createMapLabelController({map,root,context='detail'}){
 const entries=[];
 let pending=false;
 const request=()=>{
  if(pending)return;
  pending=true;
  requestAnimationFrame(refresh);
 };
 const refresh=()=>{
  pending=false;
  if(!root?.isConnected)return;
  const viewport=root.getBoundingClientRect();
  const mobile=root.clientWidth<540,zoom=map.getZoom(),obstacles=[];
  const reserve=(owner,element)=>{
   if(!element)return;
   const box=element.getBoundingClientRect();
   if(box.width&&box.height)obstacles.push({owner,box});
  };
  reserve('current-label',root.querySelector('.map-current-label'));
  reserve('current-icon',root.querySelector('.map-poi-dot.is-current'));
  for(const {marker,element,kind} of entries){
   element.classList.remove('is-label-visible');
   const eligible=mapMarkerIsEligible({context,kind,zoom,compact:mobile,
     selected:element.classList.contains('is-popup-open'),
     clustered:element.classList.contains('is-clustered')});
   element.style.display=eligible?'':'none';
   if(eligible&&element.isConnected&&marker.getElement().isConnected)reserve(element,element);
  }
  const inViewport=box=>box.left>=viewport.left+8&&box.right<=viewport.right-8
    &&box.top>=viewport.top+9&&box.bottom<=viewport.bottom-9;
  const openEntry=entries.find(({element})=>element.classList.contains('is-popup-open')&&element.isConnected&&element.style.display!=='none');
  let selectedCount=0;
  if(openEntry){
   const box=openEntry.label.getBoundingClientRect();
   // Selected labels always win, even below a zoom threshold or near other markers.
   if(box.width&&box.height){
    openEntry.element.classList.add('is-label-visible');
    obstacles.push({owner:openEntry.element,box});
    selectedCount=1;
   }
  }
  const candidates=[];
  for(const entry of entries){
   const {marker,element,label,kind,interest}=entry;
   if(entry===openEntry||!element.isConnected||!marker.getElement().isConnected||element.style.display==='none')continue;
   // Detail maps deliberately do not permanently label stations.
   if(context==='detail'&&kind==='stations')continue;
   if(context==='detail'&&openEntry)continue;
   const policy=JAPAN_MAP_LABEL_POLICY[kind];
   if(!policy||zoom<policy.minZoom)continue;
   const box=label.getBoundingClientRect();
   if(!box.width||!box.height||!inViewport(box))continue;
   const priority=policy.priority+(interest==='strong'?25:interest==='candidate'?12:0);
   const centerDistance=Math.hypot((box.left+box.right)/2-(viewport.left+viewport.width/2),
       (box.top+box.bottom)/2-(viewport.top+viewport.height/2));
   candidates.push({owner:element,box,priority,centerDistance});
  }
  const limit=Math.max(0,(mobile?5:10)-selectedCount);
  const visible=new Set(mapSelectNonOverlappingLabels(candidates,obstacles,limit));
  for(const {element} of entries)if(visible.has(element))element.classList.add('is-label-visible');
 };
 const register=({marker,popup,element=marker.getElement(),kind,name,interest}={})=>{
  if(!JAPAN_MAP_LABEL_POLICY[kind])throw new Error('Ukjent type for kartetikett: '+kind);
  const label=appendMapMarkerLabel(element,name);
  const entry={marker,popup,element,label,kind,interest};
  entries.push(entry);
  if(popup){
   popup.on('open',()=>{element.classList.add('is-popup-open');request()});
   popup.on('close',()=>{element.classList.remove('is-popup-open');request()});
  }
  element.addEventListener('focus',request);
  element.addEventListener('blur',request);
  request();
  return entry;
 };
 for(const event of ['load','moveend','zoomend','resize'])map.on(event,request);
 return {register,request,refresh};
}

// Single context-map implementation for place, restaurant and hotel detail pages.
// Canonical data is passed in; marker art, URL-local layer state and popups are shared.
function renderDetailContextMap({containerId,toolbarId,trip,current,currentKind,places,food,hotels,transport}){
 const root=document.getElementById(containerId),toolbar=document.getElementById(toolbarId);
 if(!root)return null;
 const valid=x=>Number.isFinite(x?.map?.lng)&&Number.isFinite(x?.map?.lat);
 const mapsHref=current.links?.googleMaps||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(current.name+' '+(current.area||'')+' Japan')}`;
 const fallback=(message)=>{
  root.innerHTML=`<div class="map-error"><strong>${escapeSiteHtml(message)}</strong><p><a href="${mapsHref}" target="_blank" rel="noopener">Åpne i Google Maps ↗</a></p></div>`;
 };
 if(!valid(current)){fallback('Ingen kartposisjon registrert for dette stedet.');return null;}
 if(typeof maplibregl==='undefined'){fallback('Kartet kunne ikke lastes.');return null;}
 const position=[current.map.lng,current.map.lat];
 let map;
 try{
  map=new maplibregl.Map({
   container:containerId,style:'https://tiles.openfreemap.org/styles/liberty',
   center:position,zoom:current.type==='base'||current.type==='dagstur'?11.5:13.5,
   attributionControl:true
  });
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-left');
  installMapExpandControl(map,root);
 }catch{fallback('Kartet kunne ikke startes.');return null;}
 // A city or day-trip area is not an exact physical attraction.
 // In this case the map is an overview, with no misleading arbitrary pin at its centre.
 if(!(currentKind==='experience'&&['base','dagstur'].includes(current.type))){
  const selected=mapCurrentPlaceElement(trip,current,currentKind);
  const selectedMeta=({experience:'Opplevelse',food:'Restaurant',hotel:'Overnatting'})[currentKind];
  const selectedPopup=new maplibregl.Popup({offset:18,maxWidth:'260px'}).setHTML(
   `<div class="map-popup map-popup-selection destination-themed" style="${themeStyle(destinationTheme(trip,current))}"><div class="meta">${selectedMeta} · ${escapeSiteHtml(current.area||'')}</div><h3>${escapeSiteHtml(current.name)}</h3></div>`
  );
  const currentMarker=new maplibregl.Marker({element:selected,anchor:'center'})
   .setLngLat(position).setPopup(selectedPopup);
  watchMapMarker(currentMarker,selectedPopup).addTo(map);
 }

 const state=readMapLayers();
 const groups={experience:[],food:[],hotel:[],stations:[]};
 const labels=createMapLabelController({map,root,context:'detail'});
 const add=(subject,kind,label,href)=>{
  if(!valid(subject)||(kind===currentKind&&subject.id===current.id))return;
  const el=mapPoiElement(trip,subject,kind);
  const popup=new maplibregl.Popup({offset:14,maxWidth:'260px'})
   .setHTML(sharedMapPopupHtml(trip,label,subject.name,subject,href,'Se detaljer',mapMicroText(subject,kind)));
  const marker=new maplibregl.Marker({element:el,anchor:'center'})
   .setLngLat([subject.map.lng,subject.map.lat]).setPopup(popup);
  watchMapMarker(marker,popup);
  labels.register({marker,popup,element:el,kind,name:subject.name,interest:subject.planInterest});
  groups[kind].push(marker);
  if(state[kind])marker.addTo(map);
 };
 for(const x of places){
  if(['base','dagstur'].includes(x.type))continue; // Regions belong to the numbered itinerary, not the POI category.
  add(x,'experience',`${x.type} · ${x.area}`,`place.html?id=${encodeURIComponent(x.id)}`);
 }
 for(const x of food)add(x,'food',`${x.role} · ${x.area}`,`restaurant.html?id=${encodeURIComponent(x.id)}`);
 for(const x of hotels)add(x,'hotel',`${x.tier} · ${x.area}`,`hotel.html?id=${encodeURIComponent(x.id)}`);

 const stationGroups=new Map();
 for(const leg of transport.legs||[])for(const station of leg.stations||[]){
  if(!Number.isFinite(station.lng)||!Number.isFinite(station.lat))continue;
  const key=[station.name,station.lng.toFixed(4),station.lat.toFixed(4)].join('|');
  if(!stationGroups.has(key))stationGroups.set(key,{station,colors:[]});
  stationGroups.get(key).colors.push(destinationColor(trip,leg.toRouteId));
 }
 for(const {station,colors} of stationGroups.values()){
  const el=mapStationElement(station.name,colors,mapStationRole(transport,station.name));
  const popup=new maplibregl.Popup({offset:14,maxWidth:'260px'})
   .setHTML(sharedMapPopupHtml(trip,'Knutepunkt',station.name,null,'transport-guide.html','Transport og pass'));
  const marker=new maplibregl.Marker({element:el,anchor:'center'})
   .setLngLat([station.lng,station.lat]).setPopup(popup);
  watchMapMarker(marker,popup);
  labels.register({marker,popup,element:el,kind:'stations',name:station.name});
  groups.stations.push(marker);
  if(state.stations)marker.addTo(map);
 }
 if(toolbar){
  const counts=Object.fromEntries(Object.entries(groups).map(([key,list])=>[key,list.length]));
  const toggle=(kind,on)=>{
   state[kind]=on;
   for(const marker of groups[kind]){if(on)marker.addTo(map);else marker.remove();}
   toolbar.querySelector(`[data-map-layer="${kind}"]`)?.setAttribute('aria-pressed',String(on));
   storeMapLayers(state);labels.request();
  };
  wireMapLayerToolbar(toolbar,{counts,state,onToggle:toggle,
   extra:'<button type="button" class="map-layer-fit" data-map-focus="true">Til stedet ◎</button>'
  });
  toolbar.querySelector('[data-map-focus]')?.addEventListener('click',()=>map.easeTo({center:position,zoom:13.5,duration:450}));
 }
 installMapLoadFallback(map,{
  onFatal:()=>{if(!root.querySelector('.map-error'))fallback('Kartet kunne ikke lastes.');},
  onReady:()=>{root.querySelector('.map-error')?.remove();labels.request()}
 });
 return map;
}
