import {placesFor} from './gardenLayout.js';
export {placesFor} from './gardenLayout.js';
// The apartment is one 800 × 320 game world. All scenery is drawn from live,
// integer-pixel geometry; the camera may travel between its two 400-pixel rooms.
export const BASE_WIDTH = 400;
export const BASE_HEIGHT = 320;
export const CAT_SEAT = {x:205,y:197,size:1};

function viewNumber(view) {
  if(view==='atelier'||view==='studio'||view==='right')return 1;
  const number=Number(view);
  return Number.isFinite(number)?Math.max(0,Math.min(1,number)):0;
}

const clamp = x=>Math.max(0,Math.min(1,x));
const rgb = c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const css = v=>'rgb('+v.map(x=>Math.max(0,Math.min(255,Math.round(x)))).join(',')+')';
const blend=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const paletteCache=new Map();
function palette(day,warmth){
  const key=Math.round(day*64)*65+Math.round(warmth*64);
  if(!paletteCache.has(key)){
    if(paletteCache.size>64)paletteCache.clear();
    const memo=new Map();
    paletteCache.set(key,c=>{
      if(c[0]!=='#')return c;
      if(!memo.has(c)){
        const base=rgb(c), dusk=base.map((v,i)=>v*[.34,.36,.48][i]+[13,18,28][i]);
        const out=blend(dusk,base,day).map((v,i)=>v*(1+warmth*[.08,-.015,-.12][i])+warmth*[5,1,0][i]);
        memo.set(c,css(out));
      }
      return memo.get(c);
    });
  }
  return paletteCache.get(key);
}

