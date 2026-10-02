import assert from 'node:assert/strict';
import {emptyPool, simulatePull, calculateOdds} from '../public/gacha-engine.js';
const pool=emptyPool();
for(let i=0;i<9;i++)assert.equal(simulatePull(pool,'resonator',()=>.99).rarity,3);
assert.equal(simulatePull(pool,'resonator',()=>.99).rarity,4);
pool.pity5=79;
assert.deepEqual(simulatePull(pool,'resonator',()=>.99),{rarity:5,featured:false,pity:80,number:11});
assert.equal(pool.guaranteed,true);assert.equal(pool.pity5,0);assert.equal(pool.pity4,0);
pool.pity5=79;
assert.equal(simulatePull(pool,'resonator',()=>.99).featured,true);
assert.equal(pool.guaranteed,false);
const weapon=emptyPool();weapon.pity5=79;
assert.equal(simulatePull(weapon,'weapon',()=>.99).featured,true);
assert.equal(calculateOdds(0,0,false,'resonator').featured,0);
assert.equal(calculateOdds(79,1,false,'resonator').featured,.5);
assert.equal(calculateOdds(79,1,true,'resonator').featured,1);
assert.equal(calculateOdds(0,160,false,'resonator').featured,1);
assert.equal(calculateOdds(0,80,false,'weapon').featured,1);
assert.equal(calculateOdds(50,30,false,'resonator').five,1);
assert(Math.abs(calculateOdds(0,1,false,'resonator').featured-.004)<1e-12);
for(const type of ['resonator','weapon'])for(const guarantee of [false,true]){
  let previous=0;
  for(let pulls=0;pulls<=160;pulls++){
    const odds=calculateOdds(17,pulls,guarantee,type);
    assert(odds.featured+1e-12>=previous && odds.featured<=odds.five+1e-12);
    previous=odds.featured;
  }
}
console.log('PASS: hard pity, 4-star guarantee, character 50/50, weapon guarantee, separate pools, calculator boundaries and monotonicity.');
