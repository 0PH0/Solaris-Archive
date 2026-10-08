import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeEchoCatalog, loadEchoCatalog, readEchoCatalogCache, filterEchoCatalog, groupEchoAppearances } from '../public/echo-catalog.js';
const record = (Id, Name, extra = {}) => ({Id, Name, PhantomType: 1, Rarity: 0, Icon: `https://api.encore.moe/resource/${Id}.webp`, FetterGroups: [{Name: 'Test Sonata', Fetters: [{Key: 3, EffectDescription: 'Three pieces'}]}], ...extra});
test('real source identities exclude Resonator Cubes while preserving boss Echoes and Phantom appearances', () => {
  const source = JSON.parse(fs.readFileSync(new URL('./fixtures/encore-echo-identities.json', import.meta.url),'utf8'));
  const catalog = normalizeEchoCatalog(source);
  const cubeNames = source.Echo.filter(entry => /\/NPC\//.test(source.EchoDetails[entry.Id]?.StandAnim || '')).map(entry=>entry.Name);
  assert.equal(cubeNames.length,12);
  for (const name of cubeNames) assert(!catalog.echoes.some(echo=>echo.name===name),name);
  for (const name of ['Sentry Construct','Phantom: Cuddle Wuddle','Reminiscence: Denia','Kronablight','Lottie Lost','Cuddle Wuddle']) assert(catalog.echoes.some(echo=>echo.name===name),name);
  assert.equal(catalog.echoes.length,8);
  assert.equal(catalog.echoes.find(echo=>echo.name==='Sentry Construct').id,6000083);
  for (const name of ['Lottie Lost','Cuddle Wuddle']) {
    const original=source.Echo.find(echo=>echo.Name===name);
    const actual=catalog.echoes.find(echo=>echo.name===name);
    assert.equal(actual.iconUrl,source.EchoDetails[original.Id].Skill.BattleViewIcon);
    assert.notEqual(actual.iconUrl,original.Icon);
  }
});
test('alternate records require their own matching identity and malformed entries cannot poison valid Echoes', () => {
  const valid=record(1,'Valid');
  const alternate=record(2,'Incorrect label',{PhantomType:2});
  const source={Echo:[valid,alternate,record(3,'Invalid cost',{Rarity:99}),record(4,'No Sonata',{FetterGroups:[]}),record(5,'Not an Echo',{Type:'Weapon'})],EchoDetails:{2:{MonsterId:2,MonsterName:'Actual Echo',TypeDescription:'Echo',StandAnim:'/Game/Aki/Character/Monster/Stand',Skill:{SimplyDescription:'Summon Actual Echo.'}}}};
  assert.deepEqual(normalizeEchoCatalog(source).echoes.map(echo=>echo.name),['Actual Echo','Valid']);
  source.EchoDetails[2].MonsterId=999;
  assert.deepEqual(normalizeEchoCatalog(source).echoes.map(echo=>echo.name),['Valid']);
});
test('live identity checks are shared and old unvalidated caches cannot reintroduce NPC names', async () => {
  const savedFetch=globalThis.fetch, savedStorage=globalThis.localStorage;
  const storage=new Map([['solaris:echo-catalog:v2',JSON.stringify({updatedAt:Date.now(),payload:{Echo:[record(9,'Old NPC')]}})]]);
  const original=record(1,'Original');
  const alternate=record(2,'Valid Alternate',{PhantomType:2,Icon:original.Icon});
  const npc=record(3,'Future Resonator',{PhantomType:2,Icon:original.Icon});
  const calls=[];
  globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  globalThis.fetch=async url=>{
    calls.push(String(url));
    const data=String(url).endsWith('/echo') ? {Echo:[original,alternate,npc]} : String(url).endsWith('/2') ? {MonsterId:2,MonsterName:alternate.Name,TypeDescription:'Echo',StandAnim:'/Game/Aki/Character/Monster/Stand',Skill:{SimplyDescription:'Summon Valid Alternate.',BattleViewIcon:'https://api.encore.moe/resource/alternate.webp'}} : {MonsterId:3,MonsterName:npc.Name,TypeDescription:'Echo',StandAnim:'/Game/Aki/Character/NPC/Cube/Stand',Skill:{SimplyDescription:'Transform into Future Resonator Cube.'}};
    return {ok:true,json:async()=>data};
  };
  try {
    const module=await import('../public/echo-catalog.js?identity-check-test');
    assert.equal(module.readEchoCatalogCache(),null);
    const [first,second]=await Promise.all([module.loadEchoCatalog(),module.loadEchoCatalog()]);
    assert.equal(first,second);
    assert.equal(calls.length,3);
    assert.deepEqual(first.echoes.map(echo=>echo.name),['Original','Valid Alternate']);
    assert.equal(first.echoes.find(echo=>echo.name===alternate.Name).iconUrl,'https://api.encore.moe/resource/alternate.webp');
    await module.loadEchoCatalog();
    assert.equal(calls.length,3);
    assert(storage.has('solaris:echo-catalog:v4'));
  } finally {globalThis.fetch=savedFetch;globalThis.localStorage=savedStorage;}
});
test('Phantom skins belong to source parent IDs, including differently named and Nightmare originals', () => {
  const source={Echo:[record(10,'Reminiscence: Kronaclaw'),record(20,'Nightmare: Crownless'),record(30,'Phantom: Kronaclaw'),record(40,'Phantom: Nightmare Crownless')],EchoDetails:{30:{ParentMonsterId:10},40:{ParentMonsterId:20}}};
  const catalog=normalizeEchoCatalog(source);
  const originals=groupEchoAppearances(catalog.echoes);
  assert.equal(originals.length,2);
  assert.equal(originals.find(e=>e.id===10).phantoms[0].id,30);
  assert.equal(originals.find(e=>e.id===20).phantoms[0].id,40);
  assert.equal(catalog.echoes.length,4,'Builder retains its existing source records');
  assert.equal(filterEchoCatalog(originals,catalog.sets,{variant:'phantom',query:'Phantom: Kronaclaw'})[0].id,10);
  assert.equal(groupEchoAppearances([...catalog.echoes,catalog.echoes.find(e=>e.id===30)]).find(e=>e.id===10).phantoms.length,1);
});
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
  assert.deepEqual(Object.fromEntries(catalog.echoes.map(e=>[e.name,e.classId])),{'Boss':'overlord','Calamity':'calamity','Elite':'elite','Clang Bang':'common','Phantom: Clang Bang':'common'});
});
test('search, class, cost, element, Sonata and variant filters combine without dropping valid variants', () => {
  const catalog=normalizeEchoCatalog({Echo:[record(1,'Jué',{Rarity:3,Element:{Name:'Spectro'}}),record(2,'Regular Elite',{Rarity:1,Element:{Name:'Aero'}}),record(3,'Nightmare: Elite',{Rarity:1,Element:{Name:'Aero'}}),record(4,'Phantom: Nightmare Elite',{Rarity:1,Element:{Name:'Aero'}}),record(5,'Overlord',{Rarity:2})]});
  const select=filters=>filterEchoCatalog(catalog.echoes,catalog.sets,filters).map(e=>e.name);
  assert.deepEqual(select({query:'  JUE  ',cost:'4',class:'calamity'}),['Jué']);
  assert.deepEqual(select({query:'TEST SONATA',cost:'3',class:'elite',variant:'nightmare',element:'Aero',set:'test-sonata'}),['Nightmare: Elite','Phantom: Nightmare Elite']);
  assert.deepEqual(select({cost:'3',variant:'phantom'}),['Phantom: Nightmare Elite']);
  assert.deepEqual(select({cost:'3',variant:'regular'}),['Regular Elite']);
  assert.deepEqual(select({cost:'1',class:'elite'}),[]);
  assert.deepEqual(select({cost:'4',class:'overlord'}),['Overlord']);
  assert.equal(select({}).length,catalog.echoes.length);
});
test('Sonata effects resolve from source details and retain icons, line breaks and piece counts', () => {
  const catalog = normalizeEchoCatalog({Echo:[record(1,'Echo',{Element:{Name:'Aero'},Attributes:'Source description',FetterGroups:[{Id:4,Name:'Test Sonata',Icon:'https://api.encore.moe/resource/set.webp',Fetters:[{Key:3,EffectDescription:'Bonus {0}'}]}]})],SonataDetails:{'Test Sonata':{EffectKeys:[3],EffectDescriptions:['Bonus 30%.<br>Lasts 4s.']}}});
  assert.equal(catalog.sets[0].bonuses[0].description,'Bonus 30%.\nLasts 4s.');
  assert.equal(catalog.sets[0].iconUrl,'https://api.encore.moe/resource/set.webp');
  assert.equal(catalog.echoes[0].element,'Aero');
  assert.equal(catalog.echoes[0].description,'Source description');
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
