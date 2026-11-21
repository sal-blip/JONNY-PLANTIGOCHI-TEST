import {drawPottedPlant} from './roomPlant.js';
import {drawSelectionContour} from './roomContour.js';

const locations=[
  [['bookcase','Bookcase top',77,46,.83],['sill','Right windowsill',295,138,.83],['stand','Sofa-side display table',317,240,1]],
  [['cabinet','Left end of studio cabinet',23,180,.8],['sill','Right studio windowsill',264,143,.84],['stand','Studio display table',104,234,1]],
];
export function decorPlaces(view=0){
  return locations[view%2].map(([key,name,baseX,baseY,size])=>({
    slot:view+'/decor-'+key,name,x:baseX/400,y:(baseY-11*size)/320,baseX,baseY,size,stand:key==='stand',
    hitWidth:34*size,hitHeight:30*size,
  }));
}

const colors={
  k:'#4e4242',s:'#796550',h:'#ac8968',w:'#e6d5b1',f:'#f4e8cb',l:'#faf0d7',g:'#c0b69a',
  c:'#ab5b52',r:'#d78770',d:'#735747',y:'#bf9254',o:'#e2b965',j:'#f3d387',
  u:'#344c56',v:'#486a70',b:'#789499',t:'#abc5bd',m:'#9c664d',n:'#bd8761',
  p:'#301f2a',i:'#523342',a:'#8f5153',e:'#bec6aa',z:'#78957c',q:'#577e79',
};
const codes=Object.keys(colors);
const index=Object.fromEntries(codes.map((k,i)=>[k,i+1]));
const colorCache=new Map();
function palette(night,selected){
  const n=Math.round(Math.max(0,Math.min(1,night))*32),key=n*2+Number(selected);
  if(!colorCache.has(key)){
    colorCache.set(key,[null,...codes.map(c=>{
      const rgb=parseInt(colors[c].slice(1),16);
      const rgbParts=[rgb>>16,(rgb>>8)&255,rgb&255].map((v,i)=>{
        const dark=v*[.50,.57,.73][i]+[7,9,12][i],lit=v+(dark-v)*n/32;
        return Math.round(selected?lit+([255,230,178][i]-lit)*.16:lit);
      });
      return 'rgb('+rgbParts.join(',')+')';
    })]);
  }
  return colorCache.get(key);
}

function drawing(){
  const cols=47,rows=41,left=-23,top=-36,buf=new Uint8Array(cols*rows);
  function rect(x,y,w,h,color){
    for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)
      if(i>=left&&i<left+cols&&j>=top&&j<top+rows)buf[(j-top)*cols+i-left]=index[color];
  }
  function line(x,y,xx,yy,color){
    const dx=Math.abs(xx-x),dy=-Math.abs(yy-y),sx=x<xx?1:-1,sy=y<yy?1:-1;
    let err=dx+dy;
    for(;;){
      rect(x,y,1,1,color);
      if(x===xx&&y===yy)break;
      const twice=2*err;
      if(twice>=dy){err+=dy;x+=sx;}
      if(twice<=dx){err+=dx;y+=sy;}
    }
  }
  function image(x,y,bitmap){
    bitmap.forEach((row,oy)=>{
      for(const run of row.matchAll(/([a-z])\1*/g))rect(x+run.index,y+oy,run[0].length,1,run[1]);
    });
  }
  function oval(x,y,rx,ry,color){
    for(let row=-ry;row<=ry;row++){
      const side=Math.round(rx*Math.sqrt(Math.max(0,1-(row/(ry+.22))**2)));
      rect(x-side,y+row,side*2+1,1,color);
    }
  }
  function finish(){
    const runs=[];
    for(let y=0;y<rows;y++)for(let x=0;x<cols;){
      const start=x,col=buf[y*cols+x++];
      while(x<cols&&buf[y*cols+x]===col)x++;
      if(col)(runs[col]??=[]).push(start+left,y+top,x-start);
    }
    return runs;
  }
  return {rect,line,image,oval,finish};
}

// Raised paw, calico ear, vermilion bib and koban coin, all hand-placed.
function luckyCat(g){
  const {image,oval,rect,line}=g;
  image(-11,-27,[
    '        ss      ss  ','       sfws    swfs ','  ss   sfrws  swrcs ',
    ' sfws  sfrrwsswwccs ','swllws sfwwwffwwwws ','sfllws sfllfffllwws ',
    'sfggws sfllfffllwws ',' sfsws sflkflflkwws ',' sfwws sfkfkcfkfwws ',
    '  sfgssflffrcrffwws ','  sfsfwffffffffgws ','  sfffwfffkfkfgwws ',
    '   swfwffwfffgwws  ','   sfwwccccccccws  ','    swfrrroorrwws  ',
    '    swfwrrjorwwws  ','    sflwrrjrrwfwws ','   swflfwrrrwwfwgs ',
    '   sfllfffwwffwggs ','   sflffffwffwgggs ','   sflfffwfffggggs ',
    '   swfffwffffgggws ','   swffwfffwgggwws ','    swffffwgggwws  ',
    '    swffwgwwwwwws  ',
  ]);
  oval(5,-6,4,5,'s');oval(5,-6,3,4,'o');rect(4,-9,2,1,'j');
  line(4,-5,6,-7,'y');rect(4,-4,3,1,'y');
  rect(-7,-2,6,2,'s');rect(2,-2,6,2,'s');rect(-6,-2,4,1,'f');rect(3,-2,4,1,'w');
}

