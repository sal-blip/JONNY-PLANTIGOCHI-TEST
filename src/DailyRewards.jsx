import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Check,ChevronLeft,ChevronRight,X} from 'lucide-react';
import {catalog,claimDaily,lastVisit,lifeOf,localDay,rollDailyPrize,settleDailySpin,spinTable,weeklyRewards} from './gardenEconomy.js';
import {canUseGrowthDay,useGrowthDay} from './game.js';
import './dailyRewards.css';

const art='/assets/daily-spin/';
const symbols=['coin','plant','pot','growth'];
function PrizeReels({prize,rolling}){
  const row=spinTable.find(row=>row.id===prize?.id);
  return <div className="daily-machine" aria-hidden="true">
    <img className="daily-cabinet" src={art+'cabinet.png'} alt=""/>
    <div className="daily-windows">{[0,1,2].map(index=>{
      const symbol=row?.symbol || symbols[index];
      return <div className="daily-reel" key={index}>
        <div className={rolling?'reel-strip in-motion':'reel-strip'} style={{'--turn':index}}>
          {rolling && [...symbols,...symbols].map((s,i)=><span key={i}><img src={art+s+'.png'} alt=""/></span>)}
          <span><img src={art+symbol+'.png'} alt=""/>{row?.coins && <b>{row.coins}</b>}</span>
        </div></div>;
    })}</div>
  </div>;
}

export default function DailyRewards({plant,commit,close,plantClock=Date.now}){
  const modal=useRef(null),pending=useRef(false);
  const [busy,setBusy]=useState(''),[error,setError]=useState('');
  const [selection,select]=useState(null),[rolling,setRolling]=useState(false);
  const wallet=lifeOf(plant),visit=lastVisit(wallet);
  const date=visit?.date,day=visit?(visit.streak-1)%7:0;
  const today=localDay(Date.now()),current=date===today && wallet.day===today;
  const claimable=current && visit.claimed===false;
  const focus=selection??day,prize=visit?.spin;
  const selectedDate=new Date((date || today)+'T12:00:00');
  selectedDate.setDate(selectedDate.getDate()+focus-day);
  const collected=i=>Boolean(visit && (i<day || (i===day && visit.claimed!==false)));
  const prizeName=prize?.sku?catalog[prize.sku].name:spinTable.find(row=>row.id===prize?.id)?.label;
  useLayoutEffect(()=>{
    const node=modal.current;
    node.showModal();
    return ()=>node.close();
  },[]);
  useEffect(()=>{
    if(!rolling || !prize)return;
    const timer=setTimeout(()=>setRolling(false),window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:1580);
    return ()=>clearTimeout(timer);
  },[rolling,prize]);
  async function save(action){
    if(pending.current)return;
    pending.current=true;setBusy(action);setError('');
    try{
      let operation;
      if(action==='spin'){
        setRolling(true);
        const [a,b]=crypto.getRandomValues(new Uint32Array(2));
        const drawn=rollDailyPrize(a/2**32,b/2**32);
        operation=p=>settleDailySpin(p,Date.now(),date,drawn);
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
      if(!changed && action==='spin')setRolling(false);
      if(!changed)setError('Your garden changed. Check the latest reward below.');
    }catch{setRolling(false);setError('Your reward could not be saved. Please try again.');}
    finally{pending.current=false;setBusy('');}
  }
  return <dialog ref={modal} className="daily-dialog" aria-labelledby="daily-title"
    onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
    <article className="daily-card">
      <header className="daily-banner"><div className="daily-light" aria-hidden="true"/><div className="daily-spiral" aria-hidden="true"/>
        <div className="daily-headline"><small>Day {day+1} of 7</small><h1 id="daily-title">Daily rewards</h1></div>
        <button type="button" className="daily-close" aria-label="Close daily rewards" onClick={close}><X/></button>
      </header>
      <div className="daily-body">
        <div className="daily-heading"><h2>{visit?.streak || 0}-day streak</h2>
          <output aria-label="Garden coin purse" aria-live="polite"><img src={art+'coin.png'} alt=""/><b key={wallet.balance}>{wallet.balance.toLocaleString()}</b></output></div>
        <ol className="daily-week" aria-label="Seven-day reward calendar">{weeklyRewards.map((amount,i)=><li key={i}><button type="button"
          aria-pressed={focus===i} aria-current={i===day?'date':undefined}
          aria-label={'Day '+(i+1)+', '+amount+' coins, '+(collected(i)?'collected':i===day?'today':'upcoming')}
          onClick={()=>select(i)}>
          <small>Day {i+1}</small><strong>{amount}</strong><span className="daily-stamp">{collected(i)?<Check className={i===day?'today-check':''}/>:<i/>}</span>
        </button></li>)}</ol>
        <div className="daily-browse"><button aria-label="Previous day" disabled={!focus} onClick={()=>select(focus-1)}><ChevronLeft/></button><span aria-live="polite">{selectedDate.toLocaleDateString(undefined,{month:'short',day:'numeric'})} · {weeklyRewards[focus]} coins · {collected(focus)?'Collected':focus===day?'Today':'Upcoming'}</span><button aria-label="Next day" disabled={focus===6} onClick={()=>select(focus+1)}><ChevronRight/></button></div>
        {claimable && <button className="daily-action" disabled={Boolean(busy)} onClick={()=>save('claim')}>Claim {weeklyRewards[day]} coins</button>}
        <section className="daily-slot"><h2>Garden spin</h2><PrizeReels prize={prize} rolling={rolling}/>
          <div className="daily-result" aria-live="polite">{rolling?'Reels spinning…':prize?
            <><strong>You won {prizeName}!</strong>{prize.sku?' Find it in Inventory.':prize.id==='growth'?(wallet.growthDays?' Saved for your plant.':' Redeemed.'):' Added to your purse.'}</>:'One free spin today. Every spin wins.'}</div>
          {!prize && <button className="daily-action spin-action" disabled={!current || Boolean(busy)} onClick={()=>save('spin')}>{busy==='spin'?'Saving spin…':'Spin for free'}</button>}
        </section>
        {wallet.growthDays>0 && <section className="daily-voucher"><strong>Growth days · {wallet.growthDays}</strong>
          <p>Add up to 24 hours of growth to a healthy sprouted plant, up to maturity.</p>
          <button disabled={Boolean(busy) || !canUseGrowthDay(plant,plantClock())} onClick={()=>save('grow')}>Use on {plant.name}</button></section>}
        {error && <p role="alert">{error}</p>}
        <details className="daily-odds"><summary>Prizes &amp; odds</summary><table><caption>One prize per spin</caption><thead><tr><th>Prize</th><th>Chance</th></tr></thead><tbody>
          {spinTable.map(row=><tr key={row.id}><td>{row.label}</td><td>{row.weight}%</td></tr>)}</tbody></table>
          <p>Each available shop plant or pot has an equal chance within its category. Claim on consecutive local dates to build your streak. The calendar repeats after day seven.</p></details>
      </div>
    </article></dialog>;
}
