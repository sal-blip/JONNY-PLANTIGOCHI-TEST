import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {catalog,itemPrice,framePhotoIdentity,lifeOf} from './gardenEconomy.js';
import {toyVarietyName,canHomePlant} from './game.js';
import {drawSizeComparison,framePhotoBounds} from './roomShopArt.js';
import FramePhoto from './FramePhoto.jsx';
import {readFrameUpload} from './frameUpload.js';
import {ChevronRight,ShoppingBag} from 'lucide-react';

import SpecimenPortrait,{portraitDensity} from './SpecimenPortrait.jsx';
import {previewLayout} from './shopPreviewLayout.js';

function ItemArt({sku,photo,large=false,zoom=large?2:1}){
  const width=72*zoom,height=64*zoom;
  const [center,baseline,scale]=previewLayout[sku];
  const x=center*zoom,y=baseline*zoom,size=scale*zoom;
  const aperture=photo && framePhotoBounds(sku,x,y,size,portraitDensity);
  return <span className={'shop-specimen'+(large?' large':'')+(aperture?' framed-photo':'')} aria-hidden="true">
    <span className="shop-preview-stage">
      <SpecimenPortrait sku={sku} zoom={zoom} className="shop-art"/>
      {aperture && <FramePhoto photo={photo} deferOriginal={!large} style={{
        left:100*aperture.left/width+'%',top:100*aperture.top/height+'%',
        width:100*aperture.width/width+'%',height:100*aperture.height/height+'%',
      }}/>}
    </span>
  </span>;
}
function SizeComparison({sku}){
  const canvas=useRef(null);
  useEffect(()=>{
    const ctx=canvas.current.getContext('2d');
    if(!ctx)return;
    function paint(){
      ctx.setTransform(3,0,0,3,0,0);
      ctx.clearRect(0,0,72,80);
      drawSizeComparison(ctx,sku);
    }
    window.addEventListener('pot-art-ready',paint);
    paint();
    return ()=>window.removeEventListener('pot-art-ready',paint);
  },[sku]);
  return <span className="shop-specimen" aria-hidden="true"><canvas className="shop-scale-art" ref={canvas} width={216} height={240}/></span>;
}
function CoinBalance({plant}){
  return <div className="wallet"><img src="/art/iseed-coin.png" width="20" height="20" alt="" style={{imageRendering:"pixelated"}}/><strong>{lifeOf(plant).balance.toLocaleString()} Garden Coins</strong></div>;
}
export function ShopItemDetail({item,move,store,savePhoto,busy,inRoom=false,potOnly=false,children}){
  const [error,setError]=useState(''),[loading,setLoading]=useState(false);
  const input=useRef(null),pickerSource=useRef(null),request=useRef(0),product=catalog[item.sku];
  useEffect(()=>()=>{request.current++;},[item.id]);
  function openPhotoPicker(){
    pickerSource.current={identity:framePhotoIdentity(item.photo)};
    input.current.click();
  }
  async function applyPhoto(photo,expected,frameOriginal){
    setError('');
    if(!await savePhoto(photo,expected,frameOriginal))
      setError('The frame could not be saved. Check its current photo and the free space on this device.');
  }
  async function choosePhoto(e){
    const file=e.target.files?.[0];
    e.target.value='';
    const expected=pickerSource.current?pickerSource.current.identity:framePhotoIdentity(item.photo);
    pickerSource.current=null;
    if(!file)return;
    const token=++request.current;
    setLoading(true);setError('');
    try {
      const {photo,frameOriginal}=await readFrameUpload(file);
      if(request.current===token)await applyPhoto(photo,expected,frameOriginal);
    } catch {if(request.current===token)setError('This photo could not be opened. Try a JPEG, PNG, or WebP image.');}
    finally {if(request.current===token)setLoading(false);}
  }
  return <div className="garden-page">
    {!inRoom && <ItemArt large sku={item.sku} photo={item.photo}/>}
    {potOnly && children}
    <div className="menu-items">
      <button disabled={busy||loading} onClick={move}>{item.slot===null?'Place in room':potOnly?'Move pot only':'Move to another spot'}</button>
    </div>
    {!potOnly && children}
    {(product.kind==='frame' || item.slot!==null) && <div className="menu-items">
      {product.kind==='frame' && <><button disabled={busy||loading} onClick={openPhotoPicker}>{loading?'Preparing photo…':item.photo?'Change photo':'Choose a photo'}</button>
        <input hidden type="file" accept="image/*" aria-label="Frame photo" ref={input} onChange={choosePhoto}/>
        {item.photo && <button disabled={busy||loading} onClick={()=>applyPhoto(null,framePhotoIdentity(item.photo))}>Remove photo</button>}</>}
      {item.slot!==null && <button disabled={busy||loading} onClick={store}>{potOnly?'Store pot only':'Put in inventory'}</button>}
    </div>}{error && <p role="status">{error}</p>}
  </div>;
}
const kindLabel={pot:'Individual pot',frame:'Personal photo',plant:'Grown garden plant',decor:'Room decoration'};

