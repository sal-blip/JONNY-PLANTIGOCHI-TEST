import React,{useState,useRef,useEffect,useCallback} from 'react';
import {ChevronLeft,ChevronRight,Heart} from 'lucide-react';
import DeviceShell from './DeviceShell.jsx';
import PlantPixel from './PlantPixel.jsx';
import {DewArt,EchoArt,MenuGlyph,JarArt,PressedLeaf} from './ActivityArt.jsx';
import {toyCards,toyTitles} from './GardenLife.jsx';
import {gameNames,playText,usePocketPlay} from './pocketPlay.js';
import {condition,healthLabels,care,needsPourConfirmation,replant,takeCutting,wake} from './game.js';
import './PocketDevice.css';

const moods={seed:'Sleeping',sprout:'Curious',young:'Playful',grown:'Flourishing'};
const frame = id => ({id,index:0});

export default function PocketDevice({plant,now,resting,commit,sound}) {
  const [path,setPath]=useState([]);
  const [closeUp,setCloseUp]=useState(false), [feedback,setFeedback]=useState(null);
  const retreat=useRef(null), held=useRef(null), pressed=useRef(null), speech=useRef(null);
  const heart=useRef(null);
  const screen=path.at(-1), section=screen?.id, paused=section==='pause';
  const recordLevel=useCallback(level=>commit(old=>old.id===plant.id && level>old.dewCleared ? {...old,dewCleared:level} : old),[commit,plant.id]);
  const activity=usePocketPlay(plant,!resting || paused,recordLevel);
  const game=activity.game, playing=game && !paused;
  useEffect(()=>{ if(game?.name) heart.current?.focus({preventScroll:true}); },[game?.name]);
  const soil=condition(plant,now);
  const cards=section ? toyCards(section,plant,now) : [];
  const index=Math.min(screen?.index??0,cards.length-1), choice=cards[index];
  const mood=soil==='healthy' ? moods[plant.stage] : healthLabels[soil];
  const title=playing ? (game.name==='dew'?'Dew Catch '+game.level+'/20':gameNames.echo) : section ? toyTitles[section] : 'Monstera';
  const status=playing ? playText(game) : section ? (index+1)+'/'+cards.length+'  ◂ ▸  ♥' : mood+' · ♥ Menu';

  function go(id) {setFeedback(null);setPath(old=>[...old,frame(id)]);}
  function back() {
    if (playing) {go('pause');return;}
    setPath(old=>old.slice(0,-1));setFeedback(null);
  }
  function browse(delta) {
    if (!section) {setPath([{id:'home',index:delta>0?1:0}]);return;}
    setPath(old=>[...old.slice(0,-1),{id:section,index:(index+delta+cards.length)%cards.length}]);
  }
  function give(action, confirmed=false) {
    const time=Date.now(), live=wake(plant,time);
    if (live.deadAt!==null) {commit(p=>wake(p,time));setPath([frame('home'),frame('book')]);return;}
    if (action==='water' && !confirmed && needsPourConfirmation(live,time)) {go('pour');return;}
    commit(p=>care(p,action,time,confirmed));setPath([]);setFeedback(action);
    clearTimeout(speech.current);speech.current=setTimeout(()=>setFeedback(null),3200);
  }
  function choose() {
    if (!section) {go('home');return;}
    if (choice.locked) return;
    const cmd=choice.command;
    if (cmd==='back' || cmd==='resume') {back();return;}
    if (cmd==='idle') {setPath([]);return;}
    if (cmd==='next') {browse(1);return;}
    if (cmd==='leave') {activity.exit();setPath([frame('home'),frame('play')]);return;}
    if (cmd==='pour-extra') {give('water',true);return;}
    const [type,value]=cmd.split(':');
    if (type==='give') {give(value);return;}
    if (type==='game') {activity.enter(value);return;}
    if (type==='cut') {commit(p=>takeCutting(p,value));return;}
    if (type==='new') {commit(p=>replant(p,value));setPath([]);return;}
    go(cmd);
  }
  function press(key) {
    if (!resting) return;
    if (plant.sound) sound(key==='heart' && section==='care' ? 'care' : 'tap');
    if (playing) {activity.key(key);return;}
    if (key==='heart') choose(); else browse(key==='left'?-1:1);
  }
  // Read current actions without registering a new keyboard handler on every falling frame.
  const input=useRef(null);input.current={press,back};
  useEffect(()=>{
    if (!resting) return;
    function keyboard(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key==='Escape') {e.preventDefault();input.current.back();return;}
      const key={ArrowLeft:'left',ArrowRight:'right',Enter:'heart',' ':'heart'}[e.key];
      if (!key || (key==='heart' && e.target.closest?.('button'))) return;
      e.preventDefault(); if (!e.repeat) input.current.press(key);
    }
    window.addEventListener('keydown',keyboard);
    return ()=>window.removeEventListener('keydown',keyboard);
  },[resting]);
  function release() {
    clearTimeout(retreat.current);held.current=null;
    retreat.current=setTimeout(()=>setCloseUp(false),3400);
  }
  useEffect(()=>{
    clearTimeout(retreat.current);held.current=null;pressed.current=null;setCloseUp(false);
    return ()=>clearTimeout(retreat.current);
  },[resting]);
  useEffect(()=>()=>clearTimeout(speech.current),[]);

  const near=resting && (closeUp || Boolean(section) || Boolean(game));
  const description=playing ? title+' · '+status : section ? title+' · '+choice.label+' · '+choice.hint : 'Monstera · '+mood;
  return <div className={'inspect-view'+(near?' close-up':'')}
    onPointerDownCapture={e=>{
      if (!resting || !e.isPrimary || e.button!==0) return;
      const button=e.target.closest('button');if (!button) return;
      clearTimeout(retreat.current);held.current=e.pointerId;pressed.current=button;button.setPointerCapture(e.pointerId);setCloseUp(true);
    }}
    onLostPointerCapture={e=>{if (held.current===e.pointerId) release();}}
    onPointerCancel={()=>{pressed.current=null;release();}}
    onClickCapture={e=>{
      if (!resting) return;
      setCloseUp(true);release();
      const original=pressed.current;pressed.current=null;
      if (e.detail>0 && original?.isConnected && original!==e.target.closest('button')) {
        e.stopPropagation();e.preventDefault();original.focus({preventScroll:true});original.click();
      }
    }}>
    <div className="device">
      <button className="inspect-shell" aria-label="Look closer at Plantigochi"><DeviceShell/></button>
      <div className={'lcd'+(section&&!playing?' lcd-browsing':'')} role="group" aria-label={description}>
        <span className="lcd-top"><span><i/>{title.toUpperCase()}</span><span className="battery"><b/><b/><b/></span></span>
        {playing ? <span className="lcd-art">{game.name==='dew' ?
          <DewArt lane={game.lane} drops={game.drops} result={game.result}/> :
          <EchoArt beat={game.phase==='watch' && game.lit ? game.sequence[game.index] : game.phase==='won' ? 'heart' : null}/>}</span>
          : choice ? <div className={'toy-card'+(choice.text?' toy-reading':'')}>
            {!choice.text && <span className="toy-glyph">{choice.jar!==undefined ? <JarArt progress={choice.jar}/> : choice.leaf ? <PressedLeaf stage={choice.leaf}/> : <MenuGlyph kind={choice.glyph}/>}</span>}
            <div><strong>{choice.label}</strong><small>{choice.hint}</small></div></div>
          : <span className="lcd-art"><PlantPixel stage={plant.stage} condition={soil} reaction={feedback}/></span>}
        {feedback && !section && !playing && soil!=='dead' && <span className="lcd-speech">{plant.message}</span>}
        <span className="lcd-status">{status}</span>
        <button className="lcd-hit" data-audio="toy" aria-label={playing?'Pause game':choice?'Select '+choice.label:'Open plant menu'} disabled={Boolean(!playing && choice?.locked)}
          onClick={()=>playing?go('pause'):press('heart')}/>
        {section && !playing && <button className="lcd-back" aria-label={paused?'Resume game':'Back on toy'} onClick={back}>‹</button>}
      </div>
      <span className="shell-name" aria-hidden="true">PLANTIGOCHI</span>
      <div className="toy-keys">
        <button data-audio="toy" aria-label={playing?'Play left':'Previous toy item'} onClick={()=>press('left')}><ChevronLeft/></button>
        <button ref={heart} data-audio="toy" className="accept" aria-label={playing?'Play heart':choice?'Choose '+choice.label:'Open toy menu'} aria-disabled={Boolean(!playing && choice?.locked)} onClick={()=>press('heart')}><Heart/></button>
        <button data-audio="toy" aria-label={playing?'Play right':'Next toy item'} onClick={()=>press('right')}><ChevronRight/></button>
      </div>
      <span className="sr-only" role="status">{section || playing ? description : feedback ? plant.message : mood}</span>
    </div></div>;
}
