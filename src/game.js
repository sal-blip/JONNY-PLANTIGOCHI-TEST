import {canPlaceAt,viewForSlot,placesFor,slotFor} from './gardenLayout.js';
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
export const STAGES = ['seed', 'sprout', 'young', 'split', 'grown'];
export const STAGE_NAMES = { seed: 'Seed', sprout: 'Sprout', young: 'Young plant', split: 'First split', grown: 'Grown plant' };

const milestones = {
  sprout: { start: 0, age: HOUR, label: 'Sprout' },
  young: { start: HOUR, age: 3 * DAY, label: 'Young plant' },
  finalCare: { start: 3 * DAY, age: 5 * DAY, label: 'First split' },
  grown: { start: 5 * DAY, age: WEEK, label: 'Full growth' },
};

export function nextMilestone(plant) {
  if (plant.deadAt !== null) return null;
  if (plant.stage === 'seed') return milestones.sprout;
  if (plant.stage === 'sprout') return milestones.young;
  if (plant.stage === 'young') return milestones.finalCare;
  if (plant.stage === 'split') return milestones.grown;
  return null;
}

const blankHealth = { lastDrink: null, extraPour: null, rotAt: null, deadAt: null };
export const ROOT_TIME = 12 * HOUR;
export const healthLabels = { healthy: 'Damp soil', dry: 'Thirsty', critical: 'Very thirsty', soggy: 'Still wet', rootRot: 'Drain pot', dead: 'Pressed leaf' };

export const plantName = name => typeof name === 'string' && /^[A-Za-z -]{1,12}$/.test(name) && name.trim() ? name.trim() : 'Monstera';

