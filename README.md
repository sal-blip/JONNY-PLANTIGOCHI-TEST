# JONNY-PLANTIGOCHI-TEST

Plantigochi is a small React game about raising a cheeky Monstera in a leaf-shaped pocket keychain. The first seed starts sleeping. It sprouts when an hour has elapsed since planting and it has received water. The timer includes time spent with the browser closed.

Under steady care the Monstera grows from seed through Sprout, Young (day 3), First Split (day 5) and Grown (day 7). Critical thirst, rot, overdue food or overdue light pause earned growing time. Feeding recurs every 48 hours and sunlight every 24 hours. Each becomes available eight hours early. Kind words or completing a game give 30 minutes of happiness. Content plants become quiet after 12 hours without company and lonely after 24 hours. Press the heart to open the plant menu. Your Monstera stays centered while one item and its short description appear underneath. The arrows move the highlight, the heart selects, and the hooked-arrow Back key returns to the previous selection. The LCD is display-only. The browser saves progress and sound preferences.

Tap the three waves at the top right to open the glass pocket menu. The glass menu contains backgrounds, settings, and app installation, alerts and saves. Care, Play, Growth, the Cutting jar, the Leaf Book, and the Field guide are on the toy LCD. Choose a scene under **Backgrounds**. Use **Use My Photo** to select a local image and drag it into place. A backup includes the resized photo and its framing as well as your plant. The launch animation parts Monstera leaves with a slow zoom and a soft passing rustle. Fresh gardens start with sound enabled. The game plays at launch when the browser permits it, or on the first tap or keypress. Existing mute preferences are respected. **Settings** controls sound, the continuous synth and sleeping-seed ambience, and intro replay. Reduced-motion preferences skip the automatic reveal.

Press a toy key to ease closer to the dot-matrix screen. Menus and games hold the close-up. After returning to the idle screen, the camera eases back. The LCD uses the bundled Silkscreen font under the SIL Open Font License.

A sprouted Monstera dries out after 4 hours, becomes critical at 12, and dies after 24 without a drink. Two confirmed extra pours at least an hour apart in the same wet period cause root rot. Drain the pot within 12 hours. Care shows each need in place. Sleeping seeds are safe. A death adds a pressed leaf with its age, generation, and cause to the Leaf Book.

Open **Play** on the LCD for Dew Catch as a sprout and Leaf Echo as a young plant. Dew Catch has 20 levels. The target rises from three to 22 catches, the drops speed up and later levels have several in flight. Your current checkpoint and personal best carry over in backups and across generations. Each Dew Catch run starts with three droplet lives shared across levels. On the third miss, the game briefly shows the result and automatically restarts at level 1 with three fresh lives. Tap Back to pause either game. Hold Back for 0.7 seconds to return directly to your Monstera. Holding Escape works the same way on a keyboard. Keyboard controls include the arrow keys, Enter and Escape. A grown Monstera can root one cutting in a jar over 12 real hours. The jar survives the parent and a rooted cutting can start the next generation. The local save and exported backup include the jar and keepsakes.

The chain hangs from a single eyelet. Grab inside the ring or along an exposed link. Flick outward past the leaf edge to swing the ring behind it, or hold it still before lifting to let it go gently. Tap the eyelet to bring it back. On supported phones, the links follow gravity as you turn the device. A moving highlight and soft shadow follow the leaf surface. The background has a light blur. On supported phones, tilting moves the scenery up to 17 pixels and the keychain up to 5 pixels in the opposite direction, with a one-degree swing. **Settings → Tilt motion** controls the effect and requests sensor access on phones that require it. Holding the phone naturally when returning to the garden sets the center. Tilt respects the device’s reduced-motion preference.

Stonewashed Pocket uses a [denim photograph](https://www.pexels.com/photo/photo-of-denim-pants-6843233/) under the [Pexels license](https://www.pexels.com/license/). Raked Sand, Still Water, Cotton Clouds, Shoji Morning and Pebble Garden use original artwork.

## Living-room garden

Swipe up on the Garden tab or tap it. At full growth choose **Growth → Move to garden**, select one of six pots, and confirm. The graduate settles permanently. The keychain receives a new seed in the same save. More rooms open as pots fill. Graduates require no care. Lighting follows the phone's local time. **Postcard** previews the current room as a PNG for native sharing or download. **Game link** shares the public game.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Run `npm test` to verify watering, elapsed time, saved progress, and all five growth stages. Use `npm run build` for a static production build in `dist/`.

## Project layout

`src/game.js` contains the growth rules and save format. `src/App.jsx` handles the interactive keychain and care panel. The original plant sprites and leaf shell live in `src/PlantPixel.jsx` and `public/art/device.svg`.

## Install on a phone

Open the published Site online, tap the three waves, and choose **Install app**. Confirm the browser’s install prompt when offered. On iPhone, open the game in Safari and choose **Share → Add to Home Screen → Add**. On Android, Chrome also offers installation from its ⋮ menu. The install screen shows **Ready for offline play** once the game is cached.

Progress is stored in IndexedDB after each care action. Valid older saves migrate on first open. An unreadable or newer-format save opens recovery with an option to export the original. **App & saves → Saved plant → Back up** exports a save that can be restored on a different device or in a newly installed copy. Moving to a different Site origin creates separate browser storage. For a hosting move also set the canonical URL and Open Graph URLs in index.html to the new public origin.

The production build uses vite-plugin-pwa and Workbox to generate a manifest and a versioned service worker that caches the game, artwork, icons and fonts. Service workers require HTTPS (or localhost for development). The normal Vite dev server does not register the production worker.

## Plant alerts

Players opt in on their device from **App & saves → Plant alerts**. On iOS, use the installed Home Screen app. The game schedules reachable growth milestones, critical rescue reminders, and optional company nudges after ten hours. Rescue takes priority. Only the active plant can create reminders. Thirst alerts are due after 12 hours without water. Root-rot reminders are due six hours into the rescue window. The hosted scheduler checks the queue hourly, so delivery can be up to one additional hour later. Growth transitions also notify an opted-in player. Phones control delivery timing, permissions, and quiet modes.

The Site Worker stores only outstanding reminder delivery data in D1. Game progress stays on the player's device. Provide a stable P-256 VAPID key pair through runtime variables `PUSH_PUBLIC_KEY` (raw base64url) and `PUSH_PRIVATE_JWK` (secret). The build packages the Worker and the generated Drizzle migrations. The first migration creates the reminder queue. To generate future migrations after schema changes, run `npx drizzle-kit generate`.

### Scheduled delivery

The production scheduler posts an empty request to `/api/alerts/dispatch`. It is safe to repeat. Only existing, player-authorized reminders whose delivery time has passed can be claimed, and the caller cannot select a recipient, message, or delivery time. The result contains aggregate counts. A batch handles up to 25 reminders; a scheduler can repeat if a full batch was returned. No subscription endpoints or keys belong in logs or task instructions.
