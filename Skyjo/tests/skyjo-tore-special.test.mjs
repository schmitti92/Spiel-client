import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');
test('SKYJO loader hashes all 35 modules exactly, and the concatenated engine parses',()=>{
 const manifest=JSON.parse(read('skyjo_action-manifest.json'));
 const parts=Object.entries(manifest.parts);
 assert.equal(parts.length,35);
 const source=parts.map(([file,digest])=>{
  const text=read(file);
  assert.equal(createHash('sha256').update(text).digest('hex'),digest,file);
  return text;
 }).join('');
 assert.doesNotThrow(()=>new Function(source));
});
test('SKYJO 100 Tore Special browser runtime and existing Monster Slots parse',()=>{
 assert.doesNotThrow(()=>new Function(read('skyjo_tore_special.js')));
 const deal=read('../DealOrNoDeal/js/monster-slots-final.js');
 assert.doesNotThrow(()=>new Function(deal));
 assert.match(deal,/for\(let i=6;i<12;i\+\+\)/);
 assert.match(read('skyjo_action.html'),/skyjo_tore_special\.js/);
});
test('Mission selection is stable, three per round, and includes hard missions',()=>{
 const browser={};
 new Function('window',read('skyjo_tore_special.js'))(browser);
 const engine=browser.SkyjoToreSpecial;
 assert.equal(engine.definitions.length,22);
 const match='abcdef12-3456-4abc-bcde-123456789abc';
 assert.deepEqual(engine.missionsFor(match,1),['two-zero','two-rows','clear-board']);
 for(let round=1;round<100;round++){
  const ids=engine.missionsFor(match,round);
  assert.equal(ids.length,3);
  assert.deepEqual(ids,engine.missionsFor(match,round));
  assert.deepEqual(ids.map(id=>engine.definitions.find(m=>m.id===id)?.tier),['easy','medium','hard']);
 }
});
test('Special rewards are mandatory before host may start next round',()=>{
 const browser={};new Function('window',read('skyjo_tore_special.js'))(browser);
 const x=browser.SkyjoToreSpecial,state={round:1,phase:'play',players:[{name:'Chris',grid:[]}]};
 x.newGame(state,{toreSpecialEnabled:true},'abcdef12-3456-4abc-bcde-123456789abc');
 assert.equal(x.canNextRound(state),false);
 state.skyjoSpecial.finished=true;
 assert.equal(x.canNextRound(state),true);
});

test('The normal Weiter button stays enabled when special runtime is missing',()=>{
 const nextRound=read('skyjo_action-logic-part-19.txt');
 const returnToLobby=read('skyjo_action-logic-part-20.txt');
 assert.match(nextRound,/SkyjoToreSpecial\?\.canNextRound\(state\)===false/);
 assert.match(returnToLobby,/SkyjoToreSpecial\?\.canNextRound\(state\)===false/);
 assert.doesNotMatch(nextRound,/if\(!window\.SkyjoToreSpecial\?\.canNextRound\(state\)\)/);
 // In JavaScript, undefined===false is false: normal games never become blocked.
 assert.equal(undefined===false,false);
 assert.equal(false===false,true);
 assert.equal(true===false,false);
});


