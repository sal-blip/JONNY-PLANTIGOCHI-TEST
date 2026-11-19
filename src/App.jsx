import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, Clock3, Droplets, Heart, Leaf, LockKeyhole, Waves, Moon, ImagePlus, Music2, MessageCircleHeart, Play, Move, Sun, Utensils, Volume2, VolumeX } from 'lucide-react';
import PhotoBackground from './PhotoBackground.jsx';
import { scenes, selectedScene, photoStyle } from './gardenScenes.js';
import PhonePanel from './PhonePanel.jsx';
import GardenDialog from './GardenDialog.jsx';
import { useGardenTilt } from './useGardenTilt.js';
import { useGardenSound } from './GardenSound.js';
import { usePlantAlerts } from './usePlantAlerts.js';
import { usePhoneApp } from './usePhoneApp.js';
import DeviceShell from './DeviceShell.jsx';
import {DewArt,EchoArt} from './ActivityArt.jsx';
import {PlayMenu,CuttingJar,LeafBook} from './GardenLife.jsx';
import {gameNames,playText,usePocketPlay} from './pocketPlay.js';
import PlantPixel from './PlantPixel.jsx';
import { ACTIONS, DAY, HOUR, KEY, STAGE_NAMES, care, countdown, nextMilestone, restore, wake, condition, healthLabels, needsPourConfirmation, takeCutting, replant, deathDeadline } from './game.js';

const controls = {
  drain: { label: 'Drain pot', Icon: Droplets },
  water: { label: 'Water', Icon: Droplets },
  sun: { label: 'Sunlight', Icon: Sun },
  talk: { label: 'Kind words', Icon: MessageCircleHeart },
  food: { label: 'Plant food', Icon: Utensils },
};
const mood = { seed: 'Sleepy', sprout: 'Curious', young: 'Playful', grown: 'Flourishing' };
const titles = {
  play: 'Play', jar: 'Cutting jar', book: 'Leaf Book', pour: 'Still wet', menu: 'Pocket menu', care: 'Care', journey: 'Growth journey', scenes: 'Backgrounds',
  guide: 'Field guide', settings: 'Settings', phone: 'App & saves', install: 'Install app',
  saves: 'Saved plant', alerts: 'Plant alerts',
};
const homeItems = ['care','play','journey','book','scenes','guide','settings','phone'];
const phoneItems = ['install','saves','alerts'];
const guidePages = [
  ['Meet your Monstera', 'Look closely at the ink screen. The three waves in the top right open the pocket menu. Touch the toy to look closer. The two arrow keys choose a care action. Press the heart to give it.'],
  ['Wake the seed', 'A seed sleeps for its first real hour. Give it water once, and it will sprout when the hour is up. Water it later and it wakes right away.'],
  ['Raise a Monstera', 'A set of care means water, sunlight, kind words, and food. The first set grows a young plant after 3 days. Another set unlocks the final set at 5 days. Finish that set for split leaves after 7 days.'],
  ['Read the soil', 'After sprouting, your Monstera gets thirsty after 4 hours. At 12 hours it slumps. Give it a proper drink before 24 hours pass or it dies. Time counts while the garden is closed.'],
  ['Read the roots', 'Wet soil glistens. Two extra pours in the same four-hour wet period, at least an hour apart, cause root rot. Choose Drain pot within 12 hours to save it.'],
  ['Play together', 'Catch three drops with the arrows or copy your Monstera’s three-beat dance with left, heart, and right. Play is just for fun. The waves let you leave a game.'],
  ['Leave a cutting', 'A grown plant can leave a stem in a jar. It roots in 12 hours. When a plant dies, visit the Leaf Book for its pressed leaf, then plant a seed or pot a rooted cutting.'],
];
const clock = new Intl.DateTimeFormat(undefined, {hour:'numeric',minute:'2-digit'});
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const readSave = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
function writeSave(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch { return false; }
}
function initialPlant() {
  const p = restore(readSave(), Date.now(), !document.hidden);
  writeSave(p);
  return p;
}

function MenuItems({ items, open }) {
  return <div className="menu-items">{items.map(id =>
    <button key={id} onClick={() => open(id)}><span>{titles[id]}</span></button>
  )}</div>;
}

