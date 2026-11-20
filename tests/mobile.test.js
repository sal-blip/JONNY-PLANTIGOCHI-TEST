import test from 'node:test';
import assert from 'node:assert/strict';
import {readPlant,restore,newPlant,care,HOUR,DAY,WEEK} from '../src/game.js';
import {pushTarget,reminderAPI} from '../server/reminders.js';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';

test('backup rejects bad files and restores an older watered seed', () => {
  assert.equal(readPlant('not a save'),null);
  assert.equal(readPlant('{"version":1,"stage":"sprout"}'),null);
  const p=care(newPlant(0),'water',12);
  assert.equal(readPlant(JSON.stringify(p),HOUR+5).stage,'sprout');
  assert.equal(restore('bad',11),null);
});
test('push destination is restricted to HTTPS browser push services', () => {
  const apple='https://web.push.apple.com/example';
  assert.equal(pushTarget(apple),apple);
  for (const bad of ['https://localhost/x','https://fcm.googleapis.com.example.org/x','https://example.org@web.push.apple.com/x','http://fcm.googleapis.com/x','https://fcm.googleapis.com:444/x']) assert.equal(pushTarget(bad),null);
});

function testDB(){
  const sqlite = new DatabaseSync(':memory:');
  const migration=fs.readdirSync('drizzle').find(s=>s.endsWith('.sql'));
  sqlite.exec(fs.readFileSync('drizzle/'+migration,'utf8'));
  return {
    prepare(sql){ return {bind(...args){const q=sqlite.prepare(sql);return {
      async all(){return {results:q.all(...args)};}, async run(){return {meta:q.run(...args)};}
    };}};},
    async batch(statements){for(const s of statements) await s.run();},
  };
}
test('a player can schedule, cancel, and receive one due notification', async () => {
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const env={DB:testDB(),PUSH_PRIVATE_JWK:JSON.stringify(await crypto.subtle.exportKey('jwk',pair.privateKey)),PUSH_PUBLIC_KEY:Buffer.from(await crypto.subtle.exportKey('raw',pair.publicKey)).toString('base64url')};
  const origin='https://garden.example',token='aa'.repeat(32), endpoint='https://fcm.googleapis.com/fcm/send/test-subscription';
  let count=0;
  async function send(url, init){
    assert.equal(url,endpoint);assert.equal(init.redirect,'error');
    assert(init.headers.Authorization.startsWith('vapid t='));
    count++;return new Response(null,{status:201});
  }
  const call=(method,path,body,device=token)=>reminderAPI(new Request(origin+path,{method,headers:{Origin:origin,Authorization:'Bearer '+device,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}),env,send);
  const tick=()=>call('POST','/api/alerts/dispatch');
  const set=(due)=>call('PUT','/api/alerts/reminder',{endpoint,due});
  for (const delay of [HOUR, 3*DAY, 5*DAY, WEEK]) {
    assert.equal((await set(Date.now()+delay)).status,200);
    assert.equal((await (await tick()).json()).sent,0);
  }
  assert.equal((await set(Date.now()+WEEK+HOUR)).status,400);
  await call('DELETE','/api/alerts/reminder');
  await set(Date.now()-2000);
  await call('DELETE','/api/alerts/reminder',undefined,'bb'.repeat(32));
  assert.equal((await (await tick()).json()).sent,1);
  assert.equal((await (await tick()).json()).sent,0);
  assert.equal(count,1);
  await call('PUT','/api/alerts/reminder',{endpoint,due:null,companyDue:Date.now()-1500});
  assert.equal((await (await tick()).json()).sent,1);
  await call('PUT','/api/alerts/reminder',{endpoint,due:null,companyDue:Date.now()-1500});
  await call('DELETE','/api/alerts/reminder');assert.equal((await (await tick()).json()).sent,0);
  const when=Date.now()-1000;
  assert.equal((await call('PUT','/api/alerts/reminder',{endpoint,due:when,criticalDue:when})).status,200);
  assert.equal((await (await tick()).json()).sent,2);
  await call('PUT','/api/alerts/reminder',{endpoint,due:when,criticalDue:when});
  await call('PUT','/api/alerts/reminder',{endpoint,due:when,criticalDue:null});
  assert.equal((await (await tick()).json()).sent,1);
  await call('PUT','/api/alerts/reminder',{endpoint,due:when,criticalDue:when});
  await call('DELETE','/api/alerts/reminder');
  assert.equal((await (await tick()).json()).sent,0);
});

test('the service worker shows the right care warning and suppresses duplicate and stale alerts', async () => {
  const {runInNewContext} = await import('node:vm');
  const entries = new Map(), shown = [];
  const cache = {
    match:async key => entries.get(key)?.clone(),
    put:async (key,response) => entries.set(key,response),
  };
  let onPush;
  const self = {addEventListener:(name,handler)=>{if(name==='push') onPush=handler;},
    registration:{showNotification:async(title,options)=>shown.push([title,options.tag])}};
  runInNewContext(fs.readFileSync('public/plant-alerts.js','utf8'),{self,caches:{open:async()=>cache},Response,Date});
  const push=()=>new Promise((resolve,reject)=>onPush({waitUntil:p=>p.then(resolve,reject)}));
  await push();assert.equal(shown.length,0);
  const now=Date.now();
  const record=(reason,due,criticalDue,expires)=>cache.put('/notice-schedule',Response.json({reason,due,criticalDue,expires}));
  await record('thirst',now+HOUR,now-2000,now+12*HOUR);
  await push();await push();assert.deepEqual(shown,[['Your Monstera is very thirsty','plantigochi-care']]);
  await record('rot',now-3000,now-1500,now+HOUR);
  await push();assert.deepEqual(shown.slice(1).map(x=>x[1]),['plantigochi-care']);
  assert.match(shown[1][0],/drainage/);
  await record('thirst',null,now-10000,now-1);await push();assert.equal(shown.length,2);
  const company={id:'test',companyDue:now-1000,companyAt:now-11*HOUR};
  await cache.put('/notice-schedule',Response.json(company));
  await push();await push();assert.equal(shown.length,3);assert.equal(shown[2][1],'plantigochi-company');
  await cache.put('/notice-schedule',Response.json({...company,companyAt:now-10*HOUR}));await push();assert.equal(shown.length,3);
  await cache.put('/notice-schedule',Response.json({disabled:true}));await push();assert.equal(shown.length,3);
});