function turntable(g){
  const {rect,line,oval}=g;
  // Low walnut plinth in three-quarter view, open dust cover behind the platter.
  rect(-15,-20,30,1,'v');rect(-16,-19,1,10,'v');rect(14,-19,1,10,'u');
  rect(-15,-19,29,9,'t');rect(-14,-18,26,7,'b');line(-12,-13,-7,-17,'t');line(-8,-12,-2,-17,'t');
  rect(-16,-10,32,9,'k');rect(-17,-9,34,6,'k');
  rect(-15,-10,30,1,'h');rect(-15,-9,30,6,'n');rect(-16,-8,32,3,'h');
  rect(-16,-4,32,2,'m');rect(-13,-1,4,1,'k');rect(10,-1,4,1,'k');
  oval(-3,-8,10,4,'d');oval(-3,-9,10,4,'u');oval(-3,-9,7,3,'k');
  rect(-10,-10,4,1,'b');rect(1,-7,4,1,'v');oval(-3,-9,3,1,'c');rect(-3,-9,1,1,'j');
  rect(9,-12,4,3,'u');rect(10,-12,2,1,'t');line(11,-10,8,-7,'l');line(8,-7,4,-7,'t');rect(3,-7,2,1,'u');
  rect(-14,-5,3,1,'o');rect(13,-5,1,1,'j');
}

const frameData={
  oak:{left:-12,top:-26,w:25,h:25,outer:'d',shadow:'m',base:'n',edge:'j',mat:'f'},
  lacquer:{left:-15,top:-22,w:31,h:21,outer:'p',shadow:'i',base:'a',edge:'c',mat:'w'},
};
function pictureFrame(g,sku){
  const f=frameData[sku],{rect,line}=g,{left:x,top:y,w,h}=f;
  rect(x+4,-2,3,2,f.outer);rect(x+w-6,-2,3,2,f.outer);
  rect(x,y,w,h,f.outer);rect(x+1,y+1,w-2,h-2,f.base);rect(x+1,y+1,w-2,1,f.edge);
  rect(x+1,y+1,1,h-3,f.edge);rect(x+2,y+h-3,w-3,1,f.shadow);rect(x+w-3,y+2,1,h-4,f.shadow);
  rect(x+3,y+3,w-6,h-6,f.mat);rect(x+4,y+4,w-8,h-8,'e');
  const l=x+4,r=x+w-5,t=y+4,bt=y+h-5;
  // Original miniature landscape doubles as a print in frames without a photo.
  rect(l,t,r-l+1,bt-t+1,sku==='oak'?'t':'e');
  g.oval(r-4,t+3,2,2,sku==='oak'?'j':'r');
  for(let j=l;j<=r;j++){
    const a=(j-l)/(r-l),ridge=Math.round(t+5+Math.abs(a-.62)*9+Math.sin(a*13)*1.5);
    if(ridge<=bt)rect(j,ridge,1,bt-ridge+1,'z');
    const near=Math.round(t+9+Math.abs(a-.2)*3+Math.sin(a*10)*2);
    if(near<=bt)rect(j,near,1,bt-near+1,'q');
  }
  if(sku==='oak'){line(l+2,bt-2,l+6,bt-3,'t');line(l+6,bt-3,l+10,bt-3,'t');}
  else{rect(x+2,y+2,2,1,'j');rect(x+w-4,y+h-3,2,1,'j');}
}
const sprites={};
for(const sku of ['neko','record','oak','lacquer']){
  const g=drawing();
  if(sku==='neko')luckyCat(g);else if(sku==='record')turntable(g);else pictureFrame(g,sku);
  sprites[sku]=g.finish();
}

