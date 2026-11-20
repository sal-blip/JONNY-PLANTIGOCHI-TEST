// Only a new installed launch gets a new visit ID. OS permission dialogs reuse it.
export function beginAlertVisit(previous, visit, welcome, enabled){
  if(previous?.done || (!previous && !welcome))return previous;
  if(enabled)return {done:true};
  if(!previous)return {round:1,visit};
  if(previous.round===1 && previous.visit!==visit)return {round:2,visit};
  return previous;
}

export function answerAlertInvite(previous,visit,defer){
  if(previous?.visit!==visit || previous.closed)return previous;
  return defer && previous.round===1 ? {...previous,closed:true} : {done:true};
}
