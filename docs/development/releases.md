# Release record

Use this record to trace the source and verification for a player-facing release. Add the next verified release above the previous one. For each entry, identify what players received, its GitHub revision, the matching Sites source revision and version, verification results, and any outstanding device checks. [Release procedure](pwa-and-release.md#release-and-verify)

## First visit and gameplay soundtrack · November 23, 2026

- **First visit.** The welcome tour shows the current room. After naming the seed, the leaf reveal and chat guide the player through the toy buttons, watering, buying and placing a starter pot on iSEED, and spending the 200-coin growth gift to sprout. Playing one practice round of Dew Catch or skipping it leads to the same 20-coin farewell gift. The purse shows the balance during play.
- **Soundtrack.** The supplied 128 kbps recording of Cotton Candy Skies loops at 75% through onboarding. Its five-second fade starts when the farewell appears. Entering the garden after the tutorial brings Mystic Oasis up to 80% in 750 ms. It loops through the toy, garden and iSEED and on later visits. A purchased record temporarily takes over. Sound and Garden ambience continue to honor the player’s preferences.
- **Verification.** All 145 Node tests passed. The production build precached 46 resources. Mobile Chromium checks covered the tour, immediate reward claim, soundtrack handoff, returning saves, app backgrounding, the record player and offline playback. The worker update preserved the saved plant. Physical iPhone and Android audio output still need a listening check. [Music walkthrough](../../tests/browser/scene_music.py)

## v52 · Garden furnishings · November 22, 2026

The garden now displays the approved cane basket, rug, botanical prints, pendulum clock, studio stool and brush cup. All 122 tests passed. The Sites and GitHub builds matched across 48 output files. Seven public resources matched the release build after deployment. Physical phones were not tested.

- [Game source bf8b764](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/bf8b76479c517d85464414813b7d9fc657e72980)
- Sites source `f51d73a298a9153de20a3f9d289ea66bf17eed36`, saved version 52, deployment `appgdep_6b031ad425c0819188fa68088510e622`
- [Public game](https://plantigochi-pocket-garden-mobile.salbasilone.chatgpt.site/)

## v51 · Garden furniture, pots and iSEED icons · November 22, 2026

| Record | Value |
| --- | --- |
| Player-facing change | The living room has the approved oak-framed sofa and open-base coffee table. The studio has a camellia easel. The shop has revised Terracotta and Blue wave pots and the Oak photo frame. The iSEED launcher has revised Inventory, Postcard and Care Library icons. |
| GitHub game source | [5a50b8e](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/5a50b8efefc2a1b79420758623f3f23301006d1b) |
| Sites source and deployment | `326e2003300dc5521ac195c52eaf04f218f21c0a` · saved version 51 · deployment `appgdep_6b0313d719f48191b91253fab0117cfb` succeeded |
| Public game | [Plantigochi](https://plantigochi-pocket-garden-mobile.salbasilone.chatgpt.site/) |
| Build and public checks | Both source checkouts passed 122 tests and produced 48 byte-identical build files. The public HTML, game JavaScript, CSS, launcher atlas, manifest and both service-worker scripts matched the release. Vite reports the main JavaScript at 502 kB minified and 177 kB gzipped. |
| Art checks | The complete living-room renders matched the approved sofa at noon and night with the cat awake and asleep. The Terracotta pot matched its shop and planted room references, and the packaged launcher matched all five approved tiles. [Sofa](../../.agents/skills/plantigochi-sprite-review/references/sofa/README.md) · [Terracotta](../../.agents/skills/plantigochi-sprite-review/references/terracotta-pot/README.md) · [Care Library](../../.agents/skills/plantigochi-sprite-review/references/iseed-library/README.md) |
| Installed-app update check | In a simulated browser cache and IndexedDB, an interrupted download kept v50 available offline. A successful retry preserved the plant ID, name, coins and journal, served all 41 new precached resources offline and accepted further saved changes. Physical iPhone and Android updates remain unverified. |

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
