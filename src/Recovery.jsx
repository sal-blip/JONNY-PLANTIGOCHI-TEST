import React,{useRef,useState} from 'react';
import ResetGarden from './ResetGarden.jsx';
import {downloadCurrentGarden,downloadOriginalSave} from './useGardenSave.js';
import {readGardenBackup} from './gardenBackup.js';
export {downloadFile} from './gardenBackup.js';

export default function Recovery({issue,raw,recoverable,replace,reset}){
  const file=useRef(null);
  const [candidate,setCandidate]=useState(null),[message,setMessage]=useState('');
  const [erasing,setErasing]=useState(false),[exporting,setExporting]=useState(false);
  async function backUp(){
    setExporting(true);setMessage('');
    try{setMessage(await downloadCurrentGarden('plantigochi-backup',raw));}
    catch{setMessage('Could not download this garden. Try downloading the original save.');}
    finally{setExporting(false);}
  }
  async function choose(event){
    const selected=event.target.files?.[0];event.target.value='';setCandidate(null);
    if(!selected)return;
    try{
      const backup=await readGardenBackup(selected);
      setCandidate({plant:backup.plant,apply:()=>replace(backup)});setMessage('');
    }catch(error){setMessage(error.message);}
  }
  return <main className="save-recovery"><section><h1>{issue?'Recover your garden':'Opening your garden…'}</h1>
    {erasing?<ResetGarden original={raw} reset={reset} cancel={()=>setErasing(false)}/>:
      issue && <><p>{issue}</p>
        {raw!=null && <>{recoverable && <button onClick={backUp} disabled={exporting}>Back up garden</button>}
          <button onClick={()=>setMessage(downloadOriginalSave(raw))}>Download original save</button></>}
        <button onClick={()=>location.reload()}>Try again</button>
        {recoverable && <>
          <button onClick={()=>file.current.click()}>Open backup</button>
          <input ref={file} hidden type="file" accept=".plantigochi,.json,application/json" aria-label="Garden backup" onChange={choose}/>
          {candidate && <><p>Generation {candidate.plant.generation} · {candidate.plant.graduates.length} collected</p>
            <button onClick={async()=>{try{if(await candidate.apply())return;}catch{}
              setCandidate(null);setMessage('Restore did not finish. Keep the backup and select it again.');}}>Restore this garden</button>
            <button onClick={()=>setCandidate(null)}>Cancel</button></>}
          <button onClick={()=>{setCandidate(null);setErasing(true);}}>Start a fresh garden</button>
        </>}
        <p role="status">{message}</p>
      </>}
  </section></main>;
}
