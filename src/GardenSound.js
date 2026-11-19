import { useCallback, useEffect, useRef, useState } from 'react';
import { playButton, playReveal, startGardenBed } from './gardenVoices.js';

export function useGardenSound({ enabled, ambience, sleeping, intro }) {
  const context = useRef(null), effects = useRef(null), sequence = useRef(0), note = useRef(0);
  const [readyContext, setReadyContext] = useState(null);
  const [visible, setVisible] = useState(() => !document.hidden);
  const hush = useCallback(() => {
    sequence.current++;
    const ctx = context.current, bus = effects.current;
    if (ctx && bus) {
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.025);
    }
    effects.current = null;
  }, []);

  const play = useCallback(async (kind, fromGesture = true) => {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio || document.hidden) return false;
      const ctx = context.current || (context.current = new Audio());
      hush();
      const ticket = sequence.current;
      if (ctx.state !== 'running') {
        if (!fromGesture) return false;
        await ctx.resume();
      }
      if (ctx.state !== 'running' || document.hidden || ctx !== context.current) return false;
      setReadyContext(ctx);
      if (ticket !== sequence.current) return false;
      const bus = ctx.createGain();
      effects.current = bus;
      bus.connect(ctx.destination);
      if (kind === 'intro') playReveal(ctx,bus);
      else playButton(ctx,bus,kind,note.current++);
      return true;
    } catch { return false; }
  }, [hush]);

  useEffect(() => {
    const change = () => { setVisible(!document.hidden); if (document.hidden) hush(); };
    document.addEventListener('visibilitychange',change);
    return () => document.removeEventListener('visibilitychange',change);
  }, [hush]);
  useEffect(() => {
    if (!enabled) hush();
    if (!enabled || !ambience || !visible || intro || !readyContext) return;
    return startGardenBed(readyContext, readyContext.destination, sleeping);
  }, [enabled,ambience,visible,intro,readyContext,sleeping,hush]);
  useEffect(() => () => {
    hush();
    const ctx = context.current;
    context.current = null;
    if (ctx) void ctx.close().catch(() => {});
  }, [hush]);
  return { play, hush };
}
