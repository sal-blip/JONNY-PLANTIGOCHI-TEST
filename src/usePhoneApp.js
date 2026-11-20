import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { watchAppUpdates } from './appUpdates.js';
import { createInstallPrompt } from './installPrompt.js';

const install = createInstallPrompt(window);

export function usePhoneApp() {
  const installState = useSyncExternalStore(install.subscribe, install.getState);
  const standalone = useSyncExternalStore(install.subscribe, install.isStandalone);
  const [offline, setOffline] = useState('preparing');

  const [updateStatus,setUpdateStatus]=useState('idle');
  const updates=useRef(null);
  useEffect(() => {
    let active = true;
    const sw=navigator.serviceWorker, initialController=sw?.controller;
    function status(value) { if (active) setOffline(value); }
    async function prepareOffline() {
      try {
        if (!import.meta.env.PROD || !window.isSecureContext || !navigator.serviceWorker) {
          status('unavailable');
          return;
        }
        let registration;
        try { registration=await sw.register('/sw.js', {scope:'/',updateViaCache:'none'}); }
        catch(error){registration=await sw.getRegistration('/');if(!registration?.active)throw error;}
        if(!active)return;
        updates.current=watchAppUpdates(registration,sw,initialController,setUpdateStatus);
        if(registration.active)void updates.current.check();
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
    const resume=()=>{if(!document.hidden)void updates.current?.check();};
    sw?.addEventListener('message',identifyWindow);
    document.addEventListener('visibilitychange',resume);
    window.addEventListener('pageshow',resume);
    window.addEventListener('online',resume);
    return () => {
      active=false;updates.current?.close();updates.current=null;
      sw?.removeEventListener('message',identifyWindow);
      document.removeEventListener('visibilitychange',resume);
      window.removeEventListener('pageshow',resume);window.removeEventListener('online',resume);
    };
  }, []);
  function checkForUpdates(){
    if(updates.current)void updates.current.check(true);
    else setUpdateStatus(navigator.onLine?'failed':'offline');
  }
  return { standalone, updateStatus, checkForUpdates, installState, installed:installState === 'installed', promptInstall:install.prompt, offline };
}
