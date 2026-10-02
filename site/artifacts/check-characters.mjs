import {readFile,writeFile} from 'node:fs/promises';
const harness=await readFile('scripts/check-builder.mjs','utf8');
const setup=harness.slice(0,harness.indexOf("  await call('Page.navigate'"));
const checks=`
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
`;
await writeFile('artifacts/check-characters-run.mjs',setup+checks);
await import('./check-characters-run.mjs');
