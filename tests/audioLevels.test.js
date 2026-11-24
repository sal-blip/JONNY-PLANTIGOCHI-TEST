import assert from 'node:assert/strict';
import test from 'node:test';
import {audioLevels, setAudioLevel} from '../src/audioLevels.js';
import {care, graduate, HOUR, newPlant, readPlant, replant} from '../src/game.js';

const defaults = {musicVolume:1, fxVolume:1};

test('old sound and ambience switches migrate per channel, with valid saved levels taking precedence', () => {
  // First-version exports had a Sound switch and no volume fields.
  const legacy = {version:1, plantedAt:0, wateredAt:null, stage:'seed', round:0, given:[], message:'Sleeping', sound:true};
  for (const [prefs, expected] of [
    [{}, defaults],
    [{ambience:false}, {musicVolume:0, fxVolume:1}],
    [{sound:false}, {musicVolume:0, fxVolume:0}],
    [{sound:false, fxVolume:.4, ambienceVolume:1.3}, {musicVolume:0, fxVolume:.4}],
    [{ambience:false, ambienceVolume:1, musicVolume:.61, fxVolume:.12}, {musicVolume:.61, fxVolume:.12}],
    [{musicVolume:null, fxVolume:'0'}, {musicVolume:1, fxVolume:1}],
  ]) {
    const restored = readPlant(JSON.stringify({...legacy, ...prefs}), 0);
    assert.ok(!Object.hasOwn(restored, 'ambienceVolume') && !Object.hasOwn(restored, 'ambience'));
    for (const [key, value] of Object.entries(expected)) assert.equal(restored[key], value, key);
    assert.deepEqual(audioLevels({...legacy, ...prefs}), expected);
  }
  const firstVisit = {musicVolume:.4, fxVolume:.4};
  assert.deepEqual(audioLevels(null), firstVisit);
  assert.deepEqual(audioLevels(newPlant()), firstVisit);
});

test('the two sliders update the master sound flag and ignore retired channels', () => {
  let p = newPlant(0);
  for (const invalid of [-.01, 1.1, NaN, Infinity, null, '0']) {
    assert.equal(setAudioLevel(p, 'musicVolume', invalid), p);
  }
  assert.equal(setAudioLevel(p, '__proto__', 0), p);
  p = setAudioLevel(p, 'musicVolume', 0);
  assert.equal(setAudioLevel(p, 'ambienceVolume', 1), p);
  assert.equal(p.sound,true);
  p = setAudioLevel(p, 'fxVolume', 0);
  assert.equal(p.sound,false);
  p = setAudioLevel(p, 'musicVolume', .62);
  assert.equal(p.sound,true);
  assert.deepEqual(audioLevels(p), {musicVolume:.62, fxVolume:0});
  assert.equal(setAudioLevel(p, 'musicVolume', .62), p);
});

test('replacement seeds inherit mixer settings after a death or a graduation', () => {
  const levels = {musicVolume:.2, fxVolume:0};
  const living = {...care(newPlant(0), 'water', HOUR), stage:'grown', ...levels};
  const child = graduate(living, living.id, 0, HOUR);
  const afterDeath = replant({...living, deadAt:HOUR}, 'seed', HOUR);
  for (const p of [child, afterDeath]) {
    assert.notEqual(p.id, living.id);
    assert.equal(p.stage, 'seed');
    assert.deepEqual(audioLevels(readPlant(JSON.stringify(p), HOUR)), levels);
  }
});
