import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,CornerUpLeft,Heart,Leaf} from 'lucide-react';
import DeviceShell from './DeviceShell.jsx';
import PlantPixel from './PlantPixel.jsx';
import {readGardenBackup} from './gardenBackup.js';
import './PlantSetup.css';

function AlertChoices({alerts,offer,answer}){
  async function turnOn(){
    const result=await alerts.enable();
    if(result==='enabled' || result==='dismissed')await answer(result==='dismissed');
  }
  if(alerts.denied)return <button onClick={()=>answer(false)}>Continue</button>;
  return <>
    <button disabled={alerts.busy || !alerts.canEnable} onClick={turnOn}>{alerts.busy?'Turning on alerts…':'Turn on plant alerts'}</button>
    <button disabled={alerts.busy} onClick={()=>answer(true)}>{offer===1?'Maybe later':'Not now'}</button>
  </>;
}

export function SetupWelcome({setup,replace,issue,phase,plant,offer,alerts,answer}){
  const file=useRef(null),[candidate,setCandidate]=useState(null),[notice,setNotice]=useState('');
  const heading=useRef(null);
  async function choose(e){
    const f=e.target.files?.[0];e.target.value='';
    if(!f)return;
    try{
      const garden=await readGardenBackup(f);
      setCandidate({plant:garden.plant,apply:()=>replace(garden)});setNotice('');
    }catch(error){setCandidate(null);setNotice(error.message);}
  }
  const inviting=Boolean(offer && !candidate);
  const blocked=inviting && alerts.denied;
  const title=candidate?'Bring your garden home':offer===2?'Get plant alerts?':'Meet your seed';
  useLayoutEffect(()=>{heading.current?.focus({preventScroll:true});},[title]);
  let copy='A sleepy Monstera is waiting. Give it a name, then use the heart on your keychain to give it its first drink.';
  if(candidate)copy=candidate.plant.name+' · Generation '+candidate.plant.generation+' · '+candidate.plant.graduates.length+' collected';
  else if(inviting)copy=blocked?'Plant alerts are blocked on this device. To receive care reminders, allow notifications for Plantigochi in your device settings.'
    :'Your plant keeps growing while you’re away. Get a heads-up when your seed is ready to sprout or your Monstera gets very thirsty.';
  return <main className="seed-setup"><section className="seed-letter">
    <div className="seed-portrait"><PlantPixel stage={plant?.stage || 'seed'}/></div>
    <h1 ref={heading} tabIndex="-1">{title}</h1>
    <p>{copy}</p>
    <div className="seed-actions">{candidate?<><button onClick={async()=>{try{if(await candidate.apply())return;}catch{}
      setCandidate(null);setNotice('Restore did not finish. Keep your backup and select it again.');}}>Restore this garden</button>
      <button onClick={()=>{setCandidate(null);if(offer)void answer(true);else setup('name');}}>Start fresh instead</button></>:
      inviting?<AlertChoices alerts={alerts} offer={offer} answer={answer}/>:
      <button onClick={()=>setup('name')}>Name your seed</button>}
      {!candidate && phase==='welcome' && <button disabled={inviting && alerts.busy} onClick={()=>file.current.click()}>Restore a garden</button>}
    </div>
    {inviting && !blocked && <small className="alert-invite-status" role="status">{alerts.notice || (!navigator.onLine?
      'You can continue offline and turn on alerts when you reconnect.':!alerts.canEnable?'Preparing plant alerts…':'')}</small>}
    <input ref={file} hidden type="file" accept=".plantigochi,.json,application/json" aria-label="Garden backup" onChange={choose}/>
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
    <p className="name-instructions">{!draft && selected==='Done'?<>Press ♥ to keep <b>{original}</b>. Use the arrows to pick letters.</>:<>Arrows browse. Heart picks a letter or <b>Done</b>.</>}<br/>Back erases. Hold Back to cancel.</p>
    {issue && <p role="alert">{issue}</p>}
  </section>;
  return rename?<dialog className="seed-setup name-modal" ref={dialog} aria-labelledby="plant-name-title" onCancel={e=>e.preventDefault()}>{content}</dialog>:<main className="seed-setup">{content}</main>;
}
