import React from 'react';
import './CareIndicator.css';

const labels={water:'Needs water',sun:'Ready for sunlight',food:'Needs plant food',talk:'Would like some company'};

export default function CareIndicator({icons}){
  return <div className="lcd-care-row" role="group" aria-label="Care needs">
    {Object.entries(labels).map(([kind,label])=>{
      const active=icons.includes(kind);
      return <span key={kind} className="lcd-care-slot" data-care-cue={active?kind:undefined} aria-hidden={!active}>
        <img src={'/art/care/'+kind+'.png'} width="32" height="32" alt={label} draggable="false"/>
      </span>;
    })}
  </div>;
}
