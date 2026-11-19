import { useCallback, useEffect, useRef } from 'react';

// The launch sound is synthesized locally so it also works offline.
export function useGardenSound() {
  const context = useRef(null);
  const voice = useRef(null);
  const generation = useRef(0);

  const hush = useCallback(() => {
    generation.current++;
    const ctx = context.current, bus = voice.current;
    if (bus && ctx) {
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    }
    voice.current = null;
  }, []);

  const play = useCallback(async (kind, fromGesture = true) => {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      const ctx = context.current || (context.current = new Audio());
      hush();
      const ticket = generation.current;
      if (ctx.state !== 'running') {
        if (!fromGesture) return false;
        await ctx.resume();
      }
      if (ctx.state !== 'running' || ticket !== generation.current) return false;
      const bus = ctx.createGain();
      voice.current = bus;
      bus.connect(ctx.destination);
      const start = ctx.currentTime;
      const intro = kind === 'intro';
      const notes = intro ? [392, 493.88, 587.33, 783.99] : kind === 'care' ? [523.25, 659.25] : [523.25];
      notes.forEach((hz, i) => {
        const t = start + i * (intro ? 0.72 : 0.1);
        const duration = intro ? 1.85 : 0.27;
        const note = ctx.createOscillator(), envelope = ctx.createGain();
        note.type = 'sine';
        note.frequency.value = hz;
        envelope.gain.setValueAtTime(0.0001, t);
        envelope.gain.exponentialRampToValueAtTime(intro ? 0.047 : 0.052, t + (intro ? 0.065 : 0.014));
        envelope.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        note.connect(envelope).connect(bus);
        note.start(t);
        note.stop(t + duration + 0.03);
      });
      if (intro) {
        const rustle = ctx.createBufferSource(), lowpass = ctx.createBiquadFilter(), fade = ctx.createGain();
        const length = Math.floor(ctx.sampleRate * 3.3);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const wave = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) wave[i] = Math.random() * 2 - 1;
        rustle.buffer = buffer;
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(680, start);
        lowpass.frequency.linearRampToValueAtTime(1650, start + 1.4);
        fade.gain.setValueAtTime(0, start);
        fade.gain.linearRampToValueAtTime(0.06, start + 1.1);
        fade.gain.linearRampToValueAtTime(0, start + 3.3);
        rustle.connect(lowpass).connect(fade).connect(bus);
        rustle.start(start);
      }
      return true;
    } catch { return false; }
  }, [hush]);

  useEffect(() => () => {
    hush();
    if (context.current) void context.current.close().catch(() => {});
  }, [hush]);
  return { play, hush };
}
