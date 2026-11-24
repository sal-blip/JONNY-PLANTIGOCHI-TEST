import React from 'react';
import { STAGES } from './game.js';

const poses = ['plant-pixel-rest', 'plant-pixel-active', 'plant-pixel-return'];
const cellWidth = 72;
const cellHeight = 28;

export default function CollectorSeedBody({species, stage, condition, severity}) {
  const wilt = stage !== 'seed' && (['dry','critical','rootRot'].includes(condition) || severity === 3);
  const row = STAGES.indexOf(stage);
  const sheet = '/art/collector-seeds/' + species + '.png';
  return <g className={wilt ? 'collector-seed-wilt' : 'plant-pixel-sway'}
    transform={wilt ? 'translate(0 6.5) scale(1 .75)' : undefined}>
    {(wilt ? poses.slice(0,1) : poses).map((pose,column) =>
      <g key={pose} className={wilt ? undefined : pose}>
        <svg width={cellWidth} height={cellHeight} overflow="hidden"
          viewBox={`${column*cellWidth} ${row*cellHeight} ${cellWidth} ${cellHeight}`}>
          <image href={sheet} width={cellWidth*3} height={cellHeight*5}/>
        </svg>
      </g>
    )}
  </g>;
}
