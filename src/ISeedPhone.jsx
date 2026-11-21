import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ChevronLeft,Flower2} from 'lucide-react';
import {CoinBalance} from './GardenShop.jsx';
import './ISeedPhone.css';

const apps=[
  {id:'plantigochi',label:'Plantigochi'},
  {id:'shop',label:'Shop'},
  {id:'inventory',label:'Inventory'},
  {id:'journal',label:'Journal'},
  {id:'library',label:'Care library'},
  {id:'postcard',label:'Postcard'},
];

// Transparent pixel sprites, drawn at the resolution of the room’s furnishings.
const colors={
  k:'#433f38',b:'#75523d',m:'#aa7952',o:'#d3a369',y:'#efd091',i:'#fff0ca',
  r:'#a9584b',p:'#d87f68',l:'#eeab86',g:'#46694e',v:'#719166',s:'#aac588',
  t:'#446c70',a:'#75a4a0',u:'#b5d5bb',q:'#7c6373',h:'#b497a4',w:'#faf6df',
};
const sprites={
  plantigochi:[
    '    kk                ',
    '  kkukkk  gggg        ',
    ' ku  ku kggsssggg     ',
    ' ku  ku gsisssssvg    ',
    '  kkkukkssiissgvvvg   ',
    '   ukksssisssgg gvg   ',
    '  gsssssvvvvvvvvvvg   ',
    ' gsssvggkkkkkkggvvvg  ',
    'gsivggkkauuuuukgggvvg ',
    'gssvgkauuiuuuuakgvvvg ',
    'gvgvgkauuuuuuuakgvvg  ',
    'g gg gautggssuakgvg   ',
    ' gggvkausvvvsuakgvg   ',
    ' gvvvkaauvvuuuakgvg   ',
    '  ggvggkkuuuukkggg    ',
    '   gvgvvggkkkggvvg    ',
    '    gvvoovuugssvg     ',
    '    gvvoovuugsssg     ',
    '      gvvvvvvvvg      ',
    '        gggggvg       ',
    '            gg        ',
  ],
  postcard:[
    '                      ',
    '                      ',
    '   kkkkkkkkkkkkkkk    ',
    '   kiiiiiiiiiiiiiik   ',
    '   kiaaaaaaaaaaaayk   ',
    '   kiaaaaaaayiaaayk   ',
    '   kiauauaaaiiaaayk   ',
    '   kiaaaavvaaavaayk   ',
    '   kiaaavgsvavvvayk   ',
    '   kiavvvggvvvgvvykk  ',
    '   kivgggggsvggvvyik  ',
    '   kissssggvgggvvyik  ',
    '   kiuuasssssgsssyik  ',
    '   kiiiiiiiiiiiiiimk  ',
    '   kyyyyyyyyyyyyyyok  ',
    '    kbbbbbbbbbbbbbbk  ',
  ],
  shop:[
    '     kkkkkkkkkkkk     ',
    '    kpppiiippiiipk    ',
    '    kplliiipliiilk    ',
    '   kppliiiipliiiipk   ',
    '   kpppiiipppliiipk   ',
    '  krppliiipppliiippk  ',
    ' krpppliippppliiippkk ',
    ' krppkrrrkrrrkrrrkrkk ',
    '  kkk kkk kkk kkk kk  ',
    '   bm             mb  ',
    '   bm    s  g     mb  ',
    '   bm   vsvvg  iy mb  ',
    '   bm    gg    yo mb  ',
    '   bm   pooo   yy mb  ',
    '  kyyyyyyyyyyyyyyyyk  ',
    '  kmmommmmmmmmmommmk  ',
    '   bmooooiooioooomb   ',
    '   bmoooyyyyyoooomb   ',
    '   bmmmmmmmmmmmmmmb   ',
    '  kbbbbbbbbbbbbbbbbk  ',
  ],
  inventory:[
    '         kkkk         ',
    '      kkkooookkk      ',
    '   kkkiiiyyyyiookkk   ',
    '  kiooooooiiooooooyk  ',
    ' kiooooobbkkbbooooyyk ',
    ' kyookbbmmmmmbbkooyyk ',
    '  kokbmmmooooommbkok  ',
    ' kyykkbbbbbbbbbbkkoyk ',
    'kyiiykkmmmmmmmmkkyooyk',
    ' kyyiiykkmmmmkkyoooyk ',
    '  koyiiyyykkyooooook  ',
    '  kmkoyiiykkoyoookmk  ',
    '  komkkoyokkookkmmmk  ',
    '  kmommkkbkkbkmmoomk  ',
    '  kmommmmmkkmmoioomk  ',
    '   kmmoommkkmmoiomk   ',
    '     kkmomkkmmomkk    ',
    '       kkmkkkmkk      ',
    '         kkkk         ',
  ],
  journal:[
    '     kkkkkkkkkkkk     ',
    '    kbrrrrrrrrrpkk    ',
    '   kbprrppppppppkik   ',
    '   kbprrrrrrrrrpkyk   ',
    '   kbprrriiirrrpkyk   ',
    '   kbprriysirrrpkyk   ',
    '   kbprriygsirrpkik   ',
    '   kbprrrigysirpkyk   ',
    '   kbprrrrigyirpkyk   ',
    '   kbprrrrgirrrpkyk   ',
    '   kbprrrrrrrrrpkyk   ',
    '   kbprrrrrrrrrpkyk   ',
    '   kbpplppppppppkyk   ',
    '   kbrrrrrrrrrrrkiik  ',
    '    kkkkkkkkkkkkiiyk  ',
    '    kiiiiiiiiiiiyyk   ',
    '    kyyyrrryyyyyybk   ',
    '     kkkkrprkkkkkk    ',
    '         r r          ',
  ],
  library:[
    '              gv      ',
    '          vsg gsg     ',
    '           gvgg       ',
    '         kkggkg       ',
    '    kkk  kaaik  kk    ',
    '   kriik kaauk kvsk   ',
    '   kpppk kaatk kvssk  ',
    '   krppk ktttk  kvgk  ',
    '   krrpk kaatk  kvgsk ',
    '   kripk kaauk  kvsgk ',
    '   kriik ktttk  kgsik ',
    '   krrpk ktttk   kvsk ',
    '   krrpk kaatk   kvsgk',
    '   krrrk kaatk   kvgvk',
    '   kriik kaiik   kviik',
    '   krrrk ktttk    kggk',
    '  kkkkkkkkkkkkkkkkkkkk',
    '  kyooooooooooooooook ',
    '   kbbbbbbbbbbbbbbbk  ',
  ],
};

