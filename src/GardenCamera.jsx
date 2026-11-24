import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Camera,ChevronLeft,ChevronRight,Download,RotateCcw,Share2} from 'lucide-react';
import {viewName} from './gardenLayout.js';
import {ROOM_HEIGHT,ROOM_WIDTH} from './roomArt.js';
import {cameraFrame,cameraRegion,wholeRoom,zoomAt} from './cameraFrame.js';
import {downloadFile} from './gardenBackup.js';
import GameLink from './GameLink.jsx';

const width=ROOM_WIDTH*3,height=ROOM_HEIGHT*3;

export default function GardenCamera({roomRef,count,raised}){
  const [index,setIndex]=useState(()=>roomRef.current?.cameraRoom??0);
  const room=Math.min(index,count-1);
  const [frame,setFrame]=useState(wholeRoom),[scene,setScene]=useState(null);
  const [photo,setPhoto]=useState(null),[error,setError]=useState(''),[attempt,retry]=useState(0);
  const [saving,setSaving]=useState(false);
  const canvas=useRef(null),drag=useRef(null),capture=useRef(0);
  const fingers=useRef(new Map());
  const ready=scene?.room===room && raised;
  useEffect(()=>{
    if(!raised)return;
    let active=true;
    setScene(null);setError('');
    async function load(){
      try{
        const paint=await roomRef.current.prepareCameraRoom(room);
        if(!active)return;
        const overview=document.createElement('canvas');
        overview.width=width;overview.height=height;
        paint(overview);
        setScene({room,overview,paint});
      }catch{if(active)setError('Couldn’t load this room. Try again.');}
    }
    void load();
    return ()=>{active=false;capture.current++;drag.current=null;fingers.current.clear();};
  },[raised,room,attempt,roomRef]);
  useEffect(()=>{if(raised)setSaving(false);},[raised]);
  useEffect(()=>()=>{if(photo)URL.revokeObjectURL(photo.url);},[photo]);
  useLayoutEffect(()=>{
    if(!ready || !canvas.current || photo)return;
    const {x,y,w,h}=cameraRegion(frame,width,height);
    const ctx=canvas.current.getContext('2d');
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(scene.overview,x,y,w,h,0,0,width,height);
    if(frame.zoom===1)return;
    // Pan the cached room immediately, then resolve fine detail from the masters.
    const timer=setTimeout(()=>scene.paint(canvas.current,cameraRegion(frame,ROOM_WIDTH,ROOM_HEIGHT)),150);
    return ()=>clearTimeout(timer);
  },[scene,frame,ready,photo]);

  function changeRoom(next){
    setIndex(next);setFrame(wholeRoom);setError('');drag.current=null;
  }
  function point(event){
    const rect=event.currentTarget.getBoundingClientRect();
    return {x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};
  }
  function pair(){
    const [a,b]=fingers.current.values();
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,(a.y-b.y)*height/width)};
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
      const f=zoomAt(d.frame,d.frame.zoom*current.distance/Math.max(.001,d.pinch.distance),d.pinch.x,d.pinch.y);
      setFrame(cameraFrame(f.x+(d.pinch.x-current.x)/f.zoom,f.y+(d.pinch.y-current.y)/f.zoom,f.zoom));
      return;
    }
    const dx=p.x-d.origin.x,dy=p.y-d.origin.y;
    if(!d.moved && Math.hypot(dx,dy)<.015)return;
    d.moved=true;
    setFrame(cameraFrame(d.frame.x-dx/d.frame.zoom,d.frame.y-dy/d.frame.zoom,d.frame.zoom));
  }
  function end(event){
    const d=drag.current;
    if(!fingers.current.delete(event.pointerId))return;
    if(!d || d.pinch){drag.current=null;return;}
    drag.current=null;
    if(!d.moved){
      const p=point(event),f=d.frame;
      setFrame(cameraFrame(f.x+(p.x-.5)/f.zoom,f.y+(p.y-.5)/f.zoom,Math.max(2,f.zoom)));
    }
  }
  function key(event){
    const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if(!dir || !ready)return;
    event.preventDefault();event.stopPropagation();
    setFrame(f=>cameraFrame(f.x+dir[0]*.08/f.zoom,f.y+dir[1]*.08/f.zoom,f.zoom));
  }
  async function shoot(){
    if(!ready || saving)return;
    const id=++capture.current;
    setSaving(true);setError('');
    try{
      const image=document.createElement('canvas');image.width=width;image.height=height;
      scene.paint(image,cameraRegion(frame,ROOM_WIDTH,ROOM_HEIGHT));
      const blob=await new Promise(resolve=>image.toBlob(resolve,'image/png'));
      if(!blob)throw Error();
      if(id!==capture.current)return;
      const file=new File([blob],'plantigochi-'+viewName(room).toLowerCase().replaceAll(' ','-')+'.png',{type:'image/png'});
      setPhoto({file,url:URL.createObjectURL(file)});
    }catch{if(id===capture.current)setError('Couldn’t take this photo. Try again.');}
    finally{if(id===capture.current)setSaving(false);}
  }
  let canShare=false;
  try{canShare=photo && navigator.canShare?.({files:[photo.file]});}catch{}
  async function share(){
    try{await navigator.share({files:[photo.file],title:'My Plantigochi garden'});}
    catch(e){if(e.name!=='AbortError')setError('Save this photo to share it from your device.');}
  }
  return <section className="garden-camera">
    <div className="camera-room-nav">
      <button aria-label="Previous camera room" disabled={!!photo || saving || room===0} onClick={()=>changeRoom(room-1)}><ChevronLeft/></button>
      <h2>{viewName(room)}</h2>
      <button aria-label="Next camera room" disabled={!!photo || saving || room>=count-1} onClick={()=>changeRoom(room+1)}><ChevronRight/></button>
    </div>
    {photo?<img className="camera-print" src={photo.url} alt={'Your photo of '+viewName(room)}/>:<div className="camera-finder" data-handset-no-pull="">
      <canvas ref={canvas} width={width} height={height} tabIndex={0} aria-label="Garden viewfinder. Tap to focus or use the zoom slider and arrow keys to frame a plant."
        onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={e=>{fingers.current.delete(e.pointerId);drag.current=null;}} onKeyDown={key}/>
      {!ready && <span role="status">{error?'Room unavailable':'Opening camera…'}</span>}
    </div>}
    {photo?<div className="camera-actions">
      <button onClick={()=>{setPhoto(null);setError('');}}><RotateCcw/>Retake</button>
      <button onClick={()=>downloadFile(photo.file,photo.file.name)}><Download/>Save photo</button>
      {canShare && <button onClick={share}><Share2/>Share photo</button>}
    </div>:<>
      <label className="camera-zoom">Zoom <input data-handset-no-pull="" type="range" min="1" max="4" step=".1"
        value={frame.zoom} disabled={!ready || saving} onChange={e=>{const scale=Number(e.target.value);setFrame(f=>zoomAt(f,scale));}}/>
        <output>{Number(frame.zoom.toFixed(1))}×</output></label>
      <p>Tap a plant to focus, drag to frame, or pinch to zoom.</p>
      <button className="camera-shutter" disabled={!ready || saving} onClick={shoot}><Camera/>{saving?'Capturing…':'Take photo'}</button>
    </>}
    {error && <p role="status">{error} {!scene && <button onClick={()=>retry(n=>n+1)}>Retry</button>}</p>}
    <div className="camera-link"><GameLink/></div>
  </section>;
}
