// Each graduate is inked on a small logical grid. Transparent cells in each
// blade reveal the stem, other leaves, or the actual room through the splits.
const sideBlade = [
  '        dddd   aa',
  '     dddhhhmdaahg',
  '   ddhhmmlhmmdhgg',
  '  dhhml  gmmmmggb',
  ' dmhml  gmmmlggb',
  ' ahhmmmmlmm  ggb',
  '  aagmlmmg  ggb',
  '    aglmmgggb',
  '   dhmmlmggbb',
  '  dhm mgga',
  ' dhm mggb',
  ' ahmmgga',
  '  ammga',
  '  amgb',
  '   ab',
];
const highBlade = [
  '     dddd    ddd',
  '   ddhhhmma dhhmba',
  '  dhhhhmmmgahmmggb',
  ' dhhml  gmmmlmmgb',
  ' dhml  gmmmmmlggb',
  ' dhmmmmlmlmmgggba',
  '  aahmmmlg  ggb',
  '    dhmlgg ggb',
  '   dh mlmgggba',
  '  ah mmlggb',
  '  ahmmlggbb',
  '   ammlgb',
  '    amgb',
  '    amb',
  '     b',
];
const frontBlade = [
  '    ddd      ddd',
  '  ddhhmdda  dhhmgd',
  ' dhhhmmmhmagmhhmggb',
  ' dhhml  mmhmhhhhmgb',
  ' dhml  mmmhlmm  ggb',
  '  ammmmmmlhlm  ggb',
  '    agmmmmhmgmmgga',
  '    dhllmmhmgggba',
  '   dhm  gmhmgba',
  '    am gmmhmggbb',
  '     ammmmhmg  a',
  '      agmmhmggb',
  '      dhmlmggb',
  '       agmlgb',
  '        ammg',
  '         amb',
  '          b',
];
const littleBlade = [
  '      ddd  dd',
  '    ddhhmddhgb',
  '  ddhhlmmhmmgb',
  ' dhhmlmmlmggb',
  ' dhmmmlmgggb',
  '  ammmlggba',
  '  ammlggb',
  '   amggb',
  '    agb',
  '    ab',
];

// In each set the highlight falls on the upper, window-facing lobe; the
// underside and the younger leaf use their own ramps rather than uniform tints.
const leaves = [
  ['#23483d','#315845','#427453','#57885a','#719b65','#87af74','#b4c585'],
  ['#213f39','#2d5247','#376956','#4c7e61','#639374','#81a77b','#afc292'],
  ['#355043','#466749','#63905b','#729d64','#8caf72','#acc18a','#cdd397'],
];
const ceramics = [
  { // warm speckled stoneware bowl on a recessed foot
    day:['#724b3f','#975f4d','#ba7860','#d19070','#e4ac85','#f0c39b'], wall:[10,11,11,11,10,10,9,8,7,5,6,5], motif:'flecks' },
  { // celadon, cut into vertical flutes
    day:['#435d58','#58796b','#739180','#92ac92','#accaac','#d4d9b8'], wall:[10,10,10,10,10,10,9,9,8,8,7,6], motif:'flutes' },
  { // pale porcelain with a loose cobalt-brush branch
    day:['#515961','#6a7780','#8e9b9b','#abb8ac','#c9ceba','#e4ddc0'], wall:[8,9,10,11,11,11,10,9,7,6,7,6], motif:'brush' },
  { // iron-rich tenmoku glaze with a russet slip band
    day:['#514345','#685052','#835e57','#a77561','#bb9471','#d3ae85'], wall:[10,10,10,9,9,9,8,8,7,7,6,5], motif:'bands' },
  { // sand-colored earthenware with a stamped diamond band
    day:['#776347','#9e8056','#b99a6e','#d5b384','#e3c69a','#f2d9b0'], wall:[11,10,10,10,10,10,9,9,8,8,7,7], motif:'stamps' },
  { // indigo ceramic with pooling blue glaze
    day:['#3c5057','#4b646c','#658186','#809a9d','#a7b6ac','#c9cdb6'], wall:[9,9,10,10,10,10,10,9,9,8,7,6], motif:'glaze' },
];

