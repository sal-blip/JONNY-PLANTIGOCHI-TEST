let pending=Promise.resolve();
const DAY=86400000;
const cached=async(cache,key)=>(await cache.match(key))?.text();
const workKey='reminder-work', syncTag='plantigochi-reminders-v1';
async function gardenDB(){
  if(!self.indexedDB)return null;
  return new Promise(resolve=>{
    const open=self.indexedDB.open('plantigochi.pocket.garden');
    open.onupgradeneeded=()=>open.transaction.abort();
    open.onerror=()=>resolve(null);
    open.onsuccess=()=>{
      const db=open.result;
      if(db.objectStoreNames.contains('garden'))resolve(db);
      else{db.close();resolve(null);}
    };
  });
}
async function readGarden(){
  const db=await gardenDB();
  if(!db)return {};
  try{
    const records=db.transaction('garden').objectStore('garden');
    const read=key=>new Promise((resolve,reject)=>{
      const req=records.get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    const [raw,setup,value]=await Promise.all(['current','setup',workKey].map(read));
    const plant=raw?JSON.parse(raw):null;
    const work=value?.id && value.epoch===(setup?.epoch??null)?value:null;
    return {plant,setup,work};
  }finally{db.close();}
}
function matchesPlant(schedule,plant,clock){
  if(!plant)return !schedule || schedule.awaitingSeed;
  if(!schedule || schedule.id!==plant.id || schedule.stage!==plant.stage)return false;
  const keys=['lastDrink','fedAt','litAt','companyAt','rotAt','fungusAt'];
  return keys.every(k=>(plant[k]??null)===(schedule[k]??null)) &&
    (!clock || Object.keys(clock).every(k=>plant[k]===clock[k]));
}
async function markWork(job,fields){
  const db=await gardenDB();
  if(!db)return false;
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction('garden','readwrite'),store=tx.objectStore('garden'),req=store.get(workKey);
      let applied=false;
      req.onsuccess=()=>{if(req.result?.id===job.id){store.put({...req.result,...fields},workKey);applied=true;}};
      tx.oncomplete=()=>resolve(applied);tx.onabort=()=>reject(tx.error);
    });
  }finally{db.close();}
}

