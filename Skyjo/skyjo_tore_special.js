/* SKYJO Action · optional 100 Tore Special. No Firestore writes for animation frames. */
(function(){
'use strict';
const DEFINITIONS=[
 ['one-row','Räume eine Reihe ab',2,'easy','rows',1],
 ['one-column','Räume eine Spalte ab',2,'easy','columns',1],
 ['open-zero','Lege eine offene Null auf dein Feld',2,'easy','zeroSeen',1],
 ['open-joker','Platziere einen offenen Joker',2,'easy','jokerSeen',1],
 ['two-groups','Räume zwei Kombinationen ab',2,'easy','groups',2],
 ['two-zero','Habe zwei offene Nullen gleichzeitig',2,'easy','zerosAtOnce',2],
 ['low-five','Beende die Runde mit höchstens 5 Punkten',2,'easy','score',5,true],
 ['one-street','Räume eine Straße ab',4,'medium','streets',1],
 ['two-rows','Räume zwei Reihen ab',4,'medium','rows',2],
 ['two-columns','Räume zwei Spalten ab',4,'medium','columns',2],
 ['twelve-row','Räume eine reine 12er-Reihe ab',6,'medium','twelveRows',1],
 ['two-streets','Räume zwei Straßen ab',6,'medium','streets',2],
 ['below-zero','Beende die Runde mit 0 oder weniger Punkten',4,'medium','score',0,true],
 ['two-jokers','Habe zwei offene Joker gleichzeitig',4,'medium','jokersAtOnce',2],
 ['three-groups','Räume drei Kombinationen ab',4,'medium','groups',3],
 ['three-rows','Räume drei Reihen ab',6,'hard','rows',3],
 ['three-streets','Räume drei Straßen ab',10,'hard','streets',3],
 ['four-groups','Räume vier Kombinationen ab',8,'hard','groups',4],
 ['five-groups','Räume fünf Kombinationen ab',10,'hard','groups',5],
 ['clear-board','Räume dein ganzes Spielfeld ab',10,'hard','boardClear',1],
 ['four-columns','Räume vier Spalten ab',10,'hard','columns',4],
 ['below-minus-ten','Beende die Runde mit −10 oder weniger Punkten',6,'hard','score',-10,true]
].map(r=>({id:r[0],name:r[1],slots:r[2],tier:r[3],field:r[4],at:r[5],less:!!r[6]}));
const LOOKUP=Object.fromEntries(DEFINITIONS.map(m=>[m.id,m]));
const REWARD_ART={
 chest:{wood:'../dog-chest-art/01_Holzkiste.png',iron:'../dog-chest-art/02_Eisenkiste.png',silver:'../dog-chest-art/03_Silberkiste.png',gold:'../dog-chest-art/04_Goldkiste.png',legendary:'../dog-chest-art/05_Legendaere_Kiste.png'},
 pack:{small:'../DealOrNoDeal/assets/slot-premium/slot-pack-silver.png',large:'../DealOrNoDeal/assets/slot-premium/slot-pack-gold.png',premium:'../DealOrNoDeal/assets/slot-premium/slot-pack-premium.png',platinum:'../DealOrNoDeal/assets/hats/reward-platinum.svg'},
 hammer:{single:'../DealOrNoDeal/assets/slot-premium/slot-hammer.png',double:'../DealOrNoDeal/assets/slot-premium/slot-doublehammer.png',lucky:'../DealOrNoDeal/assets/slot-premium/slot-goldhammer.png'},
 joker:'../DealOrNoDeal/assets/slot-premium/slot-joker.png',
 minigame:'../DealOrNoDeal/assets/hats/reveal-gift.svg',
 monster:'../DealOrNoDeal/Weihnachtsevent2/Weihnachtsbilder/file_0000000077288210bd94623e0d40c452.png',
 cash:'../DealOrNoDeal/assets/slot-premium/slot-money.png',
 wildcard:'../DealOrNoDeal/assets/slot-premium/slot-question-card.png'
};
const EMOJIS={chest:'📦',pack:'🎴',hammer:'🔨',joker:'🃏',minigame:'🎟️',monster:'👹',cash:'💰',wildcard:'❓'};
const STOP=(n,i)=>n===1?3000:n===2?(i?4500:3000):n===3?3000+i*1500:n===6?3000+i*1000:3000+i*470;
const DURATION=n=>n===1?4200:n===2?6500:n===3?7800:n<=6?10000:10500;
const api=()=>String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const me=()=>window.SpielOnline?.state?.()?.user;
const esc=x=>String(x==null?'':x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let bridge=null,requestBusy=false,animationTimer=null,renderKey='',lastAutoRound='',lastFinalRound='';
function seed(matchId,round){
 let n=2166136261>>>0;
 for(const ch of String(matchId)+'|'+String(round))n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;
 return n;
}
// Same seeded, validated position function as the authoritative prize server.
function bonusIndex(matchId,round,playerIndex,cardCount=12){
 if(!Number.isSafeInteger(playerIndex)||playerIndex<0||playerIndex>9||
   !Number.isSafeInteger(cardCount)||![12,15].includes(cardCount))
  throw Error('SKYJO_BONUS_FIELD_INVALID');
 let n=(seed(matchId,round)^Math.imul(playerIndex+1,0x9e3779b9))>>>0;
 n^=n>>>16;n=Math.imul(n,0x7feb352d)>>>0;
 n^=n>>>15;n=Math.imul(n,0x846ca68b)>>>0;
 n^=n>>>16;
 return (n>>>0)%cardCount;
}
function bonusCellsFor(game,matchId,round){
 const fields={};
 (game.players||[]).forEach((player,i)=>{
  const count=player?.grid?.length||12;
  fields[i]=bonusIndex(matchId,round,i,count);
 });
 return fields;
}
function missionsFor(matchId,round){
 let n=seed(matchId,round);
 return ['easy','medium','hard'].map(tier=>{
  const pool=DEFINITIONS.filter(m=>m.tier===tier);
  n=(Math.imul(n,1664525)+1013904223)>>>0;
  return pool[n%pool.length].id;
 });
}
function blankProgress(){return {rows:0,columns:0,streets:0,twelveRows:0,groups:0,zeroSeen:0,jokerSeen:0,zerosAtOnce:0,jokersAtOnce:0,boardClear:0};}
function active(game){return !!(game&&game.skyjoSpecial?.enabled&&game.skyjoSpecial.round===game.round);}
function newGame(game,settings,matchId){
 if(settings?.toreSpecialEnabled!==true)return;
 game.skyjoSpecial={enabled:true,matchId,round:game.round,missions:missionsFor(matchId,game.round),
  bonusCells:bonusCellsFor(game,matchId,game.round),
  progress:{},show:null,finished:false};
}
function beginRound(game){
 if(!game?.skyjoSpecial?.enabled)return;
 const x=game.skyjoSpecial;x.round=game.round;x.missions=missionsFor(x.matchId,game.round);
 x.progress={};x.show=null;x.finished=false;
 x.bonusCells=bonusCellsFor(game,x.matchId,game.round);
}
function progressFor(game,pi){
 const all=game.skyjoSpecial.progress||(game.skyjoSpecial.progress={});
 if(!all[pi])all[pi]=blankProgress();
 return all[pi];
}
function trackRemove(game,pi,m,cards){
 if(!active(game)||!m||!Array.isArray(cards)||game.phase!=='play')return;
 const p=progressFor(game,pi),name=String(m.name||'');
 p.groups++;
 if(name.includes('Reihe'))p.rows++;
 if(name.includes('Spalte'))p.columns++;
 if(m.street===true)p.streets++;
 if(name.includes('Reihe')&&cards.length>=3&&cards.every(c=>c?.type==='number'&&Number(c.value)===12))p.twelveRows++;
 const grid=game.players?.[pi]?.grid||[];
 if(grid.length>0&&grid.every(c=>!c))p.boardClear=1;
}
function scan(game){
 if(!active(game)||game.phase!=='play'||game.skyjoSpecial.show)return;
 for(let i=0;i<(game.players||[]).length;i++){
  const cards=(game.players[i].grid||[]).filter(c=>c?.faceUp);
  const zeros=cards.filter(c=>c.type==='number'&&c.value===0).length;
  const jokers=cards.filter(c=>c.type==='star').length;
  if(!zeros&&!jokers&&!game.skyjoSpecial.progress?.[i])continue;
  const p=progressFor(game,i);
  p.zeroSeen=Math.max(p.zeroSeen,zeros>0?1:0);
  p.jokerSeen=Math.max(p.jokerSeen,jokers>0?1:0);
  p.zerosAtOnce=Math.max(p.zerosAtOnce,zeros);
  p.jokersAtOnce=Math.max(p.jokersAtOnce,jokers);
 }
}
function missionDone(m,p,score){
 if(m.less)return Number.isFinite(score)&&score<=m.at;
 return Number(p?.[m.field]||0)>=m.at;
}
// A surviving Joker only counts when it occupies the marked grid position
// in the finalized per-player score snapshot. Removed combinations are null.
function bonusAchieved(game,playerIndex){
 const special=game?.skyjoSpecial;
 if(!special?.bonusCells||!Object.hasOwn(special.bonusCells,playerIndex))return false;
 const cell=Number(special.bonusCells[playerIndex]);
 const board=game.lastRoundSummary?.round===game.round?
  game.lastRoundSummary.players?.[playerIndex]?.gridSnapshot:null;
 return !!board?.[cell]&&board[cell].type==='star'&&board[cell].faceUp===true;
}
function slotBreakdown(game,summary=game?.lastRoundSummary){
 if(!active(game)||!summary||summary.round!==game.round)return [];
 const lowest=Math.min(...summary.players.map(p=>Number(p.round)));
 return summary.players.map((sp,i)=>{
  const progress=game.skyjoSpecial.progress?.[i]||blankProgress();
  const missionIds=game.skyjoSpecial.missions.filter(id=>{
   const m=LOOKUP[id];return !!m&&missionDone(m,progress,Number(sp.round));
  });
  const missionSlots=missionIds.reduce((n,id)=>n+LOOKUP[id].slots,0);
  const winnerSlots=Number(sp.round)===lowest?2:0;
  const bonusSlots=bonusAchieved(game,i)?2:0;
  return {index:i,name:sp.name,missionIds,missionSlots,winnerSlots,
   bonusSlots,slots:missionSlots+winnerSlots+bonusSlots};
 });
}
function markCells(game){
 if(!active(game)||!game.skyjoSpecial.bonusCells)return;
 const cells=game.skyjoSpecial.bonusCells;
 (game.players||[]).forEach((player,i)=>{
  const index=cells[i];if(!Number.isSafeInteger(index)||index<0||index>=player.grid.length)return;
  const node=document.getElementById('cell-'+i+'-grid-'+index);
  if(!node)return;
  node.classList.add('skyjo-tore-joker-bonus-cell');
  node.dataset.bonusJoker='2';
  node.setAttribute('title','🎯 Joker-Bonusfeld: Ein Joker an dieser Stelle bei der Rundenwertung bringt 2 zusätzliche Slot-Gewinne.');
  node.setAttribute('aria-label','Joker-Bonusfeld für '+player.name+': Joker bis zur Auszählung behalten für zwei zusätzliche Slot-Gewinne');
  node.dataset.bonusWon=bonusAchieved(game,i)?'yes':'no';
 });
}
function hud(game,index){
 if(!active(game)||index<0)return '';
 const p=game.skyjoSpecial.progress?.[index]||blankProgress();
 const scored=game.lastRoundSummary?.players?.[index]?.round;
 const results=game.skyjoSpecial.missions.map(id=>{
  const m=LOOKUP[id];if(!m)return '';
  const won=missionDone(m,p,game.phase==='play'?NaN:Number(scored));
  return '<div class="skyjo-tore-mission '+(won?'done':'')+'"><span>'+(won?'✅':'🎯')+'</span><span>'+esc(m.name)+'</span><strong>'+m.slots+' 🎰</strong></div>';
 }).join('');
 const completed=game.skyjoSpecial.missions.filter(id=>LOOKUP[id]&&missionDone(LOOKUP[id],p,game.phase==='play'?NaN:Number(scored))).length;
 const target=game.skyjoSpecial.bonusCells?.[index];
 const columns=game.layoutMode==='xl'?5:4;
 const where=Number.isSafeInteger(target)?('Reihe '+(Math.floor(target/columns)+1)+' · Spalte '+(target%columns+1)):'';
 const bonusText=Number.isSafeInteger(target)?
  (bonusAchieved(game,index)?'✅ Joker-Bonusfeld erfüllt · +2 Slots':
   '🃏 Joker-Zielfeld ('+where+') · Joker bei der Schlusswertung = +2 Slots'):'';
 return '<div class="skyjo-tore-hud" aria-label="100 Tore Special Missionen"><div class="skyjo-tore-head">🎰 100 TORE SPECIAL <small>'+completed+'/3 Missionen erfüllt · Slot-Finale erst NACH der Runde</small></div><div class="skyjo-tore-grid">'+results+'</div>'+
  (bonusText?'<div class="skyjo-tore-bonus-hint">'+bonusText+'</div>':'')+'</div>';
}
function nextButton(game,summary,defaultHTML,host){
 if(!active(game)||summary?.round!==game.round)return defaultHTML;
 const special=game.skyjoSpecial;
 if(special.finished)return defaultHTML;
 const awards=slotBreakdown(game,summary);
 const overview=awards.map(row=>'<span class="skyjo-slot-breakdown-person">'+esc(row.name)+
  ': 🎯 '+row.missionSlots+' + 🏆 '+row.winnerSlots+' + 🃏 '+row.bonusSlots+
  ' = <b>'+row.slots+' Slots</b></span>').join('');
 const label='<div class="skyjo-slot-breakdown" aria-label="Gesammelte Slots je Spieler">'+overview+'</div>';
 if(!host)return label+'<div class="sky-score-wait">🎰 Nach der Wertung drehen alle Spieler hintereinander. Warte auf den Host.</div>';
 return label+'<button class="sky-score-next skyjo-tore-launch" onclick="Game.skyjoSpecialBegin()" '+(requestBusy?'disabled':'')+'>🎰 ALLE '+awards.reduce((a,r)=>a+r.slots,0)+' SLOTS GEMEINSAM DREHEN <span>❯❯</span></button>';
}
function canNextRound(game){return !active(game)||game.skyjoSpecial.finished===true;}
function currentBatch(show){
 const player=show?.players?.[show.index];if(!player)return null;
 const offset=Number(show.batch||0)*12;
 const prizes=player.prizes.slice(offset,offset+12);
 return {player,prizes,offset,total:Math.ceil(player.prizes.length/12)};
}
async function authPost(url,body){
 const user=me();if(!user||typeof user.getIdToken!=='function')throw Error('Bitte zuerst anmelden');
 const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),40000);
 try{
  const r=await fetch(api()+url,{method:'POST',cache:'no-store',signal:ctl.signal,
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+await user.getIdToken()},
   body:JSON.stringify(body)});
  const data=await r.json();
  if(!r.ok||!data?.ok)throw Error(data?.error||'Belohnungs-Server nicht erreichbar');
  return data;
 }finally{clearTimeout(tm);}
}
async function begin(){
 const state=bridge?.getState(),special=state?.skyjoSpecial;
 if(!active(state)||!bridge?.isHost()||requestBusy)return;
 if(special.finished){if(state.phase==='betweenRounds')bridge.nextRound();else bridge.openFinale();return;}
 if(special.show){render(state);return;}
 if(!state.lastRoundSummary||!['betweenRounds','gameOver'].includes(state.phase))return;
 requestBusy=true;
 const round=state.round,id=state.lastRoundSummary.id;
 bridge.toast('🎰 Gewinne werden serverseitig geprüft und sicher gutgeschrieben …');
 try{
  await bridge.waitForCloudIdle(7500);
  const data=await authPost('/api/deal-or-no-deal/skyjo-special/settle',{
   hubCode:bridge.hubCode(),matchId:special.matchId,round});
  const now=bridge.getState();
  if(!active(now)||now.round!==round||now.lastRoundSummary?.id!==id)throw Error('Runde hat sich zwischenzeitlich verändert');
  if(!Array.isArray(data.results)||data.results.length!==now.players?.length)
   throw Error('SKYJO_AWARDS_INCOMPLETE');
  const byMember=data.results.map(r=>{
   const slots=Number(r.slots);
   const missionSlots=Number(r.missionSlots||0),winnerSlots=Number(r.winnerSlots||0),bonusSlots=Number(r.bonusSlots||0);
   if(!Number.isSafeInteger(slots)||slots<0||slots>32||
      missionSlots+winnerSlots+bonusSlots!==slots||
      !Array.isArray(r.prizes)||r.prizes.length!==slots)throw Error('SKYJO_AWARDS_INCOMPLETE');
   return {uid:r.uid,name:r.name,slots,missionIds:r.missionIds||[],winner:!!r.winner,
    missionSlots,winnerSlots,bonusSlots,bonusAchieved:!!r.bonusAchieved,
    prizes:r.prizes.map(p=>({kind:p.kind,id:p.id||null,quantity:Number(p.quantity)||1,
     label:p.label,rarity:p.rarity,amountCents:p.amountCents??null}))};
  }).filter(p=>p.slots>0);
  // The champion goes last; everyone sees every other player's prizes.
  byMember.sort((a,b)=>Number(a.winner)-Number(b.winner));
  const x=now.skyjoSpecial;
  x.show=byMember.length?{id,round,players:byMember,index:0,batch:0,phase:'ready',activatedAt:Date.now(),startedAt:0}:null;
  x.finished=!byMember.length;
  bridge.closeModal();bridge.save();bridge.render();
  bridge.toast(byMember.length?'🎰 Alle Spieler schauen zu: das gemeinsame Slot-Finale beginnt!':'Keine Slots gewonnen – nächste Runde bereit.');
 }catch(e){bridge.toast('⚠ Slot-Finale nicht gestartet: '+String(e.message||e));}
 finally{requestBusy=false;}
}
function actorAllowed(show){
 if(!bridge||!show)return false;
 const player=show.players?.[show.index];
 if(!player)return false;
 return player.uid===me()?.uid||(bridge.isHost()&&Date.now()-Number(show.activatedAt||0)>30000);
}
function spin(){
 const game=bridge?.getState(),show=game?.skyjoSpecial?.show;
 if(!active(game)||!show||show.phase!=='ready'||!actorAllowed(show))return;
 show.phase='rolling';show.startedAt=Date.now()+900;bridge.save();bridge.render();
}
function advance(){
 const game=bridge?.getState(),show=game?.skyjoSpecial?.show;
 if(!active(game)||!show||show.phase!=='rolling'||!actorAllowed(show))return;
 const batch=currentBatch(show);
 if(!batch||Date.now()-show.startedAt<DURATION(batch.prizes.length))return;
 if(show.batch+1<batch.total){show.batch++;show.phase='ready';show.activatedAt=Date.now();show.startedAt=0;}
 else if(show.index+1<show.players.length){show.index++;show.batch=0;show.phase='ready';show.activatedAt=Date.now();show.startedAt=0;}
 else{game.skyjoSpecial.show=null;game.skyjoSpecial.finished=true;}
 bridge.save();bridge.render();
 if(!game.skyjoSpecial.show)bridge.toast('🎉 Alle Monster-Slots abgeschlossen! Der Host kann die Runde fortsetzen.');
}
function imagePath(prize){
 const entry=REWARD_ART[prize?.kind];return typeof entry==='string'?entry:entry?.[prize?.id]||'';
}
// All clients derive the same recipient/order from the synchronized show.
// Only the "you" / "spectator" badge depends on the local signed-in user.
function playerSpotlight(show,viewerUid){
 const recipient=show?.players?.[show?.index];
 if(!recipient)return null;
 const recipientName=String(recipient.name||'Spieler');
 const mine=!!viewerUid&&recipient.uid===viewerUid;
 const role=recipient.winner?'🏆 RUNDENSIEGER':'🎯 MISSIONSGEWINNER';
 const count=Array.isArray(recipient.prizes)?recipient.prizes.length:0;
 return {name:recipientName,mine,role,slots:count,missionCount:recipient.missionIds?.length||0,
  position:Number(show.index||0)+1,total:show.players?.length||1,
  viewerLabel:mine?'⭐ DU BIST DRAN':'👀 DU SCHAUST ZU'};
}
function createOverlay(game,show){
 const batch=currentBatch(show);if(!batch)return null;
 const n=batch.prizes.length,player=batch.player;
 const spotlight=playerSpotlight(show,me()?.uid);
 const queue=show.players.map((p,i)=>{
  const status=i<show.index?'✅':i===show.index?'🎰':'⏳';
  const label=p.winner?'🏆':'🎯';
  return '<span class="skyjo-slot-queue-player'+(i===show.index?' is-current':'')+
   (i<show.index?' is-done':'')+'"'+(i===show.index?' aria-current="step"':'')+'>'+status+
   ' '+label+' '+esc(p.name||'Spieler')+'</span>';
 }).join('');
 const root=document.createElement('section');
 root.id='deal-monster-slots';root.className='skyjo-monster-special';root.tabIndex=-1;
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.setAttribute('aria-label','SKYJO Monster Slots · '+player.name);
 root.dataset.reels=String(n);root.dataset.layout=n>6?'extended':'classic';root.dataset.phase='ready';
 const reels=batch.prizes.map((_,i)=>{
  const num=String(i+batch.offset+1).padStart(2,'0');
  const rolling=['📦','🎴','🔨','💰','👹','🃏','🎁','💎','📦','🎴','🔨','💰'];
  return '<div class="monster-slot-reel" data-reel="'+i+'" data-phase="ready">'+
   '<div class="monster-slot-reel-head"><span class="monster-slot-led"></span>WALZE '+num+'<span class="monster-slot-led"></span></div>'+
   '<div class="monster-slot-window"><div class="monster-slot-track" aria-hidden="true">'+
   rolling.concat(rolling).map(sym=>'<span class="monster-slot-track-symbol">'+sym+'</span>').join('')+
   '</div><div class="monster-slot-prize" hidden><div class="monster-slot-art"></div><span class="monster-slot-quantity"></span><strong class="monster-slot-prize-name"></strong></div><div class="monster-slot-glass"></div></div>'+
   '<div class="monster-slot-reel-foot"><span class="monster-slot-state">BEREIT</span><span>✦</span></div></div>';
 }).join('');
 root.innerHTML='<div class="monster-slot-machine"><div class="monster-slot-lights">✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦</div>'+
  '<div class="monster-slot-kicker">✦ SKYJO ACTION · 100 TORE SPECIAL ✦</div>'+
  '<h2 id="monster-slots-title">🎰 MONSTER SLOTS</h2>'+
  '<div class="skyjo-slot-owner-bar" aria-label="Aktueller Slot-Gewinner">'+
    '<div class="skyjo-slot-owner-icon" aria-hidden="true">'+(player.winner?'🏆':'🎯')+'</div>'+
    '<div class="skyjo-slot-owner-center">'+
      '<div class="skyjo-slot-owner-label" id="skyjo-slot-owner-phase">🎰 JETZT DREHT</div>'+
      '<div class="skyjo-slot-owner-name">'+esc(spotlight.name)+'</div>'+
      '<div class="skyjo-slot-owner-role">'+spotlight.role+' · '+spotlight.slots+' GEWINNE · '+spotlight.missionCount+' MISSIONEN</div>'+
    '</div>'+
    '<div class="skyjo-slot-owner-rolebox">'+
      '<strong class="skyjo-slot-owner-me" id="skyjo-slot-viewer-role">'+spotlight.viewerLabel+'</strong>'+
      '<span>SPIELER '+spotlight.position+' VON '+spotlight.total+'</span>'+
    '</div>'+
  '</div>'+
  '<p class="skyjo-slot-owner-credit" id="skyjo-slot-owner-credit">🎁 Alle Preise aus diesem Dreh gehören '+esc(spotlight.name)+'.</p>'+
  '<p class="skyjo-slot-owner-breakdown">🎯 Missionen: <b>'+Number(player.missionSlots||0)+'</b> + 🏆 Rundensieg: <b>'+Number(player.winnerSlots||0)+'</b> + 🃏 Joker-Bonusfeld: <b>'+Number(player.bonusSlots||0)+'</b> = <strong>'+Number(player.slots||0)+' Slots</strong></p>'+
  '<div class="skyjo-slot-queue" aria-label="Reihenfolge der Slot-Gewinner">'+queue+'</div>'+
  '<p class="monster-slot-subheading">'+n+' WALZEN · '+n+' GARANTIERTE GEWINNE'+(batch.total>1?' · DURCHGANG '+(show.batch+1)+'/'+batch.total:'')+'</p>'+
  '<div class="monster-slot-ribbon">✧ JEDER SLOT GEWINNT ✧</div>'+
  '<div class="monster-slot-reels">'+reels+'</div>'+
  '<div class="monster-slot-progress">'+batch.prizes.map(()=>'<span></span>').join('')+'</div>'+
  '<p class="monster-slot-status" id="skyjo-special-status" aria-live="polite"></p>'+
  '<button id="monster-slot-accept" type="button" onclick="Game.skyjoSpecialSpin()">🎰 Drehen</button>'+
  '<p class="monster-slot-footnote">Alle Gewinne sind bereits sicher im Deal-or-No-Deal-Inventar gespeichert. Beim nächsten Besuch erscheint dein Sammelfenster.</p>'+
  '</div>';
 document.body.append(root);root.focus({preventScroll:true});
 return root;
}
function renderPrizes(root,show){
 const batch=currentBatch(show);if(!batch)return;
 const n=batch.prizes.length,now=Date.now(),elapsed=show.phase==='rolling'?now-show.startedAt:-999999;
 const done=show.phase==='rolling'&&elapsed>=DURATION(n);
 const actor=actorAllowed(show),isMine=batch.player.uid===me()?.uid;
 const reels=[...root.querySelectorAll('.monster-slot-reel')],lights=[...root.querySelectorAll('.monster-slot-progress span')];
 batch.prizes.forEach((p,i)=>{
  const finished=elapsed>=STOP(n,i);
  const el=reels[i];if(!el)return;
  const next=show.phase==='rolling'?(finished?'won':'running'):'ready';
  if(el.dataset.phase!==next){el.dataset.phase=next;el.querySelector('.monster-slot-state').textContent=next==='won'?'✓ GEWONNEN':next==='running'?'DREHT …':'BEREIT';}
  if(finished&&!el.dataset.award){
   el.dataset.award=p.kind||'';el.dataset.variant=p.id||'';el.dataset.rarity=p.rarity||'common';
   const prize=el.querySelector('.monster-slot-prize');
   const path=imagePath(p);
   const fallback='<span class="monster-slot-emoji">'+(EMOJIS[p.kind]||'🎁')+'</span>';
   prize.querySelector('.monster-slot-art').innerHTML=fallback+(path?'<img src="'+esc(path)+'" alt="" loading="eager" style="opacity:1">':'');
   prize.querySelector('.monster-slot-quantity').textContent=p.kind==='cash'?'💶 GELD':(p.quantity||1)+'×';
   prize.querySelector('.monster-slot-prize-name').textContent=p.label||'Gewinn';
   prize.hidden=false;lights[i]?.classList.add('lit');
  }
 });
 root.dataset.phase=done?'ended':show.phase;
 root.dataset.viewer=isMine?'owner':'spectator';
 const spotlight=playerSpotlight(show,me()?.uid);
 const phase=root.querySelector('#skyjo-slot-owner-phase');
 const viewer=root.querySelector('#skyjo-slot-viewer-role');
 const credit=root.querySelector('#skyjo-slot-owner-credit');
 if(phase)phase.textContent=done?'🎉 HAT GEWONNEN':show.phase==='rolling'?'🎰 DREHT GERADE':'🎰 JETZT AN DER REIHE';
 if(viewer)viewer.textContent=spotlight?.viewerLabel||'👀 ZUSCHAUER';
 if(credit)credit.textContent=done
  ?'✅ '+batch.player.name+' hat '+n+' Gewinne aufgedeckt – sie gehören ausschließlich diesem Spieler.'
  :'🎁 Alle '+n+' Gewinne aus diesem Dreh gehören '+batch.player.name+'.';
 const status=root.querySelector('#skyjo-special-status'),button=root.querySelector('#monster-slot-accept');
 if(show.phase==='ready'){
  status.textContent=isMine?'🎰 Du bist dran – alle Spieler schauen zu!':batch.player.name+' dreht als Nächstes.';
  button.textContent=isMine?'🎰 Meine '+n+' Walzen gleichzeitig drehen':actor?'⏳ Für abwesenden Spieler fortsetzen':'👀 Zuschauer · '+batch.player.name+' ist am Zug';
  button.disabled=!actor;button.onclick=spin;
 }else if(!done){
  status.textContent=elapsed<0?'🎬 Gemeinsamer Dreh beginnt …':'🎰 Alle '+n+' Walzen drehen – die Gewinne werden nacheinander aufgedeckt!';
  button.textContent='⏳ Die Walzen drehen …';button.disabled=true;
 }else{
  status.textContent='🎁 '+batch.player.name+': '+n+' Gewinne aufgedeckt und gutgeschrieben!';
  button.textContent=isMine?'✅ Alle Gewinne bestätigen · weiter':actor?'⏳ Für abwesenden Spieler bestätigen':'👀 Zuschauer · Bestätigung ausstehend';
  button.disabled=!actor;button.onclick=advance;
 }
}
function render(game){
 markCells(game);
 const show=active(game)?game.skyjoSpecial.show:null;
 let root=document.querySelector('body > #deal-monster-slots.skyjo-monster-special');
 if(!show){
  if(root)root.remove();renderKey='';
  if(animationTimer){clearInterval(animationTimer);animationTimer=null}
  if(active(game)&&game.skyjoSpecial.finished===true&&bridge){
   const key=game.skyjoSpecial.matchId+':'+game.round;
   if(game.phase==='betweenRounds'&&bridge.isHost()&&lastAutoRound!==key){
    lastAutoRound=key;
    setTimeout(()=>{
     const current=bridge?.getState();
     if(current?.skyjoSpecial?.finished===true&&current.round===game.round&&current.phase==='betweenRounds'&&bridge.isHost())void bridge.nextRound();
    },1200);
   }else if(game.phase==='gameOver'&&lastFinalRound!==key){
    lastFinalRound=key;
    setTimeout(()=>{
     const current=bridge?.getState();
     if(current?.phase==='gameOver'&&current.skyjoSpecial?.finished===true)bridge.openFinale();
    },500);
   }
  }
  return;
 }
 const batch=currentBatch(show);if(!batch)return;
 const key=show.id+'|'+show.index+'|'+show.batch;
 if(!root||key!==renderKey){root?.remove();root=createOverlay(game,show);renderKey=key;}
 if(root)renderPrizes(root,show);
 if(!animationTimer)animationTimer=setInterval(()=>{
  const current=bridge?.getState(),s=active(current)?current.skyjoSpecial.show:null;
  if(!s){render(current);return;}
  const el=document.querySelector('body > #deal-monster-slots.skyjo-monster-special');
  if(!el||renderKey!==s.id+'|'+s.index+'|'+s.batch){render(current);return;}
  renderPrizes(el,s);
 },160);
}
function attach(gameAPI,b){
 bridge=b;
 gameAPI.skyjoSpecialBegin=begin;
 gameAPI.skyjoSpecialSpin=spin;
 gameAPI.skyjoSpecialAdvance=advance;
}
window.SkyjoToreSpecial={newGame,beginRound,trackRemove,scan,hud,nextButton,canNextRound,attach,render,
 missionsFor,missionDone,bonusIndex,bonusAchieved,bonusCellsFor,slotBreakdown,currentBatch,playerSpotlight,definitions:DEFINITIONS};
})();