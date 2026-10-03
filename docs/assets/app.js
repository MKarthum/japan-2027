const fmtDate = (iso) => new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));
const fmtNok = (n) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits:0 }).format(Math.round(n)) + ' kr';
const fmtJpy = (n) => '¥' + new Intl.NumberFormat('nb-NO', { maximumFractionDigits:0 }).format(Math.round(n));
const nokFromJpy = (jpy,fx) => jpy * fx.nokPerJpy;
const jpyFromNok = (nok,fx) => nok / fx.nokPerJpy;
const dualFromJpy = (jpy,fx) => `${fmtJpy(jpy)} · ca. ${fmtNok(nokFromJpy(jpy,fx))}`;
const dualFromNok = (nok,fx) => `${fmtNok(nok)} · ca. ${fmtJpy(jpyFromNok(nok,fx))}`;
const dualRangeFromNok = (range,fx) => `${fmtNok(range[0])}–${fmtNok(range[1])} · ca. ${fmtJpy(jpyFromNok(range[0],fx))}–${fmtJpy(jpyFromNok(range[1],fx))}`;
const dualMoneyHtml = (primary,secondary) => `<span class="money-dual"><span>${primary}</span><small>ca. ${secondary}</small></span>`;

async function json(path) {
  const r = await fetch(path, {cache:'no-store'});
  if (!r.ok) throw new Error(`Kunne ikke hente ${path}`);
  return r.json();
}

function nav(active='') {
  const items = [
    ['index.html','Oversikt','home'],
    ['route.html','Rute','route'],
    ['places.html','Steder','places'],
    ['food.html','Mat','food'],
    ['prep.html','Før turen','prep'],
    ['practical.html','Praktisk','practical'],
    ['budget.html','Budsjett','budget']
  ];
  document.querySelector('header').innerHTML = `<div class="nav"><a class="brand" href="index.html"><span class="brand-mark">日</span> Japan 2027</a><nav>${items.map(([href,label,key])=>`<a href="${href}" ${active===key?'aria-current="page"':''}>${label}</a>`).join('')}</nav></div>`;
}

function footer() {
  document.querySelector('footer').innerHTML = `<div class="inner"><div><strong>Japan 2027</strong><br><span class="small">Offentlig planleggingsside. Ingen private booking- eller personopplysninger.</span><br><span id="site-version" class="small">Versjon …</span></div><div class="footer-links"><a href="sources.html">Kilder</a><a href="privacy.html">Personvern</a><a href="https://github.com/MKarthum/japan-2027">GitHub</a></div></div>`;
  Promise.all([
    fetch('data/site.json', {cache:'no-store'}).then(r=>r.ok?r.json():null),
    fetch('data/fx.json', {cache:'no-store'}).then(r=>r.ok?r.json():null)
  ]).then(([v,fx])=>{
    if(v) document.getElementById('site-version').textContent = `Versjon ${v.version} · ${v.released}`;
    if(fx){
      const note=document.createElement('span');
      note.className='small footer-fx';
      note.textContent=`Valutakurs ${fx.asOf}: ${fmtJpy(1000)} ≈ ${fmtNok(1000*fx.nokPerJpy)}`;
      document.getElementById('site-version')?.after(document.createElement('br'),note);
    }
  }).catch(()=>{});
}

const linkButton = (x) => `<a class="button ${x.kind==='ticket'?'primary':''}" href="${x.url}" target="_blank" rel="noopener">${x.label} ↗</a>`;
const mapsButton = (name, area='Japan') => `<a class="button" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+' '+area+' Japan')}" target="_blank" rel="noopener">Kart ↗</a>`;

function photo(guide, key, alt, cls='card-photo') {
  const img=guide.images[key];
  if (!img) return '';
  return `<figure class="${cls}"><img src="${img.url}" alt="${alt}" loading="lazy"><figcaption>Foto: <a href="${img.source}" target="_blank" rel="noopener">${img.credit}</a> · ${img.license}</figcaption></figure>`;
}

function areaImageKey(guide, place) {
  return guide.placeExtras[place.id]?.image ||
    ({Tokyo:'tokyo','Hakone / Fuji':'hakone',Kyoto:'kyoto',Nara:'nara',Himeji:'himeji',Hiroshima:'hiroshima',Miyajima:'hiroshima',Osaka:'osaka'})[place.area] ||
    ({tokyo:'tokyo',hakone:'hakone',kyoto:'kyoto',himeji:'himeji',hiroshima:'hiroshima',osaka:'osaka'})[place.id];
}

function priorityBadge(priority){
  const cls = priority==='Må prøve' || priority==='Viktig' ? 'must' : priority==='Sterk kandidat' || priority==='Bør bestilles' ? 'strong' : 'optional';
  return `<span class="priority ${cls}">${priority}</span>`;
}

