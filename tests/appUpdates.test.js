import {test} from 'node:test';
import assert from 'node:assert/strict';
import {watchAppUpdates} from '../src/appUpdates.js';

function mockWindow(t,controller){
  const original=Object.getOwnPropertyDescriptor(navigator,'onLine');
  Object.defineProperty(navigator,'onLine',{configurable:true,value:true,writable:true});
  t.after(()=>{if(original)Object.defineProperty(navigator,'onLine',original);else delete navigator.onLine;});
  const sw=Object.assign(new EventTarget(),{controller});
  let calls=0;
  const reg=Object.assign(new EventTarget(),{async update(){calls++;},installing:null,waiting:null});
  const messages=[];
  const monitor=watchAppUpdates(reg,sw,controller,m=>messages.push(m));
  t.after(()=>monitor.close());
  function activate(next){
    sw.controller=next;sw.dispatchEvent(new Event('controllerchange'));
  }
  return {sw,reg,monitor,messages,activate,calls:()=>calls};
}
test('the first install does not offer a restart; a replacement offers one and leaves navigation to the player',async t=>{
  const {reg,monitor,messages,activate}=mockWindow(t,null);
  const first={}, next=Object.assign(new EventTarget(),{state:'installing',postMessage(){}});
  activate(first);
  await monitor.check(true);
  assert.equal(messages.at(-1),'current');
  reg.installing=next;reg.dispatchEvent(new Event('updatefound'));
  assert.equal(messages.at(-1),'downloading');
  reg.installing=null;activate(next);
  assert.equal(messages.at(-1),'ready');
  await monitor.check(true);
  assert.equal(messages.at(-1),'ready');
});
test('resuming throttles successful checks; manual checks bypass the delay and handle loss of network',async t=>{
  const {reg,monitor,messages,calls}=mockWindow(t,{});
  await monitor.check();await monitor.check();
  assert.equal(calls(),1);
  navigator.onLine=false;
  await monitor.check(true);
  assert.equal(messages.at(-1),'offline');
  assert.equal(calls(),1);
  navigator.onLine=true;reg.update=async()=>{throw new Error('connection lost');};
  await monitor.check(true);
  assert.equal(messages.at(-1),'failed');
  reg.update=async()=>{};await monitor.check(true);
  assert.equal(messages.at(-1),'current');
});
test('detects a controller replaced while registration resolves and releases listeners on close',t=>{
  const original={}, sw=Object.assign(new EventTarget(),{controller:{}});
  const reg=new EventTarget(), messages=[];
  const monitor=watchAppUpdates(reg,sw,original,s=>messages.push(s));
  assert.deepEqual(messages,['ready']);
  monitor.close();
  sw.controller={};sw.dispatchEvent(new Event('controllerchange'));
  assert.deepEqual(messages,['ready']);
});
