import {loadWeaponCatalog, loadWeaponDetail} from './weapon-catalog.js';
import {loadCharacterDetail, getCharacterDetail} from './character-catalog.js';
import {loadTierSnapshot, getTierSnapshot, selectTierEntries, tierCharacterKey, tierProfileSlug, TIER_ORDER, TIER_ROLES, TIER_SOURCE} from './tier-list.js';
import { readEchoCatalogCache, loadEchoCatalog, ECHO_CACHE_TTL } from "./echo-catalog.js";
import { settingsButton, applyAccessibility, notifyAccessibility, captionParameters, reducedMotion } from "./settings-accessibility.js";
const app = document.querySelector("#app");
let gacha = { revision: 0 };
let renderGacha = () => renderPageHero(t("navGacha"), state.lang === "en" ? "Loading…" : state.lang === "es" ? "Cargando…" : "Carregando…");
let handleGacha = () => false;
let isConvenePlaying = () => false;
let gachaModuleRequest, gachaModuleLoaded = false, gachaModuleError = false;
async function loadGachaModule() {
  if (gachaModuleLoaded || gachaModuleError || gachaModuleRequest) return gachaModuleRequest;
  gachaModuleRequest = import('./gacha.js').then(module => {
    ({ gacha, renderGacha, handleGacha, isConvenePlaying } = module);
    gachaModuleLoaded = true;
  }).catch(() => { gachaModuleError = true; }).finally(() => {
    gachaModuleRequest = null;
    scheduleRender();
  });
  return gachaModuleRequest;
}
let searchTimer;
function cancelPendingSearch() { clearTimeout(searchTimer); }
function queueSearch(input, update) {
  cancelPendingSearch();
  searchTimer = setTimeout(() => {
    if (input.isConnected && input.getClientRects().length) update();
  }, 160);
}
const DEFAULT_LANG = "pt-BR";
const SUPPORTED_LANGS = ["pt-BR", "en", "es"];
const label = (pt, en, es) => state.lang === 'en' ? en : state.lang === 'es' ? es : pt;
const CHARACTER_FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20320%20320%27%3E%3Crect%20width=%27320%27%20height=%27320%27%20fill=%27%2314171c%27/%3E%3Ccircle%20cx=%27160%27%20cy=%27150%27%20r=%2778%27%20fill=%27none%27%20stroke=%27%2341f1d5%27%20stroke-width=%2710%27%20opacity=%27.55%27/%3E%3Cpath%20d=%27M80%20250c25-45%20135-45%20160%200%27%20fill=%27none%27%20stroke=%27%23c7a45a%27%20stroke-width=%2712%27%20stroke-linecap=%27round%27%20opacity=%27.65%27/%3E%3C/svg%3E";
const EVENT_FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%201280%20720%27%3E%3Crect%20width=%271280%27%20height=%27720%27%20fill=%27%2314171c%27/%3E%3Cpath%20d=%27M190%20500c180-240%20520-300%20900-150%27%20fill=%27none%27%20stroke=%27%2341f1d5%27%20stroke-width=%2724%27%20opacity=%27.45%27/%3E%3Ccircle%20cx=%27940%27%20cy=%27230%27%20r=%27110%27%20fill=%27none%27%20stroke=%27%23c7a45a%27%20stroke-width=%2718%27%20opacity=%27.65%27/%3E%3Ctext%20x=%27640%27%20y=%27380%27%20text-anchor=%27middle%27%20font-family=%27Arial%27%20font-size=%2758%27%20font-weight=%27700%27%20fill=%27%23eef8f6%27%3EEvento%20WuWa%3C/text%3E%3C/svg%3E";
const ITEM_FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%20200%20200%27%3E%3Crect%20width=%27200%27%20height=%27200%27%20rx=%2728%27%20fill=%27%2314171c%27/%3E%3Cpath%20d=%27M52%20133L100%2037l48%2096H52z%27%20fill=%27none%27%20stroke=%27%23c7a45a%27%20stroke-width=%2710%27%20stroke-linejoin=%27round%27/%3E%3Ccircle%20cx=%27100%27%20cy=%27108%27%20r=%2730%27%20fill=%27none%27%20stroke=%27%2341f1d5%27%20stroke-width=%278%27/%3E%3C/svg%3E";
const WUWA_ASSET_BASE_URL = "https://raw.githubusercontent.com/ryanbenson/wuthering-waves-assets/master/images";
const WUWA_WEAPON_ASSET_BASE_URL = `${WUWA_ASSET_BASE_URL}/weapons`;
// Verified videos from https://www.youtube.com/@WutheringWaves.
// No player is rendered for characters without a confirmed official video.
const characterTrailers = {
  hsin: "a3zMk49qpwI",
  jinhsi: "0caRWqAQFMc",
  jiyan: "wnxtQsHOy1k",
  yinlin: "TImtNKeNk78",
  changli: "jYjxjy1l6Co",
  "the-shorekeeper": "FQEyNpQnK60",
  aemeath: "H8gGJgMvr9w",
  augusta: "w0CQyx13-EI",
  brant: "znvMDCFfnDo",
  camellya: "UNMERR4tets",
  cantarella: "aKOfEX8QkyA",
  carlotta: "wTUUln5M8vA",
  cartethyia: "optr9r9VkoQ",
  chisa: "7MsJ7mk8x5g",
  ciaccona: "G6P_AEmaQL8",
  denia: "rtMnPOV3DO8",
  encore: "u_hHNpp6qs0",
  galbrena: "7tFW4r7XYxk",
  hiyuki: "qUD2e2OS1zw",
  iuno: "hbF8kygJepE",
  jianxin: "CmsxifCqkPY",
  jingran: "djzijQBFN4A",
  lingyang: "ptSvUTfGmNI",
  lucilla: "LSzq1f6P_z4",
  lupa: "M3LygU8gCDg",
  "luuk-herssen": "gF7Ff_YbU0E",
  lynae: "PtwtqTqVB3o",
  mornye: "ziAGnHy-gUQ",
  phoebe: "h05YzRGOk2M",
  phrolova: "Hi1z3nFl0Ls",
  qingxiao: "mT86JXY6oEw",
  qiuyuan: "8o12Z2ejpBc",
  roccia: "UtY1jxPeKlQ",
  sigrika: "C_amj23Ucys",
  suisui: "c6njTc7ySiU",
  "xiangli-yao": "eTkkBkUvi0Q",
  "yangyang-xuanling": "GSmZaEASKjU",
  zani: "6tZfkFCz6qI",
  zhezhi: "GPaHYat18DI"
};
const characterAssetNameOverrides = {
  "the-shorekeeper": "Shorekeeper",
  "xiangli-yao": "XiangliYao",
  "luuk-herssen": "LuukHerssen",
  "yangyang-xuanling": "YangyangXuanling"
};
const itemAssetNameOverrides = {
  "gusts-of-welkin": "GustsofWelkin",
  "sun-sinking-eclipse": "SunSinkingEclipse"
};
const itemAssetExtensionOverrides = {
  "empyrean-anthem": "png",
  "gusts-of-welkin": "png",
  "midnight-veil": "png",
  "tidebreaking-courage": "png"
};
const copy = {
  "pt-BR": {
    navHome: "Home",
    navIntro: "Introdução",
    navCharacters: "Personagens",
    navTier: "Tier List",
    navEchoes: "Ecos",
    navWeapons: "Armas",
    navItems: "Itens",
    navGuide: "Guia",
    navCodes: "Codigos",
    navBuilder: "Builder",
    navGacha: "Convocações",
    navEvents: "Eventos",
    navNews: "Noticias",
    searchPlaceholder: "Buscar personagem, arma, eco...",
    database: "Base de dados",
    favorites: "Favoritos",
    characterSort: "Ordenar personagens",
    defaultOrder: "Ordem padrão",
    favoritesFirst: "Favoritos primeiro",
    liveNow: "Ao vivo",
    comingSoon: "Em breve",
    ended: "Encerrado",
    activeEvents: "Eventos ativos",
    currentConvenes: "Convocacoes atuais",
    emptyConvenes: "Nenhuma convocacao ativa no momento.",
    convenesUnavailable: "Não foi possível atualizar as convocações. Tentaremos novamente em instantes.",
    convenePageTitle: "Banners de personagem e arma",
    convenePageDesc: "Convocacoes sincronizadas em endpoint proprio, independentes dos eventos in-game.",
    categoryOverview: "Resumo por categoria",
    activeNow: "Ativos agora",
    nextEnd: "Proximo fim",
    noActiveItems: "Sem itens ativos",
    featuredItem: "Destaque",
    conveneType: "Tipo",
    updated: "Atualizado",
    mockNotice: "Dados demonstrativos prontos para plugar em fontes reais.",
    serverTime: "Servidor UTC+8",
    localTime: "Horario local",
    eventStartDate: "Data de inicio",
    eventStartTime: "Hora de inicio",
    eventEndDate: "Data de termino",
    eventEndTime: "Hora de termino",
    eventEndsIn: "Termina em",
    eventStartsIn: "Comeca em",
    details: "Detalhes",
    copyCode: "Copiar",
    copied: "Copiado",
    justNow: "agora",
    syncEvery: "Atualiza a cada",
    emptyEvents: "Nenhum evento ativo no momento.",
    all: "Todos",
    banners: "Convocacoes",
    inGame: "Eventos in-game",
    webEvents: "Eventos web",
    tower: "Torre da Adversidade",
    codes: "Codigos",
    damage: "Dano",
    support: "Suporte",
    exploration: "Exploracao",
    mainDps: "Dano Principal",
    subDps: "Sub-DPS",
    healer: "Suporte",
    controller: "Controle",
    back: "Voltar",
    rarity: "Raridade",
    element: "Elemento",
    weapon: "Arma",
    role: "Papel",
    recommendedBuild: "Build recomendada",
    statTargets: "Metas de status",
    statTargetsDesc: "Indicador sugerido para jogar esse personagem com boa consistencia.",
    priorityStats: "Prioridade",
    suggestedEnergy: "Recarga sugerida",
    targetReached: "Ok",
    targetMissing: "Ajustar",
    stats: "Stats",
    source: "Fonte",
    reward: "Recompensas",
    status: "Status",
    routeNotFound: "Pagina nao encontrada",
    routeNotFoundText: "A rota solicitada nao existe neste prototipo.",
    noAffiliation: "Projeto de fa nao afiliado, endossado ou publicado pela Kuro Games/Guangzhou Kuro Technology.",
    language: "Idioma",
    menu: "Menu",
    hideShowcase: "Fechar",
    showShowcase: "Mostrar",
    charactersHidden: "Personagens ocultos",
    search: "Pesquisa",
    searchButton: "Buscar",
    primaryActions: "Acoes principais",
    baseSummary: "Resumo da base",
    officialSite: "Site oficial",
    heroEyebrow: "Fan wiki PT-BR - i18n - eventos ao vivo",
    heroCopy: "Portal wiki de Wuthering Waves com builds, ecos, armas, codigos e agenda de eventos em uma unica base navegavel.",
    characterSearchPlaceholder: "Buscar por nome, elemento ou tag",
    characterFiltersLabel: "Filtros de personagens",
    noCharacterFoundTitle: "Nenhum personagem encontrado",
    noCharacterFoundText: "Tente mudar a pesquisa ou limpar algum filtro.",
    syncingCharacters: "Sincronizando personagens...",
    characterCount: "personagens",
    apiFallback: "API indisponivel, usando cache local",
    sourceLabel: "Fonte",
    updatedLabel: "Atualizado",
    pageCharactersDesc: "Lista de Resonators com papel, elemento, arma, builds e pagina individual.",
    pageTierDesc: "Avaliações por modo e função, com critérios claros e dados verificados da Prydwen.",
    pageEchoesDesc: "Sonatas, efeitos de conjunto e monstros de origem para planejar farm.",
    pageWeaponsDesc: "Armas por tipo, raridade, atributo secundario e usuarios recomendados.",
    pageItemsDesc: "Materiais de ascensao, fontes de farm e calendario semanal.",
    pageGuideTitle: "Guia do jogo",
    pageGuideDesc: "Mecanicas centrais, rotacoes e rotas de progressao.",
    pageCodesTitle: "Codigos de resgate",
    pageCodesDesc: "Lista com codigos ativos e expirados, recompensas e copia em um clique.",
    pageBuilderDesc: "Calculadora demonstrativa para comparar personagem, arma, eco e nivel.",
    pageEventsTitle: "Eventos atuais",
    pageEventsDesc: "Eventos ativos com banner oficial, periodo, horario e contagem regressiva em tempo real.",
    pageNewsDesc: "Feed de anuncios, patch notes e atualizacoes editoriais.",
    emptyNewsText: "Nenhuma noticia cadastrada no momento.",
    newsFeaturedTitle: "Destaque editorial",
    newsSummaryTitle: "Resumo do feed",
    newsArchiveTitle: "Arquivo",
    introPageTitle: "Introdução",
    introPageDesc: "Uma visao rapida sobre o proposito do Solaris Archive e sobre o universo de Wuthering Waves.",
    introPurposeTitle: "Uma wiki para consulta rapida",
    introPurposeText: "O Solaris Archive centraliza informacoes uteis para jogadores de Wuthering Waves: personagens, builds, ecos, armas, codigos, banners, eventos e guias essenciais. A ideia e reduzir o tempo procurando dados espalhados e deixar a tomada de decisao mais simples.",
    introObjectiveTitle: "Objetivo da Wiki",
    introObjectiveText: "Organizar dados de jogo em paginas claras, atualizaveis e faceis de navegar, com prioridade para legibilidade, filtros praticos e contexto suficiente para jogadores novos ou experientes.",
    introGameTitle: "Sobre Wuthering Waves",
    introGameText: "Wuthering Waves e um RPG de acao em mundo aberto desenvolvido pela Kuro Games. O jogador assume o papel de Rover, um protagonista sem memoria que viaja por Solaris-3 ao lado dos Resonators em busca de respostas e de um novo caminho para o mundo.",
    introLoreTitle: "Universo e historia",
    introLoreText: "Solaris-3 e um mundo marcado pelo Lament, uma serie de catastrofes que transformou civilizacoes, criaturas e as proprias leis do ambiente. A humanidade sobreviveu entre ruinas, tecnologia e ecos de um passado quebrado, enquanto novos conflitos e regioes revelam pouco a pouco os misterios por tras do desastre.",
    introResourcesTitle: "Recursos disponiveis",
    introResourcesText: "A Wiki oferece banco de personagens, tier list, ecos, armas, itens, codigos, builder de builds, guias e um hub de eventos com dados mockados prontos para integracao real.",
    introSummaryTitle: "Como usar",
    introSummaryText: "Use a busca inicial para encontrar rapidamente qualquer topico ou navegue pelas abas para comparar dados, acompanhar eventos e planejar builds.",
    showcaseKicker: "Resonators",
    showcaseTitle: "Showcase por papel de equipe",
    showcaseDesc: "Abas para comparar funcoes de dano, suporte, ataques coordenados e controle de campo.",
    tierPreviewTitle: "DPS meta atual",
    tierPreviewDesc: "DPS em destaque na Tower of Adversity. Referência: Prydwen, patch 3.7.",
    recentNewsTitle: "Patch notes e anuncios recentes",
    recentNewsDesc: "Cards de feed preparados para receber RSS, CDN do launcher ou CMS.",
    conveneSpotlightTitle: "Banners de Convene ativos",
    conveneSpotlightDesc: "Fonte separada de /api/events, com arte oficial, destaque, periodo e contagem regressiva.",
    redeemTitle: "Resgate em um clique",
    redeemDesc: "Lista com status ativo/expirado, recompensas e data de validade.",
    echoes: "Ecos",
    mainStats: "Stats principais",
    team: "Time",
    skills: "Habilidades",
    weaponAffinity: "Afinidade com armas",
    substat: "Substat",
    users: "Uso",
    type: "Tipo",
    days: "Dias",
    item: "Item",
    category: "Categoria",
    listedItems: "itens listados nesta categoria.",
    farmPriorities: "Prioridades de farm",
    farmPrioritiesDesc: "Uma visao rapida para organizar ascensao, boss mats, XP e moeda sem perder eficiencia semanal.",
    catalogedItems: "Itens catalogados",
    resourceTypes: "Tipos de recurso",
    universalUse: "Uso universal",
    limitedTime: "Tempo limitado",
    weeklyCalendar: "Calendario semanal",
    guideBasics: "Fundamentos essenciais",
    quickChecklist: "Checklist rapido",
    readings: "Leituras",
    detailedGuides: "Guias detalhados",
    detailedGuidesDesc: "Textos curtos para consulta rapida e para dar contexto ao portal como wiki.",
    term: "Termo",
    searchCharacter: "Buscar personagem",
    searchWeapon: "Buscar arma",
    searchEcho: "Buscar echo",
    builderEmpty: "Nada encontrado nesse filtro.",
    options: "opcoes",
    level: "Nivel",
  },
  en: {
    navHome: "Home",
    navIntro: "Introduction",
    navCharacters: "Characters",
    navTier: "Tier List",
    navEchoes: "Echoes",
    navWeapons: "Weapons",
    navItems: "Items",
    navGuide: "Guide",
    navCodes: "Codes",
    navBuilder: "Builder",
    navGacha: "Convenes",
    navEvents: "Events",
    navNews: "News",
    searchPlaceholder: "Search character, weapon, echo...",
    database: "Database",
    favorites: "Favorites",
    characterSort: "Sort characters",
    defaultOrder: "Default order",
    favoritesFirst: "Favorites first",
    liveNow: "Live",
    comingSoon: "Soon",
    ended: "Ended",
    activeEvents: "Active events",
    currentConvenes: "Current convenes",
    emptyConvenes: "No active convenes right now.",
    convenesUnavailable: "Unable to refresh convenes. We will retry shortly.",
    convenePageTitle: "Character and weapon banners",
    convenePageDesc: "Convenes synced from their own endpoint, independent from in-game events.",
    categoryOverview: "Category overview",
    activeNow: "Active now",
    nextEnd: "Next ending",
    noActiveItems: "No active items",
    featuredItem: "Featured",
    conveneType: "Type",
    updated: "Updated",
    mockNotice: "Demo data ready to connect to real sources.",
    serverTime: "Server UTC+8",
    localTime: "Local time",
    eventStartDate: "Start date",
    eventStartTime: "Start time",
    eventEndDate: "End date",
    eventEndTime: "End time",
    eventEndsIn: "Ends in",
    eventStartsIn: "Starts in",
    details: "Details",
    copyCode: "Copy",
    copied: "Copied",
    justNow: "now",
    syncEvery: "Updates every",
    emptyEvents: "No active events right now.",
    all: "All",
    banners: "Banners",
    inGame: "In-game",
    webEvents: "Web events",
    tower: "Tower of Adversity",
    codes: "Codes",
    damage: "Damage",
    support: "Support",
    exploration: "Exploration",
    mainDps: "Main DPS",
    subDps: "Sub-DPS",
    healer: "Support",
    controller: "Control",
    back: "Back",
    rarity: "Rarity",
    element: "Element",
    weapon: "Weapon",
    role: "Role",
    recommendedBuild: "Recommended build",
    statTargets: "Stat targets",
    statTargetsDesc: "Suggested indicator for playing this character with good consistency.",
    priorityStats: "Priority",
    suggestedEnergy: "Suggested Energy Regen",
    targetReached: "OK",
    targetMissing: "Tune",
    stats: "Stats",
    source: "Source",
    reward: "Rewards",
    status: "Status",
    routeNotFound: "Page not found",
    routeNotFoundText: "The requested route does not exist in this prototype.",
    noAffiliation: "Fan project not affiliated with, endorsed by, or published by Kuro Games/Guangzhou Kuro Technology.",
    language: "Language",
    menu: "Menu",
    hideShowcase: "Close",
    showShowcase: "Show",
    charactersHidden: "Characters hidden",
    search: "Search",
    searchButton: "Search",
    primaryActions: "Primary actions",
    baseSummary: "Database summary",
    officialSite: "Official site",
    heroEyebrow: "Fan wiki PT-BR - i18n - live events",
    heroCopy: "Wuthering Waves wiki portal with builds, echoes, weapons, codes, and event schedule in one browsable database.",
    characterSearchPlaceholder: "Search by name, element, or tag",
    characterFiltersLabel: "Character filters",
    noCharacterFoundTitle: "No character found",
    noCharacterFoundText: "Try changing the search or clearing a filter.",
    syncingCharacters: "Syncing characters...",
    characterCount: "characters",
    apiFallback: "API unavailable, using local cache",
    sourceLabel: "Source",
    updatedLabel: "Updated",
    pageCharactersDesc: "Resonator list with role, element, weapon, builds, and individual pages.",
    pageTierDesc: "Ratings by game mode and role, with clear criteria and verified Prydwen data.",
    pageEchoesDesc: "Sonatas, set effects, and source monsters for farming plans.",
    pageWeaponsDesc: "Weapons by type, rarity, secondary stat, and recommended users.",
    pageItemsDesc: "Ascension materials, farming sources, and weekly calendar.",
    pageGuideTitle: "Game guide",
    pageGuideDesc: "Core mechanics, rotations, and progression routes.",
    pageCodesTitle: "Redeem codes",
    pageCodesDesc: "Active and expired codes, rewards, and one-click copy.",
    pageBuilderDesc: "Demo calculator to compare character, weapon, echo, and level.",
    pageEventsTitle: "Current events",
    pageEventsDesc: "Active events with official banners, schedule, time, and live countdown.",
    pageNewsDesc: "Announcement feed, patch notes, and editorial updates.",
    emptyNewsText: "No news available right now.",
    newsFeaturedTitle: "Editorial spotlight",
    newsSummaryTitle: "Feed summary",
    newsArchiveTitle: "Archive",
    introPageTitle: "Introduction",
    introPageDesc: "A quick overview of the Solaris Archive purpose and the world of Wuthering Waves.",
    introPurposeTitle: "A wiki for quick reference",
    introPurposeText: "Solaris Archive centralizes useful Wuthering Waves information: characters, builds, echoes, weapons, codes, banners, events, and essential guides. The goal is to reduce scattered searching and make decisions easier.",
    introObjectiveTitle: "Wiki objective",
    introObjectiveText: "Organize game data into clear, maintainable, easy-to-browse pages with readable layouts, practical filters, and useful context for new and experienced players.",
    introGameTitle: "About Wuthering Waves",
    introGameText: "Wuthering Waves is an open-world action RPG by Kuro Games. Players take the role of Rover, an amnesiac protagonist travelling across Solaris-3 alongside Resonators while searching for answers and a future for the world.",
    introLoreTitle: "World and story",
    introLoreText: "Solaris-3 is shaped by the Lament, a series of catastrophes that changed civilizations, creatures, and the laws of the environment. Humanity survives among ruins, technology, and echoes of a broken past as new regions reveal the disaster's mysteries.",
    introResourcesTitle: "Available resources",
    introResourcesText: "The Wiki offers characters, tier list, echoes, weapons, items, codes, a build builder, guides, and an events hub with mock data ready for real integration.",
    introSummaryTitle: "How to use it",
    introSummaryText: "Use the home search to find topics quickly or browse the tabs to compare data, track events, and plan builds.",
    showcaseKicker: "Resonators",
    showcaseTitle: "Team-role showcase",
    showcaseDesc: "Tabs to compare damage, support, coordinated attacks, and field control roles.",
    tierPreviewTitle: "Current DPS meta",
    tierPreviewDesc: "Featured Tower of Adversity DPS. Reference: Prydwen, patch 3.7.",
    recentNewsTitle: "Recent patch notes and announcements",
    recentNewsDesc: "Feed cards ready to receive RSS, launcher CDN, or CMS data.",
    conveneSpotlightTitle: "Active Convene banners",
    conveneSpotlightDesc: "Separate source from /api/events, with official art, featured item, schedule, and countdown.",
    redeemTitle: "One-click redeem",
    redeemDesc: "List with active/expired status, rewards, and expiration date.",
    echoes: "Echoes",
    mainStats: "Main stats",
    team: "Team",
    skills: "Skills",
    weaponAffinity: "Weapon affinity",
    substat: "Substat",
    users: "Users",
    type: "Type",
    days: "Days",
    item: "Item",
    category: "Category",
    listedItems: "items listed in this category.",
    farmPriorities: "Farm priorities",
    farmPrioritiesDesc: "A quick view to organize ascension, boss mats, XP, and currency without wasting weekly efficiency.",
    catalogedItems: "Cataloged items",
    resourceTypes: "Resource types",
    universalUse: "Universal use",
    limitedTime: "Limited time",
    weeklyCalendar: "Weekly calendar",
    guideBasics: "Essential foundations",
    quickChecklist: "Quick checklist",
    readings: "Readings",
    detailedGuides: "Detailed guides",
    detailedGuidesDesc: "Short reference texts that give the portal more wiki context.",
    term: "Term",
    searchCharacter: "Search character",
    searchWeapon: "Search weapon",
    searchEcho: "Search echo",
    builderEmpty: "Nothing found with this filter.",
    options: "options",
    level: "Level",
  },
  es: {
    navHome: "Inicio",
    navIntro: "Introducción",
    navCharacters: "Personajes",
    navTier: "Tier List",
    navEchoes: "Ecos",
    navWeapons: "Armas",
    navItems: "Objetos",
    navGuide: "Guia",
    navCodes: "Codigos",
    navBuilder: "Builder",
    navGacha: "Convocatorias",
    navEvents: "Eventos",
    navNews: "Noticias",
    searchPlaceholder: "Buscar personaje, arma, eco...",
    database: "Base de datos",
    favorites: "Favoritos",
    characterSort: "Ordenar personajes",
    defaultOrder: "Orden predeterminado",
    favoritesFirst: "Favoritos primero",
    liveNow: "En vivo",
    comingSoon: "Pronto",
    ended: "Finalizado",
    activeEvents: "Eventos activos",
    currentConvenes: "Convocatorias actuales",
    emptyConvenes: "No hay convocatorias activas ahora.",
    convenesUnavailable: "No se pudieron actualizar las convocatorias. Lo intentaremos de nuevo en breve.",
    convenePageTitle: "Banners de personaje y arma",
    convenePageDesc: "Convocatorias sincronizadas desde su propio endpoint, independientes de los eventos in-game.",
    categoryOverview: "Resumen por categoria",
    activeNow: "Activos ahora",
    nextEnd: "Proximo final",
    noActiveItems: "Sin items activos",
    featuredItem: "Destacado",
    conveneType: "Tipo",
    updated: "Actualizado",
    mockNotice: "Datos demo listos para conectar fuentes reales.",
    serverTime: "Servidor UTC+8",
    localTime: "Hora local",
    eventStartDate: "Fecha de inicio",
    eventStartTime: "Hora de inicio",
    eventEndDate: "Fecha de fin",
    eventEndTime: "Hora de fin",
    eventEndsIn: "Termina en",
    eventStartsIn: "Empieza en",
    details: "Detalles",
    copyCode: "Copiar",
    copied: "Copiado",
    justNow: "ahora",
    syncEvery: "Actualiza cada",
    emptyEvents: "No hay eventos activos ahora.",
    all: "Todos",
    banners: "Convocatorias",
    inGame: "Eventos in-game",
    webEvents: "Eventos web",
    tower: "Torre de Adversidad",
    codes: "Codigos",
    damage: "Dano",
    support: "Soporte",
    exploration: "Exploracion",
    mainDps: "Dano principal",
    subDps: "Sub-DPS",
    healer: "Soporte",
    controller: "Control",
    back: "Volver",
    rarity: "Rareza",
    element: "Elemento",
    weapon: "Arma",
    role: "Rol",
    recommendedBuild: "Build recomendada",
    statTargets: "Metas de stats",
    statTargetsDesc: "Indicador sugerido para jugar este personaje con buena consistencia.",
    priorityStats: "Prioridad",
    suggestedEnergy: "Recarga sugerida",
    targetReached: "Ok",
    targetMissing: "Ajustar",
    stats: "Stats",
    source: "Fuente",
    reward: "Recompensas",
    status: "Estado",
    routeNotFound: "Pagina no encontrada",
    routeNotFoundText: "La ruta solicitada no existe en este prototipo.",
    noAffiliation: "Proyecto de fan no afiliado, respaldado ni publicado por Kuro Games/Guangzhou Kuro Technology.",
    language: "Idioma",
    menu: "Menu",
    hideShowcase: "Cerrar",
    showShowcase: "Mostrar",
    charactersHidden: "Personajes ocultos",
    search: "Busqueda",
    searchButton: "Buscar",
    primaryActions: "Acciones principales",
    baseSummary: "Resumen de la base",
    officialSite: "Sitio oficial",
    heroEyebrow: "Fan wiki PT-BR - i18n - eventos en vivo",
    heroCopy: "Portal wiki de Wuthering Waves con builds, ecos, armas, codigos y agenda de eventos en una sola base navegable.",
    characterSearchPlaceholder: "Buscar por nombre, elemento o etiqueta",
    characterFiltersLabel: "Filtros de personajes",
    noCharacterFoundTitle: "No se encontro ningun personaje",
    noCharacterFoundText: "Prueba cambiar la busqueda o limpiar algun filtro.",
    syncingCharacters: "Sincronizando personajes...",
    characterCount: "personajes",
    apiFallback: "API no disponible, usando cache local",
    sourceLabel: "Fuente",
    updatedLabel: "Actualizado",
    pageCharactersDesc: "Lista de Resonators con rol, elemento, arma, builds y pagina individual.",
    pageTierDesc: "Evaluaciones por modo y función, con criterios claros y datos verificados de Prydwen.",
    pageEchoesDesc: "Sonatas, efectos de conjunto y monstruos de origen para planear farmeo.",
    pageWeaponsDesc: "Armas por tipo, rareza, atributo secundario y usuarios recomendados.",
    pageItemsDesc: "Materiales de ascension, fuentes de farmeo y calendario semanal.",
    pageGuideTitle: "Guia del juego",
    pageGuideDesc: "Mecanicas centrales, rotaciones y rutas de progresion.",
    pageCodesTitle: "Codigos de canje",
    pageCodesDesc: "Codigos activos y expirados, recompensas y copia en un clic.",
    pageBuilderDesc: "Calculadora demo para comparar personaje, arma, eco y nivel.",
    pageEventsTitle: "Eventos actuales",
    pageEventsDesc: "Eventos activos con banner oficial, periodo, horario y cuenta regresiva en tiempo real.",
    pageNewsDesc: "Feed de anuncios, patch notes y actualizaciones editoriales.",
    emptyNewsText: "No hay noticias disponibles ahora.",
    newsFeaturedTitle: "Destacado editorial",
    newsSummaryTitle: "Resumen del feed",
    newsArchiveTitle: "Archivo",
    introPageTitle: "Introducción",
    introPageDesc: "Una vista rapida del proposito de Solaris Archive y del universo de Wuthering Waves.",
    introPurposeTitle: "Una wiki para consulta rapida",
    introPurposeText: "Solaris Archive centraliza informacion util de Wuthering Waves: personajes, builds, ecos, armas, codigos, banners, eventos y guias esenciales. El objetivo es reducir busquedas dispersas y facilitar decisiones.",
    introObjectiveTitle: "Objetivo de la Wiki",
    introObjectiveText: "Organizar datos del juego en paginas claras, actualizables y faciles de navegar, con prioridad en legibilidad, filtros practicos y contexto para jugadores nuevos o expertos.",
    introGameTitle: "Sobre Wuthering Waves",
    introGameText: "Wuthering Waves es un RPG de accion en mundo abierto de Kuro Games. El jugador asume el papel de Rover, protagonista sin memoria que viaja por Solaris-3 junto a Resonators en busca de respuestas y de un nuevo futuro.",
    introLoreTitle: "Universo e historia",
    introLoreText: "Solaris-3 es un mundo marcado por el Lament, una serie de catastrofes que transformo civilizaciones, criaturas y las leyes del ambiente. La humanidad sobrevive entre ruinas, tecnologia y ecos de un pasado roto mientras nuevas regiones revelan sus misterios.",
    introResourcesTitle: "Recursos disponibles",
    introResourcesText: "La Wiki ofrece personajes, tier list, ecos, armas, objetos, codigos, builder de builds, guias y un hub de eventos con datos mock listos para integracion real.",
    introSummaryTitle: "Como usar",
    introSummaryText: "Usa la busqueda inicial para encontrar temas rapidamente o navega por las pestanas para comparar datos, seguir eventos y planear builds.",
    showcaseKicker: "Resonators",
    showcaseTitle: "Showcase por rol de equipo",
    showcaseDesc: "Pestanas para comparar funciones de dano, soporte, ataques coordinados y control de campo.",
    tierPreviewTitle: "Meta DPS actual",
    tierPreviewDesc: "DPS destacados en Tower of Adversity. Referencia: Prydwen, parche 3.7.",
    recentNewsTitle: "Patch notes y anuncios recientes",
    recentNewsDesc: "Cards de feed preparados para recibir RSS, CDN del launcher o CMS.",
    conveneSpotlightTitle: "Banners de Convene activos",
    conveneSpotlightDesc: "Fuente separada de /api/events, con arte oficial, destacado, periodo y cuenta regresiva.",
    redeemTitle: "Canje en un clic",
    redeemDesc: "Lista con estado activo/expirado, recompensas y fecha de vencimiento.",
    echoes: "Ecos",
    mainStats: "Stats principales",
    team: "Equipo",
    skills: "Habilidades",
    weaponAffinity: "Afinidad con armas",
    substat: "Substat",
    users: "Uso",
    type: "Tipo",
    days: "Dias",
    item: "Item",
    category: "Categoria",
    listedItems: "items listados en esta categoria.",
    farmPriorities: "Prioridades de farmeo",
    farmPrioritiesDesc: "Una vista rapida para organizar ascension, boss mats, XP y moneda sin perder eficiencia semanal.",
    catalogedItems: "Items catalogados",
    resourceTypes: "Tipos de recurso",
    universalUse: "Uso universal",
    limitedTime: "Tiempo limitado",
    weeklyCalendar: "Calendario semanal",
    guideBasics: "Fundamentos esenciales",
    quickChecklist: "Checklist rapido",
    readings: "Lecturas",
    detailedGuides: "Guias detalladas",
    detailedGuidesDesc: "Textos cortos para consulta rapida y contexto de wiki.",
    term: "Termino",
    searchCharacter: "Buscar personaje",
    searchWeapon: "Buscar arma",
    searchEcho: "Buscar eco",
    builderEmpty: "Nada encontrado con este filtro.",
    options: "opciones",
    level: "Nivel",
  }
};

