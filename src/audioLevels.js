// Older saves used the ambience switch to mute music as well.
function validLevel(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

export function audioLevels(plant) {
  if (plant == null) return {musicVolume:.4, fxVolume:.4};
  const effectsOn = plant?.sound !== false;
  const legacyMusicOn = effectsOn && plant?.ambience !== false;
  return {
    musicVolume: validLevel(plant?.musicVolume) ? plant.musicVolume : Number(legacyMusicOn),
    fxVolume: validLevel(plant?.fxVolume) ? plant.fxVolume : Number(effectsOn),
  };
}

// Apply a single slider to the latest transaction so another tab’s changes
// to the other channels survive. Keep the master sound flag compatible with existing saves.
export function setAudioLevel(plant, key, value) {
  const levels = audioLevels(plant);
  if (!Object.hasOwn(levels, key) || !validLevel(value) || levels[key] === value) return plant;
  levels[key] = value;
  return {...plant, ...levels, sound: levels.musicVolume > 0 || levels.fxVolume > 0};
}
