import React,{useState} from 'react';
import {JarArt,PressedLeaf} from './ActivityArt.jsx';
import {HOUR,ROOT_TIME,STAGE_NAMES,countdown} from './game.js';

export default function GardenKeepsakes({kind,plant,now,act,openJar,busy}){
  const [index,setIndex]=useState(0);
  const dead=plant.deadAt!==null,jar=plant.jar,rooted=jar && now>=jar.cutAt+ROOT_TIME;
  if(kind==='jar')return <div className="keepsake-details">
    <div className="keepsake-print"><JarArt progress={jar?Math.min(1,(now-jar.cutAt)/ROOT_TIME):null}/></div>
    <p>{jar?(rooted?'Roots are ready. Pot this cutting after your active plant dies.':'Roots in '+countdown(jar.cutAt+ROOT_TIME-now)):
      plant.fungusAt!=null && !dead?'Treat your active plant before taking a cutting.':'A fully grown plant in the keychain can spare one stem. Roots take 12 hours.'}</p>
    <div className="menu-items">{!jar && !dead && plant.stage==='grown' && plant.fungusAt==null &&
      ['left','right'].map(stem=><button key={stem} disabled={busy} onClick={()=>act('cut',stem)}>Take {stem} stem</button>)}
      {dead && rooted && <button disabled={busy} onClick={()=>act('replant','cutting')}>Pot rooted cutting</button>}</div>
  </div>;
  const page=Math.min(index,Math.max(0,plant.book.length-1)),leaf=plant.book[plant.book.length-1-page];
  const hours=leaf?Math.floor((leaf.diedAt-leaf.plantedAt)/HOUR):0;
  const age=hours>=24?Math.floor(hours/24)+'d '+hours%24+'h':hours+'h';
  return <div className="keepsake-details">
    {leaf?<><div className="keepsake-print"><PressedLeaf stage={leaf.stage}/></div>
      <strong>{leaf.name || 'Monstera'} · Gen {leaf.generation}</strong>
      <p>{STAGE_NAMES[leaf.stage]} · {age} old · {leaf.cause} · {new Date(leaf.diedAt).toLocaleDateString()}</p>
      {plant.book.length>1 && <div className="leaf-pages"><button disabled={!page} onClick={()=>setIndex(page-1)}>Newer</button>
        <span>{page+1} / {plant.book.length}</span><button disabled={page+1===plant.book.length} onClick={()=>setIndex(page+1)}>Older</button></div>}</>:
      <p>Your pressed leaves will live here. Each one remembers a plant you raised.</p>}
    {dead && <div className="menu-items"><button disabled={busy} onClick={()=>act('replant','seed')}>Plant a new seed</button>
      {jar && (rooted?<button disabled={busy} onClick={()=>act('replant','cutting')}>Pot rooted cutting</button>:<button onClick={openJar}>Visit rooting cutting</button>)}</div>}
  </div>;
}
