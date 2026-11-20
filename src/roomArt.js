// Native pixels are shared by the in-game room and the exported postcard.
export const ROOM_WIDTH = 256;
export const ROOM_HEIGHT = 288;

const pots = [
  {x:41,y:115,size:.85}, {x:112,y:115,size:.88},
  {x:184,y:76,size:.78}, {x:220,y:123,size:.78},
  {x:23,y:231,size:1.12}, {x:219,y:244,size:1.24},
];
export const roomPots = pots.map(({x,y,size})=>({x:x/ROOM_WIDTH,y:(y-7*size)/ROOM_HEIGHT}));

const mix = (a,b,t) => a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const css = values => `rgb(${values.join(',')})`;
const clamp = v => Math.max(0,Math.min(1,v));
const phases = [
  // Hour, daylight, golden light, top sky, horizon, distant hill, cloud.
  [0,.05,.04,'#243052','#586781','#495977','#727a99'],
  [4.5,.08,.08,'#303859','#84738c','#696888','#9e8b9e'],
  [6,.54,.72,'#a29cba','#ffc595','#ae8b91','#f8cfbd'],
  [8,.91,.38,'#8cbcc5','#f4dfa9','#9cabad','#f8e5c2'],
  [11,1,.1,'#70b4c6','#d9e9d6','#92a8a2','#f2f1d7'],
  [15.25,.99,.18,'#79b5c2','#eadfb2','#9aa69c','#f8e9c9'],
  [17.5,.78,.61,'#9aa4b2','#f6cf92','#b29890','#ffe3b4'],
  [19,.39,1,'#947d9c','#f9b084','#a98186','#efbfa5'],
  [20.5,.12,.29,'#46476b','#a0869a','#79758a','#af9cac'],
  [22,.05,.05,'#283455','#606e88','#50617b','#8089a1'],
  [24,.05,.04,'#243052','#586781','#495977','#727a99'],
];
function lightAt(hour) {
  const h=((hour%24)+24)%24;
  const i=phases.findIndex((row,index)=>index>0&&row[0]>=h);
  const a=phases[i-1],b=phases[i],f=(h-a[0])/(b[0]-a[0]);
  const channels=[3,4,5,6].map(i=>mix(rgb(a[i]),rgb(b[i]),f));
  const day=a[1]+(b[1]-a[1])*f, gold=a[2]+(b[2]-a[2])*f;
  const colors=new Map();
  function tone(color) {
    if(!colors.has(color)){
      const base=rgb(color);
      const night=base.map((value,i)=>Math.round(value*[.415,.405,.50][i]+[13,18,26][i]));
      let result=mix(night,base,day);
      result=result.map((v,i)=>Math.round(Math.min(255,v*(1+gold*[.08,-.035,-.13][i])+gold*[3,1,1][i])));
      colors.set(color,css(result));
    }
    return colors.get(color);
  }
  return {day,gold,sky:channels[0],horizon:channels[1],hill:channels[2],cloud:channels[3],tone,h};
}

