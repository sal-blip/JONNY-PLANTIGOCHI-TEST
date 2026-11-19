export const HOUR = 60 * 60 * 1000;
export const KEY = 'jonny.plantigochi.v1';
export const ACTIONS = ['water', 'sun', 'talk', 'food'];
export const STAGES = ['seed', 'sprout', 'young', 'grown'];
export const STAGE_NAMES = { seed: 'Seed', sprout: 'Sprout', young: 'Young plant', grown: 'Grown plant' };

export function newPlant(now = Date.now()) {
  return { version: 1, plantedAt: now, wateredAt: null, stage: 'seed', round: 0, given: [], message: 'Five more minutes… or sixty.', sound: false };
}

export function wake(plant, now) {
  if (plant.stage === 'seed' && plant.wateredAt !== null && now >= plant.plantedAt + HOUR) {
    return { ...plant, stage: 'sprout', given: [], round: 0, message: 'Ohayō! Look who finally leafed out.' };
  }
  return plant;
}

export function restore(text, now = Date.now()) {
  try {
    const p = JSON.parse(text);
    if (p && p.version === 1 && STAGES.includes(p.stage) && Number.isFinite(p.plantedAt)
      && (p.wateredAt === null || Number.isFinite(p.wateredAt)) && [0,1].includes(p.round)
      && Array.isArray(p.given) && p.given.every(a => ACTIONS.includes(a)) && new Set(p.given).size === p.given.length
      && typeof p.message === 'string' && typeof p.sound === 'boolean') return wake(p, now);
  } catch { /* Use a fresh seed when a save cannot be read. */ }
  return newPlant(now);
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
  if (p.given.includes(action)) return { ...p, message: 'Had that already. Try another little kindness?' };
  const given = [...p.given, action];
  if (given.length < ACTIONS.length) return { ...p, given, message: happy[action][(given.length + p.round) % 2] };
  if (p.stage === 'sprout') return { ...p, stage: 'young', round: 0, given: [], message: 'New leaf, new me. Notice my cheekbones?' };
  if (p.stage === 'young' && p.round === 1) return { ...p, stage: 'grown', round: 0, given: [], message: 'Ta-da! These leaf windows are designer.' };
  return { ...p, round: p.stage === 'young' ? 1 : 0, given: [], message: p.stage === 'young' ? 'Another round of care and I’ll be all grown up.' : 'Thriving. Obviously. Thank you, gardener.' };
}

export function countdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map(n => String(n).padStart(2, '0')).join(':');
}
