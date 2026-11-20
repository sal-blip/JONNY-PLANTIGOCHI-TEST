import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,ChevronLeft,ChevronRight,Waves} from 'lucide-react';
import GardenDialog from './GardenDialog.jsx';
import {drawRoom,placesFor,ROOM_WIDTH,ROOM_HEIGHT,roomLight} from './roomArt.js';
import {drawPottedPlant} from './roomPlant.js';
import {gardenViews,slotFor,viewForSlot,canPlaceAt,speciesName,viewName} from './gardenLayout.js';
import RoomView from './RoomView.jsx';
import {downloadFile} from './Recovery.jsx';
import GameLink from './GameLink.jsx';

const clamp=(v,max)=>Math.min(max,Math.max(0,v));
function placeName(slot){
  const view=viewForSlot(slot);
  return placesFor(view).find(spot=>slotFor(view,spot)===slot).name;
}
function buttonSlot(button){
  const id=button.dataset.slot;
  return id.includes('/')?id:Number(id);
}
function firstVacantRoom(plants){
  const occupied=new Set(plants.map(g=>g.slot)),count=gardenViews(plants);
  for(let view=0;view<count;view++){
    if(placesFor(view).some(spot=>!occupied.has(slotFor(view,spot))))return view;
  }
  return 0;
}