function AppIcon({id}){
  const canvas=useRef(null);
  useEffect(()=>{
    const ctx=canvas.current.getContext('2d');
    if(!ctx)return;
    ctx.clearRect(0,0,24,24);
    const rows=sprites[id],top=Math.floor((24-rows.length)/2);
    rows.forEach((row,y)=>{
      [...row].forEach((pixel,x)=>{
        if(colors[pixel]){ctx.fillStyle=colors[pixel];ctx.fillRect(x+1,y+top,1,1);}
      });
    });
  },[id]);
  return <canvas className="iseed-app-icon" width="24" height="24" ref={canvas} aria-hidden="true"/>;
}

const dateLabel=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric'});
const clockLabel=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'});

function usePhoneTime(){
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{
    let timer;
    function sync(){
      clearTimeout(timer);
      const current=new Date();
      setNow(current);
      timer=setTimeout(sync,60000-current.getSeconds()*1000-current.getMilliseconds()+40);
    }
    function refresh(){if(document.hidden)clearTimeout(timer);else sync();}
    refresh();document.addEventListener('visibilitychange',refresh);
    return ()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',refresh);};
  },[]);
  return now;
}

// These layers are drawn on a small logical screen, just like the room itself.
// Each outline follows whole pixels when the handset grows to phone size.
const nightColors=['#688a91','#779395','#91aaa1','#d9dcc0','#617b78','#516f65','#3f6257','#456552','#697e60'];
const dayColors=['#b4d7ca','#c8ddc1','#e5e6c7','#f9e9ae','#a4bfaa','#91b29b','#769c83','#60856f','#a6ba8b'];