async function renderHome() {
  nav('home'); footer();
  const [trip,places,guide,fx] = await Promise.all([json('data/trip.json'),json('data/places.json'),json('data/guide.json'),json('data/fx.json?v=0.8.0')]);
  document.getElementById('status').textContent = trip.status;
  document.getElementById('window').textContent = trip.window;
  document.getElementById('budget').innerHTML = dualMoneyHtml(fmtNok(trip.budget.targetNok),fmtJpy(jpyFromNok(trip.budget.targetNok,fx)));

  const hero = guide.images.himeji;
  document.getElementById('hero-photo').innerHTML = `<img src="${hero.url}" alt="Himeji Castle med kirsebærblomstring"><div class="photo-overlay"><span>LEGO → spill → virkelighet</span><strong>Himeji Castle</strong></div><div class="photo-credit">Foto: <a href="${hero.source}" target="_blank" rel="noopener">${hero.credit}</a> · ${hero.license}</div>`;

  const route = document.getElementById('route-cards');
  route.innerHTML = trip.route.filter(x=>x.nights>0).map(x=>{
    const p=places.find(p=>p.id===x.id)||x;
    const key=areaImageKey(guide,p);
    const img=guide.images[key];
    return `<article class="visual-card"><a href="place.html?id=${x.id}">${img?`<img src="${img.url}" alt="${x.name}" loading="lazy">`:''}<div class="visual-card-body"><div class="meta">${x.label}</div><h3>${x.name}</h3><p>${x.summary}</p><strong>${x.nights} ${x.nights===1?'natt':'netter'} →</strong></div></a></article>`;
  }).join('');

  const featureIds=['nintendo-museum','nara','himeji','usj'];
  document.getElementById('family-hooks').innerHTML = featureIds.map(id=>{
    const p=places.find(x=>x.id===id); const key=areaImageKey(guide,p); const img=guide.images[key];
    return `<article class="visual-card compact"><a href="place.html?id=${p.id}">${img?`<img src="${img.url}" alt="${p.name}" loading="lazy">`:''}<div class="visual-card-body"><div class="meta">${p.area}</div><h3>${p.name}</h3><p>${p.simple}</p></div></a></article>`;
  }).join('');

  document.getElementById('booking-preview').innerHTML = guide.bookingRadar.slice(0,3).map(x=>`<article class="booking-row">${priorityBadge(x.priority)}<div><strong>${x.title}</strong><span>${x.when}</span></div><a href="${x.url}" target="_blank" rel="noopener">Offisiell side ↗</a></article>`).join('');
}

