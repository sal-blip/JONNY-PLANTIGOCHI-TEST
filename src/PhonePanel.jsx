import React, { useRef, useState } from 'react';
import { Bell, Check, Download, HardDrive, Upload } from 'lucide-react';
import { stageLabel } from './game.js';
import NotificationTest from './NotificationTest.jsx';
import InstallHelp from './InstallHelp.jsx';
import {readGardenBackup} from './gardenBackup.js';
import {downloadCurrentGarden,downloadOriginalSave} from './useGardenSave.js';

export default function PhonePanel({ page, phone, alerts, plant, saveOK, saveIssue, recoveryRaw, onRestore }) {
  const fileInput = useRef(null);
  const [candidate, setCandidate] = useState(null);
  const [notice, setNotice] = useState('');
  const [exporting,setExporting]=useState(false);
  async function exportSave(){
    setExporting(true);setNotice('');
    try{setNotice(await downloadCurrentGarden('plantigochi-'+new Date().toISOString().slice(0,10)));}
    catch{setNotice('Could not download this garden. Try again.');}
    finally{setExporting(false);}
  }
  async function chooseFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setCandidate(null);
    setNotice('');
    if (!file) return;
    try {
      const next=await readGardenBackup(file);
      setCandidate({plant:next.plant,apply:()=>onRestore(next)});
    } catch(error){setNotice(error.message);}
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
      {page==='alerts' && <p>Water reminders are due 4 and 12 hours after a drink. We check for them hourly, along with growth, root rot, and fungus reminders.</p>}
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
      <p>{saveOK ? 'Your garden saves on this device.' : saveIssue || 'Your last change could not be saved on this device.'} Use a backup to move your plant to another phone.</p>
      <div className="save-buttons">
        {recoveryRaw!=null && <button onClick={()=>setNotice(downloadOriginalSave(recoveryRaw))}>Download original save</button>}
        <button onClick={exportSave} disabled={exporting}><Download size={16}/> Back up</button>
        <button onClick={() => fileInput.current.click()}><Upload size={16}/> Restore</button>
      </div>
      <input ref={fileInput} type="file" accept=".plantigochi,.json,application/json" aria-label="Plantigochi backup file" hidden onChange={chooseFile}/>
      {candidate && <div className="restore-confirm"><p>Restore this garden, its Leaf Book, and {candidate.plant.graduates.length} collected plants? The backup holds a <b>{candidate.plant.deadAt === null ? stageLabel(candidate.plant).toLowerCase() : 'pressed leaf'}</b>.</p>
        <div className="save-buttons"><button onClick={async () => {
          try{
            if(!await candidate.apply())throw Error();
            setNotice('Your plant has been restored and saved.');
          }catch{setNotice('Restore failed. Keep your backup file and select it again.');}
          setCandidate(null);
        }}>Replace plant</button><button onClick={() => setCandidate(null)}>Cancel</button></div>
      </div>}
      <p className="backup-notice" role="status">{notice}</p>
    </section>}
  </>;
}
