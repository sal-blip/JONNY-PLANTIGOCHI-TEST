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
function giveSet(plant, now) {
  return ACTIONS.reduce((p, action) => care(p, action, now), plant);
}

test('a cared-for plant unlocks each milestone at its exact age, including after closing the app', () => {
  const plantedAt = 12345;
  const atAge = hours => plantedAt + hours * HOUR;
  let plant = care(newPlant(plantedAt), 'water', plantedAt);
  plant = wake(plant, atAge(1));
  assert.equal(plant.stage, 'sprout');
  plant = care(care(plant, 'sun', atAge(1)), 'sun', atAge(1));
  assert.deepEqual(plant.given, ['sun']);
  plant = giveSet(plant, atAge(1));
  assert.equal(giveSet(plant, atAge(72) - 1).stage, 'sprout');
  plant = restore(JSON.stringify(plant), atAge(72));
  assert.equal(plant.stage, 'young');
  assert.equal(plant.round, 0);
  assert.deepEqual(plant.given, []);

  plant = giveSet(plant, atAge(72));
  assert.equal(giveSet(plant, atAge(120) - 1).round, 0);
  plant = restore(JSON.stringify(plant), atAge(120));
  assert.equal(plant.round, 1);
  assert.deepEqual(plant.given, []);
  plant = giveSet(plant, atAge(120));
  assert.equal(giveSet(plant, atAge(168) - 1).stage, 'young');
  plant = restore(JSON.stringify(plant), atAge(168));
  assert.equal(plant.stage, 'grown');
  assert.equal(nextMilestone(plant), null);
  assert.deepEqual(giveSet(plant, atAge(180)).given, []);
});

test('late visits can catch up and each care set is still required', () => {
  const now = 9 * DAY;
  let plant = wake(newPlant(0), now);
  assert.equal(plant.stage, 'seed');
  plant = care(plant, 'water', now);
  assert.equal(plant.stage, 'sprout');
  plant = giveSet(plant, now);
  assert.equal(plant.stage, 'young');
  plant = giveSet(plant, now);
  assert.equal(plant.round, 1);
  for (const action of ['talk','food','sun']) plant = care(plant, action, now);
  assert.equal(wake(plant, now + WEEK).stage, 'young');
  assert.equal(care(plant, 'water', now).stage, 'grown');
});

test('existing mature and partly cared-for young plants keep their progress', () => {
  const legacy = { ...newPlant(1000), wateredAt:1001, stage:'young', round:1, given:['sun','talk'], sound:true };
  const young = restore(JSON.stringify(legacy), HOUR + 1000);
  assert.deepEqual(young, legacy);
  const early = giveSet(young, 2 * HOUR);
  assert.equal(early.stage, 'young');
  assert.equal(restore(JSON.stringify(early), WEEK + 1000).stage, 'grown');
  const grown = { ...legacy, stage:'grown', round:0 };
  assert.deepEqual(restore(JSON.stringify(grown), HOUR + 1000), grown);
});
test('malformed saves recover and the timer clamps at zero', () => {
  assert.equal(restore('{',123).plantedAt,123);
  assert.equal(restore('{"version":1}',123).stage,'seed');
  assert.equal(countdown(-135),'00:00:00');
  assert.equal(countdown(HOUR),'01:00:00');
  assert.equal(countdown(HOUR-1000),'00:59:59');
  assert.equal(countdown(3*DAY+2*HOUR+60000),'3d 2h 1m');
});
