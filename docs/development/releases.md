# Release record

Use this record to trace the source and verification for a player-facing release. Add the next verified release above the previous one. For each entry, identify what players received, its GitHub revision, the matching Sites source revision and version, verification results, and any outstanding device checks. [Release procedure](pwa-and-release.md#release-and-verify)

## Plantigochi 0.1.64 · Explore the garden before the first rewards

After collecting the sprout gift and answering any care reminder, the player swipes the toy away, visits the Plant Studio and comes back to the living room. The garden calendar then shows an alert. Opening it leads to the existing daily check-in and free spin. A player who already received the check-in coins during setup can go straight to the spin. Returning from the first rewards visit fades Cotton Candy Skies into Mystic Oasis. The saved tour step lets a player resume after closing the game. Gardens that finished the previous tutorial keep their usual daily rewards.

A quick horizontal swipe eases the garden camera to the adjacent room. A slower or held drag leaves the camera at the release point. Room chevrons also advance the tour, and reduced-motion settings skip the camera easing. [Garden tour](../../tests/browser/garden_tour.py) · [Camera gestures](../../tests/browser/garden_hud.py) · [Music handoff](../../tests/browser/scene_music.py)

The production build and 202 unit tests passed. Mobile Chromium walkthroughs covered the first visit, both room swipes, holding a manual camera position, reopening mid-tour, and collecting each reward once. The audio walkthrough measured continuous Cotton Candy Skies through the spin and the transition to Mystic Oasis after leaving rewards. An installed 0.1.63 test garden restarted into 0.1.64 and kept its plant.

On the public site, a 0.1.63 installation found the release through the regular update menu, offered Restart and reopened on 0.1.64 with its original plant ID. The public release descriptor, JavaScript entry, service worker digest and immutable game page matched the tested build. Physical phone gesture testing remains open. Published Sites version `appgver_d48bda2def608191a6a22043372a09f2` from Sites source `1dd53031815fdf6c0a1062b413a8ad18f04f4359` in deployment `appgdep_6b067ef14cdc8191a05890e852dd3d9f`. [GitHub release revision](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/08b9d9f)

## Plantigochi 0.1.63 · Download progress and restart

A mobile Chromium test reproduced the reported 0.1.61 screen by returning stale HTML after the release descriptor advertised 0.1.62. The installed app knew the published version but could not verify the downloaded game. The specific failure on the reporting phone remains unconfirmed.

The new worker fetches the exact game page from a content-addressed URL and verifies its integrity before activation. The updated client joins an existing download for the same release, counts files as they become available offline, and keeps waiting while the download advances. The menu distinguishes download failures from verification failures, and a verified update can offer a restart during play. The repair page also offers Restart in standalone mode.

The build and 201 unit tests passed. Chromium walkthroughs upgraded unmodified 0.1.61 and 0.1.62 installations after a failed attempt, with stale public HTML on retry. Both reached Restart and retained the plant ID. A separate test exercised repair and restart from an installed 0.1.61 garden. [Upgrade walkthrough](../../tests/browser/installed_update.py) · [Timeout and progress tests](../../tests/appUpdates.test.js)

On the public origin, an installation opened on 0.1.62 reached **Restart to update**, reopened on 0.1.63 and retained its plant. A separate archived 0.1.61 installation served on localhost fetched the live 0.1.63 files and passed the same check. Public release descriptor, module, worker digest, and immutable shell matched the built files. Published Sites version `appgver_12b5432e5c0c8191b190a1acbb74d7ee` from Sites source `77d3a277917bdb4702b1a7b92fa995beba2a1415` in deployment `appgdep_6b067822b6888191b1b2b3263938f5b1`. [GitHub release revision](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/8e98eb5)

## Plantigochi 0.1.62 · Save, Updates & More

Open **App & data → Save, Updates & More** for garden backups, restore, update checks, install and uninstall help, and the three-step garden reset. Back from either help screen and Cancel from reset return to this menu. Players on 0.1.61 can use Settings to install this release.

The production build and 198 unit tests passed. The installed-update walkthrough upgraded a 0.1.61 garden, checked its plant ID after restart, and verified offline and reconnect status on the new screen. The timeout test also recovered from a stalled check there. [Installed update](../../tests/browser/installed_update.py) · [Update recovery](../../tests/browser/update_recovery.py)

## Plantigochi 0.1.61 · Installed update test

Version-only release for testing Settings → Check for updates from 0.1.60. The production build and all 198 unit tests passed. The installed-update walkthrough verified that Settings recovered from a stale entry, restarted into the new build, and kept the original plant ID. [Upgrade walkthrough](../../tests/browser/installed_update.py)

Published to the [public game](https://plantigochi-pocket-garden-mobile.salbasilone.chatgpt.site/) from [GitHub revision d6544db](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/d6544db). Sites source `714d50fb799e71d6e21cdee5e39237c10c4d5abd`, saved version `appgver_16b5302d95d08191bd2ee171bdf39ff6`, deployment `appgdep_6b067403a4508191a6301898ea0e402b`.

## Plantigochi 0.1.60 · Explore the toy menu before watering

The first seed introduces Care, Play, Growth, First Aid, and Field Guide as players browse in either direction. The tour remembers distinct icons across reloads and asks for Back once all five have been seen. Opening the menu again highlights Care, then Water. Returning players who already finished the controls lesson go straight to watering.

The production build and 198 unit tests passed. Mobile Chromium checks covered both arrow directions, reversing and reloading midway, the watering handoff and the rest of the first visit. An installed 0.1.59 garden also updated to 0.1.60 through Settings. [First visit](../../tests/browser/scene_music.py) · [Resume the menu tour](../../tests/browser/starter_games.py)

Published to the [public game](https://plantigochi-pocket-garden-mobile.salbasilone.chatgpt.site/) from [GitHub revision db6854d](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/db6854d). Sites source `9d12c4e8cc4444280e9efee80b90bce5e432ca7b`, saved version `appgver_4e6a6b6ba54c8191a69d2d5a6118a9c8`, deployment `appgdep_6b0671dae8d4819189b43224db8292ee`.

## Plantigochi 0.1.59 · Verify updates against the published game

Reproduced in Chromium with 0.1.57 installed and 0.1.58 available. When the registered worker URL returned its previous script, Settings reported “You have the latest version.” The old check observed worker changes without comparing the open game with the published release. The separate repair page used a fresh worker URL and checked the cached entry.

Settings and background checks now read a network-only release descriptor, install the published worker on the existing scope, verify the controlled HTML, and compare it with the running game. Settings shows the published version when it differs. Stale files, stalled requests and interrupted downloads leave a retry available. No garden or notification data is cleared.

The production build and 198 unit tests passed. Browser tests cover upgrading older installations, rejecting an incorrect cached entry, recovering in Settings with stale unversioned URLs, offline and reconnect, and preserving the plant ID after restart. [Upgrade walkthrough](../../tests/browser/installed_update.py) · [Timeout and retry](../../tests/browser/update_recovery.py)

**Live rollout verification.** A Chromium installation opened on 0.1.58 before deployment upgraded through Settings and Restart to update on the public origin. It reopened on 0.1.59, verified the release again, and retained its original plant ID. The public descriptor, entry and worker fingerprint matched the built release. Published Sites version `appgver_1b6d88ade14481919a2c0e257a93c044` from Sites source `513ccbad6693c1a4b37550e52d598300b2e51e69`. [GitHub revision](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/dd3b367)

## Plantigochi 0.1.58 · Use a Growth Day from the prize screen

The Garden Spin previously announced a Growth Day and sent players back to the rewards list. The prize now offers immediate redemption on the named plant or saving for later. After a successful save, the receipt offers to show the plant. Banked days appear above the slot machine and explain any care needed first. Decorative rays behind the machine let taps reach the spin button.

All 196 unit tests passed. A mobile Chromium walkthrough exercised the first free spin, immediate use, returning to a saved voucher through iSEED after reload, and a blocked redemption for a plant with fungus. The test checks the saved growth, voucher count and watering time. [Growth Day walkthrough](../../tests/browser/growth_day_prize.py)

## Plantigochi 0.1.57 · One games card and a focused first drink

The welcome tour shows all three games on one card with individually labeled previews. The first seed greeting points to the toy’s heart button. After learning the controls, players can find Play in the regular menu. The sprout still offers Play Vine Trail or Maybe later before the tutorial gift.

All 196 unit tests passed. Browser checks covered the three previews on one screen, the installation handoff, the first drink, the sprout invitation, the gift, and the reminder choice. The three previews fit inside the illustration at 320 × 568, 375 × 667, 844 × 390, and 1280 × 720.

## Plantigochi 0.1.56 · Welcome tour games

The welcome tour previews Vine Trail, Dew Catch, and Leaf Pairs with the toy’s own artwork. When the first Monstera sprouts, players choose **Play Vine Trail** or **Maybe later**. A run uses the regular board, speed, and fifth-sun reward. Finishing or leaving the run introduces the other games. Both choices lead to the existing 20-coin gift and care reminder flow. A saved Dew Catch tutorial round from an earlier release still resumes with its original progress.

The production build and 196 unit tests passed. Chromium walkthroughs covered the sprout invitation, early exit after reload, the gift and the reminder choice. [Tutorial walkthrough](../../tests/browser/scene_music.py) · [Saved game and exit checks](../../tests/browser/dew_lesson.py)

Published as Sites version `appgver_2320853503188191983c6474ea2eea4b` from Sites source `e6ba0ae41ff368e29d542d722cb322abef2b104d`. The public entry page, service worker, and JavaScript bundle matched the tested build. [GitHub revision](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/37d8b4a82a85f39461e4dbd60a1a1d29de868b62)

## Plantigochi 0.1.55 · Update recovery

The public /update page can refresh an older installation on its existing scope and verify the game entry served after activation. Settings links to it after a failed or slow update check. The repair works on cached app files and leaves garden data in place.

**Phone verification, November 25, 2026.** An older installation stayed on the previous build after a restart, and Settings showed “Could not check for updates.” The player confirmed the direct repair worked on the affected phone. To repeat the recovery, open the repair page in the browser profile used to install the game, tap **Repair update**, wait for the version confirmation, then reopen the game from its home-screen icon. [Repair page](https://plantigochi-pocket-garden-mobile.salbasilone.chatgpt.site/update) · [Fix commit](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/428b810e1f47d9d2e489864d34bca87138f16523)

## Plantigochi 0.1.54 · Installed game updates

The update worker verifies the entry page against the release before activating. Settings shows the running version beside the update control. This release includes the edge-to-edge camera.

## Plantigochi 0.1.53 · Edge-to-edge garden photos

The wide camera fills the iSEED viewfinder with the garden’s ceiling and foreground floor. Captures follow the finder’s aspect ratio throughout the zoom range.

## Plantigochi 0.1.52 · Full-room garden camera

The iSEED camera opens with the entire selected room visible and zooms to the original 4× close-up. New PNG photos include the translucent Plantigochi icon and Plant Garden signature at the lower left.

## Plantigochi 0.1.51 · Leaf Pairs miss limit

The toy counts mismatched pairs and ends the round on the fifth miss. Heart deals a shuffled board with a fresh counter.

## Plantigochi 0.1.50 · Leaf Pairs card faces

All nine faces use original 20 × 20 LCD artwork, with separate silhouettes and accent colors across the eighteen-card board.

## Plantigochi 0.1.49 · Pocket arcade

The Vine Trail board expands from 12 × 6 to 16 × 10 cells. The vine moves every 300 ms with smooth travel between cells and a symmetrical leaf tip. Play continues past the fifth sun until a collision or a full board. Leaf Pairs has nine distinct matches on an eighteen-card board.

## Plantigochi 0.1.48 · Three games from the first seed

Play Vine Trail, Dew Catch, or Leaf Pairs immediately after naming a seed. Leaf Pairs replaces Leaf Echo. The optional first-visit game picker returns to the watering lesson when the player leaves.

## Plantigochi 0.1.47 · Garden navigation

The garden purse is above the clock, matching the toy. On iSEED home the purse sits next to Rewards. The living room and studio use pulsing directional chevrons. Dragging toward another room reveals the chevron for the return trip.

## Plantigochi 0.1.46 · Garden and iSEED purse

The garden purse sits beside the phone button. The iSEED home screen shows the same coin badge in its lower-right corner. The daily earnings tally has been removed from the wallet display. The [garden HUD walkthrough](../../tests/browser/garden_hud.py) checks the balance and placement. The [interior asset audit](research/garden-interior/README.md) records the artwork for future review.

## Plantigochi 0.1.45 · iSEED icon frames

The five launcher icons and the Rewards calendar use a level, symmetric outer frame. The rim comes from a SpriteCook edit of the original calendar. The original illustrations and launcher positions are preserved. [SpriteCook asset record](../art-review/iseed-launcher-hd/spritecook-assets.json)

## Plantigochi 0.1.44 · Garden audio

Removed the synthesized garden breeze, sleeping-seed breathing loop and their volume control. Older gardens retain their music and effects settings on upgrade.

## Plantigochi 0.1.43 · Share camera

The iSEED camera now passes the garden’s selected record to the room renderer when drawing the viewfinder and exporting the photo. A slow room load offers Retry after 12 seconds and can still finish on its own. The viewfinder fills the iSEED display, with vertical zoom on the right and the photo roll, shutter and sharing along the bottom. The camera stores PNGs on this device and uses the same crop for its preview and export. The [Share camera walkthrough](../../tests/browser/share_camera.py) exercises both rooms from the iSEED icon, including a stalled load, zoom, capture, saved photos after relaunch, sharing and download.

## Plantigochi 0.1.42 · Update check recovery

Settings offers a retry when the browser leaves a service-worker request unresolved or a download stops progressing. Existing installs attach to their active registration before checking for new code. Replacement activation still offers Restart to update. Regression tests cover stalled registration, updates and downloads, late responses, offline fallback and reconnect. All 191 unit tests passed. A [Chromium Settings walkthrough](../../tests/browser/update_recovery.py) exercised timeout and retry against a deliberately stalled browser API and verified the saved plant ID.

## Plantigochi 0.1.41 · Numbered slot coins

The Garden spin reels and prize card share four stamped coin faces showing 10, 25, 50 and 100. The numerals occupy the center of the SpriteCook gold coin. [Art record](../art-review/daily-spin/spritecook-assets.json)

## Plantigochi 0.1.40 · Garden spin reveal

The cabinet now takes center stage. All three reels start together and coast to a stop at 1.55, 2.90 and 4.65 seconds. After the first stop the camera eases closer. The sprout celebration’s feathered rays and stars shine behind the cabinet, with a single burst on the last landing. A prize card names the saved award and where to find it. Reduced motion opens the prize card immediately. Closing mid-spin preserves the award. After the daily free spin, players can spend a token on another spin with the same odds. The token balance replaces the coin counter in Rewards. Buying a token costs 100 Garden Coins. All 187 automated tests passed. Component checks covered the timed reveal, reduced motion, interrupted spins, purchase confirmation, and free and token spins. The managed preview relay timed out before a phone viewport could be inspected.

## Plantigochi 0.1.39 · Daily rewards and Garden spin

The first regular visit each local day opens a seven-day reward card with a coin claim and one free three-reel spin. The iSEED header badge clears as each action is completed. Existing same-day credits remain paid. The introductory pot retains its original funding, and new players can use their first spin after the tutorial. Prize inventory, growth vouchers and the daily receipt travel with garden backups. All 184 tests passed, including concurrent IndexedDB claims and spins. A component walkthrough covered browsing, claiming, spinning, closing and reopening. The managed browser preview relay timed out, so the visual transition on a physical phone still needs a check.

## Plantigochi 0.1.38 · Weekly check-ins and garden camera

Daily rewards shows the repeating seven-day calendar and collected coins. Journal now includes the Care library. Share opens a garden viewfinder with room selection, tap-to-focus, drag, zoom and PNG capture. This release follows the production navigation from 0.1.37. All 177 unit tests passed. Component checks exercised reward browsing, switching Journal tabs, choosing camera rooms, zooming, capturing a 1200 × 960 PNG and retaking it. Physical pinch gestures and the native file share sheet await device testing.

## Plantigochi 0.1.37 · Snake Plant and nursery pots

Snake Plant, Golden Pothos, Hoya Splash, Queen Anthurium and Monkey Tail Cactus now use their mounted foliage with the approved Terracotta pot by default. Their portraits frame the complete plant. Garden placements use the owned pot at the slot when one is present. Magnified iSEED portraits sample the native layers directly when they exceed the room stamp’s resolution.

## Plantigochi 0.1.36 · Native garden artwork

Shop, Inventory, revealed Collection portraits and placed specimens now use the approved full-color source cutouts. Settled garden close-ups redraw the visible area at display density within the room's existing pixel budget. The [resolution study](research/garden-item-resolution.md) records the source sizes, measurements and remaining phone check.

## Plantigochi 0.1.35 · iSEED launcher icons

All six iSEED apps use the reviewed high-resolution icons. The Inventory handhold is centered on its front plank. The Plantigotchi tile depicts the leaf case, four buttons and upper-left keyring of the in-game toy.

## Plantigochi 0.1.34 · Higher-resolution pots and plants

iSEED portraits and garden specimens render at 3×. The six pots with larger approved source artwork show their original ceramic details in both places. Physical-phone testing is pending. [Rendering details](research/garden-item-resolution.md)

## Plantigochi 0.1.33 · Garden contact shadows

Pots cast a soft shadow at the actual foot, including the offset sole on the Rain Boot and the pedestal on the Low Sandstone Bowl. The shadow stays fixed during plant sway and softens at night. Shop portraits show clean item art. The garden size comparison includes the contact shadow.

## Plantigochi 0.1.32 · Six approved garden pots

The iSEED Shop adds Honey-Glazed Terracotta, Blue Willow Porcelain, Low Sandstone Bowl, Stump Cottage, Rain Boot and Ringed Planet. The boot seats its roots over the heel. Existing plant and pot IDs remain compatible with saved gardens. Review images and their SpriteCook sources are in [regular pots](../art-review/regular-pots-01/README.md) and [wild pots](../art-review/wild-pots-01/README.md).

## v91 · Named seed silhouettes and 32 growable species · November 24, 2026

Plantigochi 0.1.31 brings the 23 new growable plants into the live game. Each species has a named silhouette on animated question-mark paper and reveals its portrait at maturity. All 173 unit tests passed, including soil contact for all additions at three poses across four pots. Mobile Chromium checked all 32 silhouettes, returning gardens and reduced motion. The production bundle, worker, 32 masks and 20 LCD atlases matched the build. Physical handset testing is pending.

Sites source `fa006dfece0c202ee89527ea98c5a6a18e261752` · saved version 91 · deployment `appgdep_6b05b3f054208191b67d633eb42b1e0b`.

## v90 · Earned growth in days and hours · November 24, 2026

Plantigochi 0.1.30 introduces seven numbered day segments for maturity and four-hour stage segments, with quarter hours for seeds. Mobile Chromium verified elapsed time, segment counts, a partial final segment and maturity. All 172 unit tests passed. The public entry module and service worker matched the build.

Sites source `10b59c63ab687fb0a326e51f01bc321fd1bf2329` · saved version 90 · deployment `appgdep_6b05aeafcda081919f5ae1c114773394`.

## v89 · Full growth meter · November 24, 2026

Plantigochi 0.1.29 displays earned growth toward full maturity alongside the current stage in iSEED. All 172 unit tests passed. Mobile Chromium checked the sprout, four days of earned growth and the completed meter. The public entry module and service worker matched the build.

Sites source `cfec92b5ce49b822bbbe91cbb3eb80dd914ddccb` · saved version 89 · deployment `appgdep_6b05ac7cbc388191b9dbd5b9a2bb709a`.

## v88 · Plantigotchi companion on iSEED · November 24, 2026

Plantigochi 0.1.28 adds a live growth and care dashboard, a nine-plant collection and a toy guide. Raising a plant to maturity reveals its portrait. Repeat graduates count once, and purchasing a plant leaves its mystery square hidden.

All 172 unit tests passed. Mobile Chromium checks covered opening the app, reading the guide, dashboard and collection, and verifying portraits against fresh and returning gardens. The public entry module, service worker, manifest and launcher artwork matched the build. Physical phone testing is pending.

Sites source `9a66af295157a2b5522e8151fdc4505f696e57f7` · saved version 88 · deployment `appgdep_6b05ab3aa1488191a488f67340318f10`.

## v87 · iSEED shop close-up · November 24, 2026

Plantigochi 0.1.27 opens an enlarged catalog portrait with Back and Buy. Players can inspect items above their balance. The room still charges on confirmed placement. All 172 unit tests passed. Chromium exercised the full tutorial, Back and Escape, affordability, purchase, placement and reload. The public bundle, service worker and manifest matched the build. Physical phone testing is pending.

Sites source `c02aa59f44500952671b017caa907672c04cf6ad` · saved version 87 · deployment `appgdep_6b05a8e798808191a8a71870a89d6c7c`.

## v86 · Garden collection and pot fitting · November 24, 2026

Plantigochi 0.1.26 ships the reviewed seed and shop collections, revised layered plant artwork, and clear starter shelves in both rooms. Existing residents keep their slots and purchased pots. Players can repot into a placed, empty pot.

All 172 unit tests passed. Browser checks on the review build exercised placement, repotting, graduation and reload. After deployment the public page loaded the expected entry module, and the public JavaScript, service worker and manifest matched the release build. An installed physical phone remains to be checked.

Sites source `b541e88eb506f8ee2c91d3a4258210549b92ebfb` · saved version 86 · deployment `appgdep_6b05a76669bc8191891862e4701f5b4f`. Published from the local review checkout based on GitHub revision `eacd9ad`.

## v85 · Garden inspection selection · November 24, 2026

Plantigochi 0.1.25 gives a shared plant and pot one inspection view. Either touch target opens the same explicit Plant only, Pot only and Plant + pot choices. Actions appear after selection. The title, artwork, scrolling actions and Done footer occupy separate rows. The pot instruction previously inherited absolute positioning from the tutorial bubble and could overlap the inventory action.

The browser walkthrough used a Moth Orchid in a Bog Frog Pot on the center windowsill at noon and night. It checked enlarged text in narrow portrait and short landscape, repotting, swapping pots, moving both together, storing the pot and reopening the garden. All 165 unit tests passed. Six public resources matched the build. A Chromium test of the live Settings update from 0.1.24 reopened the same garden offline. Physical phone layout feedback is pending.

Sites source `f0bb038ae36d3b704c54e5df0b4b3026ec1175eb` · saved version 85 · deployment `appgdep_6b050472e3c88191b25e84f383d727d0` · [GitHub source 60e1df8](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/60e1df8)

## v84 · Garden swipe performance · November 24, 2026

Players noticed stutter when swiping between the toy and the garden. The swipe handler updated styles across the game on each animation frame, even after the player lifted their finger. Plantigochi 0.1.24 lets the browser animate the transition after a player releases a swipe. During a drag, toy visibility updates only the layers that use it. The room retains its measured pixel dimensions and animation throughout. Across ten touch swipes with a populated garden in 4× CPU-throttled Chromium, the repeat comparison reduced time spent recalculating styles from 2,594 ms to 940 ms and the share of sampled frame intervals above 25 ms from 144/193 to 97/226. After updating the installed app, one player described swiping as “definitely better.”

All 165 unit tests passed. Browser checks covered cancellation, reduced motion, room animation behind iSEED, two rendering densities and placement after reload. Six public resources matched the build. A test profile on the live game used Settings to update from 0.1.23 and relaunched offline with the same plant, purse and placed resident.

Sites source `abfdcab595bac65f187b021102875d85a9a54958` · saved version 84 · deployment `appgdep_6b0500c5bf888191a722d943188a5619` · [GitHub source 602274a](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/602274a)

## v83 · Installed garden launch · November 24, 2026

Plantigochi 0.1.23 paints the room and floor at the measured phone size on launch. Two installed-mode runs with a saved garden went from eight initial layer paints to two. All 165 unit tests passed. The resolution and swipe walkthroughs passed, including room animation behind iSEED.

Six public resources matched the release build. An immediate reload during the live rollout initially returned the old entry. In a separate Chromium test starting with the v82 files and serving the new files from production through a local test origin, Settings → Check for updates → Restart to update loaded v83. The saved sprout, purse and placed plant survived the update and offline relaunch. Physical-phone launch smoothness still needs confirmation.

Sites source `f13eb437219fd59618d77d6d8158bc560fddc497` · saved version 83 · deployment `appgdep_6b04ff09fe508191a876680d21f80eb9` · [GitHub source c2cce52](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/c2cce522ceaaa2a8748083145096c8d1e23447f9)

## v82 · Garden placement pulse · November 24, 2026

Plantigochi 0.1.22 adds a soft radial wave inside each placement marker every 2.8 seconds. The center dot and swap arrows stay legible. Reduced motion keeps the marker still. Mobile Chromium compared all 11 destination buttons in a furnished living room with v81 and confirmed matching rim and hit dimensions, checked both pulse types and completed a swap. All 165 unit tests passed. Six published resources matched the local release and the public welcome loaded.

Sites source `4f013ab38460c69acd9a8be495b03af6d4a4159f` · saved version 82 · deployment `appgdep_6b04f71ef944819186055c397b155a61` · [GitHub source f2f4781](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/f2f4781)

## v81 · Softer light and natural sprite colors · November 24, 2026

Plantigochi 0.1.21 broadens the radial falloff around a focused room asset and removes its selection outline and shine while inspecting it. Text retains its own shadow in both lighting modes. All 165 unit tests passed. Mobile Chromium checked day and night inspection, independent plant and pot moves, and persistence after reload. Six production resources matched the release and the public welcome loaded. Physical phone testing remains open.

Sites source `b8c3255e6b925f70e827fbbace6bf5f9fbc187ee` · saved version 81 · deployment `appgdep_6b04f66a6e748191b0bf84fe3d8223b9` · [GitHub source 65f78dc](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/65f78dc)

## v80 · Radial garden inspection light · November 24, 2026

Plantigochi 0.1.20 centers a radial gradient on the selected artwork. All 165 unit tests passed. Mobile Chromium checked day and night framing, repotting, pot swaps and reload. Six public resources matched the local build.

Sites source `960b46af2d0d493ba41d57839d156b58b5305d3e` · saved version 80 · deployment `appgdep_6b04f5bf73508191965780d9fc5bbdb6` · [GitHub source 3fe1f4c](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/3fe1f4c)

## v79 · Inspect and repot in the garden · November 24, 2026

Plantigochi 0.1.19 frames room assets with text above and actions below. Open scenery holds its closer view for five seconds and eases back over 2.2 seconds. Repotting leaves the original container behind, while moving a purchased pot can swap it under a resident plant. The release passed 165 unit tests, a production build, day and night inspection, repotting and swap persistence, shared HUD and touch-passage checks in mobile Chromium. Physical-device testing remains open.

Sites source `17e7d3456f06102dd4f88629cdd31c0933fa011b` · saved version 79 · deployment `appgdep_6b04f54f59fc819191d233175e293f13` · [GitHub source 079bc43](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/079bc43)

## v78 · Garden placement depth and shop size comparison · November 23, 2026

Plantigochi 0.1.18 scales placeable assets with their supporting furniture or projected floor contact. The shop can show all 17 catalog items at windowsill scale beside a terracotta pot. Dragging a plant follows the scale of its source or prospective destination. The game reads existing slot addresses.

All 164 unit tests passed. Mobile Chromium exercised comparison-mode purchase, placement, reload, and cross-room decor movement at 1× and 3× device pixel density. The neutral-pose study repeated all 1,296 combinations. Both coffee-table frogs measured 22.7 room units wide. Combinations with architectural clipping fell from 80 to 42, all on shelving or the studio cabinet. Six production resources matched the release, and the public welcome loaded. Hardware testing remains open. [Placement design and comparison image](interface-and-art.md#placement-depth-and-shop-size)

Sites source `169b5187a7fbfbcfce45d7866bf0c2a17ca54132` · saved version 78 · deployment `appgdep_6b04f0356ee08191b4482d37f0be47aa` · [GitHub release commit 390a06e](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/390a06e)

## v77 · Continuous garden animation under iSEED · November 23, 2026

Plantigochi 0.1.17 keeps the garden animation running as the handset opens, while players use its apps, and throughout the swipe back. A visible room can animate while the handset owns input.

The previous release showed zero changes in sampled room artwork while iSEED was raised. The mobile Chromium regression passed on the launcher, in Journal and during a held swipe. It also checked cancelled and completed swipes and reduced motion. All 162 unit tests passed. Six production resources matched the release and the public welcome loaded. Physical devices were outside these checks. [Touch walkthrough](../../tests/browser/garden_passage.py)

Sites source `b8dcd230c5c26616cc878ba0ba4ab4ee4fa4536c` · saved version 77 · deployment `appgdep_6b04dda399a88191af0790ee7fcc2f11` · [GitHub release commit 133133c](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/133133c)

## v76 · Garden camera and swipe continuity · November 23, 2026

Plantigochi 0.1.16 keeps the visible room painted during toy and iSEED transitions. Its resting camera is 8% closer. Tapping or briefly holding open scenery uses the room’s existing focus and ease-out. The room retains native touch targets for objects, placement and HUD controls.

Mobile Chromium reproduced the previous blank actor canvas mid-swipe. The regression check passed with held, cancelled and repeated swipes, open-space focus and horizontal panning. Other browser checks covered portrait and landscape controls, item placement and reload at two display densities. All 162 unit tests passed. Six production resources matched the build and the live welcome loaded. Physical phone gestures remain a device check. [Touch walkthrough](../../tests/browser/garden_passage.py)

Sites source `09b912cb72401bb275874f8b7e1b41ab3eaf2c5c` · saved version 76 · deployment `appgdep_6b04dbd91ee481918568690ad8e538c3` · [GitHub release commit a4c5332](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/a4c5332)

## v75 · Returning browser gardens skip the welcome tour · November 23, 2026

Plantigochi 0.1.15 gives first-time browser visitors the installation tour. An existing browser save opens a welcome-back page with Home Screen guidance. Backup and installation help sit behind a disclosure that opens automatically for a direct install link. Installed games continue through their saved checkpoint.

All 162 unit tests passed. Chromium exercised the first-time install flow with Android, iPhone and Facebook browser profiles, both IndexedDB and legacy browser saves, and a backup restored into a fresh installation. Relaunch resumed the restored tutorial with the same plant ID. Six live resources matched the build and the signed-out welcome loaded. Physical devices were outside these checks. [Browser recovery walkthrough](../../tests/browser/browser_tutorial.py)

Sites source `57b6379af2d6c060ee732750b4ca23e47a4189d8` · saved version 75 · deployment `appgdep_6b04d81e8e98819198e025775b93c177` · [GitHub release commit 5946f41](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/5946f41)

## v74 · Install-only welcome and tutorial care reminders · November 23, 2026

Plantigochi 0.1.14 offers **Install app** on the last welcome card. A former browser player can export their existing garden and restore it during installed setup. After the final tutorial reward, supported devices offer **Turn on reminders** or **Maybe later** in a chat bubble. Deferring opens a final water-meter message. Its **Got it** acknowledgment survives reload.

All 162 unit tests passed. Chromium exercised Android, iPhone and Facebook install paths, recovery of a former browser tutorial save, and the enable and defer choices with simulated permission and push APIs. Physical device notification delivery was outside these checks. Six production resources matched the build and the signed-out welcome loaded. [Reminder walkthrough](../../tests/browser/tutorial_reminders.py) · [Former browser save walkthrough](../../tests/browser/browser_tutorial.py)

Sites source `8f99b5e322cf8e13934d7318ca241d5874d75dc8` · saved version 74 · deployment `appgdep_6b04cfe1108081918c3e19c0d1955731` · [GitHub release commit 7d165f0](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST/commit/7d165f0)

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
