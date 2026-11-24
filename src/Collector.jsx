import GuideChat from './GuideChat.jsx';
import React,{forwardRef,useEffect,useImperativeHandle,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,X} from 'lucide-react';
import SwipeCue from './SwipeCue.jsx';
import {ShopItemDetail} from './GardenShop.jsx';
import GardenRecord,{RecordControls} from './GardenRecord.jsx';
import {decorPlaces} from './roomShopArt.js';
import {prepareNativeArt} from './shopSprites/nativeArt.js';
import {prepareRoomPhotos} from './framePhotoMedia.js';
import {catalog,itemPrice,lifeOf,canRepotAt,canSetItem,destinationKey,placeItem,framePhoto,storeItem,fitsBackupChange} from './gardenEconomy.js';
import './gardenMarket.css';
import GardenKeepsakes from './GardenKeepsakes.jsx';
import {ROOT_TIME,replant,takeCutting,canHomePlant} from './game.js';
import GardenDialog from './GardenDialog.jsx';
import GardenInspection from './GardenInspection.jsx';
import {drawRoom,placesFor,ROOM_WIDTH,ROOM_HEIGHT,roomLight} from './roomArt.js';
import {drawPottedPlant} from './roomPlant.js';
import {gardenViews,slotFor,viewForSlot,canPlaceAt,speciesName,viewName} from './gardenLayout.js';
import RoomView from './RoomView.jsx';

