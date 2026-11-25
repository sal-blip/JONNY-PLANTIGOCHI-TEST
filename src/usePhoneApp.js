import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { connectAppWorker } from './appUpdates.js';
import { createInstallPrompt } from './installPrompt.js';

const install = createInstallPrompt(window);

export function usePhoneApp() {
  const installState = useSyncExternalStore(install.subscribe, install.getState);
  const standalone = useSyncExternalStore(install.subscribe, install.isStandalone);
  const [offline, setOffline] = useState('preparing');
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [publishedVersion,setPublishedVersion]=useState(null);
  const worker = useRef(null);

  useEffect(() => {
    const sw = navigator.serviceWorker;
    const connection = connectAppWorker(import.meta.env.PROD && window.isSecureContext ? sw : null, setOffline, setUpdateStatus, {onRelease:setPublishedVersion});
    worker.current = connection;
    void connection.check();
    function identifyWindow(event) {
      if (event.data?.type === 'plant-window-mode') event.ports[0]?.postMessage(install.isStandalone());
    }
    const resume = () => { if (!document.hidden) void connection.check(); };
    sw?.addEventListener('message', identifyWindow);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('online', resume);
    window.addEventListener('offline', resume);
    return () => {
      connection.close();
      worker.current = null;
      sw?.removeEventListener('message', identifyWindow);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('online', resume);
      window.removeEventListener('offline', resume);
    };
  }, []);

  return {standalone, updateStatus, publishedVersion, checkForUpdates:() => worker.current?.check(true),
    installState, installed:installState === 'installed', promptInstall:install.prompt, offline};
}
