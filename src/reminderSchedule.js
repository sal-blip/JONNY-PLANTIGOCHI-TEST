import {criticalReminder,deathDeadline,milestoneDue,nextMilestone,HOUR,DAY} from './game.js';

export function reminderSchedule(plant,companyEnabled,lastNudge=0) {
  const next=nextMilestone(plant);
  return {
    id:plant.id, stage:plant.stage,nextStage:({seed:'sprout',sprout:'young',young:'split',split:'grown'})[plant.stage] ?? null,next:next?.label ?? null,due:milestoneDue(plant),
    criticalDue:criticalReminder(plant), expires:deathDeadline(plant),
    fungusAt:plant.fungusAt??null,
    fungusDue:plant.deadAt===null && plant.fungusAt!=null?plant.fungusAt+6*HOUR:null,
    reason:plant.rotAt===null?'thirst':'rot',
    companyDue:companyEnabled && plant.deadAt===null && plant.companyAt!==null?
      Math.max(plant.companyAt+10*HOUR,lastNudge?lastNudge+DAY:0):null,
    companyAt:plant.companyAt,fedAt:plant.fedAt,litAt:plant.litAt, lastDrink:plant.lastDrink,rotAt:plant.rotAt,
  };
}

export function reminderRequest(schedule,subscription){
  const {due=null,criticalDue=null,companyDue=null,fungusDue=null,expires=null}=schedule || {};
  const id=schedule?.id;
  return {endpoint:subscription.endpoint,keys:subscription.toJSON?.().keys ?? subscription.keys,
    due,criticalDue,companyDue,fungusDue,expires,eventIds:{
      due:due===null?null:id+'-growth-'+schedule.nextStage,
      criticalDue:criticalDue===null?null:id+'-'+schedule.reason+'-'+criticalDue,
      companyDue:companyDue===null?null:id+'-company-'+schedule.companyAt,
      fungusDue:fungusDue===null?null:id+'-fungus-'+schedule.fungusAt
    }};
}
