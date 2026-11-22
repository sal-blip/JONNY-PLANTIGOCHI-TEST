import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {drawRoom} from '../../../../../src/roomArt.js';

const require=createRequire(new URL('../../scripts/render-comparison.mjs',import.meta.url));
const {createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.OffscreenCanvas=class {
  constructor(width,height){return createCanvas(width,height);}
};
const regions=[
  ['socket',[335,140,25,25]],
  ['foot',[330,207,43,21]],
  ['full room',[0,0,400,320]],
];
for(const [hour,file] of [[12,'room.png'],[2,'night-room.png']]){
  const canvas=createCanvas(400,320);
  drawRoom(canvas,{hour,roomIndex:0,time:0,reducedMotion:true,plants:[],shopItems:[],highlighted:-1});
  const frozen=await loadImage(fileURLToPath(new URL('approved/'+file,import.meta.url)));
  assert.equal(frozen.width,canvas.width);
  assert.equal(frozen.height,canvas.height);
  const reference=createCanvas(400,320).getContext('2d');
  reference.drawImage(frozen,0,0);
  for(const [label,rect] of regions){
    const actual=canvas.getContext('2d').getImageData(...rect).data;
    const expected=reference.getImageData(...rect).data;
    assert.ok(Buffer.from(actual).equals(Buffer.from(expected)),file+' differs in '+label);
  }
  console.log(file+' matches the approved socket, foot and full room.');
}
