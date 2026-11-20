import {ACTIONS, HOUR, MATURE_CARE_DELAY, WATER_INTERVAL, careStatus, condition, deathDeadline, nextMilestone} from './game.js';

export const GROWTH_STEPS = 4;
const clamp = value => Math.min(1, Math.max(0, value));

function timeLeft(ms) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days) return days + 'd ' + hours % 24 + 'h';
  if (hours) return hours + 'h' + (minutes % 60 ? ' ' + minutes % 60 + 'm' : '');
  return minutes + 'm';
}

export function growthReadout(plant, now) {
  const next = nextMilestone(plant);
  if (!next) {
    return plant.deadAt === null
      ? {filled: GROWTH_STEPS, label: 'Full grown', detail: 'Fully grown'}
      : {filled: 0, label: 'Pressed leaf', detail: 'Growth ended'};
  }

  const elapsed = now - plant.plantedAt;
  const remaining = next.age - elapsed;
  const seed = plant.stage === 'seed';
  const missingCare = seed ? Number(plant.wateredAt === null) : ACTIONS.length - plant.given.length;
  const waiting = remaining <= 0 && missingCare > 0;
  const completed = seed ? 0 : plant.stage === 'sprout' ? 1 : 2 + plant.round;
  // Each segment marks a milestone. Keep its last pixel open until it unlocks.
  const filled = completed + Math.min(.94, clamp((elapsed - next.start) / (next.age - next.start)));
  const care = seed ? 'Water to sprout' : missingCare + (missingCare === 1 ? ' care action left' : ' care actions left');
  const detail = remaining > 0
    ? 'In ' + timeLeft(remaining) + (missingCare ? ' · ' + care : '')
    : waiting ? care : 'Ready now';
  return {filled, label: waiting ? 'Care needed' : ['Seed','Sprout','Young','Final set'][completed], detail, next: next.label};
}

export function waterReadout(plant, now) {
  const soil = condition(plant, now);
  const fraction = plant.lastDrink === null
    ? Number(plant.wateredAt !== null)
    : clamp(1 - (now - plant.lastDrink) / WATER_INTERVAL);
  if (soil === 'dead') return {fraction:0, label:'Pressed leaf', detail:'Visit the Leaf Book'};
  if (plant.stage === 'seed') {
    const watered = plant.wateredAt !== null;
    const remaining = plant.plantedAt + HOUR - now;
    return watered
      ? {fraction, label:'Seed watered', detail:remaining > 0 ? 'Sprout in ' + timeLeft(remaining) : 'Ready to sprout'}
      : {fraction, label:'First sip', detail:'Water once to start growth', tone:'due'};
  }
  if (soil === 'rootRot') return {
    fraction:0, label:'Drain now', detail:'Drain within ' + timeLeft(deathDeadline(plant) - now), tone:'urgent',
  };
  if (soil === 'dry' || soil === 'critical') return {
    fraction, label:soil === 'critical' ? 'Critical' : 'Due now',
    detail:(soil === 'critical' ? 'Critical' : 'Water now') + ' · ' + timeLeft(deathDeadline(plant) - now) + ' left',
    tone:soil === 'critical' ? 'urgent' : 'due',
  };
  const dryIn = timeLeft(plant.lastDrink + WATER_INTERVAL - now);
  return {
    fraction, label:soil === 'soggy' ? 'Too wet' : 'In ' + dryIn,
    detail:(soil === 'soggy' ? 'Too wet' : 'Damp soil') + ' · Dry in ' + dryIn,
    tone:soil === 'soggy' ? 'due' : undefined,
  };
}

export function foodReadout(plant, now) {
  if (plant.deadAt !== null) return {label:'', detail:'Visit the Leaf Book'};
  if (plant.stage === 'seed') return {label:'Food at sprout', detail:'Unlocks after sprouting'};
  if (!careStatus(plant, 'food', now).locked) {
    return {
      label:'Food ready',
      detail:plant.stage === 'grown' ? 'Ready · Optional at full growth' : 'Ready · Once per care set',
      tone:'due',
    };
  }
  if (plant.stage === 'grown' && plant.lastFullCare != null && now < plant.lastFullCare + MATURE_CARE_DELAY) {
    const wait = timeLeft(plant.lastFullCare + MATURE_CARE_DELAY - now);
    return {label:'Food in ' + wait, detail:'Fed · Next food in ' + wait};
  }
  const next = nextMilestone(plant);
  if (next && plant.given.length === ACTIONS.length) {
    const remaining = plant.plantedAt + next.age - now;
    if (remaining > 0) return {label:'Fed', detail:'Fed · Next set in ' + timeLeft(remaining)};
  }
  return {label:'Fed', detail:'Fed · Next care set'};
}
