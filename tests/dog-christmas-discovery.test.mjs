import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../DOG/christmas-discovery.js',import.meta.url),'utf8');
const {dogChristmasFoundMarkers,newDogChristmasDiscoveries,describeDogChristmasDiscovery,createDogChristmasDiscoveryPopup,createDogGoldConfetti}=await import('data:text/javascript,'+encodeURIComponent(script));
test('only verified found positions are marked; hidden field positions remain secret',()=>{
 const snap={enabled:true,foundGiftFields:[3,3,0,12,90],foundScratchFields:[12,15,16],giftFields:[21],scratchFields:[22]};
 assert.deepEqual(dogChristmasFoundMarkers(snap),[
  {field:3,kind:'gift',both:false},
  {field:12,kind:'gift',both:true},
  {field:12,kind:'scratch',both:true},
  {field:15,kind:'scratch',both:false}
 ]);
 assert.deepEqual(dogChristmasFoundMarkers(null),[]);
});
test('only NEW Render-confirmed human discoveries notify everybody in the room',()=>{
 const players=[{seat:0,name:'Chris',bot:false},{seat:1,name:'Vanessa',bot:false},
  {seat:2,name:'DOG-Bot',bot:true},{seat:3,name:'David',bot:false}];
 const previous={enabled:true,eventSerial:8};
 const next={enabled:true,eventSerial:12,activity:[
  {id:8,type:'gift',field:5,seat:0},
  {id:9,type:'gift',field:9,seat:1,earnedTenths:10},
  {id:10,type:'scratch',field:13,seat:1,tier:'premium'},
  {id:11,type:'scratch',field:25,seat:2},
  {id:12,type:'gold',field:29,seat:3,amount:500}
 ]};
 assert.deepEqual(newDogChristmasDiscoveries(previous,next,players).map(e=>e.id),[9,10,12]);
 assert.deepEqual(newDogChristmasDiscoveries(next,next,players),[]);
 assert.deepEqual(newDogChristmasDiscoveries(null,next,players),[],'joining never replays old prizes');
 assert.deepEqual(newDogChristmasDiscoveries(previous,{...next,eventSerial:7},players),[]);
 assert.deepEqual(newDogChristmasDiscoveries(previous,next,null),[]);
 // The same snapshot has one event ID per claim; never repeat duplicates.
 const duplicates={...next,activity:[...next.activity,next.activity[1]]};
 assert.deepEqual(newDogChristmasDiscoveries(previous,duplicates,players).map(e=>e.id),[9,10,12]);
});

test('each dialog shows the correct named player and the server-confirmed reward',()=>{
 const players=[{seat:0,name:'Chris',bot:false},{seat:1,name:'Vanessa',bot:false}];
 const light=describeDogChristmasDiscovery({type:'gift',seat:0,earnedTenths:25},players);
 const gold=describeDogChristmasDiscovery({type:'gold',seat:1,amount:2000},players);
 const scratch=describeDogChristmasDiscovery({type:'scratch',seat:1,tier:'medium'},players);
 const double=describeDogChristmasDiscovery({type:'scratch',seat:0,tier:'double'},players);
 assert.match(light.message,/Chris.*2,5 Weihnachtslichter/);
 assert.match(gold.message,/Vanessa.*2\.000 Goldmünzen/);
 assert.match(scratch.message,/Vanessa.*mittleres Rubbellos/);
 assert.match(double.message,/Chris.*Doppellos/);
 assert.equal(describeDogChristmasDiscovery({type:'gold',seat:2,amount:500},players),null);
});

test('popup waits for explicit confirmation and queues separate room rewards',()=>{
 const listeners={};
 const popup={hidden:true,open:false,dataset:{},
  showModal(){this.open=true;},close(){this.open=false;},
  addEventListener(name,fn){listeners[name]=fn;}};
 const confirm={addEventListener(name,fn){this.click=fn;},focus(){this.focused=true;}};
 const elements={'dog-christmas-find-popup':popup,'dog-christmas-find-icon':{textContent:''},
  'dog-christmas-find-title':{textContent:''},'dog-christmas-find-winner':{textContent:''},
  'dog-christmas-find-message':{textContent:''},'dog-christmas-find-confirm':confirm};
 const document={getElementById:id=>elements[id]||null};
 const ui=createDogChristmasDiscoveryPopup(document);
 const players=[{seat:0,name:'Chris',bot:false},{seat:1,name:'Vanessa',bot:false}];
 ui.show([{type:'gift',seat:0,earnedTenths:10},{type:'scratch',seat:1,tier:'premium'}],players);
 assert.equal(popup.open,true);
 assert.equal(elements['dog-christmas-find-winner'].textContent,'🏆 Chris');
 assert.equal(elements['dog-christmas-find-message'].textContent.includes('1 Weihnachtslichter'),true);
 assert.equal(confirm.focused,true);
 listeners.cancel({preventDefault(){this.cancelled=true;}});
 // Only confirming the active prize proceeds to the next one.
 confirm.click();
 assert.equal(popup.open,true);
 assert.equal(elements['dog-christmas-find-winner'].textContent,'🏆 Vanessa');
 confirm.click();
 assert.equal(popup.open,false);
 assert.equal(popup.hidden,true);
 ui.show([{type:'gold',seat:0,amount:1}],players);
 ui.reset();
 assert.equal(popup.open,false);
 assert.equal(popup.hidden,true);
});

