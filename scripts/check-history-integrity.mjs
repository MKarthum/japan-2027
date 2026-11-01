import fs from 'node:fs';
import {Script} from 'node:vm';

const read=(p)=>fs.readFileSync(p,'utf8');
const data=JSON.parse(read('docs/data/history.json'));
const places=JSON.parse(read('docs/data/places.json'));
const pages=JSON.parse(read('docs/data/pages.json'));
const errors=[];
const unique=(xs,label)=>{
  const set=new Set();
  for(const x of xs){
    if(!x.id||set.has(x.id))errors.push(label+': ugyldig eller duplisert ID '+x.id);
    set.add(x.id);
  }
  return set;
};
const chapterIds=unique(data.chapters||[],'kapitler');
const peopleIds=unique(data.people||[],'personer');
const themeIds=unique(data.themes||[],'temaer');
const sourceIds=unique(data.sources||[],'kilder');
const placeIds=new Set(places.map(p=>p.id));
const requiredChapters=['jomon-yayoi','yamato-asuka','nara','heian','kamakura','muromachi','sengoku','edo','meiji','taisho','war','occupation','growth','today'];
for(const id of requiredChapters)if(!chapterIds.has(id))errors.push('Mangler historisk kapittel '+id);
if((data.chapters||[]).length<14||(data.people||[]).length<8||(data.themes||[]).length<5||(data.sources||[]).length<12){
  errors.push('Historiefortellingen er ufullstendig');
}
for(const source of data.sources||[]){
  if(!source.title||!/^https:\/\//.test(source.url||''))errors.push('Kilde mangler HTTPS-lenke: '+source.id);
}
const checkSources=(x,label)=>{
  if(!Array.isArray(x.sourceIds)||x.sourceIds.length===0)errors.push(label+' mangler kilder');
  for(const id of x.sourceIds||[])if(!sourceIds.has(id))errors.push(label+' viser til ukjent kilde '+id);
};
const wordCount=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const checkPlaces=(x,label)=>{
  for(const id of x.placeIds||[])if(!placeIds.has(id))errors.push(label+' viser til ukjent sted '+id);
};
for(const c of data.chapters||[]){
  if(!c.period||!c.title||!c.lead||!c.insight||!Array.isArray(c.body)||c.body.length<3||c.body.some(p=>p.length<40)||wordCount(c.body.join(' '))<110)errors.push('Kapittel mangler en lesbar utvikling med flere avsnitt: '+c.id);
  if(!Array.isArray(c.wikipediaLinks)||!c.wikipediaLinks.length||c.wikipediaLinks.length>3){
    errors.push('Kapittel '+c.id+' skal ha et kuratert utvalg Wikipedia-artikler');
  }
  for(const link of c.wikipediaLinks||[]){
    if(!link.title||!/^https:\/\/en\.wikipedia\.org\/wiki\/[A-Za-z0-9_%()-]+$/.test(link.url||'')){
      errors.push('Kapittel '+c.id+' har ugyldig Wikipedia-lenke');
    }
  }
  checkSources(c,'kapittel '+c.id);
  checkPlaces(c,'kapittel '+c.id);
  for(const id of c.people||[])if(!peopleIds.has(id))errors.push('Kapittel '+c.id+' har ukjent person '+id);
}
for(const p of data.people||[]){
  if(!p.name||!p.role||!p.text||wordCount(p.text)<35||!chapterIds.has(p.chapterId))errors.push('Persontekst må forklare handling og betydning: '+p.id);
  if(!/^https:\/\/en\.wikipedia\.org\/wiki\/[A-Za-z0-9_%()-]+$/.test(p.wikipediaUrl||'')){
    errors.push('Person '+p.id+' mangler gyldig Wikipedia-lenke');
  }
  checkSources(p,'person '+p.id);
}
for(const t of data.themes||[]){
  if(!t.title||!t.lead||!t.body||wordCount(t.body)<60||!Array.isArray(t.chapterIds)||!t.chapterIds.length)errors.push('Tema trenger sammenheng og kontekst: '+t.id);
  for(const id of t.chapterIds||[])if(!chapterIds.has(id))errors.push('Tema '+t.id+' har ukjent kapittel '+id);
  for(const l of t.links||[])if(!l.title||!/^(?:food|prep|places|history|language)\.html(?:[?#].*)?$/.test(l.href||''))errors.push('Tema har ugyldig lokal lenke '+l.href);
  checkPlaces(t,'tema '+t.id);
  checkSources(t,'tema '+t.id);
}
const unification=(data.chapters||[]).find(x=>x.id==='sengoku');
const sengokuText=(unification?.body||[]).join(' ');
for(const [person,pattern] of [
  ['Nobunaga',/nobunaga/i],
  ['Hideyoshi',/hideyoshi/i],
  ['Ieyasu',/ieyasu/i]
]){
  if(!pattern.test(sengokuText))errors.push('Rikssamlingen må fortelle hva '+person+' faktisk gjorde');
}
for(const year of ['1582','1590','1598','1600','1603']){
  if(!sengokuText.includes(year))errors.push('Rikssamlingen mangler sentralt vendepunkt '+year);
}
if((unification?.body||[]).length<5||wordCount(sengokuText)<300){
  errors.push('Rikssamlingskapitlet skal forklare årsaker, rivalisering, handlinger og konsekvenser, ikke bare liste navn');
}
const hanzo=(data.people||[]).find(p=>p.id==='hanzo');
const sengoku=(data.chapters||[]).find(c=>c.id==='sengoku');
const edo=(data.chapters||[]).find(c=>c.id==='edo');
if(!hanzo||!hanzo.text.includes('legende')||
 !hanzo.sourceIds.includes('hanzo-iga-museum')||
 !sengoku?.people.includes('hanzo')||
 !sengoku?.placeIds.includes('chidorigafuchi-hanzomon')||
 !edo?.placeIds.includes('chidorigafuchi-hanzomon')){
  errors.push('Hattori Hanzō må ha kildebelagt og nyansert skille mellom historie og legende, knyttet til Sengoku og Hanzōmon');
}
if(!(data.chapters||[]).some(c=>c.placeIds.length===0))errors.push('Historien skal også dekke stoff utenfor reiseruten');
if(!data.framing?.includes('overlapper'))errors.push('Omtrentlig og overlappende kronologi skal forklares');
if(!/1931/.test(JSON.stringify(data.chapters.find(c=>c.id==='war')))||!/1947/.test(JSON.stringify(data.chapters.find(c=>c.id==='occupation'))))errors.push('Viktige historiske vendepunkter er falt ut');
const prepNav=pages.navigation?.sections?.find(x=>x.source==='prep');
if(!pages.history?.title||!prepNav?.items?.some(x=>x.key==='history'&&x.href==='history.html')||
  pages.navigation.sections.some(x=>x.key==='history')){
  errors.push('Historie skal være en underside under Før turen, ikke eget hovedmenypunkt');
}
const historyHtml=read('docs/history.html');
const placeHtml=read('docs/place.html');
const homeHtml=read('docs/index.html');
const prepHtml=read('docs/prep.html');
const foodHtml=read('docs/food.html');
const prepScript=read('docs/assets/app.js');
const historyJs=read('docs/assets/history.js');
const searchJs=read('docs/assets/choices.js');
if(!searchJs.includes("json('data/history.json')")||
 !searchJs.includes("history.chapters.map")||
 !searchJs.includes("history.people.map")||
 !searchJs.includes("history.themes.map")){
  errors.push('Det felles søket mangler historiske kapitler, personer eller temaer');
}
for(const [file,content,regex] of [
 ['history.html',historyHtml,/renderHistory\(\)/],
 ['place.html',placeHtml,/id="place-history"/],
 ['place.html',placeHtml,/assets\/history\.js/],
 ['prep.html',prepHtml,/href="history\.html"/],
 ['food.html',foodHtml,/href="history\.html#theme-mat"/],
 ['app.js',prepScript,/renderPlaceHistory\(p\.id\)/],
 ['app.js',prepScript,/selected\.slug==='historie'/],
 ['history.js',historyJs,/history\.html#chapter-/]
])if(!regex.test(content))errors.push(file+' mangler historiekobling '+regex);
if(!historyJs.includes('history-wiki-links')||!historyJs.includes('history-person-links')){
  errors.push('Historievisningen skal tilby Wikipedia fra kapitler og personkort');
}
if(homeHtml.includes('<a href="history.html"><strong>Japans historie</strong>')){
  errors.push('Historie skal ikke vises som primærkort på forsiden');
}
try{new Script(historyJs,{filename:'docs/assets/history.js'});}catch(e){errors.push('Ugyldig JavaScript: '+e.message);}
if(errors.length){console.error('Historiekontroll feilet:\n'+errors.map(x=>'- '+x).join('\n'));process.exit(1);}
console.log('OK: '+data.chapters.length+' historiekapitler, '+data.people.length+' personer, '+data.themes.length+' temaer, '+data.sources.length+' kilder og alle steds-/sidelenker er gyldige.');
