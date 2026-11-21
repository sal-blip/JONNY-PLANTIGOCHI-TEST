import React,{useEffect,useRef,useState} from 'react';
import {catalog,lifeOf,localDay} from './gardenEconomy.js';
import {drawShopPreview} from './roomShopArt.js';
import {preparePhoto} from './gardenScenes.js';
import {Coins,ChevronRight,ShoppingBag} from 'lucide-react';

// Optical centers and pot baselines on a 72 × 64 shop tile. The trailing
// pothos and beckoning paw put more of the silhouette on one side.
const previewLayout={
  terra:[33,50,1.85], wave:[33,49,1.85], oak:[36,55,1.75], lacquer:[35,51,1.75],
  neko:[32,57,1.65], record:[36,54,1.55], 'golden-pothos':[32,54,1.15], 'snake-plant':[36,57,1],
};

function ItemArt({sku,photo,large=false}){
  const canvas=useRef(null);
  const zoom=large?2:1;
  useEffect(()=>{
    const tile=canvas.current,ctx=tile.getContext('2d');
    if(!ctx)return;
    let live=true;
    const [x,y,size]=previewLayout[sku];
    function draw(){
      if(!live)return;
      ctx.clearRect(0,0,tile.width,tile.height);
      drawShopPreview(ctx,{sku,x:x*zoom,y:y*zoom,size:size*zoom,photo,onPhotoReady:draw});
    }
    draw();
    return ()=>{live=false;};
  },[sku,photo,zoom]);
  return <span className={large?'shop-specimen large':'shop-specimen'} aria-hidden="true">
    <canvas ref={canvas} className="shop-art" width={72*zoom} height={64*zoom}/>
  </span>;
}
export function CoinBalance({plant}){
  const life=lifeOf(plant);
  return <div className="wallet"><Coins size={20} aria-hidden="true"/><strong>{life.balance} Garden Coins</strong>
    <small>Today +{life.day===localDay(Date.now())?10+life.waters*2+life.wins.length*3:0}</small></div>;
}
export function ShopItemDetail({item,move,store,savePhoto,busy,children}){
  const [error,setError]=useState(''),[loading,setLoading]=useState(false);
  const input=useRef(null),product=catalog[item.sku];
  async function choosePhoto(e){
    const file=e.target.files?.[0];
    e.target.value='';
    if(!file)return;
    setLoading(true);setError('');
    try {
      const photo=await preparePhoto(file,[400,320,240]);
      if(!await savePhoto(photo))setError('Photo could not be saved. Try a smaller photo or free some space.');
    } catch {setError('Choose a photo this phone can open.');}
    finally {setLoading(false);}
  }
  return <div className="garden-page">
    <ItemArt large sku={item.sku} photo={item.photo}/>
    <div className="menu-items">
      <button disabled={busy||loading} onClick={move}>{item.slot===null?'Place in room':'Move to another spot'}</button>
    </div>
    {children}
    {(product.kind==='frame' || item.slot!==null) && <div className="menu-items">
      {product.kind==='frame' && <><button disabled={busy||loading} onClick={()=>input.current.click()}>{loading?'Preparing photo…':item.photo?'Change photo':'Choose a photo'}</button>
        <input hidden type="file" accept="image/*" ref={input} onChange={choosePhoto}/>
        {item.photo && <button disabled={busy||loading} onClick={()=>savePhoto(null)}>Remove photo</button>}</>}
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
      <button aria-pressed={tab==='bag'} onClick={()=>openTab('bag')}>My items</button>
    </div>
    {tab==='shop'?<div className="shop-list">{Object.entries(catalog).map(([sku,p])=><button key={sku}
      aria-label={p.name+' · '+p.price+' coins'} disabled={g.balance<p.price}
      onClick={()=>onPlace({sku,id:crypto.randomUUID(),buy:true})}>
      <ItemArt sku={sku}/><span>{p.name}<small>{({pot:'Individual pot',frame:'Personal photo',plant:'Grown garden plant',decor:'Room decoration'})[p.kind]}</small></span>
      <b><Coins aria-hidden="true" size={13}/>{p.price}</b></button>)}</div>:
      <div className="shop-list">{g.items.map(item=><button key={item.id} onClick={()=>inspect(item)}><ItemArt sku={item.sku} photo={item.photo}/>
        <span>{catalog[item.sku].name}<small>{item.slot===null?'In inventory':'In the room'}</small></span><ChevronRight size={16}/></button>)}
        {!g.items.length && <p><ShoppingBag size={16}/> Your pots and decorations will appear here.</p>}
        {plant.graduates.some(p=>p.source==='shop') && <p>Purchased plants live in their garden spots.</p>}</div>}
    <p className="garden-footnote">Visits earn 10 coins. Healthy watering earns 2 up to three times a day. Game wins earn 3 up to five times a day.</p>
  </div>;
}
