# Plantigochi implementation roadmap

This is a historical planning and verification record. For current behavior, active decisions and development entry points, use the [developer guide](development/README.md).

**Proposed for review.** The [seed and shop collection plan](plant-collection-plan.md) lists the nine grow-only plants, the replacement shop roster and the two-seed choice after graduation.

**Deferred publishing plan.** The web-first launch, device-local saves, Android and iPhone distribution, Steam controls and optional Stripe shop are collected in the [publishing notes](deferred-publishing-plan.md).

| Status at start | Feature and acceptance criteria |
| --- | --- |
| Built | Installable offline keychain, LCD button controls, hold Back to exit, glass menu, six scenes and own photo, tilt, chain flick, intro, synth, Vine Trail, Dew Catch and Leaf Pairs. Keep 20 Dew levels, three shared strikes and reset to level one. |
| Planned | Migrate valid saves to transactional IndexedDB. Preserve the raw original on migration, corruption or unknown versions. Provide recovery export, confirmation on restore, an unsaved indicator, and cross-tab consistency. Backups include active plant, graduate locations, cuttings, Leaf Book, game records, preferences and photograph. |
| Planned | A watered seed sprouts after one hour. Earn Young, First Split and Grown at 3, 5 and 7 days of eligible growing time. Water dries at 4h, becomes critical at 12h, and kills at 24h. Two confirmed extra pours spaced at least 1h in the same wet interval cause rot, with 12h to drain. Food is due every 48h and light every 24h, each available 8h early. Critical thirst, rot, and overdue nutrition/light pause growth. |
| Planned | Kind Words or finishing either game counts as company. Happy lasts 30m, Content until 12h, Quiet until 24h, then Lonely. Mood alone changes through company. Display Growth, age, Water and Mood on the LCD with detailed timers in Care. |
| Planned | Broad Monstera canopy with separated stems, fenestrations and face on pot. Review each stage, emotional pose, physiological need, action, death and replant at phone scale, in motion and with reduced motion. |
| Planned | Upward swipe or Garden tab opens a 16-bit living room. Six selectable pots, large window, local dawn/day/dusk/night, adjoining rooms. Graduate by choice from Growth, atomically awarding one pot and one fresh sleeping seed. Graduates require no upkeep. |
| Planned | Opt-in company nudge after 10h, once per stretch and per day. Rescue takes priority. Deduplicate and cancel stale care, growth and company events across restore, graduation, death and reconnect. |
| Planned | Keep one-tap game links. Add public social metadata and a local-only room postcard preview with native file sharing, PNG download and copy-link fallback. |
| Planned separately | Plant-biodata MIDI player with title and capture credit. Ivy at Dawn is a research demo. Verify redistribution rights and credit before adding a track. |
| Planned verification | Run existing and new regressions, simulate consecutive seven-day journeys, full rooms, migration, concurrent actions and alerts. Inspect artwork at phone size. Record actual locked iPhone/Android push and native composer observations separately from automated checks. |

## Handoff

Garden progress belongs to its browser origin. Export a backup before moving to a different host such as Overskill. Use the existing public Site for this release.

## Release results · November 20, 2026

| Status | Result |
| --- | --- |
| Verified | 34 automated tests pass. Seven successive simulated seven-day cycles fill one room and open the next. Verified pause/resume, rescue deadlines, company timing, death, both games, graduation identity and a backup round trip. |
| Verified | At 320 × 568, Chromium opened the production build, rendered all three LCD meters and six pot targets, restored a backup through the app and moved a graduate using the toy buttons. An interrupted IndexedDB move rolled back without changing the plant or its pot. Two tabs competed for the same graduate and only one received a permanent pot. Reload retained the room and next seed. Damaged and future saves downloaded byte-for-byte through recovery. |
| Verified | Reviewed all five stages across six soil conditions, 16 mood/need combinations and 11 effects. Checked reduced motion, the installed asset bundle, six full and empty pot positions, and daylight and nighttime room images. Postcard preview and PNG download worked. |
| Verified | Mocked native sharing accepted a PNG and the public game URL, respected cancellation, and fell back to manual copy with clipboard access denied. The public preview PNG is 1200 × 630. Worker/API tests covered opt-out, duplicate and expired wakes, overlapping rescue and growth, missing schedules and company cooldown. |
| Built · device verification pending | Actual receipt on locked iPhone and Android, an actual social app composer, and a social crawler's rendered preview require external device/service checks. No post was sent. |
| Planned separately | Plant-biodata music player and Overskill hosting migration. |

## Apartment and LCD update

The living room and adjoining plant studio form a continuous 16-bit Canvas scene. Each pair has twelve places to set plants, including an open pot shelf, windowsills, a coffee table and a drawing desk. Plants keep their pot designs when carried across rooms. The calico responds to a tap, and the room follows the phone’s local daylight cycle.

