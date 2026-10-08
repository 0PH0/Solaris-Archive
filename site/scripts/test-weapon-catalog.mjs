import {test} from 'node:test';
import assert from 'node:assert/strict';
import {weaponStatSummary, loadWeaponDetail} from '../public/weapon-catalog.js';

test('summary uses the last source level and matches secondary values by level', () => {
  assert.deepEqual(weaponStatSummary([{name:'ATK',values:[{level:1,value:'47.00'},{level:90,value:'587.50'}]},{name:'Crit. DMG',values:[{level:90,value:'48.60%'},{level:1,value:'10.80%'}]}]), {baseAtk:'587.50',stat:'Crit. DMG 48.60%',statLevel:90});
  assert.deepEqual(weaponStatSummary([]), {});
  assert.equal(weaponStatSummary([{name:'ATK',values:[{level:70,value:'0'}]},{name:'DEF',values:[{level:90,value:'99%'}]}]).stat, '—');
});

test('detail preserves all source growth levels including ascensions without rounding', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ok:true,json:async()=>({WeaponName:'Test',Properties:[{Name:'ATK',GrowthValues:[{Level:1,Value:'24.30'},{Level:20.5,Value:'101.20'},{Level:70,Value:'300.45'}]}]})});
  try {
    const detail = await loadWeaponDetail('test-growth');
    assert.equal(detail.properties[0].values[1].level,20.5);
    assert.deepEqual(detail.summary,{baseAtk:'300.45',stat:'—',statLevel:70});
  } finally {globalThis.fetch=original;}
});
