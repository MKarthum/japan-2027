const fmtDate = (iso) => new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00Z`));
const fmtLongDate = (iso) => new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${iso}T12:00:00Z`));
const fmtNok = (n) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits:0 }).format(Math.round(n)) + ' kr';
const fmtJpy = (n) => '¥' + new Intl.NumberFormat('nb-NO', { maximumFractionDigits:0 }).format(Math.round(n));
const fmtRate = (n, digits=4) => new Intl.NumberFormat('nb-NO', { minimumFractionDigits:digits, maximumFractionDigits:digits }).format(n);
const nokFromJpy = (jpy,fx) => jpy * fx.nokPerJpy;
const jpyFromNok = (nok,fx) => nok * fx.jpyPerNok;
const dualFromJpy = (jpy,fx) => `${fmtJpy(jpy)} · ca. ${fmtNok(nokFromJpy(jpy,fx))}`;
const dualFromNok = (nok,fx) => `${fmtNok(nok)} · ca. ${fmtJpy(jpyFromNok(nok,fx))}`;
const dualRangeFromNok = (range,fx) => `${fmtNok(range[0])}–${fmtNok(range[1])} · ca. ${fmtJpy(jpyFromNok(range[0],fx))}–${fmtJpy(jpyFromNok(range[1],fx))}`;
const dualMoneyHtml = (primary,secondary) => `<span class="money-dual"><span>${primary}</span><small>ca. ${secondary}</small></span>`;
const standardFamily = (trip) => trip.priceParties?.standardFamily || {adults:2,children:2};
const priceScenarios = (trip) => trip.priceParties?.scenarios || [{id:'one-family',label:'1 familie',families:1}];
const selectedPriceScenario = (trip) => {
  const scenarios=priceScenarios(trip);
  const requested=new URLSearchParams(location.search).get('party');
  if(requested && scenarios.some(x=>x.id===requested)){
    try{localStorage.setItem('japan2027-price-party',requested);}catch{}
    return scenarios.find(x=>x.id===requested);
  }
  let stored='';
  try{stored=localStorage.getItem('japan2027-price-party')||'';}catch{}
  return scenarios.find(x=>x.id===stored)
    || scenarios.find(x=>x.id===trip.priceParties?.defaultScenarioId)
    || scenarios[0];
};
const partyMultiplier = (trip) => selectedPriceScenario(trip)?.families || 1;
const planningPartyLabel = (trip) => {
  const base=standardFamily(trip), m=partyMultiplier(trip);
  return `${base.adults*m} voksne + ${base.children*m} barn`;
};
const planningPartyShort = (trip) => {
  const base=standardFamily(trip), m=partyMultiplier(trip);
  return `${base.adults*m}V+${base.children*m}B`;
};
const scalePartyYen = (yen,trip) => Number.isFinite(yen) ? yen*partyMultiplier(trip) : yen;
const scalePartyRange = (range,trip) => Array.isArray(range) ? range.map(v=>scalePartyYen(v,trip)) : null;
const dualRangeFromJpy = (range,fx) => {
  if(!Array.isArray(range)||range.length!==2) return '';
  const [lo,hi]=range;
  if(lo===hi) return dualFromJpy(lo,fx);
  return `${fmtJpy(lo)}–${fmtJpy(hi)} · ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))}`;
};
const placePriceValue = (place,trip,fx) => {
  const price=place?.price;
  if(!price) return {primary:'Pris mangler',secondary:''};
  if(price.status==='free') return {primary:'Gratis',secondary:''};
  const range=scalePartyRange(price.standardFamilyRangeYen,trip);
  if(range) return {primary:range[0]===range[1]?fmtJpy(range[0]):`${fmtJpy(range[0])}–${fmtJpy(range[1])}`,secondary:range[0]===range[1]?fmtNok(nokFromJpy(range[0],fx)):`${fmtNok(nokFromJpy(range[0],fx))}–${fmtNok(nokFromJpy(range[1],fx))}`};
  if(Number.isFinite(price.adultFromYen)) return {primary:`Fra ${fmtJpy(price.adultFromYen)} per voksen`,secondary:`ca. ${fmtNok(nokFromJpy(price.adultFromYen,fx))}`};
  return {primary:'Pris varierer',secondary:''};
};
const placePriceSummaryHtml = (place,trip,fx) => {
  const value=placePriceValue(place,trip,fx);
  return `<div class="place-list-price"><span>${planningPartyShort(trip)}</span><strong>${value.primary}</strong>${value.secondary?`<small>ca. ${value.secondary}</small>`:''}</div>`;
};
const placePriceDetailHtml = (place,trip,fx) => {
  const price=place?.price;
  if(!price) return '';
  const value=placePriceValue(place,trip,fx);
  return `<div class="place-price-panel"><span>Pris · ${planningPartyLabel(trip)}</span><strong>${value.primary}</strong>${value.secondary?`<small>ca. ${value.secondary}</small>`:''}<p>${price.note||''}</p><div class="place-price-meta">${price.checked?`Kontrollert ${fmtLongDate(price.checked)}`:''}${price.source?` · <a href="${price.source}" target="_blank" rel="noopener">prisgrunnlag ↗</a>`:''}</div></div>`;
};
function renderPricePartySelector(trip) {
  const config=trip.priceParties;
  if(!config?.scenarios?.length || document.querySelector('.price-party-selector')) return;
  const selected=selectedPriceScenario(trip);
  const base=standardFamily(trip);
  const root=document.createElement('div');
  root.className='price-party-selector';
  root.innerHTML=`<span>Vis priser for</span><div class="price-party-options">${config.scenarios.map(s=>{
    const adults=base.adults*s.families, children=base.children*s.families;
    return `<button type="button" data-party="${s.id}" aria-pressed="${s.id===selected.id}">${s.label} · ${adults}+${children}</button>`;
  }).join('')}</div>${selected.families>1?`<small>${config.note}</small>`:''}`;
  root.addEventListener('click',e=>{
    const btn=e.target.closest('[data-party]');
    if(!btn || btn.dataset.party===selected.id) return;
    try{localStorage.setItem('japan2027-price-party',btn.dataset.party);}catch{}
    const url=new URL(location.href);
    url.searchParams.set('party',btn.dataset.party);
    location.href=url.toString();
  });
  const main=document.querySelector('main');
  const anchor=main?.querySelector('.home-hero,.detail-hero,.lede') || main?.firstElementChild;
  if(anchor) anchor.insertAdjacentElement('afterend',root);
}

async function json(path) {
  const r = await fetch(path, {cache:'no-store'});
  if (!r.ok) throw new Error(`Kunne ikke hente ${path}`);
  return r.json();
}

let pagesPromise=null;
async function applyPageCopy(pageKey) {
  pagesPromise ||= json('data/pages.json');
  const pages=await pagesPromise;
  const copy=pages[pageKey];
  if(!copy) throw new Error(`Mangler sideinnhold for ${pageKey}`);
  for(const el of document.querySelectorAll('[data-copy]')){
    const value=el.dataset.copy.split('.').reduce((obj,key)=>obj?.[key],copy);
    if(typeof value==='string') el.textContent=value;
  }
  return copy;
}

async function renderStaticPage(pageKey,active='') {
  nav(active);
  footer();
  await applyPageCopy(pageKey);
}

let fxPromise=null;
async function loadFx() {
  if(fxPromise) return fxPromise;
  fxPromise=(async()=>{
    const fallback=await json('data/fx.json');
    try {
      const endpoint=fallback.liveEndpoint || 'https://api.frankfurter.dev/v2/rate/NOK/JPY?providers=ecb';
      const r=await fetch(endpoint,{cache:'no-store'});
      if(!r.ok) throw new Error(`FX API ${r.status}`);
      const live=await r.json();
      const rate=Number(live.rate);
      if(!Number.isFinite(rate) || rate < 5 || rate > 30) throw new Error('Ugyldig NOK/JPY-kurs');
      return {
        ...fallback,
        asOf:live.date || fallback.asOf,
        jpyPerNok:rate,
        nokPerJpy:1/rate,
        live:true,
        sourceName:'ECB referansekurs',
        sourceUrl:'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html'
      };
    } catch(error) {
      console.warn('ECB-kurs utilgjengelig; bruker lagret ECB-fallback.',error);
      return {...fallback,live:false};
    }
  })();
  return fxPromise;
}

