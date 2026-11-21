import React,{useEffect,useRef,useState} from 'react';
import {ArrowLeft,BookOpen,ChevronRight,Search,Sprout} from 'lucide-react';
import {careTopics,loadSpecies,localMatches,plantGuides,readRecent,rememberGuide,revisionURL,searchSpecies,WIKIPEDIA_LICENSE} from './careLibrary.js';

const styles=`
.care-library{min-width:0;color:var(--ink,#223b34);font-size:15px;line-height:1.45}
.care-library *{box-sizing:border-box}.care-library .care-search{display:flex;gap:6px;align-items:stretch;margin:4px 0 12px}
.care-library .search-field{display:flex;align-items:center;gap:6px;flex:1;min-width:0;border:1px solid #bdc5ac;border-radius:12px;padding:0 9px;background:#fffdf4}
.care-library .search-field input{min-width:0;width:100%;padding:10px 0;background:transparent;color:inherit;font:inherit;border:0;outline:0}
.care-library .search-field:focus-within,.care-library button:focus-visible,.care-library a:focus-visible{outline:2px solid #416c47;outline-offset:2px}
.care-library .care-go,.care-library .care-back{min-height:42px;border-radius:12px;font:inherit;font-weight:700;cursor:pointer}
.care-library .care-go{border:0;padding:0 11px;color:#fffaf0;background:#33543e}.care-library .care-go:disabled{opacity:.55}
.care-library .care-back{display:inline-flex;align-items:center;gap:5px;border:0;padding:0 8px 0 0;background:none;color:#32533c}
.care-library h3{color:inherit;margin:13px 0 4px;font-size:18px;line-height:1.2}.care-library h4{font-size:16px;margin:16px 0 3px}
.care-library .care-list{display:grid;gap:4px}.care-library .care-row{width:100%;display:flex;gap:9px;align-items:center;padding:8px 9px;min-height:42px;text-align:left;border:1px solid #d4d7c4;border-radius:10px;background:#faf9ec;color:inherit;font:inherit;cursor:pointer}
.care-library .care-row>span{flex:1;min-width:0}.care-library .care-row strong,.care-library .care-row i{display:block}.care-library .care-row i,.care-library .care-note,.care-library .care-credit{font-size:13px;color:#4f6453}
.care-library .care-note,.care-library .care-credit{margin:8px 0}.care-library .care-article h3{font-size:23px;margin-top:2px}.care-library .care-article p{margin:4px 0 8px}.care-library .care-article .care-credit{margin:16px 0 0;border-top:1px solid #d4d7c4;padding:8px 0}
.care-library a{color:#2b5439;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}.care-library .care-credit a{display:inline-block;min-height:25px;margin-right:8px}.care-library svg{flex:none}
`;
function localStorageOrNull(){try{return window.localStorage;}catch{return null;}}
function GuideList({title,items,onOpen,topics=false}){
  if(!items.length)return null;
  const Icon=topics?BookOpen:Sprout;
  return <section><h3>{title}</h3><div className="care-list">{items.map(item=>
    <button type="button" className="care-row" data-care-entry={item.pageId || item.id} key={item.pageId || item.id} onClick={e=>onOpen(item,e.currentTarget)}>
      <Icon size={18} aria-hidden="true"/><span><strong>{item.title}</strong>{item.scientific && item.title!==item.scientific && <i>{item.scientific}</i>}</span><ChevronRight size={15} aria-hidden="true"/>
    </button>)}</div></section>;
}
function Credit({guide}){
  if(guide.revision)return <footer className="care-credit">
    <p>{guide.sections.length?'Plain-text excerpts from English Wikipedia contributors. Some passages are shortened.':'Species article by English Wikipedia contributors.'}</p>
    <a href={revisionURL(guide.revision)} target="_blank" rel="noreferrer">Read article · revision {guide.revision}</a>
    <a href={'https://en.wikipedia.org/w/index.php?title='+encodeURIComponent(guide.title)+'&action=history'} target="_blank" rel="noreferrer">Contributors</a>
    <a href={WIKIPEDIA_LICENSE} target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
  </footer>;
  return <footer className="care-credit"><p>Plantigochi guide · Further reading</p>
    {guide.sources.map(s=><a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.name}</a>)}</footer>;
}

