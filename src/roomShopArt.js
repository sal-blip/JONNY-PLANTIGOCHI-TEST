import {drawPottedPlant} from './roomPlant.js';
import {drawSelectionContour} from './roomContour.js';

const locations=[
  [['bookcase','Bookcase top',77,46,.83],['sill','Right windowsill',295,138,.83],['stand','Sofa-side display table',317,240,1]],
  [['cabinet','Left end of studio cabinet',23,180,.8],['sill','Right studio windowsill',264,143,.84],['stand','Studio display table',104,234,1]],
];
export function decorPlaces(view=0){
  return locations[view%2].map(([key,name,baseX,baseY,size])=>({
    slot:view+'/decor-'+key,name,x:baseX/400,y:(baseY-14*size)/320,baseX,baseY,size,stand:key==='stand',
    hitWidth:40*size,hitHeight:34*size,
  }));
}

const colors={
  // Shelf woods, then porcelain, metal, glazing and the inks for the prints.
  d:'#735747',h:'#ac8968',n:'#bd8761',
  K:'#352e36',D:'#604638',M:'#a16a4c',N:'#bc8554',E:'#a8734e',
  B:'#906435',O:'#d9a456',J:'#f8d68c',
  H:'#ae9c86',G:'#c1b59f',W:'#e0cbaa',I:'#f4e5c5',F:'#fff4db',
  Q:'#542f3a',C:'#913e42',A:'#bd6655',R:'#e47d66',P:'#e4a292',
  U:'#344752',V:'#546a75',S:'#789598',L:'#aebfb9',T:'#c7d0bb',Z:'#527e76',
  v:'#698a93',s:'#93aeb0',l:'#cfdbcf',
};
const glazingAlpha={v:.73,s:.55,l:.68};
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
      return c in glazingAlpha ? 'rgba('+[...rgbParts,glazingAlpha[c]].join(',')+')' : 'rgb('+rgbParts.join(',')+')';
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
  function poly(points,color){
    const ys=points.map(p=>p[1]);
    for(let y=Math.min(...ys);y<=Math.max(...ys);y++){
      const crossings=[];
      for(let i=0;i<points.length;i++){
        const [x1,y1]=points[i],[x2,y2]=points[(i+1)%points.length];
        if((y1<=y && y<y2) || (y2<=y && y<y1))
          crossings.push(x1+(y-y1)*(x2-x1)/(y2-y1));
      }
      crossings.sort((a,b)=>a-b);
      for(let j=0;j+1<crossings.length;j+=2){
        const left=Math.ceil(crossings[j]),right=Math.floor(crossings[j+1]);
        rect(left,y,right-left+1,1,color);
      }
    }
    points.forEach(([x,y],i)=>line(x,y,...points[(i+1)%points.length],color));
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
  return {rect,line,poly,oval,finish};
}

