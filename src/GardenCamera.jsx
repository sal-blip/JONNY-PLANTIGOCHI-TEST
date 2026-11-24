import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Camera,ChevronLeft,ChevronRight,Download,Images,Share2} from 'lucide-react';
import {viewName} from './gardenLayout.js';
import {ROOM_HEIGHT,ROOM_WIDTH} from './roomArt.js';
import {cameraFrame,cameraRegion,wholeRoom,viewfinderShape,zoomAt} from './cameraFrame.js';
import {downloadFile} from './gardenBackup.js';
import {useCameraRoll} from './useCameraRoll.js';

const width=ROOM_WIDTH*3,height=ROOM_HEIGHT*3;

export default function GardenCamera({roomRef,count,raised}){
  const [index,setIndex]=useState(()=>roomRef.current?.cameraRoom??0);
  const room=Math.min(index,count-1);
  const [frame,setFrame]=useState(wholeRoom),[scene,setScene]=useState(null);
  const roll=useCameraRoll(),review=roll.selected!==null;
  const [error,setError]=useState(''),[attempt,retry]=useState(0);
  const [saving,setSaving]=useState(false);
  const canvas=useRef(null),drag=useRef(null),capture=useRef(0);
  const finder=useRef(null),[aspect,setAspect]=useState(width/height);
  const shape=useMemo(()=>viewfinderShape(aspect,width/height),[aspect]);
  const outW=Math.round(1200*Math.min(1,aspect)),outH=Math.round(1200*Math.min(1,1/aspect));
  const fingers=useRef(new Map());
  const [shot,setShot]=useState(0);
  useLayoutEffect(()=>{
    const el=finder.current;
    const measure=()=>{if(el.clientWidth && el.clientHeight)setAspect(el.clientWidth/el.clientHeight);};
    measure();
    const observer=new ResizeObserver(measure);observer.observe(el);
    return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    setFrame(f=>cameraFrame(f.x,f.y,f.zoom,shape));
  },[shape]);
  const ready=scene?.room===room && raised;
  useEffect(()=>{
    if(!raised)return;
    let active=true;
    setScene(null);setError('');
    const slow=setTimeout(()=>{if(active)setError('This room is taking longer to open.');},12000);
    async function load(){
      try{
        const paint=await roomRef.current.prepareCameraRoom(room);
        if(!active)return;
        const overview=document.createElement('canvas');
        overview.width=width;overview.height=height;
        paint(overview);
        setError('');setScene({room,overview,paint});
      }catch{if(active)setError('Couldn’t load this room. Try again.');}
      finally{clearTimeout(slow);}
    }
    void load();
    return ()=>{active=false;clearTimeout(slow);capture.current++;drag.current=null;fingers.current.clear();};
  },[raised,room,attempt,roomRef]);
  useEffect(()=>{if(raised)setSaving(false);},[raised]);
  useLayoutEffect(()=>{
    if(!ready || !canvas.current || review)return;
    const {x,y,w,h}=cameraRegion(frame,width,height,shape);
    const ctx=canvas.current.getContext('2d');
    ctx.clearRect(0,0,outW,outH);
    ctx.drawImage(scene.overview,x,y,w,h,0,0,outW,outH);
    if(frame.zoom===1 && shape.w===1 && shape.h===1)return;
    // Pan the cached room immediately, then resolve fine detail from the masters.
    const timer=setTimeout(()=>scene.paint(canvas.current,cameraRegion(frame,ROOM_WIDTH,ROOM_HEIGHT,shape)),150);
    return ()=>clearTimeout(timer);
  },[scene,frame,ready,review,shape,outW,outH]);

  function changeRoom(next){
    setIndex(next);setFrame(wholeRoom);setError('');drag.current=null;
  }
  function point(event){
    const rect=event.currentTarget.getBoundingClientRect();
    return {x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};
  }
  function pair(){
    const [a,b]=fingers.current.values();
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,(a.y-b.y)/aspect)};
  }
  function begin(event){
    if(!ready || saving || event.button!==0 || fingers.current.size>=2)return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin=point(event);
    fingers.current.set(event.pointerId,origin);
    drag.current=fingers.current.size===2?{pinch:pair(),frame}:{id:event.pointerId,origin,frame,moved:false};
  }
  function move(event){
    const d=drag.current;
    if(!d || !fingers.current.has(event.pointerId))return;
    const p=point(event);
    fingers.current.set(event.pointerId,p);
    if(d.pinch){
      const current=pair();
      const f=zoomAt(d.frame,d.frame.zoom*current.distance/Math.max(.001,d.pinch.distance),d.pinch.x,d.pinch.y,shape);
      setFrame(cameraFrame(f.x+(d.pinch.x-current.x)*shape.w/f.zoom,f.y+(d.pinch.y-current.y)*shape.h/f.zoom,f.zoom,shape));
      return;
    }
    const dx=p.x-d.origin.x,dy=p.y-d.origin.y;
    if(!d.moved && Math.hypot(dx,dy)<.015)return;
    d.moved=true;
    setFrame(cameraFrame(d.frame.x-dx*shape.w/d.frame.zoom,d.frame.y-dy*shape.h/d.frame.zoom,d.frame.zoom,shape));
  }
  function end(event){
    const d=drag.current;
    if(!fingers.current.delete(event.pointerId))return;
    if(!d || d.pinch){drag.current=null;return;}
    drag.current=null;
    if(!d.moved){
      const p=point(event),f=d.frame;
      setFrame(cameraFrame(f.x+(p.x-.5)*shape.w/f.zoom,f.y+(p.y-.5)*shape.h/f.zoom,Math.max(2,f.zoom),shape));
    }
  }
  function key(event){
    const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if(!dir || !ready)return;
    event.preventDefault();event.stopPropagation();
    setFrame(f=>cameraFrame(f.x+dir[0]*.08*shape.w/f.zoom,f.y+dir[1]*.08*shape.h/f.zoom,f.zoom,shape));
  }
  async function shoot(){
    if(!ready || saving)return;
    const id=++capture.current;
    setSaving(true);setError('');
    try{
      const image=document.createElement('canvas');image.width=outW;image.height=outH;
      scene.paint(image,cameraRegion(frame,ROOM_WIDTH,ROOM_HEIGHT,shape));
      const blob=await new Promise(resolve=>image.toBlob(resolve,'image/png'));
      if(!blob)throw Error();
      if(id!==capture.current)return;
      const file=new File([blob],'plantigochi-'+viewName(room).toLowerCase().replaceAll(' ','-')+'.png',{type:'image/png'});
      await roll.add(file);
      if(id===capture.current)setShot(n=>n+1);
    }catch{if(id===capture.current)setError('Couldn’t take this photo. Try again.');}
    finally{if(id===capture.current)setSaving(false);}
  }
  const photo=roll.photo;
  const indexInRoll=roll.keys.indexOf(roll.selected);
  async function share(){
    if(!photo)return;
    const data={files:[photo.file],title:'My Plantigochi garden'};
    try{
      if(!navigator.canShare?.(data))return downloadFile(photo.file,photo.file.name);
      await navigator.share(data);
    }catch(e){if(e.name!=='AbortError')setError('Sharing is unavailable. Open your photos and choose Save photo.');}
  }
  return <section ref={finder} className="garden-camera" data-handset-no-pull="" aria-label="Garden camera">
    {review?<div className="camera-review">{photo && <img src={photo.url} alt="Selected garden photo"/>}</div>:
      <div className="camera-finder">
        <canvas ref={canvas} width={outW} height={outH} tabIndex={0} aria-label="Garden viewfinder. Tap a plant to focus, drag to frame, or pinch to zoom."
          onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={e=>{fingers.current.delete(e.pointerId);drag.current=null;}} onKeyDown={key}/>
        {shot>0 && <i key={shot} aria-hidden="true" className="camera-flash"/>}
      </div>}
    <div className="camera-room-nav">
      <button aria-label={review?'Previous photo':'Previous camera room'} disabled={saving || (review?indexInRoll>=roll.keys.length-1:room===0)}
        onClick={()=>review?roll.select(roll.keys[indexInRoll+1]):changeRoom(room-1)}><ChevronLeft/></button>
      <h2>{review?'Photo '+(roll.keys.length-indexInRoll)+' of '+roll.keys.length:viewName(room)}</h2>
      <button aria-label={review?'Next photo':'Next camera room'} disabled={saving || (review?indexInRoll<=0:room>=count-1)}
        onClick={()=>review?roll.select(roll.keys[indexInRoll-1]):changeRoom(room+1)}><ChevronRight/></button>
    </div>
    {!ready && !review && !error && <p className="camera-status" role="status">Opening camera…</p>}
    {(error || roll.warning) && <p className="camera-status" role="status">{error || roll.warning}
      {error && !scene && <button onClick={()=>retry(n=>n+1)}>Retry</button>}</p>}
    {!review && <label className="camera-zoom">
      <output aria-hidden="true">{Number(frame.zoom.toFixed(1))}×</output>
      <input aria-label="Zoom" aria-orientation="vertical" aria-valuetext={frame.zoom.toFixed(1)+' times zoom'} type="range" min="1" max="4" step=".1"
        value={frame.zoom} disabled={!ready || saving} onChange={e=>{const scale=Number(e.target.value);setFrame(f=>zoomAt(f,scale,.5,.5,shape));}}/>
    </label>}
    <div className="camera-actions">
      {review?<button aria-label="Save photo" title="Save photo" disabled={!photo} onClick={()=>downloadFile(photo.file,photo.file.name)}><Download/></button>:
        <button className="camera-thumb" aria-label="Open captured photos" title="Captured photos" disabled={!photo || saving}
          onClick={()=>roll.select(roll.keys[0])}>{photo?<img src={photo.url} alt=""/>:<Images/>}</button>}
      {review?<button aria-label="Return to camera" title="Return to camera" onClick={()=>{roll.select(null);setError('');}}><Camera/></button>:
        <button className="camera-shutter" aria-label="Take photo" title="Take photo" disabled={!ready || saving} onClick={shoot}/>}
      <button aria-label="Share photo" title="Share photo" disabled={!photo || saving} onClick={share}><Share2/></button>
    </div>
    <span className="camera-sr" role="status">{shot>0?'Photo captured. '+shot+' this session.':''}</span>
  </section>;
}
