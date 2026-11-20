import {useCallback,useEffect,useRef,useState} from 'react';

const pose=value=>'translate3d(0,'+(-100*value)+'%,0)';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useGardenPassage(){
  const [room,setRoom]=useState(null),[inside,setInside]=useState(false);
  const track=useRef(null),handle=useRef(null),finger=useRef(null),animation=useRef(null);
  const progress=useRef(0),suppressClick=useRef(false);

  const reset=useCallback(()=>{
    animation.current?.cancel();animation.current=null;finger.current=null;progress.current=0;
    if(track.current)track.current.style.transform=pose(0);
    setInside(false);setRoom(null);
  },[]);
  useEffect(()=>()=>animation.current?.cancel(),[]);

  function settle(enter,moving){
    if(animation.current || !track.current)return;
    const from=progress.current,to=enter?1:0;
    if(enter)setRoom(previous=>previous || {moving});
    setInside(false);
    const el=track.current;
    progress.current=to;el.style.transform=pose(to);
    function finish(){
      setInside(enter);
      if(!enter){setRoom(null);requestAnimationFrame(()=>handle.current?.focus({preventScroll:true}));}
    }
    if(reduced() || from===to || !el.animate){finish();return;}
    const run=el.animate([{transform:pose(from)},{transform:pose(to)}],{
      duration:Math.max(160,620*Math.sqrt(Math.abs(to-from))),easing:from>0 && from<1?'cubic-bezier(.2,.64,.28,1)':'cubic-bezier(.32,.05,.2,1)'
    });
    animation.current=run;
    run.finished.then(()=>{if(animation.current===run){animation.current=null;finish();}},()=>{});
  }

  function start(e){
    if(room || animation.current || !e.isPrimary || e.button!==0)return;
    const target=e.target, floor=e.currentTarget, bounds=floor.getBoundingClientRect();
    if(!target.closest('.garden-pull') && (target.closest('button,.device,dialog') ||
        e.clientY<bounds.bottom-Math.max(80,bounds.height*.26)))return;
    suppressClick.current=false;
    finger.current={id:e.pointerId,x:e.clientX,y:e.clientY,height:bounds.height,dragging:false};
  }
  function drag(e){
    const g=finger.current;
    if(!g || g.id!==e.pointerId)return;
    const dy=g.y-e.clientY,dx=Math.abs(g.x-e.clientX);
    if(!g.dragging){
      if((dx>9 && dx>Math.abs(dy)) || dy < -9){finger.current=null;return;}
      if(dy<7 || dy<dx*1.25)return;
      g.dragging=true;suppressClick.current=true;
      track.current.setPointerCapture(e.pointerId);setRoom({});
    }
    const distance=Math.max(0,Math.min(1,dy/g.height));
    progress.current=reduced()?0:distance;
    track.current.style.transform=pose(progress.current);
  }
  function release(e,cancelled=false){
    const g=finger.current;
    if(!g || g.id!==e.pointerId)return;
    finger.current=null;
    if(!g.dragging)return;
    const el=track.current;
    if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);
    settle(!cancelled && g.y-e.clientY>=Math.min(100,g.height*.18));
  }
  function activate(e){
    if(suppressClick.current && e.detail!==0){suppressClick.current=false;return;}
    settle(true);
  }
  return {room,inside,track,handle,reset,enter:moving=>settle(true,moving),leave:()=>settle(false),start,drag,release,activate};
}