Growth, Water and Mood each have a separate LCD row under the centered plant. At 320 × 568, the three labels, tracks and readings fit without overlap.

Mobile Chromium checks covered picking up and dragging plants, placing them across rooms, cancelling a move, reloading saved positions, exporting a room postcard, and moving a grown plant into its first home. A 45-plant Monstera collection opened eight views. Additional species artwork is future work.

## Deferred Phase 1 follow-ups

- **iSEED Shop wishlist.** Let players heart individual plants and filter the shop to saved picks. Show the remaining Garden Coins for each plant and use the existing purchase and placement flow.
- **Labeled garden postcards.** Let players add the displayed plant's cultivar name to a postcard before sharing it.

### Optional garden activities

Deferred on November 25, 2026 after reviewing 0.1.65. Revisit these in the order below if playtesting shows that players want more to do between care visits. Each would become available after the first rewards visit.

1. **Weekly Windowsill Show.** Put a weekly styling prompt in iSEED → Share. Start with *My First Plant Corner* so a new player can enter with the terracotta pot wherever they placed it. Try *Blue & White* next, featuring the 28-coin Blue Willow Porcelain. Let players use pieces they own, submit or replace a watermarked photo, earn one dated Journal ribbon, and share to their plant group if they wish. Charge for a new piece through the existing placement confirmation. Accept an intentional entry for the pilot. If a later theme requires a particular object, check its room and position against the crop at capture. Keep the ribbon in the garden backup so it survives when a camera-roll photo stays on the original device. [Garden camera](../src/GardenCamera.jsx) · [DreamSnaps participation research](https://disneydreamlightvalley.com/wrap-up/global)
2. **Mystery Leaf.** Offer a short, untimed identification puzzle in Journal → Care library. Start with Snake Plant, Raven ZZ and Polka Dot Begonia. Use a legible crop from the approved shop artwork, three named choices, a written clue that works without color, and a second hint on retry. Reveal the full portrait and the identifying trait, save one daily stamp, and offer the exact shop listing or proposed wishlist. Bundle the clues for offline use and reserve undiscovered seed-grown portraits for the toy. [Care library](../src/CareLibrary.jsx) · [Shop portraits](../src/GardenShop.jsx) · [Plant identification game reference](https://store.steampowered.com/app/1574580/Strange_Horticulture/)
3. **Windowsill Visitors.** Prototype one ladybug on the living-room sill and let the player photograph it for a Journal stamp. Store its room and perch so it stays put when the player raises iSEED. Draw the same visitor in the live room and camera, and credit the sighting once when it is in frame. Try two poses on the existing room animation clock and one still pose for reduced motion. Check swiping and zooming on a phone before adding a tree frog drawn to any potted sill or a dusk moth with a daytime lure. The Bog Frog Pot could feature in the shop as an optional pairing. [Room renderer](../src/RoomView.jsx) · [Camera scene](../src/Collector.jsx) · [Visitor collection reference](https://play.google.com/store/apps/details?id=jp.co.hit_point.nekoatsume)

**Decision after a pilot.** With volunteer testers, compare who enters a second weekly show, who confirms a featured Garden Coin purchase, and who chooses to share. If players repeatedly decorate and photograph their rooms, revisit a permanent glass conservatory as a possible real-money expansion with purchase restoration. [Deferred publishing and payment plan](deferred-publishing-plan.md#optional-real-money-items-during-the-web-year)

## Deferred garden interior and outdoor scenery overhaul

Revisit the full background of the living room and adjoining studio, from the ceiling, walls and floor to the landscape through both windows. Use the sharper plants and pots in version 0.1.9 as the visual reference. Keep the wide, cozy 16-bit room easy to read at phone size. [Garden sprite resolution study](development/research/garden-item-resolution.md)

When this work resumes, start with one windowsill and its outdoor view. Put an approved plant on the sill and compare the scene in daylight and at night. Check how the landscape shifts when panning into the next room and how the same view reads behind the blurred Plantigochi. Use that sample to decide which scenery layers need new drawing detail. Check saved placements against the shelf edges and measure panning performance on a phone before extending the treatment across both rooms. [Scenery renderer](../src/roomScenery.js)

## Future idea for move-in day

The unfurnished-room and separate-install proposals are deferred. Daily check-ins and the iSEED shop have since shipped in the furnished game. The bullets below preserve the original proposal.

- New players could start with an unfurnished garden room. A gift pothos cutting could give them something to pot on day one while their Monstera follows its seven-day growth cycle.
- Daily check-ins could award Garden Coins to spend in a laptop shop. The room’s existing furniture could become pieces players buy and arrange over time. Players who already have furnished rooms would keep them.
- A separate, installable playtest could let players try the move-in experience alongside the live game. It would need its own site address, app identity, saves, and notification subscriptions.
