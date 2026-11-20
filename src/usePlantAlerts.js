import {useCallback,useEffect,useRef,useState} from 'react';
import {reminderSchedule} from './reminderSchedule.js';
import {STAGES,STAGE_NAMES} from './game.js';

const KEY='plantigochi.alert-device.v1';
function device() {try{return JSON.parse(localStorage.getItem(KEY))||{};}catch{return {};}}
function persist(d){localStorage.setItem(KEY,JSON.stringify(d));}
function supported(){return window.isSecureContext && 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;}
async function api(method,token,body) {
  const res=await fetch('/api/alerts/reminder',{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(!res.ok)throw Error('Reminder sync failed');
}
export function usePlantAlerts(plant,offline) {
  const [settings,setSettings]=useState(device),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [retry,bump]=useState(0),lock=useRef(false),work=useRef(Promise.resolve()),last=useRef(plant);
  const capability=supported(),denied=capability && Notification.permission==='denied';
  const enabled=capability && Notification.permission==='granted' && Boolean(settings.enabled);
  const schedule=JSON.stringify(reminderSchedule(plant,settings.company===true));
  const refresh=useCallback(()=>{setSettings(device());bump(n=>n+1);},[]);
  useEffect(()=>{
    const visible=()=>{if(!document.hidden)refresh();};
    const sync=e=>{if(e.key===KEY)refresh();};
    window.addEventListener('online',refresh);window.addEventListener('storage',sync);document.addEventListener('visibilitychange',visible);
    const periodic=setInterval(()=>{if(navigator.onLine && !document.hidden)bump(n=>n+1);},60000);
    return ()=>{clearInterval(periodic);window.removeEventListener('online',refresh);window.removeEventListener('storage',sync);document.removeEventListener('visibilitychange',visible);};
  },[refresh]);
  const lastSync=useRef('');
  useEffect(()=>{
    if(!capability || offline!=='ready')return;
    let active=true;
    const run=async()=>{
      if(!active)return;
      const d=device(),cache=await caches.open('plantigochi-notices');
      const data=JSON.parse(schedule);
      const lastNudge=Number(await (await cache.match('/notice-company-time'))?.text()) || 0;
      if(data.companyDue && lastNudge){
        const stretch=await (await cache.match('/notice-stretch'))?.text();
        data.companyDue=stretch===data.id+'-'+data.companyAt?null:Math.max(data.companyDue,lastNudge+86400000);
      }
      if(!active)return;
      await cache.put('/notice-schedule',Response.json(enabled?data:{disabled:true}));
      if(!d.token || !navigator.onLine)return;
      if(!enabled){
        if(d.pendingDelete || d.enabled){
          await api('DELETE',d.token);const current=device();
          if(current.token===d.token && (!current.enabled || Notification.permission!=='granted')){
            const next={...current,enabled:false,pendingDelete:false};persist(next);if(active)setSettings(next);
          }
        }
        lastSync.current='';return;
      }
      const reg=await navigator.serviceWorker.ready, sub=await reg.pushManager.getSubscription();
      if(!active)return;
      if(!sub){const next={...d,enabled:false,pendingDelete:true};persist(next);setSettings(next);setNotice('Enable alerts again to reconnect this device.');return;}
      const signature=JSON.stringify([sub.endpoint,data]);
      if(lastSync.current===signature)return;
      const now=Date.now();
      const future=t=>t>now?t:null;
      await api('PUT',d.token,{endpoint:sub.endpoint,due:future(data.due),criticalDue:future(data.criticalDue),companyDue:future(data.companyDue)});
      if(active){lastSync.current=signature;setNotice('');}
    };
    work.current=work.current.catch(()=>{}).then(()=>navigator.locks?navigator.locks.request('plantigochi-reminders',run):run()).catch(()=>{if(active)setNotice('Reminders will sync when the connection returns.');});
    return ()=>{active=false;};
  },[schedule,enabled,retry,capability,offline,settings.pendingDelete]);
  async function toggle(){
    if(lock.current||!capability||offline!=='ready')return;
    lock.current=true;setBusy(true);setNotice('');
    try {
      const d=device();
      if(enabled){
        const off={...d,enabled:false,pendingDelete:true};persist(off);setSettings(off);
        const cache=await caches.open('plantigochi-notices');await cache.put('/notice-schedule',Response.json({disabled:true}));
        const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe();
      }else{
        if(await Notification.requestPermission()!=='granted'){setNotice('Allow notifications in the device settings to enable reminders.');return;}
        const res=await fetch('/api/alerts/key',{cache:'no-store'});if(!res.ok)throw Error();
        const {publicKey}=await res.json();const key=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
        const reg=await navigator.serviceWorker.ready;
        if(!await reg.pushManager.getSubscription())await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
        const next={...d,enabled:true,pendingDelete:false,token:d.token||Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('')};
        persist(next);lastSync.current='';setSettings(next);
      }
    }catch{setNotice('Could not update alerts. Reopen the installed app while online and try again.');}
    finally{lock.current=false;setBusy(false);}
  }
  useEffect(()=>{
    const prev=last.current;last.current=plant;
    if(!enabled || prev.id!==plant.id || plant.deadAt!==null || STAGES.indexOf(plant.stage)<=STAGES.indexOf(prev.stage))return;
    navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage({type:'milestone',id:plant.id,stage:plant.stage,label:STAGE_NAMES[plant.stage]})).catch(()=>{});
  },[plant,enabled]);
  const toggleCompany=()=>{try{const d=device();const next={...d,company:!d.company};persist(next);setSettings(next);}catch{setNotice('Could not save the company reminder setting.');}};
  return {enabled,busy,notice,toggle,capable:capability,denied,company:!!settings.company,toggleCompany};
}
