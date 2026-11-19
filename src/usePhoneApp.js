import { useEffect, useRef, useState } from 'react';

export function usePhoneApp() {
  const [installed, setInstalled] = useState(() =>
    !!window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);
  const [canPrompt, setCanPrompt] = useState(false);
  const [offline, setOffline] = useState('preparing');
  const installEvent = useRef(null);

  useEffect(() => {
    const display = window.matchMedia?.('(display-mode: standalone)');
    function onPrompt(event) {
      event.preventDefault();
      installEvent.current = event;
      setCanPrompt(true);
    }
    function installedApp() {
      installEvent.current = null;
      setCanPrompt(false);
      setInstalled(true);
    }
    function onDisplayChange() { setInstalled(display.matches || navigator.standalone === true); }
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', installedApp);
    display?.addEventListener('change', onDisplayChange);

    let active = true;
    function status(value) { if (active) setOffline(value); }
    if (import.meta.env.PROD && navigator.serviceWorker && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(registration => {
          const worker = registration.installing;
          function changed() {
            if (worker?.state === 'redundant' && !registration.active) status('unavailable');
          }
          worker?.addEventListener('statechange', changed);
          changed();
          return navigator.serviceWorker.ready;
        })
        .then(() => status('ready'))
        .catch(() => status('unavailable'));
    } else {
      status('unavailable');
    }
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', installedApp);
      display?.removeEventListener('change', onDisplayChange);
    };
  }, []);

  async function promptInstall() {
    const event = installEvent.current;
    if (!event) return;
    installEvent.current = null;
    setCanPrompt(false);
    try {
      await event.prompt();
      await event.userChoice;
    } catch { /* Browsers can withdraw their prompt. Manual install steps stay available. */ }
  }
  return { installed, canPrompt, promptInstall, offline };
}
