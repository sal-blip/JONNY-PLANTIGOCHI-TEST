import {newTutorial,startDewLesson} from './firstVisit.js';
import {beginAlertVisit,answerAlertInvite} from './alertInvitation.js';
import {checkIn,lifeOf,milestone} from './gardenEconomy.js';
import {stageGardenReminder} from './gardenReminder.js';
import {KEY,newPlant,readPlant} from './game.js';
import {canonicalFrameBlob,frameOriginalIds,originalIdsFromRaw,packGardenBackup,prepareRestoredGarden} from './gardenBackup.js';
import {validOriginalId} from './frameUpload.js';

const databaseName='plantigochi.pocket.garden';
const storeName='garden', currentKey='current', setupKey='setup';
const originalPrefix='frame-original/';
const previousOriginalsKey='before-restore-originals';
const assetKey=id=>originalPrefix+id;

function loadOriginals(records,ids,complete){
  const originals=new Map();
  let remaining=ids.size;
  if(!remaining)complete(originals);
  for(const id of ids){
    const request=records.get(assetKey(id));
    request.onsuccess=()=>{
      if(request.result instanceof Blob)originals.set(id,request.result);
      if(!--remaining)complete(originals);
    };
  }
}

function loadSavedOriginals(records,raw,complete){
  if(raw!=null && !readPlant(raw,Date.now(),false)){
    // A damaged record can lose its item list while original files survive.
    // Include the recoverable binaries alongside the exact original record.
    const keys=records.getAllKeys();
    keys.onsuccess=()=>{
      const ids=keys.result.filter(key=>typeof key==='string' && key.startsWith(originalPrefix))
        .map(key=>key.slice(originalPrefix.length)).filter(validOriginalId);
      loadOriginals(records,new Set(ids),complete);
    };
  }else loadOriginals(records,originalIdsFromRaw(raw),complete);
}

function pruneOriginals(records,used){
  const keys=records.getAllKeys();
  keys.onsuccess=()=>{
    for(const key of keys.result){
      if(typeof key==='string' && key.startsWith(originalPrefix) && !used.has(key.slice(originalPrefix.length)))records.delete(key);
    }
  };
}

function updateOriginals(records,before,after,staged){
  if(!staged && before.gardenLife?.items===after.gardenLife?.items)return;
  const previous=frameOriginalIds(before),current=frameOriginalIds(after);
  if(staged && (previous.has(staged.id) || !current.has(staged.id)))throw new SaveIssue('This photo frame changed. Open it and choose the photo again.');
  for(const id of current){
    if(!previous.has(id) && id!==staged?.id)throw new SaveIssue('The original photo is required to update this frame.');
  }
  if(staged)records.add(staged.blob,assetKey(staged.id));
  for(const id of previous)if(!current.has(id))records.delete(assetKey(id));
}

