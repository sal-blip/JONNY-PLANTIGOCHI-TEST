import React,{memo,useEffect,useRef,useState} from 'react';
import PlantPixel from './PlantPixel.jsx';
import {ACTIONS,DAY,HOUR,WEEK,careStatus,condition,earnedAt,growthHolds,growthOrder,
  healthLabels,moodOf,nextMilestone,stageLabel,timeLeft,toyVarietyName} from './game.js';
import {drawShopPreview} from './roomShopArt.js';
import {previewLayout} from './shopPreviewLayout.js';
import './PlantigotchiApp.css';

const sections=['My plant','Collection','Toy guide'];
const careNames={water:'Water',sun:'Sunlight',talk:'Kind words',food:'Food'};

function GrowthTimeline({label, elapsed, duration, weekly=false}) {
  const growth = Math.min(duration, Math.max(0, elapsed));
  const percent = 100 * growth / duration;
  const seedStage = duration <= HOUR;
  const interval = weekly ? DAY : seedStage ? HOUR / 4 : 4 * HOUR;
  const unit = seedStage ? HOUR / 60 : HOUR;
  const units = seedStage ? 'min' : 'h';
  const wholeDays = Math.floor(growth / DAY);
  const hours = Math.floor(growth / HOUR);
  const elapsedText = weekly
    ? [wholeDays && wholeDays + 'd', hours % 24 && hours % 24 + 'h'].filter(Boolean).join(' ') || Math.floor(growth / 60000) + ' min'
    : Math.floor(growth / unit) + ' ' + units;
  const totalText = weekly ? '7 days' : duration / unit + ' ' + units;
  const readout = elapsedText + ' of ' + totalText;
  const segments = [];
  for (let start = 0; start < duration; start += interval) {
    const span = Math.min(interval, duration - start);
    const fill = Math.min(100, Math.max(0, 100 * (growth - start) / span));
    segments.push(<span className="toy-time-cell" key={start} style={{flexGrow:span / interval}}>
      <span className="toy-time-track"><span style={{width:fill+'%'}}/></span>
      {weekly && <small>{start / DAY + 1}</small>}
    </span>);
  }
  return <div className="toy-timeline">
    <strong>{label}</strong>
    <div className="toy-time-readout"><span>{readout}</span><small>{percent>0 && percent<1?'<1':Math.floor(percent)}%</small></div>
    <div className="toy-time-scale" role="progressbar" aria-label={label} aria-valuemin={0}
      aria-valuemax={100} aria-valuenow={percent} aria-valuetext={readout + ' of earned growth'}>{segments}</div>
    {!weekly && <small>{seedStage?'15 minutes':'4 hours'} per segment</small>}
  </div>;
}

function Dashboard({plant,now}){
  if(plant.seedOffers)return <section className="toy-guide-state"><h2>Your next seed is waiting</h2><p>Return to the keychain to choose one of your two seed packets.</p></section>;
  const dead=plant.deadAt!=null,seed=plant.stage==='seed';
  const next=nextMilestone(plant),earned=earnedAt(plant,now),soil=condition(plant,now),mood=moodOf(plant,now);
  const holds=dead || seed || !next?[]:growthHolds(plant,now);
  const care=Object.fromEntries(ACTIONS.map(key=>[key,careStatus(plant,key,now)]));
  const severity=plant.fungusAt==null?0:Math.min(3,1+Math.floor(Math.max(0,now-plant.fungusAt)/(4*HOUR)));
  return <section className="toy-dashboard">
    <div className="toy-specimen">
      <div className="toy-readout"><PlantPixel species={plant.species} stage={plant.stage} condition={soil} mood={mood}
        outbreak={severity} hungry={care.food.due} lowLight={care.sun.due} seedSteps={plant.tutorial?.blocks}/></div>
      <div><small>{toyVarietyName(plant.species)} · Gen {plant.generation}</small><h2>{plant.name}</h2><p>{dead?'Pressed leaf':stageLabel(plant)}</p></div>
    </div>
    {dead?<p>Find this plant in the Leaf Book. Return to the keychain to start again.</p>:<>
      <GrowthTimeline label="Growth to full maturity" elapsed={earned} duration={WEEK} weekly/>
      {next && <GrowthTimeline label={'Stage progress · '+next.label} elapsed={earned-next.start} duration={next.age-next.start}/>}
      {next?<p><strong>Next · {next.label}</strong><br/>{holds.length?'Growth paused. Check '+holds.join(', ')+'.':
        seed && plant.wateredAt===null?'Give your seed its first drink on the keychain.':
        next.age>earned?timeLeft(next.age-earned)+' of growth to go.':'Ready for the next stage.'}</p>:
        <p>{plant.fungusAt!=null?'Treat the gnats before moving your plant.':'Fully grown! Choose a garden spot from the keychain or iSEED Inventory.'}</p>}
      <h3>Care today</h3>
      <dl className="toy-care-list">{ACTIONS.map(key=><div key={key}><dt>{careNames[key]}</dt><dd>{care[key].hint}</dd></div>)}
        {plant.rotAt!=null && <div><dt>Drain</dt><dd>{healthLabels.rootRot}</dd></div>}
        {severity>0 && <div><dt>Fungus gnats</dt><dd>Treat in First Aid</dd></div>}</dl>
    </>}
  </section>;
}

