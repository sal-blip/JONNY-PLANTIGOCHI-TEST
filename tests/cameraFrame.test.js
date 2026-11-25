import assert from 'node:assert/strict';
import test from 'node:test';
import {cameraFrame,cameraRegion,zoomAt,wholeRoom,viewfinderShape,pinchZoom,finderSpan} from '../src/cameraFrame.js';
test('garden camera keeps the selected subject anchored during zoom and clamps the export to the room',()=>{
  const f=zoomAt(wholeRoom,2,.75,.25);
  assert.deepEqual(cameraRegion(f,400,320),{x:150,y:40,w:200,h:160});
  assert.deepEqual(cameraRegion(cameraFrame(-1,2,9),400,320),{x:0,y:240,w:100,h:80});
  assert.deepEqual(zoomAt(f,1),wholeRoom);
});

test('portrait and landscape finders open full wide and reach the previous maximum crop',()=>{
  for(const aspect of [.5,2]){
    const shape=viewfinderShape(aspect,1.25);
    const height=Math.max(320,400/aspect);
    const wide=cameraRegion(wholeRoom,400,height,shape);
    assert.equal(wide.w,400);
    assert.equal(wide.h,400/aspect);
    assert.equal(wide.y,(height-wide.h)/2);
    const max=zoomAt(wholeRoom,4,.5,.5,shape);
    const crop=cameraRegion(max,400,height,shape);
    assert.equal(crop.w,400*shape.w/4);
    assert.equal(crop.h,320*Math.min(1,1.25/aspect)/4);
    assert.deepEqual(zoomAt(max,1,.5,.5,shape),wholeRoom);
    const middle=pinchZoom(1,2,shape);
    assert.ok(Math.abs(finderSpan(1,shape).w/finderSpan(middle,shape).w-2)<1e-9);
  }
});
