import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';

let sequence=0;
let outgoingAnimation;
const motionPreference=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Only presentation changes pass through here. Install, permission and save actions
// still run directly from the player's gesture and keep their original timing.
export function transitionOnboarding(update,kind='scene'){
  const id=++sequence, root=document.documentElement;
  outgoingAnimation?.finish();
  if(document.hidden || motionPreference()){delete root.dataset.onboardingMotion;update();return;}
  root.dataset.onboardingMotion=kind;
  function finish(){if(sequence===id)delete root.dataset.onboardingMotion;}
  function swap(){flushSync(update);}
  if(document.startViewTransition){
    const transition=document.startViewTransition(swap);
    // A second navigation can supersede the snapshot before it is ready.
    transition.ready.catch(()=>{});
    transition.finished.then(finish,finish);
    return;
  }
  // Earlier mobile browsers can dissolve through the same paper backdrop.
  const surface=()=>kind==='scene'
    ? document.querySelector('dialog[open]') || document.querySelector('#root > main')
    : document.querySelector('.tour-story');
  const distance=kind==='forward'?12:kind==='backward'?-12:0;
  const faded=offset=>({opacity:0,filter:'blur(2px)',transform:'translateX('+offset+'px)'});
  const clear={opacity:1,filter:'blur(0px)',transform:'none'};
  const outgoing=surface()?.animate?.([clear,faded(-distance)],{duration:120,easing:'ease-in',fill:'forwards'});
  if(!outgoing){update();finish();return;}
  outgoingAnimation=outgoing;
  outgoing.finished.then(()=>{
    outgoing.cancel();
    if(outgoingAnimation===outgoing)outgoingAnimation=null;
    swap();
    if(sequence!==id)return;
    const incoming=surface()?.animate?.([faded(distance),clear],{duration:210,easing:'ease-out'});
    if(incoming)incoming.finished.then(finish,finish);else finish();
  },finish);
}

// Keep the last committed screen visible while storage settles or the browser
// captures it. The incoming screen is the only mounted scene after the swap.
export default function OnboardingTransition({scene,children}){
  const [shown,setShown]=useState(scene);
  const previous=useRef(children);
  useLayoutEffect(()=>{if(scene===shown)previous.current=children;},[shown,scene,children]);
  useEffect(()=>{
    if(scene===null || scene===shown)return;
    let current=true;
    const show=()=>{if(current)setShown(scene);};
    if(shown===null)show();else transitionOnboarding(show);
    return ()=>{current=false;};
  },[scene,shown]);
  return scene===shown?children:previous.current;
}