const fxStatusText=(fx)=>fx.live?'Siste ECB-referansekurs':'Lagret ECB-fallback';

function nav(active='') {
  const items = [
    ['index.html','Oversikt','home'],
    ['route.html','Rute','route'],
    ['places.html','Steder','places'],
    ['food.html','Mat','food'],
    ['hotels.html','Overnatting','hotels'],
    ['prep.html','Før turen','prep'],
    ['practical.html','Praktisk','practical'],
    ['budget.html','Budsjett','budget']
  ];
  document.querySelector('header').innerHTML = `<div class="nav"><a class="brand" href="index.html"><span class="brand-mark">日</span> Japan 2027</a><nav>${items.map(([href,label,key])=>`<a href="${href}" ${active===key?'aria-current="page"':''}>${label}</a>`).join('')}</nav></div>`;
}

function footer() {
  document.querySelector('footer').innerHTML = `<div class="inner"><div><strong>Japan 2027</strong><br><span class="small">Reiseplan med priser, steder og praktiske kilder samlet på ett sted.</span><br><span id="footer-version" class="small footer-version"></span><br><span id="footer-fx" class="small footer-fx"></span></div><div class="footer-links"><a href="sources.html">Kilder</a><a href="privacy.html">Personvern</a></div></div>`;
  Promise.all([json('data/site.json'),loadFx()]).then(([site,fx])=>{
    const version=document.getElementById('footer-version');
    if(version) version.textContent=`v${site.version} · Sist oppdatert ${site.released}`;
    const el=document.getElementById('footer-fx');
    if(el) el.innerHTML=`${fxStatusText(fx)} ${fmtLongDate(fx.asOf)}: 1 NOK = ${fmtRate(fx.jpyPerNok)} JPY · 1 JPY = ${fmtRate(fx.nokPerJpy)} NOK · <a href="${fx.sourceUrl}" target="_blank" rel="noopener">kilde ↗</a>`;
  }).catch(()=>{});
}

const linkButton = (x) => `<a class="button ${x.kind==='ticket'?'primary':''}" href="${x.url}" target="_blank" rel="noopener">${x.label} ↗</a>`;
const mapsButton = (name, area='Japan') => `<a class="button" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+' '+area+' Japan')}" target="_blank" rel="noopener">Kart ↗</a>`;

const imageLicenseHtml=(img)=>img?.licenseUrl
  ? `<a href="${img.licenseUrl}" target="_blank" rel="license noopener">${img.license}</a>`
  : (img?.license||'');
const imageCreditHtml=(img,cls='image-credit-overlay')=>{
  if(!img) return '';
  if(img.type==='ai'){
    return `<span class="${cls}">AI-generert illustrasjon</span>`;
  }
  return `<span class="${cls}">Foto: <a href="${img.source}" target="_blank" rel="noopener">${img.credit}</a> · ${imageLicenseHtml(img)}</span>`;
};
const entityMediaHtml=({img,alt,area='',type='',trip,subject,compact=false,variant='visual'})=>{
  const mediaClass=variant==='list'?'place-list-media':`visual-card-media ${compact?'compact':''}`;
  const fallbackClass=variant==='list'?'place-list-fallback':'media-fallback';
  const taxonomy=(area||type)
    ? `<div class="place-image-taxonomy">${area?`<span class="area-pill" style="background:${destinationColor(trip,subject)}">${area}</span>`:''}${type?`<span class="type-pill">${type}</span>`:''}</div>`
    : '';
  return `<div class="${mediaClass}"><div class="${fallbackClass}" aria-hidden="true">${alt}</div>${img?.url?`<img src="${img.url}" alt="${img.alt||alt}" loading="lazy" onerror="this.remove()">`:''}${taxonomy}${img?imageCreditHtml(img,'image-credit-overlay image-credit-mini'):''}</div>`;
};

function destinationStop(trip, subject) {
  if(!trip?.route || !subject) return null;
  if(typeof subject==='string'){
    return trip.route.find(x=>x.id===subject || x.theme?.areas?.includes(subject)) || null;
  }
  if(subject.destinationId) return trip.route.find(x=>x.id===subject.destinationId) || null;
  if(subject.baseId) return trip.route.find(x=>x.id===subject.baseId) || null;
  if(subject.id){
    const direct=trip.route.find(x=>x.id===subject.id);
    if(direct) return direct;
  }
  if(subject.area) return trip.route.find(x=>x.theme?.areas?.includes(subject.area)) || null;
  return null;
}
function destinationTheme(trip, subject) {
  return destinationStop(trip,subject)?.theme || {color:'#5f6b73',areas:[]};
}
const destinationId=(trip,subject)=>destinationStop(trip,subject)?.id||null;
const themeStyle=(theme)=>`--area-color:${theme?.color||'#5f6b73'}`;
const destinationColor=(trip,subject)=>destinationTheme(trip,subject).color;

const placePrimaryLink=(place)=>{
  const links=place?.links||[];
  return links.find(x=>x.kind==='ticket') || links.find(x=>x.kind==='official') || links[0] || null;
};

function priorityBadge(priority){
  const cls = priority==='Må prøve' || priority==='Viktig' ? 'must' : priority==='Sterk kandidat' || priority==='Bør bestilles' ? 'strong' : 'optional';
  return `<span class="priority ${cls}">${priority}</span>`;
}
const relatedEntityCardHtml=({href,meta,title,subtitle,trip,subject})=>`<a class="related-card destination-themed" style="${themeStyle(destinationTheme(trip,subject))}" href="${href}"><span>${meta}</span><strong>${title}</strong><small>${subtitle}</small></a>`;

function setupChoiceFilters(root,options,onChange,{allLabel='Alle',initialValue='all'}={}) {
  if(!root) return 'all';
  const valid=new Set(['all',...options.map(x=>x.value)]);
  const selected=valid.has(initialValue)?initialValue:'all';
  const all=[{value:'all',label:allLabel},...options];
  root.innerHTML=all.map(x=>`<button class="${x.value===selected?'active':''} ${x.theme?'destination-filter':''}" ${x.theme?`style="${themeStyle(x.theme)}"`:''} data-filter-value="${x.value}">${x.label}</button>`).join('');
  root.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-filter-value]');
    if(!btn) return;
    [...root.querySelectorAll('button')].forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    onChange(btn.dataset.filterValue);
  });
  return selected;
}

function setupJourneyFilters(root,trip,places,subjects,onChange,{overnightOnly=false,param='base'}={}) {
  const placeById=new Map(places.map(p=>[p.id,p]));
  const stops=trip.route.filter(stop=>{
    if(overnightOnly && stop.nights<=0) return false;
    return subjects.some(subject=>destinationId(trip,subject)===stop.id);
  });
  const requested=new URLSearchParams(location.search).get(param)||'all';
  return setupChoiceFilters(root,stops.map(stop=>({
    value:stop.id,
    label:stop.filterLabel||placeById.get(stop.id)?.name||stop.id,
    theme:stop.theme
  })),onChange,{initialValue:requested});
}

const routeContextLinksHtml=(trip,stop,place,food,hotelsData)=>{
  const id=stop.id;
  const links=[
    `<a href="place.html?id=${encodeURIComponent(place.id)}">Om stoppet</a>`,
    `<a href="places.html?base=${encodeURIComponent(id)}">Steder</a>`
  ];
  if(food.some(x=>x.status!=='watch'&&destinationId(trip,x)===id)) links.push(`<a href="food.html?base=${encodeURIComponent(id)}">Mat</a>`);
  if(stop.nights>0 && (hotelsData.hotels||[]).some(x=>x.baseId===id)) links.push(`<a href="hotels.html?base=${encodeURIComponent(id)}">Overnatting</a>`);
  return `<div class="route-context-links">${links.join('')}</div>`;
};


