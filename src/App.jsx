import {createGrowthLab} from './growthLab.js';
import {DebugPurse,LabControls,useLabSession} from './GrowthLab.jsx';
import GuideChat,{FirstHint,GuideSound} from './GuideChat.jsx';
import {appHints,grantSproutCoins} from './firstVisit.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Waves, Moon, ImagePlus, Move, Share, Trash2, Sun, Volume2, VolumeX } from 'lucide-react';
import AudioSettings,{useAudioSettings} from './AudioSettings.jsx';
import PhotoBackground from './PhotoBackground.jsx';
import { scenes, selectedScene, photoStyle } from './gardenScenes.js';
import PhonePanel from './PhonePanel.jsx';
import { version as appVersion } from '../package.json';
import GardenDialog from './GardenDialog.jsx';
import GameLink, { gameLink } from './GameLink.jsx';
import { useGardenTilt } from './useGardenTilt.js';
import { useGardenSound } from './GardenSound.js';
import {GameMusic, useGameplayMusic} from './GameMusic.jsx';
import { usePlantAlerts } from './usePlantAlerts.js';
import { usePhoneApp } from './usePhoneApp.js';
import PocketDevice from './PocketDevice.jsx';
import SeedChoice from './SeedChoice.jsx';
import {chooseSeed,wake,graduate,relocateGraduate,condition,toyVarietyName,plantName} from './game.js';
import {useGardenSave} from './useGardenSave.js';
import WelcomeTour from './WelcomeTour.jsx';
import PublicEntry from './PublicEntry.jsx';
import OnboardingTransition,{transitionOnboarding} from './OnboardingTransition.jsx';
import {SetupWelcome,NameEditor} from './PlantSetup.jsx';
import ResetGarden from './ResetGarden.jsx';
import Recovery from './Recovery.jsx';
import {dailyActions,lastVisit,openDailyVisit,presentDaily,fitsBackupChange,lifeOf,localDay,milestone} from './gardenEconomy.js';
import DailyRewards from './DailyRewards.jsx';
import rewardIcon from './art/iseed-daily-rewards.png';
import {watchDailyVisit} from './dailyVisit.js';
import Collector from './Collector.jsx';
import SwipeCue from './SwipeCue.jsx';
import {useHandsetPassage} from './useHandsetPassage.js';
import ISeedPhone,{ISeedHome} from './ISeedPhone.jsx';
import {useGardenPhoneApps} from './GardenPhoneApps.jsx';
import './collector.css';
import './pocketGarden.css';

