const key = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function selectHomeFeatured(characters, convenes, relevant = [], now = Date.now(), limit = 6) {
  const versions = characters.map(character => character.version).filter(version => /^\d+\.\d+$/.test(version || ''));
  const latest = versions.sort((a, b) => Number(b.split('.')[0]) - Number(a.split('.')[0]) || Number(b.split('.')[1]) - Number(a.split('.')[1]))[0];
  const activeNames = new Set(convenes.filter(banner => banner.type === 'resonator' && Date.parse(banner.startAt) <= now && now < Date.parse(banner.endAt)).map(banner => key(banner.featuredName)));
  const isNew = character => Boolean(character.newRelease || (latest && character.version === latest));
  const onBanner = character => [character.name, character.originalName, character.id, character.slug].some(name => activeNames.has(key(name)));
  const result = [], seen = new Set();
  const add = character => {
    if (!character || seen.has(character.slug) || result.length >= limit) return;
    seen.add(character.slug);
    result.push({ character, isNew: isNew(character), onBanner: onBanner(character) });
  };
  // Reserve space for current reruns even when a patch adds many characters.
  characters.filter(character => isNew(character) && onBanner(character)).forEach(add);
  characters.filter(character => isNew(character) && !onBanner(character)).slice(0, Math.max(0, limit - result.length - characters.filter(character => onBanner(character) && !isNew(character)).length)).forEach(add);
  characters.filter(onBanner).forEach(add);
  characters.filter(isNew).forEach(add);
  relevant.forEach(character => add(characters.find(item => item.slug === character.slug)));
  characters.filter(character => character.rarity === 5).forEach(add);
  characters.forEach(add);
  return result;
}
