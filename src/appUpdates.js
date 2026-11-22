function hasWorker(registration) {
  return registration && [registration.installing, registration.waiting, registration.active]
    .some(worker => worker && worker.state !== 'redundant');
}

function isPending(worker) {
  return worker && worker.state !== 'redundant' && worker.state !== 'activated';
}

// The first controller claims a new installation. A replacement controller can
// serve a newer app on the next navigation while the current game stays open.
export function watchAppUpdates(registration, serviceWorker, initialController, onStatus, onAvailability = () => {}) {
  let controller = initialController, changed = false, tracked = null, checking = null;
  let disposed = false, lastSuccess = 0, failures = 0;

  function controllerChanged() {
    const next = serviceWorker.controller;
    if (!next || next === controller || disposed) return;
    if (controller) changed = true;
    controller = next;
    onStatus(changed ? 'ready' : 'current');
  }

  function workerChanged() {
    if (disposed) return;
    controllerChanged();
    if (registration.active?.state === 'activated') onAvailability('ready');
    if (!tracked || changed) return;
    if (tracked.state === 'redundant') {
      failures++;
      lastSuccess = 0;
      if (!registration.active) onAvailability('unavailable');
      onStatus(navigator.onLine ? 'failed' : 'offline');
    } else if (tracked.state === 'activated') {
      onAvailability('ready');
      // clients.claim() can arrive just after activation. Its 'ready' takes precedence.
      onStatus('current');
    } else {
      if (controller && tracked.state === 'installed') tracked.postMessage({type:'SKIP_WAITING'});
      onStatus('downloading');
    }
  }

  function observe() {
    const worker = registration.installing || registration.waiting ||
      (registration.active?.state === 'activating' ? registration.active : null);
    if (!worker || worker === tracked) return;
    tracked?.removeEventListener('statechange', workerChanged);
    tracked = worker;
    tracked.addEventListener('statechange', workerChanged);
    workerChanged();
  }

  function check(manual = false) {
    if (disposed) return;
    controllerChanged();
    if (changed) return;
    observe();
    if (isPending(tracked)) {
      onStatus('downloading');
      return checking;
    }
    if (!navigator.onLine) {
      lastSuccess = 0;
      if (manual) onStatus('offline');
      return;
    }
    if (checking) return checking;
    if (!manual && Date.now() - lastSuccess < 60000) return;
    if (manual) onStatus('checking');
    const failuresBefore = failures;
    checking = Promise.resolve().then(() => registration.update()).then(() => {
      if (disposed) return;
      observe();
      controllerChanged();
      if (changed || failures !== failuresBefore) return;
      lastSuccess = Date.now();
      if (isPending(tracked)) onStatus('downloading');
      else onStatus('current');
    }).catch(() => {
      if (!disposed && !changed) {
        lastSuccess = 0;
        onStatus(navigator.onLine ? 'failed' : 'offline');
      }
    }).finally(() => { checking = null; });
    return checking;
  }

  registration.addEventListener('updatefound', observe);
  serviceWorker.addEventListener('controllerchange', controllerChanged);
  controllerChanged();
  observe();
  if (registration.active?.state === 'activated') onAvailability('ready');
  return {check, close() {
    disposed = true;
    tracked?.removeEventListener('statechange', workerChanged);
    registration.removeEventListener('updatefound', observe);
    serviceWorker.removeEventListener('controllerchange', controllerChanged);
  }};
}

// Registration can fail before an update monitor exists. A failed first install
// can also leave a registration with no workers. Both need a fresh register().
export function connectAppWorker(serviceWorker, onAvailability, onStatus) {
  const initialController = serviceWorker?.controller;
  let registration, monitor, pending, manualRequested = false, closed = false;

  async function register() {
    try {
      let next;
      if (navigator.onLine) {
        try { next = await serviceWorker.register('/sw.js', {scope:'/', updateViaCache:'none'}); }
        catch { /* An installed worker can still serve a garden while the server is unavailable. */ }
      }
      next ??= await serviceWorker.getRegistration('/');
      if (closed) return;
      if (!hasWorker(next)) {
        throw new Error('No installed or installing game worker');
      }
      registration = next;
      monitor = watchAppUpdates(next, serviceWorker, initialController, onStatus, onAvailability);
      await monitor.check(manualRequested);
    } catch {
      if (!closed) {
        onAvailability('unavailable');
        onStatus(navigator.onLine ? 'failed' : 'offline');
      }
    } finally {
      pending = null;
      manualRequested = false;
    }
  }

  function check(manual = false) {
    if (closed) return;
    if (!serviceWorker) {
      onAvailability('unavailable');
      if (manual) onStatus(navigator.onLine ? 'failed' : 'offline');
      return;
    }
    if (monitor && hasWorker(registration)) {
      return monitor.check(manual);
    }
    if (manual) { manualRequested = true; onStatus(navigator.onLine ? 'checking' : 'offline'); }
    if (pending) return pending;
    monitor?.close();
    monitor = null;
    onAvailability('preparing');
    pending = register();
    return pending;
  }

  return {check, close() {
    closed = true;
    monitor?.close();
  }};
}
