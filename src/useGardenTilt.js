import { useEffect, useRef, useState } from 'react';

const radians = Math.PI / 180;
const fullTilt = Math.sin(18 * radians);
const motionQuery = '(prefers-reduced-motion: reduce)';
const preferenceKey = 'plantigochi.tilt';

// Screen axes follow the phone's initial pose, including when held upright.
// Projecting the screen normal avoids jumps at the Euler angle wraparound.
function orientationFrame({alpha, beta, gamma}) {
  const heading = Number.isFinite(alpha) ? alpha * radians : 0;
  const ca = Math.cos(heading), sa = Math.sin(heading);
  const cb = Math.cos(beta * radians), sb = Math.sin(beta * radians);
  const cg = Math.cos(gamma * radians), sg = Math.sin(gamma * radians);
  return {
    right: [ca * cg - sa * sb * sg, sa * cg + ca * sb * sg, -cb * sg],
    up: [-sa * cb, ca * cb, sb],
    normal: [ca * sg + sa * sb * cg, sa * sg - ca * sb * cg, cb * cg],
  };
}

function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function bounded(value) {
  const scaled = value / fullTilt;
  return Math.abs(scaled) < 0.02 ? 0 : Math.max(-1, Math.min(1, scaled));
}

function initialPreference() {
  try { return localStorage.getItem(preferenceKey) !== 'off'; } catch { return true; }
}

export function useGardenTilt(paused) {
  const garden = useRef(null);
  const supported = window.isSecureContext && typeof window.DeviceOrientationEvent !== 'undefined';
  const needsPermission = typeof window.DeviceOrientationEvent?.requestPermission === 'function';
  const [enabled, setEnabled] = useState(initialPreference);
  const [permission, setPermission] = useState(needsPermission ? 'ask' : 'granted');
  const [requesting, setRequesting] = useState(false);
  const [reduced, setReduced] = useState(() => !!window.matchMedia?.(motionQuery).matches);
  const listening = supported && enabled && !reduced && !paused && permission !== 'denied';

  useEffect(() => {
    const media = window.matchMedia?.(motionQuery);
    const change = event => setReduced(event.matches);
    media?.addEventListener('change', change);
    return () => media?.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    const el = garden.current;
    if (!el || !listening) return;
    let neutral = null, previousAngle, hadHeading, frame = 0, x = 0, y = 0;
    function reset() {
      neutral = null;
      cancelAnimationFrame(frame); frame = 0;
      el.style.removeProperty('--tilt-x'); el.style.removeProperty('--tilt-y');
    }
    function paint() {
      frame = 0;
      el.style.setProperty('--tilt-x', x.toFixed(3));
      el.style.setProperty('--tilt-y', y.toFixed(3));
    }
    function read(event) {
      if (document.hidden || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      const angle = window.screen.orientation?.angle ?? window.orientation ?? 0;
      const hasHeading = Number.isFinite(event.alpha);
      const pose = orientationFrame(event);
      if (!neutral || previousAngle !== angle || hadHeading !== hasHeading) {
        reset();
        neutral = pose; previousAngle = angle; hadHeading = hasHeading;
        // Some browsers resume an earlier sensor grant without another prompt.
        if (needsPermission) setPermission('granted');
        return;
      }
      const dx = dot(neutral.right, pose.normal), dy = -dot(neutral.up, pose.normal);
      const cos = Math.cos(angle * radians), sin = Math.sin(angle * radians);
      x = bounded(dx * cos + dy * sin);
      y = bounded(dy * cos - dx * sin);
      if (!frame) frame = requestAnimationFrame(paint);
    }
    function visibility() {
      window.removeEventListener('deviceorientation', read);
      reset();
      if (!document.hidden) window.addEventListener('deviceorientation', read, {passive:true});
    }
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('deviceorientation', read);
      reset();
    };
  }, [listening, needsPermission]);

  async function toggle() {
    if (!supported || reduced || requesting) return;
    const next = !enabled || permission !== 'granted';
    if (next && needsPermission && permission !== 'granted') {
      setRequesting(true);
      try {
        const grant = await window.DeviceOrientationEvent.requestPermission();
        setPermission(grant === 'granted' ? 'granted' : 'denied');
        if (grant !== 'granted') return;
      } catch {
        setPermission('denied');
        return;
      } finally { setRequesting(false); }
    }
    setEnabled(next);
    try { localStorage.setItem(preferenceKey, next ? 'on' : 'off'); } catch { /* Session preference still applies. */ }
  }
  let label = enabled ? 'On' : 'Off';
  if (!supported) label = 'Unavailable';
  else if (reduced) label = 'Reduced motion';
  else if (requesting) label = 'Requesting…';
  else if (permission === 'denied') label = 'Retry';
  else if (permission === 'ask' && enabled) label = 'Allow';
  return {
    garden, toggle, label, active: supported && !reduced && enabled && permission === 'granted',
    disabled: !supported || reduced || requesting,
    denied: supported && !reduced && permission === 'denied',
  };
}
