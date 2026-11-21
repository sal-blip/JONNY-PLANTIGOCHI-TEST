import React, { useRef, useState } from 'react';
import { Bell, Check, Download, HardDrive, Upload } from 'lucide-react';
import { backupLimit } from './gardenScenes.js';
import { readPlant, STAGE_NAMES } from './game.js';
import NotificationTest from './NotificationTest.jsx';
import InstallHelp from './InstallHelp.jsx';
import {downloadFile} from './Recovery.jsx';

export default function PhonePanel({ page, phone, alerts, plant, saveOK, recoveryRaw, onRestore }) {
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
    unavailable: 'Open the app online to prepare offline play',
  }[phone.offline];
  return <>
    {page === 'install' && <section className="phone-section">
      <InstallHelp phone={phone}/>
      <div className="offline-state" role="status">{phone.offline === 'ready' ? <Check size={15}/> : <HardDrive size={15}/>} {offlineText}</div>
    </section>}
    {(page === 'alerts' || page==='test') && <section className="phone-section">
      {page==='alerts' && <p>Growth, thirst, root rot, and fungus reminders are checked hourly.</p>}
      {alerts.capable && !alerts.denied ? <button className="alert-control" aria-pressed={alerts.enrolled} onClick={alerts.toggle} disabled={alerts.busy || (alerts.enrolled ? phone.offline !== 'ready' : !alerts.canEnable)}>
        <Bell size={16}/>{alerts.busy ? 'Updating…' : alerts.enrolled ? 'Turn off alerts' : 'Enable plant alerts'}</button>
        : <p className="support-hint">{alerts.denied ? 'Notifications are blocked. You can allow them in the browser or device settings.' : 'On iPhone or iPad, add this game to the Home Screen and open its icon to enable alerts. Other devices need a browser that supports Web Push.'}</p>}
      {page==='alerts' && alerts.enrolled && <button className="alert-control" aria-pressed={alerts.company} onClick={alerts.toggleCompany}>
        Company reminders · {alerts.company?'On':'Off'}</button>}
      <p className="backup-notice" role="status">{alerts.notice || (alerts.enrolled && (alerts.enabled ?
        (alerts.nextDue?'Reminders confirmed · Next '+new Date(alerts.nextDue).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}):
        plant.stage==='seed' && plant.wateredAt===null?'Permission granted · Water your seed to schedule its first reminder.':'Reminders confirmed · No upcoming reminder.')
        :'Permission granted · Sync pending'))}</p>
      {page==='test' && <NotificationTest alerts={alerts}/>}
    </section>}
    {page === 'saves' && <section className="phone-section">
      <p>{saveOK ? 'Your garden saves on this device.' : 'Device storage is unavailable. Download a backup before closing the game.'} Use a backup to move your plant to another phone.</p>
      <div className="save-buttons">
        {recoveryRaw!=null && <button onClick={()=>downloadFile(new Blob([recoveryRaw]),"plantigochi-original.json")}>Download original save</button>}
        <button onClick={exportSave}><Download size={16}/> Back up</button>
        <button onClick={() => fileInput.current.click()}><Upload size={16}/> Restore</button>
      </div>
      <input ref={fileInput} type="file" accept=".json,application/json" aria-label="Plantigochi backup file" hidden onChange={chooseFile}/>
      {candidate && <div className="restore-confirm"><p>Restore this garden, its Leaf Book, and {candidate.graduates.length} collected plants? The backup holds a <b>{candidate.deadAt === null ? STAGE_NAMES[candidate.stage].toLowerCase() : 'pressed leaf'}</b>.</p>
        <div className="save-buttons"><button onClick={async () => {
          const saved = await onRestore(candidate);
          setCandidate(null);
          setNotice(saved ? 'Your plant has been restored and saved.' : 'Restore failed. Keep your backup file and try again.');
        }}>Replace plant</button><button onClick={() => setCandidate(null)}>Cancel</button></div>
      </div>}
      <p className="backup-notice" role="status">{notice}</p>
    </section>}
  </>;
}
