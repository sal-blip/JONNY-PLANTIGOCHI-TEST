import React, { useCallback, useEffect, useRef, useState } from 'react';
import { audioLevels, setAudioLevel } from './audioLevels.js';

const channels = [
  ['musicVolume', 'Music'],
  ['fxVolume', 'Sound effects'],
  ['ambienceVolume', 'Garden ambience'],
];

export function useAudioSettings(plant, commit) {
  const [draft, setDraft] = useState({});
  const pending = useRef({});
  const timer = useRef(null);

  const save = useCallback(() => {
    clearTimeout(timer.current);
    const changes = Object.entries(pending.current);
    if (!changes.length) return;
    pending.current = {};
    // A long drag can overlap an earlier write or another window's garden edit.
    void commit(current => changes.reduce((next, [key, edit]) => setAudioLevel(next, key, edit.value), current))
      .finally(() => setDraft(latest => {
        const next = {...latest};
        for (const [key, edit] of changes) {
          if (next[key] === edit) delete next[key];
        }
        return next;
      }));
  }, [commit]);

  useEffect(() => {
    const onHide = () => { if (document.hidden) save(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', save);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [save]);

  function adjust(key, value) {
    const edit = {value};
    pending.current[key] = edit;
    setDraft(latest => ({...latest, [key]:edit}));
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 180);
  }

  const levels = audioLevels(plant);
  for (const [key, edit] of Object.entries(draft)) levels[key] = edit.value;
  return {levels, adjust, save};
}

export default function AudioSettings({levels, adjust, save, previewEffect}) {
  const previewPending = useRef(false);
  function finish() {
    save();
    if (previewPending.current) {
      previewPending.current = false;
      previewEffect();
    }
  }

  return <div className="audio-settings" role="group" aria-label="Volume">
    {channels.map(([key, label]) => {
      const percent = Math.round(levels[key] * 100);
      return <div className="volume-row" key={key}>
        <label htmlFor={key}>{label}</label>
        <input type="range" id={key} min="0" max="100" step="1" value={percent} aria-valuetext={percent + '%'}
          onChange={event => {
            adjust(key, event.currentTarget.valueAsNumber / 100);
            if (key === 'fxVolume') previewPending.current = true;
          }}
          onPointerUp={finish} onKeyUp={finish} onBlur={finish}/>
        <span className="setting-value" aria-hidden="true">{percent}%</span>
      </div>;
    })}
  </div>;
}
