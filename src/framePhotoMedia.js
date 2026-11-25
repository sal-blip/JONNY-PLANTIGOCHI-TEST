import {readFrameOriginal} from './gardenStore.js';
import {viewForSlot} from './gardenLayout.js';
import {decorPlaces} from './roomShopArt.js';

// The room, inventory, and postcard can display the same original at once.
// Revoke its URL once the last display has released it.
const originals=new Map();
export function acquireFrameOriginal(id){
  let entry=originals.get(id);
  if(!entry){
    entry={count:0,url:null};
    originals.set(id,entry);
    entry.ready=readFrameOriginal(id).then(blob=>{
      if(blob && entry.count)entry.url=URL.createObjectURL(blob);
      return entry.url;
    }).catch(()=>null);
  }
  entry.count++;
  return {ready:entry.ready,release(){
    if(--entry.count===0){
      originals.delete(id);
      if(entry.url)URL.revokeObjectURL(entry.url);
    }
  }};
}

function loadImage(src){
  if(!src)return Promise.resolve(null);
  return new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>resolve(null);
    image.src=src;
  });
}

export async function prepareRoomPhotos(items,view,sharedOnly=false){
  const photos=new Map();
  const dedicated=sharedOnly?[]:decorPlaces(view).filter(p=>!p.shared).map(p=>p.slot);
  await Promise.all(items.map(async item=>{
    if(!item.photo || !(view%2===0 && viewForSlot(item.slot)===view || dedicated.includes(item.slot)))return;
    const photo=item.photo,original=photo.originalId?acquireFrameOriginal(photo.originalId):null;
    try{
      const image=(original && await loadImage(await original.ready)) || await loadImage(photo.src);
      if(image)photos.set(item.id,image);
    }finally{original?.release();}
  }));
  return photos;
}
