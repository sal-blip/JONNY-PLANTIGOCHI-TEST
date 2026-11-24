import {validTutorial,validDewLesson,finishSprouting,rememberHint} from './firstVisit.js';
import {canPlaceAt,viewForSlot} from './gardenLayout.js';
import {canRepotAt,destinationKey,catalog,earnWater,milestone,relocateFurnishings,validGardenLife} from './gardenEconomy.js';
import { validPhoto } from './gardenScenes.js';
import { audioLevels } from './audioLevels.js';

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
export const WATER_INTERVAL = 4 * HOUR;
const WATER_TOP_UP_WINDOW = HOUR / 2;
const soakedMessage = 'Squelch. My socks are soaked.';
export const MATURE_CARE_DELAY = 4 * HOUR;
const CRITICAL_WATER_AGE = 12 * HOUR;
const ROT_RESCUE_WINDOW = 12 * HOUR;
export const FUNGUS_WINDOW = 12 * HOUR;
const nextOutbreak = now => now + 36 * HOUR + Math.floor(Math.random() * (DAY + 1));
export const KEY = 'jonny.plantigochi.v1';
export const ACTIONS = ['water', 'sun', 'talk', 'food'];
export const STAGES = ['seed', 'sprout', 'young', 'split', 'grown'];
export const STAGE_NAMES = { seed: 'Seed', sprout: 'Sprout', young: 'Young plant', split: 'First split', grown: 'Grown plant' };
import collectorSeeds from './collectorSeeds.json' with { type: 'json' };
export const growthOrder = ['monstera', 'prayer-plant', 'monkey-tail-cactus', 'golden-pothos', 'hoya-serpens-splash', 'queen-anthurium', 'pink-micans', 'bird-of-paradise', 'moth-orchid', 'venus-flytrap', 'cape-sundew', 'white-top-pitcher', ...Object.keys(collectorSeeds)];
const toyVarieties = {
  ...collectorSeeds,
  'venus-flytrap': {name:'Venus Flytrap', seedName:'Flytrap', dayFive:'Toothed traps'},
  'cape-sundew': {name:'Cape Sundew', seedName:'Sundew', dayFive:'Dew beads'},
  'white-top-pitcher': {name:'White-Topped Pitcher Plant', seedName:'Pitcher', dayFive:'Veined hoods'},
  'prayer-plant': {name:'Prayer Plant',seedName:'Prayer Plant',dayFive:'Patterned leaves'},
  monstera: {name:'Monstera', seedName:'Monstera', dayFive:'First split'},
  'golden-pothos': {name:'Golden Pothos', seedName:'Pothos', dayFive:'Vining plant'},
  'bird-of-paradise': {name:'Bird of Paradise', seedName:'Paradise', dayFive:'Flower bract'},
  'moth-orchid': {name:'Moth Orchid', seedName:'Moth Orchid', dayFive:'Budding spike'},
  'pink-micans': {name:'Pink Micans', seedName:'Pink Micans', dayFive:'Blush vine'},
  'queen-anthurium': {name:'Queen Anthurium', seedName:'Queen', dayFive:'Velvet blade'},
  'monkey-tail-cactus': {name:'Monkey Tail Cactus', seedName:'Monkey Tail', dayFive:'First trail'},
  'hoya-serpens-splash': {name:'Hoya Splash', seedName:'Hoya Splash', dayFive:'First runner'},
  'snake-plant': {name:'Snake Plant', seedName:'Snake Plant', dayFive:'Rosette'},
};
export const isToySpecies = species => Object.hasOwn(toyVarieties,species);
const varietyOf = species => isToySpecies(species) ? toyVarieties[species] : toyVarieties.monstera;
export const toyVarietyName = species => varietyOf(species).name;
export const stageLabel = (plant, stage=plant.stage) => stage==='split'?varietyOf(plant.species).dayFive:STAGE_NAMES[stage];
const validToySpecies = species => species===undefined || isToySpecies(species);

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
  if (plant.stage === 'young') return {...milestones.finalCare,label:stageLabel(plant,'split')};
  if (plant.stage === 'split') return milestones.grown;
  return null;
}

const blankHealth = { lastDrink: null, extraPour: null, rotAt: null, deadAt: null };
export const ROOT_TIME = 12 * HOUR;
export const healthLabels = { healthy: 'Damp soil', dry: 'Thirsty', critical: 'Very thirsty', soggy: 'Still wet', rootRot: 'Drain pot', dead: 'Pressed leaf' };

