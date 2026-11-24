import regions from './native-regions.json' with {type:'json'};
const atlasURL=new URL('./native-art.png',import.meta.url).href;
let atlas;

function sourceAtlas(){
  if(!atlas){
    atlas=new Image();
    atlas.onload=()=>window.dispatchEvent(new Event('pot-art-ready'));
    atlas.src=atlasURL;
  }
  return atlas;
}

// A postcard is a one-shot render. Wait for the same masters that the live
// room can repaint asynchronously, with the indexed artwork available offline.
export async function prepareNativeArt(){
  try{await sourceAtlas().decode();}catch{return;}
}

// Lighting is cached per cutout, so drawing a swaying plant only samples a bitmap.
const cutouts=new Map();
export function nativeArt(sku,night=0,selected=false){
  const region=regions[sku];
  if(!region || typeof Image==='undefined')return null;
  sourceAtlas();
  if(!atlas.complete || !atlas.naturalWidth)return null;
  const step=Math.round(Math.min(1,Math.max(0,night))*48);
  const key=[sku,step,selected].join('/');
  if(cutouts.has(key))return cutouts.get(key);
  const [x,y,width,height]=region;
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(atlas,x,y,width,height,0,0,width,height);
  if(step || selected){
    const pixels=ctx.getImageData(0,0,width,height),p=pixels.data,n=step/48;
    for(let i=0;i<p.length;i+=4){
      for(let c=0;c<3;c++){
        const v=p[i+c],lit=v+((v*dark[c]+moon[c])-v)*n;
        p[i+c]=selected?lit+(highlight[c]-lit)*.24:lit;
      }
    }
    ctx.putImageData(pixels,0,0);
  }
  if(cutouts.size>=96)cutouts.delete(cutouts.keys().next().value);
  cutouts.set(key,canvas);
  return canvas;
}
const dark=[.58,.62,.74],moon=[5,9,16],highlight=[255,230,169];
