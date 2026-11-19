import assert from 'node:assert/strict';
import test from 'node:test';
import {HOUR as H,DAY,ROOT_TIME,care,condition,criticalReminder,deathDeadline,newPlant,readPlant,replant,takeCutting,wake} from '../src/game.js';
import {stepGame,canPlay} from '../src/pocketPlay.js';

const sprout=()=>wake(care(newPlant(0),'water',0),H);
test('first sight starts the clock; thirst, rescue and death use real deadlines',()=>{
  const seed=care(newPlant(0),'water',0);
  assert.equal(wake(seed,20*DAY,false).stage,'seed');
  assert.equal(wake(seed,20*DAY).lastDrink,20*DAY);
  const p=sprout();
  for(const [age,label] of [[4*H-1,'healthy'],[4*H,'dry'],[12*H-1,'dry'],[12*H,'critical']])
    assert.equal(condition(p,H+age),label);
  const lastSip=care({...p,given:['water']},'water',H+DAY-1);
  assert.equal(lastSip.lastDrink,H+DAY-1);assert.deepEqual(lastSip.given,['water']);
  assert.equal(criticalReminder(lastSip),lastSip.lastDrink+12*H);
  const dead=care(p,'water',H+DAY);
  assert.equal(dead.deadAt,H+DAY);assert.equal(dead.book[0].cause,'Thirst');
  assert.deepEqual(readPlant(JSON.stringify(p),10*DAY),dead);
  assert.deepEqual(readPlant(JSON.stringify(dead),11*DAY),dead);
});
test('overwatering requires confirmation and separated pours; drain has a strict deadline',()=>{
  const p=sprout();
  assert.equal(care(p,'water',H+1).extraPour,null);
  const wet=care(p,'water',H+1,true);
  assert.equal(condition(wet,H+2),'soggy');
  assert.equal(care(wet,'water',2*H,true).rotAt,null);
  const justDry=care(wet,'water',5*H,true);assert.equal(justDry.rotAt,null);assert.equal(justDry.lastDrink,5*H);
  const rot=care(wet,'water',2*H+1,true),end=deathDeadline(rot);
  assert.equal(condition(rot,2*H+1),'rootRot');assert.equal(criticalReminder(rot),8*H+1);
  const rescued=care(rot,'drain',end-1);assert.equal(condition(rescued,end),'healthy');
  assert.equal(rescued.lastDrink,end-1);assert.equal(rescued.rotAt,null);
  assert.equal(care(rot,'drain',end).book[0].cause,'Root rot');
});
test('a jar keeps rooting after death; a pot or fresh seed preserves the book and preferences',()=>{
  const p={...sprout(),stage:'grown',sound:false,scene:'clouds',ambience:false};
  const cutAt=H+DAY-1,cut=takeCutting(p,'left',cutAt);
  assert.equal(takeCutting(cut,'right',cutAt+1).jar.stem,'left');
  const dead=wake(cut,H+DAY);assert.equal(dead.book.length,1);
  assert.equal(replant(dead,'cutting',cutAt+ROOT_TIME-1),dead);
  const child=replant(dead,'cutting',cutAt+ROOT_TIME);
  assert.equal(child.generation,2);assert.equal(child.stage,'sprout');assert.equal(child.jar,null);
  assert.equal(child.lastDrink,cutAt+ROOT_TIME);assert.equal(child.scene,'clouds');assert.equal(child.sound,false);
  assert.deepEqual(readPlant(JSON.stringify(child),child.lastDrink),child);
  const replacement=replant(dead,'seed',cutAt+ROOT_TIME);assert.deepEqual(replacement.jar,cut.jar);assert.equal(replacement.stage,'seed');
  assert.equal(readPlant(JSON.stringify({...dead,book:[...dead.book,...dead.book]})),null);
});
test('Dew Catch and Leaf Echo handle misses, wins, replays and stage locks',()=>{
  const plant=sprout();assert.ok(canPlay('dew',plant));assert.ok(!canPlay('echo',plant));
  const enter=name=>stepGame(null,{type:'enter',name});
  const key=(g,key)=>stepGame(g,{type:'key',key,dropLane:0,sequence:['left','heart','right']});
  const tick=g=>stepGame(g,{type:'tick',dropLane:0});
  let dew=key(enter('dew'),'heart');
  const fall=()=>{while(dew.phase==='fall') dew=tick(dew);};
  fall();assert.equal(dew.result,'miss');dew=tick(dew);dew=key(dew,'left');
  for(let i=0;i<3;i++){fall();if(i<2) dew=tick(dew);}
  assert.equal(dew.phase,'won');assert.equal(key(dew,'heart').count,0);
  let echo=key(enter('echo'),'heart');
  const watch=()=>{while(echo.phase==='watch') echo=tick(echo);};watch();
  echo=key(echo,'right');assert.equal(echo.phase,'retry');echo=tick(echo);watch();
  for(const k of ['left','heart','right']) echo=key(echo,k);
  assert.equal(echo.phase,'won');assert.equal(stepGame(echo,{type:'exit'}),null);
});