async function renderHome() {
  await applyPageCopy('home');
  nav('home'); footer();
  const [trip,places,fx] = await Promise.all([json('data/trip.json'),json('data/places.json'),loadFx()]);
  renderPricePartySelector(trip);
  const overview=trip.overview||{};
  const placeById=new Map(places.map(p=>[p.id,p]));

  document.getElementById('window').textContent=trip.window;
  document.getElementById('status').textContent=trip.status;
  document.getElementById('budget').innerHTML=dualMoneyHtml(fmtNok(trip.budget.targetNok*partyMultiplier(trip)),fmtJpy(jpyFromNok(trip.budget.targetNok*partyMultiplier(trip),fx)));
  document.getElementById('home-eyebrow').textContent=overview.hero?.eyebrow||'Japan 2027';
  document.getElementById('home-title').textContent=overview.hero?.title||trip.title;
  document.getElementById('home-intro').textContent=overview.hero?.intro||trip.subtitle;

  const heroPlace=placeById.get(overview.hero?.placeId);
  const hero=heroPlace?.image;
  if(heroPlace && hero){
    document.getElementById('hero-photo').innerHTML=`<div class="media-fallback" aria-hidden="true">${heroPlace.name}</div><img src="${hero.url}" alt="${hero.alt||heroPlace.name}" onerror="this.remove()">${imageCreditHtml(hero)}`;
  }

  document.getElementById('home-reasons').innerHTML=(overview.reasons||[]).map((x,i)=>`<article class="home-reason"><span>0${i+1}</span><h3>${x.title}</h3><p>${x.text}</p></article>`).join('');
  document.getElementById('home-plan-title').textContent=overview.plan?.title||'Planen';
  document.getElementById('home-plan-copy').textContent=overview.plan?.text||'';
  document.getElementById('home-route-summary').innerHTML=trip.route.map(stop=>{
    const p=placeById.get(stop.id);
    return `<span class="home-route-stop destination-themed" style="${themeStyle(destinationTheme(trip,stop))}">${p?.name||stop.id}${stop.nights===0?' · stopp':''}</span>`;
  }).join('<b aria-hidden="true">→</b>');
}