function paintLandscape(canvas,night){
  const rect=canvas.getBoundingClientRect();
  const width=rect.height?Math.max(1,Math.min(1024,Math.round(194*rect.width/rect.height))):142;
  if(canvas.width!==width)canvas.width=width;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const axis=x=>Math.round(x*width/142);
  const [sky,haze,cloud,sun,far,middle,near,grass,lawn]=night?nightColors:dayColors;
  const paint=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  const fill=(color,x,y,w,h)=>paint(color,axis(x),y,axis(x+w)-axis(x),h);
  function ridge(points,color){
    for(let i=1;i<points.length;i++){
      const [ax,ay]=points[i-1],[bx,by]=points[i];
      const left=axis(ax),right=axis(bx);
      for(let x=left;x<right;x++){
        const y=Math.round(ay+(by-ay)*(x-left)/(right-left));
        paint(color,x,y,1,194-y);
      }
    }
  }
  function pine(x,y,height,color){
    const half=Math.floor(height*.3);
    for(let n=0;n<3;n++){
      const base=Math.round(y+height*(.36+n*.22)),top=Math.round(y+height*n*.19);
      for(let row=top;row<=base;row++){
        const spread=Math.round((row-top)/(base-top)*half*(.55+n*.23));
        paint(color,axis(x)-spread,row,spread*2+1,1);
      }
    }
    paint(color,axis(x)-1,y+height-3,2,5);
  }
  fill(sky,0,0,142,194);fill(haze,0,77,142,117);
  for(const [x,y,w] of [[8,62,20],[18,60,8],[83,48,20],[95,46,5],[116,70,19],[20,87,25]]){
    fill(cloud,x,y,w,1);
  }
  for(let y=-7;y<=7;y++){
    const w=Math.floor(Math.sqrt(55-y*y));
    paint(sun,axis(110)-w,57+y,w*2+1,1);
  }
  if(night)for(let y=-6;y<=4;y++){
    const w=Math.floor(Math.sqrt(39-y*y));
    paint(sky,axis(113)-w,56+y,w*2+1,1);
  }
  ridge([[0,122],[18,113],[36,117],[65,103],[84,109],[103,100],[125,105],[142,98]],far);
  ridge([[0,137],[20,134],[45,124],[66,129],[95,118],[118,126],[142,118]],middle);
  ridge([[0,153],[19,148],[40,153],[68,142],[98,145],[123,135],[142,136]],near);
  for(const [x,y,h] of [[-1,122,28],[7,130,19],[17,136,13],[111,137,9],[120,130,16],[132,124,21],[141,117,27]])pine(x,y,h,near);
  ridge([[0,169],[24,164],[46,169],[69,160],[91,158],[112,164],[142,152]],grass);
  for(const [x,y,w] of [[9,172,13],[25,174,4],[57,177,19],[85,169,9],[116,164,11],[103,177,4]])fill(lawn,x,y,w,1);
}
function ScreenLandscape({night}){
  const ref=useRef(null);
  useLayoutEffect(()=>{
    const canvas=ref.current;
    const repaint=()=>paintLandscape(canvas,night);
    repaint();
    if(typeof ResizeObserver!=='function')return;
    const observer=new ResizeObserver(repaint);
    observer.observe(canvas);
    return ()=>observer.disconnect();
  },[night]);
  return <canvas className="iseed-landscape" width={142} height={194} ref={ref} aria-hidden="true"/>;
}

