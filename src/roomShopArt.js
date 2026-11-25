import {surfaceScale} from './gardenLayout.js';
import {nativeArt} from './shopSprites/nativeArt.js';
import {approvedArt} from './shopSprites/approved.js';
import {drawPottedPlant,isShopPlant,isShopPot} from './roomPlant.js';
import {drawSelectionContour} from './roomContour.js';

const locations=[
  [['bookcase','Bookcase top',77,46,surfaceScale.shelf],['sill','Right windowsill',295,138,surfaceScale.window],['stand','Sofa-side display table',317,240,surfaceScale.displayStand]],
  [['cabinet','Left end of studio cabinet',23,180,surfaceScale.shelf],['sill','Right studio windowsill',264,143,surfaceScale.window],['stand','Studio display table',104,234,surfaceScale.displayStand]],
];
export function decorPlaces(view=0){
  return locations[view%2].map(([key,name,baseX,baseY,size])=>({
    slot:view+'/decor-'+key,name,x:baseX/400,y:(baseY-14*size)/320,baseX,baseY,size,stand:key==='stand',
    hitWidth:40*size,hitHeight:34*size,
  }));
}

const decorSkus=['oak','lacquer','neko','record'];
const labelHighlight='#fff0ce',labelShadow='#958778';
const colors={
  d:'#735747',h:'#ac8968',D:'#604638',n:'#bd8761',O:'#d9a456',
  ...Object.fromEntries([...decorSkus.flatMap(sku=>approvedArt[sku].spritePalette),labelHighlight,labelShadow]
    .map(color=>[color,color])),
};
const codes=Object.keys(colors);
const index=Object.fromEntries(codes.map((color,i)=>[color,i+1]));
const colorCache=new Map();
function palette(night,selected){
  const n=Math.round(Math.max(0,Math.min(1,night))*32),key=n*2+Number(selected);
  if(!colorCache.has(key)){
    colorCache.set(key,[null,...codes.map(code=>{
      const rgb=parseInt(colors[code].slice(1),16);
      const parts=[rgb>>16,(rgb>>8)&255,rgb&255].map((value,i)=>{
        const dark=value*[.50,.57,.73][i]+[7,9,12][i],lit=value+(dark-value)*n/32;
        return Math.round(selected?lit+([255,230,178][i]-lit)*.16:lit);
      });
      return 'rgb('+parts.join(',')+')';
    })]);
  }
  return colorCache.get(key);
}

// The moving print stays within the center label on the approved record.
const labelOrbit=[
  [[29,32],[30,32],[33,34]],[[30,31],[31,31],[32,34]],
  [[32,31],[33,31],[29,34]],[[33,32],[34,33],[29,33]],
  [[33,34],[32,34],[29,32]],[[31,35],[30,35],[32,32]],[[29,34],[28,33],[33,32]],
];

function makeSprite({spriteOffset,spritePalette,spriteRows},orbit=[]){
  const marks=new Map(orbit.map(([x,y],i)=>[(x-36)+','+(y-55),index[i===2?labelShadow:labelHighlight]]));
  const runs=[];
  spriteRows.forEach((row,j)=>{
    const y=spriteOffset.y+j;
    const inks=Array.from(row,(char,i)=>{
      if(char===' ')return 0;
      const x=spriteOffset.x+i;
      return marks.get(x+','+y) ?? index[spritePalette[char.charCodeAt(0)-65]];
    });
    for(let i=0;i<inks.length;){
      const first=i,ink=inks[i++];
      while(i<inks.length && inks[i]===ink)i++;
      if(ink)(runs[ink]??=[]).push(spriteOffset.x+first,y,i-first);
    }
  });
  return runs;
}
const sprites=Object.fromEntries(decorSkus.map(sku=>[sku,makeSprite(approvedArt[sku])]));
const recordFrames=labelOrbit.map(orbit=>makeSprite(approvedArt.record,orbit));

// Rectangular photo crops expressed in the same native coordinates as the art.
const frameData={
  oak:{aperture:{x:-10,y:-29,w:17,h:17}},
  lacquer:{aperture:{x:-14,y:-33,w:28,h:27}},
};

export function framePhotoBounds(sku,x,y,size=1,rasterScale=1){
  const a=frameData[sku]?.aperture;
  if(!a)return null;
  const snap=v=>Math.round(v*rasterScale)/rasterScale;
  const scale=size/2,left=snap(x+a.x*scale),top=snap(y+a.y*scale);
  return {left,top,width:snap(x+(a.x+a.w)*scale)-left,height:snap(y+(a.y+a.h)*scale)-top};
}

function framedPhoto(ctx,image,photo,sku,x,y,size,night){
  const {left,top,width,height}=framePhotoBounds(sku,x,y,size);
  const w=image.naturalWidth,h=image.naturalHeight;
  const sw=Math.min(w,h*width/height),sh=sw*height/width;
  const u=(photo.x??50)/100,v=(photo.y??50)/100;
  ctx.fillStyle='#efeeda';
  ctx.fillRect(left,top,width,height);
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,(w-sw)*u,(h-sh)*v,sw,sh,left,top,width,height);
  if(night>0){
    ctx.fillStyle='rgba(23,35,60,'+Math.min(.48,.48*night)+')';
    ctx.fillRect(left,top,width,height);
  }
}

