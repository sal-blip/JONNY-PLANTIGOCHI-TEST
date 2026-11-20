import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Waves, Moon, ImagePlus, Music2, Play, Move, Share, Sun, Volume2, VolumeX } from 'lucide-react';
import PhotoBackground from './PhotoBackground.jsx';
import { scenes, selectedScene, photoStyle } from './gardenScenes.js';
import PhonePanel from './PhonePanel.jsx';
import GardenDialog from './GardenDialog.jsx';
import GameLink, { gameLink } from './GameLink.jsx';
import { useGardenTilt } from './useGardenTilt.js';
import { useGardenSound } from './GardenSound.js';
import { usePlantAlerts } from './usePlantAlerts.js';
import { usePhoneApp } from './usePhoneApp.js';
import PocketDevice from './PocketDevice.jsx';
import {wake,graduate,relocateGraduate} from './game.js';
import {useGardenSave,hasVisitedGarden,rememberWelcome} from './useGardenSave.js';
import WelcomeTour from './WelcomeTour.jsx';
import Recovery from './Recovery.jsx';
import Collector from './Collector.jsx';
import './collector.css';

const titles = {menu:'Pocket menu',share:'Share Plantigochi',scenes:'Backgrounds',settings:'Settings',phone:'App & saves',install:'Install app',saves:'Saved plant',alerts:'Plant alerts'};
const homeItems = ['scenes','settings','install','phone'];
const phoneItems = ['install','saves','alerts'];
const clock = new Intl.DateTimeFormat(undefined, {hour:'numeric',minute:'2-digit'});
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function MenuItems({ items, open }) {
  return <div className="menu-items">{items.map(id =>
    <button key={id} onClick={() => open(id)}><span>{titles[id]}</span></button>
  )}</div>;
}

