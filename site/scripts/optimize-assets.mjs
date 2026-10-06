// Run with the local server started. Chrome supplies the WebP encoder; no new
// production dependency is required. Originals remain available for regeneration.
import fs from 'node:fs/promises';
import { openBrowser } from './browser-harness.mjs';
const browser = await openBrowser();
try {
  await browser.go('/pt-BR/');
  const assets = [
    ['home-hero-wuwa.jpg', 'home-hero', [960,1600,2560,3840]],
    ['subhero-wuwa-2560.jpg', 'subhero', [960,1600,2560]],
    ['event-web.png', 'event-placeholder', [640,900]],
    ['site-logo.png', 'site-logo', [84,126]],
    ...['hsin-3.7','blooming-jadehaven-3.7'].map(name=>[`banners/${name}.webp`, `banners/${name}`, [464]])
  ];
  for (const [source, prefix, widths] of assets) {
    for (const width of widths) {
      // Preserve existing derivatives; always encode from the original source.
      if (await fs.stat(`public/assets/${prefix}-${width}.webp`).then(()=>true,()=>false)) continue;
      const result = await browser.evaluate(`(async()=>{const img=new Image();img.src='/assets/${source}';await img.decode();const canvas=document.createElement('canvas');canvas.width=Math.min(${width},img.naturalWidth);canvas.height=Math.round(img.naturalHeight*canvas.width/img.naturalWidth);const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,canvas.width,canvas.height);return {width:canvas.width,height:canvas.height,data:canvas.toDataURL('image/webp',${source.startsWith('banners/') ? 0.94 : 0.9}).split(',')[1]};})()`);
      const filename = `public/assets/${prefix}-${result.width}.webp`;
      const buffer = Buffer.from(result.data, 'base64');
      await fs.writeFile(filename, buffer);
      console.log(`${filename}: ${result.width}x${result.height}, ${buffer.length} bytes`);
    }
  }
} finally { browser.close(); }
