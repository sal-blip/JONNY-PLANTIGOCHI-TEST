# JONNY-PLANTIGOCHI-TEST

Plantigochi is a small React game about raising a cheeky Monstera in a leaf-shaped pocket keychain. The first seed starts sleeping. It sprouts when an hour has elapsed since planting and it has received water. The timer includes time spent with the browser closed.

Full growth takes seven real days (168 hours) from planting. A care set includes water, sunlight, kind words, and plant food once each, in any order. One set as a sprout unlocks the young plant after 72 hours. A second set unlocks the final set after 120 hours. The Monstera grows its split leaves when the final set is complete and 168 hours have elapsed. Early care counts, late visits can catch up, and existing plants keep their stage and care history. The outer keychain buttons choose an action, and the heart gives it. The browser saves progress and sound preferences.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Run `npm test` to verify watering, elapsed time, saved progress, and all four growth stages. Use `npm run build` for a static production build in `dist/`.

## Project layout

`src/game.js` contains the growth rules and save format. `src/App.jsx` handles the interactive keychain and care panel. The original plant sprites and leaf shell live in `src/PlantPixel.jsx` and `public/art/device.svg`.

## Install on a phone

Open the published Site online first. In **Install app**, wait for **Ready for offline play**. On iPhone, choose Safari → Share → Add to Home Screen. On Android, use the install prompt or Chrome → Add to home screen.

Progress is stored locally after each care action. **Install app → Back up** exports a save that can be restored on a different device or in a newly installed copy. In standalone mode the same menu is named **App & saves**. Moving to a different Site origin creates separate browser storage.

The production build uses vite-plugin-pwa and Workbox to generate a manifest and a versioned service worker that caches the game, artwork, icons and fonts. Service workers require HTTPS (or localhost for development). The normal Vite dev server does not register the production worker.

## Plant alerts

Players opt in on their device from **Plant alerts**. On iOS, use the installed Home Screen app. The game queues one Web Push reminder for its next growth timer and updates it as the plant progresses. The hosted scheduler checks the queue hourly, so delivery can be up to one additional hour later. Growth transitions also notify an opted-in player. Phones control delivery timing, permissions, and quiet modes.

The Site Worker stores only outstanding reminder delivery data in D1. Game progress stays on the player's device. Provide a stable P-256 VAPID key pair through runtime variables `PUSH_PUBLIC_KEY` (raw base64url) and `PUSH_PRIVATE_JWK` (secret). The build packages the Worker and the generated Drizzle migrations. The first migration creates the reminder queue. To generate future migrations after schema changes, run `npx drizzle-kit generate`.

### Scheduled delivery

The production scheduler posts an empty request to `/api/alerts/dispatch`. It is safe to repeat. Only existing, player-authorized reminders whose delivery time has passed can be claimed, and the caller cannot select a recipient, message, or delivery time. The result contains aggregate counts. A batch handles up to 25 reminders; a scheduler can repeat if a full batch was returned. No subscription endpoints or keys belong in logs or task instructions.
