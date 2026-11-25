// Neither the installed worker nor its HTTP cache is the authority on the live release.
const CHECK_MS=12000, INSTALL_MS=90000, RECHECK_MS=60000;
class Timeout extends Error {}

function bounded(work,ms,signal){
  signal.throwIfAborted();
  let timer,abort;
  const limit=new Promise((_,reject)=>{
    if(ms!==null)timer=setTimeout(()=>reject(new Timeout()),ms);
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

function sameBuild(worker,target){
  if(!worker)return false;
  const url=new URL(worker.scriptURL);
  return url.origin===target.origin && url.pathname===target.pathname &&
    url.searchParams.get('build')===target.searchParams.get('build');
}

async function installRelease(sw,target,signal,onProgress){
  // Chrome can keep installing after a page's check times out, and multiple
  // open windows share one registration. Reuse any live download of this build.
  const existing=await bounded(sw.getRegistration('/'),CHECK_MS,signal);
  signal.throwIfAborted();
  let candidate=[existing?.installing,existing?.waiting].find(w=>sameBuild(w,target) && w.state!=='redundant');
  if(!candidate){
    const reg=await bounded(sw.register(target.href,{scope:'/',updateViaCache:'none'}),CHECK_MS,signal);
    signal.throwIfAborted();
    candidate=[reg.installing,reg.waiting,reg.active].find(w=>w?.scriptURL===target.href);
  }
  if(!candidate)throw Error('Worker unavailable');
  let changed,progress,timer;
  try{
    const activated=new Promise((resolve,reject)=>{
      const timeout=()=>reject(new Timeout());
      timer=setTimeout(timeout,candidate.state==='activated'?2500:INSTALL_MS);
      let completed=-1;
      progress=event=>{
        if(signal.aborted || event.source!==candidate || event.data?.type!=='GAME_CACHE_PROGRESS')return;
        const {completed:count,total}=event.data;
        if(!Number.isSafeInteger(count) || !Number.isSafeInteger(total) ||
          total<1 || count<=completed || count>total)return;
        completed=count;
        // A slow phone may need more than 90 seconds in total. Give it that
        // long without progress before offering retry.
        clearTimeout(timer);timer=setTimeout(timeout,INSTALL_MS);
        onProgress({completed,total});
      };
      changed=()=>{
        if(candidate.state==='redundant')reject(Error('Installation failed'));
        else if(candidate.state==='activated' && sw.controller===candidate)resolve();
        else if(candidate.state==='installed')candidate.postMessage({type:'SKIP_WAITING'});
      };
      candidate.addEventListener('statechange',changed);
      sw.addEventListener('controllerchange',changed);
      sw.addEventListener('message',progress);
      changed();
    });
    try{await bounded(activated,null,signal);}
    catch(error){
      if(error instanceof Timeout && candidate.state==='activated')throw Error('Worker did not claim this window');
      throw error;
    }
  }finally{
    clearTimeout(timer);
    candidate.removeEventListener('statechange',changed);
    sw.removeEventListener('controllerchange',changed);
    sw.removeEventListener('message',progress);
  }
}

export function connectAppWorker(sw,onAvailability,onStatus,{
  runningEntry=pageEntry(document),releaseInfo=publishedRelease,readShell=controlledEntry,
  origin=location.origin,onRelease=()=>{},onProgress=()=>{},
}={}){
  let active=null,lastSuccess=0,closed=false,retryBuild=null;
  // Only an activated controller can serve the verified offline entry.
  const available=()=>onAvailability(sw?.controller?'ready':'unavailable');
  async function run(signal,setPhase){
    const release=await bounded(releaseInfo(signal),CHECK_MS,signal);
    signal.throwIfAborted();
    onRelease(release.version);
    const target=new URL('/sw.js',origin);
    target.searchParams.set('build',release.worker);
    const verify=async()=>{
      const controller=sw.controller;
      if(!sameBuild(controller,target))return false;
      setPhase('verifying');
      const entry=await bounded(readShell(signal),CHECK_MS,signal);
      return entry===release.entry && sw.controller===controller;
    };
    let verified=false;
    if(sameBuild(sw.controller,target)){
      try{verified=await verify();}
      catch(error){if(signal.aborted || !navigator.onLine || error instanceof Timeout)throw error;}
    }
    signal.throwIfAborted();
    if(!verified){
      // A stale script or a rejected precache can survive a normal update().
      // Retry once on a fresh script URL, retaining the same scope and garden.
      for(let attempt=0;attempt<2;attempt++){
        if(attempt || retryBuild===release.worker)target.searchParams.set('retry',crypto.randomUUID());
        retryBuild=release.worker;
        try{
          setPhase('downloading');
          onProgress(null);
          await installRelease(sw,target,signal,onProgress);
          signal.throwIfAborted();
          verified=await verify();
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
    let phase='checking';
    task.promise=run(controller.signal,next=>{phase=next;onStatus(next);}).catch(error=>{
      if(controller.signal.aborted)return;
      lastSuccess=0;
      available();
      const failure={downloading:'downloadFailed',verifying:'verificationFailed',checking:'failed'};
      onStatus(!navigator.onLine?'offline':error instanceof Timeout?'slow':failure[phase]);
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
