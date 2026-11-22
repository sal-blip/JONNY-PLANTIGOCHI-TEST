import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EYELET, LINK, RING, RING_REACH, dragChain, flickChain, gripChain, hangingGravity, leafContact,
  partPose, projectedGravity, releaseChain, restingChain, stepChain,
} from '../src/chainMotion.js';

const flat = projectedGravity(0,0);
const ring = chain => chain.points[RING];

function settle(chain, gravity) {
  let frames=0;
  while(frames++<800 && stepChain(chain,gravity,1/60)) { /* run to sleep */ }
  assert.ok(frames<800, 'a resting chain stops requesting animation frames');
  return chain;
}

function trace(chain,coords,start=0) {
  let time=start;
  for(const [x,y] of coords) {
    dragChain(chain,x,y,time+=20);
    stepChain(chain,flat,.02);
  }
  return time;
}

test('absolute gravity moves every free link around a single fixed eyelet',()=>{
  assert.deepEqual(projectedGravity(.019,-.024),flat);
  assert.deepEqual(projectedGravity(NaN,1),flat);
  const neutral=restingChain();
  const flatRing=ring(settle(neutral,flat));
  assert.ok(flatRing.x<140 && flatRing.y>230);
  for(const [gx,gy] of [[0,1],[1,0],[-1,0],[0,-1]]) {
    const chain=settle(restingChain(),projectedGravity(gx,gy,0));
    const {x,y,z}=chain.points[0];
    assert.deepEqual({x,y,z},EYELET);
    const end=ring(chain);
    assert.ok((end.x-x)*gx+(end.y-y)*gy>100);
    assert.ok(Math.abs(chain.points[1].x-neutral.points[1].x)+Math.abs(chain.points[1].y-neutral.points[1].y)>2);
    for(let i=1;i<=RING;i++){
      const a=chain.points[i-1],b=chain.points[i];
      assert.ok(Math.abs(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)-(i===RING?RING_REACH:LINK))<.8);
    }
  }
});

test('a direct front drag stays over the resin and imparts release momentum',()=>{
  const chain=restingChain();
  gripChain(chain,RING);
  const at=trace(chain,[[125,241],[145,230],[165,220],[185,226],[204,237]]);
  assert.ok(leafContact(ring(chain).x,ring(chain).y).distance<0);
  assert.equal(partPose(chain,RING).back,false);
  const before=ring(chain).x;
  releaseChain(chain,at+6);
  assert.ok(ring(chain).vx>200);
  stepChain(chain,flat,1/45);
  assert.ok(ring(chain).x>before+2);
});

test('a sweep around the edge tucks the ring behind, with links routed around the rim',()=>{
  const chain=restingChain();
  gripChain(chain,RING);
  const at=trace(chain,[[85,215],[58,179],[49,144],[65,145],[86,145],[112,157],[137,174],[150,190],[170,200],[191,207]]);
  assert.equal(partPose(chain,RING).back,true);
  assert.ok(leafContact(ring(chain).x,ring(chain).y).distance< -40);
  function assertRouted() {
    const points=chain.points;
    let transitions=0;
    for(let i=1;i<=RING;i++){
      const a=points[i-1], b=points[i];
      if((a.z<0)===(b.z<0)) continue;
      transitions++;
      const t=a.z/(a.z-b.z);
      assert.ok(leafContact(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t).distance>1);
    }
    assert.ok(transitions>0);
  }
  assertRouted();
  releaseChain(chain,at+120,true);
  settle(chain,flat);
  assertRouted();
  assert.equal(partPose(chain,RING).back,true);
  assert.equal(partPose(restingChain(),RING).back,false);
});

test('any exposed link can be dragged, and reduced motion releases exactly where it was held',()=>{
  const chain=restingChain(),link=3;
  gripChain(chain,link);
  dragChain(chain,208,106,10);
  assert.equal(chain.grip.index,link);
  assert.ok(chain.points[link].y<110);
  const before=chain.points.map(({x,y,z})=>[x,y,z]);
  releaseChain(chain,25,true);
  assert.deepEqual(chain.points.map(({x,y,z})=>[x,y,z]),before);
  assert.ok(chain.points.every(p=>p.vx===0&&p.vy===0&&p.vz===0));
});

test('phone impulses respect a held piece and settle after release',()=>{
  const chain=restingChain();
  gripChain(chain,RING);
  flickChain(chain,350,-150,-190);
  assert.equal(ring(chain).vx,0);
  releaseChain(chain,40);
  flickChain(chain,350,-150,-190);
  assert.equal(ring(chain).vx,350);
  assert.equal(chain.side,-1);
  settle(chain,flat);
  assert.ok(chain.points.every(p=>[p.x,p.y,p.z].every(Number.isFinite)));
});

test('a delayed animation frame has bounded integration time',()=>{
  const a=restingChain(),b=restingChain(),gravity=projectedGravity(.8,-.2);
  stepChain(a,gravity,8);
  stepChain(b,gravity,.05);
  assert.deepEqual(a,b);
});

test('a quick swipe after holding still keeps its momentum through duplicate lift coordinates',()=>{
  const chain=restingChain(),p=ring(chain);
  const {x,y}=p;
  gripChain(chain,RING,0);
  dragChain(chain,x+18,y,700);
  dragChain(chain,x+43,y,724);
  for(const at of [727,730,733,736]) dragChain(chain,x+43,y,at);
  releaseChain(chain,740);
  assert.ok(p.vx>360);
  const left=p.x;
  for(let i=0;i<5;i++) stepChain(chain,flat,1/60);
  assert.ok(p.x>left+10);
});

test('an outward finger flick can tuck the ring behind the leaf without a return drag',()=>{
  const chain=restingChain(),p=ring(chain), {x,y}=p;
  gripChain(chain,RING,100);
  for(let i=1;i<=4;i++) dragChain(chain,x+(55-x)*i/4,y+(180-y)*i/4,100+i*15);
  releaseChain(chain,167);
  const upright=projectedGravity(0,1,0);
  for(let i=0;i<150;i++) stepChain(chain,upright,1/60);
  assert.ok(p.z<0 && partPose(chain,RING).back);
  assert.deepEqual([chain.points[0].x,chain.points[0].y,chain.points[0].z],[EYELET.x,EYELET.y,EYELET.z]);
});

test('holding at the end of a swipe does not throw the ring on release',()=>{
  const chain=restingChain(),p=ring(chain);
  gripChain(chain,RING,100);
  dragChain(chain,p.x+36,p.y-18,145);
  releaseChain(chain,320);
  assert.equal(Math.hypot(p.vx,p.vy,p.vz),0);
  assert.equal(chain.toss,null);
});

test('an upward flick settles below the eyelet with level or upright phone readings',()=>{
  for(const sample of [[0,0,-1],[.04,.07,-.99],[0,1,0]]){
    const chain=restingChain();
    gripChain(chain,RING,0);
    dragChain(chain,150,85,30);
    const releasedY=ring(chain).y;
    releaseChain(chain,36);
    settle(chain,hangingGravity(...sample));
    assert.ok(ring(chain).y>releasedY+100);
    assert.ok(ring(chain).y>EYELET.y+50);
  }
  assert.deepEqual(hangingGravity(1,0,0),projectedGravity(1,0,0));
});
