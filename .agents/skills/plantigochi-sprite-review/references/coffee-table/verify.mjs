import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {drawRoom} from '../../../../../src/roomArt.js';
import {drawPottedPlant} from '../../../../../src/roomPlant.js';
import {addApprovedSofa} from '../sofa/approved-backdrop.mjs';

const require=createRequire(new URL('../../scripts/package.json',import.meta.url));
const {createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.OffscreenCanvas=class {
  constructor(width,height){return createCanvas(width,height);}
};
const mounts=[
  {slot:4,x:152,y:245,size:.94,species:'monstera',potStyle:0},
  {slot:8,x:193,y:246,size:.70,species:'golden-pothos',potStyle:1},
];
const planters=[];
for(const m of mounts) {
  planters[m.slot]={id:'nursery-'+m.species,species:m.species,potStyle:m.potStyle,slot:m.slot===4?4:'0/table-end'};
}
async function reference(file){
  const image=await loadImage(fileURLToPath(new URL('approved/'+file,import.meta.url)));
  assert.equal(image.width,400);assert.equal(image.height,320);
  const canvas=createCanvas(400,320);
  canvas.getContext('2d').drawImage(image,0,0);
  return canvas;
}
const bytes=canvas=>Buffer.from(canvas.getContext('2d').getImageData(0,0,400,320).data);
for(const [hour,prefix] of [[12,''],[2,'night-']]){
  for(const occupied of [false,true]){
    const name=prefix+(occupied?'occupied-room.png':'room.png');
    const archived=await reference(prefix+'room.png');
    const expected=await reference(prefix+'room.png');
    await addApprovedSofa(expected.getContext('2d'),hour);
    if(occupied){
      for(const canvas of [archived,expected]){
        const ctx=canvas.getContext('2d');
        ctx.save();ctx.beginPath();ctx.rect(125,178,138,74);ctx.clip();
        for(const m of mounts)drawPottedPlant(ctx,{
          x:m.x,y:m.y,size:m.size,plant:planters[m.slot],styleIndex:m.slot,
          night:hour===12?0:1,time:0,reducedMotion:true,
        });
        ctx.restore();
      }
    }
    assert.ok(bytes(archived).equals(bytes(await reference(name))),name+' historical room differs');
    const actual=createCanvas(400,320);
    drawRoom(actual,{hour,plants:occupied?planters:[],roomIndex:0,time:0,reducedMotion:true,shopItems:[],highlighted:-1});
    assert.ok(bytes(actual).equals(bytes(expected)),name+' differs in the current full room');
    console.log(name+' reproduces on the original and current approved scenery.');
  }
}
