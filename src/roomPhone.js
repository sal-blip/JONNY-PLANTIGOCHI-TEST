import {drawSelectionContour} from './roomContour.js';

// Anchors and hit boxes are panel-local values in the room's 400 × 320 grid.
const handsets=[
  {x:233,y:247,size:1,hitX:233,hitY:237,hitWidth:34,hitHeight:30},
  {x:118,y:197,size:.9,hitX:118,hitY:188,hitWidth:32,hitHeight:28},
].map(spot=>Object.freeze({id:'phone',name:'iSEED',...spot}));
export const phoneFor=(index=0)=>handsets[index%2];

const colors={
  // Pine-tinted glass, sage anodised metal and a small solid oak rest.
  k:['#344440','#30363e'], b:['#61776a','#4c5960'], m:['#a8b39a','#798687'],
  h:['#e2dfbf','#b1b1a5'], q:['#604e40','#443e45'], n:['#ab8359','#74665d'],
  // The home screen keeps its own soft light after sunset.
  s:['#a8c5a5','#9aba9f'], l:['#c5d3ac','#b8cdaa'], a:['#77a38c','#6c9888'],
  f:['#558675','#497c71'], d:['#386862','#315e5d'], w:['#f2e7c7','#e7ddb9'],
  g:['#a9c98d','#a0bf8b'], o:['#f0ca84','#eac580'], r:['#ca896f','#c98b79'],
  v:['#b4a5bc','#ab9fb7'], u:['#8cb6be','#85aeb7'],
};
const index=Object.fromEntries(Object.keys(colors).map((name,i)=>[name,i+1]));
const palettes=new Map();
function inks(night){
  const level=Math.round(Math.max(0,Math.min(1,night))*32);
  if(!palettes.has(level)){
    palettes.set(level,[null,...Object.values(colors).map(([day,dark])=>{
      const channels=[1,3,5].map(i=>{
        const a=parseInt(day.slice(i,i+2),16),b=parseInt(dark.slice(i,i+2),16);
        return Math.round(a+(b-a)*level/32);
      });
      return 'rgb('+channels.join(',')+')';
    })]);
  }
  return palettes.get(level);
}

function handset(){
  const width=32,height=28,left=-15,top=-25;
  const cells=new Uint8Array(width*height);
  function row(x,y,w,ink){
    const at=(y-top)*width+x-left;
    cells.fill(index[ink],at,at+w);
  }
  // Rest the handset at a shallow recline. The right-hand end of the tiny
  // wooden stand peeks out from behind it; the palm-sized screen is one piece.
  for(let i=0;i<10;i++)row(4,-13+i,2+Math.floor(i*.55),i<8?'n':'q');
  row(-6,-1,15,'q');row(-4,-2,14,'n');
  // Pixel rows shear gently toward the front of the table. The extra dark
  // edge below the glass is the thickness of the casing.
  function face(x,y,w,ink,side=0,down=0){
    const offset=4-Math.floor(y*.33);
    row(x-9+offset+side,y-24+down,w,ink);
  }
  for(let y=0;y<23;y++){
    const inset=y===0||y===22?3:y===1||y===21?1:0;
    face(inset,y,18-2*inset,'k',1,1);
    face(inset,y,18-2*inset,'m');
    if(y>0 && y<22)face(inset+1,y,16-2*inset,'k');
  }
  face(4,0,9,'h');face(1,2,1,'h');
  for(let y=3;y<9;y++)face(0,y,1,'h');
  for(let y=7;y<11;y++)face(18,y,1,'b');
  face(6,2,4,'b');face(11,2,1,'o'); // earpiece and amber status light
  for(let y=3;y<20;y++)face(2,y,14,y<9?'s':y<13?'a':'f');
  // Two hills cross the wallpaper. Five little app tiles sit above a dock;
  // transparent spaces between the clusters keep them legible at room scale.
  for(let i=0;i<6;i++){
    face(2,6+i,Math.min(9,1+i*2),'a');
    if(i>0)face(16-i,8+i,i,'f');
  }
  face(3,4,3,'w');face(13,4,2,'w');
  const tile=(x,y,ink,mark)=>{
    face(x+1,y,2,ink);face(x,y+1,3,ink);face(x,y+2,3,ink);
    face(x+1,y+1,1,mark);
  };
  tile(3,7,'o','r');tile(8,7,'g','d');tile(12,7,'w','v');
  tile(3,12,'v','w');tile(8,12,'u','d');
  face(3,16,12,'d');face(3,17,12,'d');face(4,17,2,'g');face(8,17,2,'o');face(12,17,2,'r');
  face(6,19,5,'w');face(5,22,6,'h');face(13,21,2,'b');
  const runs=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;){
    const start=x,ink=cells[y*width+x++];
    while(x<width && cells[y*width+x]===ink)x++;
    if(ink)(runs[ink]??=[]).push(start+left,y+top,x-start);
  }
  return runs;
}
const sprite=handset();

export function drawRoomPhone(ctx,spot,{night=0,selected=false}={}){
  const {x,y,size}=spot,tones=inks(night);
  function rect(dx,dy,w,h){
    const a=Math.round(x+dx*size),b=Math.round(y+dy*size);
    ctx.fillRect(a,b,Math.round(x+(dx+w)*size)-a,Math.round(y+(dy+h)*size)-b);
  }
  ctx.save();
  ctx.fillStyle='rgba(61,47,46,.22)';rect(-9,0,19,1);rect(-5,1,12,1);
  if(selected)drawSelectionContour(ctx,sprite,{x,y,size});
  sprite.forEach((rows,ink)=>{
    ctx.fillStyle=tones[ink];
    for(let i=0;i<rows.length;i+=3)rect(rows[i],rows[i+1],rows[i+2],1);
  });
  ctx.restore();
}
