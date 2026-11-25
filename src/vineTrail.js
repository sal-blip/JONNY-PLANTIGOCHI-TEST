// The tip is the first cell. Directions run clockwise from east in LCD coordinates.
export const VINE_COLS=12, VINE_ROWS=6, VINE_GOAL=5, VINE_STEP_MS=550;
const dx=[1,0,-1,0], dy=[0,1,0,-1];
const start=3*VINE_COLS+3;

export function newVine(phase='ready',at=null) {
  return {name:'vine',phase,body:[start,start-1,start-2],direction:0,turn:0,
    sun:start+3,count:0,startedAt:at,finishedAt:null};
}

export function stepVine(g,event) {
  if(event.type==='key'){
    if(g.phase!=='trail')return event.key==='heart'?newVine('trail',event.at):g;
    if(g.turn || !['left','right'].includes(event.key))return g;
    return {...g,turn:event.key==='right'?1:-1};
  }
  if(event.type!=='tick' || g.phase!=='trail')return g;
  const direction=(g.direction+g.turn+4)%4;
  const x=g.body[0]%VINE_COLS+dx[direction];
  const y=Math.floor(g.body[0]/VINE_COLS)+dy[direction];
  const tip=y*VINE_COLS+x, growing=tip===g.sun;
  const remaining=growing?g.body:g.body.slice(0,-1);
  if(x<0 || x>=VINE_COLS || y<0 || y>=VINE_ROWS || remaining.includes(tip)){
    return {...g,phase:'lost',finishedAt:event.at};
  }
  const body=[tip,...remaining];
  const next={...g,direction,turn:0,body};
  if(!growing)return next;
  next.count++;
  if(next.count===VINE_GOAL)return {...next,sun:null,phase:'won',finishedAt:event.at};
  const free=[];
  for(let cell=0;cell<VINE_COLS*VINE_ROWS;cell++)if(!body.includes(cell))free.push(cell);
  next.sun=free[Math.floor(event.sunRoll*free.length)];
  return next;
}
