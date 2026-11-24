import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlant,wake,care,company,graduate,replant,moodOf,earnedAt,readPlant,HOUR as H,DAY,WEEK} from '../src/game.js';
import {loadSnapshot,SaveIssue} from '../src/gardenStore.js';
import {reminderSchedule} from '../src/reminderSchedule.js';
const sprout=()=>wake(care(newPlant(0),'water',0),H);

test('save recovery retains corrupt bytes and rejects a newer version',()=>{
  for(const input of ['{"version":',JSON.stringify({...newPlant(),version:4})]){
    assert.throws(()=>loadSnapshot(input),error=>error instanceof SaveIssue && error.raw===input);
  }
});
test('company from words or play is independent of physical care and growth',()=>{
  let p=sprout();const hydrated=p.lastDrink, light=p.litAt, food=p.fedAt;
  assert.equal(moodOf(p,H),'content');assert.equal(moodOf(p,13*H),'quiet');assert.equal(moodOf(p,25*H),'lonely');
  p=care(p,'talk',3*H);assert.equal(moodOf(p,3.5*H-1),'happy');assert.equal(moodOf(p,3.5*H),'content');
  p=company(p,10*H);assert.equal(moodOf(p,10*H),'happy');
  assert.deepEqual([p.lastDrink,p.litAt,p.fedAt],[hydrated,light,food]);
  assert.equal(reminderSchedule(p,true).companyDue,20*H);assert.equal(reminderSchedule(p,false).companyDue,null);
  assert.equal(reminderSchedule(p,true,9*H).companyDue,33*H);
});
test('overdue care pauses earned time offline and resumes from the rescue',()=>{
  let p=sprout();assert.equal(earnedAt(p,20*H),13*H);
  p=care(p,'water',20*H);assert.equal(earnedAt(p,24*H),17*H);
  p=care(p,'water',25*H);assert.equal(earnedAt(p,30*H),18*H);
  p=care(p,'sun',30*H);assert.equal(earnedAt(p,31*H),19*H);
  p=care(p,'water',37*H);p=care(p,'water',49*H);
  assert.equal(earnedAt(p,52*H),earnedAt(p,49*H));p=care(p,'food',52*H);
  assert.equal(earnedAt(p,53*H),earnedAt(p,52*H)+H);
});
test('successive seven-day generations fill a room, graduate once and keep the whole collection in a backup',()=>{
  let p=newPlant(0);let first;
  delete p.species; // An older Monstera save enters the same succession.
  const cycle=['monstera','golden-pothos','snake-plant','hoya-serpens-splash','monkey-tail-cactus','queen-anthurium','pink-micans','bird-of-paradise','moth-orchid'];
  for(let generation=1;generation<=cycle.length;generation++){
    const start=p.plantedAt;
    p=care(p,'water',start);p=wake(p,start+H);
    for(let h=5;h<168;h+=4)for(const action of ['water','sun','food'])p=care(p,action,start+h*H);
    p=wake(p,start+WEEK);assert.equal(p.stage,'grown');
    const slot=generation-1,old=p.id,balance=p.gardenLife.balance;
    const grownSpecies=cycle[(generation-1)%cycle.length],nextSpecies=cycle[generation%cycle.length];
    assert.equal(graduate(p,old,slot+12,start+WEEK),p);
    p=graduate(p,old,slot,start+WEEK);
    assert.equal(p.stage,'seed');assert.equal(p.generation,generation+1);assert.equal(p.graduates.length,generation);
    assert.equal(p.species,nextSpecies);
    assert.equal(p.graduates.at(-1).species,grownSpecies);
    assert.equal(p.gardenLife.balance,balance);
    if(!first)first=p.graduates[0];
    assert.equal(graduate(p,old,slot,start+WEEK),p);
    assert.deepEqual(loadSnapshot(JSON.stringify(p),start+WEEK),p);
    assert.deepEqual(reminderSchedule(p,true).criticalDue,null);
  }
  assert.deepEqual(p.graduates[0],first);assert.equal(p.graduates.at(-1).slot,cycle.length-1);
  const again=wake(p,p.plantedAt+300*DAY);assert.equal(again.stage,'seed');
  assert.equal(readPlant(JSON.stringify({...p,graduates:[first,first]})),null);
});

