import { useCallback, useEffect, useRef, useState } from 'react';
import { playButton, playGuideChime, playReveal, startGardenBed } from './gardenVoices.js';

function fadeEffect(ctx, channel) {
  const bus = channel.current;
  if (ctx && bus) {
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.025);
  }
  channel.current = null;
}

export function useGardenSound({ enabled, ambience, sleeping, intro, leafReady, recordPlaying=false, instrumental=true }) {
  const context = useRef(null), effects = useRef(null), chatEffects = useRef(null), note = useRef(0);
  const buttonEffects = useRef(null);
  const [readyContext, setReadyContext] = useState(null);
  const [visible, setVisible] = useState(() => !document.hidden);

  const hush = useCallback(() => {
    fadeEffect(context.current, effects);
    fadeEffect(context.current, chatEffects);
    fadeEffect(context.current, buttonEffects);
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

  const play = useCallback(kind => {
    const ctx = unlock();
    const isPress = kind === 'tap' || kind === 'care';
    if (!ctx || (ctx.state !== 'running' && !(isPress && ctx.state === 'suspended'))) return;

    const channel = isPress ? buttonEffects : kind === 'chat' ? chatEffects : effects;
    // Button voices share their own bus and can ring out under the next effect.
    if (!isPress) fadeEffect(ctx, channel);
    if (!channel.current) {
      channel.current = ctx.createGain();
      channel.current.connect(ctx.destination);
    }
    if (kind === 'chat') playGuideChime(ctx, channel.current);
    else if (kind === 'leaves') playReveal(ctx, channel.current);
    else playButton(ctx, channel.current, kind, note.current++);
  }, [unlock]);

  useEffect(() => {
    const change = () => { setVisible(!document.hidden); if (document.hidden) hush(); };
    document.addEventListener('visibilitychange',change);
    return () => document.removeEventListener('visibilitychange',change);
  }, [hush]);
  useEffect(() => {
    if (!enabled) hush();
    if (!enabled || !visible || !readyContext) return;
    if (intro && leafReady) {
      fadeEffect(readyContext, effects);
      const bus = readyContext.createGain();
      effects.current = bus;
      bus.connect(readyContext.destination);
      playReveal(readyContext,bus);
      return () => fadeEffect(readyContext, effects);
    }
    if (!intro && ambience) {
      return startGardenBed(readyContext, readyContext.destination, sleeping, recordPlaying ? 0.18 : 1, instrumental);
    }
  }, [enabled,visible,intro,leafReady,ambience,readyContext,sleeping,hush,recordPlaying,instrumental]);
  useEffect(() => () => {
    hush();
    const ctx = context.current;
    context.current = null;
    if (ctx) { ctx.onstatechange = null; void ctx.close().catch(() => {}); }
  }, [hush]);
  return { play, unlock, running: !!readyContext };
}
