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

  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/'});
  for (let i=0;i<40;i++) {
    if(await evaluate('document.querySelectorAll(".convene-card").length >= 4')) break;
    await delay(500);
  }
  const payload = await (await fetch('http://localhost:4173/api/convenes',{cache:'no-store'})).json();
  const cards = await evaluate('Array.from(document.querySelectorAll(".convene-card")).map(card=>({title:card.querySelector("h3").textContent.trim(),src:card.querySelector("img").getAttribute("src")}))');
  assert.equal(payload.externalError,undefined);
  assert(cards.length >= payload.convenes.length);
  for (const banner of payload.convenes) {
    assert(cards.some(card=>card.title===banner.title && card.src===banner.imageUrl), 'API record and displayed image: '+banner.featuredName);
  }
  await evaluate('document.querySelector(".convene-card").scrollIntoView({block:"start"})');
  // Production keeps native lazy loading. This audit explicitly loads every
  // official banner, including cards below the fold, before checking sources.
  await evaluate('document.querySelectorAll(".convene-card img").forEach(img=>img.loading="eager")');
  for (let i=0;i<60;i++) {
    if(await evaluate('Array.from(document.querySelectorAll(".convene-card img")).every(img=>img.complete&&img.naturalWidth>0)')) break;
    await delay(250);
  }
  const loaded = await evaluate('Array.from(document.querySelectorAll(".convene-card img")).map(img=>({src:img.currentSrc,loaded:img.complete&&img.naturalWidth>0}))');
  assert(loaded.every(img=>img.loaded && !img.src.startsWith('data:')));
  await fs.writeFile('artifacts/convenes-browser.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  console.log(JSON.stringify(cards,null,2));
  assert.deepEqual(errors,[]);
  console.log('PASS: every displayed banner matches its API image; all official images load; no JavaScript errors.');
} finally { socket?.close(); chrome.kill(); }
