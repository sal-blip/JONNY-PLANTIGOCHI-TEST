import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUp,ChevronLeft,ChevronRight,Image as ImageIcon,Share,Sprout} from 'lucide-react';
import {drawRoom,placesFor,ROOM_WIDTH,ROOM_HEIGHT,roomLight} from './roomArt.js';
import {drawPottedPlant} from './roomPlant.js';
import {gardenViews,PLACES_PER_VIEW,speciesName,viewName} from './gardenLayout.js';
import RoomView from './RoomView.jsx';
import {downloadFile} from './Recovery.jsx';
import GameLink from './GameLink.jsx';

const placeName=slot=>placesFor(Math.floor(slot/PLACES_PER_VIEW)%2)[slot%PLACES_PER_VIEW].name;
const clamp=(v,max)=>Math.min(max,Math.max(0,v));
function firstVacant(plants) {
  const occupied=new Set(plants.map(g=>g.slot));
  let i=0;while(occupied.has(i))i++;
  return i;
}

export default function Collector({plant,moving,now,move,relocate,shareLink,startClose}) {
  const graduates=plant.graduates;
  const count=gardenViews(graduates);
  const [room,setRoom]=useState(()=>moving?Math.floor(firstVacant(graduates)/PLACES_PER_VIEW):0);
  const page=clamp(room,count-1);
  const [slot,setSlot]=useState(null),[notice,setNotice]=useState('');
  const [carry,setCarry]=useState(null),[busy,setBusy]=useState(false),[postcard,setPostcard]=useState(null);
  const [pan,setPan]=useState(null),[ghost,setGhost]=useState(null),[cat,setCat]=useState(false);
  const [dropOver,setDropOver]=useState(null);
  const gesture=useRef(null),ignoreClick=useRef(false),edge=useRef(null),catTimer=useRef(null);
  const stage=useRef(null),back=useRef(null),previewButton=useRef(null),ghostCanvas=useRef(null);
  const mounted=useRef(false),pending=useRef(false);
  const collection=useMemo(()=>new Map(graduates.map(p=>[p.slot,p])),[graduates]);
  const picking=moving===plant.id && plant.stage==='grown' && plant.deadAt===null;
  const inHand=carry && collection.get(carry.from)?.id===carry.id?collection.get(carry.from):null;
  const chosen=slot===null?null:collection.get(slot);
  const clock=new Date(now),hour=clock.getHours()+clock.getMinutes()/60;
  const potted=useMemo(()=>{
    const result={};
    for(let view=Math.max(0,page-1);view<=Math.min(count-1,page+1);view++)
      result[view]=Array.from({length:PLACES_PER_VIEW},(_,i)=>collection.get(view*PLACES_PER_VIEW+i));
    return result;
  },[collection,count,page]);
  useEffect(()=>{
    mounted.current=true;back.current?.focus();
    return ()=>{mounted.current=false;clearTimeout(edge.current);clearTimeout(catTimer.current);};
  },[]);
  useEffect(()=>{
    if(carry && !inHand && !pending.current){setCarry(null);setGhost(null);setNotice('This plant has moved. Pick it up again.');}
  },[carry,inHand]);
  useEffect(()=>()=>{if(postcard?.url)URL.revokeObjectURL(postcard.url);},[postcard]);
  useEffect(()=>{
    if(!ghostCanvas.current || !inHand)return;
    const ctx=ghostCanvas.current.getContext('2d');
    ctx.clearRect(0,0,76,82);
    drawPottedPlant(ctx,{x:38,y:74,size:1.28,plant:inHand,night:1-roomLight(hour).day,reducedMotion:true,selected:true});
  },[Boolean(ghost),inHand,hour]);

  const travel=useCallback(n=>{
    setCat(false);
    setRoom(clamp(n,count-1));setSlot(null);setNotice('');setPan(null);setDropOver(null);
  },[count]);
  function returnCard(){setPostcard(null);requestAnimationFrame(()=>previewButton.current?.focus());}
  function cancelCarry(){setCarry(null);setSlot(null);setGhost(null);setDropOver(null);setNotice('');}
  function pickUp(p){setCarry({id:p.id,from:p.slot});setSlot(null);setCat(false);setNotice('');}
  async function putDown(target,source) {
    if(pending.current || target===null || collection.has(target))return;
    pending.current=true;setBusy(true);
    try{
      const ok=source ? await relocate(source.id,source.from,target) : await move(target);
      if(!mounted.current)return;
      setCarry(null);setSlot(ok?target:null);
      setNotice(ok?(source?'Moved to '+placeName(target).toLowerCase()+'.':'Home at last. A new seed is waiting in the keychain.'):'That spot or plant changed. Choose again.');
    } finally {pending.current=false;if(mounted.current)setBusy(false);}
  }
  function choose(target){
    if(pending.current || ignoreClick.current)return;
    setCat(false);
    const occupant=collection.get(target);
    if(inHand){
      if(!occupant){void putDown(target,carry);return;}
      if(occupant.id===inHand.id){cancelCarry();return;}
      setNotice('That spot is occupied. Choose a free spot.');return;
    }
    setSlot(target);setNotice('');
    if(occupant && !picking)pickUp(occupant);
  }
  function onCat(){
    if(ignoreClick.current || picking || inHand)return;
    clearTimeout(catTimer.current);setSlot(null);setCat(true);setNotice('The cat blinks hello.');
    catTimer.current=setTimeout(()=>{setCat(false);setNotice(n=>n==='The cat blinks hello.'?'':n);},2100);
  }
  function hit(x,y){
    const btn=document.elementFromPoint(x,y)?.closest('[data-slot]');
    return btn && stage.current.contains(btn) ? Number(btn.dataset.slot) : null;
  }
  function start(e){
    if(!e.isPrimary || e.button!==0 || busy)return;
    ignoreClick.current=false;
    const target=e.target.closest('[data-slot]');
    gesture.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,plant:target && collection.get(Number(target.dataset.slot)),mode:null,edge:0};
  }
  function clearEdge(){clearTimeout(edge.current);edge.current=null;}
  function onMotion(e){
    const g=gesture.current;if(!g || g.pointer!==e.pointerId)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y,bounds=stage.current.getBoundingClientRect();
    if(!g.mode){
      if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;
      g.mode=!picking && g.plant && (!inHand || g.plant.id===inHand.id)?'plant':Math.abs(dx)>Math.abs(dy)?'pan':'vertical';
      stage.current.setPointerCapture(e.pointerId);ignoreClick.current=true;
      if(g.mode==='plant')pickUp(g.plant);
    }
    if(g.mode==='plant'){
      setGhost({x:e.clientX,y:e.clientY});setDropOver(hit(e.clientX,e.clientY));
      const direction=e.clientX<bounds.left+26 && page>0?-1:e.clientX>bounds.right-26 && page<count-1?1:0;
      if(g.edge!==direction){clearEdge();g.edge=direction;if(direction)edge.current=setTimeout(()=>travel(page+direction),430);}
    } else if(g.mode==='pan'){
      const distance=(page===0&&dx>0)||(page===count-1&&dx<0)?dx*.16:dx;
      setPan(Math.min(bounds.width,Math.max(-bounds.width,distance)));
    }
  }
  function end(e,cancelled=false){
    const g=gesture.current;if(!g || g.pointer!==e.pointerId)return;
    gesture.current=null;clearEdge();
    if(!g.mode)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y;
    setPan(null);setGhost(null);setDropOver(null);
    if(stage.current.hasPointerCapture(e.pointerId))stage.current.releasePointerCapture(e.pointerId);
    if(g.mode==='plant'){
      const dest=cancelled?null:hit(e.clientX,e.clientY);
      if(dest!==null && !collection.has(dest))void putDown(dest,{id:g.plant.id,from:g.plant.slot});
      else cancelCarry();
    } else if(!cancelled && g.mode==='pan' && Math.abs(dx)>Math.min(52,stage.current.clientWidth*.15))travel(page+(dx<0?1:-1));
    else if(!cancelled && g.mode==='vertical' && dy>74 && !inHand)startClose();
    setTimeout(()=>{ignoreClick.current=false;},0);
  }
  async function prepare(){
    setBusy(true);setNotice('');
    try{
      const image=document.createElement('canvas');image.width=ROOM_WIDTH*3;image.height=ROOM_HEIGHT*3;
      drawRoom(image,{hour,plants:potted[page],roomIndex:page,time:0,reducedMotion:true});
      const blob=await new Promise(resolve=>image.toBlob(resolve,'image/png'));
      if(!blob)throw Error();
      const file=new File([blob],'plantigochi-'+viewName(page).toLowerCase().replaceAll(' ','-')+'.png',{type:'image/png'});
      if(mounted.current)setPostcard({url:URL.createObjectURL(blob),file});
    }catch{setNotice('Could not prepare the postcard. Try again.');}
    finally{if(mounted.current)setBusy(false);}
  }
  async function shareCard(){
    try{await navigator.share({files:[postcard.file],title:'My Plantigochi garden'});}
    catch(error){if(error.name!=='AbortError')setNotice('Save the image to share this postcard.');}
  }
  const message=notice || (inHand?(dropOver!==null&&!collection.has(dropOver)?placeName(dropOver):speciesName(inHand)+' · Gen '+inHand.generation+' · Choose a free spot.'):
    picking?(slot!==null&&!chosen?'Settle here on the '+placeName(slot).toLowerCase()+'?':'Choose a spot for your grown plant.'):
    slot!==null?(chosen?speciesName(chosen)+' · Gen '+chosen.generation+' · '+new Date(chosen.movedAt).toLocaleDateString():placeName(slot)+' · Open'):
    graduates.length?'Tap or drag a plant to move it.':'Grow a Monstera to make it at home here.');
  return <section className="collector" aria-label="Collector garden" onKeyDown={e=>{
    if(postcard||busy || e.altKey || e.metaKey || e.ctrlKey)return;
    if(e.key==='Escape'){e.preventDefault();if(inHand)cancelCarry();else startClose();}
    if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();travel(page+(e.key==='ArrowLeft'?-1:1));}
  }}>
    <header className="room-header">
      <div className="room-heading"><span className="collection-total"><Sprout aria-hidden="true"/>{graduates.length} {graduates.length===1?'plant':'plants'}</span>
        <h1>{viewName(page)}</h1></div>
      <button ref={back} onClick={()=>!pending.current && startClose()} aria-label="Back to Plantigochi"><ArrowUp/> Keychain</button>
    </header>
    <div className="room-center"><div className="room-picture" ref={stage}
      style={{'--room-aspect':ROOM_WIDTH/ROOM_HEIGHT}}
      onPointerDown={start} onPointerMove={onMotion} onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)}
      onClickCapture={e=>{if(ignoreClick.current){e.preventDefault();e.stopPropagation();}}}>
      <div className={'room-strip'+(pan!==null?' panning':'')} style={{transform:'translateX(calc('+(-page*100)+'% + '+(pan??0)+'px))'}}>
        {Object.keys(potted).map(k=><RoomView key={k} index={+k} onScreen={+k===page} plants={potted[k]} hour={hour}
          placing={picking||Boolean(inHand)} carry={carry} dragging={Boolean(ghost)} selected={dropOver??slot} choose={choose} cat={cat} petCat={onCat}/>)}
      </div>
    </div></div>
    <footer className="room-footer">
      <nav className="room-browser" aria-label="Explore the apartment"><button aria-label="Previous room" disabled={page===0||busy} onClick={()=>travel(page-1)}><ChevronLeft/></button>
        <span>Room {page+1} <i>/</i> {count}</span>
        <button aria-label="Next room" disabled={page===count-1||busy} onClick={()=>travel(page+1)}><ChevronRight/></button></nav>
      <div className="room-line"><span role="status">{message}</span>
        {inHand && <button onClick={cancelCarry} disabled={busy}>Cancel move</button>}
        {picking && slot!==null && !chosen && <button onClick={()=>putDown(slot,null)} disabled={busy}>Move in</button>}
      </div>
      <nav className="room-tools" aria-label="Room actions"><button onClick={shareLink}><Share/> Game link</button>
        <button ref={previewButton} disabled={busy} onClick={prepare}><ImageIcon/> Postcard</button></nav>
    </footer>
    {ghost && inHand && <canvas className="carried-plant" ref={ghostCanvas} width="76" height="82" aria-hidden="true" style={{left:ghost.x,top:ghost.y}}/>}
    {postcard && <dialog className="postcard" aria-label="Garden postcard" ref={el=>{if(el&&!el.open)el.showModal();}} onCancel={e=>{e.preventDefault();returnCard();}}>
      <h2>Garden postcard</h2><img src={postcard.url} alt={'Your '+viewName(page)+' postcard'}/>
      <div>{navigator.canShare?.({files:[postcard.file]}) && <button onClick={shareCard}>Share image</button>}
        <button onClick={()=>downloadFile(postcard.file,postcard.file.name)}>Save image</button><GameLink/>
        <button onClick={returnCard}>Back to room</button></div><p role="status">{notice}</p>
    </dialog>}
  </section>;
}
