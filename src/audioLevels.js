// A level is a multiplier on the channel’s existing mix. Legacy ambience
// controlled both the garden soundtrack and the sleeping seed’s breathing.
function validLevel(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function audioLevels(plant) {
  const effectsOn = plant?.sound !== false;
  const ambienceOn = effectsOn && plant?.ambience !== false;
  return {
    musicVolume: validLevel(plant?.musicVolume) ? plant.musicVolume : Number(ambienceOn),
    fxVolume: validLevel(plant?.fxVolume) ? plant.fxVolume : Number(effectsOn),
    ambienceVolume: validLevel(plant?.ambienceVolume) ? plant.ambienceVolume : Number(ambienceOn),
  };
}

// Apply a single slider to the latest transaction so another tab’s changes
// to the other channels survive. Keep older clients’ on/off switches usable.
export function setAudioLevel(plant, key, value) {
  const levels = audioLevels(plant);
  if (!Object.hasOwn(levels, key) || !validLevel(value) || levels[key] === value) return plant;
  levels[key] = value;
  const ambience = levels.musicVolume > 0 || levels.ambienceVolume > 0;
  return {...plant, ...levels, sound: ambience || levels.fxVolume > 0, ambience};
}
