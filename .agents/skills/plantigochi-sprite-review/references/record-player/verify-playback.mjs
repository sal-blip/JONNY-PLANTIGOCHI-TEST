import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {drawRoom, roomLight} from '../../../../../src/roomArt.js';
import {decorPlaces, drawRoomDecor} from '../../../../../src/roomShopArt.js';

const require = createRequire(new URL('../../scripts/package.json', import.meta.url));
const {createCanvas, loadImage} = require('@napi-rs/canvas');
globalThis.OffscreenCanvas = class {
  constructor(width, height) { return createCanvas(width, height); }
};
const id = 'shop-record';
const span = 255;
const ticks = 7;
const fixture = await loadImage(fileURLToPath(new URL('approved/playback.png', import.meta.url)));
const proof = createCanvas(fixture.width, fixture.height);
const proofContext = proof.getContext('2d');
proofContext.drawImage(fixture, 0, 0);

function pixels(canvas) {
  return Buffer.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data);
}

// On the approved bookcase capture the sofa-side stand is empty. Its scenery
// under the playback strip is the exact background used for the seven frames.
const originalRoom = await loadImage(fileURLToPath(new URL('approved/bookcase.png', import.meta.url)));
const tableItem = {id, sku: 'record', slot: decorPlaces(0)[2].slot};
for (let phase = 0; phase < ticks; phase++) {
  const frame = createCanvas(originalRoom.width, originalRoom.height);
  const context = frame.getContext('2d');
  context.drawImage(originalRoom, 0, 0);
  drawRoomDecor(context, 0, [tableItem], {time: phase*span, playingItemId: id});
  const actual = context.getImageData(267, 176, 101, 82).data;
  const expected = proofContext.getImageData(phase*101, 0, 101, 82).data;
  assert.deepEqual(Buffer.from(actual), Buffer.from(expected), 'approved playback phase '+phase);
}

for (let view = 0; view < 2; view++) {
  for (const spot of decorPlaces(view)) {
    const item = {id, sku: 'record', slot: spot.slot};
    function frame(time, options = {}) {
      const canvas = createCanvas(400, 320);
      drawRoomDecor(canvas.getContext('2d'), view, [item], {playingItemId: id, time, ...options});
      return pixels(canvas);
    }
    // In the current rooms the same player should cover the new backdrop at
    // the mount, with the active room's tint and paint order.
    for (const hour of [12, 2]) {
      for (let phase = 0; phase < ticks; phase++) {
        const state = {roomIndex: view, hour, time: phase*span, playingItemId: id};
        const actual = createCanvas(400, 320);
        drawRoom(actual, {...state, shopItems: [item]});
        const expected = createCanvas(400, 320);
        drawRoom(expected, state);
        drawRoomDecor(expected.getContext('2d'), view, [item], {
          ...state, night: 1-roomLight(hour).day,
        });
        assert.deepEqual(pixels(actual), pixels(expected), spot.name+' at '+hour+'h, phase '+phase);
      }
    }
    const phases = Array.from({length: ticks}, (_, i) => frame(i*span));
    assert.equal(new Set(phases.map(p => p.toString('base64'))).size, ticks, spot.name);
    assert.deepEqual(frame(ticks*span), phases[0]);
    assert.deepEqual(frame(span, {reducedMotion: true}), phases[0]);
    assert.deepEqual(frame(span, {playingItemId: null}), phases[0]);
    assert.deepEqual(frame(span, {playingItemId: 'another-record'}), phases[0]);
  }
}
console.log('Seven approved playback frames match. All six mounts match their day and night room composite, loop, and honor reduced motion and playback selection.');