async function renderRoute() {
  nav('route'); footer();
  const [trip,places,guide,routeGeometry,transport,food,fx]=await Promise.all([
    json('data/trip.json'),
    json('data/places.json'),
    json('data/guide.json'),
    json('data/route-geometry.json?v=0.8.0'),
    json('data/transport.json?v=0.8.0'),
    json('data/food.json'),
    json('data/fx.json?v=0.8.0')
  ]);

  const formatMinutes = (mins) => {
    if (mins < 60) return `${mins} min`;
    const h=Math.floor(mins/60), m=mins%60;
    return m ? `${h} t ${m} min` : `${h} t`;
  };
  const legById=new Map(transport.legs.map(x=>[x.id,x]));
  const nextLegByRouteId=new Map(transport.legs.map(x=>[x.fromRouteId,x]));

  const fareHtml=(leg) => `
    <div class="fare-grid">
      <div><span>Voksen</span><strong>${dualFromJpy(leg.fare.adultYen,fx)}</strong></div>
      <div><span>Barn</span><strong>${dualFromJpy(leg.fare.childYen,fx)}</strong></div>
      <div class="family"><span>2 voksne + 2 barn</span><strong>${dualFromJpy(leg.fare.family2a2cYen,fx)}</strong></div>
    </div>`;

  const legHtml=(leg,{compact=false}={}) => `
    <div class="route-detail-content">
      <div class="meta">Reiseetappe · planestimat 2026</div>
      <h3>${leg.from} → ${leg.to}</h3>
      <p class="route-service">${leg.service} · ca. <strong>${formatMinutes(leg.durationMin)}</strong></p>
      ${fareHtml(leg)}
      ${compact?'':`<p class="small">Prisene er representative dagenspriser og må sjekkes igjen for 2027. Barnepris gjelder bare når den reisende kvalifiserer etter operatørens regler.</p>`}
      <a class="route-source-link" href="${leg.source}" target="_blank" rel="noopener">Pris-/rutegrunnlag ↗</a>
    </div>`;

  const detail=document.getElementById('route-detail');
  const showLegDetail=(leg) => {
    if(!detail || !leg) return;
    detail.hidden=false;
    detail.innerHTML=legHtml(leg);
  };

  document.getElementById('window').textContent = trip.window;
  document.getElementById('route-list').innerHTML = trip.route.map(x=>{
    const p=places.find(p=>p.id===x.id)||x; const img=guide.images[areaImageKey(guide,p)];
    const leg=nextLegByRouteId.get(x.id);
    return `<div class="route-item">${img?`<img class="route-thumb" src="${img.url}" alt="" loading="lazy">`:''}<div class="date">${fmtDate(x.from)}${x.to!==x.from?` – ${fmtDate(x.to)}`:''}</div><div><a href="place.html?id=${x.id}"><strong>${x.name}</strong></a><div class="small">${x.label} · ${x.summary}</div>${leg?`<button class="route-inline-info" data-leg="${leg.id}">Neste etappe: ${formatMinutes(leg.durationMin)} · ${dualFromJpy(leg.fare.family2a2cYen,fx)} for 2V+2B</button>`:''}</div><div class="nights">${x.nights===0?'Stopp':`${x.nights} ${x.nights===1?'natt':'netter'}`}</div></div>`;
  }).join('');
  document.getElementById('route-list').addEventListener('click',e=>{
    const btn=e.target.closest('[data-leg]');
    if(btn) showLegDetail(legById.get(btn.dataset.leg));
  });

  const adultTotal=transport.legs.reduce((n,l)=>n+l.fare.adultYen,0);
  const childTotal=transport.legs.reduce((n,l)=>n+l.fare.childYen,0);
  const familyTotal=transport.legs.reduce((n,l)=>n+l.fare.family2a2cYen,0);
  const summary=document.getElementById('map-price-summary');
  if(summary){
    summary.innerHTML=`<span>Etappene på kartet</span><strong>${dualFromJpy(familyTotal,fx)} for 2V+2B</strong><small>Voksen én vei summert: ${dualFromJpy(adultTotal,fx)} · Barn: ${dualFromJpy(childTotal,fx)} · ekskl. lokaltransport/dagsturer</small>`;
  }

  if (typeof maplibregl === 'undefined') {
    document.getElementById('map').innerHTML = '<div class="map-error"><strong>Kartet kunne ikke lastes.</strong><br>MapLibre-biblioteket mangler. Oppdater siden eller prøv igjen senere.</div>';
    return;
  }

  const map = new maplibregl.Map({
    container:'map',
    style:'https://tiles.openfreemap.org/styles/liberty',
    center:[137.1,35.15],
    zoom:5.2,
    attributionControl:true
  });
  map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-left');

  let userMarker=null;
  let userLngLat=null;
  let userWatchId=null;
  let focusLocationWhenReady=false;

  const locationButton=()=>document.getElementById('my-location');
  const setLocationButtonState=(label,{disabled=false,title=''}={})=>{
    const btn=locationButton();
    if(!btn) return;
    btn.textContent=label;
    btn.disabled=disabled;
    btn.title=title;
  };
  const focusUserLocation=()=>{
    if(userLngLat){
      map.easeTo({center:userLngLat,zoom:12.5,duration:650});
      return;
    }
    focusLocationWhenReady=true;
    setLocationButtonState('Finner posisjon …',{disabled:true});
    startLocationWatch();
  };
  const updateUserLocation=(position)=>{
    const {longitude,latitude,accuracy}=position.coords;
    userLngLat=[longitude,latitude];
    const accuracyText=Number.isFinite(accuracy) ? `Nøyaktighet ca. ${Math.max(1,Math.round(accuracy))} m.` : '';
    const popup=new maplibregl.Popup({offset:16,maxWidth:'280px'}).setHTML(
      `<div class="map-popup"><div class="meta">Live i nettleseren</div><h3>Min posisjon</h3><p class="small">${accuracyText} Posisjonen lagres ikke i reiseplanen.</p></div>`
    );
    if(!userMarker){
      const el=document.createElement('button');
      el.type='button';
      el.className='map-user-location';
      el.setAttribute('aria-label','Min posisjon');
      el.innerHTML='<span class="map-user-pulse"></span><span class="map-user-dot"></span>';
      userMarker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(userLngLat).setPopup(popup).addTo(map);
    } else {
      userMarker.setLngLat(userLngLat).setPopup(popup);
    }
    setLocationButtonState('◎ Min posisjon',{title:'Zoom inn til min posisjon'});
    if(focusLocationWhenReady){
      focusLocationWhenReady=false;
      map.easeTo({center:userLngLat,zoom:12.5,duration:650});
    }
  };
  const handleLocationError=(error)=>{
    focusLocationWhenReady=false;
    const denied=error?.code===1;
    setLocationButtonState(denied?'Posisjon ikke tillatt':'Prøv min posisjon',{
      title:denied?'Tillat posisjon for denne nettsiden i nettleseren for å vise hvor du er.':'Kunne ikke hente posisjonen akkurat nå.'
    });
    if(denied && userWatchId!==null){
      navigator.geolocation.clearWatch(userWatchId);
      userWatchId=null;
    }
  };
  function startLocationWatch(){
    if(!navigator.geolocation){
      setLocationButtonState('Posisjon ikke støttet',{disabled:true,title:'Denne nettleseren støtter ikke posisjonering.'});
      return;
    }
    if(userWatchId!==null) return;
    userWatchId=navigator.geolocation.watchPosition(
      updateUserLocation,
      handleLocationError,
      {enableHighAccuracy:true,maximumAge:15000,timeout:12000}
    );
  }

  const routeBounds = new maplibregl.LngLatBounds();
  for(const part of routeGeometry.parts){
    for(const coord of part.coords) routeBounds.extend(coord);
  }
  for(const x of trip.dayTrips) routeBounds.extend([x.lng,x.lat]);
  const fitRoute=()=>map.fitBounds(routeBounds,{padding:{top:55,right:80,bottom:55,left:55},maxZoom:7,duration:500});

  const popupForLeg=(leg,lngLat) => {
    showLegDetail(leg);
    new maplibregl.Popup({offset:10,maxWidth:'330px'})
      .setLngLat(lngLat)
      .setHTML(legHtml(leg,{compact:true}))
      .addTo(map);
  };

  const addRoutePart = (segment,index) => {
    const sourceId=`journey-${index}`;
    const leg=legById.get(segment.journeyId);
    map.addSource(sourceId,{type:'geojson',data:{
      type:'Feature',
      properties:{journeyId:segment.journeyId,name:segment.name,mode:segment.mode},
      geometry:{type:'LineString',coordinates:segment.coords}
    }});
    map.addLayer({
      id:`${sourceId}-casing`,type:'line',source:sourceId,
      layout:{'line-join':'round','line-cap':'round'},
      paint:{'line-color':'rgba(255,255,255,.94)','line-width':9,'line-offset':segment.offset||0}
    });
    map.addLayer({
      id:`${sourceId}-line`,type:'line',source:sourceId,
      layout:{'line-join':'round','line-cap':'round'},
      paint:{'line-color':segment.color,'line-width':5,'line-opacity':.95,'line-offset':segment.offset||0}
    });
    map.addLayer({
      id:`${sourceId}-hit`,type:'line',source:sourceId,
      layout:{'line-join':'round','line-cap':'round'},
      paint:{'line-color':'rgba(0,0,0,0)','line-width':18,'line-offset':segment.offset||0}
    });
    map.addLayer({
      id:`${sourceId}-arrows`,type:'symbol',source:sourceId,
      layout:{'symbol-placement':'line','symbol-spacing':95,'text-field':'›','text-size':18,'text-rotation-alignment':'map','text-keep-upright':false,'text-allow-overlap':true},
      paint:{'text-color':segment.color,'text-halo-color':'#fff','text-halo-width':1.2}
    });
    map.on('click',`${sourceId}-hit`,e=>{ if(leg) popupForLeg(leg,e.lngLat); });
    map.on('mouseenter',`${sourceId}-hit`,()=>map.getCanvas().style.cursor='pointer');
    map.on('mouseleave',`${sourceId}-hit`,()=>map.getCanvas().style.cursor='');
  };

  const markerGroups={stations:[],experience:[],food:[]};
  const layerState={stations:true,experience:true,food:false};
  const mappablePlaces=places.filter(p=>p.map?.showOnRouteMap!==false && Number.isFinite(p.map?.lat) && Number.isFinite(p.map?.lng));
  const mappableFood=food.filter(x=>x.status==='active' && x.map?.showOnRouteMap!==false && Number.isFinite(x.map?.lat) && Number.isFinite(x.map?.lng));

  const setMarkerVisibility=(category,on)=>{
    layerState[category]=on;
    for(const marker of markerGroups[category]||[]){
      if(on) marker.addTo(map); else marker.remove();
    }
    const btn=document.querySelector(`[data-map-layer="${category}"]`);
    if(btn) btn.setAttribute('aria-pressed',String(on));
  };

  const addStationMarkers=()=>{
    const grouped=new Map();
    for(const leg of transport.legs){
      for(const s of leg.stations){
        const key=`${s.name}|${s.lng.toFixed(4)}|${s.lat.toFixed(4)}`;
        if(!grouped.has(key)) grouped.set(key,{...s,memberships:[]});
        grouped.get(key).memberships.push({leg,elapsedMin:s.elapsedMin,note:s.note});
      }
    }
    for(const s of grouped.values()){
      const el=document.createElement('button');
      el.type='button';
      el.className='map-station-dot';
      el.setAttribute('aria-label',`${s.name} stasjon`);
      const rows=s.memberships.map(m=>`<div class="station-time"><span>Fra ${m.leg.from}</span><strong>ca. ${formatMinutes(m.elapsedMin)}</strong></div>`).join('');
      const services=[...new Set(s.memberships.map(m=>m.leg.service))].join(' / ');
      const popup=new maplibregl.Popup({offset:12,maxWidth:'300px'}).setHTML(`
        <div class="map-popup"><div class="meta">Stasjon</div><h3>${s.name}</h3>${rows}<p class="small">${services}</p></div>`);
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([s.lng,s.lat]).setPopup(popup);
      markerGroups.stations.push(marker);
      if(layerState.stations) marker.addTo(map);
    }
  };

  const categoryMeta={
    experience:{label:'Opplevelser',symbol:'★'},
    food:{label:'Mat',symbol:'●'}
  };

  const familyFoodPrice=(x)=>{
    if(!Array.isArray(x.familyEstimateYen)) return '';
    const [lo,hi]=x.familyEstimateYen;
    return lo===hi ? dualFromJpy(lo,fx) : `${fmtJpy(lo)}–${fmtJpy(hi)} · ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))}`;
  };

  const addPoiMarkers=()=>{
    for(const p of mappablePlaces){
      const el=document.createElement('button');
      el.type='button';
      el.className='map-poi-dot experience';
      el.textContent=categoryMeta.experience.symbol;
      el.setAttribute('aria-label',p.name);
      const popup=new maplibregl.Popup({offset:14,maxWidth:'310px'}).setHTML(`
        <div class="map-popup">
          <div class="meta">${p.type} · ${p.area}</div>
          <h3>${p.name}</h3>
          <p><strong>${p.simple}</strong></p>
          <p class="small">${p.why}</p>
          <a href="place.html?id=${encodeURIComponent(p.id)}">Se stedet →</a>
        </div>`);
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([p.map.lng,p.map.lat]).setPopup(popup);
      markerGroups.experience.push(marker);
      if(layerState.experience) marker.addTo(map);
    }

    for(const x of mappableFood){
      const el=document.createElement('button');
      el.type='button';
      el.className='map-poi-dot food';
      el.textContent=categoryMeta.food.symbol;
      el.setAttribute('aria-label',x.name);
      const family=familyFoodPrice(x);
      const popup=new maplibregl.Popup({offset:14,maxWidth:'330px'}).setHTML(`
        <div class="map-popup">
          <div class="meta">${x.role} · ${x.area}</div>
          <h3>${x.name}</h3>
          <p><strong>${x.dish}</strong> · ${x.priority}</p>
          <p class="small">${x.why}</p>
          ${family?`<p class="map-food-price"><span>2 voksne + 2 barn</span><strong>${family}</strong></p>`:''}
          <a href="restaurant.html?id=${encodeURIComponent(x.id)}">Se restaurantdetaljer →</a>
        </div>`);
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([x.map.lng,x.map.lat]).setPopup(popup);
      markerGroups.food.push(marker);
      if(layerState.food) marker.addTo(map);
    }
  };

  const renderLayerToolbar=()=>{
    const toolbar=document.getElementById('map-layers');
    if(!toolbar) return;
    const counts={
      stations:new Set(transport.legs.flatMap(l=>l.stations.map(s=>s.name))).size,
      experience:mappablePlaces.length,
      food:mappableFood.length
    };
    toolbar.innerHTML=`
      <span class="map-layer-title">Vis på kartet</span>
      <button class="map-layer-toggle stations" data-map-layer="stations" aria-pressed="true">Stasjoner <b>${counts.stations}</b></button>
      <button class="map-layer-toggle experience" data-map-layer="experience" aria-pressed="true">Opplevelser <b>${counts.experience}</b></button>
      <button class="map-layer-toggle food" data-map-layer="food" aria-pressed="false">Mat <b>${counts.food}</b></button>
      <button class="map-layer-fit" id="fit-route" type="button">Vis hele ruten</button>
      <button class="map-layer-location" id="my-location" type="button" title="Zoom inn til min posisjon">◎ Min posisjon</button>`;
    toolbar.addEventListener('click',e=>{
      const btn=e.target.closest('[data-map-layer]');
      if(btn && !btn.disabled){
        const category=btn.dataset.mapLayer;
        setMarkerVisibility(category,!layerState[category]);
      }
    });
    document.getElementById('fit-route')?.addEventListener('click',fitRoute);
    document.getElementById('my-location')?.addEventListener('click',focusUserLocation);
  };

  map.on('load', ()=>{
    const style = map.getStyle();
    const preferredName=['coalesce',['get','name:nb'],['get','name:en'],['get','name_en'],['get','name:latin'],['get','name']];
    const usesNameField=(value)=>{
      if(typeof value==='string') return /name(?::[a-z-]+|_[a-z]+)?|\\{name/.test(value);
      if(!Array.isArray(value)) return false;
      return value.some(usesNameField);
    };
    for(const layer of (style.layers||[])){
      const textField=layer?.layout?.['text-field'];
      if(layer.type==='symbol' && textField && usesNameField(textField)){
        map.setLayoutProperty(layer.id,'visibility','visible');
        map.setLayoutProperty(layer.id,'text-field',preferredName);
      }
    }

    routeGeometry.parts.forEach(addRoutePart);

    const journeyMap=new Map();
    for(const part of routeGeometry.parts){
      if(!journeyMap.has(part.journeyId)) journeyMap.set(part.journeyId,{...part,modes:[]});
      const j=journeyMap.get(part.journeyId);
      if(!j.modes.includes(part.mode)) j.modes.push(part.mode);
    }
    const legend=document.getElementById('route-legend');
    if(legend){
      legend.innerHTML=[...journeyMap.values()].map(s=>{
        const leg=legById.get(s.journeyId);
        return `<button class="route-legend-item" type="button" data-leg="${s.journeyId}"><i style="background:${s.color}"></i><span><strong>${s.name}</strong><small>${leg?`ca. ${formatMinutes(leg.durationMin)} · ${dualFromJpy(leg.fare.family2a2cYen,fx)} (2V+2B)`:s.modes.join(' + ')}</small></span></button>`;
      }).join('');
      legend.addEventListener('click',e=>{
        const btn=e.target.closest('[data-leg]');
        if(btn) showLegDetail(legById.get(btn.dataset.leg));
      });
    }

    trip.route.forEach((x,i)=>{
      const el=document.createElement('button');
      el.type='button';
      el.className='map-stop';
      el.setAttribute('aria-label',`${i+1}. ${x.name}`);
      el.innerHTML=`<span class="map-pin">${i+1}</span><span class="map-place-label">${x.name}</span>`;
      const anchor=routeGeometry.stops?.[x.id]||[x.lng,x.lat];
      const nextLeg=nextLegByRouteId.get(x.id);
      const popupHtml=`<div class="map-popup"><div class="meta">Stopp ${i+1}</div><h3>${x.name}</h3><p>${x.label} · ${fmtDate(x.from)}</p>${nextLeg?legHtml(nextLeg,{compact:true}):'<p><strong>Siste hovedstopp på ruten.</strong></p>'}</div>`;
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(anchor).setPopup(new maplibregl.Popup({offset:24,maxWidth:'340px'}).setHTML(popupHtml)).addTo(map);
      if(nextLeg) el.addEventListener('click',()=>showLegDetail(nextLeg));
    });

    trip.dayTrips.forEach(x=>{
      const el=document.createElement('button');
      el.type='button';
      el.className='map-stop daytrip';
      el.setAttribute('aria-label',x.name);
      el.innerHTML=`<span class="map-pin"></span><span class="map-place-label">${x.name}</span>`;
      new maplibregl.Marker({element:el,anchor:'center'})
        .setLngLat([x.lng,x.lat])
        .setPopup(new maplibregl.Popup({offset:18}).setHTML(`<div class="map-popup"><div class="meta">Dagstur fra ${x.base}</div><h3>${x.name}</h3><p>${x.summary}</p><a href="place.html?id=${x.id}">Se stedet →</a></div>`))
        .addTo(map);
    });

    addStationMarkers();
    addPoiMarkers();
    renderLayerToolbar();
    fitRoute();
    startLocationWatch();
  });

  detail.hidden=false;
  detail.innerHTML=`<div class="route-detail-placeholder"><strong>Trykk på en rutelinje, et rutenummer eller en etappe under kartet.</strong><span>Da vises estimert reisetid og pris for voksen, barn og 2 voksne + 2 barn.</span><small>${transport.childNote}</small></div>`;

  let firstMapErrorShown=false;
  map.on('error',(event)=>{
    console.warn('Kartfeil',event?.error||event);
    if(!firstMapErrorShown && !map.loaded()){
      firstMapErrorShown=true;
      const el=document.createElement('div');
      el.className='map-error floating';
      el.innerHTML='<strong>Kartdata kunne ikke lastes.</strong><br>Prøv å oppdatere siden.';
      document.getElementById('map').appendChild(el);
    }
  });
}

async function renderPlaces() {
  nav('places'); footer();
  const [places,guide] = await Promise.all([json('data/places.json'),json('data/guide.json')]);
  const areas = ['Alle', ...new Set(places.map(p=>p.area))];
  const filters = document.getElementById('filters');
  filters.innerHTML = areas.map((a,i)=>`<button class="${i===0?'active':''}" data-area="${a}">${a}</button>`).join('');
  const grid = document.getElementById('places-grid');
  const draw = (area='Alle') => {
    grid.innerHTML = places.filter(p=>area==='Alle'||p.area===area).map(p=>{
      const img=guide.images[areaImageKey(guide,p)];
      return `<article class="visual-card place-card"><a href="place.html?id=${p.id}">${img?`<div class="place-media"><img src="${img.url}" alt="${p.name}" loading="lazy"><div class="place-taxonomy"><span class="area-pill">${p.area}</span><span class="type-pill">${p.type}</span></div></div>`:''}<div class="visual-card-body"><h3>${p.name}</h3><div class="kicker">${p.simple}</div><p>${p.description}</p><div class="chips">${p.acShadows?'<span class="badge">AC Shadows</span>':''}${['nintendo-museum','ghibli-museum','teamlab','usj'].includes(p.id)?'<span class="badge">Ekstra kandidat</span>':''}</div></div></a></article>`;
    }).join('');
  };
  filters.addEventListener('click',e=>{ if(e.target.tagName!=='BUTTON') return; [...filters.children].forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); draw(e.target.dataset.area); });
  draw();
}

