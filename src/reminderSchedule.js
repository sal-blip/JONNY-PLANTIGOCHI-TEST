import {criticalReminder,deathDeadline,milestoneDue,nextMilestone,HOUR,DAY} from './game.js';

export function reminderSchedule(plant,companyEnabled,lastNudge=0) {
  const next=nextMilestone(plant);
  return {
    id:plant.id, stage:plant.stage,nextStage:({seed:'sprout',sprout:'young',young:'split',split:'grown'})[plant.stage] ?? null,next:next?.label ?? null,due:milestoneDue(plant),
    criticalDue:criticalReminder(plant), expires:deathDeadline(plant),
    reason:plant.rotAt===null?'thirst':'rot',
    companyDue:companyEnabled && plant.deadAt===null && plant.companyAt!==null?
      Math.max(plant.companyAt+10*HOUR,lastNudge?lastNudge+DAY:0):null,
    companyAt:plant.companyAt,fedAt:plant.fedAt,litAt:plant.litAt, lastDrink:plant.lastDrink,rotAt:plant.rotAt,
  };
}
