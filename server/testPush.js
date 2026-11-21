// aes128gcm Web Push records (RFC 8291). Bare wake-ups do not carry test identity.
const utf8=new TextEncoder();
function concat(...parts){
  const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));
  let offset=0;
  for(const part of parts){out.set(part,offset);offset+=part.length;}
  return out;
}
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function derive(ikm,salt,info,length){
  const key=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8));
}
async function encrypt(device,payload){
  const client=bytes(device.p256dh),params={name:'ECDH',namedCurve:'P-256'};
  const recipient=await crypto.subtle.importKey('raw',client,params,false,[]);
  const sender=await crypto.subtle.generateKey(params,true,['deriveBits']);
  const pub=new Uint8Array(await crypto.subtle.exportKey('raw',sender.publicKey));
  const shared=await crypto.subtle.deriveBits({name:'ECDH',public:recipient},sender.privateKey,256);
  const ikm=await derive(shared,bytes(device.auth),concat(utf8.encode('WebPush: info\0'),client,pub),32);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const cek=await derive(ikm,salt,utf8.encode('Content-Encoding: aes128gcm\0'),16);
  const iv=await derive(ikm,salt,utf8.encode('Content-Encoding: nonce\0'),12);
  const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
  const record=concat(utf8.encode(JSON.stringify(payload)),Uint8Array.of(2));
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,record));
  return concat(salt,Uint8Array.of(0,0,16,0,pub.length),pub,ciphertext);
}
export async function testAPI(request,env,owner,send,ctx,authorization,json){
  const select=()=>env.DB.prepare('SELECT * FROM alert_devices WHERE owner=?').bind(owner).first();
  const device=await select();
  if(!device)return json({error:'Enable plant alerts on this device first.'},409);
  if(request.method==='GET'){
    const steps=[device.first_status,device.second_status];
    const status=steps.every(s=>s==='sent')?'sent':steps.includes('failed')?'failed':steps.some(s=>s==='sent'||s==='sending')?'sending':'queued';
    return json({testId:device.test_id,startedAt:device.test_at,status,steps});
  }
  if(request.method!=='POST')return json({},405);
  const {testId}=await request.json().catch(()=>({})) || {};
  if(typeof testId!=='string'||!/^[0-9a-f-]{36}$/i.test(testId))return json({error:'Invalid test.'},400);
  if(!ctx?.waitUntil)return json({error:'Background delivery unavailable.'},503);
  const now=Date.now();
  const claim=await env.DB.prepare("UPDATE alert_devices SET test_id=?,test_at=?,first_status='queued',second_status='queued' WHERE owner=? AND (test_at IS NULL OR test_at<=?)").bind(testId,now,owner,now-60000).run();
  if(!claim.meta.changes)return json({error:'Wait one minute before another test.'},429);
  async function deliver(step,delay){
    await new Promise(resolve=>setTimeout(resolve,Math.max(0,now+delay-Date.now())));
    const column=step===1?'first_status':'second_status';
    const update=status=>env.DB.prepare('UPDATE alert_devices SET '+column+'=? WHERE owner=? AND endpoint=? AND test_id=?').bind(status,owner,device.endpoint,testId).run();
    if(!(await update('sending')).meta.changes)return;
    try{
      const body=await encrypt(device,{type:'test',testId,step});
      const auth=await authorization(device.endpoint,env,new URL(request.url).origin,Date.now());
      const result=await send(device.endpoint,{method:'POST',redirect:'error',headers:{Authorization:auth,TTL:'90',Urgency:'high',
        Topic:'plantigochi-test-'+step,'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream'},body});
      await update(result.ok?'sent':'failed');
    }catch{await update('failed');}
  }
  ctx.waitUntil(Promise.all([deliver(1,5000),deliver(2,15000)]));
  return json({testId,startedAt:now,status:'queued',steps:['queued','queued']},202);
}
