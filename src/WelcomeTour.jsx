import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Leaf} from 'lucide-react';
import LeafReveal from './LeafReveal.jsx';
import {drawRoom,roomLight,ROOM_WIDTH,ROOM_HEIGHT} from './roomArt.js';
import {drawRoomDepth} from './roomScenery.js';
import InstallHelp from './InstallHelp.jsx';
import {exportGardenRaw,downloadCurrentGarden} from './useGardenSave.js';
import {transitionOnboarding} from './OnboardingTransition.jsx';
import './WelcomeTour.css';

const cards=[
  {lead:'Meet your',name:'Plantigochi',copy:'A tiny Monstera to raise, right on your phone.'},
  {lead:'Watch it',name:'grow',copy:'Water it, play together, and watch new leaves unfold over a week of good care.'},
  {lead:'Give it',name:'a home',copy:'Move grown plants into your garden, arrange them your way, and start again with a new seed.'},
  {lead:'Your seed is',name:'ready',copy:'Install Plantigochi to start your garden and save your progress on this phone.'},
];
const last=cards.length-1;
const installedCards=[...cards.slice(0,last),{lead:'Your pocket',name:'garden',copy:'Your seed is ready to meet you.'}];
const titleOf=card=>card.lead+' '+card.name;

function RoomPreview(){
  const canvas=useRef(null);
  useLayoutEffect(()=>{
    const preview=canvas.current, actors=document.createElement('canvas');
    function paint(){
      if(!preview.clientWidth)return;
      const height=Math.max(ROOM_HEIGHT,Math.round(ROOM_WIDTH*preview.clientHeight/preview.clientWidth));
      const above=Math.round((height-ROOM_HEIGHT)*.39);
      preview.height=actors.height=height;
      actors.width=ROOM_WIDTH;
      drawRoomDepth(preview,0,roomLight(12),above);
      drawRoom(actors,{hour:12,worldHeight:height,above,separatePlanes:true,reducedMotion:true});
      preview.getContext('2d')?.drawImage(actors,0,0);
    }
    paint();
    const observer=new ResizeObserver(paint);
    observer.observe(preview);
    return ()=>observer.disconnect();
  },[]);
  return <canvas ref={canvas} className="tour-room-art" width={ROOM_WIDTH} height={ROOM_HEIGHT}
    role="img" aria-label="Your garden living room, with open shelves and a cat resting on the sofa"/>;
}

function TourArt({step}){
  switch(step){
    case 0:return <img className="tour-device" src="/art/welcome-device.webp" alt="Leaf-shaped keychain with a sleeping amber seed on its color screen"/>;
    case 1:return <div className="tour-life-art">
      <img className="tour-stages" src="/art/welcome-growth.webp" alt="Sleeping seed, green sprout and mature split-leaf Monstera"/>
      <figure><img src="/art/welcome-dew.webp" alt="Catching blue water droplets in a terracotta pot"/><figcaption>Dew Catch</figcaption></figure>
    </div>;
    case 2:return <RoomPreview/>;
    default:return <div className="tour-phone-picture" aria-label="Plantigochi on a phone Home Screen" role="img">
      <img src="/icons/icon-192.png" alt=""/><span>Plantigochi</span><i aria-hidden="true"/>
    </div>;
  }
}

export default function WelcomeTour({phone,onBegin,onClose,issue}){
  const installed=phone.standalone;
  const installStep=last+1;
  const [step,setStep]=useState(()=>!installed && location.hash==='#install'?installStep:0);
  const [splash,setSplash]=useState(()=>!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const heading=useRef(null), dialog=useRef(null), touch=useRef(null), requested=useRef(step);
  const [canExport,setCanExport]=useState(false);
  const [exportNotice,setExportNotice]=useState(''),[exporting,setExporting]=useState(false);
  const installing=!installed && step===installStep;
  const pages=installed?installedCards:cards;
  const card=installing?{lead:'Install',name:'Plantigochi',copy:'Your garden saves on this phone. After installing, open the Plantigochi icon to meet your seed.'}:pages[step];
  useLayoutEffect(()=>{
    const el=dialog.current;
    if(el && !el.open)el.showModal();
    return ()=>{if(el?.open)el.close();};
  },[]);
  useLayoutEffect(()=>{heading.current?.focus({preventScroll:true});},[step]);
  useEffect(()=>{
    if(!installing)return;
    let active=true;
    exportGardenRaw().then(raw=>{if(active)setCanExport(raw!=null);}).catch(()=>{});
    return ()=>{active=false;};
  },[installing]);
  async function exportExisting(){
    setExporting(true);setExportNotice('');
    try {
      setExportNotice(await downloadCurrentGarden('plantigochi-backup'));
    }catch{setExportNotice('Could not download this browser garden. Try again.');}
    finally{setExporting(false);}
  }
  useEffect(()=>{
    if(!splash)return;
    const stop=()=>setSplash(false);
    const timer=setTimeout(stop,3400);
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    motion.addEventListener('change',stop);
    return ()=>{clearTimeout(timer);motion.removeEventListener('change',stop);};
  },[splash]);

  function play(){
    // Keep the native install call in the tap so the browser sees user activation.
    const url=new URL(location.href);
    url.hash='install';
    history.replaceState(history.state,'',url);
    requested.current=installStep;
    setStep(installStep);
    if(phone.installState==='available')void phone.promptInstall();
  }
  function go(next){
    if(next<0 || next>last || next===requested.current)return;
    if(installing){
      const url=new URL(location.href);
      url.hash='';
      history.replaceState(history.state,'',url);
    }
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
  const content=<div className={'tour-sheet tour-page-'+Math.min(last,step)} onKeyDown={keys}
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
        {splash && step===0 && <LeafReveal title="Plantigochi"/>}
      </div>
      <div className="tour-words">
        <h1 ref={heading} tabIndex="-1" id="welcome-title">{card.lead} <em>{card.name}</em></h1>
        <p className="tour-caption">{card.copy}</p>
        {installing ? <div className="tour-install"><InstallHelp tour phone={phone}/></div> :
          <div className="tour-actions">
            {step<last ? <button className="tour-primary" onClick={()=>go(step+1)}>{['Take a peek','Next','Continue'][step]}</button> :
              installed ? <button className="tour-primary" onClick={onBegin || onClose}>{onBegin?'Begin setup':'Back to game'}</button> :
              <button className="tour-primary" onClick={play}>Play Plantigochi</button>}
          </div>}
      </div>
    </div>
    <footer className="tour-footer">
      <button className="tour-back" disabled={step===0} onClick={()=>go(step-1)}>Back</button>
      {!installing && <nav className="tour-dots" aria-label="Welcome screens">{pages.map((c,i)=>
        <button key={c.name} aria-label={'Show '+titleOf(c)} aria-current={step===i?'step':undefined}
          onClick={()=>go(i)}><i/></button>)}</nav>}
      {installing && canExport && <button className="tour-skip" disabled={exporting} onClick={exportExisting}>Export existing garden</button>}
      {issue && <span role="alert">{issue}</span>}
      {exportNotice && <span role="status">{exportNotice}</span>}
    </footer>
  </div>;
  return onClose ? <dialog className="welcome-modal" ref={dialog} aria-labelledby="welcome-title"
    onCancel={e=>{e.preventDefault();onClose();}}>{content}</dialog> :
    <main className="welcome-tour" aria-labelledby="welcome-title">{content}</main>;
}
