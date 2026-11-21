import assert from 'node:assert/strict';
import {createHash, hkdfSync} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {reminderAPI} from '../server/reminders.js';
import {newPlant} from '../src/game.js';

const origin = 'https://garden.example';
const endpoint = 'https://web.push.apple.com/plantigochi-test-device';
const owner = 'ab'.repeat(32);
const otherOwner = 'cd'.repeat(32);
const minute = 60_000;
const hour = 60 * minute;

function database(sqlite) {
  function statement(sql, values = []) {
    const query = sqlite.prepare(sql);
    return {
      bind: (...args) => statement(sql, args),
      first: async column => {
        const row = query.get(...values);
        return column === undefined ? row ?? null : row?.[column] ?? null;
      },
      all: async () => ({results: query.all(...values)}),
      run: async () => ({meta: query.run(...values)}),
    };
  }
  return {
    prepare: sql => statement(sql),
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const entry of statements) results.push(await entry.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

// Read a single-record RFC 8188 / RFC 8291 message as the enrolled phone would.
async function decryptedPush(body, devicePrivate, keys) {
  const message = Buffer.from(await new Response(body).arrayBuffer());
  const salt = message.subarray(0, 16);
  const keyEnd = 21 + message[20];
  const senderPublic = message.subarray(21, keyEnd);
  const sender = await crypto.subtle.importKey('raw', senderPublic, {name:'ECDH', namedCurve:'P-256'}, false, []);
  const shared = await crypto.subtle.deriveBits({name:'ECDH', public:sender}, devicePrivate, 256);
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), Buffer.from(keys.p256dh, 'base64url'), senderPublic]);
  const ikm = hkdfSync('sha256', shared, Buffer.from(keys.auth, 'base64url'), info, 32);
  const cek = hkdfSync('sha256', ikm, salt, 'Content-Encoding: aes128gcm\0', 16);
  const nonce = hkdfSync('sha256', ikm, salt, 'Content-Encoding: nonce\0', 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plaintext = Buffer.from(await crypto.subtle.decrypt({name:'AES-GCM', iv:nonce}, key, message.subarray(keyEnd)));
  let delimiter = plaintext.length - 1;
  while (delimiter > 0 && plaintext[delimiter] === 0) delimiter--;
  assert.equal(plaintext[delimiter], 2);
  return JSON.parse(plaintext.subarray(0, delimiter).toString('utf8'));
}

async function fixture(t, seedLegacyRows, providerReply = () => new Response(null, {status:201})) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  const migrations = new URL('../drizzle/', import.meta.url);
  for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrations), 'utf8'));
    if (file === '0000_plant_alerts.sql') seedLegacyRows?.(sqlite);
  }
  const vapid = await crypto.subtle.generateKey({name:'ECDSA', namedCurve:'P-256'}, true, ['sign','verify']);
  const device = await crypto.subtle.generateKey({name:'ECDH', namedCurve:'P-256'}, true, ['deriveBits']);
  const rawPublic = async key => Buffer.from(await crypto.subtle.exportKey('raw', key)).toString('base64url');
  const keys = {
    p256dh: await rawPublic(device.publicKey),
    auth: Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url'),
  };
  const env = {
    DB: database(sqlite),
    PUSH_PRIVATE_JWK: JSON.stringify(await crypto.subtle.exportKey('jwk', vapid.privateKey)),
    PUSH_PUBLIC_KEY: await rawPublic(vapid.publicKey),
  };
  const sends = [];
  const background = [];
  async function call(method, path, body, token = owner) {
    const request = new Request(origin + path, {
      method, headers:{Origin:origin, Authorization:'Bearer ' + token, 'Content-Type':'application/json'},
      body:body === undefined ? undefined : JSON.stringify(body),
    });
    return reminderAPI(request, env, async (url, init) => {
      sends.push({url, init});
      return providerReply(sends.length);
    }, {waitUntil: promise => background.push(promise)});
  }
  return {
    sends, background, keys,
    readPush: body => decryptedPush(body, device.privateKey, keys),
    put: (body, token) => call('PUT', '/api/alerts/reminder', {endpoint, due:null, ...body}, token),
    cancel: token => call('DELETE', '/api/alerts/reminder', undefined, token),
    async tick() {
      const response = await call('POST', '/api/alerts/dispatch');
      assert.equal(response.status, 200);
      return (await response.json()).sent;
    },
    testPush: (testId, token) => call('POST', '/api/alerts/test', {testId}, token),
    status: token => call('GET', '/api/alerts/test', undefined, token),
  };
}

