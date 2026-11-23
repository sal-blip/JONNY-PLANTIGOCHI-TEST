import assert from 'node:assert/strict';
import test from 'node:test';
import {clearScoreHandoff,createScorePlayback} from '../src/scorePlayback.js';

const cotton='/music/cotton-candy-skies.mp3';
const mystic='/music/mystic-oasis.mp3';
const settle=()=>new Promise(resolve=>setImmediate(resolve));

function environment({saved=new Map(),suspended=false,webkit=false}={}){
  const browser=new EventTarget(),page=new EventTarget(),timers=new Map();
  const sources=[],fetches=[],contexts=[];
  let clock=0,timerId=0,allowResume=!suspended;
  const timer=(fn,ms,repeat=false)=>{
    timers.set(++timerId,{fn,at:clock+ms,repeat:repeat?ms:0});
    return timerId;
  };
  function advance(seconds){
    const end=clock+seconds*1000;
    for(;;){
      const due=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];
      if(!due || due[1].at>end)break;
      const [id,item]=due;
      clock=item.at;
      if(item.repeat)item.at+=item.repeat;
      else timers.delete(id);
      item.fn();
    }
    clock=end;
  }
  class Context{
    constructor(){
      this.state=suspended?'suspended':'running';
      this.destination={};
      contexts.push(this);
    }
    get currentTime(){return clock/1000;}
    resume(){
      if(!allowResume)return Promise.reject(new Error('User gesture required'));
      this.state='running';
      this.onstatechange?.();
      return Promise.resolve();
    }
    close(){this.state='closed';return Promise.resolve();}
    decodeAudioData(bytes,success){
      const data={duration:new Uint8Array(bytes)[0]===1?162.5:176.9};
      success(data);
      if(!webkit)return Promise.resolve(data);
    }
    createGain(){
      return {gain:{
        ramps:[],sets:[],cancelScheduledValues(){},
        setValueAtTime(value,time){this.sets.push([value,time]);},
        linearRampToValueAtTime(value,time){this.ramps.push([value,time]);},
      },connect(){},disconnect(){}};
    }
    createBufferSource(){
      const source={
        connect(gain){this.gain=gain.gain;},disconnect(){this.disconnected=true;},
        start(when,offset){this.when=when;this.offset=offset;},
        stop(){this.stopTime=clock/1000;},
      };
      sources.push(source);return source;
    }
  }
  Object.assign(browser,{
    localStorage:{
      getItem:key=>saved.get(key)??null,
      setItem:(key,value)=>saved.set(key,value),
      removeItem:key=>saved.delete(key),
    },
    fetch:async(url,{signal})=>{
      fetches.push({url,signal});
      return {ok:true,arrayBuffer:async()=>Uint8Array.of(url===cotton?1:2).buffer};
    },
    setTimeout:timer,setInterval:(fn,ms)=>timer(fn,ms,true),
    clearTimeout:id=>timers.delete(id),clearInterval:id=>timers.delete(id),
  });
  browser[webkit?'webkitAudioContext':'AudioContext']=Context;
  page.hidden=false;
  return {
    browser,page,sources,fetches,contexts,saved,timers,advance,
    trust(){allowResume=true;browser.dispatchEvent(new Event('touchend'));},
    show(visible){page.hidden=!visible;page.dispatchEvent(new Event('visibilitychange'));},
    player:createScorePlayback(browser,page),
  };
}

test('independent native loops and gain ramps span the farewell and arrival without restarting',async()=>{
  const e=environment(),p=e.player;
  const tutorial={cotton:true,cottonSession:'seed'};
  p.setMix(tutorial);
  await settle();
  e.advance(3);
  p.setMix(tutorial);
  const intro=e.sources[0];
  assert.deepEqual(e.fetches.map(x=>x.url),[cotton]);
  assert.equal(e.sources.length,1);
  assert.equal(intro.loop,true);
  assert.deepEqual(intro.gain.ramps,[[.5,1.2]]);
  p.setMix({});
  assert.deepEqual(intro.gain.ramps.at(-1),[0,8]);
  e.advance(2);
  p.setMix({mystic:true});
  await settle();
  const theme=e.sources[1];
  assert.deepEqual(theme.gain.ramps,[[.5,5.75]]);
  assert.equal(theme.loop,true);
  assert.equal(intro.stopTime,undefined);
  e.advance(3);
  assert.equal(intro.stopTime,8);
  assert.equal(theme.stopTime,undefined);
  assert.deepEqual(e.fetches.map(x=>x.url),[cotton,mystic]);
  assert.equal(e.contexts.length,1);
  p.dispose();
  assert.equal(e.timers.size,0);
});

