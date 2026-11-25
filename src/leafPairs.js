export const leafNames=['Monstera','Snake plant','Fern','Clover','Cactus','Lotus','Maple','Palm','Acorn'];
export const PAIR_COLUMNS=6;
export const PAIR_MISS_LIMIT=5;
const faces=leafNames.flatMap((_,index)=>[index,index]);

export function shuffleLeaves(random=Math.random){
  const deck=[...faces];
  for(let i=deck.length-1;i>0;i--){
    const swap=Math.floor(random()*(i+1));
    [deck[i],deck[swap]]=[deck[swap],deck[i]];
  }
  return deck;
}

export function newPairs(){
  return {name:'pairs',phase:'ready',deck:faces,cursor:0,open:[],matched:[],misses:0,startedAt:null};
}

export function stepPairs(g,event){
  if(g.phase==='peek')return event.type==='tick'?{...g,phase:'pick',open:[]}:g;
  if(event.type!=='key')return g;
  if(['ready','won','lost'].includes(g.phase)){
    return event.key==='heart'?{...newPairs(),phase:'pick',deck:event.deck,startedAt:event.at}:g;
  }
  if(event.key==='left' || event.key==='right'){
    const n=g.deck.length;
    return {...g,cursor:(g.cursor+(event.key==='left'?-1:1)+n)%n};
  }
  if(event.key!=='heart' || g.open.includes(g.cursor) || g.matched.includes(g.cursor))return g;
  const open=[...g.open,g.cursor];
  if(open.length===1)return {...g,open};
  if(g.deck[open[0]]!==g.deck[open[1]]){
    const misses=g.misses+1;
    if(misses===PAIR_MISS_LIMIT)return {...g,misses,open,phase:'lost',finishedAt:event.at};
    return {...g,misses,open,phase:'peek'};
  }
  const matched=[...g.matched,...open];
  return matched.length===g.deck.length?{...g,open:[],matched,phase:'won',finishedAt:event.at}:{...g,open:[],matched};
}
