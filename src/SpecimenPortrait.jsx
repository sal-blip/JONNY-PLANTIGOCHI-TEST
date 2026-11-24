import React,{memo,useLayoutEffect,useRef} from 'react';
import {drawShopPreview} from './roomShopArt.js';
import {previewLayout} from './shopPreviewLayout.js';

export const portraitDensity=3;

export default memo(function SpecimenPortrait({sku,zoom=1,className}){
  const ref=useRef(null);
  useLayoutEffect(()=>{
    const canvas=ref.current,ctx=canvas.getContext('2d');
    if(!ctx)return;
    const [x,y,size]=previewLayout[sku];
    function paint(){
      const width=canvas.clientWidth;
      if(!width)return;
      const scale=Math.min(16,Math.max(portraitDensity*zoom,width*(window.devicePixelRatio || 1)/72));
      const w=Math.max(1,Math.round(72*scale)),h=Math.max(1,Math.round(64*scale));
      if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
      ctx.clearRect(0,0,w,h);
      drawShopPreview(ctx,{sku,x:x*w/72,y:y*h/64,size:size*w/72});
    }
    const observer=new ResizeObserver(paint);
    observer.observe(canvas);
    window.addEventListener('resize',paint);
    window.addEventListener('pot-art-ready',paint);
    paint();
    return ()=>{
      observer.disconnect();
      window.removeEventListener('resize',paint);
      window.removeEventListener('pot-art-ready',paint);
    };
  },[sku,zoom]);
  return <canvas ref={ref} className={className} style={{aspectRatio:'72 / 64'}} width={72*zoom} height={64*zoom} aria-hidden="true"/>;
});
