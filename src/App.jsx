import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Waves, Moon, ImagePlus, Music2, Move, Share, Trash2, Sun, Volume2, VolumeX } from 'lucide-react';
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
import {wake,graduate,relocateGraduate,condition} from './game.js';
import {useGardenSave} from './useGardenSave.js';
import WelcomeTour from './WelcomeTour.jsx';
import OnboardingTransition,{transitionOnboarding} from './OnboardingTransition.jsx';
import {SetupWelcome,NameEditor} from './PlantSetup.jsx';
import ResetGarden from './ResetGarden.jsx';
import Recovery from './Recovery.jsx';
import {checkIn,lifeOf,localDay,milestone} from './gardenEconomy.js';
import Collector from './Collector.jsx';
import {useGardenPassage} from './useGardenPassage.js';
import './collector.css';

const titles = {menu:'Pocket menu',share:'Share Plantigochi',scenes:'Backgrounds',settings:'Settings',reset:'Reset garden',phone:'App & saves',install:'Install app',saves:'Saved plant',alerts:'Plant alerts',debug:'Debug menu',test:'Test notifications'};
const homeItems = ['scenes','settings','install','phone'];
const phoneItems = ['install','saves','alerts'];
const updateMessages={
  checking:'Checking for an update…',downloading:'Downloading the update…',current:'You have the latest version.',
  offline:'Connect to the internet to check for updates.',failed:'Could not check for updates. Try again when online.',
};
const clock = new Intl.DateTimeFormat(undefined, {hour:'numeric',minute:'2-digit'});
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function MenuItems({ items, open }) {
  return <div className="menu-items">{items.map(id =>
    <button key={id} onClick={() => open(id)}><span>{titles[id]}</span></button>
  )}</div>;
}

