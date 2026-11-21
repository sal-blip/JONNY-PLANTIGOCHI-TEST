import React from 'react';

// Original pixel art for the pale treatment liquid, black dropper and green mascot.
const colors = {
  k:'#273139', d:'#3a464b', u:'#617174', l:'#94a2a0',
  g:'#446b64', m:'#75a394', f:'#bbd6bc', h:'#e3f0d7', w:'#f4f5dc',
  a:'#c1aa6b', y:'#e6d795', p:'#f2e8b7', c:'#fff1c9',
  b:'#195646', v:'#2e8751', n:'#69b85e', z:'#a5da74',
  i:'#374952', t:'#84a4aa', e:'#d0e6db', s:'#886b6c', o:'#c8a69b',
};

function bitmap(rows) {
  const layers={};
  for(let y=0;y<rows.length;y++){
    for(const run of rows[y].matchAll(/([a-z])\1*/g)){
      const symbol=run[1],width=run[0].length;
      layers[symbol]=(layers[symbol] || '')+`M${run.index} ${y}h${width}v1h-${width}z`;
    }
  }
  return Object.entries(layers);
}

function Stamp({art,x=0,y=0}){
  return <g transform={`translate(${x} ${y})`}>
    {art.map(([tone,path])=><path key={tone} fill={colors[tone]} d={path}/>)}
  </g>;
}

const mascot=bitmap([
  '.........bb......',
  '.......bnzb..bb..',
  '.....bbbzzbbnnb..',
  '...bbnnnnnnbbb...',
  '..bnnzzzvvnvbb...',
  '..bnzznnnvnvbbbbb',
  '.kkkkkkkkkkk.bvnb',
  '.kdwwdkwwdkk..bbb',
  '.kkwkkkkwkkk.....',
  '..bnnvvnnvvb.....',
  '...bnnbbvvb......',
  '....bbvvbb.......',
]);
const openBottle=bitmap([
  '....ggggg....',
  '....ghmgg....',
  '..gghhhhggg..',
  '.ghwyppppfmg.',
  '.gccccccccag.',
  '.gccnnnvccag.',
  '.gcnkkkkncag.',
  '.gcnwkwwncag.',
  '.gccvvnvccag.',
  '.gccccccccag.',
  '.ghppyyyyfmg.',
  '.gfhppppfmmg.',
  '..ggggggggg..',
]);
// The pipette is drawn on its own diagonal grid so the glass tip stays square-edged.
const pipette=bitmap([
  '..kkkk............',
  '.kuddkk...........',
  'kuddddk...........',
  'kdddddk...........',
  '.kdddkk...........',
  '..kkkdk...........',
  '....kukk..........',
  '.....kdukk........',
  '......kddkg.......',
  '.......kkghg......',
  '.........gwhg.....',
  '..........gpg.....',
  '...........gpg....',
  '............gyg...',
  '.............gg...',
]);
const bug=bitmap(['.tt..t.','teette.','..ikki.','..kik.k','.i.i...']);
const fungus=bitmap(['.....ss..','..e.socs.','.ewseo...','oweoow.e.','.soesoeso']);
const drop=bitmap(['..a..','..y..','.aya.','awpya','.aaa.']);

// Hand-lettered label, including the two lines of the product name at large scale.
const letters={G:['111','100','101','101','111'],N:['1001','1101','1101','1011','1001'],A:['010','101','111','101','101'],
  T:['111','010','010','010','010'],S:['111','100','111','001','111'],I:['1','1','1','1','1'],'-':['00','00','11','00','00']};
function lettering(text) {
  return bitmap(Array.from({length:5},(_,y)=>
    [...text].map(ch=>letters[ch][y].replaceAll('1','k').replaceAll('0','.')).join('.')));
}
const title=lettering('G-NAT'), subtitle=lettering('ASSASSIN');

