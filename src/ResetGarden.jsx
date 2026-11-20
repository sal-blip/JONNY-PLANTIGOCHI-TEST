import React,{useEffect,useRef,useState} from 'react';
import {downloadFile} from './Recovery.jsx';

export default function ResetGarden({plant,reset,cancel}){
  const [step,setStep]=useState(1),[word,setWord]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const heading=useRef(null);
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[step]);
  async function erase(){
    if(busy || step!==3 || word!=='RESET')return;
    setBusy(true);
    if(!await reset()){setError('The reset could not finish. Reopen Settings and try again.');setBusy(false);}
  }
  return <section className="reset-panel">
    <p className="reset-step">Confirmation {step} of 3</p>
    <h2 tabIndex="-1" ref={heading}>{['Review what will be erased','Confirm this installation','Delete your garden?'][step-1]}</h2>
    {step===1 && <><p>This removes {plant.name}, your collected plants, Leaf Book, cuttings, game progress, custom photo, preferences, and alerts.</p>
      <button className="text-action" onClick={()=>downloadFile(new Blob([JSON.stringify(plant)],{type:'application/json'}),'plantigochi-backup.json')}>Back up garden</button></>}
    {step===2 && <p>Plantigochi stays installed and starts again at the welcome tour. Downloaded backups and gardens stored separately in another browser or on another device stay there.</p>}
    {step===3 && <label>Type RESET<input aria-label="Type RESET" value={word} autoComplete="off" autoCorrect="off" spellCheck={false} onChange={e=>setWord(e.target.value)}/></label>}
    <div className="save-buttons"><button onClick={cancel} disabled={busy}>Cancel</button>
      {step<3?<button onClick={()=>setStep(step+1)}>{step===1?'Continue':'Continue to final confirmation'}</button>:
      <button className="erase-button" disabled={word!=='RESET' || busy} onClick={erase}>Delete everything and restart</button>}</div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
