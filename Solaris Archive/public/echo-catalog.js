// The existing asset repository uses this Encore catalog as its source.
export const ECHO_SOURCE = 'https://api-v2.encore.moe/api/en/echo';
const CACHE_KEY = 'solaris:echo-catalog:v1';
export const ECHO_CACHE_TTL = 6 * 60 * 60 * 1000;
let request;
let memoryCatalog;
const slug = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const plain = value => String(value || '').replace(/<[^>]*>/g, '');
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
      sets.set(setKey, {slug: setKey, name: plain(group.Name), bonuses: (group.Fetters || []).map(bonus => ({count: Number(bonus.Key), description: plain(bonus.EffectDescription)})).filter(bonus => bonus.count > 0)});
      return setKey;
    });
    return {id: record.Id, slug: key, name: plain(record.Name), cost: [1, 3, 4, 4][record.Rarity], sets: [...new Set(groups)], iconUrl: icon(record.Icon), aliases: key === 'dwarf-cassowary' ? ['Casuario Enano', 'Casuar-anão'] : []};
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
      const catalog = {...normalizeEchoCatalog(payload), updatedAt: Date.now()};
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
