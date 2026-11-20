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

// Device X points right and device Y points toward the top edge. Project
// world-down onto the display from pitch and roll; compass heading cancels out.
export function screenGravity(beta, gamma, angle = 0) {
  const pitch = beta * radians, roll = gamma * radians, rotation = angle * radians;
  const right = Math.cos(pitch) * Math.sin(roll), down = Math.sin(pitch);
  return { x: right * Math.cos(rotation) + down * Math.sin(rotation),
    y: down * Math.cos(rotation) - right * Math.sin(rotation), z: -Math.cos(pitch) * Math.cos(roll) };
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
    if (media) setReduced(media.matches);
    return () => media?.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    const el = garden.current;
    if (!el || !listening) return;
    let neutral = null, previousAngle, hadHeading, frame = 0, x = 0, y = 0;
    let gravity = null, lastSample = null, flickReference = null, lastFlick = -Infinity, accelerationBaseline = null;
    function emit(detail) { el.dispatchEvent(new CustomEvent('plantigochi-gravity',{detail,bubbles:true})); }
    function impulse(vector, time) {
      if (time-lastFlick < 185) return;
      lastFlick=time;
      el.dispatchEvent(new CustomEvent('plantigochi-chain-flick',{detail:vector,bubbles:true}));
    }
    function motion(event) {
      if (document.hidden) return;
      let a=event.acceleration;
      const valid = value => value && [value.x,value.y,value.z].every(Number.isFinite);
      if (!valid(a)) {
        const raw=event.accelerationIncludingGravity;
        if(!valid(raw)) return;
        if(!accelerationBaseline) { accelerationBaseline={x:raw.x,y:raw.y,z:raw.z};return; }
        a={x:0,y:0,z:0};
        for(const axis of ['x','y','z']) {
          a[axis]=raw[axis]-accelerationBaseline[axis];
          accelerationBaseline[axis]+=.19*a[axis];
        }
      }
      if(Math.hypot(a.x,a.y,a.z)<5.5) return;
      const angle=(window.screen.orientation?.angle ?? window.orientation ?? 0)*radians;
      // Real device acceleration points opposite to inertial travel. Device
      // Y points toward the top, while the SVG's Y points toward the bottom.
      const right=-a.x, down=a.y, strength=26;
      impulse({x:(right*Math.cos(angle)+down*Math.sin(angle))*strength,
        y:(down*Math.cos(angle)-right*Math.sin(angle))*strength,z:-a.z*strength},performance.now());
    }
    function reset() {
      neutral = null; lastSample = null; gravity = null; x = 0; y = 0;
      flickReference=null; lastFlick=-Infinity; accelerationBaseline=null;
      cancelAnimationFrame(frame); frame = 0;
      el.style.removeProperty('--tilt-x'); el.style.removeProperty('--tilt-y');
      emit({x:0,y:0,active:false});
    }
    function paint() {
      frame = 0;
      if (gravity) emit({...gravity,active:true});
      el.style.setProperty('--tilt-x', x.toFixed(3));
      el.style.setProperty('--tilt-y', y.toFixed(3));
    }
    function read(event) {
      if (document.hidden || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
      const angle = window.screen.orientation?.angle ?? window.orientation ?? 0;
      const hasHeading = Number.isFinite(event.alpha);
      const pose = orientationFrame(event);
      lastSample = {alpha:event.alpha,beta:event.beta,gamma:event.gamma};
      const now=Number.isFinite(event.timeStamp)?event.timeStamp:performance.now();
      gravity = screenGravity(event.beta,event.gamma,angle);
      if (!neutral || previousAngle !== angle || hadHeading !== hasHeading) {
        x = 0; y = 0;
        if (!frame) frame = requestAnimationFrame(paint);
        neutral = pose; previousAngle = angle; hadHeading = hasHeading;
        flickReference={...gravity,time:now};
        // Some browsers resume an earlier sensor grant without another prompt.
        if (needsPermission) setPermission('granted');
        return;
      }
      // Measure angular travel over a short interval. At 120 Hz even a
      // brisk wrist movement produces only a few degrees in any one event.
      const seconds=(now-flickReference.time)/1000;
      if(seconds>=.032) {
        const dx=gravity.x-flickReference.x, dy=gravity.y-flickReference.y, dz=gravity.z-flickReference.z;
        if(seconds<.17 && Math.hypot(dx,dy,dz)/seconds>3.3)
          impulse({x:dx*35/seconds,y:dy*35/seconds,z:dz*35/seconds},performance.now());
        flickReference={...gravity,time:now};
      }
      const dx = dot(neutral.right, pose.normal), dy = -dot(neutral.up, pose.normal);
      const cos = Math.cos(angle * radians), sin = Math.sin(angle * radians);
      x = bounded(dx * cos + dy * sin);
      y = bounded(dy * cos - dx * sin);
      if (!frame) frame = requestAnimationFrame(paint);
    }
    function visibility() {
      window.removeEventListener('deviceorientation', read);
      window.removeEventListener('devicemotion', motion);
      reset();
      if (!document.hidden) {
        window.addEventListener('deviceorientation', read, {passive:true});
        window.addEventListener('devicemotion', motion, {passive:true});
      }
    }
    function rotate() { if (lastSample) read(lastSample); }
    window.screen.orientation?.addEventListener?.('change',rotate);
    window.addEventListener('orientationchange',rotate);
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.screen.orientation?.removeEventListener?.('change',rotate);
      window.removeEventListener('orientationchange',rotate);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('deviceorientation', read);
      window.removeEventListener('devicemotion', motion);
      reset();
    };
  }, [listening, needsPermission]);

  async function toggle() {
    if (!supported || reduced || requesting) return;
    const next = !enabled || permission !== 'granted';
    if (next && needsPermission && permission !== 'granted') {
      setRequesting(true);
      try {
        const grants=[window.DeviceOrientationEvent.requestPermission()];
        if(typeof window.DeviceMotionEvent?.requestPermission==='function')
          grants.push(Promise.resolve(window.DeviceMotionEvent.requestPermission()).catch(()=>null));
        const [grant] = await Promise.all(grants);
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