export default function App() {
  const phone=usePhoneApp();
  return phone.standalone ? <InstalledGame phone={phone}/> : <WelcomeTour phone={phone}/>;
}
function InstalledGame({phone}){
  const storage=useGardenSave();
  const [alertVisitId,setAlertVisitId]=useState(()=>crypto.randomUUID());
  useEffect(()=>{
    // Some installed apps reuse a document for a later icon launch. Focus and
    // visibility can also change during a permission dialog, so ignore those.
    if(!window.launchQueue)return;
    let initial=true;
    window.launchQueue.setConsumer(()=>{
      if(initial)initial=false;
      else setAlertVisitId(crypto.randomUUID());
    });
    return ()=>window.launchQueue.setConsumer(()=>{});
  },[]);
  const [careMessage,setCareMessage]=useState(null);
  useEffect(()=>{
    function rescue(e){
      if(e.data?.type==='plant-care' && ['water','drain','fungus','test'].includes(e.data.action))setCareMessage({action:e.data.action,plantId:e.data.plantId,episode:e.data.episode,lastDrink:e.data.lastDrink});
    }
    navigator.serviceWorker?.addEventListener('message',rescue);
    return ()=>navigator.serviceWorker?.removeEventListener('message',rescue);
  },[]);
  if(!storage.phase && storage.issue)return <Recovery {...storage}/>;
  if(!storage.phase)return <main aria-busy="true" aria-label="Opening your garden"/>;
  return <InstalledSession alertVisitId={alertVisitId} key={storage.epoch || 'original'} storage={storage} phone={phone} careMessage={careMessage}/>;
}
function InstalledSession({phone,storage,careMessage,alertVisitId}){
  const alerts=usePlantAlerts(storage.plant,phone.offline,storage.epoch);
  const {invite,alertVisit,phase}=storage;
  const fresh=!invite && phase==='welcome';
  const returning=invite?.round===1 && invite.visit!==alertVisitId;
  const needsVisit=alerts.capable && phase!=='tour' && (
    fresh || returning || (alerts.enrolled && invite?.closed)
  );
  useEffect(()=>{
    if(needsVisit)void alertVisit(alertVisitId,'open',alerts.enrolled);
  },[needsVisit,alertVisit,alerts.enrolled,alertVisitId]);
  const offer=alerts.capable && !alerts.enrolled && invite?.visit===alertVisitId && !invite.closed ? invite.round : null;
  const answer=defer=>alertVisit(alertVisitId,defer?'defer':'finish');
  let scene=phase, screen;
  if(phase==='tour'){
    screen=<WelcomeTour phone={phone} issue={storage.issue} onBegin={()=>storage.setup('welcome')}/>;
  }else if(needsVisit && !storage.issue && !alerts.enrolled){
    scene=null;
    screen=<main aria-busy="true" aria-label="Opening your garden"/>;
  }else if(phase==='welcome' || offer){
    scene=offer?'alert-invite':'welcome';
    screen=<SetupWelcome {...storage} alerts={alerts} offer={offer} answer={answer}/>;
  }else if(phase==='name'){
    screen=<NameEditor initial={storage.draft} onDraft={d=>storage.setup('name',d)}
      onSave={name=>storage.setup('water',name)} onCancel={()=>storage.setup('welcome')} issue={storage.issue}/>;
  }else{
    screen=<GardenApp alerts={alerts} storage={storage} phone={phone} careMessage={careMessage}/>;
  }
  return <OnboardingTransition scene={scene}>{screen}</OnboardingTransition>;
}
function GardenApp({storage,phone,careMessage,alerts}) {
  const {plant,current,commit,replace,issue}=storage;
  const saveOK=!issue;
  const lesson=storage.phase==='water' || storage.phase==='watered' ? storage.phase : null;
  const passage=useGardenPassage();
  const {room,reset:resetPassage}=passage;
  const [careTarget,setCareTarget]=useState(null);
  const [now, setNow] = useState(Date.now);
  const [page, setPage] = useState(null);
  const openDebug=useCallback(()=>setPage('debug'),[]);
  const [sharing, setSharing] = useState(false);
  const [intro, setIntro] = useState(false);
  const tilt = useGardenTilt(intro || page !== null || room!==null);
  const [leafReady, setLeafReady] = useState(false);
  const menuButton = useRef(null), shareButton = useRef(null), restoreFocus = useRef(null);
  const [playingRecordId,setPlayingRecordId]=useState(null);
  useEffect(()=>{
    if(!passage.inside || !plant.sound || !lifeOf(plant).items.some(i=>i.id===playingRecordId && i.sku==='record' && i.slot!==null))setPlayingRecordId(null);
  },[passage.inside,plant.sound,lifeOf(plant).items,playingRecordId]);
  const [coinsMessage,setCoinsMessage]=useState('');
  const day=localDay(now);
  useEffect(()=>{
    if(document.hidden || day<=lifeOf(plant).day)return;
    let credited=false;
    void commit(p=>{const next=checkIn(p,Date.now());credited=next!==p;return next;})
      .then(saved=>{if(saved && credited && !lesson)setCoinsMessage('+10 Garden Coins · Visit the garden shop');});
  },[day,lifeOf(plant).day,lesson,commit]);
  useEffect(()=>{if(coinsMessage){const timer=setTimeout(()=>setCoinsMessage(''),6500);return ()=>clearTimeout(timer);}},[coinsMessage]);
  const { play, unlock, running } = useGardenSound({enabled:plant.sound, ambience:plant.ambience !== false, recordPlaying:Boolean(playingRecordId), sleeping:plant.stage === 'seed', intro, leafReady});
  const [draftPhoto, setDraftPhoto] = useState(null);
  const scenery = useRef(null);
  const scene = selectedScene(plant);
  const photo = page === 'photo' && draftPhoto ? draftPhoto : scene === 'photo' ? plant.photo : null;
  const time = new Date(now);
  const TimeIcon = time.getHours() >= 6 && time.getHours() < 18 ? Sun : Moon;

  useEffect(()=>{
    function refresh() {
      if(document.hidden || !current.current)return;
      const t=Date.now();setNow(t);
      if(wake(current.current,t)!==current.current) void commit(p=>wake(p,t));
    }
    const timer=setInterval(refresh,1000);
    document.addEventListener('visibilitychange',refresh);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[commit,current]);
  useEffect(()=>{
    function rescue(action,plantId,episode,lastDrink) {
      if(action==='test'){resetPassage();setPage('test');return;}
      const time=Date.now(), p=wake(current.current,time);
      if(action==='water'){
        const soil=condition(p,time);
        const sameCycle=(plantId==null || plantId===p.id) && (lastDrink==null || lastDrink===p.lastDrink);
        if(!sameCycle || (soil!=='dry' && soil!=='critical'))action='home';
      }else if(action==='drain'){
        if(p.deadAt!==null || p.rotAt===null)return;
      }else if(action!=='fungus')return;
      setIntro(false);setPage(null);resetPassage();setCareTarget({action,stale:action==='fungus' && (p.id!==plantId || p.fungusAt!==episode || p.deadAt!==null),seq:Date.now()});
    }
    const url=new URL(location.href);
    const action=careMessage?.action ?? url.searchParams.get('care');
    const plantId=careMessage?.plantId ?? url.searchParams.get('plant');
    const episode=careMessage?.episode ?? Number(url.searchParams.get('episode'));
    const lastDrink=careMessage ? careMessage.lastDrink : url.searchParams.has('drink') ? Number(url.searchParams.get('drink')) : null;
    if(url.searchParams.has('care')){for(const k of ['care','plant','episode','drink'])url.searchParams.delete(k);history.replaceState(null,'',url);}
    if(action)rescue(action,plantId,episode,lastDrink);
  },[current,careMessage,resetPassage]);

  useEffect(() => {
    if (!intro || leafReady) return;
    let active = true;
    const image = new Image();
    image.src = '/art/intro-leaf.webp';
    const ready = () => { if (active) setLeafReady(true); };
    if (image.decode) image.decode().then(ready, ready);
    else if (image.complete) ready();
    else { image.onload = ready; image.onerror = ready; }
    return () => { active = false; };
  }, [intro, leafReady]);
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
    restoreFocus.current = id==='rename' ? document.querySelector('.camera .toy-heart') : id === 'share' ? shareButton.current : menuButton.current;
    if(id==='welcome' || id==='rename')transitionOnboarding(()=>setPage(id));
    else setPage(id);
  }
  const closeOnboarding=()=>transitionOnboarding(()=>setPage(null));
  async function shareGame(fallback) {
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
    if(typeof fallback==='function')fallback();else open('share');
  }
  function toggleSound() {
    const enabled = !current.current.sound;
    commit(old => ({...old, sound:enabled}));
    if (enabled) { unlock(); play('care'); }
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
  const parent = page === 'test' ? 'debug' : (page === 'reset' || page === 'debug') ? 'settings' : page === 'install' ? installParent.current : phoneItems.includes(page) ? 'phone' : 'menu';

  return <main ref={tilt.garden} className={'garden scene-' + scene + (page && page !== 'photo' ? ' menus-open' : '') + (intro ? (leafReady ? ' revealing' : ' revealing waiting-leaves') : '')} aria-label="Plantigochi pocket garden" onClickCapture={event => {
    const button = event.target.closest?.('button');
    if (plant.sound && button && !button.disabled && !button.dataset.audio) void play('tap');
  }}>
    <div className="room-track" ref={passage.track} onPointerMove={passage.drag}
      onPointerUp={e=>passage.release(e)} onPointerCancel={e=>passage.release(e,true)} onLostPointerCapture={e=>{if(e.target===e.currentTarget)passage.release(e,true);}}>
    <div className="pocket-floor" inert={room!==null?'':undefined} aria-hidden={room!==null||undefined}
      onPointerDown={!lesson && !intro && !page && !sharing?passage.start:undefined}>
    <div key={photo ? 'photo' : scene} ref={scenery} className="scenery" style={photo ? undefined : {backgroundImage:'url(/scenes/' + scene + '.webp)'}} aria-hidden="true">
      {photo && <img className="custom-photo" src={photo.src} style={photoStyle(photo)} alt="" draggable="false"/>}
    </div>
    <div className="camera" inert={intro ? '' : undefined} aria-hidden={intro || undefined}>
      <PocketDevice lesson={lesson} finishLesson={()=>storage.setup('game')} rename={()=>open('rename')} plant={plant} now={now} careTarget={careTarget} openMove={()=>passage.enter(plant.id)} openBook={()=>passage.enter(null,'book')} resting={!intro && !page && !sharing && room===null} commit={commit} sound={play}/>
    </div>
    <div className="garden-edges" aria-hidden="true"/>
    <div hidden={page === 'photo' || !!lesson} className="garden-corners" inert={intro ? '' : undefined} aria-hidden={intro || undefined}>
      <span className="garden-wordmark">Plant Garden</span>
      <div className="garden-actions">
        <button ref={shareButton} className="garden-share" aria-label="Share Plantigochi" title="Share Plantigochi" onClick={shareGame}><Share aria-hidden="true"/></button>
        <button ref={menuButton} className="wave-menu" aria-label="Open pocket menu" title="Pocket menu" aria-haspopup="dialog" onClick={() => open('menu')}><Waves aria-hidden="true"/></button>
      </div>
      <span className="garden-clock"><TimeIcon aria-hidden="true"/><time dateTime={time.toISOString()}>{clock.format(time)}</time></span>
      <small className="garden-credit">© 2026 Waz Lab</small>
    </div>
    {coinsMessage && !room && !page && <div className="coin-toast" role="status">{coinsMessage}</div>}
    {!lesson && !intro && !page && <button className="garden-pull" ref={passage.handle}
      aria-label="Open garden" onClick={passage.activate}><i aria-hidden="true"/>Garden</button>}
    </div>
    <div className="room-floor" inert={!passage.inside?'':undefined} aria-hidden={!passage.inside||undefined}>
    {room!==null && <Collector playingRecordId={playingRecordId} onSelectRecord={setPlayingRecordId} active={passage.inside} plant={plant} moving={room.moving} initialPanel={room.panel} commit={commit} now={now}
      move={async slot=>{const id=room.moving;const ok=await commit(p=>graduate(p,id,slot,Date.now()));
        return ok && current.current.graduates.some(g=>g.id===id && g.slot===slot);}}
      relocate={async (id,from,to)=>{
        const ok=await commit(p=>relocateGraduate(p,id,from,to));
        return ok && current.current.graduates.some(g=>g.id===id && g.slot===to);
      }}
      startClose={passage.leave} shareLink={shareGame} purr={()=>{if(plant.sound)play('purr');}}/>}
    </div></div>
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
    {page === 'welcome' && <WelcomeTour phone={phone} onClose={closeOnboarding}/>}
    {page === 'rename' && <NameEditor rename original={plant.name} onCancel={closeOnboarding} issue={issue}
      onSave={async name=>{if(await commit(p=>p.name===name?p:milestone({...p,name},'rename-'+now,'Renamed '+p.name+' to '+name+'.',now)))closeOnboarding();}}/>}
    {page && page !== 'photo' && page !== 'welcome' && page !== 'rename' && <GardenDialog page={page} title={titles[page]} onDebug={page==='settings'?openDebug:undefined} back={page === 'menu' || page === 'share' ? null : () => open(parent)} close={() => setPage(null)}>
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
        <button disabled={['checking','downloading'].includes(phone.updateStatus)}
          onClick={phone.updateStatus==='ready'?()=>location.reload():phone.checkForUpdates}>
          {phone.updateStatus==='ready'?'Restart to update':'Check for updates'}</button>
        {updateMessages[phone.updateStatus] && <p className="hint" role="status">{updateMessages[phone.updateStatus]}</p>}
        <button onClick={()=>open('reset')}><Trash2/>Reset all Plantigochi data<ChevronRight className="row-end"/></button></div>}
      {page === 'debug' && <MenuItems items={['test']} open={open}/>}
      {page === 'reset' && <ResetGarden plant={plant} reset={storage.reset} cancel={()=>open('settings')}/>}
      {(phoneItems.includes(page) || page==='test') && <PhonePanel key={page} page={page} phone={phone} alerts={alerts} plant={plant} saveOK={saveOK} recoveryRaw={storage.raw} onRestore={restoreBackup}/>}
    </GardenDialog>}
  </main>;
}
