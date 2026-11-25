import {lastVisit,lifeOf,localDay} from './gardenEconomy.js';
// The current tutorial lives on the plant so portable backups resume the same lesson.
export const appHints={
  inventory:'Inventory keeps your pots and decorations. Open an item here when you want to move it.',
  journal:'Keep notes on your plants or open Care library for growing tips.',
  library:'Care library has real-world growing tips. Pick a plant whenever you need advice.',
  postcard:'Frame your garden, take a photo, then save or share it.'
};
export function newTutorial(){return {step:'pot',visited:[],blocks:0,menu:0};}
export function rememberHint(plant,id){
  const seen=plant.seenHints || [];
  if(seen.includes(id) || !(Object.hasOwn(appHints,id) || id==='aid' || id==='dew'))return plant;
  return {...plant,seenHints:[...seen,id]};
}
export function grantSproutCoins(p){
  if(p.tutorial?.step!=='return')return p;
  return {...p,tutorial:{...p.tutorial,step:'boost'},gardenLife:{...p.gardenLife,balance:p.gardenLife.balance+200}};
}

export function validTutorial(t,stage){
  return ['pot','apps','return','boost','tour'].includes(t.step) &&
    (t.menuTourVisited===undefined || (Array.isArray(t.menuTourVisited) &&
      t.menuTourVisited.every(id=>['care','play','growth','aid','guide'].includes(id)))) &&
    Array.isArray(t.visited) && t.visited.every(id=>Object.hasOwn(appHints,id)) &&
    new Set(t.visited).size===t.visited.length && Number.isInteger(t.blocks) &&
    (t.step==='tour'?stage==='sprout' && t.blocks===4:stage==='seed' && t.blocks>=0 && t.blocks<4) &&
    Number.isInteger(t.menu) && t.menu>=0 && t.menu<5;
}

export function finishSprouting(p,time){
  const {tutorial,...plant}=p;
  const life=lifeOf(p),visit=lastVisit(life),today=localDay(time);
  return {...plant,sproutDebut:p.id,anchor:time,lastDrink:time,litAt:time,fedAt:time,companyAt:time,
    gardenLife:{...life,...(visit && {visit}),day:today>life.day?today:life.day}};
}

export const GOOD_LUCK_COINS=20;

export function startDewLesson(plant,play){
  // Keep the original Dew Catch save shape so an installed game can finish an older lesson.
  const round=play==='vine' ? {status:'round',game:play} :
    {status:'round',caught:0,chances:3,startedAt:null};
  return {...plant,dewLesson:play?round:{status:'skipped',coins:0}};
}

export function validDewLesson(lesson){
  if(!lesson || typeof lesson!=='object')return false;
  if(lesson.game!==undefined && lesson.game!=='vine')return false;
  if(lesson.status!=='round')return ['won','lost','skipped'].includes(lesson.status) &&
    (lesson.coins===0 || lesson.status==='won' && lesson.coins===3);
  if(lesson.game)return lesson.rewarded===undefined || typeof lesson.rewarded==='boolean';
  return Number.isInteger(lesson.caught) && lesson.caught>=0 && lesson.caught<3 &&
    Number.isInteger(lesson.chances) && lesson.chances>0 && lesson.chances<=3 &&
    (lesson.startedAt===null?lesson.caught===0 && lesson.chances===3:Number.isSafeInteger(lesson.startedAt) && lesson.startedAt>=0);
}

export function checkpointDewLesson(plant,game){
  const saved=plant.dewLesson;
  if(saved?.status!=='round' || saved.game || game.count<saved.caught || game.chances>saved.chances ||
    (saved.startedAt!==null && game.startedAt!==saved.startedAt) ||
    (saved.startedAt===game.startedAt && saved.caught===game.count && saved.chances===game.chances))return plant;
  return {...plant,dewLesson:{status:'round',caught:game.count,chances:game.chances,startedAt:game.startedAt}};
}

export function settleDewLesson(plant,status,coins=0){
  if(plant.dewLesson?.status!=='round')return plant;
  return {...plant,dewLesson:{status,coins,...(plant.dewLesson.game && {game:plant.dewLesson.game})}};
}

export function claimDewGift(plant,reminder=null){
  if(!plant.dewLesson || plant.dewLesson.status==='round')return plant;
  const {dewLesson,...finished}=plant,life=lifeOf(plant);
  return {...finished,...(reminder?{tutorialReminder:reminder}:{}),gardenLife:{...life,balance:life.balance+GOOD_LUCK_COINS}};
}
