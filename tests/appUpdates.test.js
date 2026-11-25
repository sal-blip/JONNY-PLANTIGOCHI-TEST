import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectAppWorker} from '../src/appUpdates.js';

const origin='https://plant.test', hash='a'.repeat(64);
const latest={entry:'/assets/index-new.js',worker:hash};
const target=origin+'/sw.js?build='+hash;
const old='/assets/index-old.js';

function worker(scriptURL,state='activated'){
  return Object.assign(new EventTarget(),{scriptURL,state,postMessage(){}});
}
function fixture(t,{runningEntry=old,initial=worker(origin+'/sw.js'),shell=old,onProgress}={}){
  const previous=Object.getOwnPropertyDescriptor(navigator,'onLine');
  Object.defineProperty(navigator,'onLine',{configurable:true,writable:true,value:true});
  t.after(()=>{if(previous)Object.defineProperty(navigator,'onLine',previous);else delete navigator.onLine;});
  const sw=Object.assign(new EventTarget(),{controller:initial});
  const statuses=[],availability=[],scripts=[];
  const env={shell,lookup:async()=>latest,read:async()=>env.shell};
  sw.getRegistration=async()=>undefined;
  sw.register=async(url,opts)=>{
    assert.deepEqual(opts,{scope:'/',updateViaCache:'none'});
    scripts.push(url);
    sw.controller=worker(url);env.shell=latest.entry;
    sw.dispatchEvent(new Event('controllerchange'));
    return {active:sw.controller};
  };
  const conn=connectAppWorker(sw,s=>availability.push(s),s=>statuses.push(s),{
    origin,runningEntry,onProgress,releaseInfo:s=>env.lookup(s),readShell:s=>env.read(s)
  });
  t.after(()=>conn.close());
  return {conn,sw,env,statuses,availability,scripts};
}
test('a stale registered URL cannot hide a newer release and a verified old tab offers restart',async t=>{
  const {conn,sw,statuses,scripts}=fixture(t);
  await conn.check(true);
  assert.deepEqual(scripts,[target]);
  assert.equal(statuses.at(-1),'ready');
  await conn.check(true);
  assert.equal(sw.controller.scriptURL,target);
  assert.equal(scripts.length,1);
  assert.equal(statuses.at(-1),'ready');
});
test('first install waits for activation and claim before calling the current shell ready',async t=>{
  const {conn,sw,env,statuses,availability}=fixture(t,{runningEntry:latest.entry,initial:null});
  const pending=worker(target,'installing');
  sw.register=async()=>({installing:pending});
  const request=conn.check(true);
  await new Promise(setImmediate);
  assert.equal(statuses.at(-1),'downloading');
  pending.state='activated';pending.dispatchEvent(new Event('statechange'));
  assert.equal(statuses.at(-1),'downloading');
  env.shell=latest.entry;
  sw.controller=pending;sw.dispatchEvent(new Event('controllerchange'));
  await request;
  assert.equal(statuses.at(-1),'current');
  assert.equal(availability.at(-1),'ready');
});
test('same worker with a stale cached entry gets a fresh worker URL and verifies again',async t=>{
  const {conn,sw,env,scripts,statuses}=fixture(t,{initial:worker(target)});
  const register=sw.register;
  sw.register=async(...args)=>{
    const reg=await register(...args);
    if(scripts.length===1)env.shell=old;
    return reg;
  };
  await conn.check(true);
  assert.equal(scripts.length,2);
  assert.match(scripts[1],/&retry=/);
  assert.equal(statuses.at(-1),'ready');
});
test('a mismatched shell after both attempts cannot offer restart; manual retry is available',async t=>{
  const {conn,env,statuses}=fixture(t);
  env.read=async()=>old;
  await conn.check(true);
  assert.equal(statuses.at(-1),'verificationFailed');
  assert.ok(!statuses.includes('ready'));
  env.read=async()=>latest.entry;
  await conn.check(true);
  assert.equal(statuses.at(-1),'ready');
});
test('checks share a request; background successes are throttled and manual checks bypass throttling',async t=>{
  const {conn,env,scripts}=fixture(t,{initial:worker(target),runningEntry:latest.entry,shell:latest.entry});
  let count=0;
  env.lookup=async()=>{count++;return latest;};
  const first=conn.check();
  assert.equal(conn.check(true),first);
  await first;await conn.check();
  assert.equal(count,1);
  await conn.check(true);
  assert.equal(count,2);
  assert.deepEqual(scripts,[]);
});
test('a stalled release lookup releases the button and its late response cannot overwrite a retry',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {conn,env,statuses}=fixture(t);
  let finish;
  env.lookup=()=>new Promise(r=>{finish=r;});
  const p=conn.check(true);
  t.mock.timers.tick(12000);await p;
  assert.equal(statuses.at(-1),'slow');
  env.lookup=async()=>latest;await conn.check(true);
  finish(latest);await Promise.resolve();
  assert.equal(statuses.at(-1),'ready');
});
test('a stalled installation times out and a later controller claim triggers fresh verification',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {conn,sw,env,statuses}=fixture(t);
  const waiting=worker(target,'installing');
  sw.register=async()=>({installing:waiting});
  const p=conn.check(true);
  await new Promise(setImmediate);
  t.mock.timers.tick(90000);await p;
  assert.equal(statuses.at(-1),'slow');
  sw.controller=waiting;waiting.state='activated';env.shell=latest.entry;
  sw.dispatchEvent(new Event('controllerchange'));
  await new Promise(setImmediate);
  assert.equal(statuses.at(-1),'ready');
});
test('offline cancellation preserves offline availability; reconnect retries, cleanup ignores late events',async t=>{
  const {conn,sw,env,availability,statuses}=fixture(t);
  let finish;
  env.lookup=()=>new Promise(r=>{finish=r;});
  const pending=conn.check();
  navigator.onLine=false;conn.check();
  finish(latest);await pending;
  assert.equal(statuses.at(-1),'offline');
  assert.equal(availability.at(-1),'ready');
  navigator.onLine=true;env.lookup=async()=>latest;await conn.check();
  assert.equal(statuses.at(-1),'ready');
  conn.close();
  const count=statuses.length;
  sw.dispatchEvent(new Event('controllerchange'));
  await conn.check(true);
  assert.equal(statuses.length,count);
});

