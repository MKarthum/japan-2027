// Shared local-only interest state, including migration of earlier dagidéer preferences.
const JapanChoices=(()=>{
 const key=JapanState.keys.choices,legacy='japan-2027-idea-choices-v1',allowed=new Set(['interested','dismissed']);
 const storage=()=>{try{
   const current=JSON.parse(JapanState.readLocal(key,'null'));
   if(current&&typeof current==='object'&&!Array.isArray(current))return Object.fromEntries(Object.entries(current).filter(([k,v])=>/^(place|food|hotel):[a-z0-9-]+$/.test(k)&&allowed.has(v)));
   const old=JSON.parse(JapanState.readLocal(legacy,'{}'));
   return Object.fromEntries(Object.entries(old||{}).filter(([id,v])=>allowed.has(v)).map(([id,v])=>['place:'+id,v]));
  }catch{return {};}};
 const get=(type,id)=>storage()[type+':'+id]||'none';
 const all=type=>Object.fromEntries(Object.entries(storage()).filter(([k])=>k.startsWith(type+':')).map(([k,v])=>[k.slice(type.length+1),v]));
 const set=(type,id,value)=>{
  if(!['place','food','hotel'].includes(type)||!/^[a-z0-9-]+$/.test(id)||!allowed.has(value))return;
  const data=storage(),idKey=type+':'+id;
  if(data[idKey]===value)delete data[idKey];else data[idKey]=value;
  JapanState.writeLocal(key,JSON.stringify(data));
  window.dispatchEvent(new Event('japan-choices-change'));
 };
 return {get,set,all};
})();
function choiceWidget(type,id){
 const block=document.createElement('div');block.className='entity-choice-widget';block.dataset.choiceType=type;block.dataset.choiceId=id;
 block.innerHTML=`<span class="choice-caption">Min vurdering</span><button type="button" data-choice="interested">Aktuell</button><button type="button" data-choice="dismissed">Legg bort</button>`;
 return block;
}
function syncChoiceWidgets(){
 for(const root of document.querySelectorAll('[data-choice-type][data-choice-id]')){
  const state=JapanChoices.get(root.dataset.choiceType,root.dataset.choiceId);
  root.dataset.choiceState=state;
  for(const button of root.querySelectorAll('button[data-choice]'))button.setAttribute('aria-pressed',String(button.dataset.choice===state));
 }
}
function installChoiceWidgets(){
 const current=location.pathname.split('/').pop(),type={'place.html':'place','restaurant.html':'food','hotel.html':'hotel'}[current];
 const id=new URLSearchParams(location.search).get('id');
 const target=document.querySelector('.detail-hero>div:first-child, .restaurant-detail-hero>div:first-child, .hotel-detail-hero>div:first-child, .restaurant-detail-main, .hotel-detail-main');
 if(type&&id&&target&&!target.querySelector('.entity-choice-widget'))target.appendChild(choiceWidget(type,id));
 for(const [selector,t] of [
  ['#places-grid a[href*="place.html?id="]','place'],
  ['#food-list a[href*="restaurant.html?id="]','food'],
  ['#hotel-bases a[href*="hotel.html?id="]','hotel']
 ]){
  for(const anchor of document.querySelectorAll(selector)){
   const entityId=new URL(anchor.href).searchParams.get('id');
   if(!entityId)continue;
   const wrapper=anchor.closest('article.place-list-card')?.querySelector('.place-list-copy') || (anchor.classList.contains('place-destination-heading-link')?null:anchor);
   if(!wrapper||wrapper.dataset.choiceAttached)continue;
   wrapper.dataset.choiceAttached='true';
   const w=choiceWidget(t,entityId);
   if(wrapper===anchor)anchor.insertAdjacentElement('afterend',w);else wrapper.append(w);
  }
 }
 syncChoiceWidgets();
}
document.addEventListener('click',event=>{
 const btn=event.target.closest('.entity-choice-widget button[data-choice]');
 if(!btn)return;
 event.preventDefault();event.stopPropagation();
 const root=btn.closest('[data-choice-type]');
 JapanChoices.set(root.dataset.choiceType,root.dataset.choiceId,btn.dataset.choice);
});
window.addEventListener('japan-choices-change',syncChoiceWidgets);
document.addEventListener('DOMContentLoaded',()=>{
 const main=document.querySelector('main');
 if(!main)return;
 let queued=false;
 const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;installChoiceWidgets();});};
 new MutationObserver(schedule).observe(main,{childList:true,subtree:true});
 schedule();
});
async function renderMyChoices(){
 await applyPageCopy('myChoices');nav('myChoices');footer();
 const [places,foodData,hotelData,trip,days]=await Promise.all([json('data/places.json'),json('data/food.json'),json('data/hotels.json'),json('data/trip.json'),json('data/day-ideas.json')]);
 const records=[
  ...places.map(x=>({type:'place',id:x.id,name:x.name,area:x.area,desc:x.simple,href:'place.html?id='+encodeURIComponent(x.id),category:'Sted'})),
  ...foodData.restaurants.map(x=>({type:'food',id:x.id,name:x.name,area:x.area,desc:x.dish,href:'restaurant.html?id='+encodeURIComponent(x.id),category:'Restaurant'})),
  ...hotelData.hotels.map(x=>({type:'hotel',id:x.id,name:x.name,area:x.area,desc:x.familyOption,href:'hotel.html?id='+encodeURIComponent(x.id),category:'Overnatting'}))
 ];
 const page=()=> {
  for(const [state,element] of [['interested','selected-choices'],['dismissed','dismissed-choices']]){
   const chosen=records.filter(x=>JapanChoices.get(x.type,x.id)===state);
   document.getElementById(element).innerHTML=chosen.length?`<div class="choice-summary-grid">${chosen.map(x=>`<article class="card"><span class="meta">${escapeSiteHtml(x.category)} · ${escapeSiteHtml(x.area)}</span><h3><a href="${x.href}">${escapeSiteHtml(x.name)}</a></h3><p>${escapeSiteHtml(x.desc)}</p><div class="entity-choice-widget" data-choice-type="${x.type}" data-choice-id="${x.id}"><span class="choice-caption">Min vurdering</span><button type="button" data-choice="interested">Aktuell</button><button type="button" data-choice="dismissed">Legg bort</button></div></article>`).join('')}</div>`:'<p class="small">Ingen valg her ennå.</p>';
  }
  const selected=new Set(Object.keys(JapanChoices.all('place')).filter(id=>JapanChoices.get('place',id)==='interested'));
  const capacity=trip.route.map(stop=>{
    const stopPlaces=places.filter(x=>selected.has(x.id)&&destinationId(trip,x)===stop.id);
    const options=days.ideas.filter(x=>x.baseId===stop.id&&[...x.corePlaceIds,...x.optionalPlaceIds].some(id=>selected.has(id)));
    if(!stopPlaces.length)return '';
    const base=places.find(x=>x.id===stop.id);
    return `<article class="card"><span class="meta">${stop.nights?stop.nights+' netter':'Stopp underveis'}</span><h3>${escapeSiteHtml(base?.name||stop.id)}</h3><p>${stopPlaces.length} aktuelle steder. ${stop.nights>0?'Ikke alle trenger en egen dag.':'Tiden er begrenset fordi dette er et stopp på veien.'}</p><p>${options.length} dagidéer berører ett eller flere av valgene.</p><a href="day-ideas.html?base=${encodeURIComponent(stop.id)}">Utforsk dagkombinasjoner →</a></article>`;
  }).filter(Boolean);
  document.getElementById('choice-capacity').innerHTML=capacity.length?`<div class="choice-summary-grid">${capacity.join('')}</div>`:'<p class="small">Marker interessante steder for å se hvilke byer og dagidéer de hører sammen med.</p>';
  syncChoiceWidgets();
 };
 window.addEventListener('japan-choices-change',page);page();
}
// Shared, local content search; indexes authoritative JSON at query time, no backend.
let siteSearchIndexPromise;
function normalizeJapanSearch(text){return String(text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
async function loadSiteSearchIndex(){
 if(siteSearchIndexPromise)return siteSearchIndexPromise;
 siteSearchIndexPromise=Promise.all([
  json('data/places.json'),json('data/food.json'),json('data/hotels.json'),
  json('data/day-ideas.json'),json('data/prep.json'),json('data/guide.json'),json('data/pages.json')
 ]).then(([places,food,hotels,ideas,prep,guide,pages])=>[
  ...places.map(x=>({type:'Sted',title:x.name,description:x.simple+' '+x.description+' '+(x.topics||[]).join(' ')+' '+(x.features||[]).join(' '),href:'place.html?id='+encodeURIComponent(x.id)})),
  ...food.restaurants.map(x=>({type:'Restaurant',title:x.name,description:x.dish+' '+x.area+' '+x.why,href:'restaurant.html?id='+encodeURIComponent(x.id)})),
  ...hotels.hotels.map(x=>({type:'Overnatting',title:x.name,description:x.area+' '+x.familyOption,href:'hotel.html?id='+encodeURIComponent(x.id)})),
  ...ideas.ideas.map(x=>({type:'Dagidé',title:x.title,description:x.logic,href:'day-ideas.html?base='+encodeURIComponent(x.baseId)})),
  ...prep.flatMap(g=>g.items.map(x=>({type:g.category,title:x.title,description:x.why,href:'prep.html'}))),
  ...guide.placeWords.map(x=>({type:'Japansk ord',title:x.term,description:x.meaning+' '+(x.aliases||[]).join(' '),href:'language.html#ord'})),
  ...guide.phrases.map(x=>({type:'Språk',title:x.jp||x.term||x.japanese,description:x.no||x.meaning,href:'language.html#fraser'})),
  ...pages.navigation.sections.flatMap(g=>(g.items||[g]).map(x=>({type:'Side',title:x.label,description:g.label,href:x.href})))
 ]);
 return siteSearchIndexPromise;
}
async function openSiteSearch(){
 let dialog=document.getElementById('site-search-dialog');
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='site-search-dialog';dialog.className='site-search-dialog';
  dialog.innerHTML='<form method="dialog" class="search-header"><label for="site-search-input">Søk i Japan 2027</label><button type="submit" aria-label="Lukk søk">✕</button></form><input type="search" id="site-search-input" placeholder="Sted, mat, samurai, onsen ..." autocomplete="off"><div id="site-search-results" class="site-search-results" aria-live="polite"></div>';
  document.body.append(dialog);
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  const input=dialog.querySelector('input'),results=dialog.querySelector('#site-search-results');
  let index=[];
  const render=()=>{
   const term=normalizeJapanSearch(input.value.trim());
   if(!term){results.textContent='Søk etter et sted, et tema eller en japansk frase.';return;}
   const words=term.split(/\s+/).filter(Boolean);
   const matches=index.map(x=>({x,value:normalizeJapanSearch(x.title+' '+x.description+' '+x.type)})).filter(o=>words.every(w=>o.value.includes(w))).sort((a,b)=>normalizeJapanSearch(a.x.title).includes(term)?-1:normalizeJapanSearch(b.x.title).includes(term)?1:0).slice(0,25);
   results.innerHTML=matches.length?matches.map(({x})=>`<a href="${x.href}"><span>${escapeSiteHtml(x.type)}</span><strong>${escapeSiteHtml(x.title)}</strong><small>${escapeSiteHtml(x.description).slice(0,130)}</small></a>`).join(''):'<p>Ingen treff. Prøv andre ord.</p>';
  };
  input.addEventListener('input',render);
  dialog.dataset.searchReady='loading';
  loadSiteSearchIndex().then(items=>{index=items;dialog.dataset.searchReady='true';render();}).catch(()=>{results.textContent='Søket kunne ikke lastes.';});
 }
 if(!dialog.open)dialog.showModal();
 dialog.querySelector('input')?.focus();
}