test('an existing unkeyed queue entry remains deliverable after all migrations', async t => {
  const app = await fixture(t, sqlite => {
    const digest = value => createHash('sha256').update(value).digest('base64url');
    const due = Date.now() - minute;
    sqlite.prepare('INSERT INTO reminders (id,owner,endpoint,due,next_try,attempts) VALUES (?,?,?,?,?,0)')
      .run(digest(endpoint) + '.care', digest(owner) + '.care', endpoint, due, due);
  });
  assert.equal(await app.tick(), 1);
  assert.equal(app.sends[0].url, endpoint);
  assert.equal(await app.tick(), 0);
});

test('a completed reminder stays delivered when the same event is synced again', async t => {
  const app = await fixture(t);
  const now = Date.now();
  const schedule = {
    due:now - 1000,
    eventIds:{due:'garden-monstera-sprout-1'},
    expires:now + hour,
  };
  assert.equal((await app.put(schedule)).status, 200);
  assert.equal(await app.tick(), 1);
  assert.equal((await app.put(schedule)).status, 200);
  assert.equal(await app.tick(), 0);
  assert.equal((await app.put({...schedule, due:now - 500})).status, 200);
  assert.equal(await app.tick(), 0);
  assert.equal((await app.put({
    ...schedule, due:now - 500, eventIds:{due:'garden-monstera-young-2'},
  })).status, 200);
  assert.equal(await app.tick(), 1);
  assert.equal(app.sends.length, 2);
  await app.put({...schedule, eventIds:{due:'another-pending-event'}});
  await app.put(schedule);
  assert.equal(await app.tick(), 0, 'a delivered event supersedes any different pending event in its slot');
});

test('sync after reopening retains an overdue unresolved reminder until dispatch', async t => {
  const app = await fixture(t);
  const start = Date.now();
  let clock = start;
  t.mock.method(Date, 'now', () => clock);
  const schedule = {
    criticalDue:start + minute,
    eventIds:{criticalDue:'garden-monstera-thirst-1'},
    expires:start + 12 * hour,
  };
  assert.equal((await app.put(schedule)).status, 200);
  assert.equal(await app.tick(), 0);
  clock += hour;
  assert.equal((await app.put(schedule)).status, 200);
  assert.equal(await app.tick(), 1);
  assert.equal((await app.put(schedule)).status, 200);
  assert.equal(await app.tick(), 0);
});

test('client projection retains overdue care and fungus times, with stable event identities', async () => {
  const {reminderRequest, reminderSchedule} = await import('../src/reminderSchedule.js');
  const now = Date.now();
  const lastDrink = now - 13 * hour;
  const plant = {
    ...newPlant(lastDrink), stage:'sprout', lastDrink, wateredAt:lastDrink, fungusAt:now - 7 * hour,
    fedAt:now, litAt:now, companyAt:now,
  };
  const schedule = reminderSchedule(plant, false);
  const keys = {p256dh:'device-public-key', auth:'device-auth-secret'};
  const subscription = {endpoint, toJSON:() => ({endpoint, keys})};
  const body = reminderRequest(schedule, subscription);
  assert.equal(body.endpoint, endpoint);
  assert.deepEqual(body.keys, keys);
  assert.ok(schedule.criticalDue < now && schedule.criticalDue > 0);
  assert.equal(body.criticalDue, schedule.criticalDue);
  assert.ok(schedule.fungusDue <= now && schedule.fungusDue > 0);
  assert.equal(body.fungusDue, schedule.fungusDue);
  assert.ok(body.expires > now);
  assert.equal(body.expires, schedule.expires);
  const again = reminderRequest(reminderSchedule({...plant}, false), subscription);
  for (const slot of ['criticalDue','fungusDue']) {
    assert.ok(body.eventIds[slot]);
    assert.equal(again.eventIds[slot], body.eventIds[slot]);
  }
  const cured = reminderRequest(reminderSchedule({...plant, fungusAt:null}, false), subscription);
  assert.equal(cured.fungusDue, null);
});

