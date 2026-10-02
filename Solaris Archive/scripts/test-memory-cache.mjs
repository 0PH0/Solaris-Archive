import { test } from 'node:test';
import assert from 'node:assert/strict';

test('catalogs deduplicate and retain TTL/stale fallback when storage is blocked', async () => {
  const originalFetch=globalThis.fetch, originalStorage=globalThis.localStorage, originalNow=Date.now;
  let now=Date.now(), calls=0, offline=false;
  Date.now=()=>now;
  globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  globalThis.fetch=async url=>{
    calls++;
    if(offline)throw Error('offline');
    return {ok:true,json:async()=>String(url).endsWith('/echo') ? {Echo:[{Id:1,Name:'Test Echo',PhantomType:1,Rarity:0,Icon:'https://api.encore.moe/resource/1.webp',FetterGroups:[{Name:'Test Set',Fetters:[]}]}]} : {weapons:[{Id:1,Name:'Test Weapon',Icon:'https://api.encore.moe/resource/weapon.webp',QualityId:4,TypeName:'Sword'}]}};
  };
  try {
    const {loadEchoCatalog}=await import('../public/echo-catalog.js?memory-test');
    const {loadWeaponCatalog}=await import('../public/weapon-catalog.js?memory-test');
    await Promise.all([loadEchoCatalog(),loadEchoCatalog(),loadWeaponCatalog(),loadWeaponCatalog()]);
    assert.equal(calls,2,'One request per catalog');
    await Promise.all([loadEchoCatalog(),loadWeaponCatalog()]);assert.equal(calls,2,'Fresh memory avoids requests');
    now+=6*60*60*1000+1;
    await Promise.all([loadEchoCatalog(),loadWeaponCatalog()]);assert.equal(calls,4,'Expired memory revalidates');
    now+=6*60*60*1000+1;offline=true;
    assert.equal((await loadEchoCatalog()).stale,true);
    assert.equal((await loadWeaponCatalog())[0].name,'Test Weapon');
    assert.equal(calls,6,'Offline attempts revalidation before stale fallback');
  } finally {globalThis.fetch=originalFetch;globalThis.localStorage=originalStorage;Date.now=originalNow;}
});

test('character details share requests, limit parallel fetches and preserve offline cached data',async()=>{
  const originalFetch=globalThis.fetch, originalStorage=globalThis.localStorage, originalNow=Date.now;
  let now=Date.now(),calls=0,active=0,maximum=0,offline=false;
  Date.now=()=>now;globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  globalThis.fetch=async url=>{
    calls++;active++;maximum=Math.max(maximum,active);
    await new Promise(resolve=>setTimeout(resolve,5));active--;
    if(offline)throw Error('Offline');
    return {ok:true,json:async()=>({id:Number(url.split('/').pop()),name:'Test Resonator',stats:{HP:10000}})};
  };
  try {
    const {loadCharacterDetail,getCharacterDetail}=await import('../public/character-catalog.js?cache-test');
    await Promise.all(['1311','1311','1312','1313','1314','1315'].map(loadCharacterDetail));
    assert.equal(calls,5);assert.equal(maximum,3);assert.equal(getCharacterDetail('1311').stats.HP,10000);
    await loadCharacterDetail('1311');assert.equal(calls,5);
    now+=6*60*60*1000+1;offline=true;
    assert.equal((await loadCharacterDetail('1311')).name,'Test Resonator');assert.equal(calls,6);
  }finally{globalThis.fetch=originalFetch;globalThis.localStorage=originalStorage;Date.now=originalNow;}
});