function drawDecor(ctx,{sku,x,y,size,night=0,selected=false,photo,image,stand=false,spinTime=null,preview=false,rasterScale=1,detailImage=null}){
  const art=sku==='record' && spinTime!==null ? recordFrames[Math.floor(spinTime/255)%recordFrames.length] : sprites[sku];
  if(!art)return;
  const ink=palette(night,selected);
  function r(dx,dy,w,h){
    const left=Math.round(x+dx*size),top=Math.round(y+dy*size);
    ctx.fillRect(left,top,Math.round(x+(dx+w)*size)-left,Math.round(y+(dy+h)*size)-top);
  }
  ctx.save();
  if(rasterScale!==1){
    // Snap authored runs after converting the anchor and size to backing pixels.
    ctx.scale(1/rasterScale,1/rasterScale);
    x*=rasterScale;y*=rasterScale;size*=rasterScale;
  }
  if(stand){
    ctx.fillStyle=ink[index.d];r(-16,-1,34,4);r(-14,2,3,13);r(12,2,3,13);
    ctx.fillStyle=ink[index.h];r(-15,-1,31,2);r(-13,3,1,10);r(13,3,1,10);
    ctx.fillStyle=ink[index.D];r(-15,1,31,2);r(-14,3,5,2);r(10,3,5,2);
    ctx.fillStyle=ink[index.n];r(-12,9,25,2);
    ctx.fillStyle=ink[index.O];r(-12,9,25,1);r(-13,1,2,1);r(12,1,2,1);
  }
  if(!preview){ctx.fillStyle='rgba(59,42,42,.22)';r(-9,0,22,1);r(-6,1,17,1);}
  if(selected)drawSelectionContour(ctx,art,{x,y,size:size/2,firstInk:1,rasterScale});
  const master=detailImage ?? nativeArt(sku,night,selected);
  if(master){
    const {spriteOffset,spriteRows}=approvedArt[sku];
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(master,x+spriteOffset.x*size/2,y+spriteOffset.y*size/2,
      Math.max(...spriteRows.map(row=>row.length))*size/2,spriteRows.length*size/2);
    if(sku==='record' && spinTime!==null){
      const marks=labelOrbit[Math.floor(spinTime/255)%labelOrbit.length];
      marks.forEach(([cx,cy],i)=>{
        ctx.fillStyle=ink[index[i===2?labelShadow:labelHighlight]];
        r((cx-36)/2,(cy-55)/2,.5,.5);
      });
    }
  }else{
    art.forEach((cells,i)=>{
      ctx.fillStyle=ink[i];
      for(let j=0;j<cells.length;j+=3)r(cells[j]/2,cells[j+1]/2,cells[j+2]/2,.5);
    });
  }
  if(image && photo)framedPhoto(ctx,image,photo,sku,x,y,size,night);
  ctx.restore();
}
export function drawRoomDecor(ctx,view,items,{night=0,highlighted,photos,playingItemId=null,time=0,reducedMotion=false,rasterScale=1}={}){
  for(const spot of decorPlaces(view)){
    const item=items.find(i=>i.slot===spot.slot && Object.hasOwn(sprites,i.sku));
    if(item)drawDecor(ctx,{...item,x:spot.baseX,y:spot.baseY,size:spot.size,stand:spot.stand,night,rasterScale,image:photos?.get(item.id),
      selected:highlighted===spot.slot || highlighted===item.id,
      spinTime:playingItemId!=null && item.id===playingItemId && !reducedMotion ? Math.max(0,time) : null});
  }
}

// Use the same physical windowsill and nursery rendering as a placed item.
export function drawSizeComparison(ctx,sku){
  const size=surfaceScale.window, y=51;
  if(isShopPlant(sku) || isShopPot(sku)){
    const plant=isShopPlant(sku)?{id:'nursery-'+sku,species:sku}:null;
    drawPottedPlant(ctx,{x:24,y,size,plant,potSku:plant?null:sku,rasterScale:3,reducedMotion:true});
  }else{
    drawDecor(ctx,{sku,x:24,y,size,rasterScale:3});
  }
  drawPottedPlant(ctx,{x:60,y,size,potSku:'terra',rasterScale:3,reducedMotion:true});
}

/** Native pixel preview centered horizontally; y is the baseline of the item. */
export function drawShopPreview(ctx,{sku,x,y,size=1,detailImage=null}){
  if(isShopPot(sku)){
    drawPottedPlant(ctx,{x,y,size,potSku:sku,reducedMotion:true,preview:true});return;
  }
  if(isShopPlant(sku)){
    const plant={id:'nursery-'+sku,species:sku};
    drawPottedPlant(ctx,{x,y,size,plant,reducedMotion:true,preview:true});return;
  }
  if(Object.hasOwn(sprites,sku))drawDecor(ctx,{sku,x,y,size,preview:true,detailImage});
}
