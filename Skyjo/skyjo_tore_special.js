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
let bridge=null,requestBusy=false,animationTimer=null,renderKey='';
function seed(matchId,round){
 let n=2166136261>>>0;
 for(const ch of String(matchId)+'|'+String(round))n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;
 return n;
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
  progress:{},show:null,finished:false};
}
function beginRound(game){
 if(!game?.skyjoSpecial?.enabled)return;
 const x=game.skyjoSpecial;x.round=game.round;x.missions=missionsFor(x.matchId,game.round);
 x.progress={};x.show=null;x.finished=false;
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
 return '<div class="skyjo-tore-hud" aria-label="100 Tore Special Missionen"><div class="skyjo-tore-head">🎰 100 TORE SPECIAL <small>'+completed+'/3 Missionen erfüllt · Slot-Finale erst NACH der Runde</small></div><div class="skyjo-tore-grid">'+results+'</div></div>';
}
function nextButton(game,summary,defaultHTML,host){
 if(!active(game)||summary?.round!==game.round)return defaultHTML;
 const special=game.skyjoSpecial;
 if(special.finished)return defaultHTML;
 if(!host)return '<div class="sky-score-wait">🎰 Alle Missionen werden nach der Wertung gemeinsam am Monster-Slot aufgedeckt. Warte auf den Host.</div>';
 return '<button class="sky-score-next skyjo-tore-launch" onclick="Game.skyjoSpecialBegin()" '+(requestBusy?'disabled':'')+'>🎰 MONSTER SLOTS · ALLE GEWINNE DREHEN <span>❯❯</span></button>';
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
  const byMember=data.results.map((r,i)=>({
   uid:r.uid,name:r.name,slots:Number(r.slots)||0,missionIds:r.missionIds||[],winner:!!r.winner,
   prizes:(r.prizes||[]).map(p=>({kind:p.kind,id:p.id||null,quantity:Number(p.quantity)||1,
    label:p.label,rarity:p.rarity,amountCents:p.amountCents??null}))
  })).filter(p=>p.slots>0);
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
function createOverlay(game,show){
 const batch=currentBatch(show);if(!batch)return null;
 const n=batch.prizes.length,player=batch.player;
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
  '<p class="monster-slot-shared-caption">👀 '+esc(player.name)+' · ALLE SPIELER SEHEN LIVE ZU</p>'+
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
 const show=active(game)?game.skyjoSpecial.show:null;
 let root=document.querySelector('body > #deal-monster-slots.skyjo-monster-special');
 if(!show){
  if(root)root.remove();renderKey='';
  if(animationTimer){clearInterval(animationTimer);animationTimer=null}
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
 missionsFor,missionDone,definitions:DEFINITIONS};
})();