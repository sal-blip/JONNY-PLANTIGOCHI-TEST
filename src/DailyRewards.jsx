import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Check,ChevronLeft,ChevronRight,Ticket,X} from 'lucide-react';
import {SPIN_TOKEN_COST,buySpinToken,tokenBalance,catalog,claimDaily,lastVisit,lifeOf,localDay,rollDailyPrize,settleDailySpin,spinTable,weeklyRewards} from './gardenEconomy.js';
import {canUseGrowthDay,useGrowthDay} from './game.js';
import './dailyRewards.css';

const art='/assets/daily-spin/';
const symbols=['coin','plant','pot','growth'];
// All reels start together. Each has a longer strip and more time to coast to its prize.
const reels=[
  {stopMs:1550,steps:12},
  {stopMs:2900,steps:18},
  {stopMs:4650,steps:24},
];
const lastStop=reels[2].stopMs;
const landingBeat=420;

function PrizeReels({prize,rolling=false,atRest=false}){
  const row=spinTable.find(row=>row.id===prize?.id);
  return <div className={'daily-machine'+(rolling?' spin-closeup':'')} aria-hidden="true"
    style={{'--zoom-start':reels[0].stopMs+'ms','--zoom-time':(lastStop-reels[0].stopMs)+'ms'}}>
    {atRest && <i className="sprout-rays slot-rest-glow"/>}
    <img className="daily-cabinet" src={art+'cabinet.png'} alt=""/>
    <div className="daily-windows">{reels.map(({steps,stopMs},index)=>{
      const symbol=row?.symbol || symbols[index];
      return <div className="daily-reel" key={index}>
        <div className={rolling?'reel-strip in-motion':'reel-strip'}
          style={{'--reel-time':stopMs+'ms','--landing':(-steps*100)+'%'}}>
          {rolling && Array.from({length:steps},(_,i)=><span key={i}><img src={art+symbols[(i+index)%symbols.length]+'.png'} alt=""/></span>)}
          <span><img src={art+symbol+'.png'} alt=""/>{row?.coins && <b>{row.coins}</b>}</span>
        </div></div>;
    })}</div>
  </div>;
}

