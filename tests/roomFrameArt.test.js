import test from 'node:test';
import assert from 'node:assert/strict';
import {decorPlaces,drawRoomDecor,framePhotoBounds} from '../src/roomShopArt.js';

test('live photos fit the rounded apertures of shelf and freestanding frames',()=>{
  assert.deepEqual(framePhotoBounds('oak',317,240,1),{left:312,top:226,width:9,height:8});
  assert.deepEqual(framePhotoBounds('lacquer',264,143,.84),{left:258,top:129,width:12,height:11});
  assert.deepEqual(framePhotoBounds('oak',36,55,2),{left:26,top:26,width:17,height:17});
  assert.deepEqual(framePhotoBounds('lacquer',36,55,2),{left:22,top:22,width:28,height:27});
  assert.equal(framePhotoBounds('record',104,234,1),null);
});

test('postcards crop directly from the source photo at the destination canvas resolution',()=>{
  const view=2,spot=decorPlaces(view).find(p=>p.stand);
  const photo={x:75,y:50},item={id:'frame',sku:'oak',slot:spot.slot,photo};
  const original={naturalWidth:720,naturalHeight:480};
  const calls=[];
  const canvas={
    save(){},restore(){},fillRect(){},
    drawImage(...args){calls.push({args,smoothing:this.imageSmoothingEnabled});},
  };
  drawRoomDecor(canvas,view,[item],{photos:new Map([[item.id,original]])});
  assert.deepEqual(calls,[{args:[original,135,0,540,480,312,226,9,8],smoothing:true}]);
});

test('the original photo and its postcard crop share the detailed garden aperture',()=>{
  const spot=decorPlaces(0)[0],scale=3;
  const bounds=framePhotoBounds('oak',spot.baseX,spot.baseY,spot.size,scale);
  const image={naturalWidth:720,naturalHeight:480};
  const item={id:'framed',sku:'oak',slot:spot.slot,photo:{x:50,y:50}};
  let destination;
  const ctx={save(){},restore(){},scale(x,y){assert.equal(x,1/scale);assert.equal(y,x);},fillRect(){},
    drawImage(...args){destination=args.slice(-4);}
  };
  drawRoomDecor(ctx,0,[item],{rasterScale:scale,photos:new Map([[item.id,image]])});
  assert.deepEqual(destination,[bounds.left,bounds.top,bounds.width,bounds.height].map(v=>Math.round(v*scale)));
  assert.ok(destination.every(Number.isInteger));
});
