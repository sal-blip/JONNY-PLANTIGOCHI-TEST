import React, {forwardRef} from 'react';

const SwipeCue = forwardRef(function SwipeCue({hint, ...props}, ref) {
  return <button type="button" className="swipe-cue" ref={ref} title={hint} aria-description={hint} {...props}>
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 28" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 23 7-5 7 5"/>
      <path d="m5 16 7-5 7 5"/>
      <path d="m5 9 7-5 7 5"/>
    </svg>
  </button>;
});

export default SwipeCue;
