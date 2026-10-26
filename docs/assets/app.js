const reiseDag = (n) => `Dag ${n}`;
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
  const preferred=JapanState.getSelection({
    param:'party',values:scenarios.map(x=>x.id),
    defaultValue:trip.priceParties?.defaultScenarioId||scenarios[0].id,
    storageKey:JapanState.keys.party
  });
  return scenarios.find(x=>x.id===preferred) || scenarios[0];
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
  if(price.status==='pending') return {primary:'Pris ikke publisert',secondary:''};
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
    JapanState.setSelection({
      param:'party',value:btn.dataset.party,values:config.scenarios.map(x=>x.id),
      defaultValue:config.defaultScenarioId||'one-family',
      storageKey:JapanState.keys.party,navigate:true
    });
  });
  const main=document.querySelector('main');
  const detailHero=main?.querySelector('.detail-hero,.restaurant-detail-hero,.hotel-detail-hero');
  if(detailHero) detailHero.insertAdjacentElement('beforebegin',root);
  else {
    const anchor=main?.querySelector('.home-hero,.lede') || main?.firstElementChild;
    if(anchor) anchor.insertAdjacentElement('afterend',root);
  }
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

const fxStatusText=(fx)=>fx.live?'Siste ECB-referansekurs (virkedager)':'Lagret ECB-fallback';

const escapeSiteHtml=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
/* The same topic metadata feeds page cards and the global menu. */
function languageTopics(guide,copy) {
  const groups=[...(guide.morePhrases||[])].sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured)));
  return [
    ...groups.map(group=>({slug:group.slug,title:group.category,intro:group.intro,count:group.items.length,group})),
    {slug:'ord',title:copy.wordsTitle,intro:copy.wordsIntro,count:guide.placeWords.filter(x=>x.showInGuide!==false).length,kind:'words'},
    {slug:'navn',title:copy.namesTitle,intro:copy.namesIntro,count:guide.nameNotes.length,kind:'names'}
  ];
}

function nav(active='', sources={}, leaf=null) {
  const mount=async()=>{
    pagesPromise ||= json('data/pages.json');
    const pages=await pagesPromise;
    const config=pages.navigation;
    if(!config)return;
    const sections=config.sections.map(section=>({...section,items:[...(section.items||[])]}));
    /* Adapters describe data shapes, never individual menu entries.
       Only the active section is prefetched; other menus load on first opening. */
    const adapters={
      prep:{
        path:'data/prep.json',
        entries:data=>data.map(group=>({
          label:group.navLabel||group.category,
          href:'prep.html?topic='+encodeURIComponent(group.slug),
          key:'prep-'+group.slug
        }))
      },
      language:{
        path:'data/guide.json',
        entries:data=>languageTopics(data,pages.language).map(topic=>({
          label:topic.title,
          href:'language.html?topic='+encodeURIComponent(topic.slug),
          key:'language-'+topic.slug
        }))
      }
    };
    const expand=async section=>{
      if(!section.source||section.expanded)return;
      const adapter=adapters[section.source];
      if(!adapter)throw new Error('Ukjent menykilde: '+section.source);
      const data=sources[section.source]||await json(adapter.path);
      section.items.push(...adapter.entries(data));
      section.expanded=true;
    };
    const activeSource=sections.find(section=>section.source &&
      (active===section.source || active.startsWith(section.source+'-')));
    if(activeSource&&sources[activeSource.source])await expand(activeSource);
    const header=document.querySelector('header');
    const navLink=item=>'<a href="'+escapeSiteHtml(item.href)+'"'+
      (active===item.key?' aria-current="page"':'')+'>'+escapeSiteHtml(item.label)+'</a>';
    const groupItems=section=>section.items.map(navLink).join('');
    const sectionHtml=(section,index)=>{
      if(section.href)return '<a class="nav-direct" href="'+escapeSiteHtml(section.href)+'"'+
        (active===section.key?' aria-current="page"':'')+'>'+escapeSiteHtml(section.label)+'</a>';
      const selected=section.items.some(item=>item.key===active);
      return '<details class="nav-group" data-section-index="'+index+'"'+
        (selected?' data-selected="true"':'')+
        '><summary>'+escapeSiteHtml(section.label)+'<span aria-hidden="true">⌄</span></summary>'+
        '<div class="nav-menu">'+groupItems(section)+'</div></details>';
    };
    header.innerHTML='<div class="nav"><a class="brand" href="index.html"><span class="brand-mark">日</span> Japan 2027</a>'+
      '<button type="button" class="mobile-nav-toggle" aria-expanded="false" aria-controls="site-navigation">☰ Meny</button>'+
      '<nav class="site-navigation" id="site-navigation" aria-label="Hovednavigasjon">'+sections.map(sectionHtml).join('')+'</nav>'+
      '<button class="site-search-button" type="button" aria-label="Søk i Japan 2027">⌕ Søk</button></div>';
    const mobile=header.querySelector('.mobile-nav-toggle'),menu=header.querySelector('#site-navigation');
    mobile.addEventListener('click',()=>{
      const opening=mobile.getAttribute('aria-expanded')!=='true';
      mobile.setAttribute('aria-expanded',String(opening));menu.classList.toggle('expanded',opening);
    });
    header.querySelectorAll('.nav-group').forEach(group=>{
      group.addEventListener('toggle',async()=>{
        if(!group.open)return;
        header.querySelectorAll('.nav-group').forEach(other=>{if(other!==group)other.open=false;});
        const section=sections[Number(group.dataset.sectionIndex)];
        if(!section?.source||section.expanded)return;
        const root=group.querySelector('.nav-menu');
        group.setAttribute('aria-busy','true');
        try{
          await expand(section);
          if(!group.isConnected)return;
          root.innerHTML=groupItems(section);
        }catch(err){
          console.warn('Undermeny kunne ikke lastes',err);
          if(group.isConnected)root.insertAdjacentHTML('beforeend','<span class="nav-menu-loading">Temaene kunne ikke lastes.</span>');
        }finally{
          if(group.isConnected)group.removeAttribute('aria-busy');
        }
      });
    });
    header.querySelector('.site-search-button').addEventListener('click',()=>openSiteSearch());
    document.addEventListener('keydown',e=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSiteSearch();}
      if(e.key==='Escape'){
        header.querySelectorAll('.nav-group').forEach(g=>g.open=false);
        menu.classList.remove('expanded');mobile.setAttribute('aria-expanded','false');
      }
    });
    document.addEventListener('click',e=>{
      if(!header.contains(e.target))header.querySelectorAll('.nav-group').forEach(g=>g.open=false);
    });
    const pageName=location.pathname.split('/').pop()||'index.html';
    const links=[{label:'Japan 2027',href:'index.html'}];
    const group=sections.find(section=>section.items?.some(item=>item.key===active));
    const candidate=group?.items.find(item=>item.key===active)||
      sections.find(section=>section.key===active && section.href);
    if(group){
      const onLanding=Boolean(group.landingHref && candidate?.href===group.landingHref);
      links.push({label:group.label,href:onLanding?null:group.landingHref||null});
      if(!onLanding&&candidate)links.push({label:candidate.label,href:candidate.href});
    }else if(candidate&&active!=='home'){
      links.push({label:candidate.label,href:candidate.href});
    }
    const params=new URLSearchParams(location.search);
    const type=pageName==='place.html'?'place':pageName==='restaurant.html'?'restaurant':pageName==='hotel.html'?'hotel':null;
    if(type&&params.get('id')){
      const src=type==='place'?'data/places.json':type==='restaurant'?'data/food.json':'data/hotels.json';
      try{
        const data=await json(src),items=type==='place'?data:type==='restaurant'?data.restaurants:data.hotels;
        const record=items.find(x=>x.id===params.get('id'));
        if(record){
          try{
            const [route,allPlaces]=await Promise.all([json('data/trip.json'),type==='place'?Promise.resolve(items):json('data/places.json')]);
            const baseId=type==='hotel'?record.baseId:destinationId(route,record);
            const base=allPlaces.find(x=>x.id===baseId);
            if(base&&base.id!==record.id)links.push({label:base.name,href:'place.html?id='+encodeURIComponent(base.id)});
          }catch{}
          links.push({label:record.name,href:null});
        }
      }catch{}
    }
    if(leaf?.label)links.push({label:leaf.label,href:null});
    const existing=document.querySelector('.site-breadcrumb');if(existing)existing.remove();
    if(links.length>1){
      const breadcrumbs=document.createElement('nav');
      breadcrumbs.className='site-breadcrumb';breadcrumbs.setAttribute('aria-label','Navigasjonssti');
      breadcrumbs.innerHTML=links.map((item,index)=>{
        const prefix=index?'<span aria-hidden="true">›</span>':'';
        if(index===links.length-1)return prefix+'<strong aria-current="page">'+escapeSiteHtml(item.label)+'</strong>';
        return prefix+(item.href?'<a href="'+escapeSiteHtml(item.href)+'">'+escapeSiteHtml(item.label)+'</a>':
          '<span>'+escapeSiteHtml(item.label)+'</span>');
      }).join('');
      document.querySelector('main')?.prepend(breadcrumbs);
    }
  };
  mount().catch(err=>console.warn('Navigasjon kunne ikke lastes',err));
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
const installMapLoadFallback=(map,{onFatal,onReady=()=>{},graceMs=6000})=>{
  let ready=false;
  let timer=null;
  let fallbackShown=false;
  const clearTimer=()=>{
    if(timer){
      clearTimeout(timer);
      timer=null;
    }
  };
  const styleIsUsable=()=>{
    if(map.isStyleLoaded?.()) return true;
    const style=map.getStyle?.();
    return Boolean(style?.layers?.length);
  };
  const markReady=()=>{
    if(ready) return;
    ready=true;
    clearTimer();
    if(fallbackShown){
      fallbackShown=false;
      onReady();
    }
  };
  map.once('load',markReady);
  map.on('styledata',()=>{
    if(styleIsUsable()) markReady();
  });
  map.on('error',(event)=>{
    console.warn('Kartressursfeil',event?.error||event);
    if(ready || styleIsUsable()){
      markReady();
      return;
    }
    clearTimer();
    timer=setTimeout(()=>{
      if(ready || styleIsUsable()){
        markReady();
        return;
      }
      fallbackShown=true;
      onFatal();
    },graceMs);
  });
};

const imageLicenseHtml=(img)=>img?.licenseUrl
  ? `<a href="${img.licenseUrl}" target="_blank" rel="license noopener">${img.license}</a>`
  : (img?.license||'');
