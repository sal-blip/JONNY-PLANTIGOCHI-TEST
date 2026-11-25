import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlant,care,wake,HOUR} from '../src/game.js';
import {checkIn,claimDaily,localDay,openDailyVisit,settleDailySpin} from '../src/gardenEconomy.js';
import {advanceGardenTour,startDewLesson,checkpointDewLesson,claimDewGift} from '../src/firstVisit.js';
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

test('the optional Vine Trail run keeps going after its reward and returns to the gift once',()=>{
  const time=new Date().setHours(12,0,0,0);
  const invited=startDewLesson(sprout(time),'vine');
  let vine=stepGame(null,{type:'enter',name:'vine',lesson:invited.dewLesson});
  vine=stepGame(vine,{type:'key',key:'heart',at:time});
  assert.equal(vine.lesson,true);
  for(let i=0;i<5;i++){
    vine=stepGame({...vine,sun:vine.body[0]+1},{type:'tick',sunRoll:.5,at:time+i+1});
    assert.equal(vine.phase,'trail');
  }
  const pay=p=>savePlayedRound(p,'vine','milestone',undefined,'fifth-sun',time,time+5,true);
  const paid=pay(invited);
  assert.equal(paid.dewLesson.status,'round');
  assert.equal(paid.gardenLife.balance,invited.gardenLife.balance+3);
  assert.equal(pay(paid).gardenLife.balance,paid.gardenLife.balance);
  while(vine.phase==='trail')vine=stepGame(vine,{type:'tick',sunRoll:0,at:time+20});
  assert.equal(vine.phase,'lost');
  assert.equal(stepGame(vine,{type:'key',key:'heart',at:time+21}),vine);
  const done=savePlayedRound(paid,'vine','lost',undefined,'collision',time,time+20,true);
  assert.equal(done.dewLesson.game,'vine');
  assert.equal(done.dewLesson.status,'lost');
  assert.equal(claimDewGift(claimDewGift(done)).gardenLife.balance,paid.gardenLife.balance+20);
});

test('first rewards require a saved spin and check-in on the same day, even across midnight',()=>{
  const time=new Date(2026,5,15,12).getTime(), tomorrow=time+24*HOUR;
  const seed=claimDewGift(startDewLesson(sprout(time),false));
  assert.equal(seed.gardenTour,'garden');
  assert.equal(advanceGardenTour(seed,'studio',time),seed);
  let p=seed;
  for(const step of ['garden','studio','living'])p=advanceGardenTour(p,step,time);
  assert.equal(p.gardenTour,'rewards');
  assert.equal(advanceGardenTour(p,'rewards',time),p);
  const spun=settleDailySpin(p,time,localDay(time),{id:'coins10',coins:10});
  assert.equal(advanceGardenTour(spun,'rewards',tomorrow),spun);
  const next=openDailyVisit(spun,tomorrow);
  const nextSpin=settleDailySpin(next,tomorrow,localDay(tomorrow),{id:'coins10',coins:10});
  assert.equal(advanceGardenTour(nextSpin,'rewards',tomorrow),nextSpin);
  const claimed=claimDaily(nextSpin,tomorrow,localDay(tomorrow));
  const done=advanceGardenTour(claimed,'rewards',tomorrow);
  assert.equal(done.gardenTour,undefined);
  assert.equal(done.gardenLife,claimed.gardenLife);
  assert.equal(advanceGardenTour(done,'rewards',tomorrow),done);
});
