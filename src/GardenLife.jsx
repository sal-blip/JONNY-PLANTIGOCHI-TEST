import {ACTIONS,STAGE_NAMES,ROOT_TIME,DAY,HOUR,condition,countdown,deathDeadline,healthLabels,nextMilestone} from './game.js';
import {canPlay,LEVELS} from './pocketPlay.js';

const card = (label, hint, glyph, command, extra) => ({label,hint,glyph,command,...extra});
const back = () => card('Back','Previous screen','return','back');
const names = {water:'Water',sun:'Sunlight',talk:'Kind words',food:'Plant food',drain:'Drain pot'};
const guide = [
  ['Toy controls','Arrows browse. Heart selects. Tap the top line to go back.'],
  ['Wake a seed','Water once. Your seed sprouts after one real hour.'],
  ['Thirst','Dry at 4h. Critical at 12h. Water before 24h.'],
  ['Root rot','Two extra wet pours at least 1h apart cause rot. Drain within 12h.'],
  ['Care sets','Give water, light, kind words and food once per set.'],
  ['Growing up','Young at day 3. Final care set at day 5. Grown at day 7.'],
  ['Dew Catch','Move left or right to catch drops. Clear 20 levels.'],
  ['Leaf Echo','Watch three beats, then copy them with the toy keys.'],
  ['Taking a break','Tap the game screen to pause, resume or leave.'],
  ['Cutting jar','A grown stem roots in 12h. Pot it when its parent dies.'],
];
const titles={home:'Plant menu',care:'Care',play:'Play',growth:'Growth',jar:'Cutting jar',book:'Leaf Book',guide:'Field guide',pour:'Still wet?',pause:'Paused'};
export const toyTitles=titles;
function ageLabel(ms) {
  const hours=Math.floor(Math.max(0,ms)/HOUR);
  return hours<24 ? hours+'h' : Math.floor(hours/24)+'d '+hours%24+'h';
}

export function toyCards(section,plant,now) {
  const soil=condition(plant,now), dead=plant.deadAt!==null;
  const rooted=plant.jar && now>=plant.jar.cutAt+ROOT_TIME;
  switch(section) {
    case 'home': return [
      card('Care',dead?'Remember your plant':plant.stage==='seed'?'Sleeping seed':healthLabels[soil],'care','care'),
      card('Play','Dew Catch · Leaf Echo','play','play'),
      card('Growth',STAGE_NAMES[plant.stage],'growth','growth'),
      card('Cutting jar',plant.jar?(rooted?'Rooted cutting':'Growing roots'):'A stem for later','jar','jar'),
      card('Leaf Book',plant.book.length+' pressed '+(plant.book.length===1?'leaf':'leaves'),'book','book'),
      card('Field guide','Care & toy controls','guide','guide'),
      card('Home','Return to your plant','home','idle')];
    case 'care': {
      if (dead) return [card('Leaf Book','Visit your pressed leaf','book','book'),back()];
      const actions=soil==='rootRot'?['drain',...ACTIONS]:soil==='soggy'?[...ACTIONS,'drain']:ACTIONS;
      return [...actions.map(action=>{
        const locked=plant.stage==='seed' && action!=='water';
        let hint=locked?'Unlocks at sprout':plant.given.includes(action)?'Given this care set':'Give care';
        if (action==='water') hint=plant.stage==='seed'?(plant.wateredAt===null?'Wake your seed':'Seed watered'):healthLabels[soil];
        if ((action==='water' && ['critical','dry'].includes(soil)) || action==='drain' && soil==='rootRot') hint='Time left '+countdown(deathDeadline(plant)-now);
        return card(names[action],hint,'care','give:'+action,{locked});
      }),back()];
    }
    case 'pour': return [card('Leave it be','Soil is still wet','return','back'),card('Water anyway','Extra water risks rot','care','pour-extra')];
    case 'play': return [
      card('Dew Catch',canPlay('dew',plant)?(plant.dewCleared===LEVELS?'20 levels cleared':'Level '+Math.min(LEVELS,plant.dewCleared+1)+' / 20'):'Unlocks at sprout','play','game:dew',{locked:!canPlay('dew',plant)}),
      card('Leaf Echo',canPlay('echo',plant)?'Copy three beats':'Unlocks at young plant','play','game:echo',{locked:!canPlay('echo',plant)}),back()];
    case 'pause': return [card('Resume','Keep playing','play','resume'),card('Leave game','Keep cleared levels','return','leave')];
    case 'growth': {
      const next=nextMilestone(plant);
      const entries=[card(STAGE_NAMES[plant.stage],ageLabel((plant.deadAt??now)-plant.plantedAt)+' old · Gen '+plant.generation,'growth','next')];
      if (next) entries.push(card(next.label,now>=plant.plantedAt+next.age?'Ready with care':countdown(plant.plantedAt+next.age-now),'growth','next'));
      if (!dead && plant.stage!=='seed') entries.push(card('Care set',plant.given.length+' of 4 given','care','next'));
      entries.push(...[['Sprout','1 hour'],['Young plant','3 days'],['Final care set','5 days'],['Grown plant','7 days']].map(([name,age])=>card(name,age+' from planting','growth','next')));
      return [...entries,back()];
    }
    case 'jar': {
      if (!plant.jar) {
        if(plant.stage==='grown' && !dead) return ['left','right'].map(stem=>card(stem==='left'?'Left stem':'Right stem','Take a cutting','jar','cut:'+stem)).concat(back());
        return [card('Empty jar','Cut a stem at full growth','jar','back'),back()];
      }
      return [card(rooted?'Rooted cutting':'Growing roots',rooted?'Generation '+plant.jar.generation:countdown(plant.jar.cutAt+ROOT_TIME-now),'jar','next',{jar:Math.max(0,Math.min(1,(now-plant.jar.cutAt)/ROOT_TIME))}),
        ...(dead && rooted?[card('Pot cutting','Start generation '+plant.jar.generation,'growth','new:cutting')]:[]),back()];
    }
    case 'book': {
      const outer=plant.book.slice().reverse().map(leaf=>card('Gen '+leaf.generation+' · '+STAGE_NAMES[leaf.stage],
        ageLabel(leaf.diedAt-leaf.plantedAt)+' old · '+leaf.cause,'book','next',{leaf:leaf.stage}));
      if (!outer.length) outer.push(card('Leaf Book','Your keepsakes go here','book','back'));
      if (dead) {
        outer.push(card('Plant a seed','Start a new Monstera','growth','new:seed'));
        if (plant.jar) outer.push(rooted?card('Pot cutting','Generation '+plant.jar.generation,'jar','new:cutting'):card('Visit cutting','Roots are growing','jar','jar'));
      }
      return [...outer,back()];
    }
    case 'guide': return [...guide.map(([label,hint])=>card(label,hint,'guide','next',{text:true})),back()];
    default: return [back()];
  }
}