function Device({ plant, reaction, selected, selectedAction, select, act, speaking, resting, choices, soil, activity, showBook }) {
  const [closeUp, setCloseUp] = useState(false);
  const retreat = useRef(null), held = useRef(null), pressedButton = useRef(null);
  const release = () => {
    clearTimeout(retreat.current);
    held.current = null;
    retreat.current = setTimeout(() => setCloseUp(false), 3400);
  };
  useEffect(() => {
    clearTimeout(retreat.current);
    held.current = null; pressedButton.current = null;
    setCloseUp(false);
    return () => clearTimeout(retreat.current);
  }, [resting]);
  const chosen = choices[selected] ?? choices[0];
  const game = activity.game;
  const heart = useRef(null);
  useEffect(() => { if (game?.name) heart.current?.focus({preventScroll:true}); }, [game?.name]);
  useEffect(() => {
    if (!game || !resting) return;
    function press(e) {
      if (e.key === 'Escape') { activity.exit(); return; }
      if ((e.key==='Enter' || e.key===' ') && e.target.closest?.('button')) return;
      const key = {ArrowLeft:'left',ArrowRight:'right',Enter:'heart',' ':'heart'}[e.key];
      if (key) { e.preventDefault(); if (!e.repeat) activity.key(key); }
    }
    window.addEventListener('keydown',press);
    return () => window.removeEventListener('keydown',press);
  },[game,resting,activity]);
  const status = game ? playText(game) : soil === 'dead' ? 'Leaf Book · ♥' : selectedAction ? controls[chosen].label : soil !== 'healthy' ? healthLabels[soil] : plant.stage === 'seed' ? 'Sleeping' : mood[plant.stage];
  return <div className={'inspect-view' + (closeUp && resting ? ' close-up' : '')}
    onPointerDownCapture={event => {
      if (!resting || !event.isPrimary || event.button !== 0) return;
      const target = event.target.closest('button');
      if (!target) return;
      clearTimeout(retreat.current);
      held.current = event.pointerId;
      pressedButton.current = target;
      target.setPointerCapture(event.pointerId);
      setCloseUp(true);
    }}
    onLostPointerCapture={event => { if (held.current === event.pointerId) release(); }}
    onPointerCancel={() => { pressedButton.current = null; release(); }}
    onClickCapture={event => {
      if (!resting) return;
      setCloseUp(true); release();
      const pressed = pressedButton.current;
      pressedButton.current = null;
      // Mobile browsers can retarget the synthesized click after the toy zooms.
      if (event.detail > 0 && pressed && pressed !== event.target.closest('button')) {
        event.preventDefault(); event.stopPropagation(); pressed.focus({preventScroll:true}); pressed.click();
      }
    }}>
    <div className="device">
    <button className="inspect-shell" aria-label="Look closer at Plantigochi"><DeviceShell/></button>
    <div className="lcd" role="img" aria-label={game ? gameNames[game.name]+' · '+status : 'Monstera · '+STAGE_NAMES[plant.stage]+' · '+status}>
      <span className="lcd-top"><span><i/> {game ? gameNames[game.name].toUpperCase() : 'MONSTERA'}</span><span className="battery"><b/><b/><b/></span></span>
      <span className="lcd-art"> {game ? (game.name === 'dew' ? <DewArt lane={game.lane} dropLane={game.dropLane ?? 1} progress={game.progress} result={game.result}/> : <EchoArt beat={game.phase==='watch' && game.lit ? game.sequence[game.index] : game.phase==='won' ? 'heart' : null}/>) : <PlantPixel stage={plant.stage} reaction={reaction} condition={soil}/>}</span>
      {speaking && !game && soil !== 'dead' && <span className="lcd-speech">{plant.message}</span>}
      <span className="lcd-status">{status}</span>
    </div>
    <span className="shell-name" aria-hidden="true">PLANTIGOCHI</span>
    <div className="toy-keys">
      <button disabled={!game && soil==='dead'} aria-label={game ? 'Play left' : 'Previous care action'} onClick={() => game ? activity.key('left') : select(-1)}><ChevronLeft/></button>
      <button ref={heart} data-audio="care" className="accept" aria-label={game ? 'Play heart' : soil==='dead' ? 'Open Leaf Book' : chosen==='drain' ? 'Drain pot' : 'Give ' + controls[chosen].label.toLowerCase()} onClick={() => game ? activity.key('heart') : soil==='dead' ? showBook() : act(chosen)}><Heart/></button>
      <button disabled={!game && soil==='dead'} aria-label={game ? 'Play right' : 'Next care action'} onClick={() => game ? activity.key('right') : select(1)}><ChevronRight/></button>
    </div>
  </div></div>;
}