test('popup only reports server-provided rewards; never requests or writes game state',()=>{
 assert.doesNotMatch(script,/fetch\(|getIdToken|firebase|sendOnlineDogAction|setTimeout/);
 assert.match(script,/Weihnachtslichter|Rubbellos|Goldmünzen/);
 const html=readFileSync(new URL('../DOG/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
 assert.match(html,/<dialog id="dog-christmas-find-popup"/);
 assert.match(html,/id="dog-christmas-find-confirm"[^>]*>✓ Bestätigen/);
 assert.match(app,/newDogChristmasDiscoveries\(previousChristmas,onlineChristmas,game\?\.players\)/);
});

test('old verified activity shows previously collected fields even without the new stored arrays',()=>{
 const snap={enabled:true,activity:[
  {type:'gift',field:9,seat:0},{type:'scratch',field:11,seat:1},
  {type:'inn',earnedTenths:20},{type:'gift',field:16,seat:1},
  {type:'scratch',field:11,seat:1}
 ]};
 assert.deepEqual(dogChristmasFoundMarkers(snap),[
  {field:9,kind:'gift',both:false},{field:11,kind:'scratch',both:false}
 ]);
});
test('collected markers are drawn above pawns, not hidden behind them',()=>{
 const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
 const pawnStart=app.indexOf('  for(const piece of game.pieces){',app.indexOf('function drawBoard()'));
 const permanentLayer=app.indexOf('    const byField=new Map();',pawnStart);
 const svgCommit=app.indexOf("  boardSvg.innerHTML=board.join('');",pawnStart);
 assert.ok(pawnStart>=0&&permanentLayer>pawnStart&&svgCommit>permanentLayer);
 assert.match(app.slice(permanentLayer,svgCommit),/pointer-events="none"/);
 assert.match(app.slice(permanentLayer,svgCommit),/pawnFields\.has\(field\)/);
});

test('only a newly revealed 2,000-gold prize starts the jackpot cannon',()=>{
 const classes=new Set();
 const popup={hidden:true,open:false,dataset:{},classList:{
  toggle:(name,enabled)=>enabled?classes.add(name):classes.delete(name)
 },showModal(){this.open=true;},close(){this.open=false;},addEventListener(){}};
 const confirm={addEventListener(_type,fn){this.click=fn;},focus(){}};
 const elements={'dog-christmas-find-popup':popup,'dog-christmas-find-confirm':confirm};
 const seen=[],closed=[];
 const ui=createDogChristmasDiscoveryPopup({getElementById:id=>elements[id]||null},{
  onReveal:prize=>{if(prize.kind==='gold'&&prize.amount===2000)seen.push(prize.amount);},
  onDismiss:()=>closed.push(true)
 });
 const players=[{name:'Vanessa',seat:1,bot:false}];
 ui.show([{id:9,type:'gold',field:5,seat:1,amount:500},
          {id:10,type:'gold',field:9,seat:1,amount:2000}],players);
 assert.deepEqual(seen,[],'500 gold has no confetti');
 assert.equal(classes.has('dog-gold-2000'),false);
 confirm.click();
 assert.deepEqual(seen,[2000],'2000 gold starts when its own dialog opens');
 assert.equal(classes.has('dog-gold-2000'),true);
 confirm.click();
 assert.equal(popup.open,false);
 assert.equal(closed.length,2);
});

test('confetti canvas is screen-wide, disposable and respects reduced motion',()=>{
 const children=[],frames=[];
 const ctx={setTransform(){},clearRect(){},save(){},translate(){},rotate(){},
  fillRect(){},restore(){},fillText(){},set globalAlpha(_v){},set fillStyle(_v){},
  set textAlign(_v){},set font(_v){}};
 const popup={appendChild(node){children.push(node);}};
 const doc={documentElement:{dataset:{}},hidden:false,
  getElementById:id=>id==='dog-christmas-find-popup'?popup:null,
  createElement(type){
   assert.equal(type,'canvas');
   return {setAttribute(){},getContext:()=>ctx,remove(){this.removed=true;},removed:false};
  },
  defaultView:{innerWidth:1200,innerHeight:700,devicePixelRatio:1,
   performance:{now:()=>10},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},
   cancelAnimationFrame(){},matchMedia:()=>({matches:false})}
 };
 const confetti=createDogGoldConfetti(doc);
 confetti.fire();
 assert.equal(children.length,1);
 assert.equal(children[0].width,1200);
 assert.equal(children[0].height,700);
 frames.shift()(110);
 confetti.stop();
 assert.equal(children[0].removed,true);
 doc.documentElement.dataset.dogMotion='off';
 confetti.fire();
 assert.equal(children.length,1,'motion-off does not create a new canvas');
});
