// Neither the installed worker nor its HTTP cache is the authority on the live release.
const CHECK_MS=12000, INSTALL_MS=90000, RECHECK_MS=60000;
class Timeout extends Error {}

function bounded(work,ms,signal){
  signal.throwIfAborted();
  let timer,abort;
  const limit=new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Timeout()),ms);
    abort=()=>reject(signal.reason);
    signal.addEventListener('abort',abort,{once:true});
  });
  return Promise.race([work,limit]).finally(()=>{
    clearTimeout(timer);
    signal.removeEventListener('abort',abort);
  });
}

function pageEntry(doc){
  return doc.querySelector('script[type="module"][src]')?.getAttribute('src');
}

async function publishedRelease(signal){
  const response=await fetch('/game-release.json?check='+Date.now(),{cache:'no-store',signal});
  if(!response.ok)throw Error('Release lookup failed');
  const release=await response.json();
  if(!/^\/assets\/[\w.-]+\.js$/.test(release.entry) || !/^[\da-f]{64}$/.test(release.worker))throw Error('Invalid release');
  return release;
}

async function controlledEntry(signal){
  const response=await fetch('/index.html',{cache:'no-store',signal});
  if(!response.ok)throw Error('Offline game unavailable');
  return pageEntry(new DOMParser().parseFromString(await response.text(),'text/html'));
}

async function installRelease(sw,script,signal){
  const reg=await bounded(sw.register(script,{scope:'/',updateViaCache:'none'}),CHECK_MS,signal);
  signal.throwIfAborted();
  const candidate=[reg.installing,reg.waiting,reg.active].find(worker=>worker?.scriptURL===script);
  if(!candidate)throw Error('Worker unavailable');
  let changed;
  try{
    const activated=new Promise((resolve,reject)=>{
      changed=()=>{
        if(candidate.state==='redundant')reject(Error('Installation failed'));
        else if(candidate.state==='activated' && sw.controller===candidate)resolve();
        else if(candidate.state==='installed')candidate.postMessage({type:'SKIP_WAITING'});
      };
      candidate.addEventListener('statechange',changed);
      sw.addEventListener('controllerchange',changed);
      changed();
    });
    // Re-registering an already-active script may never claim a previously
    // uncontrolled tab. Give clients.claim() a moment, then try a fresh URL.
    try{await bounded(activated,candidate.state==='activated'?2500:INSTALL_MS,signal);}
    catch(error){
      if(error instanceof Timeout && candidate.state==='activated')throw Error('Worker did not claim this window');
      throw error;
    }
  }finally{
    candidate.removeEventListener('statechange',changed);
    sw.removeEventListener('controllerchange',changed);
  }
}

export function connectAppWorker(sw,onAvailability,onStatus,{
  runningEntry=pageEntry(document),releaseInfo=publishedRelease,readShell=controlledEntry,
  origin=location.origin,onRelease=()=>{},
}={}){
  let active=null,lastSuccess=0,closed=false,retryBuild=null;
  // Only an activated controller can serve the verified offline entry.
  const available=()=>onAvailability(sw?.controller?'ready':'unavailable');
  async function run(signal){
    const release=await bounded(releaseInfo(signal),CHECK_MS,signal);
    signal.throwIfAborted();
    onRelease(release.version);
    const shell=()=>bounded(readShell(signal),CHECK_MS,signal);
    const target=new URL('/sw.js',origin);
    target.searchParams.set('build',release.worker);
    const controller=sw.controller;
    const script=controller && new URL(controller.scriptURL);
    let verified=false;
    if(script?.origin===origin && script.pathname===target.pathname && script.searchParams.get('build')===release.worker){
      try{verified=await shell()===release.entry && sw.controller===controller;}
      catch(error){if(signal.aborted || !navigator.onLine || error instanceof Timeout)throw error;}
    }
    signal.throwIfAborted();
    if(!verified){
      onStatus('downloading');
      // A stale script or a rejected precache can survive a normal update().
      // Retry once on a fresh script URL, retaining the same scope and garden.
      for(let attempt=0;attempt<2;attempt++){
        if(attempt || retryBuild===release.worker)target.searchParams.set('retry',crypto.randomUUID());
        retryBuild=release.worker;
        try{
          await installRelease(sw,target.href,signal);
          verified=await shell()===release.entry;
          if(verified)break;
        }catch(error){
          if(signal.aborted || !navigator.onLine || error instanceof Timeout || attempt)throw error;
        }
        signal.throwIfAborted();
      }
    }
    if(!verified)throw Error('Wrong offline game');
    signal.throwIfAborted();
    retryBuild=null;
    lastSuccess=Date.now();
    onAvailability('ready');
    onStatus(release.entry===runningEntry?'current':'ready');
  }
  function check(manual=false){
    if(closed)return;
    if(!navigator.onLine || !sw){
      active?.controller.abort();
      active=null;
      lastSuccess=0;
      available();
      onStatus(!navigator.onLine?'offline':'failed');
      return;
    }
    if(active)return active.promise;
    if(!manual && lastSuccess && Date.now()-lastSuccess<RECHECK_MS)return;
    const controller=new AbortController();
    const task={controller};
    active=task;
    onAvailability(sw.controller?'ready':'preparing');
    onStatus('checking');
    task.promise=run(controller.signal).catch(error=>{
      if(controller.signal.aborted)return;
      lastSuccess=0;
      available();
      onStatus(!navigator.onLine?'offline':error instanceof Timeout?'slow':'failed');
    }).finally(()=>{
      controller.abort();
      if(active===task)active=null;
    });
    return task.promise;
  }
  const changed=()=>{lastSuccess=0;void check();};
  sw?.addEventListener('controllerchange',changed);
  return {check,close(){
    closed=true;
    active?.controller.abort();
    sw?.removeEventListener('controllerchange',changed);
  }};
}
