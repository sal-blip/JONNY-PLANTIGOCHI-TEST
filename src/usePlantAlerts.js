import {useCallback,useEffect,useRef,useState} from 'react';
import {reminderRequest,reminderSchedule} from './reminderSchedule.js';
import {STAGES,STAGE_NAMES} from './game.js';
import {mayChangeAlerts} from './useGardenSave.js';
import {alertKey as KEY,withReminderLock} from './alertCleanup.js';

function device(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}}
function persist(d){localStorage.setItem(KEY,JSON.stringify(d));}
function supported(){return window.isSecureContext && typeof window.Notification?.requestPermission==='function' && 'PushManager' in window && 'serviceWorker' in navigator;}
async function subscriptionKey(){
  const response=await fetch('/api/alerts/key',{cache:'no-store'});
  if(!response.ok)throw Error('Push service unavailable');
  const {publicKey}=await response.json();
  return Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
}
async function api(method,token,body){
  const res=await fetch('/api/alerts/reminder',{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!res.ok)throw Error('Reminder sync failed');
  return res.json();
}

export function usePlantAlerts(plant,offline,epoch){
  const [settings,setSettings]=useState(device),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [verified,setVerified]=useState(null),[retry,bump]=useState(0);
  const [nextDue,setNextDue]=useState(null);
  const lock=useRef(false),work=useRef(Promise.resolve()),last=useRef(plant);
  const capable=supported(),denied=capable && Notification.permission==='denied';
  const optedIn=Boolean(capable && settings.enabled && settings.token && Notification.permission==='granted');
  const apple=capable && (navigator.vendor==='Apple Computer, Inc.' || /iPhone|iPad|iPod/.test(navigator.userAgent));
  const [appleSetup,setAppleSetup]=useState(null);
  const schedule=plant?JSON.stringify(reminderSchedule(plant,settings.company===true)):null;
  const enrolled=optedIn;
  const enabled=Boolean(enrolled && verified?.token===settings.token && verified?.schedule===schedule);


  // Safari needs subscribe() in the tap handler, before any asynchronous work.
  useEffect(()=>{
    if(!apple || appleSetup || optedIn || denied || offline!=='ready' || !navigator.onLine)return;
    let active=true;
    Promise.all([navigator.serviceWorker.ready,subscriptionKey()]).then(([reg,key])=>{
      if(active){setAppleSetup({manager:reg.pushManager,key});setNotice('');}
    }).catch(()=>{if(active)setNotice('Could not connect to plant alerts. We’ll retry automatically.');});
    return ()=>{active=false;};
  },[apple,appleSetup,optedIn,denied,offline,retry]);
  const refresh=useCallback(()=>{setSettings(device());bump(n=>n+1);},[]);
  useEffect(()=>{
    const visible=()=>{if(!document.hidden)refresh();};
    const sync=e=>{if(e.key===KEY)refresh();};
    window.addEventListener('online',refresh);window.addEventListener('offline',refresh);
    window.addEventListener('storage',sync);document.addEventListener('visibilitychange',visible);
    const periodic=setInterval(()=>{if(navigator.onLine && !document.hidden)bump(n=>n+1);},60000);
    return ()=>{clearInterval(periodic);window.removeEventListener('online',refresh);window.removeEventListener('offline',refresh);
      window.removeEventListener('storage',sync);document.removeEventListener('visibilitychange',visible);};
  },[refresh]);
  useEffect(()=>{
    if(!capable || offline!=='ready')return;
    let active=true;
    const run=async()=>{
      if(!active)return;
      const d=device();
      if(!d.token || d.token!==settings.token || Boolean(d.enabled)!==Boolean(settings.enabled))return;
      const cache=await caches.open('plantigochi-notices');
      if(!optedIn){
        setVerified(null);
        await cache.put('/notice-schedule',Response.json({disabled:true}));
        if(navigator.onLine && (d.pendingDelete || d.enabled)){
          await api('DELETE',d.token);
          await cache.delete('/notice-ack-v31');
          await cache.delete('/notice-test-id');
          const current=device();
          if(current.token===d.token && (!current.enabled || Notification.permission!=='granted')){
            const next={...current,enabled:false,pendingDelete:false};persist(next);if(active)setSettings(next);
          }
        }
        return;
      }
      const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
      if(!active)return;
      if(!sub){
        const next={...d,enabled:false,pendingDelete:true};persist(next);setSettings(next);setVerified(null);
        setNotice('Enable alerts again to reconnect this device.');return;
      }
      const data=schedule?JSON.parse(schedule):null;
      const lastNudge=Number(await (await cache.match('/notice-company-time'))?.text()) || 0;
      if(data?.companyDue && lastNudge){
        const stretch=await (await cache.match('/notice-stretch'))?.text();
        data.companyDue=stretch===data.id+'-'+data.companyAt?null:Math.max(data.companyDue,lastNudge+86400000);
      }
      if(!active)return;
      await cache.put('/notice-schedule',Response.json(data || {awaitingSeed:true}));
      const body=reminderRequest(data,sub);
      const signature=JSON.stringify([d.token,body]);
      const ack=await (await cache.match('/notice-ack-v31'))?.json();
      // Refresh the server's next queued time periodically, even after a previous successful PUT.
      if(ack?.signature===signature && (Date.now()-ack.at<60000 || !navigator.onLine)){
        if(active){setVerified({token:d.token,schedule});setNextDue(ack.nextDue);setNotice('');}
        return;
      }
      if(!navigator.onLine){if(active){setVerified(null);setNotice('Sync pending · offline');}return;}
      const result=await api('PUT',d.token,body);
      await cache.put('/notice-ack-v31',Response.json({signature,nextDue:result.nextDue,at:Date.now()}));
      if(active){setVerified({token:d.token,schedule});setNextDue(result.nextDue);setNotice('');}

    };
    work.current=work.current.catch(()=>{}).then(()=>withReminderLock(run)).catch(()=>{
      if(active){setVerified(null);setNotice('Permission granted · reminder sync pending. We’ll retry automatically.');}
    });
    return ()=>{active=false;};
  },[schedule,optedIn,retry,capable,offline,settings.token,settings.enabled,settings.pendingDelete]);
  async function changeEnabled(turnOn){
    if(lock.current||!capable||offline!=='ready')return 'unavailable';
    lock.current=true;setBusy(true);setNotice('');
    try{
      if(turnOn && !navigator.onLine)throw Error('Offline');
      let appleSubscription;
      if(turnOn && apple){
        if(denied)return 'denied';
        if(!appleSetup)return 'unavailable';
        appleSubscription=await appleSetup.manager.subscribe({userVisibleOnly:true,applicationServerKey:appleSetup.key});
      }else if(turnOn && Notification.permission!=='granted'){
        const answer=Notification.permission==='denied'?'denied':await Notification.requestPermission();
        if(answer!=='granted'){
          setNotice(answer==='denied'?'Allow notifications in your device settings to enable plant alerts.':'You can enable plant alerts later.');
          return answer==='denied'?'denied':'dismissed';
        }
      }
      return await withReminderLock(async()=>{
        if(!await mayChangeAlerts(epoch,plant?.id)){
          if(appleSubscription && !device().enabled)await appleSubscription.unsubscribe();
          return 'stale';
        }
        const d=device(),reg=await navigator.serviceWorker.ready;
        const sub=appleSubscription || await reg.pushManager.getSubscription();
        if(!turnOn){
          const off={...d,enabled:false,pendingDelete:true};persist(off);setSettings(off);setVerified(null);
          const cache=await caches.open('plantigochi-notices');await cache.put('/notice-schedule',Response.json({disabled:true}));
          if(sub)await sub.unsubscribe();
          return 'disabled';
        }
        if(!sub){
          await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:await subscriptionKey()});
        }
        const token=d.token || Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
        const next={...d,enabled:true,token,pendingDelete:false};
        persist(next);setVerified(null);setSettings(next);return 'enabled';
      });
    }catch(error){
      if(turnOn && error.name==='NotAllowedError' && Notification.permission!=='granted'){
        const blocked=Notification.permission==='denied';
        setNotice(blocked?'Allow Plantigochi notifications in your device settings.':'You can enable plant alerts later.');
        return blocked?'denied':'dismissed';
      }
      setNotice('Could not update alerts. Try again when online.');return 'failed';
    }
    finally{lock.current=false;setBusy(false);}
  }
  useEffect(()=>{
    const prev=last.current;last.current=plant;
    if(!enrolled || !prev || !plant || prev.id!==plant.id || plant.deadAt!==null || STAGES.indexOf(plant.stage)<=STAGES.indexOf(prev.stage))return;
    navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage({type:'milestone',id:plant.id,stage:plant.stage,label:STAGE_NAMES[plant.stage]})).catch(()=>{});
  },[plant,enrolled]);
  const toggleCompany=()=>{try{const d=device();if(!d.enabled || d.token!==settings.token)return;const next={...d,company:!d.company};persist(next);setSettings(next);}catch{setNotice('Could not save the company reminder setting.');}};
  return {enabled,enrolled,nextDue,busy,notice,toggle:()=>changeEnabled(!enrolled),enable:()=>changeEnabled(true),capable,denied,
    canEnable:offline==='ready' && navigator.onLine && (!apple || Boolean(appleSetup)),company:!!settings.company,toggleCompany};
}
