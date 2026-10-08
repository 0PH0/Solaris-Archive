import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openBrowser,delay} from './browser-harness.mjs';
const events=JSON.parse(await fs.readFile(new URL('./fixtures/events-ui.json',import.meta.url),'utf8'));
const browser=await openBrowser(),active='.route-panel:not([hidden])',requests=[];
async function waitFor(expression){for(let i=0;i<100;i++){if(await browser.evaluate(expression))return;await delay(100);}throw Error('Timed out: '+expression);}
const labels={'pt-BR':{codes:'Códigos Ativos',upcoming:'Próximos eventos',search:'Pesquisar eventos'},en:{codes:'Active codes',upcoming:'Upcoming events',search:'Search events'},es:{codes:'Códigos activos',upcoming:'Próximos eventos',search:'Buscar eventos'}};
try{
  await browser.call('Page.addScriptToEvaluateOnNewDocument',{source:`
    const NativeDate=Date;window.testNow=NativeDate.parse('2026-10-08T12:00:00Z');
    window.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[window.testNow]));}static now(){return window.testNow;}};
    window.testCalls=[];window.eventSourceFailed=false;window.codeSourceFailed=false;
    const records=${JSON.stringify(events)},originalFetch=fetch.bind(window);
    navigator.clipboard.writeText=async text=>{window.copiedCode=text;};
    window.fetch=(url,options)=>{
      const key=String(url);window.testCalls.push(key);
      if(key==='/api/events')return window.eventSourceFailed?Promise.reject(Error('Offline')):Promise.resolve(new Response(JSON.stringify({events:records,updatedAt:new Date().toISOString(),source:'Official Kuro Games announcements',syncIntervalMinutes:30})));
      if(key==='/api/codes')return Promise.resolve(new Response(JSON.stringify({codes:window.codeSourceFailed?[]:[{code:'WUTHERINGGIFT',status:'active',rewards:['Astrite x50','Shell Credit x10000'],expiresAt:null},{code:'DVME2MOHOQJT',status:'active',rewards:['Astrite x20','Shell Credit x20000'],expiresAt:null},{code:'FINDSENTINEL',status:'expired',rewards:[],expiresAt:'2026-09-19T00:00:00Z'}],updatedAt:new Date().toISOString(),externalError:window.codeSourceFailed})));
      if(key==='/api/convenes')return Promise.resolve(new Response(JSON.stringify({convenes:[]})));
      return originalFetch(url,options);
    };`});
  for(const lang of ['pt-BR','en','es']){
    await browser.go('/'+lang+'/eventos');
    await waitFor(`document.querySelectorAll('${active} [data-event-id]').length>10 && document.querySelector('${active} [data-copy="WUTHERINGGIFT"]')`);
    const body=await browser.evaluate(`document.querySelector('${active}').innerText`);
    assert(body.includes(labels[lang].codes));assert(body.includes(labels[lang].upcoming));assert(body.includes(labels[lang].search));
    assert(!body.includes('WAVEBUILDER'));assert(!body.includes('FINDSENTINEL'));
    assert(!await browser.evaluate("window.testCalls.includes('/api/convenes')"),'Events must not request banners');
    assert(await browser.evaluate(`[...document.querySelectorAll('${active} [data-events-section="active"] [data-event-id]')].every(card=>card.dataset.eventStatus==='ao_vivo')`));
    assert(await browser.evaluate(`!!document.querySelector('${active} [data-events-section="upcoming"] [data-event-id="official-5571-echoerase"]')`));
    assert(await browser.evaluate(`!!document.querySelector('${active} [data-events-section="history"] [data-event-id="official-5129"]')`));
    for(const width of [320,390,768,1440]){
      await browser.viewport(width);await delay(60);
      assert(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),lang+' overflow '+width);
      if(lang==='pt-BR' && [390,1440].includes(width))await browser.screenshot('artifacts/events-'+width+'.png');
    }
    await browser.click(active+' [data-event-filter="history"]');
    const initialHistory=await browser.evaluate(`document.querySelectorAll('${active} [data-events-section="history"] [data-event-id]').length`);
    assert.equal(initialHistory,12);
    await browser.click(active+' [data-events-more]');
    assert(await browser.evaluate(`document.querySelectorAll('${active} [data-events-section="history"] [data-event-id]').length>12`));
    await browser.click(active+' [data-event-filter="upcoming"]');
    assert(!await browser.evaluate(`!!document.querySelector('${active} [data-events-section="active"]')`));
    await browser.evaluate(`(()=>{const select=document.querySelector('${active} [data-event-category]');select.value='evento_web';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await browser.evaluate(`document.querySelectorAll('${active} [data-event-id]').length`),1);
    await browser.evaluate(`(()=>{const input=document.querySelector('${active} [data-event-search]');input.value='Fishing';input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await delay(300);
    assert.equal(await browser.evaluate(`document.querySelectorAll('${active} [data-event-id]').length`),1);
    await browser.click(active+' [data-event-filter="codes"]');
    await browser.click(active+' [data-copy="WUTHERINGGIFT"]');assert.equal(await browser.evaluate('window.copiedCode'),'WUTHERINGGIFT');
    assert.equal(await browser.evaluate(`document.querySelectorAll('${active} [data-event-id]').length`),0);
    await browser.evaluate('window.codeSourceFailed=true;window.eventSourceFailed=true');
    await browser.click(active+' [data-events-refresh]');await delay(200);
    assert(!await browser.evaluate(`!!document.querySelector('${active} [data-copy]')`),'Unavailable code sources must not advertise stale codes');
    await browser.click(active+' [data-event-filter="all"]');
    await browser.evaluate(`(()=>{const select=document.querySelector('${active} [data-event-category]');select.value='all';select.dispatchEvent(new Event('change',{bubbles:true}));const input=document.querySelector('${active} [data-event-search]');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));})()`);await delay(300);
    assert(await browser.evaluate(`document.querySelectorAll('${active} [data-event-id]').length>10`),'Source failure must preserve prior events');
    await browser.evaluate("window.testNow=Date.parse('2026-10-28T12:00:00Z')");await delay(1200);
    assert(!await browser.evaluate(`!!document.querySelector('${active} [data-events-section="active"] [data-event-id="official-5571-artisanssearch"]')`));
    assert(await browser.evaluate(`!!document.querySelector('${active} [data-events-section="history"] [data-event-id="official-5571-artisanssearch"]')`));
    requests.push(...await browser.evaluate('window.testCalls'));
  }
  assert.equal(browser.errors.length,0,JSON.stringify(browser.errors));
  console.log('PASS: event sections, preserved archive, future/permanent events, search/category, copy code, expiration, source outages, independent APIs; pt-BR/en/es; 320/390/768/1440 px; no JS errors.');
}finally{browser.close();}
