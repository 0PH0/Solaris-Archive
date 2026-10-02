import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function openBrowser(port = 9300 + Math.floor(Math.random() * 500)) {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'solaris-responsive-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let tabs;
  for (let i = 0; i < 40; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; }
    catch { await delay(200); }
  }
  if (!tabs) { chrome.kill(); throw Error('Chrome did not start'); }
  const socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  const keepAlive = setInterval(() => {}, 1000);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map(), errors = [], requests = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const task = pending.get(message.id);
      pending.delete(message.id);
      if (task) message.error ? task.reject(message.error) : task.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    const timer = setTimeout(() => { pending.delete(next); reject(Error('Timeout: ' + method)); }, 30000);
    pending.set(next, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id: next, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  return { call, evaluate, errors, requests,
    viewport: (width, height = 900) => call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 }),
    click: selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`),
    async go(route) {
      const marker = Math.random().toString(36);
      const script = await call('Page.addScriptToEvaluateOnNewDocument', { source: `window.__navigationMarker=${JSON.stringify(marker)}` });
      await call('Page.navigate', { url: 'http://localhost:4173' + route });
      await delay(100);
      for (let i = 0; i < 100; i++) {
        if (await evaluate(`window.__navigationMarker === ${JSON.stringify(marker)} && location.pathname === ${JSON.stringify(route)} && !!document.querySelector(".route-panel:not([hidden]) h1")`)) {
          await call('Page.removeScriptToEvaluateOnNewDocument', { identifier: script.identifier });
          return;
        }
        await delay(100);
      }
      throw Error('Route did not render: ' + route);
    },
    async screenshot(filename) { await fs.writeFile(filename, Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64')); },
    close() { clearInterval(keepAlive); socket.close(); chrome.kill(); }
  };
}
