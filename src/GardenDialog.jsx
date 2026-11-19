import React, { useLayoutEffect, useRef } from 'react';

export default function GardenDialog({ page, title, back, close, children }) {
  const dialog = useRef(null), card = useRef(null), heading = useRef(null);
  useLayoutEffect(() => {
    const el = dialog.current;
    el.showModal();
    return () => el.close();
  }, []);

  useLayoutEffect(() => {
    heading.current.focus({ preventScroll: true });
    const el = dialog.current, panel = card.current;
    function fit() {
      const available = el.clientHeight - parseFloat(getComputedStyle(el).paddingTop) - parseFloat(getComputedStyle(el).paddingBottom);
      if (available > 0 && panel.offsetHeight > 0) {
        panel.style.setProperty('--fit', Math.min(1, available / panel.offsetHeight));
      }
    }
    fit();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    observer?.observe(el);
    observer?.observe(panel);
    window.addEventListener('resize', fit);
    return () => { observer?.disconnect(); window.removeEventListener('resize', fit); };
  }, [page]);

  return <dialog className="garden-dialog" ref={dialog} aria-labelledby="menu-title"
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="glass-pane" aria-hidden="true"/>
    <section className="menu-card" ref={card}>
      <header className="menu-heading">
        {back && <button className="round-button" onClick={back} aria-label="Back">Back</button>}
        <h1 id="menu-title" ref={heading} tabIndex="-1">{title}</h1>
        <button className="round-button" onClick={close} aria-label="Close menu">Close</button>
      </header>
      <div className={'menu-body page-' + page}>{children}</div>
    </section>
  </dialog>;
}
