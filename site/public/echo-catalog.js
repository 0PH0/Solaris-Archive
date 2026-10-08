// The existing asset repository uses this Encore catalog as its source.
export const ECHO_SOURCE = 'https://api-v2.encore.moe/api/en/echo';
const CACHE_KEY = 'solaris:echo-catalog:v4';
export const ECHO_CACHE_TTL = 6 * 60 * 60 * 1000;
let request;
let memoryCatalog;
const slug = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const plain = value => String(value || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '');
const icon = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && /(^|\.)encore\.moe$/.test(url.hostname) ? url.href : ''; } catch { return ''; }
};

export function normalizeEchoCatalog(payload) {
  if (!Array.isArray(payload?.Echo)) throw new Error('Invalid Encore catalog');
  const unique = new Map();
  // Prefer the standard record over alternate internal records of the same Echo.
  const records = [...payload.Echo].sort((a, b) => (a.PhantomType === 1 ? 0 : 1) - (b.PhantomType === 1 ? 0 : 1) || a.Id - b.Id);
  for (const record of records) {
    let name = plain(record.Name).trim();
    if (!name || /^MonsterInfo_.*_Name$/i.test(name) || !icon(record.Icon)) continue;
    if (record.Type && !['Echo', 'Phantom Appearance'].includes(record.Type)) continue;
    if (![0, 1, 2, 3].includes(record.Rarity) || !record.FetterGroups?.length) continue;
    let image = icon(record.Icon);
    if (record.PhantomType !== 1) {
      // PhantomType 2 also contains mode-only copies and Resonator Cubes.
      // Validate unique entries by their own Echo detail, never by a character
      // name blacklist or by renaming them after the reused placeholder icon.
      const detail = payload.EchoDetails?.[record.Id];
      if (!detail || Number(detail.MonsterId) !== Number(record.Id) || detail.TypeDescription !== 'Echo' || /\/NPC\//i.test(detail.StandAnim || '')) continue;
      name = plain(detail.MonsterName).trim();
      const skill = plain(detail.Skill?.SimplyDescription || detail.Skill?.DescriptionEx);
      if (!name || /^MonsterInfo_.*_Name$/i.test(name) || !skill.toLowerCase().includes(name.replace(/^Phantom:\s*/i, '').toLowerCase())) continue;
      // Some valid Echoes reuse another monster's item icon. Their skill icon
      // is an explicit asset in the same API and depicts the correct Echo.
      const reused = records.some(other => other.PhantomType === 1 && icon(other.Icon) === image && slug(plain(other.Name)) !== slug(name));
      if (reused) image = icon(detail.Skill?.BattleViewIcon);
      else image = icon(detail.Icon) || image;
      if (!image) continue;
    }
    const key = slug(name);
    if (!unique.has(key)) unique.set(key, {...record, Name: name, Icon: image});
  }
  const sets = new Map();
  const echoes = [...unique].map(([key, record]) => {
    const groups = (record.FetterGroups || []).map(group => {
      const setKey = slug(group.Name);
      const detail = payload.SonataDetails?.[group.Name];
      const bonuses = detail ? detail.EffectKeys.map((count, index) => ({count: Number(count), description: plain(detail.EffectDescriptions[index])})) : (group.Fetters || []).map(bonus => ({count: Number(bonus.Key), description: plain(bonus.EffectDescription)}));
      sets.set(setKey, {id: group.Id, slug: setKey, name: plain(group.Name), iconUrl: icon(group.Icon), bonuses: bonuses.filter(bonus => bonus.count > 0), source: 'https://wutheringwaves.fandom.com/wiki/' + encodeURIComponent(plain(group.Name).replaceAll(' ', '_'))});
      return setKey;
    });
    return {id: record.Id, parentId: Number(payload.EchoDetails?.[record.Id]?.ParentMonsterId || record.ParentMonsterId) || null, slug: key, name: plain(record.Name), cost: [1, 3, 4, 4][record.Rarity], classId: ['common', 'elite', 'overlord', 'calamity'][record.Rarity], isPhantom: record.Type === 'Phantom Appearance' || /^Phantom:/i.test(record.Name), isNightmare: /\bNightmare\b/i.test(record.Name), element: plain(record.Element?.Name), description: plain(record.Attributes), sets: [...new Set(groups)], iconUrl: icon(record.Icon), aliases: key === 'dwarf-cassowary' ? ['Casuario Enano', 'Casuar-anão'] : []};
  });
  if (!echoes.length || echoes.some(echo => !echo.cost || !echo.sets.length)) throw new Error('Incomplete Encore catalog');
  return {echoes: echoes.sort((a,b) => b.cost-a.cost || a.name.localeCompare(b.name)), sets: [...sets.values()], source: ECHO_SOURCE};
}

export function groupEchoAppearances(echoes) {
  const originals = echoes.filter(echo => !echo.isPhantom).map(echo => ({...echo, phantoms: []}));
  const byId = new Map(originals.map(echo => [Number(echo.id), echo]));
  for (const skin of echoes.filter(echo => echo.isPhantom)) {
    const parent = byId.get(Number(skin.parentId));
    if (parent && !parent.phantoms.some(appearance => appearance.id === skin.id)) parent.phantoms.push(skin);
  }
  return originals;
}

export function filterEchoCatalog(echoes, sets, filters = {}) {
  const normalize = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const query = normalize(filters.query);
  const setNames = new Map(sets.map(set => [set.slug, set.name]));
  return echoes.filter(echo => {
    if (filters.cost && filters.cost !== 'all' && String(echo.cost) !== String(filters.cost)) return false;
    if (filters.class && filters.class !== 'all' && echo.classId !== filters.class) return false;
    if (filters.element && filters.element !== 'all' && echo.element !== filters.element) return false;
    if (filters.set && filters.set !== 'all' && !echo.sets.includes(filters.set)) return false;
    if (filters.variant === 'phantom' && !(echo.isPhantom || echo.phantoms?.length)) return false;
    if (filters.variant === 'nightmare' && !echo.isNightmare) return false;
    if (filters.variant === 'regular' && (echo.isPhantom || echo.isNightmare)) return false;
    return !query || normalize([echo.name, ...(echo.aliases || []), ...(echo.phantoms || []).map(skin => skin.name), echo.classId, echo.element, ...echo.sets.map(key => setNames.get(key))].join(' ')).includes(query);
  });
}

export function readEchoCatalogCache() {
  let stored;
  try { stored = localStorage.getItem(CACHE_KEY); } catch { return memoryCatalog || null; }
  if (!stored) return memoryCatalog || null;
  try {
    const cached = JSON.parse(stored);
    if (!Number.isFinite(cached?.updatedAt)) throw new Error('Invalid cache timestamp');
    if (memoryCatalog?.updatedAt === cached.updatedAt) return memoryCatalog;
    // Store source data so cached records receive the same validation as fresh data.
    memoryCatalog = { ...normalizeEchoCatalog(cached.payload), updatedAt: cached.updatedAt };
    return memoryCatalog;
  } catch { memoryCatalog = null; return null; }
}

export async function loadEchoCatalog() {
  if (request) return request;
  const cached = readEchoCatalogCache();
  if (cached && Date.now() - cached.updatedAt < ECHO_CACHE_TTL) return cached;
  request = (async () => {
    try {
      const response = await fetch(ECHO_SOURCE, {signal: AbortSignal.timeout(20000)});
      if (!response.ok) throw new Error('Echo source unavailable');
      const payload = await response.json();
      // The list mixes equipable Echoes with internal records. Standard entries
      // win; only unfamiliar alternate identities need additional validation.
      const standardNames = new Set(payload.Echo.filter(record => record.PhantomType === 1).map(record => slug(plain(record.Name))));
      const candidates = payload.Echo.filter(record => (record.PhantomType !== 1 && plain(record.Name).trim() && !/^MonsterInfo_.*_Name$/i.test(plain(record.Name)) && !standardNames.has(slug(plain(record.Name)))) || record.PhantomType === 1 && (record.Type === 'Phantom Appearance' || /^Phantom:/i.test(record.Name)));
      const identityQueue = [...new Map(candidates.map(record => [record.Name + '|' + record.Icon, record])).values()];
      payload.EchoDetails = {};
      await Promise.all(Array.from({length: Math.min(4, identityQueue.length)}, async () => {
        while (identityQueue.length) {
          const record = identityQueue.shift();
          const response = await fetch(ECHO_SOURCE + '/' + record.Id, {signal: AbortSignal.timeout(15000)});
          if (!response.ok) throw new Error('Echo identity source unavailable');
          const detail = await response.json();
          payload.EchoDetails[record.Id] = {MonsterId: detail.MonsterId, ParentMonsterId: detail.ParentMonsterId, MonsterName: detail.MonsterName, TypeDescription: detail.TypeDescription, StandAnim: detail.StandAnim, Icon: detail.Icon, Skill: {SimplyDescription: detail.Skill?.SimplyDescription, DescriptionEx: detail.Skill?.DescriptionEx, BattleViewIcon: detail.Skill?.BattleViewIcon}};
        }
      }));
      // The list endpoint contains unresolved {0} parameters. Echo details provide
      // the complete effects for every associated Sonata; share these with Builder.
      payload.SonataDetails = {};
      const remaining = new Set(payload.Echo.flatMap(echo => (echo.FetterGroups || []).filter(group => (group.Fetters || []).some(bonus => /\{\d+\}/.test(bonus.EffectDescription))).map(group => group.Name)));
      const representatives = [];
      for (const echo of payload.Echo) {
        if (!(echo.FetterGroups || []).some(group => remaining.has(group.Name))) continue;
        representatives.push(echo.Id);
        for (const group of echo.FetterGroups) remaining.delete(group.Name);
      }
      await Promise.all(Array.from({length: Math.min(4, representatives.length)}, async () => {
        while (representatives.length) {
          const id = representatives.shift();
          try {
            const response = await fetch(ECHO_SOURCE + '/' + id, {signal: AbortSignal.timeout(15000)});
            if (!response.ok) continue;
            const detail = await response.json();
            for (const [name, effects] of Object.entries(detail.FetterDetails || {})) {
              if (Array.isArray(effects.EffectKeys) && Array.isArray(effects.EffectDescriptions) && effects.EffectKeys.length === effects.EffectDescriptions.length) payload.SonataDetails[name] = effects;
            }
          } catch { /* Keep the catalog usable when a detail request fails. */ }
        }
      }));
      const catalog = {...normalizeEchoCatalog(payload), updatedAt: Date.now()};
      if (catalog.sets.some(set => set.bonuses.some(bonus => /\{\d+\}/.test(bonus.description)))) {
        // A retry must revalidate missing effects rather than cache placeholders.
        return {...catalog, stale: true};
      }
      memoryCatalog = catalog;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({payload, updatedAt: catalog.updatedAt})); } catch { /* In-memory catalog still works. */ }
      return catalog;
    } catch (error) {
      if (cached) return {...cached, stale: true};
      throw error;
    }
  })();
  try { return await request; } finally { request = null; }
}
