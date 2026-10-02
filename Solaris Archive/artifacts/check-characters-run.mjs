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

  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/characters'});
  for(let i=0;i<40;i++){if(await evaluate('document.querySelectorAll("[data-character-results] [data-fav]").length>10 && !document.body.innerText.includes("Sincronizando personagens")'))break;await delay(500);}
  await delay(1000);
  const original=await evaluate('Array.from(document.querySelectorAll("[data-character-results] [data-fav]"),b=>b.dataset.fav)');
  assert(original.length>10);
  const favorite=original.at(-1);
  await click('[data-character-results] [data-fav="'+favorite+'"]');
  await change('[data-character-sort]','favorites');
  assert.equal(await evaluate('document.querySelector("[data-character-results] [data-fav]").dataset.fav'),favorite);
  const card=await evaluate('(()=>{const c=document.querySelector("[data-character-results] .character-card");return {name:c.querySelector("h3").textContent,element:c.querySelector(".pill").textContent};})()');
  await evaluate('(()=>{const q=document.querySelector("[data-character-search]");q.value='+JSON.stringify(card.name)+';q.dispatchEvent(new Event("input",{bubbles:true}));})()');
  await change('[data-character-element-filter]',card.element);
  assert.equal(await evaluate('document.querySelector("[data-character-results] [data-fav]").dataset.fav'),favorite);
  assert(await evaluate('Array.from(document.querySelectorAll("[data-character-results] h3")).every(n=>n.textContent.includes('+JSON.stringify(card.name)+'))'));
  await evaluate('(()=>{const q=document.querySelector("[data-character-search]");q.value="";q.dispatchEvent(new Event("input",{bubbles:true}));})()');
  await change('[data-character-element-filter]','all');
  await change('[data-character-sort]','default');
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("[data-character-results] [data-fav]"),b=>b.dataset.fav)'),original);
  await change('[data-character-sort]','favorites');
  for(const width of [1440,900,390]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:1050,deviceScaleFactor:1,mobile:false});
    await evaluate('document.querySelector(".wiki-filters--characters").scrollIntoView({block:"start"})');
    await fs.writeFile('artifacts/characters-'+width+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
    if(width===390)console.log(await evaluate('Array.from(document.querySelectorAll("body *")).filter(e=>{const r=e.getBoundingClientRect();return r.width && r.right>innerWidth}).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width})).slice(0,20)'));
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'No overflow '+width);
  }
  await click('[data-character-results] [data-fav="'+favorite+'"]');
  assert.equal(await evaluate('document.querySelector("[data-character-results] [data-fav]").dataset.fav'),original[0]);
  assert.deepEqual(errors,[]);
  console.log('PASS: favorites first, search and element filter together, default order restored, unfavorite reorders, no overflow at 1440/900/390px, no JS errors.');
}finally{socket?.close();chrome.kill();}