test('Apple reminder requests reuse their VAPID JWT and rotate before its expiry', async t => {
  const app=await fixture(t);
  const start=Date.now();
  let clock=start;
  t.mock.method(Date,'now',()=>clock);
  async function reminder(delay){
    clock=start+delay;
    assert.equal((await app.put({due:clock})).status,200);
    assert.equal(await app.tick(),1);
    return app.sends.at(-1).init.headers.Authorization;
  }
  const first=await reminder(0);
  assert.equal(await reminder(hour-1),first);
  assert.equal(await reminder(10*hour),first);
  assert.notEqual(await reminder(11*hour),first);
  const match=/^vapid t=([^,]+), k=(.+)$/.exec(first);
  const [header,claims,signature]=match[1].split('.');
  const key=await crypto.subtle.importKey('raw',Buffer.from(match[2],'base64url'),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  assert.ok(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,Buffer.from(signature,'base64url'),Buffer.from(header+'.'+claims)));
  const decoded=JSON.parse(Buffer.from(claims,'base64url'));
  assert.equal(decoded.aud,'https://web.push.apple.com');
  assert.equal(decoded.sub,origin);
  assert.equal(decoded.exp,Math.floor(start/1000)+12*3600);
});

test('clearing the fungus slot preserves a different due reminder', async t => {
  const app = await fixture(t);
  const start = Date.now();
  let clock = start;
  t.mock.method(Date, 'now', () => clock);
  const schedule = {
    due:start + minute, fungusDue:start + minute,
    eventIds:{due:'garden-monstera-sprout', fungusDue:'garden-monstera-fungus-1'},
    expires:start + hour,
  };
  assert.equal((await app.put(schedule)).status, 200);
  assert.equal((await app.put({...schedule, fungusDue:null})).status, 200);
  clock += 2 * minute;
  assert.equal(await app.tick(), 1);
  assert.equal(app.sends[0].init.headers.Topic, 'plantigochi-growth');
  assert.equal((await app.put({
    due:null, fungusDue:clock, eventIds:{fungusDue:'garden-monstera-fungus-2'}, expires:start + hour,
  })).status, 200);
  assert.equal(await app.tick(), 1);
  assert.equal(app.sends.length, 2);
  assert.equal((await app.put({
    due:null, fungusDue:clock, eventIds:{fungusDue:'garden-monstera-fungus-3'}, expires:start + hour,
  })).status, 200);
  assert.equal((await app.cancel(owner)).status, 200);
  assert.equal(await app.tick(), 0);
});

