import {test} from 'node:test';
import assert from 'node:assert/strict';
import {beginAlertVisit,answerAlertInvite} from '../src/alertInvitation.js';

test('a deferred welcome survives rerenders, asks on the next launch, and finishes after Not now',()=>{
  const first=beginAlertVisit(null,'visit-a',true,false);
  const deferred=answerAlertInvite(first,'visit-a',true);
  assert.deepEqual(deferred,{round:1,visit:'visit-a',closed:true});
  assert.equal(beginAlertVisit(deferred,'visit-a',false,false),deferred);
  const second=beginAlertVisit(deferred,'visit-b',false,false);
  assert.deepEqual(second,{round:2,visit:'visit-b'});
  assert.equal(answerAlertInvite(second,'visit-a',true),second);
  const done=answerAlertInvite(second,'visit-b',true);
  assert.deepEqual(done,{done:true});
  assert.equal(beginAlertVisit(done,'visit-c',true,false),done);
});

test('a dismissed or unfinished invitation can be shown on at most two launches',()=>{
  const first=beginAlertVisit(null,'a',true,false);
  const second=beginAlertVisit(first,'b',true,false);
  const third=beginAlertVisit(second,'c',true,false);
  assert.equal(second.round,2);
  assert.equal(third,second);
  assert.notEqual(third.visit,'c');
});

test('enabled devices, existing gardens and restored gardens skip new-player invitations',()=>{
  assert.equal(beginAlertVisit(null,'a',false,false),null);
  const enabled=beginAlertVisit(null,'a',true,true);
  assert.deepEqual(enabled,{done:true});
  const pending=answerAlertInvite(beginAlertVisit(null,'a',true,false),'a',true);
  assert.deepEqual(beginAlertVisit(pending,'b',false,true),{done:true});
  assert.deepEqual(answerAlertInvite(beginAlertVisit(null,'a',true,false),'a',false),{done:true});
});
