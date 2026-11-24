import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeftRight} from 'lucide-react';
import {drawRoom,placesFor,ROOM_WIDTH,ROOM_HEIGHT,CAT_SEAT,roomLight} from './roomArt.js';
import {decorPlaces,framePhotoBounds} from './roomShopArt.js';
import FramePhoto from './FramePhoto.jsx';
import {catalog,canRepotAt,canSetItem,lifeOf} from './gardenEconomy.js';
import {drawRoomDepth} from './roomScenery.js';
import {hasTrailingFoliage} from './roomPlant.js';
import {keepsakeFor} from './roomKeepsakes.js';
import {slotFor,speciesName,viewName} from './gardenLayout.js';
import './roomTargets.css';

// Targets share the art's 400 × 320 coordinate system, including the extra
// floor depth in portrait. Split intersecting rectangles between their centers
// so a neighbor cannot cover another object as rooms fill up.
function targetBounds(targets){
  const bounds=targets.map(({x,y,w,h})=>({left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2}));
  targets.forEach((a,i)=>{
    for(let j=i+1;j<targets.length;j++){
      const b=targets[j],first=bounds[i],second=bounds[j];
      if(first.right<=second.left || second.right<=first.left || first.bottom<=second.top || second.bottom<=first.top)continue;
      const horizontal=Math.abs(a.x-b.x)/(a.w+b.w)>Math.abs(a.y-b.y)/(a.h+b.h);
      const [axis,size,start,end]=horizontal?['x','w','left','right']:['y','h','top','bottom'];
      const cut=(a[axis]*b[size]+b[axis]*a[size])/(a[size]+b[size]);
      const [near,far]=a[axis]<b[axis]?[first,second]:[second,first];
      near[end]=Math.min(near[end],cut);far[start]=Math.max(far[start],cut);
    }
  });
  return bounds;
}

