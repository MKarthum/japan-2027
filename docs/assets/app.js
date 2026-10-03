const fmtDate = (iso) => new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));
const fmtNok = (n) => new Intl.NumberFormat('nb-NO', { style:'currency', currency:'NOK', maximumFractionDigits:0 }).format(n);

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
  fetch('data/site.json', {cache:'no-store'})
    .then(r=>r.ok?r.json():null)
    .then(v=>{ if(v) document.getElementById('site-version').textContent = `Versjon ${v.version} · ${v.released}`; })
    .catch(()=>{});
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
  const [trip,places,guide] = await Promise.all([json('data/trip.json'),json('data/places.json'),json('data/guide.json')]);
  document.getElementById('status').textContent = trip.status;
  document.getElementById('window').textContent = trip.window;
  document.getElementById('budget').textContent = fmtNok(trip.budget.targetNok);

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
  const [trip,places,guide,routeGeometry]=await Promise.all([
    json('data/trip.json'),
    json('data/places.json'),
    json('data/guide.json'),
    json('data/route-geometry.json')
  ]);

  document.getElementById('window').textContent = trip.window;
  document.getElementById('route-list').innerHTML = trip.route.map(x=>{
    const p=places.find(p=>p.id===x.id)||x; const img=guide.images[areaImageKey(guide,p)];
    return `<div class="route-item">${img?`<img class="route-thumb" src="${img.url}" alt="" loading="lazy">`:''}<div class="date">${fmtDate(x.from)}${x.to!==x.from?` – ${fmtDate(x.to)}`:''}</div><div><a href="place.html?id=${x.id}"><strong>${x.name}</strong></a><div class="small">${x.label} · ${x.summary}</div></div><div class="nights">${x.nights===0?'Stopp':`${x.nights} ${x.nights===1?'natt':'netter'}`}</div></div>`;
  }).join('');

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

  const addRoutePart = (segment,index) => {
    const sourceId=`journey-${index}`;
    map.addSource(sourceId,{type:'geojson',data:{
      type:'Feature',
      properties:{journeyId:segment.journeyId,name:segment.name,mode:segment.mode},
      geometry:{type:'LineString',coordinates:segment.coords}
    }});
    map.addLayer({
      id:`${sourceId}-casing`,
      type:'line',source:sourceId,
      layout:{'line-join':'round','line-cap':'round'},
      paint:{
        'line-color':'rgba(255,255,255,.94)',
        'line-width':8,
        'line-offset':segment.offset||0
      }
    });
    map.addLayer({
      id:`${sourceId}-line`,
      type:'line',source:sourceId,
      layout:{'line-join':'round','line-cap':'round'},
      paint:{
        'line-color':segment.color,
        'line-width':4,
        'line-opacity':.95,
        'line-offset':segment.offset||0
      }
    });
    map.addLayer({
      id:`${sourceId}-arrows`,
      type:'symbol',source:sourceId,
      layout:{
        'symbol-placement':'line',
        'symbol-spacing':90,
        'text-field':'›',
        'text-size':18,
        'text-rotation-alignment':'map',
        'text-keep-upright':false,
        'text-allow-overlap':true
      },
      paint:{'text-color':segment.color,'text-halo-color':'#fff','text-halo-width':1.2}
    });

    map.on('click',`${sourceId}-line`,e=>{
      const p=e.features?.[0]?.properties||{};
      new maplibregl.Popup({closeButton:false})
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${p.name||segment.name}</strong><br>${p.mode||segment.mode}`)
        .addTo(map);
    });
    map.on('mouseenter',`${sourceId}-line`,()=>map.getCanvas().style.cursor='pointer');
    map.on('mouseleave',`${sourceId}-line`,()=>map.getCanvas().style.cursor='');
  };

  map.on('load', ()=>{
    // Norwegian labels where available, then English, romanised/Latin, then local.
    const style = map.getStyle();
    const preferredName = [
      'coalesce',
      ['get','name:nb'],
      ['get','name:en'],
      ['get','name_en'],
      ['get','name:latin'],
      ['get','name']
    ];
    const usesNameField = (value) => {
      if (typeof value === 'string') return /name(?::[a-z-]+|_[a-z]+)?|\\{name/.test(value);
      if (!Array.isArray(value)) return false;
      return value.some(usesNameField);
    };
    for (const layer of (style.layers || [])) {
      const textField = layer?.layout?.['text-field'];
      if (layer.type === 'symbol' && textField && usesNameField(textField)) {
        map.setLayoutProperty(layer.id,'visibility','visible');
        map.setLayoutProperty(layer.id,'text-field',preferredName);
      }
    }

    routeGeometry.parts.forEach(addRoutePart);

    const journeys=[];
    const seen=new Set();
    for(const part of routeGeometry.parts){
      if(seen.has(part.journeyId)) continue;
      seen.add(part.journeyId);
      journeys.push(part);
    }
    const legend=document.getElementById('route-legend');
    if(legend){
      legend.innerHTML=journeys.map(s=>`<span class="route-legend-item"><i style="background:${s.color}"></i><strong>${s.name}</strong> · ${s.mode}</span>`).join('');
    }

    const bounds = new maplibregl.LngLatBounds();
    for(const part of routeGeometry.parts){
      for(const coord of part.coords) bounds.extend(coord);
    }

    trip.route.forEach((x,i)=>{
      const el=document.createElement('div');
      el.className='map-stop';
      el.innerHTML=`<span class="map-pin">${i+1}</span><span class="map-place-label">${x.name}</span>`;
      new maplibregl.Marker({element:el,anchor:'center'})
        .setLngLat([x.lng,x.lat])
        .setPopup(new maplibregl.Popup({offset:22}).setHTML(`<strong>${i+1}. ${x.name}</strong><br>${x.label}<br>${fmtDate(x.from)}`))
        .addTo(map);
    });
    trip.dayTrips.forEach(x=>{
      bounds.extend([x.lng,x.lat]);
      const el=document.createElement('div');
      el.className='map-stop daytrip';
      el.innerHTML=`<span class="map-pin"></span><span class="map-place-label">${x.name}</span>`;
      new maplibregl.Marker({element:el,anchor:'center'})
        .setLngLat([x.lng,x.lat])
        .setPopup(new maplibregl.Popup({offset:18}).setHTML(`<strong>${x.name}</strong><br>Dagstur fra ${x.base}`))
        .addTo(map);
    });
    map.fitBounds(bounds,{padding:{top:55,right:80,bottom:55,left:55},maxZoom:7,duration:0});
  });

  let firstMapErrorShown = false;
  map.on('error', (event)=>{
    console.warn('Kartfeil', event?.error || event);
    if (!firstMapErrorShown && !map.loaded()) {
      firstMapErrorShown = true;
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
  const trip = await json('data/trip.json');
  document.getElementById('target').textContent = fmtNok(trip.budget.targetNok);
  document.getElementById('range').textContent = `${fmtNok(trip.budget.rangeNok[0])}–${fmtNok(trip.budget.rangeNok[1])}`;
  document.getElementById('note').textContent = trip.budget.note;
}

async function renderSources() {
  nav(''); footer();
  const sources = await json('data/sources.json');
  document.getElementById('sources-grid').innerHTML = sources.map(s=>`<article class="card"><h3><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a></h3><p>${s.use}</p></article>`).join('');
}

function initPrivacy(){ nav(''); footer(); }
