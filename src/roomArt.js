import {BASE_WIDTH,BASE_HEIGHT,placesFor,CAT_SEAT,drawScenery} from './roomScenery.js';
import {drawRoomCat} from './roomCat.js';
import {drawPottedPlant,hasTrailingFoliage,isShopPot} from './roomPlant.js';
import {drawKeepsake,keepsakeFor} from './roomKeepsakes.js';
import {slotFor} from './gardenLayout.js';
import {drawRoomDecor} from './roomShopArt.js';

export {BASE_WIDTH as ROOM_WIDTH, BASE_HEIGHT as ROOM_HEIGHT, placesFor, CAT_SEAT};

export const roomCeilingHeight=worldHeight=>Math.round((worldHeight-BASE_HEIGHT)*.39);

export function roomLight(hour) {
  const h=((hour%24)+24)%24;
  const smooth=x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);};
  const day=smooth((h-5.5)/2.5)*(1-smooth((h-17)/3));
  const warmth=Math.max(0,1-Math.abs(h-7)/2.4,1-Math.abs(h-18.25)/2.5);
  return {day,warmth,hour:h};
}

export function drawRoom(canvas,{
  hour,plants=[],outsideOffset=0,roomIndex=0,time=0,reducedMotion=false,awake=false,
  highlighted=-1,lifted=-1,hoverPlacement=null,leavePot=false,worldHeight=BASE_HEIGHT,above=0,separatePlanes=false,placing=false,
  jarProgress=null,leafCount=0,shopItems=[],playingItemId=null,photos,foregroundCanvas=null,region=null
}={}) {
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const view=roomIndex%2;
  const light=roomLight(hour);
  const places=placesFor(view,worldHeight-above-BASE_HEIGHT);
  const scale=canvas.width/(region?.w || BASE_WIDTH);
  function startLayer(ctx){
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    ctx.scale(scale,ctx.canvas.height/(region?.h || worldHeight));
    ctx.translate(-(region?.x || 0),above-(region?.y || 0));
    ctx.imageSmoothingEnabled=false;
  }
  startLayer(ctx);
  function drawOccupant(ctx,slot){
    if(slot==='cat'){
      drawRoomCat(ctx,{...CAT_SEAT,time,reducedMotion,night:1-light.day,awake,selected:highlighted==='cat'});
      return;
    }
    const place=places[slot],address=slotFor(roomIndex,place);
    const hovering=hoverPlacement?.slot===address?hoverPlacement:null;
    const savedPot=shopItems.find(item=>item.slot===address && isShopPot(item.sku));
    if(slot===lifted && !leavePot)return;
    const shopPot=hovering?.pot ?? savedPot;
    const plant=hovering?.plant ?? (slot===lifted?null:plants[slot]),selected=slot===highlighted || Boolean(shopPot && highlighted===shopPot.id);
    if(!plant && !shopPot)return;
    drawPottedPlant(ctx,{x:place.x*BASE_WIDTH,y:place.baseY,size:place.size,
      rasterScale:scale,plant,potSku:shopPot?.sku,night:1-light.day,time,reducedMotion,selected});
  }
  const object=keepsakeFor(roomIndex);
  function paintKeepsake(id){
    if(object?.id===id)drawKeepsake(ctx,object,{
      jarProgress,leafCount,night:1-light.day,selected:highlighted===id&&!placing,time,reducedMotion,
    });
  }
  drawScenery(ctx,{view,light,time,reducedMotion,outsideOffset,drawOccupant:slot=>drawOccupant(ctx,slot),drawKeepsake:paintKeepsake,
    occupantOverhang:slot=>hasTrailingFoliage(hoverPlacement?.slot===slotFor(roomIndex,places[slot])?hoverPlacement.plant.species:plants[slot]?.species)?28:0,separatePlanes,above,below:worldHeight-above-BASE_HEIGHT});
  if(shopItems.length)drawRoomDecor(ctx,roomIndex,shopItems,{night:1-light.day,highlighted,photos,playingItemId,time,reducedMotion,rasterScale:scale});
  // Floor pots can sit forward of the furniture and outside the old 320px frame.
  // In the live room they also sit in front of the native-resolution photo apertures.
  const front=foregroundCanvas?.getContext('2d');
  if(front)startLayer(front);
  const floorSlots=places.map((_,i)=>i).filter(i=>places[i].layer==='floor');
  floorSlots.sort((a,b)=>places[a].baseY-places[b].baseY);
  for(const i of floorSlots)drawOccupant(front || ctx,i);
  if(front)front.restore();
  ctx.restore();
}