const RaisedPortrait=memo(function RaisedPortrait({species}){
  const ref=useRef(null);
  useEffect(()=>{
    const canvas=ref.current,ctx=canvas.getContext('2d');
    if(!ctx)return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const [x,y,size]=previewLayout[species];
    drawShopPreview(ctx,{sku:species,x,y,size});
  },[species]);
  return <canvas aria-hidden="true" ref={ref} width="72" height="64"/>;
});

const SpecimenTile=memo(function SpecimenTile({species,unlocked}){
  return <li>
    <div className={'toy-tile '+(unlocked?'revealed':'mystery')}>
      {unlocked?<RaisedPortrait species={species}/>:
        <img className="seed-mask" src={'/art/seed-silhouettes/'+species+'.png'} width="64" height="64" alt=""/>}
    </div>
    <span>{toyVarietyName(species)}</span>
    <span className="seed-status">{unlocked?'Raised':'Undiscovered'}</span>
  </li>;
});

function Collection({plant}){
  const list=useRef(null);
  useEffect(()=>{
    if(!window.IntersectionObserver)return;
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)entry.target.classList.toggle('in-view',entry.isIntersecting);
    });
    for(const tile of list.current.querySelectorAll('.toy-tile'))observer.observe(tile);
    return ()=>observer.disconnect();
  },[]);
  const grown=new Set();
  function record(p){grown.add(p.species ?? 'monstera');}
  for(const p of plant.graduates)if(p.source!=='shop')record(p);
  for(const p of plant.waitingPlants ?? [])record(p);
  for(const p of plant.book)if(p.stage==='grown')record(p);
  if(plant.stage==='grown')record(plant);
  const count=growthOrder.filter(s=>grown.has(s)).length;
  return <section className="toy-collection"><h2>Seed collection</h2>
    <p><strong>{count} of {growthOrder.length} raised</strong> · Raise a seed to full growth to reveal its portrait.</p>
    <ul ref={list}>{growthOrder.map(species=><SpecimenTile key={species} species={species} unlocked={grown.has(species)}/>)}</ul>
  </section>;
}

function Guide(){
  return <section className="toy-handbook"><h2>Toy guide</h2>
    <details open><summary>Using the keychain</summary><p>Press Heart to open the menu or choose an action. Use the arrows to browse and Back to return to your plant. On a keyboard, use the arrows, Enter and Escape.</p>
    <p>Swipe up from the toy to visit your garden. In the garden, tap the phone for iSEED, or swipe to return to the toy.</p></details>
    <details><summary>Water, light, food and company</summary><p>Water your seed once. After sprouting, it needs a drink every four hours. The water meter lets you top up 30 minutes early. Extra pours can soak the soil. Use Drain if root rot appears. At 12 hours without water a plant becomes critically thirsty, and at 24 hours it dies. You can turn on reminders under App &amp; data → Plant alerts.</p>
    <p>Give sunlight daily and food every two days. Both become available eight hours early. Kind words and games improve mood. The badges above the meters tell you which needs are ready.</p></details>
    <details><summary>Growth and First Aid</summary><p>A watered seed normally sprouts after one hour. With steady care it becomes young at three days, changes again at five, and matures at seven days of earned growth. Critical thirst, overdue food or light, root rot and fungus gnats pause growth.</p>
    <p>Once an outbreak appears, use G-NAT ASSASSIN in First Aid within 12 hours. Drain root rot within 12 hours, too. In Growth, a 50-coin Growth Spurt can advance up to a quarter of the current stage once care needs are met. Use Rename plant in the same menu to change its name.</p></details>
    <details><summary>Play and earn coins</summary><p>Dew Catch opens at sprouting and Leaf Echo at the young stage. Press Back to pause or hold Back to exit. Daily visits earn 10 coins. Timely watering earns 2 up to three times a day, and game wins earn 3 up to five times a day.</p></details>
    <details><summary>Bring a grown plant home</summary><p>Choose a garden spot on the keychain or open Inventory in iSEED. Place your grown plant, then return to the keychain to choose and name a free seed. Each different species you raise fills another square in your collection.</p><p>Before moving a healthy mature plant, you can take a cutting. The garden’s Cutting Jar roots it in 12 hours. If a plant dies, the Leaf Book keeps its pressed leaf.</p></details>
  </section>;
}

export default function PlantigotchiApp({plant,now}){
  const [section,setSection]=useState(sections[0]);
  return <div className="toy-companion">
    <nav aria-label="Plantigotchi sections">{sections.map(name=><button key={name} type="button" aria-pressed={section===name} onClick={()=>setSection(name)}>{name}</button>)}</nav>
    {section==='My plant'?<Dashboard plant={plant} now={now}/>:section==='Collection'?<Collection plant={plant}/>:<Guide/>}
  </div>;
}
