import {BASE_WIDTH,BASE_HEIGHT,placesFor,CAT_SEAT,drawScenery} from './roomScenery.js';
import {drawRoomCat} from './roomCat.js';
import {drawPottedPlant} from './roomPlant.js';

export {BASE_WIDTH as ROOM_WIDTH, BASE_HEIGHT as ROOM_HEIGHT, placesFor, CAT_SEAT};

export function roomLight(hour) {
  const h=((hour%24)+24)%24;
  const smooth=x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);};
  const day=smooth((h-5.5)/2.5)*(1-smooth((h-17)/3));
  const warmth=Math.max(0,1-Math.abs(h-7)/2.4,1-Math.abs(h-18.25)/2.5);
  return {day,warmth,hour:h};
}

export function drawRoom(canvas,{hour,plants=[],roomIndex=0,time=0,reducedMotion=false,awake=false}={}) {
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const view=roomIndex%2;
  const light=roomLight(hour);
  ctx.save();
  ctx.setTransform(canvas.width/BASE_WIDTH,0,0,canvas.height/BASE_HEIGHT,0,0);
  ctx.imageSmoothingEnabled=false;
  drawScenery(ctx,{view,light,time,reducedMotion});
  if(view===0)drawRoomCat(ctx,{...CAT_SEAT,time,reducedMotion,night:1-light.day,awake});
  const places=placesFor(view);
  for(const [i,place] of places.entries()){
    const plant=plants[i];
    if(!plant && !place.shelf)continue;
    drawPottedPlant(ctx,{x:place.x*BASE_WIDTH,y:place.y*BASE_HEIGHT,size:place.size,
      plant,styleIndex:i+roomIndex*6,night:1-light.day,time,reducedMotion});
  }
  ctx.restore();
}
