import {useCallback,useEffect,useRef,useState} from 'react';
import {reminderSchedule} from './reminderSchedule.js';
import {refreshGardenReminder,submitGardenReminder,wakeReminderWorker} from './gardenReminder.js';
import {STAGES,stageLabel} from './game.js';
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
    Promise.all([navigator.serviceWorker.ready,subscriptionKey()]).then(async([reg,key])=>{
        const sub=settings.reconnect && await reg.pushManager.getSubscription();
        if(sub && sub.endpoint===settings.reconnect)await sub.unsubscribe();
        if(active){setAppleSetup({manager:reg.pushManager,key});setNotice('');}
    }).catch(()=>{if(active)setNotice('Could not connect to plant alerts. We’ll retry automatically.');});
    return ()=>{active=false;};
  },[apple,appleSetup,optedIn,denied,offline,retry,settings.reconnect]);
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
      let d=device();
      if(!d.token || d.token!==settings.token || Boolean(d.enabled)!==Boolean(settings.enabled))return;
      if(!optedIn && !d.pendingDelete && !d.enabled)return;
      const reg=await navigator.serviceWorker.ready;
      if(!active)return;
      const staged=await withReminderLock(async()=>{
        d=device();
        if(d.token!==settings.token || Boolean(d.enabled)!==Boolean(settings.enabled))return false;
        if(!optedIn){
          const cache=await caches.open('plantigochi-notices');
          await cache.put('/notice-schedule',Response.json({disabled:true}));
          await cache.delete('/notice-test-id');
        }
        return refreshGardenReminder(epoch,d,{disable:!optedIn});
      });
      if(!staged || !active)return;
      const result=await submitGardenReminder(reg);
      if(!active)return;
      if(result.status==='expired' || result.disabled){
        await withReminderLock(async()=>{
          const latest=device();
          if(!active || latest.token!==d.token || latest.enabled!==d.enabled)return;
          const next={...latest,enabled:false,pendingDelete:false,reconnect:result.status==='expired'?(result.endpoint||true):false};
          persist(next);setSettings(next);setVerified(null);setAppleSetup(null);
          setNotice(next.reconnect?'Subscription expired. Enable plant alerts to reconnect.':'');
        });
      }else if(optedIn && result.status==='legacy'){
        // An older open document enabled or changed alerts after this one.
        // Adopt the current preference, now that its newer consent was verified.
        await withReminderLock(async()=>{
          const current=device();
          if(current.enabled && current.token===d.token)await refreshGardenReminder(epoch,current,{replace:true});
        });
        if(active)refresh();
      }else if(optedIn && result.status==='confirmed' && result.signature===(schedule ?? 'null')){
        setVerified({token:d.token,schedule});setNextDue(result.nextDue);setNotice('');
      }else{
        void wakeReminderWorker();setVerified(null);
        setNotice('Reminder sync pending. Reopen the garden when connected if background sync is unavailable.');
      }
    };
    work.current=work.current.catch(()=>{}).then(run).catch(()=>{
      if(active){void wakeReminderWorker();setVerified(null);setNotice('Reminder sync pending. Reopen the garden when connected if background sync is unavailable.');}
    });
    return ()=>{active=false;};
  },[schedule,optedIn,retry,capable,offline,epoch,settings.token,settings.enabled,settings.pendingDelete]);
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
        let sub=appleSubscription || await reg.pushManager.getSubscription();
        if(!turnOn){
          const off={...d,enabled:false,pendingDelete:true,reconnect:false};
          if(!await refreshGardenReminder(epoch,off,{disable:true}))return 'stale';
          persist(off);setSettings(off);setVerified(null);void wakeReminderWorker();
          const cache=await caches.open('plantigochi-notices');await cache.put('/notice-schedule',Response.json({disabled:true}));
          await cache.delete('/notice-ack-v31');
          if(sub)await sub.unsubscribe();
          return 'disabled';
        }
        if(sub && d.reconnect===sub.endpoint){
          await sub.unsubscribe();
          if(apple){setAppleSetup(null);throw Error('Tap again to reconnect');}
          sub=null;
        }
        if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:await subscriptionKey()});
        const token=d.token || Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
        const next={...d,enabled:true,token,pendingDelete:false,reconnect:false};
        if(!await refreshGardenReminder(epoch,next,{replace:true}))return 'stale';
        const cache=await caches.open('plantigochi-notices');
        await cache.put('/notice-schedule',Response.json(plant?reminderSchedule(plant,next.company===true):{awaitingSeed:true}));
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
    navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage({type:'milestone',id:plant.id,stage:plant.stage,label:stageLabel(plant)})).catch(()=>{});
  },[plant,enrolled]);
  const toggleCompany=()=>{try{const d=device();if(!d.enabled || d.token!==settings.token)return;const next={...d,company:!d.company};persist(next);setSettings(next);}catch{setNotice('Could not save the company reminder setting.');}};
  return {enabled,enrolled,nextDue,busy,notice:notice || (!enrolled && settings.reconnect?'Subscription expired. Enable plant alerts to reconnect.':''),toggle:()=>changeEnabled(!enrolled),enable:()=>changeEnabled(true),capable,denied,
    canEnable:offline==='ready' && navigator.onLine && (!apple || Boolean(appleSetup)),company:!!settings.company,toggleCompany};
}