const titles = {menu:'Plantigochi menu',share:'Share Plantigochi',scenes:'Backgrounds',settings:'Settings',reset:'Reset garden',uninstall:'How to uninstall',phone:'App & data',about:'About',bug:'Report a bug',install:'Install app',saves:'Saved plant',alerts:'Plant alerts',debug:'Debug menu',lab:'Growth Lab',purse:'1,000 coins in purse',test:'Test notifications',restart:'Start a fresh game'};
const homeItems = ['scenes','settings','install','phone'];
const phonePanels = ['install','saves','alerts'];
const phoneItems = [...phonePanels,'about','bug'];
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
  return <GameMusic>{phone.standalone ? <InstalledGame phone={phone}/> :
    <PublicEntry phone={phone}/>}</GameMusic>;
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
  const consumeCareMessage=useCallback(message=>setCareMessage(current=>current===message?null:current),[]);
  useEffect(()=>{
    function rescue(e){
      if(e.data?.type==='plant-care' && ['water','drain','fungus','test'].includes(e.data.action))
        setCareMessage({action:e.data.action,plantId:e.data.plantId,episode:e.data.episode,lastDrink:e.data.lastDrink,epoch:storage.epoch});
    }
    navigator.serviceWorker?.addEventListener('message',rescue);
    return ()=>navigator.serviceWorker?.removeEventListener('message',rescue);
  },[storage.epoch]);
  if(!storage.phase && storage.issue)return <Recovery {...storage}/>;
  if(!storage.phase)return <main className="garden-loading" aria-busy="true" aria-label="Opening your garden"/>;
  return <InstalledSession alertVisitId={alertVisitId} key={storage.epoch || 'original'} storage={storage} phone={phone}
    careMessage={careMessage} consumeCareMessage={consumeCareMessage}/>;
}
function InstalledSession({phone,storage,careMessage,consumeCareMessage,alertVisitId}){
  const alerts=usePlantAlerts(storage.plant,phone.offline,storage.epoch);
  const {invite,alertVisit,phase}=storage;
  const sproutVisit=useRef(null);
  if(storage.firstDay?.id && storage.firstDay.id===storage.plant?.id && storage.plant.stage==='sprout')sproutVisit.current=alertVisitId;
  const debut=Boolean(storage.plant && storage.plant.sproutDebut===storage.plant.id && storage.plant.stage==='sprout' && storage.plant.deadAt===null && storage.plant.fungusAt==null);
  const fresh=!invite && phase==='watered' && !storage.plant?.tutorial;
  const returning=!debut && !storage.plant?.dewLesson && !storage.plant?.tutorial && invite?.round===1 && invite.visit!==alertVisitId && (phase==='watered' || (phase==='game' && !storage.firstDay && sproutVisit.current!==alertVisitId));
  const needsVisit=alerts.capable && phase!=='tour' && (
    fresh || returning || (alerts.enrolled && invite && !invite.done)
  );
  useEffect(()=>{
    if(needsVisit)void alertVisit(alertVisitId,'open',alerts.enrolled);
  },[needsVisit,alertVisit,alerts.enrolled,alertVisitId]);
  const offer=alerts.capable && !alerts.enrolled && invite?.visit===alertVisitId && !invite.closed ? invite.round : null;
  const answer=defer=>alertVisit(alertVisitId,defer?'defer':'finish');
  const namedHere=useRef(false);
  const [lab,setLab]=useState(null);
  if(lab)return <LabGarden lab={lab} phone={phone} exit={()=>setLab(null)}/>;
  let scene=phase, screen;
  if(phase==='tour'){
    screen=<WelcomeTour phone={phone} issue={storage.issue} onBegin={()=>storage.setup('welcome')}/>;
  }else if(phase!=='watered' && !debut && needsVisit && !storage.issue && !alerts.enrolled){
    scene=null;
    screen=<main className="garden-loading" aria-busy="true" aria-label="Opening your garden"/>;
  }else if(phase==='welcome' || (phase==='game' && offer && !debut && !storage.plant?.dewLesson)){
    scene=phase==='game'?'alert-invite':'welcome';
    screen=<SetupWelcome {...storage} alerts={alerts} offer={phase==='game'?offer:null} answer={answer}/>;
  }else if(phase==='name'){
    screen=<NameEditor initial={storage.draft} onDraft={d=>storage.setup('name',d)}
      onSave={name=>{namedHere.current=true;return storage.setup('first-water',name);}} onCancel={()=>storage.setup('welcome')} issue={storage.issue}/>;
  }
  function finishDrink(signal){
    const answerInvite=offer?{visit:alertVisitId,defer:!alerts.denied}:undefined;
    return storage.setup('garden-guide',undefined,{signal,answerInvite});
  }
  async function dismissWelcome(playDew){
    if(offer && !await answer(!alerts.denied && !alerts.enrolled))return false;
    return storage.setup('game',undefined,{startDewLesson:playDew===true});
  }
  return <GardenApp startLab={()=>setLab(createGrowthLab(storage.current.current))} revealSeed={namedHere.current} finishDrink={finishDrink} dismissWelcome={dismissWelcome} drinkReminder={Boolean(offer)} alerts={alerts} storage={storage} phone={phone} careMessage={careMessage}
    consumeCareMessage={consumeCareMessage} setupScene={screen ? scene : 'pocket'} setupScreen={screen}/>;
}

function LabGarden({lab,phone,exit}){
  const storage=useLabSession(lab);
  return <GardenApp lab={lab} exitLab={exit} storage={storage} phone={phone} alerts={{capable:false}} setupScene="pocket"/>;
}

