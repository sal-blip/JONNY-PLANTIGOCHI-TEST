import React,{useRef,useState} from 'react';
import {readPlant} from './game.js';
import {backupLimit} from './gardenScenes.js';

export function downloadFile(blob,name) {
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export default function Recovery({issue,raw,replace}) {
  const file=useRef(null);
  const [candidate,setCandidate]=useState(null),[message,setMessage]=useState('');
  return <main className="save-recovery"><section><h1>{issue?'Recover your garden':'Opening your garden…'}</h1>
    {issue && <><p>{issue}</p>
      {raw!=null && <button onClick={()=>downloadFile(new Blob([raw]),'plantigochi-original.json')}>Download original save</button>}
      <button onClick={()=>location.reload()}>Try again</button>
      <button onClick={()=>file.current.click()}>Open backup</button>
      <input ref={file} hidden type="file" accept=".json,application/json" onChange={async e=>{
        const f=e.target.files?.[0];e.target.value='';setCandidate(null);
        try {const p=f && f.size<=backupLimit && readPlant(await f.text());if(!p)throw Error();setCandidate(p);setMessage('');}
        catch{setMessage('Choose a valid Plantigochi backup.');}
      }}/>
      {candidate && <><p>Generation {candidate.generation} · {candidate.graduates.length} collected</p>
        <button onClick={async()=>{if(!await replace(candidate))setMessage('Could not save this backup. Keep the original file.');}}>Restore this garden</button>
        <button onClick={()=>setCandidate(null)}>Cancel</button></>}
      <p role="status">{message}</p></>}
  </section></main>;
}
