import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { openBrowser, delay } from './browser-harness.mjs';
const browser = await openBrowser();
const { evaluate, call, click } = browser;
const report = [];
const waitFor = async (expression, message) => {
  for (let i=0;i<100;i++) { if (await evaluate(expression)) return; await delay(100); }
  throw Error(message || expression);
};
const change = (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const search = (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const layout = async label => {
  const result = await evaluate(`({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,title:document.querySelector('.route-panel:not([hidden]) h1')?.textContent})`);
  report.push({label,...result});
  assert(result.scrollWidth<=result.width,`${label}: horizontal overflow ${JSON.stringify(result)}`);
};
try {
  // Deterministic current banners let the test exercise draws even when the
  // official feed has no live banners. Production endpoints remain unchanged.
  const weapons = JSON.parse(await fs.readFile('artifacts/encore-weapons.json','utf8'));
  const echoes = JSON.parse(await fs.readFile('artifacts/encore-echoes.json','utf8'));
  const startAt = new Date(Date.now()-86400000).toISOString(), endAt = new Date(Date.now()+86400000).toISOString();
  const convenes = ['resonator','weapon'].map((type,i)=>({id:'responsive-'+type,type,featuredName:i?'Ages of Harvest':'Jiyan',title:i?'Ages of Harvest Featured Weapon Convene':'Jiyan Featured Resonator Convene',imageUrl:'/assets/event-placeholder-1280.webp',startAt,endAt,sourceUrl:'https://wutheringwaves.kurogames.com/',highlights:[]}));
  const fixtures = {
    '/api/convenes': {convenes,updatedAt:new Date().toISOString(),syncIntervalMinutes:5},
    '/api/characters': {characters:[],updatedAt:new Date().toISOString(),syncIntervalMinutes:360},
    '/api/events': {events:[{id:'responsive-event',title:'Evento de teste de responsividade com título extenso',category:'evento_in_game',imageUrl:'/assets/event-forge.png',startAt,endAt,rewards:['Astrites'],sourceUrl:'https://wutheringwaves.kurogames.com/'}],updatedAt:new Date().toISOString(),syncIntervalMinutes:30},
    'https://api-v2.encore.moe/api/en/weapon': weapons,
    'https://api-v2.encore.moe/api/en/echo': echoes
  };
  await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__apiCalls=[];const originalFetch=window.fetch.bind(window);const fixtures=${JSON.stringify(fixtures)};window.fetch=(url,options)=>{const key=String(url);if(fixtures[key]){window.__apiCalls.push(key);return Promise.resolve(new Response(JSON.stringify(fixtures[key]),{status:200,headers:{'Content-Type':'application/json'}}));}return originalFetch(url,options);};`});
  await browser.viewport(390,844); await browser.go('/pt-BR/'); await delay(250);
  assert(!browser.requests.some(url=>/\/gacha(?:-engine)?\.js/.test(url)),'Gacha modules deferred on Home');
  assert(!browser.requests.some(url=>/\.webm/.test(url)),'Videos deferred before drawing');
  assert(!browser.requests.some(url=>/home-hero-wuwa\.jpg/.test(url)),'Original 12 MB hero not requested');
  for (const width of [320,390,768,1024,1440]) {
    await browser.viewport(width); await layout('home');
    if ([390,768,1440].includes(width)) await browser.screenshot(`artifacts/responsive-home-${width}.png`);
  }
  for (const lang of ['pt-BR','en','es']) {
    for (const route of ['introducao','characters','characters/jinhsi','tier-list','ecos','armas','itens','guia','codigos','builder','gacha','eventos','noticias']) {
      await browser.go(`/${lang}/${route}`);
      if(route==='gacha') await waitFor('!!document.querySelector("[data-gacha-type]")');
      await delay(50);
      for (const width of [320,390,768,1024,1440]) { await browser.viewport(width); await layout(`${lang}/${route}`); }
    }
  }
  await browser.viewport(320,568); await browser.go('/pt-BR/');
  const point=await evaluate(`(()=>{const r=document.querySelector('[data-menu-toggle]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert(await evaluate(`!document.querySelector('[data-mobile-nav]').hidden`),'Touch opens menu');
  assert(await evaluate(`(()=>{const n=document.querySelector('[data-mobile-nav]');const r=n.getBoundingClientRect();n.scrollTop=n.scrollHeight;return r.bottom<=innerHeight && n.scrollHeight>n.clientHeight && n.scrollTop>0})()`),'Menu fits and scrolls on short screen');
  await browser.screenshot('artifacts/responsive-menu-320.png');
  await click('[data-mobile-nav] a[href="/pt-BR/personagens"]');
  assert(await evaluate(`document.querySelector('[data-mobile-nav]').hidden`),'Navigation closes menu');
  await layout('touch navigation');

  await browser.go('/pt-BR/characters'); await delay(250);
  await evaluate(`window.__mutations=0;window.__results=document.querySelector('[data-character-results]');window.__observer=new MutationObserver(r=>window.__mutations+=r.length);window.__observer.observe(window.__results,{childList:true});`);
  const beforeCalls=await evaluate('window.__apiCalls.length');
  for (const word of ['J','Ji','Jiy','Jiya','Jiyan']) await search('[data-character-search]',word);
  await delay(240);
  assert.equal(await evaluate('window.__mutations'),1,'Typing updates results once');
  assert.equal(await evaluate('document.querySelectorAll("[data-character-results] .character-card").length'),1);
  assert(await evaluate('document.querySelector("[data-character-results]").textContent.includes("Jiyan")'));
  assert.equal(await evaluate('window.__apiCalls.length'),beforeCalls,'Local search makes no API calls');
  await evaluate('window.__observer.disconnect()');

  await browser.go('/pt-BR/builder');
  await waitFor('document.querySelectorAll("[data-echo-card]").length===5');
  await delay(250);
  await click('[data-builder-open="character"]'); await search('[data-builder-search="character"]','Jiyan'); await delay(240); await click('[data-builder-pick="character"]');
  await click('[data-builder-open="weapon"]'); await click('[data-builder-pick="weapon"]');
  for(const [slot,cost] of [4,3,3,1,1].entries()) {
    await click(`[data-builder-open="echo"][data-slot="${slot}"]`);
    await change('[data-builder-filter="echo"]',String(cost)); await click('[data-builder-pick="echo"]:not(:disabled)');
  }
  assert.equal(await evaluate('document.querySelector(".builder-cost-number strong").textContent'),'12');
  await click('[data-builder-open="echo"][data-slot="4"]'); await change('[data-builder-filter="echo"]','4');
  assert.equal(await evaluate('document.querySelectorAll("[data-builder-pick]:not(:disabled)").length'),0,'Cost limit enforced');
  for (const [width,height] of [[320,568],[390,844],[768,1024],[1024,768],[1440,900],[844,390],[320,360]]) {
    await browser.viewport(width,height); await layout('builder modal');
    assert(await evaluate(`(()=>{const d=document.querySelector('dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth})()`),'Dialog stays inside viewport');
  }
  await browser.viewport(390,844); await browser.screenshot('artifacts/responsive-builder-modal-390.png');
  await click('[data-builder-close]'); await change('[data-builder-field="name"]','Teste responsivo'); await click('[data-builder-save]');
  await browser.go('/pt-BR/builder'); await delay(250);
  assert.equal(await evaluate('document.querySelector(".builder-cost-number strong").textContent'),'12','Build survives reload');
  assert.equal(await evaluate('document.querySelector("[data-builder-field=name]").value'),'Teste responsivo');
  assert(!await evaluate('window.__apiCalls.some(url=>url.endsWith("/echo"))'),'Echo reload uses cached catalog');

  await browser.go('/pt-BR/gacha');
  await waitFor(`!!document.querySelector('[data-gacha-pull="10"]:not(:disabled)')`);
  const beforeVideos=browser.requests.filter(url=>url.includes('.webm')).length;
  await click('[data-gacha-pull="10"]');
  await waitFor('!!document.querySelector(".convene-video")'); await layout('gacha video');
  await delay(200);
  assert(browser.requests.filter(url=>url.includes('.webm')).length>beforeVideos,'Drawing requests video on demand');
  await browser.screenshot('artifacts/responsive-gacha-video-390.png'); await click('.convene-skip');
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result").length'),10);
  assert.equal(await evaluate('document.querySelectorAll(".gacha-history tbody tr").length'),10);
  await change('[data-gacha-field="pity5"]','79');
  await evaluate(`const e=document.querySelector('[data-gacha-field="guaranteed"]');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));`);
  await click('[data-gacha-pull="1"]'); await click('.convene-skip');
  assert(await evaluate('document.querySelector(".gacha-result").classList.contains("rarity-5")'));
  assert.equal(await evaluate('document.querySelector(".gacha-result strong").textContent'),'Jiyan');
  await change('[data-gacha-field="pity5"]','25'); await click('[data-gacha-type="weapon"]');
  assert.equal(await evaluate('document.querySelector("[data-gacha-field=pity5]").value'),'0');
  await change('[data-gacha-field="calcPulls"]','80');
  assert.equal(await evaluate('document.querySelectorAll(".gacha-odds strong")[1].textContent'),'100%');
  await click('[data-gacha-type="resonator"]');
  assert.equal(await evaluate('document.querySelector("[data-gacha-field=pity5]").value'),'25');
  await click('[data-gacha-pull="10"]'); await click('.convene-skip');
  for (const width of [320,390,768,1024,1440]) {
    await browser.viewport(width); await layout('gacha ten results');
    assert(await evaluate(`(()=>{const e=document.querySelector('.gacha-history-scroll');return e.scrollWidth<=e.clientWidth})()`),'History fits without unnecessary horizontal scrolling');
    await delay(200);
    await browser.screenshot(`artifacts/responsive-gacha-${width}.png`);
  }
  await browser.go('/pt-BR/gacha'); await waitFor('!!document.querySelector("[data-gacha-field=pity5]")');
  assert.equal(await evaluate('document.querySelectorAll(".gacha-history tbody tr").length'),21,'Draw history persists');
  assert.equal(await evaluate('window.__apiCalls.filter(url=>url.endsWith("/weapon")).length'),0,'Weapon reload uses cached catalog');
  assert.deepEqual(browser.errors,[],'No browser exceptions');
  await fs.writeFile('artifacts/responsive-verification.json',JSON.stringify({report,errors:browser.errors,checks:['lazy modules/media','touch menu','debounce','local search without requests','Builder slots/cost/persistence','short-screen dialogs','Gacha draws/video/pity/history/calculator','catalog cache after reload']},null,2));
  console.log(`PASS: ${report.length} layout checks, 3 languages, touch menu, debounce, Builder, Gacha, cache and no JS exceptions.`);
} finally { browser.close(); }
