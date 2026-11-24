import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectAppWorker,watchAppUpdates} from '../src/appUpdates.js';

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

function makeWorker(state) {
  return Object.assign(new EventTarget(), {state, postMessage() {}});
}

function workerConnection(t) {
  const previous = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  Object.defineProperty(navigator, 'onLine', {configurable:true, value:true, writable:true});
  t.after(() => {
    if (previous) Object.defineProperty(navigator, 'onLine', previous);
    else delete navigator.onLine;
  });
  const reg = Object.assign(new EventTarget(), {installing:null, waiting:null, active:null, async update() {}});
  const sw = Object.assign(new EventTarget(), {controller:null, async register() { return reg; }, async getRegistration() {}});
  const statuses = [], availability = [];
  const connection = connectAppWorker(sw, value => availability.push(value), value => statuses.push(value));
  t.after(() => connection.close());
  return {reg, sw, connection, statuses, availability};
}

test('a background replacement that goes redundant enables a retry, even if its update check resolves later', async t => {
  const {reg, monitor, messages, activate} = mockWindow(t, {});
  let finish;
  reg.update = () => new Promise(resolve => { finish = resolve; });
  const checking = monitor.check();
  await Promise.resolve();
  const worker = makeWorker('installing');
  reg.installing = worker;
  reg.dispatchEvent(new Event('updatefound'));
  assert.equal(messages.at(-1), 'downloading');
  reg.installing = null;
  worker.state = 'redundant';
  worker.dispatchEvent(new Event('statechange'));
  finish();
  await checking;
  assert.equal(messages.at(-1), 'failed');

  let retries = 0;
  reg.update = async () => { retries++; };
  await monitor.check();
  assert.equal(retries, 1);
  assert.equal(messages.at(-1), 'current');
  activate(makeWorker('activated'));
  assert.equal(messages.at(-1), 'ready');
});

test('reconnect and a manual check share a new registration after the initial script fetch failed', async t => {
  const {reg, sw, connection, statuses, availability} = workerConnection(t);
  let calls = 0, finish;
  sw.register = async () => {
    if (++calls === 1) throw new Error('503');
    return new Promise(resolve => { finish = resolve; });
  };
  await connection.check();
  assert.equal(availability.at(-1), 'unavailable');
  assert.equal(statuses.at(-1), 'failed');
  const resumed = connection.check();
  assert.equal(connection.check(true), resumed);
  assert.equal(statuses.at(-1), 'checking');
  const first = makeWorker('installing');
  reg.installing = first;
  finish(reg);
  await resumed;
  assert.equal(calls, 2);
  assert.equal(statuses.at(-1), 'downloading');
  reg.active = first;
  reg.installing = null;
  first.state = 'activated';
  first.dispatchEvent(new Event('statechange'));
  sw.controller = first;
  sw.dispatchEvent(new Event('controllerchange'));
  assert.equal(statuses.at(-1), 'current');
  assert.equal(availability.at(-1), 'ready');
});

test('a failed first precache can register again from Settings without reloading', async t => {
  const {reg, sw, connection, statuses, availability} = workerConnection(t);
  let calls = 0;
  sw.register = async () => { calls++; return reg; };
  const first = makeWorker('installing');
  reg.installing = first;
  await connection.check();
  reg.installing = null;
  first.state = 'redundant';
  first.dispatchEvent(new Event('statechange'));
  assert.equal(availability.at(-1), 'unavailable');
  assert.equal(statuses.at(-1), 'failed');
  sw.register = async () => {
    calls++;
    reg.active = makeWorker('activated');
    return reg;
  };
  await connection.check(true);
  assert.equal(calls, 2);
  assert.equal(availability.at(-1), 'ready');
  assert.equal(statuses.at(-1), 'current');
});

