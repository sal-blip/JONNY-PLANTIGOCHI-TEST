# Interface and art

## Launch and first play

The browser link opens the four-card welcome tour and installation instructions. Gameplay starts when the player opens the installed app. `usePhoneApp` reads the display mode. Accepting a browser install prompt leaves the current tab on the tour. [App entry](../../src/App.jsx) · [Install prompt](../../src/installPrompt.js) · [Welcome tour](../../src/WelcomeTour.jsx)

In an installed session, the saved setup phase selects the screen. A new player can name a seed or restore a garden. Eligible players can opt into alerts. Confirming the name creates the plant and starts its clock. The watering lesson uses the real **Heart → Care → Water** controls. The shared LeafReveal animation plays on the welcome card and immediately after a successful naming, with a reduced-motion bypass. Welcome card three uses the live room renderer. After watering, the player enters the room by swipe or button. Placing the starter pot advances the saved lesson to the return gesture. The return button and swipe save the 200-coin gift before opening the toy. Until the pot is placed, the garden guides the player to iSEED. Once the pot is placed, it guides them back to the seed. The toy guides four purchases through its regular Growth Spurt menu. The fourth purchase starts normal play. The sprout greeting shows the live water timer and Dew Catch. The final gift saves the reminder invitation with the reward. Deferring it saves the follow-up check-in chat until the player acknowledges it. [Reminder walkthrough](../../tests/browser/tutorial_reminders.py) Each iSEED app hint is remembered when first shown. First Aid explains treatment on the first outbreak. Plants without the tutorial record finish the older phone guide by opening Shop. Existing completed saves keep their normal entry point. A completed installation opens on the toy. A full reset replays the tour. [Setup and naming](../../src/PlantSetup.jsx) · [Screen transitions](../../src/OnboardingTransition.jsx) · [Save hook](../../src/useGardenSave.js)

During the first pot purchase, the guide and Buy button share a panel over the ceiling. Keep the panel independent of the room viewport so choosing a destination, wrapping a message or saving the pot cannot resize the camera. Short landscape screens use a single row of controls to keep the upper shelf targets reachable. A slow starter-pot save checks the saved pot and retries once with the same item ID. If storage stays busy, the **Retry save** button keeps the selected spot. Once the pot is saved, the garden guide offers **Return to my seed** alongside the usual return gesture.

## Social link preview

Sharing the public game link uses the static metadata in `index.html`. Its 1200 × 630 PNG pairs the current jade device and grown Monstera from the toy screen with the living room rendered at noon. The small growth sprites come from the welcome tour. Use the game’s Bricolage Grotesque, DM Sans and Silkscreen faces for the title, caption and series label. For a future artwork change, use a fresh public image URL, update both platform tags and describe the new artwork in both alt fields. The iSEED Postcard app makes a separate picture of the player’s own room. [Current card](../../public/social/pocket-garden.png) · [Metadata check](../../tests/socialPreview.test.js)

## Surfaces and navigation

| Surface | How players use it | Code to change |
| --- | --- | --- |
| Toy | Swipe up on the wallpaper or activate the bottom chevrons to enter the garden. The device and chain each handle their own touches. | [Passage gestures and focus](../../src/useHandsetPassage.js) · [Chevron control](../../src/SwipeCue.jsx) |
| Garden | Swipe horizontally to pan between rooms. An upward or downward swipe on open room space returns to the toy. Activate the lower-right iSEED to open the handset. | [Garden interactions](../../src/Collector.jsx) · [Room targets](../../src/RoomView.jsx) |
| iSEED | Home opens the launcher. Back steps through the current app. Putting down the handset returns to the room. Shop, Inventory, Journal, Care library and Postcard live here. | [Handset and launcher](../../src/ISeedPhone.jsx) · [App routing](../../src/GardenPhoneApps.jsx) |
| Global menu | The three waves open backgrounds, Settings, alerts and saves. Close returns to the surface that opened it. The notification test is under Debug, reached by holding both lower corners of Settings for five seconds. | [Global pages](../../src/App.jsx) · [Glass dialog](../../src/GardenDialog.jsx) · [Debug gesture](../../src/SettingsDebugGesture.jsx) |

