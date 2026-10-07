import assert from 'node:assert/strict';
import {openBrowser, delay} from './browser-harness.mjs';

const browser = await openBrowser();
try {
  const now = Date.now();
  const characters = [
    {name: 'Hsin', version: '3.7', newRelease: true, element: 'Electro', weapon: 'Rectifier'},
    {name: 'Jiyan', version: '1.0', element: 'Aero', weapon: 'Broadblade'},
    {name: 'Verina', version: '1.0', element: 'Spectro', weapon: 'Rectifier'},
    {name: 'Mortefi', version: '1.0', element: 'Fusion', weapon: 'Pistols'},
    {name: 'Sanhua', version: '1.0', element: 'Glacio', weapon: 'Sword'},
    {name: 'Jinhsi', version: '1.1', element: 'Spectro', weapon: 'Broadblade'}
  ].map(character => ({...character, id: character.name, rarity: 5, imageUrl: '/assets/site-logo-126.webp', iconUrl: '/assets/site-logo-126.webp'}));
  const convenes = [{id: 'home-active', type: 'resonator', featuredName: 'Jiyan', title: 'Current banner', startAt: new Date(now - 86400000).toISOString(), endAt: new Date(now + 86400000).toISOString(), imageUrl: '/assets/banners/hsin-3.7-464.webp', highlights: []}];
  const fixtures = {'/api/characters': {characters}, '/api/convenes': {convenes}, '/api/events': {events: []}};
  await browser.call('Page.addScriptToEvaluateOnNewDocument', {source: `const fixtures=${JSON.stringify(fixtures)}; const originalFetch=window.fetch.bind(window);window.fetch=(url,options)=>fixtures[String(url)]?Promise.resolve(new Response(JSON.stringify(fixtures[String(url)]),{status:200,headers:{'Content-Type':'application/json'}})):originalFetch(url,options);`});
  for (const lang of ['pt-BR', 'en', 'es']) {
    await browser.go(`/${lang}/`);
    for(let i=0;i<60;i++) {
      if(await browser.evaluate(`document.querySelector('.home-featured-strip')?.textContent.includes('Banner') || document.querySelector('.home-featured-strip')?.textContent.includes('banner')`)) break;
      await delay(100);
    }
    assert.equal(await browser.evaluate(`document.querySelectorAll('.home-featured-card').length`), 6);
    assert.equal(await browser.evaluate(`document.querySelector('[data-showcase-toggle]').getAttribute('aria-expanded')`), 'false');
    assert(await browser.evaluate(`document.querySelector('#home-resonators-content').hidden`));
    for (const width of [320, 390, 768, 1440]) {
      await browser.viewport(width);
      assert(await browser.evaluate(`document.documentElement.scrollWidth<=innerWidth`), `${lang} ${width}: no page overflow`);
      const height = await browser.evaluate(`document.querySelector('.home-resonators').getBoundingClientRect().height`);
      assert(height < 330, `${lang} ${width}: collapsed section stays compact (${height}px)`);
    }
    await browser.click('[data-showcase-toggle]');
    assert((await browser.evaluate(`document.querySelectorAll('.home-role-card').length`)) >= 6, 'Full catalog remains available');
    for(const role of ['dps','support','sub','control']) {
      await browser.click(`[data-role-filter="${role}"]`);
      assert((await browser.evaluate(`document.querySelectorAll('.home-role-card').length`)) > 0, `Role ${role} available`);
      assert.equal(await browser.evaluate(`document.querySelectorAll('.home-featured-card').length`), 6, 'Role filters leave highlights intact');
      assert(await browser.evaluate(`document.documentElement.scrollWidth<=innerWidth`));
    }
    await browser.click('[data-role-filter="all"]');
    await browser.click('[data-showcase-toggle]');
  }
  await browser.go('/pt-BR/');
  for (const width of [390, 1440]) {
    await browser.viewport(width);
    await browser.evaluate(`document.querySelector('.home-resonators').scrollIntoView({block:'center'})`);
    await delay(150);
    await browser.screenshot(`artifacts/home-featured-${width}.png`);
  }
  await browser.click('[data-showcase-toggle]');
  await browser.go('/pt-BR/');
  assert.equal(await browser.evaluate(`document.querySelector('[data-showcase-toggle]').getAttribute('aria-expanded')`), 'true', 'Explicit expansion preference survives reload');
  await browser.click('[data-showcase-toggle]');
  await browser.click('.home-featured-card');
  await delay(100);
  assert(await browser.evaluate(`location.pathname.endsWith('/hsin')`), 'Featured characters open profiles');
  assert.equal(browser.errors.length, 0, 'No browser exceptions');
  console.log('Home verified in three languages at 320, 390, 768 and 1440px; role filters, profile links and saved preference pass.');
} finally {browser.close();}