export function newPlant(now = Date.now(), name = 'Monstera') {
  return { version: 3, name:plantName(name), earned: 0, anchor: now, fedAt: null, litAt: null, companyAt: null, accompanied: false, graduates: [], id: crypto.randomUUID(), generation: 1, plantedAt: now, wateredAt: null, lastFullCare: null,
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

export const FOOD_INTERVAL = 2 * DAY;
export const LIGHT_INTERVAL = DAY;
export const EARLY_WINDOW = 8 * HOUR;
export function moodOf(p, now = Date.now()) {
  if (p.stage === 'seed') return 'sleeping';
  const elapsed = now - p.companyAt;
  if (elapsed < HOUR / 2 && p.accompanied) return 'happy';
  if (elapsed < 12 * HOUR) return 'content';
  return elapsed < DAY ? 'quiet' : 'lonely';
}
export function growthHolds(p, now) {
  const holds = [];
  if (p.rotAt !== null) holds.push('Drain');
  else if (now >= p.lastDrink + CRITICAL_WATER_AGE) holds.push('Water');
  if (now >= p.fedAt + FOOD_INTERVAL) holds.push('Food');
  if (now >= p.litAt + LIGHT_INTERVAL) holds.push('Light');
  return holds;
}
function eligibleUntil(p) {
  return Math.min(p.lastDrink + CRITICAL_WATER_AGE, p.fedAt + FOOD_INTERVAL, p.litAt + LIGHT_INTERVAL);
}
export function earnedAt(p, now) {
  if (p.stage === 'seed') return Math.min(HOUR, Math.max(0, now - p.plantedAt));
  if (p.stage === 'grown') return WEEK;
  const end = Math.min(now, eligibleUntil(p), p.deadAt ?? Infinity, p.rotAt ?? Infinity);
  return Math.min(WEEK, p.earned + Math.max(0, end - p.anchor));
}
export function milestoneDue(p) {
  const next = nextMilestone(p);
  if (!next) return null;
  if (p.stage === 'seed') return p.wateredAt === null ? null : Math.max(p.wateredAt,p.plantedAt + HOUR);
  const due = p.anchor + Math.max(0, next.age - p.earned);
  return p.rotAt === null && due <= eligibleUntil(p) ? due : null;
}
function sprout(p, now) {
  return {...p, stage:'sprout', earned:HOUR, anchor:now, lastDrink:now, fedAt:now, litAt:now,
    companyAt:now, accompanied:false, given:[], message:'Ohayō! Look who finally leafed out.'};
}
function settle(p, now) {
  return {...p, earned:earnedAt(p,now), anchor:Math.max(now,p.anchor)};
}
export function wake(p, now = Date.now(), visible = true) {
  if (p.deadAt !== null) return p;
  if (p.stage === 'seed') return visible && p.wateredAt !== null && now >= p.plantedAt + HOUR ? sprout(p,now) : p;
  const deadline = deathDeadline(p);
  const elapsed = earnedAt(p,Math.min(now,deadline));
  const target = elapsed >= WEEK ? 'grown' : elapsed >= 5*DAY ? 'split' : elapsed >= 3*DAY ? 'young' : 'sprout';
  if (STAGES.indexOf(target) > STAGES.indexOf(p.stage)) {
    p = {...p,stage:target,round:target==='split'?1:0,given:[],message:'A new leaf unfolded!'};
  }
  if (now < deadline) return p;
  const cause = p.rotAt === null ? 'Thirst' : 'Root rot';
  const leaf = {id:p.id,name:plantName(p.name),stage:p.stage,generation:p.generation,plantedAt:p.plantedAt,diedAt:deadline,cause};
  return {...settle(p,deadline),deadAt:deadline,book:[...p.book,leaf],message:'A leaf for your book.'};
}
export function company(p, now = Date.now()) {
  p = wake(p,now);
  return p.deadAt !== null || p.stage === 'seed' ? p : {...p,companyAt:now,accompanied:true};
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
    if (!p || ![1,2,3].includes(p.version) || (p.photo !== undefined && !validPhoto(p.photo)) || !STAGES.includes(p.stage)
      || !stamp(p.plantedAt) || !optionalStamp(p.wateredAt) || ![0,1].includes(p.round)
      || !Array.isArray(p.given) || !p.given.every(a => ACTIONS.includes(a)) || new Set(p.given).size !== p.given.length
      || typeof p.message !== 'string' || typeof p.sound !== 'boolean') return null;
    if (p.version === 1) Object.assign(p,{version:2,id:'legacy-'+p.plantedAt,generation:1,...blankHealth,
      lastDrink:p.stage==='seed'?null:now,jar:null,book:[],dewCleared:0});
    if (p.version === 2) {
      if (!validGarden(p)) return null;
      if (p.stage==='young' && p.round===1) p.stage='split';
      const floor = {seed:0,sprout:HOUR,young:3*DAY,split:5*DAY,grown:WEEK}[p.stage];
      const limit = nextMilestone(p)?.age ?? WEEK;
      const legacyAge = Math.max(0,(p.deadAt ?? now)-p.plantedAt);
      Object.assign(p,{version:3,graduates:[],earned:Math.max(floor,Math.min(legacyAge,Math.max(floor,limit-1))),
        anchor:now,fedAt:p.lastDrink===null?null:now,litAt:p.lastDrink===null?null:now,
        companyAt:p.lastDrink===null?null:now,accompanied:false});
    }
    if (!stamp(p.earned) || p.earned>WEEK || !stamp(p.anchor) || typeof p.accompanied!=='boolean'
      || ![p.companyAt,p.fedAt,p.litAt].every(n=>p.stage==='seed'?n===null:stamp(n))
      || !Array.isArray(p.graduates) || !p.graduates.every(g=>g && validId(g.id) && g.id!==p.id &&
      typeof g.species==='string' && /^[a-z][a-z0-9-]{0,47}$/.test(g.species) && generation(g.generation) && viewForSlot(g.slot)>=0 && stamp(g.movedAt) && stamp(g.plantedAt) && g.movedAt>=g.plantedAt)
      || new Set(p.graduates.map(g=>g.slot)).size!==p.graduates.length
      || new Set(p.graduates.map(g=>g.id)).size!==p.graduates.length) return null;
    if (!optionalStamp(p.lastFullCare)) p.lastFullCare = null;
    if (!Number.isInteger(p.dewCleared) || p.dewCleared < 0 || p.dewCleared > 20) p.dewCleared = 0;
    if (p.dewRunCleared !== undefined && (!Number.isInteger(p.dewRunCleared) || p.dewRunCleared < 0 || p.dewRunCleared > p.dewCleared)) {
      p.dewRunCleared = 0;
    }
    if (!validGarden(p)) return null;
    p.name=plantName(p.name);
    for (const item of [...p.book,...p.graduates]) item.name=plantName(item.name);
    return wake(p, now, visible);
  } catch { return null; }
}

export function restore(text, now = Date.now(), visible = true) {
  return text === null ? newPlant(now) : readPlant(text, now, visible);
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
  fresh.graduates=p.graduates; fresh.generation=p.generation+1;
  return cutting ? { ...sprout(fresh,now), generation: p.jar.generation, wateredAt: now,
    jar: null, message: 'New roots. Family resemblance?' } : fresh;
}

export function graduate(saved, id, slot, now = Date.now()) {
  const p = wake(saved,now);
  if (p.id!==id || p.stage!=='grown' || p.deadAt!==null || !canPlaceAt(p.graduates,slot)) return p;
  const room=viewForSlot(slot);
  const potStyle=placesFor(room).findIndex(spot=>slotFor(room,spot)===slot)%6;
  const graduate = {id:p.id,name:plantName(p.name),species:'monstera',potStyle,generation:p.generation,plantedAt:p.plantedAt,movedAt:now,slot};
  return {...p,...newPlant(now),generation:p.generation+1,sound:p.sound,jar:p.jar,book:p.book,
    dewCleared:p.dewCleared,graduates:[...p.graduates,graduate]};
}

// Check both identity and source against the latest transaction so a stale
// pointer gesture cannot move a plant someone already rearranged in another tab.
export function relocateGraduate(p, id, from, to) {
  const index=p.graduates.findIndex(g=>g.id===id && g.slot===from);
  if (index < 0 || !canPlaceAt(p.graduates,to)) return p;
  const graduates=p.graduates.slice();
  graduates[index]={...graduates[index],slot:to};
  return {...p,graduates};
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
  if (action==='talk') return {hint:moodOf(p,now)==='happy'?'Happy · Say hello':'Say hello'};
  const due = action==='food' ? p.fedAt + FOOD_INTERVAL : p.litAt + LIGHT_INTERVAL;
  if (!['food','sun'].includes(action)) return {hint:'',locked:true};
  const label = action==='food'?'Food':'Light';
  if (now>=due) return {hint:label+' overdue'};
  const minutes=Math.ceil((due-now)/60000);
  const left=minutes>=60?Math.ceil(minutes/60)+'h':minutes+'m';
  return {hint:label+' in '+left,locked:now<due-EARLY_WINDOW};
}

export function needsPourConfirmation(p, now = Date.now()) {
  return Boolean(careStatus(p, 'water', now).confirm);
}

export function care(saved, action, now = Date.now(), confirmed = false) {
  let p = wake(saved, now);
  const status = careStatus(p, action, now);
  if (status.locked || (status.confirm && !confirmed)) return p;
  if (p.stage !== 'seed') p=settle(p,now);
  if (action === 'drain') return { ...p, lastDrink: now, extraPour: null, rotAt: null, message: 'Ahh. My roots can breathe.' };
  if (p.stage === 'seed') return wake({ ...p, wateredAt: now, message: 'A sleepy sip. Back to dreaming…' }, now);
  if (action === 'water') {
    if (status.confirm) {
      if (p.extraPour === null) return { ...p, extraPour: now, message: 'Squelch. My socks are soaked.' };
      return { ...p, rotAt: now, message: 'My roots! Drain my pot.' };
    }
    p = { ...p, lastDrink: now, extraPour: null, message: 'A little sip. Very sophisticated.' };
  }
  if (action === 'talk') p=company(p,now);
  if (action === 'food') p={...p,fedAt:now};
  if (action === 'sun') p={...p,litAt:now};
  return {...p,given:p.given.includes(action)?p.given:[...p.given,action],message:happy[action][p.generation%2]};
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