function ShopPreview({sku,plant,busy,notice,onBack,onBuy}){
  const dialog=useRef(null);
  const product=catalog[sku],price=itemPrice(plant,sku),balance=lifeOf(plant).balance;
  useLayoutEffect(()=>{
    const element=dialog.current;
    element.showModal();
    return ()=>element.close();
  },[]);
  return <dialog ref={dialog} className="shop-look" aria-labelledby="shop-look-name"
    onCancel={event=>{event.preventDefault();if(!busy)onBack();}}>
    <div className="shop-look-body">
      <ItemArt sku={sku} large zoom={3}/>
      <p className="shop-look-kind">{kindLabel[product.kind]}</p>
      <h2 id="shop-look-name">{product.name}</h2>
      <p className="shop-look-price"><img src="/art/iseed-coin.png" width="19" height="19" alt=""/>{price} Garden Coins</p>
      {balance<price && <p>You need {price-balance} more coins.</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="shop-look-actions">
        <button type="button" autoFocus disabled={busy} onClick={onBack}>Back</button>
        <button type="button" disabled={busy || balance<price || Boolean(plant.tutorial && (plant.tutorial.step!=='pot' || sku!=='terra'))} onClick={onBuy}>Buy</button>
      </div>
    </div>
  </dialog>;
}
export default function GardenShop({plant,homePlant,onPlace,inspect,initialTab='shop',onTabChange,busy,notice,clearNotice,raised}){
  const startTab=initialTab==='bag'?'bag':'shop';
  const [tab,setTab]=useState(startTab);
  const [compare,setCompare]=useState(false),[previewSku,setPreviewSku]=useState(null);
  function preview(sku){clearNotice();setPreviewSku(sku);}
  async function buy(){
    if(await onPlace({sku:previewSku,id:crypto.randomUUID(),buy:true}))setPreviewSku(null);
  }
  useEffect(()=>{setTab(startTab);},[startTab]);
  function openTab(id){setTab(id);onTabChange?.(id);}
  const g=lifeOf(plant);
  return <div className="garden-page">
    <CoinBalance plant={plant}/>
    <div className="garden-tabs">
      <button aria-pressed={tab==='shop'} onClick={()=>openTab('shop')}>Shop</button>
      <button disabled={plant.tutorial?.step==='pot'} aria-pressed={tab==='bag'} onClick={()=>openTab('bag')}>My items</button>
    </div>
    {tab==='shop' && <div className="shop-compare">
      <label><input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)}/> Compare garden sizes</label>
      {compare && <p>Each item is shown beside a terracotta pot at windowsill depth.</p>}
    </div>}
    {tab==='shop'?<div className="shop-list">{Object.entries(catalog).filter(([,product])=>!product.retired).map(([sku,p])=><button key={sku}
      aria-label={p.name+' · '+itemPrice(plant,sku)+' coins'} aria-haspopup="dialog" disabled={Boolean(plant.tutorial && (plant.tutorial.step!=='pot' || sku!=='terra'))}
      onClick={()=>preview(sku)}>
      {compare?<SizeComparison sku={sku}/>:<ItemArt sku={sku}/>}<span>{p.name}<small>{kindLabel[p.kind]}</small></span>
      <b><img src="/art/iseed-coin.png" width="13" height="13" alt="" style={{imageRendering:"pixelated"}}/>{itemPrice(plant,sku)}</b></button>)}</div>:
      <div className="shop-list">{plant.waitingPlants?.map(item=><button key={item.id} disabled={!canHomePlant(plant,item.id)}
        onClick={()=>homePlant(item.id)}><ItemArt sku={item.species}/><span>{item.id===plant.id?plant.name:item.name}
          <small>{item.source==='shop'?'Daily spin prize':toyVarietyName(item.species)} · {canHomePlant(plant,item.id)?'Choose a garden spot':'Treat fungus first'}</small></span><ChevronRight size={16}/></button>)}
        {g.items.map(item=><button key={item.id} onClick={()=>inspect(item)}><ItemArt sku={item.sku} photo={item.photo}/>
        <span>{catalog[item.sku].name}<small>{item.slot===null?'In inventory':'In the room'}</small></span><ChevronRight size={16}/></button>)}
        {!g.items.length && !plant.waitingPlants?.length && <p><ShoppingBag size={16}/> Your pots and decorations will appear here.</p>}
        {plant.graduates.some(p=>p.source==='shop') && <p>Purchased plants live in their garden spots.</p>}</div>}
    {previewSku && tab==='shop' && raised && <ShopPreview sku={previewSku} plant={plant} busy={busy} notice={notice} onBack={()=>preview(null)} onBuy={buy}/>}
    <p className="garden-footnote">Visit Daily rewards to see your seven-day coin calendar. Healthy watering earns 2 up to three times a day. Game wins earn 3 up to five times a day.</p>
  </div>;
}
