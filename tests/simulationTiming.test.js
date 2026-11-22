import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAY,HOUR,WEEK,care,careStatus,company,condition,discoverFungus,graduate,
  milestoneDue,newPlant,readPlant,replant,takeCutting,treatFungus,wake
} from '../src/game.js';
import {checkIn,earnWin,lifeOf} from '../src/gardenEconomy.js';
import {DEW_CHANCES,LEVELS,stepGame} from '../src/pocketPlay.js';

const t = new Date(2026,10,21,22).getTime();
const makeSprout = () => wake(care(newPlant(t-3*HOUR),'water',t-3*HOUR),t-2*HOUR);
const reload = (plant,now) => readPlant(JSON.stringify(plant),now);

test('a delayed confirmed pour preserves the real watering, wallet and reloadable garden',()=>{
  const time=t+2*HOUR;
  const watered=care(makeSprout(),'water',time);
  assert.equal(careStatus(watered,'water',time-2000).locked,true);
  assert.deepEqual(careStatus(watered,'water',time-500),careStatus(watered,'water',time));
  assert.strictEqual(care(watered,'water',time-1000,true),watered);
  assert.deepEqual(reload(watered,time-1000),watered);
  const later=care(watered,'water',time+1000,true);
  assert.equal(condition(later,time+1000),'soggy');
  assert.deepEqual(reload(later,time+1000),later);
});

test('recovery discards only the known invalid older v3 extra pour, retaining the actual drink and garden',()=>{
  const time=t+2*HOUR;
  const watered=care({...makeSprout(),sound:false,dewCleared:9},'water',time);
  const broken={...watered,extraPour:time-1000,message:'Squelch. My socks are soaked.'};
  const fixed=reload(broken,time+1);
  assert.deepEqual(fixed,{...watered,message:'A little sip. Very sophisticated.'});
  assert.deepEqual(reload(fixed,time+1),fixed);
  assert.equal(condition(fixed,time),'healthy');
  assert.equal(reload({...broken,rotAt:time},time),null);
  assert.equal(reload({...broken,message:'Something else'},time),null);
  assert.equal(reload({...broken,version:2},time),null);
  assert.equal(reload({...broken,book:[{id:'invalid'}]},time),null);
});

test('rolling the clock behind an established care action cannot reorder the plant lifecycle',()=>{
  const seed=newPlant(t);
  assert.strictEqual(care(seed,'water',t-1),seed);
  const sprout=makeSprout();
  const grown={...sprout,stage:'grown',earned:WEEK,outbreakDue:t};
  const sick=discoverFungus(grown,t);
  assert.strictEqual(treatFungus(sick,t,t-1),sick);
  const stock=company(grown,t+HOUR);
  assert.strictEqual(discoverFungus(stock,t),stock);
  assert.strictEqual(company(stock,t),stock);
  assert.strictEqual(takeCutting(stock,'left',t),stock);
  assert.strictEqual(graduate(stock,stock.id,0,t-4*HOUR),stock);
  const moved=graduate(stock,stock.id,0,t+HOUR);
  assert.deepEqual(reload(moved,t),moved);
  const dead=wake(stock,t+2*DAY);
  assert.strictEqual(replant(dead,'seed',dead.deadAt-1),dead);
  assert.equal(replant(dead,'seed',dead.deadAt).stage,'seed');
});

test('a delayed visit records the actual earned crossing for each stage, including across midnight',()=>{
  for(const [stage,target,threshold] of [['sprout','young',3*DAY],['young','split',5*DAY],['split','grown',WEEK]]){
    const before={...makeSprout(),stage,anchor:t,lastDrink:t,fedAt:t,litAt:t,earned:threshold-HOUR/2};
    const due=milestoneDue(before);
    assert.equal(due,t+HOUR/2);
    const after=reload(before,t+5*HOUR);
    assert.equal(after.stage,target);
    assert.equal(lifeOf(after).events.at(-1).time,due);
    assert.strictEqual(care(after,'talk',due-1),after);
    assert.deepEqual(reload(after,t+5*HOUR),after);
    const accrued=reload({...before,earned:threshold},t+5*HOUR);
    assert.equal(lifeOf(accrued).events.at(-1).time,t+5*HOUR);
  }
  const watered=care(newPlant(t),'water',t);
  assert.equal(wake(watered,t+3*DAY,false).stage,'seed');
  const sprout=wake(watered,t+3*DAY);
  assert.equal(sprout.lastDrink,t+3*DAY);
  assert.equal(lifeOf(sprout).events.at(-1).time,sprout.lastDrink);
});

