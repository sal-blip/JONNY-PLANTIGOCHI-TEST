import React, {useState,useRef,useEffect,useCallback} from 'react';
import {ChevronLeft,ChevronRight,CornerUpLeft,Heart} from 'lucide-react';
import DeviceShell from './DeviceShell.jsx';
import PlantPixel from './PlantPixel.jsx';
import {DewArt,EchoArt,JarArt,PressedLeaf} from './ActivityArt.jsx';
import {toyCards,toyTitles} from './GardenLife.jsx';
import {DEW_CHANCES,LEVELS,gameNames,playText,saveDewCheckpoint,usePocketPlay} from './pocketPlay.js';
import {care,careStatus,condition,healthLabels,replant,takeCutting,wake} from './game.js';
import './PocketDevice.css';
import './ToyMenu.css';

const moods={seed:'Sleeping',sprout:'Curious',young:'Playful',grown:'Flourishing'};
const frame=(id,index=0)=>({id,index});
const BACK_HOLD_MS=700;

function Chances({remaining}) {
  return <span className="dew-chances" role="img" aria-label={remaining+' of 3 chances'}>
    {Array.from({length:DEW_CHANCES},(_,i)=><svg key={i} viewBox="0 0 9 11" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M4 1h1v2h1v2h1v1h1v3H7v1H2V9H1V6h1V5h1V3h1z" fill={i<remaining?'currentColor':'none'} stroke="currentColor"/>
    </svg>)}
  </span>;
}

function MenuItem({item}) {
  const detail = item.status && item.status !== item.hint
    ? item.status+' · '+item.hint : item.hint;
  return <div className="lcd-caption">
    <strong className="lcd-choice">{item.label}</strong>
    {detail && <small className="lcd-hint">{detail}</small>}
  </div>;
}

function GameArt({game}) {
  if (game.name==='dew') return <DewArt lane={game.lane} drops={game.drops} result={game.result}/>;
  return <EchoArt beat={game.phase==='watch' && game.lit ? game.sequence[game.index] : game.phase==='won' ? 'heart' : null}/>;
}

