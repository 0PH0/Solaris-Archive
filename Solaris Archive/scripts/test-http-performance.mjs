import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { delay } from './browser-harness.mjs';
const port = 4184;
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});
const request=(pathname,headers={},method='GET')=>new Promise((resolve,reject)=>{
  const req=http.request({hostname:'localhost',port,path:pathname,headers,method},res=>{
    const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));res.on('error',reject);
  });req.on('error',reject);req.setTimeout(30000,()=>req.destroy(Error('HTTP timeout')));req.end();
});
try {
  for(let i=0;i<50;i++){try{await request('/');break;}catch{await delay(100);}}
  const results=[];
  for(const asset of ['/app.js','/styles.css','/pt-BR/builder']) {
    const identity=await request(asset,{'Accept-Encoding':'identity'});
    assert.equal(identity.status,200);
    for(const encoding of ['gzip','br']) {
      const compressed=await request(asset,{'Accept-Encoding':encoding});
      assert.equal(compressed.headers['content-encoding'],encoding);
      assert.equal(compressed.headers.vary,'Accept-Encoding');
      assert.deepEqual(encoding==='br'?brotliDecompressSync(compressed.body):gunzipSync(compressed.body),identity.body);
      assert(compressed.body.length<identity.body.length);
      results.push({asset,encoding,originalBytes:identity.body.length,transferredBytes:compressed.body.length});
      assert.equal((await request(asset,{'Accept-Encoding':encoding,'If-None-Match':compressed.headers.etag})).status,304);
      const head=await request(asset,{'Accept-Encoding':encoding},'HEAD');
      assert.equal(head.status,200);assert.equal(head.body.length,0);
    }
  }
  assert.equal((await request('/app.js',{'Accept-Encoding':'br;q=0,gzip;q=0'})).headers['content-encoding'],undefined);
  assert.equal((await request('/app.js',{'Accept-Encoding':'br;q=0.5,gzip;q=1'})).headers['content-encoding'],'gzip');
  const video=await readFile('public/media/convene/normal.webm');
  const partial=await request('/media/convene/normal.webm',{Range:'bytes=100-199','Accept-Encoding':'br,gzip'});
  assert.equal(partial.status,206);assert.equal(partial.headers['content-length'],'100');assert.equal(partial.headers['content-encoding'],undefined);
  assert.deepEqual(partial.body,video.subarray(100,200));
  assert.equal((await request('/media/convene/normal.webm',{Range:'bytes=999999999-'})).status,416);
  assert.equal((await request('/assets/home-hero-960.webp')).headers['content-type'],'image/webp');
  assert.equal((await request('/app.js',{},'POST')).status,405);
  const apis=await Promise.all(['/api/characters','/api/events','/api/convenes'].map(async asset=>{
    const res=await request(asset,{'Accept-Encoding':'br'});
    const body=res.headers['content-encoding']==='br'?brotliDecompressSync(res.body):res.body;
    const payload=JSON.parse(body);
    assert([200,502].includes(res.status));assert.equal(res.headers.vary,'Accept-Encoding');
    if(asset==='/api/convenes')assert.equal(res.headers['cache-control'],'no-store');
    return {asset,status:res.status,externalError:payload.externalError || payload.error || false,records:(payload.characters||payload.events||payload.convenes).length,transferredBytes:res.body.length};
  }));
  await writeFile('artifacts/http-performance.json',JSON.stringify({results,apis},null,2));
  console.log(JSON.stringify({results,apis},null,2));
  console.log('PASS: Brotli/gzip round trip, negotiation, ETags, HEAD, video Range, WebP, method handling and real API contracts.');
} finally {server.kill();}
