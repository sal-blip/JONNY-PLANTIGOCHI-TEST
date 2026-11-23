# PWA, notifications and releases

The **browser service worker** caches the installed game and displays notifications. The **hosted Site Worker** serves the client and runs the reminder API against D1. A static preview exercises the browser worker. Local server tests supply their own bindings.

## Build and test a clean checkout

Use Node 24 and npm. The server tests use the built-in `node:sqlite` module. From the repository root run

```sh
npm ci
npm test
npm run build
```

Vite and Workbox produce `dist/index.html`, the hashed assets, `dist/manifest.webmanifest` and `dist/sw.js`. The packaging script embeds the client files in `dist/server/index.js` and copies the hosting manifest and Drizzle migrations into `dist/.openai/`. For schema changes, edit `server/schema.js`, run `npx drizzle-kit generate` and review the SQL, snapshot and journal together. [Build script](../../scripts/build-worker.mjs) · [Hosting manifest](../../.openai/hosting.json)

The Workbox manifest includes both MP3s in `public/music/` and the turntable recording in `public/records/`. Keep each file under the 3 MiB precache limit. The installed app and the Site Worker both return byte ranges for media playback and seeking. To check a release, let the service worker take control, switch the browser offline and reload. A request with `Range: bytes=0-1` to either MP3 should return HTTP 206, two bytes and an `audio/mpeg` content type. [Service worker](../../src/sw.js) · [Range tests](../../tests/mediaRange.test.js)

Settings → How to uninstall shows device-specific removal instructions and uses the same garden export as Saved plant. The player confirms removal in the operating system. The walkthrough downloads a backup and restores it into a fresh installation. [Removal and backup walkthrough](../../tests/browser/uninstall_help.py)

Run these suites while changing install, update or reminder behavior.

```sh
node --test tests/installPrompt.test.js tests/appUpdates.test.js tests/alertInvitation.test.js
node --test tests/mobile.test.js tests/reminderDelivery.test.js tests/reminderOutbox.test.js tests/gardenStore.test.js
```

Delivery tests exercise failed sync, expiration, reset and device ownership using temporary databases and simulated push services. For local PWA testing, serve the production build on localhost with `npx vite preview --host 127.0.0.1`. The normal `npm run dev` session skips production service-worker registration.

## Install, offline and update behavior

The manifest uses root scope, a root start URL and standalone display. First-time browser visits open the welcome tour. Start playing enters setup and remembers browser play for future visits. The install link with `#install` always opens installation help in a browser. Standalone launches open setup or resume the garden in their storage container. A portable backup can carry the completed tutorial into a separate container. [Browser tutorial and restore walkthrough](../../tests/browser/browser_tutorial.py) On HTTPS or localhost the production client registers `/sw.js` with `updateViaCache: 'none'`. Workbox imports `/plant-alerts.js`, precaches matching game assets up to 3 MiB each and serves the app shell for root navigations such as `/?care=water`. When adding an asset, check its extension, size and the build's precache report. [PWA configuration](../../vite.config.js) · [Registration and update checks](../../src/usePhoneApp.js)

Test an online first launch until offline play reports ready. Close it, disconnect and reopen from the icon. For update QA, install the earlier release on a test origin, leave a window open, and serve the new build on that same origin. A replacement worker can take control while play continues. **Restart to update** or the next navigation loads the new UI. Confirm that the plant ID and last watering survive, including a second window still running the earlier bundle. **Check for updates** retries a failed download. [Update state transitions](../../src/appUpdates.js)

## Reminder delivery

