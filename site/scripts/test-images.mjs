import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openBrowser, delay} from './browser-harness.mjs';
import {encoreImageUrl} from '../public/image-utils.js';

assert.equal(encoreImageUrl('/Game/Aki/Weapon/T_Weapon.T_Weapon'), 'https://api.encore.moe/resource/Data/Game/Aki/Weapon/T_Weapon.webp');
assert.equal(encoreImageUrl('https://unrelated.example/image.webp'), '');
assert.equal(encoreImageUrl('/Game/../secret'), '');
const browser = await openBrowser();
const report = [];
const wait = async expression => {
  for (let i=0;i<120;i++) {if(await browser.evaluate(expression)) return; await delay(100);}
  throw Error('Image test timed out: '+expression);
};
try {
  const raw = JSON.parse(await fs.readFile('scripts/fixtures/hsin-detail.json','utf8'));
  const weapon = JSON.parse(await fs.readFile('artifacts/weapon-detail-probe.json','utf8'));
  const weapons = JSON.parse(await fs.readFile('artifacts/encore-weapons.json','utf8'));
  const echoes = JSON.parse(await fs.readFile('artifacts/encore-echoes.json','utf8'));
  const startAt = new Date(Date.now()-86400000).toISOString(), endAt = new Date(Date.now()+86400000).toISOString();
  const fixtures = {
    '/api/characters': {characters:[{id:'Hsin',name:'Hsin',encoreId:1311,rarity:5,element:'Electro',weapon:'Rectifier',imageUrl:raw.FormationRoleCard,iconUrl:raw.RoleHeadIconLarge}],updatedAt:new Date().toISOString()},
    '/api/characters/1311': {id:1311,name:'Hsin',portraitUrl:raw.RolePortrait,imageUrl:raw.FormationRoleCard,iconUrl:raw.RoleHeadIconLarge,skills:[],stats:{}},
    '/api/convenes': {convenes:[{id:'image-test',type:'resonator',title:'Hsin official banner',featuredName:'Hsin',imageUrl:'/assets/banners/hsin-3.7.webp',sourceUrl:'https://wutheringwaves.kurogames.com/',startAt,endAt,highlights:[]}]},
    '/api/events': {events:[{id:'image-event',title:'Image test',category:'evento_in_game',imageUrl:'/assets/event-forge.png',sourceUrl:'https://wutheringwaves.kurogames.com/',startAt,endAt,rewards:[]}]},
    'https://api-v2.encore.moe/api/en/weapon':weapons,
    'https://api-v2.encore.moe/api/en/weapon/21010016':weapon,
    'https://api-v2.encore.moe/api/en/echo':echoes
  };
  await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:`{const original=fetch.bind(window), fixtures=${JSON.stringify(fixtures)};window.fetch=(url,options)=>fixtures[String(url)]?Promise.resolve(new Response(JSON.stringify(fixtures[String(url)]),{status:200})):original(url,options);}`});
  for (const width of [320,390,768,1440]) {
    await browser.viewport(width);
    for (const route of ['personagens','personagens/hsin','tier-list','armas/verdant-summit','ecos','builder','eventos','noticias','gacha','introducao']) {
      await browser.go('/pt-BR/'+route);
      if(route==='armas/verdant-summit') await wait(`document.querySelector('.weapon-detail img')?.getAttribute('src')?.includes('IconWeapon732')`);
      if(route==='gacha') await wait(`!!document.querySelector('.gacha-banner-art')`);
      if(route==='personagens/hsin') await wait(`document.querySelector('.detail-aside img')?.getAttribute('src')?.includes('PixActivity')`);
      await wait(`document.querySelectorAll('.route-panel:not([hidden]) img').length>0`);
      await browser.evaluate(`Promise.all([...document.querySelectorAll('.route-panel:not([hidden]) img')].filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>i.decode().catch(()=>{})))`);
      const result=await browser.evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,images:[...document.querySelectorAll('.route-panel:not([hidden]) img')].map(i=>({src:i.currentSrc,fit:getComputedStyle(i).objectFit,position:getComputedStyle(i).objectPosition,width:i.naturalWidth,height:i.naturalHeight,displayWidth:i.clientWidth,displayHeight:i.clientHeight}))})`);
      assert(result.scrollWidth<=width,route+' overflows at '+width);
      assert(result.images.length,route+' contains images');
      assert(result.images.every(i=>i.fit==='contain'),route+' crops an image');
      if(route==='personagens/hsin') assert(result.images.some(i=>i.width>=2000),'High resolution character portrait');
      if(route==='armas/verdant-summit') assert(result.images.some(i=>i.width===732),'Large weapon artwork');
      report.push({route,...result});
      if(width===390 && ['personagens/hsin','armas/verdant-summit','gacha','eventos'].includes(route)) await browser.screenshot(`artifacts/images-${route.replaceAll('/','-')}-${width}.png`);
    }
  }
  await browser.go('/pt-BR/builder');
  await browser.click('[data-builder-open="character"]');
  assert(await browser.evaluate(`!!document.querySelector('.builder-dialog .avatar--icon') && [...document.querySelectorAll('.builder-dialog .avatar img')].every(i=>getComputedStyle(i).objectFit==='contain')`));

  // A broken srcset must retry the original, then other sources, without looping.
  await browser.go('/pt-BR/');
  await browser.evaluate(`(async()=>{const {imageAttributes,setImageSources}=await import('/image-utils.js');const box=document.createElement('div');box.innerHTML='<img id="responsive-fallback" '+imageAttributes(['/assets/site-logo.png','/assets/event-web.png'],{srcset:'/missing-candidate.webp 1x, /missing-candidate-2.webp 2x'})+'><img id="original-fallback" '+imageAttributes(['/missing-primary.webp','/assets/site-logo.png'])+'>';document.body.append(box);await Promise.all([...box.querySelectorAll('img')].map(i=>new Promise(resolve=>{i.addEventListener('load',resolve,{once:true});})));setImageSources(document.querySelector('#original-fallback'),['/missing-upgrade.webp','/assets/site-logo.png']);})()`);
  await wait(`document.querySelector('#original-fallback').complete && document.querySelector('#original-fallback').naturalWidth===550`);
  assert(await browser.evaluate(`document.querySelector('#responsive-fallback').naturalWidth===550 && !document.querySelector('#responsive-fallback').hasAttribute('srcset') && document.querySelector('#original-fallback').naturalWidth===550`));
  await browser.evaluate(`(async()=>{const {imageAttributes}=await import('/image-utils.js');const box=document.createElement('div');box.className='avatar';box.innerHTML='<img id="last-fallback" '+imageAttributes(['/missing-first.webp','/missing-second.webp',"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'/%3E"])+'>';document.body.append(box);})()`);
  await wait(`document.querySelector('#last-fallback').complete && document.querySelector('#last-fallback').naturalWidth===20`);
  assert(await browser.evaluate(`document.querySelector('#last-fallback').parentElement.classList.contains('avatar--fallback') && document.querySelector('#last-fallback').dataset.imageFallbacks==='[]'`));
  await browser.evaluate(`(async()=>{const {setImageSources}=await import('/image-utils.js');setImageSources(document.querySelector('#last-fallback'),['/assets/site-logo.png']);})()`);
  await wait(`document.querySelector('#last-fallback').naturalWidth===550 && !document.querySelector('#last-fallback').parentElement.classList.contains('avatar--fallback')`);

  for (const [width,dpr,logo,hero] of [[390,3,126,'2560'],[1440,2,84,'3840']]) {
    await browser.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:dpr,mobile:width<768});
    await browser.go('/pt-BR/');
    await wait(`document.querySelector('.brand-logo').complete && document.querySelector('.brand-logo').naturalWidth>0`);
    const selected=await browser.evaluate(`document.querySelector('.brand-logo').currentSrc`);
    // Browsers may retain the larger cached candidate after decreasing DPR.
    assert(dpr===3 ? selected.includes('site-logo-126') : /site-logo-(84|126)\.webp$/.test(selected),'Logo DPR selection: '+selected);
    await wait(`performance.getEntriesByType('resource').some(r=>r.name.includes('home-hero-${hero}.webp'))`);
    report.push({width,dpr,logo:selected,hero});
  }
  assert.deepEqual(browser.errors,[]);
  await fs.writeFile('artifacts/image-display-verification.json',JSON.stringify({report,checks:['no content cropping','natural proportions','large portrait and weapon','responsive source fallback','failed upgrade recovery','DPR selection','no horizontal overflow'],errors:browser.errors},null,2));
  console.log('PASS: 40 responsive image layouts, large API artwork, Builder icons, fallback recovery and DPR 2/3 source selection.');
} finally {browser.close();}
