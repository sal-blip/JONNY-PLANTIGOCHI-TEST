import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { playButton, playGuideChime, playReveal } from './gardenVoices.js';

function fadeEffect(ctx, channel) {
  const bus = channel.current;
  if (ctx && bus) {
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setTargetAtTime(0, ctx.currentTime, 0.025);
  }
  channel.current = null;
}

export function useGardenSound({ enabled, intro, leafReady, effectsVolume=1 }) {
  const context = useRef(null), effects = useRef(null), chatEffects = useRef(null), note = useRef(0);
  const buttonEffects = useRef(null);
  const output = useRef(null), levels = useRef({enabled, effectsVolume});
  const [readyContext, setReadyContext] = useState(null);
  const [visible, setVisible] = useState(() => !document.hidden);
  const wantsContext = effectsVolume > 0;

  useLayoutEffect(() => {
    const before = levels.current, ctx = context.current;
    levels.current = {enabled, effectsVolume};
    if (ctx && output.current && before.effectsVolume !== effectsVolume)
      output.current.gain.setTargetAtTime(effectsVolume, ctx.currentTime, .012);
  }, [enabled, effectsVolume]);

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
        output.current = ctx.createGain();
        output.current.gain.value = levels.current.effectsVolume;
        output.current.connect(ctx.destination);
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
    if (wantsContext) unlock();
    if (readyContext) return;
    const activate = event => { if (wantsContext || event.target?.closest?.('input[type="range"]')) unlock(); };
    for (const type of ['pointerdown','pointerup','touchend','click','keydown']) window.addEventListener(type,activate,true);
    return () => {
      for (const type of ['pointerdown','pointerup','touchend','click','keydown']) window.removeEventListener(type,activate,true);
    };
  }, [enabled,visible,readyContext,unlock,wantsContext]);

  const play = useCallback(kind => {
    if (!levels.current.enabled || levels.current.effectsVolume === 0) return;
    const ctx = unlock();
    const isPress = kind === 'tap' || kind === 'care';
    if (!ctx || (ctx.state !== 'running' && !(isPress && ctx.state === 'suspended'))) return;

    const channel = isPress ? buttonEffects : kind === 'chat' ? chatEffects : effects;
    // Button voices share their own bus and can ring out under the next effect.
    if (!isPress) fadeEffect(ctx, channel);
    if (!channel.current) {
      channel.current = ctx.createGain();
      channel.current.connect(output.current);
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
      bus.connect(output.current);
      playReveal(readyContext,bus);
      return () => fadeEffect(readyContext, effects);
    }
  }, [enabled,visible,intro,leafReady,readyContext,hush]);
  useEffect(() => () => {
    hush();
    const ctx = context.current;
    context.current = null;
    output.current = null;
    if (ctx) { ctx.onstatechange = null; void ctx.close().catch(() => {}); }
  }, [hush]);
  return { play, unlock, running: !!readyContext };
}