const imageCreditHtml=(img,cls='image-credit-overlay')=>{
  if(!img) return '';
  if(img.type==='ai'){
    return `<span class="${cls} ai-media-label" role="note">KI-generert illustrasjon</span>`;
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
  root.innerHTML=all.map(x=>`<button class="${x.value===selected?'active':''} ${x.theme?'destination-filter':''}" ${x.theme?`style="${themeStyle(x.theme)}"`:''} data-filter-value="${x.value}" type="button" aria-pressed="${String(x.value===selected)}">${x.label}</button>`).join('');
  root.addEventListener('click',e=>{
    const btn=e.target.closest('button[data-filter-value]');
    if(!btn) return;
    [...root.querySelectorAll('button')].forEach(b=>{
      b.classList.toggle('active',b===btn);
      b.setAttribute('aria-pressed',String(b===btn));
    });
    onChange(btn.dataset.filterValue);
  });
  return selected;
}

// Shared travel base context, but page-specific filters are URL-only.
function selectedJourneyBase(trip,{param='base'}={}) {
  return JapanState.getSelection({
    param,values:['all',...trip.route.map(stop=>stop.id)],
    storageKey:JapanState.keys.base
  });
}
function selectJourneyBase(trip,value,{param='base'}={}) {
  return JapanState.setSelection({
    param,value,values:['all',...trip.route.map(stop=>stop.id)],
    storageKey:JapanState.keys.base
  });
}
function setupUrlFilters(root,options,onChange,{param,allLabel='Alle',defaultValue='all'}={}) {
  const values=[defaultValue,...options.map(x=>x.value)];
  const initial=JapanState.getSelection({param,values,defaultValue});
  return setupChoiceFilters(root,options,value=>{
    JapanState.setSelection({param,value,values,defaultValue});
    onChange(value);
  },{allLabel,initialValue:initial});
}

function setupJourneyFilters(root,trip,places,subjects,onChange,{overnightOnly=false,param='base'}={}) {
  const placeById=new Map(places.map(p=>[p.id,p]));
  const stops=trip.route.filter(stop=>{
    if(overnightOnly && stop.nights<=0) return false;
    return subjects.some(subject=>destinationId(trip,subject)===stop.id);
  });
  const requested=selectedJourneyBase(trip,{param});
  return setupChoiceFilters(root,stops.map(stop=>({
    value:stop.id,
    label:stop.filterLabel||placeById.get(stop.id)?.name||stop.id,
    theme:stop.theme
  })),value=>{
    selectJourneyBase(trip,value,{param});
    onChange(value);
  },{initialValue:requested});
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

async function renderFlightGuide() {
  await applyPageCopy('flights');
  nav('flights'); footer();
  const data=await json('data/flights.json');
  const escapeHtml=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const patterns=document.getElementById('flight-pattern-list');
  const detail=document.getElementById('flight-pattern-detail');
  const setPattern=(id)=>{
    const x=data.examples.find(item=>item.id===id)||data.examples[0];
    if(!x)return;
    patterns.querySelectorAll('[data-pattern-id]').forEach(button=>{
      const active=button.dataset.patternId===x.id;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    const lines=[x.title,x.route,'Søk disse delstrekningene:',...(x.searchLegs||[]).map(leg=>leg.label),'Slik søker du:',x.setup,...x.steps.map((step,i)=>String(i+1)+'. '+step),'Vurder:',x.tradeoff];
    detail.innerHTML=`
      <div class="flight-guide-detail-head">
        <div><span class="meta">Illustrativt eksempel · ingen faktisk søkepris</span>
        <h3>${escapeHtml(x.title)}</h3><p class="flight-guide-route">${escapeHtml(x.route)}</p>
        <p>${escapeHtml(x.description)}</p></div>
        <div class="flight-guide-detail-actions">
          <button class="button flight-guide-copy" type="button">Kopier søkeoppsettet</button>
          <span id="flight-copy-feedback" class="small" role="status"></span>
        </div>
      </div>
      <div class="flight-guide-route-links">
        <h4>Åpne rutene hos flysøketjenesten</h4>
        <p class="small">${escapeHtml(x.linkHelp)}</p>
        <div class="flight-guide-link-list">
          ${(x.searchLegs||[]).map((leg,i)=>`<article class="flight-guide-link-leg">
            <div class="flight-guide-link-label">
              <small>${x.searchType==='multi-city'?'Strekning '+(i+1):'Søk tur/retur'}</small>
              <strong>${escapeHtml(leg.label)}</strong>
            </div>
            <div class="flight-guide-link-actions">
              <a class="button primary" href="${escapeHtml(leg.googleUrl)}" target="_blank" rel="noopener">Google Flights: ${escapeHtml(leg.label)} ↗</a>
              <a class="button" href="${escapeHtml(leg.finnUrl)}" target="_blank" rel="noopener">FINN: ${escapeHtml(leg.label)} ↗</a>
            </div>
          </article>`).join('')}
        </div>
      </div>
      <div class="flight-guide-steps">
        <div><h4>Søk dette</h4><p>${escapeHtml(x.setup)}</p></div>
        <div><h4>Prøv disse variasjonene</h4><ol>${x.steps.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ol></div>
      </div>
      <p class="flight-guide-tradeoff"><strong>Hva bør du sammenligne?</strong> ${escapeHtml(x.tradeoff)}</p>`;
    detail.querySelector('.flight-guide-copy')?.addEventListener('click',async()=>{
      const note=detail.querySelector('#flight-copy-feedback');
      try{
        if(!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(lines.join('\\n'));
        if(note)note.textContent='Fremgangsmåten er kopiert.';
      }catch{
        if(note)note.textContent='Kunne ikke kopiere automatisk. Du kan markere teksten på siden.';
      }
    });
  };
  patterns.innerHTML=(data.examples||[]).map(x=>`<button type="button" data-pattern-id="${escapeHtml(x.id)}" aria-pressed="false">
    <strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.route)}</small></button>`).join('');
  patterns.addEventListener('click',e=>{
    const button=e.target.closest('[data-pattern-id]');
    if(button) setPattern(button.dataset.patternId);
  });
  setPattern(data.examples[0]?.id);
  document.getElementById('flight-workflow').innerHTML=(data.workflow||[]).map(x=>`<article class="card flight-guide-workflow">
    <span class="meta">Steg ${escapeHtml(x.number)}</span>
    <h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.detail)}</p></article>`).join('');
  document.getElementById('flight-variations').innerHTML=(data.variations||[]).map(x=>`<article class="card">
    <h3>${escapeHtml(x.label)}</h3>
    <div class="flight-guide-shifts">${x.shifts.map(v=>`<span>${escapeHtml(v)}</span>`).join('')}</div>
    <p>${escapeHtml(x.description)}</p></article>`).join('');
  document.getElementById('flight-hub-examples').innerHTML=(data.hubExamples||[]).map(x=>`<article class="card">
    <h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.setup)}</p>
    <p><strong>Sjekk også:</strong> ${escapeHtml(x.check)}</p></article>`).join('');
  document.getElementById('flight-checklist').innerHTML=(data.checklist||[]).map(x=>`<article class="card">
    <h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.detail)}</p></article>`).join('');
  document.getElementById('flight-sources').innerHTML=(data.sources||[]).map(x=>`<a class="card flight-guide-source"
    href="${escapeHtml(x.url)}" target="_blank" rel="noopener"><h3>${escapeHtml(x.title)} ↗</h3>
    <p>${escapeHtml(x.description)}</p></a>`).join('');
  document.getElementById('flight-privacy-note').textContent=data.privacy||'';
}

async function renderRoute() {
  await applyPageCopy('route');
  nav('route'); footer();
  // Show the actual map early on compact screens; controls remain one tap away.
  if(window.matchMedia?.('(max-width:620px)').matches){
    document.getElementById('route-map-options')?.removeAttribute('open');
  }
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

  const mapSelectionPopupHtml=(meta,title,subject=null,href='',label='',micro='')=>sharedMapPopupHtml(trip,meta,title,subject,href,label,micro);

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
    setMapDetail(`<div class="route-detail-content route-selected-content destination-themed" style="${themeStyle(destinationTheme(trip,x.baseId))}"><div class="meta">${x.tier} · ${hotelsData.bases.find(b=>b.baseId===x.baseId)?.label||x.area}</div><h3>${x.name}</h3><p><strong>${x.familyOption}</strong></p>${price?`<p class="small">${planningPartyLabel(trip)} per natt: ${price}</p>`:''}${contextualLinksFor(x,`hotel.html?id=${encodeURIComponent(x.id)}`,'Se overnattingen')}</div>`);
  };
  const showStopDetail=(stop,p)=>{
    if(!stop||!p) return;
    const nextLeg=nextLegByRouteId.get(stop.id);
    setMapDetail(`<div class="route-detail-content route-selected-content destination-themed" style="${themeStyle(destinationTheme(trip,stop))}"><div class="meta">Rutestopp</div><h3>${p.name}</h3><p><strong>${stop.label}</strong> · ${reiseDag(stop.from)}${stop.nights>0?`–${reiseDag(stop.to)} · ${stop.nights} ${stop.nights===1?'natt':'netter'}`:''}</p><p class="small">${stop.summary}</p>${routeContextLinksHtml(trip,stop,p,food,hotelsData)}${nextLeg?`<button class="route-inline-info" data-detail-leg="${nextLeg.id}">Neste etappe: ${formatMinutes(nextLeg.durationMin)} →</button>`:''}</div>`);
  };

  document.getElementById('window').textContent = trip.window;
  const routePlaces=trip.route.map(x=>places.find(p=>p.id===x.id)).filter(Boolean);
  const routeTitle=document.getElementById('route-title');
  if(routeTitle && routePlaces.length) routeTitle.textContent=`Fra ${routePlaces[0].name} til ${routePlaces.at(-1).name}`;
  const routeLogic=document.getElementById('route-transport-logic');
  if(routeLogic) routeLogic.textContent=transport.strategy||'';
  const stationNote=document.getElementById('station-note');
  if(stationNote) stationNote.textContent=transport.stationNote;
  document.getElementById('route-list').innerHTML = trip.route.map(x=>{
    const p=places.find(p=>p.id===x.id)||x;
    const img=p.image;
    const leg=nextLegByRouteId.get(x.id);
    return `<article class="route-item destination-themed" style="${themeStyle(destinationTheme(trip,x))}">
      ${img?`<div class="route-thumb-wrap"><a class="route-thumb-link" href="place.html?id=${encodeURIComponent(p.id)}" aria-label="Se ${p.name}"><img class="route-thumb" src="${img.url}" alt="" loading="lazy"></a>${imageCreditHtml(img,'image-credit-overlay image-credit-mini')}</div>`:''}
      <div class="route-item-main">
        <div class="route-item-top">
          <div class="date">${reiseDag(x.from)}${x.to!==x.from?` – ${reiseDag(x.to)}`:''}</div>
          <div class="nights">${x.nights===0?'Stopp':`${x.nights} ${x.nights===1?'natt':'netter'}`}</div>
        </div>
        <a class="route-item-title" href="place.html?id=${x.id}"><strong>${p.name}</strong></a>
        <div class="route-item-copy"><span>${x.label}</span><p>${x.summary}</p></div>
        ${routeContextLinksHtml(trip,x,p,food,hotelsData)}
        ${leg?`<button class="route-inline-info" data-leg="${leg.id}">Neste etappe: ${formatMinutes(leg.durationMin)} · ${dualFromJpy(scalePartyYen(leg.fare.standardFamilyYen,trip),fx)} for ${planningPartyShort(trip)}</button>`:''}
      </div>
    </article>`;
  }).join('');
  const journeyStops=document.getElementById('journey-stops');
  if(journeyStops){
    const roleLabel=transport.stationRoleLabels||{};
    journeyStops.innerHTML=transport.legs.map((leg,i)=>{
      const nodes=(leg.stations||[]).map((station,j)=>{
        const role=mapStationRole(transport,station.name);
        const specificRole=role==='used'&&(j===0||j===leg.stations.length-1)
          ? (j===0?'Avreise / ombordstigning':'Ankomst / avstigning')
          : (roleLabel[role]||'Underveis');
        return `<li class="journey-station ${role}">
          <span class="journey-station-node" aria-hidden="true"></span>
          <div class="journey-station-info"><strong>${escapeSiteHtml(station.name)}</strong><small>${escapeSiteHtml(specificRole)}</small></div>
          <span class="journey-station-time">${station.elapsedMin===0?'Start':`ca. ${formatMinutes(station.elapsedMin)} fra start`}</span>
        </li>`;
      }).join('');
      const otherCount=Math.max(0,(leg.stations?.length||0)-2);
      return `<details class="journey-leg" ${i===0?'open':''}>
       <summary><span><strong>${escapeSiteHtml(leg.from)} → ${escapeSiteHtml(leg.to)}</strong><small>${escapeSiteHtml(leg.service)} · ca. ${formatMinutes(leg.durationMin)}</small></span><span class="journey-leg-count">${otherCount} ${otherCount===1?'stasjon':'stasjoner'} mellom endepunktene</span></summary>
       <ol class="journey-station-list">${nodes}</ol>
       <p class="small journey-leg-note">Utvalgte stasjoner langs strekningen – ikke en bekreftet stopp- eller avgangsliste. Faktisk stoppmønster bestemmes av valgt tog.</p>
      </details>`;
    }).join('');
  }

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

  // Cross-country and street-level maps need different marker density.
  const routeMapRoot=document.getElementById('map');
  const updateRouteMarkerScale=()=>{
    if(routeMapRoot)routeMapRoot.dataset.routeZoom=map.getZoom()>=9?'detail':'overview';
  };
  map.on('zoom',updateRouteMarkerScale);
  updateRouteMarkerScale();
  installMapExpandControl(map,routeMapRoot);

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
  const fitRoute=()=>{
    const compact=routeMapRoot.clientWidth<620;
    const height=routeMapRoot.clientHeight;
    const padding=compact
      ? {top:Math.round(height*.13),bottom:Math.round(height*.13),left:20,right:20}
      : {top:55,right:80,bottom:55,left:55};
    map.fitBounds(routeBounds,{padding,maxZoom:7,duration:500});
  };

  // A single click handler, not one per overlapping segment: selecting a line updates
  // the existing detail panel without placing a second popup above a route marker.
  const routeHitLayerIds=[];
  const selectRouteLine=(event)=>{
    if(event.originalEvent?.target?.closest?.('.maplibregl-marker'))return;
    if(!routeHitLayerIds.length)return;
    const hits=map.queryRenderedFeatures(event.point,{layers:routeHitLayerIds});
    const first=hits.find(x=>legById.has(x.properties?.journeyId));
    if(first)showLegDetail(legById.get(first.properties.journeyId));
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
    routeHitLayerIds.push(`${sourceId}-hit`);
    map.addLayer({
      id:`${sourceId}-arrows`,type:'symbol',source:sourceId,
      layout:{'symbol-placement':'line','symbol-spacing':95,'text-field':'›','text-size':18,'text-rotation-alignment':'map','text-keep-upright':false,'text-allow-overlap':true},
      paint:{'text-color':color,'text-halo-color':'#fff','text-halo-width':1.2}
    });
    map.on('mouseenter',`${sourceId}-hit`,()=>map.getCanvas().style.cursor='pointer');
    map.on('mouseleave',`${sourceId}-hit`,()=>map.getCanvas().style.cursor='');
  };

  const markerGroups={stations:[],experience:[],food:[],hotel:[]};
  const labels=createMapLabelController({map,root:routeMapRoot,context:'route'});
  const routeClusters=createMapRouteStopClusters({map,labels});
  const layerState=readMapLayers();
  const routeContextIds=new Set([...trip.route.map(x=>x.id),...(trip.dayTrips||[]).map(x=>x.id)]);
  const mappablePlaces=places.filter(p=>!routeContextIds.has(p.id) && Number.isFinite(p.map?.lat) && Number.isFinite(p.map?.lng));
  const mappableFood=food.filter(x=>Number.isFinite(x.map?.lat) && Number.isFinite(x.map?.lng));
  const mappableHotels=hotelsData.hotels.filter(x=>Number.isFinite(x.map?.lat) && Number.isFinite(x.map?.lng));

  const setMarkerVisibility=(category,on)=>{
    layerState[category]=on;
    for(const marker of markerGroups[category]||[]){
      if(on) marker.addTo(map); else marker.remove();
    }
    const btn=document.querySelector(`[data-map-layer="${category}"]`);
    if(btn) btn.setAttribute('aria-pressed',String(on));
    storeMapLayers(layerState);
    labels.request();
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
      const role=mapStationRole(transport,s.name);
      const el=mapStationElement(s.name,s.memberships.map(m=>destinationColor(trip,m.leg.toRouteId)),role);
      const rows=s.memberships.map(m=>`<div class="station-time"><span>Fra ${m.leg.from}</span><strong>ca. ${formatMinutes(m.elapsedMin)}</strong></div>`).join('');
      const services=[...new Set(s.memberships.map(m=>m.leg.service))].join(' / ');
      const category=transport.stationRoleLabels?.[role]||'Stasjon underveis';
      const popup=new maplibregl.Popup({offset:12,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(category,s.name,null,'','Se stasjonsinformasjon'));
      popup.on('open',()=>setMapDetail(`<div class="route-detail-content route-selected-content"><div class="meta">${category}</div><h3>${s.name}</h3>${rows}<p class="small">${services}</p></div>`));
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([s.lng,s.lat]).setPopup(popup);
      watchMapMarker(marker,popup);
      labels.register({marker,popup,element:el,kind:'stations',name:s.name});
      markerGroups.stations.push(marker);
      if(layerState.stations) marker.addTo(map);
    }
  };

  const familyFoodPrice=(x)=>{
    if(!Array.isArray(x.standardFamilyEstimateYen)) return '';
    const [lo,hi]=scalePartyRange(x.standardFamilyEstimateYen,trip);
    return lo===hi ? dualFromJpy(lo,fx) : `${fmtJpy(lo)}–${fmtJpy(hi)} · ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))}`;
  };

  const addPoiMarkers=()=>{
    for(const p of mappablePlaces){
      const el=mapPoiElement(trip,p,'experience');
      const popup=new maplibregl.Popup({offset:14,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(`${p.type} · ${p.area}`,p.name,p,`place.html?id=${encodeURIComponent(p.id)}`,'Se stedet',mapMicroText(p,'experience')));
      popup.on('open',()=>showPlaceDetail(p));
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([p.map.lng,p.map.lat]).setPopup(popup);
      watchMapMarker(marker,popup);
      labels.register({marker,popup,element:el,kind:'experience',name:p.name,interest:p.planInterest});
      markerGroups.experience.push(marker);
      if(layerState.experience) marker.addTo(map);
    }

    for(const x of mappableFood){
      const el=mapPoiElement(trip,x,'food');
      const family=familyFoodPrice(x);
      const popup=new maplibregl.Popup({offset:14,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(`${x.role} · ${x.area}`,x.name,x,`restaurant.html?id=${encodeURIComponent(x.id)}`,'Se restauranten',mapMicroText(x,'food')));
      popup.on('open',()=>showFoodDetail(x));
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([x.map.lng,x.map.lat]).setPopup(popup);
      watchMapMarker(marker,popup);
      labels.register({marker,popup,element:el,kind:'food',name:x.name,interest:x.planInterest});
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
      const el=mapPoiElement(trip,x,'hotel');
      const price=hotelFamilyPrice(x);
      const popup=new maplibregl.Popup({offset:14,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(`${x.tier} · ${hotelsData.bases.find(b=>b.baseId===x.baseId)?.label||x.area}`,x.name,x,`hotel.html?id=${encodeURIComponent(x.id)}`,'Se overnattingen',mapMicroText(x,'hotel')));
      popup.on('open',()=>showHotelDetail(x));
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([x.map.lng,x.map.lat]).setPopup(popup);
      watchMapMarker(marker,popup);
      labels.register({marker,popup,element:el,kind:'hotel',name:x.name,interest:x.planInterest});
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
    wireMapLayerToolbar(toolbar,{counts,state:layerState,onToggle:setMarkerVisibility,
      extra:'<button class="map-layer-fit" id="fit-route" type="button">Hele ruten</button><button class="map-layer-location" id="my-location" type="button" title="Zoom inn til min posisjon">◎ Min posisjon</button>'
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
    map.on('click',selectRouteLine);

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
      const el=mapRouteStopElement(trip,p,{number:i+1});
      const anchor=routeGeometry.stops?.[x.id]||[p.map.lng,p.map.lat];
      const popup=new maplibregl.Popup({offset:16,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(`Stopp ${i+1}`,p.name,x,`place.html?id=${encodeURIComponent(p.id)}`,'Utforsk byen'));
      popup.on('open',()=>showStopDetail(x,p));
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat(anchor).setPopup(popup);
      watchMapMarker(marker,popup).addTo(map);
      labels.register({marker,popup,element:el,kind:'routeStop',name:p.name});
      routeClusters.register(marker,i+1,p.name);
    });

    trip.dayTrips.forEach(x=>{
      const p=places.find(p=>p.id===x.id);
      const base=places.find(p=>p.id===x.baseId);
      if(!p?.map) return;
      const el=mapRouteStopElement(trip,p,{dayTrip:true});
      const popup=new maplibregl.Popup({offset:18,maxWidth:'260px'}).setHTML(mapSelectionPopupHtml(`Dagstur fra ${base?.name||x.baseId}`,p.name,p,`place.html?id=${encodeURIComponent(p.id)}`,'Se stedet'));
      popup.on('open',()=>showPlaceDetail(p));
      const marker=new maplibregl.Marker({element:el,anchor:'center'}).setLngLat([p.map.lng,p.map.lat]).setPopup(popup);
      watchMapMarker(marker,popup).addTo(map);
      labels.register({marker,popup,element:el,kind:'dayTrip',name:p.name});
    });

    addStationMarkers();
    addPoiMarkers();
    addHotelMarkers();
    renderLayerToolbar();
    fitRoute();
    routeClusters.refresh();
  });

  detail.hidden=false;
  detail.innerHTML=`<div class="route-detail-placeholder"><strong>Utforsk ruten</strong><span>Trykk på et rutestopp, en markør eller en etappe for informasjon. Samlede stopp kan åpnes med ett trykk for å zoome inn.</span></div>`;

  installMapLoadFallback(map,{
    onFatal:()=>{
      if(document.querySelector('#map .map-error.floating')) return;
      const el=document.createElement('div');
      el.className='map-error floating';
      el.innerHTML='<strong>Kartet kunne ikke lastes.</strong><br>Prøv å oppdatere siden.';
      document.getElementById('map').appendChild(el);
    },
    onReady:()=>document.querySelector('#map .map-error.floating')?.remove()
  });
}

async function renderPlaces() {
  await applyPageCopy('places');
  nav('places'); footer();
  const [places,trip,fx] = await Promise.all([json('data/places.json'),json('data/trip.json'),loadFx()]);
  renderPricePartySelector(trip);
  const filters=document.getElementById('filters');
  const list=document.getElementById('places-grid');
  const placeById=new Map(places.map(p=>[p.id,p]));
  const placeUi=(await pagesPromise).places;
  const topicLabels=placeUi.topicLabels||{};
  const featureLabels=placeUi.featureLabels||{};

  const placeCard=(p,base,{inDayTrip=false}={})=>{
    const areaNote=!inDayTrip && p.area!==base.area && p.id!==base.id
      ? `<span class="place-list-area-note">${p.area} · dagstur/utflukt</span>`:'';
    return `<article class="place-list-card destination-themed" style="${themeStyle(destinationTheme(trip,p))}">
      ${entityMediaHtml({img:p.image,alt:p.name,area:p.area,type:p.type,trip,subject:p,variant:'list'})}
      <div class="place-list-copy">
        ${areaNote}
        <a class="place-list-primary-link" href="place.html?id=${encodeURIComponent(p.id)}"><h3>${p.type==='base'?'Om '+p.name:p.name}</h3></a>
        <strong>${p.simple}</strong>
        ${placePriceSummaryHtml(p,trip,fx)}
        <div class="place-taxonomy-tags" aria-label="Temaer og praktiske egenskaper">${(p.topics||[]).map(t=>`<span class="place-topic-tag">${topicLabels[t]||t}</span>`).join('')}${(p.features||[]).map(t=>`<span class="place-feature-tag">${featureLabels[t]||t}</span>`).join('')}</div>
        <p>${p.description}</p>
      </div>
      <span class="place-list-arrow" aria-hidden="true">→</span>
    </article>`;
  };

  let activeDestination='all',activeTopic='all',activeFeature='all';
  const draw=(destination='all')=>{
    activeDestination=destination;
    // Grupper i reiserutens rekkefølge. Attraksjoner sorteres nøytralt,
    // og dagsturer arver riktig reisebase via destinationId().
    const groups=trip.route
      .filter(stop=>destination==='all'||destination===stop.id)
      .map(stop=>{
        const base=placeById.get(stop.id);
        if(!base)return null;
        if(!places.some(p=>destinationId(trip,p)===stop.id && (activeTopic==='all'||(p.topics||[]).includes(activeTopic)) && (activeFeature==='all'||(p.features||[]).includes(activeFeature))))return null;
        const members=places.filter(p=>destinationId(trip,p)===stop.id && (activeTopic==='all'||(p.topics||[]).includes(activeTopic)) && (activeFeature==='all'||(p.features||[]).includes(activeFeature)));
        const attractions=members.filter(p=>p.id!==stop.id).sort((a,b)=>a.name.localeCompare(b.name,'nb'));
        // Dagsturer er én samlet utflukt fra basen – alle steder i samme
        // dagstursområde skal vises sammen, ikke flettet inn alfabetisk.
        const dayTripGroups=(trip.dayTrips||[])
          .filter(dayTrip=>dayTrip.baseId===stop.id)
          .map(dayTrip=>{
            const destination=placeById.get(dayTrip.id);
            const items=attractions.filter(p=>p.id===dayTrip.id ||
              (destination && destination.area!==base.area && p.area===destination.area));
            return {dayTrip,destination,items};
          }).filter(group=>group.destination && group.items.length);
        const dayTripItemIds=new Set(dayTripGroups.flatMap(group=>group.items.map(p=>p.id)));
        const localAttractions=attractions.filter(p=>!dayTripItemIds.has(p.id));
        const localItems=localAttractions.length?localAttractions:
          attractions.length?[]:members.filter(p=>p.id===stop.id);
        const label=stop.nights===0?'Stopp på veien':`${stop.nights} ${stop.nights===1?'natt':'netter'}`;
        return `<section class="place-destination-group destination-themed" id="places-${stop.id}" style="${themeStyle(destinationTheme(trip,stop))}">
          <div class="place-destination-heading">
            <a href="place.html?id=${encodeURIComponent(base.id)}" class="place-destination-heading-link" aria-label="Les om ${base.name}: oversikt, høydepunkter og praktisk informasjon">
              <span class="meta">Ruten · ${label}</span>
              <h2>${base.name} <span class="place-destination-heading-arrow" aria-hidden="true">↗</span></h2>
              <p>${stop.label}</p>
              <span class="place-destination-overview">
                <span class="place-destination-overview-label">Les om ${base.name}</span>
                <span class="place-destination-overview-description">Oversikt, høydepunkter og praktisk informasjon</span>
                <span class="place-destination-overview-arrow" aria-hidden="true">→</span>
              </span>
            </a>
          </div>
          <p class="place-idea-link"><a href="day-ideas.html?base=${encodeURIComponent(stop.id)}">Se mulige dagkombinasjoner →</a></p>
          <div class="place-destination-items">${localItems.map(p=>placeCard(p,base)).join('')}</div>
          ${dayTripGroups.map(({destination,items})=>`
            <div class="place-daytrip-group" aria-label="Samlet dagstur til ${destination.name}">
              <div class="place-daytrip-heading">
                <div>
                  <span class="meta">Dagstur fra ${base.name} · samme utflukt</span>
                  <h3>${destination.name}</h3>
                </div>
              </div>
              <div class="place-destination-items">${items.map(p=>placeCard(p,base,{inDayTrip:true})).join('')}</div>
            </div>`).join('')}
        </section>`;
      }).filter(Boolean);
    list.innerHTML=groups.length?groups.join(''):'<p>Ingen steder i denne delen av reisen.</p>';
  };
  const initial=setupJourneyFilters(filters,trip,places,places,draw);
  const url=new URL(location.href),legacyTopic=url.searchParams.get('topic');
  if(['innendors','sakura'].includes(legacyTopic)){
    if(!url.searchParams.has('feature'))url.searchParams.set('feature',legacyTopic);
    url.searchParams.delete('topic');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }else if(legacyTopic==='religion'){
    url.searchParams.set('topic','kultur');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
  const topicRoot=document.getElementById('topic-filters');
  if(topicRoot)activeTopic=setupUrlFilters(topicRoot,Object.entries(topicLabels).filter(([key])=>key!=='all').map(([value,label])=>({value,label})),value=>{activeTopic=value;draw(activeDestination);},{param:'topic',allLabel:topicLabels.all||'Alle temaer'});
  const featureRoot=document.getElementById('feature-filters');
  if(featureRoot)activeFeature=setupUrlFilters(featureRoot,Object.entries(featureLabels).filter(([key])=>key!=='all').map(([value,label])=>({value,label})),value=>{activeFeature=value;draw(activeDestination);},{param:'feature',allLabel:featureLabels.all||'Alle forhold'});
  draw(initial);
}
async function renderPlace() {
  nav('places'); footer();
  const [places,foodData,trip,prepData,hotelData,fx,transport,dayIdeas] = await Promise.all([json('data/places.json'),json('data/food.json'),json('data/trip.json'),json('data/prep.json'),json('data/hotels.json'),loadFx(),json('data/transport.json'),json('data/day-ideas.json')]);
  const food=foodData.restaurants||[];
  const id = new URLSearchParams(location.search).get('id');
  const p = places.find(x=>x.id===id);
  if(!p){
    document.title='Sted ikke funnet · Japan 2027';
    document.querySelector('main').innerHTML='<div class="eyebrow">Steder</div><h1>Stedet ble ikke funnet</h1><p><a href="places.html">← Tilbake til alle steder</a></p>';
    return;
  }

  renderPricePartySelector(trip);
  document.querySelector('main')?.setAttribute('style',themeStyle(destinationTheme(trip,p)));
  document.querySelector('main')?.classList.add('destination-themed');
  document.title = `${p.name} · Japan 2027`;
  document.getElementById('area').textContent = `${p.area} · ${p.type}`;
  document.getElementById('name').textContent = p.name;
  document.getElementById('simple').textContent = p.simple;
  document.getElementById('description').textContent = p.description;
  document.getElementById('why').textContent = p.why;
  const priceRoot=document.getElementById('place-price');
  if(priceRoot) priceRoot.innerHTML=placePriceDetailHtml(p,trip,fx);
  document.getElementById('highlights').innerHTML = p.highlights.map(x=>`<li>${x}</li>`).join('');
  const relatedPrep=prepData.flatMap(group=>group.items.map(item=>({...item,category:group.category}))).filter(item=>item.placeIds?.includes(p.id)).slice(0,5);
  document.getElementById('prep').innerHTML = relatedPrep.length
    ? relatedPrep.map(item=>`<li><strong>${item.title}</strong> <span class="small">· ${item.category}</span><br>${item.action}</li>`).join('')
    : '<li>Ingen særskilt forberedelse anbefalt.</li>';

  const optionRoot=document.getElementById('place-options');
  if(optionRoot && p.experienceOptions?.length){
    optionRoot.hidden=false;
    optionRoot.innerHTML=`
      <div class="section-head"><div><div class="eyebrow">Opplevelser</div><h2>${p.experienceOptionsTitle}</h2></div><p>${p.experienceOptionsIntro}</p></div>
      <div class="grid two">${p.experienceOptions.map(opt=>`
        <article class="card" id="experience-${opt.id}">
          <span class="meta">${opt.kind} · ${opt.areaLabel}</span><h3>${opt.name}</h3>
          <strong>${opt.status}</strong><p>${opt.description}</p>
          <p><strong>Passer reisen:</strong> ${opt.fit}</p>
          <p><strong>Følg med:</strong> ${opt.whenToCheck}</p>
          ${opt.price? `<p><strong>Pris:</strong> ${Number.isFinite(opt.price.adultYen)?`Voksen ${dualFromJpy(opt.price.adultYen,fx)}${Number.isFinite(opt.price.childYen)?` · barn ${dualFromJpy(opt.price.childYen,fx)}`:''}. `:''}${opt.price.childRule?opt.price.childRule+' ':''}${opt.price.note||''}</p>`:''}
          <div class="button-row">${(opt.links||[]).map(link=>`<a class="button" href="${link.url}" target="_blank" rel="noopener">${link.label} ↗</a>`).join('')}</div>
        </article>`).join('')}</div>`;
  }

  const onsenRoot=document.getElementById('place-onsen-options');
  if(onsenRoot && p.id===hotelData.onsenOptions?.baseId){
    onsenRoot.hidden=false;
    onsenRoot.innerHTML=renderOnsenOptionsHtml(hotelData.onsenOptions,{hotels:hotelData.hotels});
    if(location.hash==='#place-onsen-options') onsenRoot.scrollIntoView({block:'start'});
  }

  if(location.hash.startsWith('#experience-')) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({block:'start'});

  const img=p.image;
  if(img?.url){
    document.getElementById('place-photo').innerHTML = `<img src="${img.url}" alt="${img.alt||p.name}">${imageCreditHtml(img)}`;
  }

  document.getElementById('external-links').innerHTML = [...(p.links||[]).map(linkButton),mapsButton(p.name,p.area)].join('');

  renderDetailContextMap({containerId:'place-map',toolbarId:'place-map-layers',trip,current:p,currentKind:'experience',places,food,hotels:hotelData.hotels,transport});
  const suggested=(dayIdeas.ideas||[]).filter(x=>[...(x.corePlaceIds||[]),...(x.optionalPlaceIds||[])].includes(p.id));
  if(suggested.length){
    const dayLink=document.createElement('p');dayLink.className='small';
    dayLink.innerHTML='<a href="day-ideas.html?base='+encodeURIComponent(destinationId(trip,p)||suggested[0].baseId)+'">Se dagidéer som inkluderer dette stedet →</a>';
    document.getElementById('place-map')?.insertAdjacentElement('afterend',dayLink);
  }

  const activeFood=food.filter(x=>x.status==='active');
  const sameArea=activeFood.filter(x=>x.area===p.area);
  const sameDestination=activeFood.filter(x=>x.area!==p.area && destinationId(trip,x)===destinationId(trip,p));
  const related=[...sameArea,...sameDestination].slice(0,4);
  document.getElementById('nearby-food').innerHTML = related.length
    ? related.map(x=>relatedEntityCardHtml({href:`restaurant.html?id=${encodeURIComponent(x.id)}`,meta:`${x.role} · ${x.priority}`,title:x.name,subtitle:x.dish,trip,subject:x})).join('')
    : '<p class="small">Ingen kuraterte restaurantvalg i dette området.</p>';
}
function speechButtonHtml(text,label='japansk uttale') {
  if(!text) return '';
  return `<button class="pronounce-button" type="button" data-speak-ja="${encodeURIComponent(text)}" aria-label="Hør ${label}" title="Hør uttale">🔊</button>`;
}
function languageRowHtml(x) {
  const roman=x.jp||x.term||'';
  const meaning=x.no||x.meaning||'';
  return `<div class="glossary-row language-row"><div class="language-term"><strong>${escapeSiteHtml(roman)}</strong>${x.japanese?`<span class="language-japanese" lang="ja">${escapeSiteHtml(x.japanese)}</span>`:''}</div><span class="language-meaning">${escapeSiteHtml(meaning)}${x.note?`<small class="language-phrase-note">${escapeSiteHtml(x.note)}</small>`:''}</span>${speechButtonHtml(x.speech||x.japanese,escapeSiteHtml(roman))}</div>`;
}
function bindJapaneseSpeech(root=document) {
  if(!root || root.dataset?.speechBound==='true') return;
  if(root.dataset) root.dataset.speechBound='true';
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-speak-ja]');
    if(!button) return;
    if(!('speechSynthesis' in window)){
      button.disabled=true;
      button.title='Denne nettleseren støtter ikke avspilling av uttale.';
      return;
    }
    const text=decodeURIComponent(button.dataset.speakJa||'');
    if(!text) return;
    window.speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.lang='ja-JP';
    utterance.rate=0.82;
    const voices=window.speechSynthesis.getVoices?.()||[];
    const japanese=voices.find(v=>(v.lang||'').toLowerCase().startsWith('ja'));
    if(japanese) utterance.voice=japanese;
    window.speechSynthesis.speak(utterance);
  });
}
function prepAudienceHtml(audience,{compact=false}={}) {
  if(!audience?.label) return '';
  const id=audience.id||'family';
  return `<div class="prep-audience-block audience-${id}${compact?' compact':''}">
    <span class="prep-audience-kicker">Passer for</span>
    <span class="prep-audience-badge">${audience.label}</span>
    ${audience.note?`<span class="prep-audience-note">${audience.note}</span>`:''}
  </div>`;
}
function prepLinksHtml(item,{includeDetail=true}={}) {
  const links=[...(item.links||[])];
  if(item.url && !links.some(link=>link.url===item.url)) links.push({label:item.urlLabel||'Les mer',url:item.url});
  if(includeDetail && item.detail) links.unshift({label:'Slik gjør vi det',url:`prep-item.html?id=${encodeURIComponent(item.id)}`,local:true});
  if(!links.length) return '';
  return `<div class="button-row prep-actions">${links.map(link=>{
    const local=link.local || !/^https?:\/\//.test(link.url||'');
    const stream=link.kind==='stream';
    const target=local?'':'target="_blank" rel="noopener"';
    return `<a class="button${stream?' primary stream-link':''}" href="${link.url}" ${target}>${link.label}${local?'':' ↗'}</a>`;
  }).join('')}</div>`;
}



/* Place photos are owned by places.json and used as safe atmospheric images.
   No screenshots, violent adult-game scenes, or third-party cover art. */
function prepSafeMediaHtml(item,placeById){
  const place=item.imagePlaceId?placeById?.get(item.imagePlaceId):null;
  const img=item.image||place?.image;
  if(!img?.url)return '';
  const caption=place?.name?'Stemningsbilde fra '+place.name+': '+(img.alt||place.name):img.alt||item.title;
  return '<figure class="prep-cook-media prep-safe-media">'+
    '<span class="prep-cook-image-fallback" aria-hidden="true">'+escapeSiteHtml(place?.name||item.title)+'</span>'+
    '<img src="'+escapeSiteHtml(img.url)+'" alt="'+escapeSiteHtml(caption)+'" loading="lazy" decoding="async" width="900" height="563" onerror="this.closest(\'.prep-safe-media\').classList.add(\'is-fallback\');this.remove()">'+
    (place?'<span class="prep-photo-context">Ekte foto fra Japan</span>':'')+
    imageCreditHtml(img,'image-credit-overlay image-credit-mini')+'</figure>';
}
function prepVisualCardHtml(item,placeById){
  return '<article class="prep-visual-card audience-card-'+escapeSiteHtml(item.audience?.id||'family')+'">'+
    prepSafeMediaHtml(item,placeById)+
    '<div class="prep-visual-body">'+
      '<h2 class="prep-card-title">'+escapeSiteHtml(item.title)+'</h2>'+
      prepAudienceHtml(item.audience)+
      '<p>'+escapeSiteHtml(item.why)+'</p>'+
      '<strong class="prep-action">'+escapeSiteHtml(item.action)+'</strong>'+
      prepLinksHtml(item)+
    '</div></article>';
}

function prepCookingCardHtml(item,copy){
  const cooking=item.cooking;
  const image=item.image;
  // Reuse the site's universal image-credit renderer; all image facts live in prep.json.
  const media=image?.url?`<figure class="prep-cook-media">
    <span class="prep-cook-image-fallback" aria-hidden="true">${escapeSiteHtml(item.title)}</span>
    <img src="${escapeSiteHtml(image.url)}" alt="${escapeSiteHtml(image.alt)}" loading="lazy" decoding="async" width="900" height="600" onerror="this.closest('.prep-cook-media').classList.add('is-fallback');this.remove()">
    ${imageCreditHtml(image,'image-credit-overlay image-credit-mini')}
  </figure>`:'';
  return `<article class="prep-cook-card">
    ${media}
    <div class="prep-cook-body">
      <h3>${escapeSiteHtml(item.title)}</h3>
      <div class="prep-cook-meta"><span class="prep-cook-time">${escapeSiteHtml(copy.cookingTimeLabel)}: ${escapeSiteHtml(cooking.time)}</span></div>
      <p class="prep-cook-why">${escapeSiteHtml(item.why)}</p>
      <p class="prep-cook-action">${escapeSiteHtml(item.action)}</p>
      <div class="prep-cook-context">
        <p><strong>${escapeSiteHtml(copy.cookingKidsLabel)}</strong>${escapeSiteHtml(cooking.kids)}</p>
        <p><strong>${escapeSiteHtml(copy.cookingSpotLabel)}</strong>${escapeSiteHtml(cooking.spot)}</p>
      </div>
      ${prepLinksHtml(item)}
      ${cooking.note?`<details class="prep-cook-note"><summary>${escapeSiteHtml(copy.cookingRecipeNoteLabel)}</summary><p>${escapeSiteHtml(cooking.note)}</p></details>`:''}
    </div>
  </article>`;
}

async function renderPrep() {
  const copy=await applyPageCopy('prep');
  footer();
  const prep=await json('data/prep.json');
  const slug=new URLSearchParams(location.search).get('topic');
  const oldAnchor=/^#prep-group-(\d+)$/.exec(location.hash);
  const oldGroup=oldAnchor?prep[Number(oldAnchor[1])]:null;
  const selected=prep.find(group=>group.slug===slug)||(slug?null:oldGroup);
  if(oldGroup&&!slug) {
    // Preserve previously shared #prep-group-N links while using stable slugs going forward.
    history.replaceState(null,'','prep.html?topic='+encodeURIComponent(oldGroup.slug));
  }
  if(slug&&!selected)history.replaceState(null,'','prep.html');
  const overview=document.getElementById('prep-home');
  const detail=document.getElementById('prep-topic-content');
  const topicCards=document.getElementById('prep-topic-cards');
  const topicGrid=document.getElementById('prep-grid');
  const guide=document.getElementById('prep-audience-guide');
  const ordered=[...prep].sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured)));
  const all=prep.flatMap(group=>group.items);
  const audienceOrder=['family','older-kids','teens','adults'];
  const audienceById=new Map(all.filter(x=>x.audience?.id).map(x=>[x.audience.id,x.audience]));
  if(guide)guide.innerHTML=audienceOrder.filter(id=>audienceById.has(id)).map(id=>prepAudienceHtml({...audienceById.get(id),note:null},{compact:true})).join('');


  // Overview previews reuse the same image metadata, never hardcoded image URLs.
  const prepPlaceById=(selected?.slug==='mat')?new Map()
    :new Map((await json('data/places.json')).map(place=>[place.id,place]));
  topicCards.innerHTML=ordered.map(group=>{
    const cover=group.items.find(item=>item.image||item.imagePlaceId);
    const href='prep.html?topic='+encodeURIComponent(group.slug);
    return '<article class="prep-topic-link prep-topic-card">'+
      (cover?prepSafeMediaHtml(cover,prepPlaceById):'')+
      '<div class="prep-topic-card-body">'+
        '<a class="prep-topic-link-label" href="'+href+'">'+escapeSiteHtml(group.navLabel||group.category)+'</a>'+
        '<span class="prep-topic-link-summary">'+escapeSiteHtml(group.teaser)+'</span>'+
        '<a class="prep-topic-link-count" href="'+href+'">'+group.items.length+' forslag <span aria-hidden="true">→</span></a>'+
      '</div></article>';
  }).join('');

  const title=document.querySelector('main h1[data-copy]');
  const intro=document.querySelector('main .lede[data-copy]');
  overview.hidden=Boolean(selected);
  detail.hidden=!selected;
  if(selected){
    title.textContent=selected.navLabel||selected.category;
    intro.textContent=selected.teaser;
    document.title=`${selected.navLabel||selected.category} · Japan 2027`;
    nav('prep-'+selected.slug,{prep});
    if(selected.slug==='mat'){
      const start=selected.items.filter(item=>item.cooking?.tier==='start');
      const more=selected.items.filter(item=>item.cooking?.tier==='more');
      topicGrid.innerHTML=`<section class="prep-cooking-section" aria-label="${escapeSiteHtml(copy.cookingStartTitle)}">
        <div class="prep-cooking-intro"><h2>${escapeSiteHtml(copy.cookingStartTitle)}</h2><p>${escapeSiteHtml(copy.cookingStartIntro)}</p></div>
        <div class="prep-cooking-grid">${start.map(item=>prepCookingCardHtml(item,copy)).join('')}</div>
        <details class="prep-cooking-more">
          <summary><span>${escapeSiteHtml(copy.cookingMoreTitle)} <small>(${more.length})</small></span><span aria-hidden="true">⌄</span></summary>
          <p>${escapeSiteHtml(copy.cookingMoreIntro)}</p>
          <div class="prep-cooking-grid">${more.map(item=>prepCookingCardHtml(item,copy)).join('')}</div>
        </details>
        <p class="prep-cooking-guide">${escapeSiteHtml(copy.cookingLinksNote)}</p>
        <p class="prep-cooking-safety">${escapeSiteHtml(copy.cookingSafety)}</p>
      </section>`;

    }else{
      const note=['spill','film','serier','boker'].includes(selected.slug)
        ?'<p class="prep-media-notice">'+escapeSiteHtml(copy.visualImagesNote)+'</p>':'';
      topicGrid.innerHTML=note+'<div class="prep-visual-grid">'+
        selected.items.map(item=>prepVisualCardHtml(item,prepPlaceById)).join('')+'</div>';
    }
  }else{
    title.textContent=copy.title;
    intro.textContent=copy.intro;
    nav('prep',{prep});
    topicGrid.innerHTML='';
  }
}

async function renderFood() {
  await applyPageCopy('food');
  nav('food'); footer();
  const [foodData,fx,trip,places]=await Promise.all([json('data/food.json'),loadFx(),json('data/trip.json'),json('data/places.json')]);
  renderPricePartySelector(trip);
  const food=foodData.restaurants||[];
  const active=food.filter(x=>x.status!=='watch');
  const watch=food.filter(x=>x.status==='watch');
  const areaOrder=[...new Set(trip.route.flatMap(x=>x.theme?.areas||[]))];
  const filters=document.getElementById('food-filters');
  const list=document.getElementById('food-list');
  const order={'Må prøve':0,'Sterk kandidat':1,'Valgfri':2,'Følg med':3};

  const familyPrice=(x)=>{
    if(!Array.isArray(x.standardFamilyEstimateYen)) return 'Pris kommer';
    const [lo,hi]=scalePartyRange(x.standardFamilyEstimateYen,trip);
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

  const row=(x)=>`<article class="food-index-item destination-themed" style="${themeStyle(destinationTheme(trip,x))}">
    <a class="food-index-row" href="restaurant.html?id=${encodeURIComponent(x.id)}">
    <div class="food-index-main">
      <div class="food-index-badges">${priorityBadge(x.priority)}<span class="food-role">${x.role}</span></div>
      <h3>${x.name}</h3>
      <span class="food-index-dish">${x.dish}</span>
    </div>
    <div class="food-index-fit"><span>Passer med</span><strong>${x.fit}</strong></div>
    <div class="food-index-rating">${ratingSummary(x)}</div>
    <div class="food-index-price"><span>${x.priceClass}</span><strong>${familyPrice(x)}</strong></div>
    <span class="food-index-arrow" aria-hidden="true">→</span>
    </a>
  </article>`;

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
      const lo=Number.isFinite(band.minYen)?scalePartyYen(band.minYen,trip):band.minYen;
      const hi=Number.isFinite(band.maxYen)?scalePartyYen(band.maxYen,trip):band.maxYen;
      if(Number.isFinite(lo)&&Number.isFinite(hi)) return `${fmtJpy(lo)}–${fmtJpy(hi)} · ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))}`;
      if(Number.isFinite(hi)) return `opptil ${fmtJpy(hi)} · ca. ${fmtNok(nokFromJpy(hi,fx))}`;
      if(Number.isFinite(lo)) return `over ${fmtJpy(lo)} · ca. ${fmtNok(nokFromJpy(lo,fx))}`;
      return '';
    };
    priceGuide.innerHTML=`<strong>Pris for ${planningPartyLabel(trip)}:</strong>${(foodData.priceBands||[]).map(b=>`<span><b>${b.label}</b> ${bandText(b)}</span>`).join('')}`;
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
    fxNote.textContent=`Prisene for ${planningPartyLabel(trip)} er planestimater. ${fxStatusText(fx)} ${fmtLongDate(fx.asOf)} brukes i alle omregninger.${ratingDate?` Restaurantvurderinger kontrollert ${fmtLongDate(ratingDate)}.`:''}`;
  }
  draw(initial);
}

async function renderRestaurant() {
  nav('food'); footer();
  const [foodData,fx,trip,places,hotelData,transport]=await Promise.all([json('data/food.json'),loadFx(),json('data/trip.json'),json('data/places.json'),json('data/hotels.json'),json('data/transport.json')]);
  const food=foodData.restaurants||[];
  const id=new URLSearchParams(location.search).get('id');
  const x=food.find(item=>item.id===id);
  if(!x){
    document.title='Restaurant ikke funnet · Japan 2027';
    document.querySelector('main').innerHTML='<div class="eyebrow">Mat</div><h1>Restaurant ikke funnet</h1><p class="lede">Denne restaurant-ID-en finnes ikke i den kuraterte listen.</p><p><a href="food.html">← Tilbake til matoversikten</a></p>';
    return;
  }

  document.title=`${x.name} · Japan 2027`;
  renderPricePartySelector(trip);
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
    const [lo,hi]=scalePartyRange(x.standardFamilyEstimateYen,trip);
    const yen=lo===hi?fmtJpy(lo):`${fmtJpy(lo)}–${fmtJpy(hi)}`;
    const nokLo=fmtNok(nokFromJpy(lo,fx));
    const nokHi=fmtNok(nokFromJpy(hi,fx));
    const nok=lo===hi?nokLo:`${nokLo}–${nokHi}`;
    price.innerHTML=`<strong>${yen}</strong><small>ca. ${nok}</small>`;
  } else {
    const panel=price.closest('.restaurant-price-panel');
    if(panel) panel.hidden=true;
  }

  const partyLabel=document.getElementById('restaurant-party-label');
  if(partyLabel) partyLabel.textContent=`Estimat · ${planningPartyLabel(trip)}`;
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
    x.links?.menu?`<a class="button" href="${x.links.menu}" target="_blank" rel="noopener">${x.links.menuIncludesWebsite?'Meny og nettsted':'Meny'} ↗</a>`:'',
    x.links?.booking?`<a class="button" href="${x.links.booking}" target="_blank" rel="noopener">Booking ↗</a>`:'',
    x.links?.website && !x.links.menuIncludesWebsite?`<a class="button" href="${x.links.website}" target="_blank" rel="noopener">Nettside ↗</a>`:'',
    x.ratings?.tripadvisor?.url?`<a class="button" href="${x.ratings.tripadvisor.url}" target="_blank" rel="noopener">Tripadvisor ↗</a>`:''
  ].filter(Boolean);
  document.getElementById('restaurant-links').innerHTML=links.join('');

  renderDetailContextMap({containerId:'restaurant-map',toolbarId:'restaurant-map-layers',trip,current:x,currentKind:'food',places,food,hotels:hotelData.hotels,transport});
  const alternatives=food.filter(item=>item.status==='active'&&item.id!==x.id&&item.area===x.area).slice(0,4);
  document.getElementById('restaurant-alternatives').innerHTML=alternatives.length
    ? alternatives.map(item=>relatedEntityCardHtml({href:`restaurant.html?id=${encodeURIComponent(item.id)}`,meta:item.role,title:item.name,subtitle:item.dish,trip,subject:item})).join('')
    : '<p class="small">Ingen andre aktive kandidater i dette området.</p>';
}