1. **Consent.** The first installed welcome can offer alerts before naming. Deferring allows one later installed launch to offer again. A user gesture starts the native permission or subscription request. iOS and iPadOS require 16.4 or later and a Home Screen launch. Permission, a push subscription and a server-confirmed schedule are separate states. An enrolled, unwatered seed has no due reminder. [Invitation](../../src/alertInvitation.js) · [Enrollment](../../src/usePlantAlerts.js)
2. **Scheduling.** The active plant projects the next reachable growth milestone, water at four and twelve hours after a drink, fungus six hours after onset, and optional company after ten hours. Root rot changes the critical slot to a six-hour drainage reminder. The garden transaction saves reminder work alongside the plant. The service worker submits the current schedule with stable event identities using `PUT /api/alerts/reminder`. A failed request stays pending. Background Sync retries on supported browsers, with worker wakes and online app visits providing further opportunities. **Confirmed** means the server acknowledged that schedule. [Projection](../../src/reminderSchedule.js) · [Durable work](../../src/gardenReminder.js)
3. **Dispatch.** The hosted Worker needs the `DB` binding and a stable P-256 VAPID pair supplied as runtime variables `PUSH_PUBLIC_KEY` and `PUSH_PRIVATE_JWK`. Keep private keys, device tokens and subscription endpoints out of source, logs and release notes. The documented hourly scheduler calls `POST /api/alerts/dispatch` with an empty request. Each call claims up to 25 due rows and returns aggregate counts. An active rescue supersedes the earlier dry reminder. Expired rows are discarded. Confirm the linked schedule and its last run in Sites when investigating delays. The Worker exports a fetch handler. Scheduling lives outside this repository. [API and queue](../../server/reminders.js) · [Worker entry point](../../server/index.js)
4. **Receipt and recovery.** The device worker checks current consent, plant identity and the watering or illness episode before showing actionable care. Tapping a stale watering alert returns to the plant. Turning alerts off or resetting suppresses old work locally and queues cancellation when offline. A provider 404 or 410 retires the endpoint. The device attempts renewal or asks the player to enable alerts again. [Device delivery](../../public/plant-alerts.js) · [Offline cleanup](../../src/alertCleanup.js)

For device QA use an enrolled test installation and **Debug menu → Test notifications**. One request sends two separately labeled test pushes at five and fifteen seconds, independent of the hourly queue, with a one-minute cooldown. **Sent to push service** confirms provider acceptance. **Received on this device** records display by the service worker. Check the second step with the app closed and the phone locked. Use the local queue tests for routine dispatch verification. [Test sender](../../server/testPush.js) · [Device receipts](../../src/NotificationTest.jsx)

## Release and verify

1. Identify the intended GitHub commit and the existing Site project in `.openai/hosting.json`. Compare changed source, assets, lockfile, Worker and migrations across the GitHub and Sites-native checkouts before packaging. This GitHub repository ignores `dist/`. The Sites release checkout can include generated output, and the two repositories have independent commit IDs. Inspect any configured CI or hosting integration before relying on a Git push to publish. [GitHub source](https://github.com/sal-blip/JONNY-PLANTIGOCHI-TEST)
2. Run the tests and full build on the intended release source. In the Sites release workflow, retain the verified native commit and its corresponding archive, save a Site version from that archive and deploy the saved version to the existing project with its current audience. Record the GitHub SHA, Sites SHA, saved version, deployment result and returned URL together. [Release record](releases.md)
3. For a public release, open the returned URL in a signed-out browser and confirm the install page is accessible. Compare the module entry in the live HTML with the built `dist/index.html`. Check `/manifest.webmanifest` for root scope and standalone display, and compare the live `/sw.js` with the shipped file. The canonical URL in `index.html` identifies the expected production origin. [Public game](https://plantigochi-pocket-garden-mobile.salbasilone.chatgpt.site/)

If a release fails, inspect the native deployment result, confirm the archive contains the Worker plus `dist/.openai/drizzle/`, and check the D1 binding and runtime configuration. If a regression reaches production, identify the last verified saved Site version and check its compatibility with the current D1 schema and existing local saves before redeploying it. Recheck the public build and installed-app update flow. Keep the same origin to preserve access to device gardens. A move to another origin needs a portable backup and fresh notification enrollment.