async function renderPlace() {
  nav('places'); footer();
  const [places,guide,food] = await Promise.all([json('data/places.json'),json('data/guide.json'),json('data/food.json')]);
  const id = new URLSearchParams(location.search).get('id');
  const p = places.find(x=>x.id===id) || places[0];
  const extra=guide.placeExtras[p.id]||{};
  const img=guide.images[areaImageKey(guide,p)];
  document.title = `${p.name} · Japan 2027`;
  document.getElementById('area').textContent = `${p.area} · ${p.type}`;
  document.getElementById('name').textContent = p.name;
  document.getElementById('simple').textContent = p.simple;
  document.getElementById('description').textContent = p.description;
  document.getElementById('why').textContent = p.why;
  document.getElementById('highlights').innerHTML = p.highlights.map(x=>`<li>${x}</li>`).join('');
  document.getElementById('prep').innerHTML = p.prep.length ? p.prep.map(x=>`<li>${x}</li>`).join('') : '<li>Ingen spesifikk oppladning lagt inn ennå.</li>';
  document.getElementById('ac').innerHTML = p.acShadows ? '<span class="badge accent">Finnes / er relevant i Assassin’s Creed Shadows</span>' : '';
  if(img) document.getElementById('place-photo').innerHTML = `<img src="${img.url}" alt="${p.name}"><div class="photo-credit">Foto: <a href="${img.source}" target="_blank" rel="noopener">${img.credit}</a> · ${img.license}</div>`;
  document.getElementById('external-links').innerHTML = [...(extra.links||[]).map(linkButton),mapsButton(p.name,p.area)].join('');
  const related=food.filter(x=>x.status==='active' && (x.area===p.area || (p.area==='Hiroshima'&&x.area==='Miyajima'))).slice(0,4);
  document.getElementById('nearby-food').innerHTML = related.length ? related.map(x=>`<a class="mini-card restaurant-alt" href="restaurant.html?id=${encodeURIComponent(x.id)}"><span>${x.role} · ${x.priority}</span><strong>${x.name}</strong><small>${x.dish}</small></a>`).join('') : '<p class="small">Ingen restaurantkandidater lagt inn her ennå.</p>';
}

