import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ImagePlus } from 'lucide-react';
import { photoZoom, preparePhoto } from './gardenScenes.js';

const clamp = n => Math.min(100,Math.max(0,n));

export default function PhotoBackground({ photo, update, layer, cancel, apply }) {
  const dialog = useRef(null), input = useRef(null), drag = useRef(null), request = useRef(0);
  const [notice, setNotice] = useState(''), [busy,setBusy] = useState(false);
  useLayoutEffect(() => {
    const el = dialog.current;
    el.showModal();
    return () => el.close();
  }, []);
  useEffect(() => () => { request.current++; }, []);

  async function selectFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const token = ++request.current;
    setBusy(true); setNotice('');
    try {
      const next = await preparePhoto(file);
      if (token === request.current) update(next);
    } catch {
      if (token === request.current) setNotice('This image could not be opened. Try a JPEG, PNG, or WebP.');
    } finally { if (token === request.current) setBusy(false); }
  }
  function start(event) {
    if (!photo || !event.isPrimary || event.button !== 0) return;
    const frame = layer.current.getBoundingClientRect();
    const scale = photoZoom * Math.max(frame.width / photo.width, frame.height / photo.height);
    drag.current = {
      pointer:event.pointerId, startX:event.clientX, startY:event.clientY, x:photo.x, y:photo.y,
      overflowX:photo.width * scale - frame.width, overflowY:photo.height * scale - frame.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event) {
    const d = drag.current;
    if (!d || d.pointer !== event.pointerId) return;
    update({ ...photo, x:clamp(d.x - 100 * (event.clientX-d.startX) / d.overflowX),
      y:clamp(d.y - 100 * (event.clientY-d.startY) / d.overflowY) });
  }
  function nudge(event) {
    const delta = { ArrowLeft:[3,0], ArrowRight:[-3,0], ArrowUp:[0,3], ArrowDown:[0,-3] }[event.key];
    if (!photo || !Array.isArray(delta)) return;
    event.preventDefault();
    update({...photo, x:clamp(photo.x + delta[0]), y:clamp(photo.y + delta[1])});
  }
  return <dialog className="photo-dialog" ref={dialog} aria-labelledby="photo-title"
    onCancel={event => { event.preventDefault(); cancel(); }}>
    <div className="photo-heading"><button className="round-button" aria-label="Back to backgrounds" onClick={cancel}><ArrowLeft/></button>
      <h1 id="photo-title">Use My Photo</h1></div>
    <div className={'photo-pad' + (photo ? ' ready' : '')} role="group" aria-label="Photo position" tabIndex={photo ? 0 : -1}
      onPointerDown={start} onPointerMove={move} onPointerUp={() => { drag.current=null; }}
      onLostPointerCapture={() => { drag.current=null; }} onKeyDown={nudge}/>
    <div className="photo-tools">
      <p role="status">{notice || (busy ? 'Preparing photo…' : photo ? 'Drag to position, or use the arrow keys.' : 'Choose a photo from this device.')}</p>
      <div><button type="button" onClick={() => input.current.click()} disabled={busy}><ImagePlus/>{photo ? 'Change photo' : 'Choose photo'}</button>
        {photo && <button className="photo-apply" disabled={busy} onClick={async () => {
          setBusy(true);
          try {const issue=await apply();if(issue)setNotice(issue);}
          finally {setBusy(false);}
        }}><Check/>Use photo</button>}</div>
      <input hidden ref={input} type="file" accept="image/*" aria-label="Background photo" onChange={selectFile}/>
    </div>
  </dialog>;
}
