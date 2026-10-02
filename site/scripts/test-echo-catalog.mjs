import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEchoCatalog, loadEchoCatalog, readEchoCatalogCache } from '../public/echo-catalog.js';
const record = (Id, Name, extra = {}) => ({Id, Name, PhantomType: 1, Rarity: 0, Icon: `https://api.encore.moe/resource/${Id}.webp`, FetterGroups: [{Name: 'Test Sonata', Fetters: [{Key: 3, EffectDescription: 'Three pieces'}]}], ...extra});
test('all names are retained without a limit; only duplicate and unresolved names are excluded', () => {
  const entries = Array.from({length: 300}, (_,i)=>record(i,'Echo '+i));
  const catalog = normalizeEchoCatalog({Echo:[...entries, record(500,'Echo 0',{PhantomType:2}),record(501,'MonsterInfo_999_Name')]});
  assert.equal(catalog.echoes.length,300);
  assert.equal(new Set(catalog.echoes.map(e=>e.slug)).size,300);
  assert.equal(catalog.echoes.find(e=>e.name==='Echo 0').id,0);
  assert.equal(catalog.sets[0].bonuses[0].count,3);
});
test('cost, icon and variants come from the source; named Phantom variants are distinct', () => {
  const catalog = normalizeEchoCatalog({Echo:[record(1,'Clang Bang'),record(2,'Phantom: Clang Bang'),record(3,'Elite',{Rarity:1}),record(4,'Boss',{Rarity:2}),record(5,'Calamity',{Rarity:3})]});
  assert.equal(catalog.echoes.length,5);
  assert.deepEqual(Object.fromEntries(catalog.echoes.map(e=>[e.name,e.cost])),{'Boss':4,'Calamity':4,'Elite':3,'Clang Bang':1,'Phantom: Clang Bang':1});
  assert.equal(catalog.echoes.find(e=>e.id===2).iconUrl,'https://api.encore.moe/resource/2.webp');
});
test('parallel requests and fresh cache avoid extra fetches; offline uses stale cache', async () => {
  const savedFetch=globalThis.fetch, savedStorage=globalThis.localStorage;
  const storage=new Map(); let calls=0;
  globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
  globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({Echo:[record(1,'Echo')]})};};
  try {
    const results=await Promise.all([loadEchoCatalog(),loadEchoCatalog()]);
    assert.equal(calls,1);assert.equal(results[0].echoes.length,1);
    await loadEchoCatalog();assert.equal(calls,1);
    const key=[...storage.keys()][0], cached=JSON.parse(storage.get(key));
    cached.updatedAt=0;storage.set(key,JSON.stringify(cached));
    globalThis.fetch=async()=>{throw Error('offline');};
    assert.equal((await loadEchoCatalog()).stale,true);
    storage.set(key,'broken');assert.equal(readEchoCatalogCache(),null);
    await assert.rejects(loadEchoCatalog());
  } finally {globalThis.fetch=savedFetch;globalThis.localStorage=savedStorage;}
});