function Growth({ plant, now }) {
  const next = nextMilestone(plant), age = Math.max(0, (plant.deadAt ?? now) - plant.plantedAt);
  const ageLabel = age >= DAY ? Math.floor(age / DAY) + 'd old' : age >= HOUR ? Math.floor(age / HOUR) + 'h old' : 'First hour';
  const milestones = [['Seed', 'Planting'], ['Sprout', '1 hour'], ['Young plant', '3 days'], ['Final care set', '5 days'], ['Grown plant', '7 days']];
  const step = {seed: 0, sprout: 1, young: 2 + plant.round, grown: 4}[plant.stage];
  let hint = 'Fully grown. Keep giving your Monstera a little love.';
  if (plant.stage === 'seed') hint = plant.wateredAt === null ? 'Give your seed one drink to help it sprout.' : 'Watered. Let your seed rest.';
  else if (next) hint = plant.given.length === ACTIONS.length ? 'Care complete. The next milestone will arrive in its own time.' : plant.given.length + ' of 4 kinds of care given in this set.';
  return <>
    <div className="status-row"><b><Leaf/>{STAGE_NAMES[plant.stage]}</b><span>{ageLabel} · {mood[plant.stage]}</span></div>
    <ol className="growth-list">{milestones.map(([name,time],i) =>
      <li key={name} className={i <= step ? 'achieved' : ''} aria-current={i === step ? 'step' : undefined}><i>{i <= step && <Check/>}</i><span>{name}</span><small>{time}</small></li>
    )}</ol>
    {next && <div className="countdown"><span><Clock3/>{next.label}</span><b>{age < next.age ? countdown(next.age - age) : 'Ready'}</b></div>}
    <p className="hint">{plant.deadAt !== null ? 'A pressed leaf remembers this plant in the Leaf Book.' : hint}</p>
  </>;
}

function FieldGuide() {
  const [index, setIndex] = useState(0);
  return <><div className="guide-entry"><BookOpen/><h2>{guidePages[index][0]}</h2><p>{guidePages[index][1]}</p></div>
    <div className="pager"><button aria-label="Previous guide page" disabled={!index} onClick={() => setIndex(index - 1)}><ChevronLeft/></button>
      <span>Page {index + 1} of {guidePages.length}</span><button aria-label="Next guide page" disabled={index === guidePages.length - 1} onClick={() => setIndex(index + 1)}><ChevronRight/></button></div></>;
}

