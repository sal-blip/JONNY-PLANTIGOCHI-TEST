import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Leaf} from 'lucide-react';
import InstallHelp from './InstallHelp.jsx';
import {exportGardenRaw} from './useGardenSave.js';
import {downloadFile} from './Recovery.jsx';
import {transitionOnboarding} from './OnboardingTransition.jsx';
import './WelcomeTour.css';

const cards=[
  {lead:'Meet your',name:'Plantigochi',copy:'A tiny Monstera to raise, right on your phone.'},
  {lead:'Watch it',name:'grow',copy:'Water it, play together, and watch new leaves unfold over a week of good care.'},
  {lead:'Give it',name:'a home',copy:'Move grown plants into your garden, arrange them your way, and start again with a new seed.'},
  {lead:'Add to your',name:'Home Screen',copy:'Install to play. Already installed? Open the Plantigochi icon.'},
];
const last=cards.length-1;
const titleOf=card=>card.lead+' '+card.name;

function TourArt({step}){
  switch(step){
    case 0:return <img className="tour-device" src="/art/welcome-device.webp" alt="Leaf-shaped keychain with a sleeping amber seed on its color screen"/>;
    case 1:return <div className="tour-life-art">
      <img className="tour-stages" src="/art/welcome-growth.webp" alt="Sleeping seed, green sprout and mature split-leaf Monstera"/>
      <figure><img src="/art/welcome-dew.webp" alt="Catching blue water droplets in a terracotta pot"/><figcaption>Dew Catch</figcaption></figure>
    </div>;
    case 2:return <img className="tour-room-art" src="/art/welcome-apartment.webp" alt="Collected Monsteras on shelves and tables by a sunny window, with a calico on the sofa"/>;
    default:return <div className="tour-phone-picture" aria-label="Plantigochi on a phone Home Screen" role="img">
      <img src="/icons/icon-192.png" alt=""/><span>Plantigochi</span><i aria-hidden="true"/>
    </div>;
  }
}

export default function WelcomeTour({phone,onBegin,onClose,issue}){
  const [step,setStep]=useState(0);
  const [splash,setSplash]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const heading=useRef(null), dialog=useRef(null), touch=useRef(null), requested=useRef(0);
  const [canExport,setCanExport]=useState(false);
  const [exportError,setExportError]=useState('');
  const installed=phone.standalone;
  const card=step===last && installed?{lead:'Your pocket',name:'garden',copy:'Your seed is ready to meet you.'}:cards[step];
  useLayoutEffect(()=>{
    const el=dialog.current;
    if(el && !el.open)el.showModal();
    return ()=>{if(el?.open)el.close();};
  },[]);
  useLayoutEffect(()=>{heading.current?.focus({preventScroll:true});},[step]);
  useEffect(()=>{
    if(installed || step!==last)return;
    let active=true;
    exportGardenRaw().then(raw=>{if(active)setCanExport(raw!=null);}).catch(()=>{});
    return ()=>{active=false;};
  },[installed,step]);
  async function exportExisting(){
    try {
      const raw=await exportGardenRaw();
      if(raw==null){setCanExport(false);return;}
      downloadFile(new Blob([raw],{type:'application/json'}),'plantigochi-backup.json');
    }catch{setExportError('Could not read this browser garden. Try again.');}
  }
  useEffect(()=>{
    if(!splash)return;
    const stop=()=>setSplash(false);
    const timer=setTimeout(stop,1850);
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    motion.addEventListener('change',stop);
    return ()=>{clearTimeout(timer);motion.removeEventListener('change',stop);};
  },[splash]);

  function go(next){
    if(next<0 || next>last || next===requested.current)return;
    requested.current=next;
    transitionOnboarding(()=>{
      if(requested.current===next){setSplash(false);setStep(next);}
    },next>step?'forward':'backward');
  }
  function keys(e){
    if(e.altKey || e.metaKey || e.ctrlKey || e.target.matches('input,textarea'))return;
    if(e.key==='ArrowRight' || e.key==='ArrowLeft'){
      e.preventDefault();go(step+(e.key==='ArrowRight'?1:-1));
    }else if(e.key==='Escape'){
      e.preventDefault();if(splash)setSplash(false);else onClose?.();
    }
  }
  const content=<div className={'tour-sheet tour-page-'+step} onKeyDown={keys}
    onTouchStart={e=>{const t=e.touches[0];touch.current=e.touches.length===1 && !e.target.closest('button,input,a')?[t.clientX,t.clientY]:null;}}
    onTouchCancel={()=>{touch.current=null;}}
    onTouchEnd={e=>{if(!touch.current)return;const [x,y]=touch.current;touch.current=null;
      const t=e.changedTouches[0],dx=t.clientX-x,dy=t.clientY-y;
      if(Math.abs(dx)>42 && Math.abs(dx)>Math.abs(dy)*1.4)go(step+(dx<0?1:-1));}}>
    <header className="tour-header">
      <span className="tour-brand"><Leaf aria-hidden="true"/>Plantigochi</span>
      {onClose && <button className="tour-skip" onClick={onClose}>Back to game</button>}
    </header>
    <div className="tour-story">
      <div className="tour-art" key={'art'+step}>
        <TourArt step={step}/>
        {splash && step===0 && <div className="tour-splash" aria-hidden="true">
          <i/><i/><strong>Plantigochi</strong>
        </div>}
      </div>
      <div className="tour-words">
        <h1 ref={heading} tabIndex="-1" id="welcome-title">{card.lead} <em>{card.name}</em></h1>
        <p className="tour-caption">{card.copy}</p>
        {step===last ? <div className="tour-install">{installed ? <button className="tour-primary" onClick={onBegin || onClose}>{onBegin?'Begin setup':'Back to game'}</button> : <InstallHelp tour phone={phone}/>}</div> :
          <div className="tour-actions">
            <button className="tour-primary" onClick={()=>go(step+1)}>{['Take a peek','Next',installed?'Continue':'Get Plantigochi'][step]}</button>
            {step===0 && !installed && <button className="tour-secondary" onClick={()=>go(last)}>Get Plantigochi</button>}
          </div>}
      </div>
    </div>
    <footer className="tour-footer">
      <button className="tour-back" disabled={step===0} onClick={()=>go(step-1)}>Back</button>
      <nav className="tour-dots" aria-label="Welcome screens">{cards.map((c,i)=>
        <button key={c.name} aria-label={'Show '+titleOf(c)} aria-current={step===i?'step':undefined}
          onClick={()=>go(i)}><i/></button>)}</nav>
      {step===last && canExport && <button className="tour-skip" onClick={exportExisting}>Export existing garden</button>}
      {(exportError || issue) && <span role="alert">{exportError || issue}</span>}
    </footer>
  </div>;
  return onClose ? <dialog className="welcome-modal" ref={dialog} aria-labelledby="welcome-title"
    onCancel={e=>{e.preventDefault();onClose();}}>{content}</dialog> :
    <main className="welcome-tour" aria-labelledby="welcome-title">{content}</main>;
}