The toy and garden share one viewport overlay for Plant Garden, Share, the waves menu, the purse and the local clock. Its buttons stay outside the moving scene layers. Empty overlay space passes touches through to the toy and room, and scene-specific swipe handles stay attached to their gesture layers. During placement or required lessons, keep the purse available and leave the controls clear. The garden’s iSEED launcher stays in its lower-right corner. About and Report a bug live under App & data. Both use the version in `package.json` so the displayed version and email subject agree. [Screen controls](../../src/App.jsx) · [Viewport and menu regression](../../tests/browser/garden_hud.py)

The root exposes `data-surface` and `data-transitioning`. Inactive surfaces stay inert and hidden from assistive technology. Preserve control, scroll and placement exclusions when changing swipe handling. Keep the iSEED app mounted while the handset is lowered so a Journal draft, its subject and scroll position survive. [Surface styles](../../src/pocketGarden.css) · [Journal sessions](../../src/journalDrafts.js)

## Toy controls and feedback

The LCD is display-only. Arrows browse one item at a time beneath the centered plant. Heart selects. Back returns one level or opens the pause menu during a game. Holding Back exits to the plant. Keyboard input uses left/right arrows, Enter or Space for Heart, and Escape or Backspace for Back. Accepted presses immediately play their wooden click or care sound. Each fresh chat prompt has its own bell. Preserve normal activation when a real button has focus. [Toy input and navigation](../../src/PocketDevice.jsx)

For a care option, change the available cards in `GardenLife.jsx` and the rule in `game.js` that rechecks the action against the current plant. Readouts use `plantReadout.js`. Growth, mood and reactions are drawn by `PlantPixel.jsx`. Minigame rules and timers live in `pocketPlay.js`, with LCD graphics in `ActivityArt.jsx`. The game pauses when the toy loses focus to another surface or menu. [Menu cards](../../src/GardenLife.jsx) · [Readouts](../../src/plantReadout.js) · [Plant sprites](../../src/PlantPixel.jsx) · [Minigames](../../src/pocketPlay.js)

The Golden Pothos on the toy is drawn on the LCD’s 72 × 40 grid. Each stage defines a vine from the soil to a set of leaf attachment points. Idle movement flexes the blade below its attachment. During a wilt, the vine and its attachment points lower together. Check all five stages on the device, especially the mature runner beside the pot and the leaf lift after watering. [Pothos shapes and stage layouts](../../src/pothosArt.js) · [LCD renderer](../../src/PlantPixel.jsx)

The Snake Plant uses folded, gold-edged blade patterns on the same grid. Each growth stage has its own blade lengths and spacing. The two breathing seed frames and three foliage poses share a soil anchor with the wilt and recovery frames. [Blade patterns and growth stages](../../src/snakePlantArt.js)

Hoya Splash uses paired round leaves, silver markings and a fine trailing runner. The blade motion and wilt are shared with Pothos. Each species owns its leaf shapes and stem layout. [Hoya growth stages](../../src/hoyaArt.js) · [Vine animation poses](../../src/vineBlade.js)

The Monkey Tail Cactus grows from an upright shoot into rounded hanging stems. Its pale hairs follow the curve of each stem. The mature flower attaches to the same point in each sway pose. During a gnat outbreak, the silver spines keep their color. Swarming gnats, fungus on the soil and a progressively lower posture show the infestation. Drought draws in the stems and reduces their thickness while the pot stays fixed. [Cactus shapes and poses](../../src/monkeyTailArt.js)

Queen Anthurium grows longer pendant blades on separate petioles. Its light midrib and side veins follow the blade during sway, wilt and watering. During a gnat outbreak the velvet green and silver markings persist as the plant droops. [Queen Anthurium stages](../../src/queenAnthuriumArt.js)

Pink Micans has heart-shaped velvet leaves with blush sectors and copper-colored folds. Its long runner passes below the pot rim. The pink patches stay visible through gnat outbreaks and become muted through the two thirsty poses. [Pink Micans stages](../../src/pinkMicansArt.js)







