import React, {createContext, useContext, useEffect, useLayoutEffect, useState} from 'react';
import {useScorePlayback} from './scorePlayback.js';
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

export function PublicTourMusic({raw}) {
  const mix = React.useMemo(() => {
    try {
      const saved = JSON.parse(raw);
      const cotton = !saved || Boolean(saved.tutorial || saved.dewLesson || saved.gardenTour ||
        (saved.sproutDebut && saved.sproutDebut === saved.id));
      return {cotton, enabled:true, volume:audioLevels(saved).musicVolume,
        cottonSession:cotton ? saved?.id ?? 'intro' : null};
    } catch {
      return silent;
    }
  }, [raw]);
  useMusicRoute(mix);
  return null;
}

export function useGameplayMusic({plant, phase, sproutInvitation, roomActive, recordPlaying, musicVolume=audioLevels(plant).musicVolume}) {
  const firstVisit = phase !== 'game' || Boolean(plant?.tutorial || plant?.dewLesson || sproutInvitation || plant?.gardenTour);
  // Keep the same loop during the reward receipt and the transition back to
  // the room. A completed garden starts directly on Mystic on its next launch.
  const [waitingForGarden, setWaitingForGarden] = useState(firstVisit);
  useEffect(() => {
    if(firstVisit)setWaitingForGarden(true);
    else if(roomActive)setWaitingForGarden(false);
  }, [firstVisit, roomActive]);
  const cotton = firstVisit || (waitingForGarden && !roomActive);
  useMusicRoute({
    cotton, cottonSession:cotton ? plant?.id ?? 'intro' : null,
    mystic:!cotton,
    enabled:!recordPlaying, volume:musicVolume,
  });
}