function renderOnsenOptionsHtml(onsenData, {hotels=[]}={}) {
  if(!onsenData?.options?.length)return '';
  const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hotelById=new Map(hotels.map(x=>[x.id,x]));
  return `<div class="onsen-overview">
    <div class="onsen-overview-intro">
      <div class="eyebrow">Hakone · en natt · ingen beslutning tatt</div>
      <h2>${h(onsenData.title)}</h2>
      <p>${h(onsenData.intro)}</p>
    </div>
    <div class="onsen-options-grid">
      ${onsenData.options.map(opt=>`<article class="onsen-option-card">
        <div class="onsen-option-kicker">${opt.kind==='dagbesok'?'Alternativ uten overnatting':'Onsen på overnattingssted'} · <span>Ikke valgt</span></div>
        <h3>${h(hotelById.get(opt.hotelId)?.name || opt.name)}</h3>
        <strong class="onsen-option-subtitle">${h(opt.subtitle)}</strong>
        <p>${h(opt.description)}</p>
        <p><strong>Avveining:</strong> ${h(opt.tradeoff)}</p>
        <p><strong>For familien:</strong> ${h(opt.familyNote)}</p>
        <p class="onsen-option-price"><strong>Pris og vilkår:</strong> ${h(opt.priceNote)}</p>
        <div class="onsen-option-actions">
          ${opt.hotelId&&hotelById.has(opt.hotelId)?`<a class="button" href="hotel.html?id=${encodeURIComponent(opt.hotelId)}">Se overnattingsalternativ →</a>`:''}
          <a class="button" href="${h(opt.officialUrl)}" target="_blank" rel="noopener">Offisiell informasjon ↗</a>
        </div>
      </article>`).join('')}
    </div>
    <p class="onsen-options-note">${h(onsenData.planningNote)}</p>
  </div>`;
}

