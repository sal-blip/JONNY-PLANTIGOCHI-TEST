import React,{useEffect,useRef,useState} from 'react';
import {downloadCurrentGarden,downloadOriginalSave} from './useGardenSave.js';

export default function ResetGarden({plant,original,reset,cancel}){
  const [step,setStep]=useState(1),[word,setWord]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const heading=useRef(null),confirmed=useRef(null);
  const [backupNotice,setBackupNotice]=useState(''),[exporting,setExporting]=useState(false);
  async function backUp(){
    setExporting(true);setBackupNotice('');
    try{setBackupNotice(await downloadCurrentGarden('plantigochi-backup',plant?undefined:original));}
    catch{setBackupNotice('Could not download this garden. Try again before resetting.');}
    finally{setExporting(false);}
  }
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[step]);
  async function erase(){
    if(busy || step!==3 || word!=='RESET')return;
    setBusy(true);
    if(!await confirmed.current()){setError('The reset could not finish. Review this garden again before deleting.');setBusy(false);setWord('');setStep(1);}
  }
  return <section className="reset-panel">
    <p className="reset-step">Confirmation {step} of 3</p>
    <h2 tabIndex="-1" ref={heading}>{['Review what will be erased','Confirm this installation','Delete your garden?'][step-1]}</h2>
    {step===1 && <><p>{plant?'This removes '+plant.name+', your collected plants, Leaf Book, cuttings, game progress, custom photo, preferences, and alerts.':'This erases the unreadable save, preferences and alerts on this installation. Keep a copy of the original if you want to try recovering it later.'}</p>
      {(plant || original!=null) && <button className="text-action" disabled={exporting} onClick={backUp}>Back up garden</button>}
      {original!=null && <button className="text-action" onClick={()=>setBackupNotice(downloadOriginalSave(original))}>Download original save</button>}
      {backupNotice && <p role="status">{backupNotice}</p>}</>}
    {step===2 && <p>Plantigochi stays installed and starts again at the welcome tour. Downloaded backups and gardens stored separately in another browser or on another device stay there.</p>}
    {step===3 && <label>Type RESET<input aria-label="Type RESET" value={word} autoComplete="off" autoCorrect="off" spellCheck={false} onChange={e=>setWord(e.target.value)}/></label>}
    <div className="save-buttons"><button onClick={cancel} disabled={busy}>Cancel</button>
      {step<3?<button disabled={exporting} onClick={()=>{if(step===1){confirmed.current=reset;setError('');}setStep(step+1);}}>{step===1?'Continue':'Continue to final confirmation'}</button>:
      <button className="erase-button" disabled={word!=='RESET' || busy} onClick={erase}>Delete everything and restart</button>}</div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
