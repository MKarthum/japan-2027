import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('docs/assets/state.js','utf8');
const storage=new Map();
let current=new URL('https://example.test/japan/docs/places.html');
const location={
  get href(){return current.href},
  get search(){return current.search},
  assign(url){current=new URL(url)}
};
const history={
  state:{marker:1},
  replaceState(state,title,path){current=new URL(path,current.origin)}
};
const localStorage={
  getItem:k=>storage.get(k)??null,
  setItem:(k,v)=>storage.set(k,String(v)),
  removeItem:k=>storage.delete(k)
};
const context={URL,URLSearchParams,location,history,localStorage};
vm.runInNewContext(source+'; globalThis.state=JapanState;',context);
const s=context.state,valid=['all','tokyo','hiroshima','himeji'];
const getBase=()=>s.getSelection({param:'base',values:valid,storageKey:s.keys.base});
const setBase=value=>s.setSelection({param:'base',value,values:valid,storageKey:s.keys.base});
assert.equal(getBase(),'all');
assert.equal(setBase('hiroshima'),true);
assert.equal(current.search,'?base=hiroshima');
assert.equal(getBase(),'hiroshima');
assert.equal(storage.get(s.keys.base),'hiroshima');
current=new URL('https://example.test/japan/docs/food.html');
assert.equal(getBase(),'hiroshima');
current=new URL('https://example.test/japan/docs/hotels.html?base=tokyo&type=ryokan&party=two-families#details');
assert.equal(getBase(),'tokyo');
assert.equal(storage.get(s.keys.base),'tokyo');
setBase('hiroshima');
assert.equal(current.search,'?base=hiroshima&type=ryokan&party=two-families');
assert.equal(current.hash,'#details');
const hotel=['all','ryokan','hotel'];
s.setSelection({param:'type',value:'hotel',values:hotel});
assert.equal(current.searchParams.get('type'),'hotel');
assert.equal(current.searchParams.get('base'),'hiroshima');
assert.equal(current.searchParams.get('party'),'two-families');
assert.equal(storage.has('type'),false);
s.setSelection({param:'type',value:'all',values:hotel});
assert.equal(current.searchParams.has('type'),false);
assert.equal(current.searchParams.get('base'),'hiroshima');
const topic=['all','sakura','historie'];
current=new URL('https://example.test/japan/docs/places.html?base=hiroshima&party=two-families');
s.setSelection({param:'topic',value:'sakura',values:topic});
assert.equal(current.searchParams.get('topic'),'sakura');
assert.equal(getBase(),'hiroshima');
assert.equal(s.getSelection({param:'topic',values:topic}),'sakura');
s.setSelection({param:'topic',value:'all',values:topic});
assert.equal(current.searchParams.has('topic'),false);
current=new URL('https://example.test/japan/docs/food.html?base=old-destination');
assert.equal(getBase(),'hiroshima');
assert.equal(storage.get(s.keys.base),'hiroshima');
assert.equal(setBase('invalid'),false);
assert.equal(getBase(),'hiroshima');
current=new URL('https://example.test/japan/docs/places.html?base=all');
assert.equal(getBase(),'all');
assert.equal(storage.get(s.keys.base),'all');
assert.equal(s.setSelection({param:'party',value:'two-families',values:['one-family','two-families'],defaultValue:'one-family',storageKey:s.keys.party,navigate:true}),true);
assert.equal(current.searchParams.get('party'),'two-families');
assert.equal(storage.get(s.keys.party),'two-families');
s.writeLocal(s.keys.map,'{bad-json');
assert.deepEqual(s.readJson(s.keys.map,{}),{});
s.writeLocal(s.keys.map,'{"food":false}');
s.writeLocal(s.keys.choices,'{"place:shibuya":"interested"}');
assert.equal(s.readJson(s.keys.map,{}).food,false);
assert.equal(s.readJson(s.keys.choices,{} )['place:shibuya'],'interested');
assert.equal(s.readLocal(s.keys.base),'all');
assert.equal(s.readLocal(s.keys.party),'two-families');
const files=fs.readdirSync('docs').filter(x=>x.endsWith('.html')&&x!=='phrases.html');
for(const file of files){
  const page=fs.readFileSync('docs/'+file,'utf8');
  assert(page.includes('assets/state.js?v='),'missing state script: '+file);
  assert(page.indexOf('assets/state.js')<page.indexOf('assets/app.js'),'state must load before app: '+file);
  if(page.includes('assets/map-shared.js'))assert(page.indexOf('assets/state.js')<page.indexOf('assets/map-shared.js'),'state must load before map: '+file);
}
const app=fs.readFileSync('docs/assets/app.js','utf8');
const map=fs.readFileSync('docs/assets/map-shared.js','utf8');
const choices=fs.readFileSync('docs/assets/choices.js','utf8');
for(const [name,code] of [['app.js',app],['map-shared.js',map],['choices.js',choices]]){
  assert(!/localStorage[.[]/.test(code),'direct storage access bypasses state.js in '+name);
}
assert(app.includes("param:'topic'") && app.includes("param:'type'") && app.includes('setupUrlFilters'));
const drones=JSON.parse(fs.readFileSync('docs/data/drones.json','utf8'));
const ids=drones.takeoff.map(x=>x.id);
assert.equal(ids.length,new Set(ids).size);
assert(drones.takeoff.every(x=>x.id&&x.label));
assert(app.includes('JapanState.keys.drone') && app.includes('japan2027-drone-check-'));
console.log('PASS: common state policy, URL isolation, legacy keys, persistence, invalid URL handling and all script load orders');
