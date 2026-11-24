import {collectorFoliage} from './shopSprites/collectorFoliage.js';
import * as flytrap from './shopSprites/venus-flytrap.js';
import * as sundew from './shopSprites/cape-sundew.js';
import * as pitcher from './shopSprites/white-top-pitcher.js';
import * as prayerPlant from './shopSprites/prayer-plant.js';
import * as pinkDiamond from './shopSprites/pink-diamond.js';
import * as pearlsAndJade from './shopSprites/pearls-and-jade.js';
import * as polkaDotBegonia from './shopSprites/polka-dot-begonia.js';
import * as ravenZz from './shopSprites/raven-zz.js';
import * as thaiConstellation from './shopSprites/thai-constellation.js';
import * as pinkPrincess from './shopSprites/pink-princess.js';
import * as variegatedBillie from './shopSprites/variegated-billie.js';
import {drawSelectionContour} from './roomContour.js';
import {approvedArt,featuredRoomScale} from './shopSprites/approved.js';
import * as monsteraAlbo from './shopSprites/monstera-albo.js';
import * as pinkMicans from './shopSprites/pink-micans.js';
import * as birdOfParadise from './shopSprites/bird-of-paradise.js';
import * as mothOrchid from './shopSprites/moth-orchid.js';
import * as bogFrog from './shopSprites/bog-frog-pot.js';
import * as lavaPop from './shopSprites/lava-pop-pot.js';

import * as honeyTerracotta from './shopSprites/honey-glazed-terracotta.js';
import * as blueWillow from './shopSprites/blue-willow-porcelain.js';
import * as sandstoneBowl from './shopSprites/low-sandstone-bowl.js';
import * as stumpCottage from './shopSprites/stump-cottage-pot.js';

import * as rainBoot from './shopSprites/rain-boot-pot.js';

