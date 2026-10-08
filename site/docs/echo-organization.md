# Echo catalog organization

Reference checked on 2026-10-08: https://wutheringwaves.fandom.com/wiki/Echo and its List/Stats pages. Direct access to the main page failed; indexed reference content confirms four classes and separate regular, Nightmare and Phantom entries.

- Classes come from Encore's existing threat-class field `Rarity`: 0 = Common, 1 = Elite, 2 = Overlord, 3 = Calamity. These are distinct from an individual Echo's upgrade rarity. Costs remain 1/3/4/4 from the existing normalization.
- The Wiki groups the validated catalog by class, then alphabetically. Current source: 229 Echoes, distributed across Calamity (14), Overlord (46), Elite (71) and Common (98). Existing identity validation, canonical IDs, icons and deduplication remain intact.
- Phantom classification uses the source's `Phantom Appearance` type or explicit name prefix. Nightmare classification uses the explicit source name, including Reminiscence and Phantom Nightmare entries. These properties are independent: a Phantom Nightmare matches both variant filters. Regular excludes both.
- The accessible funnel control offers All / Cost 1 / Cost 3 / Cost 4. Search, cost, class, variant, element and Sonata filters intersect. Search includes source names, existing aliases, elements, classes and Sonata names, without case or accent sensitivity. Category counts reflect other active filters. Reset restores all entries.
- Search updates only the results area, keeping focus and avoiding additional API requests. State remains on SPA detail navigation and when changing language. Existing raw v3 cache payloads gain the new classification fields during normalization; no cache migration or extra endpoints are needed.

Validation: 34 unit tests plus existing Gacha checks; archive browser tests exercise every cost, class/variant/element/Sonata combinations, accent search, empty state, reset, input focus and detail/back navigation in three languages and four viewport widths (320/390/768/1440). Existing weapon and Sonata pages also pass the regression test. No horizontal overflow or JavaScript exceptions.