// All geometry is rasterized on the native pixel grid, including diagonals.
function brush(ctx) {
  function rect(x,y,w,h,color){
    ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  function line(x,y,x2,y2,color,weight=1){
    x=Math.round(x);y=Math.round(y);x2=Math.round(x2);y2=Math.round(y2);
    const dx=Math.abs(x2-x), sx=x<x2?1:-1,dy=-Math.abs(y2-y),sy=y<y2?1:-1;
    let error=dx+dy;
    ctx.fillStyle=color;
    for(;;){
      ctx.fillRect(x,y,weight,weight);
      if(x===x2&&y===y2) break;
      const e=2*error;
      if(e>=dy){error+=dy;x+=sx;}
      if(e<=dx){error+=dx;y+=sy;}
    }
  }
  function poly(points,color) {
    ctx.fillStyle=color;
    const ys=points.map(p=>p[1]);
    for(let y=Math.ceil(Math.min(...ys));y<Math.max(...ys);y++){
      const edges=[];
      for(let i=0,j=points.length-1;i<points.length;j=i++) {
        const [ax,ay]=points[j],[bx,by]=points[i],scan=y+.5;
        if((ay>scan)!==(by>scan)) edges.push(ax+(scan-ay)*(bx-ax)/(by-ay));
      }
      edges.sort((a,b)=>a-b);
      for(let i=0;i+1<edges.length;i+=2){
        const start=Math.ceil(edges[i]-.5),end=Math.ceil(edges[i+1]-.5);
        if(end>start) ctx.fillRect(start,y,end-start,1);
      }
    }
  }
  function oval(x,y,rx,ry,color){
    ctx.fillStyle=color;
    for(let row=-ry;row<=ry;row++){
      const half=Math.round(rx*Math.sqrt(Math.max(0,1-row*row/((ry+.35)**2))));
      ctx.fillRect(Math.round(x-half),Math.round(y+row),2*half+1,1);
    }
  }
  return {rect,line,poly,oval};
}

function material(raw,tone) {
  return Object.fromEntries(Object.entries(raw).map(([name,fn])=>[name,(...args)=>{
    args[args.length-1]=tone(args.at(-1));fn(...args);
  }]));
}

function skyline(raw,left,top,w,h,l) {
  const {rect,line,poly,oval}=raw;
  const sky=css(l.sky),hill=css(l.hill),cloud=css(l.cloud);
  rect(left,top,w,h,sky);
  for(let y=0;y<h;y+=3) rect(left,top+y,w,Math.min(3,h-y),css(mix(l.sky,l.horizon,y/h)));
  if(l.day>.3) {
    const x=left+Math.round(17+(l.h-6)*5.5),y=top+Math.round(20+Math.abs(12.2-l.h)*3);
    const light=css(mix(l.horizon,[255,246,196],.74));
    if(x>left+10&&x<left+w-10){oval(x,y,8,8,css(mix(l.horizon,[255,229,181],.5)));oval(x,y,6,6,light);}
  } else {
    const x=left+Math.round(w*.69),y=top+13;
    poly([[x-4,y-5],[x+1,y-6],[x,y-3],[x,y+1],[x+3,y+3],[x+5,y+3],[x+3,y+5],[x-2,y+5],[x-5,y+2],[x-6,y-2]],'#dedcc1');
    for(const [x,y] of [[7,10],[20,23],[35,8],[47,18],[62,9],[92,11],[103,26],[22,36],[74,30]]) rect(left+x,top+y,1,1,'#c9cbbf');
  }
  function cloudBank(x,y,width) {
    const shape=[[0,3],[.1,3],[.14,1],[.28,1],[.32,0],[.46,0],[.5,-2],[.63,-2],[.69,0],[.77,0],[.82,2],[.94,2],[1,3],[1,4],[0,4]];
    poly(shape.map(([a,b])=>[x+a*width,y+b]),cloud);
    rect(x+3,y+5,Math.round(width*.77),1,css(mix(l.cloud,l.horizon,.35)));
  }
  cloudBank(left+5,top+21,29);cloudBank(left+58,top+30,39);cloudBank(left+86,top+15,17);
  const y=top+h;
  poly([[left,y-21],[left+10,y-23],[left+19,y-21],[left+29,y-27],[left+37,y-25],
    [left+49,y-36],[left+59,y-48],[left+64,y-49],[left+72,y-42],[left+84,y-31],
    [left+96,y-25],[left+w,y-28],[left+w,y],[left,y]],hill);
  poly([[left+50,y-36],[left+59,y-48],[left+64,y-49],[left+73,y-41],[left+76,y-38],
    [left+68,y-41],[left+65,y-42],[left+64,y-40],[left+60,y-44],[left+56,y-40],[left+53,y-40]],css(mix(l.cloud,l.hill,.24)));
  const far=css(mix(l.hill,[57,96,86],.42));
  poly([[left,y-14],[left+8,y-17],[left+20,y-15],[left+27,y-19],[left+36,y-20],[left+44,y-17],
    [left+54,y-18],[left+64,y-25],[left+78,y-27],[left+90,y-23],[left+w,y-25],[left+w,y],[left,y]],far);
  const trees=css(mix(l.hill,[34,79,70],.58)),near=css(mix(l.hill,[44,75,64],.6));
  for(let n=0;n<17;n++){
    const x=left+3+n*7,ht=4+(n*17%9);
    if(x>left+w-5)continue;
    poly([[x-4,y-6],[x-1,y-7-ht*.65],[x-2,y-7-ht*.62],[x,y-9-ht],[x+1,y-7-ht*.62],[x+3,y-6-ht*.65],[x+5,y-6]],trees);
  }
  rect(left,y-6,w,6,near);
  for(const [bx,by,bw] of [[9,10,15],[26,8,11],[80,9,14]]) {
    const x=left+bx;rect(x,y-by,bw,by,css(mix(l.hill,[125,112,99],.60)));
    poly([[x-2,y-by],[x+3,y-by-4],[x+bw-3,y-by-4],[x+bw+2,y-by]],near);
    line(x+3,y-by+2,x+3,y-by+3,l.day<.31?'#e7bf82':far);
  }
}

function roomBackdrop(ctx,l,index) {
  const raw=brush(ctx), m=material(raw,l.tone);
  const {rect:r,poly:p,line:s,oval:o}=m;
  const wall='#e5d8b6', pane='#f0e3c3',walnut='#5e4a40',dark='#503f3b',honey='#bf8d64',lightWood='#d4a078';
  r(0,0,256,288,wall);
  // Hand-plastered wall and subtle vertical paper seams.
  for(let i=0;i<530;i++){
    const x=(i*701+29)%256,y=(i*73+Math.floor(i/17)*11)%181;
    r(x,y,1+(i%9===0),1,i%4===0?'#eaddc0':'#e1d4b2');
  }
  for(const x of [8,143,172,248]) r(x,8,1,164,'#ddcfb0');
  r(0,0,256,4,'#a68c70');r(0,4,256,2,'#eddab5');r(0,6,256,1,'#c9b99b');
  r(0,177,256,8,'#a68d75');r(0,175,256,2,'#e7d8b7');r(0,179,256,2,'#cab290');r(0,184,256,2,walnut);
  // Honey-oak floorboards, staggered mitres and minute grain marks.
  r(0,186,256,102,'#c29673');
  const rows=[186,194,204,216,230,246,266,288];
  for(let i=0;i<rows.length-1;i++){
    const y=rows[i],h=rows[i+1]-y;
    r(0,y,256,h,['#cb9e77','#c49772','#cfa47d'][i%3]);
    r(0,y,256,1,'#a77d61');r(0,y+1,256,1,'#d7ab80');
    for(let k=0;k<3;k++){
      const x=((32+i*53+k*87)%290)-15;
      s(x,y+1,x-3,y+h-1,'#a77d61');s(x+1,y+2,x-2,y+h-2,'#dbaf83');
    }
    for(let k=0;k<11;k++){
      const x=(i*37+k*29)%249,dy=3+(k*11+i)%(h-3);
      r(x,y+dy,3+k%9,1,k%3===0?'#d7ab81':'#be916e');
    }
  }
  // A real shaft of window light stops at the baseboard, then crosses the floor.
  if(l.day>.35){
    ctx.fillStyle=`rgba(255,228,166,${.09+.12*l.gold})`;
    const cast=ctx.fillStyle,offset=Math.round((l.h-12)*3);
    raw.poly([[11,184],[107,184],[176+offset,233],[42+offset,233]],cast);
    raw.poly([[0,215],[6,215],[44+offset,269],[15+offset,269]],cast);
  }
  // Timber casement and full outdoor view, installed within a plaster reveal.
  r(14,17,121,100,'#bda689');r(15,16,118,99,'#f3e7c9');
  r(18,20,110,91,walnut);r(20,21,106,89,lightWood);
  r(22,23,102,85,'#786650');
  ctx.save();ctx.beginPath();ctx.rect(24,25,98,80);ctx.clip();
  skyline(raw,24,25,98,80,l);ctx.restore();
  r(22,104,103,5,'#9c7556');r(23,104,101,2,'#d7b080');
  r(24,24,98,1,'#8a725a');r(24,25,1,79,'#a78c70');
  r(71,24,5,81,walnut);r(72,24,2,81,'#cfa57a');r(75,25,1,79,'#ead1a0');
  r(24,61,98,4,walnut);r(24,61,98,2,'#d0a77b');
  r(68,72,3,2,'#c1a26d');r(68,74,1,5,'#6f5d4b');
  // Side curtains gathered with olive braid, lightly pleated cotton.
  function curtain(x,sign){
    const coords=[[0,0],[16,0],[16,9],[14,16],[13,24],[10,37],[8,48],[6,54],[8,62],[10,76],[11,83],[7,84],[4,82],[1,84],[-1,81]];
    p(coords.map(([a,b])=>[x+a*sign,20+b]),'#968d73');
    p(coords.slice(0,-2).map(([a,b])=>[x+(a-1)*sign,19+b]),'#e4ddbe');
    for(const [a,b,c,d] of [[3,4,3,47],[8,3,5,43],[13,5,8,30],[4,56,5,78],[6,62,7,80]])
      s(x+a*sign,20+b,x+c*sign,20+d,'#c3bda1');
    s(x+2*sign,72,x+7*sign,74,'#a78d68');r(x+5*sign,75,2,3,'#aa9773');
  }
  curtain(15,1);curtain(132,-1);
  r(10,15,128,2,'#624e43');r(12,14,124,1,'#c09f76');r(9,14,3,4,'#8f7054');r(136,14,3,4,'#8f7054');
  r(8,114,132,4,'#694c40');r(9,112,130,3,'#e0b48b');r(13,118,123,3,'#a78164');
  for(const x of [19,125])p([[x,121],[x+6,121],[x,127]],'#a7896e');
  // Small framed woodblock print, its gold sun and two lapis ridges.
  r(206,11,31,34,'#a98e70');r(205,10,31,33,walnut);r(207,12,27,29,'#d2a16f');
  r(208,13,25,27,'#f2dfbb');r(210,15,21,23,['#dbc29e','#ced0a9','#ddbfab'][index%3]);
  o(223,21,3,3,'#cf8169');p([[210,33],[217,25],[220,28],[225,23],[231,31],[231,38],[210,38]],'#779890');
  p([[210,35],[215,32],[220,34],[226,31],[231,33],[231,38],[210,38]],'#567777');
  // Cantilevered wood shelves, bracket shadows, books and hand-thrown ceramics.
  function shelf(x,y,w) {
    r(x+2,y+4,w-1,3,'#bba184');r(x,y,w,5,walnut);r(x,y,w,2,lightWood);r(x+1,y+2,w-2,1,honey);
    for(const k of [5,w-10]){r(x+k,y+5,2,6,'#876e59');s(x+k+2,y+8,x+k+7,y+4,'#a58a6a');}
  }
  shelf(165,76,78);shelf(172,123,71);
  function books(x,y,heights,colors){
    heights.forEach((height,i)=>{
      const w=3+(i*2)%4;
      r(x,y-height,w,height,colors[i%colors.length]);r(x,y-height,1,height,'#695c50');
      if(height>9)r(x+1,y-height+3,w-1,1,'#d7c4a4');x+=w;
    });
  }
  books(205,76,[13,16,12,18,15,16],['#738e85','#b87969','#a68e6e','#626f81']);
  books(175,123,[15,17,17,12,14,11],['#667e71','#b6a27a','#a97862','#7b8284']);
  r(230,70,7,5,'#c3856d');r(231,68,5,2,'#eed1a3');r(232,67,3,1,'#947c60');
  // Low fluted tambour cabinet under the shelves.
  r(171,143,73,34,dark);r(173,145,69,29,'#b58159');
  for(let x=174;x<240;x+=4){r(x,146,2,27,'#936b50');r(x,146,1,27,'#c49368');}
  r(170,141,75,3,'#d0a077');r(172,144,71,1,'#886449');
  r(205,146,2,28,'#765643');r(201,157,2,4,'#e1bd7d');r(210,157,2,4,'#e1bd7d');
  for(const x of [175,236]){r(x,176,4,7,'#71533f');r(x,183,3,1,dark);}
  // Tabletop record player with its open moss-green lid and brass hinge.
  p([[205,130],[230,130],[232,137],[205,137]],'#778b79');r(207,131,21,4,'#94a492');
  r(204,137,29,4,'#805e4b');r(204,137,29,1,'#bd9470');o(217,137,7,1,'#4d5350');r(216,137,2,1,'#deb878');
  s(228,136,225,138,'#d5bb85');
  // Brass floor lamp with a pleated linen shade, warm practical light after dusk.
  if(l.day<.7){
    for(let i=0;i<6;i++){
      raw.oval(154,123,60-i*8,57-i*7,`rgba(255,198,123,${(.7-l.day)*.045})`);
    }
    for(let i=0;i<5;i++){
      raw.oval(154,116,23-3*i,22-3*i,`rgba(255,203,126,${(.7-l.day)*.06})`);
    }
  }
  o(154,189,9,2,'#8a775d');r(153,115,3,73,'#6b614d');r(154,115,1,71,'#c4a46a');
  p([[146,96],[161,96],[168,115],[167,117],[140,117],[139,115]],'#8d7659');
  const shade=l.day>.63?l.tone('#f4d898'):css(mix([255,209,133],[245,222,177],l.day));
  raw.poly([[147,97],[160,97],[166,114],[141,114]],shade);
  for(const x of [146,150,155,160]) s(149+(x-146)*.7,98,x,113,'#ddbc80');
  r(141,114,26,1,'#f1dba4');r(151,95,5,1,'#a99268');r(162,119,1,8,'#a58a60');r(162,127,2,2,'#c9a66e');
  // Aubusson-style woven rug, stepped concentric borders and small lozenges.
  const rug=(x,y,w,h)=>[[x+16,y],[x+w-14,y],[x+w,y+h],[x,y+h]];
  p(rug(19,208,216,67),'#a17e68');p(rug(17,206,216,67),'#b67d66');
  p(rug(21,208,207,61),'#ddae83');p(rug(23,210,202,57),'#a96f61');
  p(rug(27,213,194,50),'#c99174');p(rug(31,216,186,44),'#bb846f');
  for(let i=0;i<22;i++){const x=24+i*9;s(x,272,x-1,275+(i%2),'#d5ae8c');}
  for(let i=0;i<15;i++){
    const x=39+11*i;
    p([[x,214],[x+2,212],[x+4,214],[x+2,216]],'#edd0a3');
    p([[x-5,264],[x-3,262],[x,264],[x-3,266]],'#e5bf96');
  }
  for(let row=0;row<3;row++) for(let i=0;i<9;i++){
    const x=40+i*20+(row%2)*7,y=221+row*15;
    s(x,y,x+3,y-2,'#c99a7e');s(x+3,y-2,x+6,y,'#c99a7e');
  }
  // Wool sofa. Independent cushions and plinth make the low, soft silhouette.
  o(94,204,57,5,'#9f8069');
  const sofa=[['#4f7268','#6e9280','#86a68c','#a4b79a'],['#65727b','#849594','#9dafa3','#b8c4ad'],['#94756b','#b28c7b','#c39e87','#cdb093']][index%3];
  const [deep,mid,soft,stitch]=sofa;
  for(const x of [42,132]){p([[x,194],[x+6,194],[x+3,204],[x,204]],walnut);r(x,203,3,2,dark);}
  p([[29,153],[32,144],[38,141],[132,141],[139,145],[142,152],[143,189],[136,195],[37,195],[29,185]],dark);
  p([[31,153],[33,146],[38,143],[132,143],[137,146],[140,152],[140,179],[33,179]],deep);
  for(const x of [36,87]){
    p([[x,149],[x+3,146],[x+44,146],[x+47,150],[x+47,168],[x+44,172],[x+2,172],[x,169]],mid);
    s(x+3,147,x+43,147,soft);r(x+2,149,1,15,soft);
    s(x+7,167,x+10,169,deep);s(x+42,166,x+39,170,deep);
    r(x+24,158,2,2,deep);r(x+25,160,2,1,soft);
  }
  p([[35,170],[135,170],[140,178],[137,188],[33,188],[30,178]],deep);
  for(const x of [38,86]){
    p([[x+2,171],[x+43,171],[x+47,175],[x+46,180],[x,180],[x-2,176]],soft);
    r(x,179,45,2,mid);s(x+1,172,x+42,172,stitch);
  }
  p([[28,165],[32,162],[37,162],[41,166],[42,184],[133,184],[134,168],[138,164],[145,164],[149,168],[148,188],[143,195],[35,195],[28,188]],deep);
  p([[29,166],[32,164],[37,164],[39,166],[39,184],[35,186],[30,183]],mid);
  p([[136,168],[139,166],[145,166],[147,168],[146,184],[138,188],[135,184]],mid);
  r(32,165,5,1,soft);r(139,167,6,1,soft);r(41,187,92,3,mid);r(38,194,104,3,walnut);r(40,196,99,1,'#a07d5c');
  // Block-printed ochre pillow, terracotta throw and a sleeping cream calico.
  p([[43,150],[46,147],[59,148],[65,160],[61,168],[47,169],[41,161]],'#96774d');
  p([[44,151],[47,149],[58,150],[63,160],[60,166],[48,167],[43,161]],'#d9aa67');
  for(const [x,y] of [[48,154],[55,156],[50,162],[59,162]]) {
    s(x-1,y,x+1,y-2,'#edd499');s(x+1,y-2,x+3,y,'#edd499');
  }
  p([[121,162],[130,160],[135,164],[137,176],[136,188],[126,190],[123,179]],'#bc826d');
  for(const x of [125,129,132])s(x,164,x+2,186,'#d5a188');
  for(let x=126;x<=136;x+=2)r(x,188,1,3-(x%3),'#d9ae90');
  o(98,173,14,3,'#688777');o(99,170,11,5,'#d6b28a');o(96,169,9,5,'#e9d3a8');
  p([[83,167],[84,162],[88,165],[92,163],[92,170],[90,172],[84,172]],'#e7cda0');
  r(85,165,2,2,'#b68763');r(90,165,2,2,'#a7795c');r(84,169,2,1,'#886f59');
  r(86,170,2,1,'#977259');o(99,168,3,2,'#b88c65');s(104,170,108,171,'#b58a66');
  s(108,171,105,173,'#aa7a5a');s(105,173,99,173,'#b58b68');
  // A low oak tea table on splayed legs, with a little stoneware cup and books.
  o(118,239,35,5,'#a47965');
  for(const [x,y,dx] of [[86,222,-3],[143,222,3],[96,224,-2],[139,224,2]]){
    p([[x,y],[x+4,y],[x+4+dx,y+15],[x+dx,y+15]],'#785744');s(x+1,y+3,x+dx+1,y+13,'#b18a65');
  }
  p([[86,212],[137,212],[146,216],[149,220],[147,224],[139,227],[88,227],[80,223],[80,218]],'#735443');
  p([[87,211],[138,211],[146,215],[148,219],[145,222],[139,224],[88,224],[81,221],[81,217]],'#d0a075');
  s(88,212,137,212,'#e0b58a');s(88,224,138,224,'#a77555');s(121,222,136,222,'#bd8a64');
  r(116,213,18,5,'#6b7c72');r(117,213,16,2,'#c9c4a5');r(114,211,17,3,'#b27a68');r(116,211,12,1,'#d8ac87');
  o(98,218,6,1,'#b38869');r(94,213,7,5,'#e2ca9f');r(101,213,3,1,'#bdac8c');r(103,214,1,2,'#bdac8c');r(101,216,2,1,'#bdac8c');
  r(95,213,5,1,'#876a50');r(95,215,1,2,'#f1dfb7');
}

function seedOf(value) {
  let seed=2166136261;
  for(const c of String(value)) seed=Math.imul(seed^c.charCodeAt(0),16777619);
  return seed>>>0;
}

// A cordate blade points from its petiole toward its tip. The fenestrations
// remove actual pixels, revealing the sky, wall or other foliage beneath.
function blade(raw,l,x,y,tipX,tipY,width,colors,seed) {
  const vx=tipX-x,vy=tipY-y,length=Math.hypot(vx,vy),ux=vx/length,uy=vy/length;
  const nx=-uy,ny=ux;
  const tones=colors.map(l.tone);
  const reach=Math.ceil(length+width);
  for(let py=Math.floor(y-reach);py<=y+reach;py++){
    for(let px=Math.floor(x-reach);px<=x+reach;px++){
      const dx=px+.5-x,dy=py+.5-y;
      const s=(dx*ux+dy*uy)/length, cross=dx*nx+dy*ny,side=Math.abs(cross)/width;
      if(s>1 || s<-.16)continue;
      const profile=s<0 ? .76*Math.sqrt(Math.max(0,1-(s/.16)**2)) :
        (s<.22 ? .76+.24*s/.22 : (1-s)**.75*1.21);
      if(side>profile || (s<.02&&side<Math.max(0,(-s+.03)*2.1)))continue;
      const slant=cross>0?.17:.13;
      const split=s-slant*side+(cross>0?.015:(seed%3)*.018);
      if((side>.45 && split>.285 && split<.355) ||
         (side>.47 && split>.55 && split<.595) ||
         (length>=13 && side>.27 && side<.47 && split>.10 && split<.195))continue;
      const vein=Math.abs(cross+.2)<.55&&s<.86;
      const border=profile-side<.14 || s>.9 || s<-.095;
      const branch=side>.12&&side<.71&&((Math.abs(split-.23)<.024)||(Math.abs(split-.45)<.025));
      const tone=vein?tones[3]:border?tones[0]:branch?tones[2]:cross<0?tones[2]:tones[1];
      raw.rect(px,py,1,1,tone);
    }
  }
}

const greens=[
  ['#3a6456','#518469','#7da27a','#a5b680'],
  ['#355b50','#436e5c','#679071','#99ad7c'],
  ['#47694f','#70916a','#8fa97b','#b5c18a'],
  ['#335a50','#477767','#6d987d','#a8ba88'],
];
function monstera(raw,l,pot,plant,slot,amplitude) {
  const {x,y,size}=pot,hash=seedOf(plant.id??`${plant.generation??0}-${slot}`);
  const scale=size*(.95+(hash%12)*.006),rootY=y-14*size;
  const spread=.91+(hash%7)*.023,tilt=((hash>>>5)%7-3)*.45;
  const shift=(a,b)=>[x+(a*spread+tilt*(-b)/32)*scale,rootY+b*scale];
  // Left and right leaves emerge at different heights from the knotted petioles.
  const leaves=[
    [-3,-13,-14,-22,5.4,1],[2,-19,8,-34,6.8,2],[5,-12,18,-19,6.1,0],
    [-4,-11,-18,-11,5.4,0],[-1,-16,-7,-29,5.8,3],[3,-8,13,-5,5.5,1],
  ];
  for(let i=0;i<leaves.length;i++){
    const [ax,ay,bx,by,w,palette]=leaves[i],factor=.83+(i%3)*.09;
    const start=shift(ax+amplitude*factor,ay),tip=shift(bx+amplitude,by);
    const bend=shift(ax*.39,ay*.60);
    raw.line(x,rootY,bend[0],bend[1],l.tone('#536951'));
    raw.line(bend[0],bend[1],start[0],start[1],l.tone(i%2?'#829064':'#607858'));
    blade(raw,l,...start,...tip,w*1.18*scale,greens[(palette+(hash%3===0?1:0))%greens.length],hash+i);
  }
  const curl=shift(1,-19),curlTop=shift(3,-24);
  raw.line(curl[0],curl[1],curlTop[0],curlTop[1],l.tone('#9ca875'));
  raw.rect(curlTop[0],curlTop[1],2,2,l.tone('#b3b77e'));
}

const clay=[
  ['#795e4c','#ba8267','#d6a083','#eac2a0'],
  ['#74614d','#b49869','#d8b783','#eed4a5'],
  ['#526a67','#849f93','#b2c4a7','#d6d8b8'],
  ['#6e5f60','#a58984','#c3aca0','#e2c6af'],
  ['#795543','#b87658','#cf9170','#e8b18b'],
  ['#566c69','#78938b','#a2b2a0','#c7cbb2'],
];
function potArt(raw,l,pot,index) {
  const {x,y,size:q}=pot,colors=clay[index].map(l.tone);
  const potX=a=>x+a*q,potY=a=>y+a*q;
  const cut=(points,color)=>raw.poly(points.map(([a,b])=>[potX(a),potY(b)]),color);
  const stripe=(x1,y1,w,h,c)=>raw.rect(potX(x1),potY(y1),Math.max(1,w*q),Math.max(1,h*q),c);
  const [dark,body,lit,glaze]=colors;
  raw.oval(x+2,y+1,Math.round(12*q),Math.max(1,Math.round(2*q)),l.tone(index<4?'#9b785e':'#a78063'));
  raw.oval(x,y-1,Math.round(10*q),Math.max(1,Math.round(1.6*q)),dark);
  stripe(-8,-2,15,1,lit);
  cut([[-10,-13],[10,-13],[9,-8],[6,-2],[4,0],[-5,0],[-8,-4]],dark);
  cut([[-9,-12],[8,-12],[7,-8],[5,-3],[2,-2],[-5,-2],[-7,-5]],body);
  cut([[-8,-12],[-4,-12],[-3,-4],[-5,-4],[-7,-7]],lit);
  if(index%3===0){
    stripe(-7,-8,13,1,glaze);stripe(-6,-6,11,1,lit);
  } else if(index%3===1){
    for(const k of [-5,-1,3]){stripe(k,-9,1,4,lit);stripe(k+1,-9,1,1,glaze);}
  } else {
    stripe(-5,-8,2,1,glaze);stripe(1,-5,2,1,lit);stripe(4,-9,1,1,glaze);
  }
  raw.oval(x,y-13*q,Math.round(10*q),Math.max(1,Math.round(2.5*q)),dark);
  raw.oval(x,y-14*q,Math.round(10*q),Math.max(1,Math.round(2*q)),lit);
  raw.oval(x,y-14*q,Math.round(8*q),Math.max(1,Math.round(q)),l.tone('#695445'));
  stripe(-5,-14,2,1,l.tone('#987a5d'));stripe(3,-14,1,1,l.tone('#aa8a65'));
  stripe(-7,-12,9,1,glaze);
}

const storage = new WeakMap();
function surface(canvas){
  const result=canvas.ownerDocument?.createElement('canvas')??new OffscreenCanvas(ROOM_WIDTH,ROOM_HEIGHT);
  result.width=ROOM_WIDTH;result.height=ROOM_HEIGHT;
  return result;
}

// An explicitly sized canvas is preserved, so exports can use a large backing
// store. An unsized HTML canvas adopts the native 8:9 composition.
export function drawRoom(canvas, {hour,plants=[],roomIndex=0,time=0,reducedMotion=false}={}) {
  if(!canvas)return;
  if(canvas.hasAttribute && !canvas.hasAttribute('width') && !canvas.hasAttribute('height')){
    canvas.width=ROOM_WIDTH;canvas.height=ROOM_HEIGHT;
  }
  const dest=canvas.getContext('2d');
  if(!dest)return;
  const now=new Date();
  const hourValue=Number.isFinite(hour)?hour:now.getHours()+now.getMinutes()/60;
  const minute=((Math.floor(hourValue*60+.00001)%1440)+1440)%1440;
  const index=Math.max(0,Math.floor(Number(roomIndex)||0));
  let state=storage.get(canvas);
  if(!state) {
    state={back:surface(canvas),scene:surface(canvas)};
    storage.set(canvas,state);
  }
  if(state.minute!==minute || state.index!==index) {
    state.light=lightAt(minute/60);
    roomBackdrop(state.back.getContext('2d'),state.light,index);
    state.minute=minute;state.index=index;state.slots=[];
  }
  const native=state.scene.getContext('2d'),l=state.light,raw=brush(native);
  native.drawImage(state.back,0,0);
  for(let i=0;i<pots.length;i++){
    const plant=plants?.[i],key=plant?String(plant.id??plant.generation??i):null;
    let slot=state.slots[i];
    if(!slot||slot.key!==key){
      slot={key,poses:new Map()};state.slots[i]=slot;
    }
    const wind=plant&&!reducedMotion&&Number.isFinite(time)?Math.round(Math.sin(time*.0015+i*1.43)):0;
    let sprite=slot.poses.get(wind);
    if(!sprite){
      sprite=surface(canvas);sprite.width=64;sprite.height=72;
      const local=brush(sprite.getContext('2d')),p={x:32,y:68,size:pots[i].size};
      potArt(local,l,p,i);
      if(plant)monstera(local,l,p,plant,i,wind*.75);
      slot.poses.set(wind,sprite);
    }
    native.drawImage(sprite,pots[i].x-32,pots[i].y-68);
  }
  if(!reducedMotion && Number.isFinite(time)){
    // A handful of motes caught by the window, or by the reading lamp at night.
    for(let i=0;i<4;i++){
      const phase=(time*.0001+i*.237)%1;
      if(phase<.12||phase>.85)continue;
      const x=(l.day>.35?47:148)+i*5+Math.sin(phase*6.28+i)*2;
      const y=(l.day>.35?122:120)+phase*12+(i%2)*3;
      raw.rect(x,y,1,1,l.day>.35?'rgba(253,235,183,.55)':'rgba(255,211,148,.55)');
    }
  }
  const scale=Math.min(canvas.width/ROOM_WIDTH,canvas.height/ROOM_HEIGHT);
  const w=Math.round(ROOM_WIDTH*scale),h=Math.round(ROOM_HEIGHT*scale);
  dest.save();dest.imageSmoothingEnabled=false;
  dest.fillStyle=l.tone('#d8c7a3');dest.fillRect(0,0,canvas.width,canvas.height);
  dest.drawImage(state.scene,Math.round((canvas.width-w)/2),Math.round((canvas.height-h)/2),w,h);
  dest.restore();
}
