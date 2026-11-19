import React, { useId } from 'react';
import './DeviceShell.css';

const artwork = '/art/device.svg';

function Part({ name, ...props }) {
  return <use href={`${artwork}#${name}`} {...props} />;
}

function Hardware() {
  // The nested pivots are the overlapping ends of neighbouring links in the
  // original shell drawing. Moving an upstream link also carries its children.
  return (
    <g className="device-hardware">
      <g className="device-hinge device-hinge-eyelet">
        <g className="device-hinge device-hinge-mid">
          <g className="device-hinge device-hinge-upper">
            <g className="device-hinge device-hinge-ring">
              <Part name="silver-ring" />
            </g>
            <Part name="chainLink" transform="translate(173.2 91.5) rotate(-33) scale(.81 .83)" />
            <Part name="chainLink" transform="translate(182.6 106.1) rotate(-24) scale(.52 .88)" />
          </g>
          <Part name="chainLink" transform="translate(191.1 119.9) rotate(-33) scale(.83 .89)" />
        </g>
        <Part name="chainLink" transform="translate(201.6 134.5) rotate(-29) scale(.60 .90)" />
      </g>
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
