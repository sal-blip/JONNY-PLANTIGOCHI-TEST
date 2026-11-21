import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {drawRoom,placesFor,ROOM_WIDTH,ROOM_HEIGHT,CAT_SEAT,roomLight} from './roomArt.js';
import {drawRoomDepth} from './roomScenery.js';
import {keepsakeFor} from './roomKeepsakes.js';
import {slotFor,speciesName,viewName} from './gardenLayout.js';

export default function RoomView({index,onScreen,running,worldHeight,plants,hour,placing,busy,carry,dragging,selected,choose,cat,petCat,
  openKeepsake,selectedKeepsake=null,jarProgress=null,leafCount=0}) {
  const canvas=useRef(null),depth=useRef(null);
  const above=Math.round((worldHeight-ROOM_HEIGHT)*.39);
  const scene=useRef(null);
  const [focused,setFocused]=useState(null);
  const spots=placesFor(index%2),below=worldHeight-above-ROOM_HEIGHT;
  const object=keepsakeFor(index);
  const active=focused ?? (object && !placing && selectedKeepsake===object.id?object.id:null) ?? selected ?? carry?.from ?? (cat?'cat':null);
  const highlighted=active==='cat'||(object&&active===object.id)?active:spots.findIndex(spot=>slotFor(index,spot)===active);
  const lifted=dragging && carry?spots.findIndex(spot=>slotFor(index,spot)===carry.from):-1;
  scene.current={hour,plants,roomIndex:index,awake:Boolean(cat),highlighted,lifted,above,worldHeight,separatePlanes:true,placing,jarProgress,leafCount};
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const paint=()=>{if(canvas.current && !document.hidden)drawRoom(canvas.current,{...scene.current,time:performance.now(),reducedMotion:media.matches});};
    let timer;
    function refresh(){
      clearInterval(timer);
      if(running && onScreen && !document.hidden){
        paint();
        if(!media.matches)timer=setInterval(paint,160);
      }
    }
    refresh();media.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);
    return ()=>{clearInterval(timer);media.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[onScreen,running]);
  useLayoutEffect(()=>{
    if(canvas.current)drawRoom(canvas.current,{...scene.current,time:performance.now(),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  },[plants,hour,index,cat,highlighted,lifted,worldHeight,above,placing,jarProgress,leafCount]);
  useLayoutEffect(()=>{
    if(depth.current)drawRoomDepth(depth.current,index,roomLight(hour),above);
  },[worldHeight,above,hour,index]);
  return <div className="room-frame" aria-hidden={!onScreen || undefined} inert={!onScreen?'':undefined}
    style={{left:'calc('+index+' * var(--room-width))'}}>
    <canvas className="room-depth" ref={depth} width={ROOM_WIDTH} height={worldHeight} aria-hidden="true"/>
    <canvas className="room-actors" ref={canvas} width={ROOM_WIDTH} height={worldHeight} role="img" aria-label={viewName(index)+(index%2===0?' with an open pot shelf, a sunlit window and a cat on the sofa':' with an artist’s desk and space for your plants')}/>
    <div className="room-interior" style={{top:(100*above/worldHeight)+'%',height:(100*ROOM_HEIGHT/worldHeight)+'%'}}>
    {object && <button type="button" className="room-cat-target room-keepsake-target"
      data-keepsake={object.id} title={object.name} aria-label={'Open '+object.name} aria-haspopup="dialog"
      disabled={placing || busy} style={{left:object.hitX/ROOM_WIDTH*100+'%',top:object.hitY/ROOM_HEIGHT*100+'%',
        width:object.hitWidth/ROOM_WIDTH*100+'%',height:object.hitHeight/ROOM_HEIGHT*100+'%',pointerEvents:placing || busy?'none':undefined}}
      onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setFocused(object.id);}}
      onBlur={()=>setFocused(null)} onPointerDown={()=>setFocused(null)} onClick={()=>openKeepsake?.(object.id,index)}/>}
    {index%2===0 && <button type="button" className="room-cat-target"
      style={{left:CAT_SEAT.x/ROOM_WIDTH*100+'%',top:(CAT_SEAT.y-11*CAT_SEAT.size)/ROOM_HEIGHT*100+'%'}}
      disabled={placing} data-audio="cat" aria-label="Say hello to the cat" onClick={()=>petCat(index)}
      onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setFocused('cat');}}
      onBlur={()=>setFocused(null)} onPointerDown={()=>setFocused(null)}/>}
    {cat && <div className="cat-affection" key={cat.number} style={{left:(CAT_SEAT.x/ROOM_WIDTH*100)+'%',top:((CAT_SEAT.y-23)/ROOM_HEIGHT*100)+'%'}}>
      <span className="sr-only" role="status">The cat purrs.</span>
      <i aria-hidden="true"/><i aria-hidden="true"/><i aria-hidden="true"/>
    </div>}
    {spots.map((spot,i)=>{
      const slot=slotFor(index,spot),plant=plants[i],open=placing && !plant;
      if(!placing && !plant && typeof spot.key==='string')return null;
      const label=plant?(plant.name || speciesName(plant))+' · Gen '+plant.generation:'Empty';
      return <button key={slot} type="button" data-slot={slot} data-occupied={plant?'':undefined}
        data-destination={open?'':undefined} disabled={busy || (placing && !!plant && carry?.from!==slot)}
        className={'place-target'+(open?' open-destination':'')}
        style={{left:spot.x*100+'%',top:(spot.y+spot.front*below/ROOM_HEIGHT)*100+'%','--spot-size':spot.size}}
        aria-label={open?'Place at '+spot.name:spot.name+' · '+label}
        aria-pressed={selected===slot || carry?.from===slot}
        onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setFocused(slot);}}
        onBlur={()=>setFocused(null)} onPointerDown={()=>setFocused(null)}
        title={spot.name} onClick={()=>choose(slot)}/>;
    })}
  </div></div>;
}
