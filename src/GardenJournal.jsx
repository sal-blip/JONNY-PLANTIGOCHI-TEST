import React,{useState} from 'react';
import {BookOpen,Leaf,Plus} from 'lucide-react';
import {addRealPlant,lifeOf,localDay,noteKinds,removeNote,saveNote} from './gardenEconomy.js';
import {changeDraft,clearDraft,openDraft} from './journalDrafts.js';
import CareLibrary from './CareLibrary.jsx';

const dateLabel=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric'});
export default function GardenJournal({plant,change,busy,tab,session,setSession,onTabChange}){
  const [error,setError]=useState('');
  const {subject,editing,drafts}=session;
  const form=drafts[editing],original=form?.original;
  const subjectId=tab==='real'?subject:plant.id;
  const newKey=tab==='real'?'new/real/'+subject:'new/toy';
  const g=lifeOf(plant),real=g.plants.find(p=>p.id===subject);

  function openTab(id){
    if(id===tab || busy)return;
    setError('');onTabChange(id);
  }
  function show(key,content){
    setError('');setSession(current=>openDraft(current,key,content));
  }
  function edit(note){
    show(note?'note/'+note.id:newKey,{
      type:'note',id:note?.id??crypto.randomUUID(),original:note,group:tab,subject:note?.subject??subjectId,
      kind:note?.kind??'Observation',text:note?.text??'',day:localDay(note?.time??Date.now())
    });
  }
  function changeField(fields){setSession(current=>changeDraft(current,editing,fields));}
  function close(){setError('');setSession(current=>clearDraft(current,editing));}
  async function submit(e){
    e.preventDefault();
    let saved=false;
    if(form.type==='plant'){
      const entry={id:form.id,name:form.name.trim(),species:form.species.trim()};
      saved=await change(p=>addRealPlant(p,entry));
      if(saved)setSession(current=>({...current,subject:entry.id}));
    }else{
      const currentTime=Date.now();
      const time=form.day===localDay(original?.time??currentTime)?original?.time??currentTime:new Date(form.day+'T12:00:00').getTime();
      const entry={id:form.id,time,subject:form.subject,group:form.group,kind:form.kind,text:form.text.trim()};
      saved=await change(p=>saveNote(p,entry,original));
    }
    if(saved)close();else setError('Could not save. Check your entry and try again.');
  }
  const notes=g.notes.filter(n=>n.group===tab && (tab==='toy'||n.subject===subject));
  const manual=new Set(notes);
  const rows=[...notes,...(tab==='toy'?g.events:[])].sort((a,b)=>b.time-a.time);
  return <div className="garden-page journal-page">
    <div className="garden-tabs">{[['toy','My Plantigochi'],['real','My real plants'],['library','Care library']].map(([id,label])=>
      <button key={id} aria-pressed={tab===id} disabled={busy} onClick={()=>openTab(id)}>{label}</button>)}</div>
    {tab==='library'?<CareLibrary/>:form?.type==='delete'?<div className="journal-form">
      <p>Delete this journal entry?</p><div className="journal-actions"><button disabled={busy} onClick={async()=>{
        if(await change(p=>removeNote(p,original))){
          setSession(current=>clearDraft(clearDraft(current,'note/'+original.id),editing));setError('');
        }else setError('This entry changed. Reopen it and try again.');
      }}>Delete entry</button><button disabled={busy} onClick={close}>Keep entry</button></div>
    </div>:form?<form onSubmit={submit} className="journal-form">
      {form.type==='plant'?<>
        <label>Plant name<input autoFocus required maxLength="64" disabled={busy} value={form.name} onChange={e=>changeField({name:e.target.value})}/></label>
        <label>Species (optional)<input maxLength="100" disabled={busy} value={form.species} onChange={e=>changeField({species:e.target.value})}/></label>
      </>:<>
        <label>Date<input type="date" required disabled={busy} value={form.day} max={localDay(Date.now())} onChange={e=>changeField({day:e.target.value})}/></label>
        <label>Entry type<select disabled={busy} value={form.kind} onChange={e=>changeField({kind:e.target.value})}>{noteKinds.map(k=><option key={k}>{k}</option>)}</select></label>
        <label>Notes<textarea rows="3" maxLength="2000" disabled={busy} required={form.kind==='Observation'} value={form.text} onChange={e=>changeField({text:e.target.value})}/></label>
      </>}
      <div className="journal-actions"><button disabled={busy} className="primary-btn" type="submit">Save {form.type==='plant'?'plant':'entry'}</button>
        <button type="button" disabled={busy} onClick={close}>Cancel</button></div>
    </form>:<>
      {tab==='real' && <div className="journal-controls">
        {g.plants.length>0 && <label>Plant<select value={subject} onChange={e=>{const id=e.target.value;setSession(current=>({...current,subject:id}));}}>
          <option value="">Choose a plant</option>{g.plants.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>}
        <button onClick={()=>show('plant',{type:'plant',id:crypto.randomUUID(),name:'',species:''})}><Leaf size={17}/> {drafts.plant?'Resume plant draft':'Add a real plant'}</button>
        {real?.species && <small>{real.species}</small>}</div>}
      {(tab==='toy'||real) && <>
        <button className="journal-add" onClick={()=>edit()}><Plus size={18}/> {drafts[newKey]?'Resume draft':'Add an entry'}</button>
        {rows.length===0 && <p className="garden-footnote">Your observations will appear here.</p>}
        <ol className="journal-entries">{rows.map(row=><li key={row.id}><small>{dateLabel.format(row.time)}</small>
          {manual.has(row)?<><strong>{row.kind}</strong>{row.text && <p>{row.text}</p>}
            <div className="journal-actions"><button onClick={()=>edit(row)}>{drafts['note/'+row.id]?'Resume edit':'Edit'}</button>
            <button onClick={()=>show('delete/'+row.id,{type:'delete',original:row})}>Delete</button></div></>:
            <p><BookOpen size={14} aria-hidden="true"/> {row.text}</p>}</li>)}</ol>
      </>}
    </>}
    {form && error && <p role="status">{error}</p>}
  </div>;
}
