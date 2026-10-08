import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {openBrowser, delay} from './browser-harness.mjs';
import {loadEchoCatalog} from '../public/echo-catalog.js';
import {loadWeaponDetail} from '../public/weapon-catalog.js';
const snapshot = async (file, fallback) => {
  try {return JSON.parse(await fs.readFile(file,'utf8'));} catch {return fallback();}
};
const catalog = await snapshot('artifacts/current-echo-catalog.json', loadEchoCatalog);
const payload = await snapshot('artifacts/current-echo.json', () => fetch('https://api-v2.encore.moe/api/en/echo').then(response=>response.json()));
payload.SonataDetails = Object.fromEntries(catalog.sets.map(set => [set.name,{EffectKeys:set.bonuses.map(b=>b.count),EffectDescriptions:set.bonuses.map(b=>b.description)}]));
const weapons = await snapshot('artifacts/current-weapon.json', () => fetch('https://api-v2.encore.moe/api/en/weapon').then(response=>response.json()));
const details = await snapshot('artifacts/current-weapon-details.json', async () => {
  const entries=[], queue=[...weapons.weapons];
  await Promise.all(Array.from({length:4},async()=>{while(queue.length){const weapon=queue.shift();entries.push([weapon.Id,await loadWeaponDetail(weapon.Id)]);}}));
  return Object.fromEntries(entries);
});
const browser = await openBrowser();
const waitFor = async expression => {
  for(let i=0;i<100;i++) { if(await browser.evaluate(expression))return; await delay(100); }
  throw Error('Timed out: '+expression);
};
const active = '.route-panel:not([hidden])';
try {
  await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:`
    const payload=${JSON.stringify(payload)}, weapons=${JSON.stringify(weapons)}, details=${JSON.stringify(details)};
    localStorage.setItem('solaris:echo-catalog:v2',JSON.stringify({payload,updatedAt:Date.now()}));
    const originalFetch=window.fetch.bind(window);
    window.fetch=(url, options)=>{
      const key=String(url);let value;
      if(key==='https://api-v2.encore.moe/api/en/weapon')value=weapons;
      else if(key.startsWith('https://api-v2.encore.moe/api/en/weapon/')) {
        const d=details[key.split('/').pop()];
        value={WeaponName:'Source weapon',Desc:d.passive,IconBig:d.imageUrl,Properties:d.properties.map(p=>({Name:p.name,GrowthValues:p.values.map(v=>({Level:v.level,Value:v.value}))}))};
      } else if(key==='/api/events')value={events:[]};
      else if(key==='/api/characters')value={characters:[]};
      if(value)return Promise.resolve(new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}}));
      return originalFetch(url,options);
    };`});
  const results=[];
  for(const language of ['pt-BR','en','es']) {
    await browser.go('/'+language+'/ecos');
    await waitFor(`document.querySelectorAll('${active} .archive-catalog .builder-option').length===${catalog.echoes.length}`);
    const nav = await browser.evaluate(`[...document.querySelectorAll('[data-app-topbar] a[data-link]')].map(a=>a.getAttribute('href'))`);
    const echoIndex=nav.indexOf('/'+language+'/ecos');
    assert.equal(nav[echoIndex+1],'/'+language+'/sonatas');
    for(const route of ['ecos','sonatas','sonatas/frosty-resolve','sonatas/crown-of-valor','sonatas/shadow-of-shattered-dreams','ecos/dwarf-cassowary','armas','armas/verdant-summit']) {
      await browser.go('/'+language+'/'+route);
      if(route==='armas')await waitFor(`document.querySelectorAll('${active} .weapon-card .mini-dl dd').length>=248 && [...document.querySelectorAll('${active} .weapon-card .mini-dl dd')].every(d=>d.textContent!=='—')`);
      if(route==='sonatas')assert.equal(await browser.evaluate(`document.querySelectorAll('${active} .archive-catalog .builder-option').length`),catalog.sets.length);
      if(route==='sonatas/frosty-resolve')assert.match(await browser.evaluate(`document.querySelector('${active}').innerText`),/22\.5%/);
      if(route==='armas/verdant-summit')await waitFor(`document.querySelector('${active} .weapon-stats-scroll')?.innerText.includes('587.50')`);
      for(const width of [320,390,768,1440]) {
        await browser.viewport(width);
        const size=await browser.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');
        assert(size.scroll<=size.width,language+'/'+route+' overflow at '+width);
      }
      const text=await browser.evaluate(`document.querySelector('${active}').innerText`);
      assert(!/\{\d+\}/.test(text),'Unresolved effect on '+route);
      results.push(language+'/'+route);
      if(language==='pt-BR' && ['ecos','sonatas','sonatas/frosty-resolve'].includes(route)) {
        await browser.viewport(390);
        await waitFor(`[...document.querySelectorAll('${active} .builder-option-icon img')].filter(img=>img.getBoundingClientRect().top<innerHeight).every(img=>img.complete && img.naturalWidth>0)`);
        await browser.screenshot('artifacts/archive-'+route.replaceAll('/','-')+'-390.png');
      }
    }
  }
  assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));
  console.log('PASS:',catalog.echoes.length,'Echoes,',catalog.sets.length,'Sonatas, 124 weapon statistics, navigation adjacency, complete effects, 3 languages, 4 viewport widths, no JS errors.');
} finally {browser.close();}
