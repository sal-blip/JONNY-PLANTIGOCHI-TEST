import {drawSelectionContour} from './roomContour.js';

// Object anchors use exactly the same logical coordinates as the room's actors.
const jar = {id:'jar',name:'Cutting Jar',x:338,y:96,hitX:338,hitY:76,hitWidth:38,hitHeight:44};
const book = {id:'book',name:'Leaf Book',x:239,y:196,hitX:239,hitY:187,hitWidth:38,hitHeight:30};
export function keepsakeFor(roomIndex) {
  return roomIndex===0 ? jar : roomIndex===1 ? book : null;
}

const swatches = [
  null,
  ['#4d675e','#354b50'], ['#b5d0b4','#87a4aa'], ['#e5efcf','#c9d4cf'],
  ['#afcabb','#7b9b9c',.34], ['#83b8aa','#668d96',.76], ['#659988','#537983',.9],
  ['#b7d9b5','#99bfb8'], ['#62734d','#4d6357'], ['#487252','#3b5d50'],
  ['#73995a','#638164'], ['#a5b96f','#89a381'], ['#dec48c','#b2ac92'],
  ['#9b7858','#88796e'], ['#503b34','#39343b'], ['#8a5b44','#675354'],
  ['#bd805b','#987265'], ['#d0a073','#aa8c7b'], ['#f0c697','#c3a995'],
  ['#345a4b','#34494b'], ['#4e7861','#47635e'], ['#79a07b','#688b81'],
  ['#e0b772','#b9a180'], ['#f2dca0','#d8c8af'], ['#895e53','#755b63'],
  ['#c48269','#a07872'], ['#d9caa7','#b4afad'], ['#f2e3bf','#d7cbc3'],
];

const paletteCache = new Map();
function palette(night) {
  const level=Math.round(Math.max(0,Math.min(1,night))*32);
  if(!paletteCache.has(level)){
    paletteCache.set(level,swatches.map(swatch=>{
      if(!swatch)return null;
      const [day,dark,alpha=1]=swatch;
      const channels=[1,3,5].map(i=>{
        const a=parseInt(day.slice(i,i+2),16),b=parseInt(dark.slice(i,i+2),16);
        return Math.round(a+(b-a)*level/32);
      });
      return 'rgba('+channels.join(',')+','+alpha+')';
    }));
  }
  return paletteCache.get(level);
}

function grid() {
  const left=-24,top=-44,width=52,height=50,px=new Uint8Array(width*height);
  function dot(x,y,color){px[(y-top)*width+x-left]=color;}
  function rect(x,y,w,h,color){
    for(let row=y;row<y+h;row++){
      const index=(row-top)*width+x-left;px.fill(color,index,index+w);
    }
  }
  function stroke(x,y,xx,yy,color){
    const dx=Math.abs(xx-x),dy=-Math.abs(yy-y),sx=x<xx?1:-1,sy=y<yy?1:-1;
    let error=dx+dy;
    for(;;){
      dot(x,y,color);if(x===xx&&y===yy)break;
      const twice=2*error;
      if(twice>=dy){error+=dy;x+=sx;}if(twice<=dx){error+=dx;y+=sy;}
    }
  }
  function polygon(coords,color){
    const ys=coords.filter((_,i)=>i%2);
    for(let y=Math.min(...ys);y<Math.max(...ys);y++){
      const cuts=[];
      for(let i=0,j=coords.length-2;i<coords.length;j=i,i+=2){
        const ax=coords[j],ay=coords[j+1],bx=coords[i],by=coords[i+1];
        if((ay>y+.5)!==(by>y+.5))cuts.push(ax+(y+.5-ay)*(bx-ax)/(by-ay));
      }
      cuts.sort((a,b)=>a-b);
      for(let i=0;i<cuts.length;i+=2){
        const a=Math.round(cuts[i]),b=Math.round(cuts[i+1]);
        rect(a,y,b-a,1,color);
      }
    }
  }
  function runs(){
    const result=[];
    for(let y=0;y<height;y++)for(let x=0;x<width;){
      const start=x,ink=px[y*width+x++];
      while(x<width&&px[y*width+x]===ink)x++;
      if(ink)(result[ink]??=[]).push(start+left,y+top,x-start);
    }
    return result;
  }
  return {dot,rect,stroke,polygon,runs};
}

