import React,{useEffect,useRef,useState} from 'react';
import {alertKey,withReminderLock} from './alertCleanup.js';

const device=()=>JSON.parse(localStorage.getItem(alertKey) || '{}');
const resultLabel={queued:'Scheduled',sending:'Sending…',sent:'Sent to push service',failed:'Send failed'};
async function request(method,token,id){
  const res=await fetch('/api/alerts/test',{method,cache:'no-store',headers:{Authorization:'Bearer '+token,...(id?{'Content-Type':'application/json'}:{})},
    keepalive:Boolean(id),body:id?JSON.stringify({testId:id}):undefined});
  if(!res.ok)throw Object.assign(Error(res.status===429?'Wait one minute between tests.':res.status===409?'Reconnect plant alerts to register this device.':'Could not reach the notification service.'),{status:res.status});
  return res.json();
}
export default function NotificationTest({alerts}){
  const [result,setResult]=useState(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const sending=useRef(false),generation=useRef(0),lastCheck=useRef(0);
  async function read(active){
    const version=generation.current;
    if(sending.current || document.hidden || !active())return;
    const cache=await caches.open('plantigochi-notices'),id=await (await cache.match('/notice-test-id'))?.text();
    if(!id)return;
    const saved=await (await cache.match('/notice-test-result'))?.json();
    let data=saved?.testId===id?saved:{testId:id,steps:['queued','queued']};
    const receipts=await Promise.all([1,2].map(async n=>(await (await cache.match('/notice-test-received-'+n))?.text())===id));
    const activeTest=!data.startedAt || Date.now()-data.startedAt<45000;
    if(navigator.onLine && !receipts.every(Boolean) && Date.now()-lastCheck.current>(activeTest?1000:60000)){
      lastCheck.current=Date.now();
      try{
        const current=await request('GET',device().token);
        if(current.testId===id){data=current;if(active() && generation.current===version)await cache.put('/notice-test-result',Response.json(data));}
      }catch{/* Local receipts are still available offline. */}
    }
    if(active() && generation.current===version)setResult({...data,receipts});
  }
  useEffect(()=>{
    if(!alerts.enrolled){setResult(null);return;}
    let active=true,polling=false;
    const poll=async()=>{if(polling)return;polling=true;try{await read(()=>active);}catch{}finally{polling=false;}};
    poll();const timer=setInterval(poll,2000);
    document.addEventListener('visibilitychange',poll);
    return ()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',poll);};
  },[alerts.enrolled]);
  async function start(){
    if(sending.current || !alerts.enabled)return;
    sending.current=true;++generation.current;setBusy(true);setNotice('');
    try{
      await withReminderLock(async()=>{
        const d=device();if(!d.enabled)throw Error('Enable plant alerts first.');
        const cache=await caches.open('plantigochi-notices'),testId=crypto.randomUUID();
        const previous=await cache.match('/notice-test-id');
        await cache.put('/notice-test-id',new Response(testId));
        let data;
        try{data=await request('POST',d.token,testId);}
        catch(error){
          if(error.status){if(previous)await cache.put('/notice-test-id',previous);else await cache.delete('/notice-test-id');}
          throw error;
        }
        await cache.put('/notice-test-result',Response.json(data));setResult(data);
      });
    }catch(e){setNotice(e.message);}
    finally{sending.current=false;setBusy(false);}
  }
  const cooldown=result?.startedAt && Date.now()-result.startedAt<60000;
  return <div className="push-test"><p>Keep the app open for the first push at 5 seconds. Then close it and lock your phone for the second at 15 seconds.</p>
    <button className="alert-control" onClick={start} disabled={!alerts.enabled || busy || cooldown}>{busy?'Starting…':'Send two test alerts'}</button>
    {result && <ol aria-live="polite">{[5,15].map((delay,i)=><li key={delay}>{delay}s · {result.receipts?.[i]?'Received on this device':
      (result.steps?.[i]==='queued' || result.steps?.[i]==='sending') && Date.now()-result.startedAt>45000?'Delivery unconfirmed':resultLabel[result.steps?.[i]] || 'Scheduled'}</li>)}</ol>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
