import {useCallback,useEffect,useRef,useState} from 'react';
import {gardenStore} from './gardenStore.js';
import {KEY} from './game.js';

const store=gardenStore(()=>localStorage,()=>!document.hidden);
export function useGardenSave() {
  const [plant,setPlant]=useState(null), current=useRef(null);
  const [issue,setIssue]=useState(''), [raw,setRaw]=useState(null);
  const channel=useRef(null), serial=useRef(Promise.resolve());
  const enqueue=useCallback(fn=>{
    const task=serial.current.then(fn,fn);serial.current=task.catch(()=>{});return task;
  },[]);
  const accept=useCallback(p=>{current.current=p;setPlant(p);setIssue('');setRaw(null);},[]);
  const fail=useCallback(error=>{
    setIssue(error?.message || 'Device storage is unavailable.');
    if (error?.raw != null) setRaw(error.raw);
    else if (!current.current) {try {setRaw(localStorage.getItem(KEY));} catch {}}
  },[]);
  useEffect(()=>{
    let active=true;
    function fetchGarden(init=false) {
      void enqueue(async()=>{
        try {const p=await (init?store.initialize():store.read());if(active)accept(p);}
        catch(error){if(active)fail(error);}
      });
    }
    fetchGarden(true);
    const bus=typeof BroadcastChannel==='function'?new BroadcastChannel('plantigochi-saves'):null;
    channel.current=bus;
    if(bus)bus.onmessage=()=>fetchGarden();
    const refresh=()=>{if(!document.hidden)fetchGarden();};
    const signal=e=>{if(e.key==='plantigochi-save-signal')refresh();};
    window.addEventListener('storage',signal);window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    return ()=>{active=false;bus?.close();channel.current=null;window.removeEventListener('storage',signal);
      window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[accept,fail,enqueue]);
  const save=useCallback((operation)=>enqueue(async()=>{
    try {
      const p=await operation();accept(p);
      channel.current?.postMessage('saved');
      if (!channel.current) {try {localStorage.setItem('plantigochi-save-signal',crypto.randomUUID());}catch{}}
      return true;
    } catch(error){fail(error);return false;}
  }),[accept,fail,enqueue]);
  const commit=useCallback(fn=>save(()=>store.update(fn)),[save]);
  const replace=useCallback(p=>save(()=>store.replace(p)),[save]);
  return {plant,current,issue,raw,commit,replace};
}