import * as ringedPlanet from './shopSprites/ringed-planet-pot.js';

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
// All geometry uses native art pixels, relative to the pot's bottom center.
const shopPots={
  'honey-glazed-terracotta':{id:'honey-glazed-terracotta',art:honeyTerracotta,mouth:{soil:[0,-35],half:16,front:-32,arc:3},rise:0},
  'blue-willow-porcelain':{id:'blue-willow-porcelain',art:blueWillow,mouth:{soil:[0,-35],half:14,front:-32,arc:3},rise:0},
  'low-sandstone-bowl':{id:'low-sandstone-bowl',art:sandstoneBowl,mouth:{soil:[0,-20],half:19,front:-18,arc:3},rise:0},
  'ringed-planet-pot':{id:'ringed-planet-pot',art:ringedPlanet,mouth:{soil:[0,-37],half:7,front:-34,arc:2},rise:0},
  'rain-boot-pot':{id:'rain-boot-pot',art:rainBoot,mouth:{soil:[6,-42],half:8,front:-39,arc:3},rise:0},
  'stump-cottage-pot':{id:'stump-cottage-pot',art:stumpCottage,mouth:{soil:[0,-38],half:15,front:-33,arc:5},rise:0},
  terra:{id:'terra',art:approvedArt.terra,mouth:{soil:[0,-31],half:15,front:-27,arc:4},rise:0},
  wave:{id:'wave',art:approvedArt.wave,mouth:{soil:[0,-31],half:15,front:-26,arc:4},rise:0},
  'bog-frog-pot':{id:'bog-frog-pot',art:bogFrog,mouth:{soil:[0,-37],half:19,front:-35,arc:5,eyes:true},rise:0},
  'lava-pop-pot':{id:'lava-pop-pot',art:lavaPop,mouth:{soil:[0,-39],half:19,front:-33,arc:5},rise:5},
};
// A stalk strip is [first row, last row, left, right] in the foliage master.
// Everything outside the rooted stalks is crown artwork (blades, blooms and
// cascading shoots). It always paints above the ceramic, including both sides.
function plantArt(foliage,potStyle,socket,stalks,seatDepth=0){
  return {foliage,potStyle,socket,stalks,seatDepth};
}
const featuredPlants={
  ...Object.fromEntries(Object.entries(collectorFoliage).map(([sku,art]) => [sku,{
    ...plantArt(art,0,[0,-30],art.stalks),habit:'basal'
  }])),
  'venus-flytrap':{...plantArt(flytrap,0,[0,-30],[[-33,-28,-2,2]]),habit:'basal'},
  'cape-sundew':{...plantArt(sundew,0,[0,-30],[[-42,-28,-4,4]]),habit:'basal'},
  'white-top-pitcher':{...plantArt(pitcher,0,[0,-30],[[-46,-27,-5,5]]),habit:'basal'},
  'prayer-plant':{...plantArt(prayerPlant,1,[0,-28],[[-38,-33,-6,5],[-32,-25,-7,6]],12),maxRise:3},
  'pink-diamond':plantArt(pinkDiamond,0,[0,-28],[[-57,-38,-2,1],[-37,-25,-4,4]]),
  'pearls-and-jade':plantArt(pearlsAndJade,5,[0,-27],[[-29,-25,-2,2]]),
  'polka-dot-begonia':plantArt(polkaDotBegonia,4,[0,-28],[[-60,-41,-2,0],[-40,-25,-3,4]],9),
  'raven-zz':plantArt(ravenZz,3,[0,-28],[[-49,-35,-2,1],[-34,-25,-5,5]]),
  'thai-constellation':plantArt(thaiConstellation,2,[0,-28],[[-81,-44,-2,2],[-43,-25,-3,3]]),
  'pink-princess':plantArt(pinkPrincess,1,[3,-28],[[-56,-33,0,3],[-32,-25,1,5]]),
  'variegated-billie':plantArt(variegatedBillie,0,[-1,-28],[[-85,-46,-3,2],[-45,-35,-8,6],[-34,-25,-5,3]],9),
  'monstera-albo':plantArt(monsteraAlbo,3,[0,-32],[[-91,-52,-2,2],[-51,-29,-4,5]]),
  'pink-micans':plantArt(pinkMicans,2,[0,-30],[[-43,-35,-3,2],[-34,-27,-4,4]]),
  'bird-of-paradise':plantArt(birdOfParadise,1,[0,-30],[[-61,-39,-3,2],[-38,-27,-6,6]]),
  'moth-orchid':plantArt(mothOrchid,3,[0,-30],[[-36,-27,-5,5]]),
  'golden-pothos':nurserySpecimen('golden-pothos',[-5,-15],true,'vine'),
  'snake-plant':nurserySpecimen('snake-plant',[-1,-14],false,'basal'),
  'hoya-serpens-splash':nurserySpecimen('hoya-serpens-splash',[-1,-16],true,'vine'),
  'queen-anthurium':nurserySpecimen('queen-anthurium',[0,-15],true),
  'monkey-tail-cactus':nurserySpecimen('monkey-tail-cactus',[-1,-18],true,'basal'),
};
function nurserySpecimen(sku,crown,trailing,habit){
  const [x,y]=crown;
  return {...plantArt(approvedArt[sku+'-foliage'],0,crown,[[y-2,y+1,x-2,x+1]]),
    habit,nurseryId:sku,pot:approvedArt[sku+'-pot'],repotted:approvedArt[sku+'-repotted'],crown,trailing};
}
const plantSpecies=sku=>sku==='pothos'?'golden-pothos':sku==='snake'?'snake-plant':sku;
export const hasTrailingFoliage=sku=>featuredPlants[plantSpecies(sku)]?.trailing===true;
export const isShopPot=sku=>Object.hasOwn(shopPots,sku);
export const isShopPlant=sku=>Object.hasOwn(featuredPlants,plantSpecies(sku)) || sku==='monstera';
const glazeInk=38;

const originalBounds={leftEdge:-29,topEdge:-54,width:59,height:58};
const shopBounds={leftEdge:-32,topEdge:-60,width:65,height:67};
const trailingBounds={...shopBounds,height:101};
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

function makeGrid({leftEdge,topEdge,width,height},density) {
  const cells = new Uint16Array(width * height);
  function nativeDot(x,y,ink) {
    if (x >= leftEdge && x < leftEdge+width && y >= topEdge && y < topEdge+height)
      cells[(y-topEdge)*width+x-leftEdge] = ink;
  }
  const dot = density===1 ? nativeDot : (x,y,ink) => {
    for(let dy=0;dy<density;dy++)
      for(let dx=0;dx<density;dx++)nativeDot(x*density+dx,y*density+dy,ink);
  };
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
  return { cells,dot,nativeDot,span,line };
}

