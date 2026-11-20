import {KEY, newPlant, readPlant} from './game.js';

const databaseName = 'plantigochi.pocket.garden';
const storeName = 'garden';
const currentKey = 'current';
const setupKey = 'setup';

export class SaveIssue extends Error {
  constructor(message,raw=null) { super(message); this.raw=raw; }
}
export function loadSnapshot(raw, now=Date.now(), visible=true) {
  if (typeof raw!=='string') throw new SaveIssue('The existing garden could not be read.',JSON.stringify(raw));
  const garden=readPlant(raw,now,visible);
  if (!garden) throw new SaveIssue('This save needs recovery or a newer version of Plantigochi.',raw);
  return garden;
}
function openDB() {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(databaseName,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(storeName);
    req.onblocked=()=>reject(new SaveIssue('Close other Plantigochi tabs and reopen the garden.'));
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};
  });
}
export function gardenStore(legacyStorage, visible) {
  let database;
  async function transaction(mode, apply) {
    database ??= openDB().catch(error=>{database=null;throw error;});
    const db=await database;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,mode), records=tx.objectStore(storeName);
      const current=records.get(currentKey), setup=records.get(setupKey);
      let result, fault;
      setup.onsuccess=()=>{
        try {result=apply(records,current.result,setup.result || {epoch:null});}
        catch(error){fault=error;fault.epoch=setup.result?.epoch ?? null;tx.abort();}
      };
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(fault || tx.error || new Error('Save interrupted'));
    });
  }
  const decode=raw=>loadSnapshot(raw,Date.now(),visible());
  function snapshot(records,raw,setup) {
    const migrating=raw===undefined && !setup.epoch;
    if(migrating)raw=legacyStorage().getItem(KEY) ?? undefined;
    const plant=raw===undefined?null:decode(raw);
    if(plant) {
      const text=JSON.stringify(plant);
      if(migrating || text!==raw)
        records.put(text,currentKey);
    }
    const phase=setup.phase || (plant?'game':'welcome');
    const allowed=plant?['game','water','watered']:['welcome','name','tour'];
    if(!allowed.includes(phase))throw new SaveIssue('The setup record needs recovery.',raw ?? null);
    return {plant,phase,epoch:setup.epoch,draft:setup.draft || ''};
  }
  function change(expected, operation){
    return transaction('readwrite',(records,raw,setup)=>{
      if(setup.epoch!==expected.epoch)throw new SaveIssue('This garden changed in another window.');
      return operation(records,raw,setup);
    });
  }
  function save(records,plant,setup){
    if(plant)records.put(JSON.stringify(plant),currentKey);
    records.put(setup,setupKey);
    return {plant,phase:setup.phase,epoch:setup.epoch,draft:setup.draft || ''};
  }
  return {
    read:()=>transaction('readwrite',snapshot),
    exportRaw:()=>transaction('readonly',(_,raw,setup)=>raw ?? (setup.epoch?null:legacyStorage().getItem(KEY))),
    setup(expected,next,draft=''){
      return change(expected,(records,raw,setup)=>{
        const current=snapshot(records,raw,setup);
        if(current.phase!==expected.phase)return current;
        let plant=current.plant;
        switch(current.phase+'-'+next){
          case 'tour-welcome': case 'welcome-name': case 'name-welcome': case 'name-name': break;
          case 'name-water': plant=newPlant(Date.now(),draft);break;
          case 'watered-game': break;
          default:throw new SaveIssue('Open the current setup step and try again.');
        }
        return save(records,plant,{epoch:setup.epoch,phase:next,...(next==='name'?{draft}:{})});
      });
    },
    update(expected,fn){
      return change(expected,(records,raw,setup)=>{
        const current=snapshot(records,raw,setup);
        if(!current.plant || current.plant.id!==expected.plant?.id)return current;
        const plant=fn(current.plant);
        const phase=current.phase==='water' && plant.wateredAt!==null?'watered':current.phase;
        if(plant===current.plant && phase===current.phase)return current;
        return save(records,plant,{epoch:setup.epoch,phase});
      });
    },
    replace(expected,backup){
      return change(expected,(records,raw,setup)=>{
        if(raw!==undefined)records.put(raw,'before-restore');
        return save(records,decode(JSON.stringify(backup)),{epoch:setup.epoch,phase:'game'});
      });
    },
    reset(expected,onClear){
      return change(expected,(records,raw)=>{
        if(!raw || JSON.parse(raw).id!==expected.plant?.id)throw new SaveIssue('Reopen Settings to reset the current garden.');
        const storage=legacyStorage();
        onClear(storage);
        storage.removeItem(KEY);
        storage.removeItem('plantigochi.tilt');
        storage.removeItem('plantigochi-save-signal');
        records.clear();
        return save(records,null,{epoch:crypto.randomUUID(),phase:'tour'});
      });
    },
  };
}