const routes = [
  { id: "home", slug: "", labelKey: "navHome", nav: true },
  { id: "intro", slug: "introducao", labelKey: "navIntro", nav: true },
  { id: "characters", slug: "personagens", labelKey: "navCharacters", nav: true },
  { id: "tier", slug: "tier-list", labelKey: "navTier", nav: true },
  { id: "echoes", slug: "ecos", labelKey: "navEchoes", nav: true },
  { id: "weapons", slug: "armas", labelKey: "navWeapons", nav: true },
  { id: "items", slug: "itens", labelKey: "navItems", nav: false },
  { id: "guide", slug: "guia", labelKey: "navGuide", nav: false },
  { id: "codes", slug: "codigos", labelKey: "navCodes", nav: false },
  { id: "gacha", slug: "convocacoes", labelKey: "navGacha", nav: true },
  { id: "builder", slug: "builder", labelKey: "navBuilder", nav: true },
  { id: "events", slug: "eventos", labelKey: "navEvents", nav: true },
  { id: "news", slug: "noticias", labelKey: "navNews", nav: false }
];

const routeBySlug = new Map(routes.map((route) => [route.slug, route]));
const routeById = new Map(routes.map((route) => [route.id, route]));
routeBySlug.set("gacha", routeById.get("gacha"));
routeBySlug.set("characters", routeById.get("characters"));

const roleLabels = {
  dps: "mainDps",
  sub: "subDps",
  support: "healer",
  control: "controller"
};

const categoryLabels = {
  all: "all",
  banner: "banners",
  evento_in_game: "inGame",
  evento_web: "webEvents",
  torre_adversidade: "tower",
  codigo: "codes"
};

const characters = [
  {
    slug: "jinhsi",
    name: "Jinhsi",
    rarity: 5,
    element: "Spectro",
    weapon: "Broadblade",
    role: "dps",
    tags: ["Burst", "Forte Circuit", "Spectro"],
    stats: { hp: 10825, atk: 438, def: 1258, crit: "24.2%" },
    build: {
      weapon: "Ages of Harvest",
      echoes: "Celestial Light 5p",
      mainStats: ["CRIT DMG", "Spectro DMG", "ATK%"],
      rotation: "Intro > Skill > Forte Circuit > Liberation > Swap cancel",
      team: ["Verina", "Yinlin", "Spectro Rover"]
    },
    skills: ["Eras in Unity", "Incarnation", "Purge of Light"],
    affinity: ["Ages of Harvest", "Verdant Summit", "Autumntrace"],
  },
  {
    slug: "jiyan",
    name: "Jiyan",
    rarity: 5,
    element: "Aero",
    weapon: "Broadblade",
    role: "dps",
    tags: ["Heavy Attack", "Liberation", "Aero"],
    stats: { hp: 10488, atk: 437, def: 1186, crit: "22.0%" },
    build: {
      weapon: "Verdant Summit",
      echoes: "Sierra Gale 5p",
      mainStats: ["CRIT Rate", "Aero DMG", "ATK%"],
      rotation: "Intro > Liberation > Heavy Attack chain > Skill",
      team: ["Mortefi", "Verina", "Aalto"]
    },
    skills: ["Qingloong at War", "Windborne Strike", "Emerald Storm"],
    affinity: ["Verdant Summit", "Ages of Harvest", "Broadblade of Night"],
  },
  {
    slug: "yinlin",
    name: "Yinlin",
    rarity: 5,
    element: "Electro",
    weapon: "Rectifier",
    role: "sub",
    tags: ["Coordinated Attack", "Electro", "Off-field"],
    stats: { hp: 11000, atk: 400, def: 1283, crit: "18.0%" },
    build: {
      weapon: "Stringmaster",
      echoes: "Void Thunder 5p",
      mainStats: ["CRIT Rate", "Electro DMG", "ATK%"],
      rotation: "Intro > Skill marks > Forte execution > Outro",
      team: ["Jinhsi", "Calcharo", "Verina"]
    },
    skills: ["Zapstring", "Magnetic Roar", "Thundering Wrath"],
    affinity: ["Stringmaster", "Cosmic Ripples", "Jinzhou Keeper"],
  },
  {
    slug: "verina",
    name: "Verina",
    rarity: 5,
    element: "Spectro",
    weapon: "Rectifier",
    role: "support",
    tags: ["Heal", "ATK Buff", "Revive"],
    stats: { hp: 14237, atk: 338, def: 1100, crit: "5.0%" },
    build: {
      weapon: "Variation",
      echoes: "Rejuvenating Glow 5p",
      mainStats: ["Healing Bonus", "Energy Regen", "ATK%"],
      rotation: "Intro > Skill > Liberation > Forte > Outro",
      team: ["Jinhsi", "Jiyan", "Encore"]
    },
    skills: ["Botany Experiment", "Arboreal Flourish", "Grace of Life"],
    affinity: ["Variation", "Comet Flare", "Rectifier of Voyage"],
  },
  {
    slug: "mortefi",
    name: "Mortefi",
    rarity: 4,
    element: "Fusion",
    weapon: "Pistols",
    role: "sub",
    tags: ["Coordinated Attack", "Heavy Buff", "Fusion"],
    stats: { hp: 10025, atk: 250, def: 1136, crit: "12.0%" },
    build: {
      weapon: "Static Mist",
      echoes: "Moonlit Clouds 5p",
      mainStats: ["CRIT Rate", "Fusion DMG", "Energy Regen"],
      rotation: "Intro > Skill > Liberation > Outro to heavy attacker",
      team: ["Jiyan", "Danjin", "Verina"]
    },
    skills: ["Impromptu Show", "Fury Fugue", "Dissonance"],
    affinity: ["Static Mist", "Thunderbolt", "Undying Flame"],
  },
  {
    slug: "sanhua",
    name: "Sanhua",
    rarity: 4,
    element: "Glacio",
    weapon: "Sword",
    role: "control",
    tags: ["Basic Attack Buff", "Burst", "Glacio"],
    stats: { hp: 10062, atk: 275, def: 941, crit: "12.0%" },
    build: {
      weapon: "Emerald of Genesis",
      echoes: "Freezing Frost 5p",
      mainStats: ["CRIT DMG", "Glacio DMG", "ATK%"],
      rotation: "Intro > Skill > Detonate ice > Liberation > Outro",
      team: ["Encore", "Lingyang", "Verina"]
    },
    skills: ["Frigid Light", "Eternal Frost", "Clarity of Mind"],
    affinity: ["Emerald of Genesis", "Lunar Cutter", "Sword of Night"],
  }
];

const elementEchoSet = {
  Aero: "Sierra Gale 5p",
  Electro: "Void Thunder 5p",
  Fusion: "Molten Rift 5p",
  Glacio: "Freezing Frost 5p",
  Havoc: "Sun-sinking Eclipse 5p",
  Spectro: "Celestial Light 5p"
};

const tierSourceLinks = [{label: "Prydwen", url: TIER_SOURCE}];

const statByRole = {
  dps: { hp: 10680, atk: 412, def: 1120, crit: "20.0%" },
  sub: { hp: 10320, atk: 360, def: 1160, crit: "16.0%" },
  support: { hp: 12600, atk: 318, def: 1210, crit: "8.0%" },
  control: { hp: 11240, atk: 340, def: 1185, crit: "12.0%" }
};

const signatureByWeapon = {
  Broadblade: "Lustrous Razor",
  Sword: "Emerald of Genesis",
  Pistols: "Static Mist",
  Gauntlets: "Abyss Surges",
  Rectifier: "Cosmic Ripples"
};