`useGardenTilt` maps device orientation to screen-relative gravity. `chainMotion.js` handles the chain and ring, including drag and release. `GardenSound.js` owns the effects audio context, retries activation on user input, and observes sound settings and page visibility. Add synthesized effects in `gardenVoices.js`. The purchased record player has a separate media lifecycle. [Tilt](../../src/useGardenTilt.js) · [Chain physics](../../src/chainMotion.js) · [Sound](../../src/GardenSound.js) · [Record player](../../src/GardenRecord.jsx)

The two 128 kbps MP3s live in `public/music`. One player spans the public tour, installed setup and all three gameplay surfaces. Both tracks peak at 50% gain. Cotton Candy Skies loops through the optional practice round. Start its five-second fade from the farewell chat’s actual reveal, so claiming the gift immediately lets the fade finish. A first visit waits for the settled garden transition before fading Mystic Oasis up to that level in 750 ms. A later visit with completed onboarding starts Mystic on entry. The three Settings sliders mix the score and record player (Music), triggered voices (Sound effects), and the garden breeze and sleeping seed (Garden ambience). The percentage multiplies each channel’s established mix. Moving a slider previews its level immediately while edits settle into a save transaction. Preserve other channels when windows edit concurrently. A legacy master mute starts all three at zero. A legacy ambience mute starts Music and Garden ambience at zero. Selecting a garden record temporarily gives that record the music channel. Browsers that require user activation start the selected track on the first tap or keypress. [Scene selection](../../src/GameMusic.jsx) · [Playback and fades](../../src/scorePlayback.js) · [Browser walkthrough](../../tests/browser/scene_music.py) · [Mixer and migration checks](../../tests/browser/audio_mixer.py)

## Garden placement and rendering

The garden rests 8% closer than the original wide view. A stationary press on open scenery uses the same temporary 1.32× focus as a scene tap. Swiping still changes surfaces or pans across rooms. Keep a visible room’s backing canvas at the same resolution throughout a gesture. Resizing it clears its pixels, including while input belongs to the handset or the toy. Animation can pause behind iSEED while the painted room stays in place. [Touch transition regression](../../tests/browser/garden_passage.py)

The room uses Canvas 2D in a 400 × 320 logical space. Portrait extends the ceiling and floor. `RoomView` uses the same vertical offset for pixels, framed photos and DOM hit targets. `roomArt.js` draws plants at their pot baselines in the order supplied by the scenery. Floor plants can overlap a framed photo through a separate foreground canvas. Keep those layers inside the same camera transform so pan and zoom agree. [Room layout](../../src/gardenLayout.js) · [Paint order](../../src/roomArt.js) · [Scenery](../../src/roomScenery.js) · [Photo layers](../../src/FramePhoto.jsx) · [Garden sprite resolution and verification](research/garden-item-resolution.md)

Slot addresses are saved data. Each room retains its six numbered plant spots. Later surfaces have named addresses and decorations have their own slots. For a new spot, update its visual anchor, legal destinations and hit target together. For a shop item, follow `catalog`, `canSetItem` and `placeItem`. Selecting a circle previews a destination. Confirmation rechecks its occupant and commits the placement and any purchase charge together. Test canceling before confirmation and moving into an occupied spot. [Economy and placements](../../src/gardenEconomy.js) · [Shop](../../src/GardenShop.jsx) · [Garden controller](../../src/Collector.jsx)

Garden plants and shop tiles share `drawPottedPlant` through `roomShopArt.js`. Check the actual shelf and shop tile at native scale, along with night lighting, selection and reduced motion. Personal framed photos use an original-resolution image inside the pixel-art aperture. Use the existing review workflow when changing a sprite. [Plant renderer](../../src/roomPlant.js) · [Shop renderer](../../src/roomShopArt.js) · [Sprite review workflow](../../.agents/skills/plantigochi-sprite-review/SKILL.md)

When adding a shop plant, give it a stable SKU in the catalog and a tile baseline in `shopPreviewLayout.js`. Route the SKU through `drawShopPreview` and `drawPottedPlant`, then check any allowed-species and display-name lists used for residents and saved gardens. Buy it, put it on a shelf, move it, and reload a backup. A redesign of an existing plant can keep its SKU and use the same placement and save paths. [Shop preview layout](../../src/shopPreviewLayout.js) · [Shop painter](../../src/roomShopArt.js) · [Plant painter](../../src/roomPlant.js)

