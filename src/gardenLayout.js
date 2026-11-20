// The original six addresses per room are part of existing saves and backups.
// Additional surfaces have named addresses so extending a room never renumbers a plant.
const ORIGINAL_PLACES=6;
const VIEWS_PER_SUITE=2;
const rows=[
  [
    [0,'Upper bookcase shelf',55,96,.78,'shelf',[17,54,86,98]],
    [1,'Middle bookcase shelf',50,141,.72,'shelf',[17,104,86,143]],
    [2,'Lower bookcase shelf',51,186,.73,'shelf',[17,149,86,188]],
    [3,'Living room windowsill',258,139,.86,'window',[117,47,311,141]],
    [4,'Coffee table',152,245,.94,'table',[125,178,263,252]],
    [5,'Beside the sofa',347,287,1.06,'floor'],
    ['window-left','Left end of the living room windowsill',145,139,.78,'window',[117,47,311,141]],
    ['window-middle','Center of the living room windowsill',201,139,.78,'window',[117,47,311,141]],
    ['table-end','Center of the coffee table',193,246,.70,'table',[125,178,263,252]],
    ['bookcase-floor','Floor by the bookcase',59,263,.91,'floor'],
    ['front-left','Front left floor',63,305,1.1,'floor',null,.57],
    ['front-right','Front right floor',277,306,1.12,'floor',null,.39],
  ],[
    [0,'Upper studio shelf',43,80,.82,'shelf',[18,32,94,82]],
    [1,'Lower studio shelf',61,129,.75,'shelf',[23,88,96,131]],
    [2,'Studio cabinet',50,180,.77,'shelf',[12,137,89,182]],
    [3,'Studio windowsill',235,143,.85,'window',[117,52,284,145]],
    [4,'Drawing desk',150,196,.86,'table',[105,148,281,199]],
    [5,'Beside the easel',316,290,1.07,'floor'],
    ['window-left','Left end of the studio windowsill',137,143,.78,'window',[117,52,284,145]],
    ['window-middle','Center of the studio windowsill',187,143,.78,'window',[117,52,284,145]],
    ['desk-end','Center of the drawing desk',197,196,.78,'table',[105,148,281,199]],
    ['cabinet-floor','Floor by the studio cabinet',57,256,.91,'floor'],
    ['front-left','Front left studio floor',74,303,1.1,'floor',null,.57],
    ['front-right','Front right studio floor',253,306,1.12,'floor',null,.39],
  ]
];
const places=rows.map(room=>room.map(([key,name,x,y,size,layer,clip,front=0])=>
  ({key,name,x:x/400,y:y/320,size,layer,clip,front,shelf:layer==='shelf'})));
export const placesFor=view=>places[view%2];
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
