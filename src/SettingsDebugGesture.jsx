import React,{useLayoutEffect,useRef} from 'react';

export default function SettingsDebugGesture({onOpen}){
  const left=useRef(null),right=useRef(null);
  useLayoutEffect(()=>{
    const corners=[left.current,right.current];
    const dialog=left.current.closest('dialog');
    let timer=null,blocked=false;

    function clear(){
      clearTimeout(timer);
      timer=null;
    }
    function cancel(){
      clear();
      blocked=true;
    }
    function inside(touch,corner){
      const box=corner.getBoundingClientRect();
      return touch.clientX>=box.left && touch.clientX<=box.right &&
        touch.clientY>=box.top && touch.clientY<=box.bottom;
    }
    function track(event){
      const touches=Array.from(event.touches);
      if(!touches.length){clear();blocked=false;return;}
      if(event.type==='touchstart' && touches.length===event.changedTouches.length){
        clear();
        blocked=false;
      }
      if(event.type==='touchend' || event.type==='touchcancel' || touches.length>2){cancel();return;}
      if(blocked)return;
      const onCorners=touches.every(t=>corners.some(c=>inside(t,c)));
      if(!onCorners){cancel();return;}
      if(touches.length!==2)return;
      if(!corners.every(c=>touches.some(t=>inside(t,c)))){cancel();return;}
      if(event.cancelable)event.preventDefault();
      if(timer===null){
        timer=setTimeout(()=>{
          cancel();
          if(dialog.open && !document.hidden)onOpen();
        },5000);
      }
    }
    function visibility(){if(document.hidden)cancel();}
    const options={capture:true,passive:false};
    const events=['touchstart','touchmove','touchend','touchcancel'];
    for(const name of events)dialog.addEventListener(name,track,options);
    window.addEventListener('blur',cancel);
    window.addEventListener('resize',cancel);
    document.addEventListener('visibilitychange',visibility);
    return ()=>{
      clear();
      for(const name of events)dialog.removeEventListener(name,track,options);
      window.removeEventListener('blur',cancel);
      window.removeEventListener('resize',cancel);
      document.removeEventListener('visibilitychange',visibility);
    };
  },[onOpen]);
  return <>
    <span ref={left} className="debug-corner left"/>
    <span ref={right} className="debug-corner right"/>
  </>;
}
