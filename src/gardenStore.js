import {beginAlertVisit,answerAlertInvite} from './alertInvitation.js';
import {milestone} from './gardenEconomy.js';
import {stageGardenReminder} from './gardenReminder.js';
import {KEY,newPlant,readPlant} from './game.js';

const databaseName='plantigochi.pocket.garden';
const storeName='garden', currentKey='current', setupKey='setup';

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
  return {plant,phase:setup.phase || (plant?'game':'welcome'),epoch:setup.epoch,revision:revisionOf(setup),draft:setup.draft || '',invite:setup.invite || null};
}
export function gardenStore(legacyStorage,visible){
  let database;
  async function transaction(mode,apply){
    database ??= openDB().then(db=>{
      db.onversionchange=()=>{db.close();database=null;};
      return db;
    }).catch(error=>{database=null;throw error;});
    const db=await database;
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
    read:()=>transaction('readwrite',snapshot),
    exportRaw:()=>transaction('readonly',(_,raw,setup)=>rawText(source(raw,setup))),
    mayChangeAlerts(epoch,plantId){
      return transaction('readonly',(_,raw,setup)=>!setup.resetCleanup && setup.epoch===epoch &&
        (raw===undefined ? !plantId && ['welcome','name'].includes(setup.phase || 'welcome') : JSON.parse(raw).id===plantId));
    },
    alertVisit(expected,visit,action,enabled=false){
      return change(expected,(records,raw,setup)=>{
        const current=snapshot(records,raw,setup);
        const prior=current.invite;
        const invite=action==='open' ? beginAlertVisit(prior,visit,current.phase==='welcome',enabled)
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
        let plant=current.plant;
        switch(current.phase+'-'+next){
          case 'tour-welcome': case 'welcome-name': case 'name-welcome': case 'name-name': break;
          case 'name-water':plant=newPlant(Date.now(),draft);plant=milestone(plant,'name','Named the seed '+plant.name+'.',plant.plantedAt);break;
          case 'watered-game':break;
          default:throw new SaveIssue('Open the current setup step and try again.');
        }
        return save(records,plant,{epoch:setup.epoch,revision:current.revision+1,invite:setup.invite,phase:next,...(next==='name'?{draft}:{})});
      });
    },
    update(expected,fn){
      return change(expected,(records,raw,setup)=>{
        const current=snapshot(records,raw,setup);
        if(!current.plant || current.plant.id!==expected.plant?.id)throw stale();
        const plant=fn(current.plant);
        const phase=current.phase==='water' && plant.wateredAt!==null?'watered':current.phase;
        if(plant===current.plant && phase===current.phase)return current;
        return save(records,plant,{epoch:setup.epoch,revision:current.revision+1,phase,invite:setup.invite});
      });
    },
    replace(expected,backup){
      return change(expected,(records,raw,setup)=>{
        confirm(expected,raw,setup);
        const plant=loadSnapshot(JSON.stringify(backup),Date.now(),visible());
        const original=source(raw,setup);
        if(original!==undefined)records.put(original,'before-restore');
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
