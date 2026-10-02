// Transparent approximation: base rates and hard pity, no assumed soft-pity curve.
export const FIVE_RATE = 0.008;
export const FOUR_RATE = 0.06;
export const clampInteger = (value, max, min = 0) => Math.min(max, Math.max(min, Math.trunc(Number(value) || 0)));
export const emptyPool = () => ({pity5: 0, pity4: 0, guaranteed: false, total: 0, history: []});
export function simulatePull(pool, type, random = Math.random) {
  const roll = random();
  const five = pool.pity5 >= 79 || roll < FIVE_RATE;
  const rarity = five ? 5 : pool.pity4 >= 9 || roll < FIVE_RATE + FOUR_RATE ? 4 : 3;
  const featured = five && (type === 'weapon' || pool.guaranteed || random() < 0.5);
  const result = {rarity, featured, pity: pool.pity5 + 1, number: pool.total + 1};
  pool.pity5 = five ? 0 : pool.pity5 + 1;
  pool.pity4 = rarity >= 4 ? 0 : pool.pity4 + 1;
  if (five && type === 'resonator') pool.guaranteed = !featured;
  pool.total++;
  return result;
}
export function calculateOdds(pity, pulls, guaranteed, type) {
  pity = clampInteger(pity, 79); pulls = clampInteger(pulls, 160);
  // Probability mass only for paths that have not yet obtained the featured item.
  let mass = new Map([[`${pity}:${Number(guaranteed || type === 'weapon')}`, 1]]);
  for (let n = 0; n < pulls; n++) {
    const next = new Map();
    const add = (key, probability) => next.set(key, (next.get(key) || 0) + probability);
    for (const [key, probability] of mass) {
      const [count, guarantee] = key.split(':').map(Number);
      const rate = count === 79 ? 1 : FIVE_RATE;
      if (rate < 1) add(`${count + 1}:${guarantee}`, probability * (1 - rate));
      if (!guarantee) add('0:1', probability * rate * 0.5);
    }
    mass = next;
  }
  return {
    five: pulls >= 80 - pity ? 1 : 1 - (1 - FIVE_RATE) ** pulls,
    featured: Math.max(0, Math.min(1, 1 - [...mass.values()].reduce((a,b)=>a+b,0))),
    maximum: (guaranteed || type === 'weapon' ? 80 : 160) - pity
  };
}
