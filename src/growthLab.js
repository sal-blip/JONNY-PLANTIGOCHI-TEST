import {wake,discoverFungus,nextMilestone,milestoneDue,criticalReminder,deathDeadline,condition,
  WATER_INTERVAL,FOOD_INTERVAL,LIGHT_INTERVAL} from './game.js';
import {lifeOf} from './gardenEconomy.js';

export const LAB_SPEED=180;
export function fillDebugPurse(plant){
  const life=lifeOf(plant);
  return life.balance===1000?plant:{...plant,gardenLife:{...life,balance:1000}};
}

function nextStop({plant:p,now,skipped}){
  const events=[];
  function add(at,kind,label,skip=false){
    if(at==null)return;
    const key=[p.id,kind,at].join('/');
    if(!skipped.includes(key))events.push({at,kind,key,label,skip});
  }
  if(p.deadAt!==null)return null;
  if(p.fungusAt!=null)add(p.fungusAt,'fungus','Treat fungus in First Aid',true);
  if(p.rotAt!=null)add(p.rotAt,'rot','Drain the pot',true);
  if(p.stage==='grown' && !events.length && p.fungusAt==null && p.rotAt==null)return null;
  if(p.stage==='seed' && p.wateredAt===null)add(p.plantedAt,'first','Give the seed its first drink');
  if(p.lastDrink!==null){
    if(p.rotAt===null){
      add(p.lastDrink+WATER_INTERVAL,'water','Water is due',true);
      add(criticalReminder(p),'critical','Water is critically low',true);
    }
    add(p.fedAt+FOOD_INTERVAL,'food','Food is due',true);
    add(p.litAt+LIGHT_INTERVAL,'sun','Sunlight is due',true);
    const deadline=deathDeadline(p);
    if(deadline!==null){
      add(deadline-1,'lastChance','Last chance to rescue this plant',true);
      add(deadline,'death','Plant reached its rescue deadline');
    }
    if(p.outbreakDue!=null && !['critical','rootRot'].includes(condition(p,Math.max(now,p.outbreakDue))))
      add(p.outbreakDue,'outbreak','Fungus gnats appeared');
  }
  add(milestoneDue(p),'growth',nextMilestone(p)?.label);
  return events.sort((a,b)=>a.at-b.at)[0] ?? null;
}

// This instance owns only RAM. Plant deadlines and player actions share its clock.
// It has no save, permission, notification or background scheduling capability.
export function createGrowthLab(source,start=Date.now()){
  let state={plant:wake(structuredClone(source),start),now:start,running:false,skipped:[],notice:'Test copy ready'};
  const listeners=new Set();
  function publish(changes){
    state={...state,...changes};
    for(const fn of listeners)fn();
  }
  function stop(){return nextStop(state);}
  function advance(target){
    const event=stop();
    if(!event){publish({running:false});return;}
    const reached=target>=event.at;
    const now=Math.max(state.now,Math.min(target,event.at));
    let plant=wake(state.plant,now);
    if(reached && event.kind==='outbreak')plant=discoverFungus(plant,now);
    publish({now,plant,...(reached?{running:false,notice:event.label}:{})});
  }
  return {
    subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
    snapshot:()=>state, clock:()=>state.now, stop,
    jump(){advance(Infinity);},
    run(){const e=stop();if(e && e.at>state.now)publish({running:true,notice:'Fast-forwarding'});},
    pause(){if(state.running)publish({running:false,notice:'Paused'});},
    tick(elapsed){if(state.running && elapsed>0)advance(state.now+Math.floor(elapsed*LAB_SPEED));},
    skip(){const e=stop();if(e?.skip && e.at<=state.now)publish({skipped:[...state.skipped,e.key],notice:'Reminder skipped'});},
    change(fn){
      const plant=fn(state.plant);
      if(plant===state.plant)return;
      const reset=plant.id!==state.plant.id;
      const previous=stop();
      const changes={plant};
      if(reset)Object.assign(changes,{running:false,skipped:[],notice:'New seed ready'});
      else if(previous && previous.at<=state.now && previous.key!==nextStop({...state,plant})?.key)
        changes.notice='Care complete';
      publish(changes);
    },
  };
}
