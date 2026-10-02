import {readFile,writeFile} from 'node:fs/promises';
const harness=await readFile('scripts/check-builder.mjs','utf8');
const setup=harness.slice(0,harness.indexOf("  await call('Page.navigate'"));
await writeFile('artifacts/check-convene-video-run.mjs',setup+`
  await call('Network.enable');
  const media=[];
  socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Network.requestWillBeSent' && m.params.request.url.includes('/static/gacha/'))media.push(m.params.request.url);});
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/convocacoes'});
  for(let i=0;i<45;i++){if(await evaluate('Boolean(document.querySelector("[data-gacha-banner]"))'))break;await delay(500);}
  assert.equal(media.length,0,'No media requested before a draw');
  await change('[data-gacha-field="pity5"]','79');
  await click('[data-gacha-pull="10"]');
  assert(await evaluate('Boolean(document.querySelector(".gacha-banner > .convene-opening"))'));
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result").length'),0);
  await click('[data-gacha-pull="10"]');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("solaris:gacha:v1")).resonator.total'),10);
  for(let i=0;i<40;i++){if(await evaluate('document.querySelector(".convene-video")?.currentTime>1'))break;await delay(250);}
  console.log('5-star clip:',await evaluate('(()=>{const v=document.querySelector(".convene-video");return {src:v.currentSrc,duration:v.duration,time:v.currentTime,width:v.videoWidth}})()'));
  assert(await evaluate('document.querySelector(".convene-video").currentTime>0'));
  assert(await evaluate('document.querySelector(".convene-video").videoWidth>0'));
  assert(await evaluate('(()=>{const p=document.querySelector(".convene-opening").getBoundingClientRect(),b=document.querySelector(".gacha-banner").getBoundingClientRect();return p.width>200&&p.height>200&&p.left>=b.left&&p.right<=b.right&&p.top>=b.top})()'));
  await click('[data-gacha-refresh]');
  assert(await evaluate('document.querySelector(".convene-video").currentTime>0'));
  assert(media.every(u=>u.endsWith('gacha_ing_rarity_5.webm')));
  await fs.writeFile('artifacts/convene-real-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  for(let i=0;i<120;i++){if(await evaluate('!document.querySelector(".convene-opening")'))break;await delay(250);}
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result").length'),10);
  assert.equal(await evaluate('document.querySelector(".convene-opening")'),null);
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  // Deterministically exercise the non-5-star path, independent of random luck.
  await evaluate('window.originalRandom=Math.random;Math.random=()=>.9');
  await click('[data-gacha-pull="1"]');
  await evaluate('Math.random=window.originalRandom');
  for(let i=0;i<40;i++){if(await evaluate('document.querySelector(".convene-video")?.currentTime>1'))break;await delay(250);}
  assert(await evaluate('document.querySelector(".convene-video").currentTime>0'));
  assert(media.some(u=>u.endsWith('gacha_ing_rarity_4.webm')));
  console.log('Normal clip:',await evaluate('(()=>{const v=document.querySelector(".convene-video");return {duration:v.duration,time:v.currentTime,width:v.videoWidth}})()'));
  await fs.writeFile('artifacts/convene-real-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await click('.convene-audio');
  assert.equal(await evaluate('document.querySelector(".convene-video").muted'),false);
  await click('.convene-skip');
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result").length'),1);
  assert.equal(await evaluate('JSON.parse(localStorage.getItem("solaris:gacha:v1")).resonator.total'),11);
  await call('Network.setBlockedURLs',{urls:['*wuwa.aza.gg/static/gacha/*']});
  await call('Network.setCacheDisabled',{cacheDisabled:true});
  await click('[data-gacha-pull="1"]');
  await delay(1800);
  assert.equal(await evaluate('document.querySelector(".convene-opening")'),null,'Failure reveals results');
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const before=media.length;
  await click('[data-gacha-pull="10"]');
  assert(await evaluate('Boolean(document.querySelector(".gacha-banner > .convene-opening"))'));
  assert.equal(await evaluate('document.querySelector(".convene-play").hidden'),false);
  assert.equal(media.length,before);
  await call('Network.setBlockedURLs',{urls:[]});
  await click('.convene-play');
  for(let i=0;i<40;i++){if(await evaluate('document.querySelector(".convene-video")?.currentTime>0'))break;await delay(250);}
  assert(await evaluate('document.querySelector(".convene-video").videoWidth>0'));
  await click('.convene-skip');
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result").length'),10);
  assert.deepEqual(errors,[]);
  console.log('PASS: lazy media, both WebM clips visibly decoded, natural completion, mobile, sound, skip, duplicate protection, network failure, reduced motion, no JS errors.');
}finally{socket?.close();chrome.kill();}
`);
await import('./check-convene-video-run.mjs');
