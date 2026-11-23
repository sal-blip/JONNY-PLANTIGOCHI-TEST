# Plantigochi implementation roadmap

This is a historical planning and verification record. For current behavior, active decisions and development entry points, use the [developer guide](development/README.md).

**Deferred publishing plan.** The web-first launch, device-local saves, Android and iPhone distribution, Steam controls and optional Stripe shop are collected in the [publishing notes](deferred-publishing-plan.md).

| Status at start | Feature and acceptance criteria |
| --- | --- |
| Built | Installable offline keychain, LCD button controls, hold Back to exit, glass menu, six scenes and own photo, tilt, chain flick, intro, synth, Dew Catch and Leaf Echo. Keep 20 Dew levels, three shared strikes and reset to level one. |
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

## Future idea for move-in day

The unfurnished-room and separate-install proposals are deferred. Daily check-ins and the iSEED shop have since shipped in the furnished game. The bullets below preserve the original proposal.

- New players could start with an unfurnished garden room. A gift pothos cutting could give them something to pot on day one while their Monstera follows its seven-day growth cycle.
- Daily check-ins could award Garden Coins to spend in a laptop shop. The room’s existing furniture could become pieces players buy and arrange over time. Players who already have furnished rooms would keep them.
- A separate, installable playtest could let players try the move-in experience alongside the live game. It would need its own site address, app identity, saves, and notification subscriptions.
