import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {metadataText,contentText,bannerText,highlightText,contentTranslationEntries} from '../public/content-translations.js';
const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const dictionary=name=>vm.runInNewContext(source.slice(source.indexOf('const '+name+' ='),source.indexOf(name==='copy'?'const routes =':'function bt(key)',source.indexOf('const '+name+' =')))+';'+name);
test('main and Builder dictionaries have complete and separate entries for all three languages',()=>{
  for(const name of ['copy','builderText']){
    const tables=dictionary(name),keys=Object.keys(tables['pt-BR']).sort();
    for(const lang of ['pt-BR','en','es']){
      assert.deepEqual(Object.keys(tables[lang]).sort(),keys);
      assert(Object.values(tables[lang]).every(text=>typeof text==='string' && text.trim()));
    }
  }
  for(const entry of contentTranslationEntries){assert.equal(entry.length,4);assert(entry.every(text=>typeof text==='string' && text.trim()),'Translations cannot have empty keys or values');}
});
test('metadata labels translate without changing values and banner names remain official',()=>{
  assert.equal(metadataText('Crit. Rate 24.30%','pt-BR'),'Taxa crítica 24.30%');
  assert.equal(metadataText('Energy Regen %','es'),'Recarga de energía %');
  assert.equal(contentText('Sempre','en'),'Always');
  assert.equal(contentText('Lottie Lost','pt-BR'),'Lottie Lost');
  assert.equal(bannerText('[Blooming Jadehaven] Featured Weapon Convene','pt-BR'),'[Blooming Jadehaven] Convocação de arma em destaque');
  assert.equal(highlightText('5-Star Weapon: Blooming Jadehaven; 4-Star Weapons: Fusion Accretion, Sword of Night','pt-BR'),'Arma 5 estrelas: Blooming Jadehaven; Armas 4 estrelas: Fusion Accretion, Sword of Night');
  const highlight='5-Star Resonator: Hsin (Electro) and 4-Star Weapons: Fusion Accretion, Sword of Night will receive boosted drop rates!';
  assert.equal(highlightText(highlight,'pt-BR'),'Personagem 5 estrelas: Hsin (Condutivo) e Armas 4 estrelas: Fusion Accretion, Sword of Night terão taxas de obtenção aumentadas!');
  assert.equal(highlightText(highlight,'en'),highlight);
  assert.equal(metadataText('Version 3.7 update','es'),'Actualización de la versión 3.7');
});
test('localized source requests deduplicate, isolate language caches, retain source values and support offline cache',async()=>{
  const originalFetch=globalThis.fetch, originalStorage=globalThis.localStorage;const saved=new Map(),calls=[];
  const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/encore-localized-text.json',import.meta.url),'utf8'));
  globalThis.localStorage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
  globalThis.fetch=async url=>{calls.push(url);const lang=String(url).includes('/pt/')?'pt-BR':'es';return {ok:true,json:async()=>({WeaponName:'Preserved source identity',...fixture[lang].weapon})};};
  const module=await import('../public/source-localization.js?locale-tests');
  try {
    const [first,second]=await Promise.all([module.loadSourceText('pt-BR','weapon',21010016),module.loadSourceText('pt-BR','weapon',21010016)]);
    assert.equal(first,second);assert.equal(calls.length,1);
    const es=await module.loadSourceText('es','weapon',21010016);
    assert.notEqual(first.Desc,es.Desc);assert.deepEqual(first,fixture['pt-BR'].weapon);
    assert.equal(module.getSourceText('pt-BR','weapon',21010016),first);
    assert.equal(module.getSourceText('es','weapon',21010016),es);
    assert.equal(await module.loadSourceText('en','weapon',21010016),null);
    assert.equal(calls.length,2,'English uses its unchanged existing catalog');
    for(const [key,value] of saved){const entry=JSON.parse(value);entry.time=0;saved.set(key,JSON.stringify(entry));}
    globalThis.fetch=async()=>{throw Error('offline');};
    const offline=await import('../public/source-localization.js?offline-locale-tests');
    assert.equal((await offline.loadSourceText('es','weapon',21010016)).Desc,es.Desc);
    await assert.rejects(offline.loadSourceText('pt-BR','weapon',999));
    assert(offline.sourceTextFailed('pt-BR','weapon',999));
  }finally{globalThis.fetch=originalFetch;globalThis.localStorage=originalStorage;}
});
test('Portuguese alternate Echo schema resolves Sonata effects by ID without replacing canonical names or counts',async()=>{
  const originalFetch=globalThis.fetch,originalStorage=globalThis.localStorage;let active=0,peak=0;
  globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
  globalThis.fetch=async url=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,4));active--;return {ok:true,json:async()=>String(url).endsWith('/echo')?{phantomsList:[{Id:1,FetterGroups:[{Id:42,Name:'Tradução oficial'}]}]}:{MonsterId:1,FetterDetails:{'Tradução oficial':{EffectDescriptions:['Dano + 10%.','Dano + 30% por 15 s.']}}}};};
  try {
    const module=await import('../public/source-localization.js?sonata-locale-tests');
    const sets=[{id:42,name:'Official Sonata',bonuses:[{count:2},{count:5}]}],before=JSON.stringify(sets);
    const text=await module.loadEchoSourceText('pt-BR',sets);
    assert.deepEqual(text[42],['Dano + 10%.','Dano + 30% por 15 s.']);assert.equal(JSON.stringify(sets),before);assert(peak<=4);
    const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/encore-localized-text.json',import.meta.url),'utf8'));
    for(const language of ['pt-BR','es']){assert.equal(Object.keys(fixture[language].sonatas).length,37);assert(Object.values(fixture[language].sonatas).flat().every(effect=>effect && !/\{\d+\}/.test(effect)));}
  }finally{globalThis.fetch=originalFetch;globalThis.localStorage=originalStorage;}
});
