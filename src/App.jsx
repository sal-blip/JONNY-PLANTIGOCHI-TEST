import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BookOpen, Check, ChevronLeft, ChevronRight, Clock3, Download, Droplets, Heart, Image as Picture, Leaf, LockKeyhole, Menu, MessageCircleHeart, Play, Settings2, Smartphone, Sprout, Sun, Utensils, Volume2, VolumeX } from 'lucide-react';
import PhonePanel from './PhonePanel.jsx';
import GardenDialog from './GardenDialog.jsx';
import { useGardenSound } from './GardenSound.js';
import { usePlantAlerts } from './usePlantAlerts.js';
import { usePhoneApp } from './usePhoneApp.js';
import PlantPixel from './PlantPixel.jsx';
import { ACTIONS, DAY, HOUR, KEY, STAGE_NAMES, care, countdown, nextMilestone, restore, wake } from './game.js';

const controls = {
  water: { label: 'Water', Icon: Droplets },
  sun: { label: 'Sunlight', Icon: Sun },
  talk: { label: 'Kind words', Icon: MessageCircleHeart },
  food: { label: 'Plant food', Icon: Utensils },
};
const scenes = {
  pocket: 'Dungaree Pocket', forest: 'Lush Forest', sky: 'Deep Purple Skies',
  sand: 'Zen Sand Box', water: 'Water Ripple',
};
const mood = { seed: 'Sleepy', sprout: 'Curious', young: 'Playful', grown: 'Flourishing' };
const titles = {
  menu: 'Pocket menu', care: 'Care', journey: 'Growth journey', scenes: 'Backgrounds',
  guide: 'Field guide', settings: 'Settings', phone: 'App & saves', install: 'Install app',
  saves: 'Saved plant', alerts: 'Plant alerts',
};
const homeItems = [['care', Heart], ['journey', Sprout], ['scenes', Picture], ['guide', BookOpen], ['settings', Settings2], ['phone', Smartphone]];
const phoneItems = [['install', Smartphone], ['saves', Download], ['alerts', Bell]];
const guidePages = [
  ['Meet your Monstera', 'Look closely at the ink screen. Tap it to open the pocket menu. The two arrow keys on the toy choose a care action. Press the heart to give it.'],
  ['Wake the seed', 'A seed sleeps for its first real hour. Give it water once, and it will sprout when the hour is up. Water it later and it wakes right away.'],
  ['Raise a Monstera', 'A set of care means water, sunlight, kind words, and food. The first set grows a young plant after 3 days. Another set unlocks the final set at 5 days. Finish that set for split leaves after 7 days.'],
  ['Come back anytime', 'Time passes while your pocket garden is closed. Your Monstera remembers each kindness. If you miss a visit, pick up where you left off.'],
];
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const readSave = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
function writeSave(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch { return false; }
}
function initialPlant() {
  const p = restore(readSave());
  writeSave(p);
  return p;
}

function MenuItems({ items, open }) {
  return <div className="menu-items">{items.map(([id, Icon]) =>
    <button key={id} onClick={() => open(id)}><Icon aria-hidden="true"/><span>{titles[id]}</span><ChevronRight className="row-end"/></button>
  )}</div>;
}

function Device({ plant, reaction, selected, selectedAction, select, act, open, menuButton, speaking }) {
  const chosen = ACTIONS[selected];
  const status = selectedAction ? controls[chosen].label : plant.stage === 'seed' ? 'Sleeping' : mood[plant.stage];
  return <div className="device">
    <img className="shell" src="/art/device.svg" alt="" draggable="false"/>
    <button className="lcd" ref={menuButton} onClick={open} aria-label="Open pocket menu" aria-description={STAGE_NAMES[plant.stage] + ' · ' + mood[plant.stage]} aria-haspopup="dialog">
      <span className="lcd-top"><span><i/> MONSTERA</span><span className="battery"><b/><b/><b/></span></span>
      <span className="lcd-art"><PlantPixel stage={plant.stage} reaction={reaction}/></span>
      {speaking && <span className="lcd-speech">{plant.message}</span>}
      <span className="lcd-status"><span>{status}</span><span className="lcd-menu"><Menu/> Menu</span></span>
    </button>
    <span className="shell-name" aria-hidden="true">PLANTIGOCHI</span>
    <div className="toy-keys">
      <button aria-label="Previous care action" onClick={() => select(-1)}><ChevronLeft/></button>
      <button className="accept" aria-label={'Give ' + controls[chosen].label.toLowerCase()} onClick={() => act(chosen)}><Heart/></button>
      <button aria-label="Next care action" onClick={() => select(1)}><ChevronRight/></button>
    </div>
  </div>;
}

