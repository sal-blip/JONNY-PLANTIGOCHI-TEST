// Each stem is a set of quadratic arcs starting in the soil. Round ends and
// lengthwise pale spines give the cactus its soft cylindrical silhouette.
const shoot = {radius:2.5, arc:[36,26, 36,23,36,19]};
const tall = {radius:3, arc:[35,26, 33,21,33,16, 33,12,35,10]};
const offset = {radius:2.5, arc:[38,26, 39,20,42,18]};
const arch = {radius:3, arc:[34,26, 34,16,29,13, 24,10,21,15, 19,18,19,23]};
const left = {radius:3.2, arc:[34,26, 33,19,28,16, 23,13,19,17, 16,21,17,25, 18,29,16,32]};
const right = {radius:3.4, arc:[38,26, 40,17,44,13, 49,8,52,15, 54,20,53,26, 52,32,54,36]};
const near = {radius:2.9, arc:[36,26, 34,19,29,19, 25,19,24,23, 22,26,23,30]};
const stages = {sprout:[shoot],young:[tall,offset],split:[tall,arch,offset],grown:[tall,right,left,near,offset]};
const stress = {dry:.20,critical:.40,dead:.68};
export const cactusSeedRows = [".####.", "#-=++#", "#:--+#", ".#++##", "..###."];
export const bloomRows = [".....#..#", "....#-##:", "....#--:#", "..##:-++#", ".#--::+#.", "#:--++#..", "#-++##...", ".###....."];

function sampleStem({arc}, pose) {
  const points = [];
  const wilt = stress[pose] ?? 0;
  const sway = pose === "left" ? -1 : pose === "right" ? 1 : 0;
  for (let i=2; i<arc.length; i+=4) {
    for (let j=0; j<=16; j++) {
      if (i>2 && j===0) continue;
      const t=j/16, u=1-t;
      const fraction=(i-2+4*t)/(arc.length-2);
      const x=u*u*arc[i-2]+2*u*t*arc[i]+t*t*arc[i+2];
      const y=u*u*arc[i-1]+2*u*t*arc[i+1]+t*t*arc[i+3];
      points.push({
        x:x+sway*fraction*fraction+(x-36)*wilt*.32,
        y:y+wilt*(26-y)+wilt*5*fraction,
      });
    }
  }
  return points;
}

function paintStem(pixels, stem, points, pose) {
  const radius=stem.radius*(1-(stress[pose] ?? 0)*.55);
  // Retain the closest part of this stem for each pixel before shading. This
  // keeps the ribs continuous around a bend and the outline off its interior.
  const distance=new Map();
  let length=0;
  for (const [i,p] of points.entries()) {
    if (i) length+=Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y);
    const next=points[Math.min(i+1,points.length-1)], prev=points[Math.max(0,i-1)];
    const dx=next.x-prev.x, dy=next.y-prev.y;
    for (let y=Math.max(0,Math.floor(p.y-radius)); y<=Math.min(39,p.y+radius); y++) {
      for (let x=Math.max(0,Math.floor(p.x-radius)); x<=Math.min(71,p.x+radius); x++) {
        const ox=x-p.x, oy=y-p.y, d=Math.hypot(ox,oy), key=y*72+x;
        if (d>radius || (distance.get(key)?.d ?? Infinity)<=d) continue;
        const across=(dy*ox-dx*oy)/(Math.hypot(dx,dy)||1);
        distance.set(key,{d,light:-ox-.65*oy,across,length});
      }
    }
  }
  for (const [key,{d,light,across,length}] of distance) {
    let tone=light>.4 ? "=" : "-";
    if (d>radius-.75) tone=light<-.6 ? "#" : "-";
    else if (light<-.8) tone="+";
    // Stagger short cream strokes along the ribs, with some green visible.
    if (d<radius-.35 && (Math.round(across)+12)%3===0 && Math.floor(length+across)%6<4) tone=":";
    // Short pale bristles hang along the margins of a healthy stem.
    if (d>radius-.8 && light>0 && Math.floor(length)%4===1 && !(pose in stress)) {
      const y=Math.floor(key/72), x=key%72;
      if (y<39 && x>0) pixels[y+1][x-1]=":";
    }
    pixels[Math.floor(key/72)][key%72]=tone;
  }
}

export function cactusPose(stage,pose) {
  const pixels=Array.from({length:40},()=>Array(72).fill("."));
  let bloom;
  for (const stem of stages[stage]) {
    const points=sampleStem(stem,pose);
    paintStem(pixels,stem,points,pose);
    if (stem===right && !Object.hasOwn(stress,pose)) {
      const site=points[48];
      bloom={x:Math.round(site.x)+1,y:Math.round(site.y)-6};
    }
  }
  return {rows:pixels.map(row=>row.join("")),bloom};
}
