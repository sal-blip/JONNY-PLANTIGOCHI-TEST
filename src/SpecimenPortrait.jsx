import React,{memo,useLayoutEffect,useRef} from 'react';
import {drawShopPreview} from './roomShopArt.js';
import {paintPotPortrait} from './shopSprites/potPortraits.js';
import {previewLayout} from './shopPreviewLayout.js';

// Scale the sprite coordinates before the renderer rounds individual pixel runs.
export const portraitDensity=3;

export default memo(function SpecimenPortrait({sku,zoom=1,className}){
  const ref=useRef(null);
  const scale=zoom*portraitDensity;
  useLayoutEffect(()=>{
    const canvas=ref.current,ctx=canvas.getContext('2d');
    if(!ctx)return;
    const [x,y,size]=previewLayout[sku];
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const cx=x*scale,base=y*scale,factor=size*scale;
    drawShopPreview(ctx,{sku,x:cx,y:base,size:factor});
    return paintPotPortrait(ctx,sku,cx,base,factor);
  },[sku,scale]);
  return <canvas ref={ref} className={className} width={72*scale} height={64*scale} aria-hidden="true"/>;
});