const compactCharacterData = [
  ["Aalto", 4, "Aero", "Pistols", "sub"],
  ["Aemeath", 5, "Fusion", "Sword", "dps"],
  ["Augusta", 5, "Electro", "Broadblade", "dps"],
  ["Baizhi", 4, "Glacio", "Rectifier", "support"],
  ["Brant", 5, "Fusion", "Sword", "dps"],
  ["Buling", 4, "Electro", "Gauntlets", "control"],
  ["Calcharo", 5, "Electro", "Broadblade", "dps"],
  ["Camellya", 5, "Havoc", "Sword", "dps"],
  ["Cantarella", 5, "Havoc", "Rectifier", "sub"],
  ["Carlotta", 5, "Glacio", "Pistols", "dps"],
  ["Cartethyia", 5, "Aero", "Sword", "dps"],
  ["Changli", 5, "Fusion", "Sword", "dps"],
  ["Chisa", 4, "Spectro", "Sword", "control"],
  ["Chixia", 4, "Fusion", "Pistols", "dps"],
  ["Ciaccona", 5, "Aero", "Pistols", "sub"],
  ["Danjin", 4, "Havoc", "Sword", "dps"],
  ["Denia", 4, "Fusion", "Broadblade", "sub"],
  ["Encore", 5, "Fusion", "Rectifier", "dps"],
  ["Galbrena", 5, "Havoc", "Pistols", "dps"],
  ["Hiyuki", 5, "Glacio", "Sword", "dps"],
  ["Hsin", 5, "Electro", "Rectifier", "dps"],
  ["Iuno", 5, "Aero", "Gauntlets", "dps"],
  ["Jianxin", 5, "Aero", "Gauntlets", "control"],
  ["Jingran", 5, "Fusion", "Sword", "dps"],
  ["Lingyang", 5, "Glacio", "Gauntlets", "dps"],
  ["Lucilla", 4, "Glacio", "Sword", "sub"],
  ["Lucy", 4, "Spectro", "Rectifier", "dps"],
  ["Lumi", 4, "Electro", "Broadblade", "sub"],
  ["Lupa", 5, "Fusion", "Broadblade", "dps"],
  ["Luuk Herssen", 5, "Spectro", "Gauntlets", "dps"],
  ["Lynae", 5, "Spectro", "Sword", "sub"],
  ["Mornye", 4, "Fusion", "Pistols", "support"],
  ["Phoebe", 5, "Spectro", "Rectifier", "dps"],
  ["Phrolova", 5, "Havoc", "Rectifier", "dps"],
  ["Qingxiao", 5, "Aero", "Sword", "dps"],
  ["Qiuyuan", 5, "Aero", "Sword", "sub"],
  ["Rebecca", 4, "Electro", "Rectifier", "sub"],
  ["Roccia", 5, "Havoc", "Gauntlets", "control"],
  ["Rover (Aero)", 5, "Aero", "Sword", "dps"],
  ["Rover (Electro)", 5, "Electro", "Sword", "dps"],
  ["Rover (Havoc)", 5, "Havoc", "Sword", "dps"],
  ["Rover (Spectro)", 5, "Spectro", "Sword", "dps"],
  ["Sigrika", 5, "Aero", "Gauntlets", "dps"],
  ["Suisui", 5, "Glacio", "Rectifier", "support"],
  ["Suoming", 5, "Spectro", "Rectifier", "support"],
  ["Taoqi", 4, "Havoc", "Broadblade", "support"],
  ["The Shorekeeper", 5, "Spectro", "Rectifier", "support"],
  ["Xiangli Yao", 5, "Electro", "Gauntlets", "dps"],
  ["Yangyang", 4, "Aero", "Sword", "control"],
  ["Yangyang Xuanling", 5, "Havoc", "Sword", "dps"],
  ["Youhu", 4, "Glacio", "Gauntlets", "support"],
  ["Yuanwu", 4, "Electro", "Gauntlets", "support"],
  ["Zani", 5, "Spectro", "Gauntlets", "dps"],
  ["Zhezhi", 5, "Glacio", "Rectifier", "sub"]
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function characterAssetFileName(name = "") {
  const slug = slugify(name);
  if (characterAssetNameOverrides[slug]) return characterAssetNameOverrides[slug];

  return String(name)
    .replace(/\([^)]*\)/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function characterAssetUrl(name = "") {
  if (slugify(name) === "rover") return "https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_4_UI.webp";
  const fileName = characterAssetFileName(name);
  return fileName ? `${WUWA_ASSET_BASE_URL}/${fileName}.png` : "";
}

function itemAssetFileName(item = {}) {
  if (itemAssetNameOverrides[item.slug]) return itemAssetNameOverrides[item.slug];

  return String(item.name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function itemAssetUrl(kind, item) {
  const fileName = itemAssetFileName(item);
  if (!fileName) return "";

  const extension = itemAssetExtensionOverrides[item.slug] || (kind === "weapon" ? "png" : "webp");

  return kind === "weapon"
    ? `${WUWA_WEAPON_ASSET_BASE_URL}/${fileName}.${extension}`
    : `${WUWA_ASSET_BASE_URL}/${fileName}.${extension}`;
}

function renderItemAssetImage(kind, item, className = "item-art") {
  const imageUrl = item.iconUrl || item.imageUrl || itemAssetUrl(kind, item);
  if (!imageUrl) return "";

  return `
    <div class="${className}" data-kind="${kind}">
      <img
        src="${escapeHtml(imageUrl)}"
        alt="${escapeHtml(item.name)}"
        loading="lazy"
        decoding="async"
        onerror="this.onerror=null;this.src='${ITEM_FALLBACK_IMAGE}';var p=this.parentElement;if(p)p.classList.add('is-fallback');"
      />
    </div>
  `;
}

function createCharacter([name, rarity, element, weapon, role]) {
  const baseStats = statByRole[role] || statByRole.dps;
  const roleTag = role === "dps" ? "Main DPS" : role === "sub" ? "Sub-DPS" : role === "support" ? "Support" : "Control";
  const assetUrl = characterAssetUrl(name);

  return {
    slug: slugify(name),
    name,
    rarity,
    element,
    weapon,
    role,
    tags: [roleTag, element, weapon],
    stats: { ...baseStats },
    build: {
      weapon: signatureByWeapon[weapon] || "Emerald of Genesis",
      echoes: elementEchoSet[element] || "Moonlit Clouds 5p",
      mainStats: role === "support" ? ["Healing/ATK", "Energy Regen", "ATK%"] : ["CRIT", `${element} DMG`, "ATK%"],
      rotation: "Intro > Skill > Forte Circuit > Liberation > Outro",
      team: role === "support" ? ["Carry principal", "Sub-DPS", name] : [name, "Sub-DPS", "Suporte"]
    },
    skills: ["Ataque basico", "Resonance Skill", "Resonance Liberation"],
    affinity: [signatureByWeapon[weapon] || "Emerald of Genesis", "Pioneer Podcast option", `${weapon} of Night`],
    imageUrl: assetUrl,
    portraitUrl: assetUrl,
    iconUrl: assetUrl
  };
}

function characterLookupKey(character) {
  return slugify(character.name || character.id || character.slug || "").replace(/-/g, "");
}

function inferRole(character) {
  if (character.weapon === "Rectifier" && ["Glacio", "Spectro"].includes(character.element)) return "support";
  if (character.weapon === "Rectifier") return "sub";
  if (character.weapon === "Gauntlets" && character.element === "Aero") return "control";
  return "dps";
}

function hydrateApiCharacter(apiCharacter, localCharacter) {
  const role = localCharacter?.role || inferRole(apiCharacter);
  const base = localCharacter || createCharacter([
    apiCharacter.name,
    apiCharacter.rarity || 4,
    apiCharacter.element,
    apiCharacter.weapon,
    role
  ]);
  const imageUrl = apiCharacter.imageUrl || base.imageUrl || characterAssetUrl(apiCharacter.name || apiCharacter.id);

  return {
    ...base,
    id: apiCharacter.id,
    slug: slugify(apiCharacter.name || apiCharacter.id),
    name: apiCharacter.name,
    originalName: apiCharacter.originalName,
    yomi: apiCharacter.yomi,
    rarity: apiCharacter.rarity || base.rarity,
    element: apiCharacter.element || base.element,
    weapon: apiCharacter.weapon || base.weapon,
    version: apiCharacter.version,
    imageUrl,
    portraitUrl: apiCharacter.portraitUrl || imageUrl,
    iconUrl: apiCharacter.iconUrl || imageUrl,
    sourceUrl: apiCharacter.sourceUrl,
    imageSourceUrl: apiCharacter.imageSourceUrl,
    encoreId: apiCharacter.encoreId,
    newRelease: apiCharacter.newRelease,
    signatureWeapon: apiCharacter.signatureWeapon || base.signatureWeapon,
    videoId: apiCharacter.videoId || base.videoId,
    apiOnly: Boolean(apiCharacter.useApiDetails) || (localCharacter?.apiOnly ?? !localCharacter),
    build: apiCharacter.signatureWeapon ? {...base.build, weapon: apiCharacter.signatureWeapon.name} : base.build,
    tags: [...new Set([...(base.tags || []), apiCharacter.element, apiCharacter.weapon, apiCharacter.version ? `v${apiCharacter.version}` : ""])]
      .filter(Boolean)
  };
}

const existingCharacterSlugs = new Set(characters.map((character) => character.slug));
characters.push(
  ...compactCharacterData
    .map(createCharacter)
    .filter((character) => !existingCharacterSlugs.has(character.slug))
);
characters.forEach((character) => {
  if (character.slug === 'hsin') {character.apiOnly = true; character.encoreId = 1311;}
  const assetUrl = character.imageUrl || characterAssetUrl(character.name);
  character.imageUrl = assetUrl;
  character.portraitUrl = character.portraitUrl || assetUrl;
  character.iconUrl = character.iconUrl || assetUrl;
});

const echoes = [
  {
    slug: "celestial-light",
    name: "Celestial Light",
    element: "Spectro",
    effect2: "Aumenta o dano Spectro em 10%.",
    effect5: "Apos Intro Skill, aumenta dano Spectro por uma janela curta.",
    sources: ["Mourning Aix", "Lightcrusher", "Whiff Whaff"],
    bestFor: ["Jinhsi", "Spectro Rover"]
  },
  {
    slug: "sierra-gale",
    name: "Sierra Gale",
    element: "Aero",
    effect2: "Aumenta o dano Aero em 10%.",
    effect5: "Apos Intro Skill, fortalece dano Aero e rotacoes de burst.",
    sources: ["Feilian Beringal", "Chaserazor", "Hoochief"],
    bestFor: ["Jiyan", "Aalto"]
  },
  {
    slug: "moonlit-clouds",
    name: "Moonlit Clouds",
    element: "Universal",
    effect2: "Aumenta Recarga de Energia.",
    effect5: "Apos Outro Skill, aumenta ATK do proximo personagem.",
    sources: ["Impermanence Heron", "Stonewall Bracer", "Flautist"],
    bestFor: ["Mortefi", "Sanhua", "Yinlin"]
  },
  {
    slug: "rejuvenating-glow",
    name: "Rejuvenating Glow",
    element: "Support",
    effect2: "Aumenta bonus de cura.",
    effect5: "Ao curar aliados, aumenta ATK do time temporariamente.",
    sources: ["Bell-Borne Geochelone", "Cruisewing", "Fission Junrock"],
    bestFor: ["Verina", "Baizhi"]
  },
  {
    slug: "void-thunder",
    name: "Void Thunder",
    element: "Electro",
    effect2: "Aumenta dano Electro em 10%.",
    effect5: "Apos Skill ou Heavy Attack, aumenta dano Electro.",
    sources: ["Tempest Mephis", "Thundering Mephis", "Violet-Feathered Heron"],
    bestFor: ["Yinlin", "Calcharo"]
  },
  {
    slug: "sun-sinking-eclipse",
    name: "Sun-sinking Eclipse",
    element: "Havoc",
    effect2: "Aumenta dano Havoc em 10%.",
    effect5: "Ataques basicos e pesados acumulam bonus Havoc.",
    sources: ["Crownless", "Dreamless", "Havoc Dreadmane"],
    bestFor: ["Danjin", "Havoc Rover"]
  }
];

const compactEchoData = [
  ["Molten Rift", "Fusion", "Aumenta dano Fusion.", "Ao usar Skill, melhora janelas de dano Fusion.", ["Inferno Rider", "Fusion Dreadmane", "Violet-Feathered Heron"], ["Changli", "Encore", "Brant"]],
  ["Freezing Frost", "Glacio", "Aumenta dano Glacio.", "Apos ataque basico ou pesado, melhora dano Glacio.", ["Lampylumen Myriad", "Glacio Predator", "Tambourinist"], ["Carlotta", "Lingyang", "Zhezhi"]],
  ["Lingering Tunes", "Universal", "Aumenta ATK.", "Mantem bonus de ATK em campo e fortalece o eco principal.", ["Mech Abomination", "Spearback", "Chasm Guardian"], ["Calcharo", "Encore", "Lumi"]],
  ["Empyrean Anthem", "Coordinated", "Aumenta Recarga de Energia.", "Fortalece ataques coordenados e dano fora de campo.", ["Nightmare Impermanence Heron", "Flautist", "Traffic Illuminator"], ["Yinlin", "Mortefi", "Zhezhi"]],
  ["Midnight Veil", "Havoc", "Aumenta dano Havoc.", "Ao aplicar Outro, fortalece dano Havoc do time.", ["Nightmare Crownless", "Dreamless", "Havoc Warrior"], ["Camellya", "Phrolova", "Danjin"]],
  ["Frosty Resolve", "Glacio", "Aumenta dano de Skill.", "Alternativa compacta para carries Glacio e rotacoes curtas.", ["Lampylumen Myriad", "Roseshroom", "Chirpuff"], ["Hiyuki", "Carlotta"]],
  ["Tidebreaking Courage", "Aero", "Aumenta dano Aero.", "Recompensa janelas agressivas apos Intro e Liberation.", ["Nightmare Feilian Beringal", "Hoochief", "Chaserazor"], ["Cartethyia", "Qingxiao", "Jiyan"]],
  ["Gusts of Welkin", "Aero", "Aumenta dano de coordenação.", "Ajuda suportes Aero a manter buffs e troca rapida.", ["Cyan-Feathered Heron", "Aero Predator", "Whiff Whaff"], ["Ciaccona", "Aalto", "Yangyang"]]
];

const existingEchoSlugs = new Set(echoes.map((echo) => echo.slug));
echoes.push(
  ...compactEchoData
    .map(([name, element, effect2, effect5, sources, bestFor]) => ({
      slug: slugify(name),
      name,
      element,
      effect2,
      effect5,
      sources,
      bestFor
    }))
    .filter((echo) => !existingEchoSlugs.has(echo.slug))
);


// Keep the Builder catalog independent of the Wiki's recommendation lists.
const cachedEchoCatalog = readEchoCatalogCache();
let builderEchoes = cachedEchoCatalog?.echoes || [];
let builderSonatas = cachedEchoCatalog?.sets || [];
let builderCatalogLoaded = false;
let builderCatalogLoading = false;
let builderCatalogError = false;
let builderCatalogExpiresAt = 0;

async function loadBuilderEchoes() {
  if (builderCatalogLoading) return;
  builderCatalogLoading = true;
  builderCatalogError = false;
  notifyAccessibility('loading');
  scheduleRender();
  try {
    const catalog = await loadEchoCatalog();
    const restore = !builderEchoes.length;
    builderEchoes = catalog.echoes;
    builderSonatas = catalog.sets;
    builderCatalogError = Boolean(catalog.stale);
    builderCatalogExpiresAt = catalog.stale ? Date.now() + 60000 : catalog.updatedAt + ECHO_CACHE_TTL;
    if (restore) {
      state.builder = readBuilder();
      state.builderMessage = builderRestored ? "restored" : "";
    }
    if (builderUI.kind === "echo") updateBuilderPicker("echo");
  } catch { builderCatalogError = true; builderCatalogExpiresAt = Date.now() + 60000; }
  finally {
    builderCatalogLoading = false;
    builderCatalogLoaded = true;
    notifyAccessibility(builderCatalogError ? 'loadError' : 'loaded');
    scheduleRender();
  }
}

const builderStats = {
  hpPercent: "HP %", hp: "HP", atkPercent: "ATK %", atk: "ATK", defPercent: "DEF %", def: "DEF",
  critRate: "CRIT Rate %", critDamage: "CRIT DMG %", energy: "Energy Regen %", healing: "Healing Bonus %",
  aero: "Aero DMG %", glacio: "Glacio DMG %", electro: "Electro DMG %", fusion: "Fusion DMG %", havoc: "Havoc DMG %", spectro: "Spectro DMG %",
  basic: "Basic Attack %", heavy: "Heavy Attack %", skill: "Resonance Skill %", liberation: "Liberation %"
};
const builderMainStats = {
  1: ["hpPercent", "atkPercent", "defPercent"],
  3: ["hpPercent", "atkPercent", "defPercent", "energy", "aero", "glacio", "electro", "fusion", "havoc", "spectro"],
  4: ["hpPercent", "atkPercent", "defPercent", "critRate", "critDamage", "healing"]
};
const builderSubStats = ["hpPercent", "hp", "atkPercent", "atk", "defPercent", "def", "critRate", "critDamage", "energy", "basic", "heavy", "skill", "liberation"];
const builderText = {
  "pt-BR": {
    title: "Monte sua próxima build.", description: "Um personagem. Cinco Echoes. Cada detalhe no seu lugar.",
    catalogLoading: "Carregando catálogo de Echoes…", catalogError: "Não foi possível carregar os Echoes. Sua build salva foi preservada.", catalogStale: "Exibindo o catálogo em cache. Não foi possível atualizar agora.", retry: "Tentar novamente",
    restored: "Build salva recuperada", makeMain: "Tornar principal",
    setup: "Configuração", equipment: "Personagem & arma", change: "Trocar", select: "Selecionar", close: "Fechar",
    echoLoadout: "Seus cinco Echoes", echoHint: "O primeiro Echo é o principal. Combine os custos dentro do limite de 12.",
    main: "Principal", cost: "Custo", totalCost: "Custo total", equipped: "equipados", empty: "Adicionar Echo", remove: "Remover Echo",
    mainStat: "Atributo principal", secondary: "Atributo fixo", substats: "Subatributos", value: "Valor", set: "Sonata",
    bonuses: "Bônus dos Echoes", bonusesHint: "Soma dos valores preenchidos. Não inclui atributos base, arma ou efeitos condicionais de Sonata.",
    setTitle: "Combinações de Sonata", setHint: "Conjuntos do catálogo. Echoes repetidos contam uma vez por conjunto.", noSets: "Equipe Echoes para acompanhar os conjuntos.",
    name: "Nome da build", namePlaceholder: "Minha build de Jinhsi", save: "Salvar build", saved: "Salva neste navegador", unsaved: "Alterações não salvas", saveError: "Não foi possível salvar neste navegador",
    reset: "Recomeçar", resetPrompt: "Limpar a build atual? A versão salva permanece disponível até você salvar novamente.",
    level: "Nível", rank: "Sintonia", available: "disponíveis", capacity: "Limite de custo", slots: "Posições", selected: "Selecionado",
    detailHint: "Preencha os valores exibidos no jogo. O nível não calcula atributos automaticamente.", catalog: "Referência do catálogo", weaponAtk: "ATK base no catálogo", locked: "Disponível no nível", noEcho: "Escolha um Echo para editar seus atributos.",
    filter: "Filtrar", preview: "Resumo da build", pieces: "peças", skillPlan: "Prioridade de atributos"
  },
  en: {
    title: "Build your next adventure.", description: "One resonator. Five Echoes. Every detail in its place.", setup: "Setup", equipment: "Resonator & weapon", change: "Change", select: "Select", close: "Close",
    catalogLoading: "Loading Echo catalog…", catalogError: "Unable to load Echoes. Your saved build is preserved.", catalogStale: "Showing cached catalog. Unable to refresh right now.", retry: "Retry",
    restored: "Saved build restored", makeMain: "Set as main",
    echoLoadout: "Your five Echoes", echoHint: "The first Echo is your main. Keep the combined cost within 12.", main: "Main", cost: "Cost", totalCost: "Total cost", equipped: "equipped", empty: "Add Echo", remove: "Remove Echo",
    mainStat: "Main attribute", secondary: "Fixed attribute", substats: "Substats", value: "Value", set: "Sonata", bonuses: "Echo bonuses", bonusesHint: "Sum of entered values. Excludes base stats, weapon and conditional Sonata effects.", setTitle: "Sonata combinations", setHint: "Catalog sets. Repeated Echoes count once per set.", noSets: "Equip Echoes to track your sets.",
    name: "Build name", namePlaceholder: "My Jinhsi build", save: "Save build", saved: "Saved in this browser", unsaved: "Unsaved changes", saveError: "Unable to save in this browser", reset: "Start over", resetPrompt: "Clear this build? The saved version stays available until you save again.", level: "Level", rank: "Syntonization", available: "available", capacity: "Cost limit", slots: "Slots", selected: "Selected", detailHint: "Enter the values shown in game. Level does not calculate attributes automatically.", catalog: "Catalog reference", weaponAtk: "Catalog base ATK", locked: "Available at level", noEcho: "Select an Echo to edit its attributes.", filter: "Filter", preview: "Build overview", pieces: "pieces", skillPlan: "Attribute priority"
  },
  es: {
    title: "Prepara tu próxima build.", description: "Un personaje. Cinco Ecos. Cada detalle en su lugar.", setup: "Configuración", equipment: "Personaje y arma", change: "Cambiar", select: "Seleccionar", close: "Cerrar",
    catalogLoading: "Cargando catálogo de Ecos…", catalogError: "No se pudieron cargar los Ecos. Tu build guardada se conserva.", catalogStale: "Mostrando catálogo en caché. No se pudo actualizar.", retry: "Reintentar",
    restored: "Build guardada recuperada", makeMain: "Usar como principal",
    echoLoadout: "Tus cinco Ecos", echoHint: "El primer Eco es el principal. Mantén el coste total dentro de 12.", main: "Principal", cost: "Coste", totalCost: "Coste total", equipped: "equipados", empty: "Añadir Eco", remove: "Quitar Eco",
    mainStat: "Atributo principal", secondary: "Atributo fijo", substats: "Subatributos", value: "Valor", set: "Sonata", bonuses: "Bonificaciones de Ecos", bonusesHint: "Suma de los valores introducidos. No incluye atributos base, arma o efectos condicionales de Sonata.", setTitle: "Combinaciones de Sonata", setHint: "Conjuntos del catálogo. Ecos repetidos cuentan una vez por conjunto.", noSets: "Equipa Ecos para ver los conjuntos.",
    name: "Nombre de la build", namePlaceholder: "Mi build de Jinhsi", save: "Guardar build", saved: "Guardada en este navegador", unsaved: "Cambios sin guardar", saveError: "No se pudo guardar en este navegador", reset: "Reiniciar", resetPrompt: "¿Limpiar la build actual? La versión guardada permanece hasta que vuelvas a guardar.", level: "Nivel", rank: "Sintonía", available: "disponibles", capacity: "Límite de coste", slots: "Posiciones", selected: "Seleccionado", detailHint: "Introduce los valores del juego. El nivel no calcula atributos automáticamente.", catalog: "Referencia del catálogo", weaponAtk: "ATK base del catálogo", locked: "Disponible al nivel", noEcho: "Selecciona un Eco para editar sus atributos.", filter: "Filtrar", preview: "Resumen de la build", pieces: "piezas", skillPlan: "Prioridad de atributos"
  }
};
function bt(key) { return builderText[state.lang]?.[key] || builderText["pt-BR"][key] || key; }
function emptyBuilderEcho() { return { slug: "", set: "", level: 0, mainStat: "", mainValue: 0, secondaryValue: 0, substats: Array.from({ length: 5 }, () => ({ stat: "", value: 0 })) }; }
function defaultBuilder() { return { version: 1, name: "", character: "jinhsi", weapon: "ages-of-harvest", level: 90, weaponLevel: 90, rank: 1, echoes: Array.from({ length: 5 }, emptyBuilderEcho) }; }
function builderNumber(value, max = 99999, min = 0) { const number = Number(value); return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min; }
let builderRestored = false;
function readBuilder() {
  const build = defaultBuilder();
  try {
    const saved = JSON.parse(localStorage.getItem("solaris:builder:v1") || "null");
    if (!saved || saved.version !== 1) return build;
    build.name = typeof saved.name === "string" ? saved.name.slice(0, 80) : "";
    if (typeof saved.character === "string" && /^[a-z0-9-]+$/.test(saved.character)) build.character = saved.character;
    if (typeof saved.weapon === 'string' && saved.weapon.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(saved.weapon)) build.weapon = saved.weapon;
    build.level = Math.trunc(builderNumber(saved.level, 90, 1));
    build.weaponLevel = Math.trunc(builderNumber(saved.weaponLevel, 90, 1));
    build.rank = Math.trunc(builderNumber(saved.rank, 5, 1));
    let cost = 0;
    build.echoes = build.echoes.map((slot, index) => {
      const raw = saved.echoes?.[index];
      const item = builderEchoes.find((e) => e.slug === raw?.slug);
      if (!item || cost + item.cost > 12) return slot;
      cost += item.cost;
      slot.slug = item.slug;
      slot.set = item.sets.includes(raw.set) ? raw.set : item.sets[0];
      slot.level = Math.trunc(builderNumber(raw.level, 25));
      slot.mainStat = builderMainStats[item.cost].includes(raw.mainStat) ? raw.mainStat : "";
      slot.mainValue = slot.mainStat ? builderNumber(raw.mainValue) : 0;
      slot.secondaryValue = builderNumber(raw.secondaryValue);
      const used = new Set();
      slot.substats = slot.substats.map((sub, i) => {
        const value = raw.substats?.[i];
        if (builderSubStats.includes(value?.stat) && !used.has(value.stat)) {
          used.add(value.stat); return { stat: value.stat, value: builderNumber(value.value) };
        }
        return sub;
      });
      return slot;
    });
    builderRestored = true;
  } catch { /* Invalid or unavailable storage leaves a usable empty build. */ }
  return build;
}
const builderUI = { kind: "", slot: 0, opener: null };

const weapons = [
  {
    slug: "ages-of-harvest",
    name: "Ages of Harvest",
    type: "Broadblade",
    rarity: 5,
    baseAtk: 587,
    stat: "CRIT Rate",
    passive: "Amplifica dano de Skill e janelas de burst.",
    recommended: ["Jinhsi"]
  },
  {
    slug: "verdant-summit",
    name: "Verdant Summit",
    type: "Broadblade",
    rarity: 5,
    baseAtk: 587,
    stat: "CRIT DMG",
    passive: "Fortalece Heavy Attack e dano apos Liberation.",
    recommended: ["Jiyan"]
  },
  {
    slug: "stringmaster",
    name: "Stringmaster",
    type: "Rectifier",
    rarity: 5,
    baseAtk: 500,
    stat: "CRIT Rate",
    passive: "Aumenta dano elemental e ATK apos Skill.",
    recommended: ["Yinlin", "Encore"]
  },
  {
    slug: "static-mist",
    name: "Static Mist",
    type: "Pistols",
    rarity: 5,
    baseAtk: 588,
    stat: "CRIT Rate",
    passive: "Gera energia e fortalece o proximo personagem.",
    recommended: ["Mortefi"]
  },
  {
    slug: "variation",
    name: "Variation",
    type: "Rectifier",
    rarity: 4,
    baseAtk: 337,
    stat: "Energy Regen",
    passive: "Restaura energia de concerto apos Skill.",
    recommended: ["Verina", "Baizhi"]
  },
  {
    slug: "emerald-of-genesis",
    name: "Emerald of Genesis",
    type: "Sword",
    rarity: 5,
    baseAtk: 587,
    stat: "CRIT Rate",
    passive: "Aumenta Recarga de Energia e ATK apos Skill.",
    recommended: ["Sanhua", "Rover"]
  }
];

const compactWeaponData = [
  ["Lustrous Razor", "Broadblade", 5, 588, "ATK", ["Calcharo", "Lupa"]],
  ["Abyss Surges", "Gauntlets", 5, 588, "ATK", ["Xiangli Yao", "Jianxin"]],
  ["Cosmic Ripples", "Rectifier", 5, 500, "ATK", ["Encore", "Phoebe"]],
  ["Blazing Brilliance", "Sword", 5, 588, "CRIT DMG", ["Changli", "Camellya"]],
  ["Blazing Justice", "Gauntlets", 5, 588, "CRIT DMG", ["Zani", "Hiyuki"]],
  ["Azure Oath", "Sword", 5, 588, "CRIT Rate", ["Cartethyia", "Qiuyuan"]],
  ["Defier's Thorn", "Sword", 5, 588, "HP", ["Brant", "Taoqi"]],
  ["Emerald Sentence", "Sword", 5, 588, "CRIT Rate", ["Lynae", "Rover"]],
  ["Daybreaker's Spine", "Gauntlets", 5, 588, "CRIT Rate", ["Xiangli Yao", "Zani"]],
  ["Everbright Polestar", "Broadblade", 5, 588, "CRIT Rate", ["Augusta", "Jinhsi"]],
  ["Boson Astrolabe", "Rectifier", 5, 525, "Energy Regen", ["The Shorekeeper", "Suisui"]],
  ["Whispers of Sirens", "Rectifier", 5, 500, "CRIT Rate", ["Cantarella", "Phrolova"]],
  ["Rime-Draped Sprouts", "Rectifier", 5, 500, "CRIT DMG", ["Zhezhi", "Carlotta"]],
  ["Verity's Handle", "Gauntlets", 5, 588, "CRIT Rate", ["Xiangli Yao"]],
  ["Red Spring", "Sword", 5, 588, "CRIT Rate", ["Camellya"]],
  ["Stellar Symphony", "Rectifier", 5, 413, "Energy Regen", ["The Shorekeeper", "Verina"]],
  ["Unflickering Valor", "Broadblade", 5, 588, "CRIT Rate", ["Jinhsi", "Calcharo"]],
  ["Bloodpact's Pledge", "Sword", 5, 588, "Energy Regen", ["Brant", "Sanhua"]],
  ["Thunderflare Dominion", "Broadblade", 5, 588, "CRIT DMG", ["Lupa", "Augusta"]],
  ["Aureate Zenith", "Gauntlets", 5, 588, "CRIT Rate", ["Zani", "Jianxin"]],
  ["Discord", "Broadblade", 4, 338, "Energy Regen", ["Taoqi", "Lumi"]],
  ["Scale: Slasher", "Sword", 4, 338, "Energy Regen", ["Yangyang", "Sanhua"]],
  ["Cadenza", "Pistols", 4, 338, "Energy Regen", ["Aalto", "Mortefi"]],
  ["Marcato", "Gauntlets", 4, 338, "Energy Regen", ["Yuanwu", "Youhu"]],
  ["Broadblade of Night", "Broadblade", 3, 325, "ATK", ["Calcharo"]],
  ["Sword of Night", "Sword", 3, 325, "ATK", ["Rover", "Danjin"]],
  ["Pistols of Night", "Pistols", 3, 325, "ATK", ["Chixia"]],
  ["Gauntlets of Night", "Gauntlets", 3, 325, "ATK", ["Lingyang"]],
  ["Rectifier of Night", "Rectifier", 3, 325, "ATK", ["Baizhi"]],
  ["Tyro Broadblade", "Broadblade", 2, 275, "ATK", ["Todos"]],
  ["Tyro Sword", "Sword", 2, 275, "ATK", ["Todos"]],
  ["Tyro Pistols", "Pistols", 2, 275, "ATK", ["Todos"]],
  ["Tyro Gauntlets", "Gauntlets", 2, 275, "ATK", ["Todos"]],
  ["Tyro Rectifier", "Rectifier", 2, 275, "ATK", ["Todos"]],
  ["Training Broadblade", "Broadblade", 1, 250, "ATK", ["Todos"]],
  ["Training Sword", "Sword", 1, 250, "ATK", ["Todos"]],
  ["Training Pistols", "Pistols", 1, 250, "ATK", ["Todos"]],
  ["Training Gauntlets", "Gauntlets", 1, 250, "ATK", ["Todos"]],
  ["Training Rectifier", "Rectifier", 1, 250, "ATK", ["Todos"]],
  ["Originite: Type I", "Broadblade", 3, 300, "DEF", ["Taoqi"]],
  ["Originite: Type II", "Sword", 3, 325, "ATK", ["Rover"]],
  ["Originite: Type III", "Pistols", 3, 325, "ATK", ["Chixia"]],
  ["Originite: Type IV", "Gauntlets", 3, 300, "CRIT DMG", ["Lingyang"]],
  ["Originite: Type V", "Rectifier", 3, 300, "HP", ["Baizhi"]],
  ["Broadblade#41", "Broadblade", 4, 413, "Energy Regen", ["Lumi", "Taoqi"]],
  ["Sword#18", "Sword", 4, 388, "ATK", ["Sanhua", "Yangyang"]],
  ["Pistols#26", "Pistols", 4, 388, "ATK", ["Mortefi", "Aalto"]],
  ["Gauntlets#21D", "Gauntlets", 4, 388, "Energy Regen", ["Yuanwu", "Jianxin"]],
  ["Rectifier#25", "Rectifier", 4, 338, "Energy Regen", ["Baizhi", "Verina"]],
  ["Dauntless Evernight", "Broadblade", 4, 338, "DEF", ["Taoqi"]],
  ["Commando of Conviction", "Sword", 4, 413, "ATK", ["Danjin", "Sanhua"]],
  ["Undying Flame", "Pistols", 4, 413, "ATK", ["Mortefi", "Chixia"]],
  ["Amity Accord", "Gauntlets", 4, 338, "DEF", ["Yuanwu"]],
  ["Jinzhou Keeper", "Rectifier", 4, 388, "ATK", ["Encore", "Yinlin"]],
  ["Broadblade of Voyager", "Broadblade", 3, 300, "Energy Regen", ["Todos"]],
  ["Sword of Voyager", "Sword", 3, 300, "Energy Regen", ["Todos"]],
  ["Pistols of Voyager", "Pistols", 3, 300, "ATK", ["Todos"]],
  ["Gauntlets of Voyager", "Gauntlets", 3, 325, "DEF", ["Todos"]],
  ["Rectifier of Voyager", "Rectifier", 3, 300, "Energy Regen", ["Todos"]],
  ["Guardian Broadblade", "Broadblade", 3, 325, "ATK", ["Todos"]],
  ["Guardian Sword", "Sword", 3, 300, "HP", ["Todos"]],
  ["Guardian Pistols", "Pistols", 3, 300, "ATK", ["Todos"]],
  ["Guardian Gauntlets", "Gauntlets", 3, 300, "DEF", ["Todos"]],
  ["Guardian Rectifier", "Rectifier", 3, 325, "ATK", ["Todos"]],
  ["Helios Cleaver", "Broadblade", 4, 413, "ATK", ["Jiyan", "Calcharo"]],
  ["Lunar Cutter", "Sword", 4, 413, "ATK", ["Sanhua", "Danjin"]],
  ["Novaburst", "Pistols", 4, 413, "ATK", ["Chixia", "Mortefi"]],
  ["Comet Flare", "Rectifier", 4, 413, "HP", ["Verina", "Baizhi"]],
  ["Autumntrace", "Broadblade", 4, 413, "CRIT Rate", ["Jiyan", "Lumi"]],
  ["Lumingloss", "Sword", 4, 388, "ATK", ["Sanhua", "Rover"]],
  ["Thunderbolt", "Pistols", 4, 388, "ATK", ["Mortefi"]],
  ["Stonard", "Gauntlets", 4, 413, "CRIT Rate", ["Lingyang", "Yuanwu"]],
  ["Augment", "Rectifier", 4, 413, "CRIT Rate", ["Encore", "Yinlin"]],
  ["Hollow Mirage", "Gauntlets", 4, 413, "ATK", ["Jianxin"]],
  ["Glint of Clouds", "Broadblade", 4, 413, "Energy Regen", ["Lupa", "Taoqi"]],
  ["Thousandfold Deliverance", "Sword", 5, 588, "CRIT DMG", ["Qiuyuan", "Cartethyia"]],
  ["Firstlight's Herald", "Sword", 5, 588, "CRIT Rate", ["Lynae", "Rover"]],
  ["Skull Thrasher", "Broadblade", 4, 413, "ATK", ["Calcharo", "Lupa"]],
  ["Spectral Trigger", "Pistols", 5, 588, "CRIT Rate", ["Carlotta", "Chixia"]],
  ["Freeze Frame", "Pistols", 5, 588, "CRIT DMG", ["Carlotta"]],
  ["Forged Dwarf Star", "Gauntlets", 4, 413, "DEF", ["Yuanwu", "Jianxin"]],
  ["Frostburn", "Sword", 5, 588, "CRIT DMG", ["Hiyuki"]],
  ["Solsworn Ciphers", "Rectifier", 4, 413, "Energy Regen", ["Verina", "Suisui"]],
  ["Pulsation Bracer", "Gauntlets", 4, 413, "ATK", ["Xiangli Yao", "Lingyang"]],
  ["Spectrum Blaster", "Pistols", 4, 413, "ATK", ["Chixia", "Aalto"]],
  ["Phasic Homogenizer", "Rectifier", 4, 413, "ATK", ["Encore", "Phoebe"]],
  ["Laser Shearer", "Sword", 4, 413, "ATK", ["Danjin", "Sanhua"]],
  ["Starfield Calibrator", "Rectifier", 5, 500, "CRIT Rate", ["Phoebe", "Zhezhi"]]
];

const existingWeaponSlugs = new Set(weapons.map((weapon) => weapon.slug));
weapons.push(
  ...compactWeaponData
    .map(([name, type, rarity, baseAtk, stat, recommended]) => ({
      slug: slugify(name),
      name,
      type,
      rarity,
      baseAtk,
      stat,
      passive: `${stat} como atributo secundario; use em builds que valorizam ${type} e rotacoes consistentes.`,
      recommended
    }))
    .filter((weapon) => !existingWeaponSlugs.has(weapon.slug))
);

const items = [
  { name: "Pecok Flower", type: "Ascensao", source: "Jinzhou outskirts", days: "Sempre", usedBy: ["Jiyan", "Rover"] },
  { name: "Belle Poppy", type: "Ascensao", source: "Port City of Guixu", days: "Sempre", usedBy: ["Verina"] },
  { name: "Lanternberry", type: "Ascensao", source: "Dim Forest", days: "Sempre", usedBy: ["Encore", "Mortefi"] },
  { name: "Wintry Bell", type: "Ascensao", source: "Huanglong highlands", days: "Sempre", usedBy: ["Sanhua", "Lingyang"] },
  { name: "Group Abomination Tacet Core", type: "Boss", source: "Mech Abomination", days: "Sempre", usedBy: ["Yinlin"] },
  { name: "Unending Destruction", type: "Boss", source: "Dreamless", days: "Sempre", usedBy: ["Havoc Rover"] },
  { name: "Thunder Wisp", type: "Boss", source: "Tempest Mephis", days: "Sempre", usedBy: ["Calcharo", "Yinlin"] },
  { name: "Sentinel's Pillar", type: "Boss", source: "Bell-Borne Geochelone", days: "Sempre", usedBy: ["Verina"] },
  { name: "Advanced Resonance Potion", type: "EXP", source: "Simulacao", days: "Seg-Sun", usedBy: ["Todos"] },
  { name: "Shell Credit", type: "Moeda", source: "Treino e eventos", days: "Seg-Sun", usedBy: ["Todos"] },
  { name: "Medium Energy Core", type: "EXP", source: "Forgery Challenge", days: "Seg, Qui, Dom", usedBy: ["Todos"] },
  { name: "Tide-Sealed Bottle", type: "Evento", source: "Seasonal rewards", days: "Tempo limitado", usedBy: ["Todos"] }
];

items.push(
  ...[
    ["Coriolus", "Ascensao", "Dim Forest", "Sempre", ["Yinlin", "Lingyang"]],
    ["Iris", "Ascensao", "Whining Aix's Mire", "Sempre", ["Calcharo", "Taoqi"]],
    ["Terraspawn Fungus", "Ascensao", "Desorock Highland", "Sempre", ["Jianxin", "Yuanwu"]],
    ["Violet Coral", "Ascensao", "Wuming Bay", "Sempre", ["Sanhua", "Baizhi"]],
    ["Nova", "Ascensao", "Black Shores", "Sempre", ["The Shorekeeper", "Youhu"]],
    ["Golden Fleece", "Ascensao", "Rinascita", "Sempre", ["Phoebe", "Brant"]],
    ["Sword Acorus", "Ascensao", "Rinascita", "Sempre", ["Carlotta", "Roccia"]],
    ["Topological Confinement", "Boss", "Fallacy of No Return", "Sempre", ["The Shorekeeper"]],
    ["Monument Bell", "Boss", "Bell-Borne Geochelone", "Sempre", ["Verina", "Baizhi"]],
    ["Roaring Rock Fist", "Boss", "Feilian Beringal", "Sempre", ["Jiyan", "Aalto"]],
    ["Rage Tacet Core", "Boss", "Inferno Rider", "Sempre", ["Encore", "Changli"]],
    ["Sound-Keeping Tacet Core", "Boss", "Lampylumen Myriad", "Sempre", ["Lingyang", "Carlotta"]],
    ["Hidden Thunder Tacet Core", "Boss", "Tempest Mephis", "Sempre", ["Calcharo", "Yinlin"]],
    ["Dreamless Feather", "Boss", "Dreamless", "Sempre", ["Havoc Rover", "Danjin"]],
    ["LF Whisperin Core", "Inimigo", "Whisperin enemies", "Sempre", ["Todos"]],
    ["MF Whisperin Core", "Inimigo", "Whisperin enemies", "Sempre", ["Todos"]],
    ["HF Whisperin Core", "Inimigo", "Whisperin enemies", "Sempre", ["Todos"]],
    ["FF Whisperin Core", "Inimigo", "Whisperin enemies", "Sempre", ["Todos"]],
    ["LF Howler Core", "Inimigo", "Howler enemies", "Sempre", ["Todos"]],
    ["MF Howler Core", "Inimigo", "Howler enemies", "Sempre", ["Todos"]],
    ["HF Howler Core", "Inimigo", "Howler enemies", "Sempre", ["Todos"]],
    ["FF Howler Core", "Inimigo", "Howler enemies", "Sempre", ["Todos"]],
    ["Crude Ring", "Inimigo", "Exile enemies", "Sempre", ["Todos"]],
    ["Basic Ring", "Inimigo", "Exile enemies", "Sempre", ["Todos"]],
    ["Improved Ring", "Inimigo", "Exile enemies", "Sempre", ["Todos"]],
    ["Tailored Ring", "Inimigo", "Exile enemies", "Sempre", ["Todos"]],
    ["Basic Resonance Potion", "EXP", "Simulation Training", "Seg-Sun", ["Todos"]],
    ["Medium Resonance Potion", "EXP", "Simulation Training", "Seg-Sun", ["Todos"]],
    ["Premium Resonance Potion", "EXP", "Simulation Training", "Seg-Sun", ["Todos"]],
    ["Basic Sealed Tube", "Echo EXP", "Tacet Field", "Seg-Sun", ["Todos"]],
    ["Medium Sealed Tube", "Echo EXP", "Tacet Field", "Seg-Sun", ["Todos"]],
    ["Advanced Sealed Tube", "Echo EXP", "Tacet Field", "Seg-Sun", ["Todos"]],
    ["Premium Sealed Tube", "Echo EXP", "Tacet Field", "Seg-Sun", ["Todos"]],
    ["Basic Tuner", "Echo", "Tacet Field", "Seg-Sun", ["Todos"]],
    ["Advanced Tuner", "Echo", "Tacet Field", "Seg-Sun", ["Todos"]],
    ["Premium Tuner", "Echo", "Tacet Field", "Seg-Sun", ["Todos"]],
    ["Waveplate Crystal", "Energia", "Eventos e login", "Tempo limitado", ["Todos"]],
    ["Astrite", "Moeda", "Eventos, baus e missoes", "Seg-Sun", ["Todos"]],
    ["Lustrous Tide", "Convene", "Loja e recompensas", "Seg-Sun", ["Todos"]],
    ["Radiant Tide", "Convene", "Eventos e loja", "Tempo limitado", ["Todos"]],
    ["Forging Tide", "Convene", "Weapon Convene", "Tempo limitado", ["Todos"]]
  ].map(([name, type, source, days, usedBy]) => ({ name, type, source, days, usedBy }))
);

const guides = [
  {
    title: "Rotacao basica de concerto",
    tag: "Mecanica",
    minutes: 6,
    body: "Como alinhar Intro, Outro e Liberacao para reduzir janelas mortas em times de burst."
  },
  {
    title: "Leitura de ecos: custo, substats e sonatas",
    tag: "Build",
    minutes: 8,
    body: "Priorize custo 4 com Crit, dois custos 3 com bonus elemental e custos 1 com ATK%."
  },
  {
    title: "Esquiva perfeita e contra-ataque",
    tag: "Combate",
    minutes: 5,
    body: "Treine o timing de brilho do inimigo e use o contra-ataque para manter pressao sem perder concerto."
  },
  {
    title: "Rota diaria eficiente",
    tag: "Farm",
    minutes: 7,
    body: "Organize boss, Tacet Field e coleta regional pela prioridade do personagem em progresso."
  },
  {
    title: "Tuning de ecos sem desperdicio",
    tag: "Build",
    minutes: 9,
    body: "Defina custo 4, 3 e 1 antes de gastar materiais e preserve substats-chave para dano final."
  },
  {
    title: "Montando times por sinergia",
    tag: "Equipe",
    minutes: 8,
    body: "Escolha um carry, um aplicador off-field e um suporte que feche a janela de burst sem travar a rotação."
  },
  {
    title: "Checklist semanal do jogador",
    tag: "Rotina",
    minutes: 5,
    body: "Priorize bosses semanais, domínio de materiais, torre e resgate de códigos antes de farmar extras."
  }
];

const news = [
  {
    title: "Resumo de patch notes demonstrativo",
    date: "2026-08-21",
    category: "Patch",
    image: "/assets/event-web.png",
    summary: "Modelo de card para notas de atualizacao, ajustes de personagens e correcoes."
  },
  {
    title: "Calendario de eventos pronto para integracao",
    date: "2026-08-18",
    category: "Eventos",
    image: "/assets/event-forge.png",
    summary: "O hub consome /api/events com polling e schema normalizado."
  },
  {
    title: "Guia rapido de sonatas recomendadas",
    date: "2026-08-15",
    category: "Guia",
    image: "/assets/banner-resonance.png",
    summary: "Comparacao entre conjuntos de dano, suporte e rotacoes de troca."
  },
  {
    title: "Base de itens recebe catalogo expandido",
    date: "2026-08-12",
    category: "Dados",
    image: "/assets/event-forge.png",
    summary: "Protótipo de pontos filtraveis para baus, teleporte e materiais."
  },
  {
    title: "Builder ganha simulacao de stats",
    date: "2026-08-08",
    category: "Builder",
    image: "/assets/event-code.png",
    summary: "Comparador simples calcula ATK, taxa critica e score de build."
  },
  {
    title: "Base de personagens recebe filtros por papel",
    date: "2026-08-01",
    category: "Dados",
    image: "/assets/banner-next.png",
    summary: "Cards segmentados para DPS, Sub-DPS, suporte e controle."
  },
  {
    title: "Hub de eventos ganha sincronizacao automatica",
    date: "2026-07-28",
    category: "Sistema",
    image: "/assets/event-tower.png",
    summary: "Atualizacao periodica com status, contagem regressiva e cache leve."
  }
];

const codes = [
  { code: "WAVEBUILDER", status: "active", rewards: ["Astrites x60", "Potion x5"], expiresAt: addClientDays(3) },
  { code: "SOLARISGUIDE", status: "active", rewards: ["Shell Credit x20000"], expiresAt: addClientDays(9) },
  { code: "ECHOARCHIVE", status: "active", rewards: ["Echo EXP x6"], expiresAt: addClientDays(14) },
  { code: "OLDTACETFIELD", status: "expired", rewards: ["Shell Credit x10000"], expiresAt: "2026-01-20T03:00:00.000Z" }
];

const weeklyFarmPlan = [
  { day: "Segunda", focus: "Bosses", note: "Tacet Cores e materiais de ascensao de dano." },
  { day: "Terca", focus: "Weapon", note: "Farm de armas e rotação de domínio para builds." },
  { day: "Quarta", focus: "Echo", note: "Custo 3/4 e ajuste de substats prioritarios." },
  { day: "Quinta", focus: "Bosses", note: "Rotacao de boss semanal e materiais raros." },
  { day: "Sexta", focus: "Support", note: "EXP, tuners e recursos para sustain." },
  { day: "Sabado", focus: "Tower", note: "Revisar score e composições para a torre." }
];

const mapLegend = [
  { label: "Coletaveis", detail: "Materiais de ascensao e rotas de exploração." },
  { label: "Baus", detail: "Pontos de recompensa e caches de mapa." },
  { label: "Teleportes", detail: "Nexos e beacons para mobilidade." }
];

function readShowcaseCollapsed() {
  try {
    return localStorage.getItem("solaris:showcase-collapsed") === "true";
  } catch {
    return false;
  }
}

const state = {
  lang: DEFAULT_LANG,
  route: "home",
  detail: "",
  charactersLoading: false,
  charactersUpdatedAt: "",
  charactersSource: "fallback-local",
  charactersApiError: false,
  events: [],
  eventError: false,
  eventSource: "fallback-local",
  convenes: [],
  conveneError: false,
  conveneSource: "fallback-local",
  convenesUpdatedAt: "",
  conveneSyncIntervalMinutes: 30,
  updatedAt: "",
  syncIntervalMinutes: 10,
  eventFilter: "all",
  timeMode: "server",
  roleFilter: "all",
  characterQuery: "",
  characterSort: "default",
  characterElementFilter: "all",
  characterWeaponFilter: "all",
  characterRarityFilter: "all",
  showcaseCollapsed: readShowcaseCollapsed(),
  tierMode: "toa",
  tierFilters: {query: "", element: "all", weapon: "all", rarity: "all", role: "all"},
  elementFilter: "all",
  weaponFilter: "all",
  builder: readBuilder(),
  builderMessage: builderRestored ? "restored" : "",
  builderSearch: {
    character: "",
    weapon: "",
    echo: ""
  },
  builderFilter: {
    character: "all",
    weapon: "all",
    echo: "all"
  }
};

const dataRequests = {
  characters: null,
  events: null,
  convenes: null,
  charactersLoaded: false,
  eventsLoaded: false,
  convenesLoaded: false
};

const routeViewState = {
  shellReady: false,
  renderQueued: false
};

const routePanels = new Map();
const preloadedImageUrls = new Set();
let favoriteCache = null;

function addClientDays(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(date.getUTCHours(), 0, 0, 0);
  return date.toISOString();
}

function t(key) {
  return copy[state.lang]?.[key] || copy[DEFAULT_LANG][key] || key;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseLocation() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  let lang = DEFAULT_LANG;

  if (SUPPORTED_LANGS.includes(segments[0])) {
    lang = segments.shift();
  }

  const slug = segments[0] || "";
  const route = routeBySlug.get(slug) || null;

  state.lang = lang;
  state.route = route ? route.id : "not-found";
  state.detail = route ? segments[1] || "" : "";
}

function pathFor(routeId, lang = state.lang, detail = "") {
  const route = routeById.get(routeId) || routeById.get("home");
  const suffix = route.slug ? `/${route.slug}` : "/";
  const detailSuffix = detail ? `/${detail}` : "";
  return `/${lang}${suffix}${detailSuffix}`;
}

function navigateTo(url) {
  cancelPendingSearch();
  closeBuilderPicker(false);
  window.history.pushState({}, "", url);
  parseLocation();
  render();
  window.scrollTo({ top: 0, behavior: reducedMotion() ? "instant" : "smooth" });
}

function getFavorites() {
  if (favoriteCache) return favoriteCache;
  try {
    const saved = JSON.parse(localStorage.getItem("solaris:favorites") || "[]");
    favoriteCache = Array.isArray(saved) ? [...new Set(saved.filter((slug) => typeof slug === "string"))] : [];
  } catch {
    favoriteCache = [];
  }
  return favoriteCache;
}

function setFavorites(favorites) {
  favoriteCache = favorites;
  try { localStorage.setItem("solaris:favorites", JSON.stringify(favorites)); } catch {
    // Keep favorites usable when browser storage is unavailable.
  }
}

function isFavorite(slug) {
  return getFavorites().includes(slug);
}

function toggleFavorite(slug) {
  const favorites = getFavorites();
  const next = favorites.includes(slug)
    ? favorites.filter((item) => item !== slug)
    : [...favorites, slug];
  setFavorites(next);
}

function currentLocale() {
  if (state.lang === "en") return "en-US";
  if (state.lang === "es") return "es-ES";
  return "pt-BR";
}

function formatDate(iso, mode = state.timeMode) {
  const options = { dateStyle: "medium", timeStyle: "short" };
  if (mode === "server") options.timeZone = "Asia/Shanghai";
  return new Intl.DateTimeFormat(currentLocale(), options).format(new Date(iso));
}

function formatEventDate(iso, mode = state.timeMode) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  const options = { day: "2-digit", month: "2-digit", year: "numeric" };
  if (mode === "server") options.timeZone = "Asia/Shanghai";
  return new Intl.DateTimeFormat(currentLocale(), options).format(date);
}

function formatEventTime(iso, mode = state.timeMode) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  const options = { hour: "2-digit", minute: "2-digit" };
  if (mode === "server") options.timeZone = "Asia/Shanghai";
  return new Intl.DateTimeFormat(currentLocale(), options).format(date);
}

function getEventStatus(event) {
  const now = Date.now();
  const start = new Date(event.startAt).getTime();
  const end = new Date(event.endAt).getTime();

  if (now < start) return "em_breve";
  if (now > end) return "encerrado";
  return "ao_vivo";
}

function statusLabel(status) {
  if (status === "ao_vivo") return t("liveNow");
  if (status === "em_breve") return t("comingSoon");
  return t("ended");
}

function activeEvents() {
  return state.events.filter((event) => getEventStatus(event) === "ao_vivo");
}

function activeConvenes() {
  return state.convenes.filter((convene) => getEventStatus(convene) === "ao_vivo");
}

function countdownLabel(event) {
  const status = getEventStatus(event);
  const target = status === "em_breve" ? new Date(event.startAt) : new Date(event.endAt);
  const diff = target.getTime() - Date.now();

  if (status === "encerrado" || diff <= 0) return t("ended");

  const seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function timeAgo(iso) {
  if (!iso) return "--";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h`;
}

function stars(count) {
  return "★".repeat(count);
}

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function searchIndex() {
  return [
    ...routes.filter((route) => route.id !== "home").map((route) => ({
      label: t(route.labelKey),
      title: t(route.labelKey),
      meta: "Pagina",
      route: route.id
    })),
    ...characters.map((character) => ({
      label: `${character.name} ${character.element} ${character.weapon}`,
      title: character.name,
      meta: `${character.element} • ${character.weapon}`,
      route: "characters",
      detail: character.slug
    })),
    ...weapons.map((weapon) => ({
      label: `${weapon.name} ${weapon.type}`,
      title: weapon.name,
      meta: weapon.type,
      route: "weapons"
    })),
    ...echoes.map((echo) => ({
      label: `${echo.name} ${echo.element}`,
      title: echo.name,
      meta: echo.element,
      route: "echoes"
    })),
    ...items.map((item) => ({
      label: `${item.name} ${item.type} ${item.source}`,
      title: item.name,
      meta: item.type,
      route: "items"
    })),
    ...guides.map((guide) => ({
      label: `${guide.title} ${guide.tag}`,
      title: guide.title,
      meta: guide.tag,
      route: "guide"
    })),
    ...news.map((article) => ({
      label: `${article.title} ${article.category}`,
      title: article.title,
      meta: article.category,
      route: "news"
    })),
    ...codes.map((code) => ({
      label: `${code.code} ${code.rewards.join(" ")}`,
      title: code.code,
      meta: t("codes"),
      route: "codes"
    })),
    ...state.events.map((event) => ({
      label: `${event.title} ${event.category}`,
      title: event.title,
      meta: t(categoryLabels[event.category]),
      route: "events"
    }))
  ];
}

function renderSearchSuggestions() {
  return `<div class="search-suggestions" data-search-suggestions hidden role="listbox"></div>`;
}

function searchMatches(query, limit = 6) {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];

  return searchIndex()
    .filter((item) => item.label.toLowerCase().includes(normalized))
    .sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aStarts = aTitle.startsWith(normalized) ? 0 : 1;
      const bStarts = bTitle.startsWith(normalized) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return aTitle.localeCompare(bTitle);
    })
    .slice(0, limit);
}

function hideSearchSuggestions(form) {
  cancelPendingSearch();
  const suggestions = form?.querySelector("[data-search-suggestions]");
  if (!suggestions) return;
  suggestions.hidden = true;
  suggestions.innerHTML = "";
}

function hideAllSearchSuggestions() {
  cancelPendingSearch();
  app.querySelectorAll("[data-search-suggestions]").forEach((suggestions) => {
    suggestions.hidden = true;
    suggestions.innerHTML = "";
  });
}

function updateSearchSuggestions(input) {
  const form = input.closest("[data-search-form]");
  const suggestions = form?.querySelector("[data-search-suggestions]");
  if (!suggestions) return;

  const matches = searchMatches(input.value);
  if (!matches.length) {
    hideSearchSuggestions(form);
    return;
  }

  suggestions.innerHTML = matches.map((item) => `
    <button
      type="button"
      role="option"
      data-search-suggestion
      data-route="${item.route}"
      data-detail="${escapeHtml(item.detail || "")}"
    >
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.meta)}</span>
    </button>
  `).join("");
  suggestions.hidden = false;
}

function renderTopbar() {
  const favoriteCount = getFavorites().length;
  const navItems = routes.filter((route) => route.nav);

  return `
    <header class="topbar">
      <a class="brand" href="${pathFor("home")}" data-link aria-label="Solaris Archive">
        <img class="brand-logo" src="/assets/site-logo-84.webp" alt="" width="42" height="42">
        <span>
          <strong>Solaris Archive</strong>
          <small>Wuthering Waves Wiki</small>
        </span>
      </a>

      <nav class="desktop-nav" aria-label="${t("menu")}">
        ${navItems.map((route) => `
          <a class="${state.route === route.id ? "is-active" : ""}" href="${pathFor(route.id)}" data-link>
            ${t(route.labelKey)}
          </a>
        `).join("")}
      </nav>

      <div class="top-actions">
        ${settingsButton(state.lang)}
        <a class="compact-link" href="${pathFor("characters")}" data-link>
          ${t("favorites")} <span>${favoriteCount}</span>
        </a>
        <a class="compact-link compact-link--gold" href="${pathFor("events")}" data-link>${t("database")}</a>
        <label class="sr-only" for="language-select">${t("language")}</label>
        <select id="language-select" class="language-select" data-language-select>
          ${SUPPORTED_LANGS.map((lang) => `
            <option value="${lang}" ${lang === state.lang ? "selected" : ""}>${lang}</option>
          `).join("")}
        </select>
        <button class="menu-button" type="button" data-menu-toggle aria-label="${t("menu")}">☰</button>
      </div>
    </header>
    <div class="mobile-nav" data-mobile-nav hidden>
      ${routes.filter((route) => route.id !== "home").map((route) => `
        <a href="${pathFor(route.id)}" data-link>${t(route.labelKey)}</a>
      `).join("")}
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="site-footer">
      <div>
        <strong>Solaris Archive</strong>
        <p>${t("noAffiliation")}</p>
      </div>
      <div class="footer-links">
        ${settingsButton(state.lang)}
        <a href="${pathFor("events")}" data-link>${t("navEvents")}</a>
        <a href="${pathFor("codes")}" data-link>${t("navCodes")}</a>
        <a href="${pathFor("news")}" data-link>${t("navNews")}</a>
        <a href="https://wutheringwaves.kurogames.com/" target="_blank" rel="noreferrer">${t("officialSite")}</a>
      </div>
    </footer>
  `;
}

function renderLiveTicker() {
  const events = state.events
    .filter((event) => ["ao_vivo", "em_breve"].includes(getEventStatus(event)));

  return `
    <section class="live-ticker" aria-label="${t("activeEvents")}">
      <div class="ticker-inner">
        <span class="ticker-label">${t("activeEvents")}</span>
        <div class="ticker-track">
          ${events.length ? events.map((event) => `
            <a href="${pathFor("events")}" data-link class="ticker-item">
              <span class="status-dot status-dot--${getEventStatus(event)}"></span>
              <strong>${escapeHtml(event.title)}</strong>
              <span data-countdown data-start="${event.startAt}" data-end="${event.endAt}">${countdownLabel(event)}</span>
            </a>
          `).join("") : `<span class="ticker-empty">${t("emptyEvents")}</span>`}
        </div>
        <span class="ticker-sync">${t("updated")} ${timeAgo(state.updatedAt)}</span>
      </div>
    </section>
  `;
}

function renderHero() {
  return `
    <section class="hero">
      <div class="hero-backdrop" aria-hidden="true"></div>
      <div class="hero-content">
        <p class="eyebrow">${t("heroEyebrow")}</p>
        <h1>Solaris Archive</h1>
        <p class="hero-copy">
          ${t("heroCopy")}
        </p>
        <form class="search-panel" data-search-form>
          <label class="sr-only" for="global-search">${t("searchPlaceholder")}</label>
          <input id="global-search" name="query" type="search" placeholder="${t("searchPlaceholder")}" autocomplete="off" data-global-search aria-autocomplete="list">
          <button type="submit">${t("searchButton")}</button>
          ${renderSearchSuggestions()}
        </form>
        <div class="hero-actions" aria-label="${t("primaryActions")}">
          <a href="${pathFor("characters")}" data-link>${t("navCharacters")}</a>
          <a href="${pathFor("events")}" data-link>${t("navEvents")}</a>
          <a href="${pathFor("builder")}" data-link>${t("navBuilder")}</a>
        </div>
      </div>
      <div class="hero-metrics" aria-label="${t("baseSummary")}">
        <span><strong>${characters.length}</strong> Resonators</span>
        <span><strong>${echoes.length}</strong> ${t("echoes")}</span>
        <span><strong>${weapons.length}</strong> ${t("navWeapons")}</span>
      </div>
    </section>
  `;
}

function renderSectionHeader(kicker, title, description, action = "") {
  return `
    <div class="section-header">
      <div>
        <p class="eyebrow">${kicker}</p>
        <h2>${title}</h2>
        <p>${description}</p>
      </div>
      ${action}
    </div>
  `;
}

function renderSearchHero() {
  return `
    <section class="hero hero--search">
      <div class="hero-backdrop" aria-hidden="true"></div>
      <div class="hero-content hero-content--search">
        <p class="eyebrow">Wuthering Waves Wiki</p>
        <h1>Solaris Archive</h1>
        <form class="search-panel search-panel--clean" data-search-form>
          <label class="sr-only" for="global-search">${t("searchPlaceholder")}</label>
          <input id="global-search" name="query" type="search" placeholder="${t("searchPlaceholder")}" autocomplete="off" data-global-search aria-autocomplete="list">
          <button type="submit">${t("searchButton")}</button>
          ${renderSearchSuggestions()}
        </form>
      </div>
    </section>
  `;
}

function renderBannerSpotlight() {
  const cards = activeConvenes();

  return `
    <section class="page-band">
      <div class="container">
        ${renderSectionHeader(
          t("currentConvenes"),
          t("conveneSpotlightTitle"),
          t("conveneSpotlightDesc"),
          `<a class="text-link" href="${pathFor("events")}" data-link>${t("navEvents")}</a>`
        )}
        ${cards.length ? `
          <div class="banner-grid">
            ${cards.map((convene) => renderConveneCard(convene, true)).join("")}
          </div>
        ` : `<div class="empty-state">${t(state.conveneError ? "convenesUnavailable" : "emptyConvenes")}</div>`}
      </div>
    </section>
  `;
}

function renderCharacterAvatar(character, variant = "card") {
  const detail = getCharacterDetail(character.encoreId);
  const imageUrl = (variant === "detail" ? detail?.portraitUrl : detail?.imageUrl) || (variant === "detail"
    ? character.portraitUrl || character.imageUrl || character.iconUrl || characterAssetUrl(character.name)
    : character.imageUrl || character.iconUrl || character.portraitUrl || characterAssetUrl(character.name));

  return `
    <div class="avatar avatar--${variant} avatar--${character.element.toLowerCase()}">
      <span>${initials(character.name)}</span>
      ${imageUrl ? `
        <img
          src="${escapeHtml(imageUrl)}"
          alt="${escapeHtml(character.name)}"
          loading="lazy"
          decoding="async"
          ${character.encoreId ? `data-character-image="${Number(character.encoreId)}" data-image-variant="${variant}"` : ""}
          onerror="this.onerror=null;this.src='${CHARACTER_FALLBACK_IMAGE}';var avatar=this.closest('.avatar');if(avatar)avatar.classList.add('avatar--fallback');"
        >
      ` : ""}
    </div>
  `;
}

function renderCharacterCard(character) {
  const favorite = isFavorite(character.slug);

  return `
    <article class="data-card character-card">
      <div class="card-topline">
        <span class="pill pill--${character.element.toLowerCase()}">${character.element}</span>
        <button class="icon-button ${favorite ? "is-on" : ""}" type="button" data-fav="${character.slug}" aria-label="${t("favorites")}">
          ${favorite ? "★" : "☆"}
        </button>
      </div>
      <a href="${pathFor("characters", state.lang, character.slug)}" data-link class="avatar-link">
        ${renderCharacterAvatar(character)}
      </a>
      <div class="card-body">
        <h3><a href="${pathFor("characters", state.lang, character.slug)}" data-link>${character.name}</a></h3>
        <p>${stars(character.rarity)} • ${character.weapon} • ${t(roleLabels[character.role])}</p>
        <div class="tag-row">
          ${character.tags.map((tag) => `<span>${tag}</span>`).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderRoleTabs() {
  return `
    <div class="segmented" role="tablist" aria-label="${t("role")}">
      <button type="button" class="${state.roleFilter === "all" ? "is-active" : ""}" data-role-filter="all">
        ${t("all")}
      </button>
      ${Object.entries(roleLabels).map(([role, label]) => `
        <button type="button" class="${state.roleFilter === role ? "is-active" : ""}" data-role-filter="${role}">
          ${t(label)}
        </button>
      `).join("")}
    </div>
  `;
}

function characterFilterOptions(field) {
  return [...new Set(characters.map((character) => character[field]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
}

function rarityFilterOptions() {
  return [...new Set(characters.map((character) => String(character.rarity)).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));
}

function renderSelectOptions(options, current, allLabel) {
  return `
    <option value="all">${allLabel}</option>
    ${options.map((option) => `
      <option value="${escapeHtml(option)}" ${String(current) === String(option) ? "selected" : ""}>
        ${escapeHtml(option)}
      </option>
    `).join("")}
  `;
}

function getFilteredCharacters() {
  const query = state.characterQuery.trim().toLowerCase();

  const filtered = characters.filter((character) => {
    const searchable = [
      character.name,
      character.originalName,
      character.element,
      character.weapon,
      character.role,
      ...(character.tags || [])
    ].filter(Boolean).join(" ").toLowerCase();

    const matchesQuery = !query || searchable.includes(query);
    const matchesRole = state.roleFilter === "all" || character.role === state.roleFilter;
    const matchesElement = state.characterElementFilter === "all" || character.element === state.characterElementFilter;
    const matchesWeapon = state.characterWeaponFilter === "all" || character.weapon === state.characterWeaponFilter;
    const matchesRarity = state.characterRarityFilter === "all" || String(character.rarity) === state.characterRarityFilter;

    return matchesQuery && matchesRole && matchesElement && matchesWeapon && matchesRarity;
  });
  if (state.characterSort === "favorites") {
    const favorites = new Set(getFavorites());
    filtered.sort((a, b) => Number(favorites.has(b.slug)) - Number(favorites.has(a.slug)));
  }
  return filtered;
}

function renderCharacterFilters() {
  return `
    <div class="wiki-filters wiki-filters--characters" aria-label="${t("characterFiltersLabel")}">
      <label class="character-search-field">
        <span class="sr-only">${t("search")}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5" stroke-linecap="round"/></svg>
        <input
          type="search"
          value="${escapeHtml(state.characterQuery)}"
          placeholder="${t("characterSearchPlaceholder")}"
          data-character-search
        >
      </label>
      <label class="character-sort-field ${state.characterSort === "favorites" ? "is-active" : ""}">
        <span class="sr-only">${t("characterSort")}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h18l-7 8v6l-4 2v-8Z"/></svg>
        <select data-character-sort>
          <option value="default" ${state.characterSort === "default" ? "selected" : ""}>${t("defaultOrder")}</option>
          <option value="favorites" ${state.characterSort === "favorites" ? "selected" : ""}>${t("favoritesFirst")}</option>
        </select>
      </label>
      <label>
        <span>${t("element")}</span>
        <select data-character-element-filter>
          ${renderSelectOptions(characterFilterOptions("element"), state.characterElementFilter, t("all"))}
        </select>
      </label>
      <label>
        <span>${t("weapon")}</span>
        <select data-character-weapon-filter>
          ${renderSelectOptions(characterFilterOptions("weapon"), state.characterWeaponFilter, t("all"))}
        </select>
      </label>
      <label>
        <span>${t("rarity")}</span>
        <select data-character-rarity-filter>
          ${renderSelectOptions(rarityFilterOptions(), state.characterRarityFilter, t("all"))}
        </select>
      </label>
    </div>
  `;
}

function renderCharacterResults(filtered) {
  if (!filtered.length) {
    return `
      <div class="empty-state">
        <h3>${t("noCharacterFoundTitle")}</h3>
        <p>${t("noCharacterFoundText")}</p>
      </div>
    `;
  }

  const versions = characters.map(character => character.version).filter(version => /^\d+\.\d+$/.test(version || ""));
  const latest = versions.sort((a,b) => Number(b.split('.')[0]) - Number(a.split('.')[0]) || Number(b.split('.')[1]) - Number(a.split('.')[1]))[0];
  const featured = filtered.filter(character => (latest && character.version === latest) || character.newRelease);
  const previous = filtered.filter(character => !featured.includes(character));
  return `
    ${featured.length ? `<section class="new-resonators" aria-label="${label('Novos personagens','New characters','Nuevos personajes')}"><h2>${label('Novos personagens','New characters','Nuevos personajes')} ${latest && featured.every(character=>character.version===latest) ? `<span class="pill">v${escapeHtml(latest)}</span>` : ""}</h2><div class="character-grid character-grid--wide">${featured.map(renderCharacterCard).join('')}</div></section>` : ""}
    <div class="character-grid character-grid--wide">
      ${previous.map(renderCharacterCard).join("")}
    </div>
  `;
}

function updateCharacterResults() {
  const panel = routePanels.get(routeCacheKey());
  const results = panel?.querySelector("[data-character-results]");
  const count = panel?.querySelector("[data-character-count]");
  if (!results || state.route !== "characters" || state.detail) {
    render();
    return;
  }

  const filtered = getFilteredCharacters();
  results.innerHTML = renderCharacterResults(filtered);
  observeCharacterImages();
  applyAccessibility(app, state.lang);
  notifyAccessibility(`${filtered.length} ${t("characterCount")}`, true);
  if (count) count.textContent = state.charactersLoading ? t("syncingCharacters") : `${filtered.length} / ${characters.length} ${t("characterCount")}`;
  panel.dataset.signature = routeSignature();
}

function renderCharacterShowcase() {
  const featured = state.roleFilter === "all"
    ? characters
    : characters.filter((character) => character.role === state.roleFilter);
  const toggleLabel = state.showcaseCollapsed ? t("showShowcase") : t("hideShowcase");

  return `
    <section class="page-band page-band--deep">
      <div class="container">
        ${renderSectionHeader(
          t("showcaseKicker"),
          t("showcaseTitle"),
          t("showcaseDesc"),
          `<button class="section-toggle" type="button" data-showcase-toggle aria-expanded="${!state.showcaseCollapsed}" aria-controls="home-resonators-content">
            <span aria-hidden="true">${state.showcaseCollapsed ? "+" : "-"}</span>
            ${toggleLabel}
          </button>`
        )}
        <div id="home-resonators-content">
          ${state.showcaseCollapsed ? `
            <div class="collapsed-note">${t("charactersHidden")}</div>
          ` : `
            ${renderRoleTabs()}
            <div class="character-grid">
              ${featured.map(renderCharacterCard).join("")}
            </div>
          `}
        </div>
      </div>
    </section>
  `;
}

function renderTierPreview() {
  const top = selectTierEntries(characters, getTierSnapshot(), {mode: "toa", role: "dps"}).filter(entry => entry.tier).slice(0, 6);

  return `
    <section class="page-band">
      <div class="container split-layout">
        <div>
          ${renderSectionHeader(
            "Tier list",
            t("tierPreviewTitle"),
            t("tierPreviewDesc"),
            `<a class="text-link" href="${pathFor("tier")}" data-link>${t("navTier")}</a>`
          )}
          <div class="source-links">
            ${tierSourceLinks.map((source) => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a>`).join("")}
          </div>
        </div>
        <div class="tier-preview">
          ${!getTierSnapshot() ? `<p>${tierDataError ? label("Avaliações indisponíveis no momento.","Ratings unavailable right now.","Evaluaciones no disponibles ahora.") : label("Carregando avaliações…","Loading ratings…","Cargando evaluaciones…")}</p>` : ""}
          ${top.map(({character, tier}) => `
            <a href="${pathFor("characters", state.lang, character.slug)}" data-link class="tier-row">
              <span aria-hidden="true">◇</span>
              <strong>${character.name}</strong>
              <em>${tier}</em>
            </a>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function newsTimestamp(item) {
  const value = String(item?.date || "");
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return date.getTime();
}

function validNewsItem(item) {
  return Boolean(item?.title) && Number.isFinite(newsTimestamp(item));
}

function sortedNewsItems(items = news) {
  const source = Array.isArray(items) ? items : [];
  return [...source]
    .filter(validNewsItem)
    .sort((a, b) => newsTimestamp(b) - newsTimestamp(a));
}

function renderNewsCard(item, featured = false) {
  const localImage = /^\/assets\/(event-(web|forge|code|tower)|banner-(next|resonance))\.png$/.test(item.image || "");
  return `
    <article class="data-card news-card ${featured ? "news-card--featured" : ""}">
      <img src="${escapeHtml(localImage ? '/assets/event-placeholder-1280.webp' : item.image || EVENT_FALLBACK_IMAGE)}" ${localImage ? 'srcset="/assets/event-placeholder-640.webp 640w, /assets/event-placeholder-1280.webp 900w" sizes="(max-width: 760px) 100vw, (max-width: 1060px) 50vw, 40vw"' : ''} alt="" loading="lazy" decoding="async" width="1280" height="720" onerror="this.onerror=null;this.src='${EVENT_FALLBACK_IMAGE}';">
      <div class="card-body">
        <span class="pill">${escapeHtml(item.category || t("navNews"))}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <time datetime="${escapeHtml(item.date)}">${formatNewsDate(item.date)}</time>
        <p>${escapeHtml(item.summary || "")}</p>
      </div>
    </article>
  `;
}

function renderNewsGrid(limit = 6, items = news) {
  const requestedLimit = Number(limit);
  const safeLimit = Number.isFinite(requestedLimit) && requestedLimit >= 0 ? requestedLimit : 6;
  const list = sortedNewsItems(items).slice(0, safeLimit);

  if (!list.length) {
    return `
      <div class="empty-state">
        <h3>${t("navNews")}</h3>
        <p>${t("emptyNewsText")}</p>
      </div>
    `;
  }

  return `
    <div class="news-grid">
      ${list.map((item) => renderNewsCard(item)).join("")}
    </div>
  `;
}

function renderNewsDigest(items) {
  const list = sortedNewsItems(items);

  return `
    <ol class="news-list">
      ${list.map((item) => `
        <li>
          <time datetime="${escapeHtml(item.date)}">${formatNewsDate(item.date)}</time>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.summary || "")}</p>
        </li>
      `).join("")}
    </ol>
  `;
}

function renderCodesWidget(full = false) {
  const list = full ? codes : codes.filter((code) => code.status === "active").slice(0, 3);

  return `
    <div class="codes-widget">
      ${list.map((code) => `
        <article class="code-row ${code.status === "expired" ? "is-expired" : ""}">
          <div>
            <strong>${code.code}</strong>
            <span>${code.rewards.join(" • ")}</span>
          </div>
          <div>
            <small>${formatDate(code.expiresAt)}</small>
            <button type="button" data-copy="${code.code}" ${code.status === "expired" ? "disabled" : ""}>
              ${code.status === "expired" ? t("ended") : t("copyCode")}
            </button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderHome() {
  return `
    ${renderSearchHero()}
    ${renderLiveTicker()}
    ${renderBannerSpotlight()}
    ${renderCharacterShowcase()}
    ${renderTierPreview()}
    <section class="page-band page-band--deep">
      <div class="container">
        ${renderSectionHeader(
          t("navNews"),
          t("recentNewsTitle"),
          t("recentNewsDesc"),
          `<a class="text-link" href="${pathFor("news")}" data-link>${t("navNews")}</a>`
        )} 
        ${renderNewsGrid(6)}
      </div>
    </section>
    <section class="page-band">
      <div class="container compact-section">
        ${renderSectionHeader(
          t("codes"),
          t("redeemTitle"),
          t("redeemDesc"),
          `<a class="text-link" href="${pathFor("codes")}" data-link>${t("navCodes")}</a>`
        )}
        ${renderCodesWidget()}
      </div>
    </section>
  `;
}

function renderPageHero(title, description, kicker = "Wiki") {
  return `
    <section class="subhero">
      <div class="container">
        <p class="eyebrow">${kicker}</p>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
    </section>
    ${renderLiveTicker()}
  `;
}

function renderIntroductionPage() {
  const resources = [
    { title: t("navCharacters"), text: t("pageCharactersDesc"), route: "characters" },
    { title: t("navTier"), text: t("pageTierDesc"), route: "tier" },
    { title: t("navEvents"), text: t("pageEventsDesc"), route: "events" },
    { title: t("navBuilder"), text: t("pageBuilderDesc"), route: "builder" }
  ];

  return `
    ${renderPageHero(t("introPageTitle"), t("introPageDesc"), "Solaris Archive")}
    <section class="page-band">
      <div class="container">
        ${renderOfficialVideo("RJsycDbdSgo", "Wuthering Waves — Xuanfang: Eisodus")}
      </div>
    </section>
    <section class="page-band">
      <div class="container intro-layout">
        <article class="panel intro-lead">
          <p class="eyebrow">${t("introPurposeTitle")}</p>
          <h2>${t("introObjectiveTitle")}</h2>
          <p>${t("introPurposeText")}</p>
          <p>${t("introObjectiveText")}</p>
          <div class="intro-resource-row">
            <span>${characters.length} ${t("navCharacters")}</span>
            <span>${echoes.length} ${t("echoes")}</span>
            <span>${weapons.length} ${t("navWeapons")}</span>
          </div>
        </article>
        <figure class="intro-visual">
          <img src="/assets/home-hero-1600.webp" srcset="/assets/home-hero-960.webp 960w, /assets/home-hero-1600.webp 1600w, /assets/home-hero-2560.webp 2560w" sizes="(max-width: 1060px) 100vw, 50vw" alt="Paisagem inspirada em Solaris-3" loading="lazy" decoding="async" width="1600" height="900">
          <figcaption>${t("introSummaryText")}</figcaption>
        </figure>
      </div>
    </section>
    <section class="page-band page-band--deep">
      <div class="container intro-card-grid">
        <article class="panel">
          <p class="eyebrow">WuWa</p>
          <h2>${t("introGameTitle")}</h2>
          <p>${t("introGameText")}</p>
        </article>
        <article class="panel">
          <p class="eyebrow">Solaris-3</p>
          <h2>${t("introLoreTitle")}</h2>
          <p>${t("introLoreText")}</p>
        </article>
      </div>
    </section>
    <section class="page-band">
      <div class="container">
        ${renderSectionHeader(t("database"), t("introResourcesTitle"), t("introResourcesText"))}
        <div class="intro-resource-grid">
          ${resources.map((resource) => `
            <a class="data-card intro-resource-card" href="${pathFor(resource.route)}" data-link>
              <div class="card-body">
                <h3>${resource.title}</h3>
                <p>${resource.text}</p>
              </div>
            </a>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}
function renderCharactersPage() {
  if (state.detail) {
    return renderCharacterDetail(state.detail);
  }

  const filtered = getFilteredCharacters();

  return `
    ${renderPageHero(t("navCharacters"), t("pageCharactersDesc"), t("database"))}
    <section class="page-band">
      <div class="container characters-catalog">
        <div class="module-status">
          <span data-character-count>${state.charactersLoading ? t("syncingCharacters") : `${filtered.length} / ${characters.length} ${t("characterCount")}`}</span>
          <span>${t("sourceLabel")}: ${state.charactersSource}</span>
          <span>${state.charactersApiError ? t("apiFallback") : `${t("updatedLabel")} ${timeAgo(state.charactersUpdatedAt)}`}</span>
        </div>
        ${renderCharacterFilters()}
        ${renderRoleTabs()}
        <div data-character-results>
          ${renderCharacterResults(filtered)}
        </div>
      </div>
    </section>
  `;
}

function renderCharacterDetail(slug) {
  const character = characters.find((item) => item.slug === slug) || (/^rover-(aero|electro|havoc|spectro)$/.test(slug) ? characters.find(item => /^Rover\s*\(/i.test(item.name) && item.element.toLowerCase() === slug.slice(6)) : null);
  if (!character) return renderNotFound();
  const details = getCharacterDetail(character.encoreId);
  const trailer = character.videoId || characterTrailers[character.slug];
  const detailFailed = (characterDetailFailures.get(String(character.encoreId)) || 0) > Date.now();

  return `
    ${renderPageHero(character.name, `${character.element} • ${character.weapon} • ${t(roleLabels[character.role])}`, "Resonator")}
    <section class="page-band">
      <div class="container detail-layout">
        <aside class="detail-aside">
          ${renderCharacterAvatar(character, "detail")}
          <button class="favorite-wide ${isFavorite(character.slug) ? "is-on" : ""}" type="button" data-fav="${character.slug}">
            ${isFavorite(character.slug) ? "★" : "☆"} ${t("favorites")}
          </button>
          <a class="text-link" href="${pathFor("characters")}" data-link>${t("back")}</a>
        </aside>
        <div class="detail-main">
          ${details?.introduction ? `<article class="panel"><h2>${label('Perfil','Profile','Perfil')}</h2><p>${escapeHtml(details.introduction)}</p><a class="text-link" href="${escapeHtml(details.sourceUrl)}" target="_blank" rel="noreferrer">Encore · ${label('Fonte dos dados','Data source','Fuente de datos')}</a></article>` : ""}
          ${character.apiOnly ? `<article class="panel"><h2>${label('Atributos','Attributes','Atributos')} ${details?.maxLevel ? `· Lv. ${details.maxLevel}` : ""}</h2>${details ? `<div class="stat-grid">${Object.entries(details.stats).map(([name,value]) => `<div class="stat-tile"><span>${escapeHtml(name)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>` : `<p role="status">${detailFailed ? label('Não foi possível carregar os dados agora.','Unable to load data right now.','No se pudieron cargar los datos ahora.') : label('Carregando informações da API…','Loading API information…','Cargando información de la API…')}</p>${detailFailed ? `<button type="button" class="favorite-wide" data-character-retry="${Number(character.encoreId)}">${label('Tentar novamente','Try again','Reintentar')}</button>` : ""}`}</article>` : `
          <div class="stat-grid">
            ${Object.entries(character.stats).map(([label, value]) => `
              <div class="stat-tile">
                <span>${label.toUpperCase()}</span>
                <strong>${value}</strong>
              </div>
            `).join("")}
          </div>
          <article class="panel">
            <h2>${t("recommendedBuild")}</h2>
            <div class="build-grid">
              <div><span>${t("weapon")}</span><strong>${character.build.weapon}</strong></div>
              <div><span>${t("echoes")}</span><strong>${character.build.echoes}</strong></div>
              <div><span>${t("mainStats")}</span><strong>${character.build.mainStats.join(" / ")}</strong></div>
              <div><span>${t("team")}</span><strong>${character.build.team.join(" • ")}</strong></div>
            </div>
            <p>${character.build.rotation}</p>
          </article>
          ${renderCharacterStatTargetSummary(character)}
          `}
          ${character.signatureWeapon ? `<article class="panel"><h2>${label('Arma associada','Associated weapon','Arma asociada')}</h2><a class="text-link" data-link href="${pathFor('weapons',state.lang,character.signatureWeapon.slug)}">${escapeHtml(character.signatureWeapon.name)} ↗</a>${character.signatureWeaponSource ? `<p><a class="text-link" href="${escapeHtml(character.signatureWeaponSource)}" target="_blank" rel="noreferrer">${label('Guia oficial','Official guide','Guía oficial')}</a></p>` : ""}</article>` : ""}
          ${trailer ? renderOfficialVideo(trailer, `${character.name} — Resonator Showcase`) : ""}
          <article class="panel">
            <h2>${t("skills")}</h2>
            <div class="skill-tree">
              ${(details?.skills || []).length && character.apiOnly ? details.skills.map(skill => `<details class="character-skill"><summary>${escapeHtml(skill.name)} · ${escapeHtml(skill.type)}</summary><p>${escapeHtml(skill.description)}</p></details>`).join('') : (character.apiOnly ? [] : character.skills).map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}
            </div>
          </article>
          ${character.apiOnly ? "" : `<article class="panel">
            <h2>${t("weaponAffinity")}</h2>
            <ol class="ranked-list">
              ${character.affinity.map((weapon, index) => `<li><span>${index + 1}</span>${weapon}</li>`).join("")}
            </ol>
          </article>`}
        </div>
      </div>
    </section>
  `;
}

function renderOfficialVideo(videoId, title) {
  if (!/^[\w-]{11}$/.test(videoId)) return "";
  const playLabel = state.lang === "en" ? "Play official trailer" : state.lang === "es" ? "Reproducir tráiler oficial" : "Reproduzir trailer oficial";
  return `<article class="panel official-video">
    <h2>${escapeHtml(title)}</h2>
    <div class="video-player">
      <button type="button" class="video-launch" data-video-id="${videoId}" data-video-title="${escapeHtml(title)}">
        <span aria-hidden="true">▶</span> ${playLabel}
      </button>
    </div>
    <a class="text-link" href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noreferrer">YouTube · Wuthering Waves ↗</a>
  </article>`;
}

let characterDetailRevision = 0;
const characterDetailFailures = new Map();
const observedCharacterImages = new WeakSet();
const characterImageObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting || entry.target.closest('[hidden]')) continue;
    characterImageObserver.unobserve(entry.target);
    upgradeCharacterImages(entry.target.dataset.characterImage);
  }
}, {rootMargin: '180px'});

async function upgradeCharacterImages(id) {
  if ((characterDetailFailures.get(id) || 0) > Date.now()) return;
  try {
    const previous = getCharacterDetail(id);
    const detail = await loadCharacterDetail(id);
    document.querySelectorAll(`[data-character-image="${Number(id)}"]`).forEach(image => {
      const source = image.dataset.imageVariant === 'detail' ? detail.portraitUrl : detail.imageUrl;
      if (source && image.getAttribute('src') !== source) image.src = source;
    });
    const character = characters.find(record => Number(record.encoreId) === Number(id));
    if (character?.apiOnly) {
      const statName = {HP:'hp',ATK:'atk',DEF:'def','Crit. Rate':'crit','Crit. DMG':'critDmg'};
      for (const [name,value] of Object.entries(detail.stats || {})) if (statName[name]) character.stats[statName[name]] = value;
    }
    if (detail !== previous) {
      characterDetailRevision++;
      if (state.route === 'characters' && state.detail && character?.slug === state.detail) scheduleRender();
    }
  } catch {
    characterDetailFailures.set(String(id),Date.now() + 60000);
    characterDetailRevision++;
    if (state.route === 'characters' && state.detail) scheduleRender();
  }
}

function observeCharacterImages() {
  app.querySelectorAll('.route-panel:not([hidden]) [data-character-image]').forEach(image => {
    if (observedCharacterImages.has(image)) return;
    observedCharacterImages.add(image); characterImageObserver.observe(image);
  });
}

let characterMediaRequest, characterMediaExpiresAt = 0;
const characterWeaponLookups = new Map();
function loadAssociatedCharacterWeapon(character) {
  if (!character?.apiOnly || !character.encoreId || character.signatureWeapon) return;
  const saved = characterWeaponLookups.get(character.encoreId);
  if (saved?.pending || saved?.expiresAt > Date.now()) return;
  characterWeaponLookups.set(character.encoreId,{pending: true});
  fetch(`/api/character-weapons/${character.encoreId}`,{signal: AbortSignal.timeout(35000)}).then(async response => {
    if (!response.ok) throw Error('Character weapon lookup unavailable');
    const payload = await response.json();
    const target = characters.find(record => record.encoreId === character.encoreId);
    if (target && /^\d{8}$/.test(String(payload.signatureWeapon?.id)) && payload.signatureWeapon.name && /^[a-z0-9-]+$/.test(payload.signatureWeapon.slug)) {
      target.signatureWeapon = payload.signatureWeapon;
      target.signatureWeaponSource = payload.sourceUrl;
      target.build.weapon = payload.signatureWeapon.name;
      characterDetailRevision++; scheduleRender();
    }
    characterWeaponLookups.set(character.encoreId,{expiresAt: Date.now() + 6 * 60 * 60 * 1000});
  }).catch(() => characterWeaponLookups.set(character.encoreId,{expiresAt: Date.now() + 5 * 60000}));
}
async function loadCharacterMedia() {
  if (characterMediaRequest || characterMediaExpiresAt > Date.now()) return characterMediaRequest;
  characterMediaRequest = (async () => {
    try {
      const response = await fetch('/api/character-media', {signal: AbortSignal.timeout(20000)});
      if (!response.ok) throw Error('Official videos unavailable');
      const payload = await response.json();
      if (payload.channelId !== 'UC0Bi5KMcECRVYis5Gb_ZYZQ') throw Error('Unexpected official channel');
      for (const character of characters) {
        const videoId = payload.videos?.[characterLookupKey(character)];
        if (/^[\w-]{11}$/.test(videoId || '') && !characterTrailers[character.slug]) characterTrailers[character.slug] = videoId;
      }
      characterMediaExpiresAt = Date.now() + 6 * 60 * 60 * 1000;
      characterDetailRevision++; scheduleRender();
    } catch {characterMediaExpiresAt = Date.now() + 5 * 60000;}
    finally {characterMediaRequest = null;}
  })();
  return characterMediaRequest;
}

let tierDataRequest, tierDataError = false, tierDataRevision = 0;
async function ensureTierData() {
  if (getTierSnapshot() || tierDataRequest || tierDataError) return tierDataRequest;
  tierDataRequest = loadTierSnapshot().catch(() => {tierDataError = true;}).finally(() => {
    tierDataRequest = null; tierDataRevision++; scheduleRender();
  });
  return tierDataRequest;
}
const tierRoleLabel = role => ({dps:'DPS',hybrid:'Hybrid',support:'Support'})[role];
function tierFilterSelect(name, title, values) {
  return '<label><span>'+title+'</span><select data-tier-filter="'+name+'">'+[['all',t('all')],...values.map(value=>[value,name==='role'?tierRoleLabel(value):name==='rarity'?value+'★':value])].map(([value,text])=>'<option value="'+escapeHtml(value)+'" '+(state.tierFilters[name]===String(value)?'selected':'')+'>'+escapeHtml(text)+'</option>').join('')+'</select></label>';
}
function renderTierCharacter(entry) {
  const {character,role,tier,sequence,sourceUrl}=entry;
  // The catalog's legacy Rover URL is shared; use its existing Encore head asset here.
  const avatarCharacter = /^Rover\s*\(/i.test(character.name) ? {...character,imageUrl:'https://api.encore.moe/resource/Data/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_'+(character.element==='Havoc'?'5':'4')+'_UI.webp'} : character;
  return '<article class="tier-resonator" data-tier-character="'+escapeHtml(tierProfileSlug(character))+'" data-tier-role="'+(role || 'unrated')+'" data-tier-grade="'+(tier || 'unrated')+'">'+
    '<a class="tier-character-link" href="'+pathFor('characters',state.lang,tierProfileSlug(character))+'" data-link>'+renderCharacterAvatar(avatarCharacter)+'<strong>'+escapeHtml(character.name)+'</strong></a>'+
    '<div class="tier-card-meta"><span class="pill pill--'+escapeHtml(character.element.toLowerCase())+'">'+escapeHtml(character.element)+'</span><span>'+character.rarity+'★'+(sequence?' · '+sequence:'')+'</span></div>'+
    (sourceUrl?'<a class="tier-review-link" href="'+escapeHtml(sourceUrl)+'" target="_blank" rel="noreferrer" aria-label="'+escapeHtml(label('Ver avaliação de ','Read review for ','Ver evaluación de ')+character.name+' · '+tierRoleLabel(role))+'">'+label('Avaliação ↗','Review ↗','Evaluación ↗')+'</a>':'')+'</article>';
}
function renderTierResults() {
  const data=getTierSnapshot();
  if (!data) return '<div class="empty-state" role="status"><h2>'+label('Avaliações da Tier List','Tier List ratings','Evaluaciones de la Tier List')+'</h2><p>'+(tierDataError?label('Não foi possível carregar as avaliações.','Unable to load ratings.','No se pudieron cargar las evaluaciones.'):label('Carregando dados verificados…','Loading verified data…','Cargando datos verificados…'))+'</p>'+(tierDataError?'<button type="button" class="favorite-wide" data-tier-retry>'+label('Tentar novamente','Try again','Reintentar')+'</button>':'')+'</div>';
  const entries=selectTierEntries(characters,data,{...state.tierFilters,mode:state.tierMode});
  const count=new Set(entries.map(entry=>tierCharacterKey(entry.character))).size;
  const total=new Set(characters.map(tierCharacterKey)).size;
  const roles=state.tierFilters.role==='all'?TIER_ROLES:[state.tierFilters.role];
  const rated=entries.filter(entry=>entry.tier),unrated=entries.filter(entry=>!entry.tier);
  const heading=state.tierMode==='ww'?'Whimpering Wastes':'Tower of Adversity';
  return '<div class="tier-results-summary"><div><p class="eyebrow">'+label('MODO DE JOGO','GAME MODE','MODO DE JUEGO')+'</p><h2>'+heading+'</h2></div><p data-tier-count role="status" aria-live="polite">'+count+' / '+total+' '+label('personagens','characters','personajes')+' · '+rated.length+' '+label('avaliações','ratings','evaluaciones')+'</p></div>'+
    '<p class="tier-order-note">'+label('Compare dentro da mesma função. A ordem dos personagens em cada tier é alfabética.','Compare within the same role. Characters within each tier are sorted alphabetically.','Compara dentro de la misma función. Los personajes de cada tier están en orden alfabético.')+'</p>'+
    (rated.length?'<div class="tier-matrix" style="--tier-columns:'+roles.length+'"><div class="tier-matrix-head"><span>Tier</span>'+roles.map(role=>'<strong>'+tierRoleLabel(role)+'</strong>').join('')+'</div>'+TIER_ORDER.map(tier=>{
      const tierEntries=rated.filter(entry=>entry.tier===tier);if(!tierEntries.length)return '';
      return '<section class="tier-matrix-row" data-tier-row="'+tier+'"><h3 class="tier-rank-label">'+tier+'</h3>'+roles.map(role=>{
        const cell=tierEntries.filter(entry=>entry.role===role);
        return '<div class="tier-role-cell"><h4>'+tierRoleLabel(role)+'</h4><div class="tier-cell-cards">'+(cell.map(renderTierCharacter).join('') || '<span class="tier-cell-empty" aria-label="'+label('Sem personagens nesta função e tier','No characters in this role and tier','Sin personajes en esta función y tier')+'">—</span>')+'</div></div>';
      }).join('')+'</section>';
    }).join('')+'</div>':'')+
    (unrated.length?'<section class="tier-unrated"><h3>'+label('Sem avaliação','Unrated','Sin evaluación')+'</h3><p>'+label('Estes personagens estão no catálogo, mas não têm avaliação neste snapshot da Prydwen. Não atribuímos notas estimadas.','These characters are in the catalog but have no rating in this Prydwen snapshot. No estimated tiers are assigned.','Estos personajes están en el catálogo, pero no tienen evaluación en este snapshot de Prydwen. No se asignan tiers estimados.')+'</p><div class="tier-unrated-grid">'+unrated.map(renderTierCharacter).join('')+'</div></section>':'')+
    (!entries.length?'<div class="empty-state"><h3>'+label('Nenhum personagem encontrado','No characters found','No se encontraron personajes')+'</h3><p>'+label('Ajuste a pesquisa ou limpe os filtros.','Adjust your search or reset the filters.','Ajusta la búsqueda o limpia los filtros.')+'</p><button type="button" class="favorite-wide" data-tier-reset>'+label('Limpar filtros','Reset filters','Limpiar filtros')+'</button></div>':'');
}
function updateTierResults() {
  const panel=routePanels.get(routeCacheKey()),results=panel?.querySelector('[data-tier-results]');
  if (!results || state.route!=='tier') return;
  results.innerHTML=renderTierResults();panel.dataset.signature=routeSignature();
  applyAccessibility(results,state.lang);observeCharacterImages();
}
function tierReferenceDate(value) {
  return new Intl.DateTimeFormat(state.lang,{timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));
}
function renderTierPage() {
  const data=getTierSnapshot();
  return renderPageHero(t('navTier'),t('pageTierDesc'),'ENDGAME / META')+
    '<section class="page-band"><div class="container tier-catalog">'+
    '<div class="tier-reference"><div><p class="eyebrow">'+label('REFERÊNCIA VERIFICADA','VERIFIED REFERENCE','REFERENCIA VERIFICADA')+'</p><strong>Prydwen · '+label('Patch','Patch','Parche')+' '+(data?.patch || '—')+'</strong><p>'+(data ? label('Referência atualizada em ','Source updated ','Referencia actualizada el ')+tierReferenceDate(data.sourceUpdatedAt)+' · '+label('Conferida em ','Verified ','Verificada el ')+tierReferenceDate(data.verifiedAt) : label('Carregando referência…','Loading reference…','Cargando referencia…'))+'</p></div><a class="text-link" href="'+TIER_SOURCE+'" target="_blank" rel="noreferrer">'+label('Consultar referência ↗','View reference ↗','Consultar referencia ↗')+'</a></div>'+
    '<details class="tier-criteria"><summary>'+label('Como ler esta Tier List','How to read this Tier List','Cómo leer esta Tier List')+'</summary><div class="tier-criteria-content"><p>'+label('A avaliação considera o desempenho em equipes e a execução das rotações em cada modo. Uma nota não representa o dano isolado do personagem.','Ratings consider team performance and rotation execution in each mode. A tier does not measure isolated character damage.','La evaluación considera el rendimiento en equipos y la ejecución de rotaciones en cada modo. Un tier no mide el daño aislado del personaje.')+'</p><dl><div><dt>DPS</dt><dd>'+label('Responsável pelo dano principal da composição.','Provides the team’s primary damage.','Aporta el daño principal del equipo.')+'</dd></div><div><dt>Hybrid</dt><dd>'+label('Combina dano próprio com buffs, efeitos ou sinergias para a equipe.','Combines personal damage with buffs, effects or team synergies.','Combina daño propio con buffs, efectos o sinergias para el equipo.')+'</dd></div><div><dt>Support</dt><dd>'+label('Prioriza buffs, sustentação e utilidade para a composição.','Focuses on buffs, sustain and team utility.','Prioriza buffs, sostenimiento y utilidad para el equipo.')+'</dd></div></dl><p>'+label('S0, S2 e S6 indicam a sequência de ressonância usada na avaliação. Personagens com duas funções aparecem em ambas, com notas independentes.','S0, S2 and S6 indicate the Resonance Chain used for the rating. Characters with two roles appear in both, with independent ratings.','S0, S2 y S6 indican la secuencia de resonancia usada en la evaluación. Los personajes con dos funciones aparecen en ambas, con notas independientes.')+'</p><p>'+label('T0 é o topo da escala; T4 é o nível inferior. Usamos a lista de desempenho, sem misturar as avaliações de custo-benefício (Value). A dificuldade de execução, as sinergias e os investimentos podem mudar o resultado da sua equipe.','T0 is the top of the scale; T4 is the lowest tier. We use performance ratings separately from the Value list. Execution difficulty, synergies and investment can change your team’s results.','T0 es el nivel superior; T4 es el inferior. Usamos evaluaciones de rendimiento sin mezclarlas con la lista Value. La dificultad de ejecución, las sinergias y la inversión pueden cambiar los resultados del equipo.')+'</p></div></details>'+
    '<div class="tier-mode-switch" role="group" aria-label="'+label('Modo de jogo','Game mode','Modo de juego')+'">'+['toa','ww'].map(mode=>'<button type="button" data-tier-mode="'+mode+'" aria-pressed="'+(state.tierMode===mode)+'" class="'+(state.tierMode===mode?'is-active':'')+'">'+(mode==='toa'?'Tower of Adversity':'Whimpering Wastes')+'</button>').join('')+'</div>'+
    '<div class="tier-filters"><label class="tier-search"><span>'+label('Pesquisar personagem','Search character','Buscar personaje')+'</span><input type="search" data-tier-search value="'+escapeHtml(state.tierFilters.query)+'" placeholder="'+label('Nome do personagem…','Character name…','Nombre del personaje…')+'" autocomplete="off"></label>'+
    tierFilterSelect('element',t('element'),[...new Set(characters.map(character=>character.element))].sort())+tierFilterSelect('weapon',t('weapon'),[...new Set(characters.map(character=>character.weapon))].sort())+tierFilterSelect('rarity',label('Raridade','Rarity','Rareza'),['4','5'])+tierFilterSelect('role',label('Função','Role','Función'),TIER_ROLES)+'<button type="button" class="tier-reset" data-tier-reset>'+label('Limpar filtros','Reset filters','Limpiar filtros')+'</button></div>'+
    '<div data-tier-results>'+renderTierResults()+'</div></div></section>';
}

function renderEchoesPage() {
  return `
    ${renderPageHero(t("navEchoes"), t("pageEchoesDesc"), t("database"))}
    <section class="page-band">
      <div class="container">
        <div class="echo-grid">
          ${echoes.map((echo) => `
            <article class="data-card echo-card">
              ${renderItemAssetImage("echo", echo)}
              <div class="card-topline">
                <span class="pill">${echo.element}</span>
                <strong>${echo.bestFor.join(" • ")}</strong>
              </div>
              <div class="card-body">
                <h3>${echo.name}</h3>
                <p><strong>2p:</strong> ${echo.effect2}</p>
                <p><strong>5p:</strong> ${echo.effect5}</p>
                <div class="tag-row">
                  ${echo.sources.map((source) => `<span>${source}</span>`).join("")}
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

let weaponsReady = false, weaponRequest, weaponRevision = 0, weaponError = false;
const weaponDetails = new Map();
async function ensureWeapons() {
  if (weaponsReady || weaponRequest) return weaponRequest;
  weaponRequest = loadWeaponCatalog().then(items=>{
    for(const item of items){const old=weapons.find(w=>w.slug===item.slug || w.name===item.name);if(old)Object.assign(old,item);else weapons.push({...item,baseAtk:null,stat:'—',passive:'',recommended:[]});}
    for (const character of characters) {const weapon = weapons.find(item => Number(item.id) === character.signatureWeapon?.id); if (weapon) weapon.recommended = [...new Set([...(weapon.recommended || []),character.name])];}
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
  if(state.detail)return renderWeaponDetail(state.detail);
  const types = ["all", ...new Set(weapons.map((weapon) => weapon.type))];
  const filtered = state.weaponFilter === "all"
    ? weapons
    : weapons.filter((weapon) => weapon.type === state.weaponFilter);

  return `
    ${renderPageHero(t("navWeapons"), t("pageWeaponsDesc"), t("database"))}
    <section class="page-band">
      <div class="container">
        <div class="toolbar">
          <label>
            <span>${t("weapon")}</span>
            <select data-weapon-filter>
              ${types.map((type) => `
                <option value="${type}" ${state.weaponFilter === type ? "selected" : ""}>
                  ${type === "all" ? t("all") : type}
                </option>
              `).join("")}
            </select>
          </label>
        </div>
        <div class="weapon-grid">
          ${filtered.map((weapon) => `
            <article class="data-card weapon-card">
              ${renderItemAssetImage("weapon", weapon)}
              <div class="card-topline">
                <span class="pill">${weapon.type}</span>
                <span>${stars(weapon.rarity)}</span>
              </div>
              <div class="card-body">
                <h3><a data-link href="${pathFor("weapons",state.lang,weapon.slug)}">${escapeHtml(weapon.name)} ↗</a></h3>
                <dl class="mini-dl">
                  <div><dt>ATK</dt><dd>${weapon.baseAtk ?? "—"}</dd></div>
                  <div><dt>${t("substat")}</dt><dd>${weapon.stat}</dd></div>
                </dl>
                <p>${weapon.passive}</p>
                <div class="tag-row">
                  ${weapon.recommended.map((name) => `<span>${name}</span>`).join("")}
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderItemsPage() {
  const grouped = [...new Set(items.map((item) => item.type))].map((type) => ({
    type,
    items: items.filter((item) => item.type === type)
  }));

  return `
    ${renderPageHero(t("navItems"), t("pageItemsDesc"), "Farm")}
    <section class="page-band page-band--deep">
      <div class="container split-layout">
        <article class="panel">
          <h2>${t("farmPriorities")}</h2>
          <p>${t("farmPrioritiesDesc")}</p>
          <div class="stat-grid">
            <div class="stat-tile">
              <span>${t("catalogedItems")}</span>
              <strong>${items.length}</strong>
            </div>
            <div class="stat-tile">
              <span>${t("resourceTypes")}</span>
              <strong>${grouped.length}</strong>
            </div>
            <div class="stat-tile">
              <span>${t("universalUse")}</span>
              <strong>${items.filter((item) => item.usedBy.includes("Todos")).length}</strong>
            </div>
            <div class="stat-tile">
              <span>${t("limitedTime")}</span>
              <strong>${items.filter((item) => item.days === "Tempo limitado").length}</strong>
            </div>
          </div>
        </article>
        <article class="panel">
          <h2>${t("weeklyCalendar")}</h2>
          <ol class="ranked-list">
            ${weeklyFarmPlan.map((slot) => `
              <li>
                <span>${slot.day.slice(0, 2)}</span>
                <div>
                  <strong>${slot.focus}</strong>
                  <small>${slot.note}</small>
                </div>
              </li>
            `).join("")}
          </ol>
        </article>
      </div>
    </section>
    <section class="page-band">
      <div class="container">
        ${grouped.map((group) => `
          <section class="panel" style="margin-bottom: 16px;">
            <div class="section-header" style="margin-bottom: 16px;">
              <div>
                <p class="eyebrow">${t("category")}</p>
                <h2>${group.type}</h2>
                <p>${group.items.length} ${t("listedItems")}</p>
              </div>
            </div>
            <div class="guide-grid">
              ${group.items.map((item) => `
                <article class="data-card">
                  <div class="card-topline">
                    <span class="pill">${item.type}</span>
                    <strong>${item.days}</strong>
                  </div>
                  <div class="card-body">
                    <h3>${item.name}</h3>
                    <p><strong>${t("source")}:</strong> ${item.source}</p>
                    <div class="tag-row">
                      ${item.usedBy.map((name) => `<span>${name}</span>`).join("")}
                    </div>
                  </div>
                </article>
              `).join("")}
            </div>
          </section>
        `).join("")}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>${t("item")}</th>
                <th>${t("type")}</th>
                <th>${t("source")}</th>
                <th>${t("days")}</th>
                <th>${t("users")}</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.type}</td>
                  <td>${item.source}</td>
                  <td>${item.days}</td>
                  <td>${item.usedBy.join(" â€¢ ")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  return `
    ${renderPageHero(t("navItems"), t("pageItemsDesc"), "Farm")}
    <section class="page-band">
      <div class="container">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>${t("item")}</th>
                <th>${t("type")}</th>
                <th>${t("source")}</th>
                <th>${t("days")}</th>
                <th>${t("users")}</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.type}</td>
                  <td>${item.source}</td>
                  <td>${item.days}</td>
                  <td>${item.usedBy.join(" • ")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function renderGuidePage() {
  const glossary = [
    ["Intro Skill", "Entrada que prepara buffs e gera energia"],
    ["Outro Skill", "Troca que fortalece o proximo personagem"],
    ["Forte Circuit", "Mecanica central de dano e recursos"],
    ["Tacet Field", "Dominios de farm para eco e materiais"],
    ["Tower", "Conteudo endgame com score e rotacoes"]
  ];

  const foundationCards = [
    {
      title: "Loop de combate",
      body: "Intro > aplicacao > janela de burst > troca segura. Esse fluxo evita tempo ocioso e facilita o empilhamento de buffs."
    },
    {
      title: "Papéis de equipe",
      body: "Monte sempre um carry principal, um personagem de suporte e um sub-DPS que mantenha pressao enquanto o carry recarrega."
    },
    {
      title: "Prioridade de progresso",
      body: "Boss semanal, material ascensao, domínios de eco e depois otimização de substats. Isso acelera conta nova e recicla stamina bem."
    }
  ];

  return `
    ${renderPageHero(t("pageGuideTitle"), t("pageGuideDesc"), t("navGuide"))}
    <section class="page-band page-band--deep">
      <div class="container split-layout">
        <article class="panel">
          <h2>${t("guideBasics")}</h2>
          <div class="guide-grid">
            ${foundationCards.map((card) => `
              <article class="data-card">
                <div class="card-body">
                  <span class="pill">Core</span>
                  <h3>${card.title}</h3>
                  <p>${card.body}</p>
                </div>
              </article>
            `).join("")}
          </div>
        </article>
        <article class="panel">
          <h2>${t("quickChecklist")}</h2>
          <ol class="ranked-list">
            ${guides.slice(-3).map((guide) => `
              <li>
                <span>${guide.minutes}</span>
                <div>
                  <strong>${guide.title}</strong>
                  <small>${guide.tag} - ${guide.body}</small>
                </div>
              </li>
            `).join("")}
          </ol>
        </article>
      </div>
    </section>
    <section class="page-band">
      <div class="container">
        <div class="section-header">
          <div>
            <p class="eyebrow">${t("readings")}</p>
            <h2>${t("detailedGuides")}</h2>
            <p>${t("detailedGuidesDesc")}</p>
          </div>
        </div>
        <div class="guide-grid">
          ${guides.map((guide) => `
            <article class="data-card guide-card">
              <div class="card-body">
                <span class="pill">${guide.tag}</span>
                <h3>${guide.title}</h3>
                <p>${guide.body}</p>
                <small>${guide.minutes} min</small>
              </div>
            </article>
          `).join("")}
        </div>
        <div class="table-wrap" style="margin-top: 16px;">
          <table>
            <thead>
              <tr>
                <th>${t("term")}</th>
                <th>${t("users")}</th>
              </tr>
            </thead>
            <tbody>
              ${glossary.map(([term, meaning]) => `
                <tr>
                  <td>${term}</td>
                  <td>${meaning}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;

  return `
    ${renderPageHero(t("pageGuideTitle"), t("pageGuideDesc"), t("navGuide"))}
    <section class="page-band">
      <div class="container guide-grid">
        ${guides.map((guide) => `
          <article class="data-card guide-card">
            <div class="card-body">
              <span class="pill">${guide.tag}</span>
              <h3>${guide.title}</h3>
              <p>${guide.body}</p>
              <small>${guide.minutes} min</small>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCodesPage() {
  return `
    ${renderPageHero(t("pageCodesTitle"), t("pageCodesDesc"), "Rewards")}
    <section class="page-band">
      <div class="container compact-section">
        <p class="notice">${t("mockNotice")}</p>
        ${renderCodesWidget(true)}
      </div>
    </section>
  `;
}

function selectedBuilderCharacter() {
  return characters.find((item) => item.slug === state.builder.character) || characters[0];
}

function compatibleBuilderWeapons(character = selectedBuilderCharacter()) {
  if (!character?.weapon) return weapons;
  const compatible = weapons.filter((weapon) => weapon.type === character.weapon);
  return compatible.length ? compatible : weapons;
}

function normalizeBuilderWeapon(character = selectedBuilderCharacter()) {
  // Preserve saved API equipment until its catalogs finish loading.
  const awaitingCharacter = !dataRequests.charactersLoaded && !characters.some(item => item.slug === state.builder.character);
  const awaitingWeapon = !weaponsReady && !weapons.some(item => item.slug === state.builder.weapon);
  if (awaitingCharacter || awaitingWeapon) {
    return weapons.find(item => item.slug === state.builder.weapon) || {slug: state.builder.weapon, name: label('Carregando arma…','Loading weapon…','Cargando arma…'), type: character.weapon, rarity: 0, baseAtk: 0, stat: '—', passive: '', recommended: []};
  }
  const compatible = compatibleBuilderWeapons(character);
  const current = compatible.find((weapon) => weapon.slug === state.builder.weapon);
  if (current) return current;

  state.builder.weapon = compatible[0]?.slug || state.builder.weapon;
  state.builderFilter.weapon = "all";
  return compatible[0] || weapons[0];
}

function builderItems(kind) {
  if (kind === "weapon") return compatibleBuilderWeapons();
  if (kind === "echo") return builderEchoes;
  return characters;
}

function builderSelectedSlug(kind) {
  return kind === "echo" ? state.builder.echoes[builderUI.slot]?.slug : state.builder[kind];
}

function builderFilterValue(kind, item) {
  if (kind === "character") return item.element;
  if (kind === "weapon") return String(item.rarity);
  return String(item.cost);
}

function builderFilterLabel(kind, value) {
  if (value === "all") return t("all");
  if (kind === "weapon") return stars(Number(value));
  return kind === "echo" ? `${bt("cost")} ${value}` : value;
}

function builderFilterOptions(kind) {
  return ["all", ...new Set(builderItems(kind).map((item) => builderFilterValue(kind, item)).filter(Boolean))];
}

function effectiveBuilderFilter(kind) {
  const options = builderFilterOptions(kind);
  return options.includes(state.builderFilter[kind]) ? state.builderFilter[kind] : "all";
}

function builderSearchText(kind, item) {
  if (kind === "character") return [item.name, item.element, item.weapon, item.role, ...(item.tags || [])].join(" ");
  if (kind === "weapon") return [item.name, item.type, item.stat, ...(item.recommended || [])].join(" ");
  return [item.name, ...(item.aliases || []), item.cost, ...item.sets.map((slug) => builderSonatas.find((set) => set.slug === slug)?.name)].join(" ");
}

function filteredBuilderItems(kind) {
  const query = state.builderSearch[kind].trim().toLowerCase();
  const filter = effectiveBuilderFilter(kind);

  return builderItems(kind).filter((item) => {
    const matchesSearch = !query || builderSearchText(kind, item).toLowerCase().includes(query);
    const matchesFilter = filter === "all" || builderFilterValue(kind, item) === filter;
    const matchesSet = kind !== "echo" || !builderUI.set || item.sets.includes(builderUI.set);
    return matchesSearch && matchesFilter && matchesSet;
  });
}

function renderBuilderItemIcon(kind, item) {
  const imageUrl = item.iconUrl || item.imageUrl || itemAssetUrl(kind, item);
  const fallbackLabel = kind === "weapon" ? item.type.slice(0, 2) : String(item.cost || "E").slice(0, 2);

  if (!imageUrl) {
    return `<span class="builder-option-mark">${escapeHtml(fallbackLabel)}</span>`;
  }

  return `
    <span class="builder-option-icon" data-kind="${kind}">
      <img
        src="${escapeHtml(imageUrl)}"
        alt="${escapeHtml(item.name)}"
        width="110"
        height="110"
        data-fallback-src="${escapeHtml(item.iconFallbackUrl || "")}"
        loading="lazy"
        decoding="async"
        onerror="if(this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;delete this.dataset.fallbackSrc;return;}this.onerror=null;this.src='${ITEM_FALLBACK_IMAGE}';var p=this.parentElement;if(p)p.classList.add('is-fallback');"
      />
    </span>
  `;
}

function builderStatTargets(character, weapon, echo) {
  const templates = {
    dps: { atk: 1800, hp: 12000, crit: 78, energy: "120% - 140%" },
    sub: { atk: 1600, hp: 11500, crit: 68, energy: "140% - 170%" },
    support: { atk: 1350, hp: 15000, crit: 45, energy: "180% - 220%" },
    control: { atk: 1500, hp: 12500, crit: 58, energy: "130% - 160%" }
  };
  const base = templates[character.role] || templates.dps;
  const needsEnergy = [...(character.build.mainStats || []), weapon.stat, echo.effect2]
    .join(" ")
    .toLowerCase()
    .includes("energy");

  return {
    ...base,
    energy: needsEnergy ? base.energy : base.energy.replace("140%", "130%").replace("170%", "150%"),
    priority: character.build.mainStats.join(" > ")
  };
}

function renderTargetBar(label, value, target) {
  const percent = Math.min(100, Math.round((value / target) * 100));
  const reached = value >= target;

  return `
    <div class="target-row ${reached ? "is-ready" : ""}">
      <div>
        <span>${label}</span>
        <strong>${value} / ${target}</strong>
        <small>${reached ? t("targetReached") : t("targetMissing")}</small>
      </div>
      <span class="target-bar"><i style="width:${percent}%"></i></span>
    </div>
  `;
}

function renderBuilderStatTargets(character, weapon, echo, stats) {
  const targets = builderStatTargets(character, weapon, echo);

  return `
    <article class="panel stat-target-panel">
      <h3>${t("statTargets")}</h3>
      <p>${t("statTargetsDesc")}</p>
      <div class="target-grid">
        ${renderTargetBar("ATK", stats.atk, targets.atk)}
        ${renderTargetBar("HP", stats.hp, targets.hp)}
        ${renderTargetBar("Crit Score", stats.crit, targets.crit)}
      </div>
      <dl class="mini-dl">
        <div><dt>${t("suggestedEnergy")}</dt><dd>${targets.energy}</dd></div>
        <div><dt>${t("priorityStats")}</dt><dd>${escapeHtml(targets.priority)}</dd></div>
      </dl>
    </article>
  `;
}

function renderCharacterStatTargetSummary(character) {
  const weapon = weapons.find((item) => item.name === character.build.weapon) || weapons.find((item) => item.type === character.weapon) || weapons[0];
  const echoName = character.build.echoes.replace(" 5p", "");
  const echo = echoes.find((item) => item.name === echoName) || echoes[0];
  const targets = builderStatTargets(character, weapon, echo);

  return `
    <article class="panel stat-target-panel">
      <h2>${t("statTargets")}</h2>
      <p>${t("statTargetsDesc")}</p>
      <div class="target-summary-grid">
        <div><span>ATK</span><strong>${targets.atk}+</strong></div>
        <div><span>HP</span><strong>${targets.hp}+</strong></div>
        <div><span>Crit Score</span><strong>${targets.crit}+</strong></div>
        <div><span>${t("suggestedEnergy")}</span><strong>${targets.energy}</strong></div>
      </div>
      <dl class="mini-dl">
        <div><dt>${t("priorityStats")}</dt><dd>${escapeHtml(targets.priority)}</dd></div>
        <div><dt>${t("echoes")}</dt><dd>${escapeHtml(character.build.echoes)}</dd></div>
      </dl>
    </article>
  `;
}

function builderCost(except = -1) {
  return state.builder.echoes.reduce((sum, slot, index) => sum + (index === except ? 0 : builderEchoes.find((e) => e.slug === slot.slug)?.cost || 0), 0);
}

function renderBuilderOption(kind, item) {
  const selected = item.slug === builderSelectedSlug(kind);
  const disabled = kind === "echo" && builderCost(builderUI.slot) + item.cost > 12;
  const meta = kind === "character" ? item.element + " · " + item.weapon : kind === "weapon" ? item.type + " · " + item.stat : bt("cost") + " " + item.cost;
  return '<button class="builder-option' + (selected ? ' is-active' : '') + '" type="button" data-builder-pick="' + kind + '" data-value="' + item.slug + '" aria-pressed="' + selected + '" ' + (disabled ? 'disabled title="' + bt("capacity") + '"' : '') + '>' +
    (kind === "character" ? renderCharacterAvatar(item) : renderBuilderItemIcon(kind, item)) +
    '<span class="builder-option-info"><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(meta) + '</small><span class="builder-rarity">' + (kind === "echo" ? (disabled ? bt("capacity") : '★★★★★') : stars(item.rarity)) + '</span></span></button>';
}

function renderBuilderOptions(kind) {
  const items = filteredBuilderItems(kind);
  return items.length ? items.map((item) => renderBuilderOption(kind, item)).join("") : '<div class="empty-state builder-empty">' + t("builderEmpty") + '</div>';
}

function renderBuilderPicker(kind, title, placeholder) {
  const filter = effectiveBuilderFilter(kind);
  return '<section class="builder-picker" data-builder-picker="' + kind + '">' +
    '<div class="builder-picker-head"><div><p class="eyebrow">' + bt("select") + '</p><h2 id="builder-dialog-title">' + title + '</h2></div><button type="button" class="builder-icon-button" data-builder-close aria-label="' + bt("close") + '">×</button></div>' +
    '<div class="builder-picker-tools"><input aria-label="' + placeholder + '" type="search" value="' + escapeHtml(state.builderSearch[kind]) + '" placeholder="' + placeholder + '" data-builder-search="' + kind + '">' +
    '<select aria-label="' + bt("filter") + '" data-builder-filter="' + kind + '">' + builderFilterOptions(kind).map((value) => '<option value="' + value + '" ' + (filter === value ? 'selected' : '') + '>' + builderFilterLabel(kind, value) + '</option>').join('') + '</select></div>' +
    '<p class="builder-picker-count"><span data-builder-count="' + kind + '">' + filteredBuilderItems(kind).length + ' ' + bt("available") + '</span>' + (kind === "echo" ? '<span>' + bt("cost") + ' ' + builderCost(builderUI.slot) + ' / 12 · Echo ' + (builderUI.slot + 1) + '</span>' : '') + '</p>' +
    '<div class="builder-option-grid" data-builder-options="' + kind + '">' + renderBuilderOptions(kind) + '</div></section>';
}

function openBuilderPicker(kind, slot, opener) {
  closeBuilderPicker(false);
  builderUI.kind = kind; builderUI.slot = slot; builderUI.opener = opener;
  const dialog = document.createElement("dialog");
  dialog.className = "builder-dialog";
  dialog.setAttribute("aria-labelledby", "builder-dialog-title");
  dialog.setAttribute("data-builder-dialog", "");
  const label = kind === "character" ? t("navCharacters") : kind === "weapon" ? t("weapon") : "Echo " + (slot + 1);
  const search = kind === "character" ? t("searchCharacter") : kind === "weapon" ? t("searchWeapon") : t("searchEcho");
  dialog.innerHTML = renderBuilderPicker(kind, label, search);
  if (kind === "echo") {
    const filter = document.createElement("select");
    filter.setAttribute("aria-label", bt("set"));
    filter.dataset.builderSetFilter = "";
    filter.innerHTML = '<option value="">' + t("all") + ' · Sonata</option>' + builderSonatas.map((set) => '<option value="' + set.slug + '">' + escapeHtml(set.name) + '</option>').join('');
    filter.value = builderUI.set || "";
    dialog.querySelector('.builder-picker-tools').appendChild(filter);
  }
  app.appendChild(dialog);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeBuilderPicker(); });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeBuilderPicker(); });
  dialog.showModal();
  dialog.querySelector("input")?.focus();
}

function closeBuilderPicker(restoreFocus = true) {
  cancelPendingSearch();
  const dialog = app.querySelector("[data-builder-dialog]");
  if (dialog) { dialog.close(); dialog.remove(); }
  if (restoreFocus) {
    const fallback = routePanels.get(routeCacheKey())?.querySelector('[data-builder-open="' + builderUI.kind + '"]' + (builderUI.kind === "echo" ? '[data-slot="' + builderUI.slot + '"]' : ''));
    (builderUI.opener?.isConnected ? builderUI.opener : fallback)?.focus();
  }
  builderUI.kind = "";
}

function updateBuilderPicker(kind) {
  const picker = app.querySelector('[data-builder-dialog] [data-builder-picker="' + kind + '"]');
  if (!picker) return;
  picker.querySelector('[data-builder-options="' + kind + '"]').innerHTML = renderBuilderOptions(kind);
  picker.querySelector('[data-builder-count="' + kind + '"]').textContent = filteredBuilderItems(kind).length + ' ' + bt("available");
  const panel = routePanels.get(routeCacheKey());
  if (panel) panel.dataset.signature = routeSignature();
}

function builderStatOptions(keys, value, excluded = []) {
  return '<option value="">— ' + bt("select") + ' —</option>' + keys.map((key) => '<option value="' + key + '" ' + (key === value ? 'selected' : '') + (excluded.includes(key) && key !== value ? ' disabled' : '') + '>' + builderStats[key] + '</option>').join('');
}

function renderBuilderEcho(slot, index) {
  const item = builderEchoes.find((e) => e.slug === slot.slug);
  const disabled = item ? '' : 'disabled';
  const unlocked = Math.floor(slot.level / 5);
  const numeric = (field, value, max = 99999, extra = '') => '<input type="number" min="0" max="' + max + '" step="' + (field === "level" ? '1' : '0.1') + '" value="' + value + '" data-echo-index="' + index + '" data-echo-field="' + field + '" ' + disabled + ' ' + extra + '>';
  return '<article class="builder-echo-card ' + (item ? 'is-equipped' : 'is-empty') + '" data-echo-card="' + index + '">' +
    '<header><span class="builder-slot-number">0' + (index + 1) + '</span><strong>Echo ' + (index + 1) + '</strong>' + (index === 0 ? '<span class="builder-main-tag">' + bt("main") + '</span>' : '') +
    '<button type="button" class="builder-icon-button" data-builder-remove="' + index + '" aria-label="' + bt("remove") + ' ' + (index + 1) + '" ' + disabled + '>×</button></header>' +
    '<button type="button" class="builder-echo-select" data-builder-open="echo" data-slot="' + index + '" aria-label="' + (item ? bt("change") + ' ' + item.name : bt("empty") + ' ' + (index + 1)) + '">' +
    (item ? renderBuilderItemIcon("echo", item) : '<span class="builder-empty-art" aria-hidden="true">◇<i>+</i></span>') +
    '<strong>' + escapeHtml(item?.name || bt("empty")) + '</strong><small>' + (item ? '<span class="builder-rarity">★★★★★</span> · ' + bt("cost") + ' ' + item.cost : bt("select") + ' →') + '</small></button>' +
    '<div class="builder-echo-fields"><label class="builder-echo-level"><span>' + bt("level") + '</span>' + numeric("level", slot.level, 25) + '<small>/ 25</small></label>' +
    '<label><span>' + bt("set") + '</span><select data-echo-index="' + index + '" data-echo-field="set" ' + disabled + '>' + (item ? item.sets.map((slug) => '<option value="' + slug + '" ' + (slug === slot.set ? 'selected' : '') + '>' + escapeHtml(builderSonatas.find((e) => e.slug === slug)?.name) + '</option>').join('') : '<option>—</option>') + '</select></label>' +
    '<label><span>' + bt("mainStat") + '</span><select data-echo-index="' + index + '" data-echo-field="mainStat" ' + disabled + '>' + builderStatOptions(builderMainStats[item?.cost] || [], slot.mainStat) + '</select></label>' +
    '<label class="builder-stat-value"><span>' + bt("value") + '</span>' + numeric("mainValue", slot.mainValue, 99999, slot.mainStat ? '' : 'disabled') + '</label>' +
    '<label class="builder-stat-value"><span>' + bt("secondary") + ' · ' + (item?.cost === 1 ? 'HP' : 'ATK') + '</span>' + numeric("secondaryValue", slot.secondaryValue) + '</label>' +
    (item && index > 0 ? '<button type="button" class="builder-text-button builder-promote" data-builder-main="' + index + '">' + bt("makeMain") + ' ↑</button>' : '') +
    '<details class="builder-substats"><summary>' + bt("substats") + ' <span>' + unlocked + ' / 5</span></summary>' + slot.substats.map((sub, i) => {
      const locked = !item || i >= unlocked;
      return '<div class="builder-substat-row"><label><span>' + bt("substats") + ' ' + (i + 1) + '</span><select data-echo-index="' + index + '" data-echo-sub="' + i + '" data-echo-field="stat" ' + (locked ? 'disabled' : '') + '>' + builderStatOptions(builderSubStats, sub.stat, slot.substats.map((s) => s.stat)) + '</select></label>' +
        '<input aria-label="' + bt("value") + ' ' + (i + 1) + '" type="number" min="0" max="99999" step="0.1" value="' + sub.value + '" data-echo-index="' + index + '" data-echo-sub="' + i + '" data-echo-field="value" ' + (locked || !sub.stat ? 'disabled' : '') + '>' + (locked ? '<small>' + bt("locked") + ' ' + ((i + 1) * 5) + '</small>' : '') + '</div>';
    }).join('') + '</details></div></article>';
}

function builderTotals() {
  const totals = Object.fromEntries(Object.keys(builderStats).map((key) => [key, 0]));
  for (const slot of state.builder.echoes) {
    const item = builderEchoes.find((e) => e.slug === slot.slug);
    if (!item) continue;
    if (slot.mainStat in totals) totals[slot.mainStat] += slot.mainValue;
    totals[item.cost === 1 ? "hp" : "atk"] += slot.secondaryValue;
    slot.substats.slice(0, Math.floor(slot.level / 5)).forEach((sub) => { if (sub.stat in totals) totals[sub.stat] += sub.value; });
  }
  return totals;
}

function renderBuilderBonuses() {
  const totals = builderTotals();
  const main = ["atkPercent", "critRate", "critDamage", "energy"];
  const value = (key) => '+' + Number(totals[key].toFixed(1)).toLocaleString(currentLocale()) + (["atk", "hp", "def"].includes(key) ? '' : '%');
  return '<div class="builder-bonus-grid">' + main.map((key) => '<div><span>' + builderStats[key] + '</span><strong>' + value(key) + '</strong></div>').join('') + '</div>' +
    '<dl class="builder-bonus-list">' + Object.keys(totals).filter((key) => !main.includes(key) && (totals[key] || ["hp", "atk", "def"].includes(key))).map((key) => '<div><dt>' + builderStats[key] + '</dt><dd>' + value(key) + '</dd></div>').join('') + '</dl>';
}

function renderBuilderSonatas() {
  const sets = new Map();
  state.builder.echoes.forEach((slot) => {
    if (!slot.slug || !slot.set) return;
    if (!sets.has(slot.set)) sets.set(slot.set, new Set());
    sets.get(slot.set).add(slot.slug);
  });
  if (!sets.size) return '<p class="builder-muted">' + bt("noSets") + '</p>';
  return [...sets].map(([slug, members]) => {
    const set = builderSonatas.find((e) => e.slug === slug);
    if (!set) return '';
    const maximum = Math.max(1, ...set.bonuses.map((bonus) => bonus.count));
    return '<div class="builder-sonata"><div><strong>' + escapeHtml(set.name) + '</strong><span>' + members.size + ' / ' + maximum + '</span></div><div class="builder-set-progress">' + Array.from({ length: maximum }, (_, i) => '<i class="' + (i < members.size ? 'is-active' : '') + '"></i>').join('') + '</div>' + set.bonuses.map((bonus) => '<p>' + (members.size >= bonus.count ? '✓ ' : '') + bonus.count + ' ' + bt("pieces") + ': ' + escapeHtml(bonus.description) + '</p>').join('') + '</div>';
  }).join('');
}

function updateBuilderSummary() {
  const panel = routePanels.get(routeCacheKey());
  if (!panel) return;
  panel.querySelector('[data-builder-bonuses]').innerHTML = renderBuilderBonuses();
  panel.querySelector('[data-builder-message]').textContent = state.builderMessage ? bt(state.builderMessage) : bt("unsaved");
  panel.dataset.signature = routeSignature();
}

function renderBuilderPage() {
  if (!builderEchoes.length) return '<section class="builder-workspace"><div class="container builder-shell"><h1>' + bt("title") + '</h1><div class="empty-state" role="status"><p>' + bt(builderCatalogError ? "catalogError" : "catalogLoading") + '</p>' + (builderCatalogError ? '<button type="button" class="builder-button" data-builder-retry>' + bt("retry") + '</button>' : '') + '</div></div></section>';
  const character = selectedBuilderCharacter();
  const weapon = normalizeBuilderWeapon(character);
  const used = state.builder.echoes.filter((e) => e.slug).length;
  const numberField = (field, label, value, max) => '<label class="builder-number-field"><span>' + label + '</span><div><input aria-label="' + label + '" type="number" min="1" max="' + max + '" step="1" data-builder-field="' + field + '" value="' + value + '"><small>/ ' + max + '</small></div></label>';
  return '<section class="builder-workspace"><div class="container builder-shell">' +
    '<header class="builder-heading"><div><p class="eyebrow">SOLARIS ARCHIVE / BUILD LAB</p><h1>' + bt("title") + '</h1><p>' + bt("description") + '</p></div><span class="builder-heading-mark" aria-hidden="true">◇</span></header>' +
    (builderCatalogError ? '<p role="status" class="builder-input-hint">' + bt("catalogStale") + ' <button type="button" class="builder-text-button" data-builder-retry>' + bt("retry") + '</button></p>' : '') +
    '<div class="builder-toolbar"><label><span class="sr-only">' + bt("name") + '</span><input type="text" maxlength="80" data-builder-field="name" value="' + escapeHtml(state.builder.name) + '" placeholder="' + bt("namePlaceholder") + '"></label><span class="builder-save-status" data-builder-message role="status">' + bt(state.builderMessage || "unsaved") + '</span><button type="button" class="builder-button builder-button--primary" data-builder-save>' + bt("save") + '</button><button type="button" class="builder-button" data-builder-reset>' + bt("reset") + '</button></div>' +
    '<div class="builder-equipment"><article class="builder-resonator"><div class="builder-resonator-art">' + renderCharacterAvatar(character, "detail") + '</div><div class="builder-resonator-info"><p class="eyebrow">01 / RESONATOR</p><span class="builder-rarity">' + stars(character.rarity) + '</span><h2>' + escapeHtml(character.name) + '</h2><p class="builder-muted">' + escapeHtml(character.element) + ' · ' + escapeHtml(character.weapon) + '</p>' + numberField("level", bt("level"), state.builder.level, 90) + '<button type="button" class="builder-button" data-builder-open="character">' + bt("change") + ' ↗</button></div></article>' +
    '<article class="builder-weapon"><div class="builder-section-line"><p class="eyebrow">02 / ' + t("weapon") + '</p><button type="button" class="builder-text-button" data-builder-open="weapon">' + bt("change") + ' ↗</button></div><div class="builder-weapon-info">' + renderBuilderItemIcon("weapon", weapon) + '<div><span class="builder-rarity">' + stars(weapon.rarity) + '</span><h2>' + escapeHtml(weapon.name) + '</h2><p>' + weapon.type + ' · ' + weapon.stat + '</p></div></div><div class="builder-weapon-controls">' + numberField("weaponLevel", bt("level"), state.builder.weaponLevel, 90) + numberField("rank", bt("rank"), state.builder.rank, 5) + '</div><p class="builder-weapon-passive">' + escapeHtml(weapon.passive) + '</p><small class="builder-muted">' + bt("weaponAtk") + ': ' + weapon.baseAtk + '</small></article>' +
    '<aside class="builder-overview"><p class="eyebrow">' + bt("preview") + '</p><div class="builder-cost-number"><strong>' + builderCost() + '</strong><span>/ 12</span></div><p>' + bt("totalCost") + '</p><div class="builder-cost-track"><i style="width:' + (builderCost() / 12 * 100) + '%"></i></div><div class="builder-overview-bottom"><span>' + bt("slots") + '</span><strong>' + used + ' / 5</strong></div><small class="builder-muted">' + bt("skillPlan") + '</small><p class="builder-priority">' + escapeHtml(character.build.mainStats.join(' · ')) + '</p></aside></div>' +
    '<section class="builder-echo-section" aria-labelledby="builder-echo-title"><div class="builder-echo-heading"><div><p class="eyebrow">03 / ECHO LOADOUT</p><h2 id="builder-echo-title">' + bt("echoLoadout") + '</h2><p>' + bt("echoHint") + '</p></div><span class="builder-equipped-count">' + used + ' / 5 ' + bt("equipped") + '</span></div><div class="builder-five-echoes">' + state.builder.echoes.map(renderBuilderEcho).join('') + '</div><p class="builder-input-hint">' + bt("detailHint") + '</p></section>' +
    '<div class="builder-bottom"><section class="builder-summary"><p class="eyebrow">04 / ATTRIBUTES</p><h2>' + bt("bonuses") + '</h2><div data-builder-bonuses>' + renderBuilderBonuses() + '</div><p class="builder-input-hint">' + bt("bonusesHint") + '</p></section><section class="builder-summary"><p class="eyebrow">SONATA EFFECTS</p><h2>' + bt("setTitle") + '</h2><div data-builder-sonatas>' + renderBuilderSonatas() + '</div><p class="builder-input-hint">' + bt("setHint") + '</p></section></div></div></section>';
}

function handleBuilderField(event) {
  const target = event.target;
  if (!target.matches('[data-builder-field], [data-echo-field]')) return false;
  const field = target.dataset.builderField;
  if (field) {
    state.builder[field] = field === "name" ? target.value.slice(0, 80) : Math.trunc(builderNumber(target.value, field === "rank" ? 5 : 90, 1));
    if (event.type === "change") target.value = state.builder[field];
  } else {
    const index = Number(target.dataset.echoIndex);
    const slot = state.builder.echoes[index];
    const item = builderEchoes.find((e) => e.slug === slot?.slug);
    if (!item || target.disabled) return true;
    const key = target.dataset.echoField;
    const subIndex = target.dataset.echoSub;
    if (subIndex !== undefined) {
      const sub = slot.substats[Number(subIndex)];
      if (!sub || Number(subIndex) >= Math.floor(slot.level / 5)) return true;
      if (key === "stat") {
        if (target.value && (!builderSubStats.includes(target.value) || slot.substats.some((s, i) => i !== Number(subIndex) && s.stat === target.value))) return true;
        sub.stat = target.value; sub.value = 0;
      } else { sub.value = builderNumber(target.value); if (event.type === "change") target.value = sub.value; }
    } else if (key === "set") {
      if (item.sets.includes(target.value)) slot.set = target.value;
    } else if (key === "mainStat") {
      if (!target.value || builderMainStats[item.cost].includes(target.value)) { slot.mainStat = target.value; slot.mainValue = 0; }
    } else {
      slot[key] = key === "level" ? Math.trunc(builderNumber(target.value, 25)) : builderNumber(target.value);
      if (event.type === "change") target.value = slot[key];
    }
    if (target.tagName === "SELECT" || (key === "level" && event.type === "change")) {
      const card = target.closest('[data-echo-card]');
      const wasOpen = card.querySelector('details').open;
      card.outerHTML = renderBuilderEcho(slot, index);
      const panel = routePanels.get(routeCacheKey());
      const nextCard = panel.querySelector('[data-echo-card="' + index + '"]');
      nextCard.querySelector('details').open = wasOpen;
      nextCard.querySelector('[data-echo-field="' + key + '"]' + (subIndex !== undefined ? '[data-echo-sub="' + subIndex + '"]' : ''))?.focus();
      if (key === "set") panel.querySelector('[data-builder-sonatas]').innerHTML = renderBuilderSonatas();
    }
  }
  state.builderMessage = "unsaved";
  updateBuilderSummary();
  return true;
}

function renderBar(label, value, max) {
  const width = Math.min(100, Math.round((value / max) * 100));
  return `
    <div class="bar-row">
      <div><span>${label}</span><strong>${value}</strong></div>
      <span class="bar"><i style="width:${width}%"></i></span>
    </div>
  `;
}

function nextEndingLabel(items) {
  const upcomingEnd = items
    .map((item) => new Date(item.endAt).getTime())
    .filter((time) => Number.isFinite(time) && time >= Date.now())
    .sort((a, b) => a - b)[0];

  return upcomingEnd ? formatDate(new Date(upcomingEnd).toISOString()) : t("noActiveItems");
}

function eventCategoryItems(category, events, convenes) {
  if (category === "convenes") return convenes;
  if (category === "all") return [...convenes, ...events];
  return events.filter((event) => event.category === category);
}

function renderEventCategoryOverview(filters, events, convenes) {
  return `
    <section class="event-overview" aria-label="${t("categoryOverview")}">
      ${filters.map((filter) => {
        const category = filter === "banner" ? "convenes" : filter;
        const items = eventCategoryItems(category, events, convenes);

        return `
          <button type="button" class="event-overview-card ${state.eventFilter === filter ? "is-active" : ""}" data-event-filter="${filter}">
            <span>${t(categoryLabels[filter])}</span>
            <strong>${items.length}</strong>
            <small>${t("nextEnd")}: ${nextEndingLabel(items)}</small>
          </button>
        `;
      }).join("")}
    </section>
  `;
}

function eventSourceLabel(filter) {
  if (filter === "banner") return state.conveneSource;
  if (filter === "all") return `${state.eventSource} + ${state.conveneSource}`;
  return state.eventSource;
}

function eventUpdatedAt(filter) {
  return filter === "banner" ? state.convenesUpdatedAt : state.updatedAt;
}

function eventSyncMinutes(filter) {
  return filter === "banner" ? state.conveneSyncIntervalMinutes : state.syncIntervalMinutes;
}

function renderEventGroup(title, cards, className) {
  if (!cards.length) return "";

  return `
    <section class="event-group">
      <h2>${title}</h2>
      <div class="${className}">
        ${cards.join("")}
      </div>
    </section>
  `;
}

function renderFilteredEventContent(filter, events, convenes) {
  if (filter === "banner") {
    return convenes.length
      ? renderEventGroup(t("currentConvenes"), convenes.map((convene) => renderConveneCard(convene)), "banner-grid")
      : `<div class="empty-state">${t(state.conveneError ? "convenesUnavailable" : "emptyConvenes")}</div>`;
  }

  if (filter === "all") {
    const content = [
      renderEventGroup(t("currentConvenes"), convenes.map((convene) => renderConveneCard(convene)), "banner-grid"),
      renderEventGroup(t("activeEvents"), events.map((event) => renderEventCard(event)), "events-grid")
    ].filter(Boolean).join("");

    return content || `<div class="empty-state">${t("emptyEvents")}</div>`;
  }

  return events.length
    ? renderEventGroup(t(categoryLabels[filter]), events.map((event) => renderEventCard(event)), "events-grid")
    : `<div class="empty-state">${t("emptyEvents")}</div>`;
}

function renderEventsPage() {
  const filters = ["all", "banner", "evento_in_game", "evento_web", "torre_adversidade", "codigo"];
  const currentEvents = activeEvents();
  const currentConvenes = activeConvenes();
  const events = state.eventFilter === "all"
    ? currentEvents
    : state.eventFilter === "banner"
      ? []
    : currentEvents.filter((event) => event.category === state.eventFilter);

  return `
    ${renderPageHero(t("pageEventsTitle"), t("pageEventsDesc"), "Live API")}
    <section class="page-band">
      <div class="container">
        <div class="module-status">
          <span>${eventCategoryItems(state.eventFilter === "banner" ? "convenes" : state.eventFilter, currentEvents, currentConvenes).length} ${t("activeNow").toLowerCase()}</span>
          <span>${t("updated")} ${timeAgo(eventUpdatedAt(state.eventFilter))}</span>
          <span>${t("syncEvery")} ${eventSyncMinutes(state.eventFilter)} min</span>
          <span>${t("sourceLabel")}: ${eventSourceLabel(state.eventFilter)}</span>
        </div>
        ${renderEventCategoryOverview(filters, currentEvents, currentConvenes)}
        <div class="toolbar">
          <div class="segmented segmented--wrap">
            ${filters.map((filter) => `
              <button type="button" data-event-filter="${filter}" class="${state.eventFilter === filter ? "is-active" : ""}">
                ${t(categoryLabels[filter])}
              </button>
            `).join("")}
          </div>
          <div class="segmented">
            <button type="button" data-time-mode="local" class="${state.timeMode === "local" ? "is-active" : ""}">${t("localTime")}</button>
            <button type="button" data-time-mode="server" class="${state.timeMode === "server" ? "is-active" : ""}">${t("serverTime")}</button>
          </div>
        </div>
        ${renderFilteredEventContent(state.eventFilter, events, currentConvenes)}
      </div>
    </section>
  `;
}

function renderConvenesSection() {
  const convenes = activeConvenes();

  return `
    <section class="page-band page-band--deep">
      <div class="container">
        ${renderSectionHeader(
          t("currentConvenes"),
          t("convenePageTitle"),
          t("convenePageDesc")
        )}
        <div class="module-status">
          <span>${convenes.length} ${t("currentConvenes").toLowerCase()}</span>
          <span>${t("updated")} ${timeAgo(state.convenesUpdatedAt)}</span>
          <span>${t("syncEvery")} ${state.conveneSyncIntervalMinutes} min</span>
          <span>${t("sourceLabel")}: ${state.conveneSource}</span>
        </div>
        ${convenes.length ? `
          <div class="banner-grid">
            ${convenes.map((convene) => renderConveneCard(convene)).join("")}
          </div>
        ` : `<div class="empty-state">${t(state.conveneError ? "convenesUnavailable" : "emptyConvenes")}</div>`}
      </div>
    </section>
  `;
}

function conveneImageUrl(convene) {
  // Every banner uses only the image attached to this exact API record.
  return convene?.imageUrl || convene?.image || convene?.bannerImageUrl || EVENT_FALLBACK_IMAGE;
}
function renderConveneCard(convene, compact = false) {
  const status = getEventStatus(convene);
  const imageUrl = conveneImageUrl(convene);
  const featured = [convene.featuredName, convene.featuredDetail].filter(Boolean).join(" - ");

  return `
    <article class="data-card event-card convene-card ${compact ? "event-card--compact" : ""}">
      <img
        src="${escapeHtml(imageUrl)}"
        alt="${escapeHtml(convene.title)}"
        loading="lazy"
        decoding="async"
        onerror="this.onerror=null;this.src='${EVENT_FALLBACK_IMAGE}';"
      >
      <div class="card-body">
        <div class="card-topline">
          <span class="pill pill--${status}">${statusLabel(status)}</span>
          <span>${escapeHtml(convene.type || "convene")}</span>
        </div>
        <h3>${escapeHtml(convene.title)}</h3>
        <dl class="mini-dl">
          <div><dt>${t("featuredItem")}</dt><dd>${escapeHtml(featured || "--")}</dd></div>
          <div><dt>${t("conveneType")}</dt><dd>${escapeHtml(convene.type || "--")}</dd></div>
        </dl>
        <p class="event-count" aria-label="${t("eventEndsIn")}">
          <small>${t("eventEndsIn")}</small>
          <span data-countdown data-start="${convene.startAt}" data-end="${convene.endAt}">${countdownLabel(convene)}</span>
        </p>
        <dl class="event-times">
          <div><dt>${t("eventStartDate")}</dt><dd>${convene.startLabel || formatEventDate(convene.startAt)}</dd></div>
          <div><dt>${t("eventStartTime")}</dt><dd>${convene.startTimeLabel || (convene.estimatedStart ? "--" : formatEventTime(convene.startAt))}</dd></div>
          <div><dt>${t("eventEndDate")}</dt><dd>${formatEventDate(convene.endAt)}</dd></div>
          <div><dt>${t("eventEndTime")}</dt><dd>${formatEventTime(convene.endAt)}</dd></div>
        </dl>
        <div class="tag-row">
          ${(convene.highlights || []).map((highlight) => `<span>${escapeHtml(highlight)}</span>`).join("")}
        </div>
        <a class="text-link" href="${convene.sourceUrl}" target="_blank" rel="noreferrer">${t("details")}</a>
      </div>
    </article>
  `;
}

function renderEventCard(event, compact = false) {
  const status = getEventStatus(event);
  const localImage = /^\/assets\/event-(web|forge|code|tower)\.png$/.test(event.imageUrl || "");
  const imageUrl = localImage ? '/assets/event-placeholder-1280.webp' : event.imageUrl || EVENT_FALLBACK_IMAGE;
  return `
    <article class="data-card event-card ${compact ? "event-card--compact" : ""}">
      <img
        src="${escapeHtml(imageUrl)}"
        ${localImage ? 'srcset="/assets/event-placeholder-640.webp 640w, /assets/event-placeholder-1280.webp 900w" sizes="(max-width: 760px) 100vw, 50vw"' : ''}
        alt="${escapeHtml(event.title)}"
        loading="lazy"
        decoding="async"
        onerror="this.onerror=null;this.src='${EVENT_FALLBACK_IMAGE}';"
      >
      <div class="card-body">
        <div class="card-topline">
          <span class="pill pill--${status}">${statusLabel(status)}</span>
          <span>${t(categoryLabels[event.category])}</span>
        </div>
        <h3>${escapeHtml(event.title)}</h3>
        <p class="event-count" aria-label="${status === "em_breve" ? t("eventStartsIn") : t("eventEndsIn")}">
          <small>${status === "em_breve" ? t("eventStartsIn") : t("eventEndsIn")}</small>
          <span data-countdown data-start="${event.startAt}" data-end="${event.endAt}">${countdownLabel(event)}</span>
        </p>
        <dl class="event-times">
          <div><dt>${t("eventStartDate")}</dt><dd>${formatEventDate(event.startAt)}</dd></div>
          <div><dt>${t("eventStartTime")}</dt><dd>${formatEventTime(event.startAt)}</dd></div>
          <div><dt>${t("eventEndDate")}</dt><dd>${formatEventDate(event.endAt)}</dd></div>
          <div><dt>${t("eventEndTime")}</dt><dd>${formatEventTime(event.endAt)}</dd></div>
        </dl>
        <div class="tag-row">
          ${(event.rewards || []).map((reward) => `<span>${escapeHtml(reward)}</span>`).join("")}
        </div>
        <a class="text-link" href="${event.sourceUrl}" target="_blank" rel="noreferrer">${t("details")}</a>
      </div>
    </article>
  `;
}

function renderNewsPage() {
  const archive = sortedNewsItems(news);

  if (!archive.length) {
    return `
      ${renderPageHero(t("navNews"), t("pageNewsDesc"), "Feed")}
      <section class="page-band">
        <div class="container">
          ${renderNewsGrid(news.length)}
        </div>
      </section>
    `;
  }

  const [featured, ...rest] = archive;
  const archiveItems = rest.length ? rest : archive;

  return `
    ${renderPageHero(t("navNews"), t("pageNewsDesc"), "Feed")}
    <section class="page-band page-band--deep">
      <div class="container news-page-layout">
        ${renderNewsCard(featured, true)}
        <aside class="panel news-feed-panel">
          <p class="eyebrow">${t("newsArchiveTitle")}</p>
          <h2>${t("newsSummaryTitle")}</h2>
          ${renderNewsDigest(archiveItems)}
        </aside>
      </div>
    </section>
    <section class="page-band">
      <div class="container">
        ${renderSectionHeader(t("newsArchiveTitle"), t("recentNewsTitle"), t("recentNewsDesc"))}
        ${renderNewsGrid(archiveItems.length, archiveItems)}
      </div>
    </section>
  `;
}

function renderNotFound() {
  return `
    ${renderPageHero(t("routeNotFound"), t("routeNotFoundText"), "404")}
    <section class="page-band">
      <div class="container">
        <a class="text-link" href="${pathFor("home")}" data-link>${t("navHome")}</a>
      </div>
    </section>
  `;
}

function formatNewsDate(date) {
  const timestamp = newsTimestamp({ date });
  if (!Number.isFinite(timestamp)) return "--";
  return new Intl.DateTimeFormat(currentLocale(), { dateStyle: "medium", timeZone: "UTC" }).format(timestamp);
}

function gachaItems() {
  return [...characters.map(item=>({...item,kind:'character',image:item.iconUrl || item.imageUrl || characterAssetUrl(item.name)})),...weapons.map(item=>({...item,kind:'weapon',image:item.iconUrl || item.imageUrl || itemAssetUrl('weapon',item)}))];
}
function gachaFeatured(banner) {
  const norm=value=>String(value).toLowerCase().replace(/[^a-z0-9]/g,'');
  return gachaItems().find(item=>item.kind===(banner.type==='weapon'?'weapon':'character') && norm(item.name)===norm(banner.featuredName));
}
function gachaContext() {
  return {
    lang: state.lang, banners: activeConvenes(), escape: escapeHtml,
    imageUrl: conveneImageUrl, date: iso => formatEventDate(iso, "server"),
    time: iso => formatEventTime(iso, "server"), countdown: countdownLabel,
    loading: !dataRequests.convenesLoaded || Boolean(dataRequests.convenes), error: state.conveneError,
    catalogPending: !weaponsReady,
    catalogError: weaponError,
    canDraw: banner => weaponsReady && !!gachaFeatured(banner),
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
    root: routePanels.get(routeCacheKey()) || app, render,
    refresh: () => { if(weaponError){weaponError=false;weaponsReady=false;ensureWeapons();} loadConvenes({force: true}); scheduleRender(); }, notify: notifyAccessibility
  };
}

function renderRoute(routeId = state.route, detail = state.detail) {
  const previousRoute = state.route;
  const previousDetail = state.detail;
  state.route = routeId;
  state.detail = detail;

  try {
    switch (routeId) {
      case "home":
        return renderHome();
      case "intro":
        return renderIntroductionPage();
      case "characters":
        return renderCharactersPage();
      case "tier":
        return renderTierPage();
      case "echoes":
        return renderEchoesPage();
      case "weapons":
        return renderWeaponsPage();
      case "items":
        return renderItemsPage();
      case "guide":
        return renderGuidePage();
      case "codes":
        return renderCodesPage();
      case "gacha":
        if (gachaModuleError) return renderPageHero(t("navGacha"), state.lang === "en" ? "Unable to load. Try again." : state.lang === "es" ? "No se pudo cargar. Inténtalo de nuevo." : "Não foi possível carregar. Tente novamente.") + '<div class="container"><button type="button" class="builder-button" data-gacha-module-retry>' + (state.lang === "en" ? "Retry" : state.lang === "es" ? "Reintentar" : "Tentar novamente") + '</button></div>';
        return renderGacha(gachaContext());
      case "builder":
        return renderBuilderPage();
      case "events":
        return renderEventsPage();
      case "news":
        return renderNewsPage();
      default:
        return renderNotFound();
    }
  } finally {
    state.route = previousRoute;
    state.detail = previousDetail;
  }
}

function routeCacheKey(routeId = state.route, detail = state.detail) {
  return `${state.lang}:${routeId}:${detail || ""}`;
}

function collectionSignature(items, fields = ["id", "slug", "title", "name", "updatedAt", "imageUrl", "startAt", "endAt"]) {
  if (!Array.isArray(items)) return "0";
  return JSON.stringify(items.map((item) => fields.map((field) => item?.[field] ?? "")));
}

function routeSignature(routeId = state.route, detail = state.detail) {
  const timedStatus = ["home", "events", "gacha"].includes(routeId)
    ? [...state.events, ...state.convenes].map(getEventStatus).join(",") : "";
  const base = [state.lang, routeId, detail || "", timedStatus,
    routeId === "characters" ? state.characterSort : "",
    ["home", "events", "gacha"].includes(routeId) ? state.conveneError : ""
  ].join("|");
  const favorites = getFavorites().join(",");

  switch (routeId) {
    case "home":
      return [base, tierDataRevision, state.roleFilter, state.showcaseCollapsed, state.timeMode, collectionSignature(characters, ["slug", "name", "imageUrl"]), collectionSignature(state.events), collectionSignature(state.convenes, ["id", "title", "updatedAt", "imageUrl"]), state.updatedAt, state.convenesUpdatedAt, favorites].join("|");
    case "characters":
      return [base, detail ? characterDetailRevision : "", state.charactersLoading, state.characterQuery, state.roleFilter, state.characterElementFilter, state.characterWeaponFilter, state.characterRarityFilter, state.charactersUpdatedAt, state.charactersSource, state.charactersApiError, collectionSignature(characters, ["slug", "name", "imageUrl"]), favorites].join("|");
    case "tier":
      return [base, state.tierMode, JSON.stringify(state.tierFilters), tierDataRevision, state.charactersLoading, collectionSignature(characters, ["slug", "name", "element", "weapon", "rarity"])].join("|");
    case "weapons":
      return [base, state.weaponFilter, weaponRevision].join("|");
    case "gacha":
      return [base, gachaModuleLoaded, gachaModuleError, gacha.revision, weaponRevision, Boolean(dataRequests.convenes), dataRequests.convenesLoaded, state.convenesUpdatedAt, collectionSignature(state.convenes), collectionSignature(characters, ["name", "imageUrl", "iconUrl"])].join("|");
    case "builder":
      return [base, JSON.stringify(state.builder), state.builderMessage, builderEchoes.length, builderCatalogError, builderCatalogLoading, JSON.stringify(state.builderSearch), JSON.stringify(state.builderFilter), collectionSignature(characters, ["slug", "name", "imageUrl"])].join("|");
    case "events":
      return [base, state.eventFilter, state.timeMode, state.updatedAt, state.convenesUpdatedAt, state.eventSource, state.conveneSource, collectionSignature(state.events), collectionSignature(state.convenes, ["id", "title", "updatedAt", "imageUrl"])].join("|");
    case "news":
      return [base, collectionSignature(news, ["title", "date", "category", "summary", "image"])].join("|");
    case "intro":
      return [base, characters.length].join("|");
    default:
      return base;
  }
}

function ensureAppShell() {
  if (routeViewState.shellReady) return;
  app.innerHTML = `<div data-app-topbar></div><main data-route-host></main><div data-app-footer></div>`;
  routeViewState.shellReady = true;
}

function routeHost() {
  ensureAppShell();
  return app.querySelector("[data-route-host]");
}

function ensureRoutePanel(key) {
  const host = routeHost();
  let panel = routePanels.get(key);

  if (!panel) {
    panel = document.createElement("section");
    panel.className = "route-panel";
    panel.setAttribute("data-route-panel", "");
    panel.hidden = true;
    routePanels.set(key, panel);
    host.appendChild(panel);
  }

  return panel;
}

function updateRoutePanel(routeId = state.route, detail = state.detail, visible = true) {
  const key = routeCacheKey(routeId, detail);
  const panel = ensureRoutePanel(key);
  const signature = routeSignature(routeId, detail);

  if (panel.dataset.signature !== signature && !isConvenePlaying(panel)) {
    panel.innerHTML = renderRoute(routeId, detail);
    panel.dataset.signature = routeSignature(routeId, detail);
    delete panel.dataset.tickerSignature;
  }

  panel.hidden = !visible;
  return panel;
}

function renderRouteHost() {
  const currentKey = routeCacheKey();
  routePanels.forEach((panel, key) => {
    if (key === currentKey) return;
    panel.querySelectorAll("iframe[data-video-frame]").forEach((frame) => {
      frame.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "https://www.youtube-nocookie.com");
    });
    panel.hidden = true;
  });
  updateRoutePanel(state.route, state.detail, true);
}

function scheduleRender() {
  if (routeViewState.renderQueued) return;
  routeViewState.renderQueued = true;

  const flush = () => {
    routeViewState.renderQueued = false;
    render();
  };

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(flush);
  } else {
    window.setTimeout(flush, 0);
  }
}

function preloadImage(url) {
  if (typeof Image !== "function" || !url || url.startsWith("data:") || preloadedImageUrls.has(url)) return;
  preloadedImageUrls.add(url);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

function preloadAppAssets() {
  // Only prioritize the visible hero. Card images load near the viewport.
  const hero = app.querySelector('.route-panel:not([hidden]) .hero-backdrop, .route-panel:not([hidden]) .subhero');
  if (hero) {
    const property = hero.classList.contains('hero-backdrop') ? '--home-hero' : '--subhero';
    const url = getComputedStyle(hero).getPropertyValue(property).match(/url\(["']?([^"')]+)["']?\)/)?.[1];
    if (url) preloadImage(url);
  }
}

function updateSeo() {
  const route = routeById.get(state.route);
  const label = route ? t(route.labelKey) : t("routeNotFound");
  const title = state.route === "home"
    ? "Solaris Archive - Portal Wiki de Wuthering Waves"
    : `${label} - Solaris Archive`;
  document.title = title;
  document.documentElement.lang = state.lang;

  const meta = document.querySelector("meta[name='description']");
  if (meta) {
    meta.setAttribute(
      "content",
      `${label}: wiki fan-made de Wuthering Waves com dados de exemplo, i18n e modulo de eventos.`
    );
  }

  const oldJsonLd = document.querySelector("#json-ld");
  if (oldJsonLd) oldJsonLd.remove();

  const jsonLd = document.createElement("script");
  jsonLd.type = "application/ld+json";
  jsonLd.id = "json-ld";
  jsonLd.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": state.route === "characters" && state.detail ? "VideoGameCharacter" : "WebSite",
    name: state.detail
      ? characters.find((character) => character.slug === state.detail)?.name || title
      : title,
    inLanguage: state.lang,
    isPartOf: "Solaris Archive",
    about: "Wuthering Waves"
  });
  document.head.appendChild(jsonLd);
}

function render() {
  updateSeo();
  ensureAppShell();
  const topbar = app.querySelector("[data-app-topbar]");
  const topbarSignature = [state.lang, state.route, getFavorites().join(",")].join("|");
  if (topbar.dataset.signature !== topbarSignature) {
    topbar.innerHTML = renderTopbar();
    topbar.dataset.signature = topbarSignature;
  }
  renderRouteHost();
  const footer = app.querySelector("[data-app-footer]");
  if (footer.dataset.lang !== state.lang) {
    footer.innerHTML = renderFooter();
    footer.dataset.lang = state.lang;
  }
  updateDynamicTimes();
  preloadAppData();
  applyAccessibility(app, state.lang);
  observeCharacterImages();
}

function updateDynamicTimes() {
  if (document.hidden) return;
  const panel = routePanels.get(routeCacheKey());
  if (!panel || panel.hidden) return;
  const ticker = panel.querySelector(".live-ticker");
  const tickerSignature = [state.lang, state.updatedAt, collectionSignature(state.events), state.events.map(getEventStatus).join(",")].join("|");
  if (ticker && panel.dataset.tickerSignature !== tickerSignature) {
    ticker.outerHTML = renderLiveTicker();
    panel.dataset.tickerSignature = tickerSignature;
  }
  panel.querySelectorAll("[data-countdown]").forEach((node) => {
    const event = {
      startAt: node.getAttribute("data-start"),
      endAt: node.getAttribute("data-end")
    };
    node.textContent = countdownLabel(event);
  });

  panel.querySelectorAll(".ticker-sync").forEach((node) => {
    node.textContent = `${t("updated")} ${timeAgo(state.updatedAt)}`;
  });

  // Expiry invalidates only the visible page, on the next frame. Hidden
  // tickers must never recursively render an unrelated page (e.g. News).
  if (!isConvenePlaying(panel) && panel.dataset.signature !== routeSignature()) scheduleRender();
}

async function loadConvenes({ force = false } = {}) {
  if (dataRequests.convenes) return dataRequests.convenes;
  if (dataRequests.convenesLoaded && !force) return state.convenes;

  dataRequests.convenes = (async () => {
    try {
      const response = await fetch("/api/convenes", { cache: "no-store", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.convenes)) throw new Error("Invalid convenes response");
      state.convenes = payload.externalError ? [] : payload.convenes;
      state.convenesUpdatedAt = payload.updatedAt || new Date().toISOString();
      state.conveneSyncIntervalMinutes = payload.syncIntervalMinutes || 30;
      state.conveneSource = payload.imageSource || payload.source || "/api/convenes";
      state.conveneError = Boolean(payload.externalError);
    } catch {
      state.convenes = [];
      state.conveneError = true;
      state.conveneSource = state.conveneSource || "erro ao sincronizar";
    } finally {
      dataRequests.convenesLoaded = true;
      dataRequests.convenes = null;
      preloadAppAssets();
      scheduleRender();
    }

    return state.convenes;
  })();

  return dataRequests.convenes;
}

async function loadEvents({ force = false } = {}) {
  if (dataRequests.events) return dataRequests.events;
  if (dataRequests.eventsLoaded && !force) return state.events;

  dataRequests.events = (async () => {
    try {
      const response = await fetch("/api/events", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.events)) throw new Error("Invalid events response");
      state.events = Array.isArray(payload.events) ? payload.events : [];
      state.updatedAt = payload.updatedAt || new Date().toISOString();
      state.syncIntervalMinutes = payload.syncIntervalMinutes || 10;
      state.eventSource = payload.imageSource || payload.source || "/api/events";
      state.eventError = Boolean(payload.externalError);
    } catch {
      state.eventError = true;
      state.eventSource = state.eventSource || "erro ao sincronizar";
    } finally {
      dataRequests.eventsLoaded = true;
      dataRequests.events = null;
      preloadAppAssets();
      scheduleRender();
    }

    return state.events;
  })();

  return dataRequests.events;
}

async function loadCharacters({ force = false } = {}) {
  if (dataRequests.characters) return dataRequests.characters;
  if (dataRequests.charactersLoaded && !force) return characters;

  state.charactersLoading = true;
  scheduleRender();

  dataRequests.characters = (async () => {
    try {
      const localByKey = new Map(characters.map((character) => [characterLookupKey(character), character]));
      const response = await fetch("/api/characters", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.message || "Characters API unavailable");

      const apiCharacters = (Array.isArray(payload.characters) ? payload.characters : [])
        .map((character) => hydrateApiCharacter(character, localByKey.get(characterLookupKey(character))))
        .filter((character) => character.name);

      if (apiCharacters.length) {
        const received = new Set(apiCharacters.map(characterLookupKey));
        const previous = characters.filter(character => !received.has(characterLookupKey(character)));
        characters.splice(0, characters.length, ...apiCharacters, ...previous);
        state.builder.character = characters.some((character) => character.slug === state.builder.character)
          ? state.builder.character
          : characters[0].slug;
      }

      state.charactersUpdatedAt = payload.updatedAt || new Date().toISOString();
      state.charactersSource = payload.source || "/api/characters";
      state.charactersSyncIntervalMinutes = Number(payload.syncIntervalMinutes) || 360;
      state.charactersApiError = Boolean(payload.externalError);
    } catch {
      state.charactersApiError = true;
    } finally {
      state.charactersLoading = false;
      dataRequests.charactersLoaded = true;
      dataRequests.characters = null;
      preloadAppAssets();
      scheduleRender();
    }

    return characters;
  })();

  return dataRequests.characters;
}

function preloadAppData() {
  if (["home","tier"].includes(state.route)) ensureTierData();
  if (state.route === 'gacha') loadGachaModule();
  if(['gacha','weapons','builder'].includes(state.route) && !weaponsReady)ensureWeapons();
  if(state.route==='weapons' && state.detail && weaponsReady)ensureWeaponDetail();
  if (state.route === "builder" && (!builderCatalogLoaded || Date.now() >= builderCatalogExpiresAt)) loadBuilderEchoes();
  // The ticker needs events everywhere. Other catalogs load on first use.
  if (!dataRequests.eventsLoaded) loadEvents();
  if (["home", "events", "gacha"].includes(state.route) && !dataRequests.convenesLoaded) loadConvenes();
  if (["home", "intro", "characters", "tier", "builder", "gacha"].includes(state.route) && !dataRequests.charactersLoaded) loadCharacters();
  if (state.route === 'characters' && dataRequests.charactersLoaded) {
    loadCharacterMedia();
    if (state.detail) {
      const character = characters.find(record => record.slug === state.detail);
      loadAssociatedCharacterWeapon(character);
      if (character?.encoreId && !getCharacterDetail(character.encoreId)) upgradeCharacterImages(String(character.encoreId));
    }
  }
}

function copyToClipboard(text, button) {
  const done = () => {
    const original = button.textContent;
    button.textContent = t("copied");
    notifyAccessibility('copied');
    window.setTimeout(() => {
      button.textContent = original;
    }, 1400);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Copy failed");
    done();
  } catch { notifyAccessibility('copyError'); }
  finally { textarea.remove(); }
}

function runSearch(form) {
  const value = new FormData(form).get("query")?.toString().trim();
  if (!value) return;

  const result = searchMatches(value, 1)[0];
  if (result) {
    navigateTo(pathFor(result.route, state.lang, result.detail || ""));
    return;
  }

  navigateTo(pathFor("characters"));
}

app.addEventListener("click", (event) => {
  if (event.target.closest("[data-tier-retry]")) {tierDataError=false;ensureTierData();render();return;}
  if (event.target.closest("[data-tier-reset]")) {
    cancelPendingSearch();state.tierFilters={query:"",element:"all",weapon:"all",rarity:"all",role:"all"};
    const panel=routePanels.get(routeCacheKey());panel?.querySelectorAll("[data-tier-filter]").forEach(select=>select.value="all");
    const search=panel?.querySelector("[data-tier-search]");if(search)search.value="";updateTierResults();return;
  }
  const characterRetry = event.target.closest('[data-character-retry]');
  if (characterRetry) {characterDetailFailures.delete(characterRetry.dataset.characterRetry);upgradeCharacterImages(characterRetry.dataset.characterRetry);characterDetailRevision++;scheduleRender();return;}
  if (event.target.closest('[data-gacha-module-retry]')) { gachaModuleError = false; loadGachaModule(); return; }
  if (state.route === "gacha" && handleGacha(event, gachaContext())) return;
  const searchSuggestion = event.target.closest("[data-search-suggestion]");
  if (searchSuggestion) {
    navigateTo(pathFor(
      searchSuggestion.getAttribute("data-route"),
      state.lang,
      searchSuggestion.getAttribute("data-detail") || ""
    ));
    return;
  }

  const link = event.target.closest("a[data-link]");
  if (link) {
    event.preventDefault();
    navigateTo(link.getAttribute("href"));
    return;
  }

  const favoriteButton = event.target.closest("[data-fav]");
  if (favoriteButton) {
    toggleFavorite(favoriteButton.getAttribute("data-fav"));
    notifyAccessibility(isFavorite(favoriteButton.getAttribute("data-fav")) ? 'added' : 'removed');
    render();
    return;
  }

  const videoButton = event.target.closest("[data-video-id]");
  if (videoButton) {
    const frame = document.createElement("iframe");
    const videoId = videoButton.dataset.videoId;
    if (!/^[\w-]{11}$/.test(videoId)) return;
    frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}${captionParameters(state.lang)}`;
    frame.title = videoButton.dataset.videoTitle;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.dataset.videoFrame = "";
    videoButton.replaceWith(frame);
    frame.focus();
    return;
  }

  const copyButton = event.target.closest("[data-copy]");
  if (copyButton && !copyButton.disabled) {
    copyToClipboard(copyButton.getAttribute("data-copy"), copyButton);
    return;
  }

  if (event.target.closest("[data-builder-retry]")) { loadBuilderEchoes(); return; }
  const builderOpen = event.target.closest("[data-builder-open]");
  if (builderOpen) { openBuilderPicker(builderOpen.dataset.builderOpen, Number(builderOpen.dataset.slot || 0), builderOpen); return; }
  if (event.target.closest("[data-builder-close]")) { closeBuilderPicker(); return; }
  const mainEcho = event.target.closest("[data-builder-main]");
  if (mainEcho) {
    const index = Number(mainEcho.dataset.builderMain);
    if (!state.builder.echoes[index]?.slug) return;
    [state.builder.echoes[0], state.builder.echoes[index]] = [state.builder.echoes[index], state.builder.echoes[0]];
    state.builderMessage = "unsaved";
    render();
    routePanels.get(routeCacheKey())?.querySelector('[data-builder-open="echo"][data-slot="0"]')?.focus();
    return;
  }
  if (event.target.closest("[data-builder-save]")) {
    try { localStorage.setItem("solaris:builder:v1", JSON.stringify(state.builder)); state.builderMessage = "saved"; }
    catch { state.builderMessage = "saveError"; }
    notifyAccessibility(bt(state.builderMessage), true);
    updateBuilderSummary(); return;
  }
  if (event.target.closest("[data-builder-reset]")) {
    if (window.confirm(bt("resetPrompt"))) { state.builder = defaultBuilder(); state.builderMessage = "unsaved"; render(); }
    return;
  }
  const removeEcho = event.target.closest("[data-builder-remove]");
  if (removeEcho && !removeEcho.disabled) {
    const index = Number(removeEcho.dataset.builderRemove);
    state.builder.echoes[index] = emptyBuilderEcho(); state.builderMessage = "unsaved"; render();
    routePanels.get(routeCacheKey()).querySelector('[data-builder-open="echo"][data-slot="' + index + '"]')?.focus(); return;
  }
  const builderPick = event.target.closest("[data-builder-pick]");
  if (builderPick && !builderPick.disabled) {
    const kind = builderPick.dataset.builderPick;
    const item = builderItems(kind).find((item) => item.slug === builderPick.dataset.value);
    if (!item) return;
    if (kind === "echo") {
      if (builderCost(builderUI.slot) + item.cost > 12) return;
      const slot = state.builder.echoes[builderUI.slot];
      if (slot.slug !== item.slug) {
        state.builder.echoes[builderUI.slot] = { ...emptyBuilderEcho(), slug: item.slug, set: item.sets[0] };
      }
    } else if (kind === "character" || kind === "weapon") {
      state.builder[kind] = item.slug;
      if (kind === "character") { normalizeBuilderWeapon(selectedBuilderCharacter()); state.builderSearch.weapon = ""; }
    }
    state.builderMessage = "unsaved";
    render(); closeBuilderPicker(); return;
  }

  const showcaseButton = event.target.closest("[data-showcase-toggle]");
  if (showcaseButton) {
    state.showcaseCollapsed = !state.showcaseCollapsed;
    try {
      localStorage.setItem("solaris:showcase-collapsed", String(state.showcaseCollapsed));
    } catch {
      // Preference storage can fail in private contexts; the in-memory state still works.
    }
    render();
    return;
  }

  const roleButton = event.target.closest("[data-role-filter]");
  if (roleButton) {
    state.roleFilter = roleButton.getAttribute("data-role-filter");
    render();
    return;
  }

  const tierButton = event.target.closest("[data-tier-mode]");
  if (tierButton) {
    cancelPendingSearch();
    state.tierMode = tierButton.getAttribute("data-tier-mode") === "ww" ? "ww" : "toa";
    tierButton.parentElement.querySelectorAll('[data-tier-mode]').forEach(button=>{const active=button.dataset.tierMode===state.tierMode;button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-active',active);});
    updateTierResults();
    return;
  }

  const eventButton = event.target.closest("[data-event-filter]");
  if (eventButton) {
    state.eventFilter = eventButton.getAttribute("data-event-filter");
    render();
    return;
  }

  const timeButton = event.target.closest("[data-time-mode]");
  if (timeButton) {
    state.timeMode = timeButton.getAttribute("data-time-mode");
    render();
    return;
  }

  const menuButton = event.target.closest("[data-menu-toggle]");
  if (menuButton) {
    const nav = app.querySelector("[data-mobile-nav]");
    if (nav) nav.hidden = !nav.hidden;
    return;
  }

  if (!event.target.closest("[data-search-form]")) hideAllSearchSuggestions();
});

app.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-search-form]");
  if (form) {
    event.preventDefault();
    runSearch(form);
  }
});

app.addEventListener("focusin", (event) => {
  const globalSearch = event.target.closest("[data-global-search]");
  if (globalSearch) updateSearchSuggestions(globalSearch);
});

app.addEventListener("keydown", (event) => {
  const globalSearch = event.target.closest("[data-global-search]");
  if (globalSearch && event.key === "Escape") {
    hideSearchSuggestions(globalSearch.closest("[data-search-form]"));
  }
});

app.addEventListener("change", (event) => {
  if (event.target.matches("[data-tier-filter]")) {cancelPendingSearch();state.tierFilters[event.target.dataset.tierFilter]=event.target.value;updateTierResults();return;}
  if (state.route === "gacha" && handleGacha(event, gachaContext())) return;
  if (event.target.matches('[data-builder-set-filter]')) {
    builderUI.set = event.target.value;
    updateBuilderPicker("echo");
    return;
  }
  if (handleBuilderField(event)) return;
  const language = event.target.closest("[data-language-select]");
  if (language) {
    navigateTo(pathFor(state.route === "not-found" ? "home" : state.route, language.value, state.detail));
    return;
  }

  const element = event.target.closest("[data-element-filter]");
  if (element) {
    state.elementFilter = element.value;
    render();
    return;
  }

  const weapon = event.target.closest("[data-weapon-filter]");
  if (weapon) {
    state.weaponFilter = weapon.value;
    render();
    return;
  }

  const characterSort = event.target.closest("[data-character-sort]");
  if (characterSort) {
    state.characterSort = characterSort.value === "favorites" ? "favorites" : "default";
    characterSort.closest("label").classList.toggle("is-active", state.characterSort === "favorites");
    updateCharacterResults();
    return;
  }

  const characterElement = event.target.closest("[data-character-element-filter]");
  if (characterElement) {
    state.characterElementFilter = characterElement.value;
    updateCharacterResults();
    return;
  }

  const characterWeapon = event.target.closest("[data-character-weapon-filter]");
  if (characterWeapon) {
    state.characterWeaponFilter = characterWeapon.value;
    updateCharacterResults();
    return;
  }

  const characterRarity = event.target.closest("[data-character-rarity-filter]");
  if (characterRarity) {
    state.characterRarityFilter = characterRarity.value;
    updateCharacterResults();
    return;
  }

  const builderFilter = event.target.closest("[data-builder-filter]");
  if (builderFilter) {
    const kind = builderFilter.getAttribute("data-builder-filter");
    if (state.builderFilter[kind] !== undefined) {
      state.builderFilter[kind] = builderFilter.value;
      updateBuilderPicker(kind);
    }
    return;
  }

  const builderCharacter = event.target.closest("[data-builder-character]");
  if (builderCharacter) {
    state.builder.character = builderCharacter.value;
    render();
    return;
  }

  const builderWeapon = event.target.closest("[data-builder-weapon]");
  if (builderWeapon) {
    state.builder.weapon = builderWeapon.value;
    render();
    return;
  }

  const builderEcho = event.target.closest("[data-builder-echo]");
  if (builderEcho) {
    state.builder.echo = builderEcho.value;
    render();
  }
});

app.addEventListener("input", (event) => {
  if (event.isComposing) return;
  const tierSearch=event.target.closest("[data-tier-search]");
  if(tierSearch){state.tierFilters.query=tierSearch.value;const panel=routePanels.get(routeCacheKey());if(panel)panel.dataset.signature=routeSignature();queueSearch(tierSearch,updateTierResults);return;}
  if (event.target.tagName !== "SELECT" && handleBuilderField(event)) return;
  const globalSearch = event.target.closest("[data-global-search]");
  if (globalSearch) {
    if (globalSearch.value.trim().length < 2) hideSearchSuggestions(globalSearch.closest('[data-search-form]'));
    else queueSearch(globalSearch, () => updateSearchSuggestions(globalSearch));
    return;
  }

  const characterSearch = event.target.closest("[data-character-search]");
  if (characterSearch) {
    state.characterQuery = characterSearch.value;
    const panel = routePanels.get(routeCacheKey());
    if (panel) panel.dataset.signature = routeSignature();
    queueSearch(characterSearch, updateCharacterResults);
    return;
  }

  const builderSearch = event.target.closest("[data-builder-search]");
  if (builderSearch) {
    const kind = builderSearch.getAttribute("data-builder-search");
    if (state.builderSearch[kind] !== undefined) {
      state.builderSearch[kind] = builderSearch.value;
      queueSearch(builderSearch, () => updateBuilderPicker(kind));
    }
    return;
  }

  const level = event.target.closest("[data-builder-level]");
  if (level) {
    state.builder.level = Number(level.value);
    render();
  }
});

app.addEventListener("wheel", (event) => {
  const track = event.target.closest(".ticker-track");
  if (!track || track.scrollWidth <= track.clientWidth) return;

  event.preventDefault();
  track.scrollLeft += event.deltaY || event.deltaX;
}, { passive: false });

window.addEventListener("popstate", () => {
  cancelPendingSearch();
  closeBuilderPicker(false);
  parseLocation();
  render();
});

parseLocation();
render();
window.setInterval(updateDynamicTimes, 1000);
window.setInterval(() => {
  if (document.hidden) return;
  if (dataRequests.charactersLoaded && Date.now() - Date.parse(state.charactersUpdatedAt || 0) >= (state.charactersSyncIntervalMinutes || 360) * 60000) loadCharacters({force: true});
  if (state.route === 'characters') loadCharacterMedia();
  if (dataRequests.convenesLoaded && (state.conveneError || Date.now() - new Date(state.convenesUpdatedAt || 0).getTime() >= state.conveneSyncIntervalMinutes * 60000)) loadConvenes({ force: true });
  if (state.eventError || Date.now() - new Date(state.updatedAt || 0).getTime() >= state.syncIntervalMinutes * 60000) loadEvents({ force: true });
}, 60 * 1000);
window.addEventListener("storage", (event) => {
  if (event.key === "solaris:favorites" || event.key === null) {
    favoriteCache = null;
    scheduleRender();
  }
});
