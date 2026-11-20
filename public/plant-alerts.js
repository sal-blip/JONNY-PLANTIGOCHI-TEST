let pending=Promise.resolve();
const DAY=86400000;
const cached=async(cache,key)=>(await cache.match(key))?.text();
async function activePlant() {
  if(!self.indexedDB)return undefined;
  return new Promise(resolve=>{
    const open=self.indexedDB.open('plantigochi.pocket.garden');
    open.onupgradeneeded=()=>open.transaction.abort();
    open.onerror=()=>resolve(null);
    open.onsuccess=()=>{
      const db=open.result;
      if(!db.objectStoreNames.contains('garden')){db.close();resolve(null);return;}
      const tx=db.transaction('garden'), req=tx.objectStore('garden').get('current');
      req.onsuccess=()=>{try{resolve(JSON.parse(req.result));}catch{resolve(null);}};
      req.onerror=()=>resolve(null);tx.oncomplete=()=>db.close();
    };
  });
}
async function notifyGarden(event) {
  const cache=await caches.open('plantigochi-notices');
  const schedule=await (await cache.match('/notice-schedule'))?.json();
  if(!schedule||schedule.disabled)return;
  const p=await activePlant(), now=Date.now();
  if(p!==undefined && (!p || p.id!==schedule.id || p.deadAt!==null))return;
  if(schedule.expires && now>=schedule.expires)return;
  async function notify(kind,title,body,identity,action) {
    const key='/notice-delivered-'+kind;
    if(await cached(cache,key)===identity)return false;
    await self.registration.showNotification(title,{body,icon:'/icons/icon-192.png',badge:'/leaf.svg',tag:'plantigochi-'+kind,data:{action}});
    await cache.put(key,new Response(identity));return true;
  }
  const id=schedule.id??'legacy';
  if(schedule.criticalDue && now>=schedule.criticalDue) {
    if(p && (p.lastDrink!==schedule.lastDrink || p.rotAt!==schedule.rotAt))return;
    const rot=schedule.reason==='rot';
    await notify('care',rot?'Your Monstera needs drainage':'Your Monstera is very thirsty',
      rot?'Open Care and drain the pot to save its roots.':'Open Care to water your plant.',id+'-'+schedule.criticalDue,rot?'drain':'water');
    return;
  }
  if(event?.type==='milestone' && event.id===id){
    if(p && p.stage!==event.stage)return;
    await notify('growth','Monstera milestone 🌿','Your Monstera reached '+event.label+'.',id+'-'+event.stage);
    return;
  }
  if(schedule.due && now>=schedule.due){
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
function queue(event,data){pending=pending.catch(()=>{}).then(()=>notifyGarden(data));event.waitUntil(pending);}
self.addEventListener('push',event=>queue(event));
self.addEventListener('message',event=>{if(event.data?.type==='milestone')queue(event,event.data);});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const action=event.notification.data?.action;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const garden=windows.find(c=>new URL(c.url).origin===self.location.origin);
    if(garden){await garden.focus();if(action)garden.postMessage({type:'plant-care',action});return;}
    return self.clients.openWindow(action==='drain'||action==='water'?'/?care='+action:'/');
  })());
});
