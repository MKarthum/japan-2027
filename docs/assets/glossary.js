/* Shared glossary renderer. Definitions and activated terms live ONLY in data/guide.json. */
(async function initJapaneseGlossary() {
  const root=document.querySelector('main');
  if(!root)return;
  let guide;
  try { guide=await json('data/guide.json'); }
  catch(error){ console.warn('Ordliste ikke tilgjengelig',error); return; }
  const words=(guide.placeWords||[]).filter(x=>x.inline===true && x.term && x.meaning);
  const byAlias=new Map();
  words.forEach((word,index)=>{
    for(const value of [word.term,...(word.aliases||[])]){
      const key=value.toLocaleLowerCase('nb-NO');
      if(!byAlias.has(key))byAlias.set(key,{word,index});
    }
  });
  const escapeRegExp=value=>value.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
  const aliases=[...byAlias.keys()].sort((a,b)=>b.length-a.length);
  if(!aliases.length)return;
  const pattern=new RegExp('(?<![\\p{L}\\p{N}])('+aliases.map(escapeRegExp).join('|')+')(?![\\p{L}\\p{N}])','giu');
  const excluded='a,button,nav,script,style,textarea,input,select,label,code,pre,svg,[contenteditable],.glossary-popover,#place-words,.language-row,.maplibregl-map,.maplibregl-control-container';
  let openButton=null;
  const popover=document.createElement('div');
  popover.className='glossary-popover';
  popover.id='japanese-glossary-popover';
  popover.setAttribute('role','dialog');
  popover.setAttribute('aria-label','Kort ordforklaring');
  popover.hidden=true;
  document.body.appendChild(popover);
  function close({restoreFocus=false}={}){
    if(openButton){
      openButton.setAttribute('aria-expanded','false');
      if(restoreFocus&&openButton.isConnected)openButton.focus();
    }
    openButton=null;
    popover.hidden=true;
    popover.replaceChildren();
  }
  function reposition(){
    if(!openButton||popover.hidden)return;
    const rect=openButton.getBoundingClientRect();
    const width=Math.min(340,window.innerWidth-24);
    popover.style.width=width+'px';
    popover.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12))+'px';
    popover.style.top='0px';
    const height=popover.getBoundingClientRect().height;
    const roomBelow=window.innerHeight-rect.bottom-12;
    const top=roomBelow>=height || roomBelow>=rect.top-12
      ? Math.min(window.innerHeight-height-12,rect.bottom+8)
      : Math.max(12,rect.top-height-8);
    popover.style.top=Math.max(12,top)+'px';
  }
  function show(button){
    if(openButton===button){close({restoreFocus:true});return;}
    close();
    const word=words[Number(button.dataset.glossaryIndex)];
    if(!word)return;
    openButton=button;
    button.setAttribute('aria-expanded','true');
    const heading=document.createElement('strong');
    heading.className='glossary-popover-title';
    heading.textContent=word.term;
    const body=document.createElement('p');
    body.textContent=word.meaning;
    const header=document.createElement('div');
    header.className='glossary-popover-header';
    header.append(heading);
    if(word.japanese){
      const kanji=document.createElement('span');
      kanji.lang='ja';
      kanji.className='glossary-popover-japanese';
      kanji.textContent=word.japanese;
      header.append(kanji);
    }
    const dismiss=document.createElement('button');
    dismiss.type='button';
    dismiss.className='glossary-popover-close';
    dismiss.setAttribute('aria-label','Lukk ordforklaring');
    dismiss.textContent='×';
    dismiss.addEventListener('click',()=>close({restoreFocus:true}));
    header.append(dismiss);
    popover.append(header,body);
    popover.hidden=false;
    reposition();
    dismiss.focus({preventScroll:true});
  }
  function mark(){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
      acceptNode(node){
        if(!node.nodeValue?.trim())return NodeFilter.FILTER_REJECT;
        const parent=node.parentElement;
        if(!parent||parent.closest(excluded))return NodeFilter.FILTER_REJECT;
        if(!parent.closest('p,li,strong,h1,h2,h3,h4,blockquote,span,td,small,[data-glossary-text]'))return NodeFilter.FILTER_REJECT;
        pattern.lastIndex=0;
        return pattern.test(node.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
      }
    });
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      if(!node.isConnected)continue;
      const source=node.nodeValue;
      pattern.lastIndex=0;
      const matches=[...source.matchAll(pattern)];
      if(!matches.length)continue;
      const parent=node.parentElement;
      const scope=parent.closest('.place-list-card,.day-idea-card,.restaurant-card,.hotel-card,.related-card,.detail-hero,.card,.section,.place-destination-group')||root;
      const used=new Set([...scope.querySelectorAll('.glossary-term[data-glossary-index]')].map(el=>el.dataset.glossaryIndex));
      let cursor=0,changed=false;
      const fragment=document.createDocumentFragment();
      for(const match of matches){
        const key=match[0].toLocaleLowerCase('nb-NO');
        const info=byAlias.get(key);
        if(!info)continue;
        const index=String(info.index);
        if(used.has(index))continue;
        fragment.append(document.createTextNode(source.slice(cursor,match.index)));
        const button=document.createElement('button');
        button.type='button';
        button.className='glossary-term';
        button.textContent=match[0];
        button.dataset.glossaryIndex=index;
        button.title='Hva betyr '+info.word.term+'?';
        button.setAttribute('aria-label',match[0]+': trykk for forklaring');
        button.setAttribute('aria-expanded','false');
        button.setAttribute('aria-controls',popover.id);
        fragment.append(button);
        cursor=match.index+match[0].length;
        used.add(index);
        changed=true;
      }
      if(changed){
        fragment.append(document.createTextNode(source.slice(cursor)));
        node.replaceWith(fragment);
      }
    }
  }
  let scheduled=false;
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;mark();});
  }
  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>m.addedNodes.length))schedule();
  });
  observer.observe(root,{childList:true,subtree:true});
  mark();
  root.addEventListener('click',event=>{
    const button=event.target.closest('.glossary-term[data-glossary-index]');
    if(button)show(button);
  });
  document.addEventListener('pointerdown',event=>{
    if(openButton&&!popover.contains(event.target)&&!openButton.contains(event.target))close();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&openButton){event.preventDefault();close({restoreFocus:true});}
  });
  window.addEventListener('scroll',()=>{if(openButton)close();},{passive:true,capture:true});
  window.addEventListener('resize',()=>{if(openButton)reposition();},{passive:true});
})();