export default function App() {
  const phone = usePhoneApp();
  const [plant, setPlant] = useState(initialPlant), current = useRef(plant);
  const alerts = usePlantAlerts(plant, phone.offline);
  const [now, setNow] = useState(Date.now);
  const [page, setPage] = useState(null);
  const activity = usePocketPlay(plant);
  const [pourFrom,setPourFrom] = useState(null);
  const soil = condition(plant,now);
  const choices = ['rootRot','soggy'].includes(soil) ? [...ACTIONS,'drain'] : ACTIONS;
  const [intro, setIntro] = useState(() => !reducedMotion());
  const tilt = useGardenTilt(intro || page !== null);
  const [leafReady, setLeafReady] = useState(false);
  const [selected, setSelected] = useState(0), [selectedAction, setSelectedAction] = useState(false);
  const [reaction, setReaction] = useState(null), [speaking, setSpeaking] = useState(false);
  const [saveOK, setSaveOK] = useState(() => readSave() !== null);
  const feedbackTimer = useRef(null), menuButton = useRef(null), restoreFocus = useRef(false);
  const savedLastChange = useRef(saveOK);
  const { play, unlock, running } = useGardenSound({enabled:plant.sound, ambience:plant.ambience !== false, sleeping:plant.stage === 'seed', intro, leafReady});
  const [draftPhoto, setDraftPhoto] = useState(null);
  const scenery = useRef(null);
  const scene = selectedScene(plant);
  const photo = page === 'photo' && draftPhoto ? draftPhoto : scene === 'photo' ? plant.photo : null;
  const time = new Date(now);
  const TimeIcon = time.getHours() >= 6 && time.getHours() < 18 ? Sun : Moon;

  const commit = useCallback((fn, requireStorage = false) => {
    const raw = savedLastChange.current ? readSave() : null;
    const next = fn(raw ? restore(raw,Date.now(),!document.hidden) : current.current);
    const ok = writeSave(next);
    if (!ok && requireStorage) return false;
    savedLastChange.current = ok;
    current.current = next;
    setPlant(next); setSaveOK(ok);
    return ok;
  }, []);

  useEffect(() => {
    function refresh() {
      if (document.hidden) return;
      const t = Date.now(); setNow(t);
      if (wake(current.current,t) !== current.current) commit(latest => wake(latest,t));
    }
    function sync(e) {
      if (e.key !== KEY || !e.newValue) return;
      const next = restore(e.newValue,Date.now(),!document.hidden); current.current = next; savedLastChange.current = true; setSaveOK(true); setPlant(next); setNow(Date.now());
    }
    const timer = setInterval(refresh, 1000);
    window.addEventListener('storage', sync); document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); clearTimeout(feedbackTimer.current); window.removeEventListener('storage',sync); document.removeEventListener('visibilitychange',refresh); };
  }, [commit]);

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
      menuButton.current?.focus({preventScroll:true}); restoreFocus.current = false;
    }
  }, [page, intro]);

  function open(id) {
    activity.exit();
    restoreFocus.current = true;
    setPage(id);
  }
  function select(delta) {
    clearTimeout(feedbackTimer.current); setSpeaking(false); setReaction(null);
    setSelected(i => ((i % choices.length) + delta + choices.length) % choices.length); setSelectedAction(true);
  }
  function act(action, confirmed = false) {
    const t = Date.now(), ready = wake(current.current,t);
    if (ready.deadAt !== null) { commit(old => wake(old,t)); open('book'); return; }
    if (action === 'water' && !confirmed && needsPourConfirmation(ready,t)) {
      setPourFrom(page); open('pour'); return;
    }
    commit(old => care(old,action,t,confirmed));
    setSelected(Math.max(0,choices.indexOf(action))); setSelectedAction(false); setNow(t);
    setSpeaking(true); setReaction(action==='drain' ? null : action);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => { setSpeaking(false); setReaction(null); }, 3200);
    if (ready.sound) void play('care');
  }
  function startActivity(id) {
    restoreFocus.current = false;
    setSpeaking(false); setPage(null); setSelectedAction(false); activity.enter(id);
  }
  function restart(source) {
    commit(old => replant(old,source));
    setSelected(0); setSelectedAction(false); setSpeaking(false); setReaction(null); setNow(Date.now()); setPage(null);
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
  function savePhoto() {
    const saved = commit(old => ({...old, scene:'photo', photo:draftPhoto}), true);
    if (saved) { setDraftPhoto(null); setPage(null); }
    return saved;
  }
  function restoreBackup(backup) {
    clearTimeout(feedbackTimer.current); setSpeaking(false); setReaction(null); setSelectedAction(false); setSelected(0); setNow(Date.now());
    return commit(() => wake(backup,Date.now()));
  }
  const introAudible = plant.sound && running;
  const parent = page === 'jar' ? 'play' : page === 'pour' ? pourFrom : phoneItems.includes(page) ? 'phone' : 'menu';

  return <main ref={tilt.garden} className={'garden scene-' + scene + (page && page !== 'photo' ? ' menus-open' : '') + (intro ? (leafReady ? ' revealing' : ' revealing waiting-leaves') : '')} aria-label="Plantigochi pocket garden" onClickCapture={event => {
    const button = event.target.closest?.('button');
    if (plant.sound && button && !button.disabled && !button.dataset.audio) void play('tap');
  }}>
    <div key={photo ? 'photo' : scene} ref={scenery} className="scenery" style={photo ? undefined : {backgroundImage:'url(/scenes/' + scene + '.webp)'}} aria-hidden="true">
      {photo && <img className="custom-photo" src={photo.src} style={photoStyle(photo)} alt="" draggable="false"/>}
    </div>
    <div className="camera" inert={intro ? '' : undefined} aria-hidden={intro || undefined}>
      <Device plant={plant} reaction={reaction} selected={selected} selectedAction={selectedAction} speaking={speaking}
        select={select} act={act} resting={!intro && !page} activity={activity} soil={soil} choices={choices} showBook={() => open('book')}/>
    </div>
    <div className="garden-edges" aria-hidden="true"/>
    <div hidden={page === 'photo'} className="garden-corners" inert={intro ? '' : undefined} aria-hidden={intro || undefined}>
      <span className="garden-wordmark">Plant Garden</span>
      <button ref={menuButton} className="wave-menu" aria-label="Open pocket menu" title="Pocket menu" aria-haspopup="dialog" onClick={() => open('menu')}><Waves/></button>
      <span className="garden-clock"><TimeIcon aria-hidden="true"/><time dateTime={time.toISOString()}>{clock.format(time)}</time></span>
      <small className="garden-credit">© 2026 Waz Lab</small>
    </div>
    <span className="sr-only" role="status">{activity.game ? playText(activity.game) : !page && speaking ? plant.message : ''}</span>
    {intro && <div className="intro" onKeyDown={e => { if (e.key === 'Escape') finishIntro(); }}>
      <div className="intro-shade" aria-hidden="true"/>
      {['left','right'].map(side => <div key={side} className={'foliage ' + side} aria-hidden="true">
        <i className="blade back"/><i className="blade front"/><i className="blade low"/>
      </div>)}
      <div className="intro-controls"><button data-audio="master" onClick={introSound} aria-pressed={introAudible}>{introAudible ? <Volume2/> : <VolumeX/>}{introAudible ? 'Mute' : 'Play sound'}</button><button onClick={finishIntro}>Skip intro<ChevronRight/></button></div>
    </div>}
    {page === 'photo' && <PhotoBackground photo={draftPhoto} update={setDraftPhoto} layer={scenery} apply={savePhoto}
      cancel={() => { setDraftPhoto(null); open('scenes'); }}/>}
    {page && page !== 'photo' && <GardenDialog page={page} title={titles[page]} back={page === 'menu' ? null : () => open(parent)} close={() => setPage(null)}>
      {page === 'menu' && <MenuItems items={homeItems} open={open}/>}
      {page === 'phone' && <MenuItems items={phoneItems} open={open}/>}
      {page === 'play' && <PlayMenu plant={plant} start={startActivity} open={open}/>}
      {page === 'jar' && <CuttingJar plant={plant} now={now} cut={stem=>commit(old=>takeCutting(old,stem))} pot={()=>restart('cutting')}/>}
      {page === 'book' && <LeafBook plant={plant} now={now} restart={restart} open={open}/>}
      {page === 'pour' && <><p>Still wet. Water anyway?</p><p className="hint">Extra water can cause root rot.</p><div className="menu-items">
        <button onClick={()=>setPage(pourFrom)}>Leave it be</button><button onClick={()=>{setPage(pourFrom);act('water',true);}}>Water anyway</button></div></>}
      {page === 'care' && <>
        <div className="care-plant"><div className="mini-lcd"><PlantPixel stage={plant.stage} reaction={reaction} condition={soil}/></div><div><h2>Monstera</h2><span>{STAGE_NAMES[plant.stage]} · {plant.stage==='seed' ? mood.seed : healthLabels[soil]}</span></div></div>
         {soil==='dead' ? <div className="menu-items"><button onClick={()=>open('book')}>Visit Leaf Book</button></div> :
        <div className="care-grid">{choices.map(key => {
          const {label, Icon} = controls[key], locked = plant.stage === 'seed' && key !== 'water';
          const done = plant.given.includes(key) || (plant.stage === 'seed' && key === 'water' && plant.wateredAt !== null);
          return <button data-audio="care" key={key} disabled={locked} onClick={() => act(key)} aria-label={label + (locked ? ', unlocks after sprouting' : '')}><Icon/>{label}{locked ? <LockKeyhole className="corner"/> : done ? <Check className="corner"/> : null}</button>;
        })}</div>}
        {['dry','critical','rootRot'].includes(soil) && <p className="hint">{soil==='rootRot' ? 'Drain the pot within ' : 'Give water within '}{countdown(deathDeadline(plant)-now)}.</p>}
        <p className="plant-quote" role="status">“{plant.message}”</p>
      </>}
      {page === 'journey' && <Growth plant={plant} now={now}/>}
      {page === 'guide' && <FieldGuide/>}
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
        <button data-audio="intro" onClick={replay}><Play/>Replay intro<ChevronRight className="row-end"/></button></div>}
      {phoneItems.includes(page) && <PhonePanel key={page} page={page} phone={phone} alerts={alerts} plant={plant} saveOK={saveOK} onRestore={restoreBackup}/>}
    </GardenDialog>}
  </main>;
}
