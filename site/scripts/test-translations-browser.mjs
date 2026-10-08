import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {openBrowser,delay} from './browser-harness.mjs';
import {loadEchoCatalog,ECHO_SOURCE} from '../public/echo-catalog.js';
import {loadWeaponDetail} from '../public/weapon-catalog.js';
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const snapshot=async(file,fallback)=>{try{return await read(file);}catch{return fallback();}};
const payload=await snapshot('artifacts/current-echo.json',()=>fetch(ECHO_SOURCE).then(response=>response.json())), catalog=await snapshot('artifacts/current-echo-catalog.json',loadEchoCatalog);
payload.EchoDetails=(await read('scripts/fixtures/encore-echo-identities.json')).EchoDetails;
Object.assign(payload.EchoDetails,await read('scripts/fixtures/encore-phantom-parents.json'));
payload.SonataDetails=Object.fromEntries(catalog.sets.map(set=>[set.name,{EffectKeys:set.bonuses.map(b=>b.count),EffectDescriptions:set.bonuses.map(b=>b.description)}]));
const locale=await read('scripts/fixtures/encore-localized-text.json'), weapons=await snapshot('artifacts/current-weapon.json',()=>fetch('https://api-v2.encore.moe/api/en/weapon').then(response=>response.json())), weaponDetails=await snapshot('artifacts/current-weapon-details.json',async()=>{const entries=[],queue=[...weapons.weapons];await Promise.all(Array.from({length:4},async()=>{while(queue.length){const weapon=queue.shift();entries.push([weapon.Id,await loadWeaponDetail(weapon.Id)]);}}));return Object.fromEntries(entries);}), hsin=await read('scripts/fixtures/hsin-detail.json');
const detail={id:1311,name:'Hsin',introduction:hsin.Introduction.Content,maxLevel:90,stats:{HP:12000,ATK:400,DEF:1000,'Crit. Rate':'5.0%'},skills:hsin.Skills.map(s=>({name:s.SkillName,type:s.SkillType,description:s.SkillDescribe.replace(/<[^>]*>/g,'')})),sourceUrl:'https://api-v2.encore.moe/api/en/character/1311',imageUrl:hsin.FormationRoleCard,portraitUrl:hsin.RolePortrait,iconUrl:hsin.RoleHeadIconLarge};
const startAt=new Date(Date.now()-86400000).toISOString(),endAt=new Date(Date.now()+86400000).toISOString();
const banners=[{id:'convene-test-hsin',title:'[As Full as Tonight, Forever] Featured Resonator Convene',type:'resonator',featuredName:'Hsin',featuredDetail:'Electro',highlights:['5-Star Resonator: Hsin; 4-Star Resonators: Buling, Taoqi, Youhu'],startLabel:'Version 3.7 update',estimatedStart:true,startAt,endAt,sourceUrl:'https://wutheringwaves.kurogames.com/en/main/news/detail/5529',imageUrl:'/assets/banners/hsin-3.7.webp'}];
const browser=await openBrowser(),active='.route-panel:not([hidden])',report=[];
async function waitFor(expression){for(let i=0;i<100;i++){if(await browser.evaluate(expression))return;await delay(100);}throw Error('Timed out: '+expression);}
const expected={
 'pt-BR':{nav:'Montar equipamentos',weapon:'Lâmina larga',skill:'Carregando tradução',effects:'Dano',profile:'Sentinela Hsin',save:'Salvar equipamentos',settings:'Acessibilidade',news:'Resumo demonstrativo de atualização',guide:'Ciclo de combate',banner:'Convocação de personagem em destaque',pull:'Convocar',crit:'Taxa crítica'},
 en:{nav:'Build planner',weapon:'Broadblade',effects:'DMG',profile:'Sentinel Hsin',save:'Save build',settings:'Accessibility',news:'Sample patch notes summary',guide:'Combat loop',banner:'Featured Resonator Convene',pull:'Convene',crit:'CRIT Rate'},
 es:{nav:'Planificar equipamiento',weapon:'Mandoble',effects:'Daño',profile:'Hsin',save:'Guardar equipamiento',settings:'Accesibilidad',news:'Resumen de actualización de ejemplo',guide:'Ciclo de combate',banner:'Convocatoria de personaje destacado',pull:'Convocar',crit:'Prob. crítica'}
};
try {
 await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:`
 const payload=${JSON.stringify(payload)}, locale=${JSON.stringify(locale)}, weapons=${JSON.stringify(weapons)}, details=${JSON.stringify(weaponDetails)}, detail=${JSON.stringify(detail)},banners=${JSON.stringify(banners)};
 localStorage.setItem('solaris:echo-catalog:v4',JSON.stringify({payload,updatedAt:Date.now()}));
 for(const [lang,fields] of Object.entries(locale))for(const [kind,data] of Object.entries(fields))localStorage.setItem('solaris:source-text:v1:'+lang+':'+(kind==='character'?'character:1311':kind==='weapon'?'weapon:21010016':kind==='weaponAges'?'weapon:21010026':kind+':'),JSON.stringify({data,time:Date.now()}));
 const originalFetch=fetch.bind(window);
 window.fetch=(url,options)=>{const key=String(url);let data;
 if(['pt','es'].some(locale=>key==='https://api-v2.encore.moe/api/'+locale+'/weapon/21010015'))return Promise.resolve(new Response('{}',{status:503}));
 if(key==='/api/events')data={events:[{title:'Forja do Eco: Desafio de Sonatas',category:'evento_in_game',startAt:'${startAt}',endAt:'${endAt}',rewards:['Tuneadores','Creditos Shell'],sourceUrl:'https://wutheringwaves.kurogames.com',imageUrl:'/assets/event-forge.png'}],source:'fallback-local: fetch failed'};
 else if(key==='/api/codes')data={codes:[{code:'WUTHERINGGIFT',status:'active',rewards:['Astrite x50','Shell Credit x10000'],expiresAt:null}],updatedAt:new Date().toISOString()};
 else if(key==='/api/convenes')data={convenes:banners};
 else if(key==='/api/characters')data={characters:[]};
 else if(key==='/api/characters/1311')data=detail;
 else if(key==='https://api-v2.encore.moe/api/en/weapon')data=weapons;
 else if(key.startsWith('https://api-v2.encore.moe/api/en/weapon/')){const d=details[key.split('/').pop()];data={WeaponName:'Source weapon',Desc:d.passive,ResonName:d.passiveName,AttributesDescription:d.description,IconBig:d.imageUrl,Properties:d.properties.map(p=>({Name:p.name,GrowthValues:p.values.map(v=>({Level:v.level,Value:v.value}))}))};}
 return data?Promise.resolve(new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}})):originalFetch(url,options);};`});
 for(const lang of ['pt-BR','en','es']){
  for(const route of ['','introducao','personagens','personagens/hsin','personagens/aalto','tier-list','armas','armas/verdant-summit','ecos','ecos/clang-bang','sonatas','sonatas/frosty-resolve','itens','guia','codigos','builder','convocacoes','eventos','noticias']){
   await browser.go('/'+lang+'/'+route);await delay(100);
   if(route==='personagens/hsin')await waitFor(`document.querySelector('${active}').innerText.includes('Perfil') || document.querySelector('${active}').innerText.includes('Profile')`);
   if(route==='builder')await waitFor(`!!document.querySelector('${active} [data-builder-save]')`);
   if(route==='convocacoes')await waitFor(`!!document.querySelector('${active} [data-gacha-pull]')`);
   if(route==='armas')await waitFor(`document.querySelectorAll('${active} .weapon-card').length>100`);
   const text=await browser.evaluate(`document.querySelector('${active}').innerText`);
   assert.equal(await browser.evaluate('document.documentElement.lang'),lang);
   assert.equal(await browser.evaluate(`document.querySelector('[data-app-topbar] a[href="/${lang}/builder"]').textContent.trim()`),expected[lang].nav);
   if(lang==='en')assert(!/Carregando|Não foi possível|Cargando|No se pudieron|Rotacao|Sempre|Forja do Eco|Amplifica dano|como atributo secundario/.test(text),route);
   if(lang==='pt-BR')assert(!/Loading|Featured Resonator Convene|CONVENE LAB|BUILD LAB|ECHO LOADOUT|Energy Regen|Since last|Current banners|Equip to gain/.test(text),route);
   if(lang==='es')assert(!/Carregando|Não foi possível|Featured Resonator Convene|BUILD LAB|Energy Regen|Since last|Equip to gain|Sempre/.test(text),route);
   assert(!text.includes('fallback-local: fetch failed'));
   if(route==='armas')assert(text.includes(expected[lang].weapon));
   if(route==='ecos'){
    const query=lang==='pt-BR'?'Criogênico':lang==='es'?'Gelio':'Glacio';
    await browser.evaluate(`(()=>{const input=document.querySelector('${active} [data-echo-search]');input.value=${JSON.stringify(query)};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await delay(250);
    assert(await browser.evaluate(`document.querySelectorAll('${active} .echo-class-section .builder-option').length>0`));
    assert(await browser.evaluate(`[...document.querySelectorAll('${active} .echo-class-section .builder-option-info small')].some(e=>e.textContent.includes(${JSON.stringify(query)}))`),'Localized element search: '+lang);
    await browser.click(active+' [data-echo-reset]');
   }
   if(route==='personagens/hsin')assert(text.includes(expected[lang].profile));
   if(route==='personagens/aalto')assert(!/Carry principal|Ataque basico|Healing\/ATK|Pioneer Podcast option/.test(text) || lang==='en');
   if(route==='guia')assert(text.includes(expected[lang].guide));
   if(route==='noticias')assert(text.includes(expected[lang].news));
   if(route==='builder'){
    assert(text.includes(expected[lang].save));assert(text.includes(expected[lang].crit));
    await browser.click(active+' [data-builder-open="character"]');
    const options=await browser.evaluate(`[...document.querySelectorAll('[data-builder-dialog] [data-builder-filter="character"] option')].map(e=>({value:e.value,text:e.textContent}))`);
    assert(options.some(option=>option.value==='Spectro' && option.text===(lang==='pt-BR'?'Fotônico':lang==='es'?'Espectro':'Spectro')));
    await browser.click('[data-builder-close]');
    await browser.evaluate(`(()=>{const input=document.querySelector('${active} [data-builder-field="name"]');input.value='Hsin · saved';input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await browser.click(active+' [data-builder-save]');
   }
   if(route==='sonatas/frosty-resolve')assert(text.includes(expected[lang].effects));
   if(route==='convocacoes'){
    assert(text.includes(expected[lang].banner));
    assert.equal(await browser.evaluate(`document.querySelector('${active} [data-gacha-pull="1"]').textContent.trim()`),expected[lang].pull+' ×1');
   }
   for(const width of [390,1440]){await browser.viewport(width);assert(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),lang+'/'+route+' overflow '+width);}
   report.push({lang,route,text});
  }
  await browser.click('footer [data-settings-open]');
  assert(await browser.evaluate(`document.querySelector('.settings-dialog').innerText.includes(${JSON.stringify(expected[lang].settings)})`));
  await browser.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  if(lang!=='en'){
   await browser.go('/'+lang+'/armas/lustrous-razor');
   const notice=lang==='pt-BR'?'Tradução indisponível no momento':'Traducción no disponible por el momento';
   await waitFor(`document.querySelector('${active}').innerText.includes(${JSON.stringify(notice)})`);
   assert(!await browser.evaluate(`document.querySelector('${active}').innerText.includes('Loading translation')`));
  }
 }
 assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));
 assert.equal(await browser.evaluate("JSON.parse(localStorage.getItem('solaris:builder:v1')).name"),'Hsin · saved');
 await fs.writeFile('artifacts/translation-review-final.json',JSON.stringify(report,null,2));
 console.log('PASS: '+report.length+' pages/details in pt-BR/en/es, localized source effects/profiles, menus, metadata, Builder picker/save, Gacha banners/actions, settings, source failures, 390/1440 px, canonical IDs and names, no JS errors.');
}finally{browser.close();}