function BottleDrawing(){
  return <g>
    <path fill={colors.k} d="M15 1h6v1h2v2h1v5h-1v3h-1v2h-8v-2h-1V9h-1V4h1V2h2z"/>
    <path fill={colors.d} d="M15 3h5v1h2v5h-1v3h-6v-2h-1V4h1z"/>
    <path fill={colors.u} d="M15 4h2v1h-1v4h-1z"/>
    <path fill={colors.k} d="M11 13h14v1h2v5H9v-5h2z"/>
    <path fill={colors.u} d="M11 14h14v1H11z M11 16h1v2h-1z M14 16h1v2h-1z M17 16h1v2h-1z M20 16h1v2h-1z M23 16h1v2h-1z"/>
    <path fill={colors.g} d="M12 19h12v2h2v1h3v1h3v2h2v29h-1v2h-2v1H5v-1H3v-2H2V25h2v-2h3v-1h3v-1h2z"/>
    <path fill={colors.m} d="M13 19h10v3h3v1h4v2h2v28h-2v2H6v-1H4V26h1v-2h3v-1h4v-1h1z"/>
    <path fill={colors.h} d="M13 20h7v2h4v2h5v2H6v-1h3v-2h4z"/>
    <path fill={colors.y} d="M5 26h25v27h-2v1H7v-1H5z"/>
    <path fill={colors.p} d="M7 26h17v27H7z"/>
    <path fill={colors.w} d="M5 26h2v25H5z M13 20h6v1h-6z M8 24h4v1H8z"/>
    <path fill={colors.a} d="M3 29h30v22H3z"/>
    <path fill={colors.c} d="M4 29h27v21H4z"/>
    <Stamp art={title} x={9} y={29}/>
    <Stamp art={mascot} x={9} y={34}/>
    <Stamp art={subtitle} x={3} y={46}/>
    <path fill={colors.f} d="M5 53h3v1h20v1H6v-1H5z"/>
  </g>;
}

export function GnatBottle({className='', ...props}) {
  return <svg viewBox="0 0 36 58" xmlns="http://www.w3.org/2000/svg" className={`gnat-bottle ${className}`}
    role="img" aria-label="G-NAT ASSASSIN bottle, with a black dropper, pale liquid and masked green mascot"
    shapeRendering="crispEdges" {...props}><BottleDrawing/></svg>;
}

const hoverPoints=[[8,3], [52,29], [4,23], [61,2], [44,12]];
const hoverCount=[0,2,3,5];
export const outbreakLabels=['','light fungus gnat outbreak','moderate fungus gnat outbreak','severe fungus gnat outbreak, visibly drooping'];

export function outbreakLevel(severity) {
  if(Number.isInteger(severity))return Math.max(0,Math.min(3,severity));
  return Math.max(0, ['none','light','moderate','severe'].indexOf(severity));
}

function Swarm({severity,scattering=false}){
  return <g aria-hidden="true" className={scattering?'gnat-scatter':'gnat-swarm'}>
    {hoverPoints.slice(0,hoverCount[severity]).map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}>
      <g className={`gnat-flight gnat-flight-${i}`} style={{'--gnat-dx':(x<36?-12:11)+'px','--gnat-dy':(i%2?-7:-10)+'px'}}>
        <g transform={x<36?"translate(7 0) scale(-1 1)":undefined}><Stamp art={bug}/></g>
      </g>
    </g>)}
  </g>;
}

function Fungus({severity}){
  return <g aria-hidden="true">
      <Stamp art={fungus} x={24} y={22}/>
      {severity>1 && <Stamp art={fungus} x={40} y={22}/>}
      {severity>2 && <path fill="#d0e3c9" d="M32 25h4v1h3v-1h3v2h-6v-1h-4z M24 25h2v2h-2z"/>}
  </g>;
}

export function OutbreakArt({severity}){
  return <>
    <Fungus severity={severity}/>
    <Swarm severity={severity}/>
  </>;
}

export function BottlePreview(){
  return <g transform="translate(1 5) scale(.55)"><BottleDrawing/></g>;
}

export function GnatDose({severity}){
  return <g className="gnat-treatment" data-effect="gnatCure" aria-hidden="true">
    <g className="gnat-dosing-fungus"><Fungus severity={Math.max(1,severity)}/></g>
    <Stamp art={openBottle} x={5} y={25}/>
    <g className="gnat-pipette"><Stamp art={pipette} x={15} y={0}/></g>
    <g className="gnat-dose-drop"><Stamp art={drop} x={28} y={15}/></g>
    <g className="gnat-clean-soil">
      <path fill="#efcc6a" d="M25 19h1v2h2v1h-2v2h-1v-2h-2v-1h2z M44 19h1v1h1v1h-1v1h-1v-1h-1v-1h1z"/>
      <path fill="#a4c79a" d="M29 25h2v-1h3v1h-1v1h-4z M39 25h3v1h-3z"/>
    </g>
    <g className="gnat-escape-marks" fill="#6b8990"><path d="M9 10h2v1H9z M6 8h2v1H6z M63 9h2V8h2v1h-2v1h-2z"/></g>
    <Swarm severity={Math.max(2,severity)} scattering/>
  </g>;
}
