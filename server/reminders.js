const HOUR = 3600000;
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
  const due = await env.DB.prepare('SELECT id, endpoint, due, attempts FROM reminders WHERE next_try <= ? ORDER BY next_try LIMIT 25').bind(now).all();
  let sent = 0;
  for (const item of due.results) {
    const lock = now + 120000;
    const claim = await env.DB.prepare('UPDATE reminders SET next_try=?, attempts=attempts+1 WHERE id=? AND due=? AND next_try<=?').bind(lock,item.id,item.due,now).run();
    if (!claim.meta.changes) continue;
    const remove = () => env.DB.prepare('DELETE FROM reminders WHERE id=? AND due=? AND next_try=?').bind(item.id,item.due,lock).run();
    if (now-item.due >= 24*HOUR || item.attempts >= 5) { await remove(); continue; }
    try {
      const auth = await authorization(item.endpoint,env,origin,now);
      const result = await send(item.endpoint,{method:'POST',redirect:'error',headers:{Authorization:auth,TTL:'1800',Urgency:'normal',Topic:'plantigochi-sprout'},body:new Uint8Array()});
      if (result.ok || [400,404,410].includes(result.status)) {
        if (result.ok) sent++;
        await remove(); continue;
      }
    } catch { /* A temporary failure releases on the next eligible tick. */ }
    const retry = now + Math.min(HOUR, 60000 * 2 ** item.attempts);
    await env.DB.prepare('UPDATE reminders SET next_try=? WHERE id=? AND due=? AND next_try=?').bind(retry,item.id,item.due,lock).run();
  }
  return json({ processed: due.results.length, sent });
}

export async function reminderAPI(request, env, send = fetch) {
  const url = new URL(request.url);
  if (!env.DB || !env.PUSH_PUBLIC_KEY || !env.PUSH_PRIVATE_JWK) return json({ error: 'Alerts are unavailable.' },503);
  if (request.method === 'GET' && url.pathname === '/api/alerts/key') return json({publicKey:env.PUSH_PUBLIC_KEY});
  if (request.method === 'POST' && url.pathname === '/api/alerts/dispatch') return dispatch(env, url.origin, send);
  if (url.pathname !== '/api/alerts/reminder' || !['PUT','DELETE'].includes(request.method)) return json({},404);

  if (request.headers.get('Origin') !== url.origin) return json({},403);
  const secret = (request.headers.get('Authorization') || '').replace(/^Bearer /,'');
  if (!/^[a-f0-9]{64}$/.test(secret)) return json({},401);
  const owner = await digest(secret);
  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM reminders WHERE owner=?').bind(owner).run();
    return json({ cancelled: true });
  }
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({},415);
  const raw = await request.text();
  if (raw.length > 5000) return json({},413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({},400); }
  const endpoint = pushTarget(body?.endpoint), now=Date.now(), due = body?.due;
  if (!endpoint || !Number.isSafeInteger(due) || due < now-5*60000 || due > now+HOUR+5*60000) return json({error:'Invalid reminder.'},400);
  const id = await digest(endpoint);
  const q = env.DB.prepare('INSERT INTO reminders (id, owner, endpoint, due, next_try, attempts) VALUES (?,?,?,?,?,0) ON CONFLICT(id) DO UPDATE SET due=excluded.due, next_try=excluded.next_try, attempts=0 WHERE reminders.owner=excluded.owner AND reminders.due!=excluded.due');
  // The same token owns at most one endpoint, even if the browser rotates subscriptions.
  await env.DB.batch([env.DB.prepare('DELETE FROM reminders WHERE owner=? AND id!=?').bind(owner,id),q.bind(id,owner,endpoint,due,due)]);
  return json({ scheduled: true });
}
