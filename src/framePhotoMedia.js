import {readFrameOriginal} from './gardenStore.js';
import {decorPlaces,framePhotoBounds} from './roomShopArt.js';

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

export async function prepareRoomPhotos(items,view){
  const photos=new Map();
  await Promise.all(decorPlaces(view).map(async spot=>{
    const item=items.find(i=>i.slot===spot.slot);
    if(!item?.photo || !framePhotoBounds(item.sku,spot.baseX,spot.baseY,spot.size))return;
    const photo=item.photo,original=photo.originalId?acquireFrameOriginal(photo.originalId):null;
    try{
      const image=(original && await loadImage(await original.ready)) || await loadImage(photo.src);
      if(image)photos.set(item.id,image);
    }finally{original?.release();}
  }));
  return photos;
}
