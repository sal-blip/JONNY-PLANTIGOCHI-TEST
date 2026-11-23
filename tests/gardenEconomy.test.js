import test from 'node:test';
import assert from 'node:assert/strict';
import {care,graduate,HOUR,newPlant,readPlant,relocateGraduate,replant,wake,WEEK} from '../src/game.js';
import {addRealPlant,canSetItem,catalog,checkIn,destinationKey,earnWin,fitsBackupChange,framePhoto,lifeOf,placeItem,removeNote,saveNote,storeItem,validGardenLife} from '../src/gardenEconomy.js';
import {packGardenBackup,prepareRestoredGarden,readGardenBackup} from '../src/gardenBackup.js';
import {backupLimit} from '../src/gardenScenes.js';

const morning=new Date(2026,0,18,8).getTime();
const later=new Date(2026,0,19,0,1).getTime();
const seed=()=>newPlant(morning,'Aki');
const buy=(p,sku,id,slot)=>placeItem(p,{sku,id,slot,buy:true,expected:destinationKey(p,slot)},morning);
test('day one pays for a physical pot, with safe caps on repeated care and game callbacks',()=>{
  let p=checkIn(seed(),morning);
  assert.equal(checkIn(p,morning+1),p);
  p=care(p,'water',morning);
  assert.equal(p.gardenLife.balance,12);
  assert.equal(care(p,'water',morning+1),p);
  const purchased=buy(p,'terra','pot',0);
  assert.equal(purchased.gardenLife.balance,2);
  assert.equal(buy(purchased,'terra','pot',1),purchased);
  assert.equal(buy(purchased,'golden-pothos','pothos',1),purchased);
  p=wake(purchased,morning+HOUR);
  const soaked=care(p,'water',morning+HOUR+1,true);
  assert.equal(soaked.gardenLife.balance,2);
  for(let n=1;n<=3;n++)p=care(p,'water',morning+(1+4*n)*HOUR);
  assert.equal(p.gardenLife.waters,3);assert.equal(p.gardenLife.balance,6);
  for(let n=1;n<=6;n++)p=earnWin(p,'result'+n,morning,morning);
  assert.equal(p.gardenLife.balance,21);
  assert.equal(earnWin(p,'result1',morning,morning),p);
  p=checkIn(p,later);assert.equal(p.gardenLife.balance,31);assert.equal(p.gardenLife.wins.length,0);
  assert.equal(earnWin(p,'result1',morning,later),p);
  assert.equal(checkIn(p,morning),p);
});
test('placement is atomic, physical pots travel with plants and swapped pots stay owned',()=>{
  let p=checkIn(seed(),morning);p={...p,gardenLife:{...p.gardenLife,balance:400}};
  p=buy(p,'golden-pothos','pothos',0);
  p=buy(p,'terra','pot1',0);p=buy(p,'wave','pot2',1);
  const before=p,stale={sku:'wave',id:'third',buy:true,slot:1,expected:destinationKey(p,1)};
  p=relocateGraduate(p,'pothos',0,1);
  assert.deepEqual(p.gardenLife.items.map(i=>i.slot),[1,null]);
  assert.equal(placeItem(p,stale,morning),p);
  assert.equal(buy(p,'snake-plant','snake',1),p);
  p=placeItem(p,{sku:'wave',id:'pot2',buy:false,from:null,slot:1,expected:destinationKey(p,1)},morning);
  assert.equal(p.gardenLife.balance,before.gardenLife.balance);
  assert.deepEqual(p.gardenLife.items.map(i=>i.slot),[null,1]);
  assert.equal(storeItem(p,'pot2',3),p);
  p=buy(p,'oak','frame','0/decor-stand');
  assert.equal(canSetItem(p,'neko','0/decor-stand'),false);
  const photo={src:'data:image/jpeg;base64,/9j/AA==',width:40,height:32,x:50,y:50};
  p=framePhoto(p,'frame',photo);
  const reload=readPlant(JSON.stringify(p),morning);
  assert.deepEqual(reload,p);assert.equal(reload.graduates[0].name,'Golden pothos');
  assert.equal(framePhoto(reload,'pot1',photo),reload);
});

