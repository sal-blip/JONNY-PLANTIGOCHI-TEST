import {ACTIONS, STAGE_NAMES, ROOT_TIME, HOUR, careStatus, condition, countdown, healthLabels} from './game.js';
import {canPlay, dewCheckpoint, LEVELS} from './pocketPlay.js';
import {foodReadout, growthReadout, waterReadout} from './plantReadout.js';

const card = (label, hint, command, extra) => ({label, hint, command, ...extra});
const names = {water:'Water', sun:'Sunlight', talk:'Kind words', food:'Plant food', drain:'Drain pot'};
const guide = [
  ['Toy controls','Arrows browse. Heart picks. Back goes up.'],
  ['Wake a seed','Water once. Sprouts at one hour old.'],
  ['Thirst','Dry at 4h. Critical at 12h. Water by 24h.'],
  ['Root rot','Two extra wet pours 1h apart. Drain within 12h.'],
  ['Company','Talk or finish a game. Quiet at 12h, lonely at 24h.'],
  ['Plant food','Food every 48h. Light every 24h.'],
  ['Growing up','Young on day 3. First split on day 5. Grown on day 7.'],
  ['Dew Catch','Catch with the arrows. Three misses restart at level 1.'],
  ['Leaf Echo','Watch three beats. Copy them with the keys.'],
  ['Taking a break','Tap Back to pause. Hold Back for your plant.'],
  ['Cutting jar','Roots in 12h. Pot after the parent dies.'],
];
export const toyBranches = {care:'Care', play:'Play', growth:'Growth', jar:'Cutting jar', book:'Leaf Book', guide:'Field guide'};
export const toyTitles = {home:'Plant menu', ...toyBranches, pour:'Still wet?', pause:'Paused'};

function ageLabel(ms) {
  const hours=Math.floor(Math.max(0,ms)/HOUR);
  return hours<24 ? hours+'h' : Math.floor(hours/24)+'d '+hours%24+'h';
}

export function toyCards(section, plant, now) {
  const dead=plant.deadAt!==null;
  const rooted=plant.jar && now>=plant.jar.cutAt+ROOT_TIME;
  switch(section) {
    case 'home': {
      const hints = {
        care: dead?'Pressed leaf':plant.stage==='seed'?'Sleeping seed':healthLabels[condition(plant,now)],
        play: 'Dew Catch · Leaf Echo',
        growth: STAGE_NAMES[plant.stage],
        jar: plant.jar?(rooted?'Rooted cutting':'Growing roots'):'Save a stem',
        book: plant.book.length+' pressed '+(plant.book.length===1?'leaf':'leaves'),
        guide: 'Care & controls',
      };
      return Object.entries(toyBranches).map(([id,label])=>card(label,hints[id],id));
    }
    case 'care': {
      if (dead) return [card('Leaf Book','Visit your pressed leaf','book')];
      const soil=condition(plant,now);
      const water=waterReadout(plant,now);
      const food=foodReadout(plant,now);
      return [...ACTIONS,'drain'].map(action=>{
        const {hint,locked}=careStatus(plant,action,now);
        const detail=action==='food' ? food.detail
          : action==='water' || (action==='drain' && soil==='rootRot') ? water.detail : hint;
        return card(names[action],detail,'give:'+action,{locked});
      });
    }
    case 'pour': return [
      card('Leave it be','Soil is still wet','back'),
      card('Water anyway','Extra water risks rot','pour-extra')];
    case 'play': {
      const cleared=dewCheckpoint(plant);
      let hint=cleared===LEVELS?'20 levels cleared':'Level '+(cleared+1)+' / '+LEVELS;
      if (plant.dewCleared>cleared) hint+=' · Best '+plant.dewCleared;
      return [
        card('Dew Catch',canPlay('dew',plant)?hint:'After sprouting','game:dew',{locked:!canPlay('dew',plant)}),
        card('Leaf Echo',canPlay('echo',plant)?'Copy three beats':'At young stage','game:echo',{locked:!canPlay('echo',plant)})];
    }
    case 'pause': return [card('Resume','Hold Back for your plant','resume'),card('Leave game','Return to your plant','leave')];
    case 'growth': {
      const progress=growthReadout(plant,now);
      const entries=[card(STAGE_NAMES[plant.stage],ageLabel((plant.deadAt??now)-plant.plantedAt)+' old · Gen '+plant.generation,'next')];
      if (progress.next) {
        const [remaining, blockers]=progress.detail.split(' · ');
        entries.push(card(progress.next,remaining,'next'));
        if(blockers)entries.push(card('Growth needs',blockers.replace('Needs ',''),'care'));
      }
      if (!dead && plant.stage==='grown') entries.unshift(card('Move to garden','Choose a permanent pot','graduate'));
      return [...entries,...(dead?[]:[card('Rename plant',plant.name || 'Monstera','rename')]),...[['Sprout','1 hour'],['Young plant','3 days'],['First split','5 days'],['Grown plant','7 days']].map(([name,age])=>card(name,age+' growing time','next'))];
    }
    case 'jar': {
      if (!plant.jar) {
        if(plant.stage==='grown' && !dead) return ['left','right'].map(stem=>card(stem==='left'?'Left stem':'Right stem','Take a cutting','cut:'+stem));
        return [card('Empty jar','Cut a stem at full growth',null)];
      }
      return [card(rooted?'Rooted cutting':'Growing roots',rooted?'Generation '+plant.jar.generation:countdown(plant.jar.cutAt+ROOT_TIME-now),null,{jar:Math.max(0,Math.min(1,(now-plant.jar.cutAt)/ROOT_TIME))}),
        ...(dead && rooted?[card('Pot cutting','Start generation '+plant.jar.generation,'new:cutting')]:[])];
    }
    case 'book': {
      const leaves=plant.book.slice().reverse().map(leaf=>card((leaf.name || 'Monstera')+' · Gen '+leaf.generation,
        STAGE_NAMES[leaf.stage]+' · '+ageLabel(leaf.diedAt-leaf.plantedAt)+' · '+leaf.cause,'next',{leaf:leaf.stage}));
      if (!leaves.length) leaves.push(card('Empty book','Your keepsakes go here',null));
      if (dead) {
        leaves.push(card('Plant a seed','Start a new Monstera','new:seed'));
        if (plant.jar) leaves.push(rooted?card('Pot cutting','Generation '+plant.jar.generation,'new:cutting'):card('Visit cutting','Roots are growing','jar'));
      }
      return leaves;
    }
    case 'guide': return guide.map(([label,hint])=>card(label,hint,'next'));
    default: return [];
  }
}
