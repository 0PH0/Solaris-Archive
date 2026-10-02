import fs from 'node:fs/promises';
import {openBrowser} from './browser-harness.mjs';
const browser=await openBrowser();
try {
  await browser.viewport(1080,1000);await browser.go('/pt-BR/');
  const source='https://hw-media-cdn-mingchao.kurogame.com/object/1790524800000/0rioucn8tj7k7gjeo5-1790578091396.jpg';
  const data=(await fs.readFile('artifacts/hsin-image-preview-3.jpg').catch(async()=>{const response=await fetch(source);if(!response.ok)throw Error('Official poster unavailable');return Buffer.from(await response.arrayBuffer());})).toString('base64');
  await browser.evaluate(`(async()=>{document.querySelectorAll('link[rel="stylesheet"]').forEach(e=>e.remove());document.body.replaceChildren();document.body.style.margin='0';const img=new Image();img.src='data:image/jpeg;base64,${data}';img.id='poster';img.style.width='1080px';document.body.append(img);await img.decode();})()`);
  await fs.mkdir('public/assets/banners',{recursive:true});
  for(const [name,y] of [['hsin-3.7',1286],['blooming-jadehaven-3.7',4562]]){
    const encoded=await browser.evaluate(`(()=>{const canvas=document.createElement('canvas');canvas.width=928;canvas.height=516;canvas.getContext('2d').drawImage(document.querySelector('#poster'),76,${y},928,516,0,0,928,516);return canvas.toDataURL('image/webp',0.94).split(',')[1];})()`);
    await fs.writeFile(`public/assets/banners/${name}.webp`,Buffer.from(encoded,'base64'));
  }
} finally{browser.close();}
