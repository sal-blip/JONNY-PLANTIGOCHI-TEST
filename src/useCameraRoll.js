import {useEffect,useState,useRef} from 'react';
import {deviceGarden} from './gardenStore.js';

// Keep only the displayed full-size photo in memory. The roll index holds keys.
export function useCameraRoll(){
  const [keys,setKeys]=useState([]),[selected,select]=useState(null);
  const [loaded,setLoaded]=useState(null),[warning,setWarning]=useState('');
  const memory=useRef(new Map());
  const key=selected ?? keys[0];
  useEffect(()=>{
    let active=true;
    deviceGarden.cameraPhotoKeys().then(stored=>{
      if(active)setKeys(current=>[...new Set([...current,...stored])].sort().reverse());
    }).catch(()=>{if(active)setWarning('The photo roll could not be opened on this device.');});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    let active=true,url;
    if(key)Promise.resolve(memory.current.get(key) || deviceGarden.readCameraPhoto(key)).then(file=>{
      if(!active)return;
      if(!file){setKeys(list=>list.filter(id=>id!==key));select(null);return;}
      url=URL.createObjectURL(file);setLoaded({key,file,url});
    }).catch(()=>{if(active)setWarning('Couldn’t open this photo.');});
    return ()=>{active=false;if(url)URL.revokeObjectURL(url);};
  },[key]);
  async function add(file){
    const id='camera/'+Date.now()+'-'+crypto.randomUUID();
    try{await deviceGarden.saveCameraPhoto(id,file);setWarning('');}
    catch{memory.current.set(id,file);setWarning('Device storage is unavailable. Save this photo before leaving the camera.');}
    setKeys(list=>[id,...list]);select(null);
  }
  return {keys,selected,select,photo:key && loaded?.key===key?loaded:null,add,warning};
}