test('launch shop plants and pots survive a room move, a reload and a backup restore',async()=>{
  const plants=['monstera-albo','pink-micans','hoya-serpens-splash','queen-anthurium','monkey-tail-cactus'];
  const pots=['bog-frog-pot','lava-pop-pot'];
  const start=checkIn(seed(),morning);
  const startingBalance=1000;
  let p={...start,gardenLife:{...start.gardenLife,balance:startingBalance}};
  for(const [slot,sku] of plants.entries())p=buy(p,sku,sku,slot);
  for(const [slot,sku] of pots.entries())p=buy(p,sku,sku,slot);
  const balance=startingBalance-[...plants,...pots].reduce((total,sku)=>total+catalog[sku].price,0);
  assert.equal(lifeOf(p).balance,balance);
  assert.deepEqual(p.graduates.map(plant=>plant.species),plants);
  assert.deepEqual(p.graduates.map(plant=>plant.name),plants.map(sku=>catalog[sku].name));
  p=relocateGraduate(p,plants[0],0,6);
  assert.equal(p.graduates.find(plant=>plant.id===plants[0]).slot,6);
  assert.deepEqual(lifeOf(p).items.map(({sku,slot})=>[sku,slot]),[[pots[0],6],[pots[1],1]]);
  assert.equal(buy(p,pots[0],pots[0],2),p);
  assert.equal(lifeOf(p).balance,balance);
  const raw=JSON.stringify(p);
  assert.deepEqual(readPlant(raw,morning),p);
  const {blob}=packGardenBackup(raw,new Map());
  const restored=await prepareRestoredGarden(await readGardenBackup(blob),morning);
  assert.deepEqual(restored.plant,p);
});
test('journal, coins and real plants survive graduation and replanting, independently of tool cooldowns',()=>{
  let p=care(seed(),'water',morning);
  p=wake(p,morning+HOUR);
  const rp={id:'real',name:'Kitchen friend',species:''};
  p=addRealPlant(p,rp);
  const note={id:'note',subject:'real',group:'real',kind:'Watering',text:'',time:morning};
  const before=p.gardenLife.balance;
  p=saveNote(p,note);assert.equal(p.gardenLife.balance,before);
  const changed={...note,text:'New leaf'};
  p=saveNote(p,changed,note);assert.equal(removeNote(p,note),p);
  const grown={...p,stage:'grown',earned:WEEK};
  const next=graduate(grown,grown.id,0,morning+HOUR);
  assert.equal(lifeOf(next).events.filter(e=>e.id===grown.id+'/graduated').length,1);
  assert.deepEqual(next.gardenLife.notes,[changed]);
  const dead=wake(p,morning+25*HOUR),fresh=replant(dead,'seed',morning+26*HOUR);
  assert.equal(fresh.gardenLife.balance,before);
  assert.deepEqual(fresh.gardenLife.plants,[rp]);
  assert.equal(validGardenLife(fresh),true);
  assert.deepEqual(readPlant(JSON.stringify(fresh),morning+27*HOUR),fresh);
  assert.equal(removeNote(fresh,changed).gardenLife.notes.length,0);
  assert.equal(readPlant(JSON.stringify({...fresh,gardenLife:{...fresh.gardenLife,balance:-1}}),morning),null);
  const old=seed();
  assert.ok(readPlant(JSON.stringify(old),morning));
});

