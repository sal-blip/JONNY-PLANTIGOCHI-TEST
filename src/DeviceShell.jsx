import React, { useEffect, useId, useRef } from 'react';
import { EYELET, LINK, RING, dragChain, flickChain, gripChain, outsideLeafPath, partPose, hangingGravity, releaseChain, restingChain, stepChain } from './chainMotion.js';
import './DeviceShell.css';

// Each atlas region maps back to the original 600 × 565 moulding coordinates.
const moulding = {
  'case-surface': { x: 0, y: 0, width: 600, height: 565, crop: '0 0 360 339' },
  'case-detail': { x: 0, y: 0, width: 600, height: 565, crop: '0 339 360 339' },
  'silver-ring': { x: 96, y: 18, width: 100, height: 98, crop: '0 680 65 64' },
  chainLink: { x: -10, y: -20, width: 20, height: 40, crop: '67 681 14 28' },
  'eyelet-pin': { x: 200, y: 137, width: 18, height: 14, crop: '83 682 12 10' },
};

function MaterialPart({ name, transform }) {
  const { crop, ...bounds } = moulding[name];
  return <g transform={transform}>
    <svg {...bounds} viewBox={crop} preserveAspectRatio="none" overflow="hidden">
      <image href="/art/toy-moulding.png" width="360" height="744" className="toy-material"/>
    </svg>
  </g>;
}

const indices=Array.from({length:RING},(_,i)=>i+1);
const initial=restingChain();

function HardwareParts({layer, hits=false}) {
  return <g className={hits?'chain-hit-shapes':'device-hardware'}>{indices.map(i=>{
    const pose=partPose(initial,i);
    const visible=(layer==='back')===pose.back;
    return <g key={i} data-chain-part={i} data-side={layer}
      visibility={visible?'visible':'hidden'} transform={pose.transform}>
      {i===RING ?
        <g transform="scale(.76 .75) rotate(-31)">
          {hits ? <ellipse className="chain-grab ring-grab" data-grab={i} rx="44" ry="37" strokeWidth="13"/> :
            <g transform="rotate(31) translate(-146 -67)"><MaterialPart name="silver-ring"/></g>}
        </g> :
        hits ? <path className="chain-grab" data-grab={i} d={`M0 ${-LINK/2}v${LINK}`} strokeWidth="12" /> :
          <MaterialPart name="chainLink" transform={`scale(${i%2 ? .8 : .49} ${(LINK+6.5)/30})`}/>}
    </g>;
  })}</g>;
}

