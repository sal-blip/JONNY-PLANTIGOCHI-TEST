# JONNY-PLANTIGOCHI-TEST

Plantigochi is a small React game about raising a cheeky Monstera in a leaf-shaped pocket keychain. The first seed starts sleeping. It sprouts when an hour has elapsed since planting and it has received water. The timer includes time spent with the browser closed.

After sprouting, try water, sunlight, kind words, and plant food once each to grow a young plant. Two more complete care sets grow a mature Monstera. The outer keychain buttons choose an action, and the heart gives it. Progress and the sound preference are stored in the current browser.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Run `npm test` to verify watering, elapsed time, saved progress, and all four growth stages. Use `npm run build` for a static production build in `dist/`.

## Project layout

`src/game.js` contains the growth rules and save format. `src/App.jsx` handles the interactive keychain and care panel. The original plant sprites and leaf shell live in `src/PlantPixel.jsx` and `public/art/device.svg`.
