import {readPlant} from './game.js';
import {rasterType,validOriginalId,originalImageTypes} from './frameUpload.js';

const magic=new TextEncoder().encode('Plantigochi photo backup\n');
const headerSize=magic.length+4;
const invalid=()=>new Error('This file is damaged or uses an unsupported Plantigochi save version.');

function framePhotos(plant){
  return Array.isArray(plant?.gardenLife?.items)?plant.gardenLife.items.map(item=>item?.photo).filter(Boolean):[];
}
export function frameOriginalIds(plant){
  return new Set(framePhotos(plant).map(photo=>photo.originalId).filter(validOriginalId));
}
export function originalIdsFromRaw(raw){
  try{return frameOriginalIds(JSON.parse(raw));}catch{return new Set();}
}
export async function canonicalFrameBlob(blob){
  if(!blob || typeof blob.slice!=='function' || !Number.isSafeInteger(blob.size) || blob.size<=0)throw invalid();
  const type=await rasterType(blob);
  if(!originalImageTypes.includes(type))throw new Error('This frame original has an unsupported image format.');
  return blob.type===type?blob:blob.slice(0,blob.size,type);
}

// Assign fresh IDs to restored files, even when importing a backup of this same
// garden. Renderers and other tabs can safely treat each stored ID as immutable.
export async function prepareRestoredGarden(input,now,visible){
  const bundled=input?.originals instanceof Map;
  const plant=readPlant(JSON.stringify(bundled?input.plant:input),now,visible);
  if(!plant)throw new Error('This save needs recovery or a newer version of Plantigochi.');
  const supplied=bundled?input.originals:new Map(),originals=new Map(),newIds=new Map();
  const used=frameOriginalIds(plant);
  for(const [id,blob] of supplied){
    if(!used.has(id))throw invalid();
    const fresh=crypto.randomUUID();
    newIds.set(id,fresh);originals.set(fresh,await canonicalFrameBlob(blob));
  }
  for(const photo of framePhotos(plant)){
    if(newIds.has(photo.originalId))photo.originalId=newIds.get(photo.originalId);
    else delete photo.originalId; // A v47 JSON copy may contain just the preview.
  }
  return {plant,originals};
}

// The manifest precedes the original files. Blob parts and slices keep these
// images binary throughout the backup, including on memory-constrained phones.
export function packGardenBackup(raw,originals){
  if(raw==null)return null;
  const ids=originalIdsFromRaw(raw),missing=[...ids].filter(id=>!originals.has(id));
  const source=new Blob([raw],{type:'application/json'});
  if(!originals.size)return {blob:source,extension:'json',missingOriginals:missing.length};
  const files=[...originals].map(([id,blob])=>({id,type:blob.type,size:blob.size}));
  const manifest=new TextEncoder().encode(JSON.stringify({version:1,gardenBytes:source.size,files,missing}));
  if(manifest.byteLength>0xffffffff)throw new Error('This garden exceeds the backup file format limit.');
  const header=new Uint8Array(headerSize);
  header.set(magic);new DataView(header.buffer).setUint32(magic.length,manifest.length,true);
  return {blob:new Blob([header,manifest,source,...originals.values()],{type:'application/octet-stream'}),
    extension:'plantigochi',missingOriginals:missing.length};
}

export async function readGardenBackup(file){
  let header,text,bundled;
  try{
    header=file.slice?new Uint8Array(await file.slice(0,headerSize).arrayBuffer()):null;
    bundled=header && magic.every((byte,index)=>header[index]===byte);
    if(!bundled)text=await file.text();
  }catch{throw new Error('This file could not be read. Keep the original and select it again.');}
  if(!bundled){
    const plant=readPlant(text);
    if(!plant)throw invalid();
    return {plant,originals:new Map()};
  }
  if(header.length!==headerSize)throw invalid();
  const length=new DataView(header.buffer).getUint32(magic.length,true);
  let offset=headerSize+length;
  if(offset>file.size)throw invalid();
  let manifest;
  try{manifest=JSON.parse(await file.slice(headerSize,offset).text());}catch{throw invalid();}
  if(manifest?.version!==1 || !Array.isArray(manifest.files) || !Array.isArray(manifest.missing) ||
     !Number.isSafeInteger(manifest.gardenBytes) || manifest.gardenBytes<=0 || manifest.gardenBytes>file.size-offset)throw invalid();
  const plant=readPlant(await file.slice(offset,offset+manifest.gardenBytes).text());
  if(!plant)throw invalid();
  offset+=manifest.gardenBytes;
  const ids=frameOriginalIds(plant),originals=new Map();
  for(const id of manifest.missing)if(!ids.delete(id))throw invalid();
  for(const entry of manifest.files){
    if(!ids.has(entry?.id) || originals.has(entry.id) || !originalImageTypes.includes(entry.type) ||
       !Number.isSafeInteger(entry.size) || entry.size<=0 || entry.size>file.size-offset)throw invalid();
    const blob=file.slice(offset,offset+entry.size,entry.type);
    if(await rasterType(blob)!==entry.type)throw invalid();
    originals.set(entry.id,blob);offset+=entry.size;
  }
  if(originals.size!==ids.size || offset!==file.size)throw invalid();
  return {plant,originals};
}

export function downloadFile(blob,name){
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
