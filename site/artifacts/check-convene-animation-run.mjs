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
