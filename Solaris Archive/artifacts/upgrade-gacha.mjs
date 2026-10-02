import fs from 'node:fs';
let s=fs.readFileSync('public/gacha.js','utf8');
s=s.replace("https://wuwa.aza.gg/static/gacha/gacha_ing_rarity_4.webm",'/media/convene/normal.webm').replace('https://wuwa.aza.gg/static/gacha/gacha_ing_rarity_5.webm','/media/convene/five.webm');
const a=s.indexOf("  const play = document.createElement");const b=s.indexOf('  status.textContent',a);s=s.slice(0,a)+s.slice(b);
s=s.replace('video.autoplay = !reducedMotion();','video.autoplay = true;');
const c=s.indexOf('  const start = () =>');const d=s.indexOf("const KEY =",c);
s=s.slice(0,c)+`  try {
    video.src = rarity === 5 ? CONVENE_MEDIA.five : CONVENE_MEDIA.normal;
    watchdog();
    // Called synchronously from the Convene click, muted and inline.
    video.play().catch(unavailable);
    skip.focus({preventScroll:true});
  } catch { unavailable(); }
}
`+s.slice(d);
s=s.replace("name:r.name.slice(0,150),", "name:r.name.slice(0,150), kind:r.kind==='weapon'?'weapon':r.kind==='character'?'character':'', slug:typeof r.slug==='string'?r.slug.slice(0,150):'',");
s=s.replace("const resultName=r=>r.featured?r.name:","const resultName=r=>r.slug || r.featured?r.name:");
const start=s.indexOf('${gacha.results.map(r=>');const end=s.indexOf(".join('') ||",start);
if(start<0||end<0)throw Error('Result template missing');
s=s.slice(0,start)+"${gacha.results.map(r=>{const item=ctx.resultItem(r);return `<a data-link href=\"${esc(item.href)}\" class=\"gacha-result rarity-${r.rarity}\"><span class=\"gacha-result-stars\" aria-label=\"${r.rarity} estrelas\">${'★'.repeat(r.rarity)}</span><img src=\"${esc(item.image)}\" alt=\"${esc(resultName(r))}\" loading=\"lazy\"><strong>${esc(resultName(r))}</strong><small>#${r.number}${r.rarity===5?' · Pity '+r.pity:''}</small></a>`;})"+s.slice(end);
s=s.replace('name:banner.featuredName,banner:banner.title','...ctx.drawItem(banner, pool, gacha.type),banner:banner.title'); // replaced below: item needs the pull's rarity.
s=s.replace("gacha.results=Array.from({length:count},()=>({...simulatePull(pool,gacha.type),...ctx.drawItem(banner, pool, gacha.type),banner:banner.title}));", "gacha.results=Array.from({length:count},()=>{const result=simulatePull(pool,gacha.type);return {...result,...ctx.drawItem(banner,result,gacha.type),banner:banner.title};});");
s=s.replace("const banner=selectedBanner(ctx.banners);if(!banner)return true;", "const banner=selectedBanner(ctx.banners);if(!banner || !ctx.canDraw(banner))return true;");
s=s.replaceAll("${!banner?'disabled':''}","${!banner || !ctx.canDraw(banner)?'disabled':''}");
s=s.replace('Resultados inferiores a 5★ e 5★ fora do destaque são mostrados por categoria, sem inventar o catálogo de drops do banner.','Itens fora do destaque são selecionados do catálogo da Wiki por raridade. Essa seleção é ilustrativa e não reproduz a tabela oficial de drops.');
s=s.replace('Lower rarities and off-banner 5★ are shown as categories, not an invented banner drop pool.','Non-featured items are sampled from the Wiki catalog by rarity. This illustrative selection is not the official banner drop table.');
s=s.replace('Los resultados inferiores y 5★ no destacados se muestran por categoría.','Los objetos no destacados se eligen del catálogo por rareza. La selección es ilustrativa, no la tabla oficial del banner.');
fs.writeFileSync('public/gacha.js',s);
let app=fs.readFileSync('public/app.js','utf8');
app="import {loadWeaponCatalog, loadWeaponDetail} from './weapon-catalog.js';\n"+app;
app=app.replace('function renderWeaponsPage() {',`let weaponsReady = false, weaponRequest, weaponRevision = 0, weaponError = false;
const weaponDetails = new Map();
async function ensureWeapons() {
  if (weaponsReady || weaponRequest) return weaponRequest;
  weaponRequest = loadWeaponCatalog().then(items=>{
    for(const item of items){const old=weapons.find(w=>w.slug===item.slug || w.name===item.name);if(old)Object.assign(old,item);else weapons.push({...item,baseAtk:null,stat:'—',passive:'',recommended:[]});}
  }).catch(()=>{weaponError=true;}).finally(()=>{weaponsReady=true;weaponRequest=null;weaponRevision++;scheduleRender();});
  return weaponRequest;
}
function ensureWeaponDetail() {
  const weapon=weapons.find(w=>w.slug===state.detail);
  if(!weapon?.id || weaponDetails.has(weapon.id))return;
  weaponDetails.set(weapon.id,{loading:true});
  loadWeaponDetail(weapon.id).then(data=>weaponDetails.set(weapon.id,data)).catch(()=>weaponDetails.set(weapon.id,{error:true})).finally(()=>{weaponRevision++;scheduleRender();});
}
function renderWeaponDetail(slug) {
  const weapon=weapons.find(w=>w.slug===slug);
  if(!weapon)return weaponsReady?renderNotFound():renderPageHero(t('navWeapons'),'Carregando catálogo…',t('database'));
  const detail=weaponDetails.get(weapon.id);
  const label=(pt,en,es)=>state.lang==='en'?en:state.lang==='es'?es:pt;
  const properties=detail?.properties || [];
  return renderPageHero(weapon.name,weapon.type+' · '+stars(weapon.rarity),t('weapon'))+
    '<section class="page-band"><div class="container detail-layout weapon-detail"><aside class="detail-aside">'+renderItemAssetImage('weapon',weapon)+'<a class="text-link" data-link href="'+pathFor('weapons')+'">'+t('back')+'</a></aside><div class="detail-main">'+
    (detail?.loading?'<p role="status">'+label('Carregando detalhes…','Loading details…','Cargando detalles…')+'</p>':'')+
    (detail?.error?'<p role="status">'+label('Não foi possível carregar os detalhes da Encore.','Unable to load Encore details.','No se pudieron cargar los detalles de Encore.')+'</p>':'')+
    '<article class="panel"><h2>'+label('Atributos','Attributes','Atributos')+'</h2>'+(properties.length?'<div class="weapon-stats-scroll"><table><thead><tr><th>'+label('Nível','Level','Nivel')+'</th>'+properties.map(p=>'<th>'+escapeHtml(p.name)+'</th>').join('')+'</tr></thead><tbody>'+properties[0].values.map((v,i)=>'<tr><td>'+v.level+'</td>'+properties.map(p=>'<td>'+escapeHtml(p.values[i]?.value || '—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<p>ATK: '+(weapon.baseAtk ?? '—')+' · '+escapeHtml(weapon.stat || '—')+'</p>')+'</article>'+
    (detail?.passive || weapon.passive?'<article class="panel"><h2>'+escapeHtml(detail?.passiveName || label('Passiva','Passive','Pasiva'))+'</h2><p>'+escapeHtml(detail?.passive || weapon.passive)+'</p><small>'+label('Valores separados por / correspondem às categorias de sintonia da arma.','Slash-separated values correspond to weapon syntonization ranks.','Los valores separados por / corresponden a rangos de sintonización.')+'</small></article>':'')+
    (detail?.description?'<article class="panel"><h2>'+label('Descrição','Description','Descripción')+'</h2><p>'+escapeHtml(detail.description)+'</p></article>':'')+
    (detail?.source?'<a class="text-link" href="'+escapeHtml(detail.source)+'" target="_blank" rel="noreferrer">Encore · '+label('Fonte dos dados','Data source','Fuente de datos')+'</a>':'')+'</div></div></section>';
}
function renderWeaponsPage() {
  if(state.detail)return renderWeaponDetail(state.detail);`);
