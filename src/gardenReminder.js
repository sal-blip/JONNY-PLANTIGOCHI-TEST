import {reminderRequest,reminderSchedule} from './reminderSchedule.js';

const key='reminder-work';
export const syncTag='plantigochi-reminders-v1';

export async function wakeReminderWorker(){
  try{
    const reg=await navigator.serviceWorker?.getRegistration();
    reg?.active?.postMessage({type:'sync-plant-reminder'});
    await reg?.sync?.register(syncTag);
  }catch{/* The saved work is also retried at the next launch or worker wake. */}
}

function stage(records,plant,epoch,device,replace=false){
  const schedule=plant?reminderSchedule(plant,device.company===true):null;
  const signature=JSON.stringify(schedule);
  const clock=plant?{wateredAt:plant.wateredAt,anchor:plant.anchor,earned:plant.earned,deadAt:plant.deadAt}:null;
  const get=records.get(key);
  get.onsuccess=()=>{
    const prior=get.result;
    if(!replace && prior?.token===device.token && prior.epoch===epoch){
      if(prior.disabled)return;
      if(prior.signature===signature){
        if(JSON.stringify(prior.clock)!==JSON.stringify(clock))records.put({...prior,clock},key);
        return;
      }
    }
    // This write commits or aborts together with the plant, including when the
    // page is closed before React sees the completed watering transaction.
    records.put({id:crypto.randomUUID(),token:device.token,epoch,signature,schedule,clock,changedAt:Date.now(),
      body:reminderRequest(schedule,{}),gone:!replace && prior?.gone || null},key);
    records.transaction.addEventListener('complete',()=>{void wakeReminderWorker();},{once:true});
  };
}

export function stageGardenReminder(records,plant,epoch,getStorage){
  let d;
  try{d=JSON.parse(getStorage().getItem('plantigochi.alert-device.v1'));}catch{return;}
  if(d?.enabled && d.token)stage(records,plant,epoch ?? null,d);
}

// Foreground enrollment and changed preferences also project from the latest
// committed garden, rather than from a possibly stale render in another tab.
export async function refreshGardenReminder(epoch,device,{replace=false,disable=false}={}){
  const db=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('plantigochi.pocket.garden');
    request.onupgradeneeded=()=>request.transaction.abort();
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction('garden','readwrite'),records=tx.objectStore('garden');
      const plant=records.get('current'),setup=records.get('setup');
      let valid=false;
      setup.onsuccess=()=>{
        if((setup.result?.epoch ?? null)!==(epoch ?? null) || setup.result?.resetCleanup)return;
        valid=true;
        if(disable){
          const get=records.get(key);
          get.onsuccess=()=>{
            if(get.result?.disabled && get.result.token===device.token && get.result.epoch===(epoch??null))return;
            records.put({id:crypto.randomUUID(),token:device.token,epoch:epoch ?? null,disabled:true,changedAt:Date.now()},key);
          };
        }else{
          try{stage(records,plant.result?JSON.parse(plant.result):null,epoch ?? null,device,replace);}
          catch{tx.abort();}
        }
      };
      tx.oncomplete=()=>resolve(valid);
      tx.onabort=()=>reject(tx.error || Error('Could not save reminder settings.'));
    });
  }finally{db.close();}
}

export async function submitGardenReminder(reg){
  if(!reg.active)throw Error('Preparing plant reminders.');
  const channel=new MessageChannel();
  return new Promise((resolve,reject)=>{
    const done=()=>{clearTimeout(timeout);channel.port1.close();};
    const timeout=setTimeout(()=>{done();reject(Error('Reminder sync pending.'));},15000);
    channel.port1.onmessage=event=>{done();resolve(event.data);};
    try{reg.active.postMessage({type:'sync-plant-reminder'},[channel.port2]);}
    catch(error){done();reject(error);}
  });
}
