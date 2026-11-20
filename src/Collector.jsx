import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,Waves} from 'lucide-react';
import GardenDialog from './GardenDialog.jsx';
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

export default function Collector({active,plant,moving,now,move,relocate,shareLink,startClose,purr}) {
  const graduates=plant.graduates;
  const count=gardenViews(graduates);
  const [room,setRoom]=useState(()=>moving?Math.floor(firstVacant(graduates)/PLACES_PER_VIEW):0);
  const page=clamp(room,count-1);
  const [slot,setSlot]=useState(null),[notice,setNotice]=useState('');
  const [carry,setCarry]=useState(null),[busy,setBusy]=useState(false),[postcard,setPostcard]=useState(null);
  const [panel,setPanel]=useState(null),[ghost,setGhost]=useState(null),[cat,setCat]=useState(false);
  const [dropOver,setDropOver]=useState(null);
  const gesture=useRef(null),ignoreClick=useRef(false),edge=useRef(null),catTimer=useRef(null);
  const stage=useRef(null),menuButton=useRef(null),ghostCanvas=useRef(null);
  const camera=useRef(null),cameraCenter=useRef(page+.5);
  const [worldHeight,setWorldHeight]=useState(ROOM_HEIGHT);
  const lens=useRef(null),zoomTimer=useRef(null),petNumber=useRef(0);
  const [visible,setVisible]=useState([page,page]);
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
    mounted.current=true;
    return ()=>{mounted.current=false;clearInterval(edge.current);clearTimeout(catTimer.current);clearTimeout(zoomTimer.current);};
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

  function readCamera(){
    const el=stage.current,frame=camera.current;
    if(!el || !frame)return;
    const first=clamp(Math.floor(el.scrollLeft/frame),count-1);
    const last=clamp(Math.floor((el.scrollLeft+el.clientWidth-1)/frame),count-1);
    setVisible(old=>old[0]===first && old[1]===last?old:[first,last]);
    if(el.scrollWidth>el.clientWidth)setRoom(clamp(Math.floor((el.scrollLeft+el.clientWidth/2)/frame),count-1));
  }
  useLayoutEffect(()=>{
    const el=stage.current;
    function size(){
      const frame=Math.max(el.clientWidth/2,Math.min(el.clientWidth,el.clientHeight*1.15));
      if(!frame)return;
      // Preserve the point in the panorama when the phone rotates.
      const center=cameraCenter.current;
      camera.current=frame;
      el.style.setProperty('--room-width',frame+'px');
      const height=Math.max(ROOM_HEIGHT,Math.ceil(el.clientHeight*ROOM_WIDTH/frame));
      el.style.setProperty('--room-height',height*frame/ROOM_WIDTH+'px');
      setWorldHeight(height);
      el.scrollLeft=center*frame-el.clientWidth/2;
      el.scrollTop=Math.max(0,(el.scrollHeight-el.clientHeight)/2);
      cameraCenter.current=(el.scrollLeft+el.clientWidth/2)/frame;
      readCamera();
    }
    size();
    const observer=new ResizeObserver(size);observer.observe(el);
    return ()=>observer.disconnect();
  },[count]);
  useEffect(()=>{if(active)menuButton.current?.focus({preventScroll:true});},[active]);
  function relax(){
    clearTimeout(zoomTimer.current);
    const el=lens.current;
    if(el){el.classList.remove('inspecting');el.style.transform='';}
  }
  function inspect(clientX,clientY){
    const el=lens.current;
    if(!el || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const rect=el.getBoundingClientRect(),scale=1.32;
    const x=clamp((clientX-rect.left)/rect.width,1)*el.clientWidth;
    const y=clamp((clientY-rect.top)/rect.height,1)*el.clientHeight;
    clearTimeout(zoomTimer.current);el.classList.add('inspecting');
    el.style.transform='translate3d('+((1-scale)*x)+'px,'+((1-scale)*y)+'px,0) scale('+scale+')';
    zoomTimer.current=setTimeout(relax,1650);
  }
  function travel(n){
    relax();
    const target=clamp(n,count-1),el=stage.current;
    setCat(false);setSlot(null);setNotice('');setDropOver(null);
    setRoom(target);
    el.scrollTo({left:(target+.5)*camera.current-el.clientWidth/2,
      behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function closePanel(){
    setPanel(null);setPostcard(null);
    requestAnimationFrame(()=>menuButton.current?.focus({preventScroll:true}));
  }
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
  function onCat(index){
    if(ignoreClick.current || picking || inHand)return;
    clearTimeout(catTimer.current);setSlot(null);setNotice('');
    setCat({index,number:++petNumber.current});purr();
    catTimer.current=setTimeout(()=>setCat(false),2000);
  }
  function hit(x,y){
    const btn=document.elementFromPoint(x,y)?.closest('[data-slot]');
    return btn && stage.current.contains(btn) ? Number(btn.dataset.slot) : null;
  }
  function start(e){
    if(!e.isPrimary || e.button!==0 || busy)return;
    ignoreClick.current=false;
    const target=e.target.closest('[data-slot]');
    gesture.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,plant:target && collection.get(Number(target.dataset.slot)),mode:null,edge:0,left:stage.current.scrollLeft,top:stage.current.scrollTop};
  }
  function clearEdge(){clearInterval(edge.current);edge.current=null;}
  function onMotion(e){
    const g=gesture.current;if(!g || g.pointer!==e.pointerId)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y,bounds=stage.current.getBoundingClientRect();
    if(!g.mode){
      if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;
      g.mode=!picking && g.plant && (!inHand || g.plant.id===inHand.id)?'plant':Math.abs(dx)>Math.abs(dy)?'pan':'vertical';
      stage.current.setPointerCapture(e.pointerId);ignoreClick.current=true;
      relax();
      if(g.mode==='plant')pickUp(g.plant);
    }
    if(g.mode==='plant'){
      setGhost({x:e.clientX,y:e.clientY});setDropOver(hit(e.clientX,e.clientY));
      const direction=e.clientX<bounds.left+32?-1:e.clientX>bounds.right-32?1:0;
      g.lastX=e.clientX;g.lastY=e.clientY;
      if(g.edge!==direction){
        clearEdge();g.edge=direction;
        if(direction)edge.current=setInterval(()=>{
          stage.current.scrollLeft+=direction*11;
          setDropOver(hit(g.lastX,g.lastY));
        },20);
      }
    }else if(g.mode==='pan')stage.current.scrollLeft=g.left-dx;
    else if(stage.current.scrollHeight>stage.current.clientHeight+1)stage.current.scrollTop=g.top-dy;
  }
  function end(e,cancelled=false){
    const g=gesture.current;if(!g || g.pointer!==e.pointerId)return;
    gesture.current=null;clearEdge();
    if(!g.mode)return;
    const dy=e.clientY-g.y;
    setGhost(null);setDropOver(null);
    if(stage.current.hasPointerCapture(e.pointerId))stage.current.releasePointerCapture(e.pointerId);
    if(g.mode==='plant'){
      const dest=cancelled?null:hit(e.clientX,e.clientY);
      if(dest!==null && !collection.has(dest))void putDown(dest,{id:g.plant.id,from:g.plant.slot});
      else cancelCarry();
    } else if(!cancelled && g.mode==='vertical' && dy>74 && g.top<1 && !inHand)startClose();
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
      if(mounted.current){setPostcard({url:URL.createObjectURL(blob),file});setPanel('postcard');}
    }catch{setNotice('Could not prepare the postcard. Try again.');}
    finally{if(mounted.current)setBusy(false);}
  }
  async function shareCard(){
    try{await navigator.share({files:[postcard.file],title:'My Plantigochi garden'});}
    catch(error){if(error.name!=='AbortError')setNotice('Save the image to share this postcard.');}
  }
  const message=notice || (inHand?(dropOver!==null&&!collection.has(dropOver)?placeName(dropOver):(inHand.name || speciesName(inHand))+' · Gen '+inHand.generation+' · Choose a free spot.'):
    picking?(slot!==null&&!chosen?'Settle here on the '+placeName(slot).toLowerCase()+'?':'Choose a spot for your grown plant.'):
    slot!==null?(chosen?(chosen.name || speciesName(chosen))+' · Gen '+chosen.generation+' · '+new Date(chosen.movedAt).toLocaleDateString():placeName(slot)+' · Open'):
    '');
  return <section className="collector" aria-label="Collector garden" onKeyDown={e=>{
    if(panel || busy || e.altKey || e.metaKey || e.ctrlKey)return;
    if(e.key==='Escape'){e.preventDefault();if(inHand)cancelCarry();else startClose();}
    if(['ArrowLeft','ArrowRight'].includes(e.key)){
      e.preventDefault();
      stage.current.scrollBy({left:(e.key==='ArrowLeft'?-1:1)*stage.current.clientWidth*.7,
        behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
  }}>
    <div className="room-lens" ref={lens}><div className="room-picture" ref={stage} onScroll={()=>{
      cameraCenter.current=(stage.current.scrollLeft+stage.current.clientWidth/2)/camera.current;
      readCamera();
    }} onPointerDown={start} onPointerMove={onMotion} onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)}
      onLostPointerCapture={e=>{if(e.target===e.currentTarget)end(e,true);}}
      onClickCapture={e=>{
        if(ignoreClick.current && e.detail!==0){e.preventDefault();e.stopPropagation();return;}
        const target=e.target.closest('button');
        if(e.detail===0 && target){const r=target.getBoundingClientRect();inspect(r.left+r.width/2,r.top+r.height/2);}
        else inspect(e.clientX,e.clientY);
      }}>
      <div className="room-strip" style={{'--rooms':count}}>
        {Object.keys(potted).map(k=><RoomView key={k} index={+k} onScreen={+k>=visible[0] && +k<=visible[1]} running={active} worldHeight={worldHeight} plants={potted[k]} hour={hour}
          placing={picking||Boolean(inHand)} carry={carry} dragging={Boolean(ghost)} selected={dropOver??slot} choose={choose} cat={cat?.index===+k?cat:null} petCat={onCat}/>)}
      </div>
    </div></div>
    <button className="room-corner room-return" aria-label="Back to Plantigochi" title="Back to Plantigochi"
      disabled={busy} onClick={startClose}><ChevronDown aria-hidden="true"/></button>
    <button className="room-corner room-menu" ref={menuButton} aria-label="Open garden menu" title="Garden menu"
      aria-haspopup="dialog" onClick={()=>{relax();setPanel('menu');}}><Waves aria-hidden="true"/></button>
    {message && <div className="room-hint"><span role="status">{message}</span>
      {inHand && <button onClick={cancelCarry} disabled={busy}>Cancel move</button>}
      {picking && slot!==null && !chosen && <button onClick={()=>putDown(slot,null)} disabled={busy}>Move in</button>}
      {!inHand && !picking && <button aria-label="Dismiss garden message" onClick={()=>{setSlot(null);setNotice('');}}>×</button>}
    </div>}
    {ghost && inHand && <canvas className="carried-plant" ref={ghostCanvas} width="76" height="82" aria-hidden="true" style={{left:ghost.x,top:ghost.y}}/>}
    {panel && <GardenDialog page={panel==='menu'?'menu':'garden-detail'} title={panel==='menu'?viewName(page):panel==='share'?'Game link':'Garden postcard'}
      back={panel==='menu'?null:()=>{setPostcard(null);setPanel('menu');}} close={closePanel}>
      {panel==='menu' && <>
        <p className="room-count">Room {page+1} of {count} · {graduates.length} {graduates.length===1?'plant':'plants'}</p>
        <div className="menu-items">
          <button disabled={page===0} onClick={()=>{travel(page-1);closePanel();}}>Previous room</button>
          <button disabled={page===count-1} onClick={()=>{travel(page+1);closePanel();}}>Next room</button>
          <button onClick={()=>shareLink(()=>setPanel('share'))}>Game link</button>
          <button disabled={busy} onClick={prepare}>Postcard</button>
          <button disabled={busy} onClick={()=>{setPanel(null);startClose();}}>Back to keychain</button>
        </div>
        <p className="room-guide">{notice || (picking?'Choose an empty spot, then select Move in.':graduates.length?'Swipe sideways to explore. Tap or drag a plant to move it.':'Swipe sideways to explore. Grown plants can move here from the keychain.')}</p>
      </>}
      {panel==='share' && <GameLink showAddress/>}
      {panel==='postcard' && postcard && <div className="room-postcard"><img src={postcard.url} alt={'Your '+viewName(page)+' postcard'}/>
        <div className="menu-items">{navigator.canShare?.({files:[postcard.file]}) && <button onClick={shareCard}>Share image</button>}
          <button onClick={()=>downloadFile(postcard.file,postcard.file.name)}>Save image</button></div><GameLink/>
        {notice && <p role="status">{notice}</p>}</div>}
    </GardenDialog>}
  </section>;
}