async function renderHotels() {
  await applyPageCopy('hotels');
  nav('hotels'); footer();
  const [data,trip,places,fx]=await Promise.all([json('data/hotels.json'),json('data/trip.json'),json('data/places.json'),loadFx()]);
  renderPricePartySelector(trip);
  const hotels=data.hotels;
  const typeById=new Map((data.accommodationTypes||[]).map(x=>[x.id,x]));
  const tierOrder={'Verdi':0,'Mellomklasse':1,'Mellomklasse+':2,'Premium':3,'Splurge':4,'Splurge-opplevelse':4};
  let activeBase='all', activeKind='all';

  const price=(x)=>{
    const [lo,hi]=scalePartyRange(x.standardFamilyNightYen,trip);
    return `<strong>${fmtJpy(lo)}–${fmtJpy(hi)}</strong><small>ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))} / natt</small>`;
  };
  const plannedNights=(x)=>Number.isFinite(x.recommendedNights)?x.recommendedNights:(trip.route.find(r=>r.id===x.baseId)?.nights||1);
  const totalPrice=(x)=>{
    const nights=plannedNights(x), [lo,hi]=scalePartyRange(x.standardFamilyNightYen,trip);
    return `${fmtJpy(lo*nights)}–${fmtJpy(hi*nights)} · ca. ${fmtNok(nokFromJpy(lo*nights,fx))}–${fmtNok(nokFromJpy(hi*nights,fx))}`;
  };
  const card=(x)=>`<article class="hotel-index-card destination-themed" style="${themeStyle(destinationTheme(trip,x.baseId))}">
    <a class="hotel-index-content" href="hotel.html?id=${encodeURIComponent(x.id)}" aria-label="Se detaljer om ${escapeSiteHtml(x.name)}">
    <div class="hotel-index-top"><div><span class="hotel-tier">${x.tier}</span><span class="stay-kind">${typeById.get(x.kind)?.label||x.kind}</span></div><span class="hotel-rating">${x.rating?.score?`${x.rating.platform} ${x.rating.score.toFixed(1)}`:''}</span></div>
    <h3>${x.name}</h3>
    <p class="hotel-family">${x.familyOption}</p>
    <div class="hotel-index-price"><span>${planningPartyLabel(trip)}</span>${price(x)}</div>
    <p class="hotel-logistics">${x.logistics}</p>
    <div class="hotel-total"><span>${plannedNights(x)} ${plannedNights(x)===1?'natt':'netter'} i planen</span><strong>${totalPrice(x)}</strong></div>
    </a>
  </article>`;

  const draw=()=>{
    const root=document.getElementById('hotel-bases');
    root.innerHTML=data.bases.filter(base=>activeBase==='all'||base.baseId===activeBase).map(base=>{
      const items=hotels.filter(x=>x.baseId===base.baseId && (activeKind==='all'||x.kind===activeKind)).sort((a,b)=>(tierOrder[a.tier]??9)-(tierOrder[b.tier]??9));
      if(!items.length) return '';
      return `<section class="hotel-base destination-themed" style="${themeStyle(destinationTheme(trip,base.baseId))}">
        <div class="section-head hotel-base-head"><div><div class="eyebrow">${base.label}</div><h2>${base.strategy}</h2></div><p>${base.why}</p></div>
        <div class="hotel-grid">${items.map(card).join('')}</div>
        ${base.baseId===data.onsenOptions?.baseId && activeKind==='all'?`<div id="hakone-onsen-options" class="hotel-onsen-options">${renderOnsenOptionsHtml(data.onsenOptions,{hotels})}</div>`:''}
      </section>`;
    }).join('');
  };

  activeBase=setupJourneyFilters(document.getElementById('stay-base-filters'),trip,places,hotels,value=>{activeBase=value;draw();},{overnightOnly:true,param:'base'});
  const availableKinds=(data.accommodationTypes||[]).filter(t=>hotels.some(h=>h.kind===t.id)).map(t=>({value:t.id,label:t.label}));
  activeKind=setupUrlFilters(document.getElementById('stay-kind-filters'),availableKinds,value=>{activeKind=value;draw();},{param:'type'});

  document.getElementById('stay-types').innerHTML=(data.accommodationTypes||[]).map(t=>`<article class="stay-type-card"><span>${hotels.filter(h=>h.kind===t.id).length||'—'} ${hotels.some(h=>h.kind===t.id)?'kandidater':'sammenligningsspor'}</span><h3>${t.label}</h3><p>${t.description}</p>${t.source?`<a href="${t.source}" target="_blank" rel="noopener">Regelgrunnlag ↗</a>`:''}</article>`).join('');
  document.getElementById('stay-party-note').textContent=`Prisvisning: ${planningPartyLabel(trip)}. ${data.partyBasis||''} ${partyMultiplier(trip)>1?(trip.priceParties?.note||''):''}`.trim();

  const cheapestByBase=trip.route.filter(r=>r.nights>0).map(stop=>{
    const candidates=hotels.filter(h=>h.baseId===stop.id);
    return candidates.sort((a,b)=>((a.standardFamilyNightYen[0]+a.standardFamilyNightYen[1])/2)-((b.standardFamilyNightYen[0]+b.standardFamilyNightYen[1])/2))[0];
  }).filter(Boolean);
  const low=cheapestByBase.reduce((sum,h)=>sum+h.standardFamilyNightYen[0]*plannedNights(h),0)*partyMultiplier(trip);
  const high=cheapestByBase.reduce((sum,h)=>sum+h.standardFamilyNightYen[1]*plannedNights(h),0)*partyMultiplier(trip);
  document.getElementById('stay-cost-summary').innerHTML=`<span>Prisgrep med rimeligste listede kandidat per base</span><strong>${fmtJpy(low)}–${fmtJpy(high)} · ca. ${fmtNok(nokFromJpy(low,fx))}–${fmtNok(nokFromJpy(high,fx))}</strong><small>Planestimat for hele oppholdet; ikke et pristilbud.</small>`;

  document.getElementById('stay-alternatives').innerHTML=(data.alternativeExamples||[]).map(x=>`<a class="stay-alt-card destination-themed" style="${themeStyle(destinationTheme(trip,x.baseId))}" href="${x.url}" target="_blank" rel="noopener"><span>${typeById.get(x.kind)?.label||x.kind}</span><h3>${x.name}</h3><p>${x.description}</p><strong>Offisiell side ↗</strong></a>`).join('');

  document.getElementById('hotel-price-note').textContent=`${data.priceNote} NOK-omregningen bruker ${fxStatusText(fx).toLowerCase()} fra ${fmtLongDate(fx.asOf)}.`;
  draw();
  if(location.hash==='#hakone-onsen-options') document.getElementById('hakone-onsen-options')?.scrollIntoView({block:'start'});
}