export default function RoomView({stage,index,onScreen,running,ambient=false,worldHeight,detailScale=1,plants,hour,placing,busy,carry,dragging,selected,choose,cat,petCat,
  garden,shopItems=[],playingItemId=null,shopMove,inspectItem,openKeepsake,panelOpen=false,selectedKeepsake=null,jarProgress=null,leafCount=0}) {
  const canvas=useRef(null),depth=useRef(null),foreground=useRef(null);
  // Changing canvas dimensions clears its pixels. Keep visible rooms at the
  // same resolution while another surface owns input or is sliding past.
  const rasterScale=onScreen?detailScale:1;
  const above=Math.round((worldHeight-ROOM_HEIGHT)*.39);
  const scene=useRef(null);
  const [focused,setFocused]=useState(null);
  const spots=placesFor(index,worldHeight-above-ROOM_HEIGHT);
  const object=keepsakeFor(index);
  const blocked=busy || panelOpen || !onScreen || !running;
  const selectedFixture=!placing && object?.id===selectedKeepsake?selectedKeepsake:null;
  const active=running && onScreen?(focused ?? selectedFixture ?? selected ?? carry?.from ?? (cat?'cat':null)):null;
  const decor=decorPlaces(index);
  const photoFrames=[];
  for(const spot of decor){
    const item=shopItems.find(i=>i.slot===spot.slot);
    if(!item?.photo)continue;
    const bounds=framePhotoBounds(item.sku,spot.baseX,spot.baseY,spot.size,rasterScale);
    if(bounds)photoFrames.push({item,bounds});
  }
  const highlighted=active==='cat' || active===object?.id || decor.some(d=>d.slot===active) || shopItems.some(item=>item.id===active)
    ?active:spots.findIndex(spot=>slotFor(index,spot)===active);
  const lifted=running && dragging && carry?spots.findIndex(spot=>slotFor(index,spot)===carry.from):-1;
  const animate=onScreen && (running || ambient);
  scene.current={hour,plants,shopItems,playingItemId,roomIndex:index,awake:Boolean(cat),highlighted,lifted,leavePot:carry?.repot,above,worldHeight,separatePlanes:true,placing:running && placing,jarProgress,leafCount};
  const outsideOffset=useRef(0);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const paint=()=>{if(canvas.current && !document.hidden)drawRoom(canvas.current,{...scene.current,outsideOffset:outsideOffset.current,foregroundCanvas:foreground.current,time:performance.now(),reducedMotion:media.matches});};
    const scroller=stage?.current;
    let timer,frame;
    function measure(){
      const roomWidth=canvas.current?.closest('.room-frame')?.clientWidth;
      if(!roomWidth || media.matches)return 0;
      const center=(scroller.scrollLeft+scroller.clientWidth/2)/roomWidth;
      return Math.round(Math.max(-8,Math.min(8,(center-index-.5)*12)));
    }
    function scroll(){
      if(frame || media.matches)return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        const next=measure();
        if(next!==outsideOffset.current){outsideOffset.current=next;paint();}
      });
    }
    function refresh(){
      clearInterval(timer);
      if(onScreen && !document.hidden){
        if(depth.current)drawRoomDepth(depth.current,scene.current.roomIndex,roomLight(scene.current.hour),scene.current.above);
        outsideOffset.current=measure();paint();
        if(animate && !media.matches)timer=setInterval(paint,160);
      }
    }
    if(onScreen)scroller?.addEventListener('scroll',scroll,{passive:true});
    refresh();media.addEventListener('change',refresh);document.addEventListener('visibilitychange',refresh);
    return ()=>{cancelAnimationFrame(frame);scroller?.removeEventListener('scroll',scroll);clearInterval(timer);media.removeEventListener('change',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[onScreen,animate,index,stage,worldHeight,rasterScale]);
  useLayoutEffect(()=>{
    if(onScreen && !document.hidden && canvas.current)drawRoom(canvas.current,{...scene.current,outsideOffset:outsideOffset.current,foregroundCanvas:foreground.current,time:performance.now(),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
  },[onScreen,running,rasterScale,plants,hour,index,cat,highlighted,lifted,worldHeight,above,placing,jarProgress,leafCount,shopItems,playingItemId]);
  useLayoutEffect(()=>{
    if(onScreen && !document.hidden && depth.current)drawRoomDepth(depth.current,index,roomLight(hour),above);
  },[onScreen,worldHeight,above,hour,index]);
  const targets=[];
  const originalItems=shopMove?lifeOf(garden).items:[];
  function destination(slot,name){
    // A preview can put the moving item's artwork at this address. Describe
    // the destination using the saved occupant that would actually be moved.
    const occupant=(carry?.repot?shopItems:originalItems).find(item=>item.slot===slot);
    if(carry?.repot)return {label:'Repot in '+(occupant?catalog[occupant.sku].name:'shelf pot')+' at '+name};
    if(!occupant || !['pot','frame','decor'].includes(catalog[shopMove.sku].kind))
      return {label:'Place at '+name};
    const swapping=shopMove.from!=null;
    return {exchange:true,label:(swapping?'Swap with ':'Replace ')+catalog[occupant.sku].name+' at '+name};
  }
  if(object && openKeepsake && !placing){
    targets.push({key:object.id,focus:object.id,x:object.hitX,y:object.hitY,w:object.hitWidth,h:object.hitHeight,
      label:'Open '+object.name,click:()=>openKeepsake(object.id,index),
      attrs:{'aria-haspopup':'dialog','data-keepsake':object.id,className:'room-cat-target room-keepsake-target'}});
  }
  if(!placing && index%2===0)targets.push({key:'cat',focus:'cat',x:CAT_SEAT.x,y:CAT_SEAT.y-11*CAT_SEAT.size,
    w:48,h:34,label:'Say hello to the cat',click:()=>petCat(index),attrs:{'data-audio':'cat','data-cat-room':index,className:'room-cat-target'}});

  for(const place of decor){
    const item=shopItems.find(i=>i.slot===place.slot);
    const open=shopMove && shopMove.from!==place.slot && canSetItem(garden,shopMove.sku,place.slot,shopMove.from);
    if(placing?!open:!item)continue;
    targets.push({key:place.slot,focus:place.slot,x:place.x*ROOM_WIDTH,y:place.y*ROOM_HEIGHT,
      w:open?39:Math.max(32,place.hitWidth),h:open?39:Math.max(32,place.hitHeight),open,
      ...(open?destination(place.slot,place.name):{label:catalog[item.sku].name+' · '+place.name}),
      click:()=>open?choose(place.slot):inspectItem(item,true),
      attrs:{'data-slot':place.slot,'data-item-id':open?undefined:item.id,'aria-haspopup':open?undefined:'dialog',className:'decor-target'}});
  }
  spots.forEach((spot,i)=>{
    const slot=slotFor(index,spot),plant=plants[i],pot=shopItems.find(item=>item.slot===slot && catalog[item.sku]?.kind==='pot');
    const x=spot.x*ROOM_WIDTH,y=spot.baseY,size=spot.size;
    const open=placing && (shopMove?slot!==shopMove.from && canSetItem(garden,shopMove.sku,slot,shopMove.from):carry?.repot?canRepotAt(garden,slot):!plant);
    const isSource=placing && !shopMove && carry?.from===slot;
    if(placing && !open && !isSource)return;
    const plantName=plant && (plant.name || speciesName(plant));
    if(!placing && pot){
      const potName=catalog[pot.sku].name;
      targets.push({key:'pot/'+pot.id,focus:pot.id,x:x-(plant?3:0),y:y-(plant?5:9)*size,w:Math.max(32,36*size),h:Math.max(32,30*size),
        label:potName+' · '+spot.name+(plant?' · Holds '+plantName:''),click:()=>inspectItem(pot,true),
        attrs:{'data-item-id':pot.id,'data-pot-slot':slot,'aria-haspopup':'dialog'}});
    }
    if(!placing && !plant && (pot || typeof spot.key==='string'))return;
    const label=plant?plantName+(plant.source==='shop'?' · Shop plant':' · Gen '+plant.generation):'Empty';
    const split=Boolean(!placing && plant && pot);
    targets.push({key:'spot/'+slot,focus:slot,x:x+(split?3:0),y:open?y:y-(split?41:plant?26:11)*size,
      w:open?39:Math.max(34,46*size),h:open?39:split?Math.max(26,34*size):plant?Math.max(38,55*size):32,
      open,...(open?destination(slot,spot.name):{label:spot.name+' · '+label}),click:()=>choose(slot),
      attrs:{'data-frame-top':plant?y-62*size:undefined,'data-frame-bottom':plant?y+(hasTrailingFoliage(plant.species)?40:4)*size:undefined,
        'data-slot':slot,'data-occupied':plant?'':undefined,'aria-haspopup':plant && !placing?'dialog':undefined,
        'aria-pressed':selected===slot || carry?.from===slot}});
  });
  const bounds=targetBounds(targets);
  return <div className="room-frame" aria-hidden={!onScreen || undefined} inert={!onScreen?'':undefined}
    style={{left:'calc('+index+' * var(--room-width))'}}>
    <canvas className="room-depth" ref={depth} width={ROOM_WIDTH} height={worldHeight} aria-hidden="true"/>
    <canvas className="room-actors" ref={canvas} width={ROOM_WIDTH*rasterScale} height={worldHeight*rasterScale} role="img" aria-label={viewName(index)+(index%2===0?' with an open pot shelf, a sunlit window and a cat on the sofa':' with an artist’s desk and space for your plants')}/>
    {photoFrames.map(({item,bounds})=><FramePhoto key={item.id} itemId={item.id} photo={item.photo} deferOriginal={typeof IntersectionObserver==='function'} allowOriginal={onScreen} night={1-roomLight(hour).day}
      style={{left:100*bounds.left/ROOM_WIDTH+'%',top:100*(above+bounds.top)/worldHeight+'%',
        width:100*bounds.width/ROOM_WIDTH+'%',height:100*bounds.height/worldHeight+'%'}}/>)}
    {photoFrames.length>0 && <canvas className="room-foreground" ref={foreground} width={ROOM_WIDTH*rasterScale} height={worldHeight*rasterScale} aria-hidden="true"/>}
    <div className="room-interior" hidden={!running} style={{top:(100*above/worldHeight)+'%',height:(100*ROOM_HEIGHT/worldHeight)+'%'}}>
      {targets.map(({key,focus,label,click,attrs,open,exchange},i)=>{
        const {left,right,top,bottom}=bounds[i];
        return <button {...attrs} key={key} type="button" className={'place-target scene-target '+(attrs.className || '')+(open?' open-destination':'')}
          data-scene-object="" data-destination={open?'':undefined} data-exchange={exchange?'':undefined} disabled={blocked} aria-label={label} title={label}
          style={{left:left/ROOM_WIDTH*100+'%',top:top/ROOM_HEIGHT*100+'%',width:(right-left)/ROOM_WIDTH*100+'%',height:(bottom-top)/ROOM_HEIGHT*100+'%'}}
          onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setFocused(focus);}}
          onBlur={()=>setFocused(null)} onPointerDown={()=>setFocused(null)} onClick={click}>
          {exchange && <ArrowLeftRight className="room-exchange-mark" aria-hidden="true"/>}
        </button>;
      })}
      {cat && <div className="cat-affection" key={cat.number} style={{left:(CAT_SEAT.x/ROOM_WIDTH*100)+'%',top:((CAT_SEAT.y-23)/ROOM_HEIGHT*100)+'%'}}>
        <span className="sr-only" role="status">The cat purrs.</span>
        <i aria-hidden="true"/><i aria-hidden="true"/><i aria-hidden="true"/>
      </div>}
    </div></div>;
}
