# Design and implementation decisions

These choices are in effect as of the approved Golden pothos release. This record explains the constraints another developer would otherwise have to infer by playing the game.

| Area | Decision and reason | Follow through when changing it |
| --- | --- | --- |
| First launch | The public website teaches installation. The installed app resumes setup from its saved phase and lets the player name the seed. This gives returning players a predictable path into the game. | Test a fresh install, an interrupted naming or watering lesson, and an existing garden. [Interface guide](interface-and-art.md) |
| Toy and room | The plant stays centered on the display. Four physical keys operate the LCD. A swipe connects the keychain to the garden, and the lower-right phone icon opens iSEED. The phone gives collection tools a home while the toy stays focused on plant care. | Review hardware buttons, keyboard input, room swipes and focus after closing a panel. [Interface guide](interface-and-art.md) |
| Growth and rewards | The active Monstera earns growth time under care. Graduating gives it a permanent place in the room. Daily coins, watering and games give earlier rewards, and purchased garden plants arrive grown. | Keep earned growth, elapsed age, scene visits and wallet entries distinct. [Gameplay guide](gameplay-and-saves.md) |
| Saves and reminders | The garden lives in device IndexedDB. A care change and its pending reminder schedule commit together. The hosted Worker handles scheduled Web Push so a closed game can receive reminders. | Check offline saves, old tabs, retry after closing and reminder consent. [Save guide](gameplay-and-saves.md) · [Notification guide](pwa-and-release.md) |
| Picture frames | The frame is pixel art. The player's photo uses its original file, with a small JPEG preview available in the save. | Keep original files in portable backups and preserve previews from earlier versions. [Save guide](gameplay-and-saves.md) |
| Garden art | The approved Golden pothos uses three large heart-shaped leaves, a smaller side leaf and a visible trailing vine. New items get their own silhouette, reviewed individually in the room and shop before integration. | Match approved native pixels at rest, then check motion, selection, lighting and different pots. [Sprite review skill](../../.agents/skills/plantigochi-sprite-review/SKILL.md) |

The unfurnished move-in room, gift cutting, furniture-store overhaul and separate installable variant remain deferred. Daily rewards and the iSEED shop already exist in the current game. [Historical roadmap](../plantigochi-roadmap.md)
