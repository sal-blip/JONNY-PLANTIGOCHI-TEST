import React, {forwardRef} from 'react';

// Anchor each path to the document clock, including cues revealed after a swipe.
function syncPulse(event) {
  if (event.animationName !== 'swipe-cue-rise') return;
  const pulse = event.target.getAnimations?.().find(animation => animation.animationName === event.animationName);
  if (pulse) pulse.startTime = 0;
}

const SwipeCue = forwardRef(function SwipeCue({hint, ...props}, ref) {
  return <button type="button" className="swipe-cue" ref={ref} title={hint} aria-description={hint} {...props}>
    <svg onAnimationStart={syncPulse} aria-hidden="true" focusable="false" viewBox="0 0 24 28" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 23 7-5 7 5"/>
      <path d="m5 16 7-5 7 5"/>
      <path d="m5 9 7-5 7 5"/>
    </svg>
  </button>;
});

export default SwipeCue;
