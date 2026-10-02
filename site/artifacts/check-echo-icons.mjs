import {readFile,writeFile} from 'node:fs/promises';
const harness=await readFile('scripts/check-builder.mjs','utf8');
const setup=harness.slice(0,harness.indexOf("  await call('Page.navigate'"));
const checks=`
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
`;
await writeFile('artifacts/check-echo-icons-run.mjs',setup+checks);
await import('./check-echo-icons-run.mjs');
