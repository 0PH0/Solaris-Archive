import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {selectTierEntries,validateTierSnapshot,tierProfileSlug,tierCharacterKey,TIER_ORDER} from '../public/tier-list.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/data/tier-list-3.7.json',import.meta.url),'utf8'));
const character=(name,element='Electro',weapon='Rectifier',rarity=5)=>({name,slug:name.toLowerCase().replace(/[^a-z0-9]+/g,'-'),element,weapon,rarity});
test('legacy shared Rover slug cannot collapse variants or their profile links',()=>{
  const rovers=['Aero','Electro','Havoc','Spectro'].map(element=>({...character(`Rover (${element})`,element,'Sword'),slug:'rover'}));
  assert.equal(selectTierEntries(rovers,data).length,4);
  assert.equal(new Set(rovers.map(tierCharacterKey)).size,4);
  assert.deepEqual(rovers.map(tierProfileSlug),['rover-aero','rover-electro','rover-havoc','rover-spectro']);
});
test('verified snapshot has unique identities, roles and valid independent mode ratings',()=>{
  assert.equal(validateTierSnapshot(data),data);assert.equal(data.characters.length,59);
  assert.equal(data.characters.reduce((count,c)=>count+c.ratings.length,0),62);
  assert.equal(data.patch,'3.7');assert.equal(data.sourceUpdatedAt,'2026-09-30');
  const changed=structuredClone(data);changed.characters[0].ratings[0].toa='SS';assert.throws(()=>validateTierSnapshot(changed));
});
test('Hsin and multi-role characters keep the actual source ratings and sequence assumptions',()=>{
  const catalog=['Hsin','Iuno','Brant','Phoebe','Rover (Electro)'].map(name=>character(name));
  const toa=selectTierEntries(catalog,data,{mode:'toa'}),ww=selectTierEntries(catalog,data,{mode:'ww'});
  assert.equal(toa.find(e=>e.character.name==='Hsin').tier,'T0.5');assert.equal(ww.find(e=>e.character.name==='Hsin').tier,'T1');
  assert.deepEqual(toa.filter(e=>e.character.name==='Iuno').map(e=>[e.role,e.tier]),[['hybrid','T0'],['dps','T1']]);
  assert.equal(toa.find(e=>e.character.name==='Rover (Electro)').sequence,'S2');
  assert.equal(toa.filter(e=>e.character.name==='Phoebe').length,2);assert.equal(toa.filter(e=>e.character.name==='Brant').length,2);
});
test('catalog roles and generated grades never override source data; unknown characters stay unrated',()=>{
  const hsin={...character('Hsin'),role:'support',tiers:{damage:'SS'},damageRank:1},future=character('Unreviewed Character');
  const results=selectTierEntries([hsin,future],data);
  assert.equal(results[0].role,'dps');assert.equal(results[0].tier,'T0.5');assert.equal(results[1].tier,null);assert.equal(results[1].role,null);
  assert.equal(selectTierEntries([future],data,{role:'support'}).length,0);
});
test('combined filters are isolated, Unicode search works and ties are alphabetical',()=>{
  const catalog=[character('Hsin'),character('Yinlin'),character('Iuno','Aero'),character('Chixia','Fusion','Pistols',4)];
  assert.deepEqual(selectTierEntries(catalog,data,{mode:'toa',query:'HSÍN',element:'Electro',weapon:'Rectifier',rarity:'5',role:'dps'}).map(e=>e.character.name),['Hsin']);
  assert.equal(selectTierEntries(catalog,data,{query:'Hsin',rarity:'4'}).length,0);
  const all=data.characters.map(record=>character(record.slug));
  const entries=selectTierEntries(all,data,{role:'dps'});
  assert(entries.every((entry,index)=>!index || TIER_ORDER.indexOf(entries[index-1].tier)<=TIER_ORDER.indexOf(entry.tier)));
});