async function renderHotel() {
  nav('hotels'); footer();
  const [data,trip,fx,places,foodData,transport]=await Promise.all([json('data/hotels.json'),json('data/trip.json'),loadFx(),json('data/places.json'),json('data/food.json'),json('data/transport.json')]);
  const id=new URLSearchParams(location.search).get('id');
  const x=data.hotels.find(h=>h.id===id);
  if(!x){
    document.querySelector('main').innerHTML='<div class="eyebrow">Overnatting</div><h1>Overnattingen ble ikke funnet</h1><p><a href="hotels.html">← Tilbake til overnattingsoversikten</a></p>';
    return;
  }
  renderPricePartySelector(trip);
  const base=data.bases.find(b=>b.baseId===x.baseId);
  const routeStop=trip.route.find(r=>r.id===x.baseId);
  const nights=Number.isFinite(x.recommendedNights)?x.recommendedNights:(routeStop?.nights||1);
  const [lo,hi]=scalePartyRange(x.standardFamilyNightYen,trip);
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
  const nightLabel=document.getElementById('hotel-party-night-label');
  if(nightLabel) nightLabel.textContent=`${planningPartyLabel(trip)} · per natt`;
  const stayLabel=document.getElementById('hotel-party-stay-label');
  if(stayLabel) stayLabel.textContent=`${planningPartyLabel(trip)} · planlagt opphold`;
  document.getElementById('hotel-price-night').innerHTML=`<strong>${fmtJpy(lo)}–${fmtJpy(hi)}</strong><small>ca. ${fmtNok(nokFromJpy(lo,fx))}–${fmtNok(nokFromJpy(hi,fx))}</small>`;
  document.getElementById('hotel-price-stay').innerHTML=`<strong>${fmtJpy(lo*nights)}–${fmtJpy(hi*nights)}</strong><small>ca. ${fmtNok(nokFromJpy(lo*nights,fx))}–${fmtNok(nokFromJpy(hi*nights,fx))} · ${nights} ${nights===1?'natt':'netter'}</small>`;
  document.getElementById('hotel-price-note').textContent=`${data.priceNote} Prisvisning: ${planningPartyLabel(trip)}.${partyMultiplier(trip)>1?' To familier er her et lineært sammenligningsanslag; større enheter eller hele boliger kan bli rimeligere enn to separate familieløsninger.':''}`;
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
  renderDetailContextMap({containerId:'hotel-map',toolbarId:'hotel-map-layers',trip,current:x,currentKind:'hotel',places,food:foodData.restaurants,hotels:data.hotels,transport});
  const alternatives=data.hotels.filter(h=>h.baseId===x.baseId&&h.id!==x.id);
  document.getElementById('hotel-alternatives').innerHTML=alternatives.map(h=>relatedEntityCardHtml({href:`hotel.html?id=${encodeURIComponent(h.id)}`,meta:h.tier,title:h.name,subtitle:h.familyOption,trip,subject:h.baseId})).join('');
}


