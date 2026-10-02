# Convene media provenance

Inspected 2026-09-22: https://wuwa.aza.gg/gacha

The public page preloads `gacha_ing_rarity_4.webm` and `gacha_ing_rarity_5.webm`.
Its public route module actually plays `gacha_ing_rarity_5_fixed.mp4` for a batch
containing any 5-star result, and `gacha_ing_rarity_4.webm` otherwise, including
3-star singles. Playback completion reveals the results.

Solaris serves local copies of the two WebM versions in `public/media/convene`,
using `video/webm` and byte-range responses. Playback no longer depends on third-party hotlinking. The MP4
advanced with zero video width in the tested Chrome environment, so it was not
selected. All three URLs responded HTTP 200:

- https://wuwa.aza.gg/static/gacha/gacha_ing_rarity_4.webm — video/webm, 2,119,475 bytes.
- https://wuwa.aza.gg/static/gacha/gacha_ing_rarity_5.webm — video/webm, 2,725,297 bytes.
- https://wuwa.aza.gg/static/gacha/gacha_ing_rarity_5_fixed.mp4 — video/mp4, 6,839,676 bytes.

These are third-party-hosted game media, not an official Kuro API. Public access
and successful playback are technical checks, not a license grant. No explicit
redistribution license was found on the inspected pages. The two WebM files are
included locally; no AZA simulator code is reused. Attribution is displayed
in the player; attribution does not itself grant rights. Permission for a public
deployment remains unverified.

Only the selected clip is requested after a user clicks Convene. Native browser
HTTP caching is used, with no custom stale cache. The Convene click initiates
muted inline playback immediately, including when reduced motion is enabled,
as explicitly requested. Reduced motion only suppresses the closing transition.
There is no playback confirmation or enable/disable option.
The player replaces the banner artwork temporarily inside the banner section;
route updates preserve it until playback completes. Playback begins muted for
mobile compatibility, with an optional sound
button. Skip, Escape, failure, and a 12-second no-progress timeout all reveal the
already committed draw exactly once. Failure does not substitute a synthetic clip.