// Rects, pixels, ellipses and scanline polygons stay on the same low-res grid.
function tools(ctx,tint){
  function r(x,y,w,h,c){ctx.fillStyle=tint(c);ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function l(x,y,x1,y1,c,n=1){
    x=Math.round(x);y=Math.round(y);x1=Math.round(x1);y1=Math.round(y1);
    const dx=Math.abs(x1-x),dy=-Math.abs(y1-y),sx=x<x1?1:-1,sy=y<y1?1:-1;
    let error=dx+dy;ctx.fillStyle=tint(c);
    for(;;){ctx.fillRect(x,y,n,n);if(x===x1&&y===y1)break;
      const e=error*2;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
  }
  function p(coords,c){
    let low=Infinity,high=-Infinity;
    for(let i=1;i<coords.length;i+=2){low=Math.min(low,coords[i]);high=Math.max(high,coords[i]);}
    ctx.fillStyle=tint(c);
    for(let y=Math.ceil(low);y<high;y++){
      const hits=[];for(let i=0,j=coords.length-2;i<coords.length;j=i,i+=2){
        const ax=coords[j],ay=coords[j+1],bx=coords[i],by=coords[i+1],row=y+.5;
        if((ay>row)!==(by>row))hits.push(ax+(row-ay)*(bx-ax)/(by-ay));
      }
      hits.sort((a,b)=>a-b);
      for(let i=0;i<hits.length-1;i+=2){const a=Math.ceil(hits[i]-.5),b=Math.ceil(hits[i+1]-.5);
        if(b>a)ctx.fillRect(a,y,b-a,1);}
    }
  }
  function o(x,y,rx,ry,c){
    ctx.fillStyle=tint(c);x=Math.round(x);y=Math.round(y);rx=Math.round(rx);ry=Math.max(1,Math.round(ry));
    for(let v=-ry;v<=ry;v++){const span=Math.round(rx*Math.sqrt(Math.max(0,1-v*v/(ry+.3)**2)));
      ctx.fillRect(x-span,y+v,span*2+1,1);}
  }
  return {r,l,p,o};
}
// Small deterministic pattern variation, independent of the animation clock.
function hash(n){let h=Math.imul(n+109,2654435761);h^=h>>>16;return h>>>0;}
const wood={edge:'#483833',dark:'#60463b',shade:'#795442',mid:'#9c6c4e',lit:'#be8c63',gold:'#dfb280',pale:'#f0c999'};
function trim(b,x,y,w,h,grain=true){
  const {r,l}=b;
  r(x,y,w,h,wood.edge);r(x+1,y,w-2,1,wood.gold);r(x+1,y+1,w-2,Math.max(1,h-3),wood.mid);
  r(x+2,y+1,w-4,1,wood.lit);r(x+1,y+h-2,w-2,1,wood.shade);
  if(grain)for(let k=0;k<w/25;k++){
    const xx=x+6+hash(k+Math.floor(x))%Math.max(1,w-20);
    l(xx,y+2,Math.min(x+w-5,xx+4+hash(k+4)%10),y+2,k%2?wood.lit:wood.shade);
  }
}
function slat(b,x,y,h,w=5){
  b.r(x,y,w,h,wood.dark);b.r(x+1,y+1,w-2,h-2,wood.mid);
  b.r(x+1,y+1,1,h-3,wood.lit);b.r(x+w-2,y+2,1,h-3,wood.shade);
}

const floorWood={
  faces:['#bb9068','#c1976d','#bd9269','#c49a71'],joint:'#a17b5e',
  seam:'#a17a5b',edge:'#d3ab80',grain:['#b48965','#cca47c']
};
const ceilingWood={
  faces:['#cbaf89','#cdb18d','#c8ac87','#cfb490'],joint:'#b79a79',
  seam:'#ae9374',edge:'#d7be9b',grain:['#bda17f','#d3b996']
};

// All marks use room coordinates. The pattern wraps across each two-room suite
// so a long board continues through a room boundary and into its postcard.
function plankRow(b,roomX,y,height,row,across,wood){
  const suiteWidth=2*BASE_WIDTH,span=suiteWidth/across;
  const offset=hash(row*47+across)%Math.round(span);
  const first=Math.floor((roomX-offset)/span)-1;
  const last=Math.ceil((roomX+BASE_WIDTH-offset)/span);
  for(let n=first;n<=last;n++){
    const board=(n%across+across)%across,seed=row*79+board*29;
    const left=Math.round(offset+n*span)+hash(seed)%17;
    const nextSeed=row*79+((board+1)%across)*29;
    const right=Math.round(offset+(n+1)*span)+hash(nextSeed)%17;
    const width=right-left;
    b.r(left,y,width,height,wood.faces[hash(seed+5)%wood.faces.length]);
    b.r(left,y+1,1,height-1,wood.joint);
    if(seed%4===0 && height>5){
      const knot=left+Math.floor(width*.64);
      b.l(knot,y+4,knot+5,y+3,wood.grain[1]);b.r(knot+6,y+3,9,1,wood.grain[1]);
      b.l(knot+15,y+3,knot+20,y+4,wood.grain[1]);
    }
    for(let k=0;k<4;k++){
      const grain=hash(seed+k*97+13);
      const x=left+5+grain%(width-40);
      const gy=y+3+hash(seed*13+k*73)%Math.max(1,height-5);
      b.r(x,gy,7+(grain>>>12)%25,1,wood.grain[k%2]);
    }
  }
  b.r(roomX,y,BASE_WIDTH,1,wood.seam);
  b.r(roomX,y+1,BASE_WIDTH,1,wood.edge);
}

function paintPlanes(ctx,roomX,light,above,below){
  const b=tools(ctx,palette(light.day,light.warmth));
  let y=21;
  for(let row=0;y> -above;row++){
    const h=Math.min(31,8+row*3);
    y-=h;
    plankRow(b,roomX,y,h,row,4,ceilingWood);
  }
  for(let y=-46,step=80;y> -above-20;y-=step,step=Math.round(step*1.37)){
    const h=Math.round(4+Math.abs(y)*.024);
    b.r(roomX,y,BASE_WIDTH,h+3,'#b29a77');b.r(roomX,y,BASE_WIDTH,h,'#987454');
    b.r(roomX,y,BASE_WIDTH,2,'#c19a6d');b.r(roomX,y+h-2,BASE_WIDTH,2,'#816247');
  }
  y=214;
  for(let row=0;y<BASE_HEIGHT+below;row++){
    const h=Math.min(38,8+row*3);
    plankRow(b,roomX,y,h,row,row<5?5:4,floorWood);
    y+=h;
  }
  if(below){
    const shade=ctx.createLinearGradient(0,BASE_HEIGHT,0,BASE_HEIGHT+below);
    shade.addColorStop(0,'rgba(69,46,40,0)');shade.addColorStop(1,'rgba(69,46,40,.16)');
    ctx.fillStyle=shade;ctx.fillRect(roomX,BASE_HEIGHT,BASE_WIDTH,below);
  }
}
export function drawRoomDepth(canvas,index,light,above){
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const roomX=index*BASE_WIDTH;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.translate(-roomX,above);
  paintPlanes(ctx,roomX,light,above,canvas.height-BASE_HEIGHT-above);
  ctx.restore();
}

function structure(ctx,b,day,warmth,hour,camera){
  const {r,l,p}=b,end=Math.min(800,camera+420);
  r(camera,21,400,7,wood.dark);r(camera,21,400,1,wood.gold);
  r(camera,23,400,2,wood.mid);r(camera,28,400,2,'#bda780');r(camera,30,400,2,'#dbc69d');
  r(camera,32,400,139,'#eadbb7');r(camera,171,400,40,'#b1b49a');
  for(let x=(Math.floor(camera/31)-1)*31;x<end+30;x+=31){
    r(x,172,2,37,'#8d9988');r(x+2,174,1,34,'#cbd0ad');
    r(x+4,174,24,1,'#c1c5a8');r(x+27,175,1,26,'#a1ab94');
    if((x+10000)%3)r(x+11,180,1,20,'#abb096');
  }
  r(camera,168,400,4,'#867e64');r(camera,168,400,1,'#d4c69e');r(camera,170,400,1,'#ab9e7c');
  r(camera,207,400,8,wood.shade);r(camera,207,400,2,'#b89d77');r(camera,211,400,1,wood.mid);
  for(let i=0;i<500;i++){
    const x=hash(i*3)%800,y=35+hash(i*7+3)%131;
    if(x>=camera&&x<camera+400)r(x,y,1+hash(i+7)%3,1,i%4===0?'#eee1c2':'#e2d2af');
  }
  // Sun through the trees picks out the texture of the lime plaster.
  if(day>.3){
    const warm='rgba(255,245,201,'+(.13+warmth*.09)+')',soft='rgba(255,245,204,'+(.08+warmth*.06)+')';
    for(const a of [125,528]){
      p([a+28,32,a+60,32,a-8,168,a-42,168],soft);
      p([a+76,32,a+86,32,a+21,168,a+8,168],soft);
      for(let j=0;j<21;j++){
        const xx=a-60+hash(j*11+4)%80,yy=43+hash(j*17)%115;
        p([xx,yy,xx+4+j%8,yy,xx+2+j%8,yy+3,xx-3,yy+3],warm);
      }
    }
  }
  if(day>.25){
    const cast='rgba(255,225,155,'+(.11*day+warmth*.10)+')',shear=(hour-12)*2;
    // Sash shadows remain between four separately projected panes.
    for(const windowX of [121,535])for(let j=0;j<4;j++){
      const x=windowX+31*j;
      p([x,215,x+24,215,x+9+shear,249,x-20+shear,249],cast);
      p([x-24+shear,254,x+5+shear,254,x-22+shear,303,x-64+shear,303],cast);
    }
    for(const a of [30,456,666])for(let j=0;j<10;j++){
      const xx=a+hash(j+a)%57,yy=247+hash(j*7+3)%57;
      p([xx,yy,xx+6,yy,xx+3,yy+2,xx-2,yy+2],'rgba(255,230,178,.18)');
    }
  }
}

const skyPhases=[
  [0,'#28365a','#647493','#53677c','#b1b6c7'],
  [5,'#55567c','#b39aaa','#8b8296','#d4bec1'],
  [7,'#83adbb','#ffe0a7','#adc0a4','#fff0c9'],
  [12,'#75b3ca','#d4e9db','#91ada5','#fff1d8'],
  [16,'#86b6bf','#f0dda8','#a0b7a1','#fff0c5'],
  [19,'#997e9e','#f9bd85','#b19897','#ffdab1'],
  [21,'#4b5479','#9087a1','#758199','#b3a6bc'],
  [24,'#28365a','#647493','#53677c','#b1b6c7'],
];
function skyFor(hour){
  const h=((hour%24)+24)%24;let j=1;while(j<skyPhases.length-1&&h>skyPhases[j][0])j++;
  const a=skyPhases[j-1],b=skyPhases[j],t=(h-a[0])/(b[0]-a[0]);
  return [1,2,3,4].map(i=>blend(rgb(a[i]),rgb(b[i]),t));
}
function skyField({r,p,o},w,h,L,studio,[sky,horizon]) {
  for(let py=0;py<h;py+=3)r(0,py,w,3,css(blend(sky,horizon,py/h)));
  if(L.day>.36){
    const sunX=19+(L.hour+2)%16*(w-42)/16,sunY=11+Math.abs(L.hour-12)*2;
    o(sunX,sunY,7,7,css(blend(horizon,[255,240,186],.75)));o(sunX,sunY,5,5,'rgb(255,246,202)');
  }else{
    const mx=w*(studio?.34:.7);
    p([mx-4,8,mx,7,mx-1,11,mx,14,mx+4,16,mx+6,16,mx+3,19,mx,19,mx-5,16,mx-6,12], 'rgb(232,227,192)');
    for(let i=0;i<21;i++){const px=hash(i+9)%w,py=4+hash(i+62)%(h/2);
      r(px,py,1,1,i%5?'rgb(170,177,192)':'rgb(225,222,202)');}
  }
}

function clouds({p,r},w,moment,studio,[,horizon,mountain,white]) {
  // Clouds traverse both windows at distinct speeds, wrapping outside the reveal.
  for(let n=0;n<4;n++){
    const cx=((n*66+moment*(.0012+n*.00018)+(studio?47:4))%(w+87))-37,cy=11+(n*13)%24;
    p([cx,cy+4,cx+4,cy+2,cx+9,cy+2,cx+12,cy-1,cx+17,cy-1,cx+19,cy-4,
       cx+26,cy-4,cx+30,cy,cx+34,cy,cx+36,cy+3,cx+42,cy+3,cx+44,cy+5,cx,cy+5],css(white));
    r(cx+5,cy+5,34,1,css(blend(white,mountain,.24)));r(cx+12,cy+6,18,1,css(blend(white,horizon,.33)));
  }
}

function landscape({r,p,l},w,h,L,studio,[,horizon,mountain,white]) {
  const center=w*.58,base=h-22;
  if(!studio){
    p([-4,base+2,12,base-3,28,base,center-30,base-5,center-17,base-16,center-6,base-27,
      center-2,base-29,center+3,base-29,center+16,base-15,center+32,base-5,w-12,base-2,w+2,base-6,w+2,h,-4,h],css(mountain));
    p([center-16,base-16,center-6,base-27,center-2,base-29,center+3,base-29,center+16,base-15,
      center+10,base-18,center+6,base-20,center+3,base-18,center,base-23,center-4,base-20,center-7,base-22],css(blend(white,mountain,.32)));
  }
  const mid=css(blend(mountain,[66,105,100],.42)),far=css(blend(mountain,[58,94,81],.55));
  p([0,h-23,16,h-27,29,h-25,42,h-31,57,h-27,72,h-30,91,h-20,113,h-27,130,h-31,149,h-30,w+3,h-27,w+3,h,0,h],mid);
  for(let i=-1;i<w/6+1;i++){
    const xx=i*6,rr=3+hash(i+292)%5,yy=h-18-hash(i+9)%8;
    p([xx-rr,yy+4,xx-3,yy,xx-4,yy,xx-1,yy-3,xx,yy-rr,xx+2,yy-2,xx+4,yy,xx+3,yy,xx+rr,yy+4],far);
  }
  r(0,h-18,w,18,far);
  // Layered tile eaves, plaster gables, paper windows, tiny rain gutters.
  const plaster=css(blend(horizon,[198,171,134],.55)),roof=css(blend(mountain,[50,71,75],.72)),tile=css(blend(mountain,[107,136,135],.46));
  for(let i=0;i<4;i++){
    const xx=i*51-8+(studio?21:0),yy=h-10-[0,6,1,11][i],ww=[25,18,37,23][i];
    r(xx,yy,ww,20,plaster);
    p([xx-5,yy+1,xx+3,yy-6,xx+ww-6,yy-6,xx+ww+3,yy,xx+ww+1,yy+2,xx-5,yy+2],roof);
    l(xx+3,yy-6,xx+ww-6,yy-6,tile);
    for(let j=1;j<ww-7;j+=5)l(xx+j+4,yy-5,xx+j,yy-1,tile);
    r(xx+1,yy+2,ww-2,1,tile);
    for(let j=4;j<ww-2;j+=8)r(xx+j,yy+3,1,7,roof);
    for(let j=3;j<ww-3;j+=7){r(xx+j,yy+5,4,6,roof);r(xx+j+1,yy+5,2,5,L.day<.33?'rgb(224,181,115)':tile);}
  }
  if(studio){
    const px=w*.60,py=h-24;
    r(px-3,py-9,6,9,plaster);
    p([px-9,py-9,px-4,py-11,px,py-15,px+3,py-12,px+9,py-9,px+7,py-8,px-8,py-8],roof);
    r(px-1,py-18,1,4,tile);
    p([px-12,py-3,px-6,py-5,px,py-9,px+7,py-5,px+13,py-3,px+10,py-2,px-10,py-2],roof);
    r(px-6,py-2,13,5,plaster);r(px-4,py-2,2,5,roof);r(px+4,py-2,2,5,roof);
  }
}

function swallows({l},w,moment,L,[,,mountain]) {
  const far=css(blend(mountain,[58,94,81],.55));
  // Two swallows bank on their way across the valley.
  if(L.day>.35){
    for(let k=0;k<2;k++){
      const bx=((moment*.0022+56+k*8)%(w+34))-12,by=26+k*3+Math.round(2*Math.sin(moment*.0011+k));
      l(bx-2,by-1,bx,by,far);l(bx,by,bx+2,by-2,far);
    }
  }
}

function maple({r,p,o},w,moment,studio,[,,mountain]) {
  // An old maple branch at the outer edge frames the view; the canopy's
  // distant and sunlit clusters have independent, occasional one-pixel motion.
  const right=studio,edge=right?w:0,sign=right?-1:1;
  const q=(a,z)=>[edge+a*sign,z],shape=(coords,color)=>p(coords.flatMap(([a,z])=>q(a,z)),color);
  const canopy=css(blend(mountain,[61,112,90],.75)),leaf=css(blend(mountain,[93,143,89],.76)),
    lightLeaf=css(blend(mountain,[153,171,108],.72)),bark=css(blend(mountain,[71,76,61],.8));
  shape([[0,52],[4,50],[10,33],[20,24],[34,20],[46,15],[48,12],[31,17],[20,18],[9,25],[4,27],[8,7],[5,5],[0,20]],bark);
  for(let i=0;i<24;i++){
    const px=hash(i*31+4)%51,py=hash(i*19+7)%21+Math.max(0,14-px/3);
    const sx=moment && i%5===0?Math.round(Math.sin(moment*.0013+i)*.75):0;
    const [xx,yy]=q(px+sx,py);
    o(xx,yy,4+i%5,3+i%4,canopy);o(xx+sign,yy-2,3+i%4,2+i%2,leaf);
    if(i%2===0)r(xx-1,yy-4,3,1,lightLeaf);
  }
}

const outdoorCache=new WeakMap();
function makeBuffer(ctx,w,h) {
  const surface=ctx.canvas?.ownerDocument?.createElement('canvas') ??
    (typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):null);
  if(surface){surface.width=w;surface.height=h;}
  return surface;
}
function viewOutside(ctx,raw,x,y,w,h,L,moment,studio,drift){
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.translate(x,y);
  const tones=skyFor(L.hour), key=Math.floor(L.hour*60)+':'+Math.round(L.day*60);
  let slot;
  if(ctx.canvas){
    if(!outdoorCache.has(ctx.canvas))outdoorCache.set(ctx.canvas,[{},{}]);
    slot=outdoorCache.get(ctx.canvas)[studio?1:0];
    if(slot.key!==key){slot.key=key;slot.layers=new Map();}
  }
  function layer(id,paint,width=w) {
    if(!slot){paint(raw);return;}
    let buffer=slot.layers.get(id);
    if(!buffer){
      buffer=makeBuffer(ctx,width,h);
      if(!buffer){paint(raw);return;}
      paint(tools(buffer.getContext('2d'),c=>c));
      slot.layers.set(id,buffer);
    }
    ctx.drawImage(buffer,0,0);
  }
  layer('sky',brush=>skyField(brush,w,h,L,studio,tones));
  clouds(raw,w,moment,studio,tones);
  // Overscan the cached terrain so camera drift never exposes a blank edge.
  ctx.save();ctx.translate(drift-8,0);
  layer('terrain',brush=>landscape(brush,w+16,h,L,studio,tones),w+16);
  ctx.restore();
  swallows(raw,w,moment,L,tones);
  const leafFrame=moment?1+(Math.floor(moment/390)%10):0;
  layer('maple'+leafFrame,brush=>maple(brush,w,leafFrame*390,studio,tones));
  ctx.restore();
}

function windowFrame(ctx,b,x,y,w,h,clock,studio,outdoors) {
  const {r,l,p}=b;
  // Boxed reveal, diagonal inner jambs, recessed pair of sliding panels.
  r(x+3,y+3,w+6,h+6,'#c4ac89');r(x,y,w+3,h+4,wood.edge);
  p([x+1,y+1,x+w+1,y+1,x+w-6,y+7,x+7,y+7],wood.gold);
  p([x+1,y+1,x+7,y+7,x+7,y+h-5,x+1,y+h+1],wood.mid);
  p([x+w+1,y+1,x+w+1,y+h+1,x+w-5,y+h-5,x+w-5,y+7],wood.shade);
  p([x+1,y+h+1,x+7,y+h-5,x+w-5,y+h-5,x+w+1,y+h+1],wood.lit);
  if(outdoors)outdoors();
  else ctx.clearRect(x+8,y+7,w-14,h-13);
  const innerW=w-14,mid=x+8+Math.floor(innerW*(studio?.52:.54));
  for(const sx of [x+6,mid,x+w-6]){
    r(sx,y+6,3,h-10,wood.edge);r(sx,y+6,1,h-11,wood.gold);
  }
  // Deliberately asymmetrical shoji lights keep the mountain and sky open.
  const panelWidth=studio?25:30,sash=studio?x+w-panelWidth:x+panelWidth;
  r(sash,y+7,3,h-12,wood.shade);r(sash,y+7,1,h-12,wood.lit);
  const near=studio?sash+3:x+8;
  for(let j=1;j<4;j++){
    const cy=y+6+Math.floor((h-12)*j/4);
    r(near,cy,panelWidth-7,2,wood.shade);r(near,cy,panelWidth-7,1,wood.gold);
  }
  r(mid-3,y+h*.57,2,7,'#775c47');r(mid-4,y+h*.57,2,2,'#d2ae76');
  // Animated linen: its anchored rings are stationary; only the bottom
  // hem, pleats and sash respond to the breeze.
  function drape(dx,sign,width) {
    const sway=clock?Math.round(1.75*Math.sin(clock*.0013+dx*.024)):0;
    const bend=(a,z)=>[dx+sign*a+sway*((z-y)/h)**2,z];
    const curtain=(points,c)=>p(points.flatMap(([xx,zz])=>bend(xx,zz)),c);
    curtain([[0,y+2],[width,y+2],[width,y+12],[width-3,y+26],[width-7,y+41],[width-9,y+56],
      [width-6,y+69],[width-4,y+h-4],[width-7,y+h-1],[width-11,y+h-4],[width-14,y+h-1],[-1,y+h-2]],'#a79e85');
    curtain([[1,y+2],[width-1,y+2],[width-1,y+12],[width-4,y+26],[width-8,y+41],[width-10,y+56],
      [width-7,y+69],[width-5,y+h-5],[width-8,y+h-3],[width-11,y+h-6],[width-14,y+h-3],[0,y+h-4]],'#eee4c8');
    for(let j=2;j<width-2;j+=5){
      const [x0,y0]=bend(j,y+4),[x1,y1]=bend(j*.48,y+54),[x2,y2]=bend(j*.69,y+h-6);
      l(x0,y0,x1,y1,'#d2c7a7');l(x1,y1+3,x2,y2,'#c8bfa4');
      l(x0+sign,y0+1,x1+sign,y1-2,'#faf0d4');
    }
    const [a,yy]=bend(1,y+54),[e,zz]=bend(width*.52,y+57);
    for(let i=2;i<width-2;i+=4){const [hx,hy]=bend(i,y+h-6);r(hx,hy,2,1,'#c7ae90');}
    l(a,yy,e,zz,'#967552',2);l(a,yy,e,zz,'#c1a370');l(e,zz,e+sign*2,zz+5,'#a4895b');
  }
  if(!studio){drape(x-1,1,16);drape(x+w+1,-1,20);}
  else{
    // A woven roll blind in the atelier, with a weighted cord and stitched hem.
    r(x+3,y-3,w-4,12,'#a98b63');
    for(let yy=y-2;yy<y+8;yy+=3){r(x+5,yy,w-8,1,'#dbc69a');r(x+5,yy+1,w-8,1,'#c5ac7f');}
    r(x+5,y+9,w-8,2,'#a48e68');l(x+w-13,y+9,x+w-13,y+33,'#8f7d5e');
    for(const offset of [11,Math.floor(w/2),w-14]){r(x+offset,y-2,1,11,'#9e855f');r(x+offset+1,y,1,6,'#d4ba8f');}
    r(x+w-14,y+32,3,5,'#9e805f');r(x+w-13,y+33,1,3,'#d8b781');
  }
  trim(b,x-4,y-3,w+11,4,false);
  // Plant bases sit on this narrow extruded wooden sill.
  p([x-4,y+h,x+w+4,y+h,x+w+8,y+h+4,x-8,y+h+4],wood.gold);
  trim(b,x-8,y+h+4,w+16,5,false);
  for(const sx of [x+9,x+w-14])p([sx,y+h+9,sx+8,y+h+9,sx+1,y+h+15],wood.mid);
  if(!studio){
    // A little glass furin with an indigo paper sail responds to the same
    // cross-breeze as the gathered linen.
    const bellX=x+w-35,yy=y+12,motion=clock?Math.round(2*Math.sin(clock*.0012)):0;
    l(bellX,yy-6,bellX,yy+2,'#928b71');
    p([bellX-3,yy+8,bellX-3,yy+4,bellX-1,yy+2,bellX+1,yy+2,bellX+3,yy+5,bellX+3,yy+8],'#d4dfc4');
    r(bellX-4,yy+7,9,1,'#b7d0c3');r(bellX-3,yy+8,7,1,'#688d88');r(bellX-1,yy+9,3,2,'#b79e70');r(bellX-2,yy+5,1,2,'#f2ebce');
    l(bellX,yy+9,bellX+motion,yy+14,'#847b67');
    p([bellX+motion-1,yy+14,bellX+motion+1,yy+13,bellX+2*motion+1,yy+21,bellX+2*motion-1,yy+22],'#668a85');
  }
}

// Frames and linen are painted into transparent runtime layers. Their discrete
// pixel poses loop smoothly while the separately composed sky keeps travelling.
const frameCache=new WeakMap();
function casement(ctx,b,raw,x,y,w,h,L,clock,studio,drift) {
  const pose=clock?1+(Math.floor(clock/230)%20):0;
  let slot;
  if(ctx.canvas){
    if(!frameCache.has(ctx.canvas))frameCache.set(ctx.canvas,[{},{}]);
    slot=frameCache.get(ctx.canvas)[studio?1:0];
    const key=Math.round(L.day*64)*65+Math.round(L.warmth*64);
    if(slot.key!==key){slot.key=key;slot.poses=new Map();}
  }
  const variant=studio?0:pose;
  let buffer=slot?.poses.get(variant);
  if(!buffer){
    buffer=makeBuffer(ctx,w+23,h+24);
    if(buffer){
      const fb=buffer.getContext('2d');
      fb.translate(10-x,5-y);
      windowFrame(fb,tools(fb,palette(L.day,L.warmth)),x,y,w,h,variant*230,studio);
      slot?.poses.set(variant,buffer);
    }
  }
  if(buffer) {
    viewOutside(ctx,raw,x+8,y+7,w-14,h-13,L,clock,studio,drift);
    ctx.drawImage(buffer,x-10,y-5);
  }else{
    windowFrame(ctx,b,x,y,w,h,clock,studio,
      ()=>viewOutside(ctx,raw,x+8,y+7,w-14,h-13,L,clock,studio,drift));
  }
}

function book(b,x,base,width,height,colors,lean=0){
  const {r,p,l}=b;
  p([x+lean,base-height,x+width+lean,base-height,x+width,base,x,base],colors[0]);
  l(x+lean,base-height,x,base-1,'#5d554c');
  l(x+lean+1,base-height+1,x+width+lean-1,base-height+1,colors[1]);
  l(x+2+lean*.8,base-height+4,x+width-1+lean*.8,base-height+4,colors[1]);
  r(x+1+lean,base-height+2,Math.max(1,width-2),1,'#e0cfaa');
  r(x+1,base-5,width-1,3,colors[1]);r(x+2,base-4,1,1,'#7d6d57');
}
function paperStack(b,x,y,w,colors) {
  for(let i=0;i<colors.length;i++){
    b.r(x+i%2,y-i*3,w-i%3,3,colors[i]);b.r(x+1+i%2,y+1-i*3,w-2-i%3,1,'#dfcfa8');b.r(x+w-5,y-i*3,2,2,'#ab8270');
  }
}
function bookcase(b) {
  const {r,p,l}=b;const x=10,y=49,w=84,bottom=224;
  p([x+6,y+5,x+w+10,y+9,x+w+10,bottom+4,x+9,bottom+4],'#a98f72');
  // Visible right return and slatted dark cedar back make the open spaces deep.
  p([x+w-1,y+2,x+w+6,y-3,x+w+6,bottom-6,x+w-1,bottom+2],wood.shade);
  p([x-1,y,x+4,y-5,x+w+6,y-5,x+w+1,y],wood.gold);
  r(x,y,w,bottom-y,wood.edge);r(x+5,y+4,w-10,bottom-y-9,'#805d45');
  for(let sx=x+6;sx<x+w-6;sx+=12){
    r(sx,y+5,9,bottom-y-10,'#876348');r(sx+9,y+5,1,bottom-y-10,'#70533f');
    r(sx+2,y+7,1,bottom-y-23,'#916f52');
  }
  // Window-facing sides have different colors from the shadowed inner sides.
  p([x+3,y+3,x+9,y+8,x+9,bottom-8,x+3,bottom-3],wood.dark);
  p([x+w-4,y+3,x+w-9,y+8,x+w-9,bottom-8,x+w-4,bottom-3],wood.lit);
  for(const yy of [98,143,188,215]){
    p([x+9,yy-5,x+w-9,yy-5,x+w-4,yy,x+4,yy],wood.lit);
    l(x+10,yy-5,x+w-11,yy-5,wood.mid);
    trim(b,x+3,yy,w-6,5);r(x+8,yy+5,w-16,2,'#634b39');
  }
  trim(b,x-2,y-1,w+4,5);slat(b,x,y+3,bottom-y-4,5);slat(b,x+w-5,y+3,bottom-y-4,5);
  for(const sx of [x+3,x+w-9]){r(sx,bottom-2,6,7,wood.dark);r(sx+1,bottom-2,3,5,wood.mid);}
  for(const level of [53,100,145,190,217]){
    for(const post of [11,89]){
      r(post,level,3,2,'#70523d');r(post+1,level,2,1,'#c69c71');
    }
  }
  for(const xx of [23,44,65,84]){
    l(xx,56,xx,91,'#987858');l(xx+1,104,xx+1,135,'#967355');
  }
  book(b,19,95,5,22,['#647c70','#b7b991']);
  book(b,24,95,5,18,['#a07161','#d8af8a'],1);
  paperStack(b,76,138,10,['#a47960','#788974']);
  book(b,68,211,5,13,['#9a7f5f','#c9b285']);book(b,74,211,4,16,['#6b797e','#c4b599'],1);
  r(19,193,33,18,'#9f7352');r(21,195,29,13,wood.mid);
  l(22,196,48,196,'#c39a70');r(22,207,27,1,'#976e50');
  r(30,199,11,5,'#6f5743');r(31,199,9,1,'#c5a476');
  r(32,201,7,2,'#70563e');r(33,202,5,1,'#ad8860');
  // The rim, base, and arch share x37. Lash both handle ends over the rim.
  const willow='#79543c', honey='#c79d6b', straw='#e3c292';
  const band=(half,y,color)=>r(37-half,y,2*half+1,1,color);
  for(const [i,half] of [8,11,12,12,12,11,11,10,10,9,8].entries()){
    band(half,36+i,willow);
    if(i>=4 && i<=8){
      band(half-1,36+i,'#b5885c');
      for(let x=37-half+2+(i%2)*2;x<37+half-1;x+=5)
        r(x,36+i,Math.min(3,37+half-1-x),1,i%2?honey:'#d9b583');
    }
  }
  band(9,37,'#6d503c');band(10,38,'#906b4b');
  band(11,39,straw);band(9,45,'#ac8054');
  // Each row has paired edges, so the bend and the vertical ends mirror exactly.
  const arch=[3,5,7,8,9,10,10,10,10,10,10,10];
  arch.forEach((half,i)=>{
    const y=29+i;
    if(!i){band(half,y,willow);return;}
    const width=Math.max(2,half-arch[i-1]+2);
    for(const x of [37-half,38+half-width])r(x,y,width,1,willow);
    if(i===1)band(3,y,honey);
    if(i>=2 && i<=8){r(38-half,y,1,1,honey);r(36+half,y,1,1,'#bc9062');}
  });
  for(const x of [27,45]){
    r(x,38,3,5,'#896244');r(x,38,3,1,straw);r(x,40,3,1,honey);
    r(x+1,42,1,1,'#d5b082');
  }
  p([55,42,70,40,73,42,73,44,57,46],'#d5c29a');l(56,42,70,41,'#e9d8ad');
  r(66,41,2,3,'#ad7665');
}

function rug(b) {
  const {p,l,r}=b;
  // The indigo field and undyed sashiko stitches follow the floor perspective.
  const left=y=>Math.round(94-(y-226)*0.33),right=y=>Math.round(297+(y-226)*0.28);
  for(let y=226;y<=301;y++){
    const lx=left(y),rx=right(y),edge=Math.min(y-226,301-y);
    r(lx,y,rx-lx+1,1,'#525e63');
    if(edge>0)r(lx+1,y,rx-lx-1,1,'#aba991');
    if(edge>2)r(lx+4,y,rx-lx-7,1,'#667d80');
    if(edge>5)r(lx+8,y,rx-lx-15,1,'#536e76');
  }
  for(let row=0;row<4;row++){
    const y=239+row*15, lx=left(y)+13,rx=right(y)-13;
    for(let col=0;col<8;col++){
      const x=Math.round(lx+(col+.5)*(rx-lx)/8), ink=(row+col)%2?'#94a39a':'#b1b4a0';
      for(const sign of [-1,1]){
        l(x+sign*8,y,x+sign*6,y-1,ink);l(x+sign*4,y-2,x+sign,y-4,ink);
        l(x+sign*8,y+1,x+sign*6,y+2,ink);l(x+sign*4,y+3,x+sign,y+5,ink);
      }
    }
  }
  for(let x=left(301)+2;x<right(301);x+=5)l(x,302,x-1,304,'#d2c09e');

}

function sofa(b) {
  const {r,l,o} = b;
  const center=205, baySpacing=54, centers=[center-baySpacing,center,center+baySpacing];
  const wood={ink:'#504236',shade:'#77573e',face:'#a57a54',bevel:'#c69a6b',lit:'#dfb783'};
  const fabric={rim:'#496559',shade:'#597b6b',mid:'#789989',lit:'#93ad95',piping:'#a8bba0'};
  // Each timber profile is cut from one outline. Coordinates reflect pixel centers,
  // so both arms and their front and rear uprights have identical width at every row.
  function timberPair(left,right,y,height,color) {
    r(left,y,right-left+1,height,color);r(2*center-right,y,right-left+1,height,color);
  }
  function windowEdge(left,right,y,height,color) {
    r(left,y,1,height,color);r(2*center-right,y,1,height,color);
  }
  function rowsAt(x,y,halfWidths,color) {
    for (let row=0;row<halfWidths.length;row++) {
      const half=halfWidths[row];r(x-half,y+row,2*half+1,1,color);
    }
  }
  function rearPosts() {
    timberPair(118,122,176,46,wood.ink);
    timberPair(119,121,177,43,wood.shade);
    windowEdge(119,121,181,37,wood.face);
  }
  function backFrame() {
    // A bent oak crest rolls over the padded back. Both end stiles continue
    // down to the rear arm joints, so the crest stays legible in the full room.
    rowsAt(center,148,[78,81,83,84,85,86,87],wood.ink);
    r(118,155,175,24,wood.ink);
    rowsAt(center,149,[77,80,82,83,84],wood.bevel);
    r(129,149,152,1,wood.lit);
    rowsAt(center,151,[79,81,82,82,82],wood.face);
    r(124,155,163,2,wood.shade);
    // The upholstered panel sits inside the rail and remains visible above and
    // between the backs of the three loose cushions.
    rowsAt(center,156,[78,80,81,82],fabric.shade);
    r(123,160,165,26,'#567568');
    r(127,156,157,1,'#8ba18a');
    timberPair(118,122,155,24,wood.ink);
    timberPair(119,121,155,22,wood.face);
    windowEdge(119,121,156,19,wood.bevel);
    timberPair(119,121,155,1,wood.bevel);
    timberPair(120,121,158,1,wood.shade);
  }
  // Each cushion takes one third of the actual upholstered span at this depth.
  // The end cushions run underneath the arm caps, which are drawn last.
  function armEdge(y) {
    if (y<176) return 123;
    if (y<=194) return 124-Math.floor(Math.min(y-176,16)/2);
    return 117;
  }
  function cushionBounds(bay,y) {
    const left=armEdge(y), width=2*(center-left)+1;
    const cut=left+Math.round(width/3);
    if (bay===0) return [left,cut-1];
    if (bay===2) return [2*center-cut+1,2*center-left];
    return [cut,2*center-cut];
  }
  function drawCushion(bay,back) {
    const first=back?158:186, last=back?185:207;
    for(let y=first;y<=last;y++) {
      const [left,right]=cushionBounds(bay,y);
      const d=y-first, bottom=last-y;
      // Round just the loose corners at the two interior joints. At the arms
      // the upholstery compresses to the frame and has no freestanding outline.
      const corner=d===0?3:d===1||bottom===0?2:d===2||bottom===1?1:0;
      const a=left+(bay===0?0:corner), z=right-(bay===2?0:corner);
      const sideSeam=back?'#638375':'#698a77';
      r(left,y,right-left+1,1,sideSeam);
      r(a,y,z-a+1,1,fabric.shade);
      let face;
      if (back) {
        face=d===0?'#668575':d===1?'#8da593':bottom===0?'#5a796a':bottom<3?'#6a8a77':fabric.mid;
      } else {
        // Broad seat top, rounded piped nose, then the short vertical front.
        face=d===0?'#6d8d79':d===1?'#8ba58e':y<198?fabric.lit:bottom===0?'#5a7969':bottom<3?'#6c8c78':fabric.mid;
      }
      r(a+1,y,z-a-1,1,face);
      if (bay>0) r(a,y,1,1,'#526f61');
      if (bay<2) r(z,y,1,1,sideSeam);
    }
    const y=back?160:188;
    const [left,right]=cushionBounds(bay,y);
    const x=Math.round((left+right)/2);
    if (back) {
      l(left+3,y+4,left+6,y+1,'#8da796');r(left+7,y,right-left-15,1,'#98ad99');
      l(right-7,y,right-3,y+2,'#89a391');
      l(left+3,180,left+7,183,'#6d8d79');l(right-4,178,right-6,181,'#6b8978');
      for(let i=0;i<7;i++)r(x+(i*13)%37-18,165+(i*7)%13,1+i%2,1,'#809d8b');
    } else {
      r(left+5,y,right-left-11,1,'#9fb59a');
      l(left+2,189,left+5,y,'#9bb296');
      l(right-7,196,right-3,195,'#8ea990');
      r(x-10,192,2,1,'#91ac92');r(x+8,194,3,1,'#90aa90');
      // The front welt rolls down over the stuffing in the middle of each bay.
      // Its outer end disappears beneath the arm at the same height on each side.
      const [lipLeft,lipRight]=cushionBounds(bay,198);
      for(let sx=lipLeft+1;sx<lipRight;sx++) {
        const t=(sx-lipLeft)/(lipRight-lipLeft);
        const lip=197+Math.round(2*(1-(2*t-1)**2));
        r(sx,197,1,lip-196,fabric.lit);
        r(sx,lip,1,1,'#a7b99c');
        r(sx,lip+1,1,1,'#87a28d');
        if(t>0.15&&t<0.85)r(sx,204,1,1,'#789784');
      }
      // Short angled folds give the seat a slight pinch at each sewn corner.
      l(left+3,190,left+8,188,'#89a38b');
      l(right-6,189,right-4,190,'#8aa48b');
    }
  }
  function pillow(x) {
    // Shallow scoops beneath the four piped corners give the face a stuffed square
    // profile. The lower cheek rounds down into a short, compressed seat contact.
    const y=164;
    const rim='#9c7755',turn='#b28c62',shade='#c29c6d',oat='#d9b881',light='#e7c998',hem='#efdab0';
    const width=[10,13,15,15,14,14,15,15,16,16,16,16,16,16,16,15,15,14,14,15,14,11,7];
    rowsAt(x+2,y+2,width,'#5c7965');
    for(let i=0;i<width.length;i++){
      const h=width[i];
      if(i===0){r(x-12,y,10,1,rim);r(x+3,y,10,1,rim);continue;}
      r(x-h,y+i,2*h+1,1,rim);
      if(i>20)continue;
      const half=h-1;
      r(x-half,y+i,half*2+1,1,turn);
      if(i<3||i>19)continue;
      const edge=(i<7?2:3)+(i>16?1:0);
      r(x-half+1,y+i,2*half-edge,1,shade);
      if(i>17)continue;
      const crown=i<=5?half-3:i<15?half-2:half-4;
      r(x-crown-1,y+i,2*crown,1,oat);
    }
    // Long, curved light and seam catches turn with the stuffing rather than
    // boxing the pillow into a little picture frame.
    b.p([x-12,y+6,x-9,y+4,x-6,y+4,x-4,y+5,x+4,y+5,x+7,y+6,
      x+6,y+8,x+2,y+9,x-2,y+10,x-6,y+13,x-10,y+14,x-13,y+12], '#e4c38d');
    b.p([x+12,y+6,x+14,y+8,x+14,y+14,x+12,y+16,x+8,y+18,x+3,y+19,
      x-4,y+18,x-7,y+17,x-1,y+17,x+3,y+16,x+7,y+14,x+10,y+11], '#cba574');
    l(x-12,y+2,x-9,y+1,hem);r(x-9,y+1,5,1,hem);
    l(x-5,y+2,x-2,y+3,light);r(x-1,y+3,5,1,light);
    l(x+5,y+2,x+10,y+1,light);l(x+12,y+3,x+9,y+6,shade);
    l(x-13,y+3,x-10,y+5,'#c9a779');l(x-11,y+5,x-8,y+6,light);
    l(x-12,y+17,x-9,y+15,'#b99a70');l(x-10,y+17,x-7,y+16,light);
    l(x+12,y+17,x+10,y+16,turn);
    l(x-12,y+5,x-14,y+8,light);r(x-14,y+8,1,6,light);
    l(x-13,y+15,x-11,y+17,light);l(x-10,y+18,x-6,y+19,'#d7b986');
    l(x-5,y+20,x+6,y+20,'#caa878');l(x+7,y+19,x+11,y+17,'#bd9a6d');
    l(x+12,y+16,x+14,y+14,'#be986c');
    // A small covered button draws the cloth in from either side. Its window-lit
    // top and shaded lower lip use the same light direction on both cushions.
    l(x-4,y+10,x-2,y+11,'#c8a575');l(x+1,y+11,x+3,y+10,'#d0ac78');
    l(x-3,y+13,x-1,y+12,'#ead09c');l(x+1,y+12,x+3,y+13,'#dfbe89');
    r(x-1,y+10,3,3,'#ac885f');r(x-1,y+10,2,1,'#f0d79f');r(x-1,y+11,2,1,'#d6b27c');
  }
  function arms() {
    for(let y=176;y<=194;y++){
      const depth=y-176,outer=117-Math.floor(Math.min(depth,16)/2),inner=outer+6;
      timberPair(outer,inner,y,1,wood.ink);
      if(y===176||y===194)continue;
      timberPair(outer+1,inner-1,y,1,y<192?wood.bevel:wood.face);
      if(y<191)windowEdge(outer+1,inner-1,y,1,wood.lit);
    }
    // Each front stile is continuous from the underside of its nose to the floor.
    // The rails meet these uprights below the upholstered seat.
    timberPair(111,116,195,30,wood.ink);timberPair(111,115,225,4,wood.ink);
    timberPair(112,115,195,29,wood.face);timberPair(112,114,224,4,wood.face);
    windowEdge(112,115,196,27,wood.bevel);
    timberPair(113,114,198,2,wood.shade);windowEdge(113,114,198,1,wood.lit);
  }
  o(center,224,93,6,'rgba(54,43,37,.19)');
  backFrame();
  rearPosts();
  // The low load-bearing rail spans the three bays and meets both front stiles.
  r(114,207,183,10,wood.ink);
  r(116,208,179,7,wood.face);r(117,208,177,1,wood.bevel);r(117,215,177,1,wood.shade);
  for(const post of [118,290]){
    r(post,210,3,3,wood.shade);r(post,210,2,1,wood.bevel);
  }
  for(let bay=0;bay<3;bay++) drawCushion(bay,true);
  for(let bay=0;bay<3;bay++) drawCushion(bay,false);
  pillow(centers[0]);pillow(centers[2]);
  arms();
}

// The shade's bamboo winding follows a hand-cut, asymmetric native pixel contour.
const lampWidths = [
  5,7,8,10,11,12,13,14,15,15,16,16,17,17,17,18,18,18,18,18,
  18,18,17,17,17,16,16,15,15,14,13,12,11,10,8,7,5,
];
const lampPigments = [
  ['#91785b','#a27049'], // outside edge
  ['#bea88a','#d39360'], // paper turning away
  ['#d8c7a9','#ecb979'],
  ['#e9dbbc','#f8d18d'],
  ['#f3e8cc','#ffdfa4'],
  ['#f9efd6','#ffe9b5'], // soft light through the paper
  ['#ae9679','#c58d5f'], // thin bamboo winding
  ['#c3ad8d','#daa46c'],
  ['#d4c2a2','#eabd80'],
  ['#e1d2b4','#f4d299'],
].map(pair=>pair.map(rgb));

function paintLampShade(raw,x,top,bulb){
  const paper=lampPigments.map(([unlit,lit])=>css(blend(unlit,lit,bulb)));
  // Vary each band with the shrinking cross-section. The front-left remains a
  // broad, calm expanse of washi; the right seam turns into the room's shade.
  for(let row=0;row<lampWidths.length;row++){
    const radius=lampWidths[row],left=x-radius,width=2*radius+1,yy=top+row;
    const shoulder=Math.max(0,5-row, row-30)/8;
    const stations=[0,.035,.11+shoulder*.07,.22+shoulder*.12,.37+shoulder*.12,
      .57-shoulder*.17,.71-shoulder*.10,.84-shoulder*.05,.95,1];
    const colors=[0,2,3,4,5,4,3,2,1];
    for(let k=0;k<colors.length;k++){
      const start=Math.round(width*stations[k]),end=Math.round(width*stations[k+1]);
      if(end>start)raw.r(left+start,yy,end-start,1,paper[colors[k]]);
    }
  }
  // The descending spiral bows across the front. The stitches share the paper's
  // varying value so the thin ribs remain visible both in sun and when backlit.
  for(const row of [3,8,14,20,26,31,34]){
    const radius=lampWidths[row],yy=top+row;
    const a=Math.round(radius*.72),inner=Math.round(radius*.43);
    raw.l(x-radius+1,yy,x-a,yy+1,paper[7]);
    raw.l(x-a+1,yy+1,x-inner,yy+2,paper[8]);
    raw.r(x-inner+1,yy+2,2*inner,1,paper[9]);
    raw.l(x+inner+1,yy+2,x+a,yy+1,paper[8]);
    raw.l(x+a+1,yy+1,x+radius-1,yy,paper[6]);
  }
  for(const [dx,dy,w] of [[-6,10,3],[-9,18,2],[0,24,3],[4,12,2],[-4,30,2]])
    raw.r(x+dx,top+dy,w,1,paper[5]);
}

const lampShadeLayers=new WeakMap();
function drawLampShade(ctx,raw,x,top,bulb){
  if(!ctx.canvas){paintLampShade(raw,x,top,bulb);return;}
  const level=Math.round(bulb*255);
  let cached=lampShadeLayers.get(ctx.canvas);
  if(!cached || cached.level!==level){
    const tile=cached?.tile || makeBuffer(ctx,37,lampWidths.length);
    if(!tile){paintLampShade(raw,x,top,bulb);return;}
    const ink=tile.getContext('2d');
    ink.clearRect(0,0,tile.width,tile.height);
    paintLampShade(tools(ink,c=>c),18,0,level/255);
    cached={level,tile};lampShadeLayers.set(ctx.canvas,cached);
  }
  ctx.drawImage(cached.tile,x-18,top);
}

function lamp(ctx,b,raw,day) {
  const {r,l,o}=b,x=347,top=112;
  const span=(y,radius,h,color)=>r(x-radius,y,2*radius+1,h,color);
  // Dim the incandescent fill continuously against the changing ambient daylight.
  const dusk=clamp((.86-day)/.76),bulb=dusk*dusk*(3-2*dusk);
  if(bulb>0){
    for(let j=0;j<6;j++)raw.o(x+1,top+20,40-j*4,44-j*5,'rgba(255,185,106,'+(.028*bulb)+')');
    raw.o(x+3,219,18,4,'rgba(245,173,96,'+(.035*bulb)+')');
  }

  // Turned walnut foot. The face and pierced center use the same axis as the spindle.
  o(x+4,221,15,3,'rgba(67,46,42,.16)');
  o(x+2,221,11,2,'rgba(56,39,34,.22)');
  o(x,219,12,3,'#51433b');
  span(217,12,2,'#675044');
  o(x,217,12,3,'#906849');
  o(x,216,10,2,'#ac8157');
  l(x-10,217,x-5,218,'#be9160');r(x-4,219,9,1,'#8b6548');
  r(x+5,217,4,1,'#9a724e');

  // All weight-bearing spans have an odd width and share the x347 center pixel.
  // The turned shaft rises out of a stepped boss on the top surface of the foot.
  span(154,2,49,'#695344');
  span(154,1,49,'#a07953');r(x,154,1,43,'#b58a60');
  span(203,3,7,'#6b5544');span(203,2,7,'#a07953');r(x-1,203,2,5,'#b18a60');
  span(209,3,2,'#80694b');span(209,2,1,'#c29a67');
  span(211,3,2,'#806248');span(211,1,2,'#a78058');
  span(213,4,2,'#705540');span(213,2,2,'#ad855b');
  span(215,5,2,'#72563f');span(215,4,1,'#b38a5b');
  r(x,211,1,4,'#b99165');
  if(bulb>0){
    raw.r(x,155,1,9,'rgba(246,186,114,'+(.28*bulb)+')');
    raw.r(x,164,1,9,'rgba(246,186,114,'+(.13*bulb)+')');
  }

  drawLampShade(ctx,raw,x,top,bulb);
  // Flush bamboo top cap and a shallow brass socket that cups the bottom paper hoop.
  span(top-1,4,2,'#755e47');span(top-1,3,1,'#977957');
  const socket=top+34;
  // The rim's shoulders rise around the paper. Its front lip crosses the shade
  // before the socket tapers into the upright, keeping contact visible at room scale.
  r(x-8,socket,2,2,'#846346');r(x+7,socket,2,2,'#846346');
  span(socket+1,8,2,'#75573f');
  span(socket+1,6,1,'#b78b58');span(socket+1,3,1,'#d7b780');
  span(socket+3,7,1,'#816245');span(socket+3,5,1,'#ae8354');
  span(socket+4,6,1,'#76593f');span(socket+4,4,1,'#aa8053');
  span(socket+5,5,1,'#71553f');span(socket+5,3,1,'#a07b52');
  span(socket+6,4,1,'#705640');span(socket+6,2,1,'#9c7953');
  span(socket+7,3,2,'#735d45');span(socket+7,2,1,'#b69462');
  span(socket+9,2,1,'#786047');span(socket+9,1,1,'#a48158');
  if(bulb>0){
    raw.r(x-6,socket+1,13,1,'rgba(248,184,103,'+(.50*bulb)+')');
    raw.r(x-3,socket+3,7,1,'rgba(238,164,90,'+(.31*bulb)+')');
    raw.r(x-1,socket+7,3,1,'rgba(236,169,95,'+(.30*bulb)+')');
  }
}

function coffee(b){
  const {r,p,l,o}=b;
  const deep='#594437',dark='#70513e',shade='#8b6247',end='#976e50',
    face='#ac7b55',edge='#bd8b60',honey='#c89a6c',pale='#dbb183';

  // Both end frames are stamped from the same native cuts. The coordinates
  // reflect exactly across x194.5. Each shoulder sits against the slab apron.
  p([136,259,246,259,261,274,260,277,249,279,140,278,130,275],'rgba(75,50,43,.16)');
  for(const [center,facing] of [[141,1],[248,-1]]){
    const cast=[-8,276,0,265,9,264,11,266,5,278,3,280,-7,280];
    p(cast.map((n,i)=>i%2?n:center+facing*n+2),'rgba(66,45,38,.19)');
  }

  const trestle=[
    '..DDDDDDDDDDDDDDDDDD...',
    '..DMMMMMMMMMMEEDDDDD...',
    '..DEEEEEEEEEEEEDDDDD...',
    '..DDDDDDDDDDDDDBBBQD...',
    '.....DKKKKKKKDBBBBQD...',
    '.....NFFFFFFIBBBBBQD...',
    '.....FNFFFFIFBBBBBQD...',
    '.....FNFFFFIBBBBBBQD...',
    '......NFFFFIBBBBBBQD...',
    '......NFFFFIBBBBBQBD...',
    '......NFFFFIBBBBBQDBKK.',
    '......FFFFFIBBBBBBDBBK.',
    '......FFFFFFBBBBBDBBKK.',
    '......FFFFFFBBBBDDBBK..',
    '.....DFFFFFBBBBBDBBKK..',
    '.....DFFFFFBBBBDBBKK...',
    '....KDNFFFIBBBDBBBKK...',
    '...KDNFFFFIFBDDBBKK....',
    '..KBDNFFFFFIDDBBKK.....',
    '..BDDNFFFFFIDDBBKK.....',
    '.BBDFMMMMMMMFBFKK......',
    'KFHDDDDDDDDDDFFKK......',
    'KFMMMMMMMMMMFFKK.......',
    '.FFEPPPEEEEEFFK........',
    '.KKDDDDDDDDDDKK........',
    '...KKKKKKKKKKK.........',
  ];
  const common={
    K:'#594536',D:'#75553e',S:'#8c6549',E:'#986f50',F:'#ae7e57',
    M:'#bd8d64',H:'#cea375',P:'#966e4d',Q:'#684e3d',
  };
  for(const [center,facing] of [[141,1],[248,-1]]){
    // The shoulders, posts and returning feet match on both. Only
    // the two vertical bevels respond to which way they face the window.
    const ink=facing===1?{...common,B:'#805f46',N:'#b78a61',I:'#9e7957'}:
      {...common,B:'#88674d',N:'#aa805a',I:'#b1845c'};
    for(const [v,row] of trestle.entries()){
      for(let col=0;col<row.length;){
        const first=col,shade=row[col++];
        while(col<row.length && row[col]===shade)col++;
        if(shade==='.')continue;
        const from=facing===1?first:col-1;
        r(center+(from-9)*facing,254+v,col-first,1,ink[shade]);
      }
    }
  }

  // Slab and shaped underside. The lip steps down to a half-bevel on the near
  // face; two small support caps bear onto the posts immediately below it.
  p([128,249,260,249,259,255,256,257,132,257,129,256],dark);
  r(144,256,100,1,'#875e43');
  p([128,249,260,249,260,253,256,256,130,256,123,253,123,249],deep);
  p([125,249,265,248,265,252,261,255,131,255,125,253],shade);
  p([129,250,263,250,261,254,131,254,126,252],face);
  l(133,254,258,254,'#8e6449');l(136,253,170,253,'#b38057');
  l(220,253,247,253,'#b38057');

  // A planed keyaki slab. The two far corners and the longer near arris
  // project into the same tabletop plane as both existing plant anchors.
  p([133,238,137,237,251,237,255,238,264,245,267,248,267,250,263,253,
    128,253,123,251,122,248,124,246],dark);
  p([134,238,252,238,255,239,264,246,265,248,262,251,
    129,251,124,249,124,247],honey);
  p([134,239,252,239,258,242,130,242], '#c2976c');
  p([130,243,258,243,263,246,126,246],'#cda174');
  p([126,247,263,247,264,248,261,250,129,250,125,249],'#bd9065');
  // A few long, branching grain ribbons keep the broad center quiet. Their
  // closed ends follow the grain of the board and the perspective of the top.
  l(139,239,157,239,'#d1a77d');l(160,239,175,239,'#c69b70');
  l(144,242,167,242,'#b2855f');l(167,242,173,241,'#b2855f');
  l(173,241,184,241,'#bb8e63');r(131,243,11,1,'#d4aa7a');
  l(182,246,194,246,'#b98c63');l(194,246,206,244,'#b98c63');
  l(206,244,219,244,'#b98c63');l(219,244,224,245,'#b98c63');
  l(198,246,207,245,'#d8ad7d');r(208,245,7,1,'#d8ad7d');
  r(225,241,17,1,'#c99e72');r(150,248,23,1,'#c89d70');
  l(132,251,258,251,pale);r(174,251,21,1,'#c99c6c');
  l(258,251,264,248,'#d0a271');l(124,248,128,250,'#d4a674');

  // The teacup sits on the near corner of the table.
  // All oval rows share the same horizontal center. Paint the open handle behind the bowl.
  const center=255;
  function band(y,half,color){r(center-half,y,half*2+1,1,color);}
  band(245,6,'#a3aa8e');band(246,9,'#e9dfbd');band(247,10,'#f1e4c4');
  band(248,9,'#aeb49b');band(249,6,'#8e8b75');
  r(260,240,4,1,'#739088');r(263,241,2,3,'#739088');r(260,244,4,1,'#739088');
  band(239,4,'#d9dfc5');band(240,6,'#e3e8cb');r(center-4,240,9,1,'#836e51');
  band(241,6,'#abc8b3');band(242,5,'#98b6a6');band(243,5,'#98b6a6');
  band(244,4,'#88a899');band(245,3,'#78968a');band(246,2,'#6d877e');

}

function cabinet(b,x,y,w,h){
  const {r,l,p}=b;
  p([x+3,y+3,x+w+5,y+4,x+w+4,y+h+3,x+3,y+h+3],'#987d63');
  r(x,y,w,h,wood.dark);r(x+3,y+3,w-6,h-6,'#ab805b');
  p([x+w-2,y+1,x+w+4,y-3,x+w+4,y+h-4,x+w-2,y+h],wood.shade);
  for(let j=0;j<2;j++){
    const dx=x+4+j*(w-8)/2,dw=(w-11)/2;
    r(dx,y+5,dw,h-10,wood.shade);r(dx+2,y+6,dw-4,h-13,'#bc9068');
    const door=Math.round(dx),span=Math.floor(dw);
    r(door+3,y+8,span-6,h-19,'#84674e');
    for(let i=4;i<span-5;i+=6){
      r(door+i,y+8,3,h-19,'#bb9366');r(door+i,y+8,1,h-19,'#d0aa79');
    }
    r(door+2,y+h-12,span-4,4,'#b58b63');l(door+3,y+h-8,door+span-3,y+h-8,'#977150');
    const pull=door+(j?3:span-8);
    r(pull,y+15,5,7,'#654e3e');r(pull+1,y+16,3,5,'#c7a575');r(pull+2,y+17,1,3,'#806347');
  }
  p([x-2,y,x+3,y-6,x+w+4,y-6,x+w+3,y,x,y+2],wood.gold);
  l(x+4,y-6,x+w+2,y-6,wood.mid);
  trim(b,x-2,y,w+5,4);
  for(const xx of [x+3,x+w-8]){r(xx,y+h,5,6,wood.dark);r(xx+1,y+h,2,4,wood.mid);}
}
function studioShelves(b) {
  const {r,p,l}=b;
  for(const [x,y,w] of [[417,82,77],[421,131,78]]){
    r(x+4,y+6,w-1,3,'#c2ab89');
    for(const [bx,dir] of [[x+4,1],[x+w-7,-1]]){
      r(bx,y+3,3,14,'#7c6953');l(bx+1,y+15,bx+1+dir*8,y+5,'#9a8060',2);
      l(bx+1,y+14,bx+1+dir*8,y+5,'#c6a073');
      r(bx+1,y+6,1,1,'#e0c393');r(bx+1,y+14,1,1,'#6b5645');
    }
    p([x-1,y,x+3,y-5,x+w,y-5,x+w+2,y],wood.gold);
    l(x+3,y-5,x+w-1,y-5,wood.lit);trim(b,x-1,y,w+4,5);
  }
  book(b,479,79,4,12,['#b88371','#d4ab82']);
  book(b,483,79,4,15,['#759383','#b9ba90'],1);
  paperStack(b,427,128,15,['#9d745e','#75847b']);
  cabinet(b,410,182,82,38);
  p([477,178,487,178,488,183,486,197,476,197,477,184],'#73958b');
  for(const xx of [478,482,485])l(xx,184,xx-1,194,'#adc1a1');
  for(let y=186;y<195;y+=3){l(477,y,486,y-1,'#90b0a1');}
  r(476,195,10,1,'#e0d3ac');for(let i=0;i<5;i++)r(476+i*2,197,1,2,'#b9be9d');
}
function studioDesk(b) {
  const {r,p,l,o}=b;
  o(600,233,85,6,'#a08365');
  // The underside, solid trestle joinery and box drawers show the workstation's depth.
  // Two trestles each have a rear foot above the front contact line.
  for(const x of [513,664]){
    p([x+13,185,x+18,185,x+20,223,x+16,223],wood.shade);
    p([x,187,x+7,187,x+4,231,x-1,231],wood.dark);
    l(x+2,191,x,229,wood.lit);r(x,226,4,1,wood.mid);
    l(x+3,215,x+16,207,wood.mid,3);
  }
  r(518,190,151,6,'#996f4e');r(519,191,148,1,'#bd966b');
  r(638,192,38,32,'#76583f');
  for(let j=0;j<3;j++){
    const y=194+j*9;r(640,y,34,8,'#b99065');r(641,y,32,1,'#d5ab79');
    r(652,y+2,10,3,'#745b47');r(653,y+2,8,1,'#d8b784');
  }
  p([503,185,510,178,678,178,685,185,684,190,503,190],wood.dark);
  p([503,185,510,178,678,178,685,185,682,187,505,187],wood.gold);
  r(505,187,179,2,wood.mid);r(512,179,163,1,wood.pale);
  l(520,183,539,183,'#bf966b');l(540,183,547,182,'#bf966b');l(548,182,565,182,'#bf966b');
  // The Leaf Book occupies the clear desk surface beside the brushes.
  // Three different brush tips rise from inside a thrown celadon beaker.
  o(670,183,8,2,'#a18164');
  o(670,173,7,2,'#58726a');o(670,173,5,1,'#474f42');
  l(667,173,662,161,'#936744');l(662,161,660,157,'#d6b888');
  p([660,158,657,154,657,151,660,153,662,157],'#514738');
  l(671,173,671,158,'#926f50');r(670,156,3,4,'#c0a481');
  p([669,156,669,153,671,149,672,152,672,156],'#6c5445');
  l(673,173,678,162,'#786449');l(678,162,679,159,'#c6aa78');
  p([678,160,679,156,682,154,681,158,680,161],'#654d40');
  p([663,173,677,173,675,182,673,183,667,183,665,182],'#53756e');
  p([664,174,676,174,674,181,667,181],'#91aba0');
  r(664,174,12,1,'#c6cfac');l(666,175,667,179,'#b4caba');r(668,182,5,1,'#8d7257');
  // The rear foot lands higher. Both front legs use the same taper and splay.
  const sx=603,sy=220;
  o(sx,246,18,3,'#9b8063');
  r(sx-2,sy,5,21,'#795b47');r(sx-1,sy+3,2,16,'#9e7757');
  l(sx-12,sy+18,sx,sy+12,'#8c684e',2);
  l(sx,sy+12,sx+12,sy+18,'#8c684e',2);
  for(const sign of [-1,1]){
    for(let dy=1;dy<=26;dy++){
      const x=sx+sign*(9+Math.floor(dy/5)),w=dy<8?5:dy>22?3:4;
      r(x-2,sy+dy,w,1,'#77563f');r(x-1,sy+dy,w-2,1,'#bd9068');
    }
  }
  o(sx,sy+1,18,5,'#73563f');o(sx,sy,18,4,'#a57b57');
  o(sx,sy-2,18,4,'#d7ad79');o(sx,sy-2,15,3,'#c69b6c');
  l(sx-11,sy-3,sx+1,sy-3,'#dab583');r(sx+2,sy-2,7,1,'#bd9064');

}
const camelliaStudy={
  x:3,y:4,
  inks:{
    k:'#645b4a',b:'#8b7558',i:'#aa926d',s:'#4c6757',g:'#65816b',
    m:'#839673',h:'#a4ac83',u:'#923f3e',r:'#b64d43',v:'#cd604c',
    p:'#df8062',f:'#eab48b',t:'#b88849',y:'#e8bd69',
  },
  rows:[
    '........................uuuu.............',
    '.......................uuuvuu..u.........',
    '......................uuvvvvvuuur........',
    '......................uuvvvvvuurpru......',
    '.....................urrrvvvvvppppr......',
    '..............u.....urpppvvvvvppppru.....',
    '............uvvu....rpvvvvvvuuupppu......',
    '............uvuu...urvvvvvftttfppru......',
    '...........uvuuu...urvvvvttytytpvvvru....',
    's...........uuugg...rrvvvtytytvvvvvvu....',
    'sgsssss....guuugg...urvvvvttttvvvvvru....',
    '.sgggggs....ggggg...urrrvvvtvvvvvvvru....',
    '.sshgggmsss.ggggg...uurrvpvvvvrvrruu.....',
    '..sshhggggs...g.b....urrrvpppvruuuu.sssss',
    '..sssghgggss....b.....uuuuvvvvuussssgggs.',
    '...ssgghgggs.....b......buuvrrussggggss..',
    '....ssgghgggs.....b.....bkuuuuggggmmss...',
    '....ssssghhgss....b....bk...ggggmmssss...',
    '.....ssssggggs.....b..bk...sggmmsssss....',
    '.......sssssgs.....b.bk....gmmsssss......',
    '........s...bs......bbbb..smssssss.......',
    '..............b.....bk..bbsssss..........',
    '...............bb...bk...................',
    '.................bbbk....................',
    '..........g........bk....................',
    '..........ggg......ik....................',
    '.........gmgg.....ik.....................',
    '.........gmgg.....ik.....................',
    '.........gmggg...ik......s...............',
    '.........gmggg..bk...sgggggssss..........',
    '........gmggg..bk...bssmmggggsss.........',
    '........gmggg.bbbbbb..sggmmmgggss........',
    '.........ggggbk.......ssssssmmggggs......',
    '.........ggg.bk.........ssssssggggggs....',
    '...........gik...........sssssssssss.....',
    '..........ibk................s...........',
    '.........ikk........................rrr..',
    '.......bkk..........................r.r..',
    '......bk............................prr..',
    '....................................rrr..',
  ],
};

function easel(b) {
  const {r,p,l,o}=b,x=741;
  const ink='#634d3e',walnut='#856345',beech='#ae8054',edge='#c39969',gold='#d7b07c';

  // The third leg swings backward from a single pivot, landing on the more
  // distant part of the floor. Each of the two main legs has the same front cut.
  p([711,228,744,215,754,214,772,230,769,234,714,234],'rgba(64,46,38,.12)');
  o(749,217,8,2,'rgba(60,44,37,.20)');
  p([738,123,743,122,751,215,750,217,746,217],ink);
  p([739,126,741,126,750,214,747,215],'#926c4d');
  r(746,216,5,1,'#6e5740');
  // Each stave widens toward its front foot. Identical native scanlines keep
  // the pairing readable even after the canvas and the tray cover the middle.
  for(const side of [-1,1]){
    const foot=x+side*28;
    o(foot+2,232,6,1,'rgba(62,45,40,.20)');
    for(let y=103;y<=231;y++){
      const spread=Math.round(3+(y-103)*25/128),width=y<162?4:5;
      const left=x+side*spread-2;
      r(left,y,width,1,ink);
      r(left+1,y,width-2,1,beech);r(left+1,y,1,1,edge);
      if(width===5)r(left+3,y,1,1,'#936b4b');
    }
    r(foot-2,230,5,2,'#775f49');r(foot-1,230,3,1,'#a3825b');
  }

  // Crosspiece under the carriage. Both pin heads enter the front staves,
  // while the darker rear foot stays beyond it.
  r(721,187,41,4,ink);r(722,187,39,1,edge);r(722,188,39,2,'#9d754f');
  for(const pin of [722,760]){r(pin-1,187,3,3,'#806445');r(pin,187,1,1,'#ddbc82');}
  // Sliding mast with a short visible rack, held by the lower carriage block.
  r(x-3,92,7,94,ink);r(x-2,93,5,92,beech);r(x-2,93,1,92,edge);
  r(x-2,91,5,2,'#a17a55');r(x-1,91,3,1,gold);
  for(let yy=97;yy<113;yy+=4)r(x,yy,2,1,'#805e43');
  r(x-5,182,11,7,walnut);r(x-4,182,9,2,edge);
  r(x-2,184,5,3,'#755e45');r(x-1,184,3,2,'#b49262');r(x,184,1,1,'#e3c28a');

  // A wrapped cream sheet with restrained paper tooth. The shallow shadowed
  // right and bottom edges show the board thickness; the art is native pixels.
  r(714,115,54,53,'#776953');
  r(715,114,52,53,'#b6a58a');r(715,114,51,52,'#eaddbd');
  // One pixel of backing board remains above the sheet, growing darker
  // toward the shaded corner. The clamp jaw covers its center when drawn last.
  r(715,114,51,1,'#c5b295');r(716,114,15,1,'#cfbfa1');
  r(756,114,10,1,'#b7a286');r(766,115,1,2,'#ad987d');
  r(716,115,49,50,'#f5e9cd');
  r(716,115,49,1,'#fbefd4');r(716,116,1,47,'#f4e4c6');
  r(716,165,49,1,'#ded0b1');r(765,116,1,49,'#d6c6a5');
  for(const [dx,dy,w] of [[3,3,4],[36,3,3],[2,29,2],[33,45,3],[10,47,3]])r(716+dx,115+dy,w,1,'#efe2c6');
  for(const [row,pixels] of camelliaStudy.rows.entries()){
    for(let col=0;col<pixels.length;){
      const first=col,c=pixels[col++];
      while(col<pixels.length && pixels[col]===c)col++;
      if(c!=='.')r(716+camelliaStudy.x+first,116+camelliaStudy.y+row,col-first,1,camelliaStudy.inks[c]);
    }
  }

  // The board sits behind the upturned shelf lip. Both matching ends cap its
  // grain, and a squared jaw overlaps the board at its upper edge.
  p([711,166,768,166,772,169,772,172,711,172,709,170],ink);
  p([712,166,768,166,770,168,710,168],gold);
  r(710,168,62,2,beech);r(711,168,59,1,'#c99563');
  r(712,170,58,1,'#986d4d');r(715,169,16,1,'#bf8b5e');r(754,169,11,1,'#a47652');
  r(735,109,13,7,ink);r(736,109,11,2,edge);r(736,111,11,3,beech);
  r(736,114,11,2,'#8c6549');r(737,114,9,1,'#c39a69');
  r(x-1,110,3,3,'#816744');r(x-1,110,2,2,'#bfa673');r(x-1,110,1,1,'#e9d399');
}
function hangingPrints(b){
  const {r,l,p,o}=b;
  // Two botanical field studies clipped to a walnut rail.
  trim(b,706,45,65,4,false);
  for(const [x,y,w,h] of [[710,53,28,31],[743,55,23,26]]){
    r(x+2,y+2,w,h,'#b9a182');r(x,y,w,h,'#efdfbc');
    r(x+1,y+1,w-2,1,'#fbefcf');r(x+2,y+h-2,w-5,1,'#ddc99f');
    r(x+Math.floor(w/2)-1,48,1,y-47,'#937757');
    r(x+Math.floor(w/2)-2,y-1,4,3,'#9b7652');
  }
  // Ginkgo leaves share a branch point and have fan-shaped, cleft crowns.
  l(717,77,728,64,'#70694c');l(722,71,718,66,'#827753');
  p([718,67,713,63,715,60,718,60,719,62,720,60,723,62,723,64],'#c29c4f');
  p([727,66,724,60,726,57,730,56,730,59,733,57,735,59,734,62],'#b79a50');
  l(718,66,716,62,'#dfbd74');l(727,65,727,60,'#ddbe78');
  r(714,79,8,1,'#a89473');
  // Paired fronds step toward the tip of a single fern stem.
  l(749,75,759,60,'#647b66');
  for(let i=0;i<5;i++){
    const x=750+i*2,y=72-i*3,w=5-Math.floor(i/2);
    l(x,y,x-w,y-3,'#718c72');l(x+1,y-1,x+w+1,y-2,'#829b7b');
  }
  r(746,77,7,1,'#a89473');

}
function studioMat(b) {
  const {p,l}=b;
  p([505,231,672,231,697,273,486,273],'#a08265');
  p([504,229,671,229,695,271,485,271],'#728980');
  p([508,232,667,232,689,267,491,267],'#b3af8c');
  p([511,234,664,234,684,264,497,264],'#819788');
  for(let row=0;row<14;row++){
    const y=235+row*2, left=512-Math.floor(row*.86),right=663+Math.floor(row*1.35);
    l(left,y,right,y,row%2?'#96a08a':'#a4ab93');
    for(let x=left+8+row%3;x<right-2;x+=17)l(x,y,x+2,y,'#849680');
  }
  for(let x=490;x<691;x+=5)l(x,271,x+1,274,'#d0bd91');

}
function details(b,day,clock,view) {
  const {r}=b,phase=clock*.00013;
  // Each mote rises and drifts around a lit window before softly disappearing.
  for(let n=0;n<6;n++){
    const u=(phase+n*.19)%1;if(u<.12||u>.88)continue;
    const x=(view?555:202)+n*8+3*Math.sin(phase*5+n),y=160-u*16+(n%2)*5;
    r(x,y,1,1,day>.4?'rgba(255,244,199,.65)':'rgba(234,204,149,.45)');
  }
}

function passage(b){
  const {r,l,o,p}=b;
  // A pendulum wall clock and indigo work apron mark the transition between
  // the sitting area and the studio without closing the open floor plan.
  const x=364,y=70;
  // A brass bob hangs on the same axis as the dial and glazed lower case.
  r(x-6,y+6,13,15,'#73583f');r(x-5,y+8,11,11,'#b99167');
  r(x-4,y+8,9,10,'#586457');r(x,y+8,1,6,'#d2b274');
  o(x,y+15,3,2,'#ae8550');r(x-1,y+14,3,1,'#e3c58a');
  r(x-6,y+20,13,1,'#967452');
  o(x,y,11,11,'#6f533f');o(x,y-1,10,10,'#b18b62');
  o(x,y-1,8,8,'#8c7758');o(x,y-1,7,7,'#f0deae');
  for(const [dx,dy] of [[0,-6],[4,-4],[6,0],[4,4],[0,6],[-4,4],[-6,0],[-4,-4]])r(x+dx,y-1+dy,1,1,'#97835f');
  l(x,y-1,x-4,y-3,'#63543e');l(x,y-1,x+3,y-5,'#63543e');r(x,y-1,1,1,'#bb9051');
  r(380,122,22,3,wood.shade);r(380,122,22,1,wood.lit);
  for(const xx of [384,394]){r(xx,124,2,4,wood.mid);r(xx,126,3,2,wood.gold);}
  l(389,138,394,128,'#766e5b');l(394,128,397,138,'#766e5b');
  p([389,136,397,136,397,146,401,152,399,167,393,166,389,168,384,166,385,152,389,145],'#5b7776');
  p([390,138,395,137,396,147,399,152,397,164,392,163,388,165,386,164,388,151,390,147],'#78918a');
  l(390,139,392,146,'#adbaa2');l(397,148,397,162,'#5d7877');
  l(388,150,398,150,'#b8b9a0');r(389,153,8,6,'#546e70');r(390,154,6,4,'#839995');
  r(389,153,8,1,'#c4b89b');l(388,164,391,165,'#afaf97');
}

const backdrops=new WeakMap();
function floorMat(b,x,y,edge,weave){
  const {r,o}=b;
  // A flat woven mat gives a floor plant a visible contact patch even when
  // carried away. Its rightward cast shadow follows the apartment light.
  o(x+2,y+2,17,4,'rgba(73,52,46,.18)');o(x,y,17,4,edge);o(x-1,y-1,15,2,weave);
  o(x,y,13,2,edge);o(x,y,11,1,weave);
  for(let dx=-13;dx<=13;dx+=4){r(x+dx,y+2,2,1,weave);r(x+dx+1,y-2,2,1,edge);}
  r(x-3,y,6,1,edge);
}
function staticWorld(ctx,day,warmth,hour) {
  const b=tools(ctx,palette(day,warmth));
  // Both halves always exist alongside each other. The runtime cache holds
  // the pixels just drawn here by the game and is rebuilt as local light changes.
  for(const x of [0,400]){
    ctx.save();ctx.beginPath();ctx.rect(x,0,BASE_WIDTH,BASE_HEIGHT);ctx.clip();
    structure(ctx,b,day,warmth,hour,x);ctx.restore();
  }
  passage(b);rug(b);hangingPrints(b);studioMat(b);
  floorMat(b,347,288,'#987355','#c29b73');
  floorMat(b,716,291,'#8c8164','#b5a781');
}
function getBackdrop(ctx,day,warmth,hour) {
  const target=ctx.canvas;
  if(!target)return null;
  let layer=backdrops.get(target);
  if(!layer){
    const surface=makeBuffer(ctx,800,320);
    if(!surface)return null;
    surface.width=800;surface.height=320;layer={surface,key:null};backdrops.set(target,layer);
  }
  const key=[Math.round(day*64),Math.round(warmth*64),Math.floor(hour*12)].join('/');
  if(layer.key!==key) {
    const buffer=layer.surface.getContext('2d');
    if(!buffer)return null;
    buffer.clearRect(0,0,800,320);staticWorld(buffer,day,warmth,hour);layer.key=key;
  }
  return layer.surface;
}

const furnishingLayers=new WeakMap();
const furnitureBounds=[
  [[4,29,309,204],[120,236,157,48]],
  [[406,56,101,174],[496,82,284,180]],
];
function furniture(ctx,b,day,warmth,panel,front) {
  function paint(target,brush) {
    if(!panel && !front){bookcase(brush);sofa(brush);}
    else if(!panel)coffee(brush);
    else if(!front)studioShelves(brush);
    else{
      target.save();target.translate(0,12);
      studioDesk(brush);
      target.restore();easel(brush);
    }
  }
  if(!ctx.canvas){paint(ctx,b);return;}
  const tintKey=Math.round(day*64)*65+Math.round(warmth*64);
  let cache=furnishingLayers.get(ctx.canvas);
  if(!cache||cache.key!==tintKey) {
    cache={key:tintKey,buffers:[[],[]]};furnishingLayers.set(ctx.canvas,cache);
  }
  const depth=front?1:0,[x,y,w,h]=furnitureBounds[panel][depth];
  let buffer=cache.buffers[panel][depth];
  if(!buffer) {
    buffer=makeBuffer(ctx,w,h);
    if(!buffer){paint(ctx,b);return;}
    const ink=buffer.getContext('2d');
    ink.translate(-x,-y);paint(ink,tools(ink,palette(day,warmth)));
    cache.buffers[panel][depth]=buffer;
  }
  ctx.drawImage(buffer,x,y);
}

function placeOccupant(ctx,draw,panel,slot,overhang=0) {
  if(!draw)return;
  ctx.save();
  try{
    ctx.translate(panel*BASE_WIDTH,0);
    const clip=typeof slot==='number'?placesFor(panel)[slot].clip:null;
    if(clip){
      const [left,top,right,bottom]=clip;
      ctx.beginPath();ctx.rect(left,top,right-left,bottom-top+overhang);ctx.clip();
    }
    draw(slot,panel);
  }finally{ctx.restore();}
}

/**
 * Paint the world in native coordinates, preserving the caller's transform so
 * it can render at display or postcard resolution. view may also be a
 * fractional 0..1 camera position during travel between rooms. The optional
 * drawOccupant(slot,panel) callback paints in panel-local coordinates, in depth
 * order. A numeric slot identifies a plant and 'cat' identifies the sofa seat.
 */
export function drawScenery(ctx,{view=0,outsideOffset=0,light={},time=0,reducedMotion=false,drawOccupant,drawKeepsake,occupantOverhang,separatePlanes=false,above=0,below=0}={}){
  if(!ctx)return;
  const day=clamp(Number.isFinite(light.day)?light.day:1),warmth=clamp(Number.isFinite(light.warmth)?light.warmth:0);
  const hour=Number.isFinite(light.hour)?((light.hour%24)+24)%24:12;
  const v=viewNumber(view),camera=Math.round(v*BASE_WIDTH);
  const clock=reducedMotion||!Number.isFinite(time)?0:Math.max(0,time);
  const tint=palette(day,warmth),b=tools(ctx,tint),raw=tools(ctx,c=>c),L={day,warmth,hour};
  ctx.save();ctx.translate(-camera,0);
  ctx.beginPath();ctx.rect(camera,-above,BASE_WIDTH,BASE_HEIGHT+above+below);ctx.clip();
  if(!separatePlanes){
    // An opaque backing keeps plank seams solid at fractional camera scales.
    ctx.fillStyle=tint('#a68768');
    ctx.fillRect(camera,-above,BASE_WIDTH,BASE_HEIGHT+above+below);
    paintPlanes(ctx,camera,{day,warmth},above,below);
  }
  ctx.beginPath();ctx.rect(camera,0,BASE_WIDTH,BASE_HEIGHT);ctx.clip();
  const backdrop=getBackdrop(ctx,day,warmth,hour);
  if(backdrop){
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(backdrop,camera,0,BASE_WIDTH,BASE_HEIGHT,camera,0,BASE_WIDTH,BASE_HEIGHT);
  }else staticWorld(ctx,day,warmth,hour);
  for(let panel=0;panel<2;panel++){
    if(camera>=BASE_WIDTH*(panel+1)||camera+BASE_WIDTH<=BASE_WIDTH*panel)continue;
    const drift=reducedMotion?0:Math.round(Math.max(-8,Math.min(8,outsideOffset)));
    if(panel)casement(ctx,b,raw,508,45,181,96,L,clock,true,drift);
    else casement(ctx,b,raw,113,41,202,96,L,clock,false,drift);
    const paintLayer=layer=>placesFor(panel).forEach((spot,i)=>{
      if(spot.layer===layer)placeOccupant(ctx,drawOccupant,panel,i,occupantOverhang?.(i));
    });
    paintLayer('window');
    if(!panel)lamp(ctx,b,raw,day);
    furniture(ctx,b,day,warmth,panel,false);
    if(!panel)placeOccupant(ctx,drawKeepsake,panel,'jar');
    paintLayer('shelf');
    if(!panel)placeOccupant(ctx,drawOccupant,panel,'cat');
    furniture(ctx,b,day,warmth,panel,true);
    if(panel)placeOccupant(ctx,drawKeepsake,panel,'book');
    paintLayer('table');
    if(!reducedMotion)details(b,day,clock,panel);
  }
  ctx.restore();
}
