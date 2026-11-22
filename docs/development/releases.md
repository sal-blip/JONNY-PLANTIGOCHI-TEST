# Release record

Use this record to trace the source and verification for a player-facing release. Add the next verified release above the previous one. For each entry, identify what players received, its GitHub revision, the matching Sites source revision and version, verification results, and any outstanding device checks. [Release procedure](pwa-and-release.md#release-and-verify)

## v50 · Garden and iSEED artwork · November 22, 2026

| Record | Value |
| --- | --- |
| Player-facing change | The garden has a revised paper-globe floor lamp, walnut record player, Laurentii snake plant and porcelain Maneki-neko. The iSEED launcher has new Shop and Journal icons. |
| GitHub game source | [8ebd868](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/8ebd8685c4e5f9615da690184ece7eabf700c4ab) |
| Sites source and deployment | `18eb20f24401b020c194a77784c00c28a409523a` · saved version 50 · deployment `appgdep_6b0303ff25ec819194dc8b3dc55b8efe` succeeded |
| Public game | [Plantigochi](https://plantigochi-pocket-garden-mobile.salbasilone.chatgpt.site/) |
| Build and public checks | All 122 automated tests passed. The GitHub and Sites builds matched byte for byte. Anonymous requests to the public game returned the exact release HTML, JavaScript, CSS, launcher atlas, manifest and both service-worker scripts. |
| Art checks | Both complete lamp scenes matched the approved noon and night images. All seven record-player animation phases matched their approved frames. All six mounts were checked in two lighting conditions. The six released assets matched their respective art references. [Lamp](../../.agents/skills/plantigochi-sprite-review/references/floor-lamp/README.md) · [Record player](../../.agents/skills/plantigochi-sprite-review/references/record-player/README.md) |
| Installed-app update check | A Chromium profile controlled by the v49 service worker updated to v50. With the network disabled, the updated worker served the install tour, the new JavaScript, the iSEED launcher and the first tour image. This check used a fresh browser profile. Physical iOS and Android devices were not tested. |

## v49 · Golden pothos · November 22, 2026

| Record | Value |
| --- | --- |
| Player-facing change | The shop and garden use the approved Golden pothos foliage. A previously owned plant keeps its identity and pot. |
| GitHub game source | [bd9875f](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/bd9875f965ef5673bacc82b16465975693384b1e) |
| Sites source and deployment | `567318a7a34dd8c546af70bb0df415b1e4e380da` · saved version 49 · deployment `appgdep_6b02f4c362e88191ba8c5b5511d1eb9f` succeeded |
| Public game | [Plantigochi](https://plantigochi-pocket-garden-mobile.salbasilone.chatgpt.site/) |
| Build check | All 122 automated tests passed. The clean GitHub checkout and the Sites checkout produced identical build directories. Verified the live entry point, JavaScript, CSS, manifest and service worker against the release build. |
| Design check | The neutral 400 × 320 room and 72 × 64 shop tile each matched the approved image at every pixel. Checked idle motion, pot swaps, lighting, selection, reduced motion and the older species alias. [Approved comparison](../../.agents/skills/plantigochi-sprite-review/references/golden-pothos/comparison.png) |
| Device coverage | Art verification used the game renderer. Physical phone appearance was not checked for this release. |
