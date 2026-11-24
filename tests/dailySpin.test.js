import assert from 'node:assert/strict';
import test from 'node:test';
import {catalog,checkIn,claimDaily,dailyActions,lifeOf,localDay,openDailyVisit,presentDaily,rollDailyPrize,settleDailySpin,spinTable,validGardenLife} from '../src/gardenEconomy.js';
import {DAY,HOUR,WEEK,care,earnedAt,graduate,newPlant,readPlant,useGrowthDay,wake} from '../src/game.js';

const start=new Date(2026,10,3,9).getTime(),today=localDay(start);
const visit=()=>openDailyVisit(newPlant(start),start);
const spin=(p,roll)=>settleDailySpin(p,start,today,rollDailyPrize(roll,.45));

test('all 100 tickets match the displayed odds and draw only active catalog prizes',()=>{
  const counts={};
  for(let i=0;i<100;i++){
    const prize=rollDailyPrize((i+.5)/100,.99999);
    counts[prize.id]=(counts[prize.id] || 0)+1;
    if(prize.sku)assert.equal(catalog[prize.sku].kind,prize.id);
  }
  assert.deepEqual(counts,Object.fromEntries(spinTable.map(row=>[row.id,row.weight])));
  for(const [roll,kind] of [[.92,'pot'],[.99,'plant']]){
    const pool=Object.keys(catalog).filter(sku=>catalog[sku].kind===kind && !catalog[sku].retired);
    assert.deepEqual(pool,pool.map((_,i)=>rollDailyPrize(roll,(i+.5)/pool.length).sku));
  }
});
test('dismissal, claim and spin are independent durable daily receipts with clock rollback protection',()=>{
  let p=presentDaily(visit(),start,today);
  assert.equal(lifeOf(p).visit.shown,true);
  assert.equal(dailyActions(lifeOf(p),today),2);
  p=spin(p,.78);
  assert.equal(lifeOf(p).balance,100);
  assert.equal(dailyActions(lifeOf(p),today),1);
  p=claimDaily(p,start,today);
  assert.equal(lifeOf(p).balance,110);
  assert.equal(dailyActions(lifeOf(p),today),0);
  p=readPlant(JSON.stringify(p),start);
  assert.equal(spin(p,.99),p);
  assert.equal(claimDaily(p,start,today),p);
  const next=openDailyVisit(p,start+DAY);
  assert.equal(lifeOf(next).visit.streak,2);
  assert.equal(lifeOf(next).visit.spin,undefined);
  assert.equal(spin(next,.5),next);
  assert.equal(openDailyVisit(next,start),next);
  assert.equal(lifeOf(openDailyVisit(next,start+2*DAY)).visit.streak,1);
});
test('paid legacy receipts give one spin without paying the check-in again',()=>{
  const p=checkIn(newPlant(start),start);
  for(const receipt of [undefined,{date:today,streak:4}]){
    const legacy={...p,gardenLife:{...lifeOf(p),visit:receipt}};
    assert.equal(claimDaily(legacy,start,today),legacy);
    const updated=spin(legacy,0);
    assert.equal(lifeOf(updated).balance,20);
    assert.equal(dailyActions(lifeOf(updated),today),0);
  }
});
test('inventory prizes survive reload and plant placement leaves the active seed intact',()=>{
  const pot=spin(visit(),.95);
  assert.equal(pot.gardenLife.items.length,1);
  assert.equal(pot.gardenLife.items[0].slot,null);
  assert.ok(readPlant(JSON.stringify(pot),start));
  const p=readPlant(JSON.stringify(spin(visit(),.99)),start);
  const [gift]=p.waitingPlants;
  const placed=graduate(p,gift.id,0,start);
  assert.equal(placed.graduates[0].source,'shop');
  assert.equal(placed.graduates[0].name,catalog[gift.species].name);
  assert.equal(placed.waitingPlants.length,0);
  assert.equal(placed.id,p.id);
  assert.ok(readPlant(JSON.stringify(placed),start));
  assert.equal(graduate(placed,gift.id,1,start),placed);
});
test('growth day waits for a healthy sprout, crosses a stage, and preserves care deadlines',()=>{
  let p=spin(visit(),.85);
  assert.equal(useGrowthDay(p,p.id,1,start),p);
  p=wake(care(p,'water',start),start+HOUR);
  const at=start+HOUR,sprout={...p,earned:2.5*DAY};
  const young=useGrowthDay(sprout,p.id,1,at);
  assert.equal(young.stage,'young');
  assert.equal(earnedAt(young,at),3.5*DAY);
  assert.equal(young.lastDrink,p.lastDrink);
  assert.equal(young.fedAt,p.fedAt);
  assert.equal(young.gardenLife.growthDays,0);
  assert.equal(useGrowthDay(young,p.id,1,at),young);
  const fungus={...sprout,fungusAt:at,outbreakDue:null};
  assert.equal(useGrowthDay(fungus,p.id,1,at).gardenLife.growthDays,1);
  const grown=useGrowthDay({...sprout,stage:'split',earned:WEEK-HOUR},p.id,1,at);
  assert.equal(grown.stage,'grown');
  assert.ok(grown.waitingPlants.some(item=>item.id===p.id));
});
test('invalid imported prize records and growth credits are rejected',()=>{
  const p=visit();
  for(const spin of [{id:'plant',sku:'terra'},{id:'coins100',sku:'terra'},{id:'other'}]){
    assert.equal(validGardenLife({...p,gardenLife:{...p.gardenLife,visit:{...p.gardenLife.visit,spin}}}),false);
  }
  assert.equal(validGardenLife({...p,gardenLife:{...p.gardenLife,growthDays:-2}}),false);
});