async function renderTransportGuide() {
  await applyPageCopy('transport');nav('transport');footer();
  const [guide,passes]=await Promise.all([json('data/guide.json'),json('data/passes.json')]);
  document.getElementById('transport-grid').innerHTML=guide.transport.map(x=>`<article class="card transport-card"><div class="transport-icon">${x.icon}</div><h3>${x.title}</h3><strong>${x.short}</strong><p>${x.body}</p><div class="button-row">${x.links.map(l=>`<a class="button" href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`).join('')}</div></article>`).join('');
  const statusClass=status=>({strong:'strong',watch:'watch',low:'low',review:'review'}[status]||'watch');
  document.getElementById('pass-watchlist').innerHTML=passes.options.map(x=>`<article class="pass-row"><div class="pass-row-main"><div class="pass-row-top"><span class="pass-status ${statusClass(x.status)}">${x.statusLabel}</span><span class="meta">${x.kind}</span></div><h3>${x.name}</h3><p>${x.short}</p><small>${x.when}</small></div><div class="pass-row-aside"><span>${x.current}</span><a href="${x.sourceUrl}" target="_blank" rel="noopener">Offisiell informasjon ↗</a></div></article>`).join('');
}
async function renderTickets() {
  await applyPageCopy('tickets');nav('tickets');footer();
  const [guide,places]=await Promise.all([json('data/guide.json'),json('data/places.json')]);
  document.getElementById('booking-radar').innerHTML=guide.bookingRadar.map(x=>{
    const p=places.find(p=>p.id===x.placeId);
    const option=x.optionId?p?.experienceOptions?.find(o=>o.id===x.optionId):null;
    const link=option?.links?.[0]||placePrimaryLink(p);
    const title=option?.name||p?.name||x.placeId;
    const local=`place.html?id=${encodeURIComponent(x.placeId)}${option?'#experience-'+encodeURIComponent(option.id):''}`;
    return `<article class="booking-row">${priorityBadge(x.priority)}<div><strong>${title}</strong><span>${option?.areaLabel||p?.area||''} · ${x.when}</span><p>${x.why}</p><a href="${local}">Se opplevelsen →</a></div>${link?`<a href="${link.url}" target="_blank" rel="noopener">${link.label} ↗</a>`:''}</article>`;
  }).join('');
}
async function renderLanguage() {
  const copy=await applyPageCopy('language');
  footer();
  const guide=await json('data/guide.json');
  const topics=languageTopics(guide,copy);
  const topic=new URLSearchParams(location.search).get('topic');
  const legacyHash={'#ord':'ord','#navn':'navn','#flere':'hilsener','#fraser':null}[location.hash];
  if(!topic && typeof legacyHash==='string'){
    history.replaceState(null,'','language.html?topic='+encodeURIComponent(legacyHash));
  }
  const selected=topics.find(x=>x.slug===(topic||legacyHash));
  nav(selected?'language-'+selected.slug:'language',{language:guide});
  const home=document.getElementById('language-home');
  const focus=document.getElementById('language-focus');
  const title=document.querySelector('main h1[data-copy]');
  const intro=document.querySelector('main .lede[data-copy]');
  document.getElementById('phrase-basics').innerHTML=guide.phrases.map(languageRowHtml).join('');
  document.getElementById('language-topic-cards').innerHTML=topics.map(t=>`<a class="language-topic-link" href="language.html?topic=${encodeURIComponent(t.slug)}">
    <strong>${escapeSiteHtml(t.title)}</strong>
    <span>${escapeSiteHtml(t.intro)}</span>
    <small>${t.count} ${t.kind==='names'?'stedsnavn':t.kind==='words'?'ord':'fraser'} <span aria-hidden="true">→</span></small>
  </a>`).join('');
  home.hidden=Boolean(selected); focus.hidden=!selected;
  if(selected){
    title.textContent=selected.title;
    intro.textContent=selected.intro;
    document.title=`${selected.title} · Japansk · Japan 2027`;
    document.getElementById('language-focus-title').textContent=selected.title;
    document.getElementById('language-focus-title').hidden=true;
    document.getElementById('language-focus-intro').hidden=true;
    const note=document.getElementById('language-focus-note');
    note.hidden=!selected.group?.note;
    note.textContent=selected.group?.note||'';
    const content=document.getElementById('language-focus-content');
    if(selected.kind==='names'){
      content.innerHTML=`<div class="grid">${guide.nameNotes.map(x=>`<article class="mini-card"><h3>${escapeSiteHtml(x.name)}</h3><p>${escapeSiteHtml(x.note)}</p></article>`).join('')}</div>`;
    }else{
      const items=selected.kind==='words'?guide.placeWords.filter(x=>x.showInGuide!==false):selected.group.items;
      content.innerHTML=`<div class="glossary">${items.map(languageRowHtml).join('')}</div>`;
    }
  }else{
    title.textContent=copy.title;
    intro.textContent=copy.intro;
    document.getElementById('language-focus-content').innerHTML='';
  }
  bindJapaneseSpeech(document.querySelector('main'));
}

