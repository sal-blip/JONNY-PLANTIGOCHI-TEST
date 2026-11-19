import React, {useState} from 'react';
import {JarArt,PressedLeaf} from './ActivityArt.jsx';
import { HOUR, ROOT_TIME, STAGE_NAMES, countdown } from './game.js';
import {canPlay,gameNames} from './pocketPlay.js';

export function PlayMenu({plant,start,open}) {
  return <div className="menu-items">{Object.entries(gameNames).map(([id,name])=>
    <button key={id} disabled={!canPlay(id,plant)} onClick={()=>start(id)}>{name}<small className="setting-value">{id==='dew'?'Sprout':'Young plant'}</small></button>)}
    <button onClick={()=>open('jar')}>Cutting jar<small className="setting-value">{plant.jar?'View jar':'Grown plant'}</small></button>
    <p className="hint">Dew Catch uses the arrows to catch three drops. In Leaf Echo, copy the three beats with left, heart, and right. Open the menu to leave a game.</p></div>;
}

export function CuttingJar({plant,now,cut,pot}) {
  if (!plant.jar) return <><div className="garden-specimen"><JarArt progress={0}/></div>
    <p>{plant.stage==='grown' && plant.deadAt===null ? 'Choose a stem. Its roots will grow in the jar over 12 hours.' : 'A fully grown Monstera can leave one stem here for its next generation.'}</p>
    {plant.stage==='grown' && plant.deadAt===null && <div className="menu-items"><button onClick={()=>cut('left')}>Take left stem</button><button onClick={()=>cut('right')}>Take right stem</button></div>}</>;
  const remaining=plant.jar.cutAt+ROOT_TIME-now;
  return <><div className="garden-specimen"><JarArt progress={Math.min(1,Math.max(0,1-remaining/ROOT_TIME))}/></div>
    <h2>Generation {plant.jar.generation}</h2><p>{remaining>0?'Rooting · '+countdown(remaining):'Rooted and ready. The cutting can stay in its jar.'}</p>
    {plant.deadAt!==null && <div className="menu-items"><button disabled={remaining>0} onClick={pot}>Pot this cutting</button></div>}</>;
}

export function LeafBook({plant,now,restart,open}) {
  const [offset,setOffset]=useState(0);
  const i=Math.max(0,plant.book.length-1-offset),leaf=plant.book[i];
  const rooted=plant.jar && now>=plant.jar.cutAt+ROOT_TIME;
  return <>{leaf ? <><div className="pressed-entry"><PressedLeaf stage={leaf.stage}/><div><h2>Generation {leaf.generation}</h2><p>{STAGE_NAMES[leaf.stage]} · {Math.floor((leaf.diedAt-leaf.plantedAt)/HOUR)} hours old</p><p>{leaf.cause}</p></div></div>
    {plant.book.length>1 && <div className="pager"><button disabled={i===0} onClick={()=>setOffset(offset+1)}>Older</button><span>{i+1} / {plant.book.length}</span><button disabled={i===plant.book.length-1} onClick={()=>setOffset(offset-1)}>Newer</button></div>}</>
    : <p>A pressed leaf will remember each Monstera you grow.</p>}
    {plant.deadAt!==null && <div className="menu-items"><button onClick={()=>restart('seed')}>Plant a fresh seed</button>
      {plant.jar && (rooted ? <button onClick={()=>restart('cutting')}>Pot this cutting</button> : <button onClick={()=>open('jar')}>Visit rooting cutting</button>)}</div>}</>;
}
