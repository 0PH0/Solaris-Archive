import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const source=readFileSync(new URL('../server.js',import.meta.url),'utf8');
const backend=source.slice(source.indexOf('const characterSourceUrl'),source.indexOf('async function serveFile'));
const xml=readFileSync(new URL('./fixtures/events-official-3.7.xml',import.meta.url),'utf8');
const codes=JSON.parse(readFileSync(new URL('./fixtures/codes-sources.json',import.meta.url),'utf8'));
function setup(){
  let now=Date.parse('2026-10-08T12:00:00Z'),failure=false,body=xml;const calls=[];
  const context=vm.createContext({URL,AbortSignal,Date:class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}},fetch:async url=>{
    calls.push(url);if(failure)throw Error('Offline');
    return {ok:true,text:async()=>url.includes('pockettactics')?codes.pocket:url.includes('beebom')?codes.beebom:body};
  }});
  vm.runInContext(backend,context);
  return {run:code=>vm.runInContext(code,context),calls,fail:()=>failure=true,advance:ms=>now+=ms,body:value=>body=value};
}

test('official patch sections include active, future, permanent and archived events without Convene duplicates',()=>{
  const app=setup(),events=app.run(`parseOfficialEventFeed(${JSON.stringify(xml)})`);
  assert(events.some(event=>event.title==='Cubie Wars'));
  assert(events.some(event=>event.title==='Echo Erase' && event.startAt==='2026-10-22T02:00:00.000Z'));
  assert(events.some(event=>event.title==='Past Dreams, Traced Seals' && event.permanent && event.endAt===null));
  assert(events.some(event=>event.title==='Moonlit Path' && event.schedulePending && event.startAt===null));
  assert(events.some(event=>event.id==='official-5129'));
  assert(!events.some(event=>event.category==='banner' || /Featured.*Convene/i.test(event.title)));
  const cubie=events.find(event=>event.title==='Cubie Wars');
  assert(cubie.imageUrl.includes('jq9dtlykl5qkm8i72a'));
  assert.equal(cubie.imageScope,'event');
  assert.equal(events.find(event=>event.title==='Gifts of Singing Drizzle').imageScope,'notice');
  assert.equal(new Set(events.map(event=>event.id)).size,events.length);
});

test('events have no active-only cap, keep older records across refreshes and source outages, and never invent fallback events',async()=>{
  const app=setup();
  const [one,two]=await Promise.all([app.run('createEventsPayload()'),app.run('createEventsPayload()')]);
  assert.equal(one,two);assert.equal(app.calls.length,2);
  assert(one.events.length>12);assert(one.events.some(event=>event.status==='encerrado'));
  assert(one.events.some(event=>event.status==='em_breve'));
  app.advance(31*60000);app.body('<feed></feed>');
  const next=await app.run('createEventsPayload()');assert.equal(next.events.length,one.events.length);
  app.fail();app.advance(7*60*60*1000);
  const offline=await app.run('createEventsPayload()');assert(offline.externalError);assert.equal(offline.events.length,one.events.length);
  const cold=setup();cold.fail();const unavailable=await cold.run('createEventsPayload()');assert.equal(unavailable.events.length,0);
  assert(!app.calls.some(url=>url.includes('pockettactics') || url.includes('beebom')));
});

test('merging corrections preserves old identities, original art, rewards and records missing from a newer feed',()=>{
  const app=setup();
  const previous=[{id:'official-original',title:'[Real Event] Combat Event',startAt:'start',endAt:'end',imageUrl:'original',rewards:['Actual reward']},{id:'official-old',title:'Old Event'}];
  const newer=[{id:'official-other-notice',title:'Real Event',startAt:'start',endAt:'end',description:'Corrected description',imageUrl:'',rewards:[]}];
  const merged=app.run(`mergeEventRecords(${JSON.stringify(previous)},${JSON.stringify(newer)})`);
  assert.equal(merged.length,2);assert.equal(merged[0].id,'official-original');assert.equal(merged[0].imageUrl,'original');assert.equal(merged[0].description,'Corrected description');assert.equal(merged[0].rewards[0],'Actual reward');
  const permanent=[{id:'official-persistent',title:'Permanent activity',permanent:true,startAt:'2026-01-01',publishedAt:'2026-02-01',description:'Current description'}];
  const older=[{id:'official-other',title:'Permanent activity',permanent:true,startAt:'2025-01-01',publishedAt:'2025-02-01',description:'Outdated description'}];
  const consolidated=app.run(`mergeEventRecords(${JSON.stringify(permanent)},${JSON.stringify(older)})`);
  assert.equal(consolidated.length,1);assert.equal(consolidated[0].id,'official-persistent');assert.equal(consolidated[0].description,'Current description');
});