export default function DailyRewards({plant,commit,close,plantClock=Date.now}){
  const modal=useRef(null),pending=useRef(false);
  const [busy,setBusy]=useState(''),[error,setError]=useState('');
  const [selection,select]=useState(null),[spinScene,setSpinScene]=useState('');
  const [tokenOffer,setTokenOffer]=useState(null),[winningDraw,setWinningDraw]=useState(null);
  const sceneHeading=useRef(null),slotHeading=useRef(null),returnToSlot=useRef(false);
  const wallet=lifeOf(plant),visit=lastVisit(wallet);
  const date=visit?.date,day=visit?(visit.streak-1)%7:0;
  const today=localDay(Date.now()),current=date===today && wallet.day===today;
  const claimable=current && visit.claimed===false;
  const tokens=tokenBalance(wallet);
  const focus=selection??day,prize=spinScene?winningDraw:visit?.tokenPrize ?? visit?.spin;
  const selectedDate=new Date((date || today)+'T12:00:00');
  selectedDate.setDate(selectedDate.getDate()+focus-day);
  const collected=i=>Boolean(visit && (i<day || (i===day && visit.claimed!==false)));
  const prizeName=prize?.sku?catalog[prize.sku].name:spinTable.find(row=>row.id===prize?.id)?.label;
  useLayoutEffect(()=>{
    const node=modal.current;
    node.showModal();
    return ()=>node.close();
  },[]);
  const spinning=spinScene==='spinning' && Boolean(prize);
  useEffect(()=>{
    if(!spinning)return;
    const motion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const reveal=()=>setSpinScene('prize');
    if(motion?.matches){reveal();return;}
    const timer=setTimeout(reveal,lastStop+landingBeat);
    const onMotion=e=>{if(e.matches)reveal();};
    motion?.addEventListener?.('change',onMotion);
    return ()=>{clearTimeout(timer);motion?.removeEventListener?.('change',onMotion);};
  },[spinning]);
  useLayoutEffect(()=>{
    if(spinScene==='saving' || spinScene==='prize')sceneHeading.current?.focus({preventScroll:true});
    else if(!spinScene && returnToSlot.current){
      slotHeading.current?.focus();
      returnToSlot.current=false;
    }
  },[spinScene]);
  async function save(action){
    if(pending.current)return;
    pending.current=true;setBusy(action);setError('');
    try{
      let operation,drawn;
      if(action==='spin'){
        returnToSlot.current=true;
        setSpinScene('saving');
        const [a,b]=crypto.getRandomValues(new Uint32Array(2));
        drawn=rollDailyPrize(a/2**32,b/2**32);
        const expectedSpent=visit.spin?wallet.tokenBook?.spent:undefined;
        operation=p=>settleDailySpin(p,Date.now(),date,drawn,expectedSpent);
      }else if(action==='buy'){
        operation=p=>buySpinToken(p,tokenOffer);
      }else if(action==='claim'){
        select(null);
        operation=p=>claimDaily(p,Date.now(),date);
      }else operation=p=>useGrowthDay(p,plant.id,wallet.growthDays,plantClock());
      let changed=false;
      const saved=await commit(p=>{
        const next=operation(p);
        changed=next!==p;
        return next;
      });
      if(!saved)throw new Error();
      if(action==='spin'){
        setWinningDraw(changed?drawn:null);
        setSpinScene(changed?'spinning':'');
      }
      if(action==='buy')setTokenOffer(null);
      if(!changed)setError('Your garden changed. Check the latest reward below.');
    }catch{setSpinScene('');setError('Your reward could not be saved. Please try again.');}
    finally{pending.current=false;setBusy('');}
  }
  return <dialog ref={modal} className={'daily-dialog'+(spinScene?' in-spin':'')} aria-labelledby="daily-title"
    onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
    {spinScene?<article className="daily-card spin-theater">
      <button type="button" className="daily-close" aria-label="Close daily rewards" onClick={close}><X/></button>
      {spinScene==='prize' && prize?<div className="spin-win">
        <img className="spin-award" src={art+spinTable.find(row=>row.id===prize.id).symbol+'.png'} alt=""/>
        <p>You won</p>
        <h1 id="daily-title" tabIndex="-1" ref={sceneHeading} aria-label={'You won '+prizeName}>{prizeName}</h1>
        <p>{prize.sku?'Waiting in your Inventory.':prize.id==='growth'?'Use your growth day in Daily rewards.':'Added to your purse.'}</p>
        <button className="daily-action spin-action" onClick={()=>setSpinScene('')}>Back to rewards</button>
      </div>:<>
        <h1 id="daily-title" tabIndex="-1" ref={sceneHeading}>Garden spin</h1>
        <div className={'spin-camera'+(spinning?' lit':'')} style={{'--last-stop':lastStop+'ms'}}>
          <div className="spin-light-rig" aria-hidden="true">
            <i className="sprout-rays"/><i className="spin-corona"/>
            <i className="sprout-star"/><i className="sprout-star"/><i className="sprout-star"/>
          </div>
          <PrizeReels prize={spinning?prize:null} rolling={spinning}/>
        </div>
        <p role="status">{spinning?'Reels spinning…':'Starting your spin…'}</p>
      </>}
    </article>:<article className="daily-card">
      <header className="daily-banner"><div className="daily-light" aria-hidden="true"/>
        <div className="daily-headline"><small>Day {day+1} of 7</small><h1 id="daily-title">Daily rewards</h1></div>
        <button type="button" className="daily-close" aria-label="Close daily rewards" onClick={close}><X/></button>
      </header>
      <div className="daily-body">
        <div className="daily-heading"><h2>{visit?.streak || 0}-day streak</h2>
          <button className="spin-token-balance" aria-expanded={tokenOffer!==null} aria-controls="token-purchase"
            onClick={()=>{setError('');setTokenOffer(tokenOffer===null?(wallet.tokenBook?.bought ?? 0):null);}} disabled={Boolean(busy)}>
            <Ticket size={18} aria-hidden="true"/>{tokens?tokens.toLocaleString()+(tokens===1?' token':' tokens'):'Buy token'}</button></div>
        {tokenOffer!==null && <div className="token-purchase" id="token-purchase">
          <strong>One spin token · {SPIN_TOKEN_COST} Garden Coins</strong>
          <p>{wallet.balance<SPIN_TOKEN_COST?'You need '+(SPIN_TOKEN_COST-wallet.balance)+' more coins.':'Your purse has '+wallet.balance.toLocaleString()+' coins.'}</p>
          <button className="daily-action" disabled={Boolean(busy) || wallet.balance<SPIN_TOKEN_COST} onClick={()=>save('buy')}>Buy for {SPIN_TOKEN_COST} coins</button>
          <button className="token-cancel" disabled={Boolean(busy)} onClick={()=>setTokenOffer(null)}>Cancel</button>
        </div>}
        <ol className="daily-week" aria-label="Seven-day reward calendar">{weeklyRewards.map((amount,i)=><li key={i}><button type="button"
          aria-pressed={focus===i} aria-current={i===day?'date':undefined}
          aria-label={'Day '+(i+1)+', '+amount+' coins, '+(collected(i)?'collected':i===day?'today':'upcoming')}
          onClick={()=>select(i)}>
          <small>Day {i+1}</small><strong>{amount}</strong><span className="daily-stamp">{collected(i)?<Check className={i===day?'today-check':''}/>:<i/>}</span>
        </button></li>)}</ol>
        <div className="daily-browse"><button aria-label="Previous day" disabled={!focus} onClick={()=>select(focus-1)}><ChevronLeft/></button><span aria-live="polite">{selectedDate.toLocaleDateString(undefined,{month:'short',day:'numeric'})} · {weeklyRewards[focus]} coins · {collected(focus)?'Collected':focus===day?'Today':'Upcoming'}</span><button aria-label="Next day" disabled={focus===6} onClick={()=>select(focus+1)}><ChevronRight/></button></div>
        {claimable && <button className="daily-action" disabled={Boolean(busy)} onClick={()=>save('claim')}>Claim {weeklyRewards[day]} coins</button>}
        <section className="daily-slot"><h2 ref={slotHeading} tabIndex="-1">Garden spin</h2><PrizeReels prize={prize} atRest/>
          <div className="daily-result" aria-live="polite">{prize?
            <><strong>You won {prizeName}!</strong>{prize.sku?' Find it in Inventory.':prize.id==='growth'?(wallet.growthDays?' Saved for your plant.':' Redeemed.'):' Added to your purse.'}</>:'One free spin today. Every spin wins.'}</div>
          {(!visit?.spin || tokens>0) && <button className="daily-action spin-action" disabled={!current || Boolean(busy)} onClick={()=>save('spin')}>{busy==='spin'?'Saving spin…':visit?.spin?'Spin for 1 token':'Spin for free'}</button>}
        </section>
        {wallet.growthDays>0 && <section className="daily-voucher"><strong>Growth days · {wallet.growthDays}</strong>
          <p>Add up to 24 hours of growth to a healthy sprouted plant, up to maturity.</p>
          <button disabled={Boolean(busy) || !canUseGrowthDay(plant,plantClock())} onClick={()=>save('grow')}>Use on {plant.name}</button></section>}
        {error && <p role="alert">{error}</p>}
        <details className="daily-odds"><summary>Prizes &amp; odds</summary><table><caption>One prize per spin</caption><thead><tr><th>Prize</th><th>Chance</th></tr></thead><tbody>
          {spinTable.map(row=><tr key={row.id}><td>{row.label}</td><td>{row.weight}%</td></tr>)}</tbody></table>
          <p>Each available shop plant or pot has an equal chance within its category. Claim on consecutive local dates to build your streak. The calendar repeats after day seven.</p></details>
      </div>
    </article>}</dialog>;
}