export const plantName = name => typeof name === 'string' && /^[A-Za-z -]{1,12}$/.test(name) && name.trim() ? name.trim() : 'Monstera';

// An absent scene follows the app default. Keeping it off a fresh seed also
// preserves the player's explicit background when graduate or replant merges it.
export function newPlant(now = Date.now(), name, species = growthOrder[0]) {
  const defaultName=varietyOf(species).seedName;
  return { version: 3, species, name:plantName(name ?? defaultName), earned: 0, anchor: now, fedAt: null, litAt: null, companyAt: null, accompanied: false, graduates: [], id: crypto.randomUUID(), generation: 1, plantedAt: now, wateredAt: null, lastFullCare: null,
    seedBonus:0,boostCount:0,stage: 'seed', round: 0, given: [], message: 'Five more minutes… or sixty.', sound: true,
    ...audioLevels(), ...blankHealth, growthFlares:[], outbreakDue:null, fungusAt:null, jar: null, book: [], dewCleared: 0 };
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

export function soilDeadline(p) {
  if (p.lastDrink === null || p.deadAt !== null) return null;
  return p.rotAt === null ? p.lastDrink + DAY : p.rotAt + ROT_RESCUE_WINDOW;
}

export function deathDeadline(p) {
  const soil=soilDeadline(p);
  return soil===null || p.fungusAt==null ? soil : Math.min(soil,p.fungusAt+FUNGUS_WINDOW);
}

// A delayed transaction or a changed device clock must not rewrite recorded history.
function latestCareAt(p) {
  return Math.max(p.plantedAt,p.anchor,p.wateredAt ?? 0,p.lastDrink ?? 0,p.extraPour ?? 0,
    p.rotAt ?? 0,p.fungusAt ?? 0,p.fedAt ?? 0,p.litAt ?? 0,p.companyAt ?? 0,p.deadAt ?? 0,p.jar?.cutAt ?? 0);
}

export function discoverFungus(saved, now) {
  const p=wake(saved,now);
  if(now < latestCareAt(p) || p.deadAt!==null || p.stage==='seed' || p.fungusAt!=null || p.outbreakDue==null || now<p.outbreakDue ||
     p.rotAt!==null || condition(p,now)==='critical')return p;
  return {...settle(p,now),fungusAt:now,outbreakDue:null};
}

export function treatFungus(saved, outbreak, now) {
  const p=wake(saved,now);
  if(now < latestCareAt(p) || p.deadAt!==null || outbreak==null || p.fungusAt!==outbreak)return p;
  return milestone({...settle(p,now),fungusAt:null,outbreakDue:nextOutbreak(now),message:'Ahh. No more gnats!'},'fungus-'+outbreak,p.name+' recovered from fungus.',now);
}

export function criticalReminder(p) {
  if (p.deadAt !== null || p.lastDrink === null) return null;
  return p.rotAt === null ? p.lastDrink + CRITICAL_WATER_AGE : p.rotAt + ROT_RESCUE_WINDOW / 2;
}

export const FOOD_INTERVAL = 2 * DAY;
export const LIGHT_INTERVAL = DAY;
export const EARLY_WINDOW = 8 * HOUR;
export function timeLeft(ms, showDays = true) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days && showDays) return days + 'd ' + hours % 24 + 'h';
  if (hours) return hours + 'h' + (minutes % 60 ? ' ' + minutes % 60 + 'm' : '');
  return minutes + 'm';
}
export function moodOf(p, now = Date.now()) {
  if (p.stage === 'seed') return 'sleeping';
  const elapsed = now - p.companyAt;
  if (elapsed < HOUR / 2 && p.accompanied) return 'happy';
  if (elapsed < 12 * HOUR) return 'content';
  return elapsed < DAY ? 'quiet' : 'lonely';
}
export function growthHolds(p, now) {
  const holds = [];
  if (p.fungusAt!=null) holds.push('First Aid');
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
  if (p.seedOffers) return 0;
  if (p.stage === 'seed') return p.tutorial?p.tutorial.blocks*HOUR/4:Math.min(HOUR, Math.max(0, now - p.plantedAt)+(p.seedBonus || 0));
  if (p.stage === 'grown') return WEEK;
  const end = Math.min(now, eligibleUntil(p), p.deadAt ?? Infinity, p.rotAt ?? Infinity, p.fungusAt ?? Infinity);
  return Math.min(WEEK, p.earned + Math.max(0, end - p.anchor));
}
export function milestoneDue(p) {
  const next = nextMilestone(p);
  if (!next) return null;
  if (p.stage === 'seed') return p.wateredAt === null || p.tutorial ? null : Math.max(p.wateredAt,p.plantedAt + HOUR-(p.seedBonus || 0));
  const due = p.anchor + Math.max(0, next.age - p.earned);
  return p.fungusAt==null && p.rotAt === null && due <= eligibleUntil(p) ? due : null;
}
function sprout(p, now) {
  return milestone({...p, stage:'sprout', growthFlares:['sprout'], outbreakDue:nextOutbreak(now), fungusAt:null, earned:HOUR, anchor:now, lastDrink:now, fedAt:now, litAt:now,
    companyAt:now, accompanied:false, given:[], message:p.species==='monkey-tail-cactus'?'Ohayō! See my little spines?':'Ohayō! Look who finally leafed out.'},'sprout',p.name+' sprouted.',now);
}
export const SPURT_COST=50;
export function growthSpurtOffer(p,now){
  if(p.seedOffers)return null;
  const next=nextMilestone(p);
  if(!next)return null;
  const balance=p.gardenLife?.balance ?? 0;
  const needs=p.stage==='seed'?(p.wateredAt===null?['Water']:[]):growthHolds(p,now);
  const span=next.age-next.start,amount=span/4;
  const target=Math.min(next.age,earnedAt(p,now)+amount);
  const reason=needs.length?'Needs '+needs.join('/'):balance<SPURT_COST?'Need '+(SPURT_COST-balance)+' more coins':'';
  return {amount,target,balance,reason,next:next.label,percent:Math.floor(100*(target-next.start)/span)};
}
export function buyGrowth(p,expected,now){
  p=wake(p,now);
  const offer=growthSpurtOffer(p,now),t=p.tutorial;
  if(!offer || offer.reason || now<latestCareAt(p) || p.stage!==expected.stage ||
    (p.boostCount || 0)!==expected.count || (t && t.step!=='boost'))return p;
  const advanced={...p,boostCount:expected.count+1,gardenLife:{...p.gardenLife,balance:offer.balance-SPURT_COST}};
  if(t){
    const blocks=t.blocks+1;
    if(blocks===4)return finishSprouting(sprout(advanced,now),now);
    return {...advanced,tutorial:{...t,blocks}};
  }
  if(p.stage==='seed')return wake({...advanced,seedBonus:(p.seedBonus || 0)+offer.amount},now);
  return wake({...advanced,anchor:now,earned:offer.target},now);
}
export function canUseGrowthDay(p,now){
  return (p.gardenLife?.growthDays || 0)>0 && !p.tutorial && !p.seedOffers &&
    ['sprout','young','split'].includes(p.stage) && p.deadAt===null &&
    now>=latestCareAt(p) && earnedAt(p,now)<WEEK && !growthHolds(p,now).length;
}
export function useGrowthDay(saved,id,expectedCount,now){
  const p=wake(saved,now);
  if(p.id!==id || p.gardenLife?.growthDays!==expectedCount || !canUseGrowthDay(p,now))return p;
  return wake({...p,anchor:now,earned:Math.min(WEEK,earnedAt(p,now)+DAY),
    gardenLife:{...p.gardenLife,growthDays:expectedCount-1}},now);
}
function settle(p, now) {
  return {...p, earned:earnedAt(p,now), anchor:Math.max(now,p.anchor)};
}
function awardMaturePlant(p){
  if(p.waitingPlants?.some(item=>item.id===p.id))return p;
  const item={id:p.id,name:p.name,species:p.species ?? growthOrder[0],generation:p.generation,plantedAt:p.plantedAt};
  return {...p,waitingPlants:[...(p.waitingPlants || []),item]};
}

