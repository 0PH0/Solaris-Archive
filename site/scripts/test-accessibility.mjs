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

  const keypress = async (key,code=key,vk=27) => {await call('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk});await call('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});};
  const ready = async () => {for(let i=0;i<60;i++){if(await evaluate('!!document.querySelector("[data-settings-open]")'))return;await delay(150);}throw Error('App did not render');};
  const go = async path => {await call('Page.navigate',{url:'http://localhost:4173'+path});await ready();await delay(250);};
  await go('/pt-BR/characters');
  assert(await evaluate('!document.querySelector("[data-accessibility-open]")'));
  await click('[data-settings-open]');
  assert(await evaluate('document.querySelectorAll(".settings-dialog").length===1'));
  assert(await evaluate('document.querySelectorAll("[data-access-option]").length===16'));
  await click('[data-access-profile=visual]');
  await click('[data-access-profile=hearing]');
  await click('[data-access-profile=navigation]');
  for(const name of ['zoom','imageContrast','colorLabels','simple','plain'])await click('[data-access-option='+name+']');
  assert(await evaluate('document.querySelectorAll("[data-access-profile][aria-pressed=true]").length===3'));
  for(const color of ['protanopia','deuteranopia','tritanopia']) {
    await change('[data-access-option=color]',color);
    assert.equal(await evaluate('document.documentElement.dataset.accessColor'),color);
  }
  for(const width of [1440,390,320]) {
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    await delay(100);
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Page overflow '+width+' '+await evaluate('document.documentElement.scrollWidth'));
    assert(await evaluate('document.querySelector(".settings-dialog").scrollWidth<=document.querySelector(".settings-dialog").clientWidth'),'Dialog overflow '+width);
    await fs.writeFile('artifacts/accessibility-v2-'+width+'.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await keypress('Tab','Tab',9);
  assert(await evaluate('!!document.activeElement.closest(".settings-dialog")'),'Tab stays inside settings');
  await keypress('Escape');
  assert(await evaluate('!document.querySelector(".settings-dialog")'));
  assert(await evaluate('document.activeElement.matches("[data-settings-open]")'));
  await click('[data-character-results] [data-fav]');
  assert(await evaluate('!document.querySelector("[data-access-notice]").hidden'));
  await click('[data-access-zoom]');
  assert(await evaluate('document.querySelector(".access-image-dialog").open'));
  await evaluate('document.querySelector(".access-image-dialog input").value="200";document.querySelector(".access-image-dialog input").dispatchEvent(new Event("input"))');
  assert.equal(await evaluate('document.querySelector(".access-image-viewport img").style.width'),'200%');
  await keypress('Escape');
  assert(await evaluate('document.activeElement.matches("[data-access-zoom]")'));
  await call('Page.reload');await ready();
  assert(await evaluate('document.documentElement.classList.contains("access-motion")&&document.documentElement.classList.contains("access-text")'));
  assert.equal(await evaluate('document.documentElement.dataset.accessColor'),'tritanopia');
  await click('[data-settings-open]');
  await click('[data-access-option=contrast]');
  assert.equal(await evaluate('document.querySelector("[data-access-profile=visual]").getAttribute("aria-pressed")'),'false');
  await click('[data-access-reset]');
  assert(await evaluate('!document.documentElement.className.includes("access-")'));
  await click('[data-access-profile=hearing]');await keypress('Escape');
  await go('/pt-BR/characters/jinhsi');
  assert(await evaluate('getComputedStyle(document.querySelector("[data-access-hint=transcript]")).display!=="none"'));
  await click('[data-video-id]');
  assert(await evaluate('document.querySelector("[data-video-frame]").src.includes("cc_load_policy=1")'));
  await click('[data-settings-open]');await click('[data-access-option=captions]');await keypress('Escape');
  await call('Page.reload');await ready();await click('[data-video-id]');
  assert(await evaluate('!document.querySelector("[data-video-frame]").src.includes("cc_load_policy")'));
  await go('/pt-BR/characters');
  await click('[data-menu-toggle]');await keypress('Escape');
  assert.equal(await evaluate('document.querySelector("[data-menu-toggle]").getAttribute("aria-expanded")'),'false');
  await click('[data-settings-open]');
  await evaluate('document.querySelector("[data-access-option=motion]").focus()');await keypress('Enter','Enter',13);
  assert(await evaluate('document.querySelector("[data-access-option=motion]").checked'));
  await click('[data-access-profile=visual]');
  await click('[data-access-option=zoom]');await keypress('Escape');
  const routes=await evaluate('Array.from(document.querySelectorAll(".desktop-nav a")).map(a=>a.getAttribute("href"))');
  for(const route of routes) {
    await go(route);
    assert(await evaluate('!!document.querySelector("main h1")'),'Route rendered: '+route);
    assert(await evaluate('document.documentElement.classList.contains("access-text")'),'Preference retained: '+route);
    if(!await evaluate('document.documentElement.scrollWidth<=innerWidth'))console.log(await evaluate('Array.from(document.querySelectorAll("main *")).filter(e=>e.getBoundingClientRect().right>innerWidth).slice(0,20).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,40),right:e.getBoundingClientRect().right}))'));
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Route overflow: '+route+' '+await evaluate('document.documentElement.scrollWidth'));
    if(await evaluate('!!document.querySelector("[data-builder-open=character]")')) {
      await click('[data-builder-open=character]');await delay(100);
      assert(await evaluate('!!document.querySelector("[data-builder-dialog] [data-access-zoom]")'));
      await click('[data-builder-dialog] [data-access-zoom]');
      assert(await evaluate('!!document.querySelector(".access-image-dialog[open]")'));
      await keypress('Escape');await delay(100);
      if(!await evaluate('!!document.activeElement.closest("[data-builder-dialog]")'))console.log(await evaluate('({active:document.activeElement.outerHTML.slice(0,300),dialogs:[...document.querySelectorAll("dialog")].map(e=>({cls:e.className,open:e.open})),zooms:document.querySelectorAll("[data-builder-dialog] [data-access-zoom]").length})'));
      assert(await evaluate('!!document.activeElement.closest("[data-builder-dialog]")'));
      await click('[data-builder-pick=character]');
      assert(await evaluate('!document.querySelector("[data-builder-dialog]")'));
    }
  }
  await go('/pt-BR/characters');await click('[data-settings-open]');
  await evaluate('Storage.prototype.setItem=function(){throw new Error("Storage blocked")};');
  await click('[data-access-option=zoom]');
  assert(await evaluate('document.querySelector("[data-access-saved]").textContent.includes("Não foi possível salvar")'));
  await keypress('Escape');
  await go('/en/characters');await click('[data-settings-open]');
  assert.equal(await evaluate('document.querySelector("#access-title").textContent'),'Accessibility');await keypress('Escape');
  await go('/es/characters');await click('[data-settings-open]');
  assert.equal(await evaluate('document.querySelector("#access-title").textContent'),'Accesibilidad');await keypress('Escape');
  await evaluate('localStorage.removeItem("solaris:accessibility:v2");localStorage.setItem("solaris:accessibility:v1",JSON.stringify({enabled:true,captions:true,visual:true,descriptions:true,motion:true}))');
  await call('Page.reload');await ready();
  assert(await evaluate('localStorage.getItem("solaris:accessibility:v1")===null&&JSON.parse(localStorage.getItem("solaris:accessibility:v2")).motion===true'));
  await evaluate('localStorage.setItem("solaris:accessibility:v2",JSON.stringify({color:"invalid",text:"yes"}))');
  await call('Page.reload');await ready();
  assert(await evaluate('document.documentElement.dataset.accessColor==="none"&&!document.documentElement.classList.contains("access-text")'));
  assert.deepEqual(errors,[]);
  console.log('PASS: profiles, independent controls, palettes, responsive 1440/390/320, Tab/Enter/Escape, focus, favorites, zoom, persistence, reset, captions, transcript availability, storage failure, translations, Wiki routes, Builder, migration and invalid preferences.');
}finally{socket?.close();chrome.kill();}
