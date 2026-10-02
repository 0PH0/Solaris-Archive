const SOURCE = 'https://api-v2.encore.moe/api/en/weapon';
const TTL = 6 * 60 * 60 * 1000;
const pending = new Map();
const memory = new Map();
export const weaponSlug = name => String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const plain = text => String(text || '').replace(/<[^>]*>/g,'');
async function cached(key, url) {
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{
    let saved=memory.get(key);try{saved ||= JSON.parse(localStorage.getItem(key));}catch{}
    if(saved && Date.now()-saved.time<TTL){memory.set(key,saved);return saved.data;}
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('Encore unavailable');
      const data=await response.json();
      if(!data || !(Array.isArray(data.weapons) || data.WeaponName))throw Error('Invalid weapon data');
      const entry={time:Date.now(),data};
      memory.set(key,entry);
      try{localStorage.setItem(key,JSON.stringify(entry));}catch{}
      return data;
    }catch(error){if(saved?.data)return saved.data;throw error;}
  })();pending.set(key,task);
  try{return await task;}finally{pending.delete(key);}
}
export async function loadWeaponCatalog(){
  const payload=await cached('solaris:weapon-catalog:v1',SOURCE);
  const unique=new Map();
  for(const w of payload.weapons || []){
    if(!w.Name || !/^https:\/\/api\.encore\.moe\//.test(w.Icon))continue;
    const slug=weaponSlug(w.Name);
    unique.set(slug,{id:w.Id,slug,name:plain(w.Name),type:plain(w.TypeName),rarity:Number(w.QualityId),iconUrl:w.Icon});
  }
  if(!unique.size)throw Error('Empty weapon catalog');
  return [...unique.values()];
}
export async function loadWeaponDetail(id){
  const data=await cached('solaris:weapon-detail:v1:'+id,SOURCE+'/'+encodeURIComponent(id));
  return {passive:plain(data.Desc),passiveName:plain(data.ResonName),description:plain(data.AttributesDescription || data.BgDescription),properties:(data.Properties || []).map(p=>({name:plain(p.Name),values:(p.GrowthValues || []).filter(v=>[1,20,40,60,80,90].includes(v.Level)).map(v=>({level:v.Level,value:plain(v.Value)}))})),source:SOURCE+'/'+id};
}
