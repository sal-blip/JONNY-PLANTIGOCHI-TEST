import React,{useEffect,useState} from 'react';
import {BookOpen,Leaf,Plus} from 'lucide-react';
import {addRealPlant,lifeOf,localDay,noteKinds,removeNote,saveNote} from './gardenEconomy.js';
import CareLibrary from './CareLibrary.jsx';

const dateLabel=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'});
export default function GardenJournal({plant,change,busy,initialTab='toy',onTabChange}){
  const startTab=['real','library'].includes(initialTab)?initialTab:'toy';
  const [tab,setTab]=useState(startTab),[subject,setSubject]=useState('');
  const [form,setForm]=useState(null),[original,setOriginal]=useState(),[error,setError]=useState('');
  const g=lifeOf(plant),real=g.plants.find(p=>p.id===subject);
  useEffect(()=>{
    setTab(startTab);setForm(null);setOriginal(undefined);setError('');
  },[startTab]);
  function reset(){setForm(null);setOriginal(undefined);setError('');}
  function openTab(id){reset();setTab(id);onTabChange?.(id);}
  function edit(note){
    setOriginal(note);
    setForm({type:'note',id:note?.id??crypto.randomUUID(),kind:note?.kind??'Observation',text:note?.text??'',day:localDay(note?.time??Date.now())});
    setError('');
  }
  async function submit(e){
    e.preventDefault();
    let saved=false;
    if(form.type==='plant'){
      const entry={id:form.id,name:form.name.trim(),species:form.species.trim()};
      saved=await change(p=>addRealPlant(p,entry));
      if(saved)setSubject(entry.id);
    }else{
      const currentTime=Date.now();
      const time=form.day===localDay(original?.time??currentTime)?original?.time??currentTime:new Date(form.day+'T12:00:00').getTime();
      const entry={id:form.id,time,subject:original?.subject??(tab==='real'?subject:plant.id),group:tab,kind:form.kind,text:form.text.trim()};
      saved=await change(p=>saveNote(p,entry,original));
    }
    if(saved)reset();else setError('Could not save. Check your entry and try again.');
  }
  const notes=g.notes.filter(n=>n.group===tab && (tab==='toy'||n.subject===subject));
  const rows=[...notes.map(n=>({...n,manual:true})),...(tab==='toy'?g.events:[])].sort((a,b)=>b.time-a.time);
  return <div className="garden-page journal-page">
    <div className="garden-tabs">{[['toy','My Plantigochi'],['real','My real plants'],['library','Care library']].map(([id,label])=>
      <button key={id} aria-pressed={tab===id} onClick={()=>openTab(id)}>{label}</button>)}</div>
    {tab==='library'?<CareLibrary/>:form?.type==='delete'?<div className="journal-form">
      <p>Delete this journal entry?</p><div className="journal-actions"><button disabled={busy} onClick={async()=>{
        if(await change(p=>removeNote(p,original)))reset();else setError('This entry changed. Reopen it and try again.');
      }}>Delete entry</button><button onClick={reset}>Keep entry</button></div>
    </div>:form?<form onSubmit={submit} className="journal-form">
      {form.type==='plant'?<>
        <label>Plant name<input autoFocus required maxLength="64" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label>Species (optional)<input maxLength="100" value={form.species} onChange={e=>setForm({...form,species:e.target.value})}/></label>
      </>:<>
        <label>Date<input type="date" required value={form.day} max={localDay(Date.now())} onChange={e=>setForm({...form,day:e.target.value})}/></label>
        <label>Entry type<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}>{noteKinds.map(k=><option key={k}>{k}</option>)}</select></label>
        <label>Notes<textarea rows="3" maxLength="2000" required={form.kind==='Observation'} value={form.text} onChange={e=>setForm({...form,text:e.target.value})}/></label>
      </>}
      <div className="journal-actions"><button disabled={busy} className="primary-btn" type="submit">Save {form.type==='plant'?'plant':'entry'}</button>
        <button type="button" onClick={reset}>Cancel</button></div>
    </form>:<>
      {tab==='real' && <div className="journal-controls">
        {g.plants.length>0 && <label>Plant<select value={subject} onChange={e=>setSubject(e.target.value)}>
          <option value="">Choose a plant</option>{g.plants.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>}
        <button onClick={()=>setForm({type:'plant',id:crypto.randomUUID(),name:'',species:''})}><Leaf size={17}/> Add a real plant</button>
        {real?.species && <small>{real.species}</small>}</div>}
      {(tab==='toy'||real) && <>
        <button className="journal-add" onClick={()=>edit()}><Plus size={18}/> Add an entry</button>
        {rows.length===0 && <p className="garden-footnote">Your observations will appear here.</p>}
        <ol className="journal-entries">{rows.map(row=><li key={row.id}><small>{dateLabel.format(row.time)}</small>
          {row.manual?<><strong>{row.kind}</strong>{row.text && <p>{row.text}</p>}
            <div className="journal-actions"><button onClick={()=>edit(row)}>Edit</button><button onClick={()=>{setOriginal(row);setForm({type:'delete'});}}>Delete</button></div></>:
            <p><BookOpen size={14} aria-hidden="true"/> {row.text}</p>}</li>)}</ol>
      </>}
    </>}
    {error && <p role="status">{error}</p>}
  </div>;
}