export function canHomePlant(p,id){
  const earned=p.waitingPlants?.some(item=>item.id===id);
  if(id!==p.id)return Boolean(earned);
  return p.stage==='grown' && (p.deadAt!==null ? Boolean(earned) : p.fungusAt==null);
}

export function wake(p, now = Date.now(), visible = true) {
  if (p.deadAt !== null || now < latestCareAt(p)) return p;
  if (p.stage === 'seed') return visible && !p.tutorial && p.wateredAt !== null && earnedAt(p,now)>=HOUR ? sprout(p,now) : p;
  const deadline = deathDeadline(p);
  const observedAt = Math.min(now,deadline);
  const elapsed = earnedAt(p,observedAt);
  const target = elapsed >= WEEK ? 'grown' : elapsed >= 5*DAY ? 'split' : elapsed >= 3*DAY ? 'young' : 'sprout';
  if (STAGES.indexOf(target) > STAGES.indexOf(p.stage)) {
    const threshold = target==='grown' ? milestones.grown.age : target==='split' ? milestones.finalCare.age : milestones.young.age;
    // Only this growth segment has a known starting time. Older accrued time has no dated history.
    const crossing = p.anchor + threshold - p.earned;
    const reachedAt = p.earned < threshold && crossing >= p.plantedAt ? crossing : observedAt;
    const crossed=STAGES.slice(STAGES.indexOf(p.stage)+1,STAGES.indexOf(target)+1);
    p = milestone({...settle(p,reachedAt),growthFlares:[...(p.growthFlares || []),...crossed],stage:target,round:target==='split'?1:0,given:[],message:p.species==='monkey-tail-cactus'?'My fuzzy stems grew!':'A new leaf unfolded!'},target,p.name+' reached '+stageLabel(p,target).toLowerCase()+'.',reachedAt);
  }
  if(p.stage==='grown')p=awardMaturePlant(p);
  if (now < deadline) return p;
  const cause = deadline<soilDeadline(p) ? 'Fungus' : p.rotAt===null ? 'Thirst' : 'Root rot';
  const leaf = {id:p.id,name:plantName(p.name),species:p.species ?? growthOrder[0],stage:p.stage,generation:p.generation,plantedAt:p.plantedAt,diedAt:deadline,cause};
  return milestone({...settle(p,deadline),deadAt:deadline,book:[...p.book,leaf],message:'A leaf for your book.'},'death',p.name+' left a pressed leaf. Cause: '+cause+'.',deadline);
}
export function company(p, now = Date.now()) {
  p = wake(p,now);
  return now < latestCareAt(p) || p.deadAt !== null || p.stage === 'seed' ? p : {...p,companyAt:now,accompanied:true};
}
const stamp = n => Number.isSafeInteger(n) && n >= 0;
const optionalStamp = n => n === null || stamp(n);
const generation = n => Number.isSafeInteger(n) && n >= 1;
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 100;
const validLeaf = leaf => leaf && validId(leaf.id) && validToySpecies(leaf.species) && STAGES.slice(1).includes(leaf.stage) && generation(leaf.generation)
  && stamp(leaf.plantedAt) && stamp(leaf.diedAt) && leaf.diedAt >= leaf.plantedAt && ['Thirst','Root rot','Fungus'].includes(leaf.cause);

