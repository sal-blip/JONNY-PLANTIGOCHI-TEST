// Drafts live for one garden session. Save and Cancel clear an editor, while
// Back shelves its changes under the original note or plant and returns to the list.
export function newJournalSession() {
  return {tab:'toy', subject:'', editing:null, drafts:{}};
}

export function openDraft(session,key,form) {
  const drafts=session.drafts[key] ? session.drafts : {...session.drafts,[key]:form};
  return {...session,editing:key,drafts};
}

export function changeDraft(session,key,changes) {
  const draft=session.drafts[key];
  if(!draft || session.editing!==key)return session;
  return {...session,drafts:{...session.drafts,[key]:{...draft,...changes,dirty:true}}};
}

export function clearDraft(session,key) {
  if(!session.drafts[key])return session;
  const drafts={...session.drafts};
  delete drafts[key];
  return {...session,drafts,editing:session.editing===key?null:session.editing};
}

export function leaveEditor(session) {
  if(!session.editing)return session;
  if(!session.drafts[session.editing]?.dirty)return clearDraft(session,session.editing);
  return {...session,editing:null};
}
