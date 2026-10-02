import {readFile,writeFile} from 'node:fs/promises';
const harness=await readFile('scripts/check-builder.mjs','utf8');
const setup=harness.slice(0,harness.indexOf("  await call('Page.navigate'")).replace('errors.push(m.params.exceptionDetails.text)', 'errors.push(m.params.exceptionDetails)');
const checks=`
  await call('Page.navigate',{url:'https://wuwa.aza.gg/gacha?l=en'});await delay(4000);
  await fs.writeFile('artifacts/gacha-reference.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  errors.length=0;
  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/convocacoes'});
  for(let i=0;i<40;i++){if(await evaluate('Boolean(document.querySelector("[data-gacha-banner]"))'))break;await delay(500);}
  assert(await evaluate('document.querySelectorAll("[data-gacha-banner]").length>0'));
  await click('[data-gacha-pull="10"]');
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result").length'),10);
  assert.equal(await evaluate('document.querySelectorAll(".gacha-history tbody tr").length'),10);
  await change('[data-gacha-field="pity5"]','79');
  await evaluate('(()=>{const e=document.querySelector("[data-gacha-field=guaranteed]");e.checked=true;e.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await click('[data-gacha-pull="1"]');
  assert(await evaluate('document.querySelector(".gacha-result").classList.contains("rarity-5")'));
  assert.equal(await evaluate('document.querySelector("[data-gacha-field=pity5]").value'),'0');
  assert.equal(await evaluate('document.querySelector(".gacha-result strong").textContent'),await evaluate('document.querySelector(".gacha-featured h2").textContent'));
  await change('[data-gacha-field="pity5"]','25');
  await click('[data-gacha-type="weapon"]');
  assert.equal(await evaluate('document.querySelector("[data-gacha-field=pity5]").value'),'0');
  await change('[data-gacha-field="pity5"]','79');await click('[data-gacha-pull="1"]');
  assert(await evaluate('document.querySelector(".gacha-result").classList.contains("rarity-5")'));
  await change('[data-gacha-field="calcPulls"]','80');
  assert.equal(await evaluate('document.querySelectorAll(".gacha-odds strong")[1].textContent'),'100%');
  await change('[data-gacha-field="calcPulls"]','0');
  assert.equal(await evaluate('document.querySelectorAll(".gacha-odds strong")[1].textContent'),'0%');
  await click('[data-gacha-type="resonator"]');
  assert.equal(await evaluate('document.querySelector("[data-gacha-field=pity5]").value'),'25');
  await evaluate('document.querySelectorAll("[data-gacha-banner]")[1]?.click()');
  assert.equal(await evaluate('document.querySelector("[data-gacha-field=pity5]").value'),'25');
  await call('Page.reload');await delay(1800);
  assert.equal(await evaluate('document.querySelector("[data-gacha-field=pity5]").value'),'25');
  assert.equal(await evaluate('document.querySelectorAll(".gacha-history tbody tr").length'),11);
  await click('[data-gacha-pull="10"]');await delay(1000);
  for(const width of [1440,768,390,320]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:false});
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'No overflow at '+width);
    await fs.writeFile('artifacts/gacha-'+width+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  }
  console.log('Banner images:',await evaluate('Array.from(document.querySelectorAll(".gacha-banner-art,.gacha-banner-list img")).map(i=>({src:i.currentSrc,loaded:i.complete&&i.naturalWidth>0}))'));
  assert.deepEqual(errors,[]);
  console.log('PASS: x10/x1, guarantees, separate/shared pity, calculator, persistence, responsive 1440/768/390/320, no JavaScript exceptions.');
}finally{socket?.close();chrome.kill();}
`;
await writeFile('artifacts/check-gacha-run.mjs',setup+checks);
await import('./check-gacha-run.mjs');
