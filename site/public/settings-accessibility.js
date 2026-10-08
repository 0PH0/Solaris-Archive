// One preference store for Settings → Accessibility. No global enable switch.
const KEY = 'solaris:accessibility:v2';
const defaults = {captions:false, transcripts:false, visual:false, text:false, interface:false, contrast:false, imageContrast:false, zoom:false, colorLabels:false, keyboard:false, targets:false, focus:false, simple:false, plain:false, motion:false, color:'none'};
const colors = ['none','protanopia','deuteranopia','tritanopia'];
function readPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    return Object.fromEntries(Object.entries(defaults).map(([name,value]) => [name, name === 'color' ? (colors.includes(stored?.color) ? stored.color : value) : (typeof stored?.[name] === 'boolean' ? stored[name] : value)]));
  } catch { return {...defaults}; }
}
// Retire the old store without retaining a second implementation.
try {
  const old = JSON.parse(localStorage.getItem('solaris:accessibility:v1'));
  if (!localStorage.getItem(KEY) && old?.enabled) {
    localStorage.setItem(KEY, JSON.stringify({...defaults, captions:!!old.captions, transcripts:!!old.descriptions, plain:!!old.descriptions, visual:!!old.visual, motion:!!old.motion}));
  }
} catch { /* Storage restrictions do not prevent session preferences. */ }
try { localStorage.removeItem('solaris:accessibility:v1'); } catch { /* Optional cleanup. */ }
let preferences = readPreferences();
let language = 'pt-BR';
let root;
const tr = (pt,en,es) => language === 'en' ? en : language === 'es' ? es : pt;
const labels = {
  captions:['Legendas quando disponíveis','Captions when available','Subtítulos cuando estén disponibles'],
  transcripts:['Transcrições dos vídeos','Video transcripts','Transcripciones de vídeos'],
  visual:['Avisos visuais','Visual notifications','Avisos visuales'],
  text:['Texto maior','Larger text','Texto más grande'],
  interface:['Interface ampliada','Larger interface','Interfaz ampliada'],
  contrast:['Alto contraste','High contrast','Alto contraste'],
  imageContrast:['Contraste entre texto e imagens','Text and image contrast','Contraste entre texto e imágenes'],
  zoom:['Ampliar imagens de personagens, armas e Echoes','Zoom character, weapon and Echo images','Ampliar imágenes de personajes, armas y Ecos'],
  colorLabels:['Identificar estados também por texto e símbolos','Identify states with text and symbols','Identificar estados con texto y símbolos'],
  keyboard:['Atalhos de navegação por teclado','Keyboard navigation shortcuts','Atajos de navegación por teclado'],
  targets:['Áreas clicáveis maiores','Larger click targets','Áreas de clic más grandes'],
  focus:['Foco visual destacado','Stronger focus indicator','Foco visual destacado'],
  simple:['Modo simplificado','Simplified mode','Modo simplificado'],
  plain:['Instruções curtas e diretas','Short, direct instructions','Instrucciones breves y directas'],
  motion:['Reduzir animações','Reduce motion','Reducir animaciones']
};
const label = name => tr(...labels[name]);
const closeLabel = () => tr('Fechar','Close','Cerrar');
const profiles = {visual:['contrast','text','interface'], hearing:['captions','transcripts','visual'], navigation:['keyboard','targets','focus','motion']};
export const reducedMotion = () => preferences.motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
export const captionParameters = lang => preferences.captions ? '&cc_load_policy=1&cc_lang_pref=' + encodeURIComponent(lang) : '';
export function settingsButton(lang) {
  const title = lang === 'en' ? 'Settings' : lang === 'es' ? 'Configuración' : 'Configurações';
  return `<button type="button" class="settings-button" data-settings-open aria-haspopup="dialog" aria-label="${title}" title="${title}"><svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m9 3-.5 2.4-2 .9-2.1-.7-2 3.4L4 10.6v2.8l-1.6 1.6 2 3.4 2.1-.7 2 .9L9 21h6l.5-2.4 2-.9 2.1.7 2-3.4-1.6-1.6v-2.8l1.6-1.6-2-3.4-2.1.7-2-.9L15 3Z"/><circle cx="12" cy="12" r="3"/></svg><span>${title}</span></button>`;
}
const messages = {
  loading:['Carregando Echoes…','Loading Echoes…','Cargando Ecos…'], loaded:['Echoes carregados.','Echoes loaded.','Ecos cargados.'],
  loadError:['Não foi possível atualizar os Echoes. Consulte o aviso no Builder.','Unable to update Echoes. Check the Builder notice.','No se pudieron actualizar los Ecos. Consulta el aviso del Builder.'],
  added:['Adicionado aos favoritos.','Added to favorites.','Añadido a favoritos.'], removed:['Removido dos favoritos.','Removed from favorites.','Eliminado de favoritos.'],
  copied:['Código copiado.','Code copied.','Código copiado.'], copyError:['Não foi possível copiar. Selecione o código e copie manualmente.','Unable to copy. Select the code and copy manually.','No se pudo copiar. Selecciona el código y cópialo manualmente.']
};
export function notifyAccessibility(message, literal = false) {
  if (!preferences.visual) return;
  let notice = document.querySelector('[data-access-notice]');
  if (!notice) {
    notice = document.createElement('aside'); notice.className='access-notice'; notice.dataset.accessNotice='';
    const status=document.createElement('p'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite'); status.setAttribute('aria-atomic','true');
    const close=document.createElement('button'); close.type='button'; close.onclick=()=>{notice.hidden=true;};
    notice.append(status,close); document.body.append(notice);
  }
  notice.querySelector('button').textContent=closeLabel(); notice.hidden=false;
  notice.querySelector('p').textContent=literal ? message : (messages[message] ? tr(...messages[message]) : message);
}
function setText(node, value) { if(node.textContent!==value)node.textContent=value; }
function hint(container, kind, value) {
  if (!container) return;
  let node=container.querySelector(`[data-access-hint="${kind}"]`);
  if (!node) { node=document.createElement('p'); node.dataset.accessHint=kind; node.className='access-hint'; container.append(node); }
  setText(node,value);
}
const imageSelector='.avatar img, [data-kind] img, .gacha-result img';
function applyContent() {
  if(!root)return;
  root.querySelectorAll('[data-fav]').forEach(button=>{
    const active=button.classList.contains('is-on');
    button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',tr(active?'Remover dos favoritos':'Adicionar aos favoritos',active?'Remove from favorites':'Add to favorites',active?'Quitar de favoritos':'Añadir a favoritos'));
    let status=button.querySelector('.access-favorite');
    if(!status){status=document.createElement('span');status.className='access-favorite';button.append(status);}
    setText(status,active?tr('✓ Favorito','✓ Favorite','✓ Favorito'):tr('☆ Salvar','☆ Save','☆ Guardar'));
  });
  root.querySelectorAll('.wiki-filters--characters').forEach(node=>hint(node,'plain',tr('Busque pelo nome. Use os filtros para reduzir os resultados.','Search by name. Use filters to narrow results.','Busca por nombre. Usa los filtros para reducir los resultados.')));
  root.querySelectorAll('.builder-echo-heading').forEach(node=>hint(node.parentElement,'plain',tr('Escolha um Echo. A soma dos custos deve ser até 12.','Choose an Echo. Total cost must be 12 or less.','Elige un Eco. El coste total debe ser de 12 o menos.')));
  root.querySelectorAll('.official-video').forEach(video=>{
    hint(video,'transcript',tr('Transcrição: abra este vídeo no YouTube e escolha “Mostrar transcrição”, se disponível. Este vídeo não tem transcrição local.','Transcript: open this video on YouTube and choose “Show transcript”, if available. This video has no local transcript.','Transcripción: abre este vídeo en YouTube y elige “Mostrar transcripción”, si está disponible. Este vídeo no tiene transcripción local.'));
    const link=video.querySelector('a[href*="youtube.com"]');
    if(link)link.setAttribute('aria-label',tr('Abrir vídeo no YouTube para consultar a transcrição','Open video on YouTube to access its transcript','Abrir vídeo en YouTube para consultar la transcripción'));
  });
  root.querySelectorAll(imageSelector).forEach(img=>{
    // A separate sibling control preserves the original card/link/selection action.
    const host=img.closest('a,button') || img.parentElement;
    let button=host.nextElementSibling;
    if(!button?.matches('[data-access-zoom]')) {
      if(!preferences.zoom)return;
      button=document.createElement('button');button.type='button';button.dataset.accessZoom='';button.className='access-zoom-button';host.after(button);
    }
    button.hidden=!preferences.zoom;
    button._image=img;
    setText(button,tr('Ampliar imagem','Zoom image','Ampliar imagen'));
    button.setAttribute('aria-label',button.textContent+': '+img.alt);
  });
  root.querySelectorAll('video').forEach(video=>{
    for(const track of video.textTracks)if(['captions','subtitles'].includes(track.kind))track.mode=preferences.captions?'showing':'disabled';
  });
}
export function applyAccessibility(app, lang) {
  root=app;language=lang;
  for(const name of Object.keys(defaults))if(name!=='color')document.documentElement.classList.toggle('access-'+name,preferences[name]);
  document.documentElement.dataset.accessColor=preferences.color;
  const notice=document.querySelector('[data-access-notice]');if(notice&&!preferences.visual)notice.hidden=true;
  let skip=document.querySelector('.access-skip');
  if(!skip){skip=document.createElement('a');skip.className='access-skip';skip.href='#wiki-content';document.body.prepend(skip);skip.onclick=()=>root.querySelector('main')?.focus();}
  setText(skip,tr('Ir para o conteúdo','Skip to content','Ir al contenido'));
  const main=root.querySelector('main');if(main){main.id='wiki-content';main.tabIndex=-1;}
  applyContent();
}
function modal(className, title, opener) {
  const dialog=document.createElement('dialog');dialog.className=className;dialog.setAttribute('aria-label',title);
  const header=document.createElement('header');const heading=document.createElement('h2');heading.textContent=title;
  const close=document.createElement('button');close.type='button';close.textContent=closeLabel();close.dataset.accessClose='';
  const finish=()=>{
    dialog.close();dialog.remove();
    const parentDialog=root?.querySelector('dialog[open]');
    const replacement=parentDialog ? [...parentDialog.querySelectorAll('[data-access-zoom]')].find(node=>node.getAttribute('aria-label')===opener?.getAttribute('aria-label')) || parentDialog.querySelector('button,input') : root?.querySelector('[data-settings-open]');
    (opener?.isConnected?opener:replacement)?.focus();
  };
  close.onclick=finish;dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
  dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish();}
  });
  header.append(heading,close);dialog.append(header);document.body.append(dialog);return dialog;
}
function syncSettings() {
  const dialog=document.querySelector('.settings-dialog');if(!dialog)return;
  dialog.querySelectorAll('[data-access-option]').forEach(input=>{if(input.tagName==='SELECT')input.value=preferences.color;else input.checked=preferences[input.dataset.accessOption];});
  dialog.querySelectorAll('[data-access-profile]').forEach(button=>button.setAttribute('aria-pressed',String(profiles[button.dataset.accessProfile].every(name=>preferences[name]))));
}
function save() {
  let saved=true;try{localStorage.setItem(KEY,JSON.stringify(preferences));}catch{saved=false;}
  applyAccessibility(root,language);syncSettings();
  const status=document.querySelector('[data-access-saved]');
  if(status)status.textContent=saved?tr('Preferências salvas neste navegador.','Preferences saved in this browser.','Preferencias guardadas en este navegador.'):tr('Não foi possível salvar. As opções continuam ativas nesta sessão.','Unable to save. Options remain active for this session.','No se pudo guardar. Las opciones siguen activas en esta sesión.');
}
function openSettings(opener) {
  if(document.querySelector('.settings-dialog'))return;
  const dialog=modal('settings-dialog',tr('Configurações','Settings','Configuración'),opener);
  const content=document.createElement('section');content.setAttribute('aria-labelledby','access-title');
  const option=name=>`<label class="access-option"><input type="checkbox" data-access-option="${name}"><span>${label(name)}</span></label>`;
  const group=(title,names)=>`<fieldset><legend>${title}</legend>${names.map(option).join('')}</fieldset>`;
  const profileNames=[tr('Modo Visual','Visual Mode','Modo Visual'),tr('Modo Audição','Hearing Mode','Modo Audición'),tr('Modo Navegação','Navigation Mode','Modo Navegación')];
  const profileDescriptions=[tr('Alto contraste + texto maior + interface ampliada','High contrast + larger text + larger interface','Alto contraste + texto e interfaz ampliados'),tr('Legendas + transcrições + avisos visuais','Captions + transcripts + visual notifications','Subtítulos + transcripciones + avisos visuales'),tr('Teclado + botões maiores + menos animações','Keyboard + larger buttons + less motion','Teclado + botones más grandes + menos animaciones')];
  content.innerHTML=`<h3 id="access-title">${tr('Acessibilidade','Accessibility','Accesibilidad')}</h3><p>${tr('Combine perfis ou ajuste cada recurso. Suas escolhas ficam salvas neste navegador.','Combine profiles or adjust each feature. Your choices are saved in this browser.','Combina perfiles o ajusta cada opción. Tus preferencias se guardan en este navegador.')}</p><div class="access-profiles">${Object.keys(profiles).map((name,i)=>`<button type="button" data-access-profile="${name}" aria-pressed="false"><strong>${profileNames[i]}</strong><span>${profileDescriptions[i]}</span></button>`).join('')}</div>
  ${group(tr('Audição','Hearing','Audición'),['captions','transcripts','visual'])}
  <p>${tr('Legendas dependem do vídeo e valem ao iniciar o próximo vídeo. Transcrições do YouTube são consultadas na fonte, quando disponíveis.','Captions depend on the video and apply when starting the next video. YouTube transcripts are accessed at the source when available.','Los subtítulos dependen del vídeo y se aplican al iniciar el siguiente. Las transcripciones de YouTube se consultan en la fuente cuando estén disponibles.')}</p>
  ${group(tr('Visão','Vision','Visión'),['text','interface','contrast','imageContrast','zoom','colorLabels'])}
  <fieldset><legend>${tr('Daltonismo','Color vision','Daltonismo')}</legend><label class="access-option"><span>${tr('Ajuste de cores','Color adjustment','Ajuste de colores')}</span><select data-access-option="color"><option value="none">${tr('Desativado','Off','Desactivado')}</option><option value="protanopia">Protanopia</option><option value="deuteranopia">Deuteranopia</option><option value="tritanopia">Tritanopia</option></select></label><p>${tr('Paletas alternativas para distinguir informações. Escolha a mais confortável; a percepção varia por pessoa.','Alternative palettes to distinguish information. Choose the most comfortable; perception varies by person.','Paletas alternativas para distinguir información. Elige la más cómoda; la percepción varía entre personas.')}</p></fieldset>
  ${group(tr('Navegação','Navigation','Navegación'),['keyboard','targets','focus'])}<p>${tr('Tab: navegar · Enter: selecionar · Esc: fechar. Ative os atalhos para usar Alt+1 (conteúdo), Alt+2 (busca) e Alt+3 (Configurações).','Tab: navigate · Enter: select · Esc: close. Enable shortcuts for Alt+1 (content), Alt+2 (search), Alt+3 (Settings).','Tab: navegar · Enter: seleccionar · Esc: cerrar. Activa los atajos Alt+1 (contenido), Alt+2 (búsqueda), Alt+3 (Configuración).')}</p>
  ${group(tr('Leitura e atenção','Reading and attention','Lectura y atención'),['simple','plain','motion'])}<button type="button" data-access-reset>${tr('Restaurar padrão','Reset to defaults','Restaurar valores predeterminados')}</button><p role="status" aria-live="polite" data-access-saved></p>`;
  dialog.append(content);syncSettings();dialog.showModal();
  dialog.addEventListener('change',event=>{
    const name=event.target.dataset.accessOption;if(!Object.hasOwn(defaults,name))return;
    preferences[name]=name==='color'?event.target.value:event.target.checked;save();
  });
  dialog.addEventListener('click',event=>{
    const profile=event.target.closest('[data-access-profile]');
    if(profile){const names=profiles[profile.dataset.accessProfile];const active=names.every(name=>preferences[name]);for(const name of names)preferences[name]=!active;save();}
    if(event.target.closest('[data-access-reset]')){preferences={...defaults};save();}
  });
}
function openImage(opener) {
  if(!preferences.zoom||!opener._image)return;
  const source=opener._image;
  const dialog=modal('access-image-dialog',source.alt||tr('Imagem','Image','Imagen'),opener);
  const label=document.createElement('label');label.textContent=tr('Zoom da imagem','Image zoom','Zoom de imagen');
  const slider=document.createElement('input');slider.type='range';slider.min='100';slider.max='300';slider.step='25';slider.value='100';
  const output=document.createElement('output');output.textContent='100%';label.append(slider,output);
  const viewport=document.createElement('div');viewport.className='access-image-viewport';viewport.tabIndex=0;
  const image=document.createElement('img');image.src=source.currentSrc||source.src;image.alt=source.alt;viewport.append(image);
  slider.oninput=()=>{image.style.width=slider.value+'%';output.textContent=slider.value+'%';};
  dialog.append(label,viewport);dialog.showModal();
}
document.addEventListener('click',event=>{
  const opener=event.target.closest('[data-settings-open]');if(opener)openSettings(opener);
  const zoom=event.target.closest('[data-access-zoom]');if(zoom){event.preventDefault();openImage(zoom);}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Enter' && event.target.matches('input[type=checkbox][data-access-option]')){event.preventDefault();event.target.click();}
  if(event.key==='Escape'&&!document.querySelector('dialog[open]')) {
    const toggle=root?.querySelector('[data-menu-toggle][aria-expanded=true]');
    if(toggle){toggle.click();toggle.focus();}
  }
  if(!preferences.keyboard||!event.altKey||event.ctrlKey||event.metaKey||document.querySelector('dialog[open]'))return;
  const target=event.code==='Digit1'?root?.querySelector('main'):event.code==='Digit2'?[...root.querySelectorAll('[data-global-search]')].find(node=>node.getClientRects().length):event.code==='Digit3'?root?.querySelector('[data-settings-open]'):null;
  if(target){event.preventDefault();if(event.code==='Digit3')target.click();else target.focus();}
});
window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null){preferences=readPreferences();if(root)applyAccessibility(root,language);syncSettings();}});
// Route panels, Builder dialogs and results can update without a full render.
let queued=false;
new MutationObserver(records=>{
  if(!root||queued||!records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&root.contains(node))))return;
  queued=true;queueMicrotask(()=>{queued=false;applyContent();});
}).observe(document.body,{childList:true,subtree:true});
