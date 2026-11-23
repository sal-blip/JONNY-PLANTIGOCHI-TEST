import test from 'node:test';
import assert from 'node:assert/strict';
import { audioRange } from '../src/mediaRange.js';

const track = new Blob(['abcdef']);
const headers = {'Content-Type':'audio/mpeg'};

test('media supports a two-byte playback probe, seeks and suffixes', async () => {
  for (const [range, body, position] of [
    ['bytes=0-1','ab','0-1'], ['bytes=3-','def','3-5'],
    ['bytes=-2','ef','4-5'], ['bytes=4-999','ef','4-5'], ['bytes=-999','abcdef','0-5'],
  ]) {
    const response = audioRange(track, range, headers);
    assert.equal(response.status,206);
    assert.equal(response.headers.get('Content-Type'),'audio/mpeg');
    assert.equal(response.headers.get('Accept-Ranges'),'bytes');
    assert.equal(response.headers.get('Content-Range'),'bytes ' + position + '/6');
    assert.equal(response.headers.get('Content-Length'),String(body.length));
    assert.equal(await response.text(),body);
  }
});

test('unsatisfiable audio ranges carry the correct size and no bytes', async () => {
  for (const range of ['bytes=6-','bytes=-0','bytes=3-2']) {
    const response = audioRange(track,range,headers);
    assert.equal(response.status,416);
    assert.equal(response.headers.get('Content-Range'),'bytes */6');
    assert.equal(response.headers.get('Content-Length'),'0');
    assert.equal(await response.text(),'');
  }
});

test('unknown or multiple ranges fall back to the complete audio file', async () => {
  for (const range of ['unknown=0-1','bytes=-','bytes=1-2,4-5']) {
    const response = audioRange(track,range,headers);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('Content-Length'),'6');
    assert.equal(await response.text(),'abcdef');
  }
});