// Accept only locally embedded photos. Decoding and center-crop rendering are
// shared by the room, previews, and the postcard, including reduced-motion views.
const photoCache=new Map();
function photoResource(photo,onReady){
  const src=typeof photo==='string'?photo:photo?.src;
  if(typeof src!=='string'||!/^data:image\/(?:jpeg|png|webp);base64,/.test(src)||typeof Image==='undefined')return null;
  let entry=photoCache.get(src);
  if(!entry){
    if(photoCache.size>=24)photoCache.delete(photoCache.keys().next().value);
    const image=new Image();
    entry={image,loaded:false,settled:false,listeners:new Set(),tiles:new Map()};
    photoCache.set(src,entry);
    entry.ready=new Promise(resolve=>{
      const finish=loaded=>{
        entry.loaded=loaded;entry.settled=true;resolve();
        for(const listener of entry.listeners)listener();
        entry.listeners.clear();
      };
      image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=src;
    });
  }
  if(!entry.settled && onReady)entry.listeners.add(onReady);
  return entry;
}
export function prepareRoomPhotos(items=[]){
  return Promise.all(items.filter(item=>Object.hasOwn(frameData,item.sku)).map(item=>photoResource(item.photo)?.ready));
}
function framedPhoto(ctx,photo,sku,x,y,size,night,onReady){
  const entry=photoResource(photo,onReady);
  if(!entry?.loaded)return;
  const f=frameData[sku],w=f.w-8,h=f.h-8;
  const focal=v=>Number.isFinite(v)?Math.max(0,Math.min(100,v))/100:.5;
  const u=focal(photo.x),v=focal(photo.y),key=[sku,u,v].join('/');
  let tile=entry.tiles.get(key);
  if(!tile){
    const img=entry.image,sw=Math.min(img.naturalWidth,img.naturalHeight*w/h),sh=sw*h/w;
    tile=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):ctx.canvas.ownerDocument.createElement('canvas');
    tile.width=w;tile.height=h;
    const brush=tile.getContext('2d');brush.imageSmoothingEnabled=true;
    brush.drawImage(img,(img.naturalWidth-sw)*u,(img.naturalHeight-sh)*v,sw,sh,0,0,w,h);
    if(entry.tiles.size>=8)entry.tiles.clear();
    entry.tiles.set(key,tile);
  }
  const left=Math.round(x+(f.left+4)*size),top=Math.round(y+(f.top+4)*size);
  const tw=Math.round(x+(f.left+4+w)*size)-left,th=Math.round(y+(f.top+4+h)*size)-top;
  ctx.imageSmoothingEnabled=false;ctx.drawImage(tile,left,top,tw,th);
  if(night>0){ctx.fillStyle='rgba(23,35,60,'+Math.min(.48,.48*night)+')';ctx.fillRect(left,top,tw,th);}
}

function drawDecor(ctx,{sku,x,y,size,night=0,selected=false,photo,onPhotoReady,stand=false}){
  const art=sprites[sku];if(!art)return;
  const ink=palette(night,selected);
  function r(dx,dy,w,h){
    const left=Math.round(x+dx*size),top=Math.round(y+dy*size);
    ctx.fillRect(left,top,Math.round(x+(dx+w)*size)-left,Math.round(y+(dy+h)*size)-top);
  }
  ctx.save();
  if(stand){
    ctx.fillStyle=ink[index.d];r(-16,-1,34,4);r(-14,2,3,13);r(12,2,3,13);
    ctx.fillStyle=ink[index.h];r(-15,-1,31,2);r(-13,3,1,10);r(13,3,1,10);
    ctx.fillStyle=ink[index.n];r(-12,10,25,2);
  }
  ctx.fillStyle='rgba(59,42,42,.22)';r(-9,0,22,1);r(-6,1,17,1);
  if(selected)drawSelectionContour(ctx,art,{x,y,size,firstInk:1});
  art.forEach((cells,i)=>{
    ctx.fillStyle=ink[i];
    for(let j=0;j<cells.length;j+=3)r(cells[j],cells[j+1],cells[j+2],1);
  });
  if(photo&&Object.hasOwn(frameData,sku))framedPhoto(ctx,photo,sku,x,y,size,night,onPhotoReady);
  ctx.restore();
}
export function drawRoomDecor(ctx,view,items,{night=0,highlighted,onPhotoReady}={}){
  for(const spot of decorPlaces(view)){
    const item=items.find(i=>i.slot===spot.slot && Object.hasOwn(sprites,i.sku));
    if(item)drawDecor(ctx,{...item,x:spot.baseX,y:spot.baseY,size:spot.size,stand:spot.stand,night,onPhotoReady,
      selected:highlighted===spot.slot || highlighted===item.id});
  }
}

/** Native pixel preview centered horizontally; y is the baseline of the item. */
export function drawShopPreview(ctx,{sku,x,y,size=1,photo,onPhotoReady}){
  if(sku==='terra'||sku==='wave'){
    drawPottedPlant(ctx,{x,y,size,potSku:sku,reducedMotion:true});return;
  }
  if(['golden-pothos','pothos','snake-plant','snake','monstera'].includes(sku)){
    const species=sku==='snake'?'snake-plant':sku;
    drawPottedPlant(ctx,{x,y,size,plant:{id:'nursery-'+species,species,potStyle:0},reducedMotion:true});return;
  }
  if(Object.hasOwn(sprites,sku))drawDecor(ctx,{sku,x,y,size,photo,onPhotoReady});
}
