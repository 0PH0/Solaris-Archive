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
