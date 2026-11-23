import test from 'node:test';
import assert from 'node:assert/strict';
import { startGardenBed } from '../src/gardenVoices.js';

function testContext() {
  const sources = [];
  const context = {
    currentTime: 0,
    createBuffer(channels, frames) {
      const data = Array.from({length: channels}, () => new Float32Array(frames));
      return {channels, getChannelData: channel => data[channel]};
    },
    createGain() {
      return {gain: {setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}}, connect() {}, disconnect() {}};
    },
    createBufferSource() {
      const source = {connect() {}, start() {}, stop() { this.onended(); }, disconnect() {}};
      sources.push(source);
      return source;
    },
  };
  return {context, sources};
}

test('the recorded soundtrack keeps seed breathing without playing the synthesized melody', () => {
  const {context, sources} = testContext();
  assert.equal(startGardenBed(context, {}, false, 1, false), undefined);
  assert.equal(sources.length, 0);

  const stop = startGardenBed(context, {}, true, 1, false);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].buffer.channels, 1); // Breathing is mono; the melodic bed is stereo.
  assert.equal(sources[0].loop, true);
  stop();
});

test('the garden has a quiet stereo breeze for a sprouted plant and can layer it with seed breathing', () => {
  const {context, sources} = testContext();
  const leaveRoom = startGardenBed(context, {}, false, 1, false, true);
  const breeze = sources[0].buffer;
  assert.equal(breeze.channels, 2);
  assert.equal(sources[0].loop, true);
  const energy = breeze.getChannelData(0).reduce((sum, value) => sum + value * value, 0);
  const rms = Math.sqrt(energy / breeze.getChannelData(0).length);
  assert.ok(rms > .005 && rms < .04);
  leaveRoom();
  const leaveWithSeed = startGardenBed(context, {}, true, 1, false, true);
  assert.equal(sources.length, 3);
  assert.equal(sources[1].buffer.channels, 1);
  assert.equal(sources[2].buffer, breeze);
  leaveWithSeed();
});
