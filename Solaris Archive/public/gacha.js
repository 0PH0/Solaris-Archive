import {emptyPool, clampInteger, simulatePull, calculateOdds} from './gacha-engine.js';
import {reducedMotion} from './settings-accessibility.js';
let convenePlaying = false;
let playbackRoot = null;
export const isConvenePlaying = root => convenePlaying && playbackRoot === root;

// Local copies of the media referenced by AZA.GG; loaded only after a draw.
// No redistribution license was found. Keep provenance in docs/convene-media.md.
const CONVENE_MEDIA = {
  normal: '/media/convene/normal.webm',
  five: '/media/convene/five.webm'
};

// The draw is committed once before playback. Skipping only reveals that draw.
function playConvene(count, rarity, lang, root, reveal) {
  const banner = root.querySelector('.gacha-banner');
  if (!banner) { reveal(); return; }
  convenePlaying = true;
  playbackRoot = root;
  const t = (pt,en,es) => tr(lang,pt,en,es);
  const dialog = document.createElement('section');
  dialog.className = 'convene-opening';
  dialog.setAttribute('aria-label', t('Animação de convocação','Convene animation','Animación de convocatoria'));
  dialog.innerHTML = '<video class="convene-video" playsinline preload="none" aria-hidden="true"></video><div class="convene-opening-caption"><span>SOLARIS ARCHIVE</span><p role="status"></p></div><div class="convene-media-controls"><button type="button" class="convene-audio" aria-pressed="false"></button><button type="button" class="convene-skip" autofocus></button></div><a class="convene-credit" href="https://wuwa.aza.gg/gacha" target="_blank" rel="noreferrer">Wuthering Waves · Kuro Games / AZA.GG</a>';
  const video = dialog.querySelector('video');
  const status = dialog.querySelector('[role=status]');
  const sound = dialog.querySelector('.convene-audio');
  const skip = dialog.querySelector('.convene-skip');
  status.textContent = t('Carregando animação…','Loading animation…','Cargando animación…');
  sound.textContent = t('Ativar som','Enable sound','Activar sonido');
  skip.textContent = t('Pular animação ››','Skip animation ››','Saltar animación ››');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;
  banner.prepend(dialog);
  banner.classList.add('is-convening');
  root.querySelector('.gacha-results')?.setAttribute('hidden', '');
  const controls = [...root.querySelectorAll('[data-gacha-pull],[data-gacha-type],[data-gacha-banner],[data-gacha-refresh]')].map(button=>[button,button.disabled]);
  controls.forEach(([button])=>{button.disabled=true;});
  dialog.scrollIntoView({behavior:'instant',block:'center'});
  let finished = false, timer;
  const finish = (transition = false) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    window.removeEventListener('popstate', skipPlayback);
    window.removeEventListener('keydown', onKey);
    observer.disconnect();
    video.pause();
    video.removeAttribute('src'); video.load();
    const close = () => {
      dialog.remove(); banner.classList.remove('is-convening');
      controls.forEach(([button,disabled])=>{button.disabled=disabled;});
      convenePlaying = false;
      playbackRoot = null;
      reveal();
    };
    if (transition && !reducedMotion()) {
      dialog.classList.add('is-ending');
      timer = setTimeout(close, 180);
    } else close();
  };
  const skipPlayback = () => finish();
  const onKey = event => { if (event.key === 'Escape') { event.preventDefault(); finish(); } };
  const observer = new MutationObserver(() => { if (root.hidden || !root.isConnected) finish(); });
  observer.observe(root,{attributes:true,attributeFilter:['hidden']});
  const unavailable = () => {
    if (finished) return;
    video.pause();
    dialog.classList.remove('is-playing');
    status.textContent = t('Vídeo indisponível. Revelando resultados…','Video unavailable. Revealing results…','Vídeo no disponible. Mostrando resultados…');
    clearTimeout(timer); timer = setTimeout(skipPlayback, 1000);
  };
  const watchdog = () => { clearTimeout(timer); timer = setTimeout(unavailable, 12000); };
  skip.addEventListener('click', skipPlayback);
  sound.addEventListener('click', () => {
    video.muted = !video.muted;
    sound.setAttribute('aria-pressed', String(!video.muted));
    sound.textContent = video.muted ? t('Ativar som','Enable sound','Activar sonido') : t('Silenciar','Mute','Silenciar');
  });
  window.addEventListener('keydown', onKey);
  window.addEventListener('popstate', skipPlayback, {once:true});
  video.addEventListener('playing', () => {
    if (finished) return;
    dialog.classList.add('is-playing');
    status.textContent = t('Convocando','Convening','Convocando') + ' ×' + count;
    watchdog();
  });
  video.addEventListener('timeupdate', () => { if (!finished && !video.paused) watchdog(); });
  video.addEventListener('ended', () => finish(true));
  video.addEventListener('loadeddata', () => { if (!video.videoWidth) unavailable(); });
  video.addEventListener('error', unavailable);
  try {
    video.src = rarity === 5 ? CONVENE_MEDIA.five : CONVENE_MEDIA.normal;
    watchdog();
    // Called synchronously from the Convene click, muted and inline.
    video.play().catch(unavailable);
    skip.focus({preventScroll:true});
  } catch { unavailable(); }
}
const KEY = 'solaris:gacha:v1';
function restore() {
  const pools = {resonator: emptyPool(), weapon: emptyPool()};
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    for (const type of Object.keys(pools)) {
      const raw = saved?.[type]; if (!raw) continue;
      pools[type] = {pity5: clampInteger(raw.pity5,79), pity4: clampInteger(raw.pity4,9), guaranteed: type === 'resonator' && raw.guaranteed === true, total: clampInteger(raw.total,1e9), history: Array.isArray(raw.history) ? raw.history.filter(r=>[3,4,5].includes(r?.rarity) && typeof r.name === 'string' && typeof r.banner === 'string').slice(0,100).map(r=>({rarity:r.rarity, featured:r.featured===true, name:r.name.slice(0,150), kind:r.kind==='weapon'?'weapon':r.kind==='character'?'character':'', slug:typeof r.slug==='string'?r.slug.slice(0,150):'', banner:r.banner.slice(0,180), number:clampInteger(r.number,1e9), pity:clampInteger(r.pity,80)})) : []};
    }
  } catch { /* Invalid storage never prevents simulation. */ }
  return pools;
}
export const gacha = {type:'resonator', selected:'', pools:restore(), results:[], revision:0, saveError:false, calc:{pity:0,pulls:80,guaranteed:false}};
const tr = (lang,pt,en,es) => lang==='en'?en:lang==='es'?es:pt;
export function selectedBanner(banners) { return banners.find(b=>b.type===gacha.type && b.id===gacha.selected) || banners.find(b=>b.type===gacha.type); }
function persist() { try {localStorage.setItem(KEY,JSON.stringify(gacha.pools));gacha.saveError=false;}catch{gacha.saveError=true;} }
export function renderGacha(ctx) {
  const {lang, banners, escape:esc, imageUrl, date, time, countdown, loading, error} = ctx;
  const t=(pt,en,es)=>tr(lang,pt,en,es);
  const banner=selectedBanner(banners), pool=gacha.pools[gacha.type];
  const options=banners.filter(b=>b.type===gacha.type);
  const odds=calculateOdds(gacha.calc.pity,gacha.calc.pulls,gacha.calc.guaranteed,gacha.type);
  const pct=value=>(value*100).toLocaleString(lang,{maximumFractionDigits:2})+'%';
  const field=(key,label,value,max)=>`<label><span>${label}</span><input type="number" min="0" max="${max}" step="1" value="${value}" data-gacha-field="${key}"></label>`;
  const guarantee=t('Próximo 5★ em destaque garantido','Next 5★ guaranteed featured','Próximo 5★ destacado garantizado');
  const empty=t('Nenhum banner ativo nesta categoria.','No active banner in this category.','No hay banners activos en esta categoría.');
  const resultName=r=>r.slug || r.featured?r.name:r.rarity===5?t('5★ fora do destaque','Off-banner 5★','5★ fuera del destacado'):r.rarity===4?t('Personagem ou arma 4★','4★ character or weapon','Personaje o arma 4★'):t('Arma 3★','3★ weapon','Arma 3★');
  return `<section class="gacha-page"><div class="container">
    ${ctx.catalogPending || ctx.catalogError ? `<p role="status" class="builder-muted">${ctx.catalogPending?t('Carregando itens da simulação…','Loading simulation items…','Cargando objetos de simulación…'):t('Não foi possível atualizar o catálogo. Use “Atualizar banners” para tentar novamente.','Unable to update the catalog. Use “Refresh banners” to retry.','No se pudo actualizar el catálogo. Usa “Actualizar banners” para reintentar.')}</p>`:''}
    <header class="gacha-heading"><div><p class="eyebrow">SOLARIS ARCHIVE / CONVENE LAB</p><h1>${t('Convocações','Convenes','Convocatorias')}</h1><p>${t('Explore os banners. Planeje seu pity. Simule suas próximas convocações.','Explore banners. Plan your pity. Simulate your next pulls.','Explora banners, planifica tu pity y simula convocatorias.')}</p></div><span class="pill">${t('Simulação local','Local simulation','Simulación local')}</span></header>
    <p class="gacha-disclaimer">${t('Simulação gratuita, sem vínculo com sua conta do jogo. Pity e resultados são salvos somente neste navegador.','Free simulation, not connected to your game account. Pity and results are saved only in this browser.','Simulación gratuita, sin conexión a tu cuenta. Pity y resultados se guardan en este navegador.')}</p>
    <div class="gacha-tabs" role="group" aria-label="${t('Tipo de banner','Banner type','Tipo de banner')}">${['resonator','weapon'].map(type=>`<button type="button" data-gacha-type="${type}" aria-pressed="${gacha.type===type}" class="${gacha.type===type?'is-active':''}">${type==='resonator'?t('Personagens','Characters','Personajes'):t('Armas','Weapons','Armas')} <span>${banners.filter(b=>b.type===type).length}</span></button>`).join('')}</div>
    <div class="gacha-workspace"><aside class="gacha-banner-list"><h2>${t('Banners atuais','Current banners','Banners actuales')}</h2>${options.map(b=>`<button type="button" data-gacha-banner="${esc(b.id)}" aria-pressed="${b.id===banner?.id}" class="${b.id===banner?.id?'is-active':''}"><img src="${esc(imageUrl(b))}" alt="" loading="lazy"><span><strong>${esc(b.featuredName)}</strong><small>${esc(b.title.replace(/ Featured.*$/i,''))}</small></span></button>`).join('') || `<p class="builder-muted">${loading?t('Carregando banners…','Loading banners…','Cargando banners…'):empty}</p>`}<button type="button" class="builder-text-button" data-gacha-refresh ${loading?'disabled':''}>${t('Atualizar banners','Refresh banners','Actualizar banners')}</button></aside>
    <div class="gacha-stage">${banner?`<article class="gacha-banner"><img class="gacha-banner-art" src="${esc(imageUrl(banner))}" alt="${esc(banner.title)}"><div class="gacha-banner-body"><div class="gacha-featured"><div><p class="eyebrow">${t('Em destaque','Featured','Destacado')} · 5★</p><h2>${esc(banner.featuredName)}</h2><p>${esc(banner.title)}</p></div><div class="gacha-countdown"><small>${t('Termina em','Ends in','Termina en')}</small><strong data-countdown data-start="${esc(banner.startAt)}" data-end="${esc(banner.endAt)}">${countdown(banner)}</strong></div></div><dl class="gacha-dates"><div><dt>${t('Início','Starts','Inicio')}</dt><dd>${esc(banner.startLabel || date(banner.startAt))} · ${banner.estimatedStart?'—':time(banner.startAt)}</dd></div><div><dt>${t('Término','Ends','Fin')}</dt><dd>${date(banner.endAt)} · ${time(banner.endAt)}</dd></div></dl><small class="builder-muted">${t('Horário do servidor · UTC+8','Server time · UTC+8','Hora del servidor · UTC+8')}</small><a href="${esc(banner.sourceUrl)}" target="_blank" rel="noreferrer" class="builder-text-button">${t('Aviso oficial ↗','Official notice ↗','Aviso oficial ↗')}</a></div></article>`:`<div class="empty-state" role="status"><h2>${loading?t('Buscando convocações…','Loading convenes…','Buscando convocatorias…'):error?t('Fonte indisponível','Source unavailable','Fuente no disponible'):empty}</h2><p>${t('Os banners são obtidos da mesma fonte oficial usada na Wiki.','Banners come from the same official source used by the Wiki.','Los banners usan la misma fuente oficial de la Wiki.')}</p></div>`}
    <section class="gacha-pity"><div><span>${t('Pity 5★','5★ pity','Pity 5★')}</span><strong>${pool.pity5}<small> / 80</small></strong><progress max="80" value="${pool.pity5}" aria-label="Pity 5 estrelas"></progress></div><div><span>${t('Desde o último 4★ ou superior','Since last 4★ or higher','Desde el último 4★ o superior')}</span><strong>${pool.pity4}<small> / 10</small></strong></div><div><span>${t('Próximo 5★','Next 5★','Próximo 5★')}</span><strong class="gacha-guarantee">${gacha.type==='weapon'||pool.guaranteed?t('Destaque garantido','Featured guaranteed','Destacado garantizado'):'50 / 50'}</strong></div></section>
    <div class="gacha-pull-actions"><span>${pool.total.toLocaleString(lang)} ${t('convocações simuladas','simulated pulls','convocatorias simuladas')}</span><button type="button" class="builder-button" data-gacha-pull="1" ${!banner || !ctx.canDraw(banner)?'disabled':''}>Convene ×1</button><button type="button" class="builder-button builder-button--primary" data-gacha-pull="10" ${!banner || !ctx.canDraw(banner)?'disabled':''}>Convene ×10</button></div>
    <details class="gacha-tuning"><summary>${t('Ajustar pity da simulação','Adjust simulation pity','Ajustar pity de simulación')}</summary><div class="gacha-form">${field('pity5',t('Pity atual 5★','Current 5★ pity','Pity actual 5★'),pool.pity5,79)}${field('pity4',t('Pity atual 4★','Current 4★ pity','Pity actual 4★'),pool.pity4,9)}<label class="gacha-check"><input type="checkbox" data-gacha-field="guaranteed" ${(pool.guaranteed || gacha.type==='weapon')?'checked':''} ${gacha.type==='weapon'?'disabled':''}>${guarantee}</label></div><p class="builder-muted">${t('Pity compartilhado entre banners do mesmo tipo. Personagens e armas têm contadores separados.','Pity is shared across banners of the same type. Characters and weapons have separate counters.','El pity se comparte entre banners del mismo tipo. Personajes y armas tienen contadores separados.')}</p><button class="builder-text-button" type="button" data-gacha-reset>${t('Limpar simulação desta categoria','Reset this category simulation','Reiniciar simulación de esta categoría')}</button></details>
    </div></div>
    <section class="gacha-results"><div class="gacha-section-heading"><h2>${t('Última convocação','Last pull','Última convocatoria')}</h2><span role="status" data-gacha-status>${gacha.saveError?t('Não foi possível salvar neste navegador.','Unable to save in this browser.','No se pudo guardar en este navegador.'):gacha.results.length?`${gacha.results.length} ${t('resultados • simulação concluída','results • simulation complete','resultados • simulación completada')}`:t('Pronto para simular','Ready to simulate','Listo para simular')}</span></div><div class="gacha-result-grid">${gacha.results.map(r=>{const item=ctx.resultItem(r);return `<a data-link href="${esc(item.href)}" class="gacha-result rarity-${r.rarity}"><span class="gacha-result-stars" aria-label="${r.rarity} estrelas">${'★'.repeat(r.rarity)}</span><img src="${esc(item.image)}" alt="${esc(resultName(r))}" loading="lazy"><strong>${esc(resultName(r))}</strong><small>#${r.number}${r.rarity===5?' · Pity '+r.pity:''}</small></a>`;}).join('') || `<p class="builder-muted">${t('Selecione um banner e use Convene ×1 ou ×10.','Select a banner and use Convene ×1 or ×10.','Selecciona un banner y usa Convene ×1 o ×10.')}</p>`}</div></section>
    <div class="gacha-bottom"><section class="gacha-calculator"><p class="eyebrow">CONVENE PLANNER</p><h2>${t('Calculadora de probabilidade','Probability calculator','Calculadora de probabilidad')}</h2><p class="builder-muted">${t('Estimativa sem soft pity. Calcule sem alterar a simulação.','Estimate without soft pity. Calculate without changing simulation pity.','Estimación sin soft pity. Calcula sin cambiar la simulación.')}</p><div class="gacha-form">${field('calcPity',t('Pity inicial 5★','Starting 5★ pity','Pity inicial 5★'),gacha.calc.pity,79)}${field('calcPulls',t('Convocações planejadas','Planned pulls','Convocatorias previstas'),gacha.calc.pulls,160)}<label class="gacha-check"><input type="checkbox" data-gacha-field="calcGuaranteed" ${gacha.calc.guaranteed || gacha.type==='weapon'?'checked':''} ${gacha.type==='weapon'?'disabled':''}>${guarantee}</label></div><button type="button" class="builder-text-button" data-gacha-use-pity>${t('Usar pity da simulação','Use simulation pity','Usar pity de la simulación')}</button><div class="gacha-odds" role="status"><div><span>${t('Pelo menos um 5★','At least one 5★','Al menos un 5★')}</span><strong>${pct(odds.five)}</strong></div><div><span>${t('Pelo menos um destaque 5★','At least one featured 5★','Al menos un destacado 5★')}</span><strong>${pct(odds.featured)}</strong></div></div><p class="builder-muted">${t('Garantia do destaque em até','Featured guaranteed within','Destacado garantizado en hasta')} <strong>${odds.maximum}</strong> ${t('convocações a partir deste pity.','pulls from this pity.','convocatorias desde este pity.')}</p><p class="builder-muted">${t('Equivalente a','Equivalent to','Equivalente a')} ${(gacha.calc.pulls*160).toLocaleString(lang)} Astrites · 160 / Convene</p></section>
    <section class="gacha-history"><h2>${t('Histórico da simulação','Simulation history','Historial de simulación')}</h2><p class="builder-muted">${t('Últimos 100 resultados desta categoria.','Last 100 results in this category.','Últimos 100 resultados de esta categoría.')}</p><div class="gacha-history-scroll">${pool.history.length?`<table><thead><tr><th>#</th><th>${t('Resultado','Result','Resultado')}</th><th>Banner</th></tr></thead><tbody>${pool.history.map(r=>`<tr><td>${r.number}</td><td><span class="rarity-text-${r.rarity}">${'★'.repeat(r.rarity)}</span> ${esc(resultName(r))}</td><td>${esc(r.banner)}</td></tr>`).join('')}</tbody></table>`:`<p class="builder-muted">${t('Suas simulações aparecerão aqui.','Your simulated pulls will appear here.','Tus simulaciones aparecerán aquí.')}</p>`}</div></section></div>
    <details class="gacha-method"><summary>${t('Como a simulação e os cálculos funcionam','How simulation and calculations work','Cómo funcionan la simulación y los cálculos')}</summary><p>${t('Modelo aproximado: 0,8% de chance base de 5★, 6% de 4★, garantia de 5★ na 80ª convocação e de 4★ ou superior a cada 10. Não inclui uma curva de soft pity. Personagens usam 50/50 e garantem o destaque após perder; armas garantem o destaque no 5★. Itens fora do destaque são selecionados do catálogo da Wiki por raridade. Essa seleção é ilustrativa e não reproduz a tabela oficial de drops.','Approximate model: 0.8% base 5★ rate, 6% 4★ rate, guaranteed 5★ at pull 80 and 4★ or higher within 10. No soft-pity curve. Characters use 50/50 with a featured guarantee after a loss; weapons guarantee the featured 5★. Non-featured items are sampled from the Wiki catalog by rarity. This illustrative selection is not the official banner drop table.','Modelo aproximado: 0,8% para 5★, 6% para 4★, garantía de 5★ en 80 y de 4★ o superior cada 10. Sin curva de soft pity. Personajes: 50/50 y garantía tras perder. Armas: 5★ destacado garantizado. Los objetos no destacados se eligen del catálogo por rareza. La selección es ilustrativa, no la tabla oficial del banner.')}</p><p>${t('Os cálculos consideram o pity inicial e a garantia. Não preveem resultados reais do jogo.','Calculations include initial pity and guarantee. They do not predict actual game results.','Los cálculos consideran pity y garantía. No predicen resultados reales.')}</p></details>
    </div></section>`;
}
export function handleGacha(event, ctx) {
  const target=event.target.closest('[data-gacha-type],[data-gacha-banner],[data-gacha-pull],[data-gacha-field],[data-gacha-reset],[data-gacha-use-pity],[data-gacha-refresh]');
  if(!target || target.disabled)return false;
  if(convenePlaying)return true;
  const field=target.dataset.gachaField;
  if(field && event.type!=='change')return false;
  if(!field && event.type!=='click')return false;
  if(target.hasAttribute('data-gacha-refresh')){ctx.refresh();return true;}
  let message='';
  if(target.dataset.gachaType){gacha.type=target.dataset.gachaType==='weapon'?'weapon':'resonator';gacha.selected='';gacha.results=[];}
  if(target.dataset.gachaBanner){gacha.selected=target.dataset.gachaBanner;gacha.results=[];}
  const pool=gacha.pools[gacha.type];
  if(target.dataset.gachaPull){
    const banner=selectedBanner(ctx.banners);if(!banner || !ctx.canDraw(banner))return true;
    const count=target.dataset.gachaPull==='10'?10:1;
    gacha.results=Array.from({length:count},()=>{const result=simulatePull(pool,gacha.type);return {...result,...ctx.drawItem(banner,result,gacha.type),banner:banner.title};});
    pool.history=[...gacha.results].reverse().concat(pool.history).slice(0,100);
    message=tr(ctx.lang,'Simulação concluída: ','Simulation complete: ','Simulación completada: ')+gacha.results.map(r=>`${r.rarity}★${r.featured?' '+r.name:''}`).join(', ');
    persist();
    const results = gacha.results;
    gacha.results = [];
    playConvene(count, Math.max(...results.map(r=>r.rarity)), ctx.lang, ctx.root, () => {
      gacha.results = results;
      gacha.revision++; ctx.render();
      if (!ctx.root.hidden && ctx.root.isConnected) {
        const section = ctx.root.querySelector('.gacha-results');
        section?.setAttribute('tabindex', '-1');
        section?.focus({preventScroll:true});
        section?.scrollIntoView({behavior:'instant', block:'start'});
        ctx.notify(message,true);
      }
    });
    return true;
  }
  if(field){
    if(field==='pity5'||field==='pity4')pool[field]=clampInteger(target.value,field==='pity5'?79:9);
    if(field==='guaranteed')pool.guaranteed=target.checked;
    if(field==='calcPity')gacha.calc.pity=clampInteger(target.value,79);
    if(field==='calcPulls')gacha.calc.pulls=clampInteger(target.value,160);
    if(field==='calcGuaranteed')gacha.calc.guaranteed=target.checked;
    if(!field.startsWith('calc'))persist();
  }
  if(target.hasAttribute('data-gacha-use-pity'))gacha.calc={...gacha.calc,pity:pool.pity5,guaranteed:pool.guaranteed};
  if(target.hasAttribute('data-gacha-reset')){
    if(!window.confirm(tr(ctx.lang,'Limpar o pity e o histórico simulados desta categoria?','Reset the simulated pity and history for this category?','¿Borrar el pity y el historial simulados de esta categoría?')))return true;
    gacha.pools[gacha.type]=emptyPool();gacha.results=[];persist();
  }
  const open=target.closest('details')?.open;
  const attribute=Array.from(target.attributes).find(a=>a.name.startsWith('data-gacha-'));
  gacha.revision++;ctx.render();
  const next=ctx.root.querySelector(`[${attribute.name}="${CSS.escape(attribute.value)}"]`);
  if(open && next?.closest('details'))next.closest('details').open=true;
  next?.focus();if(message)ctx.notify(message,true);
  return true;
}