async function renderRoute() {
  await applyPageCopy('route');
  nav('route'); footer();
  const [trip,places,routeGeometry,transport,foodData,hotelsData,fx]=await Promise.all([
    json('data/trip.json'),
    json('data/places.json'),
    json('data/route-geometry.json'),
    json('data/transport.json'),
    json('data/food.json'),
    json('data/hotels.json'),
    loadFx()
  ]);
  const food=foodData.restaurants||[];
  renderPricePartySelector(trip);

  const mapSelectionPopupHtml=(meta,title,subject=null)=>`<div class="map-popup map-popup-selection ${subject?'destination-themed':''}" ${subject?`style="${themeStyle(destinationTheme(trip,subject))}"`:''}><div class="meta">${meta}</div><h3>${title}</h3><a href="#route-detail">Detaljer under kartet ↓</a></div>`;

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
      <div class="family"><span>${planningPartyLabel(trip)}</span><strong>${dualFromJpy(scalePartyYen(leg.fare.standardFamilyYen,trip),fx)}</strong></div>
    </div>`;

  const legHtml=(leg,{compact=false}={}) => `
    <div class="route-detail-content">
      <div class="meta">Reiseetappe · prisestimat</div>
      <h3>${leg.from} → ${leg.to}</h3>
      <p class="route-service">${leg.service} · ca. <strong>${formatMinutes(leg.durationMin)}</strong></p>
      ${fareHtml(leg)}
      ${compact?'':`<p class="small">Prisgrunnlaget ble kontrollert ${fmtLongDate(transport.asOf)}. Bekreft pris og billettregler før bestilling.</p>`}
      <a class="route-source-link" href="${leg.source}" target="_blank" rel="noopener">Pris-/rutegrunnlag ↗</a>
    </div>`;

  const detail=document.getElementById('route-detail');
  const showLegDetail=(leg) => {
    if(!detail || !leg) return;
    detail.hidden=false;
    detail.innerHTML=legHtml(leg);
  };
  const setMapDetail=(html)=>{
    if(!detail) return;
    detail.hidden=false;
    detail.innerHTML=html;
  };
  const contextualLinksFor=(subject,primaryHref,primaryLabel)=>{
    const stop=destinationStop(trip,subject);
    const links=[`<a href="${primaryHref}">${primaryLabel}</a>`];
    if(stop){
      links.push(`<a href="places.html?base=${encodeURIComponent(stop.id)}">Steder</a>`);
      if(food.some(x=>x.status!=='watch'&&destinationId(trip,x)===stop.id)) links.push(`<a href="food.html?base=${encodeURIComponent(stop.id)}">Mat</a>`);
      if(stop.nights>0 && (hotelsData.hotels||[]).some(x=>x.baseId===stop.id)) links.push(`<a href="hotels.html?base=${encodeURIComponent(stop.id)}">Overnatting</a>`);
    }
    return `<div class="route-context-links">${links.join('')}</div>`;
  };
  const showPlaceDetail=(p)=>{
    if(!p) return;
    setMapDetail(`<div class="route-detail-content route-selected-content destination-themed" style="${themeStyle(destinationTheme(trip,p))}"><div class="meta">${p.type} · ${p.area}</div><h3>${p.name}</h3><p><strong>${p.simple}</strong></p><p class="small">${p.why}</p>${placePriceSummaryHtml(p,trip,fx)}${contextualLinksFor(p,`place.html?id=${encodeURIComponent(p.id)}`,'Se stedet')}</div>`);
  };
  const showFoodDetail=(x)=>{
    if(!x) return;
    const price=Array.isArray(x.standardFamilyEstimateYen) ? familyFoodPrice(x) : '';
    setMapDetail(`<div class="route-detail-content route-selected-content destination-themed" style="${themeStyle(destinationTheme(trip,x))}"><div class="meta">${x.role} · ${x.area}</div><h3>${x.name}</h3><p><strong>${x.dish}</strong> · ${x.priority}</p>${price?`<p class="small">${planningPartyLabel(trip)}: ${price}</p>`:''}${contextualLinksFor(x,`restaurant.html?id=${encodeURIComponent(x.id)}`,'Se restauranten')}</div>`);
  };
  const showHotelDetail=(x)=>{
    if(!x) return;
    const price=hotelFamilyPrice(x);
    setMapDetail(`<div class="route-detail-content route-selected-content destination-themed" style="${themeStyle(destinationTheme(trip,x.baseId))}"><div class="meta">${x.tier} · ${hotelsData.bases.find(b=>b.baseId===x.baseId)?.label||x.area}</div><h3>${x.name}</h3><p><strong>${x.familyOption}</strong></p>${price?`<p class="small">Familieestimat per natt: ${price}</p>`:''}${contextualLinksFor(x,`hotel.html?id=${encodeURIComponent(x.id)}`,'Se overnattingen')}</div>`);
  };
  const showStopDetail=(stop,p)=>{
    if(!stop||!p) return;
    const nextLeg=nextLegByRouteId.get(stop.id);
    setMapDetail(`<div class="route-detail-content route-selected-content destination-themed" style="${themeStyle(destinationTheme(trip,stop))}"><div class="meta">Rutestopp</div><h3>${p.name}</h3><p><strong>${stop.label}</strong> · ${fmtDate(stop.from)}${stop.nights>0?`–${fmtDate(stop.to)} · ${stop.nights} ${stop.nights===1?'natt':'netter'}`:''}</p><p class="small">${stop.summary}</p>${routeContextLinksHtml(trip,stop,p,food,hotelsData)}${nextLeg?`<button class="route-inline-info" data-detail-leg="${nextLeg.id}">Neste etappe: ${formatMinutes(nextLeg.durationMin)} →</button>`:''}</div>`);
  };

  document.getElementById('window').textContent = trip.window;
  const routePlaces=trip.route.map(x=>places.find(p=>p.id===x.id)).filter(Boolean);
  const routeTitle=document.getElementById('route-title');
  if(routeTitle && routePlaces.length) routeTitle.textContent=`Fra ${routePlaces[0].name} til ${routePlaces.at(-1).name}`;
  const routeLogic=document.getElementById('route-transport-logic');
  if(routeLogic) routeLogic.textContent=transport.strategy||'';
  const stationNote=document.getElementById('station-note');
  if(stationNote) stationNote.textContent=`${transport.stationNote} Stoppmønsteret kan variere med konkret togavgang og fastsettes først når toget velges.`;
  document.getElementById('route-list').innerHTML = trip.route.map(x=>{
    const p=places.find(p=>p.id===x.id)||x;
    const img=p.image;
    const leg=nextLegByRouteId.get(x.id);
    return `<article class="route-item destination-themed" style="${themeStyle(destinationTheme(trip,x))}">
      ${img?`<div class="route-thumb-wrap"><a class="route-thumb-link" href="place.html?id=${encodeURIComponent(p.id)}" aria-label="Se ${p.name}"><img class="route-thumb" src="${img.url}" alt="" loading="lazy"></a>${imageCreditHtml(img,'image-credit-overlay image-credit-mini')}</div>`:''}
      <div class="route-item-main">
        <div class="route-item-top">
          <div class="date">${fmtDate(x.from)}${x.to!==x.from?` – ${fmtDate(x.to)}`:''}</div>
          <div class="nights">${x.nights===0?'Stopp':`${x.nights} ${x.nights===1?'natt':'netter'}`}</div>
        </div>
        <a class="route-item-title" href="place.html?id=${x.id}"><strong>${p.name}</strong></a>
        <div class="route-item-copy"><span>${x.label}</span><p>${x.summary}</p></div>
        ${routeContextLinksHtml(trip,x,p,food,hotelsData)}
        ${leg?`<button class="route-inline-info" data-leg="${leg.id}">Neste etappe: ${formatMinutes(leg.durationMin)} · ${dualFromJpy(scalePartyYen(leg.fare.standardFamilyYen,trip),fx)} for ${planningPartyShort(trip)}</button>`:''}
      </div>
    </article>`;
  }).join('');
  document.getElementById('route-list').addEventListener('click',e=>{
    const btn=e.target.closest('[data-leg]');
    if(btn) showLegDetail(legById.get(btn.dataset.leg));
  });
  detail?.addEventListener('click',e=>{
    const btn=e.target.closest('[data-detail-leg]');
    if(btn) showLegDetail(legById.get(btn.dataset.detailLeg));
  });

  const adultTotal=transport.legs.reduce((n,l)=>n+l.fare.adultYen,0);
  const childTotal=transport.legs.reduce((n,l)=>n+l.fare.childYen,0);
  const familyTotal=transport.legs.reduce((n,l)=>n+l.fare.standardFamilyYen,0)*partyMultiplier(trip);
  const summary=document.getElementById('map-price-summary');
  if(summary){
    summary.innerHTML=`<span>Etappene på kartet</span><strong>${dualFromJpy(familyTotal,fx)} for ${planningPartyShort(trip)}</strong><small>Voksen én vei summert: ${dualFromJpy(adultTotal,fx)} · Barn: ${dualFromJpy(childTotal,fx)} · ekskl. lokaltransport/dagsturer</small>`;
  }

  if (typeof maplibregl === 'undefined') {
    document.getElementById('map').innerHTML = '<div class="map-error"><strong>Kartet kunne ikke lastes.</strong><br>Oppdater siden eller prøv igjen senere.</div>';
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
  for(const x of trip.dayTrips){
    const p=places.find(p=>p.id===x.id);
    if(p?.map) routeBounds.extend([p.map.lng,p.map.lat]);
  }
  const fitRoute=()=>map.fitBounds(routeBounds,{padding:{top:55,right:80,bottom:55,left:55},maxZoom:7,duration:500});

  const popupForLeg=(leg,lngLat) => {
    showLegDetail(leg);
    new maplibregl.Popup({offset:10,maxWidth:'280px'})
      .setLngLat(lngLat)
      .setHTML(mapSelectionPopupHtml('Reiseetappe',`${leg.from} → ${leg.to}`,leg.toRouteId))
      .addTo(map);
  };

  const addRoutePart = (segment,index) => {
    const sourceId=`journey-${index}`;
    const leg=legById.get(segment.journeyId);
    const color=destinationColor(trip,leg?.toRouteId);
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
      paint:{'line-color':color,'line-width':5,'line-opacity':.95,'line-offset':segment.offset||0}
    });
    map.addLayer({
      id:`${sourceId}-hit`,type:'line',source:sourceId,
      layout:{'line-join':'round','line-cap':'round'},
      paint:{'line-color':'rgba(0,0,0,0)','line-width':18,'line-offset':segment.offset||0}
    });
    map.addLayer({
      id:`${sourceId}-arrows`,type:'symbol',source:sourceId,
      layout:{'symbol-placement':'line','symbol-spacing':95,'text-field':'›','text-size':18,'text-rotation-alignment':'map','text-keep-upright':false,'text-allow-overlap':true},
      paint:{'text-color':color,'text-halo-color':'#fff','text-halo-width':1.2}
    });
    map.on('click',`${sourceId}-hit`,e=>{ if(leg) popupForLeg(leg,e.lngLat); });
    map.on('mouseenter',`${sourceId}-hit`,()=>map.getCanvas().style.cursor='pointer');
    map.on('mouseleave',`${sourceId}-hit`,()=>map.getCanvas().style.cursor='');
  };

  const markerGroups={stations:[],experience:[],food:[],hotel:[]};
  const layerState={stations:false,experience:true,food:false,hotel:false};
  const routeContextIds=new Set([...trip.route.map(x=>x.id),...(trip.dayTrips||[]).map(x=>x.id)]);
  const mappablePlaces=places.filter(p=>!routeContextIds.has(p.id) && p.map?.showOnRouteMap!==false && Number.isFinite(p.map?.lat) && Number.isFinite(p.map?.lng));
  const mappableFood=food.filter(x=>x.status==='active' && x.map?.showOnRouteMap!==false && Number.isFinite(x.map?.lat) && Number.isFinite(x.map?.lng));
  const mappableHotels=hotelsData.hotels.filter(x=>x.map?.showOnRouteMap!==false && Number.isFinite(x.map?.lat) && Number.isFinite(x.map?.lng));

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
      const stationColors=[...new Set(s.memberships.map(m=>destinationColor(trip,m.leg.toRouteId)))];
      if(stationColors.length===1){
        el.style.background=stationColors[0];
      } else if(stationColors.length>1){
        const step=360/stationColors.length;
        el.style.background=`conic-gradient(${stationColors.map((c,i)=>`${c} ${Math.round(i*step)}deg ${Math.round((i+1)*step)}deg`).join(',')})`;
      }
      el.setAttribute('aria-label',`${s.name} stasjon`);
      const rows=s.memberships.map(m=>`<div class="station-time"><span>Fra ${m.leg.from}</span><strong>ca. ${formatMinutes(m.elapsedMin)}</strong></div>`).join('');
      const services=[...new Set(s.memberships.map(m=>m.leg.service))].join(' / ');
      const popup=new maplibregl.Popup({offset:12,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml('Knutepunkt',s.name));
      popup.on('open',()=>setMapDetail(`<div class="route-detail-content route-selected-content"><div class="meta">Knutepunkt</div><h3>${s.name}</h3>${rows}<p class="small">${services}</p></div>`));
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([s.lng,s.lat]).setPopup(popup);
      markerGroups.stations.push(marker);
      if(layerState.stations) marker.addTo(map);
    }
  };

  const categoryMeta={
    experience:{label:'Opplevelser',symbol:'★'},
    food:{label:'Mat',symbol:'●'},
    hotel:{label:'Overnatting',symbol:'H'}
  };

  const familyFoodPrice=(x)=>{
    if(!Array.isArray(x.standardFamilyEstimateYen)) return '';
    const [lo,hi]=scalePartyRange(x.standardFamilyEstimateYen,trip);
    return lo===hi ? dualFromJpy(lo,fx) : `${fmtJpy(lo)}–${fmtJpy(hi)} · ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))}`;
  };

  const addPoiMarkers=()=>{
    for(const p of mappablePlaces){
      const el=document.createElement('button');
      el.type='button';
      el.className='map-poi-dot experience';
      el.style.setProperty('--area-color',destinationColor(trip,p));
      el.textContent=categoryMeta.experience.symbol;
      el.setAttribute('aria-label',p.name);
      const popup=new maplibregl.Popup({offset:14,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(`${p.type} · ${p.area}`,p.name,p));
      popup.on('open',()=>showPlaceDetail(p));
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([p.map.lng,p.map.lat]).setPopup(popup);
      markerGroups.experience.push(marker);
      if(layerState.experience) marker.addTo(map);
    }

    for(const x of mappableFood){
      const el=document.createElement('button');
      el.type='button';
      el.className='map-poi-dot food';
      el.style.setProperty('--area-color',destinationColor(trip,x));
      el.textContent=categoryMeta.food.symbol;
      el.setAttribute('aria-label',x.name);
      const family=familyFoodPrice(x);
      const popup=new maplibregl.Popup({offset:14,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(`${x.role} · ${x.area}`,x.name,x));
      popup.on('open',()=>showFoodDetail(x));
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([x.map.lng,x.map.lat]).setPopup(popup);
      markerGroups.food.push(marker);
      if(layerState.food) marker.addTo(map);
    }
  };


  const hotelFamilyPrice=(x)=>{
    const [lo,hi]=scalePartyRange(x.standardFamilyNightYen,trip)||[];
    if(!Number.isFinite(lo)||!Number.isFinite(hi)) return '';
    return `${fmtJpy(lo)}–${fmtJpy(hi)} · ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))}`;
  };

  const addHotelMarkers=()=>{
    for(const x of mappableHotels){
      const el=document.createElement('button');
      el.type='button';
      el.className='map-poi-dot hotel';
      el.style.setProperty('--area-color',destinationColor(trip,x.baseId));
      el.textContent=categoryMeta.hotel.symbol;
      el.setAttribute('aria-label',x.name);
      const price=hotelFamilyPrice(x);
      const popup=new maplibregl.Popup({offset:14,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(`${x.tier} · ${hotelsData.bases.find(b=>b.baseId===x.baseId)?.label||x.area}`,x.name,x.baseId));
      popup.on('open',()=>showHotelDetail(x));
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([x.map.lng,x.map.lat]).setPopup(popup);
      markerGroups.hotel.push(marker);
      if(layerState.hotel) marker.addTo(map);
    }
  };

  const renderLayerToolbar=()=>{
    const toolbar=document.getElementById('map-layers');
    if(!toolbar) return;
    const counts={
      stations:new Set(transport.legs.flatMap(l=>l.stations.map(s=>s.name))).size,
      experience:mappablePlaces.length,
      food:mappableFood.length,
      hotel:mappableHotels.length
    };
    toolbar.innerHTML=`
      <span class="map-layer-title">Vis på kartet</span>
      <button class="map-layer-toggle stations" data-map-layer="stations" aria-pressed="false">Knutepunkter <b>${counts.stations}</b></button>
      <button class="map-layer-toggle experience" data-map-layer="experience" aria-pressed="true">Opplevelser <b>${counts.experience}</b></button>
      <button class="map-layer-toggle food" data-map-layer="food" aria-pressed="false">Mat <b>${counts.food}</b></button>
      <button class="map-layer-toggle hotel" data-map-layer="hotel" aria-pressed="false">Overnatting <b>${counts.hotel}</b></button>
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
        const color=destinationColor(trip,leg?.toRouteId);
        return `<button class="route-legend-item destination-themed" style="${themeStyle({color})}" type="button" data-leg="${s.journeyId}"><i></i><span><strong>${s.name}</strong><small>${leg?`ca. ${formatMinutes(leg.durationMin)} · ${dualFromJpy(scalePartyYen(leg.fare.standardFamilyYen,trip),fx)} (${planningPartyShort(trip)})`:s.modes.join(' + ')}</small></span></button>`;
      }).join('');
      legend.addEventListener('click',e=>{
        const btn=e.target.closest('[data-leg]');
        if(btn) showLegDetail(legById.get(btn.dataset.leg));
      });
    }

    trip.route.forEach((x,i)=>{
      const p=places.find(p=>p.id===x.id);
      if(!p) return;
      const el=document.createElement('button');
      el.type='button';
      el.className='map-stop destination-themed';
      el.style.setProperty('--area-color',destinationColor(trip,x));
      el.setAttribute('aria-label',`${i+1}. ${p.name}`);
      el.innerHTML=`<span class="map-pin">${i+1}</span><span class="map-place-label">${p.name}</span>`;
      const anchor=routeGeometry.stops?.[x.id]||[p.map.lng,p.map.lat];
      const popup=new maplibregl.Popup({offset:24,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(`Stopp ${i+1}`,p.name,x));
      popup.on('open',()=>showStopDetail(x,p));
      new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(anchor).setPopup(popup).addTo(map);
    });

    trip.dayTrips.forEach(x=>{
      const p=places.find(p=>p.id===x.id);
      const base=places.find(p=>p.id===x.baseId);
      if(!p?.map) return;
      const el=document.createElement('button');
      el.type='button';
      el.className='map-stop daytrip destination-themed';
      el.style.setProperty('--area-color',destinationColor(trip,x));
      el.setAttribute('aria-label',p.name);
      el.innerHTML=`<span class="map-pin"></span><span class="map-place-label">${p.name}</span>`;
      const popup=new maplibregl.Popup({offset:18,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(`Dagstur fra ${base?.name||x.baseId}`,p.name,p));
      popup.on('open',()=>showPlaceDetail(p));
      new maplibregl.Marker({element:el,anchor:'center'})
        .setLngLat([p.map.lng,p.map.lat])
        .setPopup(popup)
        .addTo(map);
    });

    addStationMarkers();
    addPoiMarkers();
    addHotelMarkers();
    renderLayerToolbar();
    fitRoute();
    startLocationWatch();
  });

  detail.hidden=false;
  detail.innerHTML=`<div class="route-detail-placeholder"><strong>Velg noe på kartet.</strong><span>Stopp, opplevelser, mat, overnatting og knutepunkter viser valgt innhold her. Velger du en rutelinje eller etappe, vises reisetid og pris.</span><small>${transport.childNote}</small></div>`;

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
  await applyPageCopy('places');
  nav('places'); footer();
  const [places,trip] = await Promise.all([json('data/places.json'),json('data/trip.json')]);
  const filters=document.getElementById('filters');
  const list=document.getElementById('places-grid');

  const draw=(destination='all')=>{
    const visible=places.filter(p=>destination==='all'||destinationId(trip,p)===destination);
    list.innerHTML=visible.map(p=>`
      <article class="place-list-card destination-themed" style="${themeStyle(destinationTheme(trip,p))}">
        ${entityMediaHtml({img:p.image,alt:p.name,area:p.area,type:p.type,trip,subject:p,variant:'list'})}
        <div class="place-list-copy">
          <a class="place-list-primary-link" href="place.html?id=${encodeURIComponent(p.id)}"><h3>${p.name}</h3></a>
          <strong>${p.simple}</strong>
          <p>${p.description}</p>
        </div>
        <span class="place-list-arrow" aria-hidden="true">→</span>
      </article>`).join('');
  };

  const initial=setupJourneyFilters(filters,trip,places,places,draw);
  draw(initial);
}
async function renderPlace() {
  nav('places'); footer();
  const [places,foodData,trip,prepData] = await Promise.all([json('data/places.json'),json('data/food.json'),json('data/trip.json'),json('data/prep.json')]);
  const food=foodData.restaurants||[];
  const id = new URLSearchParams(location.search).get('id');
  const p = places.find(x=>x.id===id);
  if(!p){
    document.title='Sted ikke funnet · Japan 2027';
    document.querySelector('main').innerHTML='<div class="eyebrow">Steder</div><h1>Stedet ble ikke funnet</h1><p><a href="places.html">← Tilbake til alle steder</a></p>';
    return;
  }

  document.querySelector('main')?.setAttribute('style',themeStyle(destinationTheme(trip,p)));
  document.querySelector('main')?.classList.add('destination-themed');
  document.title = `${p.name} · Japan 2027`;
  document.getElementById('area').textContent = `${p.area} · ${p.type}`;
  document.getElementById('name').textContent = p.name;
  document.getElementById('simple').textContent = p.simple;
  document.getElementById('description').textContent = p.description;
  document.getElementById('why').textContent = p.why;
  document.getElementById('highlights').innerHTML = p.highlights.map(x=>`<li>${x}</li>`).join('');
  const relatedPrep=prepData.flatMap(group=>group.items.map(item=>({...item,category:group.category}))).filter(item=>item.placeIds?.includes(p.id)).slice(0,5);
  document.getElementById('prep').innerHTML = relatedPrep.length
    ? relatedPrep.map(item=>`<li><strong>${item.title}</strong> <span class="small">· ${item.category}</span><br>${item.action}</li>`).join('')
    : '<li>Ingen særskilt forberedelse anbefalt.</li>';

  const img=p.image;
  if(img?.url){
    document.getElementById('place-photo').innerHTML = `<img src="${img.url}" alt="${img.alt||p.name}">${imageCreditHtml(img)}`;
  }

  document.getElementById('external-links').innerHTML = [...(p.links||[]).map(linkButton),mapsButton(p.name,p.area)].join('');

  const mapRoot=document.getElementById('place-map');
  if(mapRoot && p.map && Number.isFinite(p.map.lat) && Number.isFinite(p.map.lng)){
    if(typeof maplibregl==='undefined'){
      mapRoot.innerHTML=`<div class="map-error"><strong>Kartet kunne ikke lastes.</strong><br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+' '+p.area+' Japan')}" target="_blank" rel="noopener">Åpne i Google Maps ↗</a></div>`;
    } else {
      const map=new maplibregl.Map({
        container:'place-map',
        style:'https://tiles.openfreemap.org/styles/liberty',
        center:[p.map.lng,p.map.lat],
        zoom:p.type==='base'||p.type==='dagstur'?11.5:13.5,
        attributionControl:true
      });
      map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-left');
      const el=document.createElement('div');
      el.className='place-detail-marker';
      el.style.setProperty('--area-color',destinationColor(trip,p));
      el.setAttribute('aria-label',p.name);
      new maplibregl.Marker({element:el,anchor:'center'})
        .setLngLat([p.map.lng,p.map.lat])
        .setPopup(new maplibregl.Popup({offset:18}).setHTML(`<div class="map-popup destination-themed" style="${themeStyle(destinationTheme(trip,p))}"><div class="meta">${p.type} · ${p.area}</div><h3>${p.name}</h3><p>${p.simple}</p></div>`))
        .addTo(map);
      let mapErrorShown=false;
      map.on('error',()=>{
        if(mapErrorShown) return;
        mapErrorShown=true;
        const fallback=document.getElementById('place-map-fallback');
        if(fallback) fallback.hidden=false;
      });
    }
  } else if(mapRoot){
    mapRoot.innerHTML='<div class="map-error"><strong>Kartposisjon mangler.</strong></div>';
  }

  const activeFood=food.filter(x=>x.status==='active');
  const sameArea=activeFood.filter(x=>x.area===p.area);
  const sameDestination=activeFood.filter(x=>x.area!==p.area && destinationId(trip,x)===destinationId(trip,p));
  const related=[...sameArea,...sameDestination].slice(0,4);
  document.getElementById('nearby-food').innerHTML = related.length
    ? related.map(x=>relatedEntityCardHtml({href:`restaurant.html?id=${encodeURIComponent(x.id)}`,meta:`${x.role} · ${x.priority}`,title:x.name,subtitle:x.dish,trip,subject:x})).join('')
    : '<p class="small">Ingen kuraterte restaurantvalg i dette området.</p>';
}
async function renderPrep() {
  await applyPageCopy('prep');
  nav('prep'); footer();
  const prep=await json('data/prep.json');
  document.getElementById('prep-grid').innerHTML=prep.map(group=>`<section class="section prep-group"><div class="section-head"><div><div class="eyebrow">Før turen</div><h2>${group.category}</h2></div></div><div class="grid">${group.items.map(x=>`<article class="card prep-card"><div class="meta">${x.for}</div><h3>${x.title}</h3><p>${x.why}</p><strong>${x.action}</strong>${x.url?`<div class="button-row"><a class="button" href="${x.url}" target="_blank" rel="noopener">Les mer ↗</a></div>`:''}</article>`).join('')}</div></section>`).join('');
}

