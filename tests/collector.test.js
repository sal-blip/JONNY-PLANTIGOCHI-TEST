import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlant,wake,care,company,graduate,moodOf,earnedAt,readPlant,HOUR as H,DAY,WEEK} from '../src/game.js';
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
  for(let generation=1;generation<=7;generation++){
    const start=p.plantedAt;
    p=care(p,'water',start);p=wake(p,start+H);
    for(let h=5;h<168;h+=4)for(const action of ['water','sun','food'])p=care(p,action,start+h*H);
    p=wake(p,start+WEEK);assert.equal(p.stage,'grown');
    const slot=generation-1,old=p.id;
    assert.equal(graduate(p,old,slot+12,start+WEEK),p);
    p=graduate(p,old,slot,start+WEEK);
    assert.equal(p.stage,'seed');assert.equal(p.generation,generation+1);assert.equal(p.graduates.length,generation);
    if(!first)first=p.graduates[0];
    assert.equal(graduate(p,old,slot,start+WEEK),p);
    assert.deepEqual(loadSnapshot(JSON.stringify(p),start+WEEK).graduates,p.graduates);
    assert.deepEqual(reminderSchedule(p,true).criticalDue,null);
  }
  assert.deepEqual(p.graduates[0],first);assert.equal(p.graduates.at(-1).slot,6);
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
