import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { rememberHint } from './firstVisit.js';

export const GuideSound = createContext(null);
const POPUP_DELAY_MS = 250;

function TimedChat({ active, className, children, focusRef, onReveal }) {
  const sound = useContext(GuideSound);
  const [visible, setVisible] = useState(false);
  const announced = useRef(false);

  useEffect(() => {
    if (!active || visible) return;
    let timer;
    function schedule() {
      clearTimeout(timer);
      if (!document.hidden) {
        timer = setTimeout(() => {
          if (!document.hidden) setVisible(true);
        }, POPUP_DELAY_MS);
      }
    }
    schedule();
    document.addEventListener('visibilitychange', schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [active, visible]);

  useLayoutEffect(() => {
    if (!visible || announced.current) return;
    if (document.hidden) {
      setVisible(false);
      return;
    }
    announced.current = true;
    sound?.('chat');
    focusRef?.current?.focus({preventScroll:true});
    onReveal?.();
  }, [visible, sound, focusRef, onReveal]);

  return <aside className={'guide-chat ' + className} aria-live="polite"
    aria-hidden={visible ? undefined : true} inert={visible ? undefined : ''}>
    <div className="chat-copy"><small>Plantigochi</small>{children}</div>
  </aside>;
}

export default function GuideChat({ cue, className = '', children, focusRef, onReveal }) {
  return <TimedChat key={cue} active={Boolean(cue)} className={className} focusRef={focusRef} onReveal={onReveal}>
    {children}
  </TimedChat>;
}

export function FirstHint({id,plant,commit,className,children}) {
  const [show] = useState(() => !plant.seenHints?.includes(id));
  const remember = () => { void commit(p => p.id === plant.id ? rememberHint(p,id) : p); };
  return show ? <GuideChat className={className} cue={id} onReveal={remember}><p>{children}</p></GuideChat> : null;
}