async function renderFood() {
  await applyPageCopy('food');
  nav('food'); footer();
  const [foodData,fx,trip,places]=await Promise.all([json('data/food.json'),loadFx(),json('data/trip.json'),json('data/places.json')]);
  const food=foodData.restaurants||[];
  const active=food.filter(x=>x.status!=='watch');
  const watch=food.filter(x=>x.status==='watch');
  const areaOrder=[...new Set(trip.route.flatMap(x=>x.theme?.areas||[]))];
  const filters=document.getElementById('food-filters');
  const list=document.getElementById('food-list');
  const order={'Må prøve':0,'Sterk kandidat':1,'Valgfri':2,'Følg med':3};

  const familyPrice=(x)=>{
    if(!Array.isArray(x.standardFamilyEstimateYen)) return 'Pris kommer';
    const [lo,hi]=x.standardFamilyEstimateYen;
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
    return bits.join('');
  };

  const row=(x)=>`<a class="food-index-row destination-themed" style="${themeStyle(destinationTheme(trip,x))}" href="restaurant.html?id=${encodeURIComponent(x.id)}">
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

  const draw=(destination='all')=>{
    const visible=active.filter(x=>destination==='all'||destinationId(trip,x)===destination);
    const groups=areaOrder.filter(area=>visible.some(x=>x.area===area));
    list.innerHTML=groups.map(group=>{
      const items=visible.filter(x=>x.area===group).sort((a,b)=>(order[a.priority]??9)-(order[b.priority]??9));
      return `<section class="food-area-group destination-themed" style="${themeStyle(destinationTheme(trip,group))}"><div class="food-area-head"><h2>${group}</h2><span>${items.length} ${items.length===1?'sted':'steder'}</span></div><div class="food-index-list">${items.map(row).join('')}</div></section>`;
    }).join('');
  };

  const initial=setupJourneyFilters(filters,trip,places,active,draw);
  const destinations=active.filter(x=>x.role==='Destinasjonsmåltid').length;
  const summary=document.getElementById('food-summary');
  if(summary) summary.innerHTML=`<strong>${active.length} kuraterte kandidater</strong><span>${destinations} destinasjonsmåltider · detaljene ligger ett klikk ned</span>`;

  const priceGuide=document.getElementById('food-price-guide');
  if(priceGuide){
    const bandText=(band)=>{
      const lo=band.minYen, hi=band.maxYen;
      if(Number.isFinite(lo)&&Number.isFinite(hi)) return `${fmtJpy(lo)}–${fmtJpy(hi)} · ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))}`;
      if(Number.isFinite(hi)) return `opptil ${fmtJpy(hi)} · ca. ${fmtNok(nokFromJpy(hi,fx))}`;
      if(Number.isFinite(lo)) return `over ${fmtJpy(lo)} · ca. ${fmtNok(nokFromJpy(lo,fx))}`;
      return '';
    };
    priceGuide.innerHTML=`<strong>Familiepris:</strong>${(foodData.priceBands||[]).map(b=>`<span><b>${b.label}</b> ${bandText(b)}</span>`).join('')}`;
  }
  const planningNotes=document.getElementById('food-planning-notes');
  if(planningNotes){
    const placeById=new Map(places.map(p=>[p.id,p]));
    planningNotes.innerHTML=(foodData.planningNotes||[]).map(note=>{
      const place=note.placeId?placeById.get(note.placeId):null;
      return `<article class="card ${place?'destination-themed':''}" ${place?`style="${themeStyle(destinationTheme(trip,place))}"`:''}><div class="eyebrow">${place?.name||note.label||''}</div><h2>${note.title}</h2><p>${note.body}</p></article>`;
    }).join('');
  }

  const watchlist=document.getElementById('food-watchlist');
  if(watchlist){
    watchlist.innerHTML=watch.length?watch.map(x=>`<a class="food-watch-card" href="restaurant.html?id=${encodeURIComponent(x.id)}"><div><span class="food-role">${x.role}</span><h3>${x.name}</h3><strong>${x.dish}</strong><p>${x.why}</p></div><span class="food-index-arrow" aria-hidden="true">→</span></a>`).join(''):'';
  }
  const fxNote=document.getElementById('food-fx-note');
  if(fxNote){
    const ratingDate=active.find(x=>x.ratings?.checked)?.ratings?.checked;
    fxNote.textContent=`Familieprisene er planestimater. ${fxStatusText(fx)} ${fmtLongDate(fx.asOf)} brukes i alle omregninger.${ratingDate?` Restaurantvurderinger kontrollert ${fmtLongDate(ratingDate)}.`:''}`;
  }
  draw(initial);
}

async function renderRestaurant() {
  nav('food'); footer();
  const [foodData,fx,trip]=await Promise.all([json('data/food.json'),loadFx(),json('data/trip.json')]);
  const food=foodData.restaurants||[];
  const id=new URLSearchParams(location.search).get('id');
  const x=food.find(item=>item.id===id);
  if(!x){
    document.title='Restaurant ikke funnet · Japan 2027';
    document.querySelector('main').innerHTML='<div class="eyebrow">Mat</div><h1>Restaurant ikke funnet</h1><p class="lede">Denne restaurant-ID-en finnes ikke i den kuraterte listen.</p><p><a href="food.html">← Tilbake til matoversikten</a></p>';
    return;
  }

  document.title=`${x.name} · Japan 2027`;
  document.querySelector('main')?.setAttribute('style',themeStyle(destinationTheme(trip,x)));
  document.querySelector('main')?.classList.add('destination-themed');
  document.getElementById('restaurant-area').textContent=`${x.area} · ${x.role}`;
  document.getElementById('restaurant-name').textContent=x.name;
  document.getElementById('restaurant-dish').textContent=x.dish;
  document.getElementById('restaurant-priority').innerHTML=priorityBadge(x.priority);
  document.getElementById('restaurant-why').textContent=x.why;
  document.getElementById('restaurant-fit').textContent=x.fit;
  document.getElementById('restaurant-price-class').textContent=x.priceClass;

  const price=document.getElementById('restaurant-family-price');
  if(Array.isArray(x.standardFamilyEstimateYen)){
    const [lo,hi]=x.standardFamilyEstimateYen;
    const yen=lo===hi?fmtJpy(lo):`${fmtJpy(lo)}–${fmtJpy(hi)}`;
    const nokLo=fmtNok(nokFromJpy(lo,fx));
    const nokHi=fmtNok(nokFromJpy(hi,fx));
    const nok=lo===hi?nokLo:`${nokLo}–${nokHi}`;
    price.innerHTML=`<strong>${yen}</strong><small>ca. ${nok}</small>`;
  } else {
    const panel=price.closest('.restaurant-price-panel');
    if(panel) panel.hidden=true;
  }

  document.getElementById('restaurant-price-basis').textContent=x.priceBasis||'';
  document.getElementById('restaurant-booking').textContent=x.booking||'';
  document.getElementById('restaurant-note').textContent=x.note||'';
  document.getElementById('restaurant-fx-note').textContent=`NOK-estimatet bruker ${fxStatusText(fx).toLowerCase()} fra ${fmtLongDate(fx.asOf)}.`;

  const img=document.getElementById('restaurant-image');
  if(x.image){
    img.hidden=false;
    img.innerHTML=`<img src="${x.image.url}" alt="${x.image.alt||x.name}" loading="eager">${imageCreditHtml(x.image)}`;
  } else {
    img.hidden=true;
  }

  const ratings=document.getElementById('restaurant-ratings');
  const ratingCard=(label,r)=>{
    if(!r?.score || !r?.url) return '';
    const count=r.count ? `${r.approximateCount?'ca. ':''}${new Intl.NumberFormat('nb-NO').format(r.count)} anmeldelser` : '';
    return `<a class="rating-card" href="${r.url}" target="_blank" rel="noopener"><span>${label}</span><strong>${r.score.toFixed(1)} / 5</strong><small>${count}</small></a>`;
  };
  const ratingCards=[
    ratingCard('Google',x.ratings?.google),
    ratingCard('Tripadvisor',x.ratings?.tripadvisor)
  ].filter(Boolean);
  ratings.innerHTML=ratingCards.join('');
  const ratingsSection=document.getElementById('restaurant-ratings-section');
  if(ratingsSection) ratingsSection.hidden=ratingCards.length===0;
  document.getElementById('restaurant-ratings-note').textContent=x.ratings?.checked?`Kontrollert ${fmtLongDate(x.ratings.checked)}. Vurderinger kan endre seg.`:'';

  const orderEl=document.getElementById('restaurant-order');
  const orderRecs=x.orderRecommendations||[];
  orderEl.innerHTML=orderRecs.length
    ? orderRecs.map((r,i)=>`<article class="order-card"><span>${i+1}</span><div><h3>${r.title}</h3><p>${r.why}</p></div></article>`).join('')
    : '<p class="small">Ingen særskilt bestillingsanbefaling.</p>';

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
    ? alternatives.map(item=>relatedEntityCardHtml({href:`restaurant.html?id=${encodeURIComponent(item.id)}`,meta:item.role,title:item.name,subtitle:item.dish,trip,subject:item})).join('')
    : '<p class="small">Ingen andre aktive kandidater i dette området.</p>';
}

async function renderHotels() {
  await applyPageCopy('hotels');
  nav('hotels'); footer();
  const [data,trip,places,fx]=await Promise.all([json('data/hotels.json'),json('data/trip.json'),json('data/places.json'),loadFx()]);
  const hotels=data.hotels;
  const typeById=new Map((data.accommodationTypes||[]).map(x=>[x.id,x]));
  const tierOrder={'Verdi':0,'Mellomklasse':1,'Mellomklasse+':2,'Premium':3,'Splurge':4,'Splurge-opplevelse':4};
  let activeBase='all', activeKind='all';

  const price=(x)=>{
    const [lo,hi]=x.standardFamilyNightYen;
    return `<strong>${fmtJpy(lo)}–${fmtJpy(hi)}</strong><small>ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))} / natt</small>`;
  };
  const plannedNights=(x)=>Number.isFinite(x.recommendedNights)?x.recommendedNights:(trip.route.find(r=>r.id===x.baseId)?.nights||1);
  const totalPrice=(x)=>{
    const nights=plannedNights(x), [lo,hi]=x.standardFamilyNightYen;
    return `${fmtJpy(lo*nights)}–${fmtJpy(hi*nights)} · ca. ${fmtNok(nokFromJpy(lo*nights,fx))}–${fmtNok(nokFromJpy(hi*nights,fx))}`;
  };
  const card=(x)=>`<a class="hotel-index-card destination-themed" style="${themeStyle(destinationTheme(trip,x.baseId))}" href="hotel.html?id=${encodeURIComponent(x.id)}">
    <div class="hotel-index-top"><div><span class="hotel-tier">${x.tier}</span><span class="stay-kind">${typeById.get(x.kind)?.label||x.kind}</span></div><span class="hotel-rating">${x.rating?.score?`${x.rating.platform} ${x.rating.score.toFixed(1)}`:''}</span></div>
    <h3>${x.name}</h3>
    <p class="hotel-family">${x.familyOption}</p>
    <div class="hotel-index-price"><span>${planningPartyLabel(trip)}</span>${price(x)}</div>
    <p class="hotel-logistics">${x.logistics}</p>
    <div class="hotel-total"><span>${plannedNights(x)} ${plannedNights(x)===1?'natt':'netter'} i planen</span><strong>${totalPrice(x)}</strong></div>
  </a>`;

  const draw=()=>{
    const root=document.getElementById('hotel-bases');
    root.innerHTML=data.bases.filter(base=>activeBase==='all'||base.baseId===activeBase).map(base=>{
      const items=hotels.filter(x=>x.baseId===base.baseId && (activeKind==='all'||x.kind===activeKind)).sort((a,b)=>(tierOrder[a.tier]??9)-(tierOrder[b.tier]??9));
      if(!items.length) return '';
      return `<section class="hotel-base destination-themed" style="${themeStyle(destinationTheme(trip,base.baseId))}">
        <div class="section-head hotel-base-head"><div><div class="eyebrow">${base.label}</div><h2>${base.strategy}</h2></div><p>${base.why}</p></div>
        <div class="hotel-grid">${items.map(card).join('')}</div>
      </section>`;
    }).join('');
  };

  activeBase=setupJourneyFilters(document.getElementById('stay-base-filters'),trip,places,hotels,value=>{activeBase=value;draw();},{overnightOnly:true,param:'base'});
  const availableKinds=(data.accommodationTypes||[]).filter(t=>hotels.some(h=>h.kind===t.id)).map(t=>({value:t.id,label:t.label}));
  const requestedKind=new URLSearchParams(location.search).get('type')||'all';
  activeKind=setupChoiceFilters(document.getElementById('stay-kind-filters'),availableKinds,value=>{activeKind=value;draw();},{initialValue:requestedKind});

  document.getElementById('stay-types').innerHTML=(data.accommodationTypes||[]).map(t=>`<article class="stay-type-card"><span>${hotels.filter(h=>h.kind===t.id).length||'—'} ${hotels.some(h=>h.kind===t.id)?'kandidater':'sammenligningsspor'}</span><h3>${t.label}</h3><p>${t.description}</p>${t.source?`<a href="${t.source}" target="_blank" rel="noopener">Regelgrunnlag ↗</a>`:''}</article>`).join('');
  document.getElementById('stay-party-note').textContent=data.partyBasis ? `Planleggingsgrunnlag: ${planningPartyLabel(trip)}. ${data.partyBasis}` : '';

  const cheapestByBase=trip.route.filter(r=>r.nights>0).map(stop=>{
    const candidates=hotels.filter(h=>h.baseId===stop.id);
    return candidates.sort((a,b)=>((a.standardFamilyNightYen[0]+a.standardFamilyNightYen[1])/2)-((b.standardFamilyNightYen[0]+b.standardFamilyNightYen[1])/2))[0];
  }).filter(Boolean);
  const low=cheapestByBase.reduce((sum,h)=>sum+h.standardFamilyNightYen[0]*plannedNights(h),0);
  const high=cheapestByBase.reduce((sum,h)=>sum+h.standardFamilyNightYen[1]*plannedNights(h),0);
  document.getElementById('stay-cost-summary').innerHTML=`<span>Prisgrep med rimeligste listede kandidat per base</span><strong>${fmtJpy(low)}–${fmtJpy(high)} · ca. ${fmtNok(nokFromJpy(low,fx))}–${fmtNok(nokFromJpy(high,fx))}</strong><small>Planestimat for hele oppholdet; ikke et pristilbud.</small>`;

  document.getElementById('stay-alternatives').innerHTML=(data.alternativeExamples||[]).map(x=>`<a class="stay-alt-card destination-themed" style="${themeStyle(destinationTheme(trip,x.baseId))}" href="${x.url}" target="_blank" rel="noopener"><span>${typeById.get(x.kind)?.label||x.kind}</span><h3>${x.name}</h3><p>${x.description}</p><strong>Offisiell side ↗</strong></a>`).join('');

  document.getElementById('hotel-price-note').textContent=`${data.priceNote} NOK-omregningen bruker ${fxStatusText(fx).toLowerCase()} fra ${fmtLongDate(fx.asOf)}.`;
  draw();
}

async function renderHotel() {
  nav('hotels'); footer();
  const [data,trip,fx]=await Promise.all([json('data/hotels.json'),json('data/trip.json'),loadFx()]);
  const id=new URLSearchParams(location.search).get('id');
  const x=data.hotels.find(h=>h.id===id);
  if(!x){
    document.querySelector('main').innerHTML='<div class="eyebrow">Overnatting</div><h1>Overnattingen ble ikke funnet</h1><p><a href="hotels.html">← Tilbake til overnattingsoversikten</a></p>';
    return;
  }
  const base=data.bases.find(b=>b.baseId===x.baseId);
  const routeStop=trip.route.find(r=>r.id===x.baseId);
  const nights=Number.isFinite(x.recommendedNights)?x.recommendedNights:(routeStop?.nights||1);
  const [lo,hi]=x.standardFamilyNightYen;
  document.title=`${x.name} · Japan 2027`;
  const main=document.querySelector('main');
  main?.setAttribute('style',themeStyle(destinationTheme(trip,x.baseId)));
  main?.classList.add('destination-themed');
  const kindLabel=(data.accommodationTypes||[]).find(t=>t.id===x.kind)?.label||x.kind;
  document.getElementById('hotel-area').textContent=`${base?.label||x.area} · ${kindLabel} · ${x.tier}`;
  document.getElementById('hotel-name').textContent=x.name;
  document.getElementById('hotel-family').textContent=x.familyOption;
  document.getElementById('hotel-why').textContent=x.why;
  document.getElementById('hotel-logistics').textContent=x.logistics;
  document.getElementById('hotel-tradeoff').textContent=x.tradeoff;
  document.getElementById('hotel-base-logic').textContent=base?.why||'';
  document.getElementById('hotel-price-night').innerHTML=`<strong>${fmtJpy(lo)}–${fmtJpy(hi)}</strong><small>ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))}</small>`;
  document.getElementById('hotel-price-stay').innerHTML=`<strong>${fmtJpy(lo*nights)}–${fmtJpy(hi*nights)}</strong><small>ca. ${fmtNok(nokFromJpy(lo*nights,fx))}–${fmtNok(nokFromJpy(hi*nights,fx))} · ${nights} ${nights===1?'natt':'netter'}</small>`;
  document.getElementById('hotel-price-note').textContent=data.priceNote;
  const rating=document.getElementById('hotel-rating');
  if(x.rating?.score){
    rating.innerHTML=`<strong>${x.rating.score.toFixed(1)} / 5</strong><span>${x.rating.platform}${x.rating.count?` · ${new Intl.NumberFormat('nb-NO').format(x.rating.count)} anmeldelser`:''}</span><small>Kontrollert ${fmtLongDate(x.rating.checked)}.</small>`;
  } else rating.hidden=true;
  const links=[
    x.links?.official?`<a class="button primary" href="${x.links.official}" target="_blank" rel="noopener">Offisiell side ↗</a>`:'',
    x.links?.booking?`<a class="button" href="${x.links.booking}" target="_blank" rel="noopener">Booking ↗</a>`:'',
    x.links?.googleMaps?`<a class="button" href="${x.links.googleMaps}" target="_blank" rel="noopener">Google Maps ↗</a>`:''
  ].filter(Boolean);
  document.getElementById('hotel-links').innerHTML=links.join('');
  const alternatives=data.hotels.filter(h=>h.baseId===x.baseId&&h.id!==x.id);
  document.getElementById('hotel-alternatives').innerHTML=alternatives.map(h=>relatedEntityCardHtml({href:`hotel.html?id=${encodeURIComponent(h.id)}`,meta:h.tier,title:h.name,subtitle:h.familyOption,trip,subject:h.baseId})).join('');
}


async function renderPractical() {
  await applyPageCopy('practical');
  nav('practical'); footer();
  const [guide,places]=await Promise.all([json('data/guide.json'),json('data/places.json')]);
  document.getElementById('transport-grid').innerHTML=guide.transport.map(x=>`<article class="card transport-card"><div class="transport-icon">${x.icon}</div><h3>${x.title}</h3><strong>${x.short}</strong><p>${x.body}</p><div class="button-row">${x.links.map(l=>`<a class="button" href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`).join('')}</div></article>`).join('');
  document.getElementById('booking-radar').innerHTML=guide.bookingRadar.map(x=>{
    const p=places.find(p=>p.id===x.placeId);
    const link=placePrimaryLink(p);
    return `<article class="booking-row">${priorityBadge(x.priority)}<div><strong>${p?.name||x.placeId}</strong><span>${p?.area||''} · ${x.when}</span><p>${x.why}</p></div>${link?`<a href="${link.url}" target="_blank" rel="noopener">${link.label} ↗</a>`:''}</article>`;
  }).join('');
  document.getElementById('place-words').innerHTML=guide.placeWords.map(x=>`<div class="glossary-row"><strong>${x.term}</strong><span>${x.meaning}</span></div>`).join('');
  document.getElementById('phrases').innerHTML=guide.phrases.map(x=>`<div class="glossary-row"><strong>${x.jp}</strong><span>${x.no}</span></div>`).join('');
  document.getElementById('name-notes').innerHTML=guide.nameNotes.map(x=>`<article class="mini-card"><h3>${x.name}</h3><p>${x.note}</p></article>`).join('');
  document.getElementById('etiquette').innerHTML=guide.etiquette.map(x=>`<article class="mini-card"><h3>${x.title}</h3><p>${x.body}</p></article>`).join('');
}

async function renderBudget() {
  await applyPageCopy('budget');
  nav('budget'); footer();
  const [trip,fx] = await Promise.all([json('data/trip.json'),loadFx()]);
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
    `Budsjettet er primært i NOK. JPY ved siden av beregnes med ${fxStatusText(fx).toLowerCase()} fra ${fmtLongDate(fx.asOf)}.`;
}

async function renderSources() {
  await applyPageCopy('sources');
  nav(''); footer();
  const sources = await json('data/sources.json');
  document.getElementById('sources-grid').innerHTML = sources.map(s=>`<article class="card"><h3><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a></h3><p>${s.use}</p></article>`).join('');
}

function initPrivacy(){ nav(''); footer(); }
