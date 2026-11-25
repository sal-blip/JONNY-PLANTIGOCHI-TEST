import test from 'node:test';
import assert from 'node:assert/strict';
import {VINE_COLS,VINE_ROWS} from '../src/vineTrail.js';
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

test('vine grows past five suns, turns once per step and waits for replay after a collision',()=>{
  let g=key(enter('vine'),'heart');
  g=tick(tick(tick(g)));
  assert.equal(g.count,1);
  assert.equal(g.body.length,4);
  assert.ok(!g.body.includes(g.sun));
  const tip=g.body[0];
  g=tick(key(key(g,'right'),'left'));
  assert.equal(g.direction,1);
  assert.deepEqual(g.body.slice(0,2),[tip+VINE_COLS,tip]);
  while(g.phase==='trail')g=tick(g);
  assert.equal(g.phase,'lost');
  assert.equal(tick(g),g);
  assert.equal(key(g,'heart').phase,'trail');
  const loop={...key(enter('vine'),'heart'),body:[29,30,30+VINE_COLS,29+VINE_COLS,28+VINE_COLS],direction:1,sun:1};
  assert.equal(tick(loop).phase,'lost');
  assert.equal(tick({...loop,body:loop.body.slice(0,-1)}).phase,'trail');
  g=tick({...loop,body:[29,28,27,26,25,24,12],sun:30,count:4,direction:0});
  assert.equal(g.phase,'trail');
  assert.equal(g.reward.phase,'won');
  assert.equal(g.count,5);
  assert.equal(g.body.length,8);
  const more=tick({...g,sun:g.body[0]+1});
  assert.equal(more.count,6);
  assert.equal(more.reward,g.reward);
});

test('collecting the last available sun fills the board and ends the run',()=>{
  const capacity=VINE_ROWS*VINE_COLS;
  const body=Array.from({length:capacity},(_,i)=>{
    const row=Math.floor(i/VINE_COLS),col=i%VINE_COLS;
    return row*VINE_COLS+(row%2?VINE_COLS-1-col:col);
  }).slice(1);
  const g=tick({...key(enter('vine'),'heart'),body,direction:2,sun:0,count:capacity-4});
  assert.equal(g.phase,'won');
  assert.equal(g.sun,null);
  assert.equal(new Set(g.body).size,capacity);
});

test('eighteen seed packets have nine pairs and mismatches close without credit',()=>{
  const faces=Array.from({length:9},(_,i)=>i);
  assert.deepEqual(shuffleLeaves().sort(),faces.flatMap(i=>[i,i]));
  let g=key(enter('pairs'),'heart',[...faces,...faces]);
  g=key(key(g,'left'),'heart');
  assert.deepEqual(g.open,[17]);
  assert.equal(key(g,'heart'),g);
  g=key(key(g,'right'),'heart');
  assert.equal(g.phase,'peek');
  assert.equal(key(g,'right'),g);
  g=tick(g);
  assert.deepEqual([g.open,g.matched],[[],[]]);
});

test('the fifth mismatched pair ends the round and Heart deals a fresh board',()=>{
  const deck=Array.from({length:18},(_,i)=>Math.floor(i/2));
  let game=key(enter('pairs'),'heart',deck);
  const flipAt=index=>{
    while(game.cursor!==index)game=key(game,'right');
    game=key(game,'heart');
  };
  flipAt(0);
  flipAt(0);
  flipAt(1);
  flipAt(1);
  assert.equal(game.misses,0);
  assert.deepEqual(game.matched,[0,1]);
  for(let miss=1;miss<=5;miss++){
    flipAt(2);
    flipAt(4);
    assert.equal(game.misses,miss);
    assert.equal(game.phase,miss===5?'lost':'peek');
    game=tick(game);
  }
  assert.equal(game.finishedAt,12);
  assert.equal(key(game,'right'),game);
  assert.deepEqual(game.open,[2,4]);
  const fresh=[...deck].reverse();
  game=key(game,'heart',fresh);
  assert.equal(game.phase,'pick');
  assert.equal(game.misses,0);
  assert.equal(game.cursor,0);
  assert.deepEqual(game.matched,[]);
  assert.deepEqual(game.open,[]);
  assert.equal(game.deck,fresh);
});