Bird of Paradise opens its orange-and-blue flower above a fan of paddle leaves. Moth Orchid opens pink flowers along an arch above its basal leaves. Both use hand-authored keychain growth and wilt frames. Their mature room foliage uses SpriteCook masters anchored at the crown so pottery can change. [Keychain stages](../../src/floweringPlantArt.js) · [Garden masters and rebuild script](../../.agents/skills/plantigochi-sprite-review/references/launch-flowering-plants)

Launch shop plants include Monstera Albo, Pink Micans, Hoya serpens “Splash”, Queen Anthurium, Monkey Tail Cactus, Bird of Paradise (600 coins) and Moth Orchid (700 coins). The two wild pots are Bog Frog Pot and Lava Pop Pot. The SpriteCook refresh also replaces the artwork for the eight earlier products using their existing save IDs. The plant painter composites indexed sprites with the shared pottery, light, selection and idle poses. For trailing plants the painted foliage can extend below a shelf or table's pot line. The two frames share the same new image openings across room, shop and postcard views. [First launch masters](../../.agents/skills/plantigochi-sprite-review/references/phase-1-shop-pass-01/README.md) · [Approved shop refresh and encoder](../../.agents/skills/plantigochi-sprite-review/references/phase-1-shop-pass-02/README.md)

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

The sofa calico's rounded tail tip, continuous curl and connected front legs were approved on November 22, 2026. The approved poses are awake, shoulders raised and resting. The v53 pose on the board is the live comparison. [Figma approval](https://www.figma.com/design/JnUvdBVJl2ymB7sCpibZQ0/?node-id=9-2)

The toy and garden share one passive purse display backed by the saved Garden Coin balance. The iSEED wallet uses that same balance. Sprouting sets a reveal marker on the plant. The first visible toy view consumes it and briefly lights the case with feathered rays and stars. Reduced motion shows a still glow. Reloading an already viewed sprout does not restart the burst.

Keep the first visit on one round trip from toy to garden and back. The chat changes in place after watering so the first visible tap on **Visit my garden** goes to the button. Restrict full-page setup transitions to changes of screen. During a slow save, the garden button shows progress and offers a retry if the write times out. The player chooses a pot location before paying and can drag the room to reveal other spots. Hide the global menu and share controls during the required lessons. On the first visit to Dew Catch, explain the arrow controls and the three-miss rule before play starts. The tutorial invitation starts a single practice round. Finishing it or choosing **Maybe later** opens a short farewell on the toy. It pairs a thank-you with one line for the outcome and keeps **Claim 20 coins** inside the bubble, below the text. After collecting the gift the player can launch normal Dew Catch from the Play menu. Every visible tutorial popup uses the same cached bell sample at the same gain across the toy, garden and iSEED. Let the button play its own sound at activation. GuideChat reserves space for 250 ms after its cue becomes active, then shows the message, plays its bell and focuses any requested action. Changing cues or leaving the scene cancels the pending reveal. Give each new instruction a stable cue so background renders, balance updates and the repeating visual bounce stay quiet. The first-visit browser test compares the audio waveform across guided presses.

To replay the first visit on a local dev server, run `python tests/browser/first_visit.py http://localhost:5173` with Playwright for Python and Chromium installed. It uses a fresh mobile browser profile and holds a real database transaction open while returning from the pot purchase. The test checks that the garden stays visible until the gift saves, then spends the gift and returns to free play.

Run `python tests/browser/dew_lesson.py http://localhost:5173` to play the optional practice round through a win and a three-miss finish. It checks reopening a round, collecting the farewell gift once and returning to the normal game from the Play menu.

Run `python tests/browser/pot_purchase.py http://localhost:5173` to test buying the center windowsill pot while storage is busy or the purchase confirmation is delayed. The same test accepts a downloaded playtest HTML file and checks the saved placement and wallet independently of the on-screen receipt.
