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
  socket.addEventListener('message', ({data}) => {const m=JSON.parse(data); if(m.id) {const p=pending.get(m.id); pending.delete(m.id); m.error?p.reject(m.error):p.resolve(m.result);} if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails); });
  const call = (method,params={})=>new Promise((resolve,reject)=>{const next=++id;const timer=setTimeout(()=>reject(Error('Browser timeout: '+method)),15000);pending.set(next,{resolve:r=>{clearTimeout(timer);resolve(r);},reject});socket.send(JSON.stringify({id:next,method,params}));});
  const evaluate = async expression => {const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value;};
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const change = (selector,value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await call('Runtime.enable'); await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});

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