function Growth({ plant, now }) {
  const next = nextMilestone(plant), age = Math.max(0, now - plant.plantedAt);
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
    <p className="hint">{hint}</p>
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
  const [intro, setIntro] = useState(() => !reducedMotion());
  const [introAudible, setIntroAudible] = useState(false);
  const [selected, setSelected] = useState(0), [selectedAction, setSelectedAction] = useState(false);
  const [reaction, setReaction] = useState(null), [speaking, setSpeaking] = useState(false);
  const [saveOK, setSaveOK] = useState(() => readSave() !== null);
  const feedbackTimer = useRef(null), menuButton = useRef(null), restoreFocus = useRef(false);
  const savedLastChange = useRef(saveOK);
  const { play, hush } = useGardenSound();
  const scene = typeof plant.scene === 'string' && Object.hasOwn(scenes, plant.scene) ? plant.scene : 'pocket';

  const commit = useCallback(fn => {
    const raw = savedLastChange.current ? readSave() : null;
    const next = fn(raw ? restore(raw) : current.current);
    const ok = writeSave(next);
    savedLastChange.current = ok;
    current.current = next;
    setPlant(next); setSaveOK(ok);
    return ok;
  }, []);

  useEffect(() => {
    function refresh() {
      const t = Date.now(); setNow(t);
      if (wake(current.current,t) !== current.current) commit(latest => wake(latest,t));
    }
    function sync(e) {
      if (e.key !== KEY || !e.newValue) return;
      const next = restore(e.newValue); current.current = next; savedLastChange.current = true; setSaveOK(true); setPlant(next); setNow(Date.now());
    }
    const timer = setInterval(refresh, 1000);
    window.addEventListener('storage', sync); document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); clearTimeout(feedbackTimer.current); window.removeEventListener('storage',sync); document.removeEventListener('visibilitychange',refresh); };
  }, [commit]);

  const finishIntro = useCallback(() => {
    setIntro(false); setIntroAudible(false); hush();
  }, [hush]);
  useEffect(() => {
    if (!intro) return;
    let active = true;
    if (current.current.sound && !restoreFocus.current) void play('intro', false).then(heard => { if (active && heard) setIntroAudible(true); });
    const timer = setTimeout(finishIntro, reducedMotion() ? 400 : 6800);
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motionChange = e => { if (e.matches) finishIntro(); };
    media?.addEventListener?.('change', motionChange);
    return () => { active = false; clearTimeout(timer); media?.removeEventListener?.('change', motionChange); };
  }, [intro, play, finishIntro]);
  useEffect(() => {
    if (!page && !intro && restoreFocus.current) {
      menuButton.current?.focus({preventScroll:true}); restoreFocus.current = false;
    }
  }, [page, intro]);

  function open(id) {
    restoreFocus.current = true;
    if (current.current.sound) void play('tap');
    setPage(id);
  }
  function select(delta) {
    clearTimeout(feedbackTimer.current); setSpeaking(false); setReaction(null);
    setSelected(i => (i + delta + ACTIONS.length) % ACTIONS.length); setSelectedAction(true);
    if (current.current.sound) void play('tap');
  }
  function act(action) {
    const ready = wake(current.current,Date.now());
    const allowed = ready.stage === 'seed' ? action === 'water' && ready.wateredAt === null : !ready.given.includes(action);
    commit(old => care(old,action)); setSelected(ACTIONS.indexOf(action)); setSelectedAction(false); setNow(Date.now());
    setSpeaking(true); setReaction(allowed ? action : null);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => { setSpeaking(false); setReaction(null); }, 3200);
    if (allowed && ready.sound) void play('care');
  }
  function toggleSound() {
    const enabled = !current.current.sound;
    commit(old => ({...old, sound:enabled}));
    if (enabled) void play('care'); else hush();
  }
  function replay() {
    setPage(null); setIntro(true); setIntroAudible(false);
    if (current.current.sound) void play('intro').then(setIntroAudible);
  }
  function introSound() {
    if (introAudible) { hush(); commit(old => ({...old,sound:false})); setIntroAudible(false); return; }
    commit(old => ({...old,sound:true}));
    void play('intro').then(setIntroAudible);
  }
  function changeScene(id) {
    commit(old => ({...old,scene:id}));
    if (current.current.sound) void play('tap');
    setPage(null);
  }
  function restoreBackup(backup) {
    clearTimeout(feedbackTimer.current); setSpeaking(false); setReaction(null); setSelectedAction(false); setSelected(0); setNow(Date.now());
    return commit(() => wake(backup,Date.now()));
  }
  const parent = phoneItems.some(([id]) => id === page) ? 'phone' : 'menu';

  return <main className={'garden scene-' + scene + (intro ? ' revealing' : '')} aria-label="Plantigochi pocket garden">
    <div key={scene} className="scenery" style={{backgroundImage:'url(/scenes/' + scene + '.webp)'}} aria-hidden="true"/>
    <div className="camera" inert={intro ? '' : undefined} aria-hidden={intro || undefined}>
      <Device plant={plant} reaction={reaction} selected={selected} selectedAction={selectedAction} speaking={speaking}
        select={select} act={act} open={() => open('menu')} menuButton={menuButton}/>
    </div>
    <span className="sr-only" role="status">{!page && speaking ? plant.message : ''}</span>
    {intro && <div className="intro" onKeyDown={e => { if (e.key === 'Escape') finishIntro(); }}>
      <div className="intro-shade" aria-hidden="true"/>
      {['left','right'].map(side => <div key={side} className={'foliage ' + side} aria-hidden="true">
        <i className="blade back"/><i className="blade front"/><i className="blade low"/>
      </div>)}
      <div className="intro-controls"><button onClick={introSound} aria-pressed={introAudible}>{introAudible ? <Volume2/> : <VolumeX/>}{introAudible ? 'Mute' : 'Play sound'}</button><button onClick={finishIntro}>Skip intro<ChevronRight/></button></div>
    </div>}
    {page && <GardenDialog page={page} title={titles[page]} back={page === 'menu' ? null : () => open(parent)} close={() => setPage(null)}>
      {page === 'menu' && <MenuItems items={homeItems} open={open}/>}
      {page === 'phone' && <MenuItems items={phoneItems} open={open}/>}
      {page === 'care' && <>
        <div className="care-plant"><div className="mini-lcd"><PlantPixel stage={plant.stage} reaction={reaction}/></div><div><h2>Monstera</h2><span>{STAGE_NAMES[plant.stage]} · {mood[plant.stage]}</span></div></div>
        <div className="care-grid">{ACTIONS.map(key => {
          const {label, Icon} = controls[key], locked = plant.stage === 'seed' && key !== 'water';
          const done = plant.given.includes(key) || (plant.stage === 'seed' && key === 'water' && plant.wateredAt !== null);
          return <button key={key} disabled={locked} onClick={() => act(key)} aria-label={label + (locked ? ', unlocks after sprouting' : '')}><Icon/>{label}{locked ? <LockKeyhole className="corner"/> : done ? <Check className="corner"/> : null}</button>;
        })}</div>
        <p className="plant-quote" role="status">“{plant.message}”</p>
      </>}
      {page === 'journey' && <Growth plant={plant} now={now}/>}
      {page === 'guide' && <FieldGuide/>}
      {page === 'scenes' && <div className="scenes">{Object.entries(scenes).map(([id,name]) =>
        <button key={id} className="scene-choice" aria-pressed={scene === id} onClick={() => changeScene(id)}>
          <span className="swatch" style={{backgroundImage:'url(/scenes/' + id + '.webp)'}}/><span>{name}</span>{id === scene && <Check className="chosen"/>}
        </button>)}</div>}
      {page === 'settings' && <div className="menu-items"><button aria-pressed={plant.sound} onClick={toggleSound}>{plant.sound ? <Volume2/> : <VolumeX/>}Sound effects<span className="setting-value">{plant.sound ? 'On' : 'Off'}</span></button>
        <button onClick={replay}><Play/>Replay intro<ChevronRight className="row-end"/></button></div>}
      {phoneItems.some(([id]) => id === page) && <PhonePanel key={page} page={page} phone={phone} alerts={alerts} plant={plant} saveOK={saveOK} onRestore={restoreBackup}/>}
    </GardenDialog>}
  </main>;
}
