export const TIER_ORDER = ['T0','T0.5','T1','T1.5','T2','T3','T4'];
export const TIER_ROLES = ['dps','hybrid','support'];
export const TIER_SOURCE = 'https://www.prydwen.gg/wuthering-waves/tier-list';
const key = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function tierCharacterKey(character) {return key(character.name || character.slug || character.id);}
export function tierProfileSlug(character) {
  return /^Rover\s*\(/i.test(character.name) ? `rover-${character.element.toLowerCase()}` : character.slug;
}

let snapshot, pending;
export function getTierSnapshot() {return snapshot;}
export function validateTierSnapshot(data) {
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value+'T00:00:00Z'));
  if (data?.schemaVersion !== 1 || data.source !== TIER_SOURCE || !/^\d+\.\d+$/.test(data.patch || '') || !validDate(data.sourceUpdatedAt) || !validDate(data.verifiedAt) || !Array.isArray(data.characters) || !data.characters.length) throw Error('Invalid tier snapshot');
  const seen = new Set();
  for (const character of data.characters) {
    if (!/^[a-z0-9-]+$/.test(character.slug || '') || seen.has(key(character.slug)) || character.sourceUrl !== `https://www.prydwen.gg/wuthering-waves/characters/${character.slug}` || !Array.isArray(character.ratings) || !character.ratings.length) throw Error('Invalid tier character');
    seen.add(key(character.slug));
    const roles = new Set();
    for (const rating of character.ratings) {
      if (!TIER_ROLES.includes(rating.role) || roles.has(rating.role) || !TIER_ORDER.includes(rating.toa) || !TIER_ORDER.includes(rating.ww) || (rating.sequence !== null && !/^S[0-6]$/.test(rating.sequence))) throw Error('Invalid tier rating');
      roles.add(rating.role);
    }
  }
  return data;
}
export async function loadTierSnapshot() {
  if (snapshot) return snapshot;
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch('/data/tier-list-3.7.json?v=20261001',{signal: AbortSignal.timeout(10000)});
    if (!response.ok) throw Error('Tier snapshot unavailable');
    snapshot = validateTierSnapshot(await response.json());
    return snapshot;
  })();
  try {return await pending;} finally {pending = null;}
}

// Catalog facts and editorial ratings are independent. Never infer a grade.
export function selectTierEntries(characters, data, filters = {}) {
  const references = new Map((data?.characters || []).map(record => [key(record.slug),record]));
  const catalog = new Map(characters.map(character => [tierCharacterKey(character),character]));
  const query = key(filters.query);
  const mode = filters.mode === 'ww' ? 'ww' : 'toa';
  const entries = [];
  for (const [identity,character] of catalog) {
    if (query && !key([character.name,character.originalName,character.slug].filter(Boolean).join(' ')).includes(query)) continue;
    if (filters.element && filters.element !== 'all' && character.element !== filters.element) continue;
    if (filters.weapon && filters.weapon !== 'all' && character.weapon !== filters.weapon) continue;
    if (filters.rarity && filters.rarity !== 'all' && Number(character.rarity) !== Number(filters.rarity)) continue;
    const reference = references.get(identity);
    if (!reference) {
      if (!filters.role || filters.role === 'all') entries.push({character,role:null,tier:null,sequence:null,sourceUrl:null});
      continue;
    }
    for (const rating of reference.ratings) {
      if (filters.role && filters.role !== 'all' && rating.role !== filters.role) continue;
      entries.push({character,role:rating.role,tier:rating[mode],sequence:rating.sequence,sourceUrl:reference.sourceUrl});
    }
  }
  return entries.sort((a,b) => (a.tier ? TIER_ORDER.indexOf(a.tier) : 99) - (b.tier ? TIER_ORDER.indexOf(b.tier) : 99) || a.character.name.localeCompare(b.character.name,'en') || TIER_ROLES.indexOf(a.role) - TIER_ROLES.indexOf(b.role));
}
