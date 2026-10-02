import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openBrowser,delay} from './browser-harness.mjs';
const browser=await openBrowser();
const wait=async expression=>{for(let i=0;i<150;i++){if(await browser.evaluate(expression))return;await delay(150);}console.log(await browser.evaluate('document.body.innerText.slice(0,5000)'),browser.errors);throw Error(expression);};
const report=[];
try {
  for(const width of [390,768,1440]){
    await browser.viewport(width,900);await browser.go('/pt-BR/personagens/hsin');
    await wait(`document.querySelector('.route-panel:not([hidden]) [data-video-id="a3zMk49qpwI"]') && document.querySelector('.character-skill')`);
    await browser.evaluate(`Promise.all([...document.querySelectorAll('.route-panel:not([hidden]) .detail-aside img')].map(i=>i.decode().catch(()=>{})))`);
    const detail=await browser.evaluate(`({title:document.querySelector('.route-panel:not([hidden]) h1').textContent,skills:document.querySelectorAll('.character-skill').length,body:document.querySelector('.detail-main').innerText,portrait:document.querySelector('.detail-aside img').currentSrc,portraitWidth:document.querySelector('.detail-aside img').naturalWidth,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,iframes:document.querySelectorAll('iframe').length})`);
    assert.equal(detail.title,'Hsin');assert.equal(detail.skills,10);assert(detail.body.includes('10300'));assert(detail.body.includes('Blooming Jadehaven'));assert(detail.portrait.includes('PixActivity'));assert(detail.portraitWidth>=2000);assert.equal(detail.iframes,0);assert(detail.scrollWidth<=width);
    await browser.screenshot(`artifacts/hsin-${width}.png`);report.push({width,portraitWidth:detail.portraitWidth,skills:detail.skills,scrollWidth:detail.scrollWidth});
    await browser.go('/pt-BR/personagens');await wait(`document.querySelector('.new-resonators a[href$="/hsin"]')`);
    assert(await browser.evaluate(`document.querySelectorAll('.character-card').length>=55`));
    await browser.click('.new-resonators a[href$="/hsin"]');await wait(`document.querySelector('.character-skill')`);
    await browser.click('a[href$="/armas/blooming-jadehaven"]');await wait(`document.querySelector('.weapon-detail table')`);
    assert.equal(await browser.evaluate(`document.querySelector('.route-panel:not([hidden]) h1').textContent`),'Blooming Jadehaven');
    assert(await browser.evaluate(`document.documentElement.scrollWidth<=innerWidth`));
  }
  await browser.go('/pt-BR/convocacoes');await wait(`document.querySelector('[data-gacha-banner]')`);
  await browser.click('[data-gacha-banner="convene-5529-hsin"]');
  await wait(`document.querySelector('.gacha-banner-body')?.innerText.includes('Hsin')`);
  const banner=await browser.evaluate(`[...document.querySelectorAll('img')].find(i=>i.getAttribute('src')==='/assets/banners/hsin-3.7.webp')?.src`);
  assert(banner?.endsWith('/assets/banners/hsin-3.7.webp'));
  for (const type of ['resonator','weapon']) {
    if (type==='weapon') {await browser.click('[data-gacha-type="weapon"]');await browser.click('[data-gacha-banner="convene-5529-bloomingjadehaven"]');}
    await wait(`!document.querySelector('[data-gacha-pull="1"]')?.disabled`);
    await browser.evaluate(`{const pity=document.querySelector('[data-gacha-field="pity5"]');pity.value=79;pity.dispatchEvent(new Event('change',{bubbles:true}));}`);
    if (type==='resonator') await browser.evaluate(`{const guarantee=document.querySelector('[data-gacha-field="guaranteed"]');guarantee.checked=true;guarantee.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await browser.click('[data-gacha-pull="1"]');await wait(`document.querySelector('.convene-skip')`);await browser.click('.convene-skip');await wait(`document.querySelector('.gacha-results')`);
    assert(await browser.evaluate(`document.querySelector('.gacha-results').innerText.includes(${JSON.stringify(type==='weapon'?'Blooming Jadehaven':'Hsin')})`));
  }
  await browser.go('/pt-BR/builder');await wait(`document.querySelector('[data-builder-open="character"]')`);
  await browser.click('[data-builder-open="character"]');
  await browser.evaluate(`{const input=document.querySelector('[data-builder-search="character"]');input.value='Hsin';input.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await delay(220);await browser.click('[data-builder-pick="character"]');
  assert.equal(await browser.evaluate(`document.querySelector('.builder-resonator-info h2').textContent`),'Hsin');
  await browser.click('[data-builder-open="weapon"]');
  await browser.evaluate(`{const input=document.querySelector('[data-builder-search="weapon"]');input.value='Blooming Jadehaven';input.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await delay(220);await wait(`document.querySelector('[data-builder-pick="weapon"]')`);await browser.click('[data-builder-pick="weapon"]');
  await browser.click('[data-builder-save]');
  await browser.go('/pt-BR/builder');await wait(`document.querySelector('.builder-resonator-info h2')?.textContent==='Hsin'`);
  await wait(`document.querySelector('.builder-equipment').innerText.includes('Blooming Jadehaven')`);
  assert(await browser.evaluate(`document.querySelector('.builder-equipment').innerText.includes('Blooming Jadehaven')`));
  // A future source record must work without adding it to app.js.
  const catalog=await (await fetch('http://localhost:4173/api/characters')).json();
  const details=await (await fetch('http://localhost:4173/api/characters/1311')).json();
  const newcomer={id:'Future_Resonator',name:'Future Resonator',rarity:5,element:'Electro',weapon:'Rectifier',version:'99.0',encoreId:1999,useApiDetails:true,imageUrl:details.imageUrl,portraitUrl:details.portraitUrl};
  const fixtures={'/api/characters':{...catalog,characters:[...catalog.characters,newcomer]},'/api/characters/1999':{...details,id:1999,name:newcomer.name},'/api/character-media':{channelId:'UC0Bi5KMcECRVYis5Gb_ZYZQ',videos:{futureresonator:'a3zMk49qpwI'}},'/api/character-weapons/1999':{signatureWeapon:{id:21050116,name:'Blooming Jadehaven',slug:'blooming-jadehaven'},sourceUrl:'https://wuwaguide.kurogames.com/?role_id=1999'}};
  await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:`{const original=fetch.bind(window),fixtures=${JSON.stringify(fixtures)};window.fetch=(url,options)=>fixtures[String(url)]?Promise.resolve(new Response(JSON.stringify(fixtures[String(url)]),{headers:{'Content-Type':'application/json'}})):original(url,options);}`});
  await browser.go('/pt-BR/personagens');await wait(`document.querySelector('.new-resonators a[href$="/future-resonator"]')`);
  assert(await browser.evaluate(`document.querySelector('.character-card a[href$="/jiyan"]') && document.querySelector('.character-card a[href$="/hsin"]')`));
  await browser.click('.new-resonators a[href$="/future-resonator"]');await wait(`document.querySelector('.character-skill') && document.querySelector('a[href$="/armas/blooming-jadehaven"]') && document.querySelector('[data-video-id="a3zMk49qpwI"]')`);
  assert.equal(await browser.evaluate(`document.querySelector('.route-panel:not([hidden]) h1').textContent`),'Future Resonator');
  assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));
  await fs.writeFile('artifacts/hsin-browser-validation.json',JSON.stringify({report,errors:browser.errors,detailRequests:browser.requests.filter(url=>/\/api\/characters\/1311$/.test(url)).length},null,2));
  console.log('PASS: Hsin at 390/768/1440px, high-resolution portrait, official video, weapon route, guaranteed character/weapon draws, Builder persistence and automatic page/spotlight/details/video/weapon for a future source record.');
}finally{browser.close();}
