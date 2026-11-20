import React, { useEffect, useId, useRef } from 'react';
import { chainJoints, jointRotation, projectedGravity, restingChain, stepChain } from './chainMotion.js';
import './DeviceShell.css';

const artwork = '/art/device.svg';

function Part({ name, ...props }) {
  return <use href={`${artwork}#${name}`} {...props} />;
}

// The eyelet, the curve supported by the front moulding, and the last point of
// contact with the shoulder are all fixed in the shell's own coordinate space.
const shoulder = [
  [208, 146], [197, 154], [183, 162], [168, 170], [152, 177],
  [136, 182], [121, 185],
];

function Link({ length, narrow }) {
  return <Part name="chainLink" transform={`translate(0 ${length / 2}) scale(${narrow ? .48 : .81} ${(length + 6.5) / 30})`} />;
}

function Tail({ index = 0 }) {
  const joint = chainJoints[index];
  const rotation = jointRotation(joint.rest, index ? chainJoints[index - 1].rest : 0);
  return (
    <g data-chain-joint="" transform={`rotate(${rotation})`}>
      {joint.length ? <>
        <g transform={`translate(0 ${joint.length})`}><Tail index={index + 1} /></g>
        <Link length={joint.length} narrow={index % 2 === 0} />
      </> : <g transform="scale(.76 .75) translate(-151 -29)"><Part name="silver-ring" /></g>}
    </g>
  );
}

function Hardware() {
  const hardware = useRef(null);
  useEffect(() => {
    const svg = hardware.current;
    const garden = svg?.closest('.garden');
    if (!garden) return;
    const joints = svg.querySelectorAll('[data-chain-joint]');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let chain = restingChain();
    let gravity = { x: 0, y: 0 };
    let frame = 0;
    let lastTime = null;

    function paint() {
      for (let i = 0; i < joints.length; i++) {
        const rotation = jointRotation(chain[i].angle, i ? chain[i - 1].angle : 0);
        joints[i].setAttribute('transform', `rotate(${rotation.toFixed(3)})`);
      }
    }
    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
      gravity = { x: 0, y: 0 };
      chain = restingChain();
      paint();
    }
    function advance(time) {
      frame = 0;
      const elapsed = lastTime === null ? 1 / 60 : (time - lastTime) / 1000;
      lastTime = time;
      const moving = stepChain(chain, gravity, elapsed);
      paint();
      if (moving) frame = requestAnimationFrame(advance);
      else lastTime = null;
    }
    function orient({ detail }) {
      if (!detail?.active || document.hidden || reduced?.matches) {
        reset();
        return;
      }
      const next = projectedGravity(detail.x, detail.y);
      if (Math.hypot(next.x - gravity.x, next.y - gravity.y) < .012) return;
      gravity = next;
      if (!frame) frame = requestAnimationFrame(advance);
    }
    function visibilityChanged() { if (document.hidden) reset(); }
    function preferenceChanged() { if (reduced?.matches) reset(); }

    garden.addEventListener('plantigochi-gravity', orient);
    document.addEventListener('visibilitychange', visibilityChanged);
    reduced?.addEventListener('change', preferenceChanged);
    return () => {
      cancelAnimationFrame(frame);
      garden.removeEventListener('plantigochi-gravity', orient);
      document.removeEventListener('visibilitychange', visibilityChanged);
      reduced?.removeEventListener('change', preferenceChanged);
    };
  }, []);

  const [x, y] = shoulder[shoulder.length - 1];
  return (
    <g className="device-hardware" ref={hardware}>
      <g transform={`translate(${x} ${y})`}><Tail /></g>
      {shoulder.slice(1).map(([endX, endY], i) => {
        const [startX, startY] = shoulder[i];
        const dx = endX - startX, dy = endY - startY;
        const degrees = Math.atan2(-dx, dy) * 180 / Math.PI;
        return <g key={i} transform={`translate(${startX} ${startY}) rotate(${degrees})`}>
          <Link length={Math.hypot(dx, dy)} narrow={i % 2 === 1} />
        </g>;
      })}
    </g>
  );
}

export default function DeviceShell() {
  const id = useId();
  const ref = name => `url(#${id}-${name})`;
  return (
    <svg className="shell device-shell" viewBox="0 0 600 565"
      aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={`${id}-leaf`}><Part name="leaf" /></clipPath>
        <radialGradient id={`${id}-pearl`}>
          <stop stopColor="#ffffdc" stopOpacity=".53" />
          <stop offset=".38" stopColor="#f5f7cb" stopOpacity=".31" />
          <stop offset=".75" stopColor="#f7ffdf" stopOpacity=".10" />
          <stop offset="1" stopColor="#f4fada" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-shade`}>
          <stop stopColor="#426c4c" stopOpacity=".30" />
          <stop offset=".49" stopColor="#537855" stopOpacity=".18" />
          <stop offset="1" stopColor="#739770" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-relief`} x1="0" y1="0" x2="1" y2=".8">
          <stop stopColor="#fffbe6" stopOpacity=".73" />
          <stop offset=".43" stopColor="#edf7cc" stopOpacity=".34" />
          <stop offset=".65" stopColor="#cfdfac" stopOpacity="0" />
        </linearGradient>
      </defs>
      <Part name="case-surface" />
      <g clipPath={ref('leaf')}>
        <g className="device-shell-light">
          <ellipse cx="184" cy="167" rx="141" ry="95" fill={ref('pearl')} />
          <ellipse cx="298" cy="129" rx="119" ry="57" fill={ref('pearl')} opacity=".46" />
          <ellipse cx="108" cy="332" rx="54" ry="98" fill={ref('pearl')} opacity=".46" />
        </g>
        <g className="device-shell-shade">
          <ellipse cx="452" cy="398" rx="122" ry="184" fill={ref('shade')} />
          <ellipse cx="310" cy="532" rx="207" ry="103" fill={ref('shade')} />
        </g>
        <path d="M125 189 Q145 159 179 145 M188 142 Q201 137 212 138 M324 126 Q335 121 348 122 M91 279 Q95 296 106 309"
          fill="none" stroke={ref('relief')} strokeWidth="2.7" strokeLinecap="round" opacity=".72" />
      </g>
      <Part name="case-detail" />
      <Hardware />
      <Part name="eyelet-pin" />
    </svg>
  );
}
