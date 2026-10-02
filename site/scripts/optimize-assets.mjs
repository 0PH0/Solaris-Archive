// Run with the local server started. Chrome supplies the WebP encoder; no new
// production dependency is required. Originals remain available for regeneration.
import fs from 'node:fs/promises';
import { openBrowser } from './browser-harness.mjs';
const browser = await openBrowser();
try {
  await browser.go('/pt-BR/');
  const assets = [
    ['home-hero-wuwa.jpg', 'home-hero', [960,1600,2560]],
    ['subhero-wuwa-2560.jpg', 'subhero', [960,1600,2560]],
    ['event-web.png', 'event-placeholder', [640,1280]],
    ['site-logo.png', 'site-logo', [84]]
  ];
  for (const [source, prefix, widths] of assets) {
    for (const width of widths) {
      const result = await browser.evaluate(`(async()=>{const img=new Image();img.src='/assets/${source}';await img.decode();const canvas=document.createElement('canvas');canvas.width=Math.min(${width},img.naturalWidth);canvas.height=Math.round(img.naturalHeight*canvas.width/img.naturalWidth);const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);return {width:canvas.width,height:canvas.height,data:canvas.toDataURL('image/webp',0.88).split(',')[1]};})()`);
      const filename = `public/assets/${prefix}-${width}.webp`;
      const buffer = Buffer.from(result.data, 'base64');
      await fs.writeFile(filename, buffer);
      console.log(`${filename}: ${result.width}x${result.height}, ${buffer.length} bytes`);
    }
  }
} finally { browser.close(); }
