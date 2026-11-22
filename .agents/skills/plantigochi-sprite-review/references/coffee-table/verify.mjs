import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {drawRoom} from '../../../../../src/roomArt.js';
import {placesFor,slotFor} from '../../../../../src/gardenLayout.js';

const require=createRequire(new URL('../../scripts/render-comparison.mjs',import.meta.url));
const {createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.OffscreenCanvas=class {
  constructor(width,height){return createCanvas(width,height);}
};

const planters=[];
for(const [index,spot] of placesFor(0).entries()){
  if(spot.layer!=='table')continue;
  const species=spot.key===4?'monstera':'golden-pothos';
  planters[index]={id:'nursery-'+species,species,potStyle:spot.key===4?0:1,slot:slotFor(0,spot)};
}
assert.equal(planters.filter(Boolean).length,2);
for(const [hour,plants,file] of [
  [12,[],'room.png'],[12,planters,'occupied-room.png'],
  [2,[],'night-room.png'],[2,planters,'night-occupied-room.png'],
]){
  const canvas=createCanvas(400,320);
  drawRoom(canvas,{hour,plants,roomIndex:0,time:0,reducedMotion:true,shopItems:[],highlighted:-1});
  const image=await loadImage(fileURLToPath(new URL('approved/'+file,import.meta.url)));
  assert.equal(image.width,400);
  assert.equal(image.height,320);
  const reference=createCanvas(400,320).getContext('2d');
  reference.drawImage(image,0,0);
  for(const [name,area] of [['open table base',[126,255,137,27]],['full room',[0,0,400,320]]]){
    const actual=canvas.getContext('2d').getImageData(...area).data;
    const frozen=reference.getImageData(...area).data;
    assert.ok(Buffer.from(actual).equals(Buffer.from(frozen)),file+' differs in '+name);
  }
  console.log(file+' matches the approved open base and full room.');
}
