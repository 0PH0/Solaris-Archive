import fs from 'node:fs';
let s=fs.readFileSync('public/app.js','utf8');
let n=0;s=s.replaceAll('navBuilder: "Builder",',m=>{n++;return n===1?m:m+`\n    navGacha: "${n===2?'Convenes':'Convocatorias'}",`;});
s=s.replace('  { id: "builder",','  { id: "gacha", slug: "convocacoes", labelKey: "navGacha", nav: true },\n  { id: "builder",');
s=s.replace('routeBySlug.set("characters",','routeBySlug.set("gacha", routeById.get("gacha"));\nrouteBySlug.set("characters",');
s=s.replace('function renderRoute(routeId',`function gachaContext() {
  return {
    lang: state.lang, banners: activeConvenes(), escape: escapeHtml,
    imageUrl: conveneImageUrl, date: iso => formatEventDate(iso, "server"),
    time: iso => formatEventTime(iso, "server"), countdown: countdownLabel,
    loading: !dataRequests.convenesLoaded || Boolean(dataRequests.convenes), error: state.conveneError,
    featuredIcon: (name, type) => {
      const normalize = value => String(value).normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const item = (type === "weapon" ? weapons : characters).find(item => normalize(item.name) === normalize(name));
      return item ? item.iconUrl || item.imageUrl || (type === "weapon" ? itemAssetUrl("weapon", item) : characterAssetUrl(item.name)) : "";
    },
    root: routePanels.get(routeCacheKey()) || app, render,
    refresh: () => { loadConvenes({force: true}); scheduleRender(); }, notify: notifyAccessibility
  };
}

function renderRoute(routeId`);
s=s.replace('      case "builder":','      case "gacha":\n        return renderGacha(gachaContext());\n      case "builder":');
s=s.replaceAll('["home", "events"].includes', '["home", "events", "gacha"].includes');
s=s.replace('    case "builder":\n      return [base,','    case "gacha":\n      return [base, gacha.revision, Boolean(dataRequests.convenes), dataRequests.convenesLoaded, state.convenesUpdatedAt, collectionSignature(state.convenes), collectionSignature(characters, ["name", "imageUrl", "iconUrl"])].join("|");\n    case "builder":\n      return [base,');
s=s.replace('["home", "intro", "characters", "tier", "builder"].includes','["home", "intro", "characters", "tier", "builder", "gacha"].includes');
for(const event of ['click','change'])s=s.replace(`app.addEventListener("${event}", (event) => {`,`app.addEventListener("${event}", (event) => {\n  if (state.route === "gacha" && handleGacha(event, gachaContext())) return;`);
fs.writeFileSync('public/app.js',s);
fs.writeFileSync('public/index.html',fs.readFileSync('public/index.html','utf8').replaceAll('20260921-accessibility','20260921-gacha'));
