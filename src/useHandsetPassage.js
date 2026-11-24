import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';

// The handset slides above the garden. Its toy and tray share this surface.
const position = {garden: 0, phone: 1};
const controls = 'button, a, input, select, textarea, label, summary, iframe, canvas, dialog, [contenteditable]:not([contenteditable=false]), [role=button], [role=slider], [data-grab], [data-retrieve], .chain-grab, .device';
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const clamp = value => Math.max(0, Math.min(1, value));

function canStart(layer,target) {
  if (!target.closest || target.closest('[inert], dialog, [data-handset-no-pull]')) return false;
  const bezel=target.closest('[data-phone-bezel]');
  if(bezel)return !bezel.disabled;
  if(target.closest(controls) || !target.closest('.iseed-contents'))return false;
  // A downward gesture within scrolled app content belongs to the reader.
  for(let node=target;node && node!==layer;node=node.parentElement){
    if(node.scrollTop>1)return false;
  }
  return true;
}

function usable(element) {
  if (!element?.isConnected || typeof element.focus !== 'function' || element.disabled ||
      element.closest('[inert], [hidden], [aria-hidden=true]')) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
    rect.top < window.innerHeight && rect.left < window.innerWidth;
}

export function useHandsetPassage({blocked = false} = {}) {
  const initialSurface='garden';
  const rootRef = useRef(null);
  const options = useRef({blocked});
  const [surface, setSurface] = useState(initialSurface);
  const [transitioning, setTransitioning] = useState(false);
  const settled = useRef(initialSurface);
  const progress = useRef(position[initialSurface]);
  const finger = useRef(null);
  const animation = useRef(null);
  const previousFocus = useRef({});
  const pendingFocus = useRef(false);
  const suppressUntil = useRef(0);

  useLayoutEffect(() => { options.current = {blocked}; }, [blocked]);

  const draw = useCallback((value,initialize=false) => {
    const previous=progress.current;
    progress.current=value;
    const root=rootRef.current;
    if(!root)return;
    if(initialize || clamp(value)!==clamp(previous)){
      root.style.setProperty('--phone-offset',(1-clamp(value))*100+'%');
    }
  }, []);
  useLayoutEffect(() => { draw(progress.current,true); }, [draw]);

  const stopAnimation = useCallback(() => {
    if (animation.current) {
      const {from,to,start,duration,timer}=animation.current;
      clearTimeout(timer);
      const left=1-clamp((performance.now()-start)/duration);
      draw(to+(from-to)*left**3);
    }
    rootRef.current?.style.removeProperty('--passage-duration');
    animation.current = null;
    pendingFocus.current = false;
  }, [draw]);

  const rememberFocus = useCallback(origin => {
    const node = origin?.currentTarget || document.activeElement;
    if (node?.closest('[data-passage-surface]')?.dataset.passageSurface === settled.current && usable(node)) {
      previousFocus.current[settled.current] = node;
    }
  }, []);

  const finish = useCallback((next, focus = true) => {
    stopAnimation();
    settled.current = next;
    draw(position[next]);
    pendingFocus.current = focus;
    setSurface(next);
    setTransitioning(false);
  }, [draw, stopAnimation]);

  useLayoutEffect(() => {
    if (transitioning || !pendingFocus.current) return;
    pendingFocus.current = false;
    if (document.hidden || document.querySelector('dialog[open]')) return;
    const layer = rootRef.current?.querySelector('[data-passage-surface="' + surface + '"]');
    if (!layer) return;
    const previous = previousFocus.current[surface];
    const selectors = {
      garden: '[data-room-focus]',
      phone: '[data-phone-focus], [data-handset-focus]',
    };
    const candidates = [previous, ...layer.querySelectorAll(selectors[surface])];
    candidates.find(usable)?.focus({preventScroll: true});
  }, [surface, transitioning]);

  const go = useCallback((next, origin) => {
    if (!Object.hasOwn(position, next) || animation.current?.next === next) return;
    const to = position[next];
    if (!finger.current && !animation.current && settled.current===next && progress.current===to) {
      setTransitioning(false);return;
    }
    if (!animation.current && !finger.current?.claimed) rememberFocus(origin);
    finger.current = null;
    stopAnimation();
    const from = progress.current;
    if (reduced() || document.hidden || from === to || !rootRef.current) {
      finish(next);
      return;
    }
    setTransitioning(true);
    const root=rootRef.current;
    const duration=360*Math.sqrt(Math.abs(to-from));
    root.style.setProperty('--passage-duration',duration+'ms');
    draw(to);
    const run={next,from,to,start:performance.now(),duration,timer:0};
    animation.current=run;
    run.timer=setTimeout(()=>{if(animation.current===run)finish(next);},duration);
  }, [draw, finish, rememberFocus, stopAnimation]);

  const begin = useCallback((from, type, id, x, y, event) => {
    const layer = event.currentTarget;
    if (options.current.blocked || settled.current !== from || animation.current || finger.current ||
        !canStart(layer,event.target)) return;
    finger.current = {
      from, type, id, x, y, height: Math.max(1, layer.getBoundingClientRect().height),
      claimed: false,
    };
  }, []);

  const props = useMemo(() => {
    function handlers(from) {
      return {
        'data-passage-surface': from,
        onPointerDownCapture(event) {
          if (event.pointerType !== 'touch' && event.isPrimary && event.button === 0) {
            begin(from, 'pointer', event.pointerId, event.clientX, event.clientY, event);
          }
        },
        onTouchStartCapture(event) {
          if (event.touches.length !== 1) return;
          const point = event.touches[0];
          begin(from, 'touch', point.identifier, point.clientX, point.clientY, event);
        },
      };
    }
    return {phoneGestureProps: handlers('phone')};
  }, [begin]);

  useEffect(() => {
    function cancel() {
      const drag = finger.current;
      if (drag?.claimed) {
        suppressUntil.current = performance.now() + 500;
        go(drag.from);
      } else finger.current = null;
    }
    function move(event, point, type) {
      const drag = finger.current;
      if (!drag || drag.type !== type || (type === 'pointer' ? point.pointerId : point.identifier) !== drag.id) return;
      if (options.current.blocked || !event.cancelable) { cancel(); return; }
      const dy = point.clientY - drag.y;
      const dx = Math.abs(point.clientX - drag.x);
      const distance = dy;
      if (!drag.claimed) {
        const horizontal = dx > 7 && dx > Math.abs(dy);
        if (distance < -6 || horizontal) { finger.current = null; return; }
        if (distance < 6 || distance < dx * 1.25) return;
        rememberFocus();
        drag.claimed = true;
        setTransitioning(true);
      }
      event.preventDefault();
      if (!reduced()) {
        const start = position[drag.from];
        const fraction = clamp(distance / drag.height);
        draw(start + (position.garden - start) * fraction);
      }
    }
    function end(point, type, event) {
      const drag = finger.current;
      if (!drag || drag.type !== type || (type === 'pointer' ? point.pointerId : point.identifier) !== drag.id) return;
      if (!drag.claimed) { finger.current = null; return; }
      suppressUntil.current = performance.now() + 500;
      const distance = point.clientY - drag.y;
      const enough = distance >= Math.max(42, Math.min(100, drag.height * .16));
      const next='garden';
      if(enough && !options.current.blocked){
        finger.current=null;
        go(next);
      }else go(drag.from);
    }
    function pointerMove(event) {
      if (finger.current?.type !== 'pointer') return;
      if (!(event.buttons & 1)) { cancel(); return; }
      move(event, event, 'pointer');
    }
    function touchMove(event) {
      const drag = finger.current;
      if (!drag) return;
      if (event.touches.length !== 1) { cancel(); return; }
      if (drag.type === 'touch') move(event, event.touches[0], 'touch');
      // Prevent a handled room swipe from swallowing the next real tap in
      // Chromium. Pointer events alone don't cancel native touch scrolling.
      else if (drag.claimed && event.cancelable) event.preventDefault();
    }
    function touchStart(event) {
      pointerStart();
      if (event.touches.length > 1) cancel();
    }
    function pointerStart() {
      suppressUntil.current = 0;
      // Moving focus after a swipe can make a fresh document draw a keyboard ring.
      rootRef.current?.setAttribute('data-pointer-navigation', '');
    }
    function keyboardStart() { rootRef.current?.removeAttribute('data-pointer-navigation'); }
    function click(event) {
      if (event.detail && performance.now() < suppressUntil.current) {
        suppressUntil.current = 0;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    function pointerEnd(event) { end(event, 'pointer', event); }
    function touchEnd(event) { for (const point of event.changedTouches) end(point, 'touch', event); }
    function interrupt() {
      cancel();
      if (animation.current) finish(animation.current.next);
    }
    function windowBlur(event) { if (event.target === window) interrupt(); }
    function pointerCancel(event) {
      if (finger.current?.type === 'pointer' && event.pointerId === finger.current.id) cancel();
    }
    function visibility() { if (document.hidden) interrupt(); }
    function motionChange(event) { if (event.matches) interrupt(); }
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    motion?.addEventListener?.('change', motionChange);
    // A claimed gesture continues even when the source panel becomes inert.
    const listeners = [
      [window, 'keydown', keyboardStart], [window, 'pointerdown', pointerStart], [window, 'pointermove', pointerMove, false],
      [window, 'pointerup', pointerEnd], [window, 'pointercancel', pointerCancel],
      [window, 'touchstart', touchStart], [window, 'touchmove', touchMove, false],
      [window, 'touchend', touchEnd], [window, 'touchcancel', cancel],
      [window, 'click', click, false], [window, 'blur', windowBlur], [document, 'visibilitychange', visibility],
    ];
    for (const [node, name, listener, passive = true] of listeners) {
      node.addEventListener(name, listener, {capture: true, passive});
    }
    return () => {
      for (const [node, name, listener] of listeners) node.removeEventListener(name, listener, true);
      motion?.removeEventListener?.('change', motionChange);
      finger.current = null;
      stopAnimation();
    };
  }, [draw, finish, go, rememberFocus, stopAnimation]);

  useLayoutEffect(() => {
    if (!blocked || !finger.current) return;
    if (finger.current.claimed) go(finger.current.from);
    else finger.current = null;
  }, [blocked, go]);

  return {rootRef, surface, transitioning, go, ...props};
}
