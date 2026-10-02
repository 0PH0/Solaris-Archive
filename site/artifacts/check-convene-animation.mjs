import {readFile,writeFile} from 'node:fs/promises';
const harness=await readFile('scripts/check-builder.mjs','utf8');
const setup=harness.slice(0,harness.indexOf("  await call('Page.navigate'"));
await writeFile('artifacts/check-convene-animation-run.mjs',setup+`
  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/convocacoes'});
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  for(let i=0;i<45;i++){if(await evaluate('Boolean(document.querySelector("[data-gacha-banner]"))'))break;await delay(500);}
  await click('[data-gacha-pull="10"]');
  assert(await evaluate('document.querySelector(".convene-opening").open'));
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result").length'),0);
  await click('[data-gacha-pull="10"]');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("solaris:gacha:v1")).resonator.total'),10);
  await delay(1400);
  await fs.writeFile('artifacts/convene-opening-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await delay(1600);
  assert.equal(await evaluate('document.querySelector(".convene-opening")'),null);
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result").length'),10);
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await click('[data-gacha-pull="1"]');await delay(1400);
  await fs.writeFile('artifacts/convene-opening-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await click('.convene-skip');
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result").length'),1);
  await delay(1600);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("solaris:gacha:v1")).resonator.total'),11);
  await click('[data-gacha-pull="1"]');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate('document.querySelector(".convene-opening")'),null);
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await click('[data-gacha-pull="10"]');
  assert.equal(await evaluate('document.querySelector(".convene-opening")'),null);
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result").length'),10);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("solaris:gacha:v1")).resonator.total'),22);
  assert.deepEqual(errors,[]);
  console.log('PASS: delayed x10 reveal, duplicate clicks blocked, auto completion, mobile skip, no duplicate commits, Escape, reduced motion, no JS errors.');
}finally{socket?.close();chrome.kill();}
`);
await import('./check-convene-animation-run.mjs');
