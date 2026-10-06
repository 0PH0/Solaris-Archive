import fs from 'node:fs/promises';
import {openBrowser} from './browser-harness.mjs';
const browser = await openBrowser();
try {
  await browser.go('/pt-BR/');
  const local = (await fs.readdir('public/assets', {recursive:true})).filter(p=>/\.(png|jpe?g|webp)$/.test(p)).map(p=>'/assets/'+p.replaceAll('\\','/'));
  const character = await (await fetch('https://api-v2.encore.moe/api/en/character/1311')).json();
  const weapons = await (await fetch('https://api-v2.encore.moe/api/en/weapon')).json();
  const echo = await (await fetch('https://api-v2.encore.moe/api/en/echo')).json();
  const detail = await (await fetch('https://api-v2.encore.moe/api/en/weapon/21010016')).json();
  const resource = p=>p.startsWith('/Game/') ? 'https://api.encore.moe/resource/Data/Game/'+p.slice(6).split('.')[0]+'.webp' : p;
  const remote = [...Object.entries(character).filter(([k,v])=>/^(RoleHead|FormationRoleCard|RolePortrait)/.test(k)&&typeof v==='string').map(([,v])=>v), weapons.weapons.find(w=>w.Id===21010016).Icon, resource(detail.IconBig), echo.Echo[0].Icon];
  const results = await browser.evaluate(`Promise.all(${JSON.stringify([...local,...remote])}.map(async src=>{const i=new Image();i.src=src;try{await i.decode();return {src,width:i.naturalWidth,height:i.naturalHeight};}catch{return {src,error:true};}}))`);
  await fs.writeFile('artifacts/image-sources-audit.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally {browser.close();}
