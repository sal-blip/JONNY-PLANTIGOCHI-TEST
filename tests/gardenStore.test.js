import assert from 'node:assert/strict';
import test from 'node:test';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {gardenStore} from '../src/gardenStore.js';
import {KEY,newPlant} from '../src/game.js';
import {readGardenBackup} from '../src/gardenBackup.js';
import {retireAlerts,alertKey} from '../src/alertCleanup.js';

function installation(t){
  const indexedDB=new IDBFactory();
  const previous=globalThis.indexedDB;
  globalThis.indexedDB=indexedDB;
  t.after(()=>{if(previous===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=previous;});
  const values=new Map();
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  return {indexedDB,storage,store:()=>gardenStore(()=>storage,()=>true)};
}

async function writeRows(indexedDB,rows){
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('plantigochi.pocket.garden',1);
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  try{
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('garden','readwrite'),records=tx.objectStore('garden');
      for(const [key,value] of Object.entries(rows))records.put(value,key);
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
    });
  }finally{db.close();}
}

test('restore rotates the epoch and rejects pending old restores, resets and same-ID edits',async t=>{
  const {store}=installation(t),first=store(),second=store(),seed=newPlant();
  const original=await first.replace(await first.read(),seed);
  const waiting=await second.read();
  const restored=await first.replace(original,{...seed,name:'Ivy'});
  assert.notEqual(restored.epoch,original.epoch);
  await assert.rejects(second.update(waiting,p=>({...p,name:'Stale'})),/changed/);
  await assert.rejects(second.replace(waiting,newPlant()),/changed/);
  await assert.rejects(second.reset(waiting),/changed/);
  assert.equal((await second.read()).plant.name,'Ivy');
});

test('pending destructive confirmations detect ordinary edits while merging independent care updates',async t=>{
  const {store}=installation(t),a=store(),b=store();
  const snapshot=await a.replace(await a.read(),newPlant());
  await b.update(snapshot,p=>({...p,name:'Fern'}));
  await a.update(snapshot,p=>({...p,sound:false}));
  await assert.rejects(a.replace(snapshot,newPlant()),/changed/);
  await assert.rejects(a.reset(snapshot),/changed/);
  const saved=await a.read();
  assert.equal(saved.plant.name,'Fern');assert.equal(saved.plant.sound,false);
});

test('an older window can change an unversioned save or recreate an existing revision',async t=>{
  const {store,indexedDB}=installation(t),garden=store(),seed=newPlant();
  await garden.read();
  const setup={epoch:null,phase:'game'};
  await writeRows(indexedDB,{current:JSON.stringify(seed),setup});
  const reviewed=await garden.read();
  assert.equal(reviewed.revision,0);
  await writeRows(indexedDB,{current:JSON.stringify({...seed,name:'Old Fern'}),setup});
  await assert.rejects(garden.replace(reviewed,newPlant()),/changed/);
  await assert.rejects(garden.reset(reviewed),/changed/);
  const one=await garden.update(await garden.read(),p=>({...p,sound:false}));
  await writeRows(indexedDB,{current:JSON.stringify(seed),setup});
  const again=await garden.update(await garden.read(),p=>({...p,name:'Old Ivy'}));
  assert.equal(one.revision,again.revision);
  await assert.rejects(garden.reset(one),/changed/);
  assert.equal((await garden.replace(again,newPlant())).phase,'game');
});

test('a pending restore distinguishes an older window changing only setup from an unchanged empty installation',async t=>{
  const {store,indexedDB}=installation(t),garden=store();
  const fresh=await garden.read();
  await writeRows(indexedDB,{setup:{phase:'name',draft:'A',epoch:null}});
  await assert.rejects(garden.replace(fresh,newPlant()),/changed/);
  const naming=await garden.read();
  await writeRows(indexedDB,{setup:{phase:'name',draft:'AB',epoch:null}});
  await assert.rejects(garden.replace(naming,newPlant()),/changed/);
  // A read of an unversioned row must not itself invalidate a confirmation.
  const unchanged=await garden.read();await garden.read();
  assert.equal((await garden.replace(unchanged,newPlant())).phase,'game');
});

