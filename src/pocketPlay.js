import { useCallback, useEffect, useReducer, useRef } from 'react';
import {company,wake} from './game.js';
import {earnWin,lifeOf} from './gardenEconomy.js';
import {settleDewLesson} from './firstVisit.js';

import {newVine,stepVine,VINE_STEP_MS} from './vineTrail.js';

import {newPairs,stepPairs,shuffleLeaves,leafNames} from './leafPairs.js';
export const gameNames = { vine: 'Vine Trail', dew: 'Dew Catch', pairs: 'Leaf Pairs' };
export const canPlay = (name, plant) => plant.deadAt === null && Object.hasOwn(gameNames,name);
export const LEVELS = 20;
export const DEW_CHANCES = 3;
const tickMs = 50;
const randomLane = () => Math.floor(Math.random()*3);
const highestLevel = cleared => Math.min(LEVELS,(cleared || 0)+1);

// Older saves used their personal best as the resume point.
export const dewCheckpoint = plant => plant.dewRunCleared ?? plant.dewCleared;

export function saveDewCheckpoint(plant, cleared) {
  const current = dewCheckpoint(plant);
  if (current === cleared || (cleared !== 0 && cleared < current)) return plant;
  return {...plant, dewRunCleared:cleared, dewCleared:Math.max(plant.dewCleared, cleared)};
}

export function savePlayedRound(plant,name,phase,level,receipt,startedAt,time,practiceRound=false,plantTime=time){
  let p=wake(plant,plantTime);
  if(practiceRound && p.dewLesson?.status!=='round')return p;
  if(p.deadAt!==null)return practiceRound?settleDewLesson(p,'skipped'):p;
  if(name==='dew' && (!practiceRound || phase==='won'))p=saveDewCheckpoint(p,phase==='won'?level:0);
  if(phase==='won')p=earnWin(p,receipt,startedAt,time);
  p=company(p,plantTime);
  return practiceRound?settleDewLesson(p,phase,lifeOf(p).wins.includes(receipt)?3:0):p;
}

export function dewRules(level) {
  const step = level - 1;
  const fallMs = 2000 - step * 60;
  return { goal:level+2, fallMs, spacingMs:Math.round(fallMs*(1.12-0.04*step)) };
}

function startDew(g, lane, level, at) {
  return {...g,level,startedAt:at,finishedAt:null,phase:'fall',lane:1,count:0,elapsed:0,nextId:1,feedbackUntil:0,result:null,
    drops:[{id:0,lane,progress:0}],nextDropAt:dewRules(level).spacingMs};
}

function fall(g, lane, at) {
  const {goal,fallMs,spacingMs} = dewRules(g.level);
  const elapsed = g.elapsed + tickMs;
  let {count,chances,result,feedbackUntil,nextDropAt,nextId} = g;
  const drops = [];
  for (const drop of g.drops) {
    const progress = drop.progress + tickMs/fallMs;
    if (progress < 1 - 1e-8) { drops.push({...drop,progress}); continue; }
    const caught = drop.lane === g.lane;
    if (caught) {
      count++;
      if (count === goal) return {...g,phase:'won',finishedAt:at,count,chances,drops:[],result:'win'};
    } else {
      chances--;
      if (!chances) return {...g,phase:'lost',finishedAt:at,count,chances,drops:[],result:'miss'};
    }
    result = caught ? 'catch' : 'miss';
    feedbackUntil = elapsed + 240;
  }
  if (elapsed >= nextDropAt) {
    drops.push({id:nextId++,lane,progress:0});
    nextDropAt += spacingMs;
  }
  return {...g,elapsed,count,chances,drops,feedbackUntil,nextDropAt,nextId,result:elapsed<feedbackUntil ? result : null};
}

