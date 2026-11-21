import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';

const bezel = '[data-phone-bezel]';
const wallpaper = '[data-phone-wallpaper], [data-handset-pull], .iseed-home, .pocket-floor';
const panel = '[data-phone-scroll], [data-handset-scroll], .iseed-contents';
const controls = 'button, a, input, select, textarea, label, summary, iframe, canvas, dialog, [contenteditable]:not([contenteditable=false]), [role=button], [role=slider], [data-grab], [data-retrieve], .chain-grab, .device';
const clamp = value => Math.max(0, Math.min(1, value));
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const durationFor = distance => 360 * Math.sqrt(distance);

// A scroller must have been at its top when the finger first landed. Reaching
// the top partway through a scroll should never turn that scroll into a pull.
function canStart(layer, target, x, y) {
  if (!layer?.contains(target) || !target.closest || target.closest('[data-handset-no-pull]')) return false;
  const handle = target.closest(bezel);
  // The bezel is itself the accessible put-down button. A tap uses its native
  // action. Only a directional drag takes ownership and suppresses that click.
  if (handle) return !handle.disabled;
  if (target.closest(controls)) return false;
  if (!target.closest(wallpaper + ', ' + panel)) return false;
  for (let node = target; node && node !== layer; node = node.parentElement) {
    if (node.scrollTop > 1) return false;
  }
  // The toy shell deliberately passes pointer events through to its wallpaper.
  // Keep the visible LCD, keys and central body out of the wallpaper gesture.
  const toy = target.closest('.pocket-floor, [data-phone-wallpaper]')?.querySelector('.device');
  if (toy) {
    const rect = toy.getBoundingClientRect();
    const localX = (x - rect.left) / rect.width;
    const localY = (y - rect.top) / rect.height;
    if (localX >= .27 && localX <= .73 && localY >= .30 && localY <= .86) return false;
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

export function useHandsetPassage({blocked = false, onLower, onRaise} = {}) {
  const phoneRef = useRef(null);
  const options = useRef({blocked, onLower, onRaise});
  const [raised, setRaised] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const settled = useRef(true);
  const progress = useRef(0);
  const finger = useRef(null);
  const animation = useRef(null);
  const focusFrame = useRef(0);
  const previousFocus = useRef({phone: null, room: null});
  const pendingFocus = useRef(false);
  const suppressUntil = useRef(0);

  useLayoutEffect(() => { options.current = {blocked, onLower, onRaise}; }, [blocked, onLower, onRaise]);

  const draw = useCallback(value => {
    progress.current = value;
    if (phoneRef.current) phoneRef.current.style.transform = 'translate3d(0,' + value * 100 + '%,0)';
  }, []);

  const stopAnimation = useCallback(() => {
    if (animation.current) cancelAnimationFrame(animation.current.frame);
    animation.current = null;
    cancelAnimationFrame(focusFrame.current);
    pendingFocus.current = false;
  }, []);

  const rememberFocus = useCallback(origin => {
    const node = origin?.currentTarget || document.activeElement;
    if (!node || node === document.body || !phoneRef.current) return;
    const onPhone = phoneRef.current.contains(node);
    if (onPhone === settled.current && usable(node)) previousFocus.current[onPhone ? 'phone' : 'room'] = node;
  }, []);

  const finish = useCallback((up, focus = true) => {
    stopAnimation();
    const changed = settled.current !== up;
    settled.current = up;
    draw(up ? 0 : 1);
    pendingFocus.current = focus;
    setRaised(up);
    setTransitioning(false);
    if (changed) (up ? options.current.onRaise : options.current.onLower)?.();
  }, [draw, stopAnimation]);

  // Wait for React to remove inert from the destination, including in reduced
  // motion mode where there may be no intervening animation frame at all.
  useLayoutEffect(() => {
    if (transitioning || !pendingFocus.current) return;
    focusFrame.current = requestAnimationFrame(() => {
      pendingFocus.current = false;
      if (document.hidden || document.querySelector('dialog[open]')) return;
      const layer = phoneRef.current;
      if (!layer) return;
      const surface = raised ? layer : document;
      const candidates = [
        previousFocus.current[raised ? 'phone' : 'room'],
        surface.querySelector(raised ? '[data-handset-focus]' : '[data-room-focus]'),
        ...surface.querySelectorAll(raised ? '.toy-heart' : '[data-room-phone]'),
      ];
      const target = candidates.find(node => usable(node) && layer.contains(node) === raised);
      target?.focus({preventScroll: true});
    });
    return () => cancelAnimationFrame(focusFrame.current);
  }, [raised, transitioning]);

  const travel = useCallback((up, origin) => {
    const to = up ? 0 : 1;
    if (animation.current?.up === up) return;
    if (!finger.current && !animation.current && progress.current === to) return;
    if (!animation.current && !finger.current?.claimed) rememberFocus(origin);
    finger.current = null;
    stopAnimation();
    const from = progress.current;
    if (reduced() || document.hidden || from === to || !phoneRef.current) {
      finish(up);
      return;
    }
    setTransitioning(true);
    const start = performance.now();
    const duration = durationFor(Math.abs(to - from));
    const run = {up, frame: 0};
    animation.current = run;
    function tick(now) {
      if (animation.current !== run) return;
      const t = clamp((now - start) / duration);
      if (t === 1) { finish(up); return; }
      draw(from + (to - from) * (1 - (1 - t) ** 3));
      run.frame = requestAnimationFrame(tick);
    }
    run.frame = requestAnimationFrame(tick);
  }, [draw, finish, rememberFocus, stopAnimation]);

  const raise = useCallback(event => travel(true, event), [travel]);
  const lower = useCallback(event => travel(false, event), [travel]);
  const resetRaised = useCallback(() => {
    finger.current = null;
    finish(true, false);
  }, [finish]);

  const begin = useCallback((type, id, x, y, target) => {
    suppressUntil.current = 0;
    const layer = phoneRef.current;
    if (options.current.blocked || !settled.current || animation.current ||
        !canStart(layer, target, x, y)) return;
    finger.current = {type, id, x, y, height: Math.max(1, layer.getBoundingClientRect().height), claimed: false};
  }, []);

  const gestureProps = useMemo(() => ({
    onPointerDownCapture(event) {
      if (event.pointerType !== 'touch' && event.isPrimary && event.button === 0) {
        begin('pointer', event.pointerId, event.clientX, event.clientY, event.target);
      }
    },
    onTouchStartCapture(event) {
      if (event.touches.length !== 1) return;
      const point = event.touches[0];
      begin('touch', point.identifier, point.clientX, point.clientY, event.target);
    },
  }), [begin]);

  useEffect(() => {
    function cancel() {
      const drag = finger.current;
      if (drag?.claimed) {
        // Keep the gesture present through travel so a zero-distance cancel
        // still clears transitioning in reduced motion.
        suppressUntil.current = performance.now() + 500;
        travel(true);
      } else {
        finger.current = null;
      }
    }
    function move(event, point, type) {
      const drag = finger.current;
      if (!drag || drag.type !== type || (type === 'pointer' ? point.pointerId : point.identifier) !== drag.id) return;
      if (options.current.blocked || !event.cancelable) { cancel(); return; }
      const dy = point.clientY - drag.y;
      const dx = Math.abs(point.clientX - drag.x);
      if (!drag.claimed) {
        if (dy < -6 || (dx > 7 && dx > Math.abs(dy))) { finger.current = null; return; }
        if (dy < 6 || dy < dx * 1.25) return;
        rememberFocus();
        drag.claimed = true;
        setTransitioning(true);
      }
      event.preventDefault();
      if (!reduced()) draw(clamp(dy / drag.height));
    }
    function end(point, type) {
      const drag = finger.current;
      if (!drag || drag.type !== type || (type === 'pointer' ? point.pointerId : point.identifier) !== drag.id) return;
      if (!drag.claimed) { finger.current = null; return; }
      suppressUntil.current = performance.now() + 500;
      const enough = point.clientY - drag.y >= Math.max(42, Math.min(100, drag.height * .16));
      travel(!enough || options.current.blocked);
    }
    function pointerMove(event) {
      if (finger.current?.type !== 'pointer') return;
      if (!(event.buttons & 1)) { cancel(); return; }
      move(event, event, 'pointer');
    }
    function touchMove(event) {
      if (finger.current?.type !== 'touch') return;
      if (event.touches.length !== 1) { cancel(); return; }
      move(event, event.touches[0], 'touch');
    }
    function touchStart(event) {
      suppressUntil.current = 0;
      if (event.touches.length > 1) cancel();
    }
    function pointerStart() { suppressUntil.current = 0; }
    function click(event) {
      if (event.detail && performance.now() < suppressUntil.current) {
        suppressUntil.current = 0;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    function pointerEnd(event) { end(event, 'pointer'); }
    function touchEnd(event) {
      for (const point of event.changedTouches) end(point, 'touch');
    }
    function interrupt() {
      cancel();
      if (animation.current) finish(animation.current.up);
    }
    function windowBlur(event) { if (event.target === window) interrupt(); }
    function pointerCancel(event) {
      if (finger.current?.type === 'pointer' && event.pointerId === finger.current.id) cancel();
    }
    function visibility() { if (document.hidden) interrupt(); }
    function motionChange(event) { if (event.matches) interrupt(); }
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    motion?.addEventListener?.('change', motionChange);
    // Once a drag is claimed the handset may become inert. Window listeners
    // continue observing its original finger/mouse even outside the handset.
    const listeners = [
      [window, 'pointerdown', pointerStart], [window, 'pointermove', pointerMove, false],
      [window, 'pointerup', pointerEnd], [window, 'pointercancel', pointerCancel],
      [window, 'touchstart', touchStart], [window, 'touchmove', touchMove, false],
      [window, 'touchend', touchEnd], [window, 'touchcancel', cancel],
      [window, 'click', click, false], [window, 'blur', windowBlur],
      [document, 'visibilitychange', visibility],
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
  }, [draw, finish, rememberFocus, stopAnimation, travel]);

  useLayoutEffect(() => {
    if (!blocked || !finger.current) return;
    if (finger.current.claimed) travel(true);
    else finger.current = null;
  }, [blocked, travel]);

  return {phoneRef, raised, transitioning, raise, lower, resetRaised, gestureProps};
}