const enter = (name,cleared=0) => stepGame(null,{type:'enter',name,cleared});
const key = (game,input,at,dropLane=1) => stepGame(game,{type:'key',key:input,at,dropLane,sequence:['left','right','heart']});
const tick = (game,at,dropLane=1) => stepGame(game,{type:'tick',at,dropLane});

test('finishing Dew Catch with one life starts a full three-life replay at any unlocked level',()=>{
  let at=t, game=key(enter('dew',LEVELS-1),'heart',at,0);
  for(let i=0;game.phase==='fall' && i<1000;i++)
    game=tick(game,at+=50,game.nextId===1?0:1);
  assert.equal(game.phase,'won');
  assert.equal(game.chances,1);
  assert.equal(game.startedAt,t);
  assert.equal(game.finishedAt,at);
  game=key(game,'heart',++at);
  for(let i=1;i<LEVELS;i++)game=key(game,'left',++at);
  assert.equal(game.level,1);
  game=key(game,'heart',++at,0);
  assert.equal(game.chances,DEW_CHANCES);
  for(let i=0;i<40;i++)game=tick(game,at+=50,0);
  assert.equal(game.phase,'fall');
  assert.equal(game.chances,2);
  for(let i=0;game.phase==='fall' && i<240;i++)game=tick(game,at+=50,0);
  assert.equal(game.phase,'lost');
  game=tick(game,at+=1800);
  assert.equal(game.startedAt,at);
  assert.equal(game.finishedAt,null);
});

test('Dew and Echo award coins using the level or attempt actually played across midnight',()=>{
  const midnight=new Date(2026,10,22).getTime();
  const started=midnight-1000, wallet=checkIn(newPlant(started),started);
  let dew=key(enter('dew'),'heart',started);
  for(let i=1;dew.phase==='fall' && i<1000;i++)dew=tick(dew,started+50*i);
  assert.equal(dew.phase,'won');
  assert.equal(dew.startedAt,started);
  assert.ok(dew.finishedAt>midnight);
  const crossed=earnWin(wallet,'dew-midnight',dew.startedAt,dew.finishedAt);
  assert.equal(lifeOf(crossed).balance,20);
  let at=dew.finishedAt+100;
  dew=key(dew,'heart',at);
  assert.equal(dew.startedAt,at);
  for(let i=0;dew.phase==='fall' && i<1000;i++)dew=tick(dew,at+=50);
  assert.equal(lifeOf(earnWin(crossed,'dew-next',dew.startedAt,dew.finishedAt)).balance,23);

  let echo=key(enter('echo'),'heart',started);
  at=started;
  while(echo.phase==='watch')echo=tick(echo,at+=300);
  for(const button of ['left','right','heart'])echo=key(echo,button,++at);
  assert.equal(echo.phase,'won');
  assert.equal(echo.startedAt,started);
  assert.equal(echo.finishedAt,at);
  assert.equal(lifeOf(earnWin(wallet,'echo-midnight',echo.startedAt,echo.finishedAt)).balance,20);
  echo=key(echo,'heart',++at);
  while(echo.phase==='watch')echo=tick(echo,at+=300);
  echo=key(echo,'right',++at);
  assert.equal(echo.phase,'retry');
  echo=tick(echo,at+=1100);
  assert.equal(echo.startedAt,at);
  while(echo.phase==='watch')echo=tick(echo,at+=300);
  for(const button of ['left','right','heart'])echo=key(echo,button,++at);
  assert.equal(lifeOf(earnWin(wallet,'echo-retry',echo.startedAt,echo.finishedAt)).balance,23);
});
