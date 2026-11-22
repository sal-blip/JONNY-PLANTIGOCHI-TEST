import {BASE_WIDTH,BASE_HEIGHT,placesFor,CAT_SEAT,drawScenery} from './roomScenery.js';
import {drawRoomCat} from './roomCat.js';
import {drawPottedPlant} from './roomPlant.js';
import {drawKeepsake,keepsakeFor} from './roomKeepsakes.js';
import {slotFor} from './gardenLayout.js';
import {drawRoomDecor} from './roomShopArt.js';

export {BASE_WIDTH as ROOM_WIDTH, BASE_HEIGHT as ROOM_HEIGHT, placesFor, CAT_SEAT};

export function roomLight(hour) {
  const h=((hour%24)+24)%24;
  const smooth=x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);};
  const day=smooth((h-5.5)/2.5)*(1-smooth((h-17)/3));
  const warmth=Math.max(0,1-Math.abs(h-7)/2.4,1-Math.abs(h-18.25)/2.5);
  return {day,warmth,hour:h};
}

export function drawRoom(canvas,{
  hour,plants=[],roomIndex=0,time=0,reducedMotion=false,awake=false,
  highlighted=-1,lifted=-1,worldHeight=BASE_HEIGHT,above=0,separatePlanes=false,placing=false,
  jarProgress=null,leafCount=0,shopItems=[],playingItemId=null,photos,foregroundCanvas=null
}={}) {
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const view=roomIndex%2;
  const light=roomLight(hour);
  const places=placesFor(view);
  function startLayer(ctx){
    ctx.save();
    ctx.setTransform(ctx.canvas.width/BASE_WIDTH,0,0,ctx.canvas.height/worldHeight,0,0);
    ctx.clearRect(0,0,BASE_WIDTH,worldHeight);ctx.translate(0,above);
    ctx.imageSmoothingEnabled=false;
  }
  startLayer(ctx);
  function drawOccupant(ctx,slot){
    if(slot==='cat'){
      drawRoomCat(ctx,{...CAT_SEAT,time,reducedMotion,night:1-light.day,awake,selected:highlighted==='cat'});
      return;
    }
    const place=places[slot],address=slotFor(roomIndex,place);
    const shopPot=shopItems.find(item=>item.slot===address && (item.sku==='terra' || item.sku==='wave'));
    if(slot===lifted)return;
    const plant=plants[slot],selected=slot===highlighted || Boolean(shopPot && highlighted===shopPot.id);
    const preview=!plant && !place.shelf && !shopPot;
    if(preview && (placing || !selected))return;
    ctx.save();
    if(preview)ctx.globalAlpha=selected ? .9 : .45;
    drawPottedPlant(ctx,{x:place.x*BASE_WIDTH,y:place.y*BASE_HEIGHT+place.front*(worldHeight-above-BASE_HEIGHT),size:place.size,
      plant,potSku:shopPot?.sku,styleIndex:slot+roomIndex*places.length,night:1-light.day,time,reducedMotion,selected});
    ctx.restore();
  }
  const object=keepsakeFor(roomIndex);
  function paintKeepsake(id){
    if(object?.id===id)drawKeepsake(ctx,object,{
      jarProgress,leafCount,night:1-light.day,selected:highlighted===id&&!placing,time,reducedMotion,
    });
  }
  drawScenery(ctx,{view,light,time,reducedMotion,drawOccupant:slot=>drawOccupant(ctx,slot),drawKeepsake:paintKeepsake,separatePlanes});
  if(shopItems.length)drawRoomDecor(ctx,roomIndex,shopItems,{night:1-light.day,highlighted,photos,playingItemId,time,reducedMotion});
  // Floor pots can sit forward of the furniture and outside the old 320px frame.
  // In the live room they also sit in front of the native-resolution photo apertures.
  const front=foregroundCanvas?.getContext('2d');
  if(front)startLayer(front);
  places.forEach((spot,i)=>{if(spot.layer==='floor')drawOccupant(front || ctx,i);});
  if(front)front.restore();
  ctx.restore();
}
