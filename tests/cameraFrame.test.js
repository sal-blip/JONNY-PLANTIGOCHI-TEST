import assert from 'node:assert/strict';
import test from 'node:test';
import {cameraFrame,cameraRegion,zoomAt,wholeRoom} from '../src/cameraFrame.js';
test('garden camera keeps the selected subject anchored during zoom and clamps the export to the room',()=>{
  const f=zoomAt(wholeRoom,2,.75,.25);
  assert.deepEqual(cameraRegion(f,400,320),{x:150,y:40,w:200,h:160});
  assert.deepEqual(cameraRegion(cameraFrame(-1,2,9),400,320),{x:0,y:240,w:100,h:80});
  assert.deepEqual(zoomAt(f,1),wholeRoom);
});