async function renderPrep() {
  nav('prep'); footer();
  const [prep,guide]=await Promise.all([json('data/prep.json'),json('data/guide.json')]);
  document.getElementById('connections').innerHTML = guide.connections.map(x=>`<article class="connection-card"><div class="meta">${x.type}</div><h3>${x.title}</h3><p>${x.text}</p><a href="place.html?id=${x.placeId}">Se stedet →</a></article>`).join('');
  document.getElementById('prep-grid').innerHTML = prep.map(group=>`<section class="section"><h2>${group.category}</h2><div class="grid">${group.items.map(x=>`<article class="card"><div class="meta">${x.for}</div><h3>${x.title}</h3><p>${x.why}</p><strong>${x.action}</strong></article>`).join('')}</div></section>`).join('');
}

async function renderFood() {
  nav('food'); footer();
  const [food,fx]=await Promise.all([json('data/food.json'),json('data/fx.json')]);
  const active=food.filter(x=>x.status!=='watch');
  const watch=food.filter(x=>x.status==='watch');
  const areaOrder=['Tokyo','Kyoto','Nara','Himeji','Hiroshima','Miyajima','Osaka'];
  const areas=['Alle',...areaOrder.filter(a=>active.some(x=>x.area===a))];
  const filters=document.getElementById('food-filters');
  const list=document.getElementById('food-list');
  const order={'Må prøve':0,'Sterk kandidat':1,'Valgfri':2,'Følg med':3};

  const familyPrice=(x)=>{
    if(!Array.isArray(x.familyEstimateYen)) return 'Pris kommer';
    const [lo,hi]=x.familyEstimateYen;
    const yen=lo===hi?fmtJpy(lo):`${fmtJpy(lo)}–${fmtJpy(hi)}`;
    const nokLo=fmtNok(nokFromJpy(lo,fx));
    const nokHi=fmtNok(nokFromJpy(hi,fx));
    const nok=lo===hi?nokLo:`${nokLo}–${nokHi}`;
    return `${yen}<small>ca. ${nok}</small>`;
  };

  const ratingSummary=(x)=>{
    const bits=[];
    if(x.ratings?.google?.score) bits.push(`<span>Google <strong>${x.ratings.google.score.toFixed(1)}</strong></span>`);
    if(x.ratings?.tripadvisor?.score) bits.push(`<span>Tripadvisor <strong>${x.ratings.tripadvisor.score.toFixed(1)}</strong></span>`);
    return bits.length?bits.join(''):'<span>Vurderinger på detaljsiden</span>';
  };

  const row=(x)=>`<a class="food-index-row" href="restaurant.html?id=${encodeURIComponent(x.id)}">
    <div class="food-index-main">
      <div class="food-index-badges">${priorityBadge(x.priority)}<span class="food-role">${x.role}</span></div>
      <h3>${x.name}</h3>
      <span class="food-index-dish">${x.dish}</span>
    </div>
    <div class="food-index-fit"><span>Passer med</span><strong>${x.fit}</strong></div>
    <div class="food-index-rating">${ratingSummary(x)}</div>
    <div class="food-index-price"><span>${x.priceClass}</span><strong>${familyPrice(x)}</strong></div>
    <span class="food-index-arrow" aria-hidden="true">→</span>
  </a>`;

  const draw=(area='Alle')=>{
    const visible=active.filter(x=>area==='Alle'||x.area===area);
    const groups=area==='Alle'?areaOrder.filter(a=>visible.some(x=>x.area===a)):[area];
    list.innerHTML=groups.map(group=>{
      const items=visible.filter(x=>x.area===group).sort((a,b)=>(order[a.priority]??9)-(order[b.priority]??9));
      return `<section class="food-area-group"><div class="food-area-head"><h2>${group}</h2><span>${items.length} ${items.length===1?'sted':'steder'}</span></div><div class="food-index-list">${items.map(row).join('')}</div></section>`;
    }).join('');
  };

  filters.innerHTML=areas.map((a,i)=>`<button class="${i===0?'active':''}" data-area="${a}">${a}</button>`).join('');
  filters.addEventListener('click',e=>{
    if(e.target.tagName!=='BUTTON') return;
    [...filters.children].forEach(b=>b.classList.remove('active'));
    e.target.classList.add('active');
    draw(e.target.dataset.area);
  });

  const destinations=active.filter(x=>x.role==='Destinasjonsmåltid').length;
  const summary=document.getElementById('food-summary');
  if(summary) summary.innerHTML=`<strong>${active.length} kuraterte kandidater</strong><span>${destinations} destinasjonsmåltider · detaljene ligger ett klikk ned</span>`;

  const watchlist=document.getElementById('food-watchlist');
  if(watchlist){
    watchlist.innerHTML=watch.length?watch.map(x=>`<a class="food-watch-card" href="restaurant.html?id=${encodeURIComponent(x.id)}"><div><span class="food-role">${x.role}</span><h3>${x.name}</h3><strong>${x.dish}</strong><p>${x.why}</p></div><span class="food-index-arrow" aria-hidden="true">→</span></a>`).join(''):'';
  }
  const fxNote=document.getElementById('food-fx-note');
  if(fxNote) fxNote.textContent=`Familieprisene er planestimater. NOK er omregnet med ${fmtJpy(1000)} ≈ ${fmtNok(1000*fx.nokPerJpy)} (${fx.asOf}). Ratinger er daterte øyeblikksbilder og kan endre seg.`;
  draw();
}

