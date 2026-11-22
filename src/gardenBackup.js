import {readPlant} from './game.js';

// Previously exported gardens may exceed the current budget for adding photos.
export async function readGardenBackup(file){
  let text;
  try {text=await file.text();}
  catch {throw new Error('This file could not be read. Keep the original and select it again.');}
  const plant=readPlant(text);
  if(!plant)throw new Error('This file is damaged or uses an unsupported Plantigochi save version.');
  return plant;
}

export function downloadFile(blob,name){
  const url=URL.createObjectURL(blob), link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
