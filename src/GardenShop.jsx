import React,{useEffect,useRef,useState} from 'react';
import {catalog,itemPrice,framePhotoIdentity,lifeOf,localDay} from './gardenEconomy.js';
import {isToySpecies} from './game.js';
import {drawShopPreview,framePhotoBounds} from './roomShopArt.js';
import FramePhoto from './FramePhoto.jsx';
import {readFrameUpload} from './frameUpload.js';
import {ChevronRight,ShoppingBag} from 'lucide-react';

import {previewLayout} from './shopPreviewLayout.js';

function ItemArt({sku,photo,large=false}){
  const canvas=useRef(null);
  const zoom=large?2:1;
  const width=72*zoom,height=64*zoom;
  const [center,baseline,scale]=previewLayout[sku];
  const x=center*zoom,y=baseline*zoom,size=scale*zoom;
  const aperture=photo && framePhotoBounds(sku,x,y,size);
  useEffect(()=>{
    const tile=canvas.current,ctx=tile.getContext('2d');
    if(!ctx)return;
    ctx.clearRect(0,0,tile.width,tile.height);
    drawShopPreview(ctx,{sku,x,y,size});
  },[sku,x,y,size]);
  return <span className={'shop-specimen'+(large?' large':'')+(aperture?' framed-photo':'')} aria-hidden="true">
    <span className="shop-preview-stage">
      <canvas ref={canvas} className="shop-art" width={width} height={height}/>
      {aperture && <FramePhoto photo={photo} deferOriginal={!large} style={{
        left:100*aperture.left/width+'%',top:100*aperture.top/height+'%',
        width:100*aperture.width/width+'%',height:100*aperture.height/height+'%',
      }}/>}
    </span>
  </span>;
}
export function CoinBalance({plant}){
  const life=lifeOf(plant);
  return <div className="wallet"><img src="/art/iseed-coin.png" width="20" height="20" alt="" style={{imageRendering:"pixelated"}}/><strong>{life.balance} Garden Coins</strong>
    <small>Today +{life.day===localDay(Date.now())?10+life.waters*2+life.wins.length*3:0}</small></div>;
}
export function ShopItemDetail({item,move,store,savePhoto,busy,children}){
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
    <ItemArt large sku={item.sku} photo={item.photo}/>
    <div className="menu-items">
      <button disabled={busy||loading} onClick={move}>{item.slot===null?'Place in room':'Move to another spot'}</button>
    </div>
    {children}
    {(product.kind==='frame' || item.slot!==null) && <div className="menu-items">
      {product.kind==='frame' && <><button disabled={busy||loading} onClick={openPhotoPicker}>{loading?'Preparing photo…':item.photo?'Change photo':'Choose a photo'}</button>
        <input hidden type="file" accept="image/*" aria-label="Frame photo" ref={input} onChange={choosePhoto}/>
        {item.photo && <button disabled={busy||loading} onClick={()=>applyPhoto(null,framePhotoIdentity(item.photo))}>Remove photo</button>}</>}
      {item.slot!==null && <button disabled={busy||loading} onClick={store}>Put in inventory</button>}
    </div>}{error && <p role="status">{error}</p>}
  </div>;
}
export default function GardenShop({plant,onPlace,inspect,initialTab='shop',onTabChange}){
  const startTab=initialTab==='bag'?'bag':'shop';
  const [tab,setTab]=useState(startTab);
  useEffect(()=>{setTab(startTab);},[startTab]);
  function openTab(id){setTab(id);onTabChange?.(id);}
  const g=lifeOf(plant);
  return <div className="garden-page">
    <CoinBalance plant={plant}/>
    <div className="garden-tabs">
      <button aria-pressed={tab==='shop'} onClick={()=>openTab('shop')}>Shop</button>
      <button disabled={plant.tutorial?.step==='pot'} aria-pressed={tab==='bag'} onClick={()=>openTab('bag')}>My items</button>
    </div>
    {tab==='shop'?<div className="shop-list">{Object.entries(catalog).map(([sku,p])=><button key={sku}
      aria-label={p.name+' · '+itemPrice(plant,sku)+' coins'} disabled={g.balance<itemPrice(plant,sku) || Boolean(plant.tutorial && (plant.tutorial.step!=='pot' || sku!=='terra'))}
      onClick={()=>onPlace({sku,id:crypto.randomUUID(),buy:true})}>
      <ItemArt sku={sku}/><span>{p.name}<small>{isToySpecies(sku)?'Buy grown or grow free on Plantigotchi':({pot:'Individual pot',frame:'Personal photo',plant:'Grown garden plant',decor:'Room decoration'})[p.kind]}</small></span>
      <b><img src="/art/iseed-coin.png" width="13" height="13" alt="" style={{imageRendering:"pixelated"}}/>{itemPrice(plant,sku)}</b></button>)}</div>:
      <div className="shop-list">{g.items.map(item=><button key={item.id} onClick={()=>inspect(item)}><ItemArt sku={item.sku} photo={item.photo}/>
        <span>{catalog[item.sku].name}<small>{item.slot===null?'In inventory':'In the room'}</small></span><ChevronRight size={16}/></button>)}
        {!g.items.length && <p><ShoppingBag size={16}/> Your pots and decorations will appear here.</p>}
        {plant.graduates.some(p=>p.source==='shop') && <p>Purchased plants live in their garden spots.</p>}</div>}
    <p className="garden-footnote">Visits earn 10 coins. Healthy watering earns 2 up to three times a day. Game wins earn 3 up to five times a day.</p>
  </div>;
}
