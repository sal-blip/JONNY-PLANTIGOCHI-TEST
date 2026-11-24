import React,{useState} from 'react';
import {Check,ChevronLeft,ChevronRight} from 'lucide-react';
import {lastVisit,lifeOf,localDay,weeklyRewards} from './gardenEconomy.js';

export default function DailyRewards({plant}){
  const wallet=lifeOf(plant),visit=lastVisit(wallet);
  const day=visit?(visit.streak-1)%weeklyRewards.length:0;
  const [selection,select]=useState(null);
  const focus=selection??day;
  const credited=Boolean(visit && focus<=day);
  const date=new Date((visit?.date??localDay(Date.now()))+'T12:00:00');
  date.setDate(date.getDate()+focus-day);
  const dateLabel=date.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  const status=credited?(focus===day && visit.date===localDay(Date.now())?'Collected today':'Collected'):'Upcoming';
  return <section className="reward-book">
    <div className="reward-heading"><img src="/art/iseed-coin.png" alt=""/><div><small>Daily check-in</small>
      <h2>{visit?visit.streak+'-day streak':'Your first week'}</h2></div></div>
    <ol className="reward-week" aria-label="Seven-day reward calendar">{weeklyRewards.map((amount,i)=>
      <li key={i}><button aria-pressed={focus===i} onClick={()=>select(i)}
        aria-label={'Day '+(i+1)+', '+amount+' coins, '+(visit && i<=day?'collected':'upcoming')}>
        <span>Day {i+1}</span><b>{amount}</b>{visit && i<=day && <Check size={12} aria-hidden="true"/>}
      </button></li>)}</ol>
    <div className="reward-detail">
      <button aria-label="Previous reward" disabled={focus===0} onClick={()=>select(focus-1)}><ChevronLeft/></button>
      <div aria-live="polite"><small>{dateLabel} · {status}</small><strong>{weeklyRewards[focus]} Garden Coins</strong></div>
      <button aria-label="Next reward" disabled={focus===6} onClick={()=>select(focus+1)}><ChevronRight/></button>
    </div>
    <p>Open the game each day to collect automatically. After day seven, the rewards repeat. A missed day starts a new streak.</p>
  </section>;
}