test('graduates can share a 48-plant apartment, move across views and round-trip without losing their identity',async()=>{
  const {gardenViews,canPlaceAt}=await import('../src/gardenLayout.js');
  const {relocateGraduate}=await import('../src/game.js');
  let p=newPlant(0);
  assert.equal(gardenViews([]),2);
  for(let i=0;i<45;i++){
    const mature={...p,stage:'grown',earned:WEEK,wateredAt:0,lastDrink:WEEK,litAt:WEEK,fedAt:WEEK,companyAt:WEEK};
    p=graduate(mature,mature.id,i,WEEK);
    assert.equal(p.graduates.length,i+1);
  }
  assert.equal(gardenViews(p.graduates),8);
  const original=p.graduates[0];
  const moved=relocateGraduate(p,original.id,0,46);
  assert.deepEqual(moved.graduates[0],{...original,slot:46});
  assert.equal(moved.id,p.id);assert.equal(moved.graduates.length,45);
  assert.deepEqual(readPlant(JSON.stringify(moved),WEEK).graduates,moved.graduates);
  assert.equal(relocateGraduate(moved,original.id,0,47),moved);
  assert.equal(relocateGraduate(moved,original.id,46,2),moved);
  assert.equal(relocateGraduate(moved,original.id,46,48),moved);
  assert.equal(canPlaceAt(moved.graduates,0),true);
});

test('old numbered pots and new surfaces share a collection and keep their addresses across a backup',async()=>{
  const {placesFor,slotFor,viewForSlot,canPlaceAt,gardenViews}=await import('../src/gardenLayout.js');
  const {relocateGraduate}=await import('../src/game.js');
  let p=newPlant(0);
  const mature={...p,stage:'grown',earned:WEEK,wateredAt:0,lastDrink:WEEK,litAt:WEEK,fedAt:WEEK,companyAt:WEEK};
  p=graduate(mature,mature.id,6,WEEK);
  const first=p.graduates[0],dest='0/front-left';
  for(const view of [0,1]){
    const ids=placesFor(view).map(spot=>slotFor(view,spot));
    assert.equal(new Set(ids).size,ids.length);
    assert.ok(ids.every(id=>viewForSlot(id)===view));
  }
  assert.equal(canPlaceAt(p.graduates,'2/front-left'),false);
  assert.equal(canPlaceAt(p.graduates,'0/couch'),false);
  assert.equal(canPlaceAt(p.graduates,'01/front-left'),false);
  const moved=relocateGraduate(p,first.id,6,dest);
  assert.equal(canPlaceAt(moved.graduates,dest),false);
  assert.equal(relocateGraduate(moved,first.id,6,0),moved);
  assert.deepEqual(readPlant(JSON.stringify(moved),WEEK).graduates,[{...first,slot:dest}]);
  let second={...mature,id:p.id,generation:2,graduates:moved.graduates};
  second=graduate(second,second.id,'1/desk-end',WEEK);
  assert.ok(Number.isInteger(second.graduates[1].potStyle));
  assert.equal(gardenViews(second.graduates),2);
  assert.deepEqual(readPlant(JSON.stringify(second),WEEK).graduates,second.graduates);
});

test('moving the last plant out of a sparse suite returns only its stranded furnishings',async()=>{
  const {checkIn,itemsFromClosingRooms}=await import('../src/gardenEconomy.js');
  const {gardenViews}=await import('../src/gardenLayout.js');
  const {relocateGraduate}=await import('../src/game.js');
  const seed=checkIn(newPlant(0),0);
  const outlier={id:'old-monstera',name:'Momo',species:'monstera',potStyle:1,generation:1,plantedAt:0,movedAt:1,slot:12};
  const photo={src:'data:image/jpeg;base64,/9j/AA==',width:2,height:2,x:43,y:67};
  const items=[
    {id:'photo',sku:'oak',slot:'2/decor-stand',photo},
    {id:'turntable',sku:'record',slot:'3/decor-stand'},
    {id:'numbered-pot',sku:'wave',slot:18},
    {id:'named-pot',sku:'terra',slot:'2/front-left'},
    {id:'source-pot',sku:'wave',slot:12},
    {id:'target-pot',sku:'terra',slot:0},
    {id:'visible-frame',sku:'lacquer',slot:'1/decor-sill'},
    {id:'visible-pot',sku:'terra',slot:6},
    {id:'bagged',sku:'neko',slot:null},
  ];
  const raw=JSON.stringify({...seed,graduates:[outlier],gardenLife:{...seed.gardenLife,items}});
  const before=loadSnapshot(raw,1);
  assert.equal(gardenViews(before.graduates),4);
  const after=relocateGraduate(before,outlier.id,12,0);
  assert.equal(gardenViews(after.graduates),2);
  const returned=['photo','turntable','numbered-pot','named-pot'];
  const expected=items.map(item=>{
    if(item.id==='source-pot')return {...item,slot:0};
    if(returned.includes(item.id) || item.id==='target-pot')return {...item,slot:null};
    return item;
  });
  assert.deepEqual(after.gardenLife,{...before.gardenLife,items:expected});
  assert.deepEqual(after.graduates,[{...outlier,slot:0}]);
  assert.deepEqual(loadSnapshot(JSON.stringify(after),1),after);
  assert.deepEqual(itemsFromClosingRooms(before,after.graduates,12).map(item=>item.id),returned);
  assert.deepEqual(before.gardenLife.items,items);
  assert.equal(relocateGraduate(after,outlier.id,12,1),after);

  // A second legacy resident keeps both outlying rooms available.
  const neighbor={...outlier,id:'neighbor',slot:'2/front-right'};
  const occupied={...before,graduates:[outlier,neighbor]};
  const stillOpen=relocateGraduate(occupied,outlier.id,12,0);
  assert.equal(gardenViews(stillOpen.graduates),4);
  assert.deepEqual(itemsFromClosingRooms(occupied,stillOpen.graduates,12),[]);
  assert.deepEqual(stillOpen.gardenLife.items.slice(0,4),items.slice(0,4));

  // Closing rooms must also recover furnishings when the graduate has no purchased pot.
  const bare={...before,gardenLife:{...before.gardenLife,items:items.filter(item=>item.id!=='source-pot')}};
  const bareMove=relocateGraduate(bare,outlier.id,12,0);
  assert.deepEqual(loadSnapshot(JSON.stringify(bareMove),1),bareMove);
  assert.equal(bareMove.gardenLife.items.find(item=>item.id==='target-pot').slot,0);
  assert.equal(bareMove.gardenLife.items.find(item=>item.id==='photo').slot,null);
});

