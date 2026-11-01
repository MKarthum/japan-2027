/* Historisk innhold bor kun i data/history.json. Dette er delt visning. */
const historyEsc = value => escapeSiteHtml(value);
const historyPlaceLink = p => '<a href="place.html?id='+encodeURIComponent(p.id)+'">'+historyEsc(p.name)+' <span aria-hidden="true">↗</span></a>';
const historySourceLink = s => '<a href="'+historyEsc(s.url)+'" target="_blank" rel="noopener noreferrer">'+historyEsc(s.title)+' <span aria-hidden="true">↗</span></a>';
const historyRefs = (ids, bySource) => (ids||[]).map(id=>bySource.get(id)).filter(Boolean);

function historyContextCard(chapter, sourceById, placesById) {
  const linked=(chapter.placeIds||[]).map(id=>placesById.get(id)).filter(Boolean);
  return '<article class="history-chapter" id="chapter-'+historyEsc(chapter.id)+'" tabindex="-1">'+
    '<div class="history-chapter-header"><span class="history-period">'+historyEsc(chapter.period)+'</span>'+
    '<h3>'+historyEsc(chapter.title)+'</h3><p class="history-chapter-lead">'+historyEsc(chapter.lead)+'</p></div>'+
    '<div class="history-chapter-body">'+(chapter.body||[]).map(p=>'<p>'+historyEsc(p)+'</p>').join('')+'</div>'+
    '<p class="history-chapter-insight"><strong>Dette hjelper oss å forstå</strong> '+historyEsc(chapter.insight)+'</p>'+
    (linked.length?'<div class="history-related"><span class="meta">Se sammenhengen i guiden</span><div class="history-related-links">'+linked.map(historyPlaceLink).join('')+'</div></div>':'')+
    '<details class="history-chapter-sources"><summary>Kilder til dette kapitlet</summary><ul>'+
    historyRefs(chapter.sourceIds,sourceById).map(s=>'<li>'+historySourceLink(s)+'</li>').join('')+'</ul></details>'+
    '</article>';
}

async function renderHistory(){
  nav('history'); footer();
  const [history,places]=await Promise.all([json('data/history.json'),json('data/places.json'),applyPageCopy('history')]).then(([data,p])=>[data,p]);
  const pById=new Map(places.map(p=>[p.id,p]));
  const cById=new Map(history.chapters.map(c=>[c.id,c]));
  const sById=new Map(history.sources.map(s=>[s.id,s]));
  document.getElementById('history-framing').textContent=history.framing;
  document.getElementById('history-jump-list').innerHTML=history.chapters.map((c,i)=>
    '<a href="#chapter-'+historyEsc(c.id)+'"><span class="history-jump-index">'+String(i+1).padStart(2,'0')+'</span>'+
    '<span>'+historyEsc(c.title)+'</span></a>').join('');
  document.getElementById('history-chapters').innerHTML=history.chapters.map(c=>historyContextCard(c,sById,pById)).join('');
  document.getElementById('history-people-grid').innerHTML=history.people.map(person=>
    '<article class="history-person"><span class="meta">'+historyEsc(person.time)+'</span><h3>'+historyEsc(person.name)+'</h3>'+
    '<strong>'+historyEsc(person.role)+'</strong><p>'+historyEsc(person.text)+'</p>'+
    '<a href="#chapter-'+historyEsc(person.chapterId)+'">Finn epoken: '+historyEsc(cById.get(person.chapterId)?.title||'')+' →</a></article>').join('');
  document.getElementById('history-themes-grid').innerHTML=history.themes.map(t=>{
    const linked=t.placeIds.map(id=>pById.get(id)).filter(Boolean);
    return '<article class="history-theme" id="theme-'+historyEsc(t.id)+'" tabindex="-1"><h3>'+historyEsc(t.title)+'</h3>'+
      '<p class="history-theme-lead">'+historyEsc(t.lead)+'</p><p>'+historyEsc(t.body)+'</p>'+
      '<div class="history-theme-links">'+t.chapterIds.map(id=>'<a href="#chapter-'+historyEsc(id)+'">'+historyEsc(cById.get(id)?.title||id)+'</a>').join('')+'</div>'+
      (linked.length?'<div class="history-related"><span class="meta">Steder</span><div class="history-related-links">'+linked.map(historyPlaceLink).join('')+'</div></div>':'')+
      (t.links?.length?'<div class="history-theme-more">'+t.links.map(link=>'<a href="'+historyEsc(link.href)+'">'+historyEsc(link.title)+' →</a>').join('')+'</div>':'')+
      '</article>';
  }).join('');
  document.getElementById('history-source-index').innerHTML=
    '<p class="small">Opplysningene er kontrollert mot oppslagsverk, museer og institusjoner. Kildevalget per kapittel finner du ved å åpne «Kilder til dette kapitlet».</p>'+
    '<div class="history-source-links">'+history.sources.map(s=>historySourceLink(s)).join('')+'</div>';
  if(location.hash){
    const id=decodeURIComponent(location.hash.slice(1));
    const target=document.getElementById(id);
    if(target)requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
  }
}

async function renderPlaceHistory(placeId){
  const root=document.getElementById('place-history');
  if(!root)return;
  try{
    const history=await json('data/history.json');
    const chapters=history.chapters.filter(c=>(c.placeIds||[]).includes(placeId));
    const themes=history.themes.filter(t=>(t.placeIds||[]).includes(placeId));
    if(!chapters.length&&!themes.length)return;
    root.hidden=false;
    const ids=chapters.slice(0,3);
    root.innerHTML='<div class="section-head"><div><div class="eyebrow">Historisk sammenheng</div><h2>Hvor passer stedet inn i Japans historie?</h2></div>'+
      '<p>Kort kontekst før besøket. Les mer i den samlede historien.</p></div>'+
      '<div class="history-on-place">'+ids.map(c=>'<article><span class="meta">'+historyEsc(c.period)+'</span>'+
      '<h3><a href="history.html#chapter-'+historyEsc(c.id)+'">'+historyEsc(c.title)+'</a></h3>'+
      '<p>'+historyEsc(c.insight)+'</p></article>').join('')+'</div>'+
      (themes.length?'<p class="small history-on-place-themes">Se også: '+themes.slice(0,3).map(t=>
      '<a href="history.html#theme-'+historyEsc(t.id)+'">'+historyEsc(t.title)+'</a>').join(' · ')+'</p>':'')+
      '<p><a href="history.html">Se hele fortellingen om Japans historie →</a></p>';
  }catch(error){
    console.warn('Historisk bakgrunn kunne ikke lastes',error);
  }
}
