import React, { useRef, useState } from 'react';
import { Bell, Check, Download, HardDrive, Upload } from 'lucide-react';
import { backupLimit } from './gardenScenes.js';
import { readPlant, STAGE_NAMES } from './game.js';
import GameLink from './GameLink.jsx';

function InstallHelp({phone}) {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const embedded = window.self !== window.top || /ChatGPT|FBAN|FBAV|Instagram|; wv\)/i.test(ua) ||
    (ios && !/Safari|CriOS|FxiOS|EdgiOS/.test(ua));
  switch (phone.installState) {
    case 'installed': return <p>Plantigochi is installed on this device.</p>;
    case 'prompting': return <p role="status">Choose Install in your browser’s prompt.</p>;
    case 'accepted': return <p role="status">Installation accepted. Your device will add the Plantigochi icon.</p>;
    case 'available': return <button className="primary-btn" onClick={phone.promptInstall}><Download size={16}/> Install Plantigochi</button>;
  }
  let steps;
  if (ios) steps = <>In Safari, tap <b>Share</b>, then <b>Add to Home Screen</b>. If offered, turn on <b>Open as Web App</b>, then tap <b>Add</b>.</>;
  else if (android) steps = <>In Chrome, open the <b>⋮</b> menu and choose <b>Add to Home screen</b> or <b>Install app</b>. Confirm to add Plantigochi.</>;
  else if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) steps = <>In Safari, choose <b>File → Add to Dock</b>.</>;
  else steps = <>In Chrome or Edge, use the install icon in the address bar or the browser menu’s install option.</>;
  return <>
    {embedded && <p>Open the game link in {ios ? 'Safari' : android ? 'Chrome' : 'your browser'} first.</p>}
    <p>{steps}</p>
    <GameLink/>
  </>;
}

export default function PhonePanel({ page, phone, alerts, plant, saveOK, onRestore }) {
  const fileInput = useRef(null);
  const [candidate, setCandidate] = useState(null);
  const [notice, setNotice] = useState('');
  function exportSave() {
    const blob = new Blob([JSON.stringify(plant)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantigochi-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    setNotice('Backup prepared. Keep the file to restore this plant later.');
  }
  async function chooseFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setCandidate(null);
    setNotice('');
    if (!file) return;
    try {
      const next = file.size <= backupLimit ? readPlant(await file.text()) : null;
      if (!next) { setNotice('Choose a valid Plantigochi backup file.'); return; }
      setCandidate(next);
    } catch { setNotice('The file could not be opened. Try choosing it again.'); }
  }
  const offlineText = {
    ready: 'Ready for offline play',
    preparing: 'Preparing offline play…',
    unavailable: 'Open online to play in this browser',
  }[phone.offline];
  return <>
    {page === 'install' && <section className="phone-section">
      <InstallHelp phone={phone}/>
      <div className="offline-state" role="status">{phone.offline === 'ready' ? <Check size={15}/> : <HardDrive size={15}/>} {offlineText}</div>
    </section>}
    {page === 'alerts' && <section className="phone-section">
      <p>Get growth reminders and a rescue alert when your plant is very thirsty or its roots need drainage. Delivery is checked hourly while the game is closed.</p>
      {alerts.capable && !alerts.denied ? <button className="alert-control" aria-pressed={alerts.enabled} onClick={alerts.toggle} disabled={alerts.busy || phone.offline !== 'ready'}>
        <Bell size={16}/>{alerts.busy ? 'Updating…' : alerts.enabled ? 'Turn off alerts' : 'Enable plant alerts'}</button>
        : <p className="support-hint">{alerts.denied ? 'Notifications are blocked. You can allow them in the browser or device settings.' : 'On iPhone or iPad, add this game to the Home Screen and open its icon to enable alerts. Other devices need a browser that supports Web Push.'}</p>}
      <p className="backup-notice" role="status">{alerts.notice}</p>
    </section>}
    {page === 'saves' && <section className="phone-section">
      <p>{saveOK ? 'Your garden saves on this device.' : 'Device storage is unavailable. Download a backup before closing the game.'} Use a backup to move your plant to another phone.</p>
      <div className="save-buttons">
        <button onClick={exportSave}><Download size={16}/> Back up</button>
        <button onClick={() => fileInput.current.click()}><Upload size={16}/> Restore</button>
      </div>
      <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Plantigochi backup file" hidden onChange={chooseFile}/>
      {candidate && <div className="restore-confirm"><p>Restore this garden and its Leaf Book? The backup holds a <b>{candidate.deadAt === null ? STAGE_NAMES[candidate.stage].toLowerCase() : 'pressed leaf'}</b>.</p>
        <div className="save-buttons"><button onClick={() => {
          const saved = onRestore(candidate);
          setCandidate(null);
          setNotice(saved ? 'Your plant has been restored and saved.' : 'Plant restored for this session. Keep your backup file.');
        }}>Replace plant</button><button onClick={() => setCandidate(null)}>Cancel</button></div>
      </div>}
      <p className="backup-notice" role="status">{notice}</p>
    </section>}
  </>;
}