async function submitWork(job,sub){
  const headers={Authorization:'Bearer '+job.token};
  const init={method:job.disabled?'DELETE':'PUT',headers};
  if(!job.disabled){
    const cache=await caches.open('plantigochi-notices');
    const body={...job.body,endpoint:sub.endpoint,keys:sub.toJSON?.().keys};
    if(body.companyDue){
      const last=Number(await cached(cache,'/notice-company-time'))||0;
      const stretch=await cached(cache,'/notice-stretch');
      body.companyDue=stretch===job.schedule.id+'-'+job.schedule.companyAt?null:Math.max(body.companyDue,last+DAY);
    }
    headers['Content-Type']='application/json';init.body=JSON.stringify(body);
  }
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{return await fetch('/api/alerts/reminder',{...init,signal:controller.signal,keepalive:true});}
  finally{clearTimeout(timeout);}
}
// Old windows store their consent and company changes in Cache Storage. A
// successful sync from such a window can follow a newer-version opt-out.
async function newerLegacySettings(cache,legacy,job,plant){
  if(!job || !legacy || legacy.disabled || !matchesPlant(legacy,plant))return false;
  if(!job.disabled && Boolean(legacy.companyDue)===Boolean(job.schedule?.companyDue))return false;
  const ack=await (await cache.match('/notice-ack-v31'))?.json();
  return Number.isFinite(ack?.at) && ack.at>=(job.changedAt ?? job.at ?? 0);
}
async function flushWork(){
  let renewed=false;
  for(let i=0;i<4;i++){
    const {work:job,setup,plant}=await readGarden();
    if(!job || setup?.resetCleanup)return {status:'inactive'};
    const cache=await caches.open('plantigochi-notices');
    const legacy=await (await cache.match('/notice-schedule'))?.json();
    if(!job.disabled && legacy?.disabled)return {status:'suppressed'};
    if(await newerLegacySettings(cache,legacy,job,plant))return {status:'legacy'};
    // An older installed document can write a newer plant and sync it without
    // updating our outbox. Never send older watering deadlines over that save.
    if(!job.disabled && !matchesPlant(job.schedule,plant,job.clock))return {status:'superseded'};
    const manager=self.registration.pushManager;
    let sub=job.disabled?null:await manager?.getSubscription();
    const confirmed={status:'confirmed',id:job.id,signature:job.signature,nextDue:job.nextDue??null,disabled:Boolean(job.disabled)};
    if(!job.disabled && (!sub || sub.endpoint===job.gone))return {status:'expired',id:job.id,endpoint:job.gone || job.endpoint};
    if(job.at && (job.disabled || (job.endpoint===sub.endpoint && (self.navigator?.onLine===false || Date.now()-job.at<60000))))return confirmed;
    if(self.navigator?.onLine===false)return {status:'pending'};
    const result=await submitWork(job,sub);
    if(!job.disabled && result.status===410 && (await result.clone().json()).code==='subscription_expired'){
      const endpoint=sub.endpoint;
      if(!await markWork(job,{gone:endpoint,at:null}))continue;
      const key=sub.options?.applicationServerKey;
      try{
        await sub.unsubscribe();
        if(!renewed && self.Notification?.permission==='granted' && key){
          renewed=true;
          sub=await manager.subscribe({userVisibleOnly:true,applicationServerKey:key});
          if(sub.endpoint!==endpoint)continue;
        }
      }catch{/* Safari may require the player to tap Enable to renew. */}
      return {status:'expired',id:job.id,endpoint};
    }
    if(!result.ok)throw Error('Reminder sync pending.');
    const {nextDue=null}=await result.json();
    if(await markWork(job,{endpoint:sub?.endpoint??null,nextDue,at:Date.now(),gone:null})){
      return {...confirmed,nextDue};
    }
    // A care action committed while the request was in flight. Deliver the
    // latest saved projection as well; never acknowledge it with the old reply.
  }
  return {status:'pending'};
}
let sending;
function syncReminders(){
  if(!sending){
    const locks=self.navigator?.locks;
    sending=Promise.resolve().then(()=>locks?locks.request('plantigochi-reminders',flushWork):flushWork())
      .finally(()=>{sending=null;});
  }
  return sending;
}
function retryOnWake(){
  return syncReminders().catch(()=>{});
}
self.addEventListener('sync',event=>{
  if(event.tag===syncTag)event.waitUntil(syncReminders().then(result=>{
    if(result.status==='pending')throw Error('Retry reminder sync.');
  }));
});
self.addEventListener('activate',event=>event.waitUntil(retryOnWake()));
self.addEventListener('pushsubscriptionchange',event=>event.waitUntil(retryOnWake()));
async function notifyGarden(event, show) {
  const cache=await caches.open('plantigochi-notices');
  const {plant:p,setup,work}=await readGarden();
  const legacy=await (await cache.match('/notice-schedule'))?.json();
  if(setup?.resetCleanup || legacy?.disabled)return 'disabled';
  const preferLegacy=await newerLegacySettings(cache,legacy,work,p);
  if(!preferLegacy && (work?.disabled || work?.gone))return 'disabled';
  const current=work && !preferLegacy && matchesPlant(work.schedule,p,work.clock);
  const schedule=current?(work.schedule || {awaitingSeed:true}):legacy;
  if(!schedule || (!work && setup?.epoch && (!p || (schedule.id && p.id!==schedule.id))))return 'disabled';
  if(event?.type==='test'){
    if(![1,2].includes(event.step) || await cached(cache,'/notice-test-id')!==event.testId)return;
    const receipt='/notice-test-received-'+event.step;
    if(await cached(cache,receipt)===event.testId)return;
    await show('Plantigochi test '+event.step+' of 2',{
      body:event.step===1?'First push · 5-second test':'Second push · 15-second test',
      tag:'plantigochi-test-'+event.step,data:{action:'test'}
    });
    await cache.put(receipt,new Response(event.testId));
    return;
  }
  const now=Date.now();
  if(p!==undefined && (!p || p.id!==schedule.id || p.deadAt!==null))return;
  if(schedule.expires && now>=schedule.expires)return;
  async function notify(kind,title,body,identity,action) {
    const key='/notice-delivered-'+kind;
    if(await cached(cache,key)===identity)return false;
    const data={action};
    if(action==='fungus'){data.plantId=schedule.id;data.episode=schedule.fungusAt;}
    if(action==='water'){data.plantId=schedule.id;data.lastDrink=schedule.lastDrink;}
    await show(title,{body,tag:'plantigochi-'+kind,data});
    await cache.put(key,new Response(identity));return true;
  }
  const id=schedule.id??'legacy';
  if(schedule.fungusDue && now>=schedule.fungusDue && (!p || p.fungusAt===schedule.fungusAt)){
    await notify('fungus','Your plant needs First Aid','Open First Aid and give your plant one drop of G-NAT ASSASSIN.',id+'-'+schedule.fungusAt,'fungus');
  }
  if(schedule.criticalDue && now>=schedule.criticalDue) {
    if(p && (p.lastDrink!==schedule.lastDrink || p.rotAt!==schedule.rotAt))return;
    const rot=schedule.reason==='rot';
    await notify('care',rot?'Your Monstera needs drainage':'Your Monstera is very thirsty',
      rot?'Open Care and drain the pot to save its roots.':'Water it to help it recover.',id+'-'+schedule.criticalDue,rot?'drain':'water');
    return;
  }
  if(!event && schedule.dryDue && now>=schedule.dryDue && schedule.reason==='thirst' &&
     (!p || (p.lastDrink===schedule.lastDrink && p.rotAt===null))){
    await notify('care','Your Monstera is ready for a drink','Open Care to water your plant.',id+'-dry-'+schedule.dryDue,'water');
  }
  const growing=p?.rotAt==null && p?.fungusAt==null && schedule.rotAt==null && schedule.fungusAt==null;
  if(growing && event?.type==='milestone' && event.id===id){
    if(p && p.stage!==event.stage)return;
    await notify('growth','Monstera milestone 🌿','Your Monstera reached '+event.label+'.',id+'-'+event.stage);
    return;
  }
  if(growing && schedule.due && now>=schedule.due){
    if(p && (p.stage!==schedule.stage || p.fedAt!==schedule.fedAt || p.litAt!==schedule.litAt || p.lastDrink!==schedule.lastDrink))return;
    if(await notify('growth','Monstera milestone 🌿','Visit your garden for '+(schedule.next||'its next stage')+'.',id+'-'+(schedule.nextStage||schedule.due)))return;
  }
  if(schedule.companyDue && now>=schedule.companyDue && (!p || p.companyAt===schedule.companyAt)){
    const last=Number(await cached(cache,'/notice-company-time'));
    if(last && now-last<DAY)return;
    await notify('company','A little company?','Say something kind or play a round with your Monstera.',id+'-'+schedule.companyAt);
    if(await cached(cache,'/notice-stretch')!==id+'-'+schedule.companyAt){
      await cache.put('/notice-company-time',new Response(String(now)));
      await cache.put('/notice-stretch',new Response(id+'-'+schedule.companyAt));
    }
  }
}
async function deliver(data,remote){
  let shown=false, result;
  const show=async(title,options)=>{
    await self.registration.showNotification(title,{
      ...options,
      icon:'/icons/icon-192.png',
      badge:'/icons/notification-badge-96.png',
    });
    shown=true;
  };
  result=await notifyGarden(data,show);
  // APNs requires a visible notification for every incoming push on an active subscription.
  // A player may already have handled the care task while the reminder was in flight.
  if(remote && !shown && result!=='disabled'){
    const sub=await self.registration.pushManager?.getSubscription();
    if(sub && new URL(sub.endpoint).hostname.endsWith('.push.apple.com')){
      await show('Plantigochi garden update',{body:'Open your garden to see how your plant is doing.',
        tag:'plantigochi-garden-update'});
    }
  }
}
function queue(event,data,remote=false){
  pending=pending.catch(()=>{}).then(()=>{
    const locks=self.navigator?.locks;
    return locks?locks.request('plantigochi-reminders',()=>deliver(data,remote)):deliver(data,remote);
  });
  event.waitUntil(pending);
}
self.addEventListener('push',event=>{let data;try{data=event.data?.json();}catch{}queue(event,data,true);if(self.navigator)event.waitUntil(retryOnWake());});
self.addEventListener('message',event=>{
  if(event.data?.type==='milestone')queue(event,event.data);
  if(event.data?.type==='sync-plant-reminder')event.waitUntil(syncReminders().catch(()=>({status:'pending'}))
    .then(result=>event.ports?.[0]?.postMessage(result)));
});
function isInstalledWindow(client){
  return new Promise(resolve=>{
    const channel=new MessageChannel();
    const finish=value=>{clearTimeout(timer);channel.port1.close();resolve(value===true);};
    const timer=setTimeout(()=>finish(false),350);
    channel.port1.onmessage=e=>finish(e.data);
    try{client.postMessage({type:'plant-window-mode'},[channel.port2]);}catch{finish(false);}
  });
}
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const action=event.notification.data?.action;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const candidates=windows.filter(c=>new URL(c.url).origin===self.location.origin);
    const installed=await Promise.all(candidates.map(isInstalledWindow));
    const garden=candidates.find((_,i)=>installed[i]);
    if(garden){
      try{
        await garden.focus();
        if(action)garden.postMessage({type:'plant-care',...event.notification.data});
        return;
      }catch{/* The Home Screen window may have closed since it replied. */}
    }
    let path=['drain','water','fungus','test'].includes(action)?'/?care='+action:'/';
    if(action==='water' && event.notification.data.plantId && Number.isSafeInteger(event.notification.data.lastDrink)){
      path+='&plant='+encodeURIComponent(event.notification.data.plantId)+'&drink='+event.notification.data.lastDrink;
    }
    if(action==='fungus')path+='&plant='+encodeURIComponent(event.notification.data.plantId)+'&episode='+event.notification.data.episode;
    return self.clients.openWindow(path);
  })());
});