const restingZoom=1.08;
const focusZoom=1.32,assetZoom=2.8;
const clamp=(v,max)=>Math.min(max,Math.max(0,v));
function placeName(slot){
  if(typeof slot==='string' && slot.includes('/decor-'))return decorPlaces(Number(slot.split('/')[0])).find(s=>s.slot===slot)?.name || 'Room';
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

const Collector=forwardRef(function Collector({active,backdropVisible=false,recordActive=active,musicVolume,plant,commit,now,wallNow=now,plantClock=Date.now,move,relocate,raisePhone,returnToToy,purr,
  playingRecordId,onSelectRecord,onOverlayChange,globalMenuOpen,onPlacementCancel,onPlacementDone},ref) {
  const graduates=plant.graduates;
  const count=gardenViews(graduates);
  const [room,setRoom]=useState(0);
  const page=clamp(room,count-1);
  const [slot,setSlot]=useState(null),[notice,setNotice]=useState('');
  const [carry,setCarry]=useState(null),[busy,setBusy]=useState(false),[graduating,setGraduating]=useState(null);
  const [panel,setPanel]=useState(null),[ghost,setGhost]=useState(null),[cat,setCat]=useState(false);
  const items=lifeOf(plant).items;
  const [shopMove,setShopMove]=useState(null),[preview,setPreview]=useState(null),[itemId,setItemId]=useState(null);
  const [inspectionPart,setInspectionPart]=useState(null);
  const starterPurchase=useRef(false);
  const [purchaseState,setPurchaseState]=useState('ready');
  const phonePlacement=useRef(null),roomOpener=useRef(null),placeButton=useRef(null);
  const inspectTarget=useRef(null);
  const item=items.find(i=>i.id===itemId);
  const itemPlant=item?.slot!=null && catalog[item.sku].kind==='pot'?graduates.find(p=>p.slot===item.slot):null;
  const [dropOver,setDropOver]=useState(null);
  const gesture=useRef(null),ignoreClick=useRef(false),edge=useRef(null),catTimer=useRef(null);
  const stage=useRef(null),roomReturn=useRef(null),ghostCanvas=useRef(null);
  const camera=useRef(null),cameraCenter=useRef(page+.5);
  const [detailScale,setDetailScale]=useState(0);
  const [focusCrops,setFocusCrops]=useState(null);
  const [worldHeight,setWorldHeight]=useState(ROOM_HEIGHT);
  const lens=useRef(null),zoomTimer=useRef(null),pressTimer=useRef(null),petNumber=useRef(0);
  const [visible,setVisible]=useState([page,page]);
  const mounted=useRef(false),pending=useRef(false),canFocus=useRef(false);
  const collection=useMemo(()=>new Map(graduates.map(p=>[p.slot,p])),[graduates]);
  const picking=Boolean(graduating && canHomePlant(plant,graduating));
  const source=carry && collection.get(carry.from)?.id===carry.id?collection.get(carry.from):null;
  const inHand=carry?.confirmed && source;
  const sourcePot=source && items.find(i=>i.slot===source.slot && catalog[i.sku]?.kind==='pot');
  const hoverPlacement=useMemo(()=>{
    if(!ghost || !inHand || dropOver===null || collection.has(dropOver))return null;
    if(carry.repot && !canRepotAt(plant,dropOver))return null;
    return {slot:dropOver,plant:inHand,pot:carry.repot?null:sourcePot};
  },[Boolean(ghost),inHand,dropOver,collection,carry?.repot,sourcePot,plant]);
  const placing=Boolean(inHand) || picking || Boolean(shopMove);
  canFocus.current=active && !globalMenuOpen && !panel;
  const sceneItems=useMemo(()=>{
    if(!active || !shopMove || !preview || catalog[shopMove.sku].kind==='plant')return items;
    const others=items.filter(i=>i.id!==shopMove.id).map(i=>i.slot===preview.slot?{...i,slot:shopMove.from??null}:i);
    return [...others,{...items.find(i=>i.id===shopMove.id),id:shopMove.id,sku:shopMove.sku,slot:preview.slot}];
  },[active,items,shopMove,preview]);
  const chosen=slot===null?null:collection.get(slot);
  const clock=new Date(wallNow),hour=clock.getHours()+clock.getMinutes()/60;
  const plantPreview=active && shopMove && catalog[shopMove.sku].kind==='plant'?preview:null;
  const potted=useMemo(()=>{
    const result={};
    for(let view=Math.max(0,page-1);view<=Math.min(count-1,page+1);view++)
      result[view]=placesFor(view).map(spot=>{
        const slot=slotFor(view,spot);
        if(plantPreview?.slot===slot)
          return {id:shopMove.id,species:shopMove.sku,name:catalog[shopMove.sku].name};
        return collection.get(slot);
      });
    return result;
  },[collection,count,page,shopMove,plantPreview]);
  useEffect(()=>{
    mounted.current=true;
    return ()=>{mounted.current=false;clearInterval(edge.current);clearTimeout(catTimer.current);clearTimeout(zoomTimer.current);clearTimeout(pressTimer.current);};
  },[]);
  useEffect(()=>{
    if(carry && (!source || destinationKey(plant,carry.from)!==carry.sourceKey) && !pending.current){
      setCarry(null);setGhost(null);setPanel(p=>p==='move'?null:p);setSlot(null);
      setNotice('This plant or its pot changed. Select it again.');
    }
  },[carry,source,plant,busy]);
  useEffect(()=>{
    if(!ghostCanvas.current || !inHand)return;
    const ctx=ghostCanvas.current.getContext('2d');
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
    const pot=carry.repot?null:sourcePot;
    ctx.setTransform(detailScale,0,0,detailScale,0,0);
    const slot=dropOver ?? carry.from,view=viewForSlot(slot);
    const extra=worldHeight-ROOM_HEIGHT;
    const spot=placesFor(view,extra-Math.round(extra*.39)).find(p=>slotFor(view,p)===slot);
    drawPottedPlant(ctx,{x:56,y:94,size:spot.size,rasterScale:detailScale,plant:inHand,potSku:pot?.sku,bare:carry.repot,night:1-roomLight(hour).day,reducedMotion:true,selected:true});
  },[Boolean(ghost),Boolean(hoverPlacement),inHand,hour,sourcePot,detailScale,worldHeight,dropOver,carry?.from,carry?.repot]);

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
      const frame=restingZoom*Math.max(el.clientWidth/2,Math.min(el.clientWidth,el.clientHeight*1.15));
      if(!frame)return;
      // Preserve the point in the panorama when the phone rotates.
      const center=cameraCenter.current;
      camera.current=frame;
      el.style.setProperty('--room-width',frame+'px');
      const height=Math.max(ROOM_HEIGHT,Math.ceil(el.clientHeight*ROOM_WIDTH/frame));
      el.style.setProperty('--room-height',height*frame/ROOM_WIDTH+'px');
      setWorldHeight(height);
      // Limit each detailed layer on very tall screens as well as high-DPI phones.
      const budget=Math.floor(Math.min(4096/height,Math.sqrt(4000000/(ROOM_WIDTH*height))));
      setDetailScale(Math.max(1,Math.min(3,budget)));
      el.scrollLeft=center*frame-el.clientWidth/2;
      el.scrollTop=Math.max(0,(el.scrollHeight-el.clientHeight)/2);
      cameraCenter.current=(el.scrollLeft+el.clientWidth/2)/frame;
      readCamera();
    }
    size();
    const observer=new ResizeObserver(size);observer.observe(el);
    window.addEventListener('resize',size);
    return ()=>{observer.disconnect();window.removeEventListener('resize',size);};
  },[count]);
  useEffect(()=>{
    const surface=stage.current;
    function consumeRoomDrag(event){
      const drag=gesture.current;
      // Pointer capture moves the camera or plant. Cancel native touch scrolling
      // for that same drag so Chromium delivers the next tap to the room HUD.
      if(drag?.pointerType==='touch' && drag.mode && event.touches.length===1 && event.cancelable)
        event.preventDefault();
    }
    surface.addEventListener('touchmove',consumeRoomDrag,{passive:false});
    return ()=>surface.removeEventListener('touchmove',consumeRoomDrag);
  },[]);
  useEffect(()=>{
    if(!active || globalMenuOpen){
      gesture.current=null;clearEdge();setGhost(null);setDropOver(null);relax();
    }
  },[active,globalMenuOpen]);
  useEffect(()=>{
    if(active && !globalMenuOpen){
      if(placing)focusDestination();else restoreFocus();
    }
  },[active]);
  useLayoutEffect(()=>{
    onOverlayChange?.(Boolean(active && (panel || busy || placing)));
    return ()=>onOverlayChange?.(false);
  },[active,panel,busy,placing,onOverlayChange]);
  function sampleZoom(){
    const el=lens.current;
    if(!el?.classList.contains('inspecting'))return;
    const view=el.parentElement.getBoundingClientRect();
    const crops={};
    stage.current.querySelectorAll('.room-frame').forEach((frame,index)=>{
      const rect=frame.getBoundingClientRect();
      const unit=rect.width/ROOM_WIDTH;
      if(!unit || rect.right<=view.left || rect.left>=view.right)return;
      // Overscan a few world pixels. Allocate display pixels only for the
      // visible area, even when the full magnified room would exceed GPU limits.
      const x=clamp(Math.floor((view.left-rect.left)/unit)-2,ROOM_WIDTH);
      const y=clamp(Math.floor((view.top-rect.top)/unit)-2,worldHeight);
      const w=clamp(Math.ceil((view.right-rect.left)/unit)+2,ROOM_WIDTH)-x;
      const h=clamp(Math.ceil((view.bottom-rect.top)/unit)+2,worldHeight)-y;
      if(w<=0 || h<=0)return;
      const scale=Math.min(unit*(window.devicePixelRatio||1),4096/w,4096/h,Math.sqrt(4000000/(w*h)));
      if(scale>detailScale)crops[index]={x,y,w,h,scale};
    });
    setFocusCrops(crops);
  }
  function relax(){
    setFocusCrops(null);
    clearTimeout(pressTimer.current);clearTimeout(zoomTimer.current);
    const el=lens.current;
    if(el){el.classList.remove('inspecting','asset-focus');el.style.transform='';}
  }
  function inspect(clientX,clientY){
    const el=lens.current;
    if(!el || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const rect=el.getBoundingClientRect(),scale=focusZoom;
    const x=clamp((clientX-rect.left)/rect.width,1)*el.clientWidth;
    const y=clamp((clientY-rect.top)/rect.height,1)*el.clientHeight;
    clearTimeout(zoomTimer.current);el.classList.add('inspecting');
    el.style.transform='translate3d('+((1-scale)*x)+'px,'+((1-scale)*y)+'px,0) scale('+scale+')';
    setFocusCrops(null);
    zoomTimer.current=setTimeout(relax,5000);
  }
  useLayoutEffect(()=>{
    const el=lens.current,target=inspectTarget.current;
    if(!panel || !active || globalMenuOpen || !target?.isConnected)return;
    function frameAsset(){
      const rect=el.getBoundingClientRect(),bounds=target.getBoundingClientRect();
      if(!rect.width || !bounds.width)return;
      const w=el.clientWidth,h=el.clientHeight;
      const x=(bounds.left+bounds.width/2-rect.left)*w/rect.width;
      // Foliage and pot have separate tap targets. Frame the whole plant,
      // including trailing leaves, even when the player tapped only its crown.
      let top=bounds.top,bottom=bounds.bottom;
      if(target.hasAttribute('data-frame-top')){
        const interior=target.parentElement.getBoundingClientRect();
        top=interior.top+Number(target.dataset.frameTop)*interior.height/ROOM_HEIGHT;
        bottom=interior.top+Number(target.dataset.frameBottom)*interior.height/ROOM_HEIGHT;
      }
      const y=((top+bottom)/2-rect.top)*h/rect.height;
      const targetHeight=(bottom-top)*h/rect.height;
      const scale=Math.max(1.25,Math.min(assetZoom,h*.36/targetHeight));
      const dx=-clamp(x*scale-w*.5,w*(scale-1)),dy=-clamp(y*scale-h*.46,h*(scale-1));
      const centerY=y*scale+dy;
      const gap=Math.min(targetHeight*scale/2+12,h*.20);
      const overlay=el.parentElement.style;
      overlay.setProperty('--subject-x',(x*scale+dx)+'px');
      overlay.setProperty('--subject-y',centerY+'px');
      overlay.setProperty('--light-width',Math.max(65,Math.min(w*.48,Math.max(gap*1.15,bounds.width*w/rect.width*scale*.80)))+'px');
      overlay.setProperty('--light-height',Math.max(54,gap)+'px');
      overlay.setProperty('--inspect-top',Math.max(h*.19,centerY-gap)+'px');
      overlay.setProperty('--inspect-bottom',Math.min(h*.69,centerY+gap)+'px');
      clearTimeout(zoomTimer.current);clearTimeout(pressTimer.current);
      setFocusCrops(null);
      el.classList.add('inspecting','asset-focus');
      el.style.transform='translate3d('+dx+'px,'+dy+'px,0) scale('+scale+')';
      requestAnimationFrame(()=>{
        if(!el.getAnimations().some(a=>a.transitionProperty==='transform'))sampleZoom();
      });
    }
    frameAsset();
    const observer=new ResizeObserver(frameAsset);
    observer.observe(el);observer.observe(target);
    return ()=>{observer.disconnect();relax();};
  },[panel,active,globalMenuOpen,itemId,worldHeight]);
  function travel(n){
    relax();
    const target=clamp(n,count-1),el=stage.current;
    setCat(false);setSlot(null);setPreview(null);setNotice('');setDropOver(null);
    setRoom(target);
    el.scrollTo({left:(target+.5)*camera.current-el.clientWidth/2,
      behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  const jarProgress=plant.jar?Math.max(0,Math.min(1,(now-plant.jar.cutAt)/ROOT_TIME)):null;
  function openKeepsake(kind,index){
    if(placing || pending.current)return;
    inspectTarget.current=index===undefined?null:roomOpener.current;
    setNotice('');setSlot(null);setPanel(kind);
  }
  function leaveRoom(event,go){
    if(placing || pending.current)return;
    roomOpener.current=event.currentTarget;
    setNotice('');relax();go?.(event);
  }
  async function useKeepsake(kind,value){
    if(pending.current)return;
    pending.current=true;setBusy(true);setNotice('');
    let changed=false;
    try{
      const ok=await commit(p=>{
        if(p.id!==plant.id)return p;
        const next=kind==='cut'?takeCutting(p,value,plantClock()):replant(p,value,plantClock());
        changed=kind==='cut'?!p.jar && !!next.jar:next.id!==p.id;
        return next;
      });
      if(!mounted.current)return;
      if(!ok || !changed)setNotice('Your garden changed or could not save. Check the plant and try again.');
      else if(kind==='replant'){setPanel(null);returnToToy?.();}
    }finally{pending.current=false;if(mounted.current)setBusy(false);}
  }
  async function change(operation,frameOriginal,signal,purchaseReceipt){
    if(pending.current)return false;
    pending.current=true;setBusy(true);
    let changed=false,tooBig=false;
    try{
      const write=commit(p=>{
        // Another tab may have already placed the starter pot. Accept its current
        // checkpoint without applying a stale purchase to later gameplay.
        if(purchaseReceipt && p.tutorial?.step!=='pot'){changed=true;return p;}
        const next=operation(p);
        if(next===p)return p;
        if(!fitsBackupChange(p,next)){tooBig=true;return p;}
        changed=true;return next;
      },{frameOriginal,signal,purchaseReceipt});
      const ok=signal?await Promise.race([write,new Promise(resolve=>signal.addEventListener('abort',()=>resolve(false),{once:true}))]):await write;
      if(signal?.aborted){setNotice('Storage is taking longer than usual. Your spot is still selected.');return false;}
      if(!ok || !changed)setNotice(tooBig?'Your garden is near its backup limit. Remove a frame photo and try again.':'Could not save this change. Check the current item or spot and try again.');
      return ok && changed;
    }finally{pending.current=false;if(mounted.current)setBusy(false);}
  }
  function inspectItem(i){
    if(pending.current || placing)return;
    const resident=catalog[i.sku].kind==='pot' && collection.get(i.slot);
    const plantTarget=resident && stage.current.querySelector('[data-slot="'+i.slot+'"][data-occupied]');
    inspectTarget.current=plantTarget || Array.from(stage.current.querySelectorAll('[data-item-id]')).find(b=>b.dataset.itemId===i.id);
    setInspectionPart(null);
    setItemId(i.id);setNotice('');setPanel('item');
  }
  function startPlacement(request,fromPhone=false){
    const product=catalog[request?.sku];
    if(!product || (request.buy && product.retired) || pending.current || phonePlacement.current || shopMove || carry || picking)return false;
    const hasSpace=Array.from({length:count},(_,view)=>view).some(view=>{
      const addresses=['frame','decor'].includes(product.kind)?decorPlaces(view).map(s=>s.slot):placesFor(view).map(s=>slotFor(view,s));
      return addresses.some(s=>canSetItem(plant,request.sku,s,request.from));
    });
    if(!hasSpace){setNotice('Every suitable spot is occupied. Put an item in inventory to make room.');return false;}
    setPurchaseState('ready');
    starterPurchase.current=request.buy && plant.tutorial?.step==='pot';
    phonePlacement.current=fromPhone?request:null;
    setShopMove(request);setPreview(null);setSlot(null);setPanel(null);setNotice('');relax();
    focusDestination();
    return true;
  }
  function cancelShop(){
    if(!shopMove || pending.current)return;
    const request=phonePlacement.current;
    starterPurchase.current=false;phonePlacement.current=null;
    setShopMove(null);setPreview(null);setSlot(null);setNotice('');
    if(request)onPlacementCancel?.(request);else focusSlot(shopMove.from,shopMove.id);
  }
  function beginGraduation(id){
    if(!canHomePlant(plant,id) || pending.current || shopMove || phonePlacement.current || carry)return false;
    if(!placesFor(page).some(spot=>!collection.has(slotFor(page,spot))))travel(firstVacantRoom(graduates));
    setGraduating(id);setPanel(null);setPreview(null);setSlot(null);setNotice('');relax();
    focusDestination();
    return true;
  }
  function cancelPlacement(){
    if(pending.current)return;
    if(shopMove){cancelShop();return;}
    if(picking){setGraduating(null);setSlot(null);setNotice('');returnToToy?.();return;}
    cancelCarry();
  }
  function reset(){
    starterPurchase.current=false;phonePlacement.current=null;gesture.current=null;clearEdge();clearTimeout(catTimer.current);relax();
    setPanel(null);setItemId(null);setShopMove(null);setPreview(null);setGraduating(null);setCarry(null);
    setSlot(null);setNotice('');setCat(false);setDropOver(null);setGhost(null);
  }
  useImperativeHandle(ref,()=>({
    beginPlacement:request=>startPlacement(request,true),beginGraduation,
    showBook:()=>{if(pending.current || placing)return false;openKeepsake('book');return true;},
    preparePostcard,reset,
  }));
  // Replace the placement UI before painting the committed lesson and regular shop prices.
  useLayoutEffect(()=>{
    if(!starterPurchase.current || !shopMove || plant.tutorial?.step==='pot')return;
    starterPurchase.current=false;
    const request=phonePlacement.current;
    phonePlacement.current=null;
    setShopMove(null);setPreview(null);setSlot(null);setNotice('');
    if(request)onPlacementDone?.(request);
  },[plant.tutorial?.step,items,shopMove,onPlacementDone]);

  async function finishPlacement(){
    if(!preview || !shopMove || pending.current)return;
    const request={...shopMove,...preview};
    const starter=starterPurchase.current;
    const buy=p=>placeItem(p,request,Date.now());
    const saveAttempt=async()=>{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),starter?4500:12000);
      try{
        const saved=await change(buy,undefined,controller.signal,starter?request:undefined);
        return {saved,timedOut:controller.signal.aborted};
      }finally{clearTimeout(timer);}
    };
    if(starter){
      setPurchaseState('saving');
      let result=await saveAttempt();
      if(!mounted.current || !starterPurchase.current)return;
      if(!result.saved && result.timedOut){
        setPurchaseState('retrying');
        result=await saveAttempt();
      }
      if(!result.saved && mounted.current && starterPurchase.current)setPurchaseState('failed');
      return;
    }
    const {saved}=await saveAttempt();
    if(!saved || !mounted.current)return;
    setShopMove(null);setPreview(null);setSlot(null);
    focusSlot(preview.slot,shopMove.id);
    setNotice(catalog[shopMove.sku].name+' placed at '+placeName(preview.slot).toLowerCase()+'.');
    const source=phonePlacement.current;phonePlacement.current=null;
    if(source)onPlacementDone?.(source);
  }
  function restoreFocus(){
    requestAnimationFrame(()=>{
      if(!canFocus.current)return;
      const opener=roomOpener.current;
      (opener?.isConnected && !opener.disabled && !opener.closest('[inert]')?opener:roomReturn.current)?.focus({preventScroll:true});
    });
  }
  function closePanel(){setPanel(null);setSlot(null);restoreFocus();}
  function focusSlot(id,itemId){
    requestAnimationFrame(()=>{
      if(!canFocus.current)return;
      const visible='.room-frame:not([inert]) ';
      const button=(itemId && [...(stage.current?.querySelectorAll(visible+'[data-item-id]') || [])].find(b=>b.dataset.itemId===itemId)) ||
        stage.current?.querySelector(visible+'[data-slot="'+id+'"]');
      (button && !button.closest('[inert]')?button:roomReturn.current)?.focus({preventScroll:true});
    });
  }
  function focusDestination(){
    requestAnimationFrame(()=>{
      if(!canFocus.current)return;
      const button=stage.current?.querySelector('.room-frame:not([inert]) [data-destination]');
      (button || stage.current?.closest('.collector')?.querySelector('.placement-actions button:not(:disabled)'))?.focus({preventScroll:true});
    });
  }
  function cancelCarry(){
    if(pending.current)return;
    if(carry)focusSlot(carry.from);
    setPanel(null);setCarry(null);setSlot(null);setGhost(null);setDropOver(null);setNotice('');
  }
  function confirmMove(repot=false){
    if(!source)return;
    setCarry({...carry,confirmed:true,repot});setPanel(null);setNotice('');
    focusDestination();
  }
  async function putDown(target,origin){
    if(pending.current || target===null)return;
    if(!canPlaceAt(graduates,target) || (origin?.repot && !canRepotAt(plant,target))){setNotice('Choose an open circle.');return;}
    pending.current=true;setBusy(true);
    try{
      const result=origin ? await relocate(origin.id,origin.from,target,origin.repot?destinationKey(plant,target):undefined,origin.sourceKey,destinationKey(plant,target)) : await move(target,graduating);
      if(!mounted.current)return;
      if(result.ok){
        setCarry(null);if(!origin)setGraduating(null);setSlot(target);focusSlot(target);
        const stored=result.storedCount?' '+result.storedCount+(result.storedCount===1?' item returned':' items returned')+' to inventory.':'';
        setNotice(origin?(origin.repot?'Repotted at ':'Moved to ')+placeName(target).toLowerCase()+'.'+stored:!result.newSeed?'Your plant is home.':'Two seeds are waiting. Return to your Plantigochi to choose one.');
      }else setNotice('That spot or plant changed. Choose again.');
    }catch{if(mounted.current)setNotice('Could not save this move. Please try again.');}
    finally{pending.current=false;if(mounted.current)setBusy(false);}
  }
  function choose(target){
    if(pending.current)return;
    setCat(false);setNotice('');setPurchaseState('ready');
    const occupant=collection.get(target);
    if(shopMove){
      if(canSetItem(plant,shopMove.sku,target,shopMove.from)){
        setPreview({slot:target,expected:destinationKey(plant,target)});setSlot(target);
        requestAnimationFrame(()=>{if(canFocus.current)placeButton.current?.focus({preventScroll:true});});
      }
      return;
    }
    if(inHand){
      if(!occupant)void putDown(target,carry);
      return;
    }
    if(picking && occupant)return;
    setSlot(target);
    if(occupant){
      const pot=items.find(i=>i.slot===target && catalog[i.sku]?.kind==='pot');
      if(pot){inspectItem(pot);return;}
      inspectTarget.current=roomOpener.current;setCarry({id:occupant.id,from:target,sourceKey:destinationKey(plant,target),confirmed:false});setPanel('move');
    }else if(!picking)setSlot(null);
  }
  function onCat(index){
    if(placing)return;
    clearTimeout(catTimer.current);setSlot(null);setNotice('');
    inspectTarget.current=roomOpener.current;setPanel('cat');
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
    if(!active || globalMenuOpen || !e.isPrimary || e.button!==0 || busy || panel)return;
    const target=e.target.closest('[data-slot]'),slot=target?buttonSlot(target):null;
    const button=e.target.closest('button');
    gesture.current={pointer:e.pointerId,pointerType:e.pointerType,x:e.clientX,y:e.clientY,button,plant:collection.get(slot),mode:null,edge:0,left:stage.current.scrollLeft,top:stage.current.scrollTop};
    if(!button && !placing){
      const press=gesture.current;
      stage.current.setPointerCapture(e.pointerId);
      clearTimeout(pressTimer.current);
      pressTimer.current=setTimeout(()=>{
        if(gesture.current!==press || press.mode)return;
        press.inspected=true;
        inspect(press.x,press.y);
      },180);
    }
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
    gesture.current=null;clearTimeout(pressTimer.current);clearEdge();
    if(!g.mode){
      if(!cancelled && !placing && !g.button && !g.inspected && Math.hypot(e.clientX-g.x,e.clientY-g.y)<8){
        inspect(e.clientX,e.clientY);
      }
      // Mobile browsers may suppress the native click just after a swipe.
      // Commit a stationary touch once and consume any click synthesized afterward.
      if(e.pointerType==='touch' && !cancelled && g.button){
        ignoreClick.current=true;
        const under=document.elementFromPoint(e.clientX,e.clientY)?.closest('button');
        if(under===g.button && !under.disabled)under.click();
      }
      return;
    }
    setGhost(null);setDropOver(null);
    if(stage.current.hasPointerCapture(e.pointerId))stage.current.releasePointerCapture(e.pointerId);
    if(g.mode==='plant'){
      const dest=cancelled?null:hit(e.clientX,e.clientY);
      if(dest!==null && !collection.has(dest))void putDown(dest,carry);
      else if(!cancelled)setNotice('Choose an open circle, or drag the plant onto one.');
    }
    // A touch can synthesize its click after pointerup. The next press clears this flag.
  }
  async function preparePostcard(){
    const image=document.createElement('canvas');image.width=ROOM_WIDTH*3;image.height=ROOM_HEIGHT*3;
    const plants=placesFor(page).map(spot=>collection.get(slotFor(page,spot)));
    try{
      const [photos]=await Promise.all([prepareRoomPhotos(items,page),prepareNativeArt()]);
      drawRoom(image,{hour,shopItems:items,photos,plants,jarProgress,leafCount:plant.book.length,roomIndex:page,time:0,reducedMotion:true});
      const blob=await new Promise(resolve=>image.toBlob(resolve,'image/png'));
      if(!blob || !mounted.current)return null;
      const file=new File([blob],'plantigochi-'+viewName(page).toLowerCase().replaceAll(' ','-')+'.png',{type:'image/png'});
      return {file,url:URL.createObjectURL(file)};
    }catch{return null;}
  }
  const message=notice || (shopMove ? (preview?placeName(preview.slot)+' · '+catalog[shopMove.sku].name:'Choose a spot for '+catalog[shopMove.sku].name.toLowerCase()+'.') : inHand?(dropOver!==null&&!collection.has(dropOver)?placeName(dropOver):
    carry.repot?'Choose an empty pot for '+(inHand.name || speciesName(inHand))+'.':'Choose a spot for '+(inHand.name || speciesName(inHand))+(sourcePot?' and '+catalog[sourcePot.sku].name:'')+'.'):
    picking?(slot!==null&&!chosen?'Settle here on the '+placeName(slot).toLowerCase()+'?':'Choose an open circle for your grown plant.'):
    slot!==null?(chosen?(chosen.name || speciesName(chosen))+(chosen.source==='shop'?' · Shop plant':' · Gen '+chosen.generation)+' · '+new Date(chosen.movedAt).toLocaleDateString():placeName(slot)+' · Open'):
    '');
  const displaced=shopMove && preview && catalog[shopMove.sku].kind!=='plant' && items.find(i=>i.slot===preview.slot);
  const swapping=Boolean(displaced && shopMove.from!=null);
  const inspectLocation=panel==='move'?carry?.from:panel==='item'?item?.slot:null;
  const paired=panel==='item' && Boolean(itemPlant);
  const plantName=paired && (itemPlant.name || speciesName(itemPlant));
  const potName=paired && catalog[item.sku].name;
  const hasEmptyPot=(panel==='move' || (paired && inspectionPart==='plant')) && Array.from({length:count},(_,view)=>placesFor(view).some(spot=>canRepotAt(plant,slotFor(view,spot)))).some(Boolean);
  const panelTitle={cat:'Garden cat',move:source && (source.name || speciesName(source)),item:catalog[item?.sku]?.name || 'My items',jar:'Cutting Jar',book:'Leaf Book'};
  if(paired)panelTitle.item=inspectionPart==='plant'?plantName:inspectionPart==='pot'?potName:plantName+' in '+potName;
  function moveInspectedPlant(repot){
    if(pending.current || !paired)return;
    setCarry({id:itemPlant.id,from:item.slot,sourceKey:destinationKey(plant,item.slot),confirmed:true,repot});
    setPanel(null);setNotice('');focusDestination();
  }
  const available=active && !globalMenuOpen;
  const guidingPot=Boolean(starterPurchase.current && shopMove);
  return <section className="collector" aria-label="Collector garden" aria-hidden={!available || undefined} inert={!available?'':undefined}
    data-guiding-pot={guidingPot?'':undefined} data-room-hud={available?'':undefined} data-room-placing={placing?'':undefined} data-room-blocked={!available || panel || busy?'':undefined}
    onPointerDownCapture={e=>{if(e.isPrimary)ignoreClick.current=false;}}
    onClickCapture={e=>{
      if(ignoreClick.current && e.detail!==0){e.preventDefault();e.stopPropagation();}
    }}
    onKeyDown={e=>{
    if(!available || panel || busy || e.altKey || e.metaKey || e.ctrlKey)return;
    if(e.key==='Escape'){e.preventDefault();if(placing)cancelPlacement();else returnToToy?.();}
    if(['ArrowLeft','ArrowRight'].includes(e.key)){
      e.preventDefault();
      stage.current.scrollBy({left:(e.key==='ArrowLeft'?-1:1)*stage.current.clientWidth*.7,
        behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }
  }}>
    <div className="room-lens" ref={lens} onTransitionEnd={e=>{if(e.target===lens.current && e.propertyName==='transform')sampleZoom();}}><div className="room-picture" ref={stage} onScroll={()=>{
      cameraCenter.current=(stage.current.scrollLeft+stage.current.clientWidth/2)/camera.current;
      readCamera();
      if(focusCrops)sampleZoom();
    }} onPointerDown={start} onPointerMove={onMotion} onPointerUp={e=>end(e)} onPointerCancel={e=>end(e,true)}
      onLostPointerCapture={e=>{if(e.target===e.currentTarget)end(e,true);}}
      onClickCapture={e=>{
        const target=e.target.closest('button');
        if(target)roomOpener.current=target;
        if(!target || placing || panel || target.getAttribute('aria-haspopup')==='dialog' || target?.hasAttribute('data-occupied'))return;
        if(e.detail===0 && target){const r=target.getBoundingClientRect();inspect(r.left+r.width/2,r.top+r.height/2);}
        else inspect(e.clientX,e.clientY);
      }}>
      <div className="room-strip" style={{'--rooms':count}}>
        {Object.keys(potted).map(k=><RoomView stage={stage} key={k} index={+k} onScreen={detailScale>0 && +k>=visible[0] && +k<=visible[1]} running={active} ambient={backdropVisible || guidingPot} worldHeight={worldHeight} detailScale={detailScale} crop={focusCrops?.[k]} plants={potted[k]} hour={hour}
          garden={plant} playingItemId={playingRecordId} shopItems={sceneItems} shopMove={shopMove} inspectItem={inspectItem} panelOpen={Boolean(panel || globalMenuOpen)} openKeepsake={openKeepsake} jarProgress={jarProgress} leafCount={plant.book.length} placing={placing} busy={busy} carry={carry} hoverPlacement={hoverPlacement} dragging={Boolean(ghost)} selected={dropOver??slot} choose={choose} cat={cat?.index===+k?cat:null} petCat={onCat}/>)}
      </div>
    </div></div>
    <div className="room-controls" hidden={(!available && !guidingPot) || Boolean(panel)}>
      {placing
        ? <button type="button" ref={roomReturn} className="room-corner room-return" data-room-focus=""
            aria-label="Cancel move" title="Cancel move" disabled={!available || busy} onClick={cancelPlacement}><X aria-hidden="true"/></button>
        : plant.tutorial?.step!=='pot' && <SwipeCue ref={roomReturn} data-room-focus="" data-room-return="" aria-label="Return to Plantigochi"
            hint="Swipe up or down to return to Plantigochi" disabled={!available || busy} onClick={event=>leaveRoom(event,returnToToy)}/>}
      {!placing && (!plant.tutorial || plant.tutorial.step==='pot') && <button type="button" className="room-corner room-open-phone" data-room-open-phone=""
        aria-label="Open iSEED" title="Open iSEED" disabled={!available || busy} onClick={event=>leaveRoom(event,raisePhone)}>
        <img src="/art/iseed-pocket.png" alt="" width="22" height="25" style={{imageRendering:"pixelated"}}/>
      </button>}
      {!placing && !panel && !message && <nav className="room-hint room-navigation" aria-label="Garden rooms">
        <button aria-label="Previous room" disabled={page===0} onClick={()=>travel(page-1)}><ChevronLeft aria-hidden="true"/></button>
        <span>{viewName(page)}</span>
        <button aria-label="Next room" disabled={page===count-1} onClick={()=>travel(page+1)}><ChevronRight aria-hidden="true"/></button>
      </nav>}
      {message && <div className={placing?"room-hint room-placement":"room-hint"}>
        {guidingPot?<GuideChat className="placement-guide" cue={available?(preview?'confirm-pot-'+preview.slot:'place-pot'):null}>
          <p>{busy?(purchaseState==='retrying'?'Still waiting for storage. Trying again…':'Saving your pot on this device…'):notice || (preview?placeName(preview.slot)+'. Buy here, or tap another circle.':'Tap a circle to try a spot. Drag to look around.')}</p>
        </GuideChat>:<span role="status">{message}</span>}
        {placing && <div className="placement-actions">
          <button aria-label="Previous placement room" disabled={busy || page===0} onClick={()=>travel(page-1)}><ChevronLeft aria-hidden="true"/></button>
          <span aria-label={'Room '+(page+1)+' of '+count}>{page+1} / {count}</span>
          <button aria-label="Next placement room" disabled={busy || page===count-1} onClick={()=>travel(page+1)}><ChevronRight aria-hidden="true"/></button>
          {!guidingPot && <button disabled={busy} onClick={cancelPlacement}>Cancel</button>}
        </div>}
        {shopMove && preview && catalog[shopMove.sku].kind==='pot' && collection.has(preview.slot) &&
          <small>{collection.get(preview.slot).name || speciesName(collection.get(preview.slot))} will stay here in this pot.</small>}
        {inHand && sourcePot && !carry.repot && <small>Any pot you replace goes to inventory.</small>}
        {displaced && <small>{catalog[displaced.sku].name} {swapping?'will move to '+placeName(shopMove.from).toLowerCase()+'.':'will return to inventory.'}</small>}
        {shopMove && (preview || guidingPot) && <button ref={placeButton} disabled={busy || !preview} onClick={finishPlacement}>{busy?(guidingPot && purchaseState==='retrying'?'Trying again…':'Saving…'):guidingPot && purchaseState==='failed'?'Retry save':shopMove.buy?'Buy for '+itemPrice(plant,shopMove.sku)+' coins':swapping?'Swap here':'Place here'}</button>}
        {picking && slot!==null && !chosen && <button onClick={()=>putDown(slot,null)} disabled={busy}>Move in</button>}
        {!placing && <button aria-label="Dismiss garden message" onClick={()=>{setSlot(null);setNotice('');}}>×</button>}
      </div>}
      {ghost && inHand && !hoverPlacement && <canvas className="carried-plant" ref={ghostCanvas} width={112*detailScale} height={154*detailScale} aria-hidden="true" style={{left:ghost.x,top:ghost.y,'--carry-scale':camera.current/ROOM_WIDTH}}/>}
    </div>
    <GardenRecord active={recordActive} musicVolume={musicVolume} playing={Boolean(playingRecordId)} onPlayingChange={()=>onSelectRecord(null)}/>
    {available && panel && inspectTarget.current && <GardenInspection title={panelTitle[panel]}
      location={inspectLocation!=null?placeName(inspectLocation):null} close={panel==='move'?cancelCarry:closePanel}>
      {panel==='move' && source && <div className="menu-items">
        <button onClick={()=>confirmMove()}>{sourcePot?'Move with pot':'Move plant'}</button>
        <button disabled={!hasEmptyPot} onClick={()=>confirmMove(true)}>Repot into another pot</button>
        {!hasEmptyPot && <p>Place an empty pot in the room first.</p>}

      </div>}
      {panel==='cat' && <button onClick={()=>onCat(Number(inspectTarget.current.dataset.catRoom))}>Pet again</button>}
      {paired && <div className="inspection-selection">
        <p id="inspection-part">What would you like to manage?</p>
        <div role="group" aria-labelledby="inspection-part" className="inspection-parts">
          {[['plant','Plant only'],['pot','Pot only'],['both','Plant + pot']].map(([part,label])=>
            <button key={part} type="button" disabled={busy} aria-pressed={inspectionPart===part}
              onClick={()=>{setInspectionPart(part);setNotice('');}}>{label}</button>)}
        </div>
      </div>}
      {paired && inspectionPart==='plant' && <div className="menu-items">
        <p>{potName} stays here.</p>
        <button disabled={busy || !hasEmptyPot} onClick={()=>moveInspectedPlant(true)}>Repot plant</button>
        {!hasEmptyPot && <p>Place an empty pot in the room first.</p>}
      </div>}
      {paired && inspectionPart==='both' && <button disabled={busy} onClick={()=>moveInspectedPlant(false)}>Move plant and pot together</button>}
      {panel==='item' && item && (!paired || inspectionPart==='pot') && <ShopItemDetail inRoom potOnly={paired} key={item.id} item={item} busy={busy}
        move={()=>startPlacement({id:item.id,sku:item.sku,buy:false,from:item.slot})}
        store={async()=>{if(await change(p=>storeItem(p,item.id,item.slot))){
          if(item.id===playingRecordId)onSelectRecord(null);
          closePanel();setNotice(catalog[item.sku].name+' put in inventory.');
        }}}
        savePhoto={(photo,expected,frameOriginal)=>change(p=>framePhoto(p,item.id,photo,expected),frameOriginal)}>
        {paired && <p>{plantName} stays here.</p>}
        {item.sku==='record' && item.slot!==null && <RecordControls soundEnabled={musicVolume > 0} playing={playingRecordId===item.id} onPlayingChange={yes=>onSelectRecord(yes?item.id:null)}/>}
      </ShopItemDetail>}
      {panel==='item' && notice && <p role="status">{notice}</p>}
      {['jar','book'].includes(panel) && <><GardenKeepsakes key={panel} kind={panel} plant={plant} now={now} act={useKeepsake} openJar={()=>openKeepsake('jar')} busy={busy}/>{notice && <p role="status">{notice}</p>}</>}
    </GardenInspection>}
    {available && ['book','jar'].includes(panel) && !inspectTarget.current && <GardenDialog page={'garden-'+panel} title={panelTitle[panel]} close={closePanel}>
      <GardenKeepsakes key={panel} kind={panel} plant={plant} now={now} act={useKeepsake} openJar={()=>openKeepsake('jar')} busy={busy}/>
      {notice && <p role="status">{notice}</p>}
    </GardenDialog>}
  </section>;
});
export default Collector;
