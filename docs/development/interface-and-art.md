# Interface and art

## Launch and first play

The browser link opens the four-card welcome tour and installation instructions. Gameplay starts when the player opens the installed app. `usePhoneApp` reads the display mode. Accepting a browser install prompt leaves the current tab on the tour. [App entry](../../src/App.jsx) · [Install prompt](../../src/installPrompt.js) · [Welcome tour](../../src/WelcomeTour.jsx)

In an installed session, the saved setup phase selects the screen. A new player can name a seed or restore a garden. Eligible players can opt into alerts. Confirming the name creates the plant and starts its clock. The watering lesson uses the real **Heart → Care → Water** controls. **Meet my plant** completes setup. Closing and reopening during naming or watering resumes the saved step. A completed installation opens on the toy. A full reset replays the tour. [Setup and naming](../../src/PlantSetup.jsx) · [Screen transitions](../../src/OnboardingTransition.jsx) · [Save hook](../../src/useGardenSave.js)

## Surfaces and navigation

| Surface | How players use it | Code to change |
| --- | --- | --- |
| Toy | Swipe up on the wallpaper or activate the bottom chevrons to enter the garden. The device and chain each handle their own touches. | [Passage gestures and focus](../../src/useHandsetPassage.js) · [Chevron control](../../src/SwipeCue.jsx) |
| Garden | Swipe horizontally to pan between rooms. An upward or downward swipe on open room space returns to the toy. Activate the lower-right iSEED to open the handset. | [Garden interactions](../../src/Collector.jsx) · [Room targets](../../src/RoomView.jsx) |
| iSEED | Home opens the launcher. Back steps through the current app. Putting down the handset returns to the room. Shop, Inventory, Journal, Care library and Postcard live here. | [Handset and launcher](../../src/ISeedPhone.jsx) · [App routing](../../src/GardenPhoneApps.jsx) |
| Global menu | The three waves open backgrounds, Settings, alerts and saves. Close returns to the surface that opened it. The notification test is under Debug, reached by holding both lower corners of Settings for five seconds. | [Global pages](../../src/App.jsx) · [Glass dialog](../../src/GardenDialog.jsx) · [Debug gesture](../../src/SettingsDebugGesture.jsx) |

The root exposes `data-surface` and `data-transitioning`. Inactive surfaces stay inert and hidden from assistive technology. Preserve control, scroll and placement exclusions when changing swipe handling. Keep the iSEED app mounted while the handset is lowered so a Journal draft, its subject and scroll position survive. [Surface styles](../../src/pocketGarden.css) · [Journal sessions](../../src/journalDrafts.js)

## Toy controls and feedback

The LCD is display-only. Arrows browse one item at a time beneath the centered plant. Heart selects. Back returns one level or opens the pause menu during a game. Holding Back exits to the plant. Keyboard input uses left/right arrows, Enter or Space for Heart, and Escape or Backspace for Back. Preserve normal activation when a real button has focus. [Toy input and navigation](../../src/PocketDevice.jsx)

For a care option, change the available cards in `GardenLife.jsx` and the rule in `game.js` that rechecks the action against the current plant. Readouts use `plantReadout.js`. Growth, mood and reactions are drawn by `PlantPixel.jsx`. Minigame rules and timers live in `pocketPlay.js`, with LCD graphics in `ActivityArt.jsx`. The game pauses when the toy loses focus to another surface or menu. [Menu cards](../../src/GardenLife.jsx) · [Readouts](../../src/plantReadout.js) · [Plant sprites](../../src/PlantPixel.jsx) · [Minigames](../../src/pocketPlay.js)

`useGardenTilt` maps device orientation to screen-relative gravity. `chainMotion.js` handles the chain and ring, including drag and release. `GardenSound.js` owns the audio context, retries activation on user input, and observes sound settings and page visibility. Add synthesized effects in `gardenVoices.js`. The purchased record player has a separate media lifecycle. [Tilt](../../src/useGardenTilt.js) · [Chain physics](../../src/chainMotion.js) · [Sound](../../src/GardenSound.js) · [Record player](../../src/GardenRecord.jsx)

## Garden placement and rendering

The room uses Canvas 2D in a 400 × 320 logical space. Portrait extends the ceiling and floor. `RoomView` uses the same vertical offset for pixels, framed photos and DOM hit targets. `roomArt.js` draws plants at their pot baselines in the order supplied by the scenery. Floor plants can overlap a framed photo through a separate foreground canvas. Keep those layers inside the same camera transform so pan and zoom agree. [Room layout](../../src/gardenLayout.js) · [Paint order](../../src/roomArt.js) · [Scenery](../../src/roomScenery.js) · [Photo layers](../../src/FramePhoto.jsx)

Slot addresses are saved data. Each room retains its six numbered plant spots. Later surfaces have named addresses and decorations have their own slots. For a new spot, update its visual anchor, legal destinations and hit target together. For a shop item, follow `catalog`, `canSetItem` and `placeItem`. Selecting a circle previews a destination. Confirmation rechecks its occupant and commits the placement and any purchase charge together. Test canceling before confirmation and moving into an occupied spot. [Economy and placements](../../src/gardenEconomy.js) · [Shop](../../src/GardenShop.jsx) · [Garden controller](../../src/Collector.jsx)

Garden plants and shop tiles share `drawPottedPlant` through `roomShopArt.js`. Check the actual shelf and shop tile at native scale, along with night lighting, selection and reduced motion. Personal framed photos use an original-resolution image inside the pixel-art aperture. Use the existing review workflow when changing a sprite. [Plant renderer](../../src/roomPlant.js) · [Shop renderer](../../src/roomShopArt.js) · [Sprite review workflow](../../.agents/skills/plantigochi-sprite-review/SKILL.md)

When adding a shop plant, give it a stable SKU in the catalog and a tile baseline in `shopPreviewLayout.js`. Route the SKU through `drawShopPreview` and `drawPottedPlant`, then check any allowed-species and display-name lists used for residents and saved gardens. Buy it, put it on a shelf, move it, and reload a backup. A redesign of an existing plant can keep its SKU and use the same placement and save paths. [Shop preview layout](../../src/shopPreviewLayout.js) · [Shop painter](../../src/roomShopArt.js) · [Plant painter](../../src/roomPlant.js)

## Verification

From the repository root, run the group that covers the change.

```sh
node --test tests/installPrompt.test.js tests/alertInvitation.test.js tests/journalDrafts.test.js
node --test tests/chainMotion.test.js tests/screenGravity.test.js
node --test tests/collector.test.js tests/gardenEconomy.test.js tests/roomFrameArt.test.js
```

For an input change, play through first watering, start a minigame and hold Back, then open iSEED, type a Journal draft, put down the handset and resume it. Try touch and keyboard with reduced motion enabled. For a placement change, preview and cancel a purchase, buy it, move it directly from the room, and reopen the garden to verify its saved location.

### Garden furnishings review after v52

Storage furniture, the cutting jar, the Leaf Book, and the garden details apart from the cup and saucer have art approval. The update includes a front-facing calico kitten, a centered cup and saucer, a mirrored Garden Coin and exterior camera movement. The kitten has separate awake, resting and blink expressions. The lacquer photo frame remains deferred.

The coin generator mirrors each eight-pixel half-row across the center. The cup rim, foot and saucer share a horizontal center, with the open handle attached on the right. The living room owns the mountain silhouette. The studio window faces the village pagoda. During horizontal garden scrolling, the exterior terrain shifts by up to eight native pixels within each clipped window. Furnishings, hit targets, and indoor floor lines stay attached to the room. Reduced motion fixes the outdoor offset at zero.
