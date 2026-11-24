import React, {useEffect,useRef,useState} from 'react';
import GardenShop,{ShopItemDetail} from './GardenShop.jsx';
import PlantigotchiApp from './PlantigotchiApp.jsx';
import GardenJournal from './GardenJournal.jsx';
import {leaveEditor,newJournalSession} from './journalDrafts.js';
import {RecordControls} from './GardenRecord.jsx';
import GameLink from './GameLink.jsx';
import {downloadFile} from './Recovery.jsx';
import {catalog,itemPrice,canSetItem,fitsBackupChange,framePhoto,lifeOf,storeItem} from './gardenEconomy.js';
import {gardenViews,placesFor,slotFor,speciesName} from './gardenLayout.js';
import {decorPlaces} from './roomShopArt.js';
import './gardenMarket.css';

const titles={plantigotchi:'Plantigotchi',shop:'Garden shop',inventory:'Inventory',journal:'Journal',library:'Care library',postcard:'Garden postcard'};

function phonePlacementError(plant,request){
  const product=catalog[request.sku],garden=lifeOf(plant);
  if(request.buy && product.retired)return 'This plant has retired from the shop. Your coins are safe.';
  if(request.buy && garden.balance<itemPrice(plant,request.sku))return 'You need '+itemPrice(plant,request.sku)+' Garden Coins for this item.';
  if(!request.buy && !garden.items.some(item=>item.id===request.id && item.slot===request.from))
    return 'This item has moved. Reopen it in Inventory.';
  const count=gardenViews(plant.graduates);
  for(let view=0;view<count;view++){
    const slots=['decor','frame'].includes(product.kind)?decorPlaces(view).map(p=>p.slot):placesFor(view).map(p=>slotFor(view,p));
    if(slots.some(slot=>canSetItem(plant,request.sku,slot,request.from)))return '';
  }
  return product.kind==='plant'?'Every plant spot is occupied. Move a plant to free a spot.':
    'Every suitable display spot is occupied. Put a decoration in inventory to make room.';
}

function Postcard({roomRef,raised}){
  const owned=useRef(null),[card,setCard]=useState(null),[status,setStatus]=useState('loading');
  const [attempt,setAttempt]=useState(0),[shareMessage,setShareMessage]=useState('');
  useEffect(()=>()=>{if(owned.current)URL.revokeObjectURL(owned.current.url);owned.current=null;},[]);
  useEffect(()=>{
    if(!raised)return;
    let current=true;
    setStatus('loading');setShareMessage('');
    async function capture(){
      if(!current)return;
      try{
        const next=await roomRef.current?.preparePostcard();
        if(!next?.url || !next.file)throw Error('Postcard unavailable');
        if(!current){URL.revokeObjectURL(next.url);return;}
        if(owned.current && owned.current.url!==next.url)URL.revokeObjectURL(owned.current.url);
        owned.current=next;setCard(next);setStatus('ready');
      }catch{
        if(!current)return;
        if(owned.current)URL.revokeObjectURL(owned.current.url);
        owned.current=null;setCard(null);setStatus('error');
      }
    }
    // Defer until the current room and its imperative painter have mounted.
    void Promise.resolve().then(capture);
    return ()=>{current=false;};
  },[roomRef,raised,attempt]);
  function supportsFiles(){
    try{return card && navigator.canShare?.({files:[card.file]});}catch{return false;}
  }
  async function share(){
    const showing=card;setShareMessage('');
    try{await navigator.share({files:[showing.file],title:'My Plantigochi garden'});}
    catch(error){if(error?.name!=='AbortError' && owned.current===showing)setShareMessage('Save the image to share this postcard.');}
  }
  const roomName=card?.roomName || card?.file.name.replace(/^plantigochi-/,'').replace(/\.png$/i,'').replaceAll('-',' ');
  return <div className="room-postcard">
    {card && <img src={card.url} alt={'Your '+roomName+' postcard'}/>}
    {status==='loading' && <p role="status">Preparing your garden postcard…</p>}
    {status==='error' && <><p role="status">Could not prepare the postcard.</p>
      <div className="menu-items"><button onClick={()=>setAttempt(n=>n+1)}>Try again</button></div></>}
    {card && <div className="menu-items">
      {supportsFiles() && <button disabled={status!=='ready'} onClick={share}>Share image</button>}
      <button disabled={status!=='ready'} onClick={()=>downloadFile(card.file,card.file.name)}>Save image</button>
    </div>}
    <GameLink/>{shareMessage && <p role="status">{shareMessage}</p>}
  </div>;
}

/** App owns the raised/lowered surface and current route. Keep its contents
 * mounted while lowered so journal forms, library articles and scrolling survive. */