test('placed decorations can trade surfaces in a full room without changing ownership or coins',()=>{
  let p=checkIn(seed(),morning);p={...p,gardenLife:{...p.gardenLife,balance:500}};
  for(const view of [0,1]){
    for(const [index,surface] of ['sill','stand',view===0?'bookcase':'cabinet'].entries())
      p=buy(p,['oak','neko','record'][index],view+'-'+surface,view+'/decor-'+surface);
  }
  const from='0/decor-sill',slot='1/decor-stand',balance=p.gardenLife.balance;
  const request={id:'0-sill',sku:'oak',buy:false,from,slot,expected:destinationKey(p,slot)};
  assert.equal(canSetItem(p,'oak',slot),false);
  assert.equal(canSetItem(p,'oak',slot,from),true);
  assert.equal(canSetItem(p,'oak',from,from),false);
  const moved=placeItem(p,request,morning);
  assert.equal(moved.gardenLife.items.find(i=>i.id==='1-stand').slot,from);
  assert.equal(moved.gardenLife.items.find(i=>i.id==='0-sill').slot,slot);
  assert.equal(moved.gardenLife.balance,balance);
  assert.equal(moved.gardenLife.items.length,6);
  assert.equal(placeItem(moved,request,morning),moved);
  const changed=storeItem(p,'1-stand',slot);
  assert.equal(placeItem(changed,request,morning),changed);
  assert.deepEqual(readPlant(JSON.stringify(moved),morning),moved);
});

test('swapping pots from shelf zero moves only the ceramics and preserves both plants',()=>{
  let p=checkIn(seed(),morning);p={...p,gardenLife:{...p.gardenLife,balance:500}};
  p=buy(p,'golden-pothos','pothos',0);p=buy(p,'snake-plant','snake',6);
  p=buy(p,'terra','clay',0);p=buy(p,'wave','glaze',6);
  const moved=placeItem(p,{id:'clay',sku:'terra',buy:false,from:0,slot:6,expected:destinationKey(p,6)},morning);
  assert.deepEqual(moved.graduates,p.graduates);
  assert.equal(moved.gardenLife.balance,p.gardenLife.balance);
  assert.equal(moved.gardenLife.items.find(i=>i.id==='glaze').slot,0);
  assert.equal(moved.gardenLife.items.find(i=>i.id==='clay').slot,6);
  assert.deepEqual(readPlant(JSON.stringify(moved),morning),moved);
});

test('an older frame photo selection or removal preserves the newer saved image',()=>{
  const initial=checkIn(seed(),morning);
  const frame=buy({...initial,gardenLife:{...initial.gardenLife,balance:20}},'oak','frame','0/decor-stand');
  const first={src:'data:image/jpeg;base64,/9j/AA==',width:40,height:32,x:50,y:50};
  const newer={...first,src:'data:image/jpeg;base64,/9j/AQ=='};
  const pending={...first,src:'data:image/jpeg;base64,/9j/Ag=='};
  const original=framePhoto(frame,'frame',first,undefined);
  const changed=framePhoto(original,'frame',newer,first.src);
  assert.equal(changed.gardenLife.items[0].photo,newer);
  assert.equal(framePhoto(changed,'frame',pending,undefined),changed);
  assert.equal(framePhoto(changed,'frame',pending,first.src),changed);
  assert.equal(framePhoto(changed,'frame',null,first.src),changed);
  const removed=framePhoto(changed,'frame',null,newer.src);
  assert.equal(removed.gardenLife.items[0].photo,undefined);
  assert.equal(framePhoto(removed,'frame',pending,newer.src),removed);
});

test('photo and journal budgets use UTF-8 bytes and permit successive reductions of oversized gardens',()=>{
  const reserve=65536,limit=backupLimit-reserve;
  const small={text:''};
  const atLimit={text:'a'.repeat(limit-new Blob([JSON.stringify(small)]).size)};
  const above={text:atLimit.text+'x'};
  const evenLarger={text:atLimit.text+'葉'};
  assert.equal(fitsBackupChange(small,atLimit),true);
  assert.equal(fitsBackupChange(atLimit,above),false);
  assert.equal(fitsBackupChange(above,evenLarger),false);
  assert.equal(fitsBackupChange(above,{text:atLimit.text+'y'}),false);
  assert.equal(fitsBackupChange(evenLarger,above),true);
  assert.equal(fitsBackupChange(above,atLimit),true);
  assert.equal(fitsBackupChange(atLimit,small),true);
});

