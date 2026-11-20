import { useEffect, useState, useSyncExternalStore } from 'react';
import { createInstallPrompt } from './installPrompt.js';

const install = createInstallPrompt(window);

export function usePhoneApp() {
  const installState = useSyncExternalStore(install.subscribe, install.getState);
  const standalone = useSyncExternalStore(install.subscribe, install.isStandalone);
  const [offline, setOffline] = useState('preparing');

  useEffect(() => {
    let active = true;
    function status(value) { if (active) setOffline(value); }
    async function prepareOffline() {
      try {
        if (!import.meta.env.PROD || !window.isSecureContext || !navigator.serviceWorker) {
          status('unavailable');
          return;
        }
        const registration = await navigator.serviceWorker.register('/sw.js', { scope:'/', updateViaCache:'none' });
        const worker = registration.installing;
        function changed() {
          if (worker?.state === 'redundant' && !registration.active) status('unavailable');
        }
        worker?.addEventListener('statechange', changed);
        changed();
        await navigator.serviceWorker.ready;
        status('ready');
      } catch { status('unavailable'); }
    }
    void prepareOffline();
    function identifyWindow(event){
      if(event.data?.type==='plant-window-mode')event.ports[0]?.postMessage(install.isStandalone());
    }
    navigator.serviceWorker?.addEventListener('message',identifyWindow);
    return () => { active = false;navigator.serviceWorker?.removeEventListener('message',identifyWindow); };
  }, []);
  return { standalone, installState, installed:installState === 'installed', promptInstall:install.prompt, offline };
}
