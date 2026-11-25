// Served outside the offline app shell so an older installed client can recover.

export function updatePage({entry,version,worker}){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Update Plantigochi</title><style>
body{margin:0;display:grid;min-height:100svh;place-items:center;background:#e7eee1;color:#253e33;font:17px/1.5 system-ui}
main{box-sizing:border-box;width:min(100%,25rem);padding:2rem}img{border-radius:20%}h1{font-size:1.7rem;margin:.8rem 0}
button{border:0;border-radius:1.5rem;padding:.8rem 1.2rem;font:inherit;background:#34583e;color:white}button:disabled{opacity:.65}
</style></head><body><main><img src="/icons/icon-192.png" width="64" height="64" alt=""><h1>Update Plantigochi</h1>
<p>Open this page in the browser you used to install the game. Your garden stays on this device.</p>
<button type="button">Repair update</button><p role="status" aria-live="polite"></p>
</main><script type="module">
const button=document.querySelector('button'), status=document.querySelector('[role=status]');
const expected=${JSON.stringify(entry)}, version=${JSON.stringify(version)}, build=${JSON.stringify(worker)};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function repair(signal){
  if(!navigator.serviceWorker)throw Error('This browser cannot install the update. Open this link in your usual browser.');
  const workers=navigator.serviceWorker;
  const previous=await workers.getRegistration('/');
  if(!previous && !matchMedia('(display-mode:standalone)').matches && !navigator.standalone){
    throw Error('No Plantigochi installation was found in this browser. Open this link in the same Chrome or Safari profile as your garden.');
  }
  const target=new URL('/sw.js',location.origin);
  target.searchParams.set('build',build);
  target.searchParams.set('repair',Date.now());
  const reg=await workers.register(target,{scope:'/',updateViaCache:'none'});
  const candidate=[reg.installing,reg.waiting,reg.active].find(w=>w?.scriptURL===target.href);
  if(!candidate)throw Error('The new game download could not start. Try again.');
  while(candidate.state!=='activated' || workers.controller!==candidate){
    signal.throwIfAborted();
    if(candidate.state==='redundant')throw Error('The game download did not finish. Your existing garden is still on this device.');
    await delay(200);
  }
  signal.throwIfAborted();
  status.textContent='Checking the downloaded game…';
  const response=await fetch('/index.html',{cache:'no-store',signal});
  if(!response.ok)throw Error('The updated game page could not be opened.');
  const doc=new DOMParser().parseFromString(await response.text(),'text/html');
  if(doc.querySelector('script[type="module"][src]')?.getAttribute('src')!==expected){
    throw Error('This browser still has an older game page. Try again.');
  }
}
button.onclick=async()=>{
  button.disabled=true;status.textContent='Downloading version '+version+'…';
  const controller=new AbortController();
  let timer;
  try{
    await Promise.race([repair(controller.signal),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The update is taking longer than expected. Try again.')),90000)})]);
    status.textContent='Version '+version+' verified. Open the updated game from its home-screen icon.';
    if(matchMedia('(display-mode:standalone)').matches || navigator.standalone){
      status.textContent='Version '+version+' verified. Restart to play.';
      button.textContent='Restart to update';
      button.onclick=()=>location.replace('/');
      button.disabled=false;
    }else button.hidden=true;
  }catch(error){
    status.textContent=error.message;
    button.disabled=false;
  }finally{clearTimeout(timer);controller.abort()}
};
</script></body></html>`;
}
