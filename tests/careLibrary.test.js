import test from 'node:test';
import assert from 'node:assert/strict';
import {CARE_LIBRARY_CACHE_KEY,careTopics,localMatches,plantGuides,readRecent,rememberGuide,revisionURL} from '../src/careLibrary.js';

const guide=n=>({pageId:n,revision:1000+n,title:'Plant '+n,scientific:'Genus species',sections:[]});

test('starter searches recognize common names, current and former scientific names',()=>{
  const matches=query=>plantGuides.filter(plant=>localMatches(plant,query)).map(plant=>plant.id);
  assert.deepEqual(matches('monstera deliciosa'),['monstera']);
  assert.deepEqual(matches('DEVIL’S IVY'),['pothos']);
  assert.deepEqual(matches('Sansevieria trifasciata'),['snake']);
  assert.deepEqual(matches('Jaguár'),[]);
  assert.ok(careTopics.every(topic=>topic.sources.length && topic.sections.every(section=>section.paragraphs.length)));
});

test('recent Wikimedia guides are bounded, survive reopening, and do not enter garden storage',()=>{
  const saved=new Map([['current','garden-backup']]);
  const storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};
  let recent=[];
  for(let i=1;i<=8;i++)recent=rememberGuide(guide(i),recent,storage);
  assert.deepEqual(readRecent(storage).map(g=>g.pageId),[8,7,6,5,4,3]);
  recent=rememberGuide({...guide(5),revision:2010},recent,storage);
  assert.deepEqual(recent.map(g=>g.pageId),[5,8,7,6,4,3]);
  assert.equal(revisionURL(readRecent(storage)[0].revision),'https://en.wikipedia.org/w/index.php?oldid=2010');
  assert.equal(saved.get('current'),'garden-backup');
  assert.deepEqual([...saved.keys()],['current',CARE_LIBRARY_CACHE_KEY]);
});

test('missing storage, malformed cached entries, or full storage do not block the library',()=>{
  assert.deepEqual(readRecent(null),[]);
  assert.deepEqual(readRecent({getItem:()=>'{'}),[]);
  const broken={...guide(2),sections:[{title:'Cultivation',paragraphs:['fine',false]}]};
  assert.deepEqual(readRecent({getItem:()=>JSON.stringify([null,broken,guide(3)])}),[guide(3)]);
  const full={setItem(){throw Error('quota');}};
  assert.deepEqual(rememberGuide(guide(1),[],full),[guide(1)]);
});
