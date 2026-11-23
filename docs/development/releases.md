# Release record

Use this record to trace the source and verification for a player-facing release. Add the next verified release above the previous one. For each entry, identify what players received, its GitHub revision, the matching Sites source revision and version, verification results, and any outstanding device checks. [Release procedure](pwa-and-release.md#release-and-verify)

## v73 · Final welcome button wording · November 23, 2026

Plantigochi 0.1.13 labels the green left button **Install app** and the sand right button **Just start playing**, with **or** between them. Narrow screens use tighter spacing. All 162 unit tests passed. Mobile Chromium checked the horizontal order at 320 CSS pixels, the device-specific install paths and the browser tutorial through its last reward. Six public resources matched the build and the signed-out welcome loaded. [Install choices walkthrough](../../tests/browser/public_install.py)

Sites source `c553e38982845d06fed396dc033c7252782a8a67` · saved version 73 · deployment `appgdep_6b04ce5ef82c8191a4ce4b8343ba30d8` · [GitHub release commit ca8e271](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/ca8e271)

## v72 · Start playing or install now · November 23, 2026

Plantigochi 0.1.12 offers browser play and immediate installation side by side. Browser players receive the install chat after claiming the final tutorial reward. The install panel offers a portable garden backup for separate browser and standalone storage.

All 162 unit tests passed. The browser walkthrough covered first watering, reload, pot placement, four boosts, the skipped and played Dew Catch paths, the final claim and both reminder choices. A browser garden resumed in shared installation storage and its downloaded backup restored into fresh storage with its coins and placed pot. The two buttons fit side by side at 320 CSS pixels. Chromium exercised the separate Android, iPhone and Facebook installation flows. Six public resources matched the build and the signed-out welcome loaded. Physical phone handoff remains to be verified. [Browser tutorial walkthrough](../../tests/browser/browser_tutorial.py)

Sites source `2d50f89c6846ea256aa8aaf39caaa65e11cbcab7` · saved version 72 · deployment `appgdep_6b04cd6b6760819197b47cfb7b7122b9` · [GitHub release commit a62fb65](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/a62fb65)

## v71 · Uninstall help in Settings · November 23, 2026

Plantigochi 0.1.11 adds **How to uninstall** above the reset option. Players can download a garden backup before following the device’s removal instructions. All 162 unit tests passed. Chromium exercised Android, iPhone, desktop-mode iPad and Mac Safari instructions, a downloaded backup and restoration in fresh standalone storage. Physical removal and Safari downloads still need an on-device check. Six public resources matched the release and the signed-out welcome loaded. [Backup walkthrough](../../tests/browser/uninstall_help.py)

Sites source `cec3bc497c12e058643d94a820f3240c14154184` · saved version 71 · deployment `appgdep_6b04cbffe0ac8191aeb637ab02d2e5b5` · [GitHub release commit 9c4bcbf](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/9c4bcbf)

## v70 · Play button and phone installation · November 23, 2026

Plantigochi 0.1.10 takes new visitors through four welcome cards. The final **Play Plantigochi** tap consumes an available browser install prompt immediately. Manual installation adapts to the phone and embedded browser. The install link carries the visitor to the same step after changing browsers. Seed setup opens in standalone mode.

All 162 unit tests passed. Mobile Chromium exercised Android prompt activation with a simulated install event, iPhone instructions, the Facebook handoff screen, reload, Back and fresh standalone setup. Tour music passed. Six production resources matched the build and the signed-out welcome loaded. Physical phone installation and Facebook’s external-browser menu still need a device check. [Install walkthrough](../../tests/browser/public_install.py)

Sites source `e1b1ccc0a14d7057f17945a3a0cce79aaf06f0c2` · saved version 70 · deployment `appgdep_6b04ca78f8e081918b2701f5aa10c8c1` · [GitHub release commit 8de086f](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/8de086f)

## v69 · Sharper garden items · November 23, 2026

Plantigochi 0.1.9 renders visible garden plants, pots and décor at up to three backing pixels per room unit. Their existing artwork, physical placement and saved slots carry forward. Placement previews, held plants, selection contours and postcard exports use the same finer grid. [Measured garden sprites](research/garden-item-resolution.md)

All 162 unit tests passed. Mobile Chromium checked both display densities, placed the lucky cat across rooms and confirmed its saved address after reload. The three sample sprites matched the measured improvement. Six public resources matched the build and the signed-out welcome loaded. Physical phone performance remains unverified. [Cross-room test](../../tests/browser/garden_resolution.py)

Sites source `b50a613088b3a22a1d5b3e7b482143b49f4079cf` · saved version 69 · deployment `appgdep_6b04ab2c67f081919a0f6403621cfb88` · [GitHub release commit c6404d7](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/c6404d74e0647ec05c2cb5cec11a94524ec6ca6d)

## v68 · Simultaneous care badges · November 23, 2026

Plantigochi 0.1.8 shows the four approved SpriteCook care icons as small, independently fading badges above the meters. The row aligns to the right and fits concurrent needs. The garden renderer study is recorded separately. [Resolution study and comparison](research/garden-item-resolution.md)

All 161 unit tests passed. Mobile Chromium exercised simultaneous needs and clearing each via the toy buttons at 393 and 320 CSS pixels wide, with full and reduced motion. Six release resources and the four badge PNGs matched the public deployment; the signed-out welcome loaded. Physical phone testing is pending. [Care walkthrough](../../tests/browser/care_indicators.py)

Sites source `f0263f90cd2422c0c4365f21192128607a8ddf8c` · saved version 68 · deployment `appgdep_6b04a9f53b948191ab769431046c7dba` · [GitHub release commit decdddc](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/decdddc2da2d147cc95a765d73bbab238e7e23eb)

## v67 · Sunlight shading and care icon transitions · November 23, 2026

Plantigochi 0.1.7 shades the LCD as soon as sunlight opens and deepens the shade when due. The next care icon fades in after the previous delivery finishes. Reduced motion uses a still acknowledgment. The plant animations keep their existing timing.

All 161 unit tests passed. Mobile Chromium measured the LCD edge before and after sunlight in the early and due windows, and exercised watering, feeding and company in succession with full and reduced motion. Six public resources matched the build and the signed-out welcome loaded. Physical phone testing is pending. [Mobile care walkthrough](../../tests/browser/care_indicators.py)

Sites source `9a97f0c7113e4df3b61ed971750dc8f1cc03db46` · saved version 67 · deployment `appgdep_6b04a7d8eff4819197f2f8ad19ba1592` · [GitHub release commit c1239cd](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/c1239cd0adc15db95bf6f564f8e96ae79c8b3c5e)

## v66 · LCD care cues and starting volume · November 23, 2026

Plantigochi 0.1.6 adds a hollow water drop, food spoon, company heart and feathered light cue around the keychain plant. The toy shows the next need after care succeeds. New games and the first welcome tour use a 40% music setting. New games also start sound effects at 40%. Existing mixer preferences carry forward.

All 161 Node tests passed. Mobile Chromium exercised overlapping needs, the four care buttons, successful feedback, persistence, the new starting mix and the existing audio controls. The tour and gameplay soundtrack checks passed. The managed preview relay timed out. The production-bundle walkthroughs passed, six public resources matched the release, and the signed-out welcome screen loaded. Physical phone testing is pending. [Care cue walkthrough](../../tests/browser/care_indicators.py)

Sites source `d49f7e5e70fb4e7a1af372caedd7bf209b88cf1c` · saved version 66 · deployment `appgdep_6b04a4961a688191863948ecb19a08b7` · [GitHub release commit 33f3ca8](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/33f3ca862a26df058a305a530b286d6e6dd79428)

## v65 · Garden homecoming and successor naming · November 23, 2026

Plantigochi 0.1.5 saves each fully grown plant to iSEED Inventory and invites the player to choose a garden spot. Each growth stage has a flare on the keychain. Confirming the current plant’s placement starts the next free seed. Its naming screen opens on the next keychain visit and remembers that a name is due across reloads. [Growth and care](gameplay-and-saves.md#growth-and-care)

All 160 automated tests passed. Mobile Chromium checked growth flares, cancellation and recovery through Inventory, garden placement, naming after reload, keeping the default name and Growth Lab isolation. Six signed-out public resources matched the build and the public welcome screen loaded. Physical phone verification remains open. [Homecoming walkthrough](../../tests/browser/garden_homecoming.py) · [Growth Lab walkthrough](../../tests/browser/growth_lab.py)

Sites source `806db198493dbd6a0f9dbea7b481e840eed43ced` · saved version 65 · deployment `appgdep_6b04a1b282dc81919d0c0575d9f2333d` · [GitHub release commit c0ba854](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/c0ba854993fc15d9d868f84c94aa0c90b9796490)

## v64 · Growth Lab and debug purse · November 23, 2026

Plantigochi 0.1.4 adds a disposable garden copy with an accelerated plant clock, event jumps and a manual skip for care reminders. The debug purse action sets the selected garden’s balance to 1,000 coins. Settings recognizes the two-corner gesture even when its controls overlap the corner areas on shorter phones. [Testing growth on a phone](gameplay-and-saves.md#testing-growth-on-a-phone)

All 158 automated tests passed. Mobile Chromium exercised the five-second gesture, both purse scopes, background pause, watering, full growth, room placement, the free Golden Pothos seed and discarding the copy on exit or reload. The signed-out public install page loaded and six public resources matched the build. Physical phone testing is pending. [Mobile walkthrough](../../tests/browser/growth_lab.py)

Sites source `eb09d15e1d5f6c23a371c6cadbe56e52fe916133` · saved version 64 · deployment `appgdep_6b049b32be04819180955a260f6ff8f1` · [GitHub release commit f508038](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/f5080383640177d68393599c4e75fae809b0ce92)

## v63 · Nine growable plants · November 23, 2026

Plantigochi 0.1.3 gives each mature plant a free successor when the player confirms its move into the garden. The ninth plant, Moth Orchid, leads back to Monstera. The iSEED shop also sells mature specimens, including Bird of Paradise for 600 Garden Coins and Moth Orchid for 700. [Growth and saves](gameplay-and-saves.md)

All 154 automated tests passed. The public HTML, manifest, service worker, alert worker, JavaScript and CSS matched the production build. A Chromium standalone-mode check reopened a legacy sprout, a 173-coin purse and a placed Snake Plant on the public release, then reopened them offline. A test of the two production worker builds exercised an interrupted download, retry and offline launch and verified all 46 precached resources. A browser open during the live rollout still displayed v62 on its first reload. The first update on a physically installed phone remains to be checked.

Sites source `f58f66471b5f93aefa5019e7e7a169f8fbd4716b` · saved version 63 · deployment `appgdep_6b0498a150e08191b89a9fa46c9126d3` · [GitHub release commit 93373db](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/93373dbdfb71eacf4e44b3e4526f2a003c79ea6e)

## v62 · Independent audio levels · November 23, 2026

Plantigochi 0.1.2 replaces the two audio switches in Settings with Music, Sound effects and Garden ambience sliders. Music includes the record player. Both themes retain their 50% gain ceiling. Garden ambience includes the sleeping seed and a soft breeze in the room. Existing mute choices carry forward, and backups preserve all three percentages.

All 153 automated tests passed. Mobile Chromium verified touch dragging at 320 × 568, live gain changes, legacy saves, persistence after reload, the tutorial fades and the selected record at zero volume. Both release builds produced 54 identical files. Eight public resources matched the build, including byte-range requests to both MP3s. Physical phone listening remains unverified. [Mixer checks](../../tests/browser/audio_mixer.py) · [Soundtrack walkthrough](../../tests/browser/scene_music.py)

Sites source `78922e9f9f99ab1394f96bcbb66158bfad283762` · deployment `appgdep_6b03a02582e88191bc0643d30ea92d5f` · [GitHub revision 14a2735](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/14a273596bb32c4ed5b5184e61a3ed76bfe74452)

## v61 · Shared gameplay controls and App & data · November 23, 2026

Plantigochi 0.1.1 shares its title, Share button, menu, clock and purse across the toy and garden. The iSEED shortcut stays in the bottom-right corner. Under App & data, About shows the installed build’s version and links to Waz Lab. Report a bug opens a draft to info@wazlab.com with the version in its subject.

All 146 automated tests passed. Chromium checks covered four phone sizes, sharing and focus, both menu paths, pot placement and the first-visit tutorial. These checks verified the email link. Opening a particular mail app depends on the phone’s configuration. Both builds matched across 54 files, and eight public resources matched the release after deployment. [Browser checks](../../tests/browser/garden_hud.py)

Sites source `a987d300d64b0ddab79a69b66656582380b23a0b` · deployment `appgdep_6b03999e4b888191ad154fc8ad0643bf` · [Game commit 4f74e25](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/4f74e25919303b01661aaeeb502a76ed203ea4db)

## v60 · Social share image · November 23, 2026

The public game link now shows the jade keychain with a grown Monstera beside the current sunny garden. The 1200 × 630 card uses the game renderer, welcome-tour sprites and game typography. Open Graph and X crawler requests to the live homepage returned matching metadata and alt text. The new public image matched the release PNG byte for byte. All 146 Node tests passed, and the two source checkouts produced 54 identical build files.

Sites source `3ac7822abf004b5867f3e2bf1ae7b7d00946a5ae` · deployment `appgdep_6b03960e6b908191be7e5a84d0bfa3a3` · [Game commit 7c2d033](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/7c2d0331d7a5a18f21cef15fd82300bab06d66b4) · [Published card](https://plantigochi-pocket-garden-mobile.salbasilone.chatgpt.site/social/pocket-garden.png)

## v59 · Quieter soundtrack · November 23, 2026

Cotton Candy Skies and Mystic Oasis now share a 50% maximum playback gain. Mobile Chromium verified both caps during the welcome tour, gameplay and when music resumed. The five-second tutorial fade and 750 ms gameplay entrance passed. All 145 Node tests passed. Eight live resources matched the build, including the two MP3s with byte-range delivery. Verification used browser audio measurements.

Sites source `8f822d40fa09668ffe4d686a33153df84946247f` · deployment `appgdep_6b038e59474c819184c9bb969628806d` · [GitHub game commit 64f5a14](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/64f5a142c951d444ec5c5ee29bb76ef8f41ff3ca)

## v58 · First visit and gameplay soundtrack · November 23, 2026

- **First visit.** The welcome tour shows the current room. After naming the seed, the leaf reveal and chat guide the player through the toy buttons, watering, buying and placing a starter pot on iSEED, and spending the 200-coin growth gift to sprout. Playing one practice round of Dew Catch or skipping it leads to the same 20-coin farewell gift. The purse shows the balance during play.
- **Soundtrack.** The supplied 128 kbps recording of Cotton Candy Skies loops at 75% through onboarding. Its five-second fade starts when the farewell appears. Entering the garden after the tutorial brings Mystic Oasis up to 80% in 750 ms. It loops through the toy, garden and iSEED and on later visits. A purchased record temporarily takes over. Sound and Garden ambience continue to honor the player’s preferences.
- **Verification.** All 145 Node tests passed. The production build precached 46 resources. Mobile Chromium checks covered the tour, immediate reward claim, soundtrack handoff, returning saves, app backgrounding, the record player and offline playback. The worker update preserved the saved plant. Physical iPhone and Android audio output still need a listening check. [Music walkthrough](../../tests/browser/scene_music.py)
- **Production.** Sites deployed version 58 from source `6b667c5c4729855c22b79f15a63db7acd722615e` with deployment `appgdep_6b038d6669fc8191bbf507c87e565a13`. Both source checkouts produced 53 identical build files. All eight public files checked matched the build, including both MP3s. Each track also returned the requested byte range with HTTP 206. [GitHub game commit ad20b24](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/ad20b24ecd2962a7f0926cab3c34b7a136e5f61f) · [Public game](https://plantigochi-pocket-garden-mobile.salbasilone.chatgpt.site)

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
