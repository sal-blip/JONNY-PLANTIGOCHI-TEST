import { HOUR, WEEK } from '../src/game.js';
import { testAPI } from './testPush.js';
const supportedEndpoint = [
  ['fcm.googleapis.com', '/'],
  ['updates.push.services.mozilla.com', '/'],
  ['web.push.apple.com', '/'],
  ['notify.windows.com', '/'],
  ['notify.live.net', '/'],
];

export function pushTarget(value) {
  if (typeof value !== 'string' || value.length > 3000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash || url.pathname.length < 3) return null;
    const allowed = supportedEndpoint.some(([host]) => url.hostname === host || url.hostname.endsWith('.' + host));
    return allowed ? url.href : null;
  } catch { return null; }
}
function base64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function digest(text) { return base64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))); }
function json(obj, status = 200) {
  return Response.json(obj, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options':'nosniff' } });
}
async function authorization(endpoint, env, origin, now) {
  const enc = value => base64(new TextEncoder().encode(JSON.stringify(value)));
  const header = enc({ typ: 'JWT', alg: 'ES256' });
  const claims = enc({ aud: new URL(endpoint).origin, exp: Math.floor(now/1000) + 3600, sub: origin });
  const input = header + '.' + claims;
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.PUSH_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(input));
  return 'vapid t=' + input + '.' + base64(sig) + ', k=' + env.PUSH_PUBLIC_KEY;
}

// A tick accepts no recipients, messages or times. A player authorizes one reminder
// at registration. Only due, unexpired, unclaimed reminders can leave the queue.
async function dispatch(env, origin, send) {
  const now = Date.now();
  await env.DB.prepare('DELETE FROM alert_receipts WHERE expires<=?').bind(now).run();
  const due = await env.DB.prepare('SELECT id, owner, event_id, expires, endpoint, due, attempts FROM reminders WHERE next_try <= ? ORDER BY next_try LIMIT 25').bind(now).all();
  let sent = 0;
  for (const item of due.results) {
    const lock = now + 120000;
    const claim = await env.DB.prepare('UPDATE reminders SET next_try=?, attempts=attempts+1 WHERE id=? AND due=? AND event_id IS ? AND next_try<=?').bind(lock,item.id,item.due,item.event_id,now).run();
    if (!claim.meta.changes) continue;
    const deletion=()=>env.DB.prepare('DELETE FROM reminders WHERE id=? AND due=? AND event_id IS ? AND next_try=?').bind(item.id,item.due,item.event_id,lock);
    const remove=()=>deletion().run();
    if ((item.expires!=null && now>=item.expires) || now-item.due >= 24*HOUR || item.attempts >= 5) { await remove(); continue; }
    try {
      const auth = await authorization(item.endpoint,env,origin,now);
      const result = await send(item.endpoint,{method:'POST',redirect:'error',headers:{Authorization:auth,TTL:'1800',Urgency:'normal',Topic:item.id.endsWith('.fungus') ? 'plantigochi-fungus' : item.id.endsWith('.care') ? 'plantigochi-care' : item.id.endsWith('.company') ? 'plantigochi-company' : 'plantigochi-growth'},body:new Uint8Array()});
      if (result.ok || [400,404,410].includes(result.status)) {
        if (result.ok) sent++;
        if(item.event_id && result.ok)await env.DB.batch([
          env.DB.prepare('INSERT OR REPLACE INTO alert_receipts(id,owner,expires) VALUES(?,?,?)').bind(item.event_id,item.owner,now+WEEK+24*HOUR),deletion()
        ]);
        else await remove();
        continue;
      }
    } catch { /* A temporary failure releases on the next eligible tick. */ }
    const retry = now + Math.min(HOUR, 60000 * 2 ** item.attempts);
    await env.DB.prepare('UPDATE reminders SET next_try=? WHERE id=? AND due=? AND event_id IS ? AND next_try=?').bind(retry,item.id,item.due,item.event_id,lock).run();
  }
  return json({ processed: due.results.length, sent });
}

