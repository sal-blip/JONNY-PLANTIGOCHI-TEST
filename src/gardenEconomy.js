import {canPlaceAt,gardenViews,viewForSlot} from './gardenLayout.js';
import {backupLimit,validPhoto} from './gardenScenes.js';
import {validOriginalId} from './frameUpload.js';
import {decorPlaces} from './roomShopArt.js';

export const catalog = {
  terra:{name:'Terracotta pot',kind:'pot',price:10},
  wave:{name:'Blue wave pot',kind:'pot',price:18},
  'honey-glazed-terracotta':{name:'Honey-Glazed Terracotta',kind:'pot',price:16},
  'blue-willow-porcelain':{name:'Blue Willow Porcelain',kind:'pot',price:28},
  'low-sandstone-bowl':{name:'Low Sandstone Bowl',kind:'pot',price:20},
  'stump-cottage-pot':{name:'Stump Cottage',kind:'pot',price:34},
  'rain-boot-pot':{name:'Rain Boot',kind:'pot',price:24},
  'ringed-planet-pot':{name:'Ringed Planet',kind:'pot',price:38},
  'bog-frog-pot':{name:'Bog Frog Pot',kind:'pot',price:30},
  'lava-pop-pot':{name:'Lava Pop Pot',kind:'pot',price:36},
  oak:{name:'Oak photo frame',kind:'frame',price:20},
  lacquer:{name:'Lacquer photo frame',kind:'frame',price:28},
  neko:{name:'Maneki-neko',kind:'decor',price:30},
  record:{name:'Record player',kind:'decor',price:65},
  'golden-pothos':{retired:true,name:'Golden pothos',kind:'plant',price:250},
  'snake-plant':{name:'Snake plant',kind:'plant',price:100},
  'monstera-albo':{name:'Monstera Albo',kind:'plant',price:450},
  'pink-micans':{retired:true,name:'Pink Micans',kind:'plant',price:300},
  'hoya-serpens-splash':{retired:true,name:'Hoya serpens “Splash”',kind:'plant',price:325},
  'queen-anthurium':{retired:true,name:'Queen Anthurium',kind:'plant',price:500},
  'monkey-tail-cactus':{retired:true,name:'Monkey Tail Cactus',kind:'plant',price:225},
  'bird-of-paradise':{retired:true,name:'Bird of Paradise',kind:'plant',price:600},
  'moth-orchid':{retired:true,name:'Moth Orchid',kind:'plant',price:700},
  'variegated-billie':{name:'Variegated Billie',kind:'plant',price:650},
  'pink-princess':{name:'Pink Princess Philodendron',kind:'plant',price:375},
  'thai-constellation':{name:'Thai Constellation',kind:'plant',price:550},
  'raven-zz':{name:'Raven ZZ',kind:'plant',price:180},
  'polka-dot-begonia':{name:'Polka Dot Begonia',kind:'plant',price:225},
  'pearls-and-jade':{name:'Pearls and Jade Pothos',kind:'plant',price:150},
  'pink-diamond':{name:'Homalomena Pink Diamond',kind:'plant',price:700},
};
const empty = {balance:0,day:'',waters:0,wins:[],items:[],events:[],plants:[],notes:[]};
export const lifeOf = plant => plant.gardenLife ?? empty;
const update = (plant,fields) => ({...plant,gardenLife:{...lifeOf(plant),...fields}});
export function localDay(time) {
  const d=new Date(time);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
export const weeklyRewards=Object.freeze([10,10,15,15,20,20,30]);
// Older wallets only recorded the last paid visit. Count that receipt once.
export function lastVisit(life){
  return life.visit ?? (life.day?{date:life.day,streak:1}:null);
}
export function openDailyVisit(plant,time) {
  const life=lifeOf(plant), day=localDay(time);
  const previous=lastVisit(life);
  if((plant.tutorial && life.day) || day<life.day || (previous && day<=previous.date))return plant;
  // Compare calendar labels at UTC midnight so local DST never breaks a streak.
  const consecutive=previous && previous.claimed!==false && Date.parse(day)-Date.parse(previous.date)===86400000;
  const streak=consecutive?previous.streak+1:1;
  return update(plant,{day,visit:{date:day,streak,claimed:false},waters:0,wins:[]});
}

export function dailyActions(life,date){
  const visit=lastVisit(life);
  if(visit?.date!==date || life.day!==date)return 0;
  return Number(visit.claimed===false)+Number(!visit.spin);
}
export function claimDaily(plant,time,expected){
  const life=lifeOf(plant),visit=lastVisit(life);
  if(expected!==localDay(time) || visit?.date!==expected || life.day!==expected || visit.claimed!==false)return plant;
  return update(plant,{visit:{...visit,claimed:true},balance:life.balance+weeklyRewards[(visit.streak-1)%7]});
}
// The starter visit is paid by setup so the first pot is affordable during the lesson.
export function checkIn(plant,time){
  return claimDaily(openDailyVisit(plant,time),time,localDay(time));
}
export function presentDaily(plant,time,expected){
  const life=lifeOf(plant),visit=lastVisit(life);
  if(expected!==localDay(time) || !dailyActions(life,expected) || visit.shown)return plant;
  return update(plant,{visit:{...visit,shown:true}});
}
export const spinTable=Object.freeze([
  {id:'coins10',label:'10 coins',weight:35,coins:10,symbol:'coin'},
  {id:'coins25',label:'25 coins',weight:25,coins:25,symbol:'coin'},
  {id:'coins50',label:'50 coins',weight:15,coins:50,symbol:'coin'},
  {id:'coins100',label:'100 coins',weight:5,coins:100,symbol:'coin'},
  {id:'growth',label:'1 growth day',weight:10,symbol:'growth'},
  {id:'pot',label:'Garden pot',weight:7,symbol:'pot'},
  {id:'plant',label:'Grown shop plant',weight:3,symbol:'plant'},
]);
export function rollDailyPrize(roll,itemRoll){
  if(![roll,itemRoll].every(value=>Number.isFinite(value) && value>=0 && value<1))throw new RangeError('Invalid spin draw');
  let ticket=Math.floor(roll*100);
  const prize=spinTable.find(row=>{ticket-=row.weight;return ticket<0;});
  if(prize.id!=='plant' && prize.id!=='pot')return {id:prize.id};
  const pool=Object.keys(catalog).filter(sku=>catalog[sku].kind===prize.id && !catalog[sku].retired);
  return {id:prize.id,sku:pool[Math.floor(itemRoll*pool.length)]};
}
function validPrize(prize){
  if(!prize || !spinTable.some(row=>row.id===prize.id))return false;
  return ['plant','pot'].includes(prize.id)?Object.hasOwn(catalog,prize.sku) && catalog[prize.sku].kind===prize.id:prize.sku===undefined;
}
export const SPIN_TOKEN_COST=100;
export function tokenBalance(life){
  return (life.tokenBook?.bought ?? 0)-(life.tokenBook?.spent ?? 0);
}
export function buySpinToken(plant,expectedBought){
  const life=lifeOf(plant),book=life.tokenBook ?? {bought:0,spent:0};
  if(plant.tutorial || expectedBought!==book.bought || life.balance<SPIN_TOKEN_COST ||
    !Number.isSafeInteger(book.bought+1))return plant;
  return update(plant,{balance:life.balance-SPIN_TOKEN_COST,tokenBook:{...book,bought:book.bought+1}});
}
// Omit expectedSpent to use the daily free spin. A stale free tap can never spend a token.
export function settleDailySpin(plant,time,expected,prize,expectedSpent){
  const life=lifeOf(plant),visit=lastVisit(life);
  if(plant.tutorial || expected!==localDay(time) || visit?.date!==expected || life.day!==expected ||
    !validPrize(prize) || catalog[prize.sku]?.retired)return plant;
  const row=spinTable.find(row=>row.id===prize.id);
  let fields,id;
  if(expectedSpent===undefined){
    if(visit.spin)return plant;
    fields={visit:{...visit,spin:prize}};
    id='daily-spin-'+expected;
  }else{
    const book=life.tokenBook;
    if(!visit.spin || !book || expectedSpent!==book.spent || tokenBalance(life)<1)return plant;
    fields={tokenBook:{...book,spent:book.spent+1},
      visit:{...visit,tokenPrize:prize,tokenCoins:(visit.tokenCoins || 0)+(row.coins || 0)}};
    id='token-spin-'+(book.spent+1);
  }
  if(row.coins)fields.balance=life.balance+row.coins;
  if(prize.id==='growth')fields.growthDays=(life.growthDays || 0)+1;
  if(prize.id==='pot')fields.items=[...life.items,{id,sku:prize.sku,slot:null}];
  if(prize.id==='plant'){
    const gift={id,source:'shop',species:prize.sku,name:catalog[prize.sku].name,generation:1,plantedAt:time};
    plant={...plant,waitingPlants:[...(plant.waitingPlants || []),gift]};
  }
  return update(plant,fields);
}
export function earnWater(plant,time) {
  plant=openDailyVisit(plant,time);
  const life=lifeOf(plant);
  if((!plant.tutorial && life.day!==localDay(time)) || life.waters>=3 || (plant.tutorial && life.waters>0))return plant;
  return update(plant,{waters:life.waters+1,balance:life.balance+2});
}
export function earnWin(plant,id,started,time) {
  plant=openDailyVisit(plant,time);
  const life=lifeOf(plant);
  if(plant.tutorial || !id || localDay(time)!==life.day || life.wins.length>=5 || life.wins.includes(id) || localDay(started)!==life.day || started>time)return plant;
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
  if(g.visit!==undefined && (!g.visit || typeof g.visit.date!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(g.visit.date) ||
    !Number.isFinite(Date.parse(g.visit.date)) || g.visit.date>g.day || !integer(g.visit.streak) || g.visit.streak<1))return false;
  if(g.visit && ((g.visit.claimed!==undefined && typeof g.visit.claimed!=='boolean') ||
    (g.visit.shown!==undefined && typeof g.visit.shown!=='boolean') ||
    (g.visit.spin!==undefined && !validPrize(g.visit.spin))))return false;
  if(g.tokenBook!==undefined && (!g.tokenBook || !integer(g.tokenBook.bought) || !integer(g.tokenBook.spent) ||
    g.tokenBook.spent>g.tokenBook.bought))return false;
  if(g.visit?.tokenPrize!==undefined && (!g.visit.spin || !g.tokenBook?.spent || !validPrize(g.visit.tokenPrize)))return false;
  if(g.visit?.tokenCoins!==undefined && (!g.visit.tokenPrize || !integer(g.visit.tokenCoins)))return false;
  if(g.growthDays!==undefined && !integer(g.growthDays))return false;
  if(![g.items,g.events,g.plants,g.notes].every(list=>Array.isArray(list) && list.every(i=>i && validId(i.id)) && unique(list)))return false;
  const placed=new Set();
  for(const item of g.items){
    const kind=catalog[item.sku]?.kind;
    if(!['frame','pot','decor'].includes(kind) || (item.photo!==undefined && (kind!=='frame' || !validFramePhoto(item.photo))))return false;
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
// Repotting requires an empty vessel that actually occupies the destination.
export function canRepotAt(plant,slot) {
  if(!canPlaceAt(plant.graduates,slot))return false;
  return lifeOf(plant).items.some(i=>i.slot===slot && catalog[i.sku].kind==='pot');
}
export function destinationKey(plant,slot) {
  return JSON.stringify([plant.graduates.find(g=>g.slot===slot)?.id,lifeOf(plant).items.find(i=>i.slot===slot)?.id]);
}
export function itemPrice(plant,sku){return plant.tutorial?.step==='pot' && sku==='terra'?12:catalog[sku].price;}
export function placeItem(plant,{id,sku,from,buy,slot,expected},time) {
  const g=lifeOf(plant), product=catalog[sku], existing=g.items.find(i=>i.id===id);
  if(!product || !validId(id) || !canSetItem(plant,sku,slot,buy?null:from) || destinationKey(plant,slot)!==expected)return plant;
  if(buy && product.retired)return plant;
  if(buy && plant.tutorial && (plant.tutorial.step!=='pot' || sku!=='terra'))return plant;
  if(buy && (g.balance<itemPrice(plant,sku) || existing || plant.graduates.some(p=>p.id===id)))return plant;
  if(!buy && (!existing || existing.sku!==sku || existing.slot!==from || from===slot))return plant;
  const balance=g.balance-(buy?itemPrice(plant,sku):0);
  if(product.kind==='plant'){
    const resident={id,source:'shop',species:sku,name:product.name,slot,plantedAt:time,movedAt:time,generation:1};
    plant=update({...plant,version:4,graduates:[...plant.graduates,resident]},{balance});
    return milestone(plant,'bought',product.name+' came home from the shop.',time,id);
  }
  if(buy && plant.tutorial)plant={...plant,tutorial:{...plant.tutorial,step:'return'}};
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
export function relocateFurnishings(before,after,from,to,repot=false) {
  const items=lifeOf(before).items;
  const moving=!repot && items.find(item=>catalog[item.sku].kind==='pot' && item.slot===from);
  const stranded=new Set(itemsFromClosingRooms(before,after.graduates,moving?from:null));
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
const validFramePhoto=photo=>validPhoto(photo) && (photo.originalId===undefined || validOriginalId(photo.originalId));
export const framePhotoIdentity=photo=>photo?.originalId ?? photo?.src;
export function framePhoto(plant,id,photo,expected) {
  if(photo && !validFramePhoto(photo))return plant;
  const g=lifeOf(plant), item=g.items.find(i=>i.id===id && catalog[i.sku]?.kind==='frame');
  if(!item || framePhotoIdentity(item.photo)!==expected || (!photo && !item.photo))return plant;
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
const backupBytes = plant=>new Blob([JSON.stringify(plant)]).size;
export function fitsBackupChange(current,next) {
  const bytes=backupBytes(next);
  // Reserve room for ordinary growth. A larger imported garden can shed photos or notes in steps.
  return bytes<=backupLimit-65536 || bytes<backupBytes(current);
}
