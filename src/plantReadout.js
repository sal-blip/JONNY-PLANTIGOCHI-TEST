import {earnedAt, growthHolds, FOOD_INTERVAL, HOUR, WATER_INTERVAL, careStatus, condition, soilDeadline, nextMilestone, timeLeft} from './game.js';

export {timeLeft};
export const GROWTH_STEPS = 4;
const clamp = value => Math.min(1, Math.max(0, value));

export function growthReadout(plant, now) {
  const next = nextMilestone(plant);
  if (!next) {
    return plant.deadAt === null
      ? {filled: GROWTH_STEPS, label: 'Full grown', detail: 'Fully grown'}
      : {filled: 0, label: 'Pressed leaf', detail: 'Growth ended'};
  }

  const elapsed=earnedAt(plant,now), remaining=Math.max(0,next.age-elapsed);
  const seed=plant.stage==='seed', holds=seed?(plant.wateredAt===null?['Water']:[]):growthHolds(plant,now);
  const completed={seed:0,sprout:1,young:2,split:3}[plant.stage];
  const filled=completed + Math.min(.98,clamp((elapsed-next.start)/(next.age-next.start)));
  const detail=(remaining?timeLeft(remaining)+' growing time':'Ready')+(holds.length?' · Needs '+holds.join('/'):'');
  return {filled,label:holds.length?'Needs care':['Seed','Sprout','Young','First split'][completed],detail,next:next.label};
}

export function waterReadout(plant, now) {
  const soil = condition(plant, now);
  const fraction = plant.lastDrink === null
    ? Number(plant.wateredAt !== null)
    : clamp(1 - (now - plant.lastDrink) / WATER_INTERVAL);
  if (soil === 'dead') return {fraction:0, label:'Pressed leaf', detail:'Heart opens the garden book'};
  if (plant.stage === 'seed') {
    const watered = plant.wateredAt !== null;
    const remaining = HOUR-earnedAt(plant,now);
    if(watered && plant.tutorial)return {fraction,label:'Seed watered',detail:'Ready for your sprouting lesson'};
    return watered
      ? {fraction, label:'Seed watered', detail:remaining > 0 ? 'Sprout in ' + timeLeft(remaining) : 'Ready to sprout'}
      : {fraction, label:'First sip', detail:'Water once to start growth', tone:'due'};
  }
  if (soil === 'rootRot') return {
    fraction:0, label:'Drain now', detail:'Drain within ' + timeLeft(soilDeadline(plant) - now), tone:'urgent',
  };
  if (soil === 'dry' || soil === 'critical') return {
    fraction, label:soil === 'critical' ? 'Critical' : 'Due now',
    detail:(soil === 'critical' ? 'Critical' : 'Water now') + ' · ' + timeLeft(soilDeadline(plant) - now) + ' left',
    tone:soil === 'critical' ? 'urgent' : 'due',
  };
  const dryIn = timeLeft(plant.lastDrink + WATER_INTERVAL - now);
  const water = careStatus(plant,'water',now);
  if (water.topUp) {
    return {fraction, label:'Top up', detail:'Safe to top up · Dry in ' + dryIn};
  }
  return {
    fraction, label:soil === 'soggy' ? 'Too wet' : 'In ' + dryIn,
    detail:soil === 'soggy' ? 'Too wet · Dry in ' + dryIn : water.hint,
    tone:soil === 'soggy' ? 'due' : undefined,
  };
}

export function foodReadout(plant, now) {
  if (plant.deadAt !== null) return {label:'', detail:'Heart opens the garden book'};
  if (plant.stage === 'seed') return {label:'Food at sprout', detail:'Unlocks after sprouting'};
  const remaining=plant.fedAt+FOOD_INTERVAL-now;
  const food = careStatus(plant,'food',now);
  if (food.locked) return {label:'Food ' + timeLeft(food.opensAt - now, false), detail:food.hint};
  if (remaining <= 0) return {label:'Feed now', detail:food.hint, tone:'due'};
  return {label:'Food ready', detail:food.hint};
}
