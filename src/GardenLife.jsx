import {ACTIONS, stageLabel, FUNGUS_WINDOW, HOUR, SPURT_COST,growthSpurtOffer, careStatus, condition, countdown, healthLabels} from './game.js';
import {canPlay, dewCheckpoint, LEVELS} from './pocketPlay.js';
import {foodReadout, growthReadout, waterReadout} from './plantReadout.js';

const card = (label, hint, command, extra) => ({label, hint, command, ...extra});
const names = {water:'Water', sun:'Sunlight', talk:'Kind words', food:'Plant food', drain:'Drain pot'};
const guide = [
  ['Toy controls','Arrows browse. Heart picks. Back goes up.'],
  ['Wake a seed','Water once. Sprouts at one hour old.'],
  ['Top up','Damp soil? Top up in the last 30 min.'],
  ['Thirst','Dry at 4h. Critical at 12h. Water by 24h.'],
  ['Root rot','Two extra wet pours 1h apart. Drain within 12h.'],
  ['Company','Talk or finish a game. Quiet at 12h, lonely at 24h.'],
  ['Plant food','Food every 48h. Light every 24h.'],
  ['Growing up','New growth on days 3 and 5. Fully grown on day 7.'],
  ['Vine Trail','Turn the moving tip with the arrows. Each sun grows your vine. Avoid the edge and your vine.'],
  ['Dew Catch','Catch with the arrows. Three misses restart at level 1.'],
  ['Garden coins','Visits +10 daily. Helpful watering +2, up to 3/day. Game wins +3, up to 5/day.'],
  ['Leaf Pairs','Use arrows to pick a packet. Heart flips it. Match all nine pairs before your fifth miss.'],
  ['Taking a break','Tap Back to pause. Hold Back for your plant.'],
  ['Fungus','Gnats? First Aid cures fungus. Treat within 12h.'],
  ['Garden keepsakes','Swipe up to visit the garden’s Cutting Jar and Leaf Book.'],
];
export const toyBranches = {care:'Care', play:'Play', growth:'Growth', aid:'First Aid', guide:'Field guide'};
export const toyTitles = {home:'Plant menu', ...toyBranches, boost:'Growth Spurt',spurtReceipt:'Growth Spurt',spurtChanged:'Growth Spurt',pour:'Still wet?', pause:'Paused',pastAid:'Past alert'};

function ageLabel(ms) {
  const hours=Math.floor(Math.max(0,ms)/HOUR);
  return hours<24 ? hours+'h' : Math.floor(hours/24)+'d '+hours%24+'h';
}

export function toyCards(section, plant, now) {
  const dead=plant.deadAt!==null;
  const sick=plant.fungusAt!=null && !dead;
  const timeLeft=sick?Math.max(1,Math.ceil((plant.fungusAt+FUNGUS_WINDOW-now)/60000)):0;
  const remaining=timeLeft>=60?Math.floor(timeLeft/60)+'h '+timeLeft%60+'m':timeLeft+'m';
  switch(section) {
    case 'home': {
      const hints = {
        care: dead?'Pressed leaf':plant.stage==='seed'?'Sleeping seed':healthLabels[condition(plant,now)],
        play: 'Choose a game',
        growth: stageLabel(plant),
        aid:sick?'Fungus · '+remaining+' left':'All clear',
        guide: 'Care & controls',
      };
      return Object.entries(toyBranches).map(([id,label])=>card(label,hints[id],id));
    }
    case 'care': {
      if (dead) return [card('Start again','Open the garden Leaf Book','garden-book')];
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
        card('Vine Trail','Grow as long as you can','game:vine',{locked:!canPlay('vine',plant)}),
        card('Dew Catch',hint,'game:dew',{locked:!canPlay('dew',plant)}),
        card('Leaf Pairs','Match nine leaf pairs','game:pairs',{locked:!canPlay('pairs',plant)})];
    }
    case 'pause': return [card('Resume','Hold Back for your plant','resume'),card('Leave game','Return to your plant','leave')];
    case 'growth': {
      const progress=growthReadout(plant,now);
      const entries=[card(stageLabel(plant),ageLabel((plant.deadAt??now)-plant.plantedAt)+' old · Gen '+plant.generation,'next')];
      if (progress.next) {
        const [remaining, blockers]=progress.detail.split(' · ');
        entries.push(card(progress.next,remaining,'next'));
        const balance=plant.gardenLife?.balance ?? 0;
        entries.unshift(card('Growth Spurt',blockers || ('50 coins · You have '+balance),'boost'));
        if(blockers)entries.push(card('Growth needs',blockers.replace('Needs ',''),sick?'aid':'care'));
      }
      if (!dead && plant.stage==='grown') entries.unshift(sick?card('Treat fungus first','Open First Aid','aid'):card('Move to garden','Choose a permanent pot','graduate'));
      return [...entries,...(dead?[]:[card('Rename plant',plant.name || 'Monstera','rename')]),...[['sprout','1 hour'],['young','3 days'],['split','5 days'],['grown','7 days']].map(([stage,age])=>card(stageLabel(plant,stage),age+' growing time','next'))];
    }
    case 'boost': {
      const offer=growthSpurtOffer(plant,now);
      if(!offer)return [card('Growth complete','Back to my plant','back')];
      if(offer.reason)return [card('Growth Spurt',offer.reason,'back')];
      return [card('Spend '+SPURT_COST+' coins',offer.percent===100?'Reach '+offer.next:offer.percent+'% toward '+offer.next,'buy-boost'),
        card('Cancel','Keep my coins','back')];
    }
    case 'spurtReceipt': return [card('Spurt saved',stageLabel(plant)+' · '+plant.gardenLife.balance+' coins left','back')];
    case 'spurtChanged': return [card('No coins spent','Check current growth and care','back')];
    case 'pastAid': return [card('All clear','This outbreak has ended','back')];
    case 'aid': return [sick ? card('G-NAT ASSASSIN','♥ One drop · '+remaining,'treat')
      : dead ? card('Start again','Open the garden Leaf Book','garden-book') : card('All clear','Your plant needs no drops',null)];
    case 'guide': return guide.map(([label,hint])=>card(label,hint,'next'));
    default: return [];
  }
}
