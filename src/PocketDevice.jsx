import {checkpointDewLesson,claimDewGift,GOOD_LUCK_COINS,settleDewLesson} from './firstVisit.js';
import GuideChat,{FirstHint} from './GuideChat.jsx';
import LeafReveal from './LeafReveal.jsx';
import {lifeOf} from './gardenEconomy.js';
import React, {useState,useRef,useEffect,useCallback} from 'react';
import {Cross,ChevronLeft,ChevronRight,Compass,CornerUpLeft,Droplet,Gamepad2,Heart,Sprout} from 'lucide-react';
import SproutCelebration from './SproutCelebration.jsx';
import DeviceShell from './DeviceShell.jsx';
import CareIndicator from './CareIndicator.jsx';
import PlantPixel from './PlantPixel.jsx';
import {DewArt,EchoArt} from './ActivityArt.jsx';
import {toyBranches,toyCards,toyTitles} from './GardenLife.jsx';
import {DEW_CHANCES,LEVELS,gameNames,playText,savePlayedRound,usePocketPlay} from './pocketPlay.js';
import {buyGrowth,care,careStatus,condition,moodOf,FOOD_INTERVAL,LIGHT_INTERVAL,HOUR,healthLabels,discoverFungus,treatFungus,FUNGUS_WINDOW,wake} from './game.js';
import {careIndicators, foodReadout, GROWTH_STEPS, growthReadout, waterReadout} from './plantReadout.js';
import './PocketDevice.css';
import './ToyMenu.css';

const frame=(id,index=0)=>({id,index});
const BACK_HOLD_MS=700;
const parentBranch={boost:'growth',pour:'care',pause:'play',pastAid:'aid'};
const branchIcons={care:Droplet,play:Gamepad2,growth:Sprout,aid:Cross,guide:Compass};

function BranchIcons({active}) {
  return <div className="lcd-branches" aria-hidden="true">
    {Object.keys(toyBranches).map(id=>{
      const Icon=branchIcons[id];
      return <span key={id} data-branch={id} className={id===active?'is-current':undefined}><Icon/></span>;
    })}
  </div>;
}

function Chances({remaining}) {
  return <span className="dew-chances" role="img" aria-label={remaining+' of 3 chances'}>
    {Array.from({length:DEW_CHANCES},(_,i)=><svg key={i} viewBox="0 0 9 11" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M4 1h1v2h1v2h1v1h1v3H7v1H2V9H1V6h1V5h1V3h1z" fill={i<remaining?'currentColor':'none'} stroke="currentColor"/>
    </svg>)}
  </span>;
}

function MenuItem({item}) {
  return <div className="lcd-caption">
    <strong className="lcd-choice">{item.label}</strong>
    {item.hint && <small className="lcd-hint">{item.hint}</small>}
  </div>;
}

function ReadoutMeter({name, label, detail, tone, value, steps=1}) {
  return <div className="lcd-meter" data-tone={tone}>
    <span aria-hidden="true">{name}</span>
    <span className="lcd-meter-track" role="meter" aria-label={name}
      aria-valuemin={0} aria-valuemax={steps} aria-valuenow={value} aria-valuetext={detail}>
      {Array.from({length:steps},(_,i)=>{
        const fraction=Math.max(0,Math.min(1,value-i));
        return <i key={i} aria-hidden="true" style={{'--fill':fraction*100+'%'}}/>;
      })}
    </span>
    <span className="lcd-meter-label" aria-hidden="true">{label}</span>
  </div>;
}

function GameArt({game}) {
  if (game.name==='dew') return <DewArt lane={game.lane} drops={game.drops} result={game.result}/>;
  return <EchoArt beat={game.phase==='watch' && game.lit ? game.sequence[game.index] : game.phase==='won' ? 'heart' : null}/>;
}

