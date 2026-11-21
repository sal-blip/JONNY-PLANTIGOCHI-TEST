import {drawRoomPhone,phoneFor} from './roomPhone.js';
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
  const center=studio?w*.28:w*.58,base=h-22;
  p([-4,base+2,12,base-3,28,base,center-30,base-5,center-17,base-16,center-6,base-27,
    center-2,base-29,center+3,base-29,center+16,base-15,center+32,base-5,w-12,base-2,w+2,base-6,w+2,h,-4,h],css(mountain));
  p([center-16,base-16,center-6,base-27,center-2,base-29,center+3,base-29,center+16,base-15,
    center+10,base-18,center+6,base-20,center+3,base-18,center,base-23,center-4,base-20,center-7,base-22],css(blend(white,mountain,.32)));
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
function viewOutside(ctx,raw,x,y,w,h,L,moment,studio){
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.translate(x,y);
  const tones=skyFor(L.hour), key=Math.floor(L.hour*60)+':'+Math.round(L.day*60);
  let slot;
  if(ctx.canvas){
    if(!outdoorCache.has(ctx.canvas))outdoorCache.set(ctx.canvas,[{},{}]);
    slot=outdoorCache.get(ctx.canvas)[studio?1:0];
    if(slot.key!==key){slot.key=key;slot.layers=new Map();}
  }
  function layer(id,paint) {
    if(!slot){paint(raw);return;}
    let buffer=slot.layers.get(id);
    if(!buffer){
      buffer=makeBuffer(ctx,w,h);
      if(!buffer){paint(raw);return;}
      paint(tools(buffer.getContext('2d'),c=>c));
      slot.layers.set(id,buffer);
    }
    ctx.drawImage(buffer,0,0);
  }
  layer('sky',brush=>skyField(brush,w,h,L,studio,tones));
  clouds(raw,w,moment,studio,tones);
  layer('terrain',brush=>landscape(brush,w,h,L,studio,tones));
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
    l(a,yy,e,zz,'#967552',2);l(a,yy,e,zz,'#c1a370');l(e,zz,e+sign*2,zz+5,'#a4895b');
  }
  if(!studio){drape(x-1,1,16);drape(x+w+1,-1,20);}
  else{
    // A woven roll blind in the atelier, with a weighted cord and stitched hem.
    r(x+3,y-3,w-4,12,'#a98b63');
    for(let yy=y-2;yy<y+8;yy+=3){r(x+5,yy,w-8,1,'#dbc69a');r(x+5,yy+1,w-8,1,'#c5ac7f');}
    r(x+5,y+9,w-8,2,'#a48e68');l(x+w-13,y+9,x+w-13,y+33,'#8f7d5e');
    r(x+w-14,y+32,3,5,'#b59769');
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
    r(bellX-3,yy+8,7,1,'#799990');r(bellX-2,yy+5,1,2,'#f2ebce');
    l(bellX,yy+9,bellX+motion,yy+14,'#847b67');
    p([bellX+motion-1,yy+14,bellX+motion+1,yy+13,bellX+2*motion+1,yy+21,bellX+2*motion-1,yy+22],'#668a85');
  }
}

// Frames and linen are painted into transparent runtime layers. Their discrete
// pixel poses loop smoothly while the separately composed sky keeps travelling.
const frameCache=new WeakMap();
function casement(ctx,b,raw,x,y,w,h,L,clock,studio) {
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
    viewOutside(ctx,raw,x+8,y+7,w-14,h-13,L,clock,studio);
    ctx.drawImage(buffer,x-10,y-5);
  }else{
    windowFrame(ctx,b,x,y,w,h,clock,studio,
      ()=>viewOutside(ctx,raw,x+8,y+7,w-14,h-13,L,clock,studio));
  }
}

