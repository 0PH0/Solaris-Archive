import {readFile,writeFile} from 'node:fs/promises';
const harness=await readFile('scripts/check-builder.mjs','utf8');
const setup=harness.slice(0,harness.indexOf("  await call('Page.navigate'"));
await writeFile('artifacts/check-gacha-items-run.mjs',setup+`
  await call('Network.enable');const media=[];
  socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Network.requestWillBeSent'&&m.params.request.url.includes('/media/convene/'))media.push(m.params.request.url)});
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/convocacoes'});
  for(let i=0;i<70;i++){if(await evaluate('document.querySelector("[data-gacha-pull]")?.disabled===false'))break;await delay(300);}
  assert.equal(media.length,0);
  await change('[data-gacha-field="pity5"]','79');await click('[data-gacha-pull="10"]');
  assert.equal(await evaluate('document.querySelector(".convene-play")'),null);
  for(let i=0;i<40;i++){if(await evaluate('document.querySelector("video.convene-video")?.currentTime>1'))break;await delay(200);}
  assert(await evaluate('document.querySelector("video.convene-video").videoWidth>0'));
  assert(media.every(url=>url.startsWith('http://localhost:4173/')));
  assert(await evaluate('document.querySelector(".gacha-results").hidden'));
  for(let i=0;i<75;i++){if(await evaluate('!document.querySelector(".convene-opening")'))break;await delay(200);}
  assert.equal(await evaluate('document.querySelectorAll(".gacha-result img").length'),10);
  await delay(1500);
  console.log('x10 images',await evaluate('Array.from(document.querySelectorAll(".gacha-result img")).map(i=>({name:i.alt,ok:i.complete&&i.naturalWidth>0,src:i.currentSrc}))'));
  assert(await evaluate('Array.from(document.querySelectorAll(".gacha-result img")).every(i=>i.complete&&i.naturalWidth>0)'));
  const draw=async sequence=>{
    await evaluate('window.originalRandom=Math.random;window.randomValues='+JSON.stringify(sequence)+';Math.random=()=>window.randomValues.shift()??.5');
    await click('[data-gacha-pull="1"]');await evaluate('Math.random=window.originalRandom');
    await click('.convene-skip');await delay(500);
  };
  await change('[data-gacha-field="pity4"]','0');await draw([.8,.2]);
  assert(await evaluate('document.querySelector(".gacha-result").classList.contains("rarity-3")'));
  await click('.gacha-result');await delay(800);
  assert(await evaluate('location.pathname.includes("/armas/") && Boolean(document.querySelector(".weapon-detail"))'));
  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/convocacoes'});await delay(1600);
  await draw([.02,0]);
  assert(await evaluate('document.querySelector(".gacha-result").classList.contains("rarity-4")'));
  assert(await evaluate('document.querySelector(".gacha-result").getAttribute("href").includes("/personagens/")'));
  await delay(800);
  assert(await evaluate('document.querySelector(".gacha-result img").naturalWidth>0'));
  await click('.gacha-result');await delay(600);
  assert(await evaluate('Boolean(document.querySelector(".detail-layout"))'));
  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/convocacoes'});await delay(1600);
  await click('[data-gacha-type="weapon"]');
  await change('[data-gacha-field="pity5"]','79');await draw([.8]);
  await delay(800);
  assert(await evaluate('document.querySelector(".gacha-result").classList.contains("rarity-5") && document.querySelector(".gacha-result img").naturalWidth>0'));
  assert(await evaluate('document.querySelector(".gacha-result").getAttribute("href").includes("/armas/")'));
  await draw([.02,.99]);await delay(800);
  assert(await evaluate('document.querySelector(".gacha-result").classList.contains("rarity-4") && document.querySelector(".gacha-result img").naturalWidth>0'));
  assert(await evaluate('JSON.parse(localStorage.getItem("solaris:gacha:v1")).weapon.history.every(r=>r.kind && r.slug)'));
  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/armas/ages-of-harvest'});
  for(let i=0;i<60;i++){if(await evaluate('Boolean(document.querySelector(".weapon-stats-scroll"))'))break;await delay(300);}
  assert(await evaluate('document.querySelector(".weapon-detail").textContent.includes("Divine Blessing")'));
  await call('Page.reload');await delay(1500);
  assert(await evaluate('Boolean(document.querySelector(".weapon-stats-scroll"))'));
  for(const width of [1440,390,320]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'No overflow at '+width);
    await fs.writeFile('artifacts/weapon-detail-'+width+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: automatic local video even with reduced motion, lazy media, natural completion, all x10 images, 3-star weapon and 4-star character links, Encore details, reload, responsive, no JS errors.');
}finally{socket?.close();chrome.kill();}
`);await import('./check-gacha-items-run.mjs');