test('code sources parse only active sections, preserve exact rewards, deduplicate and exclude expired livestream codes',async()=>{
  const app=setup(),payload=await app.run('createCodesPayload()');
  assert.deepEqual(Array.from(payload.codes,record=>record.code).sort(),['DVME2MOHOQJT','WUTHERINGGIFT']);
  const gift=payload.codes.find(record=>record.code==='WUTHERINGGIFT');
  assert(gift.rewards.includes('Shell Credit x10000'));assert(gift.rewards.includes('Astrite x50'));
  assert.equal(gift.expiresAt,null);assert.equal(gift.sources.length,2);
  assert(app.calls.every(url=>url.includes('pockettactics') || url.includes('beebom')));
  await app.run('createCodesPayload()');assert.equal(app.calls.length,2);
  app.advance(61*60000);app.fail();const unavailable=await app.run('createCodesPayload()');
  assert(unavailable.externalError);assert.equal(unavailable.codes.length,0,'stale codes cannot be advertised as currently valid');
});

test('explicit expiration and expired-source evidence override an active listing; changed markup fails safely',async()=>{
  const app=setup();
  const html='<h2 id="h-all-new-wuthering-waves-codes">Active</h2><ul><li><strong>REALCODE1</strong>: 50 Astrite expires 2026-10-07T12:00:00Z</li></ul><h3 id="h-all-expired-wuthering-waves-codes">Expired</h3><ul><li>OTHERREALCODE</li></ul>';
  const parsed=app.run(`parseCodeSource(${JSON.stringify(html)},${JSON.stringify('https://beebom.com/wuthering-waves-redeem-codes/')})`);
  assert.equal(parsed.codes[0].expiresAt,'2026-10-07T12:00:00.000Z');
  assert.throws(()=>app.run(`parseCodeSource('<html>Changed structure</html>','https://beebom.com/wuthering-waves-redeem-codes/')`));
  app.run(`codeSourceUrls.splice(0,codeSourceUrls.length,'https://beebom.com/wuthering-waves-redeem-codes/'); fetch=async()=>({ok:true,text:async()=>${JSON.stringify(html)}})`);
  assert.equal((await app.run('createCodesPayload()')).codes.length,0);
  const conflict=setup();
  conflict.run(`fetch=async url=>({ok:true,text:async()=>url.includes('pockettactics')?${JSON.stringify(codes.pocket.replace('FALLINGSANCTUM |','DVME2MOHOQJT | FALLINGSANCTUM |'))}:${JSON.stringify(codes.beebom)}})`);
  assert(!Array.from((await conflict.run('createCodesPayload()')).codes,code=>code.code).includes('DVME2MOHOQJT'));
});

test('new event extraction does not change existing Convene parsing or its independent refresh path',()=>{
  const app=setup(),original=readFileSync(new URL('./fixtures/convenes-3.7.xml',import.meta.url),'utf8');
  const banners=app.run(`parseOfficialConveneFeed(${JSON.stringify(original)})`);
  assert(banners.length>0);
  assert.equal(app.run(`parseOfficialEventFeed(${JSON.stringify(original)})`).length,0);
});

test('version schedules do not invent timestamps and cached records still expire at their real deadline',async()=>{
  const app=setup();
  assert(app.run("compareEventVersions('3.10','3.7')")>0);
  const permanent=app.run("eventSchedule('Duration: After the Version 3.1 update',new Map([['3.1','2026-02-05T03:00:00Z']]),'3.7')");
  assert(permanent.permanent);assert.equal(permanent.endAt,null);
  const range=app.run("eventSchedule('Duration: Start of Version 3.3 - End of Version 3.4',new Map(),'3.7')");
  assert.equal(range.endAt,null);assert(range.endedByVersion);
  assert.equal(app.run(`currentEventStatus(${JSON.stringify(range)})`),'encerrado');
  app.run("eventCache={expiresAt:Date.now()+60000,payload:{events:[{id:'official-boundary',startAt:'2026-10-08T11:00:00Z',endAt:'2026-10-08T12:00:01Z',status:'ao_vivo'}]}}");
  app.advance(2000);
  assert.equal((await app.run('createEventsPayload()')).events[0].status,'encerrado');
  const calendar=app.run("eventSchedule('2026/09/30 - 2026/10/28 (PT)',new Map())");
  assert(calendar.dateOnly);assert.equal(calendar.startAt,null);assert.equal(calendar.endAt,null);assert.equal(calendar.dateTimezone,'America/Los_Angeles');
  assert.equal(app.run(`currentEventStatus(${JSON.stringify(calendar)},Date.parse('2026-10-29T06:59:00Z'))`),'ao_vivo');
  assert.equal(app.run(`currentEventStatus(${JSON.stringify(calendar)},Date.parse('2026-10-29T07:00:00Z'))`),'encerrado');
});
