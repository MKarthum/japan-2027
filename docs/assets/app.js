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
  const r = await fetch(path);
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
  const [trip,places,guide,routeGeometry,transport,mapPois,fx]=await Promise.all([
    json('data/trip.json'),
    json('data/places.json'),
    json('data/guide.json'),
    json('data/route-geometry.json?v=0.8.0'),
    json('data/transport.json?v=0.8.0'),
    json('data/map-pois.json?v=0.8.0'),
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

  const markerGroups={stations:[],experience:[],food:[],hotel:[]};
  const layerState={stations:true,experience:true,food:false,hotel:false};

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
    food:{label:'Mat',symbol:'●'},
    hotel:{label:'Hotell',symbol:'■'}
  };

  const addPoiMarkers=()=>{
    for(const poi of mapPois.pois){
      const meta=categoryMeta[poi.category]||categoryMeta.experience;
      const el=document.createElement('button');
      el.type='button';
      el.className=`map-poi-dot ${poi.category}`;
      el.textContent=meta.symbol;
      el.setAttribute('aria-label',poi.name);
      const extra=poi.category==='food'
        ? `<p><strong>${poi.detail||'Restaurant'}</strong>${poi.priority?` · ${poi.priority}`:''}</p>`
        : '';
      const popup=new maplibregl.Popup({offset:14,maxWidth:'290px'}).setHTML(`
        <div class="map-popup"><div class="meta">${meta.label} · ${poi.area||''}</div><h3>${poi.name}</h3>${extra}<a href="${poi.href||'#'}">Se mer →</a></div>`);
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([poi.lng,poi.lat]).setPopup(popup);
      if(!markerGroups[poi.category]) markerGroups[poi.category]=[];
      markerGroups[poi.category].push(marker);
      if(layerState[poi.category]) marker.addTo(map);
    }
  };

  const renderLayerToolbar=()=>{
    const toolbar=document.getElementById('map-layers');
    if(!toolbar) return;
    const counts={
      stations:new Set(transport.legs.flatMap(l=>l.stations.map(s=>s.name))).size,
      experience:mapPois.pois.filter(p=>p.category==='experience').length,
      food:mapPois.pois.filter(p=>p.category==='food').length,
      hotel:mapPois.pois.filter(p=>p.category==='hotel').length
    };
    toolbar.innerHTML=`
      <span class="map-layer-title">Vis på kartet</span>
      <button class="map-layer-toggle stations" data-map-layer="stations" aria-pressed="true">Stasjoner <b>${counts.stations}</b></button>
      <button class="map-layer-toggle experience" data-map-layer="experience" aria-pressed="true">Opplevelser <b>${counts.experience}</b></button>
      <button class="map-layer-toggle food" data-map-layer="food" aria-pressed="false">Mat <b>${counts.food}</b></button>
      <button class="map-layer-toggle hotel" data-map-layer="hotel" aria-pressed="false" ${counts.hotel?'':'disabled'}>Hotell <b>${counts.hotel}</b></button>
      <button class="map-layer-fit" id="fit-route" type="button">Vis hele ruten</button>`;
    toolbar.addEventListener('click',e=>{
      const btn=e.target.closest('[data-map-layer]');
      if(btn && !btn.disabled){
        const category=btn.dataset.mapLayer;
        setMarkerVisibility(category,!layerState[category]);
      }
    });
    document.getElementById('fit-route')?.addEventListener('click',fitRoute);
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
      return `<article class="visual-card place-card"><a href="place.html?id=${p.id}">${img?`<img src="${img.url}" alt="${p.name}" loading="lazy">`:''}<div class="visual-card-body"><div class="meta">${p.area} · ${p.type}</div><h3>${p.name}</h3><div class="kicker">${p.simple}</div><p>${p.description}</p><div class="chips">${p.acShadows?'<span class="badge">AC Shadows</span>':''}${['nintendo-museum','ghibli-museum','teamlab','usj'].includes(p.id)?'<span class="badge">Ekstra kandidat</span>':''}</div></div></a></article>`;
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
  const related=food.filter(x=>x.area===p.area || (p.area==='Hiroshima'&&x.area==='Miyajima')).slice(0,3);
  document.getElementById('nearby-food').innerHTML = related.length ? related.map(x=>`<article class="mini-card">${priorityBadge(x.priority)}<h3>${x.name}</h3><strong>${x.dish}</strong><p>${x.why}</p><a href="${x.maps}" target="_blank" rel="noopener">Google Maps ↗</a></article>`).join('') : '<p class="small">Ingen restaurantkandidater lagt inn her ennå.</p>';
}

async function renderPrep() {
  nav('prep'); footer();
  const [prep,guide]=await Promise.all([json('data/prep.json'),json('data/guide.json')]);
  document.getElementById('connections').innerHTML = guide.connections.map(x=>`<article class="connection-card"><div class="meta">${x.type}</div><h3>${x.title}</h3><p>${x.text}</p><a href="place.html?id=${x.placeId}">Se stedet →</a></article>`).join('');
  document.getElementById('prep-grid').innerHTML = prep.map(group=>`<section class="section"><h2>${group.category}</h2><div class="grid">${group.items.map(x=>`<article class="card"><div class="meta">${x.for}</div><h3>${x.title}</h3><p>${x.why}</p><strong>${x.action}</strong></article>`).join('')}</div></section>`).join('');
}

async function renderFood() {
  nav('food'); footer();
  const food=await json('data/food.json');
  const areas=['Alle',...new Set(food.map(x=>x.area))];
  const filters=document.getElementById('food-filters');
  filters.innerHTML=areas.map((a,i)=>`<button class="${i===0?'active':''}" data-area="${a}">${a}</button>`).join('');
  const grid=document.getElementById('food-grid');
  const order={'Må prøve':0,'Sterk kandidat':1,'Valgfri':2};
  const draw=(area='Alle')=>{
    grid.innerHTML=food.filter(x=>area==='Alle'||x.area===area).sort((a,b)=>order[a.priority]-order[b.priority]).map(x=>`<article class="food-card">${priorityBadge(x.priority)}<div class="meta">${x.area}</div><h3>${x.name}</h3><div class="kicker">${x.dish}</div><p>${x.why}</p><p class="small">${x.note||''}</p><div class="button-row"><a class="button" href="${x.maps}" target="_blank" rel="noopener">Google Maps ↗</a>${x.website?`<a class="button" href="${x.website}" target="_blank" rel="noopener">Nettside ↗</a>`:''}</div></article>`).join('');
  };
  filters.addEventListener('click',e=>{if(e.target.tagName!=='BUTTON')return;[...filters.children].forEach(b=>b.classList.remove('active'));e.target.classList.add('active');draw(e.target.dataset.area);});
  draw();
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
