# Echo identity audit

Verified 2026-10-08 against all 319 records from the existing Encore Echo list and all 319 corresponding Echo detail responses. No character or weapon endpoints or components were changed.

The source mixes standard equipable Echoes with alternate records for special modes. `PhantomType: 2` is not sufficient to exclude an entry: Lottie Lost and Cuddle Wuddle are valid Echoes under this classification. Their identity and skill are confirmed by the same API and the Wiki:

- https://wutheringwaves.fandom.com/wiki/Lottie_Lost/Echo
- https://wutheringwaves.fandom.com/wiki/Cuddle_Wuddle/Echo
- https://wutheringwaves.fandom.com/wiki/Echo/List

The twelve false catalog identities were Jinhsi, Changli, Calcharo, Shorekeeper, Camellya, Carlotta, Roccia, Brant, Cantarella, Zani, Cartethyia and Phoebe. Details identify NPC Cube models and mode-specific skills, with a reused Sentry Construct icon. These entries are excluded based on their own source metadata rather than a hardcoded list of character names. Internal entries with unresolved names or conflicting identities are also excluded; alternate copies of standard Echoes never replace the canonical record.

Lottie Lost's item icon depicted Zig Zag, and Cuddle Wuddle's depicted Violet-Feathered Heron. Their own Echo details provide the correct `Skill.BattleViewIcon` assets (`MstSkil_31046_UI.webp` and `MstSkil_32030_UI.webp`); both return HTTP 200. These source assets replace only the conflicting item icons. Names are supplied by the Echo endpoint, never inferred from an image or overwritten from the outdated Handbook labels.

Result: 229 unique valid Echoes, including 42 named Phantom appearances and 25 Nightmare Echoes. All 229 valid identities from the previous catalog remain; only the 12 NPC identities were removed. Only the two confirmed conflicting icons changed. All 37 Sonata groups remain available.

The shared cache moves to v3 so the old unvalidated v2 payload cannot reintroduce NPC names. Alternate identities are validated via existing Echo detail requests, with a maximum of four concurrent requests and duplicate requests avoided for identical name/icon pairs. Identity request failures use a previously validated stale cache or report a loading error instead of trusting unverified entries.

Validation: 33 unit tests plus Gacha checks; the archive browser regression checks the full corrected list, retention of valid Phantom/boss Echoes, three languages and four viewport widths. Fixtures contain actual source records and identity fields for the invalid NPCs, legitimate alternate Echoes and canonical counterparts. A dedicated test verifies live identity request sharing and v2-to-v3 cache invalidation.
