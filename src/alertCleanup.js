export const alertKey='plantigochi.alert-device.v1';
const cleanupKey='plantigochi.retired-alerts';
export const withReminderLock=fn=>navigator.locks?navigator.locks.request('plantigochi-reminders',fn):fn();

export function retireAlerts(storage){
  let pending=[];
  try {
    const saved=JSON.parse(storage.getItem(cleanupKey));
    if(Array.isArray(saved))pending=saved;
  }catch{}
  let device;
  try {device=JSON.parse(storage.getItem(alertKey));}catch{}
  if(device?.token && !pending.includes(device.token))pending.push(device.token);
  // Keep only the cancellation credential until the server acknowledges deletion.
  storage.setItem(cleanupKey,JSON.stringify(pending));
  storage.removeItem(alertKey);
}

export async function finishAlertCleanup(){
  try {
    await withReminderLock(async()=>{
      const raw=localStorage.getItem(cleanupKey);
      if(raw===null)return;
      const tokens=JSON.parse(raw);
      let clean=true;
      if(!localStorage.getItem(alertKey)){
        try {
          if('caches' in window){
            const cache=await caches.open('plantigochi-notices');
            await cache.put('/notice-schedule',Response.json({disabled:true}));
            for(const entry of await cache.keys()){
              if(new URL(entry.url).pathname!=='/notice-schedule')await cache.delete(entry);
            }
          }
          const reg=await navigator.serviceWorker?.getRegistration();
          for(const n of await reg?.getNotifications?.() || [])n.close();
          const sub=await reg?.pushManager?.getSubscription();
          if(sub && !await sub.unsubscribe() && await reg.pushManager.getSubscription())clean=false;
        }catch{clean=false;}
      }
      const remaining=[];
      for(const token of tokens){
        try {
          if(!navigator.onLine || !(await fetch('/api/alerts/reminder',{method:'DELETE',headers:{Authorization:'Bearer '+token}})).ok)remaining.push(token);
        }catch{remaining.push(token);}
      }
      if(remaining.length || !clean)localStorage.setItem(cleanupKey,JSON.stringify(remaining));
      else localStorage.removeItem(cleanupKey);
    });
  }catch{/* A later launch or connection change retries pending cancellations. */}
}
