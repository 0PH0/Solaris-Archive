import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {openBrowser, delay} from './browser-harness.mjs';
import {loadEchoCatalog, normalizeEchoCatalog, filterEchoCatalog, groupEchoAppearances} from '../public/echo-catalog.js';
import {loadWeaponDetail} from '../public/weapon-catalog.js';
import {metadataText} from '../public/content-translations.js';
const localeFixture=JSON.parse(await fs.readFile(new URL('./fixtures/encore-localized-text.json',import.meta.url),'utf8'));
const snapshot = async (file, fallback) => {
  try {return JSON.parse(await fs.readFile(file,'utf8'));} catch {return fallback();}
};
const cachedCatalog = await snapshot('artifacts/current-echo-catalog.json', loadEchoCatalog);
const payload = await snapshot('artifacts/current-echo.json', () => fetch('https://api-v2.encore.moe/api/en/echo').then(response=>response.json()));
payload.EchoDetails = JSON.parse(await fs.readFile(new URL('./fixtures/encore-echo-identities.json', import.meta.url),'utf8')).EchoDetails;
payload.SonataDetails = Object.fromEntries(cachedCatalog.sets.map(set => [set.name,{EffectKeys:set.bonuses.map(b=>b.count),EffectDescriptions:set.bonuses.map(b=>b.description)}]));
Object.assign(payload.EchoDetails,JSON.parse(await fs.readFile(new URL('./fixtures/encore-phantom-parents.json', import.meta.url),'utf8')));
const catalog = normalizeEchoCatalog(payload);
const wikiEchoes = groupEchoAppearances(catalog.echoes);
assert.equal(wikiEchoes.reduce((sum,e)=>sum+e.phantoms.length,0),42);
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
const changeEchoFilter = (key, value) => browser.evaluate(`(()=>{const input=document.querySelector('${active} [data-echo-filter="${key}"]');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
const searchEchoes = value => browser.evaluate(`(()=>{const input=document.querySelector('${active} [data-echo-search]');input.focus();input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const shownEchoNames = () => browser.evaluate(`[...document.querySelectorAll('${active} .echo-class-section .builder-option-info strong')].map(element=>element.textContent).sort()`);
try {
  await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:`
    const payload=${JSON.stringify(payload)}, weapons=${JSON.stringify(weapons)}, details=${JSON.stringify(details)};
    localStorage.setItem('solaris:echo-catalog:v4',JSON.stringify({payload,updatedAt:Date.now()}));
    const localized=${JSON.stringify(localeFixture)};
    for(const [lang,fields] of Object.entries(localized))for(const [kind,data] of Object.entries(fields))localStorage.setItem('solaris:source-text:v1:'+lang+':'+(kind==='character'?'character:1311':kind==='weapon'?'weapon:21010016':kind==='weaponAges'?'weapon:21010026':kind+':'),JSON.stringify({data,time:Date.now()}));
    const originalFetch=window.fetch.bind(window);
    window.fetch=(url, options)=>{
      const key=String(url);let value;
      if(key==='https://api-v2.encore.moe/api/en/weapon')value=weapons;
      else if(key.startsWith('https://api-v2.encore.moe/api/en/weapon/')) {
        const d=details[key.split('/').pop()];
        value={WeaponName:'Source weapon',Desc:d.passive,ResonName:d.passiveName,AttributesDescription:d.description,IconBig:d.imageUrl,Properties:d.properties.map(p=>({Name:p.name,GrowthValues:p.values.map(v=>({Level:v.level,Value:v.value}))}))};
      } else if(key==='/api/events')value={events:[]};
      else if(key==='/api/characters')value={characters:[]};
      if(value)return Promise.resolve(new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}}));
      return originalFetch(url,options);
    };`});
  const results=[];
  for(const language of ['pt-BR','en','es']) {
    await browser.go('/'+language+'/ecos');
    await waitFor(`document.querySelectorAll('${active} .archive-catalog .builder-option').length===${wikiEchoes.length}`);
    const shown = await browser.evaluate(`[...document.querySelectorAll('${active} .archive-catalog .builder-option-info strong')].map(element=>element.textContent)`);
    for (const name of ['Jinhsi','Changli','Shorekeeper']) assert(!shown.includes(name),name+' must not appear as an Echo');
    for (const name of ['Lottie Lost','Cuddle Wuddle','Dreamless']) assert(shown.includes(name),name+' must remain');
    assert(shown.every(name=>!name.startsWith('Phantom:')));
    assert.equal(await browser.evaluate(`document.querySelectorAll('${active} [data-echo-group]').length`),4);
    assert(await browser.evaluate(`!!document.querySelector('${active} .echo-cost-filter svg')`),'Cost filter must have a funnel');
    for (const cost of ['1','3','4']) {
      await changeEchoFilter('cost',cost);
      assert.deepEqual(await shownEchoNames(),filterEchoCatalog(wikiEchoes,catalog.sets,{cost}).map(e=>e.name).sort());
    }
    await browser.click(`${active} [data-echo-class="calamity"]`);
    assert.deepEqual(await shownEchoNames(),filterEchoCatalog(wikiEchoes,catalog.sets,{cost:'4',class:'calamity'}).map(e=>e.name).sort());
    await browser.click(`${active} [data-echo-reset]`);
    const target=wikiEchoes.find(e=>e.classId==='elite' && e.isNightmare && e.element && e.sets.length);
    const combination={cost:'3',class:'elite',variant:'nightmare',element:target.element,set:target.sets[0]};
    for (const key of ['cost','variant','element','set']) await changeEchoFilter(key,combination[key]);
    await browser.click(`${active} [data-echo-class="elite"]`);
    assert.deepEqual(await shownEchoNames(),filterEchoCatalog(wikiEchoes,catalog.sets,combination).map(e=>e.name).sort());
    await searchEchoes(target.name);
    await waitFor(`document.querySelectorAll('${active} .echo-class-section .builder-option').length===1`);
    assert.deepEqual(await shownEchoNames(),[target.name]);
    assert(await browser.evaluate(`document.activeElement.matches('[data-echo-search]')`),'Search keeps focus during results updates');
    await browser.click(`${active} .echo-class-section .builder-option`);
    await browser.click(`${active} .detail-aside a[data-link]`);
    assert.deepEqual(await shownEchoNames(),[target.name],'SPA navigation preserves combined Echo filters');
    await searchEchoes('no-echo-matches-this-query');
    await waitFor(`!!document.querySelector('${active} [data-echo-results] .empty-state')`);
    await browser.click(`${active} [data-echo-reset]`);
    assert.equal((await shownEchoNames()).length,wikiEchoes.length,'Reset restores every valid Echo');
    await searchEchoes('jue');
    await waitFor(`document.querySelector('${active} [data-echo-search]')?.value==='jue' && [...document.querySelectorAll('${active} .echo-class-section .builder-option-info strong')].some(e=>e.textContent==='Jué')`);
    await browser.click(`${active} [data-echo-reset]`);
    await browser.go('/'+language+'/ecos/clang-bang');
    const original=wikiEchoes.find(e=>e.slug==='clang-bang'), skin=original.phantoms[0];
    await browser.click(active+' [data-echo-appearance="'+skin.slug+'"]');
    assert.equal(await browser.evaluate(`document.querySelector('${active} .detail-aside img').getAttribute('src')`),skin.iconUrl);
    assert.equal(await browser.evaluate(`document.querySelector('${active} h1').textContent`),original.name);
    await browser.click(active+' [data-echo-appearance="clang-bang"]');
    assert.equal(await browser.evaluate(`document.querySelector('${active} .detail-aside img').getAttribute('src')`),original.iconUrl);
    await browser.go('/'+language+'/ecos/'+skin.slug);
    assert.equal(await browser.evaluate(`document.querySelector('${active} [data-echo-appearance-label]').textContent`),skin.name);
    const nav = await browser.evaluate(`[...document.querySelectorAll('[data-app-topbar] a[data-link]')].map(a=>a.getAttribute('href'))`);
    const echoIndex=nav.indexOf('/'+language+'/ecos');
    assert.equal(nav[echoIndex+1],'/'+language+'/sonatas');
    for(const route of ['ecos','sonatas','sonatas/frosty-resolve','sonatas/crown-of-valor','sonatas/shadow-of-shattered-dreams','ecos/dwarf-cassowary','ecos/clang-bang','armas','armas/verdant-summit']) {
      await browser.go('/'+language+'/'+route);
      if(route==='armas')await waitFor(`document.querySelectorAll('${active} .weapon-card .mini-dl dd').length>=248 && [...document.querySelectorAll('${active} .weapon-card .mini-dl dd')].every(d=>d.textContent!=='—')`);
      if(route==='sonatas')assert(await browser.evaluate(`[...document.querySelectorAll('${active} .sonata-summary')].every(p=>p.textContent.length>0 && p.textContent.length<=171)`));
      if(route==='armas') {
        assert(await browser.evaluate(`!!document.querySelector('${active} .weapon-filter-symbol svg')`));
        assert(await browser.evaluate(`[...document.querySelectorAll('${active} .weapon-card-summary')].every(p=>p.textContent.length<150)`));
        for(const type of ['Sword','Pistols','all']) {
          await browser.evaluate(`(()=>{const input=document.querySelector('${active} [data-weapon-filter]');input.value='${type}';input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
          await waitFor(`document.querySelector('${active} [data-weapon-filter]').value==='${type}'`);
          if(type!=='all') assert(await browser.evaluate(`[...document.querySelectorAll('${active} .weapon-card .pill')].every(p=>p.textContent==='${metadataText(type,language)}')`));
          assert(await browser.evaluate(`document.querySelectorAll('${active} .weapon-card').length>0`));
        }
      }
      if(route==='sonatas')assert.equal(await browser.evaluate(`document.querySelectorAll('${active} .archive-catalog .builder-option').length`),catalog.sets.length);
      if(route==='sonatas/frosty-resolve')assert.match(await browser.evaluate(`document.querySelector('${active}').innerText`),/22\.5%/);
      if(route==='armas/verdant-summit')await waitFor(`document.querySelector('${active} .weapon-stats-scroll')?.innerText.includes('587.50')`);
      for(const width of [320,390,768,1440]) {
        await browser.viewport(width);
        const size=await browser.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');
        assert(size.scroll<=size.width,language+'/'+route+' overflow at '+width);
        const icon=await browser.evaluate("(()=>{const r=document.querySelector('.footer .settings-icon, footer .settings-icon').getBoundingClientRect();return {width:r.width,height:r.height};})()");
        assert.equal(icon.width,20);assert.equal(icon.height,20);
      }
      assert(await browser.evaluate(`!!document.querySelector('.footer-ai-note')?.textContent`));
      const text=await browser.evaluate(`document.querySelector('${active}').innerText`);
      assert(!/\{\d+\}/.test(text),'Unresolved effect on '+route);
      results.push(language+'/'+route);
      if(language==='pt-BR' && ['ecos','sonatas','sonatas/frosty-resolve','ecos/clang-bang','armas'].includes(route)) {
        await browser.viewport(390);
        await waitFor(`[...document.querySelectorAll('${active} .builder-option-icon img')].filter(img=>img.getBoundingClientRect().top<innerHeight).every(img=>img.complete && img.naturalWidth>0)`);
        await browser.screenshot('artifacts/archive-'+route.replaceAll('/','-')+'-390.png');
      }
    }
  }
  await browser.click('footer [data-settings-open]');
  await waitFor("!!document.querySelector('.settings-dialog')");
  assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));
  console.log('PASS:',wikiEchoes.length,'Echoes with 42 parent-linked Phantom skins; skin image switches and legacy routes; combined Echo filters; compact Sonata/weapon cards and weapon type filters; footer settings and AI notice; 3 languages, 4 viewport widths, no JS errors.');
} finally {browser.close();}