function cutting(g,stage){
  const {polygon,stroke,dot}=g;
  stroke(1,-8,-1,-24,8);stroke(-1,-24,-4,-29,8);stroke(-1,-24,3,-33,8);
  polygon([-4,-29,-8,-28,-11,-29,-11,-34,-7,-34,-4,-32],9);
  polygon([-9,-33,-7,-33,-5,-32,-4,-30,-8,-30],10);stroke(-9,-32,-4,-29,11);
  polygon([2,-33,2,-37,5,-40,10,-40,11,-37,9,-34,6,-32],9);
  polygon([4,-36,6,-39,9,-39,8,-37,10,-37,8,-35,5,-33],10);
  stroke(3,-33,8,-38,11);dot(8,-36,9);
  if(stage>0){stroke(1,-8,4,-7,12);stroke(4,-7,5,-5,12);}
  if(stage>1){stroke(1,-8,-1,-6,12);stroke(-1,-6,-4,-5,12);dot(-5,-4,13);}
  if(stage>2){stroke(5,-5,4,-3,12);stroke(3,-7,6,-8,12);dot(7,-8,13);dot(-2,-4,12);}
}
function jarSprite(stage){
  const g=grid(),{rect,stroke,polygon,dot}=g;
  const active=stage>=0,waterline=active?-13:-7;
  polygon([-6,-20,7,-20,7,-17,10,-14,10,-3,8,0,-7,0,-10,-3,-10,-14,-6,-17],1);
  polygon([-5,-19,6,-19,6,-16,9,-13,9,-4,7,-2,-6,-2,-8,-4,-8,-13,-5,-16],4);
  rect(-8,waterline+1,17,-3-waterline,5);
  rect(-6,waterline,13,1,7);rect(-8,waterline+1,3,1,7);rect(6,waterline+1,3,1,6);
  rect(-6,-3,13,1,6);rect(-5,-2,11,1,7);
  rect(-7,-21,15,4,1);rect(-6,-21,13,1,2);rect(-5,-20,11,1,4);rect(-6,-18,13,1,2);
  if(active)cutting(g,stage);
  stroke(-8,-13,-8,-7,3);rect(-7,-15,2,2,2);rect(-7,-5,1,2,2);
  rect(7,-11,1,5,2);rect(3,-3,3,1,3);rect(-6,-20,3,1,3);rect(3,-19,3,1,2);
  // A rolled neck and thick heel catch light independently of the water level.
  rect(-7,-21,2,3,2);rect(6,-21,2,3,1);
  rect(-7,-17,3,1,2);rect(4,-17,3,1,2);stroke(-8,-4,-5,-2,7);
  rect(-3,-2,6,1,2);dot(-3,waterline,3);
  return g.runs();
}
function bookSprite(hasLeaves){
  const g=grid(),{rect,stroke,polygon,dot}=g;
  // Angled linen cover, fore-edge, rounded binding and a ribbon bookmark.
  polygon([-17,-18,11,-21,16,-5,15,-2,-12,1,-16,-13],14);
  polygon([-13,-4,12,-7,15,-5,15,-3,-12,0],26);
  stroke(-10,-2,13,-5,13);stroke(-9,-1,14,-4,27);
  polygon([-17,-19,10,-22,15,-7,14,-5,-12,-2],19);
  polygon([-14,-18,9,-20,13,-7,-11,-4],20);
  polygon([-17,-19,-13,-19,-8,-4,-12,-3],23);stroke(-14,-17,-10,-5,24);
  stroke(-11,-16,7,-18,21);stroke(7,-18,11,-8,21);stroke(-8,-6,10,-8,21);
  rect(7,-19,2,1,22);rect(10,-9,2,1,22);
  // The gold-foil leaf on the cover reads even before the first leaf is saved.
  polygon([-2,-9,-5,-10,-6,-13,-4,-15,0,-15,2,-17,5,-17,6,-14,4,-12,1,-10],22);
  stroke(-4,-9,4,-15,23);dot(-1,-13,19);dot(3,-14,19);dot(-3,-11,22);
  // Fine raised corner protectors, paired stitching and a cloth spine.
  stroke(-16,-18,-13,-18,23);stroke(-15,-17,-14,-14,22);
  stroke(8,-20,10,-20,22);stroke(10,-20,11,-17,23);
  stroke(11,-8,13,-8,22);dot(-12,-12,18);dot(-11,-9,18);
  if(hasLeaves){
    polygon([3,-4,6,-5,7,3,5,2,4,4],24);
    rect(11,-6,3,1,22);rect(9,-4,2,1,11);
  }
  return g.runs();
}

const jars=[-1,0,1,2,3].map(jarSprite),books=[bookSprite(false),bookSprite(true)];
export function drawKeepsake(ctx,object,{jarProgress,leafCount,night=0,selected=false,time=0,reducedMotion=false}={}) {
  const {id,x,y}=object,ink=palette(night);
  let rows;
  if(id==='jar'){
    // A dedicated wall shelf leaves every bookcase and windowsill pot address free.
    ctx.fillStyle=ink[15];ctx.fillRect(x-13,y+4,3,5);ctx.fillRect(x+11,y+4,3,5);
    ctx.fillStyle=ink[16];ctx.fillRect(x-12,y+4,5,2);ctx.fillRect(x+8,y+4,5,2);
    ctx.fillStyle=ink[14];ctx.fillRect(x-15,y+2,33,3);
    ctx.fillStyle=ink[17];ctx.fillRect(x-15,y,33,3);ctx.fillStyle=ink[18];ctx.fillRect(x-13,y-1,29,2);
    const progress=Number.isFinite(jarProgress)?Math.max(0,Math.min(1,jarProgress)):null;
    const stage=progress===null?-1:Math.min(3,Math.floor(progress*3));
    rows=jars[stage+1];
  }else rows=books[Number(leafCount>0)];
  ctx.fillStyle='rgba(50,43,47,.22)';ctx.fillRect(x-(id==='jar'?7:11),y, id==='jar'?17:29,2);
  if(selected)drawSelectionContour(ctx,rows,{x,y,size:1});
  const sheen=reducedMotion?-3:(time%3600)*.028-33;
  for(let tone=1;tone<rows.length;tone++){
    const cells=rows[tone];if(!cells)continue;
    ctx.fillStyle=ink[tone];
    for(let i=0;i<cells.length;i+=3){
      const a=cells[i],b=cells[i+1],w=cells[i+2];
      ctx.fillRect(x+a,y+b,w,1);
      if(selected){
        const stripe=Math.floor(sheen-b*.32),from=Math.max(a,stripe),to=Math.min(a+w,stripe+3);
        if(to>from){
          ctx.fillStyle='rgba(255,241,190,.35)';ctx.fillRect(x+from,y+b,to-from,1);ctx.fillStyle=ink[tone];
        }
      }
    }
  }
}
