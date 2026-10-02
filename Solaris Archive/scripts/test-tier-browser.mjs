import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openBrowser,delay} from './browser-harness.mjs';
const browser=await openBrowser();const reports=[];
const wait=async expression=>{for(let i=0;i<180;i++){if(await browser.evaluate(expression))return;await delay(100);}console.log(browser.errors,await browser.evaluate('document.body.innerText.slice(0,2000)'));throw Error(expression);};
const change=async (name,value)=>browser.evaluate(`{const select=document.querySelector('[data-tier-filter="${name}"]');select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}));}`);
const search=async value=>browser.evaluate(`{const input=document.querySelector('[data-tier-search]');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));}`);
const layout=async label=>{
  const result=await browser.evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:document.querySelectorAll('.tier-resonator').length,body:document.querySelector('[data-tier-count]')?.textContent})`);
  assert(result.scrollWidth<=result.width,label+': '+JSON.stringify(result));reports.push({label,...result});
};
try {
  await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__tierFetches=[];{const original=fetch.bind(window);window.fetch=(url,options)=>{window.__tierFetches.push(String(url));return original(url,options);};}`});
  for(const lang of ['pt-BR','en','es']) {
    await browser.go('/'+lang+'/tier-list');await wait(`document.querySelectorAll('.tier-resonator').length>=62 && document.querySelector('[data-tier-character="jiyan"] [data-character-image]')`);
    assert.equal(await browser.evaluate(`new Set([...document.querySelectorAll('[data-tier-character]')].map(e=>e.dataset.tierCharacter)).size`),60);
    assert.equal(await browser.evaluate(`document.querySelectorAll('.tier-matrix .tier-resonator').length`),62);
    assert.equal(await browser.evaluate(`document.querySelector('[data-tier-character="suoming"]').dataset.tierGrade`),'unrated');
    assert.equal(await browser.evaluate(`document.querySelector('[data-tier-character="hsin"]').dataset.tierGrade`),'T0.5');
    assert.equal(await browser.evaluate(`document.querySelector('[data-tier-character="chisa"]').dataset.tierRole`),'support');
    assert.equal(await browser.evaluate(`document.querySelectorAll('[data-tier-character="iuno"]').length`),2);
    for(const width of [320,390,768,1024,1440]) {await browser.viewport(width,900);await layout(lang+'/toa');}
    await browser.evaluate(`document.querySelector('[data-tier-mode="ww"]').focus()`);await browser.click('[data-tier-mode="ww"]');
    assert.equal(await browser.evaluate(`document.activeElement.dataset.tierMode`),'ww');
    assert.equal(await browser.evaluate(`document.querySelector('[data-tier-character="hsin"]').dataset.tierGrade`),'T1');
    assert.equal(await browser.evaluate(`document.querySelector('[data-tier-character="phrolova"]').dataset.tierGrade`),'T0');
    for(const width of [320,390,768,1024,1440]) {await browser.viewport(width,900);await layout(lang+'/ww');}
  }
  await browser.go('/pt-BR/tier-list');await wait(`document.querySelectorAll('.tier-resonator').length===63`);
  await browser.evaluate(`window.__tierMutations=0;window.__tierObserver=new MutationObserver(records=>window.__tierMutations+=records.length);window.__tierObserver.observe(document.querySelector('[data-tier-results]'),{childList:true});`);
  for(const value of ['H','Hs','Hsi','Hsin'])await search(value);
  await delay(240);assert.equal(await browser.evaluate('window.__tierMutations'),1);
  assert.equal(await browser.evaluate(`document.querySelectorAll('.tier-resonator').length`),1);
  await change('element','Electro');await change('weapon','Rectifier');await change('rarity','5');await change('role','dps');
  assert.equal(await browser.evaluate(`document.querySelectorAll('.tier-resonator').length`),1);
  await change('rarity','4');assert.equal(await browser.evaluate(`document.querySelectorAll('.tier-resonator').length`),0);
  await browser.click('[data-tier-reset]');assert.equal(await browser.evaluate(`document.querySelectorAll('.tier-resonator').length`),63);
  assert.equal(await browser.evaluate(`document.querySelector('[data-tier-search]').value`),'');
  assert.equal(await browser.evaluate(`window.__tierFetches.filter(url=>url.includes('/data/tier-list-3.7.json')).length`),1);
  assert.equal(await browser.evaluate(`window.__tierFetches.filter(url=>url==='/api/characters').length`),1);
  await browser.evaluate('window.__tierObserver.disconnect()');
  await browser.viewport(390,844);await browser.click('.tier-criteria summary');await layout('expanded criteria');
  await browser.screenshot('artifacts/tier-list-390.png');
  await browser.viewport(1440,1000);await browser.click('.tier-criteria summary');await browser.screenshot('artifacts/tier-list-1440.png');
  for(const width of [390,1440]) {
    await browser.viewport(width,1000);
    await browser.evaluate(`document.querySelector('.tier-matrix').scrollIntoView({block:'start'})`);await delay(600);
    await browser.screenshot('artifacts/tier-list-cards-'+width+'.png');
  }
  await browser.click('[data-tier-character="rover-electro"] .tier-character-link');await wait(`document.querySelector('.route-panel:not([hidden]) h1')?.textContent==='Rover (Electro)'`);
  await browser.go('/pt-BR/tier-list');await wait(`document.querySelectorAll('.tier-resonator').length===63`);
  await browser.click('[data-tier-character="hsin"] .tier-character-link');await wait(`document.querySelector('.route-panel:not([hidden]) h1')?.textContent==='Hsin'`);
  const failScript=await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:`{const original=fetch.bind(window);let failed=false;window.fetch=(url,options)=>{if(String(url).includes('/data/tier-list-3.7.json')&&!failed){failed=true;return Promise.resolve(new Response('',{status:503}));}return original(url,options);};}`});
  await browser.go('/pt-BR/tier-list');await wait(`!!document.querySelector('[data-tier-retry]')`);
  assert.equal(await browser.evaluate(`document.querySelectorAll('.tier-resonator').length`),0);
  await browser.click('[data-tier-retry]');await wait(`document.querySelectorAll('.tier-resonator').length===63`);
  await browser.call('Page.removeScriptToEvaluateOnNewDocument',{identifier:failScript.identifier});
  assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));
  await fs.writeFile('artifacts/tier-list-validation.json',JSON.stringify({reports,errors:browser.errors},null,2));
  console.log('PASS: 60 catalog characters, 59 rated, 62 ratings, both modes, source roles/grades, 3 languages, five widths, combined filters, debounce, no extra catalog requests and distinct Rover profile navigation.');
}finally{browser.close();}
