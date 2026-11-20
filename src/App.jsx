import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Waves, Moon, ImagePlus, Music2, Play, Move, Sun, Volume2, VolumeX } from 'lucide-react';
import PhotoBackground from './PhotoBackground.jsx';
import { scenes, selectedScene, photoStyle } from './gardenScenes.js';
import PhonePanel from './PhonePanel.jsx';
import GardenDialog from './GardenDialog.jsx';
import { useGardenTilt } from './useGardenTilt.js';
import { useGardenSound } from './GardenSound.js';
import { usePlantAlerts } from './usePlantAlerts.js';
import { usePhoneApp } from './usePhoneApp.js';
import PocketDevice from './PocketDevice.jsx';
import {KEY, restore, wake} from './game.js';

const titles = {menu:'Pocket menu',scenes:'Backgrounds',settings:'Settings',phone:'App & saves',install:'Install app',saves:'Saved plant',alerts:'Plant alerts'};
const homeItems = ['scenes','settings','phone'];
const phoneItems = ['install','saves','alerts'];
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

export default function App() {
  const phone = usePhoneApp();
  const [plant, setPlant] = useState(initialPlant), current = useRef(plant);
  const alerts = usePlantAlerts(plant, phone.offline);
  const [now, setNow] = useState(Date.now);
  const [page, setPage] = useState(null);
  const [intro, setIntro] = useState(() => !reducedMotion());
  const tilt = useGardenTilt(intro || page !== null);
  const [leafReady, setLeafReady] = useState(false);
  const [saveOK, setSaveOK] = useState(() => readSave() !== null);
  const menuButton = useRef(null), restoreFocus = useRef(false);
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
    return () => { clearInterval(timer); window.removeEventListener('storage',sync); document.removeEventListener('visibilitychange',refresh); };
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
    restoreFocus.current = true;
    setPage(id);
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
    setNow(Date.now());
    return commit(() => wake(backup,Date.now()));
  }
  const introAudible = plant.sound && running;
  const parent = phoneItems.includes(page) ? 'phone' : 'menu';

  return <main ref={tilt.garden} className={'garden scene-' + scene + (page && page !== 'photo' ? ' menus-open' : '') + (intro ? (leafReady ? ' revealing' : ' revealing waiting-leaves') : '')} aria-label="Plantigochi pocket garden" onClickCapture={event => {
    const button = event.target.closest?.('button');
    if (plant.sound && button && !button.disabled && !button.dataset.audio) void play('tap');
  }}>
    <div key={photo ? 'photo' : scene} ref={scenery} className="scenery" style={photo ? undefined : {backgroundImage:'url(/scenes/' + scene + '.webp)'}} aria-hidden="true">
      {photo && <img className="custom-photo" src={photo.src} style={photoStyle(photo)} alt="" draggable="false"/>}
    </div>
    <div className="camera" inert={intro ? '' : undefined} aria-hidden={intro || undefined}>
      <PocketDevice key={plant.id+'-'+(plant.deadAt ?? 'alive')} plant={plant} now={now} resting={!intro && !page} commit={commit} sound={play}/>
    </div>
    <div className="garden-edges" aria-hidden="true"/>
    <div hidden={page === 'photo'} className="garden-corners" inert={intro ? '' : undefined} aria-hidden={intro || undefined}>
      <span className="garden-wordmark">Plant Garden</span>
      <button ref={menuButton} className="wave-menu" aria-label="Open pocket menu" title="Pocket menu" aria-haspopup="dialog" onClick={() => open('menu')}><Waves/></button>
      <span className="garden-clock"><TimeIcon aria-hidden="true"/><time dateTime={time.toISOString()}>{clock.format(time)}</time></span>
      <small className="garden-credit">© 2026 Waz Lab</small>
    </div>
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
