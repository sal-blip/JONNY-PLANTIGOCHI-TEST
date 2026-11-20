import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,CornerUpLeft,Heart,Leaf} from 'lucide-react';
import DeviceShell from './DeviceShell.jsx';
import PlantPixel from './PlantPixel.jsx';
import {readPlant} from './game.js';
import {backupLimit} from './gardenScenes.js';
import './PlantSetup.css';

export function SetupWelcome({setup,replace,issue}){
  const file=useRef(null),[candidate,setCandidate]=useState(null),[notice,setNotice]=useState('');
  async function choose(e){
    const f=e.target.files?.[0];e.target.value='';
    if(!f)return;
    try{
      const plant=f.size<=backupLimit && readPlant(await f.text());
      if(!plant)throw Error();
      setCandidate(plant);setNotice('');
    }catch{setCandidate(null);setNotice('Choose a valid Plantigochi backup.');}
  }
  return <main className="seed-setup"><section className="seed-letter">
    <div className="seed-portrait"><PlantPixel stage="seed"/></div>
    <h1>{candidate?'Bring your garden home':'Welcome to your pocket garden'}</h1>
    <p>{candidate?candidate.name+' · Generation '+candidate.generation+' · '+candidate.graduates.length+' collected':'A sleepy Monstera is waiting. Give it a name, then use the heart on your keychain to give it its first drink.'}</p>
    <div className="seed-actions">{candidate?<><button onClick={()=>replace(candidate)}>Restore this garden</button>
      <button onClick={()=>{setCandidate(null);setup('name');}}>Start fresh instead</button></>:
      <><button onClick={()=>setup('name')}>Name your seed</button><button onClick={()=>file.current.click()}>Restore a garden</button></>}</div>
    <input ref={file} hidden type="file" accept=".json,application/json" aria-label="Garden backup" onChange={choose}/>
    {(notice||issue) && <p role="alert">{notice || issue}</p>}
  </section></main>;
}

export function NameEditor({original='Monstera',initial='',onDraft,onSave,onCancel,rename=false,issue}){
  const [draft,setDraft]=useState(initial),[index,setIndex]=useState(0),[lower,setLower]=useState(false),[busy,setBusy]=useState(false);
  const heart=useRef(null),hold=useRef(null),consumed=useRef(false),dialog=useRef(null);
  const letters=lower?'abcdefghijklmnopqrstuvwxyz':'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const choices=['Done',...letters,'Space','-','Aa'], selected=choices[index];
  const label=selected==='Done'?(draft.trim()?'Done':'Keep '+original):selected==='Aa'?(lower?'Uppercase':'Lowercase'):selected;
  const full=draft.length>=12 && !['Done','Aa'].includes(selected);
  useLayoutEffect(()=>{
    const el=dialog.current;if(el)el.showModal();
    heart.current?.focus({preventScroll:true});
    return ()=>{el?.close();clearTimeout(hold.current);};
  },[]);
  function change(value){setDraft(value);onDraft?.(value);}
  function move(direction){setIndex(i=>(i+direction+choices.length)%choices.length);}
  async function choose(){
    if(busy)return;
    if(selected==='Done'){
      setBusy(true);
      try{await onSave(draft.trim() || original);}finally{setBusy(false);}
    }else if(selected==='Aa'){setLower(!lower);setIndex(1);}
    else if(!full)change(draft+(selected==='Space'?' ':selected));
  }
  function stop(){clearTimeout(hold.current);hold.current=null;}
  function start(){
    if(hold.current!==null || busy)return;
    consumed.current=false;
    hold.current=setTimeout(()=>{consumed.current=true;onCancel();},700);
  }
  function back(){if(!consumed.current && !busy)change(draft.slice(0,-1));consumed.current=false;}
  useEffect(()=>{
    window.addEventListener('blur',stop);
    return ()=>window.removeEventListener('blur',stop);
  },[]);
  const content=<section className="name-layout" onKeyDown={e=>{
    if(e.altKey || e.ctrlKey || e.metaKey || busy)return;
    if(e.key==='ArrowRight' || e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}
    if(e.key==='Escape' || e.key==='Backspace'){e.preventDefault();if(!e.repeat)start();}
  }} onKeyUp={e=>{if(e.key==='Escape' || e.key==='Backspace'){e.preventDefault();stop();back();}}}>
    <header><Leaf aria-hidden="true"/><h1 id="plant-name-title">{rename?'Rename plant':'Name your seed'}</h1></header>
    <div className="name-device-space"><div className="device name-device">
      <div className="inspect-shell"><DeviceShell/></div>
      <div className="lcd name-lcd" role="group" aria-label="Plant name display">
        <small>{draft.length} / 12</small><strong>{draft || original}</strong>
        <div className="name-dial" aria-live="polite">‹ {label} ›</div>
      </div>
      <span className="shell-name" aria-hidden="true">PLANTIGOCHI</span>
      <div className="toy-keys" role="group" aria-label="Plantigochi buttons">
        <button className="toy-back" aria-label="Back on toy" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);start();}}
          onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
          onKeyDown={e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)start();}}}
          onKeyUp={e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();stop();back();}}}
          onContextMenu={e=>e.preventDefault()} onClick={back}><CornerUpLeft/></button>
        <button aria-label="Previous toy item" disabled={busy} onClick={()=>move(-1)}><ChevronLeft/></button>
        <button className="accept toy-heart" ref={heart} aria-label={label} disabled={busy} aria-disabled={busy || full} onClick={choose}><Heart/></button>
        <button aria-label="Next toy item" disabled={busy} onClick={()=>move(1)}><ChevronRight/></button>
      </div>
    </div></div>
    <p className="name-instructions">Arrows browse. Heart picks a letter or <b>Done</b>.<br/>Back erases. Hold Back to cancel.</p>
    {issue && <p role="alert">{issue}</p>}
  </section>;
  return rename?<dialog className="seed-setup name-modal" ref={dialog} aria-labelledby="plant-name-title" onCancel={e=>e.preventDefault()}>{content}</dialog>:<main className="seed-setup">{content}</main>;
}
