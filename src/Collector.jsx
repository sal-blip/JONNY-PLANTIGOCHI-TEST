import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUp,ChevronLeft,ChevronRight,Image,Share} from 'lucide-react';
import {drawRoom,roomPots,ROOM_WIDTH,ROOM_HEIGHT} from './roomArt.js';
import {downloadFile} from './Recovery.jsx';
import GameLink from './GameLink.jsx';

const titles=['Living room','Window room','Garden room'];
const roomName=n=>n===0?'Living room':(titles[n%titles.length]+' '+(n+1));
export default function Collector({plant,moving,now,move,shareLink,startClose}) {
  const [room,setRoom]=useState(()=>moving?Math.floor(plant.graduates.length/6):0);
  const [slot,setSlot]=useState(null),[notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false),[postcard,setPostcard]=useState(null);
  const mounted=useRef(false);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;};},[]);
  const [arrived,setArrived]=useState(null);
  const canvas=useRef(null),back=useRef(null), swiped=useRef(null),placing=useRef(false), snapshot=useRef(), panel=useRef(null);
  const graduate=plant.graduates.find(g=>g.slot===slot);
  const choosing=moving===plant.id && plant.stage==='grown' && plant.deadAt===null;
  const last=Math.max(0,Math.ceil(plant.graduates.length/6)-1,choosing?Math.floor(plant.graduates.length/6):0);
  const page=Math.min(room,last);
  const date=new Date(now), hour=date.getHours()+date.getMinutes()/60;
  snapshot.current={hour,roomIndex:page,plants:Array.from({length:6},(_,i)=>plant.graduates.find(g=>g.slot===page*6+i)||null)};
  const exit=useCallback(()=>{if(!placing.current)startClose();},[startClose]);
  useEffect(()=>{back.current?.focus();},[]);
  useEffect(()=>{
    const ctx=canvas.current;
    if(!ctx)return;
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');
    const paint=()=>{if(!document.hidden)drawRoom(ctx,{...snapshot.current,time:performance.now(),reducedMotion:reduce.matches});};
    paint();const id=setInterval(paint,160);
    return ()=>clearInterval(id);
  },[]);
  useEffect(()=>{
    if(postcard)panel.current?.focus();
    return ()=>{if(postcard?.url)URL.revokeObjectURL(postcard.url);};
  },[postcard]);
  async function place() {
    if(placing.current)return;
    placing.current=true;setBusy(true);
    try {
      if(await move(slot)){setArrived(slot);setNotice('Home at last. A new seed is waiting in your keychain.');}
      else setNotice('The garden changed or could not be saved. Choose an available pot and try again.');
    } finally {placing.current=false;setBusy(false);}
  }
  async function prepare() {
    setBusy(true);setNotice('');
    try {
      const image=document.createElement('canvas');image.width=ROOM_WIDTH*4;image.height=ROOM_HEIGHT*4;
      drawRoom(image,{...snapshot.current,time:0,reducedMotion:true});
      const blob=await new Promise(resolve=>image.toBlob(resolve,'image/png'));
      if(!blob)throw Error();
      const file=new File([blob],'plantigochi-living-room.png',{type:'image/png'});
      if(mounted.current)setPostcard({url:URL.createObjectURL(blob),file});
    } catch {setNotice('Could not prepare the postcard. Try again.');}
    finally {setBusy(false);}
  }
  async function sendCard() {
    try {await navigator.share({files:[postcard.file],title:'My Plantigochi garden'});}
    catch(err){if(err.name!=='AbortError')setNotice('Choose Save image to share this postcard.');}
  }
  function changePage(n){setRoom(n);setSlot(null);setNotice('');setArrived(null);}
  return <section className="collector" aria-label="Collector garden"
    onKeyDown={e=>{if(e.key==='Escape'){if(postcard)setPostcard(null);else exit();}}}
    onTouchStart={e=>{swiped.current=e.touches[0]?.clientY;}}
    onTouchEnd={e=>{if(!postcard && swiped.current!=null && e.changedTouches[0].clientY-swiped.current>75)exit();swiped.current=null;}}>
    <header className="room-header"><div><span>PLANTIGOCHI</span><h1>{roomName(page)}</h1></div>
      <button ref={back} onClick={exit} aria-label="Back to Plantigochi"><ArrowUp/> Keychain</button></header>
    <div className="room-center"><div className="room-picture" style={{aspectRatio:ROOM_WIDTH+'/'+ROOM_HEIGHT}}>
      <canvas ref={canvas} width={ROOM_WIDTH} height={ROOM_HEIGHT} role="img" aria-label="Pixel-art living room with a picture window and six plant pots"/>
      <div className="pot-spots">{roomPots.map(({x,y},i)=>{
        const n=page*6+i, p=snapshot.current.plants[i];
        return <button key={n} className={(choosing && !p?'vacant ':'')+(slot===n?'selected ':'')+(arrived===n?'settled':'')}
          style={{left:x*100+'%',top:y*100+'%'}} aria-pressed={slot===n} aria-label={'Pot '+(i+1)+(p?' · Monstera generation '+p.generation:' · Empty')}
          onClick={()=>{setSlot(n);setNotice('');}}/>;
      })}</div>
    </div></div>
    <footer className="room-footer">
      <div className="room-line"><span role="status">{notice || (graduate?'Monstera · Gen '+graduate.generation+' · '+new Date(graduate.movedAt).toLocaleDateString():choosing?(slot!==null?'Settle your Monstera in pot '+(slot%6+1)+'?':'Choose an empty pot for your Monstera.'):slot!==null?'Empty pot · Ready for a graduate':plant.graduates.length+' collected')}</span>
      {choosing && slot!==null && !graduate && <button onClick={place} disabled={busy}>Move in</button>}</div>
      <nav aria-label="Room actions">{last>0 && <div className="room-pager"><button disabled={page===0} onClick={()=>changePage(page-1)} aria-label="Previous room"><ChevronLeft/></button>
        {page+1}/{last+1}<button disabled={page===last} onClick={()=>changePage(page+1)} aria-label="Next room"><ChevronRight/></button></div>}
        <button onClick={shareLink}><Share/> Game link</button><button disabled={busy} onClick={prepare}><Image/> Postcard</button></nav>
    </footer>
    {postcard && <dialog className="postcard" ref={el=>{if(el&&!el.open)el.showModal();}} onCancel={e=>{e.preventDefault();setPostcard(null);}}>
      <div ref={panel} tabIndex={-1}><h2>Garden postcard</h2><img src={postcard.url} alt={'Your '+roomName(page)+' postcard'}/>
        <div>{navigator.canShare?.({files:[postcard.file]}) && <button onClick={sendCard}>Share image</button>}
          <button onClick={()=>downloadFile(postcard.file,postcard.file.name)}>Save image</button><GameLink/>
          <button onClick={()=>setPostcard(null)}>Back to room</button></div><p role="status">{notice}</p></div>
    </dialog>}
  </section>;
}
