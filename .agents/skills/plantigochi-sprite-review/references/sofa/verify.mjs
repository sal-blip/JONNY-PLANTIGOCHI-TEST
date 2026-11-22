import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {CAT_SEAT,drawRoom} from '../../../../../src/roomArt.js';

const require=createRequire(new URL('../../scripts/package.json',import.meta.url));
const {createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.OffscreenCanvas=class {
  constructor(width,height){return createCanvas(width,height);}
};
assert.deepEqual(CAT_SEAT,{x:205,y:197,size:1});
for(const [hour,awake,file] of [
  [12,false,'room.png'],[12,true,'awake-room.png'],
  [2,false,'night-room.png'],[2,true,'night-awake-room.png'],
]){
  const canvas=createCanvas(400,320);
  drawRoom(canvas,{hour,awake,roomIndex:0,time:0,reducedMotion:true,plants:[],shopItems:[],highlighted:-1});
  const image=await loadImage(fileURLToPath(new URL('approved/'+file,import.meta.url)));
  assert.equal(image.width,400);assert.equal(image.height,320);
  const fixture=createCanvas(400,320).getContext('2d');
  fixture.drawImage(image,0,0);
  const current=canvas.getContext('2d').getImageData(0,0,400,320).data;
  const frozen=fixture.getImageData(0,0,400,320).data;
  assert.ok(Buffer.from(current).equals(Buffer.from(frozen)),file+' differs from the approved room');
}
console.log('All four native living rooms match the approved sofa, including both cat poses at noon and 02:00.');
