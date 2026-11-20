import {useCallback,useEffect,useRef,useState} from 'react';
import {reminderSchedule} from './reminderSchedule.js';
import {STAGES,STAGE_NAMES} from './game.js';
import {mayChangeAlerts} from './useGardenSave.js';
import {alertKey as KEY,withReminderLock} from './alertCleanup.js';

function device(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}}
function persist(d){localStorage.setItem(KEY,JSON.stringify(d));}
function supported(){return window.isSecureContext && typeof window.Notification?.requestPermission==='function' && 'PushManager' in window && 'serviceWorker' in navigator;}
async function api(method,token,body){
  const res=await fetch('/api/alerts/reminder',{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!res.ok)throw Error('Reminder sync failed');
}

export function usePlantAlerts(plant,offline,epoch){
  const [settings,setSettings]=useState(device),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [verified,setVerified]=useState(null),[retry,bump]=useState(0);
  const lock=useRef(false),work=useRef(Promise.resolve()),last=useRef(plant);
  const capable=supported(),denied=capable && Notification.permission==='denied';
  const optedIn=Boolean(capable && settings.enabled && settings.token && Notification.permission==='granted');
  const enabled=optedIn && settings.token===verified;
  const schedule=plant?JSON.stringify(reminderSchedule(plant,settings.company===true)):null;
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
          await cache.delete('/notice-server-sync');
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
      setVerified(d.token);
      if(!schedule)return;
      const data=JSON.parse(schedule);
      const lastNudge=Number(await (await cache.match('/notice-company-time'))?.text()) || 0;
      if(data.companyDue && lastNudge){
        const stretch=await (await cache.match('/notice-stretch'))?.text();
        data.companyDue=stretch===data.id+'-'+data.companyAt?null:Math.max(data.companyDue,lastNudge+86400000);
      }
      if(!active)return;
      await cache.put('/notice-schedule',Response.json(data));
      if(!navigator.onLine)return;
      const previous=await (await cache.match('/notice-server-sync'))?.text();
      const signature=JSON.stringify([d.token,sub.endpoint,data.id,data.due,data.criticalDue,data.companyDue]);
      if(previous===signature)return;
      const now=Date.now(),future=t=>t>now?t:null;
      const body={endpoint:sub.endpoint,due:future(data.due),criticalDue:future(data.criticalDue),companyDue:future(data.companyDue)};
      if(d.awaitingFirstReminder && !body.due && !body.criticalDue && !body.companyDue)return;
      await api('PUT',d.token,body);
      await cache.put('/notice-server-sync',new Response(signature));
      if(d.awaitingFirstReminder)persist({...d,awaitingFirstReminder:false});
      if(active)setNotice('');
    };
    work.current=work.current.catch(()=>{}).then(()=>withReminderLock(run)).catch(()=>{
      if(active)setNotice('Reminders will sync when the connection returns.');
    });
    return ()=>{active=false;};
  },[schedule,optedIn,retry,capable,offline,settings.token,settings.enabled,settings.pendingDelete]);
  async function changeEnabled(turnOn){
    if(lock.current||!capable||offline!=='ready')return 'unavailable';
    lock.current=true;setBusy(true);setNotice('');
    try{
      if(turnOn && !navigator.onLine)throw Error('Offline');
      if(turnOn && Notification.permission!=='granted'){
        const answer=Notification.permission==='denied'?'denied':await Notification.requestPermission();
        if(answer!=='granted'){
          setNotice(answer==='denied'?'Allow notifications in your device settings to enable plant alerts.':'You can enable plant alerts later.');
          return answer==='denied'?'denied':'dismissed';
        }
      }
      return await withReminderLock(async()=>{
        if(!await mayChangeAlerts(epoch,plant?.id))return 'stale';
        const d=device(),reg=await navigator.serviceWorker.ready;
        const sub=await reg.pushManager.getSubscription();
        if(!turnOn){
          const off={...d,enabled:false,pendingDelete:true};persist(off);setSettings(off);setVerified(null);
          const cache=await caches.open('plantigochi-notices');await cache.put('/notice-schedule',Response.json({disabled:true}));
          if(sub)await sub.unsubscribe();
          return 'disabled';
        }
        if(!sub){
          const res=await fetch('/api/alerts/key',{cache:'no-store'});if(!res.ok)throw Error();
          const {publicKey}=await res.json();const key=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
          await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
        }
        const token=d.token || Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
        const next={...d,enabled:true,token,pendingDelete:false,awaitingFirstReminder:d.awaitingFirstReminder ?? (!d.token && (!plant || (plant.stage==='seed' && plant.wateredAt===null)))};
        persist(next);setVerified(token);setSettings(next);return 'enabled';
      });
    }catch{setNotice('Could not update alerts. Try again when online.');return 'failed';}
    finally{lock.current=false;setBusy(false);}
  }
  useEffect(()=>{
    const prev=last.current;last.current=plant;
    if(!enabled || !prev || !plant || prev.id!==plant.id || plant.deadAt!==null || STAGES.indexOf(plant.stage)<=STAGES.indexOf(prev.stage))return;
    navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage({type:'milestone',id:plant.id,stage:plant.stage,label:STAGE_NAMES[plant.stage]})).catch(()=>{});
  },[plant,enabled]);
  const toggleCompany=()=>{try{const d=device();if(!d.enabled || d.token!==settings.token)return;const next={...d,company:!d.company};persist(next);setSettings(next);}catch{setNotice('Could not save the company reminder setting.');}};
  return {enabled,busy,notice,toggle:()=>changeEnabled(!enabled),enable:()=>changeEnabled(true),capable,denied,
    verifying:optedIn && !enabled,canEnable:offline==='ready' && navigator.onLine,company:!!settings.company,toggleCompany};
}
