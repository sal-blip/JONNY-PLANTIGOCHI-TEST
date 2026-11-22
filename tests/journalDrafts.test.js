import assert from 'node:assert/strict';
import test from 'node:test';
import {changeDraft,clearDraft,leaveEditor,newJournalSession,openDraft} from '../src/journalDrafts.js';

test('Back leaves a typed note available to resume under its original subject',()=>{
  let session=openDraft(newJournalSession(),'first',{type:'note',subject:'fern',text:''});
  session=changeDraft(session,'first',{text:'New frond',kind:'Observation'});
  session=leaveEditor(session);
  assert.equal(session.editing,null);
  session=openDraft(session,'second',{type:'note',subject:'ivy',text:''});
  session=changeDraft(session,'second',{text:'Pruned today'});
  session=openDraft(leaveEditor(session),'first',{type:'note',subject:'fern',text:''});
  assert.equal(session.editing,'first');
  assert.equal(session.drafts.first.text,'New frond');
  assert.equal(session.drafts.first.subject,'fern');
  assert.equal(session.drafts.second.text,'Pruned today');
  assert.equal(changeDraft(session,'second',{text:'irrelevant input'}),session);
  assert.equal(clearDraft(session,'second').editing,'first');
});

test('untouched editors and confirmations close cleanly, and a new garden inherits no drafts',()=>{
  for(const type of ['note','plant','delete']){
    const started=openDraft(newJournalSession(),'a',{type});
    assert.deepEqual(leaveEditor(started),newJournalSession());
  }
  const changed=changeDraft(openDraft(newJournalSession(),'a',{type:'note'}),'a',{text:'Private'});
  assert.equal(leaveEditor(changed).drafts.a.text,'Private');
  assert.deepEqual(clearDraft(changed,'a'),newJournalSession());
  assert.equal(newJournalSession().drafts.a,undefined);
});

test('resuming an edit keeps its comparison snapshot separate from the edited fields',()=>{
  const original=Object.freeze({id:'entry',subject:'rose',kind:'Watering',text:'Original'});
  const first=openDraft(newJournalSession(),'note/entry',{type:'note',original,text:original.text});
  const updated=changeDraft(first,'note/entry',{text:'Updated'});
  const resumed=openDraft(leaveEditor(updated),'note/entry',{type:'note',text:'Replacement'});
  assert.equal(resumed.drafts['note/entry'].original,original);
  assert.equal(resumed.drafts['note/entry'].original.text,'Original');
  assert.equal(resumed.drafts['note/entry'].text,'Updated');
});
