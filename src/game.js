import { validPhoto } from './gardenScenes.js';

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
export const WATER_INTERVAL = 4 * HOUR;
export const MATURE_CARE_DELAY = 4 * HOUR;
const CRITICAL_WATER_AGE = 12 * HOUR;
const ROT_RESCUE_WINDOW = 12 * HOUR;
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
  if (plant.deadAt !== null) return null;
  if (plant.stage === 'seed') return milestones.sprout;
  if (plant.stage === 'sprout') return milestones.young;
  if (plant.stage === 'young') return plant.round === 0 ? milestones.finalCare : milestones.grown;
  return null;
}

const blankHealth = { lastDrink: null, extraPour: null, rotAt: null, deadAt: null };
export const ROOT_TIME = 12 * HOUR;
export const healthLabels = { healthy: 'Damp soil', dry: 'Thirsty', critical: 'Very thirsty', soggy: 'Still wet', rootRot: 'Drain pot', dead: 'Pressed leaf' };

export function newPlant(now = Date.now()) {
  return { version: 2, id: crypto.randomUUID(), generation: 1, plantedAt: now, wateredAt: null, lastFullCare: null,
    stage: 'seed', round: 0, given: [], message: 'Five more minutes… or sixty.', sound: true,
    ...blankHealth, jar: null, book: [], dewCleared: 0 };
}

export function condition(p, now = Date.now()) {
  if (p.deadAt !== null) return 'dead';
  if (p.rotAt !== null) return 'rootRot';
  if (p.lastDrink === null) return 'healthy';
  const elapsed = now - p.lastDrink;
  if (elapsed >= CRITICAL_WATER_AGE) return 'critical';
  if (elapsed >= WATER_INTERVAL) return 'dry';
  return p.extraPour !== null ? 'soggy' : 'healthy';
}

export function deathDeadline(p) {
  if (p.lastDrink === null || p.deadAt !== null) return null;
  return p.rotAt === null ? p.lastDrink + DAY : p.rotAt + ROT_RESCUE_WINDOW;
}

export function criticalReminder(p) {
  if (p.deadAt !== null || p.lastDrink === null) return null;
  return p.rotAt === null ? p.lastDrink + CRITICAL_WATER_AGE : p.rotAt + ROT_RESCUE_WINDOW / 2;
}

function grow(plant, now) {
  const next = nextMilestone(plant);
  if (!next || now < plant.plantedAt + next.age) return plant;
  if (plant.stage === 'seed' && plant.wateredAt !== null) {
    return { ...plant, stage: 'sprout', lastDrink: now, given: [], round: 0, message: 'Ohayō! Look who finally leafed out.' };
  }
  if (plant.given.length !== ACTIONS.length) return plant;
  if (plant.stage === 'sprout') return { ...plant, stage: 'young', round: 0, given: [], message: 'New leaf, new me. Notice my cheekbones?' };
  if (plant.stage === 'young' && plant.round === 0) return { ...plant, round: 1, given: [], message: 'One last set of care for my fancy split leaves!' };
  if (plant.stage === 'young') return { ...plant, stage: 'grown', round: 0, given: [], message: 'Ta-da! These leaf windows are designer.' };
  return plant;
}

export function wake(p, now = Date.now(), visible = true) {
  if (p.deadAt !== null || (p.stage === 'seed' && !visible)) return p;
  const deadline = deathDeadline(p);
  if (deadline === null || now < deadline) return grow(p, now);
  const last = grow(p, deadline - 1);
  const cause = p.rotAt === null ? 'Thirst' : 'Root rot';
  const leaf = { id: p.id, stage: last.stage, generation: p.generation, plantedAt: p.plantedAt, diedAt: deadline, cause };
  return { ...last, deadAt: deadline, book: [...p.book, leaf], message: 'A leaf for your book.' };
}

const stamp = n => Number.isSafeInteger(n) && n >= 0;
const optionalStamp = n => n === null || stamp(n);
const generation = n => Number.isSafeInteger(n) && n >= 1;
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 100;
const validLeaf = leaf => leaf && validId(leaf.id) && STAGES.slice(1).includes(leaf.stage) && generation(leaf.generation)
  && stamp(leaf.plantedAt) && stamp(leaf.diedAt) && leaf.diedAt >= leaf.plantedAt && ['Thirst','Root rot'].includes(leaf.cause);

function validGarden(p) {
  if (!validId(p.id) || !generation(p.generation) || ![p.lastDrink,p.extraPour,p.rotAt,p.deadAt].every(optionalStamp)) return false;
  if ((p.stage === 'seed') !== (p.lastDrink === null)) return false;
  if (p.extraPour !== null && (p.lastDrink === null || p.extraPour < p.lastDrink || p.extraPour >= p.lastDrink + WATER_INTERVAL)) return false;
  if (p.rotAt !== null && (p.extraPour === null || p.rotAt < p.extraPour + HOUR || p.rotAt >= p.lastDrink + WATER_INTERVAL)) return false;
  if (p.jar !== null && !(p.jar && stamp(p.jar.cutAt) && generation(p.jar.generation) && ['left','right'].includes(p.jar.stem))) return false;
  if (!Array.isArray(p.book) || !p.book.every(validLeaf) || new Set(p.book.map(leaf => leaf.id)).size !== p.book.length) return false;
  const keepsake = p.book.find(leaf => leaf.id === p.id);
  return p.deadAt === null ? !keepsake : keepsake?.diedAt === p.deadAt;
}

