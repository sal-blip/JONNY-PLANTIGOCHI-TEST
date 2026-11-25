import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlant} from '../src/game.js';
import {canPlay,stepGame} from '../src/pocketPlay.js';
import {shuffleLeaves} from '../src/leafPairs.js';

const enter=name=>stepGame(null,{type:'enter',name});
const key=(g,key,deck)=>stepGame(g,{type:'key',key,at:12,deck});
const tick=g=>stepGame(g,{type:'tick',at:25,sunRoll:0.5});

test('all three games open on a living, unwatered seed',()=>{
  const seed=newPlant(0);
  for(const name of ['vine','dew','pairs']){
    assert.ok(canPlay(name,seed));
    assert.equal(canPlay(name,{...seed,deadAt:1}),false);
  }
  assert.equal(canPlay('echo',seed),false);
});

test('vine grows toward five suns, turns once per step and waits for replay after a collision',()=>{
  let g=key(enter('vine'),'heart');
  g=tick(tick(tick(g)));
  assert.equal(g.count,1);
  assert.equal(g.body.length,4);
  assert.ok(!g.body.includes(g.sun));
  g=tick(key(key(g,'right'),'left'));
  assert.equal(g.direction,1);
  assert.deepEqual(g.body.slice(0,2),[54,42]);
  while(g.phase==='trail')g=tick(g);
  assert.equal(g.phase,'lost');
  assert.equal(tick(g),g);
  assert.equal(key(g,'heart').phase,'trail');
  const loop={...key(enter('vine'),'heart'),body:[29,30,42,41,40],direction:1,sun:1};
  assert.equal(tick(loop).phase,'lost');
  assert.equal(tick({...loop,body:[29,30,42,41]}).phase,'trail');
  g=tick({...loop,body:[29,28,27,26,25,24,12],sun:30,count:4,direction:0});
  assert.equal(g.phase,'won');
  assert.equal(g.count,5);
  assert.equal(g.body.length,8);
});

test('six seed packets have three pairs and mismatches close without credit',()=>{
  assert.deepEqual(shuffleLeaves().sort(),[0,0,1,1,2,2]);
  let g=key(enter('pairs'),'heart',[0,1,2,0,1,2]);
  g=key(key(g,'left'),'heart');
  assert.deepEqual(g.open,[5]);
  assert.equal(key(g,'heart'),g);
  g=key(key(g,'right'),'heart');
  assert.equal(g.phase,'peek');
  assert.equal(key(g,'right'),g);
  g=tick(g);
  assert.deepEqual([g.open,g.matched],[[],[]]);
});