test('Online SKYJO hub starts with 2–5 players without an obsolete second lobby',()=>{
 const startup=read('skyjo_action-logic-part-08.txt');
 const render=read('skyjo_action-logic-part-35.txt');
 const legacy=read('skyjo_action-logic-part-22.txt');
 const entry=read('skyjo_action.html');
 assert.match(startup,/SKYJO_IS_HUB\?\(ps\.length<2\|\|ps\.length>5\):ps\.length!==3/);
 assert.match(render,/if\(SKYJO_IS_HUB&&!state\)content=hubLoadingView\(\)/);
 assert.match(render,/if\(isHostDevice\(\)&&!cloud\.doc\.game\)await startOnlineGame\(\)/);
 assert.match(legacy,/function hubLoadingView\(\)/);
 assert.doesNotMatch(entry,/src="skyjo_hub_autostart\.js/);
});
test('Old online SKYJO URLs return to the main shared lobby; hub matches and offline games do not',()=>{
 const script=read('skyjo_online_hub_redirect.js');
 const navigate=(query)=>{
  let redirected=null;
  const location={href:'https://schmitti92.github.io/Spiel-client/Skyjo/skyjo_action.html?'+query,
   replace:to=>{redirected=to;}};
  new Function('location',script)(location);
  return redirected;
 };
 const old=navigate('mode=online&room=473');
 assert.match(old,/spielauswahl-online\.html\?room=473&stay=1/);
 const oldUnmapped=navigate('mode=online&room=S473AAAAAA');
 assert.match(oldUnmapped,/spielauswahl-online\.html\?stay=1/);
 const valid=navigate('mode=online&hub=473&match=01234567-89ab-4cde-a123-456789abcdef&room=S473AAAAAA');
 assert.equal(valid,null);
 assert.equal(navigate('mode=local&testPlayers=2'),null);
});


test('Shared Monster Slots prominently identify the active winner and the spectator',()=>{
 const browser={};new Function('window',read('skyjo_tore_special.js'))(browser);
 const show={index:0,players:[
  {uid:'chris-id',name:'Chris',winner:false,missionIds:['one-row'],prizes:[{kind:'chest'},{kind:'joker'}]},
  {uid:'moin-id',name:'Moin',winner:true,missionIds:['three-streets','open-zero'],prizes:Array.from({length:12},()=>({kind:'pack'}))}
 ]};
 const current=browser.SkyjoToreSpecial.playerSpotlight(show,'chris-id');
 assert.equal(current.name,'Chris');
 assert.equal(current.mine,true);
 assert.equal(current.position,1);
 assert.equal(current.total,2);
 assert.equal(current.slots,2);
 assert.match(current.role,/MISSIONSGEWINNER/);
 assert.match(current.viewerLabel,/DU BIST DRAN/);
 const viewer=browser.SkyjoToreSpecial.playerSpotlight(show,'moin-id');
 assert.equal(viewer.mine,false);
 assert.match(viewer.viewerLabel,/DU SCHAUST ZU/);
 show.index=1;
 const champion=browser.SkyjoToreSpecial.playerSpotlight(show,'chris-id');
 assert.equal(champion.name,'Moin');
 assert.equal(champion.slots,12);
 assert.equal(champion.position,2);
 assert.match(champion.role,/RUNDENSIEGER/);
 assert.match(champion.viewerLabel,/DU SCHAUST ZU/);
 assert.equal(browser.SkyjoToreSpecial.playerSpotlight(show,'moin-id').mine,true);
});
test('Slot recipient remains visible from spin start through win and confirmation',()=>{
 const js=read('skyjo_tore_special.js');
 const css=read('skyjo_tore_special.css');
 assert.match(js,/class="skyjo-slot-owner-bar"/);
 assert.match(js,/class="skyjo-slot-owner-name"/);
 assert.match(js,/id="skyjo-slot-owner-phase"/);
 assert.match(js,/id="skyjo-slot-viewer-role"/);
 assert.match(js,/skyjo-slot-queue-player/);
 assert.match(js,/Alle Preise aus diesem Dreh gehören/);
 assert.match(js,/HAT GEWONNEN/);
 assert.match(js,/DREHT GERADE/);
 assert.match(js,/is-current/);
 assert.match(css,/\.skyjo-slot-owner-name/);
 assert.match(css,/data-viewer="owner"/);
 assert.match(css,/@media\(max-width:620px\)/);
});


test('Every player receives a stable new Joker bonus card at round start',()=>{
 const browser={};new Function('window',read('skyjo_tore_special.js'))(browser);
 const x=browser.SkyjoToreSpecial;
 const match='01234567-89ab-4cde-a123-456789abcdef';
 const game={round:1,phase:'initialReveal',layoutMode:'classic',players:
  ['Chris','Vanessa','David'].map(name=>({name,grid:Array.from({length:12},()=>({type:'number',value:3,faceUp:false}))}))};
 x.newGame(game,{toreSpecialEnabled:true},match);
 for(let i=0;i<game.players.length;i++){
  const idx=game.skyjoSpecial.bonusCells[i];
  assert.ok(idx>=0&&idx<12);
  assert.equal(idx,x.bonusIndex(match,1,i,12));
 }
 const old=JSON.stringify(game.skyjoSpecial.bonusCells);
 game.round=2;x.beginRound(game);
 assert.notEqual(JSON.stringify(game.skyjoSpecial.bonusCells),old);
 assert.deepEqual(game.skyjoSpecial.progress,{});
 assert.equal(game.skyjoSpecial.finished,false);
});
test('Joker target earns +2 only on the final board, and missions/win/bonus are additive',()=>{
 const browser={};new Function('window',read('skyjo_tore_special.js'))(browser);
 const x=browser.SkyjoToreSpecial;
 const match='01234567-89ab-4cde-a123-456789abcdef';
 const game={round:1,phase:'betweenRounds',layoutMode:'classic',players:
  ['Chris','Vanessa','David'].map(name=>({name,grid:Array.from({length:12},()=>({type:'number',value:3,faceUp:true}))}))};
 x.newGame(game,{toreSpecialEnabled:true},match);
 game.skyjoSpecial.progress[0]={rows:3,columns:3,groups:5,streets:3,twelveRows:1,zeroSeen:1,jokerSeen:1,zerosAtOnce:2,jokersAtOnce:2,boardClear:1};
 game.lastRoundSummary={round:1,players:game.players.map((player,i)=>({index:i,name:player.name,round:[-15,5,8][i],
  gridSnapshot:structuredClone(player.grid)}))};
 const idx=game.skyjoSpecial.bonusCells[0];
 game.lastRoundSummary.players[0].gridSnapshot[idx]={type:'star',faceUp:true};
 const rows=x.slotBreakdown(game);
 assert.equal(rows[0].bonusSlots,2);
 assert.equal(rows[0].winnerSlots,2);
 assert.equal(rows[0].slots,rows[0].missionSlots+rows[0].winnerSlots+rows[0].bonusSlots);
 assert.equal(rows[1].bonusSlots,0);
 game.lastRoundSummary.players[0].gridSnapshot[idx]=null; // Removed before scoring
 assert.equal(x.slotBreakdown(game)[0].bonusSlots,0);
});
test('Bonus field remains clearly marked in board UI and each prize is attributed to its player',()=>{
 const js=read('skyjo_tore_special.js'),css=read('skyjo_tore_special.css');
 assert.match(js,/function markCells\(game\)/);
 assert.match(js,/cell-'\+i\+'-grid-'\+index/);
 assert.match(js,/node\.classList\.add\('skyjo-tore-joker-bonus-cell'\)/);
 assert.match(css,/\.card-slot\.skyjo-tore-joker-bonus-cell::before/);
 assert.match(css,/content:"🃏 \+2 🎰"/);
 assert.match(css,/data-bonus-won="yes"/);
 assert.match(js,/missionSlots\+winnerSlots\+bonusSlots/);
 assert.match(js,/r\.prizes\.length!==slots/);
 assert.match(js,/Alle Preise aus diesem Dreh gehören/);
 assert.match(js,/show\.batch\+1<batch\.total/);
 assert.match(js,/show\.index\+1<show\.players\.length/);
 assert.match(js,/Math\.ceil\(player\.prizes\.length\/12\)/);
});


test('Every earned reel survives 12-reel batches and players rotate one after another',()=>{
 const browser={};new Function('window',read('skyjo_tore_special.js'))(browser);
 const x=browser.SkyjoToreSpecial;
 const players=[
  {uid:'first',name:'Chris',slots:20,prizes:Array.from({length:20},(_,i)=>({kind:'cash',label:String(i+1)}))},
  {uid:'second',name:'Vanessa',slots:14,prizes:Array.from({length:14},(_,i)=>({kind:'pack',label:String(i+1)}))},
  {uid:'third',name:'David',slots:2,prizes:Array.from({length:2},(_,i)=>({kind:'chest',label:String(i+1)}))}
 ];
 const show={players,index:0,batch:0};
 const observed=[],perPlayer={};
 for(let k=0;k<players.length;k++){
  show.index=k;show.batch=0;const grouped=[];
  while(true){
   const part=x.currentBatch(show);
   assert.equal(part.player.uid,players[k].uid);
   assert.ok(part.prizes.length<=12);
   grouped.push(part.prizes.length);
   observed.push(...part.prizes.map(p=>players[k].uid+':'+p.label));
   if(show.batch+1>=part.total)break;
   show.batch++;
  }
  perPlayer[players[k].uid]=grouped;
  assert.equal(grouped.reduce((a,b)=>a+b,0),players[k].slots);
 }
 assert.deepEqual(perPlayer,{first:[12,8],second:[12,2],third:[2]});
 assert.equal(observed.length,36);
 assert.equal(new Set(observed).size,36);
 assert.deepEqual(observed.slice(0,20).map(v=>v.split(':')[0]),Array(20).fill('first'));
 assert.deepEqual(observed.slice(20,34).map(v=>v.split(':')[0]),Array(14).fill('second'));
});


test('SKYJO card-pack prizes are voucher receipts, not automatically opened at the slot',()=>{
 const js=read('skyjo_tore_special.js');
 const inbox=read('../DealOrNoDeal/js/skyjo-slot-inbox.js');
 const css=read('../DealOrNoDeal/css/skyjo-slot-inbox.css');
 assert.match(js,/voucher:p\.voucher===true/);
 assert.match(js,/p\.voucher\?' · 🎟️ Gutschein'/);
 assert.match(inbox,/p\.kind==='pack'&&p\.voucher/);
 assert.match(inbox,/weihnachtswelt\.html\?view=packs/);
 assert.match(inbox,/noch nicht geöffnet/);
 assert.match(inbox,/bleiben auch nach dem Bestätigen erhalten/);
 assert.match(css,/skyjo-inbox-voucher-link/);
 assert.doesNotThrow(()=>new Function(inbox));
});
test('DOG pack redemption already displays the voucher count and a standard card reveal',()=>{
 const source=read('../DealOrNoDeal/js/dog-album-season2.js');
 assert.match(source,/data\.freePacks\?\.\[pack\.id\]/);
 assert.match(source,/Kostenlos öffnen/);
 assert.match(source,/reveal\(out\.revealed\|\|\[\]\)/);
 assert.match(source,/NEU/);
});


test('Mission progress from automatic round-end removals is credited, not silently lost',()=>{
 const browser={};new Function('window',read('skyjo_tore_special.js'))(browser);
 const special=browser.SkyjoToreSpecial;
 const match='01234567-89ab-4cde-a123-456789abcdef';
 const game={round:1,phase:'play',players:[{name:'Chris',grid:Array.from({length:12},()=>({type:'number',value:12,faceUp:true}))}]};
 special.newGame(game,{toreSpecialEnabled:true},match);
 const cards=Array.from({length:4},()=>({type:'number',value:12,faceUp:true}));
 special.trackRemove(game,0,{name:'Reihe 1',idx:[0,1,2,3]},cards);
 assert.equal(game.skyjoSpecial.progress[0].rows,1);
 assert.equal(game.skyjoSpecial.progress[0].groups,1);
 game.phase='roundReveal';
 game.roundClose={stage:'remove'};
 special.trackRemove(game,0,{name:'Reihe 2',idx:[4,5,6,7]},cards);
 assert.equal(game.skyjoSpecial.progress[0].rows,2);
 assert.equal(game.skyjoSpecial.progress[0].groups,2);
 special.trackRemove(game,0,{name:'Straße Spalte 1',street:true,idx:[0,4,8]},cards.slice(0,3));
 assert.equal(game.skyjoSpecial.progress[0].streets,1);
 assert.equal(game.skyjoSpecial.progress[0].groups,3);
 game.roundClose.stage='ready';
 special.trackRemove(game,0,{name:'Reihe 3',idx:[8,9,10,11]},cards);
 assert.equal(game.skyjoSpecial.progress[0].rows,2,'Never award for hypothetical removals');
 game.lastRoundSummary={round:1,players:[{index:0,name:'Chris',round:12,gridSnapshot:game.players[0].grid}]};
 game.phase='betweenRounds';
 const expected=game.skyjoSpecial.missions.map(id=>special.definitions.find(m=>m.id===id)).
  filter(m=>m&&special.missionDone(m,game.skyjoSpecial.progress[0],12));
 assert.equal(special.slotBreakdown(game)[0].missionSlots,expected.reduce((n,m)=>n+m.slots,0));
});
test('Mission heads-up display shows accumulated reels before the final scoring',()=>{
 const browser={};new Function('window',read('skyjo_tore_special.js'))(browser);
 const special=browser.SkyjoToreSpecial;
 const match='01234567-89ab-4cde-a123-456789abcdef';
 const game={round:1,phase:'play',players:[{name:'Chris',grid:Array.from({length:12},()=>({type:'number',value:12,faceUp:true}))}]};
 special.newGame(game,{toreSpecialEnabled:true},match);
 special.trackRemove(game,0,{name:'Reihe 1',idx:[0,1,2,3]},Array.from({length:4},()=>({type:'number',value:12,faceUp:true})));
 const html=special.hud(game,0);
 assert.match(html,/Missionen · .*Slots erspielt/);
 assert.match(html,/Dreh erst NACH der Rundenwertung/);
});


test('SKYJO payout waits for a successfully persisted final scoreboard',()=>{
 const source=read('skyjo_tore_special.js');
 assert.match(source,/const cloudSaved=await bridge\.waitForCloudIdle\(7500\);/);
 assert.match(source,/if\(!cloudSaved\)throw Error\('Die Rundenwertung/);
 assert.match(source,/game\.phase==='roundReveal'&&game\.roundClose\?\.stage==='remove'/);
});


test('One synchronized 12-reel window shows winner, all reels, readable list and fixed actions',()=>{
 const app={};new Function('window',read('skyjo_tore_special.js'))(app);
 const x=app.SkyjoToreSpecial;
 const prior=globalThis.document,created=[];
 globalThis.document={
  createElement(tag){
   const el={tag,dataset:{},setAttribute(name,value){this[name]=value;},focus(){},innerHTML:''};
   created.push(el);return el;
  },
  body:{append(){}}
 };
 try{
  const player={uid:'chris',name:'Chris',winner:true,missionIds:['one-row','one-street'],slots:12,
   missionSlots:8,winnerSlots:2,bonusSlots:2,
   prizes:Array.from({length:12},(_,i)=>({kind:'pack',id:'large',quantity:1,label:'Goldpaket '+(i+1)}))};
  const show={id:'round1',index:0,batch:0,players:[player],phase:'ready'};
  const root=x.createOverlay({},show);
  assert.equal(root.dataset.reels,'12');
  assert.equal(root.dataset.layout,'extended');
  assert.equal((root.innerHTML.match(/class="monster-slot-reel"/g)||[]).length,12);
  assert.equal((root.innerHTML.match(/<div\b/g)||[]).length,(root.innerHTML.match(/<\/div>/g)||[]).length,
   'All DIV tags must be balanced so mobile layout does not collapse');
  assert.match(root.innerHTML,/skyjo-slot-scroll-area/);
  assert.match(root.innerHTML,/skyjo-slot-action-dock/);
  assert.match(root.innerHTML,/skyjo-slot-readable-list/);
  assert.match(root.innerHTML,/role="progressbar"/);
  assert.match(root.innerHTML,/aria-valuemax="12"/);
  assert.match(root.innerHTML,/class="skyjo-slot-owner-name">Chris/);
  assert.match(root.innerHTML,/8<\/b> \+ 🏆 Rundensieg: <b>2<\/b>/);
  assert.match(root.innerHTML,/aria-label="Walze 12 von Chris"/);
  assert.ok(root.innerHTML.indexOf('skyjo-slot-action-dock')>root.innerHTML.indexOf('skyjo-slot-readable-list'));
  assert.match(root['aria-modal'],/true/);
 }finally{globalThis.document=prior;}
});
test('A second 12-reel page keeps the same recipient and continuous reel numbers',()=>{
 const app={};new Function('window',read('skyjo_tore_special.js'))(app);
 const x=app.SkyjoToreSpecial;
 const prior=globalThis.document;
 globalThis.document={
  createElement:tag=>({dataset:{},setAttribute(){},focus(){},innerHTML:''}),
  body:{append(){}}
 };
 try{
  const actor={uid:'moin',name:'Moin',winner:false,missionIds:['three-streets'],slots:20,
   missionSlots:18,winnerSlots:0,bonusSlots:2,
   prizes:Array.from({length:20},(_,i)=>({kind:'cash',label:'Geld '+(i+1)}))};
  const show={id:'round2',index:0,batch:1,players:[actor]};
  const root=x.createOverlay({},show);
  assert.equal(root.dataset.reels,'8');
  assert.equal((root.innerHTML.match(/class="monster-slot-reel"/g)||[]).length,8);
  assert.match(root.innerHTML,/aria-label="Walze 13 von Moin"/);
  assert.match(root.innerHTML,/aria-label="Walze 20 von Moin"/);
  assert.match(root.innerHTML,/DURCHGANG 2\/2/);
  assert.match(root.innerHTML,/class="skyjo-slot-owner-name">Moin/);
 }finally{globalThis.document=prior;}
});
test('Server clock sampling is predictable and ignores broken network measurements',()=>{
 const app={};new Function('window',read('skyjo_tore_special.js'))(app);
 const x=app.SkyjoToreSpecial;
 assert.equal(x.clockOffsetFromSample(1000,1200,1150),50);
 assert.equal(x.clockOffsetFromSample(1000,1000,1500),500);
 assert.equal(x.clockOffsetFromSample(1000,15000,1600),null);
 assert.equal(x.clockOffsetFromSample(1200,1000,1100),null);
 assert.equal(x.clockOffsetFromSample(1000,1200,NaN),null);
});
test('Phone and landscape layouts keep readable reels and a permanently visible confirmation bar',()=>{
 const source=read('skyjo_tore_special.js');
 const css=read('skyjo_tore_special.css');
 assert.match(source,/skyjo-health/);
 assert.match(source,/timeBase:serverClockSyncedAt\?'server':'device'/);
 assert.match(source,/stageNow\(show\)/);
 assert.match(css,/Device-safe shared finale/);
 assert.match(css,/\.skyjo-slot-scroll-area\{/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/\.skyjo-slot-action-dock\{/);
 assert.match(css,/flex:0 0 auto/);
 assert.match(css,/@media\(max-width:610px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(css,/\.monster-slot-prize-name\{[\s\S]*?font-size:12px!important/);
 assert.match(css,/height:calc\(100dvh - 8px\)!important/);
 assert.match(css,/touch-action:manipulation/);
});