export default function App() {
  const phone=usePhoneApp();
  const [careMessage,setCareMessage]=useState(null);
  const [route,setRoute]=useState(()=>phone.installed || new URL(location.href).searchParams.has('care') ? 'game' : 'checking');
  useEffect(()=>{
    if(route!=='checking')return;
    let active=true;
    hasVisitedGarden().then(visited=>{if(active)setRoute(visited?'game':'welcome');},
      ()=>{if(active)setRoute('game');});
    return ()=>{active=false;};
  },[route]);
  useEffect(()=>{
    function rescue(e){
      if(e.data?.type!=='plant-care' || !['water','drain'].includes(e.data.action))return;
      setCareMessage({action:e.data.action});
      setRoute('game');
    }
    navigator.serviceWorker?.addEventListener('message',rescue);
    return ()=>navigator.serviceWorker?.removeEventListener('message',rescue);
  },[]);
  if(route==='checking')return <main aria-busy="true" aria-label="Loading Plantigochi"/>;
  if(route==='welcome')return <WelcomeTour phone={phone} remember={rememberWelcome} onPlay={()=>setRoute('game')}/>;
  return <SavedGame phone={phone} careMessage={careMessage}/>;
}
function SavedGame({phone,careMessage}){
  const storage=useGardenSave();
  if (!storage.plant) return storage.issue ? <Recovery {...storage}/> : <main aria-busy="true" aria-label="Opening your garden"/>;
  return <GardenApp storage={storage} phone={phone} careMessage={careMessage}/>;
}
function GardenApp({storage,phone,careMessage}) {
  const {plant,current,commit,replace,issue}=storage;
  const saveOK=!issue;
  const [room,setRoom]=useState(null);
  const [leaving,setLeaving]=useState(false);
  const leaveRoom=useCallback(()=>{setLeaving(true);},[]);
  useEffect(()=>{if(!leaving)return;const timer=setTimeout(()=>{setRoom(null);setLeaving(false);requestAnimationFrame(()=>gardenTab.current?.focus());},reducedMotion()?0:550);return ()=>clearTimeout(timer);},[leaving]);
  const [careTarget,setCareTarget]=useState(null);
  const gardenTab=useRef(null), swipe=useRef(null);
  const alerts = usePlantAlerts(plant, phone.offline);
  const [now, setNow] = useState(Date.now);
  const [page, setPage] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [intro, setIntro] = useState(false);
  const tilt = useGardenTilt(intro || page !== null || room!==null);
  const [leafReady, setLeafReady] = useState(false);
  const menuButton = useRef(null), shareButton = useRef(null), restoreFocus = useRef(null);
  const { play, unlock, running } = useGardenSound({enabled:plant.sound, ambience:plant.ambience !== false, sleeping:plant.stage === 'seed', intro, leafReady});
  const [draftPhoto, setDraftPhoto] = useState(null);
  const scenery = useRef(null);
  const scene = selectedScene(plant);
  const photo = page === 'photo' && draftPhoto ? draftPhoto : scene === 'photo' ? plant.photo : null;
  const time = new Date(now);
  const TimeIcon = time.getHours() >= 6 && time.getHours() < 18 ? Sun : Moon;

  useEffect(()=>{
    function refresh() {
      if(document.hidden)return;
      const t=Date.now();setNow(t);
      if(wake(current.current,t)!==current.current) void commit(p=>wake(p,t));
    }
    const timer=setInterval(refresh,1000);
    document.addEventListener('visibilitychange',refresh);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[commit,current]);
  useEffect(()=>{
    function rescue(action) {
      const p=wake(current.current);
      if(p.deadAt!==null || p.stage==='seed')return;
      if(action==='drain'?p.rotAt===null:action==='water'?p.rotAt!==null||Date.now()<p.lastDrink+12*3600000:true)return;
      setIntro(false);setPage(null);setRoom(null);setCareTarget({action,seq:Date.now()});
    }
    const url=new URL(location.href);
    const action=careMessage?.action ?? url.searchParams.get('care');
    if(url.searchParams.has('care')){url.searchParams.delete('care');history.replaceState(null,'',url);}
    if(action)rescue(action);
  },[current,careMessage]);

  useEffect(() => {
    let active = true;
    const image = new Image();
    image.src = '/art/intro-leaf.webp';
    const ready = () => { if (active) setLeafReady(true); };
    if (image.decode) image.decode().then(ready, ready);
    else if (image.complete) ready();
    else { image.onload = ready; image.onerror = ready; }
    return () => { active = false; };
  }, []);
  const finishIntro = useCallback(() => {
    setIntro(false);
  }, []);
  useEffect(() => {
    if (!intro || !leafReady) return;
    const timer = setTimeout(finishIntro, reducedMotion() ? 400 : 6800);
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motionChange = e => { if (e.matches) finishIntro(); };
    media?.addEventListener?.('change', motionChange);
    return () => { clearTimeout(timer); media?.removeEventListener?.('change', motionChange); };
  }, [intro, leafReady, finishIntro]);
  useEffect(() => {
    if (!page && !intro && restoreFocus.current) {
      restoreFocus.current.focus({preventScroll:true}); restoreFocus.current = null;
    }
  }, [page, intro]);

  const installParent = useRef('menu');
  function open(id) {
    if (id === 'install') {
      installParent.current = page === 'phone' ? 'phone' : 'menu';
      if (phone.installState === 'available') void phone.promptInstall();
    }
    restoreFocus.current = id === 'share' ? shareButton.current : menuButton.current;
    setPage(id);
  }
  async function shareGame() {
    if (sharing) return;
    if (typeof navigator.share === 'function') {
      setSharing(true);
      try {
        await navigator.share({title: 'Plantigochi', url: gameLink()});
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      } finally {
        setSharing(false);
      }
    }
    open('share');
  }
  function toggleSound() {
    const enabled = !current.current.sound;
    commit(old => ({...old, sound:enabled}));
    if (enabled) { unlock(); play('care'); }
  }
  function replay() {
    setPage(null); setIntro(true);
    if (current.current.sound) unlock();
  }
  function introSound() {
    if (plant.sound && running) { commit(old => ({...old,sound:false})); return; }
    commit(old => ({...old,sound:true}));
    unlock();
  }
  function changeScene(id) {
    commit(old => ({...old,scene:id}));
    setPage(null);
  }
  function editPhoto() {
    setDraftPhoto(plant.photo ?? null);
    open('photo');
  }
  async function savePhoto() {
    const saved = await commit(old => ({...old, scene:'photo', photo:draftPhoto}), true);
    if (saved) { setDraftPhoto(null); setPage(null); }
    return saved;
  }
  function restoreBackup(backup) {
    setNow(Date.now());
    return replace(backup);
  }
  const introAudible = plant.sound && running;
  const parent = page === 'install' ? installParent.current : phoneItems.includes(page) ? 'phone' : 'menu';

  return <main ref={tilt.garden} className={'garden scene-' + scene + (room!==null && !leaving?' visiting-room':'')+(leaving?' leaving-room':'') + (page && page !== 'photo' ? ' menus-open' : '') + (intro ? (leafReady ? ' revealing' : ' revealing waiting-leaves') : '')} aria-label="Plantigochi pocket garden" onClickCapture={event => {
    const button = event.target.closest?.('button');
    if (plant.sound && button && !button.disabled && !button.dataset.audio) void play('tap');
  }}>
    <div className="pocket-floor" inert={room!==null?'':undefined} aria-hidden={room!==null||undefined}>
    <div key={photo ? 'photo' : scene} ref={scenery} className="scenery" style={photo ? undefined : {backgroundImage:'url(/scenes/' + scene + '.webp)'}} aria-hidden="true">
      {photo && <img className="custom-photo" src={photo.src} style={photoStyle(photo)} alt="" draggable="false"/>}
    </div>
    <div className="camera" inert={intro ? '' : undefined} aria-hidden={intro || undefined}>
      <PocketDevice plant={plant} now={now} careTarget={careTarget} openMove={()=>setRoom({moving:plant.id})} resting={!intro && !page && !sharing && room===null} commit={commit} sound={play}/>
    </div>
    <div className="garden-edges" aria-hidden="true"/>
    <div hidden={page === 'photo'} className="garden-corners" inert={intro ? '' : undefined} aria-hidden={intro || undefined}>
      <span className="garden-wordmark">Plant Garden</span>
      <div className="garden-actions">
        <button ref={shareButton} className="garden-share" aria-label="Share Plantigochi" title="Share Plantigochi" onClick={shareGame}><Share aria-hidden="true"/></button>
        <button ref={menuButton} className="wave-menu" aria-label="Open pocket menu" title="Pocket menu" aria-haspopup="dialog" onClick={() => open('menu')}><Waves aria-hidden="true"/></button>
      </div>
      <span className="garden-clock"><TimeIcon aria-hidden="true"/><time dateTime={time.toISOString()}>{clock.format(time)}</time></span>
      <small className="garden-credit">© 2026 Waz Lab</small>
    </div>
    {!intro && !page && <button className="garden-pull" ref={gardenTab}
      onPointerDown={e=>{swipe.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerCancel={()=>{swipe.current=null;}}
      onPointerUp={e=>{if(swipe.current!==null && swipe.current-e.clientY>30)setRoom({});swipe.current=null;}}
      onClick={()=>setRoom({})}>⌃ Garden</button>}
    </div>
    {room!==null && <Collector plant={plant} moving={room.moving} now={now}
      move={async slot=>{const id=room.moving;const ok=await commit(p=>graduate(p,id,slot,Date.now()));
        return ok && current.current.graduates.some(g=>g.id===id && g.slot===slot);}}
      relocate={async (id,from,to)=>{
        const ok=await commit(p=>relocateGraduate(p,id,from,to));
        return ok && current.current.graduates.some(g=>g.id===id && g.slot===to);
      }}
      startClose={leaveRoom} shareLink={shareGame}/>}
    {!saveOK && !page && <button className="save-warning" onClick={()=>open('saves')}>Save issue · Open backups</button>}
    {intro && <div className="intro" onKeyDown={e => { if (e.key === 'Escape') finishIntro(); }}>
      <div className="intro-shade" aria-hidden="true"/>
      {['left','right'].map(side => <div key={side} className={'foliage ' + side} aria-hidden="true">
        <i className="blade back"/><i className="blade front"/><i className="blade low"/>
      </div>)}
      <div className="intro-controls"><button data-audio="master" onClick={introSound} aria-pressed={introAudible}>{introAudible ? <Volume2/> : <VolumeX/>}{introAudible ? 'Mute' : 'Play sound'}</button><button onClick={finishIntro}>Skip intro<ChevronRight/></button></div>
    </div>}
    {page === 'photo' && <PhotoBackground photo={draftPhoto} update={setDraftPhoto} layer={scenery} apply={savePhoto}
      cancel={() => { setDraftPhoto(null); open('scenes'); }}/>}
    {page === 'welcome' && <WelcomeTour replay phone={phone} onPlay={()=>setPage(null)}/>}
    {page && page !== 'photo' && page !== 'welcome' && <GardenDialog page={page} title={titles[page]} back={page === 'menu' || page === 'share' ? null : () => open(parent)} close={() => setPage(null)}>
      {page === 'share' && <div className="phone-section"><GameLink showAddress/></div>}
      {page === 'menu' && <MenuItems items={phone.installed ? homeItems.filter(id => id !== 'install') : homeItems} open={open}/>}
      {page === 'phone' && <MenuItems items={phoneItems} open={open}/>}
      {page === 'scenes' && <div className="scenes">{Object.entries(scenes).map(([id,name]) =>
        <button key={id} className="scene-choice" aria-pressed={scene === id} onClick={() => changeScene(id)}>
          <span className="swatch" style={{backgroundImage:'url(/scenes/' + id + '.webp)'}}/><span>{name}</span>{id === scene && <Check className="chosen"/>}
        </button>)}<button className="scene-choice choose-photo" aria-pressed={scene === 'photo'} onClick={editPhoto}>
          <span className="swatch photo-swatch">{plant.photo ? <img src={plant.photo.src} alt=""/> : <ImagePlus/>}</span><span>Use My Photo</span>{scene === 'photo' && <Check className="chosen"/>}
        </button></div>}
      {page === 'settings' && <div className="menu-items"><button data-audio="master" aria-pressed={plant.sound} onClick={toggleSound}>{plant.sound ? <Volume2/> : <VolumeX/>}Sound<span className="setting-value">{plant.sound ? 'On' : 'Off'}</span></button>
        <button disabled={!plant.sound} aria-pressed={plant.sound && plant.ambience !== false}
          onClick={() => commit(old => ({...old,ambience:old.ambience === false}))}><Music2/>Garden ambience<span className="setting-value">{plant.sound && plant.ambience !== false ? 'On' : 'Off'}</span></button>
        <button aria-pressed={tilt.active} disabled={tilt.disabled} onClick={tilt.toggle}><Move/>Tilt motion<span className="setting-value">{tilt.label}</span></button>
        {tilt.denied && <p className="hint" role="status">Allow motion access for this site in your browser settings, then retry.</p>}
        <button onClick={()=>open('welcome')}><Play/>Welcome tour<ChevronRight className="row-end"/></button>
        <button data-audio="intro" onClick={replay}><Play/>Replay intro<ChevronRight className="row-end"/></button></div>}
      {phoneItems.includes(page) && <PhonePanel key={page} page={page} phone={phone} alerts={alerts} plant={plant} saveOK={saveOK} recoveryRaw={storage.raw} onRestore={restoreBackup}/>}
    </GardenDialog>}
  </main>;
}