const leftEdge = -29, topEdge = -54, width = 59, height = 58;
const shadowSoft = 1, shadowFirm = 2, soilShadow = 3, soil = 4, soilLight = 5, loam = 6;
const stemDark = 7, stem = 8, stemLight = 9, newLeaf = 10;
const clay = 11, green = 17;
const leafKeys = 'abgmdhl';
const leavesInInk = [sideBlade, highBlade, frontBlade, littleBlade].map(rows =>
  rows.map(row => Array.from(row, ch => leafKeys.indexOf(ch)))
);

function identity(plant) {
  const value = String(plant.id ?? plant.plantedAt ?? plant.generation ?? 'monstera');
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function makeGrid() {
  const cells = new Uint8Array(width * height);
  function dot(x,y,ink) {
    if (x >= leftEdge && x < leftEdge+width && y >= topEdge && y < topEdge+height)
      cells[(y-topEdge)*width+x-leftEdge] = ink;
  }
  function span(x,y,n,ink) {
    for (let i=0;i<n;i++) dot(x+i,y,ink);
  }
  function line(x,y,endX,endY,ink) {
    const dx=Math.abs(endX-x), dy=-Math.abs(endY-y);
    const sx=x<endX?1:-1, sy=y<endY?1:-1;
    let error=dx+dy;
    while (true) {
      dot(x,y,ink);
      if(x===endX && y===endY) return;
      const twice=2*error;
      if(twice>=dy) {error+=dy;x+=sx;}
      if(twice<=dx) {error+=dx;y+=sy;}
    }
  }
  return { cells,dot,span,line };
}

function ceramic(grid,style) {
  const { wall,motif }=ceramics[style];
  const { span,dot,line }=grid;
  span(-8,0,21,shadowSoft); span(-10,1,27,shadowSoft);
  span(-7,2,20,shadowSoft); span(-5,0,16,shadowFirm); span(-4,1,13,shadowFirm);
  wall.forEach((radius,row) => {
    const y=row-wall.length+1;
    span(-radius,y,2*radius+1,clay);
    span(-radius+1,y,2*radius-1,clay+1);
    if (row===wall.length-1) return;
    span(-radius+1,y,2*radius-4,clay+2);
    span(-radius+2,y,Math.max(2,radius+1-(row>>2)),clay+3);
    span(-radius+3,y,Math.max(1,Math.floor(radius/2)-1-(row>>2)),clay+4);
    if (row===wall.length-2) span(-radius+1,y,radius,clay+2);
  });
  if(motif==='flutes'){
    for(const [x,tone] of [[-7,4],[-4,3],[0,3],[4,2],[7,1]]) {
      const end=x-Math.sign(x);
      line(x,-9,end,-4,clay+tone); line(x+1,-8,end+1,-4,clay+tone-1);
    }
  }else if(motif==='brush'){
    const brush=clay;
    line(-5,-4,-1,-7,brush); line(-1,-7,4,-9,brush);
    span(-5,-7,3,clay+1); dot(-4,-6,brush);
    span(-1,-9,2,clay+1); dot(0,-8,brush);span(2,-6,2,clay+1);
    dot(2,-7,brush);dot(5,-10,clay+1);
  }else if(motif==='bands'){
    span(-8,-8,15,clay+4);span(-8,-7,15,clay+1);span(-7,-4,12,clay+3);
    span(-5,-8,4,clay+5);dot(7,-8,clay+2);
  }else if(motif==='stamps'){
    for (const x of [-6,0,6]) {
      dot(x,-8,clay+2); dot(x-1,-7,clay+1); dot(x+1,-7,clay+1);dot(x,-6,clay+2);
    }
    span(-8,-5,15,clay+3);
  }else if(motif==='glaze'){
    for (const [x,n] of [[-7,2],[-4,4],[-2,3],[3,2],[5,4]]) {
      line(x,-9,x,-9+n,clay+3);dot(x,-9+n,clay+2);
    }
    dot(-6,-7,clay+5);dot(2,-8,clay+4);
  }else{
    for(const [x,y,tone] of [[-6,-8,2],[-7,-5,5],[-2,-6,4],[2,-8,4],[4,-5,1],[1,-4,2],[6,-7,2]])
      dot(x,y,clay+tone);
  }
  // Elliptical lip with a dark inner wall; the warm soil is visible in empty pots.
  const rim=wall[0]+1;
  span(-rim+3,-16,2*rim-5,clay+3);
  span(-rim+1,-15,2*rim-1,clay+4);
  span(-rim,-14,2*rim+1,clay+1);
  span(-rim,-13,2*rim+1,clay+3);
  span(-rim+1,-12,2*rim-1,clay+1);
  span(-rim+3,-12,2*rim-7,clay+2);
  span(-rim+1,-13,rim+3,clay+5);
  span(-rim+3,-15,2*rim-6,soil);
  span(-rim+5,-15,2*rim-10,soilShadow);
  span(-rim+2,-14,2*rim-4,soil);
  span(-rim+4,-14,3,soilLight);dot(-1,-15,soilLight);dot(3,-14,loam);
}

const outlines = [
  // blade, notch x/y (where its petiole enters), direction, usual leaf ramp
  [1,-6,-43,1,1], [3,4,-42,-1,2], [0,-10,-31,1,0], [2,14,-33,-1,0], [3,2,-27,1,1],
];
const notches = [[13,2],[11,2],[10,3],[9,1]];
function canopy(grid,hash,pose) {
  const { line,dot,span }=grid;
  const mirror=(hash&1)?-1:1;
  const lean=((hash>>>1)%5)-2;
  const taller=(hash>>>5)%4;
  const rootX=((hash>>>9)%3)-1;
  const placed=outlines.map(([kind,ax,ay,direction,ramp],i) => {
    const bump=(hash>>>(8+i*3))&3;
    const x=(ax+(i===2?-Math.floor(bump/2):i===1?Math.floor(bump/2):i===4?bump-2:0))*mirror+lean+pose;
    const y=ay-taller+(i<2?bump-1:0);
    return {kind,x,y,direction:direction*mirror,ramp};
  });
  // Each petiole grows from its own staggered node. The last stretch arches up
  // before the blade hangs down, leaving clear gaps of sky between mature leaves.
  placed.forEach(({x,y},i) => {
    const baseX=rootX+(i%3)-1,baseY=-14;
    const elbowX=Math.round(x*.16)+rootX, elbowY=Math.round((y+baseY)/2);
    const kneeX=Math.round(x*.63),kneeY=y+3;
    line(baseX,baseY,elbowX,elbowY,stemDark);
    line(elbowX,elbowY,kneeX,kneeY,i%2?stem:stemDark);
    line(kneeX,kneeY,x,y,stem);
    if(i===0 || i===3)line(elbowX-1,elbowY,kneeX-1,kneeY,stemLight);
  });
  // Curl and papery sheath of the next, still-unrolling blade.
  const unfurl=lean+2*mirror+pose;
  line(rootX,-16,unfurl,-38-taller,stem);
  line(unfurl,-37-taller,unfurl+2*mirror,-43-taller,newLeaf);
  line(unfurl+mirror,-38-taller,unfurl+3*mirror,-43-taller,stemLight);
  dot(unfurl+3*mirror,-44-taller,newLeaf);
  placed.forEach(({kind,x,y,direction,ramp},i) => {
    const [nx,ny]=notches[kind], ink=leavesInInk[kind];
    if(i===3 && (hash&8)) ramp=2;
    ink.forEach((row,ry) => row.forEach((shade,rx) => {
      if(shade>=0) dot(x+(rx-nx)*direction,y+ry-ny,green+ramp*7+shade);
    }));
  });
  span(rootX-2,-14,4,stemDark); dot(rootX-1,-15,stemLight);
  // A trailing aerial root curls in the air beside the crown.
  const side=-mirror;
  line(rootX,-21,rootX+3*side,-21,loam);
  line(rootX+3*side,-21,rootX+5*side,-18,soilLight);
  line(rootX+5*side,-18,rootX+5*side,-16,soilLight);
}

function sprite(style,hash,pose) {
  const grid=makeGrid();
  ceramic(grid,style);
  if(hash!==null)canopy(grid,hash,pose);
  // Merge adjacent cells of a single color into horizontal runs. Keeping the
  // drawing indexed makes room lighting independent of the cached plant pose.
  const runs=[];
  for(let row=0;row<height;row++){
    for(let col=0;col<width;){
      const ink=grid.cells[row*width+col],start=col;
      do {col++;} while(col<width && grid.cells[row*width+col]===ink);
      if(!ink)continue;
      (runs[ink]??=[]).push(start+leftEdge,row+topEdge,col-start);
    }
  }
  return runs;
}

const common = ['#3c322e','#574638','#836751','#aa8a64','#3f5945','#59794d','#899d61','#b4bf79'];
const blended = new Map(), poses = new Map();
function litColor(hex,night) {
  const rgb=parseInt(hex.slice(1),16);
  const r=rgb>>16,g=(rgb>>8)&255,b=rgb&255;
  // Moonlight keeps blue and green reflected from the window, even on the clay.
  const shift=(c,d)=>Math.round(c+(d-c)*night);
  return 'rgb('+shift(r,r*.58+5)+','+shift(g,g*.62+9)+','+shift(b,b*.74+16)+')';
}
function colors(style,night) {
  const step=Math.max(0,Math.min(48,Math.round(night*48))),key=style*49+step;
  if(!blended.has(key)){
    const n=step/48;
    blended.set(key,[null,'rgba(53,42,49,.14)','rgba(47,37,44,.28)',
      ...[...common,...ceramics[style].day,...leaves.flat()].map(ink=>litColor(ink,n))]);
  }
  return blended.get(key);
}

/** Draw at logical room coordinates. x/y is the bottom center of the ceramic,
 * size 1 gives a roughly 22px rim, and time is elapsed milliseconds. */
export function drawPottedPlant(ctx,{x,y,size=1,plant=null,styleIndex=0,night=0,time=0,reducedMotion=false}) {
  if(!ctx || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size) || size<=0)return;
  const hash=plant?identity(plant):null;
  const chosen=Number.isInteger(plant?.potStyle)?plant.potStyle:hash===null?styleIndex:hash>>>12;
  const style=((Math.trunc(chosen)||0)%ceramics.length+ceramics.length)%ceramics.length;
  const pose=hash===null || reducedMotion || !Number.isFinite(time)?0:Math.round(Math.sin(time*.00115+(hash%83)*.12)*.82);
  const key=style+':'+hash+':'+pose;
  let runs=poses.get(key);
  if(!runs) {
    runs=sprite(style,hash,pose);
    if(poses.size>=192)poses.delete(poses.keys().next().value);
    poses.set(key,runs);
  }
  const ink=colors(style,Number.isFinite(night)?night:0);
  ctx.save();
  for(let i=1;i<runs.length;i++){
    const cells=runs[i];
    if(!cells)continue;
    ctx.fillStyle=ink[i];
    for(let j=0;j<cells.length;j+=3){
      const px=cells[j],py=cells[j+1],left=Math.round(x+size*px),top=Math.round(y+size*py);
      const w=Math.round(x+size*(px+cells[j+2]))-left,h=Math.round(y+size*(py+1))-top;
      if(w && h)ctx.fillRect(left,top,w,h);
    }
  }
  ctx.restore();
}