// The porcelain glaze uses a warm reflected shadow and a cooler ivory core.
function luckyCat({poly,oval,rect,line}){
  // Tucked tail and broad haunch, with the far arm lifted clear of the head.
  poly([[-4,-15],[1,-17],[7,-16],[10,-13],[11,-10],[14,-7],[15,-4],[14,-2],[10,-1],[-7,-1],[-11,-2],[-13,-5],[-13,-8],[-10,-12]],'K');
  poly([[-5,-15],[1,-16],[6,-15],[9,-13],[10,-9],[13,-6],[14,-4],[12,-2],[-6,-2],[-11,-4],[-12,-7],[-10,-10]],'G');
  poly([[-6,-15],[0,-15],[6,-14],[9,-11],[9,-7],[8,-4],[4,-2],[-4,-2],[-8,-5],[-8,-11]],'I');
  oval(10,-6,3,3,'G');rect(10,-8,2,1,'I');rect(12,-5,2,1,'W');
  poly([[5,-14],[9,-18],[11,-21],[11,-23],[10,-24],[10,-27],[12,-29],[15,-29],[17,-27],[17,-23],[15,-21],[14,-17],[11,-14],[8,-12]],'K');
  poly([[7,-14],[10,-18],[12,-21],[12,-24],[11,-25],[11,-27],[13,-28],[15,-28],[16,-26],[16,-23],[14,-21],[13,-18],[10,-15],[8,-13]],'G');
  poly([[8,-15],[11,-19],[13,-21],[13,-24],[11,-25],[12,-27],[14,-28],[15,-27],[15,-24],[13,-20],[12,-17]],'I');
  rect(12,-27,2,1,'F');rect(12,-24,4,1,'W');rect(13,-26,1,2,'H');rect(15,-26,1,2,'H');
  // Two ears flank a big rounded face. The ears and forehead have calico patches.
  poly([[-12,-30],[-11,-32],[-9,-32],[-5,-29],[-2,-29],[2,-28],[5,-31],[7,-31],[8,-29],[7,-24],[8,-21],[7,-18],[5,-16],[2,-14],[-5,-14],[-9,-16],[-12,-19],[-13,-22],[-12,-25]],'K');
  poly([[-11,-30],[-10,-31],[-8,-30],[-5,-28],[0,-28],[3,-27],[6,-30],[7,-29],[6,-24],[7,-21],[6,-18],[3,-16],[0,-15],[-5,-15],[-8,-16],[-11,-19],[-12,-22],[-11,-25]],'G');
  poly([[-10,-30],[-6,-27],[-1,-28],[3,-26],[4,-24],[6,-22],[5,-19],[3,-17],[-1,-16],[-6,-16],[-10,-18],[-11,-21]],'I');
  poly([[-11,-30],[-8,-28],[-6,-26],[-10,-25]],'A');rect(-10,-29,1,2,'P');
  poly([[2,-26],[6,-30],[7,-29],[6,-25],[4,-23],[2,-23]],'E');
  line(4,-26,6,-28,'A');rect(1,-27,2,2,'K');rect(0,-27,1,1,'E');
  poly([[-10,-26],[-8,-27],[-6,-26],[-6,-25],[-8,-24],[-10,-24]],'E');
  rect(-5,-26,2,1,'F');rect(-4,-25,1,1,'F');
  // Closed smiling eyes, a tiny vermilion nose and a white, double-lobed muzzle.
  rect(-8,-22,2,1,'K');rect(-7,-23,2,1,'K');rect(-5,-22,1,1,'K');
  rect(0,-22,1,1,'K');rect(1,-23,2,1,'K');rect(3,-22,1,1,'K');
  rect(-10,-20,2,1,'P');rect(4,-20,2,1,'P');
  rect(-6,-20,7,2,'F');rect(-5,-18,5,1,'F');
  rect(-4,-21,3,1,'A');rect(-3,-20,1,1,'K');rect(-5,-19,2,1,'K');rect(-2,-19,2,1,'K');
  rect(-12,-21,3,1,'H');rect(5,-21,3,1,'H');
  // Vermilion collar and small brass bell then paw guarding an embossed koban.
  poly([[-9,-16],[-5,-15],[2,-15],[6,-17],[6,-15],[3,-13],[-2,-12],[-7,-13]],'C');
  line(-7,-15,-3,-14,'R');line(-2,-14,2,-14,'R');
  oval(1,-13,2,2,'B');rect(0,-14,2,1,'J');rect(1,-12,1,1,'K');
  poly([[-9,-12],[-6,-13],[-3,-12],[-2,-10],[-3,-7],[-6,-4],[-9,-3],[-11,-4],[-12,-7],[-11,-10]],'B');
  poly([[-9,-11],[-6,-12],[-4,-11],[-3,-10],[-4,-8],[-7,-5],[-9,-4],[-11,-6],[-10,-9]],'O');
  line(-10,-8,-8,-11,'J');line(-7,-8,-5,-9,'B');line(-8,-6,-6,-9,'B');
  oval(-8,-13,3,2,'W');rect(-9,-14,3,1,'F');rect(-9,-12,1,1,'H');
  line(4,-10,4,-5,'W');line(5,-9,5,-5,'F');
  poly([[-9,-4],[-6,-4],[-4,-3],[-3,-2],[-3,-1],[-9,-1],[-11,-2]],'G');
  rect(-9,-3,4,1,'I');rect(-8,-2,1,1,'W');
  poly([[1,-4],[5,-4],[7,-2],[7,-1],[0,-1],[-1,-2]],'W');
  rect(1,-3,4,1,'I');rect(3,-2,1,1,'G');rect(1,-2,1,1,'F');
}

const labelOrbit=[[-2,-1],[-1,-1],[1,-1],[2,0],[1,1],[-1,1],[-2,0]];

