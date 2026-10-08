// Read translated text from the existing Encore source. Identity/assets/numeric data remain in the original catalogs.
const languages={'pt-BR':'pt',es:'es'};
const TTL=6*60*60*1000;
const memory=new Map(), pending=new Map(), failures=new Map();
const queue=[];let active=0;
const plain=value=>String(value ?? '').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'');
function limited(work) {return new Promise((resolve,reject)=>{queue.push({work,resolve,reject});drain();});}
function drain() {while(active<4 && queue.length){const task=queue.shift();active++;Promise.resolve().then(task.work).then(task.resolve,task.reject).finally(()=>{active--;drain();});}}
const keyFor=(lang,kind,id='')=>`solaris:source-text:v1:${lang}:${kind}:${id}`;
export function getSourceText(lang,kind,id='') {
  const key=keyFor(lang,kind,id);let saved=memory.get(key);
  if(!saved)try{saved=JSON.parse(localStorage.getItem(key));if(saved?.data)memory.set(key,saved);}catch{}
  return saved?.data;
}
export function sourceTextFailed(lang,kind,id='') {return (failures.get(keyFor(lang,kind,id)) || 0)>Date.now();}
async function read(lang,kind,id='') {
  const key=keyFor(lang,kind,id), saved=getSourceText(lang,kind,id);
  if(saved && Date.now()-memory.get(key).time<TTL)return saved;
  if(pending.has(key))return pending.get(key);
  if(sourceTextFailed(lang,kind,id))throw Error('Localized text temporarily unavailable');
  const task=limited(async()=>{
    try {
      const response=await fetch(`https://api-v2.encore.moe/api/${languages[lang]}/${kind}${id?'/'+encodeURIComponent(id):''}`,{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('Localized source unavailable');
      const data=await response.json();
      if(!data || typeof data!=='object' || Array.isArray(data) || (id && Number(data.MonsterId || data.Id || id)!==Number(id)))throw Error('Invalid localized source');
      if(kind==='character' && !Array.isArray(data.Skills) || kind==='weapon' && typeof data.Desc!=='string' || kind==='echo' && (id?!data.FetterDetails:!(data.Echo || data.phantomsList)?.length))throw Error('Missing localized source text');
      const textData=kind==='character'?{Introduction:data.Introduction,Skills:(data.Skills || []).map(skill=>({SkillName:skill.SkillName,SkillType:skill.SkillType,SkillDescribe:skill.SkillDescribe}))}:kind==='weapon'?{Desc:data.Desc,ResonName:data.ResonName,AttributesDescription:data.AttributesDescription || data.BgDescription}:id?{FetterDetails:data.FetterDetails}:{Echo:(data.Echo || data.phantomsList || []).map(echo=>({Id:echo.Id,Attributes:plain(echo.Attributes),FetterGroups:(echo.FetterGroups || []).map(group=>({Id:group.Id,Name:group.Name}))}))};
      const entry={time:Date.now(),data:textData};memory.set(key,entry);
      try{localStorage.setItem(key,JSON.stringify(entry));}catch{}
      failures.delete(key);return textData;
    } catch(error){failures.set(key,Date.now()+60000);if(saved)return saved;throw error;}
  });pending.set(key,task);
  try{return await task;}finally{pending.delete(key);}
}
export async function loadSourceText(lang,kind,id) {
  if(!languages[lang])return null;
  if(!['character','weapon','echo'].includes(kind) || !/^\d+$/.test(String(id)))throw Error('Invalid source text request');
  return read(lang,kind,id);
}
export const sourcePlainText=plain;
const echoPending=new Map();
export async function loadEchoSourceText(lang,sets) {
  if(!languages[lang] || !sets.length)return null;
  const key=keyFor(lang,'sonatas');
  const saved=getSourceText(lang,'sonatas');
  if(saved && Date.now()-memory.get(key).time<TTL && sets.every(set=>saved[set.id]))return saved;
  if(echoPending.has(lang))return echoPending.get(lang);
  if(sourceTextFailed(lang,'sonatas'))throw Error('Localized Sonata text unavailable');
  const task=(async()=>{
    try {
      const payload=await read(lang,'echo');
      if(!Array.isArray(payload.Echo))throw Error('Invalid localized Echo list');
      const remaining=new Set(sets.map(set=>Number(set.id))), selected=[];
      for(const echo of payload.Echo){if((echo.FetterGroups || []).some(group=>remaining.has(Number(group.Id)))){selected.push(echo);for(const group of echo.FetterGroups || [])remaining.delete(Number(group.Id));}}
      const bonuses={};
      await Promise.all(selected.map(async echo=>{
        const detail=await read(lang,'echo',echo.Id);
        for(const group of echo.FetterGroups || []){
          const localized=detail.FetterDetails?.[group.Name];
          if(localized?.EffectDescriptions?.length)bonuses[group.Id]=localized.EffectDescriptions.map(plain);
        }
      }));
      if(sets.some(set=>!bonuses[set.id] || bonuses[set.id].length<set.bonuses.length))throw Error('Incomplete localized Sonata text');
      const entry={time:Date.now(),data:bonuses};memory.set(key,entry);
      try{localStorage.setItem(key,JSON.stringify(entry));}catch{}
      failures.delete(key);return bonuses;
    }catch(error){failures.set(key,Date.now()+60000);if(saved)return saved;throw error;}
  })();echoPending.set(lang,task);
  try{return await task;}finally{echoPending.delete(lang);}
}
