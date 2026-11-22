import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {runInNewContext} from 'node:vm';
import {IDBFactory} from 'fake-indexeddb';
import {care,HOUR,newPlant,wake} from '../src/game.js';
import {stageGardenReminder,syncTag} from '../src/gardenReminder.js';
import {reminderSchedule} from '../src/reminderSchedule.js';

const worker=readFileSync(new URL('../public/plant-alerts.js',import.meta.url),'utf8');
const epoch='garden-epoch',token='39'.repeat(32);
const device=()=>({getItem:()=>JSON.stringify({enabled:true,token})});
const sprout=start=>wake(care(newPlant(start-HOUR),'water',start-HOUR),start);
const get=req=>new Promise((resolve,reject)=>{
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});

async function fixture(t){
  const indexedDB=new IDBFactory(),open=indexedDB.open('plantigochi.pocket.garden',1);
  open.onupgradeneeded=()=>open.result.createObjectStore('garden');
  const db=await get(open);t.after(()=>db.close());
  function write(fn){
    const tx=db.transaction('garden','readwrite');
    return new Promise((resolve,reject)=>{
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error || Error('Aborted transaction'));
      fn(tx.objectStore('garden'));
    });
  }
  const entries=new Map(),cache={
    match:async key=>entries.get(key)?.clone(),
    put:async(key,res)=>entries.set(key,res.clone()),
  };
  const handlers={},requests=[],shown=[];
  let sub;
  function subscription(endpoint){
    return {endpoint,options:{applicationServerKey:new Uint8Array([1])},
      toJSON:()=>({keys:{p256dh:'device-key',auth:'auth'}}),unsubscribe:async()=>{sub=null;return true;}};
  }
  sub=subscription('https://example.invalid/push/1');
  const manager={getSubscription:async()=>sub,subscribe:async()=>(sub=subscription('https://example.invalid/push/2'))};
  const server={send:async body=>Response.json({nextDue:body?.dryDue ?? null})};
  const self={indexedDB,navigator:{onLine:true},Notification:{permission:'granted'},registration:{
    pushManager:manager,showNotification:async(title,opts)=>shown.push({title,opts}),
  },addEventListener:(name,fn)=>{handlers[name]=fn;}};
  runInNewContext(worker,{self,caches:{open:async()=>cache},Response,Date,URL,AbortController,setTimeout,clearTimeout,
    fetch:async(url,init)=>{
      assert.equal(url,'/api/alerts/reminder');
      assert.equal(init.headers.Authorization,'Bearer '+token);
      const body=init.body?JSON.parse(init.body):null;
      requests.push({method:init.method,body});return server.send(body);
    }});
  async function emit(type,props={}){
    const tasks=[];handlers[type]({...props,waitUntil:task=>tasks.push(task)});await Promise.all(tasks);
  }
  const save=(plant,abort=false)=>write(store=>{
    store.put(JSON.stringify(plant),'current');store.put({epoch},'setup');
    stageGardenReminder(store,plant,epoch,device);
    if(abort)store.get('reminder-work').onsuccess=()=>store.transaction.abort();
  });
  return {save,write,cache,requests,server,manager,self,shown,
    read:()=>get(db.transaction('garden').objectStore('garden').get('reminder-work')),
    background:()=>emit('sync',{tag:syncTag}),push:()=>emit('push'),
    async sync(){
      let result;await emit('message',{data:{type:'sync-plant-reminder'},ports:[{postMessage:data=>{result=data;}}]});
      return result;
    }};
}

