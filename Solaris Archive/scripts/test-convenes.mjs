import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const source = readFileSync(new URL('../server.js', import.meta.url), 'utf8');
const backend = source.slice(source.indexOf('const characterSourceUrl'), source.indexOf('async function serveFile'));
const image = name => `https://hw-media-cdn-mingchao.kurogame.com/${name}.jpg`;
const section = (name, start, end, art = name) => `<p><strong>[${name}] Featured Resonator Convene</strong></p><p>During the event, 5-Star Resonator: ${name}, 4-Star Resonators: Test receive boosted drop rates!</p><p>${start} - ${end} (server time)</p>${art ? `<img src="${image(art)}" />` : ''}`;
const feed = (...sections) => `<feed><entry><id>urn:article:phase</id><title>Featured Convene Phase</title><published>2026-09-01T00:00:00Z</published><content><![CDATA[${sections.join('')}]]></content></entry></feed>`;
const current = art => feed(section('Current', '2026-09-10 10:00', '2026-09-29 11:59', art));
function setup() {
  let now = Date.parse('2026-09-15T12:00:00Z');
  let body = current('current');
  let failure = false;
  const calls = [];
  const context = vm.createContext({ URL, AbortSignal, Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }, fetch: async (url, options) => {
    calls.push({url, options});
    if (failure) throw Error('Source unavailable');
    return {ok:true, text:async()=>body};
  }});
  vm.runInContext(backend, context);
  return {run:code=>vm.runInContext(code,context), calls, body:value=>{body=value;}, fail:()=>{failure=true;}, advance:ms=>{now+=ms;}};
}

test('each section keeps its own image; an imageless section cannot borrow the next image', () => {
  const app = setup();
  const xml = feed(section('First','2026-09-10 10:00','2026-09-29 11:59'), section('Missing','2026-09-10 10:00','2026-09-29 11:59',''), section('Next','2026-09-10 10:00','2026-09-29 11:59'));
  const records = app.run(`parseOfficialConveneFeed(${JSON.stringify(xml)})`);
  assert.deepEqual(Array.from(records, r=>[r.featuredName,r.imageUrl]), [['First',image('First')],['Next',image('Next')]]);
});

test('convenes bypass the events text cache without changing events', async () => {
  const app = setup();
  await app.run('fetchText(eventFeedUrl)');
  app.body(current('updated'));
  const payload = await app.run('createConvenesPayload()');
  assert.equal(payload.convenes[0].imageUrl,image('updated'));
  assert.equal(app.calls[1].options.cache,'no-store');
  assert.equal(app.run('textCache.get(eventFeedUrl).text').includes('/current.jpg'),true);
});

test('updated image replaces the same record after five minutes', async () => {
  const app = setup();
  const first = await app.run('createConvenesPayload()');
  app.body(current('corrected'));
  assert.equal((await app.run('createConvenesPayload()')).cached,true);
  app.advance(5*60000);
  const next = await app.run('createConvenesPayload()');
  assert.equal(next.convenes[0].id,first.convenes[0].id);
  assert.equal(next.convenes[0].imageUrl,image('corrected'));
});

test('phase transition invalidates the cache before its TTL', async () => {
  const app = setup();
  app.body(feed(section('Previous','2026-09-10 10:00','2026-09-15 20:01'),section('New','2026-09-15 20:01','2026-09-29 11:59')));
  assert.equal((await app.run('createConvenesPayload()')).convenes[0].featuredName,'Previous');
  app.advance(60000);
  const next = await app.run('createConvenesPayload()');
  assert.equal(next.convenes.length,1);
  assert.equal(next.convenes[0].featuredName,'New');
  assert.equal(next.convenes[0].imageUrl,image('New'));
});

test('source failure never returns demo banners or stale art, including on cold start', async () => {
  for (const warm of [false,true]) {
    const app = setup();
    if(warm) { await app.run('createConvenesPayload()'); app.advance(5*60000); }
    app.fail();
    const payload = await app.run('createConvenesPayload()');
    assert.equal(payload.externalError,true);
    assert.equal(payload.convenes.length,0);
    assert.equal(payload.syncIntervalMinutes,1);
  }
});

test('frontend refresh replaces the image and clears banners on a network failure', async () => {
  const js = readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
  let fail = false; let requested;
  const context = vm.createContext({AbortSignal, state:{convenes:[{imageUrl:image('old')}]}, dataRequests:{}, preloadAppAssets(){}, scheduleRender(){}, fetch: async (_url, options)=>{
    requested=options;
    if(fail) throw Error('offline');
    return {ok:true,json:async()=>({convenes:[{imageUrl:image('new')}],updatedAt:new Date().toISOString(),syncIntervalMinutes:5})};
  }});
  vm.runInContext(js.slice(js.indexOf('async function loadConvenes('),js.indexOf('async function loadEvents(')),context);
  await vm.runInContext('loadConvenes()',context);
  assert.equal(context.state.convenes[0].imageUrl,image('new'));
  assert.equal(requested.cache,'no-store');
  fail=true;
  await vm.runInContext('loadConvenes({force:true})',context);
  assert.equal(context.state.convenes.length,0);
  assert.equal(context.state.conveneError,true);
});
