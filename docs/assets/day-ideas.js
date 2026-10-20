async function renderDayIdeas(){
  await applyPageCopy('dayIdeas');nav('dayIdeas');footer();
  const [data,places,trip]=await Promise.all([json('data/day-ideas.json'),json('data/places.json'),json('data/trip.json')]);
  const byId=new Map(places.map(p=>[p.id,p]));
  const root=document.getElementById('day-ideas-list'),summary=document.getElementById('idea-choices-summary'),status=document.getElementById('idea-copy-status'),key='japan-2027-idea-choices-v1';
  let decisions={};
  try{const v=JSON.parse(localStorage.getItem(key)||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))decisions=Object.fromEntries(Object.entries(v).filter(([id,state])=>byId.has(id)&&['interested','dismissed'].includes(state)));}catch{}
  const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const placeItem=(id,optional)=>{
    const p=byId.get(id);if(!p)return '';
    const choice=decisions[id]||'none';
    return `<li class="idea-place-choice" data-idea-place="${h(id)}" data-choice-state="${choice}">
      <div class="idea-place-info"><a href="place.html?id=${encodeURIComponent(id)}">${h(p.name)}</a>
      <small>${optional?'Mulig tillegg · ':''}${h(data.interestLabels[p.planInterest]||'Mulig opplevelse')}</small></div>
      <div class="idea-choice-buttons" role="group" aria-label="Din vurdering av ${h(p.name)}">
        <button type="button" data-set-choice="interested" aria-pressed="${choice==='interested'}">Aktuell</button>
        <button type="button" data-set-choice="dismissed" aria-pressed="${choice==='dismissed'}">Legg bort</button>
      </div>
    </li>`;
  };
  function sync(){
    for(const li of root.querySelectorAll('[data-idea-place]')){
      const choice=decisions[li.dataset.ideaPlace]||'none';
      li.dataset.choiceState=choice;
      for(const button of li.querySelectorAll('button[data-set-choice]'))button.setAttribute('aria-pressed',String(button.dataset.setChoice===choice));
    }
    const values=Object.values(decisions);
    summary.textContent=`Dine valg: ${values.filter(x=>x==='interested').length} aktuelle · ${values.filter(x=>x==='dismissed').length} lagt bort. Andre står åpne.`;
  }
  function draw(active='all'){
    root.innerHTML=trip.route.filter(stop=>active==='all'||active===stop.id).map(stop=>{
      const ideas=data.ideas.filter(idea=>idea.baseId===stop.id);
      if(!ideas.length)return '';
      const base=byId.get(stop.id);
      return `<section class="day-ideas-destination destination-themed" style="${themeStyle(destinationTheme(trip,stop))}">
        <div class="day-ideas-heading"><div><span class="meta">${h(stop.nights?stop.nights+' netter':'Stopp underveis')} · ${ideas.length} mulige kombinasjoner</span>
        <h2>${h(base?.name||stop.filterLabel||stop.id)}</h2></div>
        <a href="places.html?base=${encodeURIComponent(stop.id)}">Alle steder →</a></div>
        <div class="day-idea-cards">${ideas.map(idea=>`<article class="day-idea-card">
          <span class="meta">${h(idea.effort)}${idea.bookingAnchorId?' · billett kan styre dagen':''}</span>
          <h3>${h(idea.title)}</h3><p>${h(idea.logic)}</p>
          <div class="day-idea-items"><div><strong>Passer naturlig sammen</strong><ul>${idea.corePlaceIds.map(id=>placeItem(id,false)).join('')}</ul></div>
          ${idea.optionalPlaceIds.length?`<div><strong>Mulige tillegg</strong><ul>${idea.optionalPlaceIds.map(id=>placeItem(id,true)).join('')}</ul></div>`:''}</div>
          <p class="day-idea-caution">${h(idea.watch)}</p></article>`).join('')}</div></section>`;
    }).join('')||'<p>Ingen dagidéer her ennå.</p>';
    sync();
  }
  const initial=setupChoiceFilters(document.getElementById('idea-filters'),
    trip.route.map(stop=>({value:stop.id,label:stop.filterLabel||byId.get(stop.id)?.name||stop.id,theme:stop.theme})),
    draw,{initialValue:new URLSearchParams(location.search).get('base')||'all'});
  root.addEventListener('click',e=>{
    const button=e.target.closest('button[data-set-choice]');if(!button)return;
    const id=button.closest('[data-idea-place]')?.dataset.ideaPlace;
    if(!byId.has(id)||!['interested','dismissed'].includes(button.dataset.setChoice))return;
    if(decisions[id]===button.dataset.setChoice)delete decisions[id];else decisions[id]=button.dataset.setChoice;
    try{localStorage.setItem(key,JSON.stringify(decisions));}catch{}
    sync();
  });
  document.getElementById('idea-copy-choices').addEventListener('click',async()=>{
    const selected=places.filter(p=>decisions[p.id]);
    if(!selected.length){status.textContent='Ingen vurderinger å kopiere ennå.';return;}
    const text='Japan 2027 – foreløpige ønsker\n'+selected.map(p=>(decisions[p.id]==='interested'?'Aktuell: ':'Lagt bort: ')+p.name).join('\n')+'\nIngen datoer eller bestillinger er fastsatt her.';
    try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);status.textContent='Kopiert. Kan limes inn i samtalen.';}catch{status.textContent='Kunne ikke kopiere automatisk.';}
  });
  draw(initial);
  document.getElementById('idea-storage-note').textContent=data.choicePolicy.note;
}
