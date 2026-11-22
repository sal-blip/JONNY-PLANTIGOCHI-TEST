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
    let blocked=false;
    req.onupgradeneeded=()=>req.result.createObjectStore(storeName);
    req.onblocked=()=>{blocked=true;reject(new SaveIssue('Close other Plantigochi tabs and reopen the garden.'));};
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{if(blocked)req.result.close();else resolve(req.result);};
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
      db.onversionchange=()=>{db.close();database=null;};
      return db;
    }).catch(error=>{database=null;throw error;});
    return database;
  }
  async function transaction(mode,apply){
    const db=await connection();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,mode),records=tx.objectStore(storeName);
      const current=records.get(currentKey),setup=records.get(setupKey);
      let result,fault;
      setup.onsuccess=()=>{
        try{result=apply(records,current.result,setup.result || {epoch:null});}
        catch(error){fault=error;tx.abort();}
      };
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(fault || tx.error || new Error('Save interrupted.'));
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
      const allowed=plant?['game','water','watered']:['welcome','name','tour'];
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
        records.put({...setup,revision:result.revision},setupKey);
        stageGardenReminder(records,plant,setup.epoch,legacyStorage);
      }
    }
    return result;
  }
  function change(expected,operation){
    return transaction('readwrite',(records,raw,setup)=>{
      if(!expected || setup.resetCleanup || setup.epoch!==expected.epoch)throw stale();
      return operation(records,raw,setup);
    });
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
      });
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
        const resumeOffer=action==='open' && !enabled && current.phase==='watered' && prior?.round===1 && !prior.closed && prior.visit!==visit;
        const invite=resumeOffer ? {...prior,visit} : action==='open' ? beginAlertVisit(prior,visit,current.phase==='watered',enabled)
          : answerAlertInvite(prior,visit,action==='defer');
        if(invite===prior)return current;
        const phase=action!=='open' && current.phase==='welcome'?'name':current.phase;
        const next={...setup,revision:current.revision+1,phase,invite};
        records.put(next,setupKey);
        return resultOf(current.plant,next);
      });
    },
    setup(expected,next,draft=''){
      return change(expected,(records,raw,setup)=>{
        const current=snapshot(records,raw,setup);
        if(current.phase!==expected.phase)throw stale();
        let plant=current.plant,firstDay=current.firstDay;
        switch(current.phase+'-'+next){
          case 'tour-welcome': case 'welcome-name': case 'name-welcome': case 'name-name': break;
          case 'name-water':
            plant=newPlant(Date.now(),draft);
            plant=checkIn(plant,plant.plantedAt);
            firstDay={id:plant.id,visitCoins:lifeOf(plant).balance};
            plant=milestone(plant,'name','Named the seed '+plant.name+'.',plant.plantedAt);
            break;
          case 'game-game':
            if(!firstDay || firstDay.id!==plant.id || plant.stage==='seed')throw stale();
            firstDay=null;
            break;
          case 'watered-game':break;
          default:throw new SaveIssue('Open the current setup step and try again.');
        }
        return save(records,plant,{epoch:setup.epoch,revision:current.revision+1,invite:setup.invite,firstDay,phase:next,...(next==='name'?{draft}:{})});
      });
    },
    async update(expected,fn,options){
      let staged;
      if(options?.frameOriginal){
        const {id,blob}=options.frameOriginal;
        if(!validOriginalId(id))throw new SaveIssue('The frame photo has an invalid ID.');
        staged={id,blob:await canonicalFrameBlob(blob)};
      }
      return change(expected,(records,raw,setup)=>{
        const current=snapshot(records,raw,setup);
        if(!current.plant || current.plant.id!==expected.plant?.id)throw stale();
        const plant=fn(current.plant);
        const phase=current.phase==='water' && plant.wateredAt!==null?'watered':current.phase;
        if(plant===current.plant && phase===current.phase)return current;
        updateOriginals(records,current.plant,plant,staged);
        let firstDay=current.firstDay?.id===plant.id?current.firstDay:null;
        if(firstDay && phase==='watered' && current.phase==='water'){
          const checkedIn=checkIn(current.plant,plant.wateredAt);
          firstDay={...firstDay,drinkCoins:lifeOf(plant).balance-lifeOf(checkedIn).balance};
        }
        return save(records,plant,{epoch:setup.epoch,revision:current.revision+1,phase,invite:setup.invite,firstDay});
      });
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
        return save(records,plant,{epoch:crypto.randomUUID(),revision:0,phase:'game'});
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
        for(const key of [KEY,'plantigochi.tilt','plantigochi.care-library.v1','plantigochi-save-signal'])storage.removeItem(key);
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
