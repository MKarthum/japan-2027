// Central browser-only UI state: shareable URL context and durable local preferences.
const JapanState=(()=>{
  const keys=Object.freeze({
    base:'japan-2027-selected-base-v1',party:'japan2027-price-party',
    map:'japan-2027-map-layers-v1',choices:'japan-2027-choices-v2',
    drone:'japan-2027-drone-checklist-v2'
  });
  const readLocal=(key,fallback=null)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
  const writeLocal=(key,value)=>{try{localStorage.setItem(key,String(value));return true;}catch{return false;}};
  const removeLocal=key=>{try{localStorage.removeItem(key);return true;}catch{return false;}};
  const readJson=(key,fallback)=>{try{return JSON.parse(readLocal(key,'null'))??fallback;}catch{return fallback;}};
  const getSelection=({param,values,storageKey=null,defaultValue='all'})=>{
    const valid=new Set(values),params=new URLSearchParams(location.search);
    if(params.has(param) && valid.has(params.get(param))){
      const requested=params.get(param);
      if(storageKey)writeLocal(storageKey,requested);
      return requested;
    }
    const stored=storageKey?readLocal(storageKey):null;
    return valid.has(stored)?stored:defaultValue;
  };
  const setSelection=({param,value,values,storageKey=null,defaultValue='all',navigate=false})=>{
    if(!new Set(values).has(value))return false;
    if(storageKey)writeLocal(storageKey,value);
    const url=new URL(location.href);
    if(value===defaultValue)url.searchParams.delete(param);
    else url.searchParams.set(param,value);
    if(navigate)location.assign(url.toString());
    else history.replaceState(history.state,'',url.pathname+url.search+url.hash);
    return true;
  };
  return Object.freeze({keys,readLocal,writeLocal,removeLocal,readJson,getSelection,setSelection});
})();
