import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIONS, HOUR, care, countdown, newPlant, restore, wake } from '../src/game.js';

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
test('four different acts grow each round, repeats cannot advance it', () => {
  let p = care(newPlant(0),'water',HOUR);
  p = care(p,'sun',HOUR);
  p = care(p,'sun',HOUR);
  assert.deepEqual(p.given,['sun']);
  for (const action of ['water','food','talk']) p=care(p,action,HOUR);
  assert.equal(p.stage,'young');
  for (const action of ACTIONS) p=care(p,action,HOUR);
  assert.equal(p.stage,'young'); assert.equal(p.round,1);
  p = restore(JSON.stringify(p),HOUR*2);
  for (const action of ACTIONS) p=care(p,action,HOUR*2);
  assert.equal(p.stage,'grown');
  for (const action of ACTIONS) p=care(p,action,HOUR*3);
  assert.equal(p.stage,'grown');
});
test('malformed saves recover and the timer clamps at zero', () => {
  assert.equal(restore('{',123).plantedAt,123);
  assert.equal(restore('{"version":1}',123).stage,'seed');
  assert.equal(countdown(-135),'00:00:00');
  assert.equal(countdown(HOUR),'01:00:00');
  assert.equal(countdown(HOUR-1000),'00:59:59');
});