function turntable({poly,rect,line,oval},phase=0){
  // Open smoke-blue Perspex cover, polished edge, two brass hinges.
  poly([[-14,-30],[17,-30],[19,-28],[16,-17],[-16,-17],[-17,-19]],'U');
  poly([[-14,-29],[16,-29],[17,-28],[15,-19],[-15,-19],[-15,-22]],'v');
  poly([[-13,-28],[15,-28],[14,-21],[-15,-21]],'s');
  poly([[-13,-28],[-3,-28],[-10,-22],[-14,-22]],'l');
  line(-8,-23,-3,-27,'s');line(6,-24,10,-27,'l');
  line(-13,-29,15,-29,'T');line(17,-27,15,-20,'L');
  rect(-11,-20,4,3,'U');rect(-10,-20,3,1,'M');rect(9,-20,4,3,'U');rect(10,-20,2,1,'M');
  // The orthographic deck has a broad top plane, walnut front and short feet.
  poly([[-15,-19],[17,-19],[20,-17],[18,-6],[17,-3],[15,-2],[-17,-2],[-20,-4],[-20,-9]],'K');
  poly([[-15,-18],[16,-18],[18,-17],[15,-8],[-18,-8]],'B');
  poly([[-15,-18],[15,-18],[17,-17],[14,-9],[-18,-9]],'W');
  line(-16,-16,-18,-10,'J');
  poly([[-19,-8],[14,-8],[15,-7],[15,-3],[-16,-3],[-19,-4]],'M');
  rect(-17,-8,31,1,'O');rect(-17,-7,30,1,'N');rect(-11,-5,16,1,'D');rect(0,-6,12,1,'N');
  rect(-17,-3,31,1,'D');line(16,-8,18,-16,'N');line(16,-7,18,-9,'D');
  rect(-15,-2,4,2,'K');rect(10,-2,4,2,'K');rect(-15,-6,5,2,'D');rect(-14,-6,3,1,'J');
  // Metal platter rim, dark vinyl grooves and a contrasting printed center label.
  oval(-4,-12,11,5,'U');oval(-4,-13,11,5,'T');oval(-4,-14,11,5,'K');
  oval(-4,-14,9,4,'V');oval(-4,-14,8,4,'U');oval(-4,-14,6,3,'K');
  line(-13,-15,-10,-17,'S');rect(-9,-17,3,1,'V');
  line(2,-11,5,-13,'V');rect(0,-11,3,1,'S');
  oval(-4,-14,3,2,'A');rect(-6,-15,4,1,'R');rect(-5,-14,3,2,'P');
  const [dx,dy]=labelOrbit[phase];rect(-4+dx,-14+dy,1,1,'J');rect(-4,-14,1,1,'U');
  // Counterweight and a long aluminium arm; the dark cartridge lands on the LP.
  oval(12,-17,3,2,'U');rect(11,-19,3,1,'T');rect(12,-17,2,2,'D');
  line(12,-15,10,-11,'K');line(10,-11,4,-10,'K');line(12,-16,10,-12,'T');line(10,-12,4,-11,'F');
  rect(3,-12,3,2,'U');rect(3,-12,2,1,'S');rect(14,-11,2,2,'U');rect(14,-11,1,1,'F');
}

const frameData={
  oak:{left:-14,top:-29,w:29,h:28,aperture:{x:-8,y:-24,w:17,h:17}},
  lacquer:{left:-17,top:-25,w:35,h:24,aperture:{x:-11,y:-20,w:23,h:13}},
};

function oakPrint({rect,poly}){
  // Fuji at first light: snow, the near ridge and a narrow reflection on the lake.
  rect(-8,-24,17,17,'L');rect(-8,-18,17,7,'P');
  rect(-6,-22,3,3,'A');rect(-5,-23,1,1,'A');rect(-5,-19,1,1,'A');
  poly([[-8,-13],[-5,-15],[-3,-15],[1,-20],[3,-21],[5,-18],[8,-15],[8,-12],[-8,-12]],'V');
  poly([[-1,-17],[2,-21],[3,-21],[6,-17],[3,-18],[2,-17],[1,-18]],'F');
  poly([[-8,-16],[-5,-14],[-3,-14],[-1,-12],[2,-12],[6,-14],[8,-14],[8,-10],[-8,-10]],'Z');
  rect(-8,-10,17,3,'S');rect(-7,-10,6,1,'T');rect(-2,-9,5,1,'L');rect(5,-8,3,1,'V');
}

function lacquerPrint({rect,poly,line}){
  // A moonlit fishing boat under a rising moon.
  rect(-11,-20,23,13,'S');rect(-11,-13,23,6,'L');
  rect(4,-19,3,4,'J');rect(3,-18,5,2,'J');
  poly([[-11,-15],[-8,-16],[-5,-15],[-2,-13],[1,-14],[4,-12],[8,-14],[11,-14],[11,-11],[-11,-11]],'V');
  rect(-11,-11,23,4,'U');rect(-8,-11,8,1,'S');rect(2,-10,6,1,'L');rect(4,-8,3,1,'S');
  line(-8,-12,-5,-16,'F');rect(-6,-15,1,4,'F');rect(-5,-16,1,5,'K');
  line(-9,-11,-7,-10,'K');rect(-7,-10,5,1,'K');rect(-2,-11,1,1,'K');
}

