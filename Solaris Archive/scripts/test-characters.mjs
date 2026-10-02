import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
const source = fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const backend = source.slice(source.indexOf('const characterSourceUrl'),source.indexOf('async function serveFile'));
const read = name => JSON.parse(fs.readFileSync(new URL('./fixtures/'+name,import.meta.url),'utf8'));
function setup({encoreFailure=false}={}) {
  let now=Date.parse('2026-10-01T12:00:00Z');
  const calls=[];
  const primary=read('characters.json');
  const roles=read('encore-characters.json');
  const detail=read('hsin-detail.json');
  const feed=fs.readFileSync(new URL('./fixtures/convenes-3.7.xml',import.meta.url),'utf8');
  const context=vm.createContext({URL,AbortSignal,Date:class extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}},fetch:async url=>{
    calls.push(url);if(encoreFailure && url.includes('encore.moe'))throw Error('Encore offline');
    return {ok:true,json:async()=>url.endsWith('/1311')?detail:url.includes('encore.moe')?roles:url.includes('characters.json')?primary:[],text:async()=>feed};
  }});
  vm.runInContext(backend,context);
  return {run:code=>vm.runInContext(code,context),calls,primary,roles,advance:ms=>{now+=ms;}};
}
test('incomplete Hsin is completed; unreleased incomplete entries remain excluded; catalog caches',async()=>{
  const app=setup();
  app.primary.push({id:'Unreleased',rarity:0,attribute:'',weapon:'',version:'x.x'});
  app.roles.roleList.push({Id:1999,Name:'Unreleased',QualityId:5,Element:{Name:'Aero'},WeaponType:{Name:'Sword'}});
  const payload=await app.run('createCharactersPayload()');
  const hsin=payload.characters.find(c=>c.name==='Hsin');
  assert.equal(hsin.encoreId,1311);assert.equal(hsin.rarity,5);assert.equal(hsin.element,'Electro');assert.equal(hsin.weapon,'Rectifier');assert.equal(hsin.signatureWeapon.id,21050116);
  assert(!payload.characters.some(c=>!c.rarity || c.name==='Unreleased'));
  const count=app.calls.length;await app.run('createCharactersPayload()');assert.equal(app.calls.length,count);
});
test('primary newcomers receive a page ID and Encore identity without a hardcoded character list',async()=>{
  const app=setup();
  app.primary.push({id:'Future_Resonator',name:'Future Resonator',rarity:5,attribute:'aero',weapon:'sword',version:'4.0'});
  app.roles.roleList.push({Id:1999,Name:'Future Resonator',QualityId:5,Element:{Name:'Aero'},WeaponType:{Name:'Sword'}});
  const payload=await app.run('createCharactersPayload()');
  assert.equal(payload.characters.find(c=>c.name==='Future Resonator').encoreId,1999);
});
test('Encore outage preserves the primary catalog and verified Hsin release',async()=>{
  const app=setup({encoreFailure:true});const payload=await app.run('createCharactersPayload()');
  assert(payload.characters.length>=55);assert(payload.characters.some(c=>c.name==='Hsin'));
});
test('details are normalized and duplicate requests share one upstream call',async()=>{
  const app=setup();const [a,b]=await Promise.all([app.run('createCharacterDetailPayload("1311")'),app.run('createCharacterDetailPayload("1311")')]);
  assert.equal(a,b);assert.equal(app.calls.length,1);assert.equal(a.stats.HP,10300);assert.equal(a.maxLevel,90);
  assert(a.imageUrl.includes('IconRolePile'));assert(a.portraitUrl.includes('PixActivity'));assert.equal(a.skills.length,10);assert(!a.skills[0].description.includes('<span'));
  await app.run('createCharacterDetailPayload("1311")');assert.equal(app.calls.length,1);
});
test('Hsin banners are additive, retain every existing record and expire with the phase',async()=>{
  const app=setup();const original=app.run(`parseOfficialConveneFeed(${JSON.stringify(fs.readFileSync(new URL('./fixtures/convenes-3.7.xml',import.meta.url),'utf8'))})`);
  const payload=await app.run('createConvenesPayload()');
  for(const record of original.filter(record=>Date.parse(record.startAt)<=Date.parse('2026-10-01T12:00:00Z') && Date.parse(record.endAt)>Date.parse('2026-10-01T12:00:00Z')))assert.deepEqual(JSON.parse(JSON.stringify(payload.convenes.find(c=>c.id===record.id))),{...JSON.parse(JSON.stringify(record)),status:'ao_vivo'});
  assert.equal(payload.convenes.length,6);assert.equal(payload.convenes.filter(c=>c.featuredName==='Hsin').length,1);
  app.advance(22*86400000);const expired=await app.run('createConvenesPayload()');assert(!expired.convenes.some(c=>c.featuredName==='Hsin'));
});
test('official video discovery checks the channel owner and recognizes showcases',()=>{
  const app=setup();const html=fs.readFileSync(new URL('./fixtures/official-channel.html',import.meta.url),'utf8');
  assert.equal(app.run(`parseOfficialCharacterVideos(${JSON.stringify(html)})`).hsin,'a3zMk49qpwI');
  assert.throws(()=>app.run(`parseOfficialCharacterVideos(${JSON.stringify(html.replaceAll('UC0Bi5KMcECRVYis5Gb_ZYZQ','UC-untrusted-channel'))})`),/Unexpected video channel/);
});
test('a signature weapon is linked only when the official guide explicitly identifies it',()=>{
  const app=setup();
  const guide={role:{texts:[{language:'en',name:'New Resonator'}]},weapon:{items:[{gbId:'21050116',texts:[{language:'en',name:'New Signature'}]}]},weaponTexts:[{language:'en',recommendDescription:'<p>New Signature is New Resonator\'s signature weapon.</p>'}]};
  assert.equal(app.run(`extractExplicitSignatureWeapon(${JSON.stringify(guide)})`).id,21050116);
  guide.weaponTexts[0].recommendDescription='New Signature is a recommended weapon.';
  assert.equal(app.run(`extractExplicitSignatureWeapon(${JSON.stringify(guide)})`),null);
});