function validGarden(p) {
  if (!validId(p.id) || !generation(p.generation) || !validToySpecies(p.species) || ![p.lastDrink,p.extraPour,p.rotAt,p.deadAt].every(optionalStamp)) return false;
  if ((p.stage === 'seed') !== (p.lastDrink === null)) return false;
  if (p.extraPour !== null && (p.lastDrink === null || p.extraPour < p.lastDrink || p.extraPour >= p.lastDrink + WATER_INTERVAL)) return false;
  if (p.rotAt !== null && (p.extraPour === null || p.rotAt < p.extraPour + HOUR || p.rotAt >= p.lastDrink + WATER_INTERVAL)) return false;
  if (p.jar !== null && !(p.jar && validToySpecies(p.jar.species) && stamp(p.jar.cutAt) && generation(p.jar.generation) && ['left','right'].includes(p.jar.stem))) return false;
  if (!Array.isArray(p.book) || !p.book.every(validLeaf) || new Set(p.book.map(leaf => leaf.id)).size !== p.book.length) return false;
  const keepsake = p.book.find(leaf => leaf.id === p.id);
  return p.deadAt === null ? !keepsake : keepsake?.diedAt === p.deadAt;
}

export function readPlant(text, now = Date.now(), visible = true) {
  try {
    const p = JSON.parse(text);
    if (!p || ![1,2,3,4].includes(p.version) || (p.photo !== undefined && !validPhoto(p.photo)) || !STAGES.includes(p.stage)
      || !stamp(p.plantedAt) || !optionalStamp(p.wateredAt) || ![0,1].includes(p.round)
      || !Array.isArray(p.given) || !p.given.every(a => ACTIONS.includes(a)) || new Set(p.given).size !== p.given.length
      || typeof p.message !== 'string' || typeof p.sound !== 'boolean') return null;
    // Older builds could confirm a second pour with a timestamp preceding the real drink.
    if (p.version===3 && p.stage!=='seed' && p.deadAt===null && p.rotAt===null && p.message===soakedMessage &&
        stamp(p.extraPour) && stamp(p.lastDrink) && p.extraPour<p.lastDrink && p.anchor>=p.lastDrink) {
      p.extraPour=null;
      p.message='A little sip. Very sophisticated.';
    }
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
    if(p.seedOffers !== undefined && (!Array.isArray(p.seedOffers) || p.seedOffers.length !== 2 ||
      new Set(p.seedOffers).size !== 2 || !p.seedOffers.every(id=>growthOrder.includes(id)) ||
      p.stage !== 'seed' || p.wateredAt !== null || p.tutorial || p.deadAt !== null))return null;
    if(p.seedBonus!==undefined && (!stamp(p.seedBonus) || p.seedBonus>HOUR))return null;
    if(p.boostCount!==undefined && !stamp(p.boostCount))return null;
    if(p.tutorial && !validTutorial(p.tutorial,p.stage))return null;
    if(p.dewLesson!==undefined && !validDewLesson(p.dewLesson))return null;
    if (!Object.hasOwn(p,'fungusAt')) p.fungusAt=null;
    if (!Object.hasOwn(p,'outbreakDue')) p.outbreakDue=p.deadAt===null && p.stage!=='seed' ? nextOutbreak(now) : null;
    if(!optionalStamp(p.fungusAt) || !optionalStamp(p.outbreakDue) ||
       (p.fungusAt!==null && p.outbreakDue!==null) ||
       (p.stage==='seed' && (p.fungusAt!==null || p.outbreakDue!==null)))return null;
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
    if(p.waitingPlants!==undefined){
      const placed=new Set(p.graduates.map(g=>g.id));
      if(!Array.isArray(p.waitingPlants) || !p.waitingPlants.every(g=>{
        if(!g || !validId(g.id) || placed.has(g.id) || (g.source==='shop'?g.id===p.id || catalog[g.species]?.kind!=='plant':!isToySpecies(g.species)) ||
          !generation(g.generation) || !stamp(g.plantedAt) || typeof g.name!=='string' ||
          (g.id===p.id && (p.stage!=='grown' || g.species!==(p.species ?? growthOrder[0]))))return false;
        placed.add(g.id);return true;
      }))return null;
    }
    if(p.growthFlares!==undefined && (!Array.isArray(p.growthFlares) || !p.growthFlares.every((stage,i,all)=>
      STAGES.indexOf(stage)>0 && STAGES.indexOf(stage)<=STAGES.indexOf(p.stage) &&
      (!i || STAGES.indexOf(all[i-1])<STAGES.indexOf(stage)))))return null;
    if(p.sproutBurstPending===p.id && p.stage==='sprout' && p.growthFlares===undefined)p.growthFlares=['sprout'];
    delete p.sproutBurstPending;
    if (!validGarden(p) || !validGardenLife(p)) return null;
    Object.assign(p, audioLevels(p));
    delete p.ambienceVolume;
    delete p.ambience;
    p.name=plantName(p.name);
    for (const item of [...p.book,...p.graduates]) item.name=item.source==='shop' && catalog[item.species]?.kind==='plant'?catalog[item.species].name:plantName(item.name);
    if(p.seenHints!==undefined && (!Array.isArray(p.seenHints) || !p.seenHints.every(id=>typeof id==='string')))return null;
    let migrated=p;
    if(p.tutorial){
      for(const id of p.tutorial.visited)migrated=rememberHint(migrated,id);
      if(p.tutorial.step==='apps')migrated={...migrated,tutorial:{...p.tutorial,step:'return'}};
      if(p.tutorial.step==='tour'){
        const start=Math.max(now,p.anchor);
        migrated=finishSprouting({...migrated,outbreakDue:nextOutbreak(start)},start);
      }
    }
    return wake(migrated, now, visible);
  } catch { return null; }
}