async function renderRestaurant() {
  nav('food'); footer();
  const [food,fx]=await Promise.all([json('data/food.json'),json('data/fx.json')]);
  const id=new URLSearchParams(location.search).get('id');
  const x=food.find(item=>item.id===id);
  if(!x){
    document.title='Restaurant ikke funnet · Japan 2027';
    document.querySelector('main').innerHTML='<div class="eyebrow">Mat</div><h1>Restaurant ikke funnet</h1><p class="lede">Denne restaurant-ID-en finnes ikke i den kuraterte listen.</p><p><a href="food.html">← Tilbake til matoversikten</a></p>';
    return;
  }

  document.title=`${x.name} · Japan 2027`;
  document.getElementById('restaurant-area').textContent=`${x.area} · ${x.role}`;
  document.getElementById('restaurant-name').textContent=x.name;
  document.getElementById('restaurant-dish').textContent=x.dish;
  document.getElementById('restaurant-priority').innerHTML=priorityBadge(x.priority);
  document.getElementById('restaurant-why').textContent=x.why;
  document.getElementById('restaurant-fit').textContent=x.fit;
  document.getElementById('restaurant-price-class').textContent=x.priceClass;

  const price=document.getElementById('restaurant-family-price');
  if(Array.isArray(x.familyEstimateYen)){
    const [lo,hi]=x.familyEstimateYen;
    const yen=lo===hi?fmtJpy(lo):`${fmtJpy(lo)}–${fmtJpy(hi)}`;
    const nokLo=fmtNok(nokFromJpy(lo,fx));
    const nokHi=fmtNok(nokFromJpy(hi,fx));
    const nok=lo===hi?nokLo:`${nokLo}–${nokHi}`;
    price.innerHTML=`<strong>${yen}</strong><small>ca. ${nok}</small>`;
  } else {
    price.innerHTML='<strong>Ikke avklart</strong>';
  }

  document.getElementById('restaurant-price-basis').textContent=x.priceBasis||'';
  document.getElementById('restaurant-booking').textContent=x.booking||'';
  document.getElementById('restaurant-note').textContent=x.note||'';
  document.getElementById('restaurant-fx-note').textContent=`NOK-estimatet bruker planleggingskurs ${fmtJpy(1000)} ≈ ${fmtNok(1000*fx.nokPerJpy)} (${fx.asOf}).`;

  const img=document.getElementById('restaurant-image');
  if(x.image){
    img.hidden=false;
    img.innerHTML=`<img src="${x.image.url}" alt="${x.image.alt||x.name}" loading="eager"><figcaption>Foto: <a href="${x.image.source}" target="_blank" rel="noopener">${x.image.credit}</a> · ${x.image.license}</figcaption>`;
  } else {
    img.hidden=true;
  }

  const ratings=document.getElementById('restaurant-ratings');
  const ratingCard=(label,r,fallbackUrl)=>{
    if(r){
      const sourceNote=r.sourceNote?` · ${r.sourceNote}`:'';
      return `<a class="rating-card" href="${r.url||fallbackUrl}" target="_blank" rel="noopener"><span>${label}</span><strong>${r.score.toFixed(1)} / 5</strong><small>${r.count?`${new Intl.NumberFormat('nb-NO').format(r.count)} anmeldelser`:''}${sourceNote}</small></a>`;
    }
    return `<a class="rating-card muted" href="${fallbackUrl}" target="_blank" rel="noopener"><span>${label}</span><strong>Ikke kontrollert</strong><small>Åpne oppføringen ↗</small></a>`;
  };
  ratings.innerHTML=[
    ratingCard('Google',x.ratings?.google,x.links?.googleMaps||x.maps),
    ratingCard('Tripadvisor',x.ratings?.tripadvisor,x.ratings?.tripadvisor?.url||'https://www.tripadvisor.com/')
  ].join('');
  document.getElementById('restaurant-ratings-note').textContent=x.ratings?.checked?`Score kontrollert ${x.ratings.checked}. Ratinger endrer seg over tid.`:'';

  const orderEl=document.getElementById('restaurant-order');
  const orderRecs=x.orderRecommendations||[];
  orderEl.innerHTML=orderRecs.length
    ? orderRecs.map((r,i)=>`<article class="order-card"><span>${i+1}</span><div><h3>${r.title}</h3><p>${r.why}</p></div></article>`).join('')
    : '<p class="small">Ingen konkret bestillingsanbefaling lagt inn ennå.</p>';

  const links=[
    x.links?.googleMaps?`<a class="button primary" href="${x.links.googleMaps}" target="_blank" rel="noopener">Google Maps ↗</a>`:'',
    x.links?.menu?`<a class="button" href="${x.links.menu}" target="_blank" rel="noopener">Meny ↗</a>`:'',
    x.links?.booking?`<a class="button" href="${x.links.booking}" target="_blank" rel="noopener">Booking ↗</a>`:'',
    x.links?.website?`<a class="button" href="${x.links.website}" target="_blank" rel="noopener">Nettside ↗</a>`:'',
    x.ratings?.tripadvisor?.url?`<a class="button" href="${x.ratings.tripadvisor.url}" target="_blank" rel="noopener">Tripadvisor ↗</a>`:''
  ].filter(Boolean);
  document.getElementById('restaurant-links').innerHTML=links.join('');

  const alternatives=food.filter(item=>item.status==='active'&&item.id!==x.id&&item.area===x.area).slice(0,4);
  document.getElementById('restaurant-alternatives').innerHTML=alternatives.length
    ? alternatives.map(item=>`<a class="restaurant-alt" href="restaurant.html?id=${encodeURIComponent(item.id)}"><span>${item.role}</span><strong>${item.name}</strong><small>${item.dish}</small></a>`).join('')
    : '<p class="small">Ingen andre aktive kandidater i dette området akkurat nå.</p>';
}

