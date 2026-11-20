// The first controller claims a new installation. A replacement controller can
// serve a newer app on the next navigation while the current game stays open.
export function watchAppUpdates(registration, serviceWorker, initialController, onStatus) {
  let controller=initialController, changed=false, tracked=null, checking=null;
  let disposed=false, report=false, lastCheck=0;
  function status(value){if(!disposed)onStatus(value);}
  function controllerChanged(){
    const next=serviceWorker.controller;
    if(!next || next===controller)return;
    if(controller){changed=true;status('ready');}
    else if(report)status('current');
    controller=next;
  }
  function workerChanged(){
    if(!tracked || disposed || changed)return;
    if(tracked.state==='redundant'){if(report)status('failed');return;}
    if(controller && tracked.state==='installed') tracked.postMessage({type:'SKIP_WAITING'});
    if(tracked.state==='activated'){if(report)status('current');}
    else if(controller)status('downloading');
    controllerChanged();
  }
  function observe(){
    const worker=registration.installing || registration.waiting;
    if(!worker || worker===tracked)return;
    tracked?.removeEventListener('statechange',workerChanged);
    tracked=worker;
    worker.addEventListener('statechange',workerChanged);
    workerChanged();
  }
  function check(manual=false){
    controllerChanged();
    if(changed || disposed)return;
    if(manual)report=true;
    if(!navigator.onLine){if(manual)status('offline');return;}
    if(checking){if(manual)status('checking');return checking;}
    if(!manual && Date.now()-lastCheck<60000)return;
    lastCheck=Date.now();
    if(manual)status('checking');
    checking=registration.update().then(()=>{
      if(disposed)return;
      observe();controllerChanged();
      if(changed)return;
      if(registration.installing || registration.waiting || tracked?.state==='activating')status('downloading');
      else if(report)status('current');
    }).catch(()=>{if(report && !changed)status('failed');}).finally(()=>{checking=null;});
    return checking;
  }
  registration.addEventListener('updatefound',observe);
  serviceWorker.addEventListener('controllerchange',controllerChanged);
  controllerChanged();
  observe();
  return {check,close(){
    disposed=true;tracked?.removeEventListener('statechange',workerChanged);
    registration.removeEventListener('updatefound',observe);
    serviceWorker.removeEventListener('controllerchange',controllerChanged);
  }};
}
