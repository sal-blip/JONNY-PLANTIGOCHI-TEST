import {useCallback,useEffect,useRef,useState} from 'react';
import {deviceGarden as store,SaveIssue} from './gardenStore.js';
import {KEY} from './game.js';
import {downloadFile} from './gardenBackup.js';
import {retireAlerts,finishAlertCleanup,withReminderLock} from './alertCleanup.js';
import {clearScoreHandoff} from './scorePlayback.js';

export const exportGardenRaw=store.exportRaw;
export const mayChangeAlerts=store.mayChangeAlerts;

export function downloadOriginalSave(raw){
  downloadFile(new Blob([raw],{type:'application/json'}),'plantigochi-original.json');
  return 'Downloaded the original save as JSON. It contains any saved photo previews.';
}

export async function downloadCurrentGarden(name,raw){
  let copy;
  try{copy=await store.exportBackup(raw);}
  catch(error){if(raw==null)throw error;}
  if(raw!=null && !copy)return downloadOriginalSave(raw);
  if(!copy)throw Error('No saved garden was found on this device.');
  if(raw!=null && copy.extension==='json' && !copy.missingOriginals)return downloadOriginalSave(raw);
  downloadFile(copy.blob,name+'.'+copy.extension);
  if(copy.missingOriginals){
    const count=copy.missingOriginals;
    return 'Backup downloaded. '+count+(count===1?' original photo was':' original photos were')+' unavailable. Saved previews are included.';
  }
  return copy.extension==='plantigochi'?'Garden and original photos downloaded.':'Garden backup downloaded.';
}

function issueMessage(error){
  return error?.name==='QuotaExceededError'?'Device storage is full. Free space and try again.':
    error?.message || 'Device storage is unavailable.';
}

async function finishReset(){
  try{
    const garden=await store.finishReset(retireAlerts);
    clearScoreHandoff();
    return garden;
  }
  catch{
    const issue=new SaveIssue('Your garden was erased. Reopen the app to finish clearing this installation.');
    issue.resetPending=true;throw issue;
  }
}
async function readReady(){
  const next=await store.read();
  if(!next.resetCleanup)return next;
  const ready=await withReminderLock(finishReset);
  void finishAlertCleanup();
  return ready;
}

export function useGardenSave(){
  const [view,setView]=useState(null),current=useRef(null);
  const [issue,setIssue]=useState(''),[recovery,setRecovery]=useState(null),[legacyRaw,setLegacyRaw]=useState(null);
  const channel=useRef(null),serial=useRef(Promise.resolve());
  const enqueue=useCallback(fn=>{
    const task=serial.current.then(fn,fn);serial.current=task.catch(()=>{});return task;
  },[]);
  const accept=useCallback(next=>{
    current.current=next.plant;setView(next);setIssue('');setRecovery(null);setLegacyRaw(null);
  },[]);
  const fail=useCallback(error=>{
    setIssue(issueMessage(error));
    if(error?.recovery){
      current.current=null;setView(null);setRecovery(error.recovery);
    }else if(error?.resetPending){
      current.current=null;setView(null);setRecovery(null);setLegacyRaw(null);
    }else if(!current.current){
      try{setLegacyRaw(localStorage.getItem(KEY));}catch{}
    }
  },[]);
  useEffect(()=>{
    let active=true;
    function refresh(){
      if(!active)return;
      void enqueue(async()=>{
        try{const next=await readReady();if(active)accept(next);}
        catch(error){if(active)fail(error);}
      });
    }
    refresh();
    const cleanup=()=>{void finishAlertCleanup();};
    cleanup();
    window.addEventListener('online',cleanup);
    const bus=typeof BroadcastChannel==='function'?new BroadcastChannel('plantigochi-saves'):null;
    channel.current=bus;
    if(bus)bus.onmessage=refresh;
    const visible=()=>{if(!document.hidden){refresh();cleanup();}};
    const signal=e=>{if(e.key==='plantigochi-save-signal')refresh();};
    window.addEventListener('storage',signal);window.addEventListener('focus',visible);
    document.addEventListener('visibilitychange',visible);
    return ()=>{active=false;bus?.close();channel.current=null;window.removeEventListener('storage',signal);
      window.removeEventListener('focus',visible);window.removeEventListener('online',cleanup);
      document.removeEventListener('visibilitychange',visible);};
  },[accept,fail,enqueue]);
  const save=useCallback((operation,signal)=>enqueue(async()=>{
    try{
      accept(await operation());
      if(channel.current)channel.current.postMessage('saved');
      else {try{localStorage.setItem('plantigochi-save-signal',crypto.randomUUID());}catch{}}
      return true;
    }catch(error){
      if(signal?.aborted)return false;
      try{accept(await readReady());}
      catch(latest){
        fail(latest);
        if(latest.recovery && error!==latest)setIssue(issueMessage(error));
        return false;
      }
      fail(error);return false;
    }
  }),[accept,fail,enqueue]);
  const epoch=view?.epoch,id=view?.plant?.id;
  const commit=useCallback((fn,options)=>save(()=>store.update({epoch,plant:{id}},fn,options),options?.signal),[save,epoch,id]);
  const target=view || recovery;
  const replace=backup=>save(()=>store.replace(target,backup));
  const alertVisit=useCallback((visit,action,enabled)=>save(()=>store.alertVisit({epoch},visit,action,enabled)),[save,epoch]);
  const setup=(next,draft,options)=>save(()=>store.setup(view,next,draft,options),options?.signal);
  const reset=async()=>{
    const ok=await save(()=>withReminderLock(async()=>{
      await store.reset(target);
      return finishReset();
    }));
    if(ok)void finishAlertCleanup();
    return ok;
  };
  return {...view,plant:view?.plant || null,current,issue,raw:recovery?recovery.raw:legacyRaw,recoverable:!!recovery,commit,replace,setup,reset,alertVisit};
}