async function renderPractical() {
  nav('practical'); footer();
  const guide=await json('data/guide.json');
  document.getElementById('transport-grid').innerHTML=guide.transport.map(x=>`<article class="card transport-card"><div class="transport-icon">${x.icon}</div><h3>${x.title}</h3><strong>${x.short}</strong><p>${x.body}</p><div class="button-row">${x.links.map(l=>`<a class="button" href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`).join('')}</div></article>`).join('');
  document.getElementById('booking-radar').innerHTML=guide.bookingRadar.map(x=>`<article class="booking-row">${priorityBadge(x.priority)}<div><strong>${x.title}</strong><span>${x.area} · ${x.when}</span><p>${x.why}</p></div><a href="${x.url}" target="_blank" rel="noopener">Billetter/info ↗</a></article>`).join('');
  document.getElementById('place-words').innerHTML=guide.placeWords.map(x=>`<div class="glossary-row"><strong>${x.term}</strong><span>${x.meaning}</span></div>`).join('');
  document.getElementById('phrases').innerHTML=guide.phrases.map(x=>`<div class="glossary-row"><strong>${x.jp}</strong><span>${x.no}</span></div>`).join('');
  document.getElementById('name-notes').innerHTML=guide.nameNotes.map(x=>`<article class="mini-card"><h3>${x.name}</h3><p>${x.note}</p></article>`).join('');
  document.getElementById('etiquette').innerHTML=guide.etiquette.map(x=>`<article class="mini-card"><h3>${x.title}</h3><p>${x.body}</p></article>`).join('');
}