export default function PocketDevice({plant,now,resting,commit,sound}) {
  const [path,setPath]=useState([]);
  const [closeUp,setCloseUp]=useState(false), [feedback,setFeedback]=useState(null);
  const retreat=useRef(null), held=useRef(null), pressed=useRef(null), speech=useRef(null), heart=useRef(null);
  const backHold=useRef(null), suppressBackClick=useRef(false);
  const screen=path.at(-1), paused=screen?.id==='pause';
  const recordLevel=useCallback(level=>commit(old=>old.id===plant.id ? saveDewCheckpoint(old,level) : old),[commit,plant.id]);
  const activity=usePocketPlay(plant,!resting || paused,recordLevel);
  const game=activity.game, lost=game?.phase==='lost', playing=game && !paused;
  const section=screen?.id;
  const browsing=Boolean(section && !playing);
  const soil=condition(plant,now), mood=soil==='healthy'?moods[plant.stage]:healthLabels[soil];
  const cards=browsing?toyCards(section,plant,now):[];
  const index=Math.min(screen?.index??0,cards.length-1), choice=cards[index];
  let title='Monstera';
  if (browsing) title=toyTitles[section];
  else if (lost) title='Three misses';
  else if (game) title=game.name==='dew'?'Dew Catch '+game.level+'/'+LEVELS:gameNames.echo;
  const ready=playing && game.phase==='ready';
  const status=game?playText(game):mood+' · ♥ Menu';
  const description=browsing?title+' · '+choice.label+' · '+choice.hint:game?title+' · '+status+' '+(game.name==='dew'?game.chances+' chances':''):'Monstera · '+mood;
  useEffect(()=>{ if(game?.name) heart.current?.focus({preventScroll:true}); },[game?.name]);

  function go(id,initial=0) {
    setFeedback(null);
    setPath(old=>[...old,frame(id,initial)]);
  }
  function leaveGame() {
    activity.exit();
    setPath([]);setFeedback(null);
    clearTimeout(retreat.current);setCloseUp(false);
  }
  function back() {
    if (playing) {go('pause');return;}
    setPath(old=>old.slice(0,-1));setFeedback(null);
  }
  function browse(delta) {
    if (!section) {go('home');return;}
    const next=(index+delta+cards.length)%cards.length;
    setPath(old=>[...old.slice(0,-1),frame(section,next)]);
  }
  function give(action,confirmed=false) {
    const time=Date.now(), live=wake(plant,time);
    const state=careStatus(live,action,time);
    if (state.locked) return false;
    if (state.confirm && !confirmed) {go('pour');return 'tap';}
    commit(p=>care(p,action,time,confirmed));
    if (section==='pour') setPath(old=>old.slice(0,-1));
    setFeedback(action);
    clearTimeout(speech.current);speech.current=setTimeout(()=>setFeedback(null),2500);
    return 'care';
  }
  function choose() {
    if (!section) {go('home');return 'tap';}
    if (choice.locked || !choice.command) return false;
    const cmd=choice.command;
    if (cmd==='back' || cmd==='resume') back();
    else if (cmd==='next') browse(1);
    else if (cmd==='leave') leaveGame();
    else if (cmd==='pour-extra') return give('water',true);
    else {
      const [type,value]=cmd.split(':');
      if (type==='give') return give(value);
      if (type==='game') activity.enter(value);
      else if (type==='cut') commit(p=>takeCutting(p,value));
      else if (type==='new') {commit(p=>replant(p,value));setPath([]);}
      else go(cmd,cmd==='care' && soil==='rootRot'?toyCards('care',plant,now).findIndex(c=>c.command==='give:drain'):0);
    }
    return 'tap';
  }
  function release() {
    clearTimeout(retreat.current);held.current=null;
    retreat.current=setTimeout(()=>setCloseUp(false),3400);
  }
  function press(key) {
    if (!resting) return;
    let voice='tap';
    if (key==='back') back();
    else if (playing) activity.key(key);
    else if (key==='heart') voice=choose();
    else browse(key==='left'?-1:1);
    if (voice && plant.sound) sound(voice);
    setCloseUp(true);release();
  }

  const input=useRef(null);input.current={press,leaveGame};
  function cancelHold() {
    clearTimeout(backHold.current?.timer);
    backHold.current=null;
  }
  function beginHold(source) {
    cancelHold();
    const hold={source,fired:false,timer:0};
    backHold.current=hold;
    hold.timer=setTimeout(()=>{
      hold.fired=true;
      if (typeof source==='number') suppressBackClick.current=true;
      input.current.leaveGame();
    },BACK_HOLD_MS);
  }
  function endPointerHold(e) {
    if (backHold.current?.source===e.pointerId) cancelHold();
  }
  useEffect(()=>{
    if (!resting) return;
    function keyboard(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const isBack=e.key==='Escape' || e.key==='Backspace' ||
        (['Enter',' '].includes(e.key) && e.target.closest?.('.toy-back'));
      if (isBack) {
        e.preventDefault();
        if (!e.repeat && !backHold.current) beginHold(e.key);
        return;
      }
      const key={ArrowLeft:'left',ArrowRight:'right',Enter:'heart',' ':'heart'}[e.key];
      if (!key || (key==='heart' && e.target.closest?.('button'))) return;
      e.preventDefault();if (e.repeat) return;
      if (key==='left' || key==='right') heart.current?.focus({preventScroll:true});
      input.current.press(key);
    }
    function keyUp(e) {
      const hold=backHold.current;
      if (!hold || hold.source!==e.key) return;
      e.preventDefault();cancelHold();
      if (!hold.fired) input.current.press('back');
    }
    function onVisibility() {if (document.hidden) cancelHold();}
    window.addEventListener('keydown',keyboard);
    window.addEventListener('keyup',keyUp);
    window.addEventListener('blur',cancelHold);
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{
      cancelHold();
      window.removeEventListener('keydown',keyboard);
      window.removeEventListener('keyup',keyUp);
      window.removeEventListener('blur',cancelHold);
      document.removeEventListener('visibilitychange',onVisibility);
    };
  },[resting]);
  useEffect(()=>{
    clearTimeout(retreat.current);held.current=null;pressed.current=null;setCloseUp(false);
    return ()=>clearTimeout(retreat.current);
  },[resting]);
  useEffect(()=>()=>clearTimeout(speech.current),[]);

  const near=resting && (closeUp || Boolean(section) || Boolean(game));
  return <div className={'inspect-view'+(near?' close-up':'')}>
    <div className="device">
      <div className="inspect-shell"><DeviceShell/></div>
      <div className={'lcd'+(browsing?' lcd-menu':ready?' lcd-ready':'')} role="group" aria-label={description}>
        <span className="lcd-top"><span><i/>{title.toUpperCase()}</span>
          {game?.name==='dew'?<Chances remaining={game.chances}/>:browsing?<span className="lcd-page">{index+1}/{cards.length}</span>:<span className="battery"><b/><b/><b/></span>}
        </span>
        <span className={game?'lcd-art':'lcd-art lcd-plant'}>
          {game?<GameArt game={game}/>:<PlantPixel stage={plant.stage} condition={soil} reaction={feedback}/>}
          {browsing && choice.jar!==undefined && <span className="lcd-keepsake"><JarArt progress={choice.jar}/></span>}
          {browsing && choice.leaf && <span className="lcd-keepsake"><PressedLeaf stage={choice.leaf}/></span>}
        </span>
        {browsing?<MenuItem item={choice}/>:<span className="lcd-status">{status}{ready && <small className="lcd-hint">Hold Back to exit</small>}</span>}
      </div>
      <span className="shell-name" aria-hidden="true">PLANTIGOCHI</span>
      <div className="toy-keys" role="group" aria-label="Plantigochi buttons"
        onPointerDownCapture={e=>{
          const button=e.target.closest('button');
          if (!button || !resting || !e.isPrimary || e.button!==0) return;
          suppressBackClick.current=false;
          if (button.classList.contains('toy-back')) beginHold(e.pointerId);
          clearTimeout(retreat.current);held.current=e.pointerId;pressed.current=button;
          button.setPointerCapture(e.pointerId);setCloseUp(true);
        }}
        onPointerUp={endPointerHold}
        onLostPointerCapture={e=>{endPointerHold(e);if(held.current===e.pointerId) release();}}
        onPointerCancel={e=>{endPointerHold(e);pressed.current=null;release();}}
        onClickCapture={e=>{
          const original=pressed.current;pressed.current=null;
          if (suppressBackClick.current && original?.classList.contains('toy-back')) {
            suppressBackClick.current=false;e.preventDefault();e.stopPropagation();return;
          }
          if (resting && e.detail>0 && original?.isConnected && original!==e.target.closest('button')) {
            e.stopPropagation();e.preventDefault();original.focus({preventScroll:true});original.click();
          }
        }}>
        <button className="toy-back" data-audio="toy" aria-label="Back on toy" title="Back · Hold to return to plant" aria-description="Hold to return to your plant." onContextMenu={e=>e.preventDefault()} onClick={()=>press('back')}><CornerUpLeft/></button>
        <button data-audio="toy" aria-label={playing?'Play left':'Previous toy item'} title="Previous" onClick={()=>press('left')}><ChevronLeft/></button>
        <button ref={heart} data-audio="toy" className="accept toy-heart" aria-label={playing?'Play heart':choice?'Choose '+choice.label:'Open toy menu'} title="Choose" aria-disabled={Boolean(choice && (choice.locked || !choice.command))} onClick={()=>press('heart')}><Heart/></button>
        <button data-audio="toy" aria-label={playing?'Play right':'Next toy item'} title="Next" onClick={()=>press('right')}><ChevronRight/></button>
      </div>
      <span className="sr-only" role="status">{description}</span>
    </div></div>;
}
