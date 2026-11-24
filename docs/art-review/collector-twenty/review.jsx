import React from 'react';
import {createRoot} from 'react-dom/client';
import PlantPixel from '../../../src/PlantPixel.jsx';
import seeds from '../../../src/collectorSeeds.json';
import {drawPottedPlant} from '../../../src/roomPlant.js';
import {drawRoom,ROOM_WIDTH,ROOM_HEIGHT} from '../../../src/roomArt.js';
const all=Object.keys(seeds), group=Number(new URLSearchParams(location.search).get('group'));
const selected=all.slice((group-1)*3,group*3);
const potIds=['terra','wave','bog-frog-pot','lava-pop-pot','terra','terra'];
const potNames=['Terracotta','Blue Wave','Bog Frog','Lava Pop','Sway A','Sway B'];
function Pot({id,pot='terra',time=0,scale=2}){
 return <canvas width="128" height="135" ref={c=>{
   if(!c)return;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
   drawPottedPlant(ctx,{x:64,y:126,plant:{id,species:id},potSku:pot,time,size:scale,reducedMotion:time===0});
 }}/>;
}
function Board(){return <main><h1>Seed art review · {group} of 7</h1>{selected.map(id=><section key={id}><h2>{seeds[id].name}</h2>
 <div className="growth">{['seed','sprout','young','split','grown','dry'].map(k=><div key={k}><PlantPixel species={id} stage={k==='dry'?'grown':k} condition={k==='dry'?'dry':'healthy'}/><small>{k==='split'?'Day five':k}</small></div>)}</div>
 <div className="pots">{potIds.map((pot,i)=><div key={i}><Pot id={id} pot={pot} time={i<4?0:i===4?850:2600}/><small>{potNames[i]}</small></div>)}</div>
 </section>)}<footer>Garden at shelf size</footer><canvas width={ROOM_WIDTH} height={ROOM_HEIGHT} ref={c=>c && drawRoom(c,{roomIndex:0,hour:12,time:0,reducedMotion:true,plants:selected.map((id,i)=>({id,species:id,slot:i})),shopItems:[]})}/></main>}
function Overview(){return <main id="overview"><h1>Twenty new plants to grow</h1><small>Mature garden portraits · Plantigochi review build</small><div className="tiles">{all.map((id,i)=><article key={id}><Pot id={id} scale={2.22}/><b>{seeds[id].name}</b><small>{seeds[id].dayFive}</small></article>)}</div></main>}
createRoot(document.getElementById('root')).render(group?<Board/>:<Overview/>);
