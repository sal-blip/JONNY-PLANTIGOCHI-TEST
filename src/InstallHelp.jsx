import React from 'react';
import {Download, MoreVertical, Plus, PlusSquare, Share} from 'lucide-react';
import GameLink from './GameLink.jsx';

export default function InstallHelp({phone, tour=false}) {
  const ua=navigator.userAgent;
  const ios=/iPad|iPhone|iPod/.test(ua) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const android=/Android/i.test(ua);
  const embedded=window.self!==window.top || /ChatGPT|FBAN|FBAV|Instagram|; wv\)/i.test(ua) ||
    (ios && !/Safari|CriOS|FxiOS|EdgiOS/.test(ua));
  switch(phone.installState){
    case 'installed': return <p role="status">Plantigochi is installed. Open its icon to play.</p>;
    case 'accepted': return <p role="status">Installation accepted. Open the Plantigochi icon when it appears.</p>;
    case 'prompting': return <p role="status">Choose Install in your browser’s prompt.</p>;
    case 'available': return <>
      <button className="primary-btn" onClick={phone.promptInstall}><Download size={16}/> Install Plantigochi</button>
      {tour && !ios && !android && <GameLink/>}
    </>;
  }
  const macSafari=/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
  return <>
    {embedded && <p>Open the game link in {ios?'Safari':android?'Chrome':'your browser'} first.</p>}
    {ios || android ? <>
      <p>{ios?'In Safari, follow these steps.':'In Chrome, follow these steps.'}</p>
      <ol className="install-steps">
        <li>{ios?<Share/>:<MoreVertical/>}{ios?'Share':'Menu'}</li>
        <li><PlusSquare/>{ios?'Add to Home Screen':'Add to Home screen or Install app'}</li>
        <li><Plus/>{ios?'Add':'Confirm'}</li>
      </ol>
      {ios && <p className="install-note">If offered, turn on <b>Open as Web App</b> before tapping Add.</p>}
    </> : <p>{tour?'Copy the game link to open it on your phone. ':''}{macSafari?'On this Mac, choose File → Add to Dock in Safari.':'In Chrome or Edge, look for Install in the address bar or browser menu.'}</p>}
    <GameLink/>
  </>;
}