test('an enrolled owner gets one rate-limited pair of independent test pushes at five and fifteen seconds', async t => {
  const app = await fixture(t);
  const testId = crypto.randomUUID();
  const otherId = crypto.randomUUID();
  assert.equal((await app.testPush(testId)).status, 409);
  assert.equal((await app.put({due:null})).status, 200);
  assert.equal((await app.testPush(testId)).status, 409);
  assert.equal((await app.put({keys:app.keys})).status, 200);
  assert.equal((await app.put({keys:app.keys}, otherOwner)).status, 409);
  assert.equal((await app.testPush(otherId, otherOwner)).status, 409);
  assert.equal((await app.cancel(otherOwner)).status, 200);

  t.mock.timers.enable({apis:['setTimeout','Date'], now:Date.now()});
  assert.equal((await app.testPush(testId)).status, 202);
  const queued = await (await app.status()).json();
  assert.equal(queued.testId, testId);
  assert.equal(queued.status, 'queued');
  assert.equal((await app.testPush(crypto.randomUUID())).status, 429);
  assert.notEqual((await (await app.status(otherOwner)).json()).testId, testId);
  assert.equal(app.sends.length, 0);
  assert.ok(app.background.length, 'the worker must keep the delayed delivery alive');
  assert.deepEqual(queued.steps, ['queued', 'queued']);
  assert.equal(await app.tick(), 0);
  t.mock.timers.tick(4_999);
  assert.equal(app.sends.length, 0);
  t.mock.timers.tick(1);
  const deadline = performance.now() + 5000;
  let halfway;
  do {
    await new Promise(resolve => setImmediate(resolve));
    halfway = await (await app.status()).json();
  } while (halfway.steps[0] !== 'sent' && performance.now() < deadline);
  assert.deepEqual(halfway.steps, ['sent', 'queued']);
  assert.equal(app.sends.length, 1);
  t.mock.timers.tick(9_999);
  assert.equal(app.sends.length, 1);
  t.mock.timers.tick(1);
  await Promise.all(app.background);
  assert.equal(app.sends.length, 2);
  const topics = app.sends.map(({url, init}) => {
    assert.equal(url, endpoint);
    assert.equal(init.redirect, 'manual');
    const headers = new Headers(init.headers);
    assert.equal(headers.get('Content-Encoding'), 'aes128gcm');
    assert.ok(headers.get('Topic'));
    return headers.get('Topic');
  });
  assert.notEqual(topics[0], topics[1]);
  assert.equal(app.sends[0].init.headers.Authorization,app.sends[1].init.headers.Authorization);
  for (const [index, send] of app.sends.entries()) {
    const message = await app.readPush(send.init.body);
    assert.equal(message.type, 'test');
    assert.equal(message.testId, testId);
    assert.equal(message.step, index + 1);
  }
  assert.equal(await app.tick(), 0);
  const delivered = await (await app.status()).json();
  assert.equal(delivered.testId, testId);
  assert.equal(delivered.status, 'sent');
  assert.deepEqual(delivered.steps, ['sent', 'sent']);
  assert.equal((await app.testPush(crypto.randomUUID())).status, 429);
  assert.equal((await app.cancel(owner)).status, 200);
  assert.equal((await app.testPush(crypto.randomUUID())).status, 409);
});

test('failed test pushes distinguish a provider redirect from a transport failure', async t => {
  const app = await fixture(t, undefined, attempt => {
    if (attempt === 1) return Response.redirect('https://example.com/other', 307);
    throw new TypeError('fetch failed');
  });
  await app.put({keys:app.keys});
  t.mock.timers.enable({apis:['setTimeout','Date'], now:Date.now()});
  await app.testPush(crypto.randomUUID());
  t.mock.timers.tick(5000);
  const deadline = performance.now() + 5000;
  while (!app.sends.length && performance.now() < deadline) {
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(app.sends.length, 1);
  t.mock.timers.tick(10000);
  await Promise.all(app.background);
  assert.deepEqual(app.sends.map(s => [s.url,s.init.redirect]), [[endpoint,'manual'],[endpoint,'manual']]);
  const result = await (await app.status()).json();
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.steps, ['failed','failed']);
  assert.deepEqual(result.reasons, ['http-307','connection']);
});

async function alertWorker(subscription = null) {
  const {runInNewContext} = await import('node:vm');
  const scheduleCache = new Map();
  const displayed = [];
  const navigations = [];
  const handlers = {};
  let plant = null;
  const cache = {
    async put(key, response) { scheduleCache.set(key, response); },
    async match(key) { return scheduleCache.get(key)?.clone(); },
  };
  // The worker reads only the garden's current record.
  const indexedDB = {open() {
    const open = {};
    open.result = {
      objectStoreNames:{contains:name => name === 'garden'}, close() {},
      transaction:() => ({objectStore:() => ({get() {
        const request = {result:JSON.stringify(plant)};
        queueMicrotask(() => request.onsuccess());
        return request;
      }})}),
    };
    queueMicrotask(() => open.onsuccess());
    return open;
  }};
  const self = {
    indexedDB, location:new URL(origin),
    clients:{matchAll:async () => [], openWindow:async url => navigations.push(url)},
    registration:{pushManager:{getSubscription:async()=>subscription},showNotification:async (title, options) => displayed.push({title, options})},
    addEventListener(name, handler) { handlers[name] = handler; },
  };
  runInNewContext(readFileSync(new URL('../public/plant-alerts.js', import.meta.url), 'utf8'), {
    self, caches:{open:async () => cache}, Date, Response, URL,
  });
  function emit(type, event) {
    return new Promise((resolve, reject) => handlers[type]({...event, waitUntil:task => task.then(resolve, reject)}));
  }
  return {
    cache, displayed, navigations, setPlant:next => { plant = next; },
    push:data => emit('push', {data:data && {json:() => data}}),
    click:notification => emit('notificationclick', {notification:{data:notification.options.data, close() {}}}),
  };
}