export class SaveIssue extends Error {
  constructor(message,raw=null){super(message);this.raw=raw;}
}
export function loadSnapshot(raw,now=Date.now(),visible=true){
  if(typeof raw!=='string')throw new SaveIssue('The existing garden could not be read.',JSON.stringify(raw));
  const plant=readPlant(raw,now,visible);
  if(!plant)throw new SaveIssue('This save needs recovery or a newer version of Plantigochi.',raw);
  return plant;
}
function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(databaseName,1);
    let abandoned=false;
    function abandon(message){
      abandoned=true;clearTimeout(timer);reject(new SaveIssue(message));
    }
    // Some mobile browsers suspend the open request when its owner is backgrounded.
    // Ignore a late handle after a retry opens a fresh connection.
    const timer=setTimeout(()=>abandon('Opening garden storage took too long. Try again.'),10000);
    req.onupgradeneeded=()=>{if(abandoned)req.transaction.abort();else req.result.createObjectStore(storeName);};
    req.onblocked=()=>abandon('Close other Plantigochi tabs and reopen the garden.');
    req.onerror=()=>{clearTimeout(timer);reject(req.error);};
    req.onsuccess=()=>{clearTimeout(timer);if(abandoned)req.result.close();else resolve(req.result);};
  });
}
const revisionOf=setup=>Number.isSafeInteger(setup.revision)?setup.revision:0;
const stale=()=>new SaveIssue('This garden changed in another window. Review the current garden and try again.');
function resultOf(plant,setup){
  return {plant,firstDay:setup.firstDay ?? null,phase:setup.phase || (plant?'game':'welcome'),epoch:setup.epoch,revision:revisionOf(setup),draft:setup.draft || '',invite:setup.invite || null};
}
export function gardenStore(legacyStorage,visible){
  let database,checkedOriginals=false;
  function connection(){
    database ??= openDB().then(db=>{
      db.onclose=()=>{database=null;};
      db.onversionchange=()=>{db.onclose=null;db.close();database=null;};
      return db;
    }).catch(error=>{database=null;throw error;});
    return database;
  }
  async function transaction(mode,apply,signal,waitForStart){
    const db=await connection();
    if(signal?.aborted)throw signal.reason;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,mode),records=tx.objectStore(storeName);
      const current=records.get(currentKey),setup=records.get(setupKey);
      let result,fault;
      function abort(reason){
        try{tx.abort();}catch{return;} // A committing write must report its actual outcome.
        cleanup();reject(reason || new Error('Save interrupted.'));
      }
      const cancel=()=>abort(signal.reason);
      // Limit only the queue wait for a refresh. Once started, its migration
      // and photo reconciliation can take as long as the garden needs.
      const timer=waitForStart && setTimeout(()=>abort(new SaveIssue('Garden storage is busy. Try again.')),waitForStart);
      setup.onsuccess=()=>{
        clearTimeout(timer);
        try{result=apply(records,current.result,setup.result || {epoch:null});}
        catch(error){fault=error;abort(error);}
      };
      signal?.addEventListener('abort',cancel,{once:true});
      function cleanup(){clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
      tx.oncomplete=()=>{cleanup();resolve(result);};
      tx.onabort=()=>{cleanup();reject(fault || signal?.reason || tx.error || new Error('Save interrupted.'));};
    });
  }
  function source(raw,setup){
    return raw===undefined && !setup.epoch ? legacyStorage().getItem(KEY) ?? undefined : raw;
  }
  const rawText=raw=>typeof raw==='string'?raw:JSON.stringify(raw) ?? null;
  function snapshot(records,stored,setup){
    if(setup.resetCleanup)return {...resultOf(null,setup),resetCleanup:true};
    const raw=source(stored,setup);
    let plant=null,result;
    try{
      if(raw!==undefined)plant=loadSnapshot(raw,Date.now(),visible());
      result=resultOf(plant,setup);
      const allowed=plant?['game','water','watered','garden-guide','phone-guide']:['welcome','name','tour'];
      if(plant && plant.sproutDebut===plant.id && !plant.tutorial && result.phase==='phone-guide')result.phase='game';
      if(!allowed.includes(result.phase))throw new SaveIssue('The setup record needs recovery.',rawText(raw));
    }catch(error){
      if(error instanceof SaveIssue)error.recovery={epoch:setup.epoch,revision:revisionOf(setup),raw:rawText(raw),phase:setup.phase};
      throw error;
    }
    if(plant){
      const text=JSON.stringify(plant);
      if(text!==stored){
        records.put(text,currentKey);
        result.revision++;
        records.put({...setup,phase:result.phase,revision:result.revision},setupKey);
        stageGardenReminder(records,plant,setup.epoch,legacyStorage);
      }
    }
    return result;
  }
  function change(expected,operation,signal){
    return transaction('readwrite',(records,raw,setup)=>{
      if(!expected || setup.resetCleanup || setup.epoch!==expected.epoch)throw stale();
      return operation(records,raw,setup);
    },signal);
  }
  function confirm(expected,raw,setup){
    if(expected.revision!==revisionOf(setup))throw stale();
    const stored=source(raw,setup);
    if(Object.hasOwn(expected,'raw')){
      if(expected.phase!==setup.phase || expected.raw!==rawText(stored))throw stale();
      return;
    }
    // Older windows can write without incrementing revision. Compare the
    // reviewed snapshot only at confirmation, without storing a second copy.
    const current=resultOf(expected.plant,setup);
    if(stored!==(expected.plant?JSON.stringify(expected.plant):undefined) ||
      current.phase!==expected.phase || current.draft!==expected.draft ||
      JSON.stringify(current.invite)!==JSON.stringify(expected.invite))throw stale();
  }
  function save(records,plant,setup){
    if(plant){
      records.put(JSON.stringify(plant),currentKey);
      stageGardenReminder(records,plant,setup.epoch,legacyStorage);
    }
    records.put(setup,setupKey);
    return resultOf(plant,setup);
  }
  return {
    async read(){
      const next=await transaction('readwrite',(records,raw,setup)=>{
        const current=snapshot(records,raw,setup);
        // An older tab can remove a frame without knowing about the separate
        // files. Reconcile them once per launch, only after a successful read.
        if(!checkedOriginals && !current.resetCleanup)pruneOriginals(records,frameOriginalIds(current.plant));
        return current;
      },undefined,6000);
      if(!next.resetCleanup)checkedOriginals=true;
      return next;
    },
    exportRaw:()=>transaction('readonly',(_,raw,setup)=>rawText(source(raw,setup))),
    async exportBackup(expectedRaw){
      const snapshot=await transaction('readonly',(records,row,setup)=>{
        const raw=rawText(source(row,setup)),captured={raw,originals:null};
        if(expectedRaw!==undefined && raw!==expectedRaw)throw stale();
        loadSavedOriginals(records,raw,files=>{captured.originals=files;});
        return captured;
      });
      return packGardenBackup(snapshot.raw,snapshot.originals);
    },
    async cameraPhotoKeys(){
      const keys=await transaction('readonly',records=>records.getAllKeys(IDBKeyRange.bound('camera/', 'camera/\uffff')));
      return keys.result.reverse();
    },
    async readCameraPhoto(key){
      if(!key.startsWith('camera/'))return null;
      const request=await transaction('readonly',records=>records.get(key));
      return request.result ?? null;
    },
    saveCameraPhoto(key,file){
      return transaction('readwrite',(records,raw,setup)=>{
        if(!raw || setup.resetCleanup || !key.startsWith('camera/'))throw stale();
        records.add(file,key);
      });
    },
    async readFrameOriginal(id){
      if(!validOriginalId(id))return null;
      const db=await connection();
      return new Promise((resolve,reject)=>{
        const req=db.transaction(storeName,'readonly').objectStore(storeName).get(assetKey(id));
        req.onsuccess=()=>resolve(req.result instanceof Blob?req.result:null);
        req.onerror=()=>reject(req.error);
      });
    },
    mayChangeAlerts(epoch,plantId){
      return transaction('readonly',(_,raw,setup)=>!setup.resetCleanup && setup.epoch===epoch &&
        (raw===undefined ? !plantId && ['welcome','name'].includes(setup.phase || 'welcome') : JSON.parse(raw).id===plantId));
    },
    alertVisit(expected,visit,action,enabled=false){
      return change(expected,(records,raw,setup)=>{
        const current=snapshot(records,raw,setup);
        const prior=current.invite;
        const firstOffer=current.phase==='watered' && !current.plant.tutorial || current.phase==='game' && current.plant?.sproutDebut===current.plant?.id;
        const resumeOffer=action==='open' && !enabled && firstOffer && prior?.round===1 && !prior.closed && prior.visit!==visit;
        const invite=resumeOffer ? {...prior,visit} : action==='open' ? beginAlertVisit(prior,visit,firstOffer,enabled)
          : answerAlertInvite(prior,visit,action==='defer');
        if(invite===prior)return current;
        const phase=action!=='open' && current.phase==='welcome'?'name':current.phase;
        const next={...setup,revision:current.revision+1,phase,invite};
        records.put(next,setupKey);
        return resultOf(current.plant,next);
      });
    },
    setup(expected,next,draft='',options={}){
      return change(expected,(records,raw,setup)=>{
        const current=snapshot(records,raw,setup);
        if(current.phase!==expected.phase)throw stale();
        let plant=current.plant,firstDay=current.firstDay;
        if(plant?.tutorial && next==='game')throw stale();
        switch(current.phase+'-'+next){
          case 'tour-welcome': case 'welcome-name': case 'name-welcome': case 'name-name': break;
          case 'name-first-water': case 'name-water':
            plant=newPlant(Date.now(),draft);
            plant=checkIn(plant,plant.plantedAt);
            if(next==='first-water'){plant={...plant,tutorial:newTutorial()};next='water';}
            firstDay={id:plant.id,visitCoins:lifeOf(plant).balance};
            plant=milestone(plant,'name','Named the seed '+plant.name+'.',plant.plantedAt);
            break;
          case 'game-game':
            if((plant.sproutDebut!==plant.id && firstDay?.id!==plant.id) || plant.stage==='seed')throw stale();
            if(plant.sproutDebut){plant={...plant};delete plant.sproutDebut;}
            if(typeof options.startDewLesson==='boolean' || options.startDewLesson==='vine')plant=startDewLesson(plant,options.startDewLesson);
            firstDay=null;
            break;
          case 'watered-game': case 'watered-garden-guide':
          case 'garden-guide-phone-guide': case 'phone-guide-game':break;
          default:throw new SaveIssue('Open the current setup step and try again.');
        }
        let invite=current.invite;
        if(current.phase==='watered' && next==='garden-guide' && options.answerInvite){
          invite=answerAlertInvite(invite,options.answerInvite.visit,options.answerInvite.defer);
        }
        return save(records,plant,{epoch:setup.epoch,revision:current.revision+1,invite,firstDay,phase:next,...(next==='name'?{draft}:{})});
      },options.signal);
    },
    async update(expected,fn,options){
      let staged;
      if(options?.frameOriginal){
        const {id,blob}=options.frameOriginal;
        if(!validOriginalId(id))throw new SaveIssue('The frame photo has an invalid ID.');
        staged={id,blob:await canonicalFrameBlob(blob)};
      }
      const writing=change(expected,(records,raw,setup)=>{
        const current=snapshot(records,raw,setup);
        if(!current.plant || current.plant.id!==expected.plant?.id)throw stale();
        const plant=fn(current.plant);
        const finished=current.plant.tutorial && !plant.tutorial;
        const phase=finished?'game':current.phase==='water' && plant.wateredAt!==null?'watered':current.phase;
        if(plant===current.plant && phase===current.phase)return current;
        updateOriginals(records,current.plant,plant,staged);
        let firstDay=!finished && current.firstDay?.id===plant.id?current.firstDay:null;
        if(firstDay && phase==='watered' && current.phase==='water'){
          const checkedIn=checkIn(current.plant,plant.wateredAt);
          firstDay={...firstDay,drinkCoins:lifeOf(plant).balance-lifeOf(checkedIn).balance};
        }
        const invite=current.plant.dewLesson && !plant.dewLesson?{done:true}:setup.invite;
        return save(records,plant,{epoch:setup.epoch,revision:current.revision+1,phase,invite,firstDay});
      },options?.signal);
      const receipt=options?.purchaseReceipt;
      if(!receipt)return writing;
      let timer;
      // A suspended web view can lose its write-completion callback. A read on
      // the same store waits for that write, so only a durable item can finish
      // the handoff. Return the latest snapshot, including concurrent changes.
      const confirmation=new Promise((resolve,reject)=>{
        timer=setTimeout(()=>{
          transaction('readonly',(_,raw,setup)=>{
            if(setup.epoch!==expected.epoch || setup.resetCleanup || !raw)throw stale();
            const plant=loadSnapshot(raw,Date.now(),visible());
            if(plant.id!==expected.plant.id || !lifeOf(plant).items.some(i=>
              i.id===receipt.id && i.sku===receipt.sku && i.slot===receipt.slot))throw stale();
            return resultOf(plant,setup);
          },options.signal,6000).then(resolve,reject);
        },1200);
      });
      try{return await Promise.race([writing,confirmation]);}
      finally{clearTimeout(timer);}
    },
    async replace(expected,backup){
      // Decode before opening the transaction. Confirm the reviewed garden
      // again inside it, including if another window changed during decoding.
      const {plant,originals}=await prepareRestoredGarden(backup,Date.now(),visible());
      return change(expected,(records,raw,setup)=>{
        confirm(expected,raw,setup);
        const original=source(raw,setup);
        if(original!==undefined){
          records.put(original,'before-restore');
          loadSavedOriginals(records,original,files=>{
            if(files.size)records.put(files,previousOriginalsKey);
            else records.delete(previousOriginalsKey);
          });
        }
        // Also clear assets orphaned by an older open window. Reads of the old
        // blobs precede deletes. Freshly remapped IDs follow this key snapshot.
        pruneOriginals(records,new Set());
        for(const [id,blob] of originals)records.add(blob,assetKey(id));
        return save(records,plant,{epoch:crypto.randomUUID(),revision:0,phase:plant.tutorial?(plant.wateredAt===null?'water':plant.tutorial.step==='pot'?'watered':'phone-guide'):'game'});
      });
    },
    reset(expected){
      return change(expected,(records,raw,setup)=>{
        confirm(expected,raw,setup);
        if(!Object.hasOwn(expected,'raw') && !expected.plant)throw stale();
        records.clear();
        const next={epoch:crypto.randomUUID(),revision:0,phase:'tour',resetCleanup:true};
        records.put(next,setupKey);
        return {...resultOf(null,next),resetCleanup:true};
      });
    },
    finishReset(retireAlerts){
      return transaction('readwrite',(records,raw,setup)=>{
        if(!setup.resetCleanup)return snapshot(records,raw,setup);
        // The erase is already committed. If cleanup is interrupted, the marker
        // survives and repeating these removals is safe before new enrollment.
        const storage=legacyStorage();
        for(const key of [KEY,'plantigochi.browser-play','plantigochi.tilt','plantigochi.care-library.v1','plantigochi-save-signal'])storage.removeItem(key);
        retireAlerts(storage);
        const {resetCleanup,...next}=setup;
        records.put(next,setupKey);
        return resultOf(null,next);
      });
    },
  };
}

export const deviceGarden=gardenStore(()=>localStorage,()=>!document.hidden);
export const readFrameOriginal=deviceGarden.readFrameOriginal;