export function restore(text, now = Date.now(), visible = true) {
  return text === null ? newPlant(now) : readPlant(text, now, visible);
}

export function takeCutting(saved, stem, now = Date.now()) {
  const p = wake(saved, now);
  if (now < latestCareAt(p) || p.deadAt !== null || p.stage !== 'grown' || p.fungusAt!=null || p.jar || !['left','right'].includes(stem)) return p;
  return { ...p, jar: { cutAt: now, generation: p.generation + 1, stem, species:p.species ?? growthOrder[0] } };
}

export function replant(saved, source, now = Date.now()) {
  const p = wake(saved, now);
  if (now < latestCareAt(p) || p.deadAt === null || !['cutting','seed'].includes(source)) return p;
  const cutting = source === 'cutting';
  if (cutting && (!p.jar || now < p.jar.cutAt + ROOT_TIME)) return p;
  const fresh = { ...p, ...newPlant(now,undefined,cutting?p.jar.species:p.species),version:p.version, ...audioLevels(p), sound: p.sound, book: p.book, jar: p.jar, dewCleared: p.dewCleared };
  fresh.graduates=p.graduates; fresh.generation=p.generation+1;
  return cutting ? { ...sprout(fresh,now), generation: p.jar.generation, wateredAt: now,
    jar: null, message: 'New roots. Family resemblance?' } : fresh;
}

