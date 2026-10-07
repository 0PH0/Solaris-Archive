import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectHomeFeatured} from '../public/home-featured.js';

const now = Date.parse('2026-10-07T12:00:00Z');
const character = (slug, version = '3.6', extra = {}) => ({slug, name: slug, rarity: 5, version, ...extra});
const banner = (featuredName, extra = {}) => ({type: 'resonator', featuredName, startAt: '2026-10-01T00:00:00Z', endAt: '2026-10-20T00:00:00Z', ...extra});

test('new releases and active reruns lead, with relevant characters filling remaining space', () => {
  const catalog = [character('older'), character('rerun'), character('new', '3.7'), character('meta'), character('new-banner', '3.7')];
  const result = selectHomeFeatured(catalog, [banner('rerun'), banner('new-banner')], [catalog[3]], now, 4);
  assert.deepEqual(result.map(entry => entry.character.slug), ['new-banner', 'new', 'rerun', 'meta']);
  assert(result[0].isNew && result[0].onBanner);
  assert(!result[2].isNew && result[2].onBanner);
});

test('expired, future, invalid dates and weapon banners do not create active character badges', () => {
  const catalog = ['expired', 'future', 'weapon', 'invalid'].map(slug => character(slug));
  const result = selectHomeFeatured(catalog, [banner('expired', {endAt: new Date(now).toISOString()}), banner('future', {startAt: '2026-11-01T00:00:00Z'}), banner('weapon', {type: 'weapon'}), banner('invalid', {startAt: ''})], [], now);
  assert(result.every(entry => !entry.onBanner));
});

test('current reruns keep a slot in larger releases, without duplicate characters', () => {
  const catalog = [...Array.from({length: 8}, (_, i) => character('new-' + i, '3.10')), character('rerun', '3.9')];
  const result = selectHomeFeatured(catalog, [banner('rerun'), banner('rerun')], catalog, now);
  assert.equal(result.length, 6);
  assert.equal(new Set(result.map(entry => entry.character.slug)).size, 6);
  assert(result.some(entry => entry.character.slug === 'rerun'));
  assert(result.slice(0, 5).every(entry => entry.isNew));
});

test('matching uses catalog aliases, explicit newRelease works, and empty feeds remain usable', () => {
  const catalog = [character('hsin', undefined, {name: '心', id: 'Hsin', newRelease: true}), character('jiyan', undefined)];
  const result = selectHomeFeatured(catalog, [banner('Hsin')], [], now);
  assert(result[0].isNew && result[0].onBanner);
  assert.equal(selectHomeFeatured(catalog, [], [], now).length, 2);
  assert.deepEqual(selectHomeFeatured([], [], [], now), []);
});
