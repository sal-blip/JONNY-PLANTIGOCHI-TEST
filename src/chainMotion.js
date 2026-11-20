// Drawing units in the shell's 600 × 565 coordinate system. Positive Z is
// toward the player. The eyelet is the chain's only permanent constraint.
export const EYELET = {x:208, y:146, z:15};
export const LINK_COUNT = 9;
export const RING = LINK_COUNT + 1;
export const LINK = 15;
export const RING_REACH = 29;
const ringRadius = 35;
const front = 12, back = -10;
const dtLimit = .05;

const rim = [
  [366,514],[335,505],[300,502],[250,497],[211,487],[182,472],[162,451],[163,445],
  [188,452],[205,452],[205,448],[167,434],[137,418],[116,398],[98,366],[100,358],
  [124,369],[159,381],[164,379],[161,374],[124,349],[99,326],[85,302],[79,277],
  [81,260],[88,261],[111,285],[146,306],[153,305],[149,299],[119,265],[104,238],
  [103,218],[111,194],[125,172],[143,154],[171,135],[194,125],[218,121],[244,123],
  [262,136],[279,157],[287,158],[300,136],[319,119],[341,112],[363,113],[389,118],
  [416,129],[444,146],[465,165],[464,171],[433,169],[408,171],[391,177],[390,181],
  [422,181],[455,186],[477,194],[498,213],[509,235],[514,252],[509,256],[478,244],
  [449,239],[445,242],[480,257],[504,274],[520,296],[525,315],[524,342],[519,349],
  [510,343],[480,321],[454,310],[449,313],[478,338],[497,364],[503,386],[497,409],
  [481,435],[473,440],[469,423],[461,405],[448,387],[445,390],[453,421],[450,447],
  [439,466],[416,485],[395,497],[372,513],
];
export const outsideLeafPath = 'M-400 -400H1000V965H-400Z M'+rim.map(pair=>pair.join(' ')).join('L')+'Z';

