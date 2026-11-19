import { validPhoto } from './gardenScenes.js';

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
export const KEY = 'jonny.plantigochi.v1';
export const ACTIONS = ['water', 'sun', 'talk', 'food'];
export const STAGES = ['seed', 'sprout', 'young', 'grown'];
export const STAGE_NAMES = { seed: 'Seed', sprout: 'Sprout', young: 'Young plant', grown: 'Grown plant' };

const milestones = {
  sprout: { start: 0, age: HOUR, label: 'Sprout' },
  young: { start: HOUR, age: 3 * DAY, label: 'Young plant' },
  finalCare: { start: 3 * DAY, age: 5 * DAY, label: 'Final care set' },
  grown: { start: 5 * DAY, age: WEEK, label: 'Full growth' },
};

export function nextMilestone(plant) {
  if (plant.stage === 'seed') return milestones.sprout;
  if (plant.stage === 'sprout') return milestones.young;
  if (plant.stage === 'young') return plant.round === 0 ? milestones.finalCare : milestones.grown;
  return null;
}

export function newPlant(now = Date.now()) {
  return { version: 1, plantedAt: now, wateredAt: null, stage: 'seed', round: 0, given: [], message: 'Five more minutes… or sixty.', sound: true };
}

export function wake(plant, now) {
  const next = nextMilestone(plant);
  if (!next || now < plant.plantedAt + next.age) return plant;
  if (plant.stage === 'seed' && plant.wateredAt !== null) {
    return { ...plant, stage: 'sprout', given: [], round: 0, message: 'Ohayō! Look who finally leafed out.' };
  }
  if (plant.given.length !== ACTIONS.length) return plant;
  if (plant.stage === 'sprout') return { ...plant, stage: 'young', round: 0, given: [], message: 'New leaf, new me. Notice my cheekbones?' };
  if (plant.stage === 'young' && plant.round === 0) return { ...plant, round: 1, given: [], message: 'One last set of care for my fancy split leaves!' };
  if (plant.stage === 'young') return { ...plant, stage: 'grown', round: 0, given: [], message: 'Ta-da! These leaf windows are designer.' };
  return plant;
}

export function readPlant(text, now = Date.now()) {
  try {
    const p = JSON.parse(text);
    if (p && p.version === 1 && (p.photo === undefined || validPhoto(p.photo)) && STAGES.includes(p.stage) && Number.isFinite(p.plantedAt)
      && (p.wateredAt === null || Number.isFinite(p.wateredAt)) && [0,1].includes(p.round)
      && Array.isArray(p.given) && p.given.every(a => ACTIONS.includes(a)) && new Set(p.given).size === p.given.length
      && typeof p.message === 'string' && typeof p.sound === 'boolean') return wake(p, now);
  } catch { /* An unreadable save must never replace a plant during import. */ }
  return null;
}

export function restore(text, now = Date.now()) {
  return readPlant(text, now) ?? newPlant(now);
}

const happy = {
  water: ['A little sip. Very sophisticated.', 'Hydrated and mildly dramatic.'],
  sun: ['Ahh. My good side loves the sun.', 'Leaf me here in the sunshine.'],
  talk: ['Me? Adorable? Go on…', 'I heard that. Say it again?'],
  food: ['Itadakimasu! Seconds, please.', 'A snack for a growing icon.'],
};

export function care(saved, action, now = Date.now()) {
  const p = wake(saved, now);
  if (!ACTIONS.includes(action)) return p;
  if (p.stage === 'seed') {
    if (action !== 'water') return { ...p, message: 'Let me sprout first, okay?' };
    if (p.wateredAt !== null) return { ...p, message: 'Still damp. Still napping.' };
    return wake({ ...p, wateredAt: now, message: 'A sleepy sip. Back to dreaming…' }, now);
  }
  if (p.given.length === ACTIONS.length) return { ...p, message: 'All cared for. Growing leaves takes beauty sleep.' };
  if (p.given.includes(action)) return { ...p, message: 'Had that already. Try another little kindness?' };
  const given = [...p.given, action];
  if (given.length < ACTIONS.length) return { ...p, given, message: happy[action][(given.length + p.round) % 2] };
  if (p.stage === 'grown') return { ...p, round: 0, given: [], message: 'Thriving. Obviously. Thank you, gardener.' };
  return wake({ ...p, given, message: 'All cared for. Growing leaves takes beauty sleep.' }, now);
}

export function countdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  if (total >= DAY / 1000) {
    const days = Math.floor(total / 86400);
    const hours = Math.floor(total / 3600) % 24;
    const minutes = Math.floor(total / 60) % 60;
    return days + 'd ' + hours + 'h ' + minutes + 'm';
  }
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map(n => String(n).padStart(2, '0')).join(':');
}