export async function reminderAPI(request, env, send = fetch, ctx) {
  const url = new URL(request.url);
  if (!env.DB || !env.PUSH_PUBLIC_KEY || !env.PUSH_PRIVATE_JWK) return json({ error: 'Alerts are unavailable.' },503);
  if (request.method === 'GET' && url.pathname === '/api/alerts/key') return json({publicKey:env.PUSH_PUBLIC_KEY});
  if (request.method === 'POST' && url.pathname === '/api/alerts/dispatch') return dispatch(env, url.origin, send);
  const test=url.pathname==='/api/alerts/test';
  if (!test && (url.pathname !== '/api/alerts/reminder' || !['PUT','DELETE'].includes(request.method))) return json({},404);

  if ((request.method!=='GET' || request.headers.has('Origin')) && request.headers.get('Origin') !== url.origin) return json({},403);
  const secret = (request.headers.get('Authorization') || '').replace(/^Bearer /,'');
  if (!/^[a-f0-9]{64}$/.test(secret)) return json({},401);
  const owner = await digest(secret);
  if(test)return testAPI(request,env,owner,send,ctx,authorization,json);
  if (request.method === 'DELETE') {
    await env.DB.batch([env.DB.prepare('DELETE FROM reminders WHERE owner IN (?,?,?,?)').bind(owner,owner+'.care',owner+'.company',owner+'.fungus'),env.DB.prepare('DELETE FROM alert_devices WHERE owner=?').bind(owner)]);
    return json({ cancelled: true });
  }
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({},415);
  const raw = await request.text();
  if (raw.length > 5000) return json({},413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({},400); }
  const endpoint = pushTarget(body?.endpoint), now=Date.now();
  if (!endpoint || !body || !Object.hasOwn(body,'due')) return json({error:'Invalid reminder.'},400);
  const id = await digest(endpoint);
  const slots = [[id,owner,body.due]];
  if (Object.hasOwn(body,'criticalDue')) slots.push([id+'.care',owner+'.care',body.criticalDue]);
  if (Object.hasOwn(body,'companyDue')) slots.push([id+'.company',owner+'.company',body.companyDue]);
  if(Object.hasOwn(body,'fungusDue'))slots.push([id+'.fungus',owner+'.fungus',body.fungusDue]);
  const names=['due','criticalDue','companyDue','fungusDue'];
  const fieldForKey=k=>names[k.endsWith('.care')?1:k.endsWith('.company')?2:k.endsWith('.fungus')?3:0];
  const statements = [];
  if(body.keys){
    const {p256dh,auth}=body.keys;
    if(typeof p256dh!=='string' || typeof auth!=='string' || !/^[A-Za-z0-9_-]{87}$/.test(p256dh) || !/^[A-Za-z0-9_-]{22}$/.test(auth))return json({error:'Invalid subscription keys.'},400);
    const existing=await env.DB.prepare('SELECT owner FROM alert_devices WHERE endpoint=?').bind(endpoint).first();
    if(existing && existing.owner!==owner)return json({error:'Reconnect this subscription.'},409);
    statements.push(env.DB.prepare('INSERT INTO alert_devices(owner,endpoint,p256dh,auth) VALUES(?,?,?,?) ON CONFLICT(owner) DO UPDATE SET endpoint=excluded.endpoint,p256dh=excluded.p256dh,auth=excluded.auth').bind(owner,endpoint,p256dh,auth));
  }
  if(body.expires!=null && !Number.isSafeInteger(body.expires))return json({error:'Invalid expiry.'},400);
  for (const [key,slot,time] of slots) {
    const event=body.eventIds?.[fieldForKey(key)];
    if(event!=null && (typeof event!=='string' || !event.length || event.length>220))return json({error:'Invalid event.'},400);
    const eventId=event?await digest(slot+'|'+event):null;
    if (time === null || (eventId && (time<=now-24*HOUR || (body.expires!=null && body.expires<=now)))) {
      statements.push(env.DB.prepare('DELETE FROM reminders WHERE owner=?').bind(slot));
      continue;
    }
    if (!Number.isSafeInteger(time) || (!eventId && time < now-5*60000) || time > now+WEEK+5*60000) return json({error:'Invalid reminder.'},400);
    statements.push(env.DB.prepare('DELETE FROM reminders WHERE owner=? AND (id!=? OR (? IS NOT NULL AND event_id IS NOT NULL AND event_id!=?))').bind(slot,key,eventId,eventId));
    statements.push(env.DB.prepare(`INSERT INTO reminders (id,owner,endpoint,due,next_try,attempts,event_id,expires)
      SELECT ?,?,?,?,?,0,?,? WHERE NOT EXISTS (SELECT 1 FROM alert_receipts WHERE id=?)
      ON CONFLICT(id) DO UPDATE SET due=excluded.due,next_try=CASE WHEN reminders.due=excluded.due AND reminders.event_id IS excluded.event_id THEN reminders.next_try ELSE excluded.next_try END,
      expires=excluded.expires,attempts=CASE WHEN reminders.due=excluded.due AND reminders.event_id IS excluded.event_id THEN reminders.attempts ELSE 0 END,event_id=excluded.event_id
      WHERE reminders.owner=excluded.owner`).bind(key,slot,endpoint,time,time,eventId,body.expires??null,eventId));

  }
  await env.DB.batch(statements);
  const next=await env.DB.prepare('SELECT MIN(due) AS due FROM reminders WHERE owner IN (?,?,?,?)').bind(owner,owner+'.care',owner+'.company',owner+'.fungus').first();
  return json({ scheduled:true,nextDue:next?.due??null });
}