export function readPlant(text, now = Date.now(), visible = true) {
  try {
    const p = JSON.parse(text);
    if (!p || ![1,2].includes(p.version) || (p.photo !== undefined && !validPhoto(p.photo)) || !STAGES.includes(p.stage)
      || !stamp(p.plantedAt) || !optionalStamp(p.wateredAt) || ![0,1].includes(p.round)
      || !Array.isArray(p.given) || !p.given.every(a => ACTIONS.includes(a)) || new Set(p.given).size !== p.given.length
      || typeof p.message !== 'string' || typeof p.sound !== 'boolean') return null;
    if (p.version === 1) return wake({ ...p, version: 2, id: 'legacy-' + p.plantedAt, generation: 1,
      ...blankHealth, lastDrink: p.stage === 'seed' ? null : now, jar: null, book: [], dewCleared: 0 }, now, visible);
    if (!optionalStamp(p.lastFullCare)) p.lastFullCare = null;
    if (!Number.isInteger(p.dewCleared) || p.dewCleared < 0 || p.dewCleared > 20) p.dewCleared = 0;
    if (p.dewRunCleared !== undefined && (!Number.isInteger(p.dewRunCleared) || p.dewRunCleared < 0 || p.dewRunCleared > p.dewCleared)) {
      p.dewRunCleared = 0;
    }
    return validGarden(p) ? wake(p, now, visible) : null;
  } catch { return null; }
}

export function restore(text, now = Date.now(), visible = true) {
  return readPlant(text, now, visible) ?? newPlant(now);
}

export function takeCutting(saved, stem, now = Date.now()) {
  const p = wake(saved, now);
  if (p.deadAt !== null || p.stage !== 'grown' || p.jar || !['left','right'].includes(stem)) return p;
  return { ...p, jar: { cutAt: now, generation: p.generation + 1, stem } };
}

export function replant(saved, source, now = Date.now()) {
  const p = wake(saved, now);
  if (p.deadAt === null || !['cutting','seed'].includes(source)) return p;
  const cutting = source === 'cutting';
  if (cutting && (!p.jar || now < p.jar.cutAt + ROOT_TIME)) return p;
  const fresh = { ...p, ...newPlant(now), sound: p.sound, book: p.book, jar: p.jar, dewCleared: p.dewCleared };
  return cutting ? { ...fresh, stage: 'sprout', generation: p.jar.generation, wateredAt: now, lastDrink: now,
    jar: null, message: 'New roots. Family resemblance?' } : fresh;
}

const happy = {
  water: ['A little sip. Very sophisticated.', 'Hydrated and mildly dramatic.'],
  sun: ['Ahh. My good side loves the sun.', 'Leaf me here in the sunshine.'],
  talk: ['Me? Adorable? Go on…', 'I heard that. Say it again?'],
  food: ['Itadakimasu! Seconds, please.', 'A snack for a growing icon.'],
};

export function careStatus(p, action, now = Date.now()) {
  const soil = condition(p, now);
  if (soil === 'dead') return { hint: 'Pressed leaf', locked: true };
  if (p.stage === 'seed') {
    if (action !== 'water') return { hint: 'At sprout', locked: true };
    return p.wateredAt === null ? { hint: 'Ready for water' } : { hint: 'Seed watered', locked: true };
  }
  if (action === 'drain') {
    if (soil === 'rootRot') return { hint: 'Root rot · drain now' };
    if (soil === 'soggy') return { hint: 'Soggy soil' };
    return { hint: 'Drains well', locked: true };
  }
  if (action === 'water') {
    if (soil === 'rootRot') return { hint: 'Drain first', locked: true };
    if (soil === 'dry') return { hint: 'Dry soil' };
    if (soil === 'critical') return { hint: 'Very thirsty' };
    if (soil === 'soggy' && now < p.extraPour + HOUR) return { hint: 'Soil soaked', locked: true };
    return { hint: soil === 'soggy' ? 'Still wet' : 'Soil damp', confirm: true };
  }
  const labels = { sun: ['Needs light', 'Sunned'], talk: ['Say hello', 'Chatted'], food: ['Ready to eat', 'Fed'] };
  if (!Object.hasOwn(labels, action)) return { hint: '', locked: true };
  const done = p.given.includes(action) || (p.stage === 'grown' && p.lastFullCare != null && now < p.lastFullCare + MATURE_CARE_DELAY);
  return { hint: labels[action][done ? 1 : 0], locked: done };
}

export function needsPourConfirmation(p, now = Date.now()) {
  return Boolean(careStatus(p, 'water', now).confirm);
}

export function care(saved, action, now = Date.now(), confirmed = false) {
  let p = wake(saved, now);
  const status = careStatus(p, action, now);
  if (status.locked || (status.confirm && !confirmed)) return p;
  if (action === 'drain') return { ...p, lastDrink: now, extraPour: null, rotAt: null, message: 'Ahh. My roots can breathe.' };
  if (p.stage === 'seed') return wake({ ...p, wateredAt: now, message: 'A sleepy sip. Back to dreaming…' }, now);
  if (action === 'water') {
    if (status.confirm) {
      if (p.extraPour === null) return { ...p, extraPour: now, message: 'Squelch. My socks are soaked.' };
      return { ...p, rotAt: now, message: 'My roots! Drain my pot.' };
    }
    p = { ...p, lastDrink: now, extraPour: null, message: 'A little sip. Very sophisticated.' };
    if (p.given.includes(action)) return p;
  }
  const given = [...p.given, action];
  if (given.length < ACTIONS.length) return { ...p, given, message: happy[action][(given.length + p.round) % 2] };
  if (p.stage === 'grown') return { ...p, round: 0, given: [], lastFullCare: now, message: 'Thriving. Obviously. Thank you, gardener.' };
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
