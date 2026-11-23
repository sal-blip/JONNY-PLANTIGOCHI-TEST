import React, {createContext, useCallback, useContext, useEffect, useLayoutEffect, useState} from 'react';
import {clearScoreHandoff, useScorePlayback} from './scorePlayback.js';
import {exportGardenRaw} from './useGardenSave.js';
import {audioLevels} from './audioLevels.js';

const silent = {enabled:false};
const MusicRoute = createContext(null);

export function GameMusic({children}) {
  const [mix, setMix] = useState(silent);
  useScorePlayback(mix);
  return <MusicRoute.Provider value={setMix}>{children}</MusicRoute.Provider>;
}

function useMusicRoute({cotton=false, mystic=false, enabled=false, cottonSession, volume=1}) {
  const setMix = useContext(MusicRoute);
  useLayoutEffect(() => {
    setMix({cotton, mystic, enabled, cottonSession, volume});
  }, [setMix, cotton, mystic, enabled, cottonSession, volume]);
  useLayoutEffect(() => () => setMix(silent), [setMix]);
}

export function PublicTourMusic() {
  const [mix, setMix] = useState(silent);
  useEffect(() => {
    let read = 0;
    async function refresh() {
      const request = ++read;
      try {
        const raw = await exportGardenRaw();
        if (request !== read) return;
        const saved = raw === null ? null : JSON.parse(raw);
        const cotton = !saved || Boolean(saved.tutorial || saved.dewLesson?.status === 'round' ||
          (saved.sproutDebut && saved.sproutDebut === saved.id));
        setMix({cotton, enabled:true, volume:audioLevels(saved).musicVolume,
          cottonSession:cotton ? saved?.id ?? 'intro' : null});
      } catch {
        if (request === read) setMix(silent);
      }
    }
    function onVisible() { if (!document.hidden) void refresh(); }
    void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => { read++; document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  useMusicRoute(mix);
  return null;
}

export function useGameplayMusic({plant, phase, sproutInvitation, roomActive, recordPlaying, musicVolume=audioLevels(plant).musicVolume}) {
  const firstVisit = phase !== 'game' || Boolean(plant?.tutorial || plant?.dewLesson || sproutInvitation);
  // Only the visit on which onboarding finishes waits for the garden. A completed
  // save opened on a later visit gets its theme as soon as the toy appears.
  const [waitingForGarden, setWaitingForGarden] = useState(firstVisit);
  const [farewellVisible, setFarewellVisible] = useState(() =>
    Boolean(plant?.dewLesson && plant.dewLesson.status !== 'round'));
  const cotton = firstVisit && !farewellVisible;
  useEffect(() => {
    if (firstVisit || !waitingForGarden) return;
    if (roomActive) {
      setWaitingForGarden(false);
      return;
    }
    const resume = () => { if (!document.hidden) setWaitingForGarden(false); };
    const restorePage = event => { if (event.persisted) resume(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', restorePage);
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', restorePage);
    };
  }, [firstVisit, waitingForGarden, roomActive]);
  useMusicRoute({
    cotton, cottonSession:cotton ? plant?.id ?? 'intro' : null,
    mystic:!firstVisit && (!waitingForGarden || roomActive),
    enabled:!recordPlaying, volume:musicVolume,
  });
  return useCallback(() => {
    clearScoreHandoff();
    setFarewellVisible(true);
  }, []);
}
