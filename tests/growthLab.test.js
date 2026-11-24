import test from 'node:test';
import assert from 'node:assert/strict';
import {care,newPlant,graduate,chooseSeed,treatFungus,deathDeadline,HOUR} from '../src/game.js';
import {createGrowthLab,fillDebugPurse} from '../src/growthLab.js';
import {lifeOf,localDay} from '../src/gardenEconomy.js';

const start=new Date(2026,3,5,12).getTime();
const newLab=()=>createGrowthLab(newPlant(start),start);
const tend=(lab,action)=>lab.change(p=>care(p,action,lab.clock(),false,start));

test('lab advances at 180×, clamps to care and stays paused until resumed',()=>{
  const lab=newLab();
  lab.jump();assert.equal(lab.clock(),start);
  tend(lab,'water');lab.run();lab.tick(10000);assert.equal(lab.clock(),start+HOUR/2);
  lab.tick(1000000);assert.equal(lab.clock(),start+HOUR);
  assert.equal(lab.snapshot().plant.stage,'sprout');assert.equal(lab.snapshot().running,false);
  lab.run();lab.pause();lab.tick(20000);assert.equal(lab.clock(),start+HOUR);
  lab.jump();assert.equal(lab.stop().kind,'water');lab.jump();assert.equal(lab.clock(),start+5*HOUR);
  lab.run();assert.equal(lab.snapshot().running,false);
});

test('a copied seed grows through seven days of care and graduates without changing the source or earning virtual daily visits',()=>{
  const old=newPlant(start),before=structuredClone(old),lab=createGrowthLab(old,start);
  const seen=new Set();
  for(let i=0;i<150 && lab.snapshot().plant.stage!=='grown';i++){
    const event=lab.stop();assert.ok(event);
    if(event.at>lab.clock()){lab.jump();continue;}
    seen.add(event.kind);
    if(event.kind==='fungus')lab.change(p=>treatFungus(p,p.fungusAt,lab.clock()));
    else if(['first','water','food','sun'].includes(event.kind))tend(lab,event.kind==='first'?'water':event.kind);
    else assert.fail(event.kind);
  }
  const mature=lab.snapshot().plant;
  assert.equal(mature.stage,'grown');assert.ok(seen.has('fungus'));
  assert.equal(lifeOf(mature).day,localDay(start));assert.equal(lifeOf(mature).balance,6);assert.equal(lifeOf(mature).visit.claimed,false);
  lab.change(p=>graduate(p,p.id,0,lab.clock()));
  assert.equal(lab.stop(),null);
  lab.change(p=>chooseSeed(p,p.id,'prayer-plant',lab.clock()));
  assert.equal(lab.snapshot().plant.species,'prayer-plant');
  assert.equal(lab.snapshot().plant.graduates[0].id,old.id);assert.deepEqual(old,before);
});

test('neglect requires skipping warnings and the final rescue stop before death',()=>{
  const lab=newLab();tend(lab,'water');lab.jump();
  const deadline=deathDeadline(lab.snapshot().plant);
  for(let i=0;i<10 && lab.clock()<deadline-1;i++){
    lab.jump();
    if(lab.stop()?.kind!=='lastChance')lab.skip();
  }
  assert.equal(lab.clock(),deadline-1);lab.jump();
  assert.equal(lab.snapshot().plant.deadAt,null);
  lab.skip();lab.jump();assert.equal(lab.snapshot().plant.deadAt,deadline);
  assert.equal(lab.snapshot().plant.book.length,1);
});

test('1,000 coin debug command is exact and scoped to the selected purse',()=>{
  const source=newPlant(start),lab=createGrowthLab(source,start);
  lab.change(fillDebugPurse);assert.equal(lifeOf(source).balance,0);
  const filled=lab.snapshot().plant;assert.equal(lifeOf(filled).balance,1000);
  assert.equal(fillDebugPurse(filled),filled);
  const rich={...source,gardenLife:{...lifeOf(source),balance:1500}};
  assert.equal(fillDebugPurse(rich).gardenLife.balance,1000);
});
