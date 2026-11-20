import {ACTIONS, STAGE_NAMES, ROOT_TIME, HOUR, careStatus, condition, countdown, healthLabels, deathDeadline, nextMilestone} from './game.js';
import {canPlay, LEVELS} from './pocketPlay.js';

const card = (label, hint, command, extra) => ({label, hint, command, ...extra});
const names = {water:'Water', sun:'Sunlight', talk:'Kind words', food:'Plant food', drain:'Drain pot'};
const guide = [
  ['Toy controls','Arrows browse. Heart picks. Back goes up.'],
  ['Wake a seed','Water once. Sprouts at one hour old.'],
  ['Thirst','Dry at 4h. Critical at 12h. Water by 24h.'],
  ['Root rot','Two extra wet pours 1h apart. Drain within 12h.'],
  ['Care sets','Water, sun, words and food once per set.'],
  ['Growing up','Young on day 3. Last set on day 5. Grown on day 7.'],
  ['Dew Catch','Catch with the arrows. Three misses end a run.'],
  ['Leaf Echo','Watch three beats. Copy them with the keys.'],
  ['Taking a break','Press Back to pause a game.'],
  ['Cutting jar','Roots in 12h. Pot after the parent dies.'],
];
export const toyTitles = {home:'Plant menu', care:'Care', play:'Play', growth:'Growth', jar:'Cutting jar', book:'Leaf Book', guide:'Field guide', pour:'Still wet?', pause:'Paused', loss:'Game over'};

function ageLabel(ms) {
  const hours=Math.floor(Math.max(0,ms)/HOUR);
  return hours<24 ? hours+'h' : Math.floor(hours/24)+'d '+hours%24+'h';
}

export function toyCards(section, plant, now) {
  const dead=plant.deadAt!==null;
  const rooted=plant.jar && now>=plant.jar.cutAt+ROOT_TIME;
  switch(section) {
    case 'home': return [
      card('Care',dead?'Pressed leaf':plant.stage==='seed'?'Sleeping seed':healthLabels[condition(plant,now)],'care'),
      card('Play','Dew Catch · Leaf Echo','play'),
      card('Growth',STAGE_NAMES[plant.stage],'growth'),
      card('Cutting jar',plant.jar?(rooted?'Rooted cutting':'Growing roots'):'Save a stem','jar'),
      card('Leaf Book',plant.book.length+' pressed '+(plant.book.length===1?'leaf':'leaves'),'book'),
      card('Field guide','Care & controls','guide')];
    case 'care':
      if (dead) return [card('Leaf Book','Visit your pressed leaf','book')];
      return [...ACTIONS,'drain'].map(action=>{
        const {hint:status,locked,confirm}=careStatus(plant,action,now);
        const soil=condition(plant,now);
        let hint=status;
        if (action==='water' && plant.stage==='seed' && plant.wateredAt!==null) hint='Sprouts in '+countdown(plant.plantedAt+HOUR-now);
        else if ((action==='water' && ['dry','critical'].includes(soil)) || (action==='drain' && soil==='rootRot')) hint='Time left '+countdown(deathDeadline(plant)-now);
        else if (confirm) hint='Water again?';
        return card(names[action],hint,'give:'+action,{locked,status});
      });
    case 'pour': return [
      card('Leave it be','Soil is still wet','back'),
      card('Water anyway','Extra water risks rot','pour-extra')];
    case 'play': return [
      card('Dew Catch',canPlay('dew',plant)?(plant.dewCleared===LEVELS?'20 levels cleared':'Level '+Math.min(LEVELS,plant.dewCleared+1)+' / 20'):'After sprouting','game:dew',{locked:!canPlay('dew',plant)}),
      card('Leaf Echo',canPlay('echo',plant)?'Copy three beats':'At young stage','game:echo',{locked:!canPlay('echo',plant)})];
    case 'pause': return [card('Resume','Return to the game','resume'),card('Leave game','Keep cleared levels','leave')];
    case 'loss': return [card('Retry level','Three fresh chances','retry'),card('Leave game','Keep cleared levels','leave')];
    case 'growth': {
      const next=nextMilestone(plant);
      const entries=[card(STAGE_NAMES[plant.stage],ageLabel((plant.deadAt??now)-plant.plantedAt)+' old · Gen '+plant.generation,'next')];
      if (next) entries.push(card(next.label,now>=plant.plantedAt+next.age?'Ready with care':countdown(plant.plantedAt+next.age-now),'next'));
      if (!dead && plant.stage!=='seed') entries.push(card('Care set',plant.given.length+' of 4 given','next'));
      return [...entries,...[['Sprout','1 hour'],['Young plant','3 days'],['Final care set','5 days'],['Grown plant','7 days']].map(([name,age])=>card(name,age+' from planting','next'))];
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
      const leaves=plant.book.slice().reverse().map(leaf=>card('Gen '+leaf.generation+' · '+STAGE_NAMES[leaf.stage],
        ageLabel(leaf.diedAt-leaf.plantedAt)+' old · '+leaf.cause,'next',{leaf:leaf.stage}));
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