export function ISeedHome({plant,open,busy=false}){
  const now=usePhoneTime();
  const night=now.getHours()<6 || now.getHours()>=19;
  return <div className={'iseed-home'+(night?' is-night':'')} data-phone-wallpaper="" data-handset-pull="">
    <ScreenLandscape night={night}/>
    <div className="iseed-home-clock"><time dateTime={now.toISOString()}>{clockLabel.format(now)}</time><span>{dateLabel.format(now)}</span></div>
    <nav className="iseed-launcher" aria-label="iSEED apps">
      {apps.map(app=><button type="button" key={app.id} className={'iseed-app app-'+app.id} data-handset-no-pull="" disabled={busy} onClick={()=>open(app.id)}>
        <span className="iseed-icon-tile"><AppIcon id={app.id}/></span><span>{app.label}</span>
      </button>)}
    </nav>
    <div className="iseed-dock">
      <CoinBalance plant={plant}/>

    </div>
  </div>;
}

function SmallClock(){
  const now=usePhoneTime();
  return <time className="iseed-small-time" dateTime={now.toISOString()}>{clockLabel.format(now)}</time>;
}

export default function ISeedPhone({page,title,back,home,lower,locked=false,corner,pocket,children}){
  const atHome=page==='phone' || page==='home',atToy=page==='plantigochi';
  const pane=useRef(null),heading=useRef(null),lastPage=useRef(page);
  useLayoutEffect(()=>{
    if(atToy || lastPage.current===page)return;
    lastPage.current=page;
    if(pane.current)pane.current.scrollTop=0;
    if(!locked)heading.current?.focus({preventScroll:true});
  },[page,atToy,locked]);

  return <section className="iseed-handset" aria-label="iSEED handset" data-handset-no-pull={locked?'':undefined}>
    <button type="button" className="iseed-bezel" data-phone-bezel="" data-handset-pull="" aria-label="Put down iSEED" onClick={lower} disabled={locked}>
      <span className="iseed-earpiece" aria-hidden="true"><i/><b/><i/></span>
    </button>
    <div className={'iseed-screen'+(atHome?' is-home':atToy?' is-toy':'')}>
      {!atToy && <header className="iseed-header">
        {atHome?<button type="button" className="iseed-open-garden" onClick={lower} disabled={locked}
          aria-label="Open garden" title="Open garden" data-handset-no-pull=""><Flower2 aria-hidden="true"/><span>Garden</span></button>:
          back && <button type="button" className="iseed-back" aria-label="Back" onClick={back} disabled={locked} data-handset-no-pull=""><ChevronLeft aria-hidden="true"/></button>}
        <h1 ref={heading} tabIndex="-1">{atHome?'iSEED':title}</h1>
        {!atHome && <SmallClock/>}
      </header>}
      <div className="iseed-pocket-pane" hidden={!atToy} inert={!atToy?'':undefined} aria-hidden={!atToy || undefined}
        data-phone-page={atToy?'plantigochi':undefined}>{pocket}</div>
      <div ref={pane} className={'iseed-contents'+(atHome?' is-launcher':'')} hidden={atToy} inert={atToy?'':undefined}
        aria-hidden={atToy || undefined} data-phone-page={atToy?undefined:page}
        data-phone-scroll={atHome || atToy?undefined:''} data-handset-scroll={atHome || atToy?undefined:''}>{children}</div>
      {!atToy && <div className="iseed-pixels" aria-hidden="true"/>}
      {corner && <div className="iseed-corner" data-handset-no-pull="">{corner}</div>}
    </div>
    <footer className="iseed-chin">
      <span className="iseed-hardware-brand" aria-hidden="true">iSEED</span>
      <button type="button" className="iseed-home-key" aria-label="iSEED Home" title="iSEED Home"
        data-handset-no-pull="" data-handset-focus="" onClick={home} disabled={locked}>
        <span aria-hidden="true"><i/></span>
      </button>
    </footer>
  </section>;
}
