import fs from 'node:fs/promises';
import { openBrowser, delay } from './browser-harness.mjs';
const browser = await openBrowser();
const phase = process.argv.includes('--after') ? 'after' : 'before';
const report = [];
try {
  for (const route of ['','introducao','characters','characters/jinhsi','tier-list','ecos','armas','itens','guia','codigos','builder','gacha','eventos','noticias']) {
    await browser.go('/pt-BR/' + route);
    await delay(350);
    for (const width of [320,390,768,1024,1440]) {
      await browser.viewport(width);
      const layout = await browser.evaluate(`(()=>{const w=innerWidth;return {title:document.querySelector('.route-panel:not([hidden]) h1')?.textContent,width:w,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>w+1&&getComputedStyle(e).position!=='absolute'&&!e.closest('.table-wrap,.ticker-track,.desktop-nav')}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:Math.round(e.getBoundingClientRect().right)}))}})()`);
      report.push({ route, ...layout });
    }
  }
  await fs.writeFile(`artifacts/responsive-${phase}.json`, JSON.stringify({ report, errors: browser.errors }, null, 2));
  await browser.go('/pt-BR/builder'); await browser.viewport(320,568);
  await browser.click('[data-builder-open="echo"]');
  report.push({modal:await browser.evaluate(`(()=>{const d=document.querySelector('dialog');const r=d.getBoundingClientRect();return {width:innerWidth,height:innerHeight,rect:{x:r.x,y:r.y,width:r.width,height:r.height},scrollWidth:d.scrollWidth,clientWidth:d.clientWidth}})()`)});
  await browser.screenshot(`artifacts/responsive-${phase}-modal.png`);
  await fs.writeFile(`artifacts/responsive-${phase}.json`, JSON.stringify({ report, errors: browser.errors }, null, 2));
  console.log(JSON.stringify(report.filter(r=>r.scrollWidth>r.width || r.modal),null,2));
} finally { browser.close(); }
