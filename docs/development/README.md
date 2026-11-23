# Plantigochi developer guide

Use this index to go from a player-facing change to its implementation, regression tests and design history.

| I need to change… | Start here | A useful search |
| --- | --- | --- |
| Growth, care, mood, fungus, death or Dew Catch | [Gameplay and saves](gameplay-and-saves.md) | `rg -n -e "function wake" -e "function care" src/game.js` |
| Garden Coins, check-ins, shop purchases, journal or plant inventory | [Gameplay and saves](gameplay-and-saves.md) | `rg -n -e placeItem -e checkIn src tests` |
| Saving, restoring, resetting or storing original frame photos | [Gameplay and saves](gameplay-and-saves.md) | `rg -n -e gardenStore -e readGardenBackup src tests` |
| Installation, seed naming, gestures, LCD controls, menus, iSEED or sound | [Interface and art](interface-and-art.md) | `rg -n -e InstalledSession -e useHandsetPassage src` |
| A room object, shelf, pot, plant sprite, placement target or postcard | [Interface and art](interface-and-art.md) · [Sprite review skill](../../.agents/skills/plantigochi-sprite-review/SKILL.md) | `rg -n -e drawPottedPlant -e drawShopPreview src` |
| A missed notification, offline install, service worker, database migration or release | [PWA and release](pwa-and-release.md) | `rg -n -e stageGardenReminder -e reminderAPI src server` |
| Future web launch, Google Play, App Store, Steam, controllers or Stripe purchases | [Deferred publishing plan](../deferred-publishing-plan.md) | `rg -ni -e Steam -e Stripe docs/deferred-publishing-plan.md` |
| The reason for a design choice or the status of a proposal | [Design and implementation decisions](decisions.md) · [Historical roadmap](../plantigochi-roadmap.md) | `rg -ni -e deferred -e approved docs .agents/skills` |

## First run

Use Node.js 24. From a clean checkout, run `npm ci`, then `npm test` and `npm run build`. For interactive development use `npm run dev`. The browser tab opens the installation tour. To exercise gameplay as a player would, start from the installed app icon. Local push delivery and a real hosted Worker have different setup requirements. [PWA and release](pwa-and-release.md)

## How a change travels through the game

The browser mounts React in [main.jsx](../../src/main.jsx). [App.jsx](../../src/App.jsx) chooses the browser tour or installed game, opens the local save and coordinates three surfaces. The keychain shows the active plant, the room holds the collection, and iSEED hosts the shop, inventory and journal. Each surface owns its interactions. Shared simulation and economy functions apply the rules to the latest saved garden.

For example, to change when watering opens, find the rule and its boundary tests first. Follow it to the LCD care prompt, local save and outgoing reminder schedule. Check an existing garden and a newly named seed. The [watering example](gameplay-and-saves.md#worked-example) traces this feature across those layers.

## Where to record a change

| What changed | Where the next developer should find it |
| --- | --- |
| A behavior, entry point, data shape or verification procedure | Update the relevant guide above. Link the source and the test that demonstrates the behavior. Update the root player guide if the on-screen experience changes. |
| A lasting design or architecture choice | Add or revise an entry in [decisions.md](decisions.md). Include the player need, the choice, its practical consequence and the supporting code or approval. Mark superseded choices. |
| An art direction the player approved | Keep the native renders, the editable art and its anchor together with the review workflow. Record the item and show what it looked like in the actual game. [Approved Golden pothos example](../../.agents/skills/plantigochi-sprite-review/references/golden-pothos/comparison.png) |
| A future idea without approval to implement | Add it to the [roadmap](../plantigochi-roadmap.md) with its status. |
| A shipped update | In the [release record](releases.md), capture the GitHub commit, Sites version/source commit, verification performed, and any checks still awaiting a device. The [release guide](pwa-and-release.md) explains the two repositories. |

Keep the guides organized by feature and link to the owning implementation. Git history holds the detailed sequence of edits.
