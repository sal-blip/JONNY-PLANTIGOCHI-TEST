import { useCallback, useEffect, useRef, useState } from 'react';
import { nextMilestone, STAGE_NAMES, criticalReminder, deathDeadline } from './game.js';

const DEVICE_KEY = 'plantigochi.alert-device.v1';
function readDevice() {
  try { return JSON.parse(localStorage.getItem(DEVICE_KEY)) || {}; } catch { return {}; }
}
function writeDevice(value) { localStorage.setItem(DEVICE_KEY, JSON.stringify(value)); }
function decodeKey(str) {
  return Uint8Array.from(atob(str.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
}
async function updateReminder(method, token, payload) {
  const res = await fetch('/api/alerts/reminder', {
    method, headers: { 'Content-Type':'application/json', Authorization:'Bearer '+token },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) throw new Error('Reminder update failed.');
}
function support() {
  return window.isSecureContext && 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
}

export function usePlantAlerts(plant, offline) {
  const [enabled, setEnabled] = useState(() => support() && Notification.permission === 'granted' && !!readDevice().enabled);
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState('');
  const [onlineAttempt,retry] = useState(0);
  const lastStage = useRef(plant.stage);
  const didInitialSync = useRef(false);
  const lock = useRef(false);
  const capable = support();
  const denied = capable && Notification.permission === 'denied';
  const next = nextMilestone(plant);
  const due = next ? plant.plantedAt + next.age : null;
  const criticalDue = criticalReminder(plant);
  const expires = deathDeadline(plant);
  const schedule = JSON.stringify({due,criticalDue,expires,reason:plant.rotAt===null?'thirst':'rot'});
  const storeSchedule = useCallback(async () => {
    const cache = await caches.open('plantigochi-notices');
    await cache.put('/notice-schedule',new Response(schedule));
  },[schedule]);
  useEffect(() => {
    if (enabled && offline==='ready') void storeSchedule().catch(()=>{});
  },[enabled,offline,storeSchedule]);
  const syncSchedule = useCallback(async (token,endpoint) => {
    await storeSchedule();
    const now = Date.now();
    await updateReminder('PUT',token,{endpoint,due:due>now ? due : null,criticalDue:criticalDue>now ? criticalDue : null});
  },[due,criticalDue,storeSchedule]);

  const toggle = useCallback(async () => {
    if (!capable || offline !== 'ready' || lock.current) return;
    lock.current = true;
    setBusy(true); setNotice('');
    try {
      let device = readDevice();
      if (enabled) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
        writeDevice({token:device.token,enabled:false});
        setEnabled(false);
        if (device.token) await updateReminder('DELETE',device.token).catch(()=>{});
        setNotice('Plant alerts are off.');
      } else {
        // Request directly from this button click so Safari retains user activation.
        if (await Notification.requestPermission() !== 'granted') {
          setNotice('To allow alerts later, change notification permissions in your browser or device settings.'); return;
        }
        const key = await fetch('/api/alerts/key',{cache:'no-store'});
        if (!key.ok) throw new Error('Alerts unavailable.');
        const {publicKey} = await key.json();
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(publicKey)});
        const token = device.token || Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
        device = {token,enabled:true,registered:null};
        await syncSchedule(token,sub.endpoint);
        device.registered = schedule;
        writeDevice(device);
        didInitialSync.current = true;
        setEnabled(true); setNotice('Plant alerts are on for this device.');
      }
    } catch {
      setNotice('Couldn’t update alerts. Open the installed app while online and try again.');
    } finally { lock.current = false; setBusy(false); }
  }, [capable,enabled,offline,schedule,syncSchedule]);

  useEffect(() => {
    const onOnline = () => retry(n=>n+1);
    window.addEventListener('online',onOnline);
    return () => window.removeEventListener('online',onOnline);
  }, []);

  useEffect(() => {
    if (!enabled || offline !== 'ready' || !navigator.onLine || lock.current) return;
    const device = readDevice();
    if (!device.token) return;
    if (didInitialSync.current && device.registered === schedule) return;
    let active = true;
    async function sync() {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!active) return;
      if (!sub) {
        writeDevice({token:device.token,enabled:false});
        setEnabled(false); setNotice('Enable alerts again to reconnect this device.'); return;
      }
      await syncSchedule(device.token,sub.endpoint);
      if (active && readDevice().enabled) {
        didInitialSync.current = true;
        writeDevice({...device, registered:schedule});
      }
    }
    sync().catch(() => { if (active) setNotice('Reconnect to sync your next reminder.'); });
    return () => { active=false; };
  }, [schedule,syncSchedule,enabled,offline,onlineAttempt]);

  useEffect(() => {
    const prior = lastStage.current;
    lastStage.current = plant.stage;
    if (!enabled || !capable || plant.deadAt !== null || prior === plant.stage) return;
    navigator.serviceWorker.ready.then(reg=>reg.showNotification('Monstera milestone 🌿',{
      body:'Your Monstera reached the '+STAGE_NAMES[plant.stage].toLowerCase()+' stage.', tag:'plantigochi-growth', icon:'/icons/icon-192.png',
    })).catch(()=>{});
  },[plant.stage,plant.deadAt,enabled,capable]);
  return { enabled, busy, notice, toggle, capable, denied };
}
