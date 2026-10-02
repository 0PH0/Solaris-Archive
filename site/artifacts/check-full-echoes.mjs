import {readFile,writeFile} from 'node:fs/promises';
const harness=await readFile('scripts/check-builder.mjs','utf8');
const setup=harness.slice(0,harness.indexOf("  await call('Page.navigate'"));
const checks=`
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
`;
await writeFile('artifacts/check-full-echoes-run.mjs',setup+checks);
await import('./check-full-echoes-run.mjs');
