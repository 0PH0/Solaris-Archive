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
  await call('Page.navigate',{url:'https://wuwa.build/edit'}); await delay(3500);
  await fs.mkdir('artifacts',{recursive:true});
  await fs.writeFile('artifacts/builder-reference.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  console.log('Reference:',(await evaluate('document.body.innerText')).slice(0,900));
  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/builder'});
  await delay(2500);
  assert.equal(await evaluate('document.querySelectorAll("[data-echo-card]").length'),5);
  assert.equal(await evaluate('document.querySelector(".builder-heading h1").textContent'),'Monte sua próxima build.');
  await click('[data-builder-open="character"]');
  await change('[data-builder-filter="character"]','Fusion');
  assert(await evaluate('document.querySelectorAll("[data-builder-pick]").length>0'));
  await click('[data-builder-pick="character"]');
  await click('[data-builder-open="weapon"]');
  await click('[data-builder-pick="weapon"]');
  for (const [index,cost] of [4,3,3,1,1].entries()) {
    await click(`[data-builder-open="echo"][data-slot="${index}"]`);
    await change('[data-builder-filter="echo"]',String(cost));
    await click('[data-builder-pick="echo"]:not(:disabled)');
  }
  assert.equal(await evaluate('document.querySelector(".builder-cost-number strong").textContent'),'12');
  await click('[data-builder-open="echo"][data-slot="4"]');
  await change('[data-builder-filter="echo"]','4');
  assert.equal(await evaluate('document.querySelectorAll("[data-builder-pick]:not(:disabled)").length'),0);
  await change('[data-builder-filter="echo"]','all');
  await change('[data-builder-set-filter]','molten-rift');
  assert(await evaluate('document.querySelectorAll("[data-builder-pick]").length>0'));
  await click('[data-builder-close]');
  await change('[data-echo-index="0"][data-echo-field="level"]','25');
  await change('[data-echo-index="0"][data-echo-field="mainStat"]','critRate');
  await change('[data-echo-index="0"][data-echo-field="mainValue"]','22');
  assert(await evaluate('document.querySelector("[data-builder-bonuses]").textContent.includes("+22%")'));
  await click('[data-builder-main="1"]');
  assert.equal(await evaluate(`document.querySelector('[data-echo-index="1"][data-echo-field="mainValue"]').value`),'22');
  await change('[data-builder-field="name"]','Teste completo');
  await click('[data-builder-save]');
  await call('Page.reload'); await delay(1000);
  assert.equal(await evaluate('document.querySelector("[data-builder-field=name]").value'),'Teste completo');
  assert.equal(await evaluate('document.querySelector("[data-builder-message]").textContent'),'Build salva recuperada');
  assert.equal(await evaluate('document.querySelector(".builder-cost-number strong").textContent'),'12');
  for(const width of [1440,768,390,320]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:false});
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),`No horizontal overflow at ${width}`);
    await fs.writeFile(`artifacts/builder-${width}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
  }
  console.log('Images:',await evaluate('Array.from(document.querySelectorAll(".builder-workspace img")).map(i=>({src:i.currentSrc,ok:i.complete&&i.naturalWidth>0,fallback:i.currentSrc.startsWith("data:")}))'));
  assert.deepEqual(errors,[]);
  console.log('PASS: five slots, pickers, cost limit, Sonata filter, attributes, main Echo swap, persistence, four responsive widths, no JS exceptions.');
} finally { socket?.close(); chrome.kill(); }
