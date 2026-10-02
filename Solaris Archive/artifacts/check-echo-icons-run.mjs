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

  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/builder'});
  for(let i=0;i<30;i++){if(await evaluate('!!document.querySelector("[data-builder-open=echo]")'))break;await delay(300);}
  await click('[data-builder-open="echo"][data-slot="0"]');
  const assets=JSON.parse(await fs.readFile('artifacts/echo-assets.json','utf8'));
  const available=new Set(assets.map(a=>a.download_url));
  const options=await evaluate('Array.from(document.querySelectorAll("[data-builder-pick=echo]")).map(b=>({name:b.querySelector("strong").textContent,src:b.querySelector("img")?.src,alternate:b.querySelector("img")?.dataset.fallbackSrc}))');
  for(const option of options){assert(available.has(option.src),'Official asset: '+option.name);if(option.alternate)assert(available.has(option.alternate),'Alternate asset: '+option.name);}
  await evaluate('document.querySelectorAll("[data-builder-pick=echo] img").forEach(img=>img.loading="eager")');
  for(let i=0;i<40;i++){if(await evaluate('Array.from(document.querySelectorAll("[data-builder-pick=echo] img")).every(i=>i.complete)'))break;await delay(300);}
  assert(await evaluate('Array.from(document.querySelectorAll("[data-builder-pick=echo] img")).every(i=>i.naturalWidth>0&&!i.src.startsWith("data:"))'));
  for(const [query,slug] of [['Casuario Enano','dwarf-cassowary'],['Clang Bang','clang-bang']]){
    await evaluate('(()=>{const e=document.querySelector("[data-builder-search=echo]");e.value='+JSON.stringify(query)+';e.dispatchEvent(new Event("input",{bubbles:true}));})()');
    assert.equal(await evaluate('document.querySelector("[data-builder-pick=echo]").dataset.value'),slug);
    await fs.writeFile('artifacts/echo-'+slug+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await click('[data-builder-pick=echo]');
    assert(await evaluate('document.querySelector(".builder-echo-card img").src.includes('+JSON.stringify(slug==='clang-bang'?'ClangBang':'DwarfCassowary')+')'));
    await click('[data-builder-open="echo"][data-slot="0"]');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: '+options.length+' Echoes have matching loaded images; verified all primary and alternative URLs; both example searches and selections work.');
}finally{socket?.close();chrome.kill();}
