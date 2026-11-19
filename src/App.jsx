import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bean, BookOpen, Smartphone, Check, ChevronLeft, ChevronRight, Clock3, Droplets, Flower2, Heart, Leaf, LockKeyhole, Maximize2, MessageCircleHeart, Moon, Sprout, Sun, Utensils, Volume2, VolumeX, X } from 'lucide-react';
import PhonePanel from './PhonePanel.jsx';
import { usePlantAlerts } from './usePlantAlerts.js';
import { usePhoneApp } from './usePhoneApp.js';
import PlantPixel from './PlantPixel.jsx';
import { ACTIONS, HOUR, KEY, STAGES, STAGE_NAMES, care, countdown, restore, wake } from './game.js';

const controls = {
  water: { label: 'Water', Icon: Droplets },
  sun: { label: 'Sunlight', Icon: Sun },
  talk: { label: 'Kind words', Icon: MessageCircleHeart },
  food: { label: 'Plant food', Icon: Utensils },
};
const growthIcons = [Bean, Sprout, Leaf, Flower2];
const moods = { seed: 'Sleepy', sprout: 'Curious', young: 'Playful', grown: 'Flourishing' };
function readSave() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function writeSave(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); return true; } catch { return false; }
}
function initialPlant() {
  const p = restore(readSave());
  writeSave(p);
  return p;
}

function PixelLeaf({ small = false }) {
  return <svg className={small ? 'pixel-logo small' : 'pixel-logo'} viewBox="0 0 34 34" fill="none" aria-hidden="true">
    <path fill="currentColor" d="M4 7h8v3h5v4h2v4h3v-7h3V8h7v7h-3v4h-5v3h-5v7h-4v-9h-4v-3H7v-4H4z"/>
    <path fill="var(--mint)" d="M6 8h5v2H6zm20 2h4v2h-4z"/>
  </svg>;
}

function Modal({ type, close, children }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; el.showModal(); return () => el.close(); }, []);
  return <dialog ref={ref} className={'modal ' + type} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }} aria-labelledby="modal-title">
    <div className="modal-inner"><button className="icon-button modal-close" aria-label="Close" onClick={close}><X size={20}/></button>{children}</div>
  </dialog>;
}

function Device({ plant, selected, select, doCare, reaction, hasSelected }) {
  const stageText = plant.stage === 'seed' ? 'SLEEPING' : moods[plant.stage].toUpperCase();
  const chosen = ACTIONS[selected];
  return <div className="device">
    <img className="shell" src="/art/device.svg" alt="" draggable="false"/>
    <div className="lcd" aria-label={STAGE_NAMES[plant.stage] + ', ' + moods[plant.stage]}>
      <div className="lcd-top"><span><i/> MONSTERA</span><span className="battery"><b/><b/><b/></span></div>
      <div className="lcd-art"><PlantPixel stage={plant.stage} reaction={reaction}/></div>
      <div className="lcd-status">{hasSelected ? controls[chosen].label.toUpperCase() : stageText}<span>{plant.stage === 'seed' && !hasSelected ? ' · Z Z Z' : ''}</span></div>
    </div>
    <span className="shell-name" aria-hidden="true">PLANTIGOCHI</span>
    <div className="toy-keys">
      <button aria-label="Previous care action" title="Previous care action" onClick={() => select(-1)}><ChevronLeft/></button>
      <button className="accept" aria-label={'Give ' + controls[chosen].label.toLowerCase()} title={'Give ' + controls[chosen].label.toLowerCase()} onClick={() => doCare(chosen)}><Heart/></button>
      <button aria-label="Next care action" title="Next care action" onClick={() => select(1)}><ChevronRight/></button>
    </div>
  </div>;
}

function Journey({ stage }) {
  const current = STAGES.indexOf(stage);
  return <section className="journey" aria-labelledby="journey-title">
    <div className="journey-heading"><span className="eyebrow"><span className="short-rule"/> GROWTH TRACKER</span><h2 id="journey-title">Growth journey</h2></div>
    <ol>{STAGES.map((s,i) => { const Icon = growthIcons[i]; return <li key={s} className={i <= current ? 'achieved' : ''} aria-current={i === current ? 'step' : undefined}>
      <span className="journey-icon"><Icon size={18} strokeWidth={1.8}/></span><span>{STAGE_NAMES[s]}</span>
    </li>; })}</ol>
  </section>;
}