async function renderPractical() {
  const legacy={'#transport':'transport-guide.html#transport','#pass':'transport-guide.html#pass','#booking':'tickets.html#booking','#ord':'language.html#ord','#navn':'language.html#navn'};
  if(legacy[location.hash]){location.replace(legacy[location.hash]);return;}
  await applyPageCopy('practical');nav('practical');footer();
  const guide=await json('data/guide.json');
  document.getElementById('on-trip-help').innerHTML=(guide.onTrip||[]).map(x=>`<article class="card"><h2>${x.title}</h2><p>${x.body}</p><a href="${x.href}" ${x.external?'target="_blank" rel="noopener"':''}>${x.label} →</a></article>`).join('');
  document.getElementById('etiquette').innerHTML=guide.etiquette.map(x=>`<article class="mini-card"><h3>${x.title}</h3><p>${x.body}</p></article>`).join('');
}

async function renderPrepItem() {
  footer();
  const [prep,places,trip]=await Promise.all([json('data/prep.json'),json('data/places.json'),json('data/trip.json')]);
  const id=new URLSearchParams(location.search).get('id');
  const all=prep.flatMap(group=>group.items.map(item=>({...item,category:group.category,categorySlug:group.slug})));
  const x=all.find(item=>item.id===id);
  if(!x || !x.detail){
    nav('prep',{prep});
    document.title='Forberedelse ikke funnet · Japan 2027';
    document.querySelector('main').innerHTML='<div class="eyebrow">Før turen</div><h1>Detaljene ble ikke funnet</h1><p><a href="prep.html">← Tilbake til Før turen</a></p>';
    return;
  }
  nav('prep-'+x.categorySlug,{prep},{label:x.title});
  document.title=`${x.title} · Japan 2027`;
  const back=document.querySelector('.detail-back a');
  if(back)back.href='prep.html?topic='+encodeURIComponent(x.categorySlug);
  document.getElementById('prep-detail-category').textContent=x.category;
  document.getElementById('prep-detail-audience').innerHTML=prepAudienceHtml(x.audience);
  document.getElementById('prep-detail-title').textContent=x.title;
  const detailMedia=document.getElementById('prep-detail-media');
  if(detailMedia)detailMedia.innerHTML=prepSafeMediaHtml(x,new Map(places.map(place=>[place.id,place])));
  document.getElementById('prep-detail-why').textContent=x.why;
  document.getElementById('prep-detail-action').textContent=x.action;
  document.getElementById('prep-detail-summary').textContent=x.detail.summary||'';
  document.getElementById('prep-detail-steps').innerHTML=(x.detail.steps||[]).map((step,i)=>`<li><span>${i+1}</span><p>${step}</p></li>`).join('');
  const exampleItems=x.detail.examples||[];
  if(exampleItems.length) document.getElementById('prep-detail-examples').innerHTML=exampleItems.map(v=>`<li>${v}</li>`).join('');
  else document.getElementById('prep-detail-example-section').hidden=true;
  document.getElementById('prep-detail-links').innerHTML=prepLinksHtml(x,{includeDetail:false});
  const related=(x.placeIds||[]).map(pid=>places.find(p=>p.id===pid)).filter(Boolean);
  if(related.length){
    document.getElementById('prep-detail-related').innerHTML=related.map(p=>relatedEntityCardHtml({href:`place.html?id=${encodeURIComponent(p.id)}`,meta:p.area,title:p.name,subtitle:p.simple,trip,subject:p})).join('');
  } else document.getElementById('prep-detail-related-section').hidden=true;
}

