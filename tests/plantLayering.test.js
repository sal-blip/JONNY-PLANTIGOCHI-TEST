import test from 'node:test';
import assert from 'node:assert/strict';
import {drawPottedPlant} from '../src/roomPlant.js';
import {approvedArt} from '../src/shopSprites/approved.js';
import {growthOrder} from '../src/game.js';
import {catalog} from '../src/gardenEconomy.js';

function render(plant,potSku,{night=0,time=null,bare=false}={}){
  const pixels=new Map();
  const ctx={save(){},restore(){},fillRect(x,y,w,h){
    for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixels.set(j*512+i,this.fillStyle);
  }};
  drawPottedPlant(ctx,{x:0,y:0,size:2,styleIndex:0,plant,potSku,night,time,bare,reducedMotion:time===null});
  return pixels;
}
const at=(pixels,x,y)=>pixels.get(y*512+x);

test('a vacant slot has no pottery and an unpotted Monstera uses the detailed nursery vessel',()=>{
  assert.equal(render(null,null).size,0);
  const plant={species:'monstera',id:'first'};
  assert.deepEqual(render(plant,null),render(plant,'terra'));
});

test('both lower Begonia blades paint over the rim while the central stalk is behind it',()=>{
  for(const [pot,shift] of [['terra',3],['wave',4]]){
    for(const night of [0,1])for(const time of [null,900,3000]){
      const plant={species:'polka-dot-begonia',id:'begonia',potStyle:0};
      const physical=render(plant,pot,{night,time});
      const alone=render(plant,pot,{night,time,bare:true});
      const container=render(null,pot,{night,time});
      const y=-32+9+shift;
      for(const x of [-13,10]){
        assert.ok(at(container,x,y));
        assert.ok(at(alone,x,y));
        assert.equal(at(physical,x,y),at(alone,x,y));
        assert.notEqual(at(physical,x,y),at(container,x,y));
      }
      assert.equal(at(physical,0,y),at(container,0,y));
      assert.notEqual(at(alone,0,y),at(container,0,y));
    }
  }
});

test('every species keeps the visible pottery stationary across finishes and sway poses',()=>{
  const species=new Set([...growthOrder,...Object.keys(catalog).filter(s=>catalog[s].kind==='plant')]);
  for(const pot of Object.keys(catalog).filter(s=>catalog[s].kind==='pot')){
    const night=pot==='wave' || pot==='lava-pop-pot'?1:0;
    const container=render(null,pot,{night});
    for(const s of species){
      const plant={species:s,id:s,potStyle:0};
      for(const time of [null,900,3000]){
        const mounted=render(plant,pot,{night,time});
        const bare=render(plant,pot,{night,time,bare:true});
        for(const [position,color] of container){
          const pixel=mounted.get(position);
          if(pixel!==color)assert.equal(pixel,bare.get(position),s+' in '+pot);
          assert.ok(pixel,s+' lost a pot pixel in '+pot);
        }
      }
    }
  }
});

test('cascading crowns stay centered on the Frog Pot and the Queen remains connected to the soil',()=>{
  for(const species of ['monkey-tail-cactus','queen-anthurium']){
    const plant={species,id:species};
    for(const time of [null,900,3000]){
      const bare=render(plant,'bog-frog-pot',{time,bare:true});
      let min=Infinity,max=-Infinity;
      for(let y=-90;y<-37;y++)for(let x=-70;x<=70;x++){
        if(at(bare,x,y)){min=Math.min(min,x);max=Math.max(max,x);}
      }
      assert.ok(Number.isFinite(min) && Math.abs((min+max)/2)<=5,species+' canopy is off center');
      if(species==='monkey-tail-cactus')continue;
      const socketY=-45;
      for(let y=socketY;y<=-35;y++){
        assert.ok([-2,-1,0,1,2].some(x=>at(bare,x,y)),species+' disconnected at '+y);
      }
    }
  }
});

test('old glaze fields resolve to the current nursery art and its ceramic stays still',()=>{
  const species=new Set([...growthOrder,...Object.keys(catalog).filter(s=>catalog[s].kind==='plant')]);
  for(const s of species)for(let potStyle=0;potStyle<6;potStyle++){
    const plant={species:s,id:s,potStyle};
    const rest=render(plant,null);
    assert.deepEqual(rest,render({species:s,id:s},null));
    const restPlant=render(plant,null,{bare:true});
    const moving=render(plant,null,{time:1300});
    const movingPlant=render(plant,null,{time:1300,bare:true});
    for(const [pos,color] of rest){
      if(!restPlant.has(pos) && !movingPlant.has(pos))assert.equal(moving.get(pos),color,s+' nursery pot moved');
    }
  }
});

test('basal plants and trailing vines meet the soil in every pot without a synthetic stalk',()=>{
  const origins=[['monkey-tail-cactus','monkey-tail-cactus-repotted',-1,1],['snake-plant','snake-plant-repotted',0,0],
    ['golden-pothos','golden-pothos-repotted',0,0],['hoya-serpens-splash','hoya-serpens-splash-repotted',0,0]];
  for(const [species,master,rootX,rootY] of origins){
    const {spriteRows,spriteOffset}=approvedArt[master];
    for(const [pot,soilY,soilX=0] of [['terra',-31],['wave',-31],['bog-frog-pot',-37],['lava-pop-pot',-39],['stump-cottage-pot',-38],['rain-boot-pot',-42,6],['ringed-planet-pot',-37],['honey-glazed-terracotta',-35],['blue-willow-porcelain',-35],['low-sandstone-bowl',-20]]){
      const bare=render({id:species,species},pot,{bare:true});
      let count=0;
      spriteRows.forEach((row,r)=>Array.from(row).forEach((pixel,c)=>{
        if(pixel===' ')return;
        count++;
        assert.ok(at(bare,spriteOffset.x+c-rootX+soilX,spriteOffset.y+r-rootY+soilY),species+' anchor in '+pot);
      }));
      assert.equal(bare.size,count,species+' has extra pixels at its root');
    }
  }
});


test('new seed crowns keep the same soil contact through every pot swap and sway',()=>{
  const added=growthOrder.slice(growthOrder.indexOf('venus-flytrap'));
  assert.equal(added.length,23);
  const slots=[['terra',-31],['wave',-31],['bog-frog-pot',-37],['lava-pop-pot',-39],['stump-cottage-pot',-38],['rain-boot-pot',-42,6],['ringed-planet-pot',-37],['honey-glazed-terracotta',-35],['blue-willow-porcelain',-35],['low-sandstone-bowl',-20]];
  for(const species of added){
    const plant={species,id:'fitting-'+species};
    let contact;
    for(const [pot,y,soilX=0] of slots)for(const time of [null,900,3000]){
      const bare=render(plant,pot,{time,bare:true});
      const strip=[];
      for(let dy=-2;dy<=1;dy++)for(let x=-10;x<=10;x++)strip.push(bare.has((y+dy)*512+x+soilX));
      const centered=[-1,0,1].some(x=>at(bare,x+soilX,y)||at(bare,x+soilX,y-1));
      assert.ok(centered,species+' misses soil center in '+pot);
      contact??=strip;
      assert.deepEqual(strip,contact,species+' root shifts in '+pot);
    }
  }
});

test('starter Monstera sits above the heel of the Rain Boot',()=>{
  const plant={species:'monstera',id:'first'};
  const standard=render(plant,'terra',{bare:true});
  const boot=render(plant,'rain-boot-pot',{bare:true});
  assert.deepEqual(boot,new Map([...standard].map(([point,color])=>[point+6-10*512,color])));
});
