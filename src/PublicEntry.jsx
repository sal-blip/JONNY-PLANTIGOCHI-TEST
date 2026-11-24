import React, {useEffect, useState} from 'react';
import {Leaf} from 'lucide-react';
import {PublicTourMusic} from './GameMusic.jsx';
import InstallHelp from './InstallHelp.jsx';
import WelcomeTour from './WelcomeTour.jsx';
import {downloadCurrentGarden, exportGardenRaw} from './useGardenSave.js';

function ReturningGarden({phone}) {
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  async function backUp() {
    setSaving(true);
    setNotice('');
    try {
      setNotice(await downloadCurrentGarden('plantigochi-backup'));
    } catch {
      setNotice('Couldn’t download your garden. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  return <main className="welcome-tour returning-garden" aria-labelledby="returning-title">
    <div className="tour-sheet tour-page-3">
      <header className="tour-header"><span className="tour-brand"><Leaf aria-hidden="true"/>Plantigochi</span></header>
      <section className="tour-words">
        <img src="/icons/icon-192.png" width="72" height="72" alt=""/>
        <h1 id="returning-title">Welcome back, <em>gardener</em></h1>
        <p className="tour-caption">This browser has a saved garden. Open the Plantigochi icon on your Home Screen to play.</p>
        <details className="returning-help" open={location.hash === '#install' || undefined}>
          <summary>Need to install or move your garden?</summary>
          <p>Back up your garden before installing. If the app opens with a new seed, choose <strong>Restore a garden</strong> and select your backup.</p>
          <button className="tour-primary" disabled={saving} onClick={backUp}>Back up my garden</button>
          {notice && <p role="status">{notice}</p>}
          <div className="tour-install"><InstallHelp tour phone={phone}/></div>
        </details>
      </section>
    </div>
  </main>;
}

export default function PublicEntry({phone}) {
  // Read without opening a gameplay session or advancing an existing plant.
  const [raw, setRaw] = useState(undefined);
  useEffect(() => {
    let generation = 0;
    async function refresh() {
      const request = ++generation;
      try {
        const saved = await exportGardenRaw();
        if (request === generation) setRaw(saved);
      } catch {
        if (request === generation) setRaw(previous => previous ?? null);
      }
    }
    function onVisible() { if (!document.hidden) void refresh(); }
    void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => { generation++; document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  if (raw === undefined) return <main className="garden-loading" aria-busy="true" aria-label="Opening Plantigochi"/>;
  return <>
    <PublicTourMusic raw={raw}/>
    {raw === null ? <WelcomeTour phone={phone}/> : <ReturningGarden phone={phone}/>}
  </>;
}
