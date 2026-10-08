// The existing asset repository uses this Encore catalog as its source.
export const ECHO_SOURCE = 'https://api-v2.encore.moe/api/en/echo';
const CACHE_KEY = 'solaris:echo-catalog:v2';
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
    const name = plain(record.Name).trim();
    if (!name || /^MonsterInfo_.*_Name$/i.test(name) || !icon(record.Icon)) continue;
    const key = slug(name);
    if (!unique.has(key)) unique.set(key, record);
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
    return {id: record.Id, slug: key, name: plain(record.Name), cost: [1, 3, 4, 4][record.Rarity], element: plain(record.Element?.Name), description: plain(record.Attributes), sets: [...new Set(groups)], iconUrl: icon(record.Icon), aliases: key === 'dwarf-cassowary' ? ['Casuario Enano', 'Casuar-anão'] : []};
  });
  if (!echoes.length || echoes.some(echo => !echo.cost || !echo.sets.length)) throw new Error('Incomplete Encore catalog');
  return {echoes: echoes.sort((a,b) => b.cost-a.cost || a.name.localeCompare(b.name)), sets: [...sets.values()], source: ECHO_SOURCE};
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
