import assert from 'node:assert/strict';
import test from 'node:test';
import {HOUR as H,DAY,ROOT_TIME,care,careStatus,condition,criticalReminder,deathDeadline,newPlant,readPlant,replant,takeCutting,wake} from '../src/game.js';
import {foodReadout,waterReadout} from '../src/plantReadout.js';
import {stepGame,canPlay,dewRules,dewCheckpoint,saveDewCheckpoint,LEVELS} from '../src/pocketPlay.js';

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
  for(let i=0;i<40;i++) dew=tick(dew);
  assert.equal(dew.result,'miss');dew=key(dew,'left');
  for(let i=0;i<400 && dew.phase==='fall';i++) dew=tick(dew);
  assert.equal(dew.phase,'won');assert.equal(key(dew,'heart').level,2);
  let echo=key(enter('echo'),'heart');
  const watch=()=>{while(echo.phase==='watch') echo=tick(echo);};watch();
  echo=key(echo,'right');assert.equal(echo.phase,'retry');echo=tick(echo);watch();
  for(const k of ['left','heart','right']) echo=key(echo,k);
  assert.equal(echo.phase,'won');assert.equal(stepGame(echo,{type:'exit'}),null);
});

test('twenty Dew Catch levels increase goal, speed and drop density and finish at 20',()=>{
  let game=stepGame(null,{type:'enter',name:'dew',cleared:0}),overlap=0;
  for(let level=1;level<=LEVELS;level++){
    game=stepGame(game,{type:'key',key:'heart',dropLane:1});
    assert.equal(game.level,level);
    const rules=dewRules(level);
    if(level>1){
      const prev=dewRules(level-1);
      assert.ok(rules.goal>prev.goal && rules.fallMs<prev.fallMs && rules.spacingMs<prev.spacingMs);
    }
    for(let tick=0;game.phase==='fall'&&tick<3000;tick++){
      game=stepGame(game,{type:'tick',dropLane:1});
      overlap=Math.max(overlap,game.drops.length);
    }
    assert.equal(game.phase,'won');assert.equal(game.count,rules.goal);
  }
  assert.ok(overlap>=3);
  game=stepGame(game,{type:'key',key:'heart',dropLane:1});
  assert.equal(game.phase,'ready');assert.equal(game.level,20);
  for(let i=0;i<25;i++) game=stepGame(game,{type:'key',key:'left'});
  assert.equal(game.level,1);
  const resumed=stepGame(null,{type:'enter',name:'dew',cleared:9});
  assert.equal(resumed.level,10);assert.equal(stepGame(resumed,{type:'key',key:'right'}).level,10);
});
test('Dew Catch checkpoints migrate, round-trip and carry into a new generation',()=>{
  const first=newPlant(0);delete first.dewCleared;
  assert.equal(readPlant(JSON.stringify(first),H).dewCleared,0);
  const sprouted={...sprout(),dewCleared:12};
  assert.equal(readPlant(JSON.stringify(sprouted),2*H).dewCleared,12);
  assert.equal(replant(wake(sprouted,H+DAY),'seed',H+DAY).dewCleared,12);
});

test('completed and unavailable care are true no-ops, while dry soil can always receive water',()=>{
  const seed=care(newPlant(0),'water',0);
  assert.equal(care(seed,'water',1),seed);
  assert.equal(care(seed,'food',1),seed);
  const p=sprout(), fed=care(p,'food',H);
  assert.equal(care(fed,'food',H),fed);
  assert.equal(care(p,'water',H),p);
  const soggy=care(p,'water',H,true);
  assert.equal(care(soggy,'water',H+1,true),soggy);
  const drained=care(soggy,'drain',H+1);
  assert.equal(care(drained,'drain',H+2),drained);
  const complete={...p,given:['water','sun','talk','food']};
  assert.equal(care(complete,'water',5*H).lastDrink,5*H);
  const grown=care({...p,stage:'grown',given:['water','sun','talk']},'food',H);
  assert.equal(care(grown,'food',H+1),grown);
  assert.deepEqual(readPlant(JSON.stringify(grown),H+1),grown);
  assert.equal(care(grown,'food',5*H),grown);
  const eligible={...grown,lastDrink:39*H};
  assert.equal(care(eligible,'food',41*H).fedAt,41*H);
});

