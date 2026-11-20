import {useCallback,useEffect,useRef,useState} from 'react';
import {gardenStore} from './gardenStore.js';
import {KEY} from './game.js';
import {retireAlerts,finishAlertCleanup,withReminderLock} from './alertCleanup.js';

const store=gardenStore(()=>localStorage,()=>!document.hidden);
export const exportGardenRaw=store.exportRaw;
export const mayChangeAlerts=store.mayChangeAlerts;
export function useGardenSave() {
  const [view,setView]=useState(null), current=useRef(null);
  const [issue,setIssue]=useState(''), [raw,setRaw]=useState(null), faultyEpoch=useRef(null);
  const channel=useRef(null), serial=useRef(Promise.resolve());
  const enqueue=useCallback(fn=>{
    const task=serial.current.then(fn,fn);serial.current=task.catch(()=>{});return task;
  },[]);
  const accept=useCallback(next=>{
    current.current=next.plant;setView(next);setIssue('');setRaw(null);
  },[]);
  const fail=useCallback(error=>{
    setIssue(error?.message || 'Device storage is unavailable.');
    faultyEpoch.current=error?.epoch ?? null;
    if (error?.raw != null) setRaw(error.raw);
    else if (!current.current) {try {setRaw(localStorage.getItem(KEY));} catch {}}
  },[]);
  useEffect(()=>{
    let active=true;
    function refresh(){
      if(!active)return;
      void enqueue(async()=>{
        try {const next=await store.read();if(active)accept(next);}
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
  const save=useCallback(operation=>enqueue(async()=>{
    try {
      accept(await operation());
      channel.current?.postMessage('saved');
      if (!channel.current) {try {localStorage.setItem('plantigochi-save-signal',crypto.randomUUID());}catch{}}
      return true;
    } catch(error){
      try {accept(await store.read());}catch{}
      fail(error);return false;
    }
  }),[accept,fail,enqueue]);
  const epoch=view?.epoch ?? faultyEpoch.current, id=view?.plant?.id;
  const commit=useCallback(fn=>save(()=>store.update({epoch,plant:{id}},fn)),[save,epoch,id]);
  const replace=backup=>save(()=>store.replace({epoch},backup));
  const alertVisit=useCallback((visit,action,enabled)=>save(()=>store.alertVisit({epoch},visit,action,enabled)),[save,epoch]);
  const setup=(next,draft)=>save(()=>store.setup(view,next,draft));
  const reset=async()=>{
    const ok=await save(()=>withReminderLock(()=>store.reset(view,retireAlerts)));
    if(ok)void finishAlertCleanup();
    return ok;
  };
  return {...view,plant:view?.plant || null,current,issue,raw,commit,replace,setup,reset,alertVisit};
}
