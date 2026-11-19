import { useEffect, useReducer } from 'react';

const keys = ['left','heart','right'];
export const gameNames = { dew: 'Dew Catch', echo: 'Leaf Echo' };
export const canPlay = (name, plant) => plant.deadAt === null &&
  (name === 'dew' ? plant.stage !== 'seed' : name === 'echo' && ['young','grown'].includes(plant.stage));

function randomLane() { return Math.floor(Math.random() * 3); }
const makeSequence = () => Array.from({length:3}, () => keys[randomLane()]);

export function stepGame(g, event) {
  if (event.type === 'exit') return null;
  if (event.type === 'enter') return { name:event.name, phase:'ready', lane:1, count:0, progress:0 };
  if (!g) return null;
  if (event.type === 'key') {
    if (g.phase === 'ready' || g.phase === 'won') {
      if (event.key !== 'heart') return g;
      return g.name === 'dew'
        ? { ...g, phase:'fall', lane:1, count:0, progress:0, dropLane:event.dropLane, result:null }
        : { ...g, phase:'watch', sequence:event.sequence, index:0, lit:true };
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
  if (g.phase === 'fall') {
    const progress = Math.min(1,g.progress + 0.05);
    if (progress < 1) return { ...g, progress };
    const caught = g.lane === g.dropLane, count = g.count + Number(caught);
    return { ...g, progress, count, phase:count === 3 ? 'won' : 'splash', result:count === 3 ? 'win' : caught ? 'catch' : 'miss' };
  }
  if (g.phase === 'splash') return { ...g, phase:'fall', progress:0, result:null, dropLane:event.dropLane };
  if (g.phase === 'retry') return { ...g, phase:'watch', index:0, lit:true };
  if (g.phase === 'watch') {
    if (g.lit) return { ...g, lit:false };
    if (g.index === 2) return { ...g, phase:'repeat', index:0 };
    return { ...g, index:g.index + 1, lit:true };
  }
  return g;
}

export function playText(g) {
  if (g.phase === 'ready') return '♥ to start';
  if (g.phase === 'won') return g.name === 'dew' ? 'Dew shower! ♥ again' : 'You got me! ♥ again';
  if (g.name === 'dew') return g.phase === 'splash' && g.result === 'miss' ? 'Splash! Try again' : g.count + '/3 drops';
  if (g.phase === 'watch') return g.lit ? 'Watch · ' + g.sequence[g.index] : 'Watch…';
  if (g.phase === 'retry') return 'Hehe. Watch again!';
  return 'Your turn · ' + (g.index + 1) + '/3';
}

export function usePocketPlay(plant) {
  const [game, dispatch] = useReducer(stepGame, null);
  const active = game && canPlay(game.name,plant) ? game : null;
  useEffect(() => { if (game && !active) dispatch({ type:'exit' }); }, [game,active]);
  useEffect(() => {
    if (!active) return;
    const delay = {fall:95, splash:750, watch:active.lit ? 850 : 300, retry:1100}[active.phase];
    if (!delay) return;
    const timer = setInterval(() => { if (!document.hidden) dispatch({ type:'tick',dropLane:randomLane() }); },delay);
    return () => clearInterval(timer);
  }, [active?.name,active?.phase,active?.lit]);
  return { game:active, enter:name => { if (canPlay(name,plant)) dispatch({type:'enter',name}); },
    exit:() => dispatch({type:'exit'}), key:key => dispatch({type:'key',key,dropLane:randomLane(),sequence:makeSequence()}) };
}