function seedOffers(residents, lastSpecies) {
  const raised = residents.filter(item => item.source !== 'shop');
  const lastRaised = new Map(raised.map((item,index) => [item.species,index]));
  return growthOrder.filter(species => species !== lastSpecies)
    .sort((a,b) => (lastRaised.get(a) ?? -1) - (lastRaised.get(b) ?? -1))
    .slice(0,2);
}

export function chooseSeed(p, id, species, now = Date.now()) {
  if (p.id !== id || !p.seedOffers?.includes(species) || now < p.anchor) return p;
  const {seedOffers, ...garden} = p;
  return {...garden, species, name:varietyOf(species).seedName, plantedAt:now, anchor:now, seedNamePending:id};
}

export function graduate(saved, id, slot, now = Date.now()) {
  const p = wake(saved,now);
  if(now<latestCareAt(p) || !canHomePlant(p,id) || !canPlaceAt(p.graduates,slot))return p;
  const active=id===p.id;
  const earned=active?p:p.waitingPlants.find(item=>item.id===id);
  const species=earned.species ?? growthOrder[0];
  const resident={id,name:plantName(earned.name),species,generation:earned.generation,plantedAt:earned.plantedAt,movedAt:now,slot};
  if(earned.source==='shop'){
    resident.source='shop';
    resident.name=catalog[species].name;
  }
  const collection={graduates:[...p.graduates,resident],waitingPlants:(p.waitingPlants || []).filter(item=>item.id!==id)};
  let next={...p,...collection};
  if(active){
    const offers=seedOffers(collection.graduates,species);
    next={...p,...newPlant(now,undefined,offers[0]),version:4,seedOffers:offers,...audioLevels(p),...collection,generation:p.generation+1,sound:p.sound,jar:p.jar,book:p.book,dewCleared:p.dewCleared};
  }
  if(active)delete next.seedNamePending;
  if(earned.source==='shop')return milestone(next,'prize-placed',resident.name+' came home from the daily spin.',now,id);
  return milestone(next,'graduated',resident.name+' graduated to the garden.',now,id);
}

// Check both identity and source against the latest transaction so a stale
// pointer gesture cannot move a plant someone already rearranged in another tab.
export function relocateGraduate(p, id, from, to, repotTarget, sourceKey, targetKey) {
  const index=p.graduates.findIndex(g=>g.id===id && g.slot===from);
  if (index < 0 || !canPlaceAt(p.graduates,to)) return p;
  if(sourceKey!==undefined && sourceKey!==destinationKey(p,from))return p;
  if(targetKey!==undefined && targetKey!==destinationKey(p,to))return p;
  if(repotTarget!==undefined && (!canRepotAt(p,to) || destinationKey(p,to)!==repotTarget))return p;
  const graduates=p.graduates.slice();
  graduates[index]={...graduates[index],slot:to};
  return relocateFurnishings(p,{...p,graduates},from,to,repotTarget!==undefined);
}

