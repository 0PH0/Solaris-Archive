import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'solaris-builder-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9227', `--user-data-dir=${profile}`, 'about:blank'], {windowsHide:true, stdio:'ignore'});
const delay = ms => new Promise(r => setTimeout(r, ms));
let socket;
try {
  let tabs;
  for (let i=0; i<30; i++) { try { tabs = await (await fetch('http://127.0.0.1:9227/json')).json(); break; } catch { await delay(300); } }
  assert(tabs, 'Chrome started');
  socket = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  socket.addEventListener('error', e=>console.error('Browser socket error:', e.message));
  socket.addEventListener('close', e=>console.log('Browser socket closed:',e.code,e.reason));
  await new Promise(r=>socket.addEventListener('open',r,{once:true}));
  let id=0; const pending=new Map(); const errors=[];
  socket.addEventListener('message', ({data}) => {const m=JSON.parse(data); if(m.id) {const p=pending.get(m.id); pending.delete(m.id); m.error?p.reject(m.error):p.resolve(m.result);} if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text); });
  const call = (method,params={})=>new Promise((resolve,reject)=>{const next=++id;const timer=setTimeout(()=>reject(Error('Browser timeout: '+method)),15000);pending.set(next,{resolve:r=>{clearTimeout(timer);resolve(r);},reject});socket.send(JSON.stringify({id:next,method,params}));});
  const evaluate = async expression => {const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value;};
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const change = (selector,value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await call('Runtime.enable'); await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});

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