function useHardware(frontRef) {
  useEffect(()=>{
    const svg=frontRef.current, device=svg?.closest('.device'), garden=svg?.closest('.garden');
    if(!device||!garden)return;
    const parts=[...device.querySelectorAll('[data-chain-part]')];
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let chain=restingChain(), gravity=hangingGravity(0,1,0), frame=0, last=null, pointer=null;
    let usingSensors=false;
    function paint() {
      const poses=indices.map(i=>partPose(chain,i));
      for(const el of parts) {
        const pose=poses[Number(el.dataset.chainPart)-1];
        const visibility=(el.dataset.side==='back')===pose.back?'visible':'hidden';
        if(el.getAttribute('visibility')!==visibility) el.setAttribute('visibility',visibility);
        if(visibility==='visible' && el.getAttribute('transform')!==pose.transform) el.setAttribute('transform',pose.transform);
      }
    }
    function stop() {cancelAnimationFrame(frame);frame=0;last=null;}
    function advance(time) {
      frame=0;
      const moving=stepChain(chain,gravity,last===null?1/60:(time-last)/1000);
      last=time;paint();
      if(moving&&!document.hidden&&!reduced?.matches)frame=requestAnimationFrame(advance);
      else last=null;
    }
    function wake() {
      if(!frame&&!document.hidden&&!reduced?.matches)frame=requestAnimationFrame(advance);
    }
    function restore() {stop();chain=restingChain();paint();}
    function orient({detail}) {
      if(!detail?.active){
        usingSensors=false;gravity=hangingGravity(0,1,0);
        if(!document.hidden && !reduced?.matches){chain.quiet=0;wake();}
        return;
      }
      if(document.hidden || reduced?.matches)return;
      const next=hangingGravity(detail.x,detail.y,detail.z);
      if(usingSensors && Math.hypot(next.x-gravity.x,next.y-gravity.y,next.z-gravity.z)<.016)return;
      usingSensors=true;gravity=next;chain.quiet=0;wake();
    }
    function impulse({detail}) {
      if(document.hidden||reduced?.matches||!detail)return;
      flickChain(chain,detail.x,detail.y,detail.z);wake();
    }
    function localPoint(event) {
      const matrix=svg.getScreenCTM();
      if(!matrix)return null;
      const point=svg.createSVGPoint();
      point.x=event.clientX;point.y=event.clientY;
      return point.matrixTransform(matrix.inverse());
    }
    function down(event) {
      if(pointer||event.button!==0||!event.isPrimary)return;
      const target=event.target.closest?.('[data-grab], [data-retrieve]');
      if(!target)return;
      const point=localPoint(event);
      if(!point)return;
      event.preventDefault();event.stopPropagation();
      const eyelet=target.hasAttribute('data-retrieve');
      if(eyelet) restore();
      const index=eyelet?RING:Number(target.dataset.grab);
      const node=chain.points[index];
      gripChain(chain,index,event.timeStamp);
      pointer={id:event.pointerId,dx:node.x-point.x,dy:node.y-point.y,clientX:event.clientX,clientY:event.clientY};
      svg.setPointerCapture(event.pointerId);
      svg.classList.add('chain-held');
    }
    function move(event) {
      if(!pointer||pointer.id!==event.pointerId)return;
      const point=localPoint(event);if(!point)return;
      event.preventDefault();event.stopPropagation();
      pointer.clientX=event.clientX;pointer.clientY=event.clientY;
      dragChain(chain,point.x+pointer.dx,point.y+pointer.dy,event.timeStamp);
      paint();wake();
    }
    function end(event) {
      if(!pointer||pointer.id!==event.pointerId)return;
      // Mobile browsers can report the last stretch of a swipe only on lift.
      if(event.type==='pointerup' && (event.clientX!==pointer.clientX || event.clientY!==pointer.clientY)) move(event);
      const id=pointer.id;pointer=null;
      releaseChain(chain,event.timeStamp,!!reduced?.matches||event.type!=='pointerup');
      svg.classList.remove('chain-held');
      if(svg.hasPointerCapture(id))svg.releasePointerCapture(id);
      if(reduced?.matches)restore();else wake();
    }
    function cancelInteraction() {
      if(pointer){const id=pointer.id;pointer=null;releaseChain(chain,0,true);
        if(svg.hasPointerCapture(id))svg.releasePointerCapture(id);}
      svg.classList.remove('chain-held');stop();
    }
    function key(event) {
      if(!event.target.closest?.('[data-retrieve]')||!['Enter',' '].includes(event.key))return;
      event.preventDefault();event.stopPropagation();restore();
    }
    function visible() {if(document.hidden)cancelInteraction();else if(reduced?.matches)restore();else wake();}
    function preference() {cancelInteraction();if(reduced?.matches)restore();else wake();}
    device.addEventListener('pointerdown',down);svg.addEventListener('pointermove',move);
    svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
    svg.addEventListener('lostpointercapture',end);svg.addEventListener('keydown',key);
    garden.addEventListener('plantigochi-gravity',orient);garden.addEventListener('plantigochi-chain-flick',impulse);
    document.addEventListener('visibilitychange',visible);reduced?.addEventListener('change',preference);
    return ()=>{
      device.removeEventListener('pointerdown',down);svg.removeEventListener('pointermove',move);
      svg.removeEventListener('pointerup',end);svg.removeEventListener('pointercancel',end);
      svg.removeEventListener('lostpointercapture',end);svg.removeEventListener('keydown',key);
      garden.removeEventListener('plantigochi-gravity',orient);garden.removeEventListener('plantigochi-chain-flick',impulse);
      document.removeEventListener('visibilitychange',visible);reduced?.removeEventListener('change',preference);cancelInteraction();
    };
  },[frontRef]);
}

export default function DeviceShell() {
  const id = useId();
  const frontRef=useRef(null);
  useHardware(frontRef);
  const ref = name => `url(#${id}-${name})`;
  return (<>
    <svg className="shell device-shell" viewBox="0 0 600 565"
      aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={`${id}-leaf`}><use href="/art/device.svg#leaf"/></clipPath>
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
      <HardwareParts layer="back"/>
      <MaterialPart name="case-surface" />
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
      <MaterialPart name="case-detail" />
    </svg>
    <svg className="device-chain-front" ref={frontRef} viewBox="0 0 600 565"
      xmlns="http://www.w3.org/2000/svg" aria-label="Plantigochi keychain">
      <defs><clipPath id={`${id}-outside`}><path d={outsideLeafPath} clipRule="evenodd" /></clipPath></defs>
      <HardwareParts layer="front"/>
      <MaterialPart name="eyelet-pin" />
      <g clipPath={ref('outside')} aria-hidden="true"><HardwareParts layer="back" hits/></g>
      <g aria-hidden="true"><HardwareParts layer="front" hits/></g>
      <circle className="chain-eyelet" data-retrieve="" cx={EYELET.x} cy={EYELET.y} r="9"
        tabIndex="0" role="button" aria-label="Bring the keyring back to the front"/>
    </svg>
  </>);
}