export function stepGame(g, event) {
  if (event.type === 'exit') return null;
  if (event.type==='enter' && event.name==='vine')return newVine();
  if (event.type==='enter' && event.name==='pairs')return newPairs();
  if (event.type === 'enter' && event.name==='dew') return {name:event.name,phase:'ready',lane:1,count:0,chances:DEW_CHANCES,drops:[],
    level:highestLevel(event.cleared),unlocked:highestLevel(event.cleared),
    ...(event.lesson?{lesson:true,level:1,unlocked:1,count:event.lesson.caught,chances:event.lesson.chances,startedAt:event.lesson.startedAt}:{})};
  if (!g) return null;
  if(g.name==='pairs')return stepPairs(g,event);
  if(g.name==='vine')return stepVine(g,event);
  if(g.lesson && (g.phase==='won' || g.phase==='lost'))return g;
  if (event.type === 'key') {
    if (g.phase === 'ready' || g.phase === 'won') {
      if (event.key !== 'heart') {
        if (g.name !== 'dew' || g.phase !== 'ready') return g;
        return {...g,level:Math.max(1,Math.min(g.unlocked,g.level+(event.key==='left'?-1:1)))};
      }
      if (g.phase === 'won' && g.level===LEVELS) return {...g,phase:'ready',unlocked:LEVELS,chances:DEW_CHANCES,count:0,result:null};
      const level = g.phase==='won' ? g.level+1 : g.level;
      const round=startDew({...g,unlocked:Math.max(g.unlocked,level)},event.dropLane,level,event.at);
      return g.lesson?{...round,count:g.count,startedAt:g.startedAt ?? event.at}:round;
    }
    if (g.name === 'dew' && g.phase === 'fall') {
      const dx = event.key === 'left' ? -1 : event.key === 'right' ? 1 : 0;
      return { ...g, lane:Math.max(0,Math.min(2,g.lane + dx)) };
    }
    return g;
  }
  if (event.type !== 'tick') return g;
  if (g.phase === 'lost') return startDew({...g,chances:DEW_CHANCES,unlocked:1},event.dropLane,1,event.at);
  if (g.phase === 'fall') return fall(g,event.dropLane,event.at);
  return g;
}

export function playText(g) {
  if(g.name==='vine'){
    if(g.phase==='ready')return 'Collect suns · ♥ Start';
    if(g.phase==='won')return 'Garden full! ♥ Again';
    if(g.phase==='lost')return g.count+' suns · ♥ Retry';
    return g.count+' suns · ◂ Turn ▸';
  }
  if(g.name==='pairs'){
    if(g.phase==='ready')return `Find ${leafNames.length} pairs · ♥ Start`;
    if(g.phase==='won')return 'All paired! ♥ Again';
    if(g.phase==='lost')return 'Game over · ♥ Retry';
    if(g.phase==='peek')return 'Two different leaves';
    const revealed=g.open.includes(g.cursor) || g.matched.includes(g.cursor);
    return (g.matched.length/2)+'/'+leafNames.length+' · '+(revealed?leafNames[g.deck[g.cursor]]:'♥ Flip '+(g.cursor+1));
  }
  if(g.lesson && g.phase==='won')return 'Round clear!';
  if(g.lesson && g.phase==='lost')return 'Three strikes';
  if(g.lesson && g.phase==='ready' && g.startedAt!=null)return g.count+'/3 · ♥ Resume';
  if (g.phase === 'lost') return 'Restarting at Lv 1';
  if (g.phase === 'ready') return g.name==='dew' && g.unlocked>1 ? '◂ Lv '+g.level+' ▸  ♥ Start' : '♥ to start';
  if (g.phase === 'won') return g.level===LEVELS ? '20 cleared! ♥ Replay' : 'Clear! ♥ Next';
  return g.count+'/'+dewRules(g.level).goal+' drops';
}

export function usePocketPlay(plant,paused,onFinish) {
  const [game, dispatch] = useReducer(stepGame, null);
  const exit=useCallback(()=>dispatch({type:'exit'}),[]);
  const resumeDewLesson=useCallback(lesson=>dispatch({type:'enter',name:'dew',lesson}),[]);
  const active = game && canPlay(game.name,plant) ? game : null;
  useEffect(() => { if (game && !active) dispatch({type:'exit'}); },[game,active]);
  const lastResult=useRef(null);
  // The fifth sun earns the usual win once, while steering continues.
  const result=active?.name==='vine' && active.phase!=='lost' ? active.reward :
    active && ['won','lost'].includes(active.phase) ? active : null;
  useEffect(() => {
    if(!result){lastResult.current=null;return;}
    if(lastResult.current===result)return;
    lastResult.current=result;
    onFinish(result.name,result.phase,result.level,crypto.randomUUID(),result.startedAt,result.finishedAt,Boolean(result.lesson));
  },[result,onFinish]);
  useEffect(() => {
    if (!active || paused || (active.lesson || active.name!=='dew') && active.phase==='lost') return;
    const delay = {trail:VINE_STEP_MS, fall:tickMs, lost:1800, peek:950}[active.phase];
    if (!delay) return;
    const timer = setInterval(() => { if (!document.hidden) dispatch({type:'tick',at:Date.now(),dropLane:randomLane(),sunRoll:active.name==='vine'?Math.random():undefined}); },delay);
    return () => clearInterval(timer);
  },[active?.name,active?.phase,paused]);
  return { game:active, enter:name => { if (canPlay(name,plant)) dispatch({type:'enter',name,cleared:dewCheckpoint(plant)}); },
    exit, resumeDewLesson, key:key=>dispatch({type:'key',key,at:Date.now(),dropLane:randomLane(),deck:active?.name==='pairs' && key==='heart' && ['ready','won','lost'].includes(active.phase)?shuffleLeaves():undefined}) };
}
