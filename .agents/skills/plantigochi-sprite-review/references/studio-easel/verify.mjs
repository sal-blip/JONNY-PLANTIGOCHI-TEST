import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {drawRoom} from '../../../../../src/roomArt.js';

const require = createRequire(new URL('../../scripts/package.json', import.meta.url));
const {createCanvas, loadImage} = require('@napi-rs/canvas');
globalThis.OffscreenCanvas = class {
  constructor(width, height) { return createCanvas(width, height); }
};

for (const [hour, prefix] of [[12, ''], [2, 'night-']]) {
  const room = createCanvas(400, 320);
  drawRoom(room, {roomIndex: 1, hour, time: 0, reducedMotion: true, plants: [], shopItems: [], highlighted: -1});
  for (const [name, x, y, width, height] of [
    ['room', 0, 0, 400, 320], ['easel', 299, 78, 85, 161], ['art', 310, 110, 61, 63],
  ]) {
    const file = 'approved/'+prefix+name+'.png';
    const image = await loadImage(fileURLToPath(new URL(file, import.meta.url)));
    assert.equal(image.width, width);
    assert.equal(image.height, height);
    const reference = createCanvas(width, height).getContext('2d');
    reference.drawImage(image, 0, 0);
    const current = room.getContext('2d').getImageData(x, y, width, height).data;
    assert.ok(Buffer.from(current).equals(Buffer.from(reference.getImageData(0, 0, width, height).data)), file);
  }
}
console.log('The studio, easel and camellia match all six approved noon and night captures.');