test('a reversed fade uses the current level and reuses the playing channel',async()=>{
  const e=environment(),p=e.player;
  p.setMix({mystic:true});
  await settle();
  e.advance(1);
  p.setMix({});
  e.advance(.375);
  p.setMix({mystic:true});
  const src=e.sources[0];
  assert.deepEqual(src.gain.sets.at(-1),[.25,1.375]);
  e.advance(20);
  assert.equal(e.sources.length,1);
  assert.equal(src.stopTime,undefined);
  p.dispose();
});

test('visibility and mute silence immediately, resume at loop offset and survive PCM eviction',async()=>{
  const e=environment(),p=e.player;
  p.setMix({mystic:true});
  await settle();
  e.advance(180);
  e.show(false);
  assert.equal(e.sources[0].stopTime,180);
  assert.equal(e.sources[0].disconnected,true);
  e.advance(120);
  e.show(true);
  await settle();
  assert.ok(Math.abs(e.sources[1].offset-3.1)<.00001);
  assert.equal(e.fetches.length,2);
  e.advance(2);
  p.setMix({mystic:true,enabled:false});
  assert.equal(e.sources[1].stopTime,302);
  e.advance(5);
  p.setMix({mystic:true});
  assert.ok(Math.abs(e.sources[2].offset-5.1)<.00001);
  assert.equal(e.fetches.length,2);
  p.dispose();
});

test('blocked autoplay on callback-style WebKit starts on a trusted gesture, and disposal removes listeners',async()=>{
  const e=environment({suspended:true,webkit:true}),p=e.player;
  p.setMix({cotton:true,cottonSession:'intro'});
  await settle();
  assert.equal(e.sources.length,0);
  e.trust();
  await settle();
  assert.equal(e.sources.length,1);
  e.advance(2);
  e.browser.dispatchEvent(new Event('pagehide'));
  e.advance(8);
  assert.equal(e.sources.length,1);
  e.browser.dispatchEvent(new Event('pageshow'));
  assert.equal(e.sources[1].offset,2);
  p.dispose();
  e.trust();
  e.browser.dispatchEvent(new Event('pageshow'));
  assert.equal(e.contexts[0].state,'closed');
  assert.equal(e.sources.length,2);
  assert.equal(e.timers.size,0);
});

test('an obsolete network response cannot start audio, and online retries a transient failure',async()=>{
  const e=environment(),p=e.player;
  const fetch=e.browser.fetch;
  let finish,signal;
  e.browser.fetch=(_,opts)=>new Promise(resolve=>{finish=resolve;signal=opts.signal;});
  p.setMix({cotton:true,cottonSession:'seed'});
  p.setMix({cotton:true,cottonSession:'seed',enabled:false});
  assert.equal(signal.aborted,true);
  finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
  await settle();
  assert.equal(e.sources.length,0);
  let calls=0;
  e.browser.fetch=async(...args)=>++calls===1?{ok:false}:fetch(...args);
  p.setMix({mystic:true});
  await settle();
  assert.equal(calls,1);
  e.browser.dispatchEvent(new Event('online'));
  await settle();
  assert.equal(calls,2);
  assert.equal(e.sources.length,1);
  assert.equal(e.sources[0].buffer.duration,176.9);
  p.dispose();
});

test('public visit, named seed and installed reload hand off elapsed music; the finale and reset clear it',async()=>{
  const first=environment();
  first.player.setMix({cotton:true,cottonSession:'intro'});
  await settle();
  first.advance(13);
  first.player.dispose();
  const installed=environment({saved:first.saved});
  installed.player.setMix({}); // Initial storage lookup has yet to resolve.
  installed.player.setMix({cotton:true,cottonSession:'seed',enabled:false});
  installed.player.dispose();
  const playing=environment({saved:first.saved});
  playing.player.setMix({cotton:true,cottonSession:'seed'});
  await settle();
  assert.equal(playing.sources[0].offset,13);
  playing.advance(4);
  playing.player.setMix({cottonSession:null});
  assert.equal(first.saved.size,0);
  playing.advance(5);
  assert.equal(first.saved.size,0);
  playing.player.dispose();

  const alternate=environment({saved:first.saved});
  alternate.player.setMix({cotton:true,cottonSession:'different'});
  await settle();
  assert.equal(alternate.sources[0].offset,0);
  alternate.player.dispose();
  clearScoreHandoff(alternate.browser);
  assert.equal(first.saved.size,0);
});

test('a silent routing gap preserves the same document’s playhead before naming',async()=>{
  const e=environment(),p=e.player;
  p.setMix({cotton:true,cottonSession:'intro'});
  await settle();
  e.advance(23);
  p.setMix({enabled:false});
  assert.equal(e.saved.size,1);
  e.advance(8);
  p.setMix({cotton:true,cottonSession:'a-seed'});
  await settle();
  assert.equal(e.sources[1].offset,23);
  assert.equal(e.sources[1].buffer,e.sources[0].buffer);
  p.setMix({cottonSession:null});
  assert.equal(e.saved.size,0);
  p.dispose();
});
