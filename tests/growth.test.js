import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIONS, DAY, HOUR, WEEK, care, countdown, newPlant, nextMilestone, restore, wake } from '../src/game.js';

test('water before or after the hour, surviving reload and absence', () => {
  const seed = newPlant(1000), watered = care(seed,'water',2000);
  assert.equal(wake(watered,HOUR+999).stage,'seed');
  assert.equal(restore(JSON.stringify(watered),HOUR+1000).stage,'sprout');
  assert.equal(wake(seed,2*HOUR).stage,'seed');
  assert.equal(care(seed,'water',2*HOUR).stage,'sprout');
  assert.equal(care(watered,'water',4000).wateredAt,2000);
  assert.equal(care(seed,'sun',1000).stage,'seed');
  assert.equal(wake(watered,3*HOUR).plantedAt,1000);
});
test('steady physical care reaches the milestones after one hour, three, five and seven days',()=>{
  const start=12345;
  let plant=care(newPlant(start),'water',start);
  plant=wake(plant,start+HOUR);
  for(let hour=2;hour<=168;hour++){
    const now=start+hour*HOUR;
    if(hour===72)assert.equal(wake(plant,now-1).stage,'sprout');
    if(hour===120)assert.equal(wake(plant,now-1).stage,'young');
    if(hour===168)assert.equal(wake(plant,now-1).stage,'split');
    plant=restore(JSON.stringify(plant),now);
    if(hour===72)assert.equal(plant.stage,'young');
    if(hour===120)assert.equal(plant.stage,'split');
    if(hour===168)assert.equal(plant.stage,'grown');
    for(const action of ['water','food','sun'])plant=care(plant,action,now);
  }
  assert.equal(nextMilestone(plant),null);
});
test('a seed can wait safely and later earns each milestone during physical care',()=>{
  const now=9*DAY;
  const p=care(newPlant(0),'water',now);
  assert.equal(p.stage,'sprout');
  assert.equal(care(p,'talk',now+HOUR).stage,'sprout');
});

test('legacy plants keep their growth, settings and a fresh care clock', () => {
  const legacy = { version:1, plantedAt:1000, wateredAt:1001, stage:'young', round:1,
    given:['sun','talk'], sound:false, message:'Hi!',scene:'pebbles' };
  const young = restore(JSON.stringify(legacy), WEEK);
  assert.equal(young.stage, 'split'); assert.deepEqual(young.given,legacy.given);
  assert.equal(young.lastDrink,WEEK); assert.equal(young.sound,false); assert.equal(young.scene,'pebbles');
  assert.equal(restore(JSON.stringify(young), WEEK+HOUR).lastDrink,WEEK);
  assert.equal(restore(JSON.stringify({...legacy,stage:'grown'}),WEEK).stage,'grown');
});
test('malformed saves recover and the timer clamps at zero', () => {
  assert.equal(restore('{',123),null);
  assert.equal(restore('{"version":1}',123),null);
  assert.equal(restore(null,123).stage,'seed');
  assert.equal(countdown(-135),'00:00:00');
  assert.equal(countdown(HOUR),'01:00:00');
  assert.equal(countdown(HOUR-1000),'00:59:59');
  assert.equal(countdown(3*DAY+2*HOUR+60000),'3d 2h 1m');
});

test('a name follows its plant through a backup, graduation or death',async()=>{
  const {graduate,plantName}=await import('../src/game.js');
  const seed=newPlant(0,'Aki');
  const sprout=wake(care(seed,'water',1),HOUR);
  const dead=wake(sprout,HOUR+DAY);
  assert.equal(dead.book[0].name,'Aki');
  const grown={...sprout,stage:'grown',earned:WEEK};
  const next=graduate(grown,grown.id,0,HOUR+1);
  assert.deepEqual(next.seedOffers,['prayer-plant','monkey-tail-cactus']);
  assert.equal(restore(JSON.stringify(next),HOUR+2).graduates[0].name,'Aki');
  assert.equal(plantName(' bad! '),'Monstera');
  const old={...seed};delete old.name;
  assert.equal(restore(JSON.stringify(old),1).name,'Monstera');
});