async function renderBudget() {
  nav('budget'); footer();
  const [trip,fx] = await Promise.all([json('data/trip.json'),json('data/fx.json?v=0.8.0')]);
  document.getElementById('target').innerHTML = dualMoneyHtml(fmtNok(trip.budget.targetNok),fmtJpy(jpyFromNok(trip.budget.targetNok,fx)));
  document.getElementById('range').innerHTML = dualMoneyHtml(
    `${fmtNok(trip.budget.rangeNok[0])}–${fmtNok(trip.budget.rangeNok[1])}`,
    `${fmtJpy(jpyFromNok(trip.budget.rangeNok[0],fx))}–${fmtJpy(jpyFromNok(trip.budget.rangeNok[1],fx))}`
  );
  document.getElementById('note').textContent = trip.budget.note;
  document.getElementById('budget-rows').innerHTML = trip.budget.items.map(item=>`
    <tr><td>${item.label}</td><td>${dualRangeFromNok(item.rangeNok,fx)}</td></tr>
  `).join('');
  document.getElementById('fx-note').textContent =
    `Omregnet med planleggingskurs ${fmtJpy(1000)} ≈ ${fmtNok(1000*fx.nokPerJpy)} (${fx.asOf}). ${fx.displayNote}`;
}

async function renderSources() {
  nav(''); footer();
  const sources = await json('data/sources.json');
  document.getElementById('sources-grid').innerHTML = sources.map(s=>`<article class="card"><h3><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a></h3><p>${s.use}</p></article>`).join('');
}

function initPrivacy(){ nav(''); footer(); }
