import {canPlaceAt,gardenViews,viewForSlot} from './gardenLayout.js';
import {backupLimit,validPhoto} from './gardenScenes.js';
import {decorPlaces} from './roomShopArt.js';

export const catalog = {
  terra:{name:'Terracotta pot',kind:'pot',price:10},
  wave:{name:'Blue wave pot',kind:'pot',price:18},
  oak:{name:'Oak photo frame',kind:'frame',price:20},
  lacquer:{name:'Lacquer photo frame',kind:'frame',price:28},
  neko:{name:'Maneki-neko',kind:'decor',price:30},
  record:{name:'Record player',kind:'decor',price:65},
  'golden-pothos':{name:'Golden pothos',kind:'plant',price:90},
  'snake-plant':{name:'Snake plant',kind:'plant',price:140}
};
const empty = {balance:0,day:'',waters:0,wins:[],items:[],events:[],plants:[],notes:[]};
export const lifeOf = plant => plant.gardenLife ?? empty;
const update = (plant,fields) => ({...plant,gardenLife:{...lifeOf(plant),...fields}});
export function localDay(time) {
  const d=new Date(time);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
export function checkIn(plant,time) {
  const life=lifeOf(plant), day=localDay(time);
  if(day<=life.day)return plant;
  return update(plant,{day,balance:life.balance+10,waters:0,wins:[]});
}
export function earnWater(plant,time) {
  plant=checkIn(plant,time);
  const life=lifeOf(plant);
  if(life.day!==localDay(time) || life.waters>=3)return plant;
  return update(plant,{waters:life.waters+1,balance:life.balance+2});
}
export function earnWin(plant,id,started,time) {
  plant=checkIn(plant,time);
  const life=lifeOf(plant);
  if(!id || localDay(time)!==life.day || life.wins.length>=5 || life.wins.includes(id) || localDay(started)!==life.day || started>time)return plant;
  return update(plant,{wins:[...life.wins,id],balance:life.balance+3});
}
export function milestone(plant,key,text,time,subject=plant.id) {
  const life=lifeOf(plant), id=subject+'/'+key;
  if(life.events.some(e=>e.id===id))return plant;
  return update(plant,{events:[...life.events,{id,text,time,subject}]});
}

const validId = s=>typeof s==='string' && s.length>0 && s.length<=180;
const integer = n=>Number.isSafeInteger(n) && n>=0;
const textFits = (s,max)=>typeof s==='string' && s.trim().length>0 && s.length<=max;
const unique = list=>new Set(list.map(item=>item.id)).size===list.length;
function decorView(slot){
  if(typeof slot!=='string')return -1;
  const view=Number(slot.split('/')[0]);
  return integer(view) && decorPlaces(view).some(p=>p.slot===slot) ? view : -1;
}
function itemView(item){
  return catalog[item.sku]?.kind==='pot'?viewForSlot(item.slot):decorView(item.slot);
}
export function validGardenLife(plant) {
  if(plant.gardenLife===undefined)return true;
  const g=plant.gardenLife;
  if(!g || !integer(g.balance) || typeof g.day!=='string' || !(g.day==='' || /^\d{4}-\d{2}-\d{2}$/.test(g.day)) ||
    !integer(g.waters) || g.waters>3 || !Array.isArray(g.wins) || g.wins.length>5 ||
    !g.wins.every(validId) || new Set(g.wins).size!==g.wins.length)return false;
  if(![g.items,g.events,g.plants,g.notes].every(list=>Array.isArray(list) && list.every(i=>i && validId(i.id)) && unique(list)))return false;
  const placed=new Set();
  for(const item of g.items){
    const kind=catalog[item.sku]?.kind;
    if(!['frame','pot','decor'].includes(kind) || (item.photo!==undefined && (kind!=='frame' || !validPhoto(item.photo))))return false;
    if(item.slot===null)continue;
    const view=itemView(item);
    if(view<0 || view>=gardenViews(plant.graduates) || placed.has(item.slot))return false;
    placed.add(item.slot);
  }
  const subjects=new Set(g.plants.map(p=>p.id));
  return g.plants.every(p=>textFits(p.name,64) && typeof p.species==='string' && p.species.length<=100) &&
    g.events.every(e=>integer(e.time) && validId(e.subject) && textFits(e.text,240)) &&
    g.notes.every(n=>integer(n.time) && validId(n.subject) && (n.group==='toy' || (n.group==='real' && subjects.has(n.subject)))
      && noteKinds.includes(n.kind) && typeof n.text==='string' && n.text.length<=2000);
}
export function canSetItem(plant,sku,slot,from=null) {
  const kind=catalog[sku]?.kind;
  if(!kind || from===slot)return false;
  if(kind==='plant')return canPlaceAt(plant.graduates,slot);
  if(kind==='pot'){
    const view=viewForSlot(slot);
    return view>=0 && view<gardenViews(plant.graduates);
  }
  const view=decorView(slot),items=lifeOf(plant).items;
  if(view<0 || view>=gardenViews(plant.graduates))return false;
  return !items.some(i=>i.slot===slot) || (decorView(from)>=0 && items.some(i=>i.slot===from && i.sku===sku));
}
export function destinationKey(plant,slot) {
  return JSON.stringify([plant.graduates.find(g=>g.slot===slot)?.id,lifeOf(plant).items.find(i=>i.slot===slot)?.id]);
}
export function placeItem(plant,{id,sku,from,buy,slot,expected},time) {
  const g=lifeOf(plant), product=catalog[sku], existing=g.items.find(i=>i.id===id);
  if(!product || !validId(id) || !canSetItem(plant,sku,slot,buy?null:from) || destinationKey(plant,slot)!==expected)return plant;
  if(buy && (g.balance<product.price || existing || plant.graduates.some(p=>p.id===id)))return plant;
  if(!buy && (!existing || existing.sku!==sku || existing.slot!==from || from===slot))return plant;
  const balance=g.balance-(buy?product.price:0);
  if(product.kind==='plant'){
    const resident={id,source:'shop',species:sku,name:product.name,slot,plantedAt:time,movedAt:time,generation:1};
    plant=update({...plant,graduates:[...plant.graduates,resident]},{balance});
    return milestone(plant,'bought',product.name+' came home from the shop.',time,id);
  }
  const otherSlot=buy?null:existing.slot;
  const items=g.items.filter(i=>i.id!==id).map(i=>i.slot===slot?{...i,slot:otherSlot}:i);
  return update(plant,{balance,items:[...items,{...existing,id,sku,slot}]});
}
export function itemsFromClosingRooms(before,graduates,from) {
  const remaining=gardenViews(graduates);
  if(remaining>=gardenViews(before.graduates))return [];
  // A pot at the graduate’s source comes along to the destination.
  return lifeOf(before).items.filter(item=>item.slot!==from && itemView(item)>=remaining);
}
export function relocateFurnishings(before,after,from,to) {
  const items=lifeOf(before).items;
  const moving=items.find(item=>catalog[item.sku].kind==='pot' && item.slot===from);
  const stranded=new Set(itemsFromClosingRooms(before,after.graduates,from));
  if(!moving && !stranded.size)return after;
  return update(after,{items:items.map(item=>{
    if(item===moving)return {...item,slot:to};
    if(stranded.has(item) || (moving && item.slot===to))return {...item,slot:null};
    return item;
  })});
}
export function storeItem(plant,id,from) {
  const g=lifeOf(plant),item=g.items.find(i=>i.id===id && i.slot!==null && i.slot===from);
  return item?update(plant,{items:g.items.map(i=>i===item?{...i,slot:null}:i)}):plant;
}
export function framePhoto(plant,id,photo) {
  if(photo && !validPhoto(photo))return plant;
  const g=lifeOf(plant), item=g.items.find(i=>i.id===id && catalog[i.sku]?.kind==='frame');
  if(!item)return plant;
  const next={...item};
  if(photo)next.photo=photo;
  else delete next.photo;
  return update(plant,{items:g.items.map(i=>i===item?next:i)});
}
export const noteKinds=['Observation','Watering','Feeding','Repotting'];
export function addRealPlant(plant,entry) {
  const g=lifeOf(plant);
  if(!validId(entry.id) || !textFits(entry.name,64) || typeof entry.species!=='string' || entry.species.length>100 || g.plants.some(p=>p.id===entry.id))return plant;
  return update(plant,{plants:[...g.plants,entry]});
}
export function saveNote(plant,note,original) {
  const g=lifeOf(plant), current=g.notes.find(n=>n.id===note.id);
  if(!validId(note.id) || !integer(note.time) || !noteKinds.includes(note.kind) || typeof note.text!=='string' || note.text.length>2000 ||
    (note.kind==='Observation' && !note.text.trim()) || (note.group==='real'?!g.plants.some(p=>p.id===note.subject):note.group!=='toy') ||
    JSON.stringify(current)!==JSON.stringify(original))return plant;
  return update(plant,{notes:current?g.notes.map(n=>n.id===note.id?note:n):[...g.notes,note]});
}
export function removeNote(plant,note) {
  const g=lifeOf(plant), current=g.notes.find(n=>n.id===note.id);
  if(!current || JSON.stringify(current)!==JSON.stringify(note))return plant;
  return update(plant,{notes:g.notes.filter(n=>n.id!==note.id)});
}
export function fitsBackup(plant) {
  return new Blob([JSON.stringify(plant)]).size <= backupLimit-65536;
}
