// The server keeps the full upstream payload; the browser stores only normalized details.
const TTL = 6 * 60 * 60 * 1000;
const memory = new Map();
const pending = new Map();
const queue = [];
let active = 0;
function drain() {
  while (active < 3 && queue.length) {
    const {work, resolve, reject} = queue.shift(); active++;
    Promise.resolve().then(work).then(resolve, reject).finally(() => {active--; drain();});
  }
}
function limited(work) {return new Promise((resolve,reject) => {queue.push({work,resolve,reject}); drain();});}
export function getCharacterDetail(id) {return memory.get(String(id))?.data;}
export async function loadCharacterDetail(id) {
  id = String(id);
  if (!/^\d{4}$/.test(id)) throw Error('Invalid character ID');
  const key = 'solaris:character-detail:v1:' + id;
  let saved = memory.get(id);
  try {saved ||= JSON.parse(localStorage.getItem(key));} catch {}
  if (saved && Date.now() - saved.time < TTL) {memory.set(id,saved); return saved.data;}
  if (pending.has(id)) return pending.get(id);
  const task = limited(async () => {
    try {
      const response = await fetch('/api/characters/' + id, {signal: AbortSignal.timeout(20000)});
      if (!response.ok) throw Error('Character details unavailable');
      const data = await response.json();
      if (Number(data.id) !== Number(id) || !data.name) throw Error('Invalid character details');
      const entry = {time: Date.now(),data}; memory.set(id,entry);
      try {localStorage.setItem(key,JSON.stringify(entry));} catch {}
      return data;
    } catch (error) {if (saved?.data) {memory.set(id,saved); return saved.data;} throw error;}
  });
  pending.set(id,task);
  try {return await task;} finally {pending.delete(id);}
}