export default function PocketDevice({plant,now,plantClock=Date.now,resting,commit,sound,openMove,openBook,careTarget,rename,revealSeed,lesson,finishLesson,routePending,routeError,firstDay,sproutWelcome,dismissSprout,reminder,onFarewellReveal,offerInstallAfterTutorial=false}) {
  const [revealing,setRevealing]=useState(()=>revealSeed && lesson==='water' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{
    if(!revealing)return;
    sound('leaves');
    const timer=setTimeout(()=>setRevealing(false),3400);
    return ()=>clearTimeout(timer);
  },[revealing,sound]);
  const [path,setPath]=useState(()=>plant.tutorial?.step==='boost' && plant.tutorial.blocks>0?[frame('home',2),frame('growth'),frame('boost')]:[]);
  const [closeUp,setCloseUp]=useState(false), [feedback,setFeedback]=useState(null);
  const retreat=useRef(null), held=useRef(null), pressed=useRef(null), speech=useRef(null), heart=useRef(null);
  const backHold=useRef(null), suppressBackClick=useRef(false);
  const lessonDone=useRef(null), priorLesson=useRef(null);
  const screen=path.at(-1), paused=screen?.id==='pause';
  const previous=useRef({id:plant.id,stage:plant.stage,dead:plant.deadAt});
  const serial=useRef(0);
  const react=useCallback((effect,waterFrom,outbreak)=>{
    setFeedback({effect,waterFrom,outbreak,id:++serial.current});
    clearTimeout(speech.current);speech.current=setTimeout(()=>setFeedback(null),2500);
  },[]);
  useEffect(()=>{
    const last=previous.current;
    if(last.id!==plant.id){setPath([]);react('replant');}
    else if(last.dead===null && plant.deadAt!==null){setPath([]);react('death');}
    else if(last.stage!==plant.stage){
      if(plant.sproutDebut===plant.id)setPath([]);
      react('growth');
    }
    previous.current={id:plant.id,stage:plant.stage,dead:plant.deadAt};
  },[plant.id,plant.stage,plant.deadAt,plant.sproutDebut,react]);
  const [failedRound,setFailedRound]=useState(null);
  const recordRound=useCallback((name,phase,level,receipt,startedAt,time,practiceRound=false)=>{
    const id=plant.id;
    setFailedRound(null);
    void commit(p=>p.id===id?savePlayedRound(p,name,phase,level,receipt,startedAt,time,practiceRound,plantClock===Date.now?time:plantClock()):p).then(saved=>{
      if(!saved && practiceRound)setFailedRound([name,phase,level,receipt,startedAt,time,true]);
    });
    react(phase==='won'?'gameWin':'gameLoss');
  },[commit,plant.id,react,plantClock]);
  const activity=usePocketPlay(plant,!resting || paused,recordRound);
  useEffect(()=>{
    if(!careTarget)return;
    activity.exit();
    setFeedback(null);
    if(careTarget.action==='home'){setPath([]);return;}
    setPath([frame('home'),frame(careTarget.action==='fungus'?(careTarget.stale?'pastAid':'aid'):'care',careTarget.action==='drain'?4:0)]);
  },[careTarget,activity.exit]);
  const gameOwner=useRef(plant.id);
  useEffect(()=>{
    if (gameOwner.current!==plant.id) {activity.exit();gameOwner.current=plant.id;}
  },[plant.id,activity.exit]);
  const sproutAnswerPending=useRef(false);
  const [answeringSprout,setAnsweringSprout]=useState(false);
  async function answerSprout(play){
    if(sproutAnswerPending.current || reminder?.busy)return;
    sproutAnswerPending.current=true;
    setAnsweringSprout(true);
    try{
      await dismissSprout(play);
    }finally{
      sproutAnswerPending.current=false;
      setAnsweringSprout(false);
    }
  }
  const game=activity.game, lost=game?.phase==='lost', playing=game && !paused;
  const dewLesson=plant.dewLesson;
  const [lessonError,setLessonError]=useState('');
  const finishButton=useRef(null);
  const terminal=game?.lesson && (game.phase==='won' || game.phase==='lost');
  const summary=Boolean(dewLesson && dewLesson.status!=='round' && !game);
  useEffect(()=>{
    if(!resting || dewLesson?.status!=='round')return;
    if(plant.deadAt!==null || plant.stage==='seed'){
      void commit(p=>settleDewLesson(p,'skipped'));return;
    }
    if(!game){
      setPath([]);activity.resumeDewLesson(dewLesson);
    }
  },[resting,dewLesson,game?.name,plant.id,plant.stage,plant.deadAt,commit,activity.resumeDewLesson]);
  useEffect(()=>{
    if(!game?.lesson || game.phase!=='fall')return;
    const {count,chances,startedAt}=game;
    void commit(p=>checkpointDewLesson(p,{count,chances,startedAt}));
  },[game?.lesson,game?.phase,game?.count,game?.chances,game?.startedAt,commit]);
  useEffect(()=>{
    if(!game?.lesson || dewLesson?.status==='round')return;
    const close=()=>{activity.exit();setPath([]);setCloseUp(false);};
    if(!terminal || !resting){close();return;}
    const timer=setTimeout(close,1400);
    return ()=>clearTimeout(timer);
  },[game?.lesson,terminal,dewLesson?.status,resting,activity.exit]);
  useEffect(()=>{
    if(resting && summary){setPath([]);setCloseUp(false);}
  },[resting,summary]);
  async function finishDewLesson(){
    if(sproutAnswerPending.current)return;
    sproutAnswerPending.current=true;setAnsweringSprout(true);setLessonError('');
    try{
      if(await commit(p=>claimDewGift(p,offerInstallAfterTutorial))){setPath([]);heart.current?.focus({preventScroll:true});}
      else setLessonError('Your gift is still here. Please try again.');
    }finally{
      sproutAnswerPending.current=false;setAnsweringSprout(false);
    }
  }
  const section=screen?.id;
  const browsing=Boolean(section && !playing);
  const soil=condition(plant,now);
  const careCues=careIndicators(plant,now);
  const displayMood=soil==='dry' || soil==='critical'?'sad':moodOf(plant,now);
  const mood=soil==='healthy'?displayMood:healthLabels[soil];
  const cards=browsing?toyCards(section,plant,now):[];
  const index=Math.min(screen?.index??0,cards.length-1), choice=cards[index];
  const branch=browsing?(section==='home'?choice.command:parentBranch[section]??section):undefined;
  let title=plant.name || 'Monstera';
  if (browsing) title=parentBranch[section]?toyTitles[branch]+' · '+toyTitles[section]:toyTitles[section];
  else if(game?.lesson)title='Dew Catch · Practice';
  else if (lost) title='Three misses';
  else if (game) title=game.name==='dew'?'Dew Catch '+game.level+'/'+LEVELS:gameNames.echo;
  const ready=playing && game.phase==='ready';
  const ageHours=Math.max(0,Math.floor((now-plant.plantedAt)/HOUR));
  const ageText=(ageHours>=24?Math.floor(ageHours/24)+'d ':'')+(ageHours%24)+'h';
  const sick=plant.deadAt===null && plant.fungusAt!=null;
  const severity=sick?Math.min(3,1+Math.floor(Math.max(0,now-plant.fungusAt)/(4*HOUR))):0;
  const fungusTime=sick?Math.max(1,Math.ceil((plant.fungusAt+FUNGUS_WINDOW-now)/60000)):0;
  const minutesLabel=fungusTime>=60?Math.floor(fungusTime/60)+'h '+fungusTime%60+'m':fungusTime+'m';
  const canDiscover=resting && !section && !game && !lesson && !sick && plant.deadAt===null &&
    plant.outbreakDue!=null && now>=plant.outbreakDue && soil!=='critical' && soil!=='rootRot';
  const discovery=useRef(false);
  discovery.current=canDiscover;
  useEffect(()=>{
    if(canDiscover && !document.hidden)void commit(p=>discovery.current && !document.hidden && p.id===plant.id?discoverFungus(p,plantClock()):p);
  },[canDiscover,plant.id,commit,now,plantClock]);
  const showMeters=!browsing && !game && plant.deadAt===null;
  const food=showMeters ? foodReadout(plant,now) : null;
  const growth=showMeters ? growthReadout(plant,now) : null;
  const water=showMeters ? waterReadout(plant,now) : null;
  const status=game?playText(game):plant.deadAt!==null?'♥ Start again':mood+' · ♥ Menu';
  const description=!browsing && sick?'Fungus · '+minutesLabel+' left. Heart opens First Aid.':browsing?title+' · '+choice.label+' · '+choice.hint:game?title+' · '+status+' '+(game.name==='dew'?game.chances+' chances':''):title+' · '+mood;
  useEffect(()=>{ if(game?.name) heart.current?.focus({preventScroll:true}); },[game?.name]);

  function go(id,initial=0) {
    setFeedback(null);
    setPath(old=>old.at(-1)?.id===id?old:[...old,frame(id,initial)]);
  }
  function leaveGame() {
    if(game?.lesson && dewLesson?.status==='round'){
      if(!terminal)void commit(p=>settleDewLesson(p,'skipped')).then(saved=>{
        if(!saved)setLessonError('Couldn’t leave the round. Hold Back to retry.');
      });
      return;
    }
    activity.exit();
    setPath([]);setFeedback(null);
    clearTimeout(retreat.current);setCloseUp(false);
  }
  function back() {
    if (playing) {go('pause');return;}
    setPath(old=>old.slice(0,-1));setFeedback(null);
  }
  function browse(delta) {
    if (!section) {go('home');return;}
    const next=(index+delta+cards.length)%cards.length;
    setPath(old=>[...old.slice(0,-1),frame(section,next)]);
  }
  function give(action,confirmed=false) {
    const time=plantClock(), live=wake(plant,time);
    const state=careStatus(live,action,time);
    if (state.locked) return false;
    if (state.confirm && !confirmed) {go('pour');return 'tap';}
    let effect, waterFrom;
    void commit(p=>{
      if(p.id!==plant.id)return p;
      const before=wake(p,time);
      if(action==='water' && (before.lastDrink!==live.lastDrink || before.extraPour!==live.extraPour || before.rotAt!==live.rotAt)) return before;
      const next=care(before,action,time,confirmed,Date.now());
      if(next!==before){
        effect=action==='water' && careStatus(before,action,time).confirm?'overwater':action;
        if(effect==='water')waterFrom=condition(before,time);
      }
      return next;
    }).then(ok=>{if(ok && effect)react(effect,waterFrom);});
    if (section==='pour') setPath(old=>old.slice(0,-1));

    return 'care';
  }
  function choose() {
    if (!section) {
      if(plant.deadAt!==null)openBook();
      else if(sick)setPath([frame('home'),frame('aid')]);
      else go('home');
      return 'tap';
    }
    if (choice.locked || !choice.command) return false;
    const cmd=choice.command;
    if(cmd==='boost'){boostOffer.current={stage:plant.stage,count:plant.boostCount || 0};go('boost');return 'tap';}
    if(cmd==='buy-boost'){
      const offer=boosting?{stage:plant.stage,count:plant.boostCount || 0}:boostOffer.current;
      void purchaseGrowth(offer);return 'tap';
    }
    if (cmd==='back' || cmd==='resume') back();
    else if (cmd==='next') browse(1);
    else if (cmd==='leave') leaveGame();
    else if (cmd==='rename') rename();
    else if (cmd==='garden-book')openBook();
    else if (cmd==='treat'){
      let cured=false;
      void commit(p=>{
        if(p.id!==plant.id)return p;
        const next=treatFungus(p,plant.fungusAt,plantClock());
        cured=next.fungusAt===null && next.deadAt===null && p.fungusAt===plant.fungusAt;
        return next;
      }).then(ok=>{if(ok && cured){setPath([]);react('gnatCure',undefined,severity);}});
      return 'care';
    }
    else if (cmd==='graduate') openMove();
    else if (cmd==='pour-extra') return give('water',true);
    else {
      const [type,value]=cmd.split(':');
      if (type==='give') return give(value);
      if (type==='game') activity.enter(value);
      else go(cmd,cmd==='care' && soil==='rootRot'?toyCards('care',plant,now).findIndex(c=>c.command==='give:drain'):0);
    }
    return 'tap';
  }
  function release() {
    clearTimeout(retreat.current);held.current=null;
    retreat.current=setTimeout(()=>setCloseUp(false),3400);
  }
  const tutorial=plant.tutorial;
  const [practice,setPractice]=useState('browse');
  const training=lesson==='water' && tutorial && !tutorial.controlsLearned;
  const boosting=tutorial?.step==='boost';
  const purchasePending=useRef(false);
  const boostOffer=useRef({stage:plant.stage,count:plant.boostCount || 0});
  const lastPurchase=useRef(null);
  const toyDisabled=!resting || revealing || lesson==='watered' || Boolean(tutorial && !lesson && !boosting);
  const heartDisabled=Boolean(toyDisabled || (training && section) || choice && (
    choice.locked || !choice.command ||
    (boosting && !['growth','boost','buy-boost','back'].includes(choice.command)) ||
    (lesson==='water' && !['care','give:water','back'].includes(choice.command))
  ));
  async function purchaseGrowth(expected){
    if(!expected || purchasePending.current)return;
    const prior=lastPurchase.current;
    if(prior?.id===plant.id && prior.stage===expected.stage && prior.count===expected.count)return;
    purchasePending.current=true;
    try{
      let charged=false;
      const saved=await commit(p=>{
        const next=buyGrowth(p,expected,plantClock());
        charged=next.boostCount!==p.boostCount;
        return next;
      });
      if(!saved)return;
      if(charged)lastPurchase.current={id:plant.id,...expected};
      if(boosting){
        if(charged && tutorial.blocks===3)setPath([]);
        else if(!charged)setPath([frame('home',2),frame('growth')]);
      }else setPath(old=>old.at(-1)?.id==='boost'?[...old.slice(0,-1),frame(charged?'spurtReceipt':'spurtChanged')]:old);
    }
    finally{purchasePending.current=false;}
  }
  function press(key) {
    if(toyDisabled || (key==='heart' && heartDisabled) || terminal)return;
    let voice='tap';
    if(summary){
      if(key!=='heart' || sproutAnswerPending.current)return;
      void finishDewLesson();
    }else if(boosting){
      if(key==='back')back();
      else if((key==='left' || key==='right') && section)browse(key==='left'?-1:1);
      else if(key==='heart')choose();
    }else if(training){
      if(!section && key==='heart')go('home');
      else if(section==='home' && (key==='right' || key==='left')){browse(key==='right'?1:-1);setPractice('back');}
      else if(section==='home' && key==='back'){
        back();
        if(practice==='back')void commit(p=>p.tutorial?{...p,tutorial:{...p.tutorial,controlsLearned:true}}:p);
      }else return;
    }else{
      if (key==='back') back();
      else if (playing) activity.key(key);
      else if (key==='heart') voice=choose();
      else browse(key==='left'?-1:1);
      setCloseUp(true);release();
    }
    if (voice) sound(voice);
  }

  const input=useRef(null);
  input.current={press,holdBack:()=>{
    if(toyDisabled)return;
    if(training)press('back');
    else {
      if((section || game || closeUp) && !terminal)sound('tap');
      leaveGame();
    }
  }};
  function cancelHold() {
    clearTimeout(backHold.current?.timer);
    backHold.current=null;
  }
  function beginHold(source) {
    cancelHold();
    const hold={source,fired:false,timer:0};
    backHold.current=hold;
    hold.timer=setTimeout(()=>{
      hold.fired=true;
      if (typeof source==='number') suppressBackClick.current=true;
      input.current.holdBack();
    },BACK_HOLD_MS);
  }
  function endPointerHold(e) {
    if (backHold.current?.source===e.pointerId) cancelHold();
  }
  useEffect(()=>{
    if (!resting) return;
    function keyboard(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const isBack=e.key==='Escape' || e.key==='Backspace' ||
        (['Enter',' '].includes(e.key) && e.target.closest?.('.toy-back'));
      if (isBack) {
        e.preventDefault();
        if (!e.repeat && !backHold.current) beginHold(e.key);
        return;
      }
      const key={ArrowLeft:'left',ArrowRight:'right',Enter:'heart',' ':'heart'}[e.key];
      if(e.repeat){
        if(key==='heart' && e.target.closest?.('.toy-keys'))e.preventDefault();
        return;
      }
      if(!key || (key==='heart' && e.target.closest?.('button')))return;
      e.preventDefault();
      if (key==='left' || key==='right') heart.current?.focus({preventScroll:true});
      input.current.press(key);
    }
    function keyUp(e) {
      const hold=backHold.current;
      if (!hold || hold.source!==e.key) return;
      e.preventDefault();cancelHold();
      if (!hold.fired) input.current.press('back');
    }
    function onVisibility() {if (document.hidden) cancelHold();}
    window.addEventListener('keydown',keyboard);
    window.addEventListener('keyup',keyUp);
    window.addEventListener('blur',cancelHold);
    document.addEventListener('visibilitychange',onVisibility);
    return ()=>{
      cancelHold();
      window.removeEventListener('keydown',keyboard);
      window.removeEventListener('keyup',keyUp);
      window.removeEventListener('blur',cancelHold);
      document.removeEventListener('visibilitychange',onVisibility);
    };
  },[resting]);
  useEffect(()=>{
    clearTimeout(retreat.current);held.current=null;pressed.current=null;setCloseUp(false);
    return ()=>clearTimeout(retreat.current);
  },[resting]);
  useEffect(()=>()=>clearTimeout(speech.current),[]);

  useEffect(()=>{
    if(lesson==='watered'){
      leaveGame();
    }else if(lesson==='water' || priorLesson.current==='watered'){
      heart.current?.focus({preventScroll:true});
    }
    priorLesson.current=lesson;
  },[lesson]);
  const near=resting && (closeUp || Boolean(section) || Boolean(game));
  const sproutMinutes=Math.max(0,Math.ceil((plant.plantedAt+HOUR-now)/60000));
  const sproutHint=sproutMinutes>=60?'in about an hour':sproutMinutes>1?'in about '+sproutMinutes+' minutes':'any moment';
  const boostTarget={home:'growth',growth:'boost',boost:'buy-boost'}[section];
  const findBoost=boosting && cards.length>1 && choice?.command!==boostTarget;
  const guideArrow=findBoost || Boolean(section && (
    (training && practice==='browse') ||
    (lesson==='water' && !training && heartDisabled)
  ));
  function wateringInstruction(){
    if(!section)return tutorial?.controlsLearned || training && practice==='back'
      ? 'Nice! Now open my menu again. Choose Care, then Water, to give your seed its first drink.'
      : 'Hey there! I’m your Plantigochi. Let’s help '+plant.name+' sprout. Press my heart button to open the menu.';
    if(training)return practice==='browse'
      ? 'Try either arrow to see another menu item.'
      : 'That’s how you browse! Press Back to return to your seed.';
    if(section==='home')return choice.command==='care'
      ? 'Use my arrows to look around. Back takes you out. For our first drink, choose Care with the heart.'
      : 'You found '+choice.label+'! Use the arrows to find Care, then press my heart.';
    return choice.command==='give:water'
      ? 'There’s Water! Press my heart to give '+plant.name+' its first drink.'
      : 'Use the arrows to find Water. My heart picks it, and Back takes you up one menu.';
  }
  const firstDrinkHint=lesson==='water'?wateringInstruction():null;
  const boostInstruction = boosting ? (!section?'Press my heart to open the menu.':section==='home'?
    (findBoost?'Use the arrows to find Growth, then press my heart.':'There’s Growth. Press my heart.'):section==='growth'?
    (findBoost?'Use the arrows to find Growth Spurt.':'Choose Growth Spurt with my heart.'):choice.command==='buy-boost'?
    'Choose Spend 50 coins with my heart.':findBoost?'Use an arrow to see Spend 50 coins, or press my heart to cancel.':choice.hint+'. Press Back to return.') : null;
  return <>{revealing && <LeafReveal/>}
    {boosting && <GuideChat className="toy-guide" cue={resting?'boost-'+tutorial.blocks+'-'+boostInstruction:null}>
      <p>{!section && !tutorial.blocks?'Here are 200 coins! Let’s spend them on four growth spurts so you can see me sprout.':[
        'Let’s help the seed open.', 'Did you see me stir?', 'My seed coat is swelling!', 'I’ve cracked open. See that little shoot? One more spurt!'
      ][tutorial.blocks]}</p>
      <p><b>{tutorial.blocks} of 4 spurts</b> · {lifeOf(plant).balance} coins</p>
      <p>{boostInstruction}</p>
    </GuideChat>}
    {resting && game?.lesson && ready && <GuideChat className="toy-guide" cue="one-dew-round">
      <p>{game.startedAt==null?'Let’s play one round.':'Welcome back to your round.'} Catch 3 drops with the arrows before you miss 3. Press my heart to {game.startedAt==null?'start':'resume'}.</p>
      <p>Hold Back to skip to your gift.</p>
    </GuideChat>}
    {resting && game?.lesson && failedRound && <GuideChat className="toy-guide" cue="dew-save-error">
      <p>Your round ended. Save the result to continue.</p>
      <button onClick={()=>recordRound(...failedRound)}>Retry saving round</button>
    </GuideChat>}
    {resting && game?.lesson && lessonError && <GuideChat className="toy-guide" cue="dew-leave-error"><p>{lessonError}</p></GuideChat>}
    {resting && summary && <GuideChat className="toy-guide farewell" cue={'dew-finale-'+dewLesson.status} focusRef={finishButton} onReveal={onFarewellReveal}>
      <div className="farewell-message">
        <p><strong>Thanks for growing with me!</strong></p>
        <p>{plant.deadAt!==null ? 'Your coins carry over to your next seed.' :
          dewLesson.status==='won' ? (dewLesson.coins ? `Three drops caught! You earned ${dewLesson.coins} coins.` : 'You caught all three drops!') :
          dewLesson.status==='lost' ? 'Try Dew Catch again in my Play menu.' :
          'Check my Water meter for my next drink.'}</p>
        {lessonError && <p role="status">{lessonError}</p>}
      </div>
      <div className="chat-actions"><button className="lesson-done" ref={finishButton} disabled={answeringSprout} onClick={finishDewLesson}>Claim {GOOD_LUCK_COINS} coins</button></div>
    </GuideChat>}
    {resting && ready && !game.lesson && game.name==='dew' && !plant.dewCleared && <FirstHint id="dew" plant={plant} commit={commit} className="toy-guide">Press my heart to start. Move left or right to catch the drops. Three misses end the run.</FirstHint>}
    {resting && sick && !dewLesson && !game && (!section || section==='aid') && <FirstHint id="aid" plant={plant} commit={commit} className="toy-guide">Those little gnats mean I need help. Open First Aid and choose G-NAT ASSASSIN to give me one drop.</FirstHint>}
    {lesson && !revealing && <GuideChat className="toy-guide" cue={resting?(lesson==='water'?firstDrinkHint:lesson):null} focusRef={lesson==='watered'?lessonDone:null}>
      {lesson==='watered'?<>
        <p>{routeError || (tutorial?'That was a lovely first drink!':plant.stage==='seed'?'Ahh, thank you! Look for my first sprout '+sproutHint+'.':'Look, '+plant.name+' has sprouted!')}</p>
        <p>{firstDay?.drinkCoins!=null?'You earned '+firstDay.visitCoins+' coins for visiting and '+firstDay.drinkCoins+' for watering.':'You have '+lifeOf(plant).balance+' coins.'} {tutorial?'See your purse at the bottom left? Let’s use those coins for my first pot.':'Swipe up to visit our garden.'}</p>
        <div className="chat-actions"><button ref={lessonDone} onClick={finishLesson} disabled={routePending}>{routePending?'Opening garden…':'Visit my garden'}</button>
        {reminder && plant.stage==='seed' && <button disabled={reminder.busy || !reminder.canEnable}
          onClick={()=>reminder.enable()}>Turn on plant alerts</button>}</div>
        {reminder?.notice && <p role="status">{reminder.notice}</p>}
      </>:<p>{firstDrinkHint}</p>}
    </GuideChat>}
    {resting && !game && !sick && plant.deadAt===null && plant.stage==='grown' && !plant.growthFlares?.length &&
      plant.waitingPlants?.some(p=>p.id===plant.id) && plant.homeIntroSeen!==plant.id &&
      <GuideChat className="toy-guide sprout-debut" cue={'home-'+plant.id}>
        <p>I’m fully grown! You’ll find me in your Inventory. Let’s pick my new home in the garden.</p>
        <div className="chat-actions"><button onClick={()=>openMove()}>Choose a garden spot</button></div>
      </GuideChat>}
    {sproutWelcome && !section && !game && <GuideChat className="toy-guide sprout-debut" cue="first-leaf">
      <p><strong>{plant.name} sprouted!</strong> My first leaf!</p>
      <p>{water.label.startsWith('In ')?'My next drink is in '+water.label.slice(3)+'.':water.detail+'.'} Want to play one round of Dew Catch? Catch 3 drops to win 3 coins. Three misses end the round.</p>
      <div className="chat-actions">
      <button className="lesson-done" disabled={answeringSprout || reminder?.busy} onClick={()=>answerSprout(true)}>Play one round</button>
      <button className="lesson-done" disabled={answeringSprout || reminder?.busy} onClick={()=>answerSprout(false)}>Maybe later</button>
      {reminder && <button disabled={answeringSprout || reminder.busy || !reminder.canEnable} onClick={()=>reminder.enable()}>Turn on plant alerts</button>}</div>
      {reminder?.notice && <p role="status">{reminder.notice}</p>}
    </GuideChat>}
    <div className={'inspect-view'+(near?' close-up':'')}>
    <div className="device">
      <SproutCelebration plant={plant} resting={resting && !game && !revealing} commit={commit}/>
      <div className="inspect-shell"><DeviceShell/></div>
      <div className={'lcd'+(browsing?' lcd-menu':ready?' lcd-ready':'')} data-branch={branch} role="group" aria-label={description}>
        <span className="lcd-care-light" aria-hidden="true" data-needed={!game && careCues.light || undefined}/>
        <span className="lcd-top"><span>{!browsing && <i/>}{title.toUpperCase()}</span>
          {game?.name==='dew' ? <Chances remaining={game.chances}/>
            : browsing ? <span className="lcd-page">{index+1}/{cards.length}</span>
            : food ? <span className="lcd-food" data-tone={food.tone}>{food.label}</span>
            : <span className="battery" aria-hidden="true"><b/><b/><b/></span>}
        </span>
        {showMeters && <span className="lcd-menu-key" aria-hidden="true">{summary?'♥ Finish':sick?'♥ First Aid':'♥ Menu'}</span>}
        {browsing && <BranchIcons active={branch}/>}
        <span className={game?'lcd-art':'lcd-art lcd-plant'}>
          {game?<GameArt game={game}/>:<PlantPixel careCues={careCues} species={plant.species} seedSteps={boosting?tutorial.blocks:0} key={plant.id} reactionId={feedback?.id} stage={plant.stage} condition={soil} mood={displayMood} waterFrom={feedback?.waterFrom} hungry={plant.fedAt!==null && now>=plant.fedAt+FOOD_INTERVAL} lowLight={plant.litAt!==null && now>=plant.litAt+LIGHT_INTERVAL} outbreak={feedback?.outbreak ?? severity} showBottle={section==='aid' && sick} reaction={feedback?.effect}/>}
        </span>
        {!game && (browsing || showMeters) && feedback?.effect!=='gnatCure' && <CareIndicator icons={careCues.icons}/>}
        {browsing ? <MenuItem item={choice}/> : showMeters ? <div className="lcd-readout">
          {boosting?<ReadoutMeter name="Sprout" label={tutorial.blocks+' / 4'} detail="Sprouting boosts purchased" value={tutorial.blocks} steps={4}/>:<ReadoutMeter name="Growth" label={ageText} detail={ageText+' old · '+(growth.next?growth.next+' · ':'')+growth.detail} value={growth.filled} steps={GROWTH_STEPS}/>}
          <ReadoutMeter name="Water" label={water.label==='Seed watered'?'Watered':water.label.replace(/^In /,'')} detail={water.detail} tone={water.tone} value={water.fraction}/>
          {sick?<span className="fungus-alarm" role="status"><Cross aria-hidden="true"/>Fungus · {minutesLabel} left</span>:<ReadoutMeter name="Mood" label={displayMood} detail={displayMood} value={({happy:4,content:3,quiet:2,lonely:1,sad:1,sleeping:0})[displayMood]} steps={4}/>}
        </div> : <span className="lcd-status">{status}{ready && <small className="lcd-hint">Hold Back to exit</small>}</span>}
      </div>
      <span className="shell-name" aria-hidden="true">PLANTIGOCHI</span>
      <div className="toy-keys" role="group" aria-label="Plantigochi buttons"
        onPointerDownCapture={e=>{
          const button=e.target.closest('button');
          if (!button || !resting || !e.isPrimary || e.button!==0) return;
          suppressBackClick.current=false;
          if (button.classList.contains('toy-back')) beginHold(e.pointerId);
          clearTimeout(retreat.current);held.current=e.pointerId;pressed.current=button;
          button.setPointerCapture(e.pointerId);
        }}
        onPointerUp={endPointerHold}
        onLostPointerCapture={e=>{endPointerHold(e);if(held.current===e.pointerId) release();}}
        onPointerCancel={e=>{endPointerHold(e);pressed.current=null;release();}}
        onClickCapture={e=>{
          const original=pressed.current;pressed.current=null;
          if (suppressBackClick.current && original?.classList.contains('toy-back')) {
            suppressBackClick.current=false;e.preventDefault();e.stopPropagation();return;
          }
          if (resting && e.detail>0 && original?.isConnected && original!==e.target.closest('button')) {
            e.stopPropagation();e.preventDefault();original.focus({preventScroll:true});original.click();
          }
        }}>
        <button className={'toy-back'+(training && section && practice==='back'?' teaching-heart':'')} data-audio="toy" aria-label="Back on toy" title="Back · Hold to return to plant" aria-description="Hold to return to your plant." onContextMenu={e=>e.preventDefault()} onClick={()=>press('back')}><CornerUpLeft/></button>
        <button data-audio="toy" className={guideArrow?'teaching-heart':''} aria-label={playing?'Play left':'Previous toy item'} title="Previous" onClick={()=>press('left')}><ChevronLeft/></button>
        <button ref={heart} data-audio="toy" className={'accept toy-heart'+((lesson==='water' || boosting && !findBoost) && !heartDisabled?' teaching-heart':'')} aria-label={summary?'Claim tutorial gift with heart':playing?'Play heart':choice?'Choose '+choice.label:plant.deadAt!==null?'Start again':sick?'Open First Aid':'Open toy menu'} title="Choose" aria-disabled={heartDisabled} onClick={()=>press('heart')}><Heart/></button>
        <button data-audio="toy" className={guideArrow?'teaching-heart':''} aria-label={playing?'Play right':'Next toy item'} title="Next" onClick={()=>press('right')}><ChevronRight/></button>
      </div>
      <span className="sr-only" role="status">{description}</span>
    </div></div></>;
}