const happy = {
  water: ['A little sip. Very sophisticated.', 'Hydrated and mildly dramatic.'],
  sun: ['Ahh. My good side loves the sun.', 'Leaf me here in the sunshine.'],
  talk: ['Me? Adorable? Go on…', 'I heard that. Say it again?'],
  food: ['Itadakimasu! Seconds, please.', 'A snack for a growing icon.'],
};

export function careStatus(p, action, now = Date.now()) {
  if(p.seedOffers)return {locked:true,label:'Choose a seed',detail:'Choose your next seed first.'};
  if (p.deadAt !== null) return { hint: 'Pressed leaf', locked: true };
  const latest = latestCareAt(p);
  // The displayed clock updates once per second, while a completed action renders immediately.
  if (latest - now > 1000) return { hint: 'Check device clock', locked: true, opensAt:latest };
  now = Math.max(now,latest);
  const soil = condition(p,now);
  if (p.stage === 'seed') {
    if (action !== 'water') return { hint: 'At sprout', locked: true };
    return p.wateredAt === null ? { hint: 'Ready for water', due:true } : { hint: 'Seed watered', locked: true };
  }
  if (action === 'drain') {
    if (soil === 'rootRot') return { hint: 'Root rot · drain now' };
    if (soil === 'soggy') return { hint: 'Soggy soil' };
    return { hint: 'Drains well', locked: true };
  }
  if (action === 'water') {
    if (soil === 'rootRot') return { hint: 'Drain first', locked: true };
    if (soil === 'dry') return { hint: 'Dry soil', due:true };
    if (soil === 'critical') return { hint: 'Very thirsty', due:true };
    if (soil === 'healthy') {
      const opensAt = p.lastDrink + WATER_INTERVAL - WATER_TOP_UP_WINDOW;
      if (now >= opensAt) return {hint:'Safe to top up',topUp:true};
      return {hint:'Safe top-up in ' + timeLeft(opensAt - now), confirm:true};
    }
    if (soil === 'soggy' && now < p.extraPour + HOUR) return { hint: 'Soil soaked', locked: true };
    return { hint:'Still wet', confirm:true };
  }
  if (action==='talk') return {hint:moodOf(p,now)==='happy'?'Happy · Say hello':'Say hello'};
  if (!['food','sun'].includes(action)) return {hint:'',locked:true};
  const due = action === 'food' ? p.fedAt + FOOD_INTERVAL : p.litAt + LIGHT_INTERVAL;
  const opensAt = due - EARLY_WINDOW;
  if (now < opensAt) return {hint:'Ready in ' + timeLeft(opensAt - now, false), locked:true, opensAt};
  if (now < due) return {hint:'Ready now · Due in ' + timeLeft(due - now), locked:false};
  return {hint:action === 'food' ? 'Feed now' : 'Give light now', due:true};
}

export function needsPourConfirmation(p, now = Date.now()) {
  return Boolean(careStatus(p, 'water', now).confirm);
}

export function care(saved, action, now = Date.now(), confirmed = false, rewardTime = now) {
  let p = wake(saved, now);
  if (now < latestCareAt(p)) return p;
  const status = careStatus(p, action, now);
  if (status.locked || (status.confirm && !confirmed)) return p;
  if (p.stage !== 'seed') p=settle(p,now);
  if (action === 'drain') {
    const drained={...p,lastDrink:now,extraPour:null,rotAt:null,message:'Ahh. My roots can breathe.'};
    return p.rotAt===null?drained:milestone(drained,'drain-'+p.rotAt,p.name+' recovered from root rot.',now);
  }
  if (p.stage === 'seed') return earnWater(wake({ ...p, wateredAt: now, message: 'A sleepy sip. Back to dreaming…' }, now),rewardTime);
  if (action === 'water') {
    if (status.confirm) {
      if (p.extraPour === null) return { ...p, extraPour: now, message: soakedMessage };
      return { ...p, rotAt: now, message: 'My roots! Drain my pot.' };
    }
    if(condition(p,now)==='critical')p=milestone(p,'rescue-'+p.lastDrink,p.name+' perked up after a rescue watering.',now);
    p = earnWater({ ...p, lastDrink: now, extraPour: null, message: 'A little sip. Very sophisticated.' },rewardTime);
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
