import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlant,care,wake,HOUR} from '../src/game.js';
import {checkIn} from '../src/gardenEconomy.js';
import {startDewLesson,checkpointDewLesson,claimDewGift} from '../src/firstVisit.js';
import {savePlayedRound,stepGame,LEVELS} from '../src/pocketPlay.js';

function sprout(time) {
  const seed=newPlant(time-HOUR);
  return wake(care(checkIn(seed,time-HOUR),'water',time-HOUR),time);
}

test('one-round Dew Catch resumes the catch count, remaining chances, and original reward day',()=>{
  const at=10000;
  const saved={status:'round',caught:1,chances:2,startedAt:at};
  const ready=stepGame(null,{type:'enter',name:'dew',lesson:saved,cleared:13});
  assert.equal(ready.level,1);
  const active=stepGame(ready,{type:'key',key:'heart',dropLane:1,at:at+8000});
  assert.deepEqual([active.count,active.chances,active.startedAt],[1,2,at]);
  for(const phase of ['won','lost']){
    const end={...active,phase};
    assert.equal(stepGame(end,{type:'key',key:'heart',at}),end);
    assert.equal(stepGame(end,{type:'tick',at}),end);
  }
  const regular=stepGame(null,{type:'enter',name:'dew',cleared:0});
  assert.equal(stepGame({...regular,phase:'won'},{type:'key',key:'heart',at}).level,2);
  assert.equal(stepGame({...regular,phase:'won',level:LEVELS},{type:'key',key:'heart',at}).phase,'ready');
  assert.equal(stepGame({...regular,phase:'lost'},{type:'tick',at}).phase,'fall');
});

test('practice pays through normal win limits and never erases an existing run on a practice loss',()=>{
  const t=new Date().setHours(12,0,0,0);
  const plant={...sprout(t),dewRunCleared:5};
  const session=startDewLesson(plant,true);
  const first=checkpointDewLesson(session,{count:2,chances:2,startedAt:t});
  assert.equal(checkpointDewLesson(first,{count:1,chances:3,startedAt:t}),first);
  for(const result of ['lost','won']){
    const p=savePlayedRound(first,'dew',result,1,'first-game',t,t,true);
    const earned=result==='won'?3:0;
    assert.deepEqual(p.dewLesson,{status:result,coins:earned});
    assert.equal(p.gardenLife.balance,first.gardenLife.balance+earned);
    assert.equal(p.dewRunCleared,5);
    assert.deepEqual(savePlayedRound(p,'dew',result,1,'duplicate',t,t,true),p);
    const claimed=claimDewGift(p);
    assert.equal(claimed.gardenLife.balance,p.gardenLife.balance+20);
    assert.equal(claimDewGift(claimed),claimed);
    assert.equal(savePlayedRound(p,'dew','lost',5,'normal',t,t).dewRunCleared,0);
  }
  const full={...first,gardenLife:{...first.gardenLife,wins:['1','2','3','4','5']}};
  const capped=savePlayedRound(full,'dew','won',1,'capped',t,t,true);
  assert.deepEqual(capped.dewLesson,{status:'won',coins:0});
  assert.equal(capped.gardenLife.balance,first.gardenLife.balance);
});
