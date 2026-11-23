import {useCallback,useLayoutEffect,useRef} from 'react';

const tracks={
  cotton:{url:'/music/cotton-candy-skies.mp3',volume:.75,fadeIn:1.2,fadeOut:5},
  mystic:{url:'/music/mystic-oasis.mp3',volume:.80,fadeIn:.75,fadeOut:.75},
};
const introKey='plantigochi.score.intro.v1';
const plantKey='plantigochi.score.tutorial.v1';
const introLifetime=7*24*60*60*1000;

function readHead(browser,key){
  try{
    const head=JSON.parse(browser.localStorage.getItem(key));
    if(head && Number.isFinite(head.seconds) && head.seconds>=0 &&
      (key!==introKey || Date.now()-head.savedAt<introLifetime))return head;
  }catch{/* Audio works when storage is unavailable. */}
  return null;
}
function writeHead(browser,session,seconds){
  const key=session==='intro'?introKey:plantKey;
  try{
    browser.localStorage.setItem(key,JSON.stringify({session,seconds,savedAt:Date.now()}));
  }catch{/* Audio works when storage is unavailable. */}
}
function removeHead(browser,key){
  try{browser.localStorage.removeItem(key);}catch{/* Storage is optional. */}
}
export function clearScoreHandoff(browser=window){
  removeHead(browser,introKey);
  removeHead(browser,plantKey);
}