function ceramic(grid,style) {
  const { wall,motif }=ceramics[style];
  const { span,dot,line }=grid;
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
  const foot=wall[wall.length-1];
  span(-foot+1,-1,2*foot-1,clay+1);
  span(-foot+2,-1,Math.max(2,foot-1),clay+3);
  span(-rim+2,-13,Math.max(2,rim-4),clay+4);
  span(-rim+4,-14,3,soilLight);dot(-1,-15,soilLight);dot(3,-14,loam);
}

const outlines = [
  // blade, notch x/y (where its petiole enters), direction, usual leaf ramp
  [1,-6,-43,1,1], [3,4,-42,-1,2], [0,-10,-31,1,0], [2,14,-33,-1,0], [3,2,-27,1,1],
];
const notches = [[13,2],[11,2],[10,3],[9,1]];
function canopy(grid,blades,hash,pose) {
  const { line,dot,span }=grid;
  const mirror=(hash&1)?-1:1;
  const lean=((hash>>>1)%5)-2;
  const taller=(hash>>>5)%4;
  const canopyDrop=6;
  const rootX=0;
  const placed=outlines.map(([kind,ax,ay,direction,ramp],i) => {
    const bump=(hash>>>(8+i*3))&3;
    const x=(ax+(i===2?-Math.floor(bump/2):i===1?Math.floor(bump/2):i===4?bump-2:0))*mirror+lean+pose;
    const y=ay+canopyDrop-taller+(i<2?bump-1:0);
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
  line(rootX,-16,unfurl,-38+canopyDrop-taller,stem);
  line(unfurl,-37+canopyDrop-taller,unfurl+2*mirror,-43+canopyDrop-taller,newLeaf);
  line(unfurl+mirror,-38+canopyDrop-taller,unfurl+3*mirror,-43+canopyDrop-taller,stemLight);
  dot(unfurl+3*mirror,-44+canopyDrop-taller,newLeaf);
  line(unfurl+2*mirror,-41+canopyDrop-taller,unfurl+4*mirror,-43+canopyDrop-taller,newLeaf);
  dot(unfurl+3*mirror,-42+canopyDrop-taller,stemLight);
  placed.forEach(({kind,x,y,direction,ramp},i) => {
    const [nx,ny]=notches[kind], ink=leavesInInk[kind];
    if(i===3 && (hash&8)) ramp=2;
    ink.forEach((row,ry) => row.forEach((shade,rx) => {
      if(shade>=0) blades.dot(x+(rx-nx)*direction,y+ry-ny,green+ramp*7+shade);
    }));
  });
  span(rootX-2,-14,4,stemDark); dot(rootX-1,-15,stemLight);
  // A trailing aerial root curls in the air beside the crown.
  const side=-mirror;
  line(rootX,-21,rootX+3*side,-21,loam);
  line(rootX+3*side,-21,rootX+5*side,-18,soilLight);
  line(rootX+5*side,-18,rootX+5*side,-16,soilLight);
}

const still=()=>0;
function drawSpriteRows(dot,{spriteRows,spriteOffset},firstInk,swayAt=still){
  for(let row=0;row<spriteRows.length;row++){
    const y=spriteOffset.y+row,sway=swayAt(y);
    const cells=spriteRows[row];
    for(let col=0;col<cells.length;col++){
      const shade=cells.charCodeAt(col)-65;
      if(shade>=0)dot(spriteOffset.x+col+sway,y,firstInk+shade,spriteOffset.x+col);
    }
  }
}

// Coordinates are double-density pixels. The front edge curves up at the
// sides of the opening. Keep the painted rim visible wherever a stalk enters it.
function frontEdge(x,mouth){
  const edge=Math.min(1,Math.abs(x)/mouth.half);
  let y=mouth.front-mouth.arc*edge**2;
  // The green brows are part of the front wall above the central lip.
  if(mouth.eyes){
    const distance=Math.abs(Math.abs(x)-10);
    if(distance<=5)y=Math.min(y,-40+Math.max(0,distance-2));
  }
  return Math.ceil(y);
}

function paintStalkExtension(grid,art,firstInk,socket,topX,topY,rootX,rootY){
  if(topY>=rootY)return;
  const [sx,sy]=socket;
  const row=art.spriteRows[sy-art.spriteOffset.y] ?? '';
  const stroke=[];
  for(let x=sx-2;x<=sx+2;x++){
    const shade=row.charCodeAt(x-art.spriteOffset.x)-65;
    if(shade>=0)stroke.push([x-sx,firstInk+shade]);
  }
  // A crown with an open center still has a short living neck below the leaves.
  if(!stroke.length)stroke.push([-1,stemDark],[0,stemLight],[1,stem]);
  for(let y=topY;y<=rootY;y++){
    const t=(y-topY)/(rootY-topY);
    const x=Math.round(topX+(rootX-topX)*t);
    for(const [offset,ink] of stroke)grid.nativeDot(x+offset,y,ink);
  }
}

function drawPlantParts(stalks,blades,plant,pot,mouth,pose,firstInk){
  const hanging=pot && plant.repotted;
  const art=hanging || plant.foliage;
  const soilMounted=plant.habit==='basal' || plant.habit==='vine';
  const socket=hanging?(plant.nurseryId==='monkey-tail-cactus'?[-1,1]:[0,0]):plant.socket;
  const [soilX,soilY]=mouth.soil;
  const dx=soilX-socket[0];
  const rise=Math.min(plant.maxRise ?? Infinity,pot?.rise ?? 0);
  let dy;
  if(soilMounted)dy=soilY-socket[1];
  else if(plant.nurseryId==='queen-anthurium'){
    // Its pendant blades hang from short petioles above a single centered node.
    dy=soilY-socket[1]-(hanging?8:5);
  }else{
    const crownY=plant.crown?.[1] ?? -28;
    dy=(pot?mouth.front+2-crownY:0)+(rise?0:plant.seatDepth)-rise;
  }
  const sway=y=>Math.round(pose*2*Math.min(1,Math.max(0,(Math.abs(y-socket[1])-3)/42)));
  if(!soilMounted)paintStalkExtension(stalks,art,firstInk,socket,socket[0]+dx,socket[1]+dy,soilX,mouth.front+1);
  const strips=hanging?[[-4,1,-2,2]]:plant.stalks;
  drawSpriteRows((x,y,ink,sourceX)=>{
    const isStalk=strips.some(([top,bottom,left,right])=>y>=top && y<=bottom && sourceX>=left && sourceX<=right);
    (isStalk?stalks:blades).nativeDot(x+dx,y+dy,ink);
  },art,firstInk,sway);
}

// Restore the body behind the missing pixels in old nursery masters, which
// were originally cut from flattened plant-and-pot illustrations.
function nurseryPot(grid,plant){
  const [cx,cy]=plant.crown;
  const h=-cy+2;
  const backing=makeGrid(originalBounds,1);
  ceramic(backing,plant.potStyle);
  for(let y=-h;y<=0;y++)for(let x=-9;x<=9;x++){
    const row=Math.round(y*16/h)-originalBounds.topEdge;
    const col=Math.round(x/.75)-originalBounds.leftEdge;
    const ink=backing.cells[row*originalBounds.width+col];
    if(ink>=soilShadow)grid.nativeDot(cx+x,y,ink);
  }
  drawSpriteRows(grid.nativeDot,plant.pot,glazeInk);
}

// Trace only the lowest four native rows of the empty vessel. A split foot
// keeps its gap, and an asymmetric sole follows the pot instead of its plant.
function addContactShadow(cells,width){
  let last=cells.length-1;
  while(last>=0 && cells[last]<clay)last--;
  if(last<0)return;
  const bottom=Math.floor(last/width);
  function shade(col,row,ink){
    if(col<0 || col>=width || row<0 || row*width+col>=cells.length)return;
    const i=row*width+col;
    if(cells[i]<ink)cells[i]=ink;
  }
  for(let col=0;col<width;col++){
    for(let row=bottom;row>=Math.max(0,bottom-3);row--){
      if(cells[row*width+col]<clay)continue;
      shade(col,row+1,shadowFirm);
      for(let dx=-2;dx<=2;dx++)shade(col+dx,row+1,shadowSoft);
      for(let dx=-1;dx<=1;dx++)shade(col+dx,row+2,shadowSoft);
      shade(col,row+3,shadowSoft);
      break;
    }
  }
}

const potCache=new Map();
function potLayers(bounds,density,style,pot,plant,preview,mouth){
  const nursery=pot?null:plant?.pot;
  const key=[style,pot?.id,nursery && plant.nurseryId,bounds.width,bounds.height,bounds.topEdge,preview].join('/');
  if(potCache.has(key))return potCache.get(key);
  const vessel=makeGrid(bounds,density);
  if(pot)drawSpriteRows(vessel.nativeDot,pot.art,glazeInk);
  else if(nursery)nurseryPot(vessel,plant);
  else ceramic(vessel,style);
  if(!preview)addContactShadow(vessel.cells,bounds.width);
  const front=new Uint16Array(vessel.cells.length);
  const factor=density/2;
  const cx=mouth.soil[0];
  for(let col=0;col<bounds.width;col++){
    const x=(bounds.leftEdge+col)/factor-cx;
    const edge=Math.ceil(frontEdge(x,mouth)*factor)-bounds.topEdge;
    for(let row=Math.max(0,edge);row<bounds.height;row++){
      const i=row*bounds.width+col;
      if(vessel.cells[i]>=clay){front[i]=vessel.cells[i];vessel.cells[i]=0;}
    }
  }
  const layers={back:vessel.cells,front};
  potCache.set(key,layers);
  return layers;
}

function sprite(style,hash,pose,pot,plant,density,preview,bare) {
  const sourceBounds=plant?.trailing?trailingBounds:pot || plant?shopBounds:originalBounds;
  const bounds=Object.fromEntries(Object.entries(sourceBounds).map(([key,v])=>[key,v*density]));
  // Preserve the full canopy when a tall vessel lifts it above the normal stamp.
  if(pot){bounds.topEdge-=32;bounds.height+=32;}
  const stalks=makeGrid(bounds,density),blades=makeGrid(bounds,density);
  const mouth=pot?.mouth ?? (plant?.pot?{soil:plant.crown,half:9,front:plant.crown[1]+2,arc:2}:
    {soil:[0,-29],half:(ceramics[style].wall[0]-1)*2,front:-26,arc:0});
  const vessel=potLayers(bounds,density,style,pot,plant,preview,mouth);
  if(plant){
    const base=pot?.art ?? plant.pot;
    drawPlantParts(stalks,blades,plant,pot,mouth,pose,glazeInk+(base?.spritePalette.length ?? 0));
  }else if(hash!==null){
    const lift=pot?Math.round((-28-mouth.soil[1])/2):0;
    const dx=Math.round(mouth.soil[0]/2);
    const shift=g=>({
      dot:(x,y,i)=>g.dot(x+dx,y-lift,i),span:(x,y,n,i)=>g.span(x+dx,y-lift,n,i),
      line:(x,y,ex,ey,i)=>g.line(x+dx,y-lift,ex+dx,ey-lift,i)
    });
    canopy(shift(stalks),shift(blades),hash,pose);
  }
  // Composite back pot/soil, stalks, front pot, leaves. Merge once per cached
  // pose. Lighting and drawing reuse indexed runs without separate canvases.
  for(let i=0;i<blades.cells.length;i++){
    blades.cells[i]=blades.cells[i] || (!bare && vessel.front[i]) || stalks.cells[i] || (!bare && vessel.back[i]);
  }
  return runsFromGrid(blades,bounds);
}

function runsFromGrid(grid,{leftEdge,topEdge,width,height}){
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
function litColor(hex,night,selected) {
  const rgb=parseInt(hex.slice(1),16);
  const r=rgb>>16,g=(rgb>>8)&255,b=rgb&255;
  // Moonlight keeps blue and green reflected from the window, even on the clay.
  const shift=(c,d,glaze)=>{
    const lit=c+(d-c)*night;
    return Math.round(selected ? lit+(glaze-lit)*.24 : lit);
  };
  return 'rgb('+shift(r,r*.58+5,255)+','+shift(g,g*.62+9,230)+','+shift(b,b*.74+16,169)+')';
}
function colors(style,night,selected,finish,featuredSku) {
  const step=Math.max(0,Math.min(48,Math.round(night*48)));
  const key=[style,finish,featuredSku,step,selected].join('/');
  if(!blended.has(key)){
    const n=step/48,plant=featuredPlants[featuredSku];
    const base=shopPots[finish]?.art ?? plant?.pot;
    const foliage=(finish && plant?.repotted) || plant?.foliage;
    blended.set(key,[null,`rgba(44,35,40,${.14-.06*n})`,`rgba(38,32,38,${.26-.10*n})`,
      ...[...common,...ceramics[style].day,...leaves.flat(),
        ...(base?.spritePalette ?? []),...(foliage?.spritePalette ?? [])]
        .map(ink=>litColor(ink,n,selected))]);
  }
  return blended.get(key);
}

/** Draw at logical room coordinates. x/y is the bottom center of the ceramic,
 * size 1 gives a roughly 22px rim, and time is elapsed milliseconds. */
export function drawPottedPlant(ctx,{x,y,size=1,plant=null,potSku=null,night=0,time=0,reducedMotion=false,selected=false,preview=false,bare=false,rasterScale=1}) {
  if(!ctx || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size) || size<=0)return;
  const hash=plant?identity(plant):null;
  const species=plantSpecies(plant?.species);
  const featured=Object.hasOwn(featuredPlants,species)?featuredPlants[species]:null;
  if(!plant && !isShopPot(potSku))return;
  // A resident supplies its own nursery vessel until an owned pot is placed.
  const style=featured?.potStyle ?? 0;
  const finish=isShopPot(potSku)?potSku:featured?.pot?null:'terra';
  const pot=shopPots[finish],density=2;
  if(!preview && !pot && featured?.repotted)size*=featuredRoomScale;
  const pose=hash===null || reducedMotion || !Number.isFinite(time)?0:Math.round(Math.sin(time*.00115+(hash%83)*.12)*.82);
  const key=[style,hash,pose,species,finish,preview,bare].join(':');
  let runs=poses.get(key);
  if(!runs) {
    runs=sprite(style,hash,pose,pot,featured,density,preview,bare);
    if(poses.size>=192)poses.delete(poses.keys().next().value);
    poses.set(key,runs);
  }
  const paletteStyle=featured?.pot && !pot?featured.potStyle:style;
  const ink=colors(paletteStyle,Number.isFinite(night)?night:0,selected,finish,featured?species:null);
  // The moving reflection is clipped to the painted leaves and ceramic runs.
  // A stationary reflection on the rim also works with reduced motion.
  const sweep=(reducedMotion ? -8 : (time%3600)*.035-45)*density;
  size/=density;
  ctx.save();
  if(rasterScale!==1){
    // Snap authored runs after converting the anchor and size to backing pixels.
    ctx.scale(1/rasterScale,1/rasterScale);
    x*=rasterScale;y*=rasterScale;size*=rasterScale;
  }
  for(let i=1;i<runs.length;i++){
    if(selected && i===soilShadow)
      drawSelectionContour(ctx,runs,{x,y,size,firstInk:soilShadow,rasterScale});
    const cells=runs[i];
    if(!cells)continue;
    ctx.fillStyle=ink[i];
    for(let j=0;j<cells.length;j+=3){
      const px=cells[j],py=cells[j+1],left=Math.round(x+size*px),top=Math.round(y+size*py);
      const w=Math.round(x+size*(px+cells[j+2]))-left,h=Math.round(y+size*(py+1))-top;
      if(w && h)ctx.fillRect(left,top,w,h);
      if(selected && i>shadowFirm && w && h){
        const start=Math.round(sweep-py*.36);
        const first=Math.max(px,start),end=Math.min(px+cells[j+2],start+4*density);
        if(first<end){
          const from=Math.round(x+size*first);
          ctx.fillStyle='rgba(255,246,203,.56)';
          ctx.fillRect(from,top,Math.round(x+size*end)-from,h);
          ctx.fillStyle=ink[i];
        }
      }
    }
  }
  ctx.restore();
}
