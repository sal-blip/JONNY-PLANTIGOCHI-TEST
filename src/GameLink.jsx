import React, { useEffect, useRef, useState } from 'react';

export const gameLink = () => document.querySelector('link[rel="canonical"]')?.href || new URL('/', window.location.href).href;

export default function GameLink({ showAddress = false }) {
  const [status, setStatus] = useState('idle');
  const field = useRef(null);
  const url = gameLink();

  useEffect(() => {
    if (status === 'manual') {
      field.current.focus();
      field.current.select();
    }
  }, [status]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('manual');
    }
  }

  return <>
    {(showAddress || status === 'manual') && <input className="game-link" ref={field} type="url" aria-label="Game link to copy" readOnly value={url} onFocus={e => e.target.select()}/>}
    <button className="primary-btn" onClick={copyLink}>Copy game link</button>
    <p role="status" className="backup-notice">{status === 'copied' ? 'Game link copied.' : status === 'manual' ? 'Select the link and choose Copy.' : ''}</p>
  </>;
}