app=app.replace('<h3>${weapon.name}</h3>','<h3><a data-link href="${pathFor("weapons",state.lang,weapon.slug)}">${escapeHtml(weapon.name)} ↗</a></h3>');
app=app.replace('${weapon.baseAtk}</dd>','${weapon.baseAtk ?? "—"}</dd>');
app=app.replace('return [base, state.weaponFilter].join("|");','return [base, state.weaponFilter, weaponRevision].join("|");');
app=app.replace('return [base, gacha.revision,','return [base, gacha.revision, weaponRevision,');
app=app.replace('function preloadAppData() {',`function preloadAppData() {
  if(['gacha','weapons'].includes(state.route) && !weaponsReady)ensureWeapons();
  if(state.route==='weapons' && state.detail && weaponsReady)ensureWeaponDetail();`);
const x=app.indexOf('    featuredIcon:',app.indexOf('function gachaContext()'));const y=app.indexOf('    root:',x);
app=app.slice(0,x)+`    canDraw: banner => weaponsReady && !!gachaFeatured(banner),
    drawItem: (banner,result,type) => {
      const featured=gachaFeatured(banner);
      const candidates=gachaItems().filter(item=>item.rarity===result.rarity && (result.rarity!==3 || item.kind==='weapon') && (result.rarity!==5 || item.kind===(type==='weapon'?'weapon':'character')) && !(item.kind===featured?.kind && item.slug===featured?.slug));
      const item=result.featured?featured:candidates[Math.floor(Math.random()*candidates.length)];
      return {name:item.name,slug:item.slug,kind:item.kind};
    },
    resultItem: result => {
      const item=gachaItems().find(item=>item.kind===result.kind && item.slug===result.slug);
      return {image:item?.image || '',href:pathFor(result.kind==='character'?'characters':'weapons',state.lang,result.slug)};
    },
`+app.slice(y);
app=app.replace('function gachaContext() {',`function gachaItems() {
  return [...characters.map(item=>({...item,kind:'character',image:item.iconUrl || item.imageUrl || characterAssetUrl(item.name)})),...weapons.map(item=>({...item,kind:'weapon',image:item.iconUrl || item.imageUrl || itemAssetUrl('weapon',item)}))];
}
function gachaFeatured(banner) {
  const norm=value=>String(value).toLowerCase().replace(/[^a-z0-9]/g,'');
  return gachaItems().find(item=>item.kind===(banner.type==='weapon'?'weapon':'character') && norm(item.name)===norm(banner.featuredName));
}
function gachaContext() {`);
fs.writeFileSync('public/app.js',app);
fs.writeFileSync('public/index.html',fs.readFileSync('public/index.html','utf8').replaceAll('20260922-convene-inline','20260922-convene-items'));