test('full growth queues the flare and earns a plant before picking a garden spot',()=>{
  const p={...sprout(),stage:'split',round:1,earned:WEEK-H,anchor:H,growthFlares:[]};
  const full=wake(p,2*H);
  assert.deepEqual(full.growthFlares,['grown']);
  assert.deepEqual(full.waitingPlants.map(g=>g.id),[p.id]);
  assert.equal(full.graduates.length,0);
  const reload=readPlant(JSON.stringify(full),2*H);
  assert.deepEqual(reload,full);
  const next=graduate(reload,p.id,4,2*H);
  assert.deepEqual(next.waitingPlants,[]);assert.equal(next.graduates[0].id,p.id);
  assert.equal(next.seedNamePending,next.id);assert.equal(next.species,'golden-pothos');
  assert.equal(graduate(next,p.id,5,2*H),next);
  assert.deepEqual(readPlant(JSON.stringify(next),2*H),next);
});

test('a grown plant from an earlier build gets a single inventory entry; interrupted homing keeps it',()=>{
  const legacy={...sprout(),stage:'grown',round:1,earned:WEEK};
  delete legacy.growthFlares;
  const current=readPlant(JSON.stringify(legacy),H);
  assert.equal(current.waitingPlants[0].id,current.id);
  assert.equal(wake(current,H),current);
  const dead=wake(current,H+DAY);
  const next=replant(dead,'seed',H+DAY);
  const placed=graduate(next,current.id,0,H+DAY);
  assert.equal(placed.id,next.id);assert.equal(placed.graduates[0].id,current.id);
  assert.deepEqual(placed.waitingPlants,[]);
  const invalid={...current,waitingPlants:[...current.waitingPlants,...current.waitingPlants]};
  assert.equal(readPlant(JSON.stringify(invalid),H),null);
});

test('repotting preserves both containers, rejects a changed pot and recovers a closing-room source',async()=>{
  const {checkIn,canRepotAt,destinationKey}=await import('../src/gardenEconomy.js');
  const {relocateGraduate}=await import('../src/game.js');
  const p=checkIn(newPlant(0),0);
  const resident={id:'momo',name:'Momo',species:'monstera',potStyle:1,generation:1,plantedAt:0,movedAt:1,slot:4};
  const items=[{id:'a',sku:'wave',slot:4},{id:'b',sku:'terra',slot:3}];
  const start={...p,graduates:[resident],gardenLife:{...p.gardenLife,items}};
  const key=destinationKey(start,3);
  assert.ok(canRepotAt(start,0));
  assert.ok(!canRepotAt(start,4) && !canRepotAt(start,5));
  const after=relocateGraduate(start,'momo',4,3,key);
  assert.deepEqual(after.graduates,[{...resident,slot:3}]);
  assert.deepEqual(after.gardenLife,start.gardenLife);
  assert.deepEqual(loadSnapshot(JSON.stringify(after),1),after);
  const changed={...start,gardenLife:{...start.gardenLife,items:[items[0],{...items[1],id:'different'}]}};
  assert.equal(relocateGraduate(changed,'momo',4,3,key),changed);
  const distant={...start,graduates:[{...resident,slot:12}],gardenLife:{...start.gardenLife,items:[{...items[0],slot:12},items[1]]}};
  assert.deepEqual(relocateGraduate(distant,'momo',12,3,key).gardenLife.items,[{...items[0],slot:null},items[1]]);
});
