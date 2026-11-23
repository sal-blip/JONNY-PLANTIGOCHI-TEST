// Native 72 × 40 toy compositions. All anchors and petiole paths share
// the pot's soil line. Transparent gaps separate the flowers from the leaves.
const spear=["#","#l","el#","elg#",".eng#","..eg#","...e#"];
const paddle=["..####","##lllg#","#lllngg#","elllnggg#",".elnglgg#",".eglggngg#","..egglgng#","...egglgg#","....eeglgg#","......eglg#","........eg#",".........e#"];
const upright=["..##",".#ll#","#llng#","#llng#","#llng#","#glng#",".elng#",".egng#","..eng#","..eg#","...e#"];
const small=["###","#llg#","elngg#",".eglg#","..eglg#","....e#"];
const strap=["..#####",".#lllnn##","#lllgnngg##","elngllllggg#",".eeggllngggg#","...eeegggggg#","......eeeee#"];
const rolled=["..##",".#ln#","#lgg#",".eg#","..e#"];
const bract=["..............bb","#..........bbbbb",".bvbbbbbbbbvvbb","..bvvvvvvvvbb","...bgllgggb","....beegbb"];
const orange=["o.....o...o","oo...oo..oo","oh...oh.oo","ohh.ohhoh",".ohhohhoh",".orhorho","..orroo"];
const blue=["......uuuu","....uuiuu","..uuiiu","buuibu",".bbb"];
const moth=["....pp...","..pphhp..",".phhhhppp","phhhphhhhp","phhpwhhhhp",".ppgygppp","..pwmwpp.","..ppmp...","....p...."];
const half=["..pp.",".phhp","phhhp","phgypp",".pmwp","..pp."];
const bud=[".pp.","phhp",".pmp","..p."];
const palettes={
  normal:{e:"#36553d",g:"#478262",l:"#84ad6d",n:"#b2ca83",b:"#45455a",v:"#73754f",o:"#eb852e",h:"#ffbd54",r:"#b85528",u:"#384881",i:"#6e89b8",p:"#9d5987",w:"#f9d1eb",y:"#ffd782",m:"#a13872","#":"#2d453e"},
  orchid:{h:"#edb9e0",g:"#326854",l:"#639775",n:"#95b498"},
};
export const flowerSeeds={
  "bird-of-paradise":["..:.:","..:::","..##+#",".#-+++#","#-++++#",".#+++##","..####"],
  "moth-orchid":[".....#","...#:##","..#:-+#",".#--+#",".#++#","..##"],
};
const crown=[36,26];
const blade=(image,x,y,flip=false)=>({image,x,y,flip});
const line=(...points)=>points;
const birdYoung=[
  blade(paddle,31,19),blade(upright,40,15,true),blade(small,40,23,true),
];
const birdFan=[
  blade(paddle,27,16),blade(upright,34,13),blade(paddle,46,17,true),blade(small,30,22),
];
const orchidBase=[blade(strap,35,24),blade(strap,38,24,true),blade(small,38,21,true)];
// Most blades attach at their bottom corner. Horizontal straps end one cell
// in from the bottom edge. Use an explicit anchor for flowers and buds.
function leaves(items) {
  return items.map(({image,x,y,flip})=>{
    const ax=image===strap?11:image.at(-1).lastIndexOf("#");
    return {image,x,y,ax,ay:image.length-1,flip};
  });
}
const flower=(image,x,y,ax,ay)=>({image,x,y,ax,ay,flip:false});
const head=[flower(bract,42,12,4,5),flower(orange,43,9,4,6),flower(blue,44,10,1,4)];
const spike=line(crown,[33,17],[32,11],[34,7],[39,5],[45,6],[50,9],[54,13]);
const arrangements={
  "bird-of-paradise":{
    sprout:{leaves:[blade(spear,36,24),blade(rolled,38,23,true)]},
    young:{leaves:birdYoung},
    split:{leaves:birdFan,stems:[line(crown,[38,19],[40,14],[42,12])],flowers:[head[0]]},
    grown:{leaves:birdFan,stems:[line(crown,[38,19],[40,14],[42,12])],flowers:head},
  },
  "moth-orchid":{
    sprout:{leaves:[blade(rolled,35,24),blade(small,38,24,true)]},
    young:{leaves:orchidBase},
    split:{leaves:orchidBase,stems:[line(crown,[34,17],[35,12],[39,9],[44,10])],flowers:[flower(bud,39,9,2,3),flower(bud,44,10,1,1)]},
    grown:{leaves:orchidBase,stems:[spike,line([34,7],[31,7]),line([45,6],[44,7])],
      flowers:[flower(moth,31,7,5,5),flower(moth,44,7,4,4),flower(half,52,11,2,3),flower(bud,55,15,1,1)]},
  },
};

function path(grid,points,tone) {
  for(let i=1;i<points.length;i++){
    let [x,y]=points[i-1];const [tx,ty]=points[i],dx=Math.abs(tx-x),dy=-Math.abs(ty-y);
    const sx=x<tx?1:-1,sy=y<ty?1:-1;let err=dx+dy;
    for(;;){
      grid[y][x]=tone;
      if(x===tx&&y===ty)break;
      const twice=2*err;
      if(twice>=dy){err+=dy;x+=sx;}
      if(twice<=dx){err+=dx;y+=sy;}
    }
  }
}
function compose({leaves:items,stems=[],flowers=[]}) {
  const grid=Array.from({length:27},()=>Array(72).fill("."));
  for(const {x,y} of items)path(grid,[crown,[x,y]],"e");
  for(const nodes of stems)path(grid,nodes,"b");
  for(const {image,x,y,ax,ay,flip} of [...leaves(items),...flowers]){
    image.forEach((row,j)=>[...row].forEach((tone,i)=>{
      if(tone!==".")grid[y+j-ay][x+(flip?-1:1)*(i-ax)]=tone;
    }));
  }
  return grid;
}
function posePaths(grid,offset,wilt) {
  const paths={};
  // Move the whole scanline together: a petal, its lip and the stalk share
  // exactly the same displacement. Soil stays fixed in every pose.
  const top=Math.round(26*wilt);
  for(let y=top;y<=26;y++){
    const src=Math.round((y-top)*26/(26-top));
    const shift=Math.round(offset*((26-src)/26)**1.4);
    for(const run of grid[src].join("").matchAll(/([^.])\1*/g)){
      const w=run[0].length,t=run[1];
      paths[t]=(paths[t]??"")+`M${run.index+shift} ${y}h${w}v1h-${w}z`;
    }
  }
  return Object.entries(paths);
}
export const flowerFrames={};
for(const [id,stages] of Object.entries(arrangements)){
  flowerFrames[id]={};
  for(const [stage,art] of Object.entries(stages)){
    const grid=compose(art);
    flowerFrames[id][stage]=[[0,0],[-2,0],[2,0],[2,.16],[4,.36],[5,.64]].map(([x,wilt])=>posePaths(grid,x,wilt));
  }
}
export const flowerInks={
  "bird-of-paradise":palettes.normal,
  "moth-orchid":{...palettes.normal,...palettes.orchid},
};
