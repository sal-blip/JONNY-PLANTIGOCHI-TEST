import React,{useEffect,useRef,useState} from 'react';
import {catalog,lifeOf} from './gardenEconomy.js';
import {drawShopPreview} from './roomShopArt.js';
import {preparePhoto} from './gardenScenes.js';
import {Coins,ChevronRight,ShoppingBag} from 'lucide-react';

function ItemArt({sku,photo}){
  const canvas=useRef(null);
  useEffect(()=>{
    const ctx=canvas.current.getContext('2d');
    let live=true;
    const kind=catalog[sku].kind;
    const y=kind==='plant'?54:kind==='pot'?44:48;
    const size=kind==='plant'?1:kind==='pot'?1.9:1.45;
    function draw(){
      if(!live)return;
      ctx.clearRect(0,0,64,64);
      drawShopPreview(ctx,{sku,x:32,y,size,photo,onPhotoReady:draw});
    }
    draw();
    return ()=>{live=false;};
  },[sku,photo]);
  return <canvas ref={canvas} className="shop-art" width="64" height="64" aria-hidden="true"/>;
}
export function CoinBalance({plant}){
  const life=lifeOf(plant);
  return <div className="wallet"><Coins size={20} aria-hidden="true"/><strong>{life.balance} Garden Coins</strong>
    <small>Today +{life.day?10+life.waters*2+life.wins.length*3:0}</small></div>;
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
    {item.photo && <img className="framed-preview" src={item.photo.src} alt="Photo in this frame"/>}
    {children}
    <div className="menu-items">
      {product.kind==='frame' && <><button disabled={busy||loading} onClick={()=>input.current.click()}>{loading?'Preparing photo…':item.photo?'Change photo':'Choose a photo'}</button>
        <input hidden type="file" accept="image/*" ref={input} onChange={choosePhoto}/>
        {item.photo && <button disabled={busy||loading} onClick={()=>savePhoto(null)}>Remove photo</button>}</>}
      <button disabled={busy||loading} onClick={move}>{item.slot===null?'Place in room':'Move to another spot'}</button>
      {item.slot!==null && <button disabled={busy||loading} onClick={store}>Put in inventory</button>}
    </div>{error && <p role="status">{error}</p>}
  </div>;
}
export default function GardenShop({plant,onPlace,inspect}){
  const [tab,setTab]=useState('shop');
  const g=lifeOf(plant);
  return <div className="garden-page">
    <CoinBalance plant={plant}/>
    <div className="garden-tabs">
      <button aria-pressed={tab==='shop'} onClick={()=>setTab('shop')}>Shop</button>
      <button aria-pressed={tab==='bag'} onClick={()=>setTab('bag')}>My items</button>
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
