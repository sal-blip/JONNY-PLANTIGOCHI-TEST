import React,{useEffect,useRef,useState} from 'react';
import {drawRoom,placesFor,ROOM_WIDTH,ROOM_HEIGHT,CAT_SEAT} from './roomArt.js';
import {PLACES_PER_VIEW,speciesName,viewName} from './gardenLayout.js';

export default function RoomView({index,onScreen,plants,hour,placing,carry,dragging,selected,choose,cat,petCat}) {
  const canvas=useRef(null);
  const scene=useRef(null);
  const [focused,setFocused]=useState(null);
  const firstSlot=index*PLACES_PER_VIEW;
  const highlighted=(focused ?? selected ?? carry?.from ?? -1)-firstSlot;
  const lifted=dragging && carry ? carry.from-firstSlot : -1;
  scene.current={hour,plants,roomIndex:index,awake:cat,highlighted,lifted,placing};
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const paint=()=>{if(canvas.current && !document.hidden)drawRoom(canvas.current,{...scene.current,time:performance.now(),reducedMotion:media.matches});};
    let timer;
    function refresh(){clearInterval(timer);paint();if(onScreen&&!media.matches&&!document.hidden)timer=setInterval(paint,160);}
    refresh();media.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);
    return ()=>{clearInterval(timer);media.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[onScreen]);
  useEffect(()=>{
    if(canvas.current)drawRoom(canvas.current,{...scene.current,time:performance.now(),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  },[plants,hour,index,cat,highlighted,lifted,placing]);
  return <div className="room-frame" aria-hidden={!onScreen || undefined} inert={!onScreen?'':undefined}
    style={{left:index*100+'%'}}>
    <canvas ref={canvas} width={ROOM_WIDTH} height={ROOM_HEIGHT} role="img" aria-label={viewName(index)+(index%2===0?' with an open pot shelf, a sunlit window and a cat on the sofa':' with an artist’s desk and space for your plants')}/>
    {index%2===0 && <button type="button" className="room-cat-target" style={{left:CAT_SEAT.x/ROOM_WIDTH*100+'%',top:(CAT_SEAT.y-11*CAT_SEAT.size)/ROOM_HEIGHT*100+'%'}} aria-label="Say hello to the cat" onClick={petCat}/>}
    {placesFor(index%2).map((spot,i)=>{
      const slot=index*PLACES_PER_VIEW+i,plant=plants[i];
      return <button key={slot} type="button" data-slot={slot}
        className="place-target"
        style={{left:spot.x*100+'%',top:spot.y*100+'%','--spot-size':spot.size}}
        aria-label={spot.name+' · '+(plant?speciesName(plant)+' generation '+plant.generation:'Empty')}
        aria-pressed={selected===slot || carry?.from===slot}
        onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setFocused(slot);}}
        onBlur={()=>setFocused(null)} onPointerDown={()=>setFocused(null)}
        title={spot.name} onClick={()=>choose(slot)}/>;
    })}
  </div>;
}