async function renderBudget() {
  await applyPageCopy('budget');
  nav('budget'); footer();
  const [trip,fx] = await Promise.all([json('data/trip.json'),loadFx()]);
  renderPricePartySelector(trip);
  const multiplier=partyMultiplier(trip);
  document.getElementById('target').innerHTML = dualMoneyHtml(fmtNok(trip.budget.targetNok*multiplier),fmtJpy(jpyFromNok(trip.budget.targetNok*multiplier,fx)));
  document.getElementById('range').innerHTML = dualMoneyHtml(
    `${fmtNok(trip.budget.rangeNok[0]*multiplier)}–${fmtNok(trip.budget.rangeNok[1]*multiplier)}`,
    `${fmtJpy(jpyFromNok(trip.budget.rangeNok[0]*multiplier,fx))}–${fmtJpy(jpyFromNok(trip.budget.rangeNok[1]*multiplier,fx))}`
  );
  document.getElementById('note').textContent = `${trip.budget.note}${multiplier>1?' To-familievisningen er et lineært plananslag; særlig overnatting kan bli lavere ved delte større enheter.':''}`;
  document.getElementById('budget-rows').innerHTML = trip.budget.items.map(item=>`
    <tr><td>${item.label}</td><td>${dualRangeFromNok(item.rangeNok.map(v=>v*multiplier),fx)}</td></tr>
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

const droneEsc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const droneLink=(url,label)=>'<a class="button" href="'+droneEsc(url)+'" target="_blank" rel="noopener noreferrer">'+droneEsc(label)+' ↗</a>';
function droneGsi(lat,lon){return 'https://maps.gsi.go.jp/#14/'+Number(lat).toFixed(5)+'/'+Number(lon).toFixed(5)+'/&base=std';}
async function renderDrones(){
  await renderStaticPage('drones','drones');
  const data=await json('data/drones.json');
  const byId=id=>document.getElementById(id);
  byId('drone-updated').textContent=data.checked;
  byId('drone-summary').textContent=data.summary;
  byId('drone-notice').textContent=data.notice;
  byId('drone-region').innerHTML=data.regions.map((r,i)=>'<option value="'+i+'">'+droneEsc(r.name)+'</option>').join('');
  const setRegion=()=>{
    const r=data.regions[Number(byId('drone-region').value)||0];
    byId('drone-region-note').textContent=r.body;
    byId('drone-map').href=droneGsi(r.lat,r.lon);
  };
  byId('drone-region').addEventListener('change',setRegion);
  setRegion();
  byId('drone-location').addEventListener('click',()=>{
    if(!navigator.geolocation){byId('drone-location-status').textContent='Posisjonen er ikke tilgjengelig i nettleseren.';return;}
    byId('drone-location-status').textContent='Ber om posisjonstilgang ...';
    navigator.geolocation.getCurrentPosition(pos=>{
      byId('drone-map').href=droneGsi(pos.coords.latitude,pos.coords.longitude);
      byId('drone-location-status').textContent='Kartlenken er sentrert på posisjonen. Ingen posisjon sendes til denne nettsiden eller lagres her.';
    },()=>{byId('drone-location-status').textContent='Posisjon er ikke tilgjengelig. Velg område fra listen.';},{enableHighAccuracy:true,maximumAge:0,timeout:12000});
  });
  const step=(x,i)=>'<article class="drone-step"><span class="drone-step-count">'+(i+1)+'</span><div><h3>'+droneEsc(x.title)+'</h3><p>'+droneEsc(x.body)+'</p>'+droneLink(x.url,'Sjekk kilden')+'</div></article>';
  byId('drone-live-steps').innerHTML=data.live.map(step).join('');
  byId('drone-prep').innerHTML=data.prep.map(step).join('');
  byId('drone-models').innerHTML=data.models.map(x=>'<article class="drone-card"><div class="drone-model-meta"><span class="meta">'+droneEsc(x.kind)+'</span><strong>'+droneEsc(x.weight)+'</strong></div><h3>'+droneEsc(x.name)+'</h3><p>'+droneEsc(x.assessment)+'</p><p class="drone-flight">'+droneEsc(x.flight)+'</p>'+droneLink(x.source,'Produsentens spesifikasjoner')+'</article>').join('');
  byId('drone-laws').innerHTML=data.laws.map(x=>'<article class="card"><h3>'+droneEsc(x.title)+'</h3><p>'+droneEsc(x.body)+'</p>'+droneLink(x.url,'Offisiell kilde')+'</article>').join('');
  byId('drone-special').innerHTML=data.special.map(x=>'<article class="card"><h3>'+droneEsc(x.title)+'</h3><p>'+droneEsc(x.body)+'</p></article>').join('');
  byId('drone-sources').innerHTML=data.sources.map(x=>'<a href="'+droneEsc(x.url)+'" target="_blank" rel="noopener noreferrer">'+droneEsc(x.label)+' ↗</a>').join('');
  const checklistKey=JapanState.keys.drone;
  const knownChecks=new Set(data.takeoff.map(x=>x.id));
  const saved=JapanState.readJson(checklistKey,null);
  const migrated=saved===null;
  const checklist=(saved && typeof saved==='object' && !Array.isArray(saved))
    ? Object.fromEntries(Object.entries(saved).filter(([id,on])=>knownChecks.has(id)&&on===true))
    : Object.fromEntries(data.takeoff.filter((x,i)=>JapanState.readLocal('japan2027-drone-check-'+i)==='1').map(x=>[x.id,true]));
  if(migrated && JapanState.writeLocal(checklistKey,JSON.stringify(checklist)))
    data.takeoff.forEach((x,i)=>JapanState.removeLocal('japan2027-drone-check-'+i));
  byId('drone-takeoff').innerHTML=data.takeoff.map(x=>
    '<label class="drone-check"><input type="checkbox" data-drone-check="'+x.id+'" '+(checklist[x.id]?'checked':'')+'><span>'+droneEsc(x.label)+'</span></label>'
  ).join('');
  byId('drone-takeoff').addEventListener('change',event=>{
    const el=event.target.closest('[data-drone-check]');
    if(!el||!knownChecks.has(el.dataset.droneCheck))return;
    if(el.checked)checklist[el.dataset.droneCheck]=true;
    else delete checklist[el.dataset.droneCheck];
    JapanState.writeLocal(checklistKey,JSON.stringify(checklist));
  });
  byId('drone-reset').addEventListener('click',()=>{
    byId('drone-takeoff').querySelectorAll('input').forEach(el=>{el.checked=false;});
    for(const id of Object.keys(checklist))delete checklist[id];
    JapanState.writeLocal(checklistKey,JSON.stringify(checklist));
  });
}