test('a redundant precache retries with a different URL before offering a restart',async t=>{
  const {conn,sw,statuses}=fixture(t);
  const register=sw.register;
  let count=0;
  sw.register=async(url,opts)=>{
    if(!count++)return {installing:worker(url,'redundant')};
    assert.match(url,/retry=/);
    return register(url,opts);
  };
  await conn.check(true);
  assert.equal(count,2);
  assert.equal(statuses.at(-1),'ready');
});
test('recovers when the existing controller cannot read its cached entry',async t=>{
  const {conn,env,statuses,scripts}=fixture(t,{initial:worker(target)});
  let reads=0;
  env.read=async()=>{if(!reads++)throw Error('Cache read failed');return latest.entry;};
  await conn.check(true);
  assert.deepEqual(scripts,[target]);
  assert.equal(statuses.at(-1),'ready');
});
test('lookup failure never labels an unknown release current',async t=>{
  const {conn,env,statuses,availability}=fixture(t);
  env.lookup=async()=>{throw Error('Unavailable');};
  await conn.check(true);
  assert.equal(statuses.at(-1),'failed');
  assert.equal(availability.at(-1),'ready');
  env.lookup=async()=>latest;await conn.check(true);
  assert.equal(statuses.at(-1),'ready');
});
test('closing during registration suppresses late activation and notifications',async t=>{
  const {conn,sw,statuses}=fixture(t);
  let finish;
  sw.register=()=>new Promise(resolve=>{finish=resolve;});
  const request=conn.check(true);
  await new Promise(setImmediate);
  conn.close();
  const count=statuses.length;
  sw.controller=worker(target);
  finish({active:sw.controller});
  sw.dispatchEvent(new Event('controllerchange'));
  await request;
  assert.equal(statuses.length,count);
});
test('retry after a stuck registration uses a new script URL on the same scope',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {conn,sw,scripts,statuses}=fixture(t);
  const register=sw.register;
  sw.register=()=>new Promise(()=>{});
  const stalled=conn.check(true);
  await new Promise(setImmediate);
  t.mock.timers.tick(12000);await stalled;
  assert.equal(statuses.at(-1),'slow');
  sw.register=register;
  await conn.check(true);
  assert.match(scripts[0],/&retry=/);
  assert.equal(statuses.at(-1),'ready');
});
test('an already-active worker that never claims the page gets replaced automatically',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {conn,sw,statuses}=fixture(t);
  const register=sw.register;
  sw.register=(url,opts)=>url===target?Promise.resolve({active:worker(url)}):register(url,opts);
  const request=conn.check(true);
  await new Promise(setImmediate);
  t.mock.timers.tick(2500);
  await request;
  assert.equal(statuses.at(-1),'ready');
});

test('retry joins the pending download for the same build started by another tab',async t=>{
  const {conn,sw,env,statuses,scripts}=fixture(t);
  const installing=worker(target+'&retry=other-window','installing');
  sw.getRegistration=async()=>({installing});
  const check=conn.check(true);
  await new Promise(setImmediate);
  assert.deepEqual(statuses,['checking','downloading']);
  installing.state='activated';sw.controller=installing;env.shell=latest.entry;
  sw.dispatchEvent(new Event('controllerchange'));
  await check;
  assert.deepEqual(scripts,[]);
  assert.deepEqual(statuses,['checking','downloading','verifying','ready']);
});
test('an unsuccessful download exposes a different retry status than a stale shell',async t=>{
  const {conn,sw,statuses}=fixture(t);
  sw.register=async()=>{throw Error('Unable to download service worker')};
  await conn.check(true);
  assert.equal(statuses.at(-1),'downloadFailed');
  assert.ok(!statuses.includes('verifying'));
});

test('only forward progress from the installing worker extends its idle deadline',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const progress=[];
  const {conn,sw,statuses,env}=fixture(t,{onProgress:p=>progress.push(p)});
  const installing=worker(target,'installing');
  sw.register=async()=>({installing});
  const check=conn.check();
  await new Promise(setImmediate);
  const report=(source,completed,total)=>sw.dispatchEvent(Object.assign(new Event('message'),{
    source,data:{type:'GAME_CACHE_PROGRESS',completed,total}
  }));
  t.mock.timers.tick(80000);
  report(sw.controller,1,115);
  report(installing,116,115);
  report(installing,4,115);
  report(installing,3,115);
  t.mock.timers.tick(80000);
  await new Promise(setImmediate);
  assert.equal(statuses.at(-1),'downloading');
  assert.deepEqual(progress,[null,{completed:4,total:115}]);
  sw.controller=installing;installing.state='activated';env.shell=latest.entry;
  sw.dispatchEvent(new Event('controllerchange'));
  await check;
  report(installing,10,115);
  assert.equal(progress.length,2);
  assert.equal(statuses.at(-1),'ready');
});