test('offline startup uses the existing registration and checks again when online', async t => {
  const {reg, sw, connection, statuses, availability} = workerConnection(t);
  reg.active = makeWorker('activated');
  sw.controller = reg.active;
  let registered = 0, updated = 0;
  sw.register = async () => { registered++; throw new Error('Offline'); };
  sw.getRegistration = async () => reg;
  reg.update = async () => { updated++; };
  navigator.onLine = false;
  await connection.check(true);
  assert.equal(registered, 0);
  assert.equal(updated, 0);
  assert.equal(availability.at(-1), 'ready');
  assert.equal(statuses.at(-1), 'offline');
  navigator.onLine = true;
  await connection.check();
  assert.equal(updated, 1);
  assert.equal(statuses.at(-1), 'current');
});

test('a late registration after cleanup cannot publish status or watch workers', async t => {
  const {reg, sw, connection, statuses, availability} = workerConnection(t);
  let finish;
  sw.register = () => new Promise(resolve => { finish = resolve; });
  const pending = connection.check();
  connection.close();
  reg.active = makeWorker('activated');
  finish(reg);
  await pending;
  sw.controller = reg.active;
  sw.dispatchEvent(new Event('controllerchange'));
  assert.deepEqual(availability, ['preparing']);
  assert.deepEqual(statuses, []);
});

test('a silent update request times out, retries, and a late original completion cannot overwrite ready', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const {reg, monitor, messages, activate} = mockWindow(t, {});
  let finishOriginal, calls = 0;
  reg.update = () => ++calls === 1 ? new Promise(resolve => { finishOriginal = resolve; }) : Promise.resolve();
  const stalled = monitor.check();
  assert.equal(monitor.check(true), stalled);
  assert.equal(messages.at(-1), 'checking');
  await Promise.resolve();
  t.mock.timers.tick(12000);
  await stalled;
  assert.equal(messages.at(-1), 'slow');
  await monitor.check(true);
  assert.equal(calls, 2);
  assert.equal(messages.at(-1), 'current');
  activate(makeWorker('activated'));
  finishOriginal();
  await Promise.resolve();
  assert.equal(messages.at(-1), 'ready');
});

test('a registration that never answers releases Settings and a retry owns its monitor', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const {reg, sw, connection, statuses} = workerConnection(t);
  let finishOriginal;
  sw.register = () => new Promise(resolve => { finishOriginal = resolve; });
  const pending = connection.check(true);
  t.mock.timers.tick(12000);
  await pending;
  assert.equal(statuses.at(-1), 'slow');
  reg.active = makeWorker('activated');
  sw.register = async () => reg;
  await connection.check(true);
  assert.equal(statuses.at(-1), 'current');
  const count = statuses.length;
  finishOriginal(reg);
  await Promise.resolve();
  assert.equal(statuses.length, count);
});

test('a stalled download enables retry while a later controller change still offers restart', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const {reg, monitor, messages, activate, calls} = mockWindow(t, {});
  const worker = makeWorker('installing');
  reg.installing = worker;
  reg.dispatchEvent(new Event('updatefound'));
  t.mock.timers.tick(30000);
  worker.state = 'installed';
  worker.dispatchEvent(new Event('statechange'));
  t.mock.timers.tick(30000);
  assert.equal(messages.at(-1), 'downloading');
  t.mock.timers.tick(15000);
  assert.equal(messages.at(-1), 'slow');
  await monitor.check(true);
  assert.equal(calls(), 1);
  activate(worker);
  t.mock.timers.tick(60000);
  assert.equal(messages.at(-1), 'ready');
});

test('an installed window checks its existing worker and releases the button when connectivity drops', async t => {
  const {reg, sw, connection, statuses} = workerConnection(t);
  reg.active = sw.controller = makeWorker('activated');
  let registrations = 0, finish;
  sw.register = async () => { registrations++; return reg; };
  sw.getRegistration = async () => reg;
  await connection.check(true);
  assert.equal(registrations, 0);
  reg.update = () => new Promise(resolve => { finish = resolve; });
  const pending = connection.check(true);
  await Promise.resolve();
  navigator.onLine = false;
  connection.check();
  assert.equal(statuses.at(-1), 'offline');
  finish();
  await pending;
  assert.equal(statuses.at(-1), 'offline');
  navigator.onLine = true;
  reg.update = async () => {};
  await connection.check();
  assert.equal(statuses.at(-1), 'current');
});
