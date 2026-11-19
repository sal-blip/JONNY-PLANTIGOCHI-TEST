import test from 'node:test';
import assert from 'node:assert/strict';
import {readPlant,restore,newPlant,care,HOUR} from '../src/game.js';
import {pushTarget,reminderAPI} from '../server/reminders.js';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';

test('backup rejects bad files and restores an older watered seed', () => {
  assert.equal(readPlant('not a save'),null);
  assert.equal(readPlant('{"version":1,"stage":"sprout"}'),null);
  const p=care(newPlant(0),'water',12);
  assert.equal(readPlant(JSON.stringify(p),HOUR+5).stage,'sprout');
  assert.equal(restore('bad',11).plantedAt,11);
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
  await set(Date.now()+HOUR);assert.equal((await (await tick()).json()).sent,0);
  await call('DELETE','/api/alerts/reminder');
  await set(Date.now()-2000);
  await call('DELETE','/api/alerts/reminder',undefined,'bb'.repeat(32));
  assert.equal((await (await tick()).json()).sent,1);
  assert.equal((await (await tick()).json()).sent,0);
  assert.equal(count,1);
});
