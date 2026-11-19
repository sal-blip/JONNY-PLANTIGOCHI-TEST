import { useCallback, useEffect, useRef, useState } from 'react';
import { playButton, playReveal, startGardenBed } from './gardenVoices.js';

export function useGardenSound({ enabled, ambience, sleeping, intro, leafReady }) {
  const context = useRef(null), effects = useRef(null), note = useRef(0);
  const [readyContext, setReadyContext] = useState(null);
  const [visible, setVisible] = useState(() => !document.hidden);

  const hush = useCallback(() => {
    const ctx = context.current, bus = effects.current;
    if (ctx && bus) {
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.025);
    }
    effects.current = null;
  }, []);

  const unlock = useCallback(() => {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio || document.hidden) return null;
    try {
      if (!context.current) {
        const ctx = new Audio();
        context.current = ctx;
        ctx.onstatechange = () => {
          if (context.current === ctx) setReadyContext(ctx.state === 'running' ? ctx : null);
        };
      }
      const ctx = context.current;
      if (ctx.state === 'running') setReadyContext(ctx);
      else void ctx.resume().catch(() => {});
      return ctx;
    } catch { return null; }
  }, []);

  useEffect(() => {
    if (!enabled || !visible) return;
    unlock();
    if (readyContext) return;
    const activate = event => {
      // The explicit sound buttons handle their own gesture and mute state.
      if (!event.target.closest?.('[data-audio="master"]')) unlock();
    };
    for (const type of ['pointerdown','pointerup','touchend','click','keydown']) window.addEventListener(type,activate,true);
    return () => {
      for (const type of ['pointerdown','pointerup','touchend','click','keydown']) window.removeEventListener(type,activate,true);
    };
  }, [enabled,visible,readyContext,unlock]);

  const play = useCallback((kind) => {
    const ctx = unlock();
    if (!ctx || ctx.state !== 'running') return;
    hush();
    const bus = ctx.createGain();
    effects.current = bus;
    bus.connect(ctx.destination);
    playButton(ctx,bus,kind,note.current++);
  }, [unlock,hush]);

  useEffect(() => {
    const change = () => { setVisible(!document.hidden); if (document.hidden) hush(); };
    document.addEventListener('visibilitychange',change);
    return () => document.removeEventListener('visibilitychange',change);
  }, [hush]);
  useEffect(() => {
    if (!enabled) hush();
    if (!enabled || !visible || !readyContext) return;
    if (intro && leafReady) {
      hush();
      const bus = readyContext.createGain();
      effects.current = bus;
      bus.connect(readyContext.destination);
      playReveal(readyContext,bus);
      return hush;
    }
    if (!intro && ambience) return startGardenBed(readyContext,readyContext.destination,sleeping);
  }, [enabled,visible,intro,leafReady,ambience,readyContext,sleeping,hush]);
  useEffect(() => () => {
    hush();
    const ctx = context.current;
    context.current = null;
    if (ctx) { ctx.onstatechange = null; void ctx.close().catch(() => {}); }
  }, [hush]);
  return { play, unlock, running: !!readyContext };
}
