# Weapons, Echoes and Sonatas

Verified on 2026-10-08.

- Existing Encore endpoints: `https://api-v2.encore.moe/api/en/weapon`, `/weapon/{id}`, `https://api-v2.encore.moe/api/en/echo`, `/echo/{id}`. No new server endpoints.
- Reference consulted: https://wutheringwaves.fandom.com/wiki/Sonata (indexed page; direct access returned 402). Checked set activation, duplicate Echo rules, names and effects against this reference. The current Encore catalog also includes newer sets absent from the indexed Wiki list; these retain Encore's complete descriptions and icons.
- 319 source Echo records normalize to 241 distinct named Echoes with icons. Existing normalization prefers standard records for duplicate names and excludes unresolved internal `MonsterInfo_*_Name` records. Named Phantom and Nightmare variants remain distinct. Builder and Wiki share this normalization and cache.
- All 37 Sonata groups have source icons and complete effects. The list contains unresolved parameters; `FetterDetails` in representative Echo detail responses provides the resolved effects and required piece counts. Fetch only representatives needed for unresolved groups, with at most four requests at once. Preserve line breaks. Failed enrichment remains retryable and is not stored as a fresh cache entry.
- All 124 source weapons have growth statistics. Cards display the latest level actually supplied by the source, preserving its precision. Details retain all supplied levels, including ascensions, and join attributes by level rather than array position. Reuse the existing detail cache and limit background requests to four.
- Sonata detail pages include the set icon, set explanation, every activation effect, compatible Echoes and a Wiki reference link. No fabricated flavor text or manually maintained catalog.

Validation: `npm test` (30 tests plus Gacha checks), `npm run test:archive` (current source snapshots, 3 languages, 320/390/768/1440px, navigation adjacency, catalog counts, icons, complete effects, statistics, no horizontal overflow or JavaScript errors). The browser test can fetch current source data when local snapshots are absent. Start `npm start` on port 4173 before running it.
