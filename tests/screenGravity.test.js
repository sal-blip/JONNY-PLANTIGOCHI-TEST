import assert from 'node:assert/strict';
import test from 'node:test';
import {screenGravity} from '../src/useGardenTilt.js';

test('project real gravity into portrait and rotated screen coordinates',()=>{
  const near=(value,wanted)=>assert.ok(Math.abs(value-wanted)<1e-6);
  for(const [pitch,roll,orientation,x,y] of [[90,0,0,0,1],[-90,0,0,0,-1],[0,0,0,0,0],
      [0,-90,90,0,1],[0,90,270,0,1],[-90,0,180,0,1],[0,30,0,.5,0]]){
    const result=screenGravity(pitch,roll,orientation);
    near(result.x,x);near(result.y,y);
  }
});
