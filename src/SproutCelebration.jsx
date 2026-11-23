import React,{useEffect,useRef,useState} from 'react';

// Positions follow the edge of the 600 × 565 case, leaving the LCD clear.
const stars=[
  [20,37,12,80],[29,24,8,350],[51,13,12,170],[72,22,9,490],
  [84,37,14,270],[86,60,8,670],[73,83,12,430],[35,84,8,720],[16,64,11,520],
];

export default function SproutCelebration({plant,resting,commit}){
  const [playing,setPlaying]=useState(null);
  const shown=useRef(null);
  useEffect(()=>{
    if(!resting || plant.stage!=='sprout' || plant.deadAt!==null || plant.sproutBurstPending!==plant.id)return;
    function reveal(){
      if(document.hidden || shown.current===plant.id)return;
      shown.current=plant.id;
      setPlaying(plant.id);
      void commit(p=>{
        if(p.id!==plant.id || p.sproutBurstPending!==plant.id)return p;
        const {sproutBurstPending,...seen}=p;
        return seen;
      });
    }
    reveal();
    document.addEventListener('visibilitychange',reveal);
    return ()=>document.removeEventListener('visibilitychange',reveal);
  },[plant.id,plant.stage,plant.deadAt,plant.sproutBurstPending,resting,commit]);
  useEffect(()=>{
    if(!playing)return;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer=setTimeout(()=>setPlaying(null),reduced?1200:3200);
    return ()=>clearTimeout(timer);
  },[playing]);
  if(!resting || playing!==plant.id || plant.stage!=='sprout' || plant.deadAt!==null)return null;
  return <>
    <div className="sprout-burst" aria-hidden="true"><div className="sprout-rays"/></div>
    <div className="sprout-stars" aria-hidden="true">
      {stars.map(([x,y,size,delay])=><i key={x} className="sprout-star" style={{
      left:x+'%',top:y+'%','--star-size':size+'px','--twinkle-delay':delay+'ms'
    }}/>)}
    </div>
  </>;
}
