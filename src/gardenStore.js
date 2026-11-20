import {KEY, newPlant, readPlant} from './game.js';

const databaseName = 'plantigochi.pocket.garden';
const storeName = 'garden';
const currentKey = 'current';

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
  let db;
  async function transaction(mode, apply) {
    db ??= await openDB();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,mode);
      const records=tx.objectStore(storeName);
      const read=records.get(currentKey);
      let result, fault;
      read.onsuccess=()=>{
        try {result=apply(records,read.result);} catch(error){ fault=error;tx.abort(); }
      };
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(fault || tx.error || new Error('Save interrupted'));
      tx.onerror=()=>{};
    });
  }
  const decode=raw=>loadSnapshot(raw,Date.now(),visible());
  const write=(records,p)=>{records.put(JSON.stringify(p),currentKey);return p;};
  const read=()=>transaction('readwrite',(records,raw)=>{
    const p=decode(raw);
    if(JSON.stringify(p)!==raw)write(records,p);
    return p;
  });
  return {
    read,
    async initialize() {
      await transaction('readwrite',(records,stored)=>{
        if(stored!==undefined) {const p=decode(stored);if(JSON.stringify(p)!==stored)write(records,p);return;}
        const legacy=legacyStorage().getItem(KEY);
        write(records,legacy===null?newPlant():decode(legacy));
      });
      return read();
    },
    update(fn) {
      return transaction('readwrite',(records,raw)=>{
        const previous=decode(raw);
        const next=fn(previous);
        if (next!==previous || JSON.stringify(next)!==raw) write(records,next);
        return next;
      });
    },
    replace(backup) {
      return transaction('readwrite',(records,raw)=>{
        if (raw!==undefined) records.put(raw,'before-restore');
        const next=decode(JSON.stringify(backup));
        return write(records,next);
      });
    },
  };
}