test('three cumulative misses across levels automatically start a fresh level-one run',()=>{
  const key=(g,key)=>stepGame(g,{type:'key',key,dropLane:0});
  const tick=g=>stepGame(g,{type:'tick',dropLane:0});
  let dew=key(stepGame(null,{type:'enter',name:'dew',cleared:4}),'heart');
  const land=(g,lane)=>tick({...g,drops:[{id:25,lane,progress:.999}]});
  dew=land(dew,0);dew=land(dew,1);dew=land(dew,2);
  assert.equal(dew.chances,1);
  while (dew.phase==='fall') dew=land(dew,1);
  assert.equal(dew.phase,'won');
  dew=key(dew,'heart');assert.equal(dew.level,6);assert.equal(dew.chances,1);
  dew=land(dew,1);dew=land(dew,0);
  assert.equal(dew.phase,'lost');assert.equal(dew.count,1);
  assert.equal(dew.chances,0);assert.deepEqual(dew.drops,[]);
  assert.equal(key(dew,'left'),dew);
  dew=tick(dew);
  assert.equal(dew.phase,'fall');assert.equal(dew.level,1);assert.equal(dew.unlocked,1);
  assert.equal(dew.elapsed,0);assert.equal(dew.lane,1);assert.equal(dew.drops.length,1);
  assert.equal(dew.count,0);assert.equal(dew.chances,3);
  assert.equal(stepGame(dew,{type:'exit'}),null);
});

test('losing resets the saved run and keeps the best level through reload and replanting',()=>{
  const legacy={...sprout(),dewCleared:8};
  assert.equal(dewCheckpoint(legacy),8);
  const reset=saveDewCheckpoint(legacy,0);
  const restored=readPlant(JSON.stringify(reset),2*H);
  assert.equal(restored.dewCleared,8);
  assert.equal(stepGame(null,{type:'enter',name:'dew',cleared:dewCheckpoint(restored)}).unlocked,1);
  const cleared=saveDewCheckpoint(restored,1);
  assert.equal(dewCheckpoint(cleared),1);assert.equal(cleared.dewCleared,8);
  assert.equal(dewCheckpoint(replant(wake(cleared,H+DAY),'seed',H+DAY)),1);
});

test('the last half hour allows one safe top-up on healthy soil',()=>{
  const p=sprout(), opens=p.lastDrink+3.5*H;
  assert.equal(care(p,'water',opens-1),p);
  assert.equal(careStatus(p,'water',opens-1).confirm,true);
  assert.equal(waterReadout(p,p.lastDrink).detail,'Safe top-up in 3h 30m');
  assert.equal(waterReadout(p,opens-1).detail,'Safe top-up in 1m');
  for(const time of [opens,p.lastDrink+4*H-1]){
    assert.equal(careStatus(p,'water',time).topUp,true);
    assert.equal(waterReadout(p,time).label,'Top up');
    const watered=care(p,'water',time);
    assert.equal(watered.lastDrink,time);
    assert.equal(watered.extraPour,null);
    assert.equal(watered.rotAt,null);
    assert.equal(waterReadout(watered,time).fraction,1);
    assert.equal(care(watered,'water',time),watered);
    assert.equal(condition(watered,time+4*H),'dry');
  }
  const soaked=care(p,'water',opens-1,true);
  assert.equal(careStatus(soaked,'water',opens).locked,true);
  const wet=care(p,'water',p.lastDrink,true);
  assert.equal(careStatus(wet,'water',opens).confirm,true);
  assert.equal(care(wet,'water',opens),wet);
  const rotten=care(wet,'water',p.lastDrink+H,true);
  assert.equal(careStatus(rotten,'water',opens).locked,true);
});

test('food and light prompts follow the same early-care windows as their actions',()=>{
  const plant = sprout();
  for (const [action,clock,interval] of [['food','fedAt',2*DAY],['sun','litAt',DAY]]) {
    const due = plant[clock] + interval;
    const opens = due - 8*H;
    const watered = {...plant,lastDrink:opens-1};
    assert.equal(careStatus(watered,action,opens-1).hint,'Ready in 1m');
    assert.equal(care(watered,action,opens-1),watered);
    assert.equal(careStatus(watered,action,opens).hint,'Ready now · Due in 8h');
    const tended = care(watered,action,opens);
    assert.equal(tended[clock],opens);
    assert.equal(careStatus(tended,action,opens).locked,true);
    assert.equal(careStatus(watered,action,due-1).hint,'Ready now · Due in 1m');
    assert.equal(careStatus(watered,action,due).hint,action==='food'?'Feed now':'Give light now');
    if (action === 'food') {
      assert.equal(foodReadout(plant,plant.fedAt+60000).label,'Food 39h 59m');
      assert.equal(foodReadout(watered,opens-1).label,'Food 1m');
      assert.equal(foodReadout(watered,opens).label,'Food ready');
      assert.equal(foodReadout(watered,due).label,'Feed now');
    }
  }
});