export function useGardenPhoneApps({page,open,plant,now,musicVolume,commit,beginPlacement,homePlant,roomRef,raised=true,playingRecordId,onSelectRecord}){
  const [itemId,setItemId]=useState(null),[journal,setJournal]=useState(newJournalSession);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(null);
  const pending=useRef(false),alive=useRef(false),route=useRef(null),handedOff=useRef(false);
  route.current={page,itemId};
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false;};},[]);
  useEffect(()=>{handedOff.current=false;},[raised,page]);
  const item=page==='item' && plant?lifeOf(plant).items.find(i=>i.id===itemId):null;
  const inSameApp=origin=>alive.current && route.current.page===origin.page && route.current.itemId===origin.itemId;
  function showError(text,origin=route.current){if(inSameApp(origin))setNotice({...origin,text});}
  function navigate(next){setNotice(null);open(next);}
  function openApp(next){
    if(pending.current)return;
    navigate(next);
  }
  function back(){
    if(pending.current)return;
    if(page==='journal' && journal.editing){setJournal(leaveEditor);return;}
    navigate(page==='item'?'inventory':'phone');
  }
  async function change(operation,report=true,frameOriginal){
    if(pending.current)return false;
    const origin=route.current,sourceId=plant.id;
    pending.current=true;setBusy(true);setNotice(null);
    let changed=false,tooBig=false;
    try{
      const saved=await commit(current=>{
        if(current.id!==sourceId)return current;
        const next=operation(current);
        if(next===current)return current;
        if(!fitsBackupChange(current,next)){tooBig=true;return current;}
        changed=true;return next;
      },{frameOriginal});
      if(saved && changed)return true;
      if(report)showError(tooBig?'Your garden is near its backup limit. Remove a frame photo and try again.':
        'Could not save this change. Check the entry or item and try again.',origin);
    }catch{if(report)showError('Could not save this change. Try again.',origin);}
    finally{pending.current=false;if(alive.current)setBusy(false);}
    return false;
  }
  async function place(request){
    if(pending.current || handedOff.current)return;
    const error=phonePlacementError(plant,request);
    if(error){showError(error);return;}
    const origin=route.current;pending.current=true;setBusy(true);setNotice(null);
    try{
      const accepted=await beginPlacement({...request,returnTo:request.buy?'shop':'item'});
      if(accepted)handedOff.current=true;
      else showError('The room is busy. Try placing the item again.',origin);
      return accepted;
    }catch{showError('Could not start placing this item. Try again.',origin);}
    finally{pending.current=false;if(alive.current)setBusy(false);}
  }
  function inspect(value){
    if(pending.current)return;
    setItemId(value.id);navigate('item');
  }
  async function putAway(){
    const origin=route.current;
    if(!await change(p=>storeItem(p,item.id,item.slot)))return;
    if(item.id===playingRecordId)onSelectRecord(null);
    if(inSameApp(origin))navigate('inventory');
  }
  function savePhoto(photo,expected,frameOriginal){
    return change(p=>framePhoto(p,item.id,photo,expected),false,frameOriginal);
  }
  function journalPage(tab){
    if(tab==='library' || tab!==journal.tab){
      setJournal(current=>({...leaveEditor(current),tab:tab==='library'?current.tab:tab}));
    }
    navigate(tab==='library'?'library':'journal');
  }
  let app=null;
  if(plant && (page==='shop' || page==='inventory')){
    app=<GardenShop busy={busy} raised={raised} notice={notice?.page===page?notice.text:null} clearNotice={()=>setNotice(null)} plant={plant} homePlant={homePlant} initialTab={page==='inventory'?'bag':'shop'} onTabChange={tab=>navigate(tab==='bag'?'inventory':'shop')} onPlace={place} inspect={inspect}/>;
  }else if(plant && (page==='journal' || page==='library')){
    app=<GardenJournal plant={plant} tab={page==='library'?'library':journal.tab} session={journal} setSession={setJournal} onTabChange={journalPage} change={operation=>change(operation,false)} busy={busy}/>;
  }else if(plant && page==='plantigotchi'){
    app=<PlantigotchiApp plant={plant} now={now}/>;
  }else if(page==='item'){
    const resident=item && item.slot!=null && catalog[item.sku].kind==='pot'?plant.graduates.find(p=>p.slot===item.slot):null;
    app=item?<ShopItemDetail key={item.id} item={item} busy={busy} move={()=>place({id:item.id,sku:item.sku,from:item.slot,buy:false})}
      store={putAway} savePhoto={savePhoto}>
      {resident && <p className="room-guide">Moving just this pot leaves {resident.name || speciesName(resident)} here.</p>}
      {item.sku==='record' && item.slot!==null && <RecordControls soundEnabled={musicVolume > 0} playing={playingRecordId===item.id}
        onPlayingChange={yes=>onSelectRecord(yes?item.id:null)}/>}
    </ShopItemDetail>:<div className="garden-page"><p role="status">This item is no longer available.</p>
      <div className="menu-items"><button onClick={back}>Back to Inventory</button></div></div>;
  }else if(page==='postcard'){
    app=<Postcard roomRef={roomRef} raised={raised}/>;
  }
  return {
    content:app && <>{app}{notice?.page===page && notice.itemId===itemId && <p role="status">{notice.text}</p>}</>,
    title:page==='item'?(catalog[item?.sku]?.name || 'Inventory'):titles[page],
    busy,back,openApp,
  };
}
