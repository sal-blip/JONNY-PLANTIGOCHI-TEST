# Gameplay and saves

[Growth and care](#growth-and-care) · [Games and rewards](#games-and-rewards) · [Saving an edit](#saving-an-edit) · [Changing the save format](#changing-the-save-format) · [Worked example](#worked-example)

## Growth and care

Start with `game.js` when changing a rule. Follow a water button press from the keychain into `care(saved, 'water', now, confirmed)`. It calls `wake` to resolve elapsed time, checks the same `careStatus` used by the menu, settles earned growth, then updates the plant. Blocked actions return the current state after waking. The LCD derives its meters from that state, so a change to watering eligibility should flow through to its readout. [Game rules](../../src/game.js) · [Button handlers](../../src/PocketDevice.jsx) · [LCD readouts](../../src/plantReadout.js)

| Rule | Where to change it | Behavior to preserve |
| --- | --- | --- |
| Growth | `earnedAt`, `wake`, `nextMilestone`, `milestoneDue` | A watered seed sprouts on a visible wake at or after one hour from planting. Later milestones use **earned** time at days 3, 5 and 7. `earned` and `anchor` record settled progress. Critical thirst, overdue food or light, root rot and active fungus stop accrual. |
| Soil and food | `condition`, `careStatus`, `care`, `soilDeadline` | After sprouting, soil dries at 4 hours, becomes critical at 12, and reaches its thirst deadline at 24. A confirmed extra pour can soak the soil. Another confirmed pour at least an hour later in the same wet period can cause rot. Food and light have 48- and 24-hour intervals and each opens 8 hours early. |
| Illness and death | `discoverFungus`, `treatFungus`, `deathDeadline`, `wake` | Fungus becomes eligible 36–60 hours after sprouting or treatment. Seeing it on the eligible main toy screen starts the 12-hour rescue window. Treatment checks the outbreak timestamp. Root rot has its own 12-hour rescue window. A missed deadline records one pressed leaf and its cause. |
| Company and succession | `company`, `moodOf`, `graduate`, `replant` | Talk and completed game rounds update company. Mood is independent of physical growth. Graduation moves the mature plant’s ID into a garden slot and creates a new active ID. A rooted 12-hour cutting can start a new generation after death. |

Use explicit millisecond timestamps in tests. Check the exact boundary, a reload after time away, and an action timestamp older than the last recorded care. The visible game refreshes the display, while timestamps let the simulation catch up when the app reopens. Review the reminder schedule when a change moves a care or growth deadline. [Simulation timing tests](../../tests/simulationTiming.test.js) · [Growth tests](../../tests/growth.test.js) · [Fungus tests](../../tests/fungus.test.js) · [Reminder schedule](../../src/reminderSchedule.js)

## Games and rewards

`stepGame(state, event)` runs a round from key and tick events. `dewRules(level)` controls droplet speed, spacing and target. Dew Catch unlocks at sprout and shares three strikes across 20 levels. A loss resets the run to level one while preserving the personal best. Leaf Echo unlocks at young and checks a three-key sequence. To change game balance, drive the reducer with explicit events in a test. Follow `recordRound` for the saved checkpoint, win receipt and company update. [Game reducer](../../src/pocketPlay.js) · [Result handler](../../src/PocketDevice.jsx) · [Game and survival tests](../../tests/survival.test.js)

The toy’s Growth Spurt entry uses the same offer calculation as the purchase transaction. Each 50-coin spurt adds a quarter of the current stage, capped at its next milestone. The first sprout uses four purchases after a one-time 200-coin gift. Its final debit and the start of normal care share a transaction. The sprout greeting then offers one optional round of Dew Catch. The save keeps the remaining chances and caught drops so the player can resume. The first win, third miss, or decision to skip leads to a farewell on the toy. Claiming the 20-coin gift credits the wallet and clears the pending farewell together. Game winnings are separate. Older saves in the app tour resume at the garden return gesture. Older saves in the final toy tour enter normal care from the migration time. Confirmation rechecks funds, care, the expected stage and purchase count against the latest save. See `growthSpurtOffer` and `buyGrowth` in [the simulation](../../src/game.js).

The wallet, purchases, journal events, real-plant records and saved notes live in `gardenLife`. A visible check-in awards 10 coins once per local calendar day. Eligible watering earns 2 coins up to three times per day. A win earns 3 coins up to five times per day, with a unique receipt and matching start and finish dates. Keep spending and placement together in `placeItem`, which rechecks the destination and balance before charging. Journal changes compare the original entry when editing or deleting it. Unsaved drafts live in the current garden session. [Economy and journal operations](../../src/gardenEconomy.js) · [Daily visits](../../src/dailyVisit.js) · [Draft handling](../../src/journalDrafts.js) · [Economy tests](../../tests/gardenEconomy.test.js)

## Saving an edit

Call `commit(current => next)` from the UI. The hook queues operations, and the store reads the latest plant inside a read/write IndexedDB transaction. Base the change on that argument and return it unchanged if the action is no longer possible. If the UI promises that a purchase or move happened, check both whether the operation changed the plant and whether the transaction succeeded. A successful no-op can occur when another window already moved the item. [Save hook](../../src/useGardenSave.js) · [Transactions](../../src/gardenStore.js) · [Room operations](../../src/Collector.jsx)

The database is `plantigochi.pocket.garden`, object store `garden`. The `current` record holds plant JSON. The `setup` record holds onboarding phase, epoch and revision. A replacement or reset rotates the epoch. A pending destructive confirmation also checks the reviewed content to detect edits from older windows. Reset commits the erase and a cleanup marker together so interrupted preference and alert cleanup can resume. Reminder work for an enrolled device is staged in the plant transaction. [Store](../../src/gardenStore.js) · [Conflict and recovery tests](../../tests/gardenStore.test.js) · [Reminder transaction tests](../../tests/reminderOutbox.test.js)

## Changing the save format

1. Define the new field’s initial value in `newPlant` or the `gardenLife` defaults. Decide whether it belongs to the active plant or follows the collection through `graduate` and `replant`. Both functions merge a fresh seed over the previous garden. [Lifecycle](../../src/game.js) · [Economy defaults](../../src/gardenEconomy.js)
2. Update `readPlant` and the appropriate validator. It migrates v1 and v2 plant records to v3 and supplies missing fields for supported older saves. Check old records, present-but-invalid values, and repeated reads. An unreadable or unsupported save goes to recovery, where the original can be exported. [Save reader](../../src/game.js) · [Recovery screen](../../src/Recovery.jsx)
3. Round-trip through the actual backup path. Gardens without available frame originals export JSON. A `.plantigochi` bundle carries the garden and original image bytes. Frame previews remain in JSON and originals are separate IndexedDB blobs. A frame upload commits both together, and a restore assigns fresh original IDs. When adding media, exercise replacement, deletion, insufficient space and interrupted restore. [Backup codec](../../src/gardenBackup.js) · [Storage tests](../../tests/gardenStore.test.js)

## Worked example

To open safe watering **45 minutes before dry soil**, change `WATER_TOP_UP_WINDOW` in `game.js` from half an hour to 45 minutes. The existing four-hour interval would open the top-up at 3h 15m after the last drink. Update the half-hour case in the survival tests to check one millisecond before opening, the opening instant, the meter text and the next watering deadline after a successful top-up. Keep the normal dry and critical thresholds in place, and update the player-facing timing in the README. [Care rule](../../src/game.js) · [Boundary test](../../tests/survival.test.js) · [Player guide](../../README.md)

From the repository root, run the focused cases, then the complete suite.

```sh
node --test tests/survival.test.js tests/simulationTiming.test.js tests/gardenEconomy.test.js tests/gardenStore.test.js
npm test
```
