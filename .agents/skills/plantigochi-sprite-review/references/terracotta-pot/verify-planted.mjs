import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const require = createRequire(new URL('../../scripts/package.json', import.meta.url));
const {createCanvas, loadImage} = require('@napi-rs/canvas');
globalThis.OffscreenCanvas = class {
  constructor(width, height) {return createCanvas(width, height);}
};

const src = path.resolve(process.argv[2] ?? '.', 'src');
const {drawRoom} = await import(pathToFileURL(path.join(src,'roomArt.js')).href);
const {drawPottedPlant} = await import(pathToFileURL(path.join(src,'roomPlant.js')).href);
const {drawShopPreview} = await import(pathToFileURL(path.join(src,'roomShopArt.js')).href);
const {previewLayout} = await import(pathToFileURL(path.join(src,'shopPreviewLayout.js')).href);
const slot = 4;
const item = {id:'shop-terra', sku:'terra', slot};
const subject = {id:'nursery-snake-plant', species:'snake-plant', source:'shop', potStyle:0, slot};
const neutral = {roomIndex:0, hour:12, reducedMotion:true, time:0, plants:[], shopItems:[]};

async function reference(relative) {
  const image = await loadImage(fileURLToPath(new URL(relative, import.meta.url)));
  const c = createCanvas(image.width,image.height);
  c.getContext('2d').drawImage(image,0,0);
  return c;
}
function check(actual, expected, label) {
  assert.equal(actual.width, expected.width, label+' width');
  assert.equal(actual.height, expected.height, label+' height');
  const pixels = c => Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
  assert.ok(pixels(actual).equals(pixels(expected)), label+' differs from the approved pixels');
}
function compose(backdrop, plant) {
  const c = createCanvas(backdrop.width,backdrop.height), ctx = c.getContext('2d');
  ctx.drawImage(backdrop,0,0);
  // Fixed approval geometry: table mount 4 and its foreground clip in the 400×320 room.
  ctx.beginPath(); ctx.rect(125,178,138,74); ctx.clip();
  drawPottedPlant(ctx,{x:152,y:245,size:.94,potSku:'terra',styleIndex:4,plant,reducedMotion:true});
  return c;
}

// The open-base coffee table reference supplies the original, unoccupied approval backdrop.
const originalBackdrop = await reference('../coffee-table/approved/room.png');
const currentBackdrop = createCanvas(400,320);
drawRoom(currentBackdrop,neutral);
for (const [suffix,plant] of [['',null],['-planted',subject]]) {
  const original = compose(originalBackdrop,plant);
  check(original, await reference('approved/room'+suffix+'.png'), 'archived room'+suffix);
  const shelf = createCanvas(101,82);
  shelf.getContext('2d').drawImage(original,-102,-181);
  check(shelf, await reference('approved/shelf'+suffix+'.png'), 'archived shelf'+suffix);

  const plants = [];
  if (plant) plants[slot] = plant;
  const actual = createCanvas(400,320);
  drawRoom(actual,{...neutral,plants,shopItems:[item]});
  check(actual,compose(currentBackdrop,plant),'current room'+suffix);
}

const tile = createCanvas(72,64);
const [x,y,size] = previewLayout.terra;
drawShopPreview(tile.getContext('2d'),{sku:'terra',x,y,size});
check(tile,await reference('approved/shop.png'),'shop tile');
console.log('Five approved images match. Empty and planted pots reproduce on the current coffee table.');
