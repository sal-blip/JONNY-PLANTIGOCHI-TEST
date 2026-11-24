import test from 'node:test';
import assert from 'node:assert/strict';
import {placesFor,slotFor,surfaceScale} from '../src/gardenLayout.js';
import {decorPlaces} from '../src/roomShopArt.js';

test('pots, plants and decorations inherit the depth of their furniture across suites',()=>{
  for(const view of [0,1,2,3]){
    const spots=placesFor(view);
    const decor=decorPlaces(view);
    for(const spot of spots){
      if(spot.layer==='shelf')assert.equal(spot.size,decor[0].size);
      if(spot.layer==='window')assert.equal(spot.size,decor[1].size);
      if(spot.layer==='table')assert.equal(spot.size,view%2?surfaceScale.desk:surfaceScale.coffeeTable);
    }
    assert.ok(decor[1].size<decor[2].size);
  }
});

test('moving forward on the projected floor increases scale in wide and tall rooms',()=>{
  for(const view of [0,1]){
    for(const extra of [0,20,213,475]){
      const projected=placesFor(view,extra);
      assert.deepEqual(projected.map(p=>slotFor(view,p)),placesFor(view).map(p=>slotFor(view,p)));
      const floor=projected.filter(p=>p.layer==='floor').sort((a,b)=>a.baseY-b.baseY);
      for(let i=1;i<floor.length;i++){
        assert.ok(floor[i].size>=floor[i-1].size);
        if(floor[i].baseY>floor[i-1].baseY)assert.ok(floor[i].size>floor[i-1].size);
      }
    }
  }
});
