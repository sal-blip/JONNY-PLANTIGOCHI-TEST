import React from 'react';
import {carnivoreFrames} from './carnivoreFrames.js';

const healthy = {
  'venus-flytrap':['#304934','#51763d','#91b94d','#ab4953','#ebbd73'],
  'cape-sundew':['#394733','#59713d','#849c4c','#aa4754','#f4cd8c'],
  'white-top-pitcher':['#334b3a','#596e46','#86a35c','#87505c','#efe2c2']
};
const thirsty = ['#544c3d','#78714b','#a5a05d','#a06c59','#d7bd8a'];
const seedInk = ['#423630','#74543f','#96735b','#a99062','#c6b28b'];
const frames = ['plant-pixel-rest','plant-pixel-active','plant-pixel-return'];

export default function CarnivorePlant({species,stage,condition,severity}){
  const wilt = ['dry','critical','rootRot'].includes(condition) || severity===3;
  const palette = stage==='seed'?seedInk:wilt?thirsty:healthy[species];
  const poses = carnivoreFrames[species][stage];
  const posture = wilt && stage!=='seed' ? 'translate(0 7) scale(1 .72)' : undefined;
  return <g transform={posture} className={wilt?undefined:'plant-pixel-sway'}>
    {(wilt?poses.slice(0,1):poses).map((inks,i)=><g key={i} className={wilt?undefined:frames[i]}>
      {inks.map((path,j)=>path && <path key={j} d={path} fill={palette[j]}/>)}
    </g>)}
  </g>;
}
