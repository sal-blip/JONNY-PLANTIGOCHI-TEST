import assert from 'node:assert/strict';
import test from 'node:test';
import {newPlant,readPlant} from '../src/game.js';
import {scenes,selectedScene} from '../src/gardenScenes.js';

const restore = plant => readPlant(JSON.stringify(plant),1000);

test('new seeds and saves with the implicit denim default open My garden',()=>{
  const seed=newPlant(1000);
  assert.equal(scenes.garden,'My garden');
  assert.equal(selectedScene(seed),'garden');
  const legacy={...seed};
  delete legacy.scene;
  const restored=restore(legacy);
  assert.equal(selectedScene(restored),'garden');
  assert.equal(Object.hasOwn(restored,'scene'),false);
  assert.equal(selectedScene(restore({...restored,scene:'denim'})),'denim');
});

test('explicit garden, photographic scenes, previous IDs and custom crops survive a backup round-trip',()=>{
  const seed=newPlant(1000);
  const photo={src:'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAABf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8ADf/Z',width:1,height:1,x:35,y:70};
  for(const [saved,shown] of [
    ...['garden','denim','raked','stillwater','clouds','shoji','pebbles','photo'].map(id=>[id,id]),
    ['pocket','denim'],['sand','raked'],['water','stillwater'],['sky','clouds'],['forest','shoji'],
  ]){
    const result=restore({...seed,scene:saved,photo});
    assert.equal(result.scene,saved);
    assert.equal(selectedScene(result),shown);
    assert.deepEqual(result.photo,photo);
    if(shown!=='photo')assert.ok(Object.hasOwn(scenes,shown));
  }
  assert.equal(selectedScene(restore({...seed,scene:'photo'})),'garden');
});