function book(b,x,base,width,height,colors,lean=0){
  const {r,p,l}=b;
  p([x+lean,base-height,x+width+lean,base-height,x+width,base,x,base],colors[0]);
  l(x+lean,base-height,x,base-1,'#5d554c');
  l(x+lean+1,base-height+1,x+width+lean-1,base-height+1,colors[1]);
  l(x+2+lean*.8,base-height+4,x+width-1+lean*.8,base-height+4,colors[1]);
  if(width>4)r(x+1,base-4,width-2,1,colors[1]);
}
function paperStack(b,x,y,w,colors) {
  for(let i=0;i<colors.length;i++){
    b.r(x+i%2,y-i*3,w-i%3,3,colors[i]);b.r(x+2+i%2,y+1-i*3,w-4,1,'#dfcfa8');
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
  book(b,19,95,5,22,['#647c70','#b7b991']);
  book(b,24,95,5,18,['#a07161','#d8af8a'],1);
  paperStack(b,76,138,10,['#a47960','#788974']);
  book(b,68,211,5,13,['#9a7f5f','#c9b285']);book(b,74,211,4,16,['#6b797e','#c4b599'],1);
  r(19,193,33,18,'#9f7352');r(21,195,29,13,wood.mid);
  r(29,199,12,5,wood.shade);r(31,200,8,2,'#c3a371');
  // Small woven sewing basket on top, with its handle and crossing reed ends.
  p([25,38,48,38,46,46,28,46],'#8d7051');p([26,39,47,39,45,45,29,45],'#c39f70');
  l(30,37,32,32,'#897553');l(32,32,39,31,'#897553');l(39,31,43,37,'#897553');
  l(32,33,39,32,'#cdb187');
  for(let xx=28;xx<46;xx+=3){l(xx,39,xx+1,44,'#a38760');}
  r(27,41,19,1,'#d3b283');r(28,44,17,1,'#ac865e');
  p([55,42,70,40,73,42,73,44,57,46],'#d5c29a');l(56,42,70,41,'#e9d8ad');
  r(66,41,2,3,'#ad7665');
}

function rug(b) {
  const {p,l,r}=b;
  const trapezoid=(x,y,x2,y2,c)=>p([x+24,y,x2-20,y,x2,y2,x,y2],c);
  trapezoid(72,228,320,304,'#92745b');trapezoid(69,226,318,301,'#995f54');
  trapezoid(73,228,313,298,'#dab283');trapezoid(77,230,309,295,'#aa705d');
  trapezoid(82,233,304,292,'#e0b88a');trapezoid(84,235,301,290,'#b17d66');
  for(let i=0;i<30;i++){const x=72+i*8;l(x,301,x-1,304+i%2,'#e5c899');}
  // Repeated woven diamonds get wider toward the near edge.
  for(let j=0;j<4;j++)for(let i=0;i<7;i++){
    const x=100+i*28+(j%2)*12-j*2,y=240+j*14;
    if(x>291||x<84)continue;
    p([x-8,y,x-4,y-2,x-2,y-4,x+1,y-4,x+4,y-2,x+8,y,x+3,y+2,x,y+4,x-3,y+2],j%2?'#c8987a':'#ca9b7a');
    r(x-2,y-1,4,2,'#aa765f');
  }
  for(let i=0;i<22;i++){
    const x=81+i*10;
    if(x<306){l(x,296,x+2,294,'#f1cf9e');l(x+2,294,x+4,296,'#f1cf9e');}
  }
}

function sofa(b){
  const {r,l,p,o}=b;const ink='#374b46',deep='#48675e',shade='#597a6a',mid='#739583',lit='#90ae92',pale='#b1c2a0';
  o(214,224,98,7,'#997c5f');o(211,224,77,4,'#876c54');
  // The exposed oak frame has a back rail, cantilevered arms, dowels and legs.
  for(const [xx,yy,dx] of [[117,212,-3],[291,212,4],[136,207,-1],[279,207,1]]){
    p([xx,yy,xx+6,yy,xx+5+dx,yy+18,xx+1+dx,yy+18],wood.dark);
    l(xx+2,yy+2,xx+2+dx,yy+16,wood.lit);
  }
  p([113,173,117,162,123,157,288,157,299,162,304,174,304,204,298,215,119,215,113,207],ink);
  p([116,172,120,164,126,160,286,160,296,164,301,173,298,202,119,203],deep);
  // Three plump, piped back cushions sit slightly behind the seat pads.
  for(const [x,w] of [[122,52],[176,58],[236,58]]){
    p([x,168,x+4,162,x+w-6,162,x+w-2,164,x+w,170,x+w-1,184,x+w-4,189,x+3,190,x,186],shade);
    p([x+2,169,x+5,164,x+w-7,164,x+w-3,167,x+w-2,182,x+w-5,187,x+4,188,x+2,184],mid);
    l(x+6,165,x+w-8,165,lit);l(x+3,169,x+3,181,lit);
    l(x+6,185,x+10,187,shade);l(x+w-5,182,x+w-8,186,shade);
    r(x+w*.50,176,2,1,shade);r(x+w*.50+1,177,2,1,lit);
  }
  p([123,189,292,188,300,197,295,207,124,208,117,200],ink);
  for(const [x,w] of [[122,54],[176,57],[233,59]]){
    p([x+4,189,x+w-4,189,x+w+1,197,x+w-1,201,x-1,201,x-3,198],lit);
    p([x-2,198,x+w,198,x+w-1,204,x+1,204],mid);
    l(x+5,190,x+w-5,190,pale);l(x,202,x+w-3,202,shade);
  }
  // The middle pad dips a pixel under the cat. Its paws land ahead of the
  // piping and its tail no longer straddles the left cushion seam.
  l(179,198,187,198,mid);r(188,198,34,1,'#8ca990');
  l(188,199,221,199,mid);l(222,198,230,198,mid);
  p([114,191,118,187,124,188,128,194,128,207,293,207,293,194,297,189,304,189,309,193,
     309,209,302,216,119,216,114,211],deep);
  r(129,209,163,3,shade);r(128,213,166,2,ink);
  trim(b,118,215,184,5);
  // Proper fore-and-aft arm rails, not merely oval caps.
  for(const [x,side] of [[108,1],[295,1]]){
    p([x,190,x+4,184,x+12,184,x+15,188,x+12,193,x+2,194],wood.dark);
    p([x+1,189,x+5,185,x+12,185,x+13,187,x+10,190,x+2,191],wood.lit);
    l(x+4,186,x+11,186,wood.gold);slat(b,x+3,193,20,4);r(x+4,198,1,2,wood.gold);
  }
  // Small geometric sashiko pillow well away from the visitor's cat seat.
  p([246,165,250,159,266,158,275,170,271,184,254,188,244,178],'#9c7553');
  p([248,166,252,161,265,160,273,170,269,182,255,185,246,176],'#d6a35f');
  for(const [px,py] of [[252,167],[260,165],[255,175],[265,173],[260,181]]){
    l(px-2,py,px,py-2,'#eed195');l(px,py-2,px+2,py,'#eed195');r(px,py+2,1,1,'#bd8d53');
  }
  // Padding rolls outward over the exposed wooden return. The woven throw
  // lies across the right seat, bunches at the arm, then falls forward.
  p([290,189,294,182,300,180,306,182,309,186,307,190,302,193,296,194],deep);
  p([292,188,296,183,300,182,305,184,307,186,304,189,298,191],mid);
  l(296,183,301,182,lit);l(300,192,307,189,wood.gold);
  p([275,180,284,177,292,178,298,182,299,187,293,192,293,199,289,205,
    286,215,279,218,267,214,265,208,268,201,263,198,252,198,251,194,259,190,268,186],'#8d6258');
  p([275,181,284,178,291,179,296,182,297,186,291,191,283,194,273,200,
    265,197,253,197,253,194,261,191,269,187],'#c99279');
  p([275,195,283,192,291,189,291,199,286,206,285,214,279,216,268,212,267,208,270,201],'#a97766');
  p([253,194,262,191,269,187,281,181,284,181,273,188,266,193,256,196],'#ddb69a');
  p([270,201,277,196,284,194,282,200,277,205,275,214,270,212,269,207],'#c18a71');
  p([285,195,289,192,288,199,284,205,282,214,279,215,280,204],'#c38d74');
  for(const [xx,yy] of [[267,192],[276,186],[284,183],[283,190]]){
    l(xx-2,yy+1,xx,yy-1,'#ead0aa');l(xx,yy-1,xx+2,yy,'#ead0aa');
  }
  l(255,196,264,195,'#dbae8e');l(264,195,275,188,'#dbae8e');
  l(267,209,272,212,'#d1a383');l(274,213,281,215,'#d8ad8b');l(282,214,286,211,'#d8ad8b');
  for(const [x,y] of [[268,211],[271,213],[274,214],[277,215],[280,216],[283,215],[285,213]])
    l(x,y,x-1,y+3,'#d6b18d');
  // Low-contrast flecks follow the warp of the upholstery and build soft
  // cushion edges under the crisp window light.
  for(let i=0;i<130;i++){
    const xx=124+hash(i*17+1)%164,yy=166+hash(i*23)%18;
    if(xx<171||xx>179&&xx<231)r(xx,yy,1+(i%5===0),1,i%3?'#789a85':'#6d8e7a');
  }
  for(const xx of [127,181,239]){
    l(xx,192,xx+26,192,'#a0b89a');l(xx+5,200,xx+24,200,'#7e9d86');
  }
  r(140,216,2,2,'#d2aa77');r(280,216,2,2,'#d2aa77');
}

function lamp(ctx,b,raw,day,clock) {
  const {r,l,p,o}=b,x=347;
  if(day<.69)for(let j=0;j<6;j++)raw.o(x,133,45-j*5,48-j*6,'rgba(255,200,123,'+(.69-day)*.056+')');
  o(x+3,222,15,3,'#9a805f');o(x,219,11,3,'#60594a');o(x,218,9,2,'#ac9566');
  r(x-2,135,4,81,'#695f49');r(x-1,135,1,81,'#c3a46a');r(x+1,138,1,74,'#8a7854');
  o(x,138,4,2,'#9c885d');r(x+10,138,1,13,'#a68a5f');r(x+9,150,3,4,'#c3a574');
  p([x-11,111,x+10,111,x+19,134,x+17,138,x-18,138,x-20,135],'#887257');
  raw.p([x-10,112,x+9,112,x+17,134,x-18,134],day<.48?'rgb(250,211,143)':'rgb(235,208,159)');
  for(let i=-12;i<17;i+=5)l(x+i*.54,113,x+i,133,'#c2a473');
  r(x-17,135,34,1,'#f5dfb0');r(x-3,109,6,2,'#b19563');
}
function coffee(b){
  const {r,p,l,o}=b;
  o(204,277,68,5,'#a38165');
  for(const [x,y,lean] of [[134,251,-5],[255,251,5],[151,251,-2],[243,251,2]]){
    p([x,y,x+6,y,x+5+lean,y+27,x+1+lean,y+27],wood.dark);
    l(x+2,y+3,x+2+lean,y+24,wood.lit);
  }
  p([137,239,250,239,263,245,267,249,263,253,253,256,135,256,125,252,123,248,126,244],wood.dark);
  p([137,238,249,238,259,242,264,247,262,250,252,252,136,252,126,249,126,246,129,243],wood.lit);
  l(137,239,247,239,wood.pale);l(131,244,137,241,wood.gold);l(138,253,252,253,wood.mid);
  for(let i=0;i<10;i++){const x=136+hash(220+i)%100,y=241+hash(i+75)%9;r(x,y,4+i%7,1,i%2?wood.gold:wood.mid);}
  // The teacup sits beside the handset on the near corner of the table.
  o(256,248,7,2,'#ad8265');o(256,247,6,1,'#e2c79f');
  r(252,241,8,6,'#b49b7e');r(253,242,6,4,'#e1cdab');r(254,240,5,1,'#eedec0');
  r(253,241,6,1,'#795e48');r(259,241,3,1,'#b49b7e');r(262,242,1,2,'#b49b7e');r(259,244,3,1,'#a88c70');
}

function cabinet(b,x,y,w,h){
  const {r,l,p}=b;
  p([x+3,y+3,x+w+5,y+4,x+w+4,y+h+3,x+3,y+h+3],'#987d63');
  r(x,y,w,h,wood.dark);r(x+3,y+3,w-6,h-6,'#ab805b');
  p([x+w-2,y+1,x+w+4,y-3,x+w+4,y+h-4,x+w-2,y+h],wood.shade);
  for(let j=0;j<2;j++){
    const dx=x+4+j*(w-8)/2,dw=(w-11)/2;
    r(dx,y+5,dw,h-10,wood.shade);r(dx+2,y+6,dw-4,h-13,'#bc9068');
    for(let i=0;i<dw-5;i+=4){
      r(dx+3+i,y+8,1,h-17,'#9f795a');r(dx+4+i,y+8,1,h-17,'#cca47b');
    }
    l(dx+2,y+h-5,dx+dw-3,y+h-5,wood.mid);
    r(dx+(j?4:dw-7),y+h*.5,3,5,'#6a5946');r(dx+(j?5:dw-6),y+h*.5,1,4,'#d0aa72');
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
      r(bx+1,y+9,1,1,'#d5b185');
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
  r(476,195,10,1,'#c5c9a6');for(let i=0;i<5;i++)r(476+i*2,197,1,2,'#b9be9d');
}
function studioDesk(b) {
  const {r,p,l,o}=b;
  o(600,233,85,6,'#a08365');
  // The underside, solid trestle joinery and box drawers show the workstation's depth.
  for(const [x,lean] of [[513,-7],[532,6],[667,4],[679,6]]){
    p([x,187,x+6,187,x+6+lean,230,x+2+lean,230],wood.dark);
    l(x+2,190,x+2+lean,227,wood.lit);
  }
  trim(b,512,213,26,4,false);trim(b,523,196,146,4);
  r(643,187,34,36,wood.shade);r(646,188,29,32,wood.mid);
  for(let j=0;j<3;j++){
    r(646,190+j*10,28,8,wood.lit);r(647,191+j*10,26,1,wood.gold);
    r(656,193+j*10,9,2,wood.shade);r(658,193+j*10,5,1,'#d4b381');
  }
  p([503,185,510,178,678,178,685,185,684,190,503,190],wood.dark);
  p([503,185,510,178,678,178,685,185,682,187,505,187],wood.gold);
  r(505,187,179,2,wood.mid);r(512,179,163,1,wood.pale);
  // The Leaf Book occupies the clear desk surface beside the brushes.
  o(670,183,6,1,'#a78e6c');
  l(667,179,663,163,'#7d6250');l(670,180,674,164,'#a67d50');
  l(669,179,669,158,'#8e7756');r(668,157,3,4,'#645348');
  p([664,173,675,173,674,183,666,183],'#72918c');r(666,175,2,6,'#adc6ac');r(664,172,11,2,'#bcc6af');
  // Turned three-legged oak stool and its elliptical seat.
  const sx=603,sy=220;
  o(sx,247,16,3,'#96775a');
  for(const [ax,dx] of [[sx-10,-5],[sx+8,5],[sx,1]]){
    p([ax,sy,ax+4,sy,ax+4+dx,sy+26,ax+dx,sy+26],wood.shade);l(ax+1,sy+3,ax+1+dx,sy+24,wood.lit);
  }
  l(sx-11,236,sx+11,236,wood.mid,2);o(sx,sy+1,18,4,wood.dark);o(sx,sy-1,18,4,wood.lit);
  o(sx,sy-2,15,2,'#cb9a70');r(sx-12,sy-2,9,1,wood.gold);
}
function easel(b) {
  const {r,p,l,o}=b;
  const legs=[[725,135,-15],[748,135,18],[747,138,6]];
  o(740,231,27,4,'#a38a68');
  for(const [x,y,d] of legs){
    p([x,y,x+5,y,x+5+d,231,x+1+d,231],wood.shade);l(x+2,y+3,x+2+d,228,wood.lit);
  }
  l(717,208,759,208,wood.mid,3);l(719,207,757,207,wood.gold);
  // Adjustable mast, ratchet holes and copper screw retain the canvas.
  p([735,86,741,84,746,192,739,192],wood.dark);l(738,88,742,190,wood.lit,2);
  for(let y=90;y<125;y+=5)r(738,y,2,1,wood.shade);
  p([717,119,766,116,771,165,715,168],wood.dark);
  p([719,120,765,118,768,163,718,166],'#ecdcb2');
  p([721,122,763,120,765,160,720,163],'#a8c3ba');
  o(748,132,5,5,'#e9c591');
  p([720,151,728,145,735,147,744,137,749,139,756,146,764,142,766,161,720,163],'#789a90');
  p([720,155,731,149,737,151,745,145,752,149,765,146,766,161,720,163],'#638679');
  p([720,158,730,153,741,155,749,151,765,154,766,160,720,163],'#5a796f');
  l(731,158,745,156,'#a4b296');l(727,161,736,160,'#afbd9b');
  p([712,168,770,165,772,168,712,172],wood.dark);l(714,168,768,166,wood.gold);
  trim(b,732,113,13,4,false);r(738,113,3,3,'#bda06b');
  // Artist's palette leaning by the lower stretcher, with individual paint dabs.
  o(753,194,9,5,'#b98b61');o(757,193,2,1,'#8b6c50');
  for(const [dx,dy,c] of [[-6,-1,'#837d91'],[-3,-3,'#759789'],[1,-3,'#c08c68'],[4,0,'#d8c9a4']])r(753+dx,194+dy,2,1,c);
}
function hangingPrints(b){
  const {r,l,p,o}=b;
  // Copper pin rail with two different studio studies on deckle-edged paper.
  trim(b,706,45,65,4,false);
  for(const [x,y,w,h] of [[711,54,26,29],[744,55,21,22]]){
    r(x+2,y+2,w,h,'#c1a989');r(x,y,w,h,'#f1dfba');r(x+1,y,w-2,1,'#f8e9cb');
    r(x+w/2-1,y-1,3,3,'#a88a61');
  }
  r(714,59,20,18,'#d6b89c');o(727,65,3,3,'#bc8069');
  p([714,75,720,68,724,71,728,67,734,74,734,77,714,77],'#88a395');
  p([714,76,722,72,726,74,732,71,734,73,734,77,714,77],'#698877');
  for(const [i,c] of ['#bb8d76','#c5ab83','#83a397','#747e89'].entries())r(747+(i%2)*7,60+Math.floor(i/2)*6,6,5,c);
  l(746,73,760,73,'#c9b796');
}
function studioMat(b) {
  const {p,l}=b;
  p([505,231,672,231,697,273,486,273],'#a08265');
  p([504,229,671,229,695,271,485,271],'#728980');
  p([508,232,667,232,689,267,491,267],'#b3af8c');
  p([511,234,664,234,684,264,497,264],'#819788');
  for(let j=0;j<5;j++){
    const y=237+j*6;
    for(let x=510;x<674;x+=14)l(x,y,x+6,y,'#a0aa91');
  }
  for(let x=490;x<691;x+=7)l(x,271,x+1,274,'#d0bd91');
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
  p([x-10,y-6,x-5,y-11,x+6,y-11,x+11,y-6,x+11,y+5,x+7,y+10,x-6,y+10,x-10,y+5],wood.dark);
  o(x,y,9,9,wood.lit);o(x,y,7,7,'#e5d4a6');
  for(const [a,z] of [[0,-5],[5,0],[0,5],[-5,0]])r(x+a,y+z,1,1,'#85795b');
  l(x,y,x-3,y-2,'#655d4c');l(x,y,x+2,y-4,'#655d4c');r(x,y,1,1,wood.lit);
  r(380,122,22,3,wood.shade);r(380,122,22,1,wood.lit);
  for(const xx of [384,394]){r(xx,124,2,4,wood.mid);r(xx,126,3,2,wood.gold);}
  l(389,138,394,128,'#766e5b');l(394,128,397,138,'#766e5b');
  p([389,136,397,136,397,146,401,152,399,167,393,166,389,168,384,166,385,152,389,145],'#5b7776');
  p([390,138,395,137,396,147,399,152,397,164,392,163,388,165,386,164,388,151,390,147],'#78918a');
  l(389,150,397,150,'#a0ab92');r(390,154,6,4,'#6a827b');r(390,154,6,1,'#a0ae98');
}

const backdrops=new WeakMap();
function floorMat(b,x,y,edge,weave){
  const {r,o}=b;
  // A flat woven mat gives a floor plant a visible contact patch even when
  // carried away. Its rightward cast shadow follows the apartment light.
  o(x+2,y+2,17,4,'rgba(73,52,46,.18)');o(x,y,17,4,edge);o(x-1,y-1,15,2,weave);
  for(let j=-1;j<=1;j++)for(let i=-11;i<12;i+=4)r(x+i+(j%2),y+j,2,1,edge);
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

function placeOccupant(ctx,draw,panel,slot) {
  if(!draw)return;
  ctx.save();
  try{
    ctx.translate(panel*BASE_WIDTH,0);
    const clip=typeof slot==='number'?placesFor(panel)[slot].clip:null;
    if(clip){
      const [left,top,right,bottom]=clip;
      ctx.beginPath();ctx.rect(left,top,right-left,bottom-top);ctx.clip();
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
export function drawScenery(ctx,{view=0,light={},time=0,reducedMotion=false,drawOccupant,drawKeepsake,phoneSelected=false,separatePlanes=false}={}){
  if(!ctx)return;
  const day=clamp(Number.isFinite(light.day)?light.day:1),warmth=clamp(Number.isFinite(light.warmth)?light.warmth:0);
  const hour=Number.isFinite(light.hour)?((light.hour%24)+24)%24:12;
  const v=viewNumber(view),camera=Math.round(v*BASE_WIDTH);
  const clock=reducedMotion||!Number.isFinite(time)?0:Math.max(0,time);
  const tint=palette(day,warmth),b=tools(ctx,tint),raw=tools(ctx,c=>c),L={day,warmth,hour};
  ctx.save();ctx.beginPath();ctx.rect(0,0,BASE_WIDTH,BASE_HEIGHT);ctx.clip();ctx.translate(-camera,0);
  if(!separatePlanes)paintPlanes(ctx,camera,{day,warmth},0,0);
  const backdrop=getBackdrop(ctx,day,warmth,hour);
  if(backdrop){
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(backdrop,camera,0,BASE_WIDTH,BASE_HEIGHT,camera,0,BASE_WIDTH,BASE_HEIGHT);
  }else staticWorld(ctx,day,warmth,hour);
  for(let panel=0;panel<2;panel++){
    if(camera>=BASE_WIDTH*(panel+1)||camera+BASE_WIDTH<=BASE_WIDTH*panel)continue;
    if(panel)casement(ctx,b,raw,508,45,181,96,L,clock,true);
    else casement(ctx,b,raw,113,41,202,96,L,clock,false);
    const paintLayer=layer=>placesFor(panel).forEach((spot,i)=>{
      if(spot.layer===layer)placeOccupant(ctx,drawOccupant,panel,i);
    });
    paintLayer('window');
    if(!panel)lamp(ctx,b,raw,day,clock);
    furniture(ctx,b,day,warmth,panel,false);
    if(!panel)placeOccupant(ctx,drawKeepsake,panel,'jar');
    paintLayer('shelf');
    if(!panel)placeOccupant(ctx,drawOccupant,panel,'cat');
    furniture(ctx,b,day,warmth,panel,true);
    if(panel)placeOccupant(ctx,drawKeepsake,panel,'book');
    ctx.save();ctx.translate(panel*BASE_WIDTH,0);
    drawRoomPhone(ctx,phoneFor(panel),{night:1-day,selected:phoneSelected});
    ctx.restore();
    paintLayer('table');
    if(!reducedMotion)details(b,day,clock,panel);
  }
  ctx.restore();
}