export default function App() {
  const phone = usePhoneApp();
  const [plant, setPlant] = useState(initialPlant);
  const alerts = usePlantAlerts(plant, phone.offline);
  const current = useRef(plant);
  const [now, setNow] = useState(Date.now);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(0);
  const [hasSelected, setHasSelected] = useState(false);
  const [reaction, setReaction] = useState(null);
  const [saveOK, setSaveOK] = useState(() => readSave() !== null);
  const reactionTimer = useRef(null);
  const audio = useRef(null);

  const savedLastChange = useRef(saveOK);
  const commit = useCallback(fn => {
    const raw = savedLastChange.current ? readSave() : null;
    const old = raw ? restore(raw) : current.current;
    const next = fn(old);
    const ok = writeSave(next);
    savedLastChange.current = ok;
    current.current = next;
    setPlant(next);
    setSaveOK(ok);
    return ok;
  }, []);
  useEffect(() => {
    const refresh = () => {
      const t = Date.now(); setNow(t);
      const p = current.current;
      if (wake(p,t) !== p) commit(latest => wake(latest,t));
    };
    function sync(e) {
      if (e.key !== KEY || !e.newValue) return;
      const next = restore(e.newValue); current.current = next; savedLastChange.current = true; setSaveOK(true); setPlant(next); setNow(Date.now());
    }
    const timer = setInterval(refresh, 1000);
    window.addEventListener('storage', sync); document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); clearTimeout(reactionTimer.current); window.removeEventListener('storage',sync); document.removeEventListener('visibilitychange',refresh); };
  }, [commit]);
  function chirp(high = false) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = audio.current || (audio.current = new Ctx()); void ctx.resume().catch(() => {});
      const t = ctx.currentTime;
      for (const [i,n] of (high ? [660,880] : [494,587]).entries()) {
        const osc = ctx.createOscillator(), gain = ctx.createGain(), start = t + i * .09;
        osc.type = 'sine'; osc.frequency.value = n; gain.gain.setValueAtTime(.0001,start);
        gain.gain.exponentialRampToValueAtTime(.06,start+.012); gain.gain.exponentialRampToValueAtTime(.0001,start+.10);
        osc.connect(gain); gain.connect(ctx.destination); osc.start(start); osc.stop(start+.11);
      }
    } catch { /* Sound is optional on browsers without Web Audio. */ }
  }
  function toggleSound() {
    if (!current.current.sound) chirp(true);
    commit(old => ({ ...old, sound: !old.sound }));
  }
  function select(delta) {
    setSelected(i => (i + delta + ACTIONS.length) % ACTIONS.length); setHasSelected(true);
    if (current.current.sound) chirp();
  }
  function act(action) {
    const ready = wake(current.current,Date.now());
    setSelected(ACTIONS.indexOf(action)); setHasSelected(false);
    const allowed = (ready.stage !== 'seed' || action === 'water') && !ready.given.includes(action) && !(ready.stage === 'seed' && ready.wateredAt !== null);
    commit(old => care(old,action)); setNow(Date.now());
    if (allowed) {
      setReaction(action); clearTimeout(reactionTimer.current); reactionTimer.current = setTimeout(() => setReaction(null),2200);
      if (ready.sound) chirp(true);
    }
  }

  const left = Math.max(0, plant.plantedAt + HOUR - now);
  const isSeed = plant.stage === 'seed';
  const day = Math.max(1,Math.floor((now - plant.plantedAt) / 86400000) + 1);
  const deviceProps = { plant, selected, select, doCare: act, reaction, hasSelected };
  const seedHint = plant.wateredAt !== null ? 'Watered. Let your seed rest.' : left > 0 ? 'Water once to wake your seed in an hour.' : 'A little water will wake your seed.';
  const careHint = plant.stage === 'young' && plant.round === 0 ? 'Two rounds of care to grow up.' : plant.stage === 'grown' ? 'Keep your grown Monstera flourishing.' : 'Give all four kinds of care to grow.';
  const progress = isSeed ? (HOUR - Math.min(left,HOUR)) / HOUR : (plant.given.length + (plant.stage === 'young' ? plant.round * 4 : 0)) / (plant.stage === 'young' ? 8 : 4);

  return <div className="app">
    <header className="topbar"><div className="nav-inner">
      <a className="brand" href="#garden" aria-label="Plantigochi pocket garden"><span className="brand-tile"><PixelLeaf/></span>Plantigochi<span className="brand-dot">.</span></a>
      <div className="nav-actions"><button className="phone-link" onClick={() => setModal('phone')}><Smartphone size={16}/><span>{phone.installed ? 'App & saves' : 'Install app'}</span></button><button className="guide-link" aria-label="Field guide" onClick={() => setModal('guide')}><BookOpen size={17}/><span>Field guide</span></button>
        <span className="nav-separator"/><button className="sound" aria-label={plant.sound ? 'Mute sound' : 'Enable sound'} aria-pressed={plant.sound} onClick={toggleSound}>{plant.sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button>
      </div></div></header>
    <main id="garden">
      <div className="page-title"><div><span className="eyebrow"><span className="kicker-dot"/> ポケットガーデン</span><h1>Pocket garden<span>.</span></h1></div>
        <div className="day-pill"><Sun size={16}/><span>Day {String(day).padStart(2,'0')}</span></div></div>
      <div className="play-layout">
        <section className="stage" aria-label="Interactive leaf keychain">
          <div className="stage-toolbar"><span className="live-label"><i/> PET CAM</span><button className="expand" onClick={() => setModal('focus')} aria-label="Enlarge keychain" title="Enlarge keychain"><Maximize2 size={16}/></button></div>
          <div className="stage-decor deco-left" aria-hidden="true">✧</div><div className="stage-decor deco-right" aria-hidden="true">✧</div>
          <Device {...deviceProps}/>
          <div className="speech"><span className="quote-mark" aria-hidden="true">“</span><span role="status">{plant.message}</span></div>
        </section>
        <section className="care-panel" aria-label="Plant care">
          <div className="plant-heading"><div><span className="eyebrow"><span className="short-rule"/> YOUR PLANT</span><h2>Monstera</h2><p className="latin">Monstera deliciosa</p></div>
            <span className="specimen-icon"><Leaf size={30} strokeWidth={1.5}/></span></div>
          <div className="status-row"><div><span className="stat-label">Growth stage</span><b><Sprout/>{STAGE_NAMES[plant.stage]}</b></div><div><span className="stat-label">Mood</span><b>{isSeed ? <Moon/> : <Heart/>}{moods[plant.stage]}</b></div></div>
          <div className="progress-box"><div className="progress-head"><span>{isSeed ? <Clock3/> : <Leaf/>}{isSeed ? left ? 'Sprout timer' : 'Ready to sprout' : plant.stage === 'grown' ? 'Daily care' : 'Growth progress'}</span><strong>{isSeed ? countdown(left) : Math.round(progress*100) + '%'}</strong></div>
            <div className="track" aria-hidden="true"><i style={{width: (progress*100)+'%'}}/></div>
            <div className="progress-hint">{isSeed ? seedHint : careHint}</div></div>
          <div className="care-head"><h3>Care actions</h3><span lang="ja">お世話</span></div>
          <div className="care-grid">{ACTIONS.map((key,i) => { const {label,Icon} = controls[key], locked = isSeed && key !== 'water', done = plant.given.includes(key) || (isSeed && key === 'water' && plant.wateredAt !== null); return <button className={'action action-' + key + (selected === i && hasSelected ? ' picked' : '')} key={key} disabled={locked} aria-label={locked ? label + ', unlocks after sprouting' : label} onClick={() => act(key)}>
            <span className="action-icon"><Icon size={19} strokeWidth={1.9}/></span><b>{label}</b>{locked ? <LockKeyhole className="corner-icon"/> : done ? <Check className="corner-icon"/> : null}
          </button>; })}</div>
          <p className="lock-hint">{isSeed ? <><LockKeyhole size={13}/> More care unlocks after sprouting.</> : <><Heart size={13}/> Each different kindness counts.</>}</p>
        </section>
      </div>
      <Journey stage={plant.stage}/>
      <div className="save-note"><button className="alerts-link" onClick={() => setModal('phone')}>Plant alerts</button><span className={saveOK ? 'save-dot' : 'save-dot warn'}/>{saveOK ? 'Saved on this device' : 'Progress is saved for this session only'}</div>
    </main>
    {modal === 'phone' && <Modal type="phone-modal" close={() => setModal(null)}><PhonePanel phone={phone} alerts={alerts} plant={plant} saveOK={saveOK} onRestore={backup => {
      clearTimeout(reactionTimer.current); setReaction(null); setHasSelected(false); setNow(Date.now());
      return commit(() => wake(backup, Date.now()));
    }}/></Modal>}
    {modal === 'guide' && <Modal type="guide-modal" close={() => setModal(null)}><div className="guide-badge"><BookOpen size={26}/></div><span className="eyebrow">植物の手帳</span><h2 id="modal-title">Field guide</h2><div className="guide-sections">
      <div><h3>01 · A sleepy seed</h3><p>Water once. Your Monstera sprouts one real hour after planting if it has had a drink. Watering later wakes it immediately.</p></div>
      <div><h3>02 · A little daily care</h3><p>Give your sprout water, sunlight, kind words, and food in any order. One full set grows a young plant. Two more sets grow its split leaves.</p></div>
      <div><h3>03 · Play your way</h3><p>Use the care buttons or the keychain itself. Its outer buttons choose an action and its heart gives it. Your plant remembers its progress in this browser while you’re away.</p></div>
      </div><button className="primary-btn" onClick={() => setModal(null)}>Back to my plant</button></Modal>}
    {modal === 'focus' && <Modal type="focus-modal" close={() => setModal(null)}><h2 id="modal-title">Pet cam</h2><Device {...deviceProps}/><div className="focus-speech" role="status">{plant.message}</div></Modal>}
  </div>;
}
