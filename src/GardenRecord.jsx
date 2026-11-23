import React, { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { Pause, Play } from 'lucide-react';

const recordUrl = './records/earth-day.m4a';
const recordGain = .56;
const listeners = new Set();
let deck = null;
let state = 'absent';

function publish(next) {
  if (state === next) return;
  state = next;
  for (const listener of listeners) listener();
}
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const readState = () => state;

export function GardenRecord({ soundEnabled=true, playing, onPlayingChange, active, musicVolume=1 }) {
  const audio = useRef(null);
  const output = useRef(null);
  const props = useRef(null);
  props.current = { soundEnabled, playing, onPlayingChange, active, musicVolume };

  useLayoutEffect(() => {
    if (output.current) {
      const {gain, context} = output.current;
      gain.gain.setTargetAtTime(recordGain * musicVolume, context.currentTime, .012);
    } else {
      audio.current.volume = recordGain * musicVolume;
    }
  }, [musicVolume]);

  useEffect(() => {
    const media = audio.current;
    const lifetime = new AbortController();
    let source = '', preparing = null, requested = false, attempt = 0;

    function connectOutput() {
      // iOS may leave HTMLMediaElement.volume under hardware control.
      // Set up this graph during the original Play gesture, once per record deck.
      if (!output.current) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio?.prototype.createMediaElementSource) return;
        let context;
        try {
          context = new Audio();
          const gain = context.createGain();
          gain.gain.value = recordGain * props.current.musicVolume;
          const input = context.createMediaElementSource(media);
          input.connect(gain);
          gain.connect(context.destination);
          output.current = {context, gain, input};
          media.volume = 1;
        } catch {
          void context?.close().catch(() => {});
          return;
        }
      }
      const {context} = output.current;
      if (context.state !== 'running') return context.resume();
    }

    function pause(notify = true) {
      const wasPlaying = requested || props.current.playing;
      requested = false;
      attempt++;
      if (!media.paused) media.pause();
      if (notify && wasPlaying) props.current.onPlayingChange(false);
    }
    function permitted() {
      return props.current.active && props.current.soundEnabled && !document.hidden;
    }
    async function loadFile() {
      try {
        const response = await fetch(recordUrl, { signal: lifetime.signal });
        if (!response.ok) throw new Error('Recording unavailable');
        const bytes = await response.blob();
        if (lifetime.signal.aborted) return false;
        // A local Blob URL lets WebKit seek in the precached file without HTTP ranges.
        source = URL.createObjectURL(new Blob([bytes], { type: 'audio/mp4' }));
        media.src = source;
        publish('ready');
        return true;
      } catch {
        if (!lifetime.signal.aborted) publish('unavailable');
        return false;
      } finally {
        preparing = null;
      }
    }
    function prepare() {
      if (source) return Promise.resolve(true);
      if (!preparing) {
        publish('loading');
        preparing = loadFile();
      }
      return preparing;
    }
    function start() {
      if (!source || !permitted()) return false;
      if (requested) return true;
      const current = ++attempt;
      requested = true;
      function failed() {
        if (attempt !== current || lifetime.signal.aborted) return;
        pause();
        publish('interrupted');
      }
      publish('ready');
      try {
        connectOutput()?.catch(failed);
        media.play()?.catch(failed);
      } catch { failed(); return false; }
      return true;
    }
    function sync() {
      if (!permitted()) { pause(); return; }
      if (!props.current.playing) { pause(false); return; }
      if (source) { start(); return; }
      void prepare().then(ready => {
        if (lifetime.signal.aborted || !props.current.playing) return;
        if (ready && permitted()) start();
        else pause();
      });
    }
    function mediaPaused() {
      if (media.paused && requested) pause();
    }
    function mediaError() {
      if (!source) return;
      pause();
      URL.revokeObjectURL(source);
      source = '';
      publish('unavailable');
    }
    const hidden = () => { if (document.hidden) pause(); };
    const leave = () => pause();
    const control = { prepare, start, pause, sync };
    deck = control;
    publish('idle');
    media.addEventListener('pause', mediaPaused);
    media.addEventListener('error', mediaError);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', leave);
    return () => {
      lifetime.abort();
      media.removeEventListener('pause', mediaPaused);
      media.removeEventListener('error', mediaError);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', leave);
      pause(false);
      media.removeAttribute('src');
      media.load();
      if (output.current) {
        const {context, gain, input} = output.current;
        input.disconnect();
        gain.disconnect();
        void context.close().catch(() => {});
        output.current = null;
      }
      if (source) URL.revokeObjectURL(source);
      if (deck === control) { deck = null; publish('absent'); }
    };
  }, []);

  useEffect(() => { deck?.sync(); }, [active, soundEnabled, playing]);
  return <audio ref={audio} preload="none" loop muted={!active || !soundEnabled || musicVolume===0} hidden />;
}

export function RecordControls({ soundEnabled, playing, onPlayingChange }) {
  const availability = useSyncExternalStore(subscribe, readState, readState);
  useEffect(() => {
    if (soundEnabled && availability === 'idle') void deck?.prepare();
  }, [soundEnabled, availability]);

  function toggle() {
    if (!deck) return;
    if (playing) { deck.pause(false); onPlayingChange(false); return; }
    if (!soundEnabled) return;
    if (availability === 'unavailable') { void deck.prepare(); return; }
    // Start from the button's original user gesture, including on mobile Safari.
    if (deck.start()) onPlayingChange(true);
  }
  const preparing = ['absent', 'idle', 'loading'].includes(availability);
  let status = playing ? 'Playing Earth Day.' : 'Record paused.';
  if (!soundEnabled) status = playing ? 'Playing silently. Raise Music in Settings to hear the record.' : 'Raise Music in Settings to hear the record.';
  else if (preparing) status = 'Preparing the recording…';
  else if (availability === 'unavailable') status = 'The recording could not load.';
  else if (availability === 'interrupted') status = 'Playback stopped. Tap Play to try again.';
  return <section className="garden-page" aria-label="Record player">
    <div><strong>Earth Day</strong><p>Jason Singh · 9 min 13 sec</p></div>
    <p>UK orchid biodata meets field recordings from Pennsylvania and Puerto Rico.</p>
    <div className="menu-items">
      <button type="button" onClick={toggle} disabled={!playing && (!soundEnabled || preparing)} aria-pressed={playing}>
        {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        {playing ? 'Pause record' : availability === 'unavailable' ? 'Retry loading record' : 'Play record'}
      </button>
    </div>
    <p className="room-guide" role="status">{status}</p>
    <p className="room-guide"><a href="./records/earth-day-credits.txt" target="_blank" rel="noreferrer">Recording credits · CC BY 4.0</a></p>
  </section>;
}

export default GardenRecord;