// The room behind setup is display data. Naming creates the first saved plant.
const emptyRoom={graduates:[],book:[],jar:null,deadAt:null};
function GardenApp({lab,startLab,exitLab,revealSeed,finishDrink,dismissWelcome,drinkReminder,storage,phone,careMessage,consumeCareMessage,alerts,setupScene,setupScreen}) {
  const {plant,current,commit,replace,issue}=storage;
  const {levels,adjust,save:saveVolume}=useAudioSettings(plant,commit);
  const {musicVolume,fxVolume,ambienceVolume}=levels;
  const roomGarden=plant ?? emptyRoom;
  const saveOK=!issue;
  const lesson=storage.phase==='water' || storage.phase==='watered' ? storage.phase : null;
  const roomRef=useRef(null);
  const [app,setApp]=useState('phone');
  const [careTarget,setCareTarget]=useState(null);
  const [wallNow, setNow] = useState(Date.now);
  const plantClock=lab?.clock ?? Date.now;
  const now=lab?lab.clock():wallNow;
  const [page, setPage] = useState(lab?'lab':null);
  const [roomOverlayOpen,setRoomOverlayOpen]=useState(false);
  const openDebug=useCallback(()=>setPage('debug'),[]);
  const [sharing, setSharing] = useState(false);
  const [intro, setIntro] = useState(false);
  const guide=storage.phase==='garden-guide' || storage.phase==='phone-guide';
  const tutorial=plant?.tutorial;
  const toyLesson=tutorial?.step==='boost';
  const initialGuideSurface=toyLesson?'toy':tutorial?.step==='return'?'garden':storage.phase==='phone-guide'?'phone':'garden';
  const savingRoute=useRef(false);
  const [routePending,setRoutePending]=useState(false);
  const [routeError,setRouteError]=useState('');
  const navigationLocked=Boolean(routePending || toyLesson || setupScreen || lesson==='water' || intro || page || sharing);
  const passage=useHandsetPassage({
    blocked:navigationLocked,
    allowRoomReturn:tutorial?.step!=='pot',
    initialSurface:guide?initialGuideSurface:'toy',
    onSwipeRequest:next=>{
      if(next==='garden' && lesson==='watered'){visitGarden();return true;}
      if(next==='toy' && tutorial?.step==='return'){returnToSeed();return true;}
      return false;
    }
  });
  const {surface,transitioning,resetToy,go}=passage;
  // Only a saved checkpoint moves the player into the next lesson. A room
  // preview within the same shop lesson remains under the player's control.
  const requiredLesson=guide && Boolean(tutorial);
  const priorLesson=useRef(requiredLesson);
  useEffect(()=>{
    if(guide)go(initialGuideSurface);
    else if(priorLesson.current && storage.phase==='game')go('toy');
    priorLesson.current=requiredLesson;
  },[guide,requiredLesson,storage.phase,initialGuideSurface,go]);
  async function saveRoute(write){
    if(savingRoute.current)return;
    const controller=new AbortController();
    savingRoute.current=true;setRoutePending(true);setRouteError('');
    let timer;
    const deadline=new Promise(resolve=>{
      timer=setTimeout(()=>{controller.abort();resolve(false);},12000);
    });
    try{
      if(!await Promise.race([write(controller.signal),deadline])){
        go(surface);
        setRouteError(controller.signal.aborted?'Saving took too long. Tap again to retry.':'Couldn’t save this step. Tap again to retry.');
      }
    }finally{clearTimeout(timer);savingRoute.current=false;setRoutePending(false);}
  }
  function visitGarden(){return saveRoute(finishDrink);}
  function returnToSeed(event){
    if(tutorial?.step==='return')return saveRoute(signal=>commit(grantSproutCoins,{signal}));
    if(!tutorial)go('toy',event);
  }
  function raiseGardenPhone(event){
    if(tutorial && tutorial.step!=='pot')return;
    if(storage.phase==='garden-guide')return saveRoute(signal=>storage.setup('phone-guide',undefined,{signal}));
    go('phone',event);
  }
  const roomActive=surface==='garden' && !transitioning;
  const leavingPotReceipt=surface==='garden' && toyLesson;
  const phoneActive=surface==='phone' && !transitioning;
  const phoneVisible=phoneActive && !page;
  const onToy=surface==='toy' && !transitioning;
  const namingSeed=Boolean(onToy && !page && !setupScreen && plant && (plant.seedNamePending===plant.id || plant.seedOffers));
  const toyActive=!namingSeed && onToy && !setupScreen && !intro && !page && !sharing;
  const tilt=useGardenTilt(!toyActive,passage.rootRef);
  const [leafReady, setLeafReady] = useState(false);
  const menuButton = useRef(null), shareButton = useRef(null), restoreFocus = useRef(null);
  const [playingRecordId,setPlayingRecordId]=useState(null);
  const sproutInvitation=Boolean(plant && storage.phase==='game' && plant.stage==='sprout' &&
    plant.deadAt===null && plant.fungusAt==null && (storage.firstDay?.id===plant.id || plant.sproutDebut===plant.id));
  const onFarewellReveal=useGameplayMusic({plant,musicVolume,phase:storage.phase,sproutInvitation,roomActive,recordPlaying:Boolean(playingRecordId)});
  const recordActive=surface!=='toy';
  const apps=useGardenPhoneApps({page:app,open:setApp,plant,now,musicVolume,commit,roomRef,raised:phoneActive,playingRecordId,onSelectRecord:setPlayingRecordId,beginPlacement,homePlant:enterGraduation});
  const gardenLife=lifeOf(roomGarden);
  const [revealMuted,setRevealMuted]=useState(false);
  useEffect(()=>{
    if(!recordActive || !gardenLife.items.some(i=>i.id===playingRecordId && i.sku==='record' && i.slot!==null))setPlayingRecordId(null);
  },[recordActive,gardenLife.items,playingRecordId]);
  const day=localDay(wallNow);
  const visit=lastVisit(gardenLife);
  const pendingRewards=dailyActions(gardenLife,day);
  useEffect(()=>{
    if(!plant || tutorial)return;
    return watchDailyVisit(visit?.date || '',time=>{void commit(p=>openDailyVisit(p,time));});
  },[day,visit?.date,plant?.id,Boolean(tutorial),commit]);
  const { play, unlock, running } = useGardenSound({enabled:Boolean(plant), effectsVolume:intro && revealMuted ? 0 : fxVolume, ambienceVolume, gardenActive:roomActive, instrumental:false, recordPlaying:Boolean(playingRecordId), sleeping:plant?.stage === 'seed', intro, leafReady});
  const [draftPhoto, setDraftPhoto] = useState(null);
  const originalPhoto=useRef(null);
  const scenery = useRef(null);
  const scene = selectedScene(roomGarden);
  const photo=page==='photo' && draftPhoto ? draftPhoto : scene==='photo' ? plant.photo : null;
  const background=photo?'photo':scene;
  // The handset owns input while raised, but the room behind it stays in motion.
  const roomVisible=!onToy || background==='garden';
  const time = new Date(wallNow);
  const TimeIcon = time.getHours() >= 6 && time.getHours() < 18 ? Sun : Moon;

  useEffect(()=>{
    function refresh() {
      if(document.hidden)return;
      const t=Date.now();setNow(t);
      if(!lab && current.current && wake(current.current,t)!==current.current) void commit(p=>wake(p,t));
    }
    const timer=setInterval(refresh,1000);
    document.addEventListener('visibilitychange',refresh);
    return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
  },[commit,current,lab]);
  useEffect(()=>{
    if(lab)return;
    function rescue(action,plantId,episode,lastDrink) {
      if(action==='test'){roomRef.current?.reset();resetToy();setPage('test');return;}
      const time=Date.now(), p=wake(current.current,time);
      if(action==='water'){
        const soil=condition(p,time);
        const sameCycle=(plantId==null || plantId===p.id) && (lastDrink==null || lastDrink===p.lastDrink);
        if(!sameCycle || (soil!=='dry' && soil!=='critical'))action='home';
      }else if(action==='drain'){
        if(p.deadAt!==null || p.rotAt===null)return;
      }else if(action!=='fungus')return;
      setIntro(false);setPage(null);roomRef.current?.reset();resetToy();setCareTarget({action,stale:action==='fungus' && (p.id!==plantId || p.fungusAt!==episode || p.deadAt!==null),seq:Date.now()});
    }
    const url=new URL(location.href);
    const action=careMessage?.action ?? url.searchParams.get('care');
    const plantId=careMessage?.plantId ?? url.searchParams.get('plant');
    const episode=careMessage?.episode ?? Number(url.searchParams.get('episode'));
    const lastDrink=careMessage ? careMessage.lastDrink : url.searchParams.has('drink') ? Number(url.searchParams.get('drink')) : null;
    if(url.searchParams.has('care')){for(const k of ['care','plant','episode','drink'])url.searchParams.delete(k);history.replaceState(null,'',url);}
    if(careMessage)consumeCareMessage(careMessage);
    if(action && current.current && (careMessage?.epoch===undefined || careMessage.epoch===storage.epoch))
      rescue(action,plantId,episode,lastDrink);
  },[current,storage.epoch,careMessage,consumeCareMessage,resetToy,lab]);

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
    if (!page && !intro && !sharing && restoreFocus.current) {
      restoreFocus.current.focus({preventScroll:true}); restoreFocus.current = null;
    }
  }, [page, intro, sharing]);

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
  async function shareGame() {
    if (sharing) return;
    if (typeof navigator.share === 'function') {
      restoreFocus.current = shareButton.current;
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
  function introSound() {
    if (introAudible) setRevealMuted(true);
    else { setRevealMuted(false); unlock(); }
  }
  async function changeScene(id) {
    const saved=await commit(old=>old.scene===id?old:{...old,scene:id});
    if(saved)setPage(currentPage=>currentPage==='scenes'?null:currentPage);
  }
  function editPhoto() {
    originalPhoto.current=plant.photo ?? null;
    setDraftPhoto(originalPhoto.current);
    open('photo');
  }
  async function savePhoto() {
    let failure='';
    const original=originalPhoto.current;
    const saved=await commit(old=>{
      if(old.photo?.src!==original?.src || old.photo?.x!==original?.x || old.photo?.y!==original?.y){
        failure='Your background photo changed in another window. Reopen the editor to use the latest photo.';
        return old;
      }
      const next={...old,scene:'photo',photo:draftPhoto};
      if(fitsBackupChange(old,next))return next;
      failure='This photo would make your garden backup too large. Try a smaller image or remove a framed photo.';
      return old;
    });
    if(!saved)return 'This device could not save your photo. Check storage and try again.';
    if(failure)return failure;
    setDraftPhoto(current=>current===draftPhoto?null:current);
    setPage(active=>active==='photo'?null:active);
    return null;
  }
  function restoreBackup(backup) {
    setNow(Date.now());
    return replace(backup);
  }
  function beginPlacement(request){
    if(!roomRef.current?.beginPlacement(request))return false;
    go('garden');return true;
  }
  function enterGraduation(id=plant.id){
    if(!roomRef.current?.beginGraduation(id))return;
    go('garden');
    if(id===plant.id && plant.homeIntroSeen!==id)
      void commit(p=>p.id===id?{...p,homeIntroSeen:id}:p);
  }
  function nameNewSeed(name){
    const id=plant.id;
    return commit(p=>{
      if(p.id!==id || p.seedNamePending!==id)return p;
      const {seedNamePending,...named}=p;
      return {...named,name:plantName(name)};
    });
  }
  function enterBook(){
    if(roomRef.current?.showBook())go('garden');
  }
  const freePlay=!lesson && !guide && !tutorial && !sproutInvitation && !plant?.dewLesson;
  const showCorners=freePlay && !namingSeed && (surface!=='garden' || !roomOverlayOpen);
  const showGlobalMenu=Boolean(plant) && showCorners && !setupScreen && !intro && !page && !sharing;
  const presentedHere=useRef('');
  const safeToReveal=showGlobalMenu && !plant?.tutorialReminder && !transitioning && !roomOverlayOpen &&
    !routePending && !apps.busy && !careMessage && (surface!=='phone' || app==='phone');
  useEffect(()=>{
    if(!safeToReveal || !pendingRewards || visit?.shown || presentedHere.current===day)return;
    function show(){
      if(document.hidden || presentedHere.current===day || localDay(Date.now())!==day)return;
      presentedHere.current=day;
      setPage('daily');
    }
    show();
    document.addEventListener('visibilitychange',show);
    return ()=>document.removeEventListener('visibilitychange',show);
  },[safeToReveal,pendingRewards,visit?.shown,day]);
  useEffect(()=>{
    if(page==='daily' && pendingRewards && !visit?.shown)void commit(p=>presentDaily(p,Date.now(),day));
  },[page,pendingRewards,day,visit?.shown,commit]);
  const menuTrigger=<button id="plantigochi-menu-trigger" data-global-menu="" ref={menuButton} className="wave-menu handset-global-menu"
    hidden={!showGlobalMenu} aria-label="Open Plantigochi menu" title="Plantigochi menu" aria-haspopup="dialog" onClick={()=>open('menu')}><Waves aria-hidden="true"/></button>;
  const introAudible = fxVolume > 0 && !revealMuted && running;
  const parent = page==='uninstall' ? 'settings' : ['test','restart','lab','purse'].includes(page) ? 'debug' : (page === 'reset' || page === 'debug') ? (lab?'menu':'settings') : page === 'install' ? installParent.current : phoneItems.includes(page) ? 'phone' : 'menu';

  let labBadge;
  if(lab){
    const state=lab.snapshot(),event=lab.stop();
    labBadge=state.running?'180×':event && event.at<=now?event.label:state.notice;
  }
  const pocket=plant && <div className="pocket-floor" data-toy-wallpaper="">
    {background!=='garden' && <div key={background} ref={scenery} className="scenery"
      style={photo?undefined:{backgroundImage:'url(/scenes/'+scene+'.webp)'}} aria-hidden="true">
      {photo && <img className="custom-photo" src={photo.src} style={photoStyle(photo)} alt="" draggable="false"/>}
    </div>}
    <div className="camera" inert={intro ? '' : undefined} aria-hidden={intro || undefined}>
      <PocketDevice plantClock={plantClock} revealSeed={revealSeed} lesson={lesson} finishLesson={visitGarden} routePending={routePending} routeError={routeError} firstDay={storage.firstDay}
        sproutWelcome={toyActive && sproutInvitation} onFarewellReveal={onFarewellReveal}
        dismissSprout={dismissWelcome} tutorialAlerts={lab?null:alerts} reminder={drinkReminder && !alerts.enrolled && !alerts.denied?alerts:null} rename={()=>open('rename')} plant={plant} now={now} careTarget={careTarget} openMove={enterGraduation} openBook={enterBook} resting={toyActive} commit={commit} sound={play}/>
    </div>
    <div className="garden-edges" aria-hidden="true"/>
    {guide && !tutorial && onToy && !page && <GuideChat cue="visit-room" className="room-guide"><p>Swipe up to visit our garden. My iSEED phone is waiting there.</p></GuideChat>}
    {(!guide || !tutorial) && lesson!=='water' && !intro && !page && <SwipeCue data-toy-handle="" aria-label="Open garden"
      hint="Swipe up to enter the garden" onClick={e=>lesson==='watered'?visitGarden():go('garden',e)}/>}
  </div>;
  return <GuideSound.Provider value={play}><main ref={passage.rootRef} data-tutorial={tutorial?.step} data-surface={surface} data-transitioning={transitioning?'':undefined}
    data-toy-background={background} data-toy-photo-preview={page==='photo'?'':undefined}
    className={'garden scene-' + scene + (page && page !== 'photo' ? ' menus-open' : '') + (intro ? (leafReady ? ' revealing' : ' revealing waiting-leaves') : '')}
    aria-label="Plantigochi pocket garden" onClick={event=>{
      const button=event.target.closest?.('button');
      if(button && !event.defaultPrevented && !button.disabled &&
        button.getAttribute('aria-disabled')!=='true' && !button.dataset.audio) {
        play('tap');
      }
    }}>
    <div className="garden-room-layer" {...passage.roomGestureProps} inert={!roomActive?'':undefined} aria-hidden={!roomActive || undefined}>
      <Collector ref={roomRef} playingRecordId={playingRecordId} onSelectRecord={setPlayingRecordId} recordActive={recordActive} musicVolume={musicVolume}
        onOverlayChange={setRoomOverlayOpen} globalMenuOpen={Boolean(page)} active={roomActive} backdropVisible={roomVisible} plant={roomGarden} commit={commit} now={now} wallNow={wallNow} plantClock={plantClock}
        onPlacementDone={()=>{if(current.current?.tutorial?.step==='return')setApp('phone');}}
        raisePhone={raiseGardenPhone} returnToToy={returnToSeed} onPlacementCancel={()=>go('phone')}
        move={async(slot,id)=>{
          let newSeed=false;
          const saved=await commit(p=>{
            const moved=graduate(p,id,slot,plantClock());
            newSeed=moved.id!==p.id;
            return moved;
          });
          const next=current.current;
          return {ok:Boolean(saved && next?.graduates.some(g=>g.id===id && g.slot===slot)),newSeed};
        }}
      relocate={async (id,from,to,repotTarget,sourceKey,targetKey)=>{
        let moved=false,storedCount=0;
        const saved=await commit(p=>{
          const next=relocateGraduate(p,id,from,to,repotTarget,sourceKey,targetKey);
          moved=next!==p;
          if(moved)storedCount=lifeOf(next).items.filter(i=>i.slot===null).length-lifeOf(p).items.filter(i=>i.slot===null).length;
          return next;
        });
        const ok=saved && moved && current.current?.graduates.some(g=>g.id===id && g.slot===to);
        return {ok:Boolean(ok),storedCount:ok?storedCount:0};
      }}
        purr={()=>play('purr')}/>
      {guide && ((roomActive && !toyLesson) || leavingPotReceipt) && !roomOverlayOpen && !page && <GuideChat cue={leavingPotReceipt?'return':tutorial?.step || "garden"} className="room-guide">
        <p>{tutorial?.step==='return' || leavingPotReceipt?'My pot is in place! When I’m fully grown, I can live here.':'Welcome home! Grown plants live here. Tap the phone at the bottom right to open iSEED.'}</p>
        {(tutorial?.step==='return' || leavingPotReceipt) && <div className="chat-actions"><button disabled={routePending || leavingPotReceipt} onClick={returnToSeed}>{routePending || leavingPotReceipt?'Returning…':'Return to my seed'}</button></div>}</GuideChat>}
    </div>
    <div className="standalone-toy-layer" {...passage.toyGestureProps}
      inert={!onToy || page || namingSeed?'':undefined} aria-hidden={!onToy || Boolean(page) || namingSeed || undefined}>
      <OnboardingTransition scene={setupScene} visible={onToy}>{setupScreen ?? pocket}</OnboardingTransition>
    </div>
    <div className="handset-layer" {...passage.phoneGestureProps}
      inert={!phoneVisible?'':undefined} aria-hidden={!phoneVisible || undefined}>
      {plant && <ISeedPhone page={app} title={app==='phone'?'iSEED':apps.title}
        home={()=>setApp('phone')} back={apps.back} lower={e=>go('garden',e)} locked={navigationLocked || apps.busy}
        corner={surface==='phone'?<><button hidden={!showGlobalMenu} className="iseed-reward-key" disabled={apps.busy} aria-haspopup="dialog"
          aria-label={'Daily rewards, '+pendingRewards+' available actions'} onClick={e=>{restoreFocus.current=e.currentTarget;setPage('daily');}}>
          <img src={rewardIcon} alt=""/>{pendingRewards>0 && <b aria-hidden="true">{pendingRewards}</b>}</button>{menuTrigger}</>:null}>
        {app==='phone'?<ISeedHome plant={plant} guide={guide} open={async id=>{
          if(guide && !tutorial && id==='shop' && !await storage.setup('game'))return;
          apps.openApp(id);
        }} busy={apps.busy} active={phoneVisible}/>:<>
          {app==='shop' && tutorial?.step==='pot' && <GuideChat className="app-guide" cue={phoneVisible?app:null}><p>Open the terracotta pot and tap Buy. Then pick a glowing spot to place it.</p></GuideChat>}
          {phoneVisible && Object.hasOwn(appHints,app) && <FirstHint key={app} id={app} plant={plant} commit={commit} className="app-guide">{appHints[app]}</FirstHint>}
          {apps.content}</>}
      </ISeedPhone>}
    </div>
    {plant && <div className="garden-corners" hidden={Boolean(setupScreen || page || intro || sharing || phoneActive)}
      inert={transitioning?'':undefined} aria-hidden={transitioning || undefined}>
      {showCorners && <>
        <span className="garden-wordmark">Plant Garden</span>
        <div className="garden-actions">
          <button type="button" ref={shareButton} className="garden-share" aria-label="Share Plantigochi" title="Share Plantigochi" onClick={shareGame}><Share aria-hidden="true"/></button>
          {surface!=='phone' && menuTrigger}
        </div>
        <span className="garden-clock"><TimeIcon aria-hidden="true"/><time dateTime={time.toISOString()}>{clock.format(time)}</time></span>
      </>}
      <output className="garden-purse" aria-label="Purse" aria-live="polite" aria-atomic="true">
        <img src="/art/iseed-coin.png" alt="" width="18" height="18"/>
        <span key={gardenLife.balance}>{gardenLife.balance.toLocaleString()}</span><span className="purse-unit"> Garden Coins</span>
      </output>

    </div>}
    {lab && !page && <button className="growth-lab-badge" onClick={()=>open('lab')} aria-label="Open Growth Lab">
      Growth Lab · {labBadge}</button>}
    {routeError && guide && <div className="coin-toast" role="status">{routeError}</div>}
    {!saveOK && plant && !page && <button className="save-warning" onClick={()=>open('saves')}>Save issue · Open backups</button>}
    {intro && <div className="intro" onKeyDown={e => { if (e.key === 'Escape') finishIntro(); }}>
      <div className="intro-shade" aria-hidden="true"/>
      {['left','right'].map(side => <div key={side} className={'foliage ' + side} aria-hidden="true">
        <i className="blade back"/><i className="blade front"/><i className="blade low"/>
      </div>)}
      <div className="intro-controls"><button data-audio="reveal" disabled={fxVolume===0} onClick={introSound} aria-pressed={introAudible}>{introAudible ? <Volume2/> : <VolumeX/>}{introAudible ? 'Mute' : 'Play sound'}</button><button onClick={finishIntro}>Skip intro<ChevronRight/></button></div>
    </div>}
    {page === 'photo' && <PhotoBackground photo={draftPhoto} update={setDraftPhoto} layer={scenery} apply={savePhoto}
      cancel={() => { setDraftPhoto(null); open('scenes'); }}/>}
    {page === 'welcome' && <WelcomeTour phone={phone} onClose={closeOnboarding}/>}
    {namingSeed && plant.seedOffers && <SeedChoice key={plant.id} offers={plant.seedOffers} issue={issue}
      onLater={()=>go('garden')} onChoose={species=>commit(p=>chooseSeed(p,plant.id,species,plantClock()))}/>}
    {namingSeed && !plant.seedOffers && <NameEditor modal variety={toyVarietyName(plant.species)} key={plant.id} original={plant.name}
      onSave={nameNewSeed} onCancel={()=>nameNewSeed(plant.name)} issue={issue}/>}
    {page === 'rename' && <NameEditor rename original={plant.name} onCancel={closeOnboarding} issue={issue}
      onSave={async name=>{if(await commit(p=>p.name===name?p:milestone({...p,name},'rename-'+now,'Renamed '+p.name+' to '+name+'.',now)))closeOnboarding();}}/>}
    {page==='daily' && plant && <DailyRewards key={visit?.date} plant={plant} commit={commit} plantClock={plantClock} close={()=>setPage(null)}/>}
    {page && page !== 'daily' && page !== 'photo' && page !== 'welcome' && page !== 'rename' && <GardenDialog page={page} title={titles[page]} onDebug={page==='settings'?openDebug:undefined} back={page === 'menu' || page === 'share' ? null : () => open(parent)} close={() => setPage(null)}>
      {page === 'share' && <div className="phone-section"><GameLink showAddress/></div>}
      {page === 'menu' && <MenuItems items={lab?['lab','purse']:phone.installed ? homeItems.filter(id => id !== 'install') : homeItems} open={open}/>}
      {page === 'phone' && <MenuItems items={phoneItems} open={open}/>}
      {page === 'scenes' && <div className="scenes">{Object.entries(scenes).map(([id,name]) =>
        <button key={id} className="scene-choice" aria-pressed={scene === id} onClick={() => changeScene(id)}>
          <span aria-hidden="true" className={id==='garden'?'swatch garden-swatch':'swatch'} style={id==='garden'?undefined:{backgroundImage:'url(/scenes/'+id+'.webp)'}}/><span>{name}</span>{id === scene && <Check className="chosen"/>}
        </button>)}<button className="scene-choice choose-photo" aria-pressed={scene === 'photo'} onClick={editPhoto}>
          <span className="swatch photo-swatch">{plant.photo ? <img src={plant.photo.src} alt=""/> : <ImagePlus/>}</span><span>Use My Photo</span>{scene === 'photo' && <Check className="chosen"/>}
        </button>{issue && <p role="alert">{issue}</p>}</div>}
      {page === 'settings' && <div className="menu-items">
        <AudioSettings levels={levels} adjust={adjust} save={saveVolume} previewEffect={()=>play('tap')}/>
        <button aria-pressed={tilt.active} disabled={tilt.disabled} onClick={tilt.toggle}><Move/>Tilt motion<span className="setting-value">{tilt.label}</span></button>
        {tilt.denied && <p className="hint" role="status">Allow motion access for this site in your browser settings, then retry.</p>}
        <button disabled={['checking','downloading'].includes(phone.updateStatus)}
          onClick={phone.updateStatus==='ready'?()=>location.reload():phone.checkForUpdates}>
          {phone.updateStatus==='ready'?'Restart to update':'Check for updates'}</button>
        {updateMessages[phone.updateStatus] && <p className="hint" role="status">{updateMessages[phone.updateStatus]}</p>}
        <button onClick={()=>open('uninstall')}>How to uninstall<ChevronRight className="row-end"/></button>
        <button onClick={()=>open('reset')}><Trash2/>Reset all Plantigochi data<ChevronRight className="row-end"/></button></div>}
      {page === 'debug' && <MenuItems items={lab?['lab','purse']:['lab','purse','restart','test']} open={open}/>}
      {page === 'lab' && (lab?<LabControls lab={lab} play={()=>setPage(null)} exit={exitLab}/>:
        <section className="phone-section"><p>Test a temporary copy of {plant.name} and your garden. Closing the app or exiting the lab discards this copy. Your saved garden keeps its usual clock.</p>
        <div className="menu-items"><button onClick={startLab}>Start test copy</button></div></section>)}
      {page === 'purse' && <DebugPurse plant={plant} commit={commit} testing={Boolean(lab)}/>}
      {(page === 'reset' || page === 'restart') && <ResetGarden plant={plant} reset={storage.reset} cancel={()=>open(parent)}/>}
      {page === 'about' && <section className="phone-section" aria-label="About Plantigochi">
        <p><strong>Plantigochi · Pocket Garden</strong></p>
        <p>Version {appVersion}</p>
        <p>Made by Waz Lab. <a href="https://wazlab.com" target="_blank" rel="noopener noreferrer">wazlab.com<span className="sr-only"> (opens in a new tab)</span></a></p>
      </section>}
      {page === 'bug' && <section className="phone-section" aria-label="Bug report">
        <p>Tell us what happened and what you were doing in the game when you noticed it.</p>
        <p><a href={'mailto:info@wazlab.com?subject=' + encodeURIComponent('Plantigochi ' + appVersion + ' bug report')}>info@wazlab.com</a></p>
      </section>}
      {(phonePanels.includes(page) || page==='test' || page==='uninstall') && <PhonePanel key={page} page={page} phone={phone} alerts={alerts} plant={plant} saveOK={saveOK} saveIssue={issue} recoveryRaw={storage.raw} onRestore={restoreBackup}/>}
    </GardenDialog>}
  </main></GuideSound.Provider>;
}
