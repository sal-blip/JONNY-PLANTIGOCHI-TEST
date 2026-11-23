import React from 'react';
import './LeafReveal.css';

export default function LeafReveal({title}){
  return <div aria-hidden="true" className="leaf-reveal">
    <div className="leaf-pair">{['left','right'].map(side=>
      <div className={'opening-leaf '+side} key={side}><img src="/art/intro-leaf.webp" alt=""/></div>
    )}</div>
    {title && <strong>{title}</strong>}
  </div>;
}