export function createScorePlayback(browser=window,page=document){
  const channels=Object.fromEntries(Object.entries(tracks).map(([name,track])=>[name,{
    ...track,wanted:false,source:null,gain:null,buffer:null,loading:null,offset:0,started:0,
    ramp:null,stopTimer:null,releaseTimer:null,retryTimer:null,retryDelay:2000,
  }]));
  let ctx=null,enabled=false,session=null,disposed=false,parked=false,headTimer=null;
  const awake=()=>!disposed && !parked && !page.hidden;
  function position(ch){
    if(!ch.source)return ch.offset;
    const now=ch.ramp?.to===0?Math.min(ctx.currentTime,ch.ramp.end):ctx.currentTime;
    return (ch.offset+Math.max(0,now-ch.started))%ch.buffer.duration;
  }
  function saveHead(){
    if(!session || !channels.cotton.wanted)return;
    writeHead(browser,session,position(channels.cotton));
  }
  function stop(ch){
    browser.clearTimeout(ch.stopTimer);
    ch.stopTimer=null;
    if(ch.source){
      ch.offset=position(ch);
      ch.source.stop();
      ch.source.disconnect();
      ch.gain.disconnect();
      ch.source=null;ch.gain=null;ch.ramp=null;
    }
    if(ch===channels.cotton){
      browser.clearInterval(headTimer);headTimer=null;
    }
  }
  function releaseLater(ch){
    if(!ch.buffer || ch.releaseTimer!=null)return;
    // Avoid re-decoding after a quick toggle. A completed tutorial's PCM can go immediately.
    if(ch===channels.cotton && !session && !ch.wanted){ch.buffer=null;return;}
    ch.releaseTimer=browser.setTimeout(()=>{
      ch.releaseTimer=null;
      if(!ch.source)ch.buffer=null;
    },30000);
  }
  function cancelLoad(ch){
    ch.loading?.abort();ch.loading=null;
    browser.clearTimeout(ch.retryTimer);ch.retryTimer=null;
    ch.retryDelay=2000;
  }
  function silence(){
    saveHead();
    for(const ch of Object.values(channels)){
      cancelLoad(ch);stop(ch);releaseLater(ch);
    }
  }
  function rampTo(ch,to,duration){
    const now=ctx.currentTime,curve=ch.ramp;
    if(curve?.to===to)return;
    const progress=curve?Math.min(1,Math.max(0,(now-curve.start)/(curve.end-curve.start))):0;
    const level=curve?curve.from+(curve.to-curve.from)*progress:0;
    browser.clearTimeout(ch.stopTimer);ch.stopTimer=null;
    const gain=ch.gain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(level,now);
    gain.linearRampToValueAtTime(to,now+duration);
    ch.ramp={from:level,to,start:now,end:now+duration};
    if(to===0){
      ch.stopTimer=browser.setTimeout(()=>{
        if(ch.wanted || !ch.source)return;
        stop(ch);releaseLater(ch);
      },Math.ceil(duration*1000));
    }
  }
  async function load(ch){
    const request=new AbortController();
    ch.loading=request;
    try{
      const response=await browser.fetch(ch.url,{signal:request.signal});
      if(!response.ok)throw Error('Soundtrack request failed');
      const bytes=await response.arrayBuffer();
      if(request.signal.aborted)return;
      // The callbacks also support WebKit versions without the Promise overload.
      const buffer=await new Promise((resolve,reject)=>{
        const promise=ctx.decodeAudioData(bytes,resolve,reject);
        promise?.then(resolve,reject);
      });
      if(request.signal.aborted || disposed)return;
      if(!Number.isFinite(buffer?.duration) || buffer.duration<=0)throw Error('Invalid soundtrack duration');
      ch.buffer=buffer;ch.retryDelay=2000;
    }catch{
      if(!request.signal.aborted && !disposed){
        ch.retryTimer=browser.setTimeout(()=>{ch.retryTimer=null;sync();},ch.retryDelay);
        ch.retryDelay=Math.min(30000,ch.retryDelay*2);
      }
    }finally{
      if(ch.loading===request){ch.loading=null;sync();}
    }
  }
  function sync(){
    if(!ctx || !enabled || !awake())return;
    for(const ch of Object.values(channels)){
      if(!ch.wanted){
        cancelLoad(ch);
        if(ch.source)rampTo(ch,0,ch.fadeOut);
        else releaseLater(ch);
        continue;
      }
      browser.clearTimeout(ch.releaseTimer);ch.releaseTimer=null;
      if(!ch.buffer){
        if(!ch.loading && ch.retryTimer==null)void load(ch);
        continue;
      }
      if(ctx.state!=='running')continue;
      if(!ch.source){
        const source=ctx.createBufferSource(),gain=ctx.createGain();
        gain.gain.setValueAtTime(0,ctx.currentTime);
        source.buffer=ch.buffer;source.loop=true;
        source.connect(gain);gain.connect(ctx.destination);
        ch.offset%=ch.buffer.duration;
        ch.started=ctx.currentTime;
        source.start(ch.started,ch.offset);
        ch.source=source;ch.gain=gain;
        if(ch===channels.cotton && session){
          saveHead();
          headTimer=browser.setInterval(saveHead,10000);
        }
      }
      rampTo(ch,ch.volume,ch.fadeIn);
    }
  }
  function unlock(){
    if(!awake())return;
    const Audio=browser.AudioContext || browser.webkitAudioContext;
    if(!Audio)return;
    try{
      if(!ctx){
        ctx=new Audio();
        ctx.onstatechange=()=>{
          if(disposed)return;
          if(ctx.state==='running'){sync();return;}
          saveHead();
          for(const ch of Object.values(channels))stop(ch);
        };
      }
      if(ctx.state!=='running')ctx.resume()?.then(sync,()=>{});
      sync();
    }catch{/* A later trusted gesture can retry a browser audio interruption. */}
  }
  function setSession(next){
    if(session===next)return;
    const before=session,ch=channels.cotton;
    saveHead();
    session=next;
    if(!next){
      if(before!=='intro' && readHead(browser,plantKey)?.session===before)removeHead(browser,plantKey);
      removeHead(browser,introKey);
      return;
    }
    if(before==='intro' && next!=='intro'){
      // Naming a seed leaves a currently playing introduction uninterrupted.
      writeHead(browser,next,position(ch));removeHead(browser,introKey);return;
    }
    stop(ch);
    const named=next==='intro'?null:readHead(browser,plantKey);
    const saved=named?.session===next?named:readHead(browser,introKey);
    ch.offset=saved?.seconds || 0;
    if(next!=='intro' && saved){
      writeHead(browser,next,ch.offset);
      removeHead(browser,introKey);
    }
  }
  function setMix({cotton=false,mystic=false,enabled:audible=true,cottonSession}={}){
    if(disposed)return;
    if(!cotton && channels.cotton.wanted)saveHead();
    // Omitted by an unmount/loading transition. Only an explicit null finishes a session.
    if(cottonSession!==undefined)setSession(cottonSession);
    channels.cotton.wanted=Boolean(cotton);channels.mystic.wanted=Boolean(mystic);
    enabled=Boolean(audible);
    if(!enabled || !awake()){silence();return;}
    if(cotton || mystic)unlock();
    else sync();
  }
  function onGesture(event){
    // The preference write is asynchronous, so prime on the enabling tap itself.
    const unmute=event.target?.closest?.('[data-score-toggle][aria-pressed="false"],[data-audio="master"][aria-pressed="false"]');
    if(enabled || unmute)unlock();
  }
  function onHide(){parked=true;silence();}
  function onShow(){
    parked=false;
    if(enabled && (channels.cotton.wanted || channels.mystic.wanted))unlock();
  }
  function visibility(){if(page.hidden)silence();else onShow();}
  function online(){
    for(const ch of Object.values(channels)){
      browser.clearTimeout(ch.retryTimer);ch.retryTimer=null;
    }
    if(enabled && awake() && (channels.cotton.wanted || channels.mystic.wanted))unlock();
  }
  const gestures=['pointerdown','pointerup','touchend','click','keydown'];
  for(const type of gestures)browser.addEventListener(type,onGesture,true);
  browser.addEventListener('pagehide',onHide);
  browser.addEventListener('pageshow',onShow);
  browser.addEventListener('online',online);
  page.addEventListener('visibilitychange',visibility);
  function dispose(){
    if(disposed)return;
    disposed=true;silence();
    for(const type of gestures)browser.removeEventListener(type,onGesture,true);
    browser.removeEventListener('pagehide',onHide);
    browser.removeEventListener('pageshow',onShow);
    browser.removeEventListener('online',online);
    page.removeEventListener('visibilitychange',visibility);
    for(const ch of Object.values(channels)){
      browser.clearTimeout(ch.releaseTimer);ch.buffer=null;
    }
    if(ctx){ctx.onstatechange=null;ctx.close()?.catch(()=>{});}
  }
  return {setMix,unlock,dispose};
}

export function useScorePlayback({cotton=false,mystic=false,enabled=true,cottonSession}){
  const player=useRef(null);
  useLayoutEffect(()=>{
    const score=createScorePlayback();player.current=score;
    return ()=>{player.current=null;score.dispose();};
  },[]);
  useLayoutEffect(()=>{
    player.current?.setMix({cotton,mystic,enabled,cottonSession});
  },[cotton,mystic,enabled,cottonSession]);
  return useCallback(()=>player.current?.unlock(),[]);
}