function pictureFrame(g,sku){
  const {rect,line,poly}=g,{left:x,top:y,w,h,aperture:a}=frameData[sku];
  const far=x+w-1,bottom=y+h-1,oak=sku==='oak';
  rect(x+4,-2,4,2,oak?'D':'K');rect(far-7,-2,4,2,oak?'D':'K');
  rect(x,y,w,h,oak?'D':'K');
  rect(x+1,y+1,w-2,h-2,oak?'N':'C');
  if(oak){
    // Four mitred oak rails with end-grain at the joints and an inset shadow.
    poly([[x+1,y+1],[far-1,y+1],[far-4,y+4],[x+4,y+4]],'O');
    poly([[x+1,y+1],[x+3,y+3],[x+3,bottom-3],[x+1,bottom-1]],'N');
    poly([[far-3,y+3],[far-1,y+1],[far-1,bottom-1],[far-3,bottom-3]],'E');
    poly([[x+1,bottom-1],[x+4,bottom-4],[far-4,bottom-4],[far-1,bottom-1]],'M');
    rect(x+5,y+1,14,1,'J');rect(x+10,y+3,8,1,'N');rect(x+1,y+6,1,12,'O');
    rect(far-2,y+12,1,6,'N');rect(x+7,bottom-1,9,1,'N');
    line(x+1,y+1,x+3,y+3,'E');line(far-1,y+1,far-3,y+3,'E');
    line(x+1,bottom-1,x+3,bottom-3,'D');line(far-1,bottom-1,far-3,bottom-3,'D');
  }else{
    // Built-up urushi lacquer, from nearly black to a narrow vermilion gleam.
    rect(x+1,y+1,w-2,2,'A');rect(x+1,y+2,2,h-4,'C');
    rect(x+3,y+1,12,1,'R');rect(x+1,y+5,1,6,'A');
    rect(far-2,y+3,2,h-5,'Q');rect(x+2,bottom-2,w-3,2,'Q');rect(x+5,bottom-1,12,1,'C');
  }
  rect(x+3,y+3,w-6,h-6,oak?'D':'B');rect(x+4,y+4,w-8,h-8,oak?'I':'W');
  rect(a.x-1,a.y-1,a.w+2,1,'H');rect(a.x-1,a.y,1,a.h,'G');
  rect(a.x+a.w,a.y,1,a.h+1,'F');rect(a.x,a.y+a.h,a.w,1,'F');
  if(oak)oakPrint(g);
  else{
    lacquerPrint(g);
    // Paired maki-e sprigs stay on the lacquer, outside the paper and photo.
    line(x+1,y+6,x+6,y+1,'O');rect(x+2,y+2,2,1,'J');rect(x+4,y+3,2,1,'O');rect(x+7,y+1,2,1,'J');
    line(far-7,bottom-1,far-1,bottom-5,'O');rect(far-4,bottom-1,2,1,'J');rect(far-2,bottom-6,1,2,'J');
  }
}

function makeSprite(paint){
  const g=drawing();paint(g);return g.finish();
}
const recordFrames=labelOrbit.map((_,phase)=>makeSprite(g=>turntable(g,phase)));
const sprites={
  neko:makeSprite(luckyCat),record:recordFrames[0],
  oak:makeSprite(g=>pictureFrame(g,'oak')),lacquer:makeSprite(g=>pictureFrame(g,'lacquer')),
};

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
  const aperture=frameData[sku].aperture,{w,h}=aperture;
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
  const left=Math.round(x+aperture.x*size),top=Math.round(y+aperture.y*size);
  const tw=Math.round(x+(aperture.x+w)*size)-left,th=Math.round(y+(aperture.y+h)*size)-top;
  ctx.imageSmoothingEnabled=false;ctx.drawImage(tile,left,top,tw,th);
  if(night>0){ctx.fillStyle='rgba(23,35,60,'+Math.min(.48,.48*night)+')';ctx.fillRect(left,top,tw,th);}
}

function drawDecor(ctx,{sku,x,y,size,night=0,selected=false,photo,onPhotoReady,stand=false,spinTime=null}){
  const art=sku==='record' && spinTime!==null ? recordFrames[Math.floor(spinTime/255)%recordFrames.length] : sprites[sku];
  if(!art)return;
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
export function drawRoomDecor(ctx,view,items,{night=0,highlighted,onPhotoReady,playingItemId=null,time=0,reducedMotion=false}={}){
  for(const spot of decorPlaces(view)){
    const item=items.find(i=>i.slot===spot.slot && Object.hasOwn(sprites,i.sku));
    if(item)drawDecor(ctx,{...item,x:spot.baseX,y:spot.baseY,size:spot.size,stand:spot.stand,night,onPhotoReady,
      selected:highlighted===spot.slot || highlighted===item.id,
      spinTime:playingItemId!=null && item.id===playingItemId && !reducedMotion ? Math.max(0,time) : null});
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
