import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,CornerUpLeft,Heart,Leaf} from 'lucide-react';
import DeviceShell from './DeviceShell.jsx';
import PlantPixel from './PlantPixel.jsx';
import {toyVarietyName} from './game.js';

import collectorSeeds from './collectorSeeds.json';
const clues={
  ...Object.fromEntries(Object.entries(collectorSeeds).map(([id,seed])=>[id,seed.clue])),
  'venus-flytrap':'My leaves snap shut.',
  'cape-sundew':'My curling leaves sparkle with dew.',
  'white-top-pitcher':'I grow trumpets with pale veined hoods.',
  monstera:'My leaves split as I grow.',
  'prayer-plant':'My leaves lift at night.',
  'monkey-tail-cactus':'I grow long, fuzzy tails.',
  'golden-pothos':'Gold follows my trailing vines.',
  'hoya-serpens-splash':'My little leaves wear silver freckles.',
  'queen-anthurium':'My velvet leaves grow long.',
  'pink-micans':'My vines blush pink.',
  'bird-of-paradise':'A bright crest opens above my leaves.',
  'moth-orchid':'My blooms open along an arch.'
};

export default function SeedChoice({offers,onChoose,onLater,issue}){
  const dialog=useRef(null),heart=useRef(null),[index,setIndex]=useState(0),[busy,setBusy]=useState(false);
  const species=offers[index],name=toyVarietyName(species);
  useLayoutEffect(()=>{
    const el=dialog.current;el.showModal();heart.current.focus({preventScroll:true});
    return ()=>el.close();
  },[]);
  useEffect(()=>{setIndex(0);},[offers.join('/')]);
  function browse(){if(!busy)setIndex(i=>1-i);}
  async function choose(){
    if(busy)return;
    setBusy(true);
    try{await onChoose(species);}finally{setBusy(false);}
  }
  return <dialog className="seed-setup name-modal" ref={dialog} aria-labelledby="seed-choice-title"
    onCancel={e=>{e.preventDefault();if(!busy)onLater();}} onKeyDown={e=>{
      if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();browse();}
    }}>
    <section className="name-layout">
      <header><Leaf/><h1 id="seed-choice-title">What should we grow next?</h1></header>
      <div className="name-device-space"><div className="device name-device">
        <div className="inspect-shell"><DeviceShell/></div>
        <div className="lcd name-lcd seed-choice-lcd" aria-live="polite">
          <div className="seed-packets" aria-hidden="true">{offers.map((id,i)=>
            <span key={id} className={i===index?'chosen':''}><PlantPixel stage="seed" species={id}/></span>)}</div>
          <strong>{name}</strong><small>{index+1} / 2</small>
        </div>
        <span className="shell-name" aria-hidden="true">PLANTIGOCHI</span>
        <div className="toy-keys">
          <button className="toy-back" aria-label="Return to garden" disabled={busy} onClick={onLater}><CornerUpLeft/></button>
          <button aria-label="Previous seed" disabled={busy} onClick={browse}><ChevronLeft/></button>
          <button className="toy-heart" ref={heart} aria-label={'Plant '+name} disabled={busy} onClick={choose}><Heart/></button>
          <button aria-label="Next seed" disabled={busy} onClick={browse}><ChevronRight/></button>
        </div>
      </div></div>
      <p className="name-instructions" aria-live="polite"><b>{clues[species]}</b><br/>Arrows browse. Heart plants your seed.</p>
      {issue && <p role="alert">{issue}</p>}
    </section>
  </dialog>;
}
