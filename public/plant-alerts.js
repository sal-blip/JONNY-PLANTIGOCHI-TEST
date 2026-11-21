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
async function notifyGarden(event, show) {
  const cache=await caches.open('plantigochi-notices');
  const schedule=await (await cache.match('/notice-schedule'))?.json();
  if(schedule?.disabled)return 'disabled';
  if(!schedule)return;
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
  const p=await activePlant(), now=Date.now();
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
  try{
    result=await notifyGarden(data,show);
  }finally{
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
}
function queue(event,data,remote=false){
  pending=pending.catch(()=>{}).then(()=>deliver(data,remote));
  event.waitUntil(pending);
}
self.addEventListener('push',event=>{let data;try{data=event.data?.json();}catch{}queue(event,data,true);});
self.addEventListener('message',event=>{if(event.data?.type==='milestone')queue(event,event.data);});
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