test('the worker displays two individually labeled test pushes, remembers each, and suppresses inactive tests', async t => {
  const sw = await alertWorker();
  const testId = crypto.randomUUID();
  await sw.cache.put('/notice-schedule', Response.json({awaitingSeed:true}));
  await sw.cache.put('/notice-test-id', new Response(testId));
  const first = {type:'test', testId, step:1};
  const second = {...first, step:2};
  await sw.push({...first, testId:crypto.randomUUID()});
  await sw.push({...first, step:3});
  assert.equal(sw.displayed.length, 0);
  await sw.push(first);
  await sw.push(first);
  await sw.push(second);
  await sw.push(second);
  assert.equal(sw.displayed.length, 2);
  assert.match(sw.displayed[0].title, /1 of 2/);
  assert.match(sw.displayed[0].options.body, /5.second/);
  assert.match(sw.displayed[1].title, /2 of 2/);
  assert.match(sw.displayed[1].options.body, /15.second/);
  assert.notEqual(sw.displayed[0].options.tag, sw.displayed[1].options.tag);
  for (const step of [1,2]) {
    assert.equal(await (await sw.cache.match('/notice-test-received-' + step)).text(), testId);
  }
  await sw.click(sw.displayed[1]);
  assert.deepEqual(sw.navigations, ['/?care=test']);
  const nextId = crypto.randomUUID();
  await sw.cache.put('/notice-test-id', new Response(nextId));
  await sw.cache.put('/notice-schedule', Response.json({disabled:true}));
  await sw.push({...first, testId:nextId});
  assert.equal(sw.displayed.length, 2);
});

test('an enabled Apple subscription presents a harmless update for a stale push', async () => {
  const sw=await alertWorker({endpoint});
  await sw.cache.put('/notice-schedule',Response.json({id:'retired-plant'}));
  await sw.push();
  assert.equal(sw.displayed.length,1);
  assert.equal(sw.displayed[0].options.tag,'plantigochi-garden-update');
  await sw.click(sw.displayed[0]);
  assert.deepEqual(sw.navigations,['/']);
  await sw.cache.put('/notice-schedule',Response.json({disabled:true}));
  await sw.push();
  assert.equal(sw.displayed.length,1);
});

test('fungus notifies once at six hours, opens First Aid, and ignores stale schedules after a cure', async t => {
  const {reminderSchedule} = await import('../src/reminderSchedule.js');
  const sw = await alertWorker();
  const outbreak = Date.now();
  let clock = outbreak;
  t.mock.method(Date, 'now', () => clock);
  const plant = {...newPlant(outbreak - 2 * hour), stage:'sprout', lastDrink:outbreak, fungusAt:outbreak,
    wateredAt:outbreak, fedAt:outbreak, litAt:outbreak, companyAt:outbreak};
  sw.setPlant(plant);
  const schedule = reminderSchedule(plant, false);
  assert.equal(schedule.fungusDue, outbreak + 6 * hour);
  await sw.cache.put('/notice-schedule', Response.json(schedule));
  clock = schedule.fungusDue - 1;
  await sw.push();
  assert.equal(sw.displayed.length, 0);
  clock++;
  sw.setPlant({...plant, fungusAt:null});
  await sw.push();
  assert.equal(sw.displayed.length, 0);
  sw.setPlant(plant);
  await sw.push();
  await sw.push();
  assert.equal(sw.displayed.length, 1);
  assert.equal(sw.displayed[0].options.data.action, 'fungus');
  sw.setPlant({...plant, fungusAt:null});
  await sw.click(sw.displayed[0]);
  assert.equal(sw.navigations.length, 1);
  const target = new URL(sw.navigations[0], origin);
  assert.equal(target.searchParams.get('care'), 'fungus');
  assert.equal(target.searchParams.get('plant'), plant.id);
  assert.equal(target.searchParams.get('episode'), String(outbreak));
});