export default function CareLibrary(){
  const [query,setQuery]=useState(''),[results,setResults]=useState([]),[message,setMessage]=useState('');
  const [recent,setRecent]=useState(()=>readRecent(localStorageOrNull())),[guide,setGuide]=useState(null);
  const [busy,setBusy]=useState(false),[online,setOnline]=useState(()=>navigator.onLine!==false);
  const task=useRef(null),opener=useRef(null),heading=useRef(null),library=useRef(null);
  useEffect(()=>{
    const changed=()=>{setOnline(navigator.onLine!==false);if(!navigator.onLine){task.current?.abort();setBusy(false);}};
    window.addEventListener('online',changed);window.addEventListener('offline',changed);
    return ()=>{task.current?.abort();window.removeEventListener('online',changed);window.removeEventListener('offline',changed);};
  },[]);
  useEffect(()=>{if(guide)heading.current?.focus({preventScroll:true});},[guide]);
  function edit(value){task.current?.abort();setQuery(value);setResults([]);setMessage('');setBusy(false);}
  async function run(action){
    task.current?.abort();const controller=new AbortController();task.current=controller;
    setBusy(true);setMessage('');
    const deadline=setTimeout(()=>controller.abort('timeout'),18000);
    try {await action(controller.signal);}
    catch{if(task.current===controller && (!controller.signal.aborted || controller.signal.reason==='timeout'))setMessage('Wikipedia could not finish this lookup. Try again when connected.');}
    finally{clearTimeout(deadline);if(task.current===controller)setBusy(false);}
  }
  async function search(event){
    event.preventDefault();if(!online || query.trim().length<2)return;
    setResults([]);
    await run(async signal=>{
      const found=await searchSpecies(query,signal);if(signal.aborted)return;
      setResults(found);if(!found.length)setMessage('No matching plant species found. Try a scientific name.');
    });
  }
  function open(item,button){
    opener.current=button.dataset.careEntry;task.current?.abort();setBusy(false);setMessage('');
    if(!item.pageId){setGuide(item);return;}
    const saved=recent.find(g=>g.pageId===item.pageId && g.revision===item.revision);
    if(saved){
      setRecent(rememberGuide(saved,recent,localStorageOrNull()));setGuide(saved);return;
    }
    void run(async signal=>{
      const entry=await loadSpecies(item,signal);if(signal.aborted)return;
      setRecent(rememberGuide(entry,recent,localStorageOrNull()));setGuide(entry);
    });
  }
  function goBack(){
    setGuide(null);
    requestAnimationFrame(()=>{
      const rows=library.current?.querySelectorAll('[data-care-entry]') || [];
      const original=[...rows].find(row=>row.dataset.careEntry===opener.current);
      (original || library.current?.querySelector('input'))?.focus({preventScroll:true});
    });
  }
  const local=plantGuides.filter(item=>localMatches(item,query));
  const topics=careTopics.filter(item=>localMatches(item,query));
  return <section ref={library} className="care-library" aria-label="Plant care reference"><style>{styles}</style>
    {guide?<article className="care-article">
      <button type="button" className="care-back" onClick={goBack}><ArrowLeft size={17}/>Back to guides</button>
      <h3 tabIndex={-1} ref={heading}>{guide.title}</h3>
      {guide.scientific && guide.scientific!==guide.title && <i>{guide.scientific}</i>}
      {guide.sections.length?guide.sections.map((section,i)=><section key={i}><h4>{section.title}</h4>{section.paragraphs.map((p,j)=><p key={j}>{p}</p>)}</section>):
        <p>This article has no cultivation or propagation section. You can read the full article below.</p>}
      <Credit guide={guide}/>
    </article>:<>
      <form className="care-search" onSubmit={search} role="search">
        <label className="search-field"><Search size={16} aria-hidden="true"/><input aria-label="Common or scientific plant name" type="search" maxLength={100}
          placeholder="Common or scientific name" value={query} onChange={e=>edit(e.target.value)}/></label>
        <button type="submit" className="care-go" disabled={!online || query.trim().length<2 || busy}>Search</button>
      </form>
      {!online && <p className="care-note">Offline · Starter guides and recently opened species are available.</p>}
      {online && !query && <p className="care-note">Search English Wikipedia for more plant species.</p>}
      <div role="status" aria-live="polite">{busy?<p className="care-note">Checking Wikipedia…</p>:message && <p className="care-note">{message}</p>}</div>
      <GuideList title="Wikipedia species matches" items={results} onOpen={open}/>
      <GuideList title="Starter plant guides" items={local} onOpen={open}/>
      <GuideList title="Care topics" items={topics} topics onOpen={open}/>
      <GuideList title="Recently opened" items={recent.filter(item=>localMatches(item,query))} onOpen={open}/>
    </>}
  </section>;
}