test('corrupt legacy saves can be exported, recovered or reset only with the reviewed bytes',async t=>{
  const {store,storage}=installation(t),garden=store();
  storage.setItem(KEY,'unreadable first copy');
  const failed=await garden.read().catch(e=>e);
  assert.equal(failed.recovery.raw,'unreadable first copy');
  assert.equal(await garden.exportRaw(),failed.raw);
  storage.setItem(KEY,'unreadable changed copy');
  await assert.rejects(garden.reset(failed.recovery),/changed/);
  await assert.rejects(garden.replace(failed.recovery,newPlant()),/changed/);
  const changed=await garden.read().catch(e=>e);
  const pending=await garden.reset(changed.recovery);
  assert(pending.resetCleanup);
  assert.equal((await garden.finishReset(retireAlerts)).phase,'tour');
  assert.equal(storage.getItem(KEY),null);
});

test('recovering a future-format IndexedDB record preserves its original bytes until the replacement commits',async t=>{
  const {store,indexedDB}=installation(t),garden=store();
  await garden.read();
  const raw='{"version":999,"future":"keep these bytes"}';
  await writeRows(indexedDB,{current:raw});
  const failed=await garden.read().catch(error=>error);
  assert.equal(await garden.exportRaw(),raw);
  await assert.rejects(garden.replace(failed.recovery,{version:999}),/recovery/);
  assert.equal(await garden.exportRaw(),raw);
  const restored=await garden.replace(failed.recovery,newPlant());
  assert.equal(restored.phase,'game');assert.notEqual(restored.epoch,failed.recovery.epoch);
});

test('an interrupted erase keeps all old preferences until commit, then resumes cleanup exactly once',async t=>{
  const {store,storage}=installation(t),garden=store(),seed=newPlant();
  const original=await garden.replace(await garden.read(),seed);
  storage.setItem(KEY,JSON.stringify(seed));storage.setItem('plantigochi.tilt','off');storage.setItem(alertKey,JSON.stringify({token:'retired-device'}));
  const clear=IDBObjectStore.prototype.clear;
  const abort=t.mock.method(IDBObjectStore.prototype,'clear',function(){
    const request=clear.call(this);this.transaction.abort();return request;
  });
  await assert.rejects(garden.reset(original));abort.mock.restore();
  assert.equal((await garden.read()).plant.id,seed.id);
  assert.equal(storage.getItem('plantigochi.tilt'),'off');
  assert(storage.getItem(alertKey));assert(storage.getItem(KEY));
  const pending=await garden.reset(original);
  const reopened=store();
  assert.equal((await reopened.read()).resetCleanup,true);
  assert.equal(await reopened.mayChangeAlerts(pending.epoch,null),false);
  await assert.rejects(reopened.finishReset(()=>{throw new Error('storage interrupted');}),/interrupted/);
  assert.equal((await reopened.read()).resetCleanup,true);assert(storage.getItem(alertKey));
  const fresh=await reopened.finishReset(retireAlerts);
  assert.equal(fresh.phase,'tour');assert.equal(fresh.plant,null);
  assert.equal(storage.getItem(alertKey),null);
  assert.deepEqual(JSON.parse(storage.getItem('plantigochi.retired-alerts')),['retired-device']);
  storage.setItem('plantigochi.tilt','new preference');
  await reopened.finishReset(retireAlerts);
  assert.equal(storage.getItem('plantigochi.tilt'),'new preference');
});

test('old valid exports above the normal size budget can be imported and saved',async t=>{
  const {store}=installation(t),garden=store();
  const seed=newPlant();
  const src='data:image/jpeg;base64,/9j/'+'A'.repeat(520000);
  const photo={src,width:400,height:400,x:50,y:50};
  seed.gardenLife={balance:1,day:'',waters:0,wins:[],plants:[],notes:[],events:[],
    items:Array.from({length:11},(_,index)=>({id:'frame-'+index,sku:'oak',slot:null,photo}))};
  const file=new Blob([JSON.stringify(seed)]);
  assert(file.size>5*1024*1024);
  const imported=await readGardenBackup(file);
  const saved=await garden.replace(await garden.read(),imported);
  assert.equal(saved.plant.gardenLife.items.length,11);
  await assert.rejects(readGardenBackup(new Blob(['bad JSON'])),/damaged/);
  await assert.rejects(readGardenBackup({text:async()=>{throw new Error();}}),/could not be read/);
});
