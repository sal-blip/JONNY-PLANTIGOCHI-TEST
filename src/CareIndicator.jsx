import React from 'react';
import './CareIndicator.css';

export const cueLabels={water:'Needs water',food:'Needs plant food',talk:'Would like some company'};
const drop='M4 0h2v2h1v2h1v1h1v4H8v1H7v1H3v-1H2V9H1V5h1V4h1V2h1z';
const heart='M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z';

// The LCD's pot rim sits at (24,25) to (47,25) in the 72 × 40 sprite view.
export default function CareIndicator({need,receipt}){
  const kind=receipt || need;
  if(!kind)return null;
  return <g aria-hidden="true" data-care-cue={kind} data-delivered={receipt?'yes':undefined} transform="translate(10 13)">
    {kind==='water' && <g className="care-drop">
      <path d={drop} fill={receipt?'#68c4d4':'none'} stroke="#286476" strokeWidth="1.4"/>
      {receipt?<path fill="#d8fffb" d="M3 5h1v3H3z"/>:<path fill="#88c4ca" d="M3 8h4v1H3z"/>}
    </g>}
    {kind==='talk' && <g className="care-bubble">
      <path d="M2 0h10v1h2v8h-2v4H10v-2H8v-1H2V9H0V2h2z" fill="#fff2de" stroke="#735754"/>
      <g transform="translate(3.5 2)"><path d={heart} fill={receipt?'#cf6881':'none'} stroke="#9b4961"/></g>
    </g>}
    {kind==='food' && <>
      <g className="care-spoon">
        <path d="M0 1h2v1h2v2h2v1h3V4h5v2h-1v2H8V7H6V6H4V5H3V4H2V3H0z" fill="#b8d6bf" stroke="#40645a"/>
        {!receipt && <path d="M8 3h2v2H8z M11 2h2v2h-2z" fill="#915733"/>}
      </g>
      {receipt && <g fill="#915733"><rect className="care-pellet" x="8" y="3" width="2" height="2"/><rect className="care-pellet second" x="11" y="2" width="2" height="2"/></g>}
    </>}
  </g>;
}
