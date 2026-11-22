# Working on Plantigochi

Start with the [developer guide](docs/development/README.md). It maps tasks to the files that own the behavior and the tests that exercise it. The [player guide](README.md) describes what a player should experience.

- Use the normal entry point for the feature. A watering change reaches the simulation through the toy controls. A placement change reaches the room through both iSEED and the garden.
- Check existing gardens and fresh installs when changing save or setup behavior. The save guide explains how transactions, backup imports and older open windows interact.
- For new shop or garden artwork, work on one item at a time. Show a first-pass comparison at normal phone scale and in close-up, then integrate the approved version. The [sprite review skill](.agents/skills/plantigochi-sprite-review/SKILL.md) contains the tools and an approved example.
- Use Node.js 24 and `npm ci` for the game. Run the relevant `node --test tests/<file>.test.js` tests while iterating, then `npm test` and `npm run build` for a gameplay release.
- When implementation or design decisions change, update the corresponding [handoff record](docs/development/README.md#where-to-record-a-change). Keep roadmap ideas identified as proposed or deferred.
