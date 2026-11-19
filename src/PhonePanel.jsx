import React, { useRef, useState } from 'react';
import { Bell, Check, Download, HardDrive, Upload } from 'lucide-react';
import { readPlant, STAGE_NAMES } from './game.js';

function installSteps() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'In Safari, tap Share, then Add to Home Screen. If offered, turn on Open as Web App and tap Add.';
  }
  if (/Android/i.test(ua)) {
    return 'In Chrome, open the ⋮ menu and choose Add to home screen or Install app.';
  }
  return 'On iPhone, open this link in Safari and choose Share → Add to Home Screen. On Android, open it in Chrome and choose ⋮ → Add to home screen.';
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
      const next = file.size <= 16384 ? readPlant(await file.text()) : null;
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
      {phone.installed ? <p>Launch your garden from its home-screen icon.</p> : <>
        <p>{installSteps()}</p>
        {phone.canPrompt && <button className="primary-btn" onClick={phone.promptInstall}><Download size={16}/> Install app</button>}
      </>}
      <div className="offline-state" role="status">{phone.offline === 'ready' ? <Check size={15}/> : <HardDrive size={15}/>} {offlineText}</div>
    </section>}
    {page === 'alerts' && <section className="phone-section">
      <p>Get a reminder when your plant’s next growth timer ends. Reminders are checked hourly, even with the game closed.</p>
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
      {candidate && <div className="restore-confirm"><p>Replace this plant with the <b>{STAGE_NAMES[candidate.stage].toLowerCase()}</b> from your backup?</p>
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