test('a failed rescue reminder survives closing the game, retries both watering deadlines, and acknowledges only the saved job',async t=>{
  const f=await fixture(t),start=Date.now()-13*HOUR,p=sprout(start);
  await f.save(p);assert.equal((await f.sync()).status,'confirmed');
  const first=await f.read(),rescue=care(p,'water',start+13*HOUR);
  await assert.rejects(f.save(rescue,true));
  assert.equal((await f.read()).id,first.id);
  await f.save(rescue);const pending=await f.read();
  assert.notEqual(pending.id,first.id);
  assert.equal(pending.body.dryDue,rescue.lastDrink+4*HOUR);
  assert.equal(pending.body.criticalDue,rescue.lastDrink+12*HOUR);
  f.server.send=async()=>new Response(null,{status:503});
  await assert.rejects(f.background(),/pending/);
  assert.equal((await f.read()).at,undefined);
  f.self.navigator.onLine=false;
  assert.equal((await f.sync()).status,'pending');
  f.self.navigator.onLine=true;
  f.server.send=async body=>Response.json({nextDue:body.dryDue});
  await f.background();
  const ack=await f.read();assert.equal(ack.id,pending.id);assert.ok(ack.at);assert.equal(ack.nextDue,pending.body.dryDue);
  assert.deepEqual(f.requests.at(-1).body.eventIds,pending.body.eventIds);
  await f.save(rescue);await f.background();
  assert.equal(f.requests.length,3);
});

test('a second watering committed before the first network reply is sent and acknowledged separately',async t=>{
  const f=await fixture(t),p=sprout(Date.now()-6*HOUR);
  await f.save(p);
  const arrival=Promise.withResolvers(),release=Promise.withResolvers();
  f.server.send=async body=>{
    if(f.requests.length===1){arrival.resolve();await release.promise;}
    return Response.json({nextDue:body.dryDue});
  };
  const flight=f.background();await arrival.promise;
  const newer=care(p,'water',p.lastDrink+5*HOUR);
  await f.save(newer);const job=await f.read();
  release.resolve();await flight;
  assert.deepEqual(f.requests.map(req=>req.body.dryDue),[p.lastDrink+4*HOUR,newer.lastDrink+4*HOUR]);
  assert.equal((await f.read()).id,job.id);assert.equal((await f.read()).nextDue,newer.lastDrink+4*HOUR);
});

test('provider retirement renews the subscription and reuses the saved event identities; a gesture-only provider requests reconnect',async t=>{
  for(const automatic of [true,false]){
    const f=await fixture(t),p=sprout(Date.now());await f.save(p);
    if(!automatic)f.manager.subscribe=async()=>{throw Error('User gesture required');};
    f.server.send=async body=>body.endpoint.endsWith('/1')?Response.json({code:'subscription_expired'},{status:410}):Response.json({nextDue:body.dryDue});
    const result=await f.sync(),job=await f.read();
    if(automatic){
      assert.equal(result.status,'confirmed');assert.equal(job.gone,null);
      assert.match(job.endpoint,/\/2$/);
      assert.deepEqual(f.requests[0].body.eventIds,f.requests[1].body.eventIds);
    }else{
      assert.equal(result.status,'expired');assert.match(result.endpoint,/\/1$/);
      assert.equal(job.at,null);
      await f.sync();assert.equal(f.requests.length,1);
    }
  }
});

test('an older tab can still water, decline and re-enable alerts without a stale job undoing it',async t=>{
  const f=await fixture(t),p=sprout(Date.now()-10*HOUR);await f.save(p);
  const recent=care(p,'water',Date.now()-4*HOUR-1000);
  const schedule=reminderSchedule(recent,false);
  await f.write(records=>records.put(JSON.stringify(recent),'current'));
  await f.cache.put('/notice-schedule',Response.json(schedule));
  await f.push();
  assert.equal(f.shown[0].opts.data.lastDrink,recent.lastDrink);
  assert.equal(f.requests.length,0);
  await f.cache.put('/notice-schedule',Response.json({disabled:true}));
  await f.push();assert.equal(f.shown.length,1);assert.equal(f.requests.length,0);
  const job=await f.read();
  await f.write(records=>records.put({...job,disabled:true,at:Date.now()-2000,changedAt:Date.now()-2000},'reminder-work'));
  await f.cache.put('/notice-schedule',Response.json(schedule));
  await f.cache.put('/notice-ack-v31',Response.json({at:Date.now()}));
  assert.equal((await f.sync()).status,'legacy');assert.equal(f.requests.length,0);
  await f.write(records=>{records.clear();records.put({epoch:'reset',resetCleanup:true},'setup');});
  await f.push();assert.equal(f.shown.length,1);assert.equal(f.requests.length,0);
});
