// The original six addresses per room are part of existing saves and backups.
// Additional surfaces have named addresses so extending a room never renumbers a plant.
const ORIGINAL_PLACES=6;
const VIEWS_PER_SUITE=2;
// Perspective belongs to the supporting furniture. Shelf clearance is tight
// on the lower bookcase, so every tier uses the same conservative scale.
export const surfaceScale=Object.freeze({shelf:.72,window:.80,coffeeTable:.94,desk:.86,displayStand:1});

function floorScale(contactY,extraFloor){
  if(contactY<=287)return .91+.15*Math.max(0,(contactY-256)/31);
  // Use the extended floor on tall screens; the two front anchors can switch order.
  const nearest=306+.57*extraFloor;
  return 1.06+.06*Math.min(1,(contactY-287)/(nearest-287));
}

// Each furniture row is centered on its usable surface. Keys already present
// in saved gardens (including the two former decor-only mounts) stay stable.
const living=[];
function livingRow(layer,y,clip,entries,front=0){
  for(const [key,name,x] of entries)living.push([key,name,x,y,layer,clip,front]);
}
livingRow('shelf',46,[10,0,99,48],[
  ['bookcase-top-left','Bookcase top, beside the basket',56],['decor-bookcase','Bookcase top',81],
]);
for(const [key,tier,y,top] of [[0,'Upper',96,54],[1,'Middle',141,104],[2,'Lower',186,149]]){
  livingRow('shelf',y,[17,top,88,y+2],[
    [key,tier+' bookcase shelf',36],['shelf-'+key+'-right',tier+' bookcase shelf, right',73],
  ]);
}
livingRow('window',139,[108,41,321,141],[
  ['window-left','Left end of the living room windowsill',125],
  ['window-2','Living room windowsill, second spot',150],
  ['window-3','Living room windowsill, third spot',175],
  ['window-middle','Center of the living room windowsill',200],
  ['window-5','Living room windowsill, fifth spot',225],
  [3,'Living room windowsill',250],['window-7','Living room windowsill, seventh spot',275],
  ['decor-sill','Right windowsill',300],
]);
livingRow('table',245,[122,0,268,252],[
  ['table-left','Left end of the coffee table',136],[4,'Coffee table',161],
  ['table-end','Center of the coffee table',186],['table-4','Coffee table, right of center',211],
  ['table-right','Coffee table, beside the teacup',236],
]);
livingRow('floor',226,null,[['sofa-left','Floor by the left sofa arm',105],['sofa-right','Floor by the right sofa arm',318]]);
livingRow('floor',248,null,[['rug-left','Left edge of the rug',81],['rug-right','Right edge of the rug',326]]);
livingRow('floor',268,null,[['bookcase-floor','Floor by the bookcase',59],[5,'Beside the sofa',347]]);
livingRow('floor',287,null,Array.from({length:8},(_,i)=>['floor-row-'+(i+1),'Open floor, spot '+(i+1),25+50*i]),.20);
livingRow('floor',309,null,[
  ['front-left','Front left floor',39],['front-2','Front floor, second spot',103],
  ['front-3','Front floor, third spot',167],['front-4','Front floor, fourth spot',231],
  ['front-right','Front right floor',295],['front-6','Far right front floor',359],
],.42);
// Preserve the array positions of the six original numeric places for scenery callers.
living.sort((a,b)=>(typeof a[0]==='number'?a[0]:6)-(typeof b[0]==='number'?b[0]:6));
const rows=[living,[
    [0,'Upper studio shelf',43,80,'shelf',[18,32,94,82]],
    [1,'Lower studio shelf',61,129,'shelf',[23,88,96,131]],
    [2,'Studio cabinet',50,180,'shelf',[12,137,89,182]],
    [3,'Studio windowsill',235,143,'window',[117,52,284,145]],
    [4,'Drawing desk',150,196,'table',[105,0,281,199]],
    [5,'Beside the easel',316,290,'floor'],
    ['window-left','Left end of the studio windowsill',137,143,'window',[117,52,284,145]],
    ['window-middle','Center of the studio windowsill',187,143,'window',[117,52,284,145]],
    ['desk-end','Center of the drawing desk',197,196,'table',[105,0,281,199]],
    ['cabinet-floor','Floor by the studio cabinet',57,256,'floor'],
    ['front-left','Front left studio floor',74,303,'floor',null,.57],
    ['front-right','Front right studio floor',253,306,'floor',null,.39],
  ]
];
// All objects on a living-room floor line have the same physical scale on
// every screen. Portrait height adds space between the two foreground rows.
const livingFloorSize=new Map([[226,.90],[248,1.00],[268,1.12],[287,1.27],[309,1.45]]);
const places=rows.map((room,index)=>room.map(([key,name,x,y,layer,clip,front=0])=>{
  const surface=layer==='table'?(index===0?'coffeeTable':'desk'):layer;
  const size=layer==='floor'?(index===0?livingFloorSize.get(y):floorScale(y,0)):surfaceScale[surface];
  return {key,name,x:x/400,y:y/320,baseY:y,size,layer,clip,front,behindTable:index===0 && layer==='floor' && y<238};
}));
export function placesFor(view,extraFloor=0){
  const room=places[view%2];
  if(!extraFloor)return room;
  return room.map(spot=>{
    if(spot.layer!=='floor')return spot;
    const baseY=spot.baseY+spot.front*extraFloor;
    return {...spot,baseY,size:view%2?floorScale(baseY,extraFloor):spot.size};
  });
}
export const slotFor=(view,spot)=>typeof spot.key==='number'?view*ORIGINAL_PLACES+spot.key:view+'/'+spot.key;
export function viewForSlot(slot){
  if(Number.isSafeInteger(slot) && slot>=0)return Math.floor(slot/ORIGINAL_PLACES);
  if(typeof slot!=='string')return -1;
  const view=Number(slot.split('/')[0]);
  return Number.isSafeInteger(view) && view>=0 && placesFor(view).some(spot=>slotFor(view,spot)===slot)?view:-1;
}
export function gardenViews(graduates){
  const highest=graduates.reduce((last,p)=>Math.max(last,viewForSlot(p.slot)),0);
  // Keep the existing room unlock cadence, including sparsely furnished collections.
  return VIEWS_PER_SUITE*Math.max(1+Math.floor(highest/VIEWS_PER_SUITE),
    1+Math.floor(graduates.length/(VIEWS_PER_SUITE*ORIGINAL_PLACES)));
}
export function canPlaceAt(graduates,slot){
  const view=viewForSlot(slot);
  return view>=0 && view<gardenViews(graduates) && !graduates.some(p=>p.slot===slot);
}

export function viewName(view) {
  const title = view % 2 === 0 ? 'Living room' : 'Plant studio';
  return view < 2 ? title : title + ' ' + (Math.floor(view / 2) + 1);
}

export function speciesName(plant) {
  return plant.species.charAt(0).toUpperCase() + plant.species.slice(1).replaceAll('-', ' ');
}
