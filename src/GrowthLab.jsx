import React,{useCallback,useEffect,useRef,useSyncExternalStore} from 'react';
import {stageLabel,timeLeft} from './game.js';
import {fillDebugPurse} from './growthLab.js';
import {lifeOf} from './gardenEconomy.js';

export function useLabSession(lab){
  const state=useSyncExternalStore(lab.subscribe,lab.snapshot);
  const current=useRef(state.plant);
  current.current=state.plant;
  const id=state.plant.id;
  const commit=useCallback(async(fn,options)=>{
    if(options?.signal?.aborted || lab.snapshot().plant.id!==id)return false;
    lab.change(fn);
    current.current=lab.snapshot().plant;
    return true;
  },[lab,id]);
  useEffect(()=>{
    if(!state.running)return;
    let last=performance.now();
    const timer=setInterval(()=>{
      const now=performance.now(),elapsed=now-last;last=now;
      if(document.hidden || elapsed>2500)lab.pause();
      else lab.tick(elapsed);
    },200);
    const hide=()=>{if(document.hidden)lab.pause();};
    document.addEventListener('visibilitychange',hide);
    window.addEventListener('pagehide',lab.pause);
    window.addEventListener('blur',lab.pause);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hide);
      window.removeEventListener('pagehide',lab.pause);window.removeEventListener('blur',lab.pause);};
  },[state.running,lab]);
  return {plant:state.plant,current,commit,phase:'game'};
}
export function LabControls({lab,play,exit}){
  const {plant,now,running,notice}=lab.snapshot();
  const e=lab.stop(),due=e && e.at<=now;
  const status=e?(due?e.label:'Next: '+e.label+' in '+timeLeft(e.at-now,false)):
    (plant.deadAt!==null?'Visit the Leaf Book to replant.':'Fully grown. Choose Growth → Move to garden.');
  return <section className="phone-section"><p><strong>{plant.name} · {stageLabel(plant)}</strong></p>
    <p role="status">{notice===status?status:notice+'. '+status}</p>
    <div className="menu-items">
      <button disabled={!e || running || due} onClick={lab.jump}>Jump to next event</button>
      {running?<button onClick={lab.pause}>Pause clock</button>:<button disabled={!e || due} onClick={()=>{lab.run();play();}}>Run · 1 min = 3 hours</button>}
      {due && e.skip && <button onClick={lab.skip}>{e.kind==='lastChance'?'Allow rescue deadline to pass':'Skip this reminder'}</button>}
      <button onClick={play}>Return to test garden</button>
      <button onClick={exit}>Exit and discard test copy</button>
    </div></section>;
}
export function DebugPurse({plant,commit,testing}){
  const [result,setResult]=React.useState('');
  return <section className="phone-section"><p>{testing?'Test purse':'Saved garden purse'} · {lifeOf(plant).balance.toLocaleString()} coins</p>
    <div className="menu-items"><button onClick={async()=>setResult(await commit(fillDebugPurse)?'Purse set to 1,000 coins.':'Couldn’t update the purse. Try again.')}>Set purse to 1,000 coins</button></div>
    <p role="status">{result}</p></section>;
}
