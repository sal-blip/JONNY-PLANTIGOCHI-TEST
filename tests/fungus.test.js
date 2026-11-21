import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newPlant,care,wake,readPlant,discoverFungus,treatFungus,graduate,takeCutting,replant,
  earnedAt,growthHolds,criticalReminder,FUNGUS_WINDOW,HOUR,DAY} from '../src/game.js';

function living(t){
  const p=wake(care(newPlant(t-2*HOUR),'water',t-2*HOUR),t-HOUR);
  return {...p,lastDrink:t,litAt:t,fedAt:t,anchor:t,outbreakDue:t};
}
test('outbreak intervals persist and discovery requires an eligible active plant',()=>{
  const t=5*DAY,p=living(t);
  assert.ok(wake(p,t+HOUR,false).fungusAt===null);
  for(const locked of [newPlant(t),{...p,outbreakDue:t+HOUR},{...p,rotAt:t},{...p,lastDrink:t-12*HOUR}])
    assert.equal(discoverFungus(locked,t).fungusAt,null);
  const sick=discoverFungus(p,t);
  assert.equal(sick.fungusAt,t);
  assert.equal(discoverFungus(sick,t+HOUR),sick);
  assert.deepEqual(readPlant(JSON.stringify(sick),t+HOUR),sick);
  assert.equal(earnedAt(sick,t+2*HOUR),earnedAt(p,t));
  assert.ok(growthHolds(sick,t).includes('First Aid'));
  const watered=care(sick,'water',t+4*HOUR);
  assert.equal(watered.fungusAt,t);
  assert.equal(treatFungus(watered,t-1,t+5*HOUR),watered);
  const end=t+FUNGUS_WINDOW-1,cured=treatFungus(watered,t,end);
  assert.equal(cured.fungusAt,null);
  assert.ok(cured.outbreakDue>=end+36*HOUR && cured.outbreakDue<=end+60*HOUR);
  assert.equal(earnedAt(cured,end),sick.earned);
  assert.equal(earnedAt(cured,end+HOUR),sick.earned+HOUR);
  assert.deepEqual(readPlant(JSON.stringify(cured),end),cured);
  assert.equal(treatFungus(cured,t,end+1),cured);
});
test('earliest rescue deadline wins; cure at deadline records exactly one leaf and a dead plant can replant',()=>{
  const t=4*DAY,p=discoverFungus(living(t),t);
  for(const [lastDrink,rotAt,cause] of [[t,null,'Fungus'],[t-13*HOUR,null,'Thirst'],[t-12*HOUR,null,'Thirst'],[t-4*HOUR,t,'Root rot']]){
    const dead=treatFungus({...p,lastDrink,rotAt},t,t+12*HOUR);
    assert.equal(dead.book.length,1);assert.equal(dead.book[0].cause,cause);
    assert.equal(wake(dead,t+2*DAY).book.length,1);
    assert.equal(replant(dead,'seed',t+13*HOUR).fungusAt,null);
  }
  assert.equal(readPlant(JSON.stringify(wake(p,t+12*HOUR)),t+13*HOUR).book[0].cause,'Fungus');
});
test('a sick adult cannot graduate or provide a cutting, but drainage and rescue remain independent',()=>{
  const t=4*DAY,p=discoverFungus({...living(t),stage:'grown'},t);
  assert.equal(graduate(p,p.id,0,t),p);assert.equal(takeCutting(p,'left',t),p);
  assert.equal(criticalReminder(p),t+12*HOUR);
  const drained=care({...p,extraPour:t-2*HOUR,rotAt:t},'drain',t);
  assert.equal(drained.fungusAt,t);assert.equal(drained.rotAt,null);
  const cured=treatFungus(drained,t,t+1);
  assert.equal(takeCutting(cured,'right',t+2).jar.stem,'right');
  const saved=graduate(cured,cured.id,0,t+3);
  assert.equal(saved.outbreakDue,null);assert.equal(saved.graduates.length,1);
});
test('an older living save gets a fresh interval, preserves collections and restores that same time',()=>{
  const t=6*DAY,old=living(t);delete old.fungusAt;delete old.outbreakDue;
  old.jar={cutAt:t-2*HOUR,generation:2,stem:'left'};
  const migrated=readPlant(JSON.stringify(old),t);
  assert.equal(migrated.fungusAt,null);assert.deepEqual(migrated.jar,old.jar);
  assert.ok(migrated.outbreakDue>=t+36*HOUR && migrated.outbreakDue<=t+60*HOUR);
  assert.equal(readPlant(JSON.stringify(migrated),t+HOUR).outbreakDue,migrated.outbreakDue);
});
