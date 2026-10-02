import { readFile, writeFile } from 'node:fs/promises';

// Reuse the existing local Chrome test connection, without running Builder tests.
const harness = await readFile(new URL('./check-builder.mjs', import.meta.url), 'utf8');
const setup = harness.slice(0, harness.indexOf("  await call('Page.navigate'"));
const checks = `
  await call('Page.navigate',{url:'http://localhost:4173/pt-BR/'});
  for (let i=0;i<40;i++) {
    if(await evaluate('document.querySelectorAll(".convene-card").length >= 4')) break;
    await delay(500);
  }
  const payload = await (await fetch('http://localhost:4173/api/convenes',{cache:'no-store'})).json();
  const cards = await evaluate('Array.from(document.querySelectorAll(".convene-card")).map(card=>({title:card.querySelector("h3").textContent.trim(),src:card.querySelector("img").getAttribute("src")}))');
  assert.equal(payload.externalError,undefined);
  assert(cards.length >= payload.convenes.length);
  for (const banner of payload.convenes) {
    assert(cards.some(card=>card.title===banner.title && card.src===banner.imageUrl), 'API record and displayed image: '+banner.featuredName);
  }
  await evaluate('document.querySelector(".convene-card").scrollIntoView({block:"start"})');
  // Production keeps native lazy loading. This audit explicitly loads every
  // official banner, including cards below the fold, before checking sources.
  await evaluate('document.querySelectorAll(".convene-card img").forEach(img=>img.loading="eager")');
  for (let i=0;i<60;i++) {
    if(await evaluate('Array.from(document.querySelectorAll(".convene-card img")).every(img=>img.complete&&img.naturalWidth>0)')) break;
    await delay(250);
  }
  const loaded = await evaluate('Array.from(document.querySelectorAll(".convene-card img")).map(img=>({src:img.currentSrc,loaded:img.complete&&img.naturalWidth>0}))');
  assert(loaded.every(img=>img.loaded && !img.src.startsWith('data:')));
  await fs.writeFile('artifacts/convenes-browser.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'));
  console.log(JSON.stringify(cards,null,2));
  assert.deepEqual(errors,[]);
  console.log('PASS: every displayed banner matches its API image; all official images load; no JavaScript errors.');
} finally { socket?.close(); chrome.kill(); }
`;
const target = new URL('../artifacts/check-convenes-browser.mjs', import.meta.url);
await writeFile(target, setup + checks);
await import(target.href + '?run=' + Date.now());
