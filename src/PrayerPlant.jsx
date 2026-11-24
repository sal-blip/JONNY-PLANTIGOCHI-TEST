import React from 'react';

// Basal joint, tip, blade radius. The erect central roll opens at the fourth stage.
const leaves=[
  [33,18,18,12,3.2],[39,17,52,10,3.4],[35,15,32,4,3.1],
  [32,21,17,18,3.4],[39,21,55,16,3.6],[37,14,42,3,2.7]
];
const stages={sprout:2,young:3,split:5,grown:6};
const colors={
  healthy:['#264637','#376140','#547d49','#94a858','#ac5361','#dd8990'],
  dry:['#4a5136','#606e41','#848c50','#aaa45e','#aa6760','#cd9a82'],
  critical:['#63523b','#7c6649','#99805c','#b29c68','#a06a58','#c59877'],
  dead:['#534539','#6a5845','#897253','#a18b6b','#866950','#ac9775']
};

function leafPaths(stage,pose,frame){
  const pixels=new Map();
  const dot=(x,y,color)=>pixels.set(Math.round(y)*72+Math.round(x),color);
  const count=stages[stage],scale=stage==='sprout'?.43:stage==='young'?.72:1;
  for(const [i,[bx,by,tx,ty,radius]] of leaves.slice(0,count).entries()){
    const side=Math.sign(tx-36);
    const x=36+(bx-36)*scale,y=26+(by-26)*scale;
    const lift=pose==='night',droop={dry:7,critical:11,dead:14}[pose]||0;
    const tipX=36+(tx-36)*scale*(lift?.56:1)+frame*.5;
    const tipY=Math.max(2,26+(ty-26)*scale+(droop-(lift?4:0))*scale);
    const dx=tipX-x,dy=tipY-y,len=Math.hypot(dx,dy);
    const stemSteps=Math.ceil(Math.hypot(36-x,26-y)*2);
    for(let s=0;s<=stemSteps;s++)dot(36+(x-36)*s/stemSteps,26+(y-26)*s/stemSteps,1);
    for(let py=Math.floor(Math.min(y,tipY)-5);py<=Math.max(y,tipY)+5;py++)
      for(let px=Math.floor(Math.min(x,tipX)-5);px<=Math.max(x,tipX)+5;px++){
        const t=((px-x)*dx+(py-y)*dy)/(len*len);
        if(t<0 || t>1)continue;
        const w=Math.sin(Math.PI*t)**.72*radius*scale;
        const n=((px-x)*dy-(py-y)*dx)/len;
        if(Math.abs(n)>w)continue;
        let ink=Math.abs(n)>w-.72?0:n*side>.1?1:2;
        if(Math.abs(n)<w*.48)ink=3;
        if(Math.abs(n)<.48 || (w>1.6 && Math.abs(n)<w-.65 && Math.abs((t*len-Math.abs(n)*.9+24)%3.9-1.9)<.46))ink=i%3===1?5:4;
        dot(px,py,ink);
      }
  }
  return Array.from(pixels).reduce((paths,[p,ink])=>{
    paths[ink]+='M'+(p%72)+' '+Math.floor(p/72)+'h1v1h-1z';return paths;
  },Array(6).fill(''));
}
const cache=new Map();
export default function PrayerPlant({stage,condition,severity=0,hour=new Date().getHours()}){
  const stress=condition==='dead'?'dead':condition==='critical'?'critical':
    condition==='dry'||condition==='rootRot'||severity===3?'dry':null;
  const pose=stress || (hour<7||hour>=19?'night':'day'),palette=colors[stress]||colors.healthy;
  return <g data-prayer-pose={pose} className={stress?undefined:"plant-pixel-sway"}>{(stress?[0]:[0,1,-1]).map((frame,i)=>{
    const key=[stage,pose,frame].join('/');
    if(!cache.has(key))cache.set(key,leafPaths(stage,pose,frame));
    return <g key={frame} className={stress?undefined:['plant-pixel-rest','plant-pixel-active','plant-pixel-return'][i]}>
      {cache.get(key).map((path,tone)=><path key={tone} d={path} fill={palette[tone]}/>)}</g>;
  })}</g>;
}
