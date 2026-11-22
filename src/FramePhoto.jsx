import React,{useEffect,useRef,useState} from 'react';
import {acquireFrameOriginal} from './framePhotoMedia.js';
import './framePhoto.css';

export function useFramePhotoUrl(photo,visible=true){
  const id=visible?photo?.originalId:null;
  const [original,setOriginal]=useState(null);
  useEffect(()=>{
    if(!id){setOriginal(null);return;}
    let active=true;
    const asset=acquireFrameOriginal(id);
    asset.ready.then(url=>{if(active && url)setOriginal({id,url});});
    return ()=>{active=false;asset.release();};
  },[id]);
  return id && original?.id===id?original.url:photo?.src;
}

export default function FramePhoto({photo,style,night=0,itemId,deferOriginal=false,allowOriginal=true}){
  const aperture=useRef(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    if(!allowOriginal || !deferOriginal || !photo?.originalId || typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'48px'});
    observer.observe(aperture.current);
    return ()=>observer.disconnect();
  },[allowOriginal,deferOriginal,photo?.originalId]);
  const chosen=useFramePhotoUrl(photo,allowOriginal && (!deferOriginal || visible));
  const [failedOriginal,setFailedOriginal]=useState(null),[failedFallback,setFailedFallback]=useState(null);
  const original=chosen!==photo.src && chosen!==failedOriginal?chosen:null;
  const src=original || (photo.src!==failedFallback?photo.src:null);
  return <span ref={aperture} className="frame-photo" aria-hidden="true" data-frame-item={itemId}
    style={{...style,backgroundColor:src?'#efeeda':undefined,'--frame-shade':src?Math.min(.48,.48*night):0}}>
    {src && <img src={src} alt="" decoding="async" draggable={false}
      style={{objectPosition:(photo.x??50)+'% '+(photo.y??50)+'%'}}
      onError={()=>original?setFailedOriginal(src):setFailedFallback(src)}/>}
  </span>;
}
