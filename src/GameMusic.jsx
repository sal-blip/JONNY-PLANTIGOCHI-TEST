import React, {createContext, useContext, useLayoutEffect, useState} from 'react';
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

function playsTutorialScore(plant, sproutInvitation) {
  // The 'garden' step asks for the upward swipe. Its saved successor starts the room lesson.
  if (plant?.gardenTour) return plant.gardenTour === 'garden';
  return Boolean(plant?.tutorial || plant?.dewLesson || sproutInvitation);
}

export function PublicTourMusic({raw}) {
  const mix = React.useMemo(() => {
    try {
      const saved = JSON.parse(raw);
      const cotton = !saved || playsTutorialScore(saved, saved.sproutDebut && saved.sproutDebut === saved.id);
      return {cotton, enabled:true, volume:audioLevels(saved).musicVolume,
        cottonSession:cotton ? saved?.id ?? 'intro' : null};
    } catch {
      return silent;
    }
  }, [raw]);
  useMusicRoute(mix);
  return null;
}

export function useGameplayMusic({plant, phase, sproutInvitation, recordPlaying, musicVolume=audioLevels(plant).musicVolume}) {
  const cotton = phase !== 'game' || playsTutorialScore(plant, sproutInvitation);
  useMusicRoute({
    cotton, cottonSession:cotton ? plant?.id ?? 'intro' : null,
    mystic:!cotton,
    enabled:!recordPlaying, volume:musicVolume,
  });
}