test('frames with identical previews still compare the selected original before changing the picture',()=>{
  const initial=checkIn(seed(),morning);
  const garden=buy({...initial,gardenLife:{...initial.gardenLife,balance:20}},'oak','frame','0/decor-stand');
  const first={src:'data:image/jpeg;base64,/9j/AA==',width:40,height:32,x:50,y:50,originalId:crypto.randomUUID()};
  const second={...first,originalId:crypto.randomUUID()};
  const saved=framePhoto(garden,'frame',first);
  const replaced=framePhoto(saved,'frame',second,first.originalId);
  assert.equal(replaced.gardenLife.items[0].photo,second);
  assert.equal(framePhoto(replaced,'frame',null,first.originalId),replaced);
  assert.equal(framePhoto(replaced,'frame',first,second.src),replaced);
  assert.deepEqual(readPlant(JSON.stringify(replaced),morning),replaced);
  assert.equal(framePhoto(replaced,'frame',{...second,originalId:'invalid'},second.originalId),replaced);
  assert.equal(framePhoto(replaced,'frame',null,second.originalId).gardenLife.items[0].photo,undefined);
});

test('growth boosts respect care, balance, purchase identity and the next milestone',async()=>{
  const {buyGrowth,DAY,earnedAt}=await import('../src/game.js');
  let p=wake(care(checkIn(seed(),morning),'water',morning),morning+HOUR);
  const time=morning+HOUR;
  p={...p,gardenLife:{...p.gardenLife,balance:650}};
  const buyStep=(plant,when=time)=>buyGrowth(plant,{stage:plant.stage,count:plant.boostCount || 0},when);
  const sick={...p,fungusAt:time,outbreakDue:null};
  assert.equal(buyStep(sick),sick);
  const poor={...p,gardenLife:{...p.gardenLife,balance:49}};
  assert.equal(buyStep(poor),poor);
  const first=buyStep(p);
  assert.equal(earnedAt(first,time),HOUR+(3*DAY-HOUR)/4);
  assert.equal(buyGrowth(first,{stage:'sprout',count:0},time),first);
  for(const stage of ['young','split','grown']){
    for(let n=0;n<4;n++)p=buyStep(p);
    assert.equal(p.stage,stage);
    assert.equal(readPlant(JSON.stringify(p),time).stage,stage);
  }
  assert.equal(p.gardenLife.balance,50);
  assert.equal(p.lastDrink,time);
  assert.equal(buyStep(p),p);
});

test('a near-milestone spurt matches its quote after reload and keeps the watering deadline',async()=>{
  const {buyGrowth,DAY,growthSpurtOffer}=await import('../src/game.js');
  const {reminderSchedule}=await import('../src/reminderSchedule.js');
  const now=morning+HOUR;
  const sprout=wake(care(checkIn(seed(),morning),'water',morning),now);
  const p={...sprout,earned:3*DAY-1,gardenLife:{...sprout.gardenLife,balance:75}};
  const offer=growthSpurtOffer(p,now);
  assert.equal(offer.percent,100);
  const expected={stage:'sprout',count:0};
  const saved=readPlant(JSON.stringify(buyGrowth(p,expected,now)),now);
  assert.equal(saved.earned,offer.target);
  assert.equal(saved.stage,'young');
  assert.equal(saved.gardenLife.balance,25);
  assert.equal(buyGrowth(saved,expected,now),saved);
  assert.equal(reminderSchedule(saved,false).dryDue,reminderSchedule(p,false).dryDue);
  assert.equal(growthSpurtOffer(saved,now).reason,'Need 25 more coins');
});