export function leafContact(x,y) {
  let inside = false, squared = Infinity, edgeX = 0, edgeY = 0;
  for (let i=0,j=rim.length-1;i<rim.length;j=i++) {
    const [ax,ay] = rim[j], [bx,by] = rim[i];
    const dx=bx-ax, dy=by-ay;
    if ((ay>y)!==(by>y) && x < (bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    const ex=ax+t*dx, ey=ay+t*dy, d=(x-ex)**2+(y-ey)**2;
    if (d<squared) { squared=d; edgeX=ex; edgeY=ey; }
  }
  const length=Math.sqrt(squared), sign=inside?-1:1;
  return {distance:sign*length, nx:sign*(x-edgeX)/(length||1), ny:sign*(y-edgeY)/(length||1)};
}

const lengthAt = index => index===RING ? RING_REACH : LINK;
const reachAt = index => index===RING ? LINK_COUNT*LINK+RING_REACH : index*LINK;
const radiusAt = index => index===RING ? ringRadius : 3.3;
const limit = (v,a,b) => Math.max(a,Math.min(b,v));
const node = (x,y,z) => ({x,y,z,vx:0,vy:0,vz:0,oldX:x,oldY:y,oldZ:z});
const restAngles=[-57,-64,-65,-61,-54,-46,-37,-28,-16,-5];

export function restingChain() {
  const points=[node(EYELET.x,EYELET.y,EYELET.z)];
  for(let i=1;i<=RING;i++) {
    const prev=points[i-1], a=restAngles[i-1]*Math.PI/180;
    points.push(node(prev.x+lengthAt(i)*Math.sin(a),prev.y+lengthAt(i)*Math.cos(a),EYELET.z));
  }
  return {points, grip:null, toss:null, side:1, quiet:0};
}

export function projectedGravity(x,y,z=-1) {
  if(!Number.isFinite(x)||!Number.isFinite(y)) return {x:0,y:0,z:-1};
  const mag=Math.hypot(x,y), norm=Math.max(1,mag);
  return {x:mag<.045?0:x/norm,y:mag<.045?0:y/norm,z:Number.isFinite(z)?limit(z,-1,1):-1};
}

function collide(p,i) {
  const radius=radiusAt(i), thickness=i===RING?3.3:2.4;
  p.x=limit(p.x,radius+1,599-radius);p.y=limit(p.y,radius+1,564-radius);
  p.z=limit(p.z,-49,68);
  const top=front+thickness, bottom=back-thickness;
  if(p.z>=top||p.z<=bottom) {
    // One unusually fast frame still cannot tunnel through solid resin.
    if (!(p.oldZ>=top && p.z<=bottom) && !(p.oldZ<=bottom && p.z>=top)) return;
  }
  const c=leafContact(p.x,p.y), margin=radius-c.distance;
  if(margin<=0) return;
  if(p.oldZ>=top-.01 && p.z<top) {p.z=top;return;}
  if(p.oldZ<=bottom+.01 && p.z>bottom) {p.z=bottom;return;}
  const depth=Math.min(top-p.z,p.z-bottom);
  if(margin<depth && c.distance>=0) {p.x+=c.nx*margin;p.y+=c.ny*margin;}
  else p.z=p.z>(front+back)/2 ? top : bottom;
}

function constrain(chain,passes) {
  const {points,grip}=chain, hand=grip?.index;
  for(let pass=0;pass<passes;pass++) {
    if(grip) Object.assign(points[hand],grip.target);
    for(let n=1;n<=RING;n++) {
      const i=pass%2 ? RING+1-n : n;
      const a=points[i-1],b=points[i];
      const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,distance=Math.hypot(dx,dy,dz)||.001;
      const wa=i===1||i-1===hand?0:1, wb=i===hand?0:i===RING?.30:1;
      if(wa+wb===0) continue;
      const correction=(distance-lengthAt(i))/(distance*(wa+wb));
      a.x+=dx*correction*wa;a.y+=dy*correction*wa;a.z+=dz*correction*wa;
      b.x-=dx*correction*wb;b.y-=dy*correction*wb;b.z-=dz*correction*wb;
    }
    // Surface contacts are checked after the length solve so falling links
    // stay on the face they approached, or slide around the physical rim.
    for(let i=1;i<=RING;i++) collide(points[i],i);
    // A length can cross between the two faces only in the empty space beyond
    // the rim. Checking the segment as well as its endpoints prevents a fully
    // hidden ring from pulling its adjoining link straight through the case.
    for(let i=1;i<=RING;i++) {
      const a=points[i-1],b=points[i];
      if((a.z<0)===(b.z<0)) continue;
      const t=a.z/(a.z-b.z),contact=leafContact(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
      const overlap=3.6-contact.distance;
      if(overlap<=0)continue;
      const wa=i>1&&i-1!==hand?1-t:0, wb=i!==hand?t:0;
      const sum=wa*(1-t)+wb*t;
      if(sum<.01)continue;
      const correction=Math.min(16,overlap/sum);
      a.x+=contact.nx*correction*wa;a.y+=contact.ny*correction*wa;
      b.x+=contact.nx*correction*wb;b.y+=contact.ny*correction*wb;
    }
  }
}

export function gripChain(chain,index,at=0) {
  if(index<1||index>RING) return;
  const p=chain.points[index],distance=leafContact(p.x,p.y).distance;
  chain.grip={index,side:p.z<0?-1:1,peak:distance,startDistance:distance,armed:false,turned:false,
    target:{x:p.x,y:p.y,z:p.z}, samples:[{x:p.x,y:p.y,at}]};
  chain.toss=null;
  chain.quiet=0;
}

export function dragChain(chain,x,y,at) {
  const grip=chain.grip;
  if(!grip||!Number.isFinite(x)||!Number.isFinite(y)) return;
  const p=chain.points[grip.index],radius=radiusAt(grip.index);
  const dx=x-EYELET.x,dy=y-EYELET.y;
  const boundedTarget = side => {
    const dz=(side>0?24:-20)-EYELET.z;
    const scale=Math.min(1,(reachAt(grip.index)-.1)/(Math.hypot(dx,dy,dz)||1));
    return {x:EYELET.x+dx*scale,y:EYELET.y+dy*scale,z:EYELET.z+dz*scale};
  };
  let target=boundedTarget(grip.side);
  const distance=leafContact(target.x,target.y).distance;
  if(grip.turned && distance<radius+1) {
    grip.turned=false;grip.armed=false;grip.startDistance=distance;grip.peak=distance;
  }
  grip.peak=Math.max(grip.peak,distance);
  if(distance>radius+9 && (distance-grip.startDistance>8 || grip.startDistance<radius)) grip.armed=true;
  if(grip.armed&&!grip.turned&&grip.peak-distance>6) {
    // The held piece has cleared the edge. Changing depth here (outside the
    // outline) lets it return on the opposite face without piercing the toy.
    grip.turned=true;grip.side*=-1;chain.side=grip.side;
    target=boundedTarget(grip.side);
    const old=leafContact(p.x,p.y);
    if(old.distance>radius+1) {
      let first=grip.index;
      while(first>1) {
        const q=chain.points[first-1];
        if(leafContact(q.x,q.y).distance<radiusAt(first-1)+1)break;
        first--;
      }
      // Successive loose links roll over the edge rather than the last
      // segment changing faces alone and subsequently cutting through resin.
      for(let i=first;i<=grip.index;i++) {
        const q=chain.points[i];
        q.z=q.oldZ=grip.side*Math.min(20,(i-first)*11-7);
      }
      p.z=p.oldZ=grip.side>0?22:-20;
    }
  }
  const sx=target.x-grip.target.x,sy=target.y-grip.target.y;
  // Use the finger path, even when the tether has reached its full length.
  // Averaging recent travel also handles the small duplicate moves before lift.
  const samples=grip.samples;
  const previous=samples.at(-1);
  if(at-previous.at>100) {
    samples.length=0;
    samples.push({...previous,at:at-50});
  }
  samples.push({x,y,at});
  while(samples.length>2 && samples[1].at<at-80) samples.shift();
  grip.target=target;
  // A short drag translates the whole reachable neighbourhood before the
  // pins tighten. This also gives reduced-motion users direct manipulation.
  for(let i=1;i<=RING;i++) {
    const q=chain.points[i],share=i<grip.index?i/grip.index:Math.max(.15,1-(i-grip.index)*.22);
    q.oldZ=q.z;q.x+=sx*share;q.y+=sy*share;
  }
  constrain(chain,22);
  chain.quiet=0;
}

export function releaseChain(chain,at,reduced=false) {
  const grip=chain.grip;if(!grip)return;
  const first=grip.samples[0],last=grip.samples.at(-1);
  const age=Math.max(0,at-last.at);
  const seconds=Math.max(.012,(last.at-first.at)/1000);
  const scale=reduced?0:limit(1-Math.max(0,age-35)/80,0,1)/seconds;
  let vx=(last.x-first.x)*scale,vy=(last.y-first.y)*scale;
  const speed=Math.hypot(vx,vy);
  const gain=Math.min(1.12,1200/(speed||1));
  vx*=gain;vy*=gain;
  chain.grip=null;
  for(let i=1;i<=RING;i++) {
    const p=chain.points[i];
    const share=i<=grip.index ? i/grip.index : 1/(1+.12*(i-grip.index));
    p.vx=vx*share;p.vy=vy*share;p.vz=0;
  }
  // An outward toss can carry loose hardware around the lip after release.
  chain.toss=speed>260 ? {index:grip.index,side:grip.side,remaining:.22} : null;
  chain.quiet=0;
}

export function flickChain(chain,x,y,z=0) {
  if(chain.grip||![x,y,z].every(Number.isFinite)) return;
  if(Math.abs(z)>95) chain.side=z<0?-1:1;
  for(let i=1;i<=RING;i++) {
    const p=chain.points[i],w=.45+.55*i/RING;
    p.vx=limit(p.vx+limit(x,-520,520)*w,-850,850);
    p.vy=limit(p.vy+limit(y,-520,520)*w,-850,850);
    p.vz=limit(p.vz+limit(z,-310,310)*w,-450,450);
  }
  chain.quiet=0;
}

function turnAtRim(chain,h) {
  const toss=chain.toss;
  if(!toss)return;
  toss.remaining-=h;
  if(toss.remaining<=0) {chain.toss=null;return;}
  const p=chain.points[toss.index], contact=leafContact(p.x,p.y);
  if(contact.distance<radiusAt(toss.index)+2 || p.vx*contact.nx+p.vy*contact.ny<110)return;
  chain.side=-toss.side;
  for(let i=toss.index;i>0;i--) {
    const q=chain.points[i];
    if(leafContact(q.x,q.y).distance<=radiusAt(i)+1)break;
    q.vz=chain.side*250;
  }
  chain.toss=null;
}

export function stepChain(chain,gravity,elapsed) {
  if(!Number.isFinite(elapsed)||elapsed<=0) return true;
  const dt=Math.min(dtLimit,elapsed),steps=Math.ceil(dt*100),h=dt/steps;
  const force=470;
  let speed=0;
  for(let k=0;k<steps;k++) {
    speed=0;
    turnAtRim(chain,h);
    for(let i=1;i<=RING;i++) {
      const p=chain.points[i];p.oldX=p.x;p.oldY=p.y;p.oldZ=p.z;
      if(i===chain.grip?.index)continue;
      const drag=Math.exp(-(i===RING?2.0:2.9)*h);
      p.vx=(p.vx+force*gravity.x*h)*drag;p.vy=(p.vy+force*gravity.y*h)*drag;
      const plane=chain.side>0?15.5:-15.5;
      p.vz=(p.vz+((plane-p.z)*28+(gravity.z??-1)*12)*h)*Math.exp(-5.3*h);
      p.x+=p.vx*h;p.y+=p.vy*h;p.z+=p.vz*h;
    }
    constrain(chain,9);
    for(let i=1;i<=RING;i++) {
      const p=chain.points[i];p.vx=(p.x-p.oldX)/h;p.vy=(p.y-p.oldY)/h;p.vz=(p.z-p.oldZ)/h;
      speed=Math.max(speed,Math.hypot(p.vx,p.vy,p.vz));
    }
  }
  chain.quiet=speed<3.2?chain.quiet+dt:0;
  return chain.quiet<.3;
}

export function partPose(chain,index) {
  const a=chain.points[index-1],b=chain.points[index];
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.max(.6,Math.hypot(dx,dy));
  const angle=-Math.atan2(dx,dy)*180/Math.PI;
  const projection=limit(length/lengthAt(index),.12,1.04);
  const origin=index===RING?b:{x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  return {
    back:index===RING?b.z<0:(a.z+b.z)/2<0,
    transform:`translate(${origin.x.toFixed(2)} ${origin.y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(1 ${projection.toFixed(3)})`,
  };
}