export default function Collector({active,plant,moving,now,move,relocate,shareLink,startClose,purr}) {
  const graduates=plant.graduates;
  const count=gardenViews(graduates);
  const [room,setRoom]=useState(()=>moving?firstVacantRoom(graduates):0);
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
  const [eye,setEye]=useState((page+.5)*ROOM_WIDTH);
  const [visible,setVisible]=useState([page,page]);
  const mounted=useRef(false),pending=useRef(false);
  const collection=useMemo(()=>new Map(graduates.map(p=>[p.slot,p])),[graduates]);
  const picking=moving===plant.id && plant.stage==='grown' && plant.deadAt===null;
  const source=carry && collection.get(carry.from)?.id===carry.id?collection.get(carry.from):null;
  const inHand=carry?.confirmed && source;
  const placing=Boolean(inHand) || picking;
  const chosen=slot===null?null:collection.get(slot);
  const clock=new Date(now),hour=clock.getHours()+clock.getMinutes()/60;
  const potted=useMemo(()=>{
    const result={};
    for(let view=Math.max(0,page-1);view<=Math.min(count-1,page+1);view++)
      result[view]=placesFor(view).map(spot=>collection.get(slotFor(view,spot)));
    return result;
  },[collection,count,page]);
  useEffect(()=>{
    mounted.current=true;
    return ()=>{mounted.current=false;clearInterval(edge.current);clearTimeout(catTimer.current);clearTimeout(zoomTimer.current);};
  },[]);
  useEffect(()=>{
    if(carry && !source && !pending.current){
      setCarry(null);setGhost(null);setPanel(p=>p==='move'?null:p);setSlot(null);
      setNotice('This plant has moved. Select it again.');
    }
  },[carry,source,busy]);
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
    setEye(Math.round((el.scrollLeft+el.clientWidth/2)*ROOM_WIDTH/frame));
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
  function focusSlot(id){
    requestAnimationFrame(()=>{
      const button=stage.current?.querySelector('[data-slot="'+id+'"]');
      (button && !button.closest('[inert]')?button:menuButton.current)?.focus({preventScroll:true});
    });
  }
  function cancelCarry(){
    if(pending.current)return;
    if(carry)focusSlot(carry.from);
    setPanel(null);setCarry(null);setSlot(null);setGhost(null);setDropOver(null);setNotice('');
  }
  function confirmMove(){
    if(!source)return;
    setCarry({...carry,confirmed:true});setPanel(null);setNotice('');
    requestAnimationFrame(()=>{
      const button=stage.current?.querySelector('.room-frame:not([inert]) [data-destination]');
      (button || menuButton.current)?.focus({preventScroll:true});
    });
  }
  async function putDown(target,origin){
    if(pending.current || target===null)return;
    if(!canPlaceAt(graduates,target)){setNotice('Choose an open circle.');return;}
    pending.current=true;setBusy(true);
    try{
      const ok=origin ? await relocate(origin.id,origin.from,target) : await move(target);
      if(!mounted.current)return;
      if(ok){
        setCarry(null);setSlot(target);focusSlot(target);
        setNotice(origin?'Moved to '+placeName(target).toLowerCase()+'.':'Home at last. A new seed is waiting in the keychain.');
      }else setNotice('That spot or plant changed. Choose again.');
    }catch{if(mounted.current)setNotice('Could not save this move. Please try again.');}
    finally{pending.current=false;if(mounted.current)setBusy(false);}
  }
  function choose(target){
    if(pending.current)return;
    setCat(false);setNotice('');
    const occupant=collection.get(target);
    if(inHand){
      if(!occupant)void putDown(target,carry);
      return;
    }
    if(picking && occupant)return;
    setSlot(target);
    if(occupant){
      relax();setCarry({id:occupant.id,from:target,confirmed:false});setPanel('move');
    }
  }
  function onCat(index){
    if(picking || inHand)return;
    clearTimeout(catTimer.current);setSlot(null);setNotice('');
    setCat({index,number:++petNumber.current});purr();
    catTimer.current=setTimeout(()=>setCat(false),2000);
  }
  function hit(x,y){
    const el=stage.current,under=document.elementFromPoint(x,y);
    if(!under || !el.contains(under))return null;
    const direct=under.closest('[data-destination]');
    if(direct)return buttonSlot(direct);
    let nearest=null,distance=28;
    for(const button of el.querySelectorAll('.room-frame:not([inert]) [data-destination]')){
      const r=button.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
      if(cx<0 || cx>window.innerWidth || cy<0 || cy>window.innerHeight)continue;
      const gap=Math.hypot(cx-x,cy-y);
      if(gap<distance){distance=gap;nearest=button;}
    }
    return nearest?buttonSlot(nearest):null;
  }
  function start(e){
    if(!e.isPrimary || e.button!==0 || busy)return;
    const target=e.target.closest('[data-slot]'),slot=target?buttonSlot(target):null;
    gesture.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,slot,plant:collection.get(slot),mode:null,edge:0,left:stage.current.scrollLeft,top:stage.current.scrollTop};
  }
  function clearEdge(){clearInterval(edge.current);edge.current=null;}
  function onMotion(e){
    const g=gesture.current;if(!g || g.pointer!==e.pointerId)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y,bounds=stage.current.getBoundingClientRect();
    if(!g.mode){
      if(Math.max(Math.abs(dx),Math.abs(dy))<7)return;
      g.mode=inHand && g.plant?.id===inHand.id?'plant':Math.abs(dx)>Math.abs(dy)?'pan':'vertical';
      stage.current.setPointerCapture(e.pointerId);ignoreClick.current=true;
      relax();
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
    if(!g.mode){
      // Mobile browsers may suppress the native click just after a swipe.
      // Commit a stationary touch once and consume any click synthesized afterward.
      if(e.pointerType==='touch' && !cancelled && g.slot!==null && (g.plant || placing)){
        ignoreClick.current=true;
        const under=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');
        if(under && buttonSlot(under)===g.slot && !under.disabled)choose(g.slot);
      }
      return;
    }
    const dy=e.clientY-g.y;
    setGhost(null);setDropOver(null);
    if(stage.current.hasPointerCapture(e.pointerId))stage.current.releasePointerCapture(e.pointerId);
    if(g.mode==='plant'){
      const dest=cancelled?null:hit(e.clientX,e.clientY);
      if(dest!==null && !collection.has(dest))void putDown(dest,{id:g.plant.id,from:g.plant.slot});
      else if(!cancelled)setNotice('Choose an open circle, or drag the plant onto one.');
    } else if(!cancelled && g.mode==='vertical' && dy>74 && g.top<1 && !g.plant && !placing)startClose();
    // A touch can synthesize its click after pointerup. The next press clears this flag.
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
  const message=notice || (inHand?(dropOver!==null&&!collection.has(dropOver)?placeName(dropOver):
    'Choose an open circle for '+(inHand.name || speciesName(inHand))+'.'):
    picking?(slot!==null&&!chosen?'Settle here on the '+placeName(slot).toLowerCase()+'?':'Choose an open circle for your grown plant.'):
    slot!==null?(chosen?(chosen.name || speciesName(chosen))+' · Gen '+chosen.generation+' · '+new Date(chosen.movedAt).toLocaleDateString():placeName(slot)+' · Open'):
    '');
  return <section className="collector" aria-label="Collector garden"
    onPointerDownCapture={e=>{if(e.isPrimary)ignoreClick.current=false;}}
    onClickCapture={e=>{
      if(ignoreClick.current && e.detail!==0){e.preventDefault();e.stopPropagation();}
    }}
    onKeyDown={e=>{
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
        const target=e.target.closest('button');
        if(placing || panel || target?.hasAttribute('data-occupied'))return;
        if(e.detail===0 && target){const r=target.getBoundingClientRect();inspect(r.left+r.width/2,r.top+r.height/2);}
        else inspect(e.clientX,e.clientY);
      }}>
      <div className="room-strip" style={{'--rooms':count}}>
        {Object.keys(potted).map(k=><RoomView key={k} index={+k} onScreen={+k>=visible[0] && +k<=visible[1]} running={active} worldHeight={worldHeight} eye={eye} plants={potted[k]} hour={hour}
          placing={placing} busy={busy} carry={carry} dragging={Boolean(ghost)} selected={dropOver??slot} choose={choose} cat={cat?.index===+k?cat:null} petCat={onCat}/>)}
      </div>
    </div></div>
    <button className="room-corner room-return" aria-label="Back to Plantigochi" title="Back to Plantigochi"
      disabled={busy} onClick={startClose}><ChevronDown aria-hidden="true"/></button>
    <button className="room-corner room-menu" ref={menuButton} aria-label="Open garden menu" title="Garden menu"
      aria-haspopup="dialog" onClick={()=>{relax();setPanel('menu');}}><Waves aria-hidden="true"/></button>
    {message && <div className={placing?"room-hint room-placement":"room-hint"}><span role="status">{message}</span>
      {placing && <div className="placement-actions">
        <button aria-label="Previous placement room" disabled={busy || page===0} onClick={()=>travel(page-1)}><ChevronLeft aria-hidden="true"/></button>
        <span aria-label={'Room '+(page+1)+' of '+count}>{page+1} / {count}</span>
        <button aria-label="Next placement room" disabled={busy || page===count-1} onClick={()=>travel(page+1)}><ChevronRight aria-hidden="true"/></button>
        <button disabled={busy} onClick={inHand?cancelCarry:startClose}>Cancel move</button>
      </div>}
      {picking && slot!==null && !chosen && <button onClick={()=>putDown(slot,null)} disabled={busy}>Move in</button>}
      {!inHand && !picking && <button aria-label="Dismiss garden message" onClick={()=>{setSlot(null);setNotice('');}}>×</button>}
    </div>}
    {ghost && inHand && <canvas className="carried-plant" ref={ghostCanvas} width="76" height="82" aria-hidden="true" style={{left:ghost.x,top:ghost.y}}/>}
    {panel==='move' && source && <GardenDialog page="garden-move" title={'Move '+(source.name || speciesName(source))+'?'} close={cancelCarry}>
      <p className="room-guide">{placeName(carry.from)} · {viewName(viewForSlot(carry.from))}</p>
      <div className="menu-items"><button onClick={confirmMove}>Move</button><button onClick={cancelCarry}>Keep here</button></div>
    </GardenDialog>}
    {panel && panel!=='move' && <GardenDialog page={panel==='menu'?'menu':'garden-detail'} title={panel==='menu'?viewName(page):panel==='share'?'Game link':'Garden postcard'}
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
        <p className="room-guide">{notice || (picking?'Choose an open circle, then select Move in.':graduates.length?'Tap a plant, choose Move, then tap an open circle. Swipe sideways for more spots.':'Swipe sideways to explore. Grown plants can move here from the keychain.')}</p>
      </>}
      {panel==='share' && <GameLink showAddress/>}
      {panel==='postcard' && postcard && <div className="room-postcard"><img src={postcard.url} alt={'Your '+viewName(page)+' postcard'}/>
        <div className="menu-items">{navigator.canShare?.({files:[postcard.file]}) && <button onClick={shareCard}>Share image</button>}
          <button onClick={()=>downloadFile(postcard.file,postcard.file.name)}>Save image</button></div><GameLink/>
        {notice && <p role="status">{notice}</p>}</div>}
    </GardenDialog>}
  </section>;
}
