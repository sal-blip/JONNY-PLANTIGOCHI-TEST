import React,{useEffect,useState} from 'react';

// Positions follow the edge of the 600 × 565 case, leaving the LCD clear.
const stars=[
  [20,37,12,80],[29,24,8,350],[51,13,12,170],[72,22,9,490],
  [84,37,14,270],[86,60,8,670],[73,83,12,430],[35,84,8,720],[16,64,11,520],
];

export default function SproutCelebration({plant,resting,commit}){
  const stage=plant.growthFlares?.[0],id=plant.id;
  const eligible=Boolean(resting && stage && plant.deadAt===null);
  const [visible,setVisible]=useState(()=>!document.hidden);
  useEffect(()=>{
    const sync=()=>setVisible(!document.hidden);
    document.addEventListener('visibilitychange',sync);
    return ()=>document.removeEventListener('visibilitychange',sync);
  },[]);
  useEffect(()=>{
    if(!eligible || !visible)return;
    let stopped=false,timer;
    async function acknowledge(){
      if(stopped || document.hidden)return;
      const saved=await commit(p=>p.id===id && p.growthFlares?.[0]===stage
        ?{...p,growthFlares:p.growthFlares.slice(1)}:p);
      if(!saved && !stopped)timer=setTimeout(acknowledge,1500);
    }
    timer=setTimeout(acknowledge,window.matchMedia('(prefers-reduced-motion: reduce)').matches?1200:3200);
    return ()=>{stopped=true;clearTimeout(timer);};
  },[eligible,visible,id,stage,commit]);
  if(!eligible || !visible)return null;
  return <>
    <div key={stage} data-growth-flare={stage} className="sprout-burst" aria-hidden="true"><div className="sprout-rays"/></div>
    <div key={stage+"-stars"} className="sprout-stars" aria-hidden="true">
      {stars.map(([x,y,size,delay])=><i key={x} className="sprout-star" style={{
      left:x+'%',top:y+'%','--star-size':size+'px','--twinkle-delay':delay+'ms'
    }}/>)}
    </div>
  </>;
}
