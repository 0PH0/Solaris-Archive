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

  let catalogRequests=0;
  socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.method==='Network.requestWillBeSent'&&m.params.request.url.includes('api-v2.encore.moe/api/en/echo'))catalogRequests++;});
  await call('Network.enable');
  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/builder'});
  for(let i=0;i<80;i++){if(await evaluate('!!document.querySelector("[data-builder-open=echo]")'))break;await delay(300);}
  await click('[data-builder-open="echo"][data-slot="0"]');
  const count=await evaluate('document.querySelectorAll("[data-builder-pick=echo]").length');
  assert(count>=233,'Full catalog: '+count);
  assert.equal(await evaluate('new Set(Array.from(document.querySelectorAll("[data-builder-pick=echo]"),b=>b.dataset.value)).size'),count);
  const search=async value=>evaluate('(()=>{const e=document.querySelector("[data-builder-search=echo]");e.value='+JSON.stringify(value)+';e.dispatchEvent(new Event("input",{bubbles:true}));})()');
  await search('Casuario Enano');
  assert.equal(await evaluate('document.querySelector("[data-builder-pick=echo]").dataset.value'),'dwarf-cassowary');
  await click('[data-builder-pick=echo]');
  await click('[data-builder-open="echo"][data-slot="1"]');
  await search('');await change('[data-builder-filter=echo]','1');
  await change('[data-builder-set-filter]','celestial-light');
  assert(await evaluate('document.querySelectorAll("[data-builder-pick=echo]").length>0'));
  await search('Clang Bang');await click('[data-builder-pick=echo]');
  await click('[data-builder-open="echo"][data-slot="2"]');
  await change('[data-builder-filter=echo]','all');await change('[data-builder-set-filter]','');
  await search('Calamity Effigy');await click('[data-builder-pick=echo]');
  await click('[data-builder-save]');
  await call('Page.reload');await delay(1200);
  assert.equal(await evaluate('document.querySelector(".builder-cost-number strong").textContent'),'6');
  assert(await evaluate('document.querySelectorAll(".builder-echo-card.is-equipped").length===3'));
  await click('[data-builder-open="echo"][data-slot="2"]');
  assert.equal(await evaluate('document.querySelectorAll("[data-builder-pick=echo]").length'),count);
  assert.equal(catalogRequests,1,'Reload uses cache');
  // Audit every icon once; normal browsing keeps lazy loading enabled.
  await evaluate('document.querySelectorAll("[data-builder-pick=echo] img").forEach(i=>i.loading="eager")');
  for(let i=0;i<80;i++){if(await evaluate('Array.from(document.querySelectorAll("[data-builder-pick=echo] img")).every(i=>i.complete)'))break;await delay(300);}
  console.log('Image failures:',await evaluate('Array.from(document.querySelectorAll("[data-builder-pick=echo]")).filter(b=>{const i=b.querySelector("img");return !i.naturalWidth||i.src.startsWith("data:")}).map(b=>b.dataset.value)'));
  assert(await evaluate('Array.from(document.querySelectorAll("[data-builder-pick=echo] img")).every(i=>i.naturalWidth>0&&!i.src.startsWith("data:"))'));
  await fs.writeFile('artifacts/builder-full-echoes.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await evaluate('localStorage.removeItem("solaris:echo-catalog:v1")');
  await call('Page.reload');
  for(let i=0;i<80;i++){if(await evaluate('!!document.querySelector("[data-builder-open=echo]")'))break;await delay(300);}
  assert(await evaluate('document.querySelectorAll(".builder-echo-card.is-equipped").length===3'),'Saved new Echo survives a cold catalog load');
  assert.equal(catalogRequests,2);
  assert.deepEqual(errors,[]);
  console.log('PASS: '+count+' unique Echoes, filters, search, selection, saved build reload, one catalog request.');
}finally{socket?.close();chrome.kill();}
