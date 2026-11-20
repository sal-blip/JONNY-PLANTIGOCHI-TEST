import { useEffect, useReducer } from 'react';

const keys = ['left','heart','right'];
export const gameNames = { dew: 'Dew Catch', echo: 'Leaf Echo' };
export const canPlay = (name, plant) => plant.deadAt === null &&
  (name === 'dew' ? plant.stage !== 'seed' : name === 'echo' && ['young','grown'].includes(plant.stage));
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

export function dewRules(level) {
  const step = level - 1;
  const fallMs = 2000 - step * 60;
  return { goal:level+2, fallMs, spacingMs:Math.round(fallMs*(1.12-0.04*step)) };
}

function startDew(g, lane, level = g.level) {
  return {...g,level,phase:'fall',lane:1,count:0,elapsed:0,nextId:1,feedbackUntil:0,result:null,
    drops:[{id:0,lane,progress:0}],nextDropAt:dewRules(level).spacingMs};
}

function fall(g, lane) {
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
      if (count === goal) return {...g,phase:'won',count,chances,drops:[],result:'win'};
    } else {
      chances--;
      if (!chances) return {...g,phase:'lost',count,chances,drops:[],result:'miss'};
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
  if (event.type === 'enter') return {name:event.name,phase:'ready',lane:1,count:0,chances:DEW_CHANCES,drops:[],
    level:highestLevel(event.cleared),unlocked:highestLevel(event.cleared)};
  if (!g) return null;
  if (event.type === 'key') {
    if (g.phase === 'ready' || g.phase === 'won') {
      if (event.key !== 'heart') {
        if (g.name !== 'dew' || g.phase !== 'ready') return g;
        return {...g,level:Math.max(1,Math.min(g.unlocked,g.level+(event.key==='left'?-1:1)))};
      }
      if (g.name === 'dew') {
        if (g.phase === 'won' && g.level===LEVELS) return {...g,phase:'ready',unlocked:LEVELS};
        const level = g.phase==='won' ? g.level+1 : g.level;
        return startDew({...g,unlocked:Math.max(g.unlocked,level)},event.dropLane,level);
      }
      return { ...g, phase:'watch', sequence:event.sequence, index:0, lit:true };
    }
    if (g.name === 'dew' && g.phase === 'fall') {
      const dx = event.key === 'left' ? -1 : event.key === 'right' ? 1 : 0;
      return { ...g, lane:Math.max(0,Math.min(2,g.lane + dx)) };
    }
    if (g.name === 'echo' && g.phase === 'repeat') {
      if (event.key !== g.sequence[g.index]) return { ...g, phase:'retry', lit:false };
      if (g.index === 2) return { ...g, phase:'won', lit:false };
      return { ...g, index:g.index + 1 };
    }
    return g;
  }
  if (event.type !== 'tick') return g;
  if (g.phase === 'lost') return startDew({...g,chances:DEW_CHANCES,unlocked:1},event.dropLane,1);
  if (g.phase === 'fall') return fall(g,event.dropLane);
  if (g.phase === 'retry') return { ...g, phase:'watch', index:0, lit:true };
  if (g.phase === 'watch') {
    if (g.lit) return { ...g, lit:false };
    if (g.index === 2) return { ...g, phase:'repeat', index:0 };
    return { ...g, index:g.index + 1, lit:true };
  }
  return g;
}

export function playText(g) {
  if (g.phase === 'lost') return 'Restarting at Lv 1';
  if (g.phase === 'ready') return g.name==='dew' && g.unlocked>1 ? '◂ Lv '+g.level+' ▸  ♥ Start' : '♥ to start';
  if (g.phase === 'won') return g.name === 'dew' ? (g.level===LEVELS ? '20 cleared! ♥ Replay' : 'Clear! ♥ Next') : 'You got me! ♥ again';
  if (g.name === 'dew') return g.count+'/'+dewRules(g.level).goal+' drops';
  if (g.phase === 'watch') return g.lit ? 'Watch · ' + g.sequence[g.index] : 'Watch…';
  if (g.phase === 'retry') return 'Hehe. Watch again!';
  return 'Your turn · ' + (g.index + 1) + '/3';
}

export function usePocketPlay(plant,paused,onCheckpoint) {
  const [game, dispatch] = useReducer(stepGame, null);
  const active = game && canPlay(game.name,plant) ? game : null;
  useEffect(() => { if (game && !active) dispatch({type:'exit'}); },[game,active]);
  useEffect(() => {
    if (active?.name!=='dew') return;
    if (active.phase==='lost') onCheckpoint(0);
    if (active.phase==='won') onCheckpoint(active.level);
  },[active?.name,active?.phase,active?.level,onCheckpoint]);
  useEffect(() => {
    if (!active || paused) return;
    const delay = {fall:tickMs, lost:1800, watch:active.lit ? 850 : 300, retry:1100}[active.phase];
    if (!delay) return;
    const timer = setInterval(() => { if (!document.hidden) dispatch({type:'tick',dropLane:randomLane()}); },delay);
    return () => clearInterval(timer);
  },[active?.name,active?.phase,active?.lit,paused]);
  return { game:active, enter:name => { if (canPlay(name,plant)) dispatch({type:'enter',name,cleared:dewCheckpoint(plant)}); },
    exit:()=>dispatch({type:'exit'}), key:key=>dispatch({type:'key',key,dropLane:randomLane(),sequence:Array.from({length:3},()=>keys[randomLane()])}) };
}
