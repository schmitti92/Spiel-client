
(() => {
'use strict';
const selectedSkyBoard=new URLSearchParams(location.search).get('board')==='classic'?'classic':'illustrated';
document.body.dataset.skyBoard=selectedSkyBoard;
try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(_e){}
const SKYJO_BUILD='15.63';
const SKYJO_HUB_QUERY=new URLSearchParams(location.search);
const SKYJO_HUB_CODE=/^[A-HJ-NP-Z2-9]{6}$/.test(SKYJO_HUB_QUERY.get('hub')||'')?SKYJO_HUB_QUERY.get('hub'):'';
const SKYJO_HUB_MATCH=/^[0-9a-f-]{36}$/i.test(SKYJO_HUB_QUERY.get('match')||'')?SKYJO_HUB_QUERY.get('match'):'';
const SKYJO_HUB_GAME=/^S[A-HJ-NP-Z2-9]{9}$/.test(SKYJO_HUB_QUERY.get('room')||'')?SKYJO_HUB_QUERY.get('room'):'';
const SKYJO_IN_HUB=!!(SKYJO_HUB_CODE&&SKYJO_HUB_MATCH&&SKYJO_HUB_GAME&&SKYJO_HUB_GAME.slice(1,7)===SKYJO_HUB_CODE);
function returnToSharedHub(){if(SKYJO_IN_HUB)location.assign('../hub-lobby.html?room='+encodeURIComponent(SKYJO_HUB_CODE)+'&stayMatch='+encodeURIComponent(SKYJO_HUB_MATCH));}

const SAVE_KEY='skyjo_action_fan_v1';
const CLOUD_CFG_KEY='skyjo_action_cloud_v1';
const SKIP_RESUME_KEY='skyjo_action_skip_autoresume_v1';
const CLOUD_BASE='https://serverfinal-ynbe.onrender.com';
const SKYJO_ENTRY_MODE=(new URLSearchParams(location.search).get('mode')||'').toLowerCase();
const SKYJO_REQUESTED_MODE=['online','local'].includes(SKYJO_ENTRY_MODE)?SKYJO_ENTRY_MODE:'';
const SKYJO_NAV_TYPE=performance.getEntriesByType?.('navigation')?.[0]?.type||'navigate';
const SKYJO_NEW_ENTRY=!!SKYJO_REQUESTED_MODE&&SKYJO_NAV_TYPE!=='reload'&&!new URLSearchParams(location.search).has('room');
let skyjoLocalVariant='local';
let cloud={enabled:false,room:'',rev:0,inFlight:false,pending:false,pendingJSON:'',lastPushedJSON:'',applying:false,pollTimer:null,pollBusy:false,pollErrors:0,reactionSeq:0,roomActionBusy:false,startBusy:false,lastStatus:'local',pushTimer:null,deferredRemote:null,applyScheduled:false,roomEpoch:0};
const ACTIONS={
 ownswap:{name:'Eigene Karten tauschen',icon:'🔀',kind:'normal',desc:'Zwei eigene Karten tauschen; Ausrichtung neu wählen.'},
 double:{name:'Doppelter Spielzug',icon:'⏩',kind:'normal',desc:'Danach zwei vollständige Züge hintereinander.'},
 draw3:{name:'Drei Karten ziehen',icon:'3️⃣',kind:'normal',desc:'Drei ziehen, höchstens eine behalten.'},
 enlight:{name:'Erleuchtung',icon:'🔎',kind:'normal',desc:'Eine komplette Reihe oder Spalte geheim ansehen.'},
 react:{name:'Reaktivierung',icon:'♻️',kind:'normal',desc:'Eine Aktionskarte aus der Ablage sofort erneut spielen.'},
 defense:{name:'Verteidigung',icon:'🛡️',kind:'defense',desc:'Blockt einen Angriff; aktiv gespielt = Extrazug.'},
 swapother:{name:'Kartentausch Mitspieler',icon:'🔁',kind:'attack',desc:'Eine Karte zwischen zwei Spielern tauschen.'},
 thief:{name:'Aktionskarten-Dieb',icon:'🥷',kind:'attack',desc:'Aktionskarte stehlen + Extrazug.'},
 meteor:{name:'Meteoritenschauer',icon:'☄️',kind:'attack',desc:'Bei jedem Mitspieler eine Karte ersetzen.'}
};
let state=null;
let ui={mode:'none',data:{},selected:[]};
const $=s=>document.querySelector(s);
const clone=o=>JSON.parse(JSON.stringify(o));

const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

let gameAnnouncementEl=null;
let gameAnnouncementTimer=null;
let gameAnnouncementDelayTimer=null;
let lastFinalRoundAnnouncement='';
let lastOwnTurnAnnouncement='';

function clearGameAnnouncement(){
 if(gameAnnouncementTimer){clearTimeout(gameAnnouncementTimer);gameAnnouncementTimer=null}
 if(gameAnnouncementDelayTimer){clearTimeout(gameAnnouncementDelayTimer);gameAnnouncementDelayTimer=null}
 if(gameAnnouncementEl){try{gameAnnouncementEl.remove()}catch(_e){}gameAnnouncementEl=null}
}

function showGameAnnouncement(kind,title,subtitle='',delay=0){
 const run=()=>{
   clearGameAnnouncement();
   const wrap=document.createElement('div');
   wrap.className=`game-announcement ${kind||''}`;
   wrap.setAttribute('aria-live','assertive');
   wrap.setAttribute('role','status');

   const inner=document.createElement('div');
   inner.className='game-announcement-inner';

   const eyebrow=document.createElement('div');
   eyebrow.className='game-announcement-eyebrow';
   eyebrow.textContent=kind==='final-round'?'🔔 SCHLUSSPHASE':'🎯 DEIN ZUG';

   const main=document.createElement('div');
   main.className='game-announcement-title';
   main.textContent=title;

   const sub=document.createElement('div');
   sub.className='game-announcement-subtitle';
   sub.textContent=subtitle||'';

   inner.append(eyebrow,main);
   if(subtitle)inner.append(sub);
   wrap.append(inner);
   document.body.append(wrap);
   gameAnnouncementEl=wrap;

   requestAnimationFrame(()=>wrap.classList.add('show'));

   const stay=kind==='final-round'?1650:950;
   gameAnnouncementTimer=setTimeout(()=>{
     wrap.classList.add('leave');
     gameAnnouncementTimer=setTimeout(()=>{
       if(gameAnnouncementEl===wrap)gameAnnouncementEl=null;
       try{wrap.remove()}catch(_e){}
     },340)
   },stay)
 };

 if(delay>0){
   if(gameAnnouncementDelayTimer)clearTimeout(gameAnnouncementDelayTimer);
   gameAnnouncementDelayTimer=setTimeout(()=>{gameAnnouncementDelayTimer=null;run()},delay)
 }else run()
}

function syncGameAnnouncements(){
 if(!state||state.phase!=='play'||toiletPauseActive())return;

 let finalJustShown=false;

 // LETZTE RUNDE: auf jedem Gerät genau einmal je Runde.
 if(state.roundEnder!==null&&state.roundEnder!==undefined){
   const finalKey=`${state.round}:${state.roundEnder}`;
   if(finalKey!==lastFinalRoundAnnouncement){
     lastFinalRoundAnnouncement=finalKey;
     finalJustShown=true;
     const enderName=state.players?.[state.roundEnder]?.name||'Ein Spieler';
     const remaining=Math.max(0,(state.finalTurnQueue?.length||0)+(state.currentPlayer!==state.roundEnder?1:0));
     showGameAnnouncement(
       'final-round',
       'LETZTE RUNDE',
       remaining>0
         ?`${enderName} ist fertig · alle anderen haben noch genau einen Zug`
         :`${enderName} hat die Runde beendet`,
       70
     );
     haptic([25,45,25])
   }
 }

 // DU BIST DRAN: nur für den Menschen, dessen Gerät gerade am Zug ist.
 // Bei lokalen Pass-and-Play-Partien bedeutet das: der aktuelle Mensch am Gerät.
 if(ui.mode==='turnChoice'&&isMyActorDevice()&&!current()?.isAI){
   const turnKey=`${state.round}:${state.turnNo}:${state.currentPlayer}`;
   if(turnKey!==lastOwnTurnAnnouncement){
     lastOwnTurnAnnouncement=turnKey;
     const extra=state.roundEnder!==null?'LETZTER ZUG':'Dein Zug beginnt jetzt';
     showGameAnnouncement(
       'your-turn',
       'DU BIST DRAN',
       extra,
       finalJustShown?2050:90
     );
     if(!finalJustShown)haptic([16,35,16])
   }
 }
}

function visualFx(kind,label,emoji='✨',sparks=0){
  try{
    fxFeedback(kind);
    if(uiPrefs.cinematic===false)return;
    const perf=uiPrefs.performance!==false;
    /* Ein Vollbild-Effekt bei JEDEM Spielerwechsel kostet auf Tablets unnötig Frames.
       Im Flüssig-Modus bleibt der Zugwechsel deshalb bewusst ruhig. */
    if(perf&&kind==='turn')return;
    const wrap=document.createElement('div');wrap.className=`game-fx ${kind||''}`;
    const core=document.createElement('div');core.className='fx-core';
    const ic=document.createElement('div');ic.className='fx-icon';ic.textContent=emoji;
    const tx=document.createElement('div');tx.className='fx-label';tx.textContent=label||'';
    core.append(ic,tx);wrap.append(core);document.body.append(wrap);
    setTimeout(()=>wrap.remove(),perf?650:980);
    const cap=perf?4:18;
    const n=Math.max(0,Math.min(cap,Number(sparks)||0));
    for(let i=0;i<n;i++){
      const s=document.createElement('i');s.className='fx-spark';
      const a=(Math.PI*2*i/Math.max(1,n))+(Math.random()-.5)*.25;
      const d=perf?(52+Math.random()*58):(70+Math.random()*120);
      s.style.left=`${50+(Math.random()-.5)*3}%`;s.style.top=`${46+(Math.random()-.5)*3}%`;
      s.style.setProperty('--sx',`${Math.cos(a)*d}px`);s.style.setProperty('--sy',`${Math.sin(a)*d}px`);
      document.body.append(s);setTimeout(()=>s.remove(),perf?600:900);
    }
  }catch(_e){}
}


const UI_PREF_KEY='skyjo_action_ui_v9';
let uiPrefs={sound:false,haptic:true,cinematic:true,autoFocus:false,motion:'table',performance:true};
try{const p=JSON.parse(localStorage.getItem(UI_PREF_KEY)||'null');if(p&&typeof p==='object')uiPrefs={...uiPrefs,...p}}catch(_e){}
let audioCtx=null,wakeLock=null,pseudoFullscreen=false;
function saveUIPrefs(){try{localStorage.setItem(UI_PREF_KEY,JSON.stringify(uiPrefs))}catch(_e){}}
let motionBusy=false,motionQueueBusy=false,motionUnlockTimer=null,motionSessionStart=Date.now(),motionBusyUntil=0,motionRenderPending=false,motionActiveEvent=null;
const motionSeen=new Set();
const motionDiscardCommitted=new Set();
function discardArrivalEvent(){
 if(motionActiveEvent&&(motionActiveEvent.type==='swap'||motionActiveEvent.type==='drawn-discard')&&!motionDiscardCommitted.has(motionActiveEvent.id))return motionActiveEvent;
 const list=state?.motionFeed||[];
 for(let i=list.length-1;i>=0;i--){
   const e=list[i];
   if(!e?.id||motionSeen.has(e.id)||motionDiscardCommitted.has(e.id))continue;
   if(!(Number(e.ts||0)>=motionSessionStart-8000||e.id===state?.watch?.id))continue;
   if(e.type==='swap'||e.type==='drawn-discard')return e
 }
 return null
}
function discardArrivalPending(){return !!discardArrivalEvent()}
function visualDiscardState(){const arr=state?.playDiscard||[];const pending=discardArrivalPending();if(pending&&arr.length){return {top:arr.length>1?arr[arr.length-2]:null,count:Math.max(0,arr.length-1),pending:true}}return {top:arr[arr.length-1]||null,count:arr.length,pending:false}}
function commitDiscardArrival(e,card){
 if(e?.id)motionDiscardCommitted.add(e.id);
 showDiscardCardImmediately(card);
 const pile=document.getElementById('play-discard-pile');
 if(pile){
   const tip=pile.querySelector('.pile-tip');
   if(tip)tip.textContent='Ablage';
   pile.setAttribute('data-arrival-committed','1');
 }
}
function showDiscardCardImmediately(card){
 if(!card)return;
 const pile=document.getElementById('play-discard-pile');
 if(!pile)return;
 const current=pile.querySelector('.card');
 const wrap=document.createElement('div');
 wrap.innerHTML=cardHTML({...card,faceUp:true},true,false);
 const fresh=wrap.firstElementChild;
 if(current&&fresh)current.replaceWith(fresh);
 const tip=pile.querySelector('.pile-tip');
 if(tip)tip.textContent='Ablage';
 pile.classList.remove('discard-commit-pop');
 void pile.offsetWidth;
 pile.classList.add('discard-commit-pop');
 setTimeout(()=>pile?.classList.remove('discard-commit-pop'),260);
 const box=pile.closest('.play-pilebox');
 const count=box?.querySelector('.count');
 if(count&&state){
   const n=state.playDiscard?.length||0,buried=state.removedCards?.length||0;
   count.textContent=`${state.playDeck.length} im Stapel · ${n} Ablagekarte${n===1?'':'n'}${buried?` · ${buried} gesperrt darunter`:''}`;
 }
}
function motionSpec(){const level=uiPrefs.motion||'table';if(level==='normal')return {level,flight:125,arc:12,settle:16,swapGap:16,pause:8,flip:96,revealPause:18};if(level==='slow')return {level,flight:180,arc:17,settle:20,swapGap:22,pause:12,flip:122,revealPause:22};return {level:'table',flight:220,arc:22,settle:22,swapGap:26,pause:14,flip:145,revealPause:24}}
function setMotionLevel(level){if(!['normal','slow','table'].includes(level))level='table';uiPrefs.motion=level;saveUIPrefs();showDisplaySettings();toast(level==='normal'?'⚡ Bewegung: schnell':level==='slow'?'🎴 Bewegung: normal':'🃏 Tischmodus · flüssig')}
function rerenderAfterMotion(){if(motionRenderPending||!state)return;motionRenderPending=true;setTimeout(()=>{motionRenderPending=false;if(state)render()},0)}
function unlockMotion(rerender=false){clearTimeout(motionUnlockTimer);motionUnlockTimer=null;const was=motionBusy;motionBusy=false;motionBusyUntil=0;document.body.classList.remove('motion-busy');if(!motionQueueBusy&&cloud?.deferredRemote){flushDeferredCloudApply();return}if(rerender&&was&&!motionQueueBusy)rerenderAfterMotion()}
function lockMotion(ms,label='Kartenbewegung läuft …'){motionBusy=true;const guard=Math.min(6500,Math.max(1800,(Number(ms)||300)+1400));motionBusyUntil=Date.now()+guard;document.body.classList.add('motion-busy');const pill=document.getElementById('motionStatusText');if(pill)pill.textContent=label;clearTimeout(motionUnlockTimer);/* Harte Notentriegelung: niemals wegen einer Browser-Animation dauerhaft sperren. */motionUnlockTimer=setTimeout(()=>unlockMotion(true),guard)}
function motionLocked(show=true){if(motionBusy&&motionBusyUntil&&Date.now()>motionBusyUntil){unlockMotion(true);return false}if(!motionBusy)return false;if(show)toast('🎴 Kartenbewegung läuft noch …');return true}
function motionShouldBlock(e){if(!state||!e)return false;/* Alte Bewegungen dürfen den nächsten Zug nie blockieren. */if(state.phase==='play'&&ui.mode==='turnChoice'&&Number(e.actor)!==Number(state.currentPlayer))return false;return true}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function recentMotionCard(){const list=state?.motionFeed||[],now=Date.now();for(let i=list.length-1;i>=0;i--){const e=list[i];if(!e)continue;if(now-Number(e.ts||0)>7000)break;if(e.type==='swap'||e.type==='drawn-discard'||e.type==='turn'||e.type==='reveal'||e.type==='action-play'||e.type==='action-take'||e.type==='meteor')return null;if((e.type==='draw-deck'||e.type==='take-discard'||e.type==='decision-keep')&&e.card)return e}return null}
function heldCardInfo(){if(!state)return null;const localHeld=(ui.mode==='drawnDecision'||ui.mode==='drawnSwap'||ui.mode==='discardSwap'||ui.mode==='draw3Target')&&ui.data?.card?{card:ui.data.card,actor:state.currentPlayer,type:ui.mode==='discardSwap'?'Ablagekarte':'Gezogene Karte',local:!isAIPlayer(state.currentPlayer),title:isAIPlayer(state.currentPlayer)?`${state.players[state.currentPlayer].name} spielt diese Karte`:''}:null;if(localHeld)return localHeld;const evt=recentMotionCard();if(evt?.card)return {card:evt.card,actor:evt.actor??state.currentPlayer,type:evt.typeLabel||'Live-Karte',local:false,title:evt.title||'',text:evt.text||''};return null}
function handZoneHTML(){const h=heldCardInfo();const actor=h?state.players?.[h.actor]?.name:'';const decision=!!(h?.local&&ui.mode==='drawnDecision');return `<div id="table-hand-zone-anchor" class="real-hand-zone"><div id="table-hand-zone-card" class="real-hand-card ${h?'':'empty'}">${h?cardHTML({...h.card,faceUp:true},true,false):'✦'}</div><div class="real-hand-copy"><span class="eyebrow">${h?escapeHTML(h.type):'Hand-/Entscheidungszone'}</span><b>${h?(h.local?'Karte in deiner Hand':`${escapeHTML(actor)} hat diese Karte`):'Hier landet eine gezogene Karte zuerst'}</b><small>${h?(h.local?(decision?'Eigene Karte antippen: Sie wird zuerst aufgedeckt, dann sauber ausgetauscht. Oder auf die Ablage tippen.':'Diese Karte wird jetzt gespielt.'):escapeHTML(h.text||h.title||'Live vom anderen Spieler.')):'Stapel → Handzone → alte Feldkarte offen zur Ablage → erst danach Handkarte ins Spielfeld.'}</small>${decision?`<div class="direct-swap-hint">☝ Eigene Karte antippen = sofort tauschen</div><div class="real-hand-actions direct-only"><button class="drop big-discard-btn" onclick="Game.discardDrawn()"><span class="big-discard-main">🗑️ KARTE AUF ABLAGE</span><small class="big-discard-sub">wegwerfen & eigene Karte aufdecken</small></button></div>`:''}</div></div>`}
function motionFlightMarkup(e,cardOverride=null){if(e?.actionType&&!cardOverride){const a=ACTIONS[e.actionType];return `<div class="motion-fly action">${a?a.icon:'⚡'}</div>`}const c=cardOverride||e?.card||{type:'number',value:0,faceUp:false};return `<div class="motion-fly">${cardHTML({...c,faceUp:true},true,false)}</div>`}
async function animateRealFlight(fromId,toId,e,cardOverride=null){const from=document.getElementById(fromId),to=document.getElementById(toId);if(!from||!to)return;const spec=motionSpec(),fr=from.getBoundingClientRect(),tr=to.getBoundingClientRect();const wrap=document.createElement('div');wrap.innerHTML=motionFlightMarkup(e,cardOverride);const fly=wrap.firstElementChild;if(!fly)return;document.body.append(fly);const sx=fr.left+fr.width/2,sy=fr.top+fr.height/2,tx=tr.left+tr.width/2,ty=tr.top+tr.height/2,dx=tx-sx,dy=ty-sy;fly.style.left=`${sx}px`;fly.style.top=`${sy}px`;const perf=uiPrefs.performance!==false;const arc=perf?Math.min(46,Math.max(8,spec.arc+Math.abs(dx)*.012)):Math.min(110,Math.max(26,spec.arc+Math.abs(dx)*.035));const scale=Math.max(.80,Math.min(1.06,(tr.width||74)/(fr.width||74)));let anim=null;try{const frames=perf?[{transform:'translate3d(-50%,-50%,0) scale(.96)',opacity:.98},{offset:.52,transform:`translate3d(calc(-50% + ${dx*.52}px),calc(-50% + ${dy*.52-arc}px),0) scale(1.015)`,opacity:1},{transform:`translate3d(calc(-50% + ${dx}px),calc(-50% + ${dy}px),0) scale(${scale})`,opacity:1}]:[{transform:'translate(-50%,-50%) scale(.88) rotate(-2deg)',opacity:.96},{offset:.48,transform:`translate(calc(-50% + ${dx*.48}px),calc(-50% + ${dy*.48-arc}px)) scale(1.06) rotate(${dx>=0?3:-3}deg)`,opacity:1},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${scale}) rotate(0deg)`,opacity:1}];anim=fly.animate(frames,{duration:spec.flight,easing:perf?'cubic-bezier(.2,.72,.22,1)':'cubic-bezier(.22,.78,.2,1)',fill:'forwards'});const finished=anim?.finished&&typeof anim.finished.then==='function'?anim.finished.catch(()=>null):sleep(spec.flight);await Promise.race([finished,sleep(spec.flight+350)])}catch(_e){await sleep(Math.min(spec.flight,1400))}finally{try{anim?.cancel?.()}catch(_e){}fly.remove()}if(!document.body.contains(to))return;to.classList.remove('motion-landing');void to.offsetWidth;to.classList.add('motion-landing');setTimeout(()=>to.classList.remove('motion-landing'),250);await sleep(spec.settle)}
function swapLayerMarkup(oldCard,wasFaceUp){const back=cardHTML({type:'number',value:0,faceUp:false},false,false),front=cardHTML({...oldCard,faceUp:true},true,false);return `<div class="swap-reveal-card"><div class="swap-reveal-face back-face">${back}</div><div class="swap-reveal-face front-face">${front}</div></div>`}
async function prepareSwapReveal(e){const target=document.getElementById(e.dstId);if(!target||!e.oldCard)return null;const cardEl=target.querySelector('.card')||target;const r=cardEl.getBoundingClientRect();if(!r.width||!r.height)return null;target.classList.add('swap-target-ghost');const layer=document.createElement('div');layer.className='swap-reveal-layer';layer.style.left=`${r.left+r.width/2}px`;layer.style.top=`${r.top+r.height/2}px`;layer.style.width=`${r.width}px`;layer.style.height=`${r.height}px`;layer.innerHTML=swapLayerMarkup(e.oldCard,!!e.oldWasFaceUp);document.body.append(layer);const inner=layer.querySelector('.swap-reveal-card');if(inner&&e.oldWasFaceUp)inner.style.transform='rotateY(180deg)';const spec=motionSpec();const caption=document.createElement('div');caption.className='swap-reveal-caption';caption.style.left=`${r.left+r.width/2}px`;caption.style.top=`${Math.max(38,r.top-6)}px`;caption.textContent=e.oldWasFaceUp?'Karte wird ausgetauscht':'Karte wird zuerst aufgedeckt';document.body.append(caption);let a=null;try{if(e.oldWasFaceUp){a=inner.animate([{transform:'rotateY(180deg) translateY(0) rotateZ(0deg)'},{offset:.5,transform:'rotateY(180deg) translateY(-7px) rotateZ(-1.5deg)'},{transform:'rotateY(180deg) translateY(0) rotateZ(0deg)'}],{duration:Math.max(150,spec.flip*.72),easing:'ease-in-out',fill:'forwards'});await Promise.race([a.finished.catch(()=>null),sleep(spec.flip+90)])}else{a=inner.animate([{transform:'rotateY(0deg) scale(1)'},{offset:.45,transform:'rotateY(88deg) scale(1.035)'},{transform:'rotateY(180deg) scale(1)'}],{duration:spec.flip,easing:'cubic-bezier(.22,.72,.18,1)',fill:'forwards'});await Promise.race([a.finished.catch(()=>null),sleep(spec.flip+110)]);haptic(7)}await sleep(spec.revealPause)}catch(_e){await sleep(Math.min(spec.flip,700))}finally{try{a?.cancel?.()}catch(_e){}if(inner)inner.style.transform='rotateY(180deg)'}return {target,layer,caption}}
function clearSwapReveal(ctx,arrive=false){if(!ctx)return;try{ctx.layer?.remove()}catch(_e){}try{ctx.caption?.remove()}catch(_e){}if(ctx.target){ctx.target.classList.remove('swap-target-ghost');if(arrive){ctx.target.classList.remove('swap-target-arrive');void ctx.target.offsetWidth;ctx.target.classList.add('swap-target-arrive');setTimeout(()=>ctx.target?.classList.remove('swap-target-arrive'),260)}}}

async function animateCardReveal(targetId,card){
 const target=document.getElementById(targetId);if(!target||!card)return;
 const cardEl=target.querySelector('.card')||target,r=cardEl.getBoundingClientRect();if(!r.width||!r.height)return;
 const spec=motionSpec();target.classList.add('swap-target-ghost');
 const layer=document.createElement('div');layer.className='swap-reveal-layer quick-reveal';layer.style.left=`${r.left+r.width/2}px`;layer.style.top=`${r.top+r.height/2}px`;layer.style.width=`${r.width}px`;layer.style.height=`${r.height}px`;layer.innerHTML=swapLayerMarkup(card,false);document.body.append(layer);
 const inner=layer.querySelector('.swap-reveal-card');let a=null;
 try{
   a=inner.animate([
     {transform:'rotateY(0deg) scale(1)'},
     {offset:.48,transform:'rotateY(86deg) scale(1.025)'},
     {offset:.52,transform:'rotateY(94deg) scale(1.025)'},
     {transform:'rotateY(180deg) scale(1)'}
   ],{duration:spec.flip,easing:'cubic-bezier(.25,.72,.18,1)',fill:'forwards'});
   /* Die Vorderseite ist durch backface-visibility ab ca. 50 % sichtbar. Keine zusätzliche Wartezeit bis zur Zahl. */
   await Promise.race([a.finished.catch(()=>null),sleep(spec.flip+90)]);
   if(inner)inner.style.transform='rotateY(180deg)';
   await sleep(23);
 }catch(_e){if(inner)inner.style.transform='rotateY(180deg)'}
 finally{
   try{a?.cancel?.()}catch(_e){}
   target.classList.remove('swap-target-ghost');
   try{layer.remove()}catch(_e){}
   target.classList.remove('reveal-arrive');void target.offsetWidth;target.classList.add('reveal-arrive');
   setTimeout(()=>target?.classList.remove('reveal-arrive'),210);
 }
}
function queueMotionEvent(type,data={}){if(!state)return null;state.motionFeed=Array.isArray(state.motionFeed)?state.motionFeed:[];const evt={id:uid(),type,actor:(data.actor!==undefined?data.actor:state.currentPlayer)||0,ts:Date.now(),...data};state.motionFeed.push(evt);state.motionFeed=state.motionFeed.slice(-24);state.watch=evt;return evt}
async function playMotionEvent(e){if(!e)return;const spec=motionSpec();let label=e.title||'Kartenbewegung';const block=motionShouldBlock(e);const maybeLock=(ms)=>{if(block)lockMotion(ms,label)};const masksDiscard=e.type==='swap'||e.type==='drawn-discard';motionActiveEvent=e;try{
 if(e.type==='turn'){pulseTarget(`player-${e.actor}`);await sleep(Math.min(130,spec.pause));return}
 if(e.type==='draw-deck'||e.type==='take-discard'){maybeLock(spec.flight+spec.settle+70);await animateRealFlight(e.srcId||'play-deck-pile','table-hand-zone-card',e);return}
 if(e.type==='drawn-discard'){maybeLock(spec.flight+spec.settle+70);await animateRealFlight('table-hand-zone-card','play-discard-pile',e);commitDiscardArrival(e,e.card);return}
 if(e.type==='decision-keep'){maybeLock(Math.min(215,spec.flight*.45));pulseTarget('table-hand-zone-card');await sleep(Math.min(215,spec.flight*.45));return}
 if(e.type==='swap'){
   maybeLock(spec.flip+spec.revealPause+spec.flight*2+spec.swapGap+spec.settle*2+490);
   const revealCtx=await prepareSwapReveal(e);
   try{
     if(e.oldCard){
       if(revealCtx?.layer){
         revealCtx.layer.style.opacity='0';
         revealCtx.layer.style.transition='opacity .06s ease';
         await sleep(45)
       }
       /* PHASE 1: alte Feldkarte fliegt offen auf die Ablage. */
       await animateRealFlight(e.dstId,e.discardId||'play-discard-pile',e,e.oldCard);
       /* PHASE 2: die Ablage ist ab JETZT verbindlich sichtbar.
          discardArrivalPending() darf sie nun auch bei Zwischen-Render/Sync nicht mehr verstecken. */
       commitDiscardArrival(e,e.oldCard);
       haptic(7);
       await sleep(spec.level==='table'?260:spec.level==='slow'?200:150)
     }
     /* PHASE 3: erst jetzt verlässt die Handkarte die Handzone. */
     await animateRealFlight('table-hand-zone-card',e.dstId,e,e.card);
     clearSwapReveal(revealCtx,true);
     return
   }finally{
     clearSwapReveal(revealCtx,false)
   }
 }
 if(e.type==='bury-row'){const cards=Array.isArray(e.cards)?e.cards:[],srcIds=Array.isArray(e.srcIds)?e.srcIds:[];maybeLock(Math.max(350,cards.length*(spec.flight+45)+spec.settle));for(let i=0;i<cards.length;i++){await animateRealFlight(srcIds[i]||`player-${e.actor}`,e.dstId||'play-discard-pile',e,cards[i]);if(i<cards.length-1)await sleep(35)}return}
 if(e.type==='action-take'||e.type==='action-play'||e.type==='meteor'){maybeLock(spec.flight+spec.settle+60);if(e.card||e.actionType)await animateRealFlight(e.srcId||'action-deck-pile',e.dstId||`player-${e.actor}`,e);else{pulseTarget(e.dstId||`player-${e.actor}`);await sleep(Math.min(160,spec.pause+50))}return}
 if(e.type==='reveal'){maybeLock(spec.flip+90);await animateCardReveal(e.dstId||`player-${e.actor}`,e.card);return}
 pulseTarget(e.dstId||`player-${e.actor}`);await sleep(Math.min(150,spec.pause))
 }finally{
   if(motionActiveEvent===e)motionActiveEvent=null;
   if(masksDiscard)rerenderAfterMotion();
   if(e?.id)setTimeout(()=>motionDiscardCommitted.delete(e.id),125)
 }}
async function runMotionQueue(){if(motionQueueBusy||!state)return;const feed=(state.motionFeed||[]).filter(e=>e?.id&&!motionSeen.has(e.id)&&(Number(e.ts||0)>=motionSessionStart-8000||e.id===state.watch?.id));if(!feed.length){if(motionBusy)unlockMotion(true);return}motionQueueBusy=true;try{for(const e of feed){motionSeen.add(e.id);await playMotionEvent(e);await sleep(motionSpec().pause)}}catch(err){console.warn('[motion queue]',err)}finally{motionQueueBusy=false;const more=(state?.motionFeed||[]).some(e=>e?.id&&!motionSeen.has(e.id)&&(Number(e.ts||0)>=motionSessionStart-8000||e.id===state.watch?.id));if(more)setTimeout(runMotionQueue,20);else unlockMotion(true)}}
function haptic(pattern=8){try{if(uiPrefs.haptic&&navigator.vibrate)navigator.vibrate(pattern)}catch(_e){}}
function ensureAudio(){try{if(!audioCtx){const A=window.AudioContext||window.webkitAudioContext;if(A)audioCtx=new A()}if(audioCtx?.state==='suspended')audioCtx.resume()}catch(_e){}return audioCtx}
function playFxSound(kind){if(!uiPrefs.sound)return;try{const ctx=ensureAudio();if(!ctx)return;const now=ctx.currentTime;const cfg={turn:[520,.055],draw:[650,.045],action:[740,.06],star:[880,.075],win:[980,.11]}[kind]||[600,.04];const o=ctx.createOscillator(),g=ctx.createGain();o.type=kind==='win'?'triangle':'sine';o.frequency.setValueAtTime(cfg[0],now);if(kind==='star'||kind==='win')o.frequency.exponentialRampToValueAtTime(cfg[0]*1.35,now+cfg[1]);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(kind==='win'?.10:.055,now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+cfg[1]);o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+cfg[1]+.02)}catch(_e){}}
function fxFeedback(kind){const p=kind==='win'?[18,45,28]:kind==='star'?[10,30,15]:kind==='action'?14:8;haptic(p);playFxSound(kind)}

function toggleHaptic(){uiPrefs.haptic=!uiPrefs.haptic;saveUIPrefs();if(uiPrefs.haptic)haptic([8,22,8]);showDisplaySettings()}
function toggleCinematic(){uiPrefs.cinematic=!uiPrefs.cinematic;saveUIPrefs();syncBodyMode();showDisplaySettings()}
function toggleAutoFocus(){uiPrefs.autoFocus=!uiPrefs.autoFocus;saveUIPrefs();showDisplaySettings()}
function togglePerformance(){uiPrefs.performance=uiPrefs.performance===false?true:false;saveUIPrefs();syncBodyMode();showDisplaySettings();toast(uiPrefs.performance!==false?'⚡ Flüssig-Modus an':'✨ Volle Grafikeffekte an')}
function focusMyBoard(){if(!state)return;let idx=cloud.enabled?myPlayerIndex():state.currentPlayer;if(idx<0)idx=state.currentPlayer;const el=document.getElementById(`player-${idx}`);if(el){el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});el.classList.remove('focus-flash');void el.offsetWidth;el.classList.add('focus-flash');setTimeout(()=>el.classList.remove('focus-flash'),900);haptic(7)}}
function captureViewportLock(){const active=document.activeElement;const lock={x:window.scrollX||0,y:window.scrollY||window.pageYOffset||0,enabled:!!state};document.body.classList.add('view-lock-active');if(active&&active!==document.body&&!['INPUT','TEXTAREA','SELECT'].includes(active.tagName)&&typeof active.blur==='function'){try{active.blur()}catch(_e){}}return lock}
function restoreViewportLock(lock){if(!lock?.enabled){document.body.classList.remove('view-lock-active');return}const apply=()=>{const maxY=Math.max(0,(document.documentElement.scrollHeight||document.body.scrollHeight||0)-window.innerHeight);const maxX=Math.max(0,(document.documentElement.scrollWidth||document.body.scrollWidth||0)-window.innerWidth);const x=Math.min(Math.max(0,Number(lock.x)||0),maxX);const y=Math.min(Math.max(0,Number(lock.y)||0),maxY);window.scrollTo(x,y)};requestAnimationFrame(()=>{apply();setTimeout(apply,34);setTimeout(()=>document.body.classList.remove('view-lock-active'),80)})}

function canManageJokerCount(){
 if(!state)return false;
 if(cloud.enabled&&!isHostDevice())return false;
 return true;
}
function jokerRoundInventory(){
 // Mit dem Bestand dieser Runde verhindern wir, dass ein späteres Plus
 // bereits ausgeteilte Joker nach einem vorherigen Minus doppelt ersetzt.
 if(Number.isInteger(state?.jokerRoundInventory))return Math.max(0,state.jokerRoundInventory);
 return Math.max(0,Math.min(30,Math.floor(Number(state?.jokerCount)||0)));
}
function showJokerCountManager(){
 if(!state){toast('Kein laufendes Spiel');return}
 const hostOnly=cloud.enabled&&!isHostDevice();
 const currentCount=Math.max(0,Math.min(30,Math.floor(Number(state.jokerCount)||0)));
 const remaining=Math.max(0,30-currentCount);
 const inRound=state.phase==='play'||state.phase==='initialReveal';
 const deckStars=Array.isArray(state.playDeck)?state.playDeck.filter(c=>c?.type==='star').length:0;
 const stillOut=Math.max(0,jokerRoundInventory()-currentCount);
 const note=hostOnly
   ?'Nur der Host darf die Jokeranzahl eines Online-Spiels verändern.'
   :(inRound
      ?'Plus und Minus gelten sofort für Joker im verdeckten Nachziehstapel. Joker auf dem Spielfeld, in der Ablage oder in einer Handkarte bleiben unverändert. Die Zielzahl gilt vollständig ab der nächsten Runde.'
      :'Die neue Anzahl gilt ab der nächsten Runde. Die laufende Punktewertung bleibt unberührt.');
 modal(`<div class="joker-live-settings">
   <div class="settings-hero">
     <div class="settings-orb">★</div>
     <div><h3>Jokeranzahl im Spiel</h3><p>${note}</p></div>
   </div>
   <div class="joker-live-count">
     <span>Joker für die nächste Runde</span>
     <strong>${currentCount}</strong>
     <small>${inRound?`${deckStars} Joker aktuell verdeckt im Nachziehstapel`:'Einstellung gilt für die nächste Runde'}</small>
   </div>
   <div class="joker-live-actions joker-live-decrease">
     <button ${hostOnly||currentCount<5?'disabled':''} onclick="Game.adjustJokersInGame(-5)">★★★★★ −5 Joker</button>
     <button ${hostOnly||currentCount<2?'disabled':''} onclick="Game.adjustJokersInGame(-2)">★★ −2 Joker</button>
     <button ${hostOnly||currentCount<1?'disabled':''} onclick="Game.adjustJokersInGame(-1)">★ −1 Joker</button>
   </div>
   <div class="joker-live-actions joker-live-increase">
     <button class="primary" ${hostOnly||remaining<1?'disabled':''} onclick="Game.adjustJokersInGame(1)">★ +1 Joker</button>
     <button class="primary" ${hostOnly||remaining<2?'disabled':''} onclick="Game.adjustJokersInGame(2)">★★ +2 Joker</button>
     <button class="primary" ${hostOnly||remaining<5?'disabled':''} onclick="Game.adjustJokersInGame(5)">★★★★★ +5 Joker</button>
   </div>
   <div class="joker-live-limit">Einstellbar: 0–30 Joker.${stillOut&&inRound?` Noch ${stillOut} Joker dieser Runde können schon verteilt sein und werden nicht aus fremden Kartenfeldern entfernt.`:''}</div>
   <div class="modal-actions"><button onclick="Game.closeModal()">Fertig</button></div>
 </div>`,false)
}
function adjustJokersInGame(delta){
 if(!state)return;
 if(cloud.enabled&&!isHostDevice()){toast('Nur der Host kann die Jokeranzahl ändern');return}
 delta=Math.trunc(Number(delta));
 if(!Number.isFinite(delta)||delta===0)return;
 const before=Math.max(0,Math.min(30,Math.floor(Number(state.jokerCount)||0)));
 const target=Math.max(0,Math.min(30,before+delta));
 if(target===before){toast(target===0?'Minimum: 0 Joker':'Maximum: 30 Joker');showJokerCountManager();return}
 const immediate=state.phase==='play'||state.phase==='initialReveal';
 let roundPool=jokerRoundInventory(),added=0,removed=0;
 state.jokerCount=target;
 if(immediate){
   if(!Array.isArray(state.playDeck))state.playDeck=[];
   if(target>roundPool){
     added=target-roundPool;
     for(let i=0;i<added;i++)state.playDeck.push(newCard('star'));
     state.playDeck=shuffle(state.playDeck);
     roundPool+=added;
   }else if(target<roundPool){
     for(let i=state.playDeck.length-1;i>=0&&roundPool>target;i--){
       if(state.playDeck[i]?.type==='star'){
         state.playDeck.splice(i,1);
         roundPool--;
         removed++;
       }
     }
   }
   state.jokerRoundInventory=roundPool;
 }
 const difference=target-before;
 const label=difference>0?`+${difference}`:String(difference);
 const currentText=immediate
   ?(difference<0?` ${removed} Joker sofort aus dem Nachziehstapel entfernt.${roundPool>target?' Übrige Joker liegen bereits anderswo und bleiben bis zur nächsten Runde bestehen.':''}`:` ${added} Joker in den Nachziehstapel gemischt.`)
   :' Gilt ab der nächsten Runde.';
 log(`Jokeranzahl um ${label} geändert: ${before} → ${target}.${currentText}`);
 save();
 render();
 toast(`★ Jokerziel ${target} (${label})${immediate&&difference<0?` · ${removed} aus dem Stapel entfernt`:''}`);
 setTimeout(showJokerCountManager,40)
}
function addJokersToGame(amount){adjustJokersInGame(Math.abs(Math.trunc(Number(amount)||1)))}

function showDisplaySettings(){const ml=uiPrefs.motion||'table';modal(`<div class="display-settings"><div class="settings-hero"><div class="settings-orb">✦</div><div><h3>Darstellung & Spielgefühl</h3><p>High-End-Effekte lassen sich einzeln anpassen, ohne die Spiellogik zu verändern.</p></div></div><div class="settings-grid"><button class="setting-toggle ${uiPrefs.sound?'on':''}" onclick="Game.toggleSound();Game.showDisplaySettings()"><span>🔊</span><b>Sound</b><small>${uiPrefs.sound?'AN':'AUS'}</small></button><button class="setting-toggle ${uiPrefs.haptic?'on':''}" onclick="Game.toggleHaptic()"><span>📳</span><b>Haptik</b><small>${uiPrefs.haptic?'AN':'AUS'}</small></button><button class="setting-toggle ${uiPrefs.cinematic!==false?'on':''}" onclick="Game.toggleCinematic()"><span>✨</span><b>Cinematic FX</b><small>${uiPrefs.cinematic!==false?'AN':'AUS'}</small></button><button class="setting-toggle ${uiPrefs.autoFocus?'on':''}" onclick="Game.toggleAutoFocus()"><span>🎯</span><b>Auto-Fokus</b><small>${uiPrefs.autoFocus?'AN':'AUS'}</small></button><button class="setting-toggle ${uiPrefs.performance!==false?'on':''}" onclick="Game.togglePerformance()"><span>⚡</span><b>Flüssig-Modus</b><small>${uiPrefs.performance!==false?'AN':'AUS'}</small></button><div class="motion-settings"><div><div><b>🎴 Kartenbewegung</b><small>Wie schnell Karten wie am echten Tisch bewegt werden.</small></div><small>${ml==='normal'?'SCHNELL':ml==='slow'?'NORMAL':'TISCH · FLÜSSIG'}</small></div><div class="motion-levels"><button class="motion-level ${ml==='normal'?'on':''}" onclick="Game.setMotionLevel('normal')">⚡ Schnell</button><button class="motion-level ${ml==='slow'?'on':''}" onclick="Game.setMotionLevel('slow')">🎴 Normal</button><button class="motion-level ${ml==='table'?'on':''}" onclick="Game.setMotionLevel('table')">🃏 Tisch · flüssig</button></div></div></div>${state?'<div class="modal-actions"><button class="primary" onclick="Game.closeModal();Game.focusMyBoard()">🎯 Zu meinem Feld</button><button onclick="Game.showJokerCountManager()">★ Jokeranzahl ändern</button><button onclick="Game.closeModal()">Fertig</button></div>':'<div class="modal-actions"><button onclick="Game.closeModal()">Fertig</button></div>'}</div>`,false)}
function finaleBurst(){if(uiPrefs.cinematic===false)return;try{const layer=document.createElement('div');layer.className='finale-confetti';document.body.append(layer);const glyphs=['◆','●','✦','■'];const total=uiPrefs.performance!==false?22:46;for(let i=0;i<total;i++){const p=document.createElement('i');p.textContent=glyphs[i%glyphs.length];p.style.left=`${5+Math.random()*90}%`;p.style.setProperty('--drift',`${-70+Math.random()*140}px`);p.style.setProperty('--spin',`${180+Math.random()*720}deg`);p.style.setProperty('--delay',`${Math.random()*.45}s`);p.style.setProperty('--dur',`${1.4+Math.random()*1.3}s`);p.style.setProperty('--hue',`${Math.floor(Math.random()*360)}`);layer.append(p)}setTimeout(()=>layer.remove(),3100)}catch(_e){}}

function toggleSound(){uiPrefs.sound=!uiPrefs.sound;saveUIPrefs();if(uiPrefs.sound)playFxSound('turn');syncChromeButtons();toast(uiPrefs.sound?'🔊 Sound an':'🔇 Sound aus')}
function isFullscreen(){return !!(document.fullscreenElement||document.webkitFullscreenElement||document.msFullscreenElement)}
async function requestWakeLock(){try{if('wakeLock' in navigator&&!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener?.('release',()=>{wakeLock=null})}}catch(_e){}}
async function releaseWakeLock(){try{if(wakeLock){await wakeLock.release();wakeLock=null}}catch(_e){wakeLock=null}}
async function toggleFullscreen(){
  try{
    const active=isFullscreen()||pseudoFullscreen;
    if(active){
      if(isFullscreen()){if(document.exitFullscreen)await document.exitFullscreen();else if(document.webkitExitFullscreen)document.webkitExitFullscreen();}
      pseudoFullscreen=false;document.body.classList.remove('pseudo-fullscreen');await releaseWakeLock();
    }else{
      const el=document.documentElement;let p=null;
      if(el.requestFullscreen)p=el.requestFullscreen({navigationUI:'hide'});else if(el.webkitRequestFullscreen)p=el.webkitRequestFullscreen();
      if(p&&typeof p.then==='function')await p;
      if(!isFullscreen()){pseudoFullscreen=true;document.body.classList.add('pseudo-fullscreen')}
      await requestWakeLock();haptic(12);
    }
  }catch(e){pseudoFullscreen=!pseudoFullscreen;document.body.classList.toggle('pseudo-fullscreen',pseudoFullscreen);toast(pseudoFullscreen?'Ansicht maximiert':'Vollbild nicht unterstützt')}
  syncFullscreenState();
}
function syncFullscreenState(){const on=isFullscreen()||pseudoFullscreen;document.body.classList.toggle('is-fullscreen',on);syncChromeButtons();if(on)requestWakeLock();else releaseWakeLock()}
function syncChromeButtons(){const f=$('#fullscreenBtn'),a=$('#soundBtn');if(f){f.textContent=(isFullscreen()||pseudoFullscreen)?'⤢':'⛶';f.title=(isFullscreen()||pseudoFullscreen)?'Vollbild verlassen':'Vollbild'}if(a){a.textContent=uiPrefs.sound?'🔊':'🔇';a.title=uiPrefs.sound?'Sound ausschalten':'Sound einschalten'}}
function syncBodyMode(){document.body.dataset.players=state?.players?.length?String(state.players.length):'';document.body.dataset.mode=ui?.mode||'none';document.body.dataset.turn=state?String(state.currentPlayer??0):'';document.body.dataset.specials=state&&jokerSpecialsEnabled()?'on':'off';document.body.classList.toggle('is-playing',!!state);document.body.classList.toggle('draw-open',ui.mode==='drawnDecision');document.body.classList.toggle('no-cinematic',uiPrefs.cinematic===false);document.body.classList.toggle('performance-mode',uiPrefs.performance!==false);const hue=[43,188,145,282,18,215,325,92][Number(state?.currentPlayer||0)%8];document.documentElement.style.setProperty('--turn-hue',String(hue));syncFullscreenState()}
function drawnDecisionHTML(c){return `<div class="drawn-decision-inline"><div id="drawn-card-stage" class="drawn-card-wrap">${cardHTML(c,true,false)}</div><div class="drawn-decision-copy"><b>Gezogene Karte</b><small>Dein Spielfeld bleibt komplett sichtbar. Entscheide hier oben am Tisch.</small><div class="drawn-decision-actions"><button class="keep" onclick="Game.keepDrawn()">✨ Behalten & tauschen</button><button class="drop" onclick="Game.discardDrawn()">🂠 Ablegen & aufdecken</button></div></div></div>`}
let watchFxSeen='';
function cardShortText(c){if(!c)return'';if(c.type==='star')return '⭐ Stern/Joker';return `${c.value}`.startsWith('-')?`Karte ${c.value}`:`Karte ${c.value}`;}
function setWatch(type,data={}){return queueMotionEvent(type,data)}
function watchPanelHTML(){const w=state?.watch;if(!w)return `<div class="watch-panel idle"><div class="watch-headline"><b>Live-Ansicht</b><span>Zieh- und Spielaktionen erscheinen hier</span></div><div class="watch-stage-wrap"><div id="watch-card-stage" class="watch-card-stage empty">LIVE</div><div class="watch-copy"><b>Noch keine Aktion</b><small>Wenn ein Spieler eine Karte zieht, tauscht oder eine Aktionskarte nutzt, wird das hier sichtbar.</small></div></div></div>`;const actorName=state.players?.[w.actor]?.name||'Spieler';const title=w.title||actorName;const text=w.text||'';return `<div class="watch-panel ${w.actor===state.currentPlayer?'current':''}"><div class="watch-headline"><b>Live: ${escapeHTML(actorName)}</b><span>${escapeHTML(w.typeLabel||'Aktion')}</span></div><div class="watch-stage-wrap"><div id="watch-card-stage" class="watch-card-stage ${w.card?'':'empty'}">${w.card?cardHTML({...w.card,faceUp:true},true,false):'LIVE'}</div><div class="watch-copy"><b>${escapeHTML(title)}</b><small>${escapeHTML(text)}</small></div></div></div>`}
function pulseTarget(id){const el=id?document.getElementById(id):null;if(!el)return;el.classList.remove('watch-target-pop');const add=()=>{if(el.isConnected)el.classList.add('watch-target-pop')};if(uiPrefs.performance!==false)requestAnimationFrame(add);else{void el.offsetWidth;add()}setTimeout(()=>el.classList.remove('watch-target-pop'),300)}
function flightMarkup(w){if(w?.actionType){const a=ACTIONS[w.actionType];return `<div class="card-flight action-token">${a?a.icon:'⚡'}</div>`}return `<div class="card-flight">${cardHTML(w?.card?{...w.card,faceUp:true}:{type:'number',value:0,faceUp:false},true,false)}</div>`}
function animateFlight(fromId,toId,w){const from=fromId?document.getElementById(fromId):null,to=toId?document.getElementById(toId):null;if(!from||!to)return;const fr=from.getBoundingClientRect(),tr=to.getBoundingClientRect();const flyWrap=document.createElement('div');flyWrap.innerHTML=flightMarkup(w);const fly=flyWrap.firstElementChild;if(!fly)return;document.body.append(fly);const sw=Math.max(56,Math.min(90,fr.width||74));fly.style.width=`${sw}px`;fly.style.left=`${fr.left+fr.width/2}px`;fly.style.top=`${fr.top+fr.height/2}px`;const dx=(tr.left+tr.width/2)-(fr.left+fr.width/2);const dy=(tr.top+tr.height/2)-(fr.top+fr.height/2);const scale=Math.max(.72,Math.min(1.12,(tr.width||sw)/sw));requestAnimationFrame(()=>{fly.classList.add('go');fly.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${scale})`;});setTimeout(()=>{fly.classList.add('fadeout')},260);setTimeout(()=>fly.remove(),430)}
function playWatchAnimation(w){if(!w||uiPrefs.cinematic===false)return;const src=w.srcId,dst=w.dstId;if(w.type==='draw-deck'||w.type==='take-discard'||w.type==='drawn-discard'||w.type==='action-take'||w.type==='action-play'||w.type==='meteor'||w.type==='reveal')animateFlight(src,dst,w);else if(w.type==='swap'){animateFlight(src,dst,w);if(w.oldCard){setTimeout(()=>animateFlight(w.swapOutId||dst,w.discardId||'play-discard-pile',{card:w.oldCard}),60)}}pulseTarget(dst||`player-${w.actor}`)}
function runWatchFx(){runMotionQueue()}
function actionBlindStackHTML(canDirect){const click=canDirect?'onclick="Game.takeActionBlind(false)" role="button" tabindex="0"':'';const n=state?.actionDeck?.length??0;return `<div id="action-deck-pile" class="action-blind-hit ${canDirect?'enabled':''}" ${click}><div class="action-deck-back"><span class="deck-count-badge">${n}</span><span class="bolt">⚡</span><b>Verdeckt</b><small>${canDirect?'ziehen':'Aktionsstapel'}</small></div></div>`}

const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function log(msg){if(!state)return; state.log.unshift(msg);state.log=state.log.slice(0,50);save();}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
function normalizeCloudRoom(v){return String(v||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,20)}
function randomCloudRoom(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let out='';for(let i=0;i<5;i++)out+=a[Math.floor(Math.random()*a.length)];return out}
const DEVICE_KEY='skyjo_action_device_v2';
function getDeviceId(){let x='';try{x=localStorage.getItem(DEVICE_KEY)||''}catch(_e){}if(!x){x='d_'+uid();try{localStorage.setItem(DEVICE_KEY,x)}catch(_e){}}return x}
cloud.deviceId=getDeviceId();cloud.doc=null;cloud.role='';cloud.myName='';cloud.lastError='';cloud.serverOK=null;
function identityKey(room){return `skyjo_identity_${normalizeCloudRoom(room)}`}
function saveIdentity(){if(!cloud.room)return;try{localStorage.setItem(identityKey(cloud.room),JSON.stringify({id:cloud.deviceId,name:cloud.myName||''}))}catch(_e){}}
function loadIdentity(room){try{const x=JSON.parse(localStorage.getItem(identityKey(room))||'null');if(x?.id===cloud.deviceId)return x}catch(_e){}return null}
function cloudConfigSave(){try{localStorage.setItem(CLOUD_CFG_KEY,JSON.stringify({enabled:!!cloud.enabled,room:cloud.room||'',name:cloud.myName||''}))}catch(_e){}}
function cloudConfigLoad(){try{const x=JSON.parse(localStorage.getItem(CLOUD_CFG_KEY)||'null');if(x){cloud.enabled=!!x.enabled;cloud.room=normalizeCloudRoom(x.room);cloud.myName=String(x.name||'')}}catch(_e){}const q=new URLSearchParams(location.search);const qr=normalizeCloudRoom(q.get('room'));if(qr){cloud.enabled=true;cloud.room=qr}if(SKYJO_REQUESTED_MODE==='local'){cloud.enabled=false;cloud.room='';}else if(SKYJO_REQUESTED_MODE==='online'){cloud.enabled=true;}}
function migrateState(x){if(!x||x.version!==1)return null;if(!Array.isArray(x.motionFeed))x.motionFeed=[];if(!Array.isArray(x.reactionFeed))x.reactionFeed=[];if(!Array.isArray(x.removedCards))x.removedCards=[];if(!x.dismissedMatches||typeof x.dismissedMatches!=='object'||Array.isArray(x.dismissedMatches))x.dismissedMatches={};if(!Array.isArray(x.setupOrder))x.setupOrder=[];if(!Number.isInteger(x.setupOrderPos))x.setupOrderPos=0;if(!Number.isInteger(x.jokerCount))x.jokerCount=8;if(typeof x.jokerEnabled!=='boolean')x.jokerEnabled=false;if(typeof x.streetModeEnabled!=='boolean')x.streetModeEnabled=false;if(!x.roundJokerValues||typeof x.roundJokerValues!=='object'||Array.isArray(x.roundJokerValues))x.roundJokerValues={};if(x.turnFlow&&typeof x.turnFlow!=='object')x.turnFlow=null;if(x.roundClose&&typeof x.roundClose!=='object')x.roundClose=null;if(x.toiletPause&&typeof x.toiletPause!=='object')x.toiletPause=null;if(x.toiletPause&&!x.toiletPause.active)x.toiletPause=null;if(x.funJoke&&typeof x.funJoke!=='object')x.funJoke=null;for(const p of (x.players||[])){if(typeof p.isAI!=='boolean')p.isAI=false;if(!['easy','normal','hard'].includes(p.aiDifficulty))p.aiDifficulty='normal';if(!p.aiKnowledge||typeof p.aiKnowledge!=='object')p.aiKnowledge={};if(!Number.isFinite(p.bankedStarBonus))p.bankedStarBonus=0}/* V15.16: fertige Reihen bleiben grundsätzlich liegen; alte Ja/Nein-Entscheidungen werden verworfen. */if(x.pendingMatch)x.pendingMatch=null;
/* V15.19: alte Spielstände hatten in der Schlussrunde nur den direkt nächsten Spieler.
   Falls gerade noch eine Schlussrunde läuft, wird die restliche Reihenfolge anhand
   von Rundenbeender + aktuellem Spieler automatisch repariert. */
if(!Array.isArray(x.finalTurnQueue))x.finalTurnQueue=[];
if(x.phase==='play'&&Number.isInteger(x.roundEnder)&&x.roundEnder>=0&&Array.isArray(x.players)&&x.players.length>1&&Number.isInteger(x.currentPlayer)&&x.currentPlayer!==x.roundEnder){
 const repaired=[];
 for(let step=1;step<x.players.length;step++){
   const pi=(x.currentPlayer+step)%x.players.length;
   if(pi===x.roundEnder)break;
   repaired.push(pi)
 }
 x.finalTurnQueue=repaired
}
return x}
function recoverInterruptedMatchDecision(){return false}
const PERSIST_FLOW_MODES=new Set(['turnChoice','drawnDecision','drawnSwap','discardSwap','flipOwn','chooseActionTurn','ownSwapSelect','draw3Choose','draw3Target','enlightSelect','reactivate','otherSwapSetup','otherSwapSelect','thiefSelect','meteorSelect','starChoice']);
function captureTurnFlow(){
 if(!state)return;
 if(state.phase==='play'){
   const mode=PERSIST_FLOW_MODES.has(ui.mode)?ui.mode:'turnChoice';
   state.turnFlow={turnNo:Number(state.turnNo)||0,currentPlayer:Number(state.currentPlayer)||0,mode,data:clone(ui.data||{}),selected:clone(ui.selected||[])};
 }else if(state.phase==='initialReveal'){
   state.turnFlow={turnNo:Number(state.turnNo)||0,currentPlayer:Number(state.currentPlayer)||0,mode:'setupReveal',data:{},selected:[]};
 }else state.turnFlow=null;
}
function validTurnFlow(){
 const f=state?.turnFlow;if(!f||typeof f!=='object'||!PERSIST_FLOW_MODES.has(f.mode))return null;
 if(Number(f.turnNo)!==Number(state.turnNo)||Number(f.currentPlayer)!==Number(state.currentPlayer))return null;
 return f;
}
function restorePlayUIFromState(){
 if(!state)return {mode:'none',data:{},selected:[]};
 if(state.pendingMatch)state.pendingMatch=null;
 if(state.phase==='play'){
   const f=validTurnFlow();
   if(f)return {mode:f.mode,data:clone(f.data||{}),selected:clone(f.selected||[])};
   return {mode:'turnChoice',data:{},selected:[]};
 }
 if(state.phase==='initialReveal')return {mode:'setupReveal',data:{},selected:[]};
 if(state.phase==='roundReveal')return {mode:'roundReveal',data:{stage:state.roundClose?.stage||'reveal'},selected:[]};
 if(state.phase==='scoring'||state.phase==='scoringSequence')return {mode:'scoreSequence',data:{},selected:[]};
 if(state.phase==='betweenRounds'||state.phase==='gameOver')return {mode:'none',data:{},selected:[]};
 return {mode:'turnChoice',data:{},selected:[]};
}
function pendingMatchGuard(){
 if(state?.pendingMatch){state.pendingMatch=null;save()}
 return false;
}
function isModalOpen(){return !!$('#modalBack')?.classList.contains('show')}
function flowActorIndex(){
 if(!state)return -1;
 if(ui.mode==='starChoice')return Number(ui.data?.owners?.[ui.data?.ownerIndex]??state.currentPlayer);
 return actorIndex();
}
function canControlFlow(){
 if(!cloud.enabled)return true;
 const me=myPlayerIndex();return me>=0&&me===flowActorIndex();
}
function isRoomDoc(x){return !!(x&&x.kind==='skyjo-room-v2'&&x.version===2&&x.lobby&&Array.isArray(x.lobby.players))}
function myPlayerIndex(){if(!cloud.enabled||!isRoomDoc(cloud.doc))return -1;return cloud.doc.lobby.players.findIndex(p=>p.id===cloud.deviceId)}
function preferredViewPlayerIndex(){
 if(!state?.players?.length)return 0;
 const me=cloud.enabled?myPlayerIndex():-1;
 if(me>=0&&state.players[me])return me;
 const firstHuman=state.players.findIndex(p=>!p.isAI);
 return firstHuman>=0?firstHuman:0
}
function actorIndex(){if(!state)return -1;return state.phase==='initialReveal'?Number(state.setupPlayer):Number(state.currentPlayer)}
function isMyActorDevice(){if(!cloud.enabled)return true;const me=myPlayerIndex();return me>=0&&me===actorIndex()}
function isHostDevice(){return !!(cloud.enabled&&isRoomDoc(cloud.doc)&&cloud.doc.lobby.hostId===cloud.deviceId)}
let localSaveTimer=null,pendingLocalStateJSON='',lastLocalStateJSON='';
function flushLocalSaveNow(){
 if(localSaveTimer){clearTimeout(localSaveTimer);localSaveTimer=null}
 const raw=pendingLocalStateJSON;
 if(!raw||raw===lastLocalStateJSON)return;
 try{localStorage.setItem(SAVE_KEY,raw);lastLocalStateJSON=raw;pendingLocalStateJSON=''}catch(e){console.warn('[local save]',e)}
}
function scheduleLocalSnapshot(raw){
 if(!raw||raw===lastLocalStateJSON)return;
 pendingLocalStateJSON=raw;
 if(localSaveTimer)return;
 localSaveTimer=setTimeout(flushLocalSaveNow,80)
}
function save(){
 try{
   if(!state)return;
   captureTurnFlow();
   const raw=JSON.stringify(state);
   scheduleLocalSnapshot(raw);
   if(cloud.enabled&&isRoomDoc(cloud.doc)&&!cloud.applying){
     /* Kein JSON-clone mehr vor jedem Render. Der bereits erzeugte Snapshot reicht. */
     cloud.doc.game=JSON.parse(raw);
     cloud.doc.lobby.status='playing';
     scheduleCloudPush(JSON.stringify(cloud.doc))
   }
 }catch(e){console.warn('[save]',e)}
}
function load(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return null;lastLocalStateJSON=raw;return migrateState(JSON.parse(raw))}catch(e){}return null}
function jokerFunctionEnabled(){return !state||state.jokerEnabled!==false}
function jokerSpecialsEnabled(){return !state||state.jokerEnabled!==false}
function cloudBadgeHTML(){if(!cloud.enabled||!cloud.room){const bots=state?.players?.filter(p=>p.isAI).length||0;return bots?`<span class="cloud-pill local">🤖 ${bots} Computer</span>`:'<span class="cloud-pill local">Lokal</span>';}const me=myPlayerIndex(),nm=me>=0?cloud.doc?.lobby?.players?.[me]?.name:'';const cls=cloud.serverOK===false||cloud.lastStatus==='error'?'error':(cloud.serverOK===true?'online':'syncing');const ico=cls==='error'?'⚠':cls==='syncing'?'↻':'☁';return `<span class="cloud-pill ${cls}">${ico} ${escapeHTML(cloud.room)}${nm?' · '+escapeHTML(nm):''}</span>`}
async function fetchJSON(url,opts={}){const {timeoutMs=25000,...fetchOpts}=opts||{};const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),Math.max(1000,Number(timeoutMs)||25000));try{
  if(SKYJO_IN_HUB&&String(url).startsWith(CLOUD_BASE+'/skyjo/'+SKYJO_HUB_GAME)){
    const user=window.SpielOnline?.state?.()?.user;
    if(!user)throw Error('HUB_LOGIN_REQUIRED');
    const token=await user.getIdToken();
    fetchOpts.headers={...(fetchOpts.headers||{}),Authorization:'Bearer '+token};
  }
  const r=await fetch(url,{...fetchOpts,signal:ctl.signal});const body=await r.text();let j=null;try{j=body?JSON.parse(body):null}catch(_e){}return {r,j,text:body}}finally{clearTimeout(tm)}}
async function probeSkyjoServer(){const urls=[`${CLOUD_BASE}/skyjo-health`,`${CLOUD_BASE}/skyjo/PINGCHECK`];let last='keine Antwort';for(const url of urls){try{const {r,j}=await fetchJSON(url,{cache:'no-store',timeoutMs:65000});if(r.ok&&j?.ok){cloud.serverOK=true;cloud.lastStatus='online';cloud.lastError='';return true}last=`HTTP ${r.status}`}catch(e){last=e?.name==='AbortError'?'Zeitüberschreitung':(e?.message||String(e));console.warn('[skyjo probe]',url,e)}}cloud.serverOK=false;cloud.lastStatus='error';cloud.lastError=`Render-Server antwortet nicht zuverlässig (${last}). Bei Free-Render kann das Aufwachen bis zu 50 Sekunden dauern.`;return false}
function processCloudReactions(items,seq){const serverSeq=Number(seq||0)||0;if(serverSeq<Number(cloud.reactionSeq||0))cloud.reactionSeq=0;for(const r of (Array.isArray(items)?items:[])){if(r?.emoji)showEmojiReaction(r)}cloud.reactionSeq=Math.max(Number(cloud.reactionSeq||0),serverSeq)}
async function fetchCloudRoom(room=cloud.room,delta=false){const rc=normalizeCloudRoom(room);if(!rc)return null;try{let url=`${CLOUD_BASE}/skyjo/${encodeURIComponent(rc)}`;if(delta){const q=new URLSearchParams({rev:String(Number(cloud.rev||0)),reactionSeq:String(Number(cloud.reactionSeq||0))});url+=`?${q.toString()}`}const {r,j}=await fetchJSON(url,{cache:'no-store',timeoutMs:30000});if(!r.ok||!j?.ok){cloud.lastError=r.status===404?'SKYJO-Endpunkte fehlen auf Render. Neue server.js deployen.':(j?.error||`HTTP ${r.status}`);return null}if(delta)processCloudReactions(j?.reactions,j?.reactionSeq);else cloud.reactionSeq=Number(j?.reactionSeq||0)||0;cloud.serverOK=true;cloud.lastStatus='online';cloud.lastError='';return j}catch(e){cloud.serverOK=false;cloud.lastStatus='error';cloud.lastError=e?.name==='AbortError'?'Cloud-Raum antwortet zu langsam. Verbindung bleibt bestehen und wird erneut versucht.':'Cloud-Raum konnte nicht geladen werden.';console.warn('[skyjo cloud load]',e);return null}}
function applyCloudDoc(remote,rev){
 if(!isRoomDoc(remote))return false;
 const nextRev=Number(rev)||0;
 if(nextRev&&nextRev<Number(cloud.rev||0))return false;
 const prevPhase=state?.phase||'',prevRound=Number(state?.round||0),hadGame=!!state;
 cloud.applying=true;
 try{
   cloud.doc=clone(remote);
   cloud.rev=nextRev;
   cloud.lastPushedJSON=JSON.stringify(cloud.doc);
   cloud.role=isHostDevice()?'host':'player';
   const me=myPlayerIndex();
   if(me>=0){cloud.myName=cloud.doc.lobby.players[me]?.name||cloud.myName;saveIdentity()}
   state=cloud.doc.game?migrateState(clone(cloud.doc.game)):null;
   if(state){
     const raw=JSON.stringify(state);
     scheduleLocalSnapshot(raw);
     ui=restorePlayUIFromState()
   }else ui={mode:'none',data:{},selected:[]};
   const roundAdvanced=!!state&&Number(state.round||0)>prevRound;
   const leftRoundSummary=(prevPhase==='betweenRounds'||prevPhase==='gameOver')&&!!state&&state.phase!=='betweenRounds'&&state.phase!=='gameOver';
   const returnedToRoomLobby=hadGame&&!state&&cloud.doc?.lobby?.status==='lobby';
   if(roundAdvanced||leftRoundSummary||returnedToRoomLobby){
     try{closeModal()}catch(_e){}
     roundSummarySeen='';
     scoreSequenceSeen='';
     try{document.querySelectorAll('.score-sequence-overlay,.finale-confetti,.game-fx,.fx-spark,.game-announcement,.joke-popup,.bible-popup').forEach(el=>el.remove())}catch(_e){}
   }
   cloudConfigSave();
   /* Wichtig: render() läuft noch mit cloud.applying=true.
      Dadurch wird ein empfangener Spielstand NICHT sofort wieder zurückgeschrieben. */
   render();
   return true
 }finally{
   cloud.applying=false
 }
}
function scheduleCloudApply(remote,rev){
 const nextRev=Number(rev)||0;
 if(!isRoomDoc(remote)||nextRev<=Number(cloud.rev||0))return;
 if(!cloud.deferredRemote||nextRev>Number(cloud.deferredRemote.rev||0))cloud.deferredRemote={remote:clone(remote),rev:nextRev};
 if(cloud.applyScheduled||motionBusy||motionQueueBusy)return;
 cloud.applyScheduled=true;
 requestAnimationFrame(()=>{
   cloud.applyScheduled=false;
   if(motionBusy||motionQueueBusy)return;
   const d=cloud.deferredRemote;cloud.deferredRemote=null;
   if(d&&Number(d.rev||0)>Number(cloud.rev||0))applyCloudDoc(d.remote,d.rev)
 })
}
function flushDeferredCloudApply(){
 if(!cloud.deferredRemote||motionBusy||motionQueueBusy)return;
 scheduleCloudApply(cloud.deferredRemote.remote,cloud.deferredRemote.rev)
}
async function postCloudDoc(doc,baseRev=cloud.rev){
 const requestRoom=cloud.room,requestEpoch=Number(cloud.roomEpoch||0);
 try{
   const {r,j}=await fetchJSON(`${CLOUD_BASE}/skyjo/${encodeURIComponent(requestRoom)}/state`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:doc,baseRev}),timeoutMs:30000});
   const stillCurrent=cloud.room===requestRoom&&Number(cloud.roomEpoch||0)===requestEpoch;
   if(r.status===409)return {ok:false,conflict:true,remote:j?.state||null,rev:Number(j?.rev)||0,room:requestRoom,epoch:requestEpoch,staleContext:!stillCurrent};
   if(!r.ok||!j?.ok){
     if(stillCurrent)cloud.lastError=j?.error||`HTTP ${r.status}`;
     return {ok:false,room:requestRoom,epoch:requestEpoch,staleContext:!stillCurrent}
   }
   const newRev=Number(j.rev)||Number(baseRev)||0;
   if(stillCurrent){
     cloud.rev=newRev;
     cloud.serverOK=true;
     cloud.lastStatus='online';
     cloud.lastError=''
   }
   return {ok:true,rev:newRev,room:requestRoom,epoch:requestEpoch,staleContext:!stillCurrent}
 }catch(e){
   const stillCurrent=cloud.room===requestRoom&&Number(cloud.roomEpoch||0)===requestEpoch;
   if(stillCurrent){
     cloud.serverOK=false;
     cloud.lastStatus='error';
     cloud.lastError=e?.name==='AbortError'?'Speichern dauert zu lange – Verbindung wird erneut versucht.':'Speichern auf Render fehlgeschlagen.'
   }
   console.warn('[skyjo cloud write]',e);
   return {ok:false,room:requestRoom,epoch:requestEpoch,staleContext:!stillCurrent}
 }
}
function scheduleCloudPush(raw){
 if(!cloud.enabled||!cloud.room||!isRoomDoc(cloud.doc))return;
 if(raw===cloud.lastPushedJSON)return;
 cloud.pending=true;cloud.pendingJSON=raw;
 if(cloud.inFlight)return;
 if(cloud.pushTimer)clearTimeout(cloud.pushTimer);
 cloud.pushTimer=setTimeout(()=>{cloud.pushTimer=null;flushCloudPush()},70)
}
async function flushCloudPush(){
 if(cloud.pushTimer){clearTimeout(cloud.pushTimer);cloud.pushTimer=null}
 if(cloud.inFlight||!cloud.pending||!cloud.enabled||!cloud.room)return;
 const requestRoom=cloud.room,requestEpoch=Number(cloud.roomEpoch||0);
 cloud.inFlight=true;cloud.pending=false;
 const raw=cloud.pendingJSON||JSON.stringify(cloud.doc);
 try{
   const doc=JSON.parse(raw),out=await postCloudDoc(doc,cloud.rev);
   if(cloud.room!==requestRoom||Number(cloud.roomEpoch||0)!==requestEpoch||out?.staleContext)return;
   if(out.conflict){
     if(out.remote)scheduleCloudApply(out.remote,out.rev);
     else{
       const fresh=await fetchCloudRoom(cloud.room,false);
       if(fresh?.found&&isRoomDoc(fresh.state))scheduleCloudApply(fresh.state,fresh.rev||0)
     }
     toast('☁ Neuerer Spielstand wurde geladen')
   }else if(!out.ok)throw new Error(cloud.lastError||'Cloudfehler');
   else{cloud.lastPushedJSON=raw;cloud.lastStatus='online';cloud.pollErrors=0;cloudConfigSave()}
 }catch(e){
   cloud.lastStatus='error';
   console.warn('[skyjo cloud push]',e)
 }finally{
   cloud.inFlight=false;
   if(cloud.room===requestRoom&&Number(cloud.roomEpoch||0)===requestEpoch&&cloud.pending){
     if(cloud.pushTimer)clearTimeout(cloud.pushTimer);
     cloud.pushTimer=setTimeout(()=>{cloud.pushTimer=null;flushCloudPush()},100)
   }
 }
}

function stopCloudRoomRuntime(){
 clearGameAnnouncement();
 clearTableAnnouncement();
 clearJokePopup();
 clearBiblePopup();
 if(cloud.pollTimer)clearTimeout(cloud.pollTimer);
 if(cloud.pushTimer)clearTimeout(cloud.pushTimer);
 cloud.pollTimer=null;
 cloud.pushTimer=null;
 cloud.pending=false;
 cloud.pendingJSON='';
 cloud.deferredRemote=null;
 cloud.applyScheduled=false;
 cloud.pollBusy=false;
 cloud.pollErrors=0
}
function switchCloudRoomContext(room){
 stopCloudRoomRuntime();
 cloud.roomEpoch=Number(cloud.roomEpoch||0)+1;
 cloud.room=normalizeCloudRoom(room||'');
 cloud.rev=0;
 cloud.doc=null;
 cloud.lastPushedJSON='';
 cloud.reactionSeq=0
}

function roomSettingsFromSetup(){return {target:Math.max(20,Number($('#target')?.value)||100),beginner:$('#beginner')?.value==='1',jokerCount:Math.max(0,Math.min(30,Math.floor(Number($('#jokerCount')?.value)||0))),jokerEnabled:!!$('#jokerEnabled')?.checked,streetModeEnabled:!!$('#streetModeEnabled')?.checked}}

function abortRoomActionContext(message=''){
 stopCloudRoomRuntime();
 cloud.enabled=true; /* Online setup stays selected, but no room is considered connected. */
 cloud.doc=null;
 cloud.rev=0;
 cloud.lastPushedJSON='';
 if(message)cloud.lastError=message;
 cloudConfigSave()
}

// V8C: verified login/seat association only, NOT verification of SKYJO game results.
let skyjoClaimedProfileKey='';
async function claimSkyjoOnlineProfile(){
  const current=window.SpielOnline?.state?.();
  if(current?.status!=='online'||!current.user||!cloud.room||!isRoomDoc(cloud.doc))return;
  const uid=current.user.uid,room=cloud.room,seat=cloud.deviceId,claimKey=`${uid}:${room}:${seat}`;
  if(skyjoClaimedProfileKey===claimKey||!cloud.doc.lobby.players.some(p=>p.id===seat))return;
  try{
    const token=await window.SpielMatchIdentity?.getToken?.();if(!token)return;
    if(cloud.room!==room||window.SpielOnline?.state?.()?.user?.uid!==uid)return;
    const {r,j}=await fetchJSON(`${CLOUD_BASE}/api/profile/seat/claim`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({game:'skyjo',code:room,seatToken:seat}),timeoutMs:90000});
    if(r.ok&&j?.bound){skyjoClaimedProfileKey=claimKey;toast('🔐 Online-Konto mit SKYJO-Spielplatz verknüpft · noch keine offizielle Siegwertung.');}
    else if(j?.error==='SEAT_ALREADY_BOUND'||j?.error==='ACCOUNT_ALREADY_IN_ROOM')toast('⚠ SKYJO-Spielplatz bereits einem anderen Konto zugeordnet (weiterhin ungewertet).');
  }catch(e){console.warn('[skyjo/profile-seat]',e?.message||e);}
}
window.addEventListener('spielonline-change',()=>{if(window.SpielOnline?.state?.()?.status==='online'&&isRoomDoc(cloud.doc))void claimSkyjoOnlineProfile();});
async function createOnlineRoom(){if(SKYJO_IN_HUB)return;if(cloud.roomActionBusy){toast('Verbindung läuft bereits …');return}cloud.roomActionBusy=true;try{const name=String($('#onlineName')?.value||'').trim();let rc=normalizeCloudRoom($('#cloudRoom')?.value||'');if(!name){toast('Bitte deinen Namen eingeben');return}if(!rc)rc=randomCloudRoom();switchCloudRoomContext(rc);cloud.enabled=true;cloud.myName=name;cloudConfigSave();toast('Server wird geprüft …');if(!await probeSkyjoServer()){abortRoomActionContext(cloud.lastError);render();toast(cloud.lastError);return}const existing=await fetchCloudRoom(rc,false);if(!existing){abortRoomActionContext(cloud.lastError||'Raumprüfung fehlgeschlagen');render();toast(cloud.lastError||'Raumprüfung fehlgeschlagen – bitte erneut versuchen.');return}if(existing.found){abortRoomActionContext('Dieser Raumcode existiert bereits.');toast('Dieser Raumcode existiert schon – bitte neuen Code wählen');return}const settings=roomSettingsFromSetup();const doc={kind:'skyjo-room-v2',version:2,lobby:{status:'lobby',hostId:cloud.deviceId,createdAt:Date.now(),settings,players:[{id:cloud.deviceId,name,joinedAt:Date.now()}]},game:null};cloud.rev=0;const out=await postCloudDoc(doc,0);if(out.conflict){cloud.rev=Number(out.rev)||0;toast('Dieser Raumcode wurde gerade vergeben – bitte „Neuer Code“ wählen.');return}if(!out.ok){toast(cloud.lastError||'Raum konnte nicht erstellt werden');return}cloud.doc=doc;cloud.role='host';cloud.pollErrors=0;saveIdentity();startCloudPolling();render();void claimSkyjoOnlineProfile();toast(`Raum ${rc} erstellt`)}finally{cloud.roomActionBusy=false}}
async function joinOnlineRoom(){if(SKYJO_IN_HUB)return;if(cloud.roomActionBusy){toast('Verbindung läuft bereits …');return}cloud.roomActionBusy=true;try{const name=String($('#onlineName')?.value||'').trim();const rc=normalizeCloudRoom($('#cloudRoom')?.value||'');if(!name||!rc){toast('Name und Raumcode eingeben');return}switchCloudRoomContext(rc);cloud.enabled=true;cloud.myName=name;cloudConfigSave();toast('Server wird geprüft …');if(!await probeSkyjoServer()){abortRoomActionContext(cloud.lastError);render();toast(cloud.lastError);return}for(let attempt=0;attempt<4;attempt++){const j=await fetchCloudRoom(rc,false);if(!j){abortRoomActionContext(cloud.lastError||'Raum konnte nicht geladen werden.');toast(cloud.lastError||'Raum konnte nicht geladen werden.');return}if(!j.found||!isRoomDoc(j.state)){abortRoomActionContext(j.found?'Alte SKYJO-Raumversion.':'Raum nicht gefunden');toast(j.found?'Dieser Raum stammt aus einer alten SKYJO-Version.':'Raum nicht gefunden');return}let doc=clone(j.state);cloud.rev=Number(j.rev)||0;let idx=doc.lobby.players.findIndex(p=>p.id===cloud.deviceId);if(doc.lobby.status==='playing'&&idx<0){toast('Das Spiel läuft bereits – neue Spieler können nicht mehr beitreten');return}if(idx<0){if(doc.lobby.players.length>=8){toast('Raum ist voll');return}doc.lobby.players.push({id:cloud.deviceId,name,joinedAt:Date.now()});idx=doc.lobby.players.length-1}else doc.lobby.players[idx].name=name;const out=await postCloudDoc(doc,cloud.rev);if(out.conflict){await sleep(180+attempt*120);continue}if(!out.ok){toast(cloud.lastError||'Beitreten fehlgeschlagen');return}cloud.doc=doc;cloud.role=doc.lobby.hostId===cloud.deviceId?'host':'player';cloud.pollErrors=0;saveIdentity();startCloudPolling();render();void claimSkyjoOnlineProfile();toast(`Mit ${rc} verbunden`);return}toast('Raum wurde gerade mehrfach geändert – bitte „Beitreten“ erneut drücken')}finally{cloud.roomActionBusy=false}}
async function restoreOnlineRoom(){
 if(!cloud.enabled||!cloud.room)return;
 try{
   closeModal();
   document.querySelectorAll('.score-sequence-overlay,.finale-confetti,.game-fx,.fx-spark,.game-announcement,.joke-popup,.bible-popup').forEach(el=>el.remove())
 }catch(_e){}
 roundSummarySeen='';scoreSequenceSeen='';
 state=null;ui={mode:'none',data:{},selected:[]};render();

 const ident=loadIdentity(cloud.room);if(ident?.name)cloud.myName=ident.name;
 if(!await probeSkyjoServer()){cloud.doc=null;state=null;render();return}
 const j=await fetchCloudRoom(cloud.room,false);
 if(j?.found&&isRoomDoc(j.state)){applyCloudDoc(j.state,j.rev||0);cloud.pollErrors=0;startCloudPolling();void claimSkyjoOnlineProfile()}
 else{
   cloud.doc=null;state=null;cloud.rev=0;cloud.lastPushedJSON='';
   /* Ein nicht mehr existierender Raum darf nicht als Auto-Reconnect-Falle erhalten bleiben. */
   if(j?.found===false){cloud.room='';cloud.enabled=SKYJO_REQUESTED_MODE==='online';cloudConfigSave()}
   render()
 }
}
async function startOnlineGame(){if(SKYJO_IN_HUB&&(!cloud.doc||cloud.doc.lobby?.status!=='lobby'))return;if(cloud.startBusy){toast('Spielstart läuft bereits …');return}if(!isRoomDoc(cloud.doc)||!isHostDevice()){toast('Nur der Host kann starten');return}cloud.startBusy=true;try{const ps=cloud.doc.lobby.players;if(ps.length<2){toast('Mindestens 2 Spieler müssen verbunden sein');return}const set=cloud.doc.lobby.settings||{};const nextState=setupState(ps.map(p=>p.name),Number(set.target)||100,!!set.beginner,Number.isInteger(set.jokerCount)?set.jokerCount:8,set.jokerEnabled===true,null,set.streetModeEnabled===true),nextDoc=clone(cloud.doc);nextDoc.game=clone(nextState);nextDoc.lobby.status='playing';nextDoc.lobby.startedAt=Date.now();const out=await postCloudDoc(nextDoc,cloud.rev);if(out.conflict){if(out.remote)applyCloudDoc(out.remote,out.rev);else{const fresh=await fetchCloudRoom(cloud.room,false);if(fresh?.found&&isRoomDoc(fresh.state))applyCloudDoc(fresh.state,fresh.rev||0);else render()}toast('Lobby wurde aktualisiert – bitte nochmal starten');return}if(!out.ok){const fresh=await fetchCloudRoom(cloud.room,false);if(fresh?.found&&isRoomDoc(fresh.state))applyCloudDoc(fresh.state,fresh.rev||0);else render();toast(cloud.lastError||'Start fehlgeschlagen');return}state=nextState;ui={mode:'setupReveal',data:{},selected:[]};cloud.doc=nextDoc;cloud.lastPushedJSON=JSON.stringify(cloud.doc);render();toast(`${state.players[0].name}: Decke 2 Karten auf`)}finally{cloud.startBusy=false}}
async function leaveOnlineRoom(){
 if(SKYJO_IN_HUB){returnToSharedHub();return;}
 const room=cloud.room,doc=isRoomDoc(cloud.doc)?clone(cloud.doc):null,me=myPlayerIndex();
 if(room&&doc&&me>=0){
   try{
     const removeMe=d=>{
       const i=d?.lobby?.players?.findIndex(p=>p.id===cloud.deviceId)??-1;
       if(i>=0)d.lobby.players.splice(i,1);
       if(d?.lobby?.hostId===cloud.deviceId)d.lobby.hostId=d.lobby.players[0]?.id||'';
       return d
     };
     const finished=doc.game?.phase==='gameOver'||state?.phase==='gameOver';

     if(finished){
       /* Ein abgeschlossenes Spiel darf nicht als Zombie-Raum "playing" zurückbleiben.
          Verlässt der Host, werden die übrigen Spieler zuerst gemeinsam in die Lobby
          gebracht. Verlässt ein Mitspieler, wird wenigstens sein Sitz sauber entfernt. */
       if(doc.lobby?.hostId===cloud.deviceId){
         doc.game=null;
         doc.lobby.status='lobby';
         delete doc.lobby.startedAt;
         doc.lobby.finishedAt=Date.now();
         removeMe(doc)
       }else{
         removeMe(doc)
       }

       if(doc.lobby.players.length===0){
         await fetchJSON(`${CLOUD_BASE}/skyjo/${encodeURIComponent(room)}/reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',timeoutMs:12000})
       }else{
         let out=await postCloudDoc(doc,cloud.rev);
         if(out?.conflict){
           const fresh=await fetchCloudRoom(room,false);
           if(fresh?.found&&isRoomDoc(fresh.state)){
             const next=clone(fresh.state);
             const freshFinished=next.game?.phase==='gameOver';
             if(next.lobby?.hostId===cloud.deviceId&&freshFinished){
               next.game=null;
               next.lobby.status='lobby';
               delete next.lobby.startedAt;
               next.lobby.finishedAt=Date.now()
             }
             removeMe(next);
             if(next.lobby.players.length)await postCloudDoc(next,Number(fresh.rev)||0);
             else await fetchJSON(`${CLOUD_BASE}/skyjo/${encodeURIComponent(room)}/reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',timeoutMs:12000})
           }
         }
       }
     }else if(doc.lobby?.status==='lobby'&&!doc.game){
       removeMe(doc);
       if(doc.lobby.players.length===0){
         await fetchJSON(`${CLOUD_BASE}/skyjo/${encodeURIComponent(room)}/reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',timeoutMs:12000})
       }else{
         let out=await postCloudDoc(doc,cloud.rev);
         if(out?.conflict){
           const fresh=await fetchCloudRoom(room,false);
           if(fresh?.found&&isRoomDoc(fresh.state)){
             const next=removeMe(clone(fresh.state));
             if(next.lobby.players.length)await postCloudDoc(next,Number(fresh.rev)||0)
           }
         }
       }
     }else if(doc.lobby?.status==='playing'&&doc.lobby.hostId===cloud.deviceId&&doc.lobby.players.length>1){
       /* Laufendes Spiel: Reconnect bleibt weiterhin möglich. */
       const successor=doc.lobby.players.find(p=>p.id!==cloud.deviceId);
       if(successor){doc.lobby.hostId=successor.id;await postCloudDoc(doc,cloud.rev)}
     }
   }catch(e){console.warn('[skyjo leave room]',e)}
 }

 try{closeModal()}catch(_e){}
 roundSummarySeen='';scoreSequenceSeen='';
 stopCloudRoomRuntime();
 cloud.roomEpoch=Number(cloud.roomEpoch||0)+1;
 cloud.enabled=SKYJO_REQUESTED_MODE==='online';cloud.room='';cloud.doc=null;cloud.rev=0;cloud.role='';cloud.lastError='';cloud.serverOK=null;cloud.reactionSeq=0;cloud.roomActionBusy=false;cloud.startBusy=false;cloud.inFlight=false;cloud.lastStatus='local';state=null;
 // Raum verlassen darf lokale Spielstaende nicht loeschen.
 cloudConfigSave();
 render()
}
async function waitForCloudIdle(maxMs=3200){
 if(!cloud.enabled)return true;
 const end=Date.now()+Math.max(500,Number(maxMs)||3200);
 if(cloud.pending&&!cloud.inFlight)await flushCloudPush();
 while((cloud.inFlight||cloud.pending)&&Date.now()<end){await sleep(60);if(cloud.pending&&!cloud.inFlight)await flushCloudPush()}
 return !cloud.inFlight&&!cloud.pending
}
async function refreshPage(){
 try{if(state)save();flushLocalSaveNow();cloudConfigSave();if(cloud.enabled){toast('☁ Spielstand wird kurz gesichert …');await waitForCloudIdle(3500)}}catch(_e){}
 try{
   const u=new URL(location.href);
   u.searchParams.set('v',SKYJO_BUILD);
   u.searchParams.set('_r',String(Date.now()));
   location.replace(u.toString())
 }catch(_e){location.reload()}
}
async function toGameHub(){
 if(SKYJO_IN_HUB){returnToSharedHub();return;}
 const active=!!state||!!(cloud.enabled&&cloud.room);
 if(active&&!confirm(cloud.enabled
   ?'Zur Spielauswahl zurückkehren? Du verlässt diesen Online-Raum auf deinem Gerät. Andere Spieler können weiterspielen.'
   :'Zur Spielauswahl zurückkehren? Dein lokaler Spielstand wird vorher gespeichert.'))return;
 try{
   if(state){save();flushLocalSaveNow()}
   cloudConfigSave();
   if(cloud.enabled&&cloud.room)await waitForCloudIdle(2500);
 }catch(e){console.warn('Spielauswahl: Speicherung vor Navigation fehlgeschlagen',e)}
 location.assign('../index.html');
}
async function backToLobby(){
 if(SKYJO_IN_HUB){returnToSharedHub();return;}
 const online=!!cloud.enabled;
 const finished=online&&state?.phase==='gameOver';
 const msg=finished
   ?(isHostDevice()?'Zum Hauptmenü? Das abgeschlossene Online-Spiel wird sauber beendet und die übrigen Spieler kommen in die Raum-Lobby.':'Zum Hauptmenü? Du wirst aus dem abgeschlossenen Online-Raum entfernt.')
   :(online?'Zur Start-Lobby zurück? Das laufende Online-Spiel bleibt für einen möglichen Reconnect auf dem Server bestehen.':'Zur Start-Lobby zurück? Der aktuelle lokale Spielstand bleibt gespeichert und kann fortgesetzt werden.');
 if(!confirm(msg))return;
 try{closeModal()}catch(_e){}
 clearTimeout(aiTimer);aiBusy=false;aiActing=false;aiScheduledKey='';
 if(online){try{await waitForCloudIdle(3000)}catch(_e){}await leaveOnlineRoom();return}
 try{flushLocalSaveNow();sessionStorage.setItem(SKIP_RESUME_KEY,'1')}catch(_e){}
 state=null;ui={mode:'none',data:{},selected:[]};render()
}
function hasLocalSave(){try{return !!migrateState(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'))}catch(_e){return false}}
function resumeLocalGame(){const saved=load();if(!saved){toast('Kein gespeichertes lokales Spiel gefunden.');return}try{sessionStorage.removeItem(SKIP_RESUME_KEY)}catch(_e){}cloud.enabled=false;cloud.room='';cloud.doc=null;cloud.rev=0;cloudConfigSave();state=saved;ui=restorePlayUIFromState();render();toast('▶ Gespeichertes Spiel fortgesetzt')}
async function loadCloudRoom(){return joinOnlineRoom()}

function resetOnlineClient(){
 stopCloudRoomRuntime();
 cloud.roomEpoch=Number(cloud.roomEpoch||0)+1;
 cloud.inFlight=false;
 cloud.pending=false;
 cloud.pendingJSON='';
 cloud.doc=null;
 cloud.rev=0;
 cloud.lastPushedJSON='';
 cloud.lastError='';
 cloud.serverOK=null;
 cloud.lastStatus='local';
 cloud.reactionSeq=0;
 cloud.roomActionBusy=false;
 cloud.startBusy=false;
 state=null;
 ui={mode:'none',data:{},selected:[]};
 // Nur die Online-Verbindung zurücksetzen, lokale Speicherstände unangetastet lassen.
 cloudConfigSave();
 render();
 setTimeout(()=>{const mode=$('#cloudMode');if(mode){mode.value='cloud';toggleCloudFields()}},0);
 toast('↻ Lokale Online-Verbindung wurde zurückgesetzt')
}

function generateCloudRoom(){const input=$('#cloudRoom'),rc=randomCloudRoom();if(input)input.value=rc;toast(`Raumcode ${rc} gewählt`)}
function toggleCloudFields(){const sel=$('#cloudMode'),box=$('#cloudBox'),local=$('#localBox'),ai=$('#aiBox');if(!sel)return;const mode=sel.value||'local',on=mode==='cloud';skyjoLocalVariant=mode==='ai'?'ai':'local';if(box)box.style.display=on?'block':'none';if(local)local.style.display=mode==='local'?'block':'none';if(ai)ai.style.display=mode==='ai'?'block':'none';cloud.enabled=on;if(on){const inp=$('#cloudRoom');if(inp&&!inp.value)inp.value=cloud.room||randomCloudRoom()}else{cloud.doc=null;cloud.room=''}document.querySelectorAll('.mode-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.mode===mode));cloudConfigSave();if(mode==='local')setTimeout(updateNames,0)}
function selectSetupMode(mode){const sel=$('#cloudMode');if(!sel||!['local','ai','cloud'].includes(mode))return;sel.value=mode;toggleCloudFields()}
function cloudPollDelay(){
 if(document.hidden)return 6000;
 const errors=Math.min(3,Number(cloud.pollErrors||0));
 let base=1100;
 if(state?.phase==='gameOver')base=1800;
 else if(state&&(state.phase==='betweenRounds'||state.phase==='initialReveal'))base=700;
 else if(state&&cloud.enabled&&!isMyActorDevice())base=820;
 return Math.min(10000,base*Math.pow(2,errors))
}
function startCloudPolling(){
 if(cloud.pollTimer)clearTimeout(cloud.pollTimer);cloud.pollTimer=null;
 if(!cloud.enabled||!cloud.room)return;
 const tick=async()=>{
   if(!cloud.enabled||!cloud.room)return;
   /* Während einer sichtbaren Kartenbewegung keinen neuen DOM-Zustand hineinrendern. */
   if(!cloud.inFlight&&!cloud.pending&&!cloud.pollBusy&&!motionBusy&&!motionQueueBusy){
     const pollRoom=cloud.room,pollEpoch=Number(cloud.roomEpoch||0);
     cloud.pollBusy=true;
     try{
       const j=await fetchCloudRoom(pollRoom,true);
       if(cloud.room!==pollRoom||Number(cloud.roomEpoch||0)!==pollEpoch)return;
       if(j){
         cloud.pollErrors=0;
         if(j.found===false&&cloud.doc){
           cloud.doc=null;cloud.rev=0;state=null;ui={mode:'none',data:{},selected:[]};
           cloud.lastError='Dieser Online-Raum existiert nicht mehr.';render()
         }else if(j.found&&!j.unchanged&&isRoomDoc(j.state)&&Number(j.rev||0)>Number(cloud.rev||0)){
           scheduleCloudApply(j.state,j.rev||0)
         }
       }else cloud.pollErrors=Math.min(4,Number(cloud.pollErrors||0)+1)
     }catch(e){
       cloud.pollErrors=Math.min(4,Number(cloud.pollErrors||0)+1);
       console.warn('[skyjo poll]',e)
     }finally{cloud.pollBusy=false}
   }
   if(cloud.enabled&&cloud.room)cloud.pollTimer=setTimeout(tick,cloudPollDelay())
 };
 cloud.pollTimer=setTimeout(tick,250)
}
document.addEventListener('visibilitychange',()=>{if(cloud.enabled&&cloud.room)startCloudPolling()})
async function resetCloudRoom(){if(!cloud.enabled||!cloud.room)return;try{await fetchJSON(`${CLOUD_BASE}/skyjo/${encodeURIComponent(cloud.room)}/reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',timeoutMs:30000});cloud.rev=0;cloud.lastPushedJSON='';cloud.reactionSeq=0}catch(_e){}}

function newCard(type,value=null){return {id:uid(),type,value,faceUp:false}}
function makePlayDeck(jokerCount=8){let d=[];for(let i=0;i<3;i++)d.push(newCard('number',-2));for(let i=0;i<11;i++)d.push(newCard('number',0));for(const v of [-1,1,2,3,4,5,6,7,8,9,10,11,12])for(let i=0;i<7;i++)d.push(newCard('number',v));const jc=Math.max(0,Math.min(30,Math.floor(Number(jokerCount)||0)));for(let i=0;i<jc;i++)d.push(newCard('star'));return shuffle(d)}
function newAction(type){return {id:uid(),type,availableOwnTurn:0,stolen:false}}
function makeActionDeck(beginner){let d=[];for(const t of Object.keys(ACTIONS)){if(beginner&&(t==='thief'||t==='meteor'))continue;for(let i=0;i<3;i++)d.push(newAction(t))}return shuffle(d)}
function takePlay(){if(!state.playDeck.length){if(state.playDiscard.length<=1)return null;const top=state.playDiscard.pop();/* Gesperrte Reihen-Karten (removedCards) werden niemals wieder eingemischt. */state.playDeck=shuffle(state.playDiscard.splice(0));state.playDiscard=[top];log('Der normale Ablagestapel wurde neu gemischt. Gesperrte Reihen-Karten bleiben draußen.')}return state.playDeck.pop()||null}
function takeActionDeck(){if(!state.actionDeck.length){if(state.actionDiscard.length<=1)return null;const top=state.actionDiscard.pop();state.actionDeck=shuffle(state.actionDiscard.splice(0));state.actionDiscard=[top];log('Der Aktionskarten-Ablagestapel wurde neu gemischt.')}return state.actionDeck.pop()||null}
function refillMarket(){for(let i=0;i<4;i++)if(!state.market[i])state.market[i]=takeActionDeck();}
function current(){return state.players[state.currentPlayer]}
function visibleValue(card){return card.type==='star'?'★':card.value}
function cardPoints(card){return card.type==='star'?0:Number(card.value||0)}
function totalHidden(p){return p.grid.filter(c=>c&&!c.faceUp).length+p.extras.filter(c=>c&&!c.faceUp).length}
function hasDefense(pi){return state.players[pi].actions.find(a=>a.type==='defense')}
function consumeDefense(pi){const p=state?.players?.[Number(pi)];if(!p||!Array.isArray(p.actions))return false;const idx=p.actions.findIndex(a=>a?.type==='defense');if(idx<0)return false;const [a]=p.actions.splice(idx,1);if(a)state.actionDiscard.push(a);log(`${p.name}s Verteidigung blockt den Angriff.`);toast(`${p.name}: 🛡️ Angriff abgewehrt`);return true}
function setupState(names,target,beginner,jokerCount=8,jokerEnabled=false,aiConfig=null,streetModeEnabled=false){const playDeck=makePlayDeck(jokerCount),specials=jokerEnabled!==false,actionDeck=specials?makeActionDeck(beginner):[];const flags=aiConfig?.flags||[],diffs=aiConfig?.difficulties||[];const players=names.map((n,i)=>({name:n,total:0,grid:[],extras:[],actions:[],ownTurn:0,lastRound:0,bankedStarBonus:0,isAI:!!flags[i],aiDifficulty:diffs[i]||'normal',aiKnowledge:{}}));for(const p of players){for(let i=0;i<12;i++)p.grid.push(takeFrom(playDeck))}const playDiscard=[takeFrom(playDeck)];playDiscard[0].faceUp=true;const market=[];let actionDiscard=[];if(specials){for(let i=0;i<4;i++)market.push(takeFrom(actionDeck));const first=takeFrom(actionDeck);if(first)actionDiscard=[first]}return {version:1,phase:'initialReveal',round:1,target,beginner,jokerCount:Math.max(0,Math.min(30,Math.floor(Number(jokerCount)||0))),jokerEnabled:!!jokerEnabled,streetModeEnabled:!!streetModeEnabled,players,playDeck,playDiscard,removedCards:[],dismissedMatches:{},actionDeck,market,actionDiscard,currentPlayer:0,startPlayer:null,setupPlayer:0,setupRevealed:0,setupOrder:[],setupOrderPos:0,roundEnder:null,finalTurnQueue:[],extraTurns:0,log:[`Neues Spiel gestartet · ${jokerCount} Jokerkarten · Spezialeffekte ${jokerEnabled?'AN':'AUS'}.`],turnNo:0,turnFlow:null,reactionFeed:[],roundJokerValues:{},jokerRoundInventory:Math.max(0,Math.min(30,Math.floor(Number(jokerCount)||0))),gameOver:false}}
function takeFrom(a){return a.pop()}
function startGame(names,target,beginner,jokerCount=8,jokerEnabled=false,aiConfig=null,streetModeEnabled=false){state=setupState(names,target,beginner,jokerCount,jokerEnabled,aiConfig,streetModeEnabled);ui={mode:'setupReveal',data:{},selected:[]};save();render();toast(`${state.players[0].name}: Decke 2 Karten auf`);scheduleAIIfNeeded()}
function beginRound(){
 state.pendingMatch=null;state.turnFlow=null;state.phase='initialReveal';state.roundEnder=null;state.finalTurnQueue=[];state.extraTurns=0;state.roundJokerValues={};state.lastRoundSummary=null;state.scoreSequence=null;state.roundClose=null;
 state.playDeck=makePlayDeck(state.jokerCount??8);state.jokerRoundInventory=Math.max(0,Math.min(30,Math.floor(Number(state.jokerCount)||0)));state.playDiscard=[takePlayDirect()];state.playDiscard[0].faceUp=true;state.removedCards=[];state.dismissedMatches={};
 if(jokerSpecialsEnabled()){state.actionDeck=makeActionDeck(state.beginner);state.market=[];for(let i=0;i<4;i++)state.market.push(takeActionDirect());state.actionDiscard=[takeActionDirect()]}else{state.actionDeck=[];state.market=[];state.actionDiscard=[]}
 for(const p of state.players){p.grid=[];p.extras=[];p.actions=[];p.ownTurn=0;p.aiKnowledge={};p.bankedStarBonus=0;for(let i=0;i<12;i++)p.grid.push(takePlayDirect())}
 const starter=state.round===1?0:(Number.isInteger(state.startPlayer)?state.startPlayer:0);
 state.setupOrder=Array.from({length:state.players.length},(_,k)=>(starter+k)%state.players.length);
 state.setupOrderPos=0;state.setupPlayer=state.setupOrder[0]??0;state.setupRevealed=0;state.currentPlayer=starter;
 ui={mode:'setupReveal',data:{},selected:[]};
 log(`Runde ${state.round} beginnt${state.round>1?` · ${state.players[starter].name} beginnt als Rundenbeender der vorherigen Runde.`:'.'}`);
 save();render();toast(`${state.players[state.setupPlayer].name}: Decke 2 Karten auf`);scheduleAIIfNeeded()
}
function takePlayDirect(){return state.playDeck.pop()}
function takeActionDirect(){return state.actionDeck.pop()}
function selectCard(pi,zone,idx){if(isAIActor()&&!aiActing){toast('🤖 Der Computer ist gerade am Zug');return}if(motionLocked())return;if(!state)return;if(cloud.enabled&&!isMyActorDevice()){toast('Du bist gerade nicht am Zug');return;}if(!Number.isInteger(Number(pi))||!['grid','extra'].includes(zone))return;const p=state.players[Number(pi)];if(!p)return;const arr=zone==='grid'?p.grid:p.extras,card=arr?.[Number(idx)];if(!card)return;pi=Number(pi);idx=Number(idx);
 if(ui.mode==='setupReveal'){if(pi!==state.setupPlayer||zone!=='grid'||card.faceUp)return;card.faceUp=true;state.setupRevealed++;setWatch('reveal',{actor:pi,card:clone(card),srcId:`cell-${pi}-${zone}-${idx}`,dstId:`cell-${pi}-${zone}-${idx}`,title:'deckt eine Startkarte auf',typeLabel:'AUFDECKEN',text:cardShortText(card)});let stars=jokerSpecialsEnabled()&&card.type==='star'?1:0;log(`${p.name} deckt eine Startkarte auf.`);if(stars){queueStar(stars,'setupContinue',state.setupPlayer);return}setupContinue();return}
 if(ui.mode==='discardSwap'){if(pi!==state.currentPlayer)return;swapInDrawn(pi,zone,idx,ui.data.card,'discard');return}
 if(ui.mode==='drawnDecision'){if(pi!==state.currentPlayer)return;haptic(12);swapInDrawn(pi,zone,idx,ui.data.card,'deck');return}
 if(ui.mode==='drawnSwap'){if(pi!==state.currentPlayer)return;swapInDrawn(pi,zone,idx,ui.data.card,'deck');return}
 if(ui.mode==='flipOwn'){if(pi!==state.currentPlayer||card.faceUp)return;card.faceUp=true;setWatch('reveal',{actor:pi,card:clone(card),srcId:`cell-${pi}-${zone}-${idx}`,dstId:`cell-${pi}-${zone}-${idx}`,title:'deckt eine Karte auf',typeLabel:'AUFDECKEN',text:cardShortText(card)});log(`${p.name} deckt eine Karte auf.`);const stars=jokerSpecialsEnabled()&&card.type==='star'?1:0;if(stars){queueStar(1,ui.data.cont||'finishTurn');return}afterMutation(ui.data.cont||'finishTurn');return}
 if(ui.mode==='ownSwapSelect'){if(pi!==state.currentPlayer)return;toggleSelection({pi,zone,idx});if(ui.selected.length===2)ownSwapOrientation();return}
 if(ui.mode==='otherSwapSelect'){handleOtherSwapSelection(pi,zone,idx);return}
 if(ui.mode==='meteorSelect'){if(pi!==ui.data.target)return;meteorChoose(zone,idx);return}
 if(ui.mode==='draw3Target'){if(pi!==state.currentPlayer)return;swapInDrawn(pi,zone,idx,ui.data.card,'draw3',ui.data.remaining);return}
}
function toggleSelection(x){const key=`${x.pi}:${x.zone}:${x.idx}`;const i=ui.selected.findIndex(s=>`${s.pi}:${s.zone}:${s.idx}`===key);if(i>=0)ui.selected.splice(i,1);else ui.selected.push(x);render()}
function setupContinue(){
 if(state.setupRevealed<2){save();render();return}
 if(!Array.isArray(state.setupOrder)||state.setupOrder.length!==state.players.length){
   state.setupOrder=Array.from({length:state.players.length},(_,i)=>i);state.setupOrderPos=Math.max(0,state.setupOrder.indexOf(state.setupPlayer))
 }
 state.setupOrderPos++;state.setupRevealed=0;
 if(state.setupOrderPos<state.setupOrder.length){
   state.setupPlayer=state.setupOrder[state.setupOrderPos];
   toast(`${state.players[state.setupPlayer].name}: Decke 2 Karten auf`);
   save();render();scheduleAIIfNeeded();return
 }
 const sums=state.players.map(p=>p.grid.filter(c=>c&&c.faceUp).reduce((s,c)=>s+cardPoints(c),0));
 const max=Math.max(...sums),ties=sums.map((v,i)=>v===max?i:-1).filter(i=>i>=0);
 if(state.round===1){
   state.startPlayer=ties[Math.floor(Math.random()*ties.length)];
   state.currentPlayer=state.startPlayer;
   log(`${current().name} beginnt mit ${max} Startpunkten.`)
 }else{
   state.currentPlayer=Number.isInteger(state.startPlayer)?state.startPlayer:0;
   log(`${current().name} beginnt die neue Runde als Beender der vorherigen Runde.`)
 }
 state.phase='play';startTurn()
}
function startTurn(){state.pendingMatch=null;state.turnNo++;current().ownTurn++;if(motionBusy&&!motionQueueBusy)unlockMotion(false);setWatch('turn',{actor:state.currentPlayer,title:`${current().name} ist am Zug`,typeLabel:'ZUG',text:jokerSpecialsEnabled()?'zieht, nimmt die Ablage oder spielt eine Aktionskarte':'zieht eine Spielkarte oder nimmt die Ablage'});ui={mode:'turnChoice',data:{},selected:[]};state.turnFlow={turnNo:state.turnNo,currentPlayer:state.currentPlayer,mode:'turnChoice',data:{},selected:[]};save();render();toast(`${current().name} ist am Zug`);visualFx('turn',`${current().name} ist am Zug`,'🎯',6);if(uiPrefs.autoFocus&&(!cloud.enabled||isMyActorDevice()))setTimeout(focusMyBoard,180);scheduleAIIfNeeded()}
function actionAvailable(a,p){return p.ownTurn>=a.availableOwnTurn}
function drawFromDiscard(){if(pendingMatchGuard())return;if(isAIActor()&&!aiActing){toast('🤖 Der Computer ist gerade am Zug');return}if(discardArrivalPending()){toast('🂠 Die Karte landet gerade noch auf der Ablage …');return}if(motionLocked())return;if(cloud.enabled&&!isMyActorDevice()){toast('Du bist gerade nicht am Zug');return}if(ui.mode!=='turnChoice')return;/* Nur playDiscard ist ziehbar. state.removedCards enthält gesperrte Reihen-Karten und wird absichtlich nie angerührt. */const c=state.playDiscard.pop();if(!c)return;setWatch('take-discard',{card:clone(c),srcId:'play-discard-pile',dstId:'table-hand-zone-card',title:'nimmt die oberste Ablagekarte',typeLabel:'ABLAGE',text:cardShortText(c)});ui={mode:'discardSwap',data:{card:c},selected:[]};save();render();toast('Wähle eine eigene Karte zum Tauschen')}
function drawFromDeck(){if(pendingMatchGuard())return;if(isAIActor()&&!aiActing){toast('🤖 Der Computer ist gerade am Zug');return}if(motionLocked())return;if(cloud.enabled&&!isMyActorDevice()){toast('Du bist gerade nicht am Zug');return}if(ui.mode!=='turnChoice')return;const c=takePlay();if(!c){toast('Keine Spielkarte verfügbar');return}setWatch('draw-deck',{card:clone(c),srcId:'play-deck-pile',dstId:'table-hand-zone-card',title:'zieht vom Nachziehstapel',typeLabel:'ZIEHEN',text:cardShortText(c)});ui={mode:'drawnDecision',data:{card:c},selected:[]};save();haptic(10);showDrawnDecision(c)}
function showDrawnDecision(c){render();toast('🎴 Gezogene Karte liegt oben am Spieltisch – dein Feld bleibt sichtbar')}
function keepDrawn(){if(motionLocked())return;if(ui.mode!=='drawnDecision'||!ui.data?.card)return;if(cloud.enabled&&!isMyActorDevice()){toast('Du bist gerade nicht am Zug');return}setWatch('decision-keep',{card:clone(ui.data.card),srcId:'table-hand-zone-card',dstId:`player-${state.currentPlayer}`,title:'behält die gezogene Karte',typeLabel:'ENTSCHEIDUNG',text:'tauscht jetzt eine eigene Karte'});ui={mode:'drawnSwap',data:{card:ui.data.card},selected:[]};save();haptic(12);render();toast('Klicke eine eigene Karte zum Ersetzen an')}
function discardDrawn(){if(isAIActor()&&!aiActing){toast('🤖 Der Computer ist gerade am Zug');return}if(motionLocked())return;if(ui.mode!=='drawnDecision'||!ui.data?.card)return;if(cloud.enabled&&!isMyActorDevice()){toast('Du bist gerade nicht am Zug');return}const c=ui.data.card;setWatch('drawn-discard',{card:clone(c),srcId:'table-hand-zone-card',dstId:'play-discard-pile',title:'legt die gezogene Karte ab',typeLabel:'ABLEGEN',text:'deckt jetzt eine eigene Karte auf'});c.faceUp=true;state.playDiscard.push(c);ui={mode:'flipOwn',data:{cont:'finishTurn'},selected:[]};save();haptic([8,25,8]);render();toast('Decke jetzt eine verdeckte eigene Karte auf')}
function swapInDrawn(pi,zone,idx,newCard,source,remaining){const p=state.players[pi],arr=zone==='grid'?p.grid:p.extras;const old=arr[idx],oldWasFaceUp=!!old.faceUp;arr[idx]=newCard;newCard.faceUp=true;old.faceUp=true;setWatch('swap',{actor:pi,card:clone(newCard),oldCard:clone(old),oldWasFaceUp,srcId:'table-hand-zone-card',dstId:`cell-${pi}-${zone}-${idx}`,swapOutId:`cell-${pi}-${zone}-${idx}`,discardId:'play-discard-pile',title:'tauscht eine Karte',typeLabel:'TAUSCH',text:`${oldWasFaceUp?'Tausch':'Aufdecken → Tausch'} · ${cardShortText(newCard)} ersetzt ${cardShortText(old)}`});state.playDiscard.push(old);log(`${p.name} tauscht eine Karte.`);let star=0;if(jokerSpecialsEnabled()&&newCard.type==='star'&&(source==='discard'||source==='deck'||source==='draw3'))star=1;if(remaining&&remaining.length){for(const x of remaining){x.faceUp=true;state.playDiscard.push(x)}}if(star){queueStar(star,'finishTurn');return}afterMutation('finishTurn')}
function takeActionMarket(i,fromStar=false){if(!fromStar&&pendingMatchGuard())return;if(!fromStar&&cloud.enabled&&!isMyActorDevice()){toast('Du bist gerade nicht am Zug');return}if(!fromStar&&ui.mode!=='turnChoice')return;if(fromStar&&cloud.enabled&&myPlayerIndex()!==Number(ui.data?.owners?.[ui.data?.ownerIndex]))return;if(isAIActor()&&!aiActing&&!fromStar){toast('🤖 Der Computer ist gerade am Zug');return}if(motionLocked())return;if(!jokerSpecialsEnabled()){toast('Joker-Spezialeffekte sind ausgeschaltet');return}const a=state.market[i];if(!a)return;state.market[i]=null;refillMarket();const owner=fromStar?ui.data.owners[ui.data.ownerIndex]:state.currentPlayer;setWatch('action-take',{actor:owner,actionType:a.type,srcId:`market-${i}`,dstId:`player-${owner}`,title:`nimmt ${ACTIONS[a.type].name}`,typeLabel:'AKTIONSKARTE',text:fromStar?'durch einen Stern ausgelöst':'offen aus der Auslage'});giveAction(owner,a);visualFx('action',ACTIONS[a.type].name,ACTIONS[a.type].icon,7);log(`${state.players[owner].name} nimmt „${ACTIONS[a.type].name}“${fromStar?' durch einen Stern':''}.`);if(fromStar){starChoiceDone();}else finishTurn();}
function takeActionBlind(fromStar=false){if(!fromStar&&pendingMatchGuard())return;if(!fromStar&&cloud.enabled&&!isMyActorDevice()){toast('Du bist gerade nicht am Zug');return}if(!fromStar&&ui.mode!=='turnChoice')return;if(fromStar&&cloud.enabled&&myPlayerIndex()!==Number(ui.data?.owners?.[ui.data?.ownerIndex]))return;if(isAIActor()&&!aiActing&&!fromStar){toast('🤖 Der Computer ist gerade am Zug');return}if(motionLocked())return;if(!jokerSpecialsEnabled()){toast('Joker-Spezialeffekte sind ausgeschaltet');return}const a=takeActionDeck();if(!a){toast('Keine Aktionskarte verfügbar');if(fromStar)starChoiceDone();return}const owner=fromStar?ui.data.owners[ui.data.ownerIndex]:state.currentPlayer;setWatch('action-take',{actor:owner,actionType:a.type,srcId:'action-deck-pile',dstId:`player-${owner}`,title:`zieht ${ACTIONS[a.type].name}`,typeLabel:'AKTIONSKARTE',text:fromStar?'verdeckt durch einen Stern':'verdeckt vom Aktionsstapel'});giveAction(owner,a);visualFx('action','Verdeckte Aktionskarte','⚡',6);log(`${state.players[owner].name} zieht eine verdeckte Aktionskarte${fromStar?' durch einen Stern':''}.`);if(fromStar){starChoiceDone()}else finishTurn()}
function giveAction(pi,a){const p=state.players[pi];a.availableOwnTurn=p.ownTurn+1;p.actions.push(a);save()}
function chooseActionTurn(){if(pendingMatchGuard())return;if(isAIActor()&&!aiActing){toast('🤖 Der Computer ist gerade am Zug');return}if(motionLocked())return;if(cloud.enabled&&!isMyActorDevice()){toast('Du bist gerade nicht am Zug');return}if(ui.mode!=='turnChoice')return;if(!jokerSpecialsEnabled()){toast('Joker-Spezialeffekte sind ausgeschaltet');return}ui={mode:'chooseActionTurn',data:{},selected:[]};save();render()}
function playOrDiscardAction(pi,idx){if(pi!==state.currentPlayer||ui.mode!=='chooseActionTurn')return;const p=current(),a=p.actions[idx];if(!a)return;if(!actionAvailable(a,p)){toast('Diese Aktionskarte ist noch gesperrt.');return}if(state.roundEnder!==null){toast('In der Schlussrunde dürfen Aktionskarten nicht gespielt oder abgelegt werden.');return}const aid=String(a.id||'');modal(`<h3>${ACTIONS[a.type].icon} ${ACTIONS[a.type].name}</h3><p>${ACTIONS[a.type].desc}</p><div class="modal-actions"><button class="primary" onclick="Game.confirmPlayAction(${idx},'${aid}')">Ausspielen</button><button class="secondary" onclick="Game.confirmDiscardAction(${idx},'${aid}')">Nur ablegen</button><button onclick="Game.closeModal()">Abbrechen</button></div>`)}
function resolveActionConfirm(idx,expectedId){if(!state||ui.mode!=='chooseActionTurn'||(cloud.enabled&&!isMyActorDevice()))return null;const p=current();let pos=Number(idx);if(expectedId){const found=p.actions.findIndex(x=>String(x?.id||'')===String(expectedId));if(found>=0)pos=found;else return null}if(!Number.isInteger(pos)||pos<0||pos>=p.actions.length)return null;const a=p.actions[pos];if(!a||!actionAvailable(a,p))return null;p.actions.splice(pos,1);return a}
function confirmDiscardAction(idx,expectedId=''){closeModal();const a=resolveActionConfirm(idx,expectedId);if(!a){toast('Aktionskarte ist nicht mehr verfügbar – Ansicht wurde aktualisiert.');render();return}setWatch('action-play',{actor:state.currentPlayer,actionType:a.type,srcId:`player-${state.currentPlayer}`,dstId:'action-deck-pile',title:`legt ${ACTIONS[a.type].name} ab`,typeLabel:'AKTION',text:'wird ungenutzt auf den Ablagestapel gelegt'});state.actionDiscard.push(a);log(`${current().name} legt „${ACTIONS[a.type].name}“ ungenutzt ab.`);finishTurn()}
function confirmPlayAction(idx,expectedId=''){closeModal();const a=resolveActionConfirm(idx,expectedId);if(!a){toast('Aktionskarte ist nicht mehr verfügbar – Ansicht wurde aktualisiert.');render();return}playAction(a,false)}
function playAction(a,reactivated){const t=a.type;if(t==='react'){state.heldReacts=state.heldReacts||[];state.heldReacts.push(a);}else{state.actionDiscard.push(a);}setWatch('action-play',{actor:state.currentPlayer,actionType:a.type,srcId:`player-${state.currentPlayer}`,dstId:`player-${state.currentPlayer}`,title:`spielt ${ACTIONS[a.type].name}`,typeLabel:'AKTION',text:reactivated?'durch Reaktivierung erneut ausgelöst':ACTIONS[a.type].desc});log(`${current().name} spielt „${ACTIONS[a.type].name}“.`);
 if(t==='double'){state.extraTurns+=2;finishTurn();return}
 if(t==='defense'){state.extraTurns+=1;finishTurn();return}
 if(t==='ownswap'){ui={mode:'ownSwapSelect',data:{},selected:[]};render();toast('Wähle zwei eigene Karten');return}
 if(t==='draw3'){startDraw3();return}
 if(t==='enlight'){startEnlightenment();return}
 if(t==='react'){startReactivation(a.id);return}
 if(t==='swapother'){startOtherSwap();return}
 if(t==='thief'){startThief();return}
 if(t==='meteor'){startMeteor();return}
 finishTurn();}
function ownSwapOrientation(){const [a,b]=ui.selected;save();modal(`<h3>Ausrichtung nach dem Tausch</h3><p>Du darfst beide Karten nach dem Tausch offen oder verdeckt ablegen. Verdeckte Karten werden nicht vorher gezeigt.</p><div class="choice-grid"><label class="choice"><input id="oa" type="checkbox" ${getSlot(a).faceUp?'checked':''}> Karte 1 danach offen</label><label class="choice"><input id="ob" type="checkbox" ${getSlot(b).faceUp?'checked':''}> Karte 2 danach offen</label></div><div class="modal-actions"><button class="primary" onclick="Game.finishOwnSwap()">Tausch durchführen</button></div>`,false)}
function getSlot(s){const p=state.players[s.pi];return (s.zone==='grid'?p.grid:p.extras)[s.idx]}
function setSlot(s,c){const p=state.players[s.pi];(s.zone==='grid'?p.grid:p.extras)[s.idx]=c}
function finishOwnSwap(){const [sa,sb]=ui.selected,ca=getSlot(sa),cb=getSlot(sb),oldA=ca.faceUp,oldB=cb.faceUp;const openA=$('#oa').checked,openB=$('#ob').checked;setWatch('action-play',{actor:state.currentPlayer,title:'tauscht zwei eigene Karten',typeLabel:'AKTION',text:'Ausrichtung wurde neu festgelegt'});setSlot(sa,cb);setSlot(sb,ca);cb.faceUp=openA;ca.faceUp=openB;closeModal();let stars=0;if(jokerSpecialsEnabled()&&cb.type==='star'&&!oldB&&openA)stars++;if(jokerSpecialsEnabled()&&ca.type==='star'&&!oldA&&openB)stars++;ui.selected=[];if(stars){queueStar(stars,'finishTurn');return}afterMutation('finishTurn')}
function showDraw3Modal(){if(ui.mode!=='draw3Choose'||!canControlFlow()||isModalOpen())return;const cards=ui.data.cards||[];modal(`<h3>3 Karten ziehen</h3><p>Wähle höchstens eine Karte zum Behalten. Nicht gewählte Karten kommen auf den Ablagestapel.</p><div class="pile-row">${cards.map((c,i)=>`<div onclick="Game.draw3Pick(${i})">${cardHTML(c,true,true)}</div>`).join('')}</div><div class="modal-actions"><button class="secondary" onclick="Game.draw3None()">Keine behalten</button></div>`,false)}
function startDraw3(){const cards=[takePlay(),takePlay(),takePlay()].filter(Boolean);if(!cards.length){toast('Keine Spielkarte verfügbar.');finishTurn();return}ui={mode:'draw3Choose',data:{cards},selected:[]};save();render();setTimeout(showDraw3Modal,60)}
function draw3Pick(i){if(ui.mode!=='draw3Choose'||!Array.isArray(ui.data?.cards))return;const cards=ui.data.cards,c=cards[Number(i)];if(!c)return;const rem=cards.filter((_,j)=>j!==Number(i));closeModal();ui={mode:'draw3Target',data:{card:c,remaining:rem},selected:[]};save();render();toast('Wähle die eigene Karte, die ersetzt wird')}
function draw3None(){if(ui.mode!=='draw3Choose'||!Array.isArray(ui.data?.cards))return;const cards=ui.data.cards;for(const c of cards){c.faceUp=true;state.playDiscard.push(c)}closeModal();ui={mode:'flipOwn',data:{cont:'finishTurn'},selected:[]};save();render();toast('Keine behalten: Decke eine eigene verdeckte Karte auf')}
function showEnlightenmentSetupModal(){if(ui.mode!=='enlightSelect'||!canControlFlow()||isModalOpen())return;const opts=state.players.map((p,i)=>`<option value="${i}">${escapeHTML(p.name)}</option>`).join('');modal(`<h3>🔎 Erleuchtung</h3><p>Wähle einen Spieler und eine vollständige Reihe oder Spalte. Nur der aktuelle Spieler schaut.</p><div class="field"><label>Spieler</label><select id="ep">${opts}</select></div><div class="field" style="margin-top:8px"><label>Linie</label><select id="eline"><option value="r0">Reihe 1</option><option value="r1">Reihe 2</option><option value="r2">Reihe 3</option><option value="c0">Spalte 1</option><option value="c1">Spalte 2</option><option value="c2">Spalte 3</option><option value="c3">Spalte 4</option></select></div><div class="modal-actions"><button class="primary" onclick="Game.showEnlightenment()">Geheim ansehen</button></div>`,false)}
function startEnlightenment(){ui={mode:'enlightSelect',data:{},selected:[]};save();render();setTimeout(showEnlightenmentSetupModal,60)}
function lineIndexes(code){const n=Number(code.slice(1));if(code[0]==='r')return [n*4,n*4+1,n*4+2,n*4+3];return [n,n+4,n+8]}
function showEnlightenment(){const pi=Number($('#ep').value),code=$('#eline').value,p=state.players[pi],idxs=lineIndexes(code);const cards=idxs.map(i=>p.grid[i]).filter(Boolean);ui.data={viewed:true,pi,code};save();modal(`<h3>Nur ${escapeHTML(current().name)} schauen</h3><p>${escapeHTML(p.name)} · ${code[0]==='r'?'Reihe':'Spalte'} ${Number(code.slice(1))+1}</p><div class="pile-row">${cards.map(c=>cardHTML(c,true,false)).join('')}</div><div class="modal-actions"><button class="primary" onclick="Game.finishEnlightenment()">Fertig</button></div>`,false)}
function finishEnlightenment(){closeModal();finishTurn()}
function showReactivationModal(){if(ui.mode!=='reactivate'||!canControlFlow()||isModalOpen())return;const cards=state.actionDiscard.filter(a=>a.id!==ui.data.excludeId);if(!cards.length){toast('Keine andere Aktionskarte in der Ablage.');finishTurn();return}modal(`<h3>♻️ Reaktivierung</h3><p>Wähle eine Aktionskarte aus der Ablage. Sie wird sofort gespielt.</p><div class="choice-grid">${cards.slice().reverse().map(a=>`<button class="choice" onclick="Game.reactivate('${a.id}')"><b>${ACTIONS[a.type].icon} ${ACTIONS[a.type].name}</b><small>${ACTIONS[a.type].desc}</small></button>`).join('')}</div>`,false)}
function startReactivation(excludeId){const cards=state.actionDiscard.filter(a=>a.id!==excludeId);if(!cards.length){toast('Keine andere Aktionskarte in der Ablage.');finishTurn();return}ui={mode:'reactivate',data:{excludeId},selected:[]};save();render();setTimeout(showReactivationModal,60)}
function reactivate(id){if(!state||ui.mode!=='reactivate'||(cloud.enabled&&!isMyActorDevice())){closeModal();render();return}const idx=state.actionDiscard.findIndex(a=>a?.id===id);if(idx<0){closeModal();toast('Diese Aktionskarte ist nicht mehr in der Ablage.');finishTurn();return}const [a]=state.actionDiscard.splice(idx,1);closeModal();if(!a){finishTurn();return}playAction(a,true)}
function showOtherSwapSetupModal(){if(ui.mode!=='otherSwapSetup'||!canControlFlow()||isModalOpen())return;const other=(state.currentPlayer+1)%state.players.length;const optsA=state.players.map((p,i)=>`<option value="${i}" ${i===state.currentPlayer?'selected':''}>${escapeHTML(p.name)}</option>`).join('');const optsB=state.players.map((p,i)=>`<option value="${i}" ${i===other?'selected':''}>${escapeHTML(p.name)}</option>`).join('');modal(`<h3>🔁 Kartentausch Mitspieler</h3><p>Wähle zwei verschiedene Spieler. Danach jeweils eine Karte aus deren Auslage anklicken.</p><div class="choice-grid"><div class="field"><label>Spieler A</label><select id="spA">${optsA}</select></div><div class="field"><label>Spieler B</label><select id="spB">${optsB}</select></div></div><div class="modal-actions"><button class="primary" onclick="Game.beginOtherSwapSelection()">Weiter</button></div>`,false)}
function startOtherSwap(){ui={mode:'otherSwapSetup',data:{},selected:[]};save();render();setTimeout(showOtherSwapSetupModal,60)}
function beginOtherSwapSelection(){if(!state||ui.mode!=='otherSwapSetup'||(cloud.enabled&&!isMyActorDevice())){closeModal();render();return}const elA=$('#spA'),elB=$('#spB');if(!elA||!elB){closeModal();render();return}const a=Number(elA.value),b=Number(elB.value);if(!Number.isInteger(a)||!Number.isInteger(b)||!state.players[a]||!state.players[b]){toast('Spielerauswahl ist nicht mehr aktuell.');closeModal();render();return}if(a===b){toast('Bitte zwei verschiedene Spieler wählen.');return}if((a!==state.currentPlayer&&consumeDefense(a))||(b!==state.currentPlayer&&consumeDefense(b))){closeModal();finishTurn();return}closeModal();ui={mode:'otherSwapSelect',data:{a,b},selected:[]};save();render();toast(`Wähle je 1 Karte bei ${state.players[a].name} und ${state.players[b].name}`)}
function handleOtherSwapSelection(pi,zone,idx){if(pi!==ui.data.a&&pi!==ui.data.b)return;const existing=ui.selected.find(s=>s.pi===pi);if(existing){ui.selected=ui.selected.filter(s=>s.pi!==pi)}ui.selected.push({pi,zone,idx});if(ui.selected.length===2&&ui.selected[0].pi!==ui.selected[1].pi){otherSwapOrientation();return}render()}
function otherSwapOrientation(){const [a,b]=ui.selected;save();modal(`<h3>Ausrichtung nach dem Tausch</h3><p>Beide Karten dürfen am Ziel offen oder verdeckt abgelegt werden.</p><div class="choice-grid"><label class="choice"><input id="osa" type="checkbox" ${getSlot(a).faceUp?'checked':''}> Karte bei ${escapeHTML(state.players[a.pi].name)} danach offen</label><label class="choice"><input id="osb" type="checkbox" ${getSlot(b).faceUp?'checked':''}> Karte bei ${escapeHTML(state.players[b.pi].name)} danach offen</label></div><div class="modal-actions"><button class="primary" onclick="Game.finishOtherSwap()">Tauschen</button></div>`,false)}
function finishOtherSwap(){if(!state||ui.mode!=='otherSwapSelect'||ui.selected.length!==2||(cloud.enabled&&!isMyActorDevice())){closeModal();render();return}const [sa,sb]=ui.selected,ca=getSlot(sa),cb=getSlot(sb);if(!ca||!cb){closeModal();toast('Kartenauswahl ist nicht mehr aktuell.');ui.selected=[];render();return}const oldA=!!ca.faceUp,oldB=!!cb.faceUp,openA=$('#osa')?.checked??oldA,openB=$('#osb')?.checked??oldB;setWatch('action-play',{actor:state.currentPlayer,title:'tauscht Karten zwischen Spielern',typeLabel:'AKTION',text:`${state.players[sa.pi].name} ↔ ${state.players[sb.pi].name}`});setSlot(sa,cb);setSlot(sb,ca);cb.faceUp=openA;ca.faceUp=openB;closeModal();const owners=[];if(jokerSpecialsEnabled()&&cb.type==='star'&&!oldB&&openA)owners.push(sa.pi);if(jokerSpecialsEnabled()&&ca.type==='star'&&!oldA&&openB)owners.push(sb.pi);ui.selected=[];if(owners.length){queueStarOwners(owners,'finishTurn');return}afterMutation('finishTurn')}
function showThiefModal(){if(ui.mode!=='thiefSelect'||!canControlFlow()||isModalOpen())return;const options=[];state.players.forEach((p,pi)=>{if(pi===state.currentPlayer)return;p.actions.forEach((a,ai)=>options.push({pi,ai,a}))});if(!options.length){toast('Niemand hat eine Aktionskarte zum Stehlen.');state.extraTurns+=1;finishTurn();return}modal(`<h3>🥷 Aktionskarten-Dieb</h3><p>Wähle eine Aktionskarte eines Mitspielers. Eine Verteidigung blockt den Angriff.</p><div class="choice-grid">${options.map(o=>`<button class="choice" onclick="Game.thiefPick(${o.pi},${o.ai})"><b>${escapeHTML(state.players[o.pi].name)}</b><small>${ACTIONS[o.a.type].icon} ${ACTIONS[o.a.type].name}</small></button>`).join('')}</div>`,false)}
function startThief(){const hasAny=state.players.some((p,pi)=>pi!==state.currentPlayer&&p.actions.length);if(!hasAny){toast('Niemand hat eine Aktionskarte zum Stehlen.');state.extraTurns+=1;finishTurn();return}ui={mode:'thiefSelect',data:{},selected:[]};save();render();setTimeout(showThiefModal,60)}
function thiefPick(pi,ai){if(!state||ui.mode!=='thiefSelect'||(cloud.enabled&&!isMyActorDevice())){closeModal();render();return}pi=Number(pi);ai=Number(ai);const target=state.players?.[pi],a=target?.actions?.[ai];if(!target||!a||pi===state.currentPlayer){closeModal();toast('Diese Aktionskarte ist nicht mehr verfügbar.');finishTurn();return}closeModal();if(consumeDefense(pi)){state.extraTurns+=1;finishTurn();return}const fresh=target.actions?.[ai];if(!fresh||fresh.id!==a.id){toast('Die Auswahl wurde zwischenzeitlich geändert.');finishTurn();return}target.actions.splice(ai,1);setWatch('action-play',{actor:state.currentPlayer,actionType:a.type,srcId:`player-${pi}`,dstId:`player-${state.currentPlayer}`,title:`stiehlt ${ACTIONS[a.type].name}`,typeLabel:'DIEB',text:`von ${state.players[pi].name}`});a.availableOwnTurn=current().ownTurn+2;a.stolen=true;current().actions.push(a);state.extraTurns+=1;log(`${current().name} stiehlt ${state.players[pi].name} „${ACTIONS[a.type].name}“.`);finishTurn()}
function startMeteor(){const targets=[];for(let k=1;k<state.players.length;k++){const pi=(state.currentPlayer+k)%state.players.length;if(consumeDefense(pi))continue;targets.push(pi)}if(!targets.length){finishTurn();return}ui={mode:'meteorSelect',data:{targets,target:targets[0],index:0,attacker:state.currentPlayer},selected:[]};save();render();toast(`☄️ Wähle eine Karte bei ${state.players[targets[0]].name}`)}
function selectActionCard(pi,idx){if(motionLocked())return;if(ui.mode==='meteorSelect'&&pi===ui.data.target){meteorChoose('action',idx);return}if(ui.mode==='chooseActionTurn'&&pi===state.currentPlayer){playOrDiscardAction(pi,idx);return}}
function meteorChoose(zone,idx){if(ui.mode!=='meteorSelect')return;const pi=Number(ui.data?.target),p=state.players?.[pi];if(!p)return;idx=Number(idx);let old=null,arr=null;if(zone==='action'){old=p.actions?.[idx]}else if(zone==='grid'||zone==='extra'){arr=zone==='grid'?p.grid:p.extras;old=arr?.[idx]}else return;if(!old){toast('Dieses Ziel ist nicht mehr verfügbar.');render();return}let replacement=takePlay();if(!replacement){toast('Keine Ersatzkarte verfügbar.');meteorNext();return}replacement.faceUp=true;if(zone==='action'){setWatch('meteor',{actor:state.currentPlayer,card:clone(replacement),srcId:'play-deck-pile',dstId:`player-${pi}`,title:`trifft ${p.name}`,typeLabel:'METEORIT',text:'entfernt eine Aktionskarte und legt eine offene Zusatzkarte aus'});p.actions.splice(idx,1);state.actionDiscard.push(old);p.extras.push(replacement);log(`☄️ Bei ${p.name} wird eine Aktionskarte entfernt; die Ersatz-Spielkarte liegt als Zusatzkarte aus.`)}else{setWatch('meteor',{actor:state.currentPlayer,card:clone(replacement),oldCard:clone(old),srcId:'play-deck-pile',dstId:`cell-${pi}-${zone}-${idx}`,title:`trifft ${p.name}`,typeLabel:'METEORIT',text:`ersetzt ${cardShortText(old)} durch ${cardShortText(replacement)}`});old.faceUp=true;state.playDiscard.push(old);arr[idx]=replacement;log(`☄️ Bei ${p.name} wird eine Spielkarte ersetzt.`)}let stars=jokerFunctionEnabled()&&replacement.type==='star'?1:0;if(stars){queueStar(1,'meteorStarReturn',pi);return}meteorNext()}
function meteorStarReturn(){const attacker=ui.data.attacker!==undefined?ui.data.attacker:null;meteorNext(attacker)}
function meteorNext(){const d=ui.data;d.index++;if(d.index>=d.targets.length){afterMutation('finishTurn');return}d.target=d.targets[d.index];render();toast(`☄️ Wähle eine Karte bei ${state.players[d.target].name}`)}
function queueStar(count,continuation,owner=state.currentPlayer){queueStarOwners(Array.from({length:count},()=>owner),continuation)}
function hasActionChoiceAvailable(){return !!(state.market?.some(Boolean)||state.actionDeck?.length||(state.actionDiscard?.length||0)>1)}
function waitForMotionIdle(max=5000){return new Promise(resolve=>{const end=Date.now()+max;(function tick(){if((!motionBusy&&!motionQueueBusy)||Date.now()>=end){resolve();return}setTimeout(tick,70)})()})}
function queueStarOwners(owners,continuation){const meteorData=ui.mode==='meteorSelect'?clone(ui.data):null;visualFx('star','Joker-Stern aktiviert!','⭐',14);ui={mode:'starChoice',data:{owners,ownerIndex:0,continuation,meteorData},selected:[]};save();render();setTimeout(async()=>{await waitForMotionIdle();if(ui.mode==='starChoice')showStarChoice()},80)}
function showStarChoice(){if(ui.mode!=='starChoice')return;if(motionBusy||motionQueueBusy){setTimeout(showStarChoice,100);return}const owner=ui.data.owners[ui.data.ownerIndex];if(!hasActionChoiceAvailable()){toast('⭐ Keine Aktionskarte mehr verfügbar – Stern-Effekt verfällt.');setTimeout(starChoiceDone,220);return}if(!cloud.enabled&&isAIPlayer(owner)){closeModal();save();render();scheduleAIIfNeeded(420);return}if(cloud.enabled&&myPlayerIndex()!==owner)return;if(isModalOpen())return;modal(`<h3>⭐ Sternkarte!</h3><p>${escapeHTML(state.players[owner].name)} darf sofort eine Aktionskarte nehmen. Wähle eine offene Karte oder ziehe verdeckt.</p><div class="market">${state.market.map((a,i)=>a?`<div onclick="Game.takeActionMarket(${i},true)">${actionHTML(a,true)}</div>`:'').join('')}</div><div class="modal-actions"><button class="primary" onclick="Game.takeActionBlind(true)">🎴 Verdeckt ziehen</button></div>`,false)}
function starChoiceDone(){if(ui.mode!=='starChoice')return;ui.data.ownerIndex++;if(ui.data.ownerIndex<ui.data.owners.length){save();render();setTimeout(showStarChoice,80);return}const cont=ui.data.continuation,meteorData=ui.data.meteorData;closeModal();if(cont==='setupContinue'){ui={mode:'setupReveal',data:{},selected:[]};save();setupContinue();return}if(cont==='meteorStarReturn'){const old=meteorData;if(old){ui={mode:'meteorSelect',data:old,selected:[]};state.currentPlayer=old.attacker;save()}meteorNext();return}afterMutation(cont||'finishTurn')}
function afterMutation(cont){checkRoundTrigger();resolveMatches(state.currentPlayer,cont)}
function streetModeActive(){return state?.streetModeEnabled===true}
function resolveNumberStreet(cards){
 /* Vollständige 3er-Spalten bzw. 4er-Reihen; Joker ersetzen je genau eine Zahl.
    Mindestens eine echte Zahlenkarte ist nötig, damit reine Jokergruppen ihren
    eigenen -10/-15-Bonus behalten und nicht doppelt als Straße zählen. */
 if(!Array.isArray(cards)||![3,4].includes(cards.length))return null;
 if(!cards.every(c=>c?.faceUp&&(c.type==='star'||(c.type==='number'&&Number.isInteger(Number(c.value))))))return null;
 const firstNumber=cards.findIndex(c=>c.type==='number');
 if(firstNumber<0)return null;
 for(const step of [1,-1]){
   const firstValue=Number(cards[firstNumber].value)-step*firstNumber;
   const values=cards.map((_,i)=>firstValue+step*i);
   if(!values.every(v=>Number.isInteger(v)&&v>=-2&&v<=12))continue;
   if(cards.every((c,i)=>c.type==='star'||Number(c.value)===values[i])){
     return {values,step,hasJoker:cards.some(c=>c.type==='star')};
   }
 }
 return null;
}
function isNumberStreet(cards){return !!resolveNumberStreet(cards)}
function findMatchesInPlayer(p){
 const groups=[];
 /* Ein Abräumen betrifft immer eine VOLLSTÄNDIGE Linie im 4x3-Feld:
    waagerecht exakt 4 Karten, senkrecht exakt 3 Karten.
    Leere Felder, Lücken oder Teilreihen sind bei allen Kombinationen ausgeschlossen. */
 for(let r=0;r<3;r++){
   const idx=[r*4,r*4+1,r*4+2,r*4+3];
   if(idx.every(i=>p.grid[i]))groups.push({name:`Reihe ${r+1}`,idx})
 }
 for(let c=0;c<4;c++){
   const idx=[c,c+4,c+8];
   if(idx.every(i=>p.grid[i]))groups.push({name:`Spalte ${c+1}`,idx})
 }
 const out=[];
 for(const g of groups){
   const cards=g.idx.map(i=>p.grid[i]);
   if(cards.some(c=>!c.faceUp))continue;
   const nums=[...new Set(cards.filter(c=>c.type==='number').map(c=>c.value))],stars=cards.filter(c=>c.type==='star').length;
   const signature=`${g.name}:${cards.map(c=>c?.id||`${c?.type}:${c?.value}`).join('|')}`;
   if(nums.length===1&&!(stars&&streetModeActive()&&isNumberStreet(cards)))out.push({...g,key:signature,optional:true,label:`${g.name}: ${nums[0]}${stars?` + ${stars}★`:''}`});
   else if(nums.length===0&&stars===cards.length)out.push({...g,key:signature,optional:true,pureStars:true,label:`${g.name}: nur Joker`})
 }
 if(streetModeActive()){
   /* Nur volle, bereits aufgedeckte Linien. Joker können an beliebiger
      Position eine fehlende Zahl vertreten; auch absteigend und mehrere Joker. */
   for(const g of groups){
     const cards=g.idx.map(i=>p.grid[i]);
     const street=resolveNumberStreet(cards);
     if(!street)continue;
     const name=`Straße ${g.name}`;
     const numbers=cards.map((c,i)=>c.type==='star'?`★(${street.values[i]})`:String(street.values[i]));
     out.push({...g,name,street:true,optional:true,
       key:`street:${g.idx.join(',')}:${cards.map(c=>c.id||c.value).join('|')}`,
       label:`${name}: ${numbers.join('–')}`});
   }
 }
 return out
}
function findMatches(pi){return findMatchesInPlayer(state.players[pi])}

let activeMatchPromptKey='';
function dismissedMatchList(pi){if(!state.dismissedMatches||typeof state.dismissedMatches!=='object')state.dismissedMatches={};const k=String(pi);if(!Array.isArray(state.dismissedMatches[k]))state.dismissedMatches[k]=[];return state.dismissedMatches[k]}
function isMatchDismissed(pi,m){return dismissedMatchList(pi).includes(m.key)}
function dismissMatches(pi,matches){const list=dismissedMatchList(pi);for(const m of matches||[])if(m?.key&&!list.includes(m.key))list.push(m.key);}
function resolveMatches(pi,cont){
 /* V118: Reine Jokergruppen sind FESTE Einmal-Boni. Sie werden sofort
    abgeräumt, damit ihre Joker nicht noch die Werte benachbarter
    Zahlenkarten übernehmen und zusätzlich Minuspunkte erzeugen.
    Andere fertige Zahlen-/Mischkombinationen bleiben manuell entfernbar. */
 if(state?.phase==='play'){
   let safeguard=0;
   while(safeguard++<12){
     const group=findMatches(pi).find(m=>m.pureStars);
     if(!group)break;
     removeMatch(pi,group);
     const bonus=group.idx.length===4&&group.name.startsWith('Reihe')?-15:-10;
     visualFx('star',`Jokergruppe abgeräumt: ${bonus} Punkte`,'⭐',9);
   }
 }
 const matches=findMatches(pi);
 /* Zahlen- und gemischte Gruppen bleiben wie bisher freiwillig. */
 if(matches.length)dismissMatches(pi,matches);
 state.pendingMatch=null;
 save();
 continueAfter(cont);
}
function pendingFreshMatches(){
 if(!state||ui.mode!=='matchReady')return[];
 const d=state.pendingMatch||ui.data||{},pi=d.pi??state.currentPlayer,keys=Array.isArray(d.matchKeys)?d.matchKeys:[];
 return findMatches(pi).filter(m=>!isMatchDismissed(pi,m)&&(!keys.length||keys.includes(m.key)));
}
function maybeShowMatchPrompt(){return}
function showMatchChoice(){
 if(!state||ui.mode!=='matchReady')return;
 const d=state.pendingMatch||ui.data||{},pi=d.pi??state.currentPlayer;
 const fresh=pendingFreshMatches();
 const key=ui.data.activeMatchKey||activeMatchPromptKey||fresh[0]?.key;
 const m=fresh.find(x=>x.key===key)||fresh[0];
 if(!m){
   activeMatchPromptKey='';
   state.pendingMatch=null;
   continueAfter(d.cont);
   return;
 }
 activeMatchPromptKey=m.key;
 ui.data.activeMatchKey=m.key;
 const kind=m.name.startsWith('Reihe')?'Reihe':'Spalte';
 modal(`<div class="match-question">
   <div class="match-question-icon">✨</div>
   <h3>Diese Kombination kann manuell entfernt werden</h3>
   <p><b>${escapeHTML(m.label)}</b></p>
   <p class="note">Du musst sie nicht entfernen. Wenn du „Nein“ wählst, bleibt sie liegen und du wirst wegen genau dieser Kombination nicht noch einmal gefragt. Der Entfernen-Button bleibt trotzdem jederzeit verfügbar.</p>
   <div class="modal-actions match-yes-no">
     <button class="primary" onclick="Game.chooseMatch()">✓ Jetzt entfernen</button>
     <button class="secondary" onclick="Game.skipOptionalMatches()">Schließen</button>
   </div>
 </div>`,false);
}
function chooseMatch(){
 if(!state||ui.mode!=='matchReady')return;
 if(motionLocked())return;
 const d=state.pendingMatch||ui.data||{},pi=d.pi??state.currentPlayer,cont=d.cont;
 const key=ui.data.activeMatchKey||activeMatchPromptKey;
 const matches=findMatches(pi),idx=matches.findIndex(m=>m.key===key);
 closeModal();activeMatchPromptKey='';
 if(idx<0){resolveMatches(pi,cont);return}
 resolveBoardMatch(pi,idx);
}
function skipOptionalMatches(){
 if(!state||ui.mode!=='matchReady')return;
 const d=state.pendingMatch||ui.data||{},pi=d.pi??state.currentPlayer,cont=d.cont;
 const key=ui.data.activeMatchKey||activeMatchPromptKey||pendingFreshMatches()[0]?.key;
 const m=findMatches(pi).find(x=>x.key===key);
 if(m)dismissMatches(pi,[m]);
 closeModal();activeMatchPromptKey='';
 state.pendingMatch=null;
 resolveMatches(pi,cont);
}
function resolveBoardMatch(pi,i){
 if(isAIActor()&&!aiActing){toast('🤖 Der Computer entscheidet selbst über seine Kombination');return}
 if(motionLocked())return;
 if(!state||state.phase!=='play')return;
 if(cloud.enabled&&!isMyActorDevice()){toast('Du bist gerade nicht am Zug');return}
 if(pi!==state.currentPlayer){toast('Entfernen geht in deinem eigenen Zug');return}
 if(!['turnChoice','matchReady'].includes(ui.mode)){toast('Beende zuerst deine aktuelle Kartenaktion');return}
 const matches=findMatches(pi),m=matches[i];if(!m)return;
 const wasPrompt=ui.mode==='matchReady'||!!state.pendingMatch,cont=wasPrompt?(state.pendingMatch?.cont||ui.data.cont||'finishTurn'):'stayTurn';
 const cards=m.idx.map(idx=>state.players[pi].grid[idx]).filter(Boolean).map(clone),srcIds=m.idx.map(idx=>`cell-${pi}-grid-${idx}`);
 setWatch('bury-row',{actor:pi,cards,srcIds,dstId:'play-discard-pile',title:`räumt ${m.name} ab`,typeLabel:'GESPERRT UNTER ABLAGE',text:`${m.label} · oberste normale Ablage bleibt ziehbar`});
 removeMatch(pi,m);visualFx('action',`${m.name} gesperrt unter die Ablage`,'✨',8);activeMatchPromptKey='';state.pendingMatch=null;resolveMatches(pi,cont);
}
function continueMatchReady(){
 if(ui.mode!=='matchReady'&&!state.pendingMatch)return;
 skipOptionalMatches();
}
function removeMatch(pi,m){
 const p=state.players[pi];
 if(!Array.isArray(state.removedCards))state.removedCards=[];
 if(!Number.isFinite(p.bankedStarBonus))p.bankedStarBonus=0;
 if(m.pureStars){const bonus=(m.idx.length===4&&m.name.startsWith('Reihe'))?-15:-10;p.bankedStarBonus+=bonus;log(`${p.name} sichert ${bonus} Punkte Sternbonus durch das Abräumen.`)}
 const buried=[];
 for(const idx of m.idx){
   const c=p.grid[idx];
   if(c){
     c.faceUp=true;
     buried.push(c);
     state.removedCards.push(c); /* bewusst NICHT in playDiscard: diese Karten sind gesperrt */
     p.grid[idx]=null;
   }
 }
 const drawableTop=state.playDiscard[state.playDiscard.length-1]||null;
 log(`${p.name} räumt ${m.label} ab. ${buried.length} Karten liegen gesperrt unter der Ablage${drawableTop?`; ${cardShortText(drawableTop)} bleibt oben ziehbar`:''}.`);
}
function continueAfter(cont){if(cont==='finishTurn')finishTurn();else if(cont==='stayTurn'){ui={mode:'turnChoice',data:{},selected:[]};save();render()}else if(cont==='scoreNext')scoreNextPlayer();else if(cont==='meteorNext')meteorNext();else if(cont==='setupContinue')setupContinue();else finishTurn()}

function buildFinalTurnQueue(enderIndex,fromIndex=enderIndex){
 const n=state?.players?.length||0,out=[];
 if(n<=1)return out;
 const ender=Number(enderIndex);
 let cur=Number(fromIndex);
 if(!Number.isInteger(ender)||ender<0||ender>=n)return out;
 if(!Number.isInteger(cur)||cur<0||cur>=n)cur=ender;
 for(let step=1;step<n;step++){
   const i=(cur+step)%n;
   if(i===ender)break;
   out.push(i)
 }
 return out
}

function checkRoundTrigger(){
 if(state.roundEnder!==null)return;
 for(let i=0;i<state.players.length;i++){
   if(totalHidden(state.players[i])===0){
     state.roundEnder=state.currentPlayer;
     state.extraTurns=0;
     state.finalTurnQueue=buildFinalTurnQueue(state.roundEnder,state.roundEnder);
     const names=state.finalTurnQueue.map(pi=>state.players[pi]?.name).filter(Boolean);
     if(names.length){
       log(`${current().name} beendet die Runde. Alle anderen Spieler haben noch genau einen letzten Zug: ${names.join(' → ')}.`);
       toast(`🔔 Schlussrunde! Noch je 1 Zug: ${names.join(' → ')}`);
     }else{
       log(`${current().name} beendet die Runde.`);
       toast('🔔 Runde beendet.');
     }
     return
   }
 }
}
function finishTurn(){closeModal();if(state.heldReacts&&state.heldReacts.length){state.actionDiscard.push(...state.heldReacts);state.heldReacts=[];}checkRoundTrigger();if(state.roundEnder!==null){state.extraTurns=0;if(state.finalTurnQueue.length){state.currentPlayer=state.finalTurnQueue.shift();startTurn();return}startScoring();return}if(state.extraTurns>0){state.extraTurns--;startTurn();return}state.currentPlayer=(state.currentPlayer+1)%state.players.length;startTurn()}

let roundCloseRunningId='';
function roundCloseRevealOrder(){
 const out=[];
 for(let pi=0;pi<state.players.length;pi++){
   const p=state.players[pi];
   p.grid.forEach((c,idx)=>{if(c&&!c.faceUp)out.push({pi,zone:'grid',idx,id:c.id})});
   p.extras.forEach((c,idx)=>{if(c&&!c.faceUp)out.push({pi,zone:'extra',idx,id:c.id})});
 }
 return out
}
function startScoring(){
 const revealOrder=roundCloseRevealOrder();
 // Only for the theatrical score display: original visible/hidden face states.
 // Scores still use the authoritative post-removal state.
 state.roundScoreOpeningBoards=state.players.map(p=>({grid:clone(p.grid),extras:clone(p.extras)}));
 state.roundJokerValues={};
 state.pendingMatch=null;
 state.turnFlow=null;
 state.phase='roundReveal';
 state.roundClose={id:uid(),ownerDevice:cloud.enabled?cloud.deviceId:'local',createdAt:Date.now(),updatedAt:Date.now(),stage:'reveal',revealOrder,revealIndex:0,removePi:0,removedGroups:0,removedCards:0,keptBetterGroups:0};
 ui={mode:'roundReveal',data:{stage:'reveal'},selected:[]};
 save();render();maybeStartRoundClose()
}
function canDriveRoundClose(seq){
 if(!seq)return false;
 if(!cloud.enabled)return true;
 if(seq.ownerDevice===cloud.deviceId)return true;
 return isHostDevice()&&Date.now()-Number(seq.updatedAt||seq.createdAt||0)>6500
}
function maybeStartRoundClose(){
 const seq=state?.roundClose;
 if(state?.phase!=='roundReveal'||!seq||roundCloseRunningId===seq.id||!canDriveRoundClose(seq))return;
 roundCloseRunningId=seq.id;
 runRoundClose(seq.id).finally(()=>{if(roundCloseRunningId===seq.id)roundCloseRunningId=''})
}
function roundCloseCard(ref){
 const p=state?.players?.[ref?.pi],arr=ref?.zone==='extra'?p?.extras:p?.grid;
 if(!arr)return null;
 const byIndex=arr[ref.idx];
 if(byIndex&&(!ref.id||byIndex.id===ref.id))return byIndex;
 return arr.find(c=>c&&c.id===ref.id)||null
}
async function runRoundClose(seqId){
 while(state?.phase==='roundReveal'&&state?.roundClose?.id===seqId){
   const seq=state.roundClose;
   seq.updatedAt=Date.now();
   if(seq.stage==='reveal'){
     const list=Array.isArray(seq.revealOrder)?seq.revealOrder:[];
     if(seq.revealIndex>=list.length){state.roundJokerValues=buildRoundEndJokerValueMap();seq.stage='remove';seq.removePi=0;ui={mode:'roundReveal',data:{stage:'remove'},selected:[]};save();render();await sleepMs(650);continue}
     const ref=list[seq.revealIndex],c=roundCloseCard(ref);
     seq.revealIndex++;
     if(!c||c.faceUp){save();continue}
     // The old pre-score card-flip animation was removed on purpose.
     // The private scoring preparation flips the underlying card data only;
     // players will see the physical flip for the first time on the score stage.
     c.faceUp=true;
     ui={mode:'roundReveal',data:{stage:'reveal',pi:ref.pi,index:seq.revealIndex,total:list.length},selected:[]};
     save();
     await sleepMs(12);
     continue
   }
   if(seq.stage==='remove'){
     if(seq.removePi>=state.players.length){seq.stage='ready';ui={mode:'roundReveal',data:{stage:'ready'},selected:[]};save();render();await sleepMs(900);continue}
     const pi=seq.removePi,matches=findMatches(pi);
     if(!matches.length){seq.removePi++;save();continue}

     /* Reine Jokergruppen werden auf jeden Fall abgeräumt und nur einmal
        mit −10/−15 bewertet. Andere Kombinationen bleiben punktoptimiert. */
     const plan=bestRoundEndRemovalPlan(pi);
     const nextKey=plan.steps?.[0]?.key;
     const m=nextKey?matches.find(x=>x.key===nextKey):null;
     if(!m){
       const p=state.players[pi],before=rawRoundScore(p),singleScores=matches.map(x=>scoreAfterSimulatedRemoval(p,x));
       const bestAfter=singleScores.length?Math.min(...singleScores):before;
       seq.keptBetterGroups=(seq.keptBetterGroups||0)+matches.length;
       log(`${p.name}: ${matches.length} fertige Kombination(en) bleiben bei der Endwertung liegen, weil ${scoreFmt(before)} Punkte besser sind als Abräumen${Number.isFinite(bestAfter)?` (${scoreFmt(bestAfter)})`:''}. Reine Jokergruppen werden immer entfernt.`);
       toast(`⭐ ${p.name}: Kombination bleibt · ${scoreFmt(before)} ist günstiger als Abräumen`);
       seq.removePi++;
       ui={mode:'roundReveal',data:{stage:'remove',pi,removedGroups:seq.removedGroups,removedCards:seq.removedCards,keptBetterGroups:seq.keptBetterGroups,smartKeep:true},selected:[]};
       save();render();
       await sleepMs(720);
       continue
     }

     const cards=m.idx.map(idx=>state.players[pi].grid[idx]).filter(Boolean).map(clone),srcIds=m.idx.map(idx=>`cell-${pi}-grid-${idx}`);
     state.currentPlayer=pi;
     // No visual card removal here: this part is intentionally concealed.
     // The scored 12-card view will mark cleared groups without counting twice.
     removeMatch(pi,m);
     seq.removedGroups++;
     seq.removedCards+=cards.length;
     ui={mode:'roundReveal',data:{stage:'remove',pi,removedGroups:seq.removedGroups,removedCards:seq.removedCards,keptBetterGroups:seq.keptBetterGroups||0},selected:[]};
     save();render();
     await sleepMs(65);
     continue
   }
   if(seq.stage==='ready'){
     const removedGroups=seq.removedGroups||0,removedCards=seq.removedCards||0,keptBetterGroups=seq.keptBetterGroups||0;
     log(`Rundenabschluss: alle Karten für die spätere Auszählung vorbereitet; ${removedGroups} fertige Kombination(en) mit ${removedCards} Karten automatisch entfernt.${keptBetterGroups?` ${keptBetterGroups} Kombination(en) blieben liegen, weil ihre Joker-Endwertung günstiger war.`:''}`);
     state.roundClose=null;
     state.phase='scoring';
     ui={mode:'scoreSequence',data:{},selected:[]};
     save();render();
     await sleepMs(500);
     finishScoring();
     return
   }
   seq.stage='reveal';save()
 }
}
/* Kompatibilitätsfunktionen älterer Speicherstände. */
function scorePrepare(pi){if(state.phase==='scoring')finishScoring()}
function scoreNextPlayer(){if(state.phase==='scoring')finishScoring()}
function bestStarBonus(p){const groups=[];for(let r=0;r<3;r++){const idx=[r*4,r*4+1,r*4+2,r*4+3];if(idx.every(i=>p.grid[i]?.type==='star'))groups.push({idx,bonus:-15})}for(let c=0;c<4;c++){const idx=[c,c+4,c+8].filter(i=>p.grid[i]);if(idx.length===3&&idx.every(i=>p.grid[i].type==='star'))groups.push({idx,bonus:-10})}let best=0;function dfs(i,used,sum){if(i===groups.length){if(sum<best)best=sum;return}dfs(i+1,used,sum);const g=groups[i];if(g.idx.every(x=>!used.has(x))){const n=new Set(used);g.idx.forEach(x=>n.add(x));dfs(i+1,n,sum+g.bonus)}}dfs(0,new Set(),0);return best}
function liveJokerEndValueForGrid(p,idx){
 const c=p?.grid?.[idx];
 if(!c||c.type!=='star')return c?cardPoints(c):0;
 const row=Math.floor(idx/4),col=idx%4,values=[];
 for(let k=0;k<4;k++){
   const x=p.grid[row*4+k];
   if(x&&x.type==='number')values.push(Number(x.value)||0)
 }
 for(let k=0;k<3;k++){
   const x=p.grid[k*4+col];
   if(x&&x.type==='number')values.push(Number(x.value)||0)
 }
 return values.length?Math.min(...values):0
}
function jokerEndValueForGrid(p,idx){
 const c=p?.grid?.[idx];
 if(!c||c.type!=='star')return c?cardPoints(c):0;
 const locked=state?.roundJokerValues?.[c.id];
 return Number.isFinite(locked)?Number(locked):liveJokerEndValueForGrid(p,idx)
}
function buildRoundEndJokerValueMap(){
 const values={};
 for(const p of state?.players||[]){
   for(let i=0;i<(p.grid||[]).length;i++){
     const c=p.grid[i];
     if(c?.type==='star')values[c.id]=liveJokerEndValueForGrid(p,i)
   }
 }
 return values
}
function endRoundCardValue(p,c,zone,idx){
 if(!c)return 0;
 if(c.type!=='star')return cardPoints(c);
 /* Zusatzkarten liegen außerhalb des 4×3-Feldes und besitzen keine Reihe/Spalte. */
 if(zone!=='grid')return 0;
 return jokerEndValueForGrid(p,idx)
}
function jokerEndLabel(p,idx){
 const v=jokerEndValueForGrid(p,idx);
 return `Joker → ${v>0?'+':''}${v}`
}
function rawRoundScore(p){let s=0;for(let i=0;i<p.grid.length;i++){const c=p.grid[i];if(c)s+=endRoundCardValue(p,c,'grid',i)}for(let i=0;i<p.extras.length;i++){const c=p.extras[i];if(c)s+=endRoundCardValue(p,c,'extra',i)}if(jokerSpecialsEnabled())s+=p.actions.length*10;s+=bestStarBonus(p)+(Number(p.bankedStarBonus)||0);return s}

/* V118 END SCORING
   Reine Jokergruppen werden zwingend abgeräumt: −10 (3) oder −15 (4).
   Andere Gruppen dürfen nur liegen bleiben, wenn das für sie besser ist. */
function simulateMatchRemovalForScore(p,m){
 if(!p||!m)return p;
 if(!Number.isFinite(p.bankedStarBonus))p.bankedStarBonus=0;
 if(m.pureStars){
   const bonus=(m.idx.length===4&&m.name.startsWith('Reihe'))?-15:-10;
   p.bankedStarBonus+=bonus
 }
 for(const idx of m.idx)if(p.grid[idx])p.grid[idx]=null;
 return p
}
function scoreAfterSimulatedRemoval(p,m){
 const q=clone(p);
 simulateMatchRemovalForScore(q,m);
 return rawRoundScore(q)
}
function roundEndPlanKey(p){
 return `${p.grid.map(c=>c?c.id:'-').join(',')}|${Number(p.bankedStarBonus)||0}`
}
function bestRoundEndRemovalPlan(pi){
 const source=state?.players?.[pi];
 if(!source)return {score:0,steps:[],removedCards:0};
 const memo=new Map();
 function solve(p){
   const key=roundEndPlanKey(p);
   if(memo.has(key))return memo.get(key);
   const matches=findMatchesInPlayer(p);
   const required=matches.filter(m=>m.pureStars);
   /* Reine 3er-/4er-Jokergruppen müssen genau einmal als Gruppe verschwinden.
      Beim Score-Vergleich darf "Joker behalten + Bonus + negative Nachbarwerte"
      keine Alternative sein. Überschneidende Gruppen werden ohne Doppelnutzung
      derselben Karten in der punktegünstigeren Reihenfolge abgeräumt. */
   let best=required.length?null:{score:rawRoundScore(p),steps:[],removedCards:0};
   for(const m of (required.length?required:matches)){
     const q=clone(p);
     simulateMatchRemovalForScore(q,m);
     const tail=solve(q);
     const candidate={score:tail.score,steps:[{key:m.key,name:m.name,label:m.label},...tail.steps],removedCards:m.idx.length+tail.removedCards};
     /* Bei Gleichstand werden nur bei normalen Kombinationen weitere Karten entfernt. */
     if(!best||candidate.score<best.score||(candidate.score===best.score&&candidate.removedCards>best.removedCards))best=candidate
   }
   if(!best)best={score:rawRoundScore(p),steps:[],removedCards:0};
   memo.set(key,best);
   return best
 }
 return solve(clone(source))
}
let scoreSequenceSeen='',roundSummarySeen='',roundSummaryFocus=null,scoreSequencePlayback=null;
function scoreItemsForPlayer(p){const items=[];for(let i=0;i<p.grid.length;i++){const c=p.grid[i];if(!c)continue;const v=endRoundCardValue(p,c,'grid',i);items.push({kind:'card',card:clone(c),gridIndex:i,value:v,label:c.type==='star'?jokerEndLabel(p,i):String(c.value),jokerResolved:c.type==='star',jokerValue:c.type==='star'?v:null})}for(let i=0;i<p.extras.length;i++){const c=p.extras[i];if(!c)continue;const v=endRoundCardValue(p,c,'extra',i);items.push({kind:'card',card:clone(c),value:v,label:c.type==='star'?'Zusatz-Joker · 0':`Zusatz ${c.value}`,jokerResolved:c.type==='star',jokerValue:c.type==='star'?v:null})}if(jokerSpecialsEnabled())for(const a of p.actions)items.push({kind:'action',actionType:a.type,value:10,label:ACTIONS[a.type]?.name||'Aktionskarte'});const bonus=bestStarBonus(p)+(Number(p.bankedStarBonus)||0);if(bonus)items.push({kind:'bonus',value:bonus,label:'Sternbonus'});return items}
function scoreFmt(v){v=Number(v)||0;return `${v>0?'+':''}${v}`}
function scoreTone(v){v=Number(v)||0;return v<0?'good':v>0?'bad':'neutral'}
function scoreTokenHTML(item,i){
 const v=Number(item.value)||0;
 const cls=v<0?'negative':v>0?(item.kind==='action'?'penalty':'positive'):'bonus';
 let visual='';
 if(item.kind==='card'&&item.card){
   visual=`<div class="score-mini-card ${item.jokerResolved?'joker-resolved':''}">${cardHTML({...item.card,faceUp:true},true,false)}${item.jokerResolved?`<span class="joker-score-badge">→ ${scoreFmt(item.jokerValue)}</span>`:''}</div>`
 }else if(item.kind==='action'){
   const a=ACTIONS[item.actionType];
   visual=`<div class="score-special-icon action-score-icon">${a?.icon||'⚡'}</div>`
 }else{
   visual=`<div class="score-special-icon bonus-score-icon">⭐</div>`
 }
 const type=item.kind==='action'?'AKTION':item.kind==='bonus'?'BONUS':'KARTE';
 return `<div id="score-token-${i}" class="score-token ${cls}" data-score="${v}">
   <span class="score-token-type">${type}</span>
   ${visual}
   <div class="tok-label">${escapeHTML(item.label||'Karte')}</div>
   <div class="tok-points ${scoreTone(v)}">${scoreFmt(v)}</div>
 </div>`
}
function finishScoring(){const scores=state.players.map(rawRoundScore);const e=state.roundEnder;let final=scores.slice();if(e!==null&&scores[e]>0){const min=Math.min(...scores.filter((_,i)=>i!==e));if(min<=scores[e])final[e]=scores[e]*2}const seq={id:uid(),round:state.round,roundEnder:e,ownerDevice:cloud.enabled?cloud.deviceId:'local',createdAt:Date.now(),players:state.players.map((p,i)=>({index:i,name:p.name,beforeTotal:p.total,raw:scores[i],final:final[i],items:scoreItemsForPlayer(p),gridSnapshot:clone(p.grid),openingGrid:clone(state.roundScoreOpeningBoards?.[i]?.grid||p.grid),openingExtras:clone(state.roundScoreOpeningBoards?.[i]?.extras||p.extras)}))};state.phase='scoringSequence';state.scoreSequence=seq;ui={mode:'scoreSequence',data:{},selected:[]};save();render();maybeStartScoreSequence()}
function maybeStartScoreSequence(){const seq=state?.scoreSequence;if(!seq||seq.id===scoreSequenceSeen)return;scoreSequenceSeen=seq.id;runScoreSequenceVisual(seq)}
function sleepMs(ms){return new Promise(r=>setTimeout(r,ms))}
function scoreSequenceAsRoyalSummary(seq){
 const players=seq.players.map(sp=>({index:sp.index,name:sp.name,beforeTotal:sp.beforeTotal,raw:sp.raw,round:sp.final,total:sp.beforeTotal+sp.final,items:sp.items||[],gridSnapshot:sp.gridSnapshot||[],openingGrid:sp.openingGrid||sp.gridSnapshot||[],openingExtras:sp.openingExtras||[]}));
 return {id:seq.id,round:seq.round,ended:players.some(p=>p.total>=Number(state?.target||100)),nextStarterIndex:seq.roundEnder,players};
}
function isRoyalCountingCurrent(seq){
 if(!scoreSequencePlayback||scoreSequencePlayback.id!==seq.id||!state||Number(state.round)!==Number(seq.round))return false;
 if(state.phase==='scoringSequence')return state.scoreSequence?.id===seq.id;
 return (state.phase==='betweenRounds'||state.phase==='gameOver')&&state.lastRoundSummary?.id===seq.id;
}
function scrollRoyalCountToRow(row){
 const scroller=row?.closest('.sky-score-entries');
 if(!scroller||!row)return;
 const visibleBottom=scroller.scrollTop+scroller.clientHeight;
 const neededBottom=row.getBoundingClientRect().bottom-scroller.getBoundingClientRect().top+scroller.scrollTop;
 if(neededBottom>visibleBottom)scroller.scrollTo({top:neededBottom-scroller.clientHeight+8,behavior:'smooth'});
}
function orderedRoyalCountSteps(sp){
 const opening=[...(sp.openingGrid||[]),...(sp.openingExtras||[])].filter(Boolean);
 const wasHidden=new Map(opening.filter(c=>c?.id).map(c=>[c.id,c.faceUp===false]));
 const open=[],hidden=[],post=[];
 for(let idx=0;idx<(sp.items||[]).length;idx++){
   const item=sp.items[idx];const step={item,idx,kind:'scored'};
   if(item.kind!=='card')post.push(step);
   else if(wasHidden.get(item.card?.id))hidden.push(step);
   else open.push(step)
 }
 // Revealing a removed card does not count it again. It is marked cleared.
 const scoredIds=new Set((sp.items||[]).filter(x=>x.kind==='card').map(x=>x.card?.id));
 for(const c of (sp.openingGrid||[]))if(c&&!scoredIds.has(c.id)&&c.faceUp===false)hidden.push({kind:'removed',item:{card:c,value:0,kind:'card',label:'Abgeräumt – keine zusätzlichen Kartenpunkte'},idx:-1});
 for(const c of (sp.openingExtras||[]))if(c&&!scoredIds.has(c.id)&&c.faceUp===false)hidden.push({kind:'removed',item:{card:c,value:0,kind:'card',label:'Abgeräumt – keine zusätzlichen Kartenpunkte'},idx:-1});
 return {open,hidden,post}
}
async function runScoreSequenceVisual(seq){
 document.querySelectorAll('.score-sequence-overlay').forEach(el=>el.remove());
 const playback={id:seq.id};scoreSequencePlayback=playback;
 const summary=scoreSequenceAsRoyalSummary(seq);let reachedEnd=false;
 try{
   for(let pi=0;pi<seq.players.length;pi++){
     if(!isRoyalCountingCurrent(seq))return;
     const sp=seq.players[pi];roundSummaryFocus=sp.index;
     modal(buildRoyalRoundSummaryModal(summary,{counting:true,playerIndex:pi}),false);
     const root=document.querySelector('#modal .sky-score-counting');if(!root)return;
     const counter=root.querySelector('.sky-score-main-running');
     const progress=root.querySelector('.royal-count-progress');
     const equation=root.querySelector('.royal-current-equation');
     const headline=root.querySelector('.royal-count-headline');
     let running=0,finishedCards=0;
     const ordered=orderedRoyalCountSteps(sp);
     const allSteps=[...ordered.open,...ordered.hidden,...ordered.post];
     const openingCount=ordered.open.length;
     if(headline)headline.textContent=`${sp.name}: zuerst die ${openingCount} offenen Karten zählen`;
     await sleepMs(1150);
     for(let si=0;si<allSteps.length;si++){
       if(!isRoyalCountingCurrent(seq)||!root.isConnected)return;
       const step=allSteps[si],item=step.item,v=Number(item.value)||0;
       const stage=si<ordered.open.length?'open':si<ordered.open.length+ordered.hidden.length?'hidden':'effects';
       const row=step.idx>=0?root.querySelector(`.sky-score-entry[data-count-index="${step.idx}"]`):null;
       const card=step.item.card?.id?[...root.querySelectorAll('.sky-score-board .sky-score-tile[data-grid-index]')].find(el=>{
          const i=Number(el.dataset.gridIndex);
          return sp.openingGrid?.[i]?.id===step.item.card.id
       }):null;
       if(stage==='hidden'){
         if(headline)headline.textContent=step.kind==='removed'?'Abgeräumte Jokerreihe – ohne doppelte Kartenpunkte':'Verdeckte Karte wird langsam umgedreht …';
         if(progress)progress.textContent=`Spieler ${pi+1} von ${seq.players.length} · verdeckte Karten aufdecken`;
         await sleepMs(650);
         if(!isRoyalCountingCurrent(seq)||!root.isConnected)return;
         if(card){card.classList.add('sky-score-flipping');card.classList.remove('sky-score-closed');card.setAttribute('aria-label',`Aufgedeckte Karte: ${step.item.card.type==='star'?'Joker':step.item.card.value}`)}
         // This is deliberately much slower than the usual point counting.
         await sleepMs(1900);
         if(!isRoyalCountingCurrent(seq)||!root.isConnected)return;
       }else if(stage==='open'){
         if(headline)headline.textContent=`Offene Karte: ${summaryItemTitle(item,step.idx)} wird addiert`;
         await sleepMs(410)
       }else{
         if(headline)headline.textContent=`${summaryItemTitle(item,step.idx)} wird berücksichtigt`;
         await sleepMs(620)
       }
       if(!isRoyalCountingCurrent(seq)||!root.isConnected)return;
       row?.classList.remove('pending');row?.classList.add('revealed','counting-now');
       card?.classList.remove('pending');card?.classList.add('revealed','counting-now');
       if(step.kind==='removed'){card?.classList.add('sky-score-cleared');if(headline)headline.textContent='Abgeräumt – diese Karte zählt nicht noch einmal'}
       if(progress)progress.textContent=`Spieler ${pi+1} von ${seq.players.length} · ${si+1} von ${allSteps.length} Schritten`;
       scrollRoyalCountToRow(row);
       const previous=running;running+=v;
       if(counter)counter.textContent=scoreFmt(running);
       updateRoyalScoreTable(root,sp.index,running,(Number(sp.beforeTotal)||0)+running);
       if(equation)equation.textContent=step.kind==='removed'?'Abgeräumte Karten: 0 zusätzliche Punkte':`${scoreFmt(previous)} ${v<0?'−':'+'} ${Math.abs(v)} = ${scoreFmt(running)}`;
       playFxSound(v<0?'star':v>0?'draw':'turn');
       if(v<0)haptic(5);
       await sleepMs(stage==='hidden'?440:510);
       row?.classList.remove('counting-now');card?.classList.remove('counting-now','sky-score-flipping');
     }
     if(!isRoyalCountingCurrent(seq)||!root.isConnected)return;
     if(sp.final!==sp.raw){
       const line=root.querySelector('.royal-doubling-line');
       if(line){line.classList.add('show');line.textContent=`Rundenbeender: ${scoreFmt(sp.raw)} × 2 = ${scoreFmt(sp.final)}`}
       if(headline)headline.textContent='Rundenbeender-Regel: Punkte werden verdoppelt';
       await sleepMs(1100);
       if(!isRoyalCountingCurrent(seq)||!root.isConnected)return;
       running=Number(sp.final);
       if(counter)counter.textContent=scoreFmt(running);
       updateRoyalScoreTable(root,sp.index,running,(Number(sp.beforeTotal)||0)+running);
       if(equation)equation.textContent=`${scoreFmt(sp.raw)} × 2 = ${scoreFmt(sp.final)}`;
       playFxSound('action');
     }else if(running!==Number(sp.raw)){
       running=Number(sp.raw)||0;
       if(counter)counter.textContent=scoreFmt(running);
       updateRoyalScoreTable(root,sp.index,running,(Number(sp.beforeTotal)||0)+running);
       if(equation)equation.textContent=`Rundenwert: ${scoreFmt(running)}`;
     }
     updateRoyalScoreTable(root,sp.index,sp.final,(Number(sp.beforeTotal)||0)+Number(sp.final),{complete:true});
     if(headline)headline.textContent=`${sp.name}: ${scoreFmt(sp.final)} Rundenpunkte`;
     if(progress)progress.textContent=`Spieler ${pi+1} von ${seq.players.length} · vollständig gezählt`;
     root.querySelectorAll(`.sky-score-mini-points[data-score-player-index="${sp.index}"]`).forEach(el=>el.textContent=scoreFmt(sp.final));
     await sleepMs(1050)
   }
   reachedEnd=true;
   if(!isRoyalCountingCurrent(seq))return;
   const canCommit=!cloud.enabled||isHostDevice()||seq.ownerDevice===cloud.deviceId;
   if(canCommit&&state?.scoreSequence?.id===seq.id)commitScoreSequence(seq)
 }catch(e){console.error('[skyjo v123 score reveal]',e)}finally{
   if(scoreSequencePlayback===playback)scoreSequencePlayback=null;
   if(!reachedEnd||!state||Number(state.round)!==Number(seq.round))return;
   const actual=state.lastRoundSummary?.id===seq.id?state.lastRoundSummary:null;
   if(actual){roundSummarySeen=actual.id;roundSummaryFocus=null;if(actual.ended)openRoyalFinaleSummary();else openRoyalRoundSummary()}
   else if(state.phase==='scoringSequence'){
     const text=document.querySelector('#modal .royal-count-headline');if(text)text.textContent='Alle Spieler gezählt – warte auf Synchronisierung …';
     const progress=document.querySelector('#modal .royal-count-progress');if(progress)progress.textContent='Auszählung abgeschlossen';
   }
 }
}
function commitScoreSequence(seq){seq.players.forEach(sp=>{const p=state.players[sp.index];p.lastRound=sp.final;p.total+=sp.final});const ended=state.players.some(p=>p.total>=state.target);state.gameOver=ended;state.phase=ended?'gameOver':'betweenRounds';state.lastRoundSummary={id:seq.id,round:seq.round,ended,nextStarterIndex:state.roundEnder,roundEnderIndex:state.roundEnder,players:seq.players.map(sp=>({index:sp.index,name:sp.name,beforeTotal:sp.beforeTotal,raw:sp.raw,round:sp.final,total:state.players[sp.index].total,items:clone(sp.items||[]),gridSnapshot:clone(sp.gridSnapshot||[]),openingGrid:clone(sp.openingGrid||sp.gridSnapshot||[]),openingExtras:clone(sp.openingExtras||[])}))};state.scoreSequence=null;save();render();const minTotal=Math.min(...state.players.map(p=>p.total)),winners=state.players.filter(p=>p.total===minTotal);visualFx(ended?'win':'action',ended?(winners.length===1?`${winners[0].name} gewinnt!`:`Unentschieden: ${winners.map(p=>p.name).join(' & ')}`):'Runde beendet',ended?'🏆':'📊',ended?18:8);if(ended)finaleBurst();maybeShowRoundSummary()}

function summaryItemVisual(item,compact=false){
 if(item.kind==='card'&&item.card)return `<div class="royal-mini-card ${item.jokerResolved?'joker':''}">${cardHTML({...item.card,faceUp:true},true,false)}${item.jokerResolved?`<span class="royal-joker-badge">→ ${scoreFmt(item.jokerValue)}</span>`:''}</div>`;
 if(item.kind==='action'){
   const a=ACTIONS[item.actionType]||{icon:'⚡',name:item.label||'Aktion'};
   return `<div class="royal-mini-action"><span>${a.icon}</span><small>${escapeHTML(compact?'':a.name)}</small></div>`
 }
 return `<div class="royal-mini-bonus">⭐</div>`
}
function summaryItemTitle(item,idx){
 if(item.kind==='card'){
   if(item.card?.type==='star')return `Joker – ${scoreFmt(item.value)} Punkte`;
   if((item.label||'').startsWith('Zusatz'))return item.label;
   return `Karte ${idx+1} – Wert ${item.card?.value}`
 }
 if(item.kind==='action')return `Aktionskarte: ${ACTIONS[item.actionType]?.name||item.label||'Aktion'}`;
 return item.label||'Bonus'
}
function roundSummaryFocusPlayer(summary){
 if(Number.isInteger(roundSummaryFocus)){
   const match=(summary.players||[]).find(p=>Number(p.index)===Number(roundSummaryFocus));
   if(match)return match
 }
 if(cloud.enabled&&cloud.myName){
   const mine=(summary.players||[]).find(p=>p.name===cloud.myName);
   if(mine)return mine
 }
 const ranked=[...(summary.players||[])].sort((a,b)=>a.total-b.total||a.round-b.round);
 return ranked[0]||summary.players?.[0]||null
}

/* V122: only one round-scoring view — the four genuine card grids are
   projected as the image-inspired gold/blue scoreboard. */
function royalCardGridData(p,{counting=false,finished=true}={}){
 // During the score show this is the exact board at the moment the round ended.
 // In finished view, present remaining cards, as after automatic clearing.
 const original=Array.isArray(p?.openingGrid)&&counting?p.openingGrid:(Array.isArray(p?.gridSnapshot)?p.gridSnapshot:[]);
 if(original.length>=12)return original.slice(0,12);
 const result=Array(12).fill(null),cards=(p?.items||[]).filter(x=>x.kind==='card'&&!String(x.label||'').startsWith('Zusatz'));
 let cursor=0;
 for(const item of cards){
   let idx=Number.isInteger(item.gridIndex)?item.gridIndex:cursor++;
   if(idx>=0&&idx<12)result[idx]=item.card||null
 }
 return result
}
function royalCardTile(card,{counting=false,countIndex=-1,value=null,mini=false,hidden=false,gridIndex=-1,removed=false}={}){
 if(!card)return `<div class="sky-score-tile vacant" aria-label="Abgeräumte Karte"><span>✦</span></div>`;
 const v=Number(card.value)||0;
 const typ=card.type==='star'?'joker':v<0?'negative':v===0?'zero':v===3?'red':v>=9?'green':v>=5?'yellow':'blue';
 const face=card.type==='star'?'🃏':escapeHTML(String(card.value));
 const counted=counting&&countIndex>=0?'pending':'';
 const jokerValue=value!==null&&card.type==='star'?`<em class="sky-score-joker-value">${scoreFmt(value)}</em>`:'';
 const attr=(countIndex>=0?` data-count-index="${countIndex}"`:'')+(gridIndex>=0?` data-grid-index="${gridIndex}"`:'');
 return `<div class="sky-score-tile ${typ} ${counted} ${hidden?'sky-score-closed':''} ${removed?'sky-score-cleared':''}" ${attr} title="${hidden?'Noch verdeckt':removed?'Abgeräumte Karte':card.type==='star'?'Joker':`Kartenwert ${v}`}" aria-label="${hidden?'Verdeckte Karte':removed?'Abgeräumte Karte':`Kartenwert ${v}`}"><div class="sky-score-tile-inner"><div class="sky-score-tile-front"><span class="sky-score-card-corner">✧</span><span class="sky-score-card-face">${face}</span>${jokerValue}</div><div class="sky-score-tile-back"><span>✦</span><small>SKYJO</small></div></div></div>`
}
function royalGridMarkup(p,{counting=false,isActive=false,finished=false}={}){
 const cards=royalCardGridData(p,{counting});
 const itemById=new Map((p.items||[]).filter(x=>x.kind==='card'&&x.card?.id).map((x,i)=>[x.card.id,x]));
 return cards.map((card,idx)=>{
   if(!card)return royalCardTile(null);
   const i=(p.items||[]).findIndex(x=>x.kind==='card'&&(x.gridIndex===idx||(x.gridIndex===undefined&&x.card?.id===card.id)));
   const oldHidden=counting&&card.faceUp===false;
   return royalCardTile(card,{counting:counting&&isActive,countIndex:isActive?i:-1,gridIndex:idx,hidden:oldHidden,value:i>=0?p.items[i]?.value:null,removed:counting&&i<0});
 }).join('')
}
function royalMiniBoard(p,{counting=false,countIndex=0,pi=0,focus=null}={}){
 if(!p)return '';
 const current=p.index===focus?.index;
 const finished=!counting||pi<countIndex;
 const points=finished?p.round:(current?0:null);
 const i=Number(p.index);
 // Do not reveal hidden cards of a player who has not been counted yet.
 const revealStage=counting&&!finished;
 return `<button class="sky-score-mini ${current?'selected':''} ${counting?'readonly':''}" ${counting?'disabled':`onclick="Game.setRoundSummaryFocus(${i})"`} aria-label="${escapeHTML(p.name)} · ${points===null?'noch nicht gezählt':`${points} Rundenpunkte`}">
 <div class="sky-score-mini-head"><span class="sky-score-rank">${i+1}</span><span class="sky-score-avatar a${i%4}">●</span><b>${escapeHTML(p.name)}</b></div>
 <div class="sky-score-mini-grid">${royalGridMarkup(p,{counting:revealStage,isActive:false})}</div>
 <div class="sky-score-mini-foot"><span>RUNDE ${Number(state?.round||0)||''}</span><strong class="sky-score-mini-points" data-score-player-index="${i}">${points===null?'…':points}</strong></div>
 </button>`
}
/* V124: Rundenpunkte gehören je Spieler, nie als eine Zahl aller Spieler zusammengefasst. */
function royalScoreTableMarkup(summary,{counting=false,countIndex=0,mobile=false}={}){
 const players=summary.players||[];
 const rows=players.map((p,i)=>{
   const isCurrent=counting&&i===countIndex;
   const waiting=counting&&i>countIndex;
   const round=waiting?'–':isCurrent?'0':scoreFmt(p.round);
   const total=waiting?'–':isCurrent?String(Number(p.beforeTotal)||0):String(Number(p.total)||0);
   return `<div class="sky-score-table-row ${isCurrent?'active':''} ${waiting?'waiting':''}" data-score-table-player="${Number(p.index)}" aria-label="${escapeHTML(p.name)}">
     <span class="sky-score-table-person"><i class="sky-score-table-avatar a${Number(p.index)%4}">${Number(p.index)+1}</i><b title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</b></span>
     <strong class="sky-score-table-round" data-score-table-round="${Number(p.index)}">${round}</strong>
     <strong class="sky-score-table-total" data-score-table-total="${Number(p.index)}">${total}</strong>
   </div>`;
 }).join('');
 return `<section class="sky-score-table ${mobile?'mobile':''}" aria-label="Punktetabelle dieser Runde">
   <div class="sky-score-table-heading"><span>✦</span> PUNKTETABELLE <span>✦</span></div>
   <div class="sky-score-table-note">RUNDE ${Number(summary.round)}</div>
   <div class="sky-score-table-cols"><span>SPIELER</span><span>RUNDE</span><span>GESAMT</span></div>
   <div class="sky-score-table-rows">${rows}</div>
   <div class="sky-score-table-legend">${counting?'– = noch offen · Gesamt inkl. Runde':'Gesamt = bisher + diese Runde'}</div>
 </section>`
}
function updateRoyalScoreTable(root,playerIndex,round,total,{complete=false}={}){
 if(!root)return;
 for(const row of root.querySelectorAll(`.sky-score-table-row[data-score-table-player="${Number(playerIndex)}"]`)){
   row.querySelector('.sky-score-table-round').textContent=scoreFmt(round);
   row.querySelector('.sky-score-table-total').textContent=String(Number(total)||0);
   row.classList.remove('waiting');
   if(complete){row.classList.remove('active');row.classList.add('finished')}
 }
}
function buildRoyalRoundSummaryModal(summary,options={}){
 const counting=!!options.counting, countIndex=Math.max(0,Number(options.playerIndex)||0);
 const players=(summary.players||[]);
 const focus=counting?players[countIndex]:roundSummaryFocusPlayer(summary);
 if(!focus)return `<div class="royal-modal royal-round-modal"><h3>Keine Rundenpunkte vorhanden.</h3></div>`;
 const centralIndex=players.findIndex(p=>p.index===focus.index);
 const others=players.filter(p=>p.index!==focus.index);
 const left=others.slice(0,2),right=others.slice(2,3),overflow=others.slice(3);
 const renderSide=p=>royalMiniBoard(p,{counting,countIndex,pi:players.findIndex(x=>x.index===p.index),focus});
 const entries=(focus.items||[]).map((item,idx)=>{
   const name=summaryItemTitle(item,idx);
   const miniature=item.kind==='card'?royalCardTile(item.card):item.kind==='action'?`<span class="sky-score-entry-special">${ACTIONS[item.actionType]?.icon||'⚡'}</span>`:'<span class="sky-score-entry-special">⭐</span>';
   return `<div class="sky-score-entry ${counting?'pending':''}" data-count-index="${idx}"><span class="sky-score-entry-index">${idx+1}</span><span class="sky-score-entry-card">${miniature}</span><span class="sky-score-entry-caption" title="${escapeHTML(name)}">${escapeHTML(name)}</span><b class="sky-score-entry-points ${scoreTone(item.value)}">${scoreFmt(item.value)}</b></div>`
 }).join('');
 const currentRound=counting?0:Number(focus.round||0);
 const extraButtons=summary.ended?`<button class="sky-score-next" onclick="Game.openRoyalFinaleSummary()">ZUM FINALE <span>❯❯</span></button>`:
   cloud.enabled&&!isHostDevice()?'<div class="sky-score-wait">⏳ Der Host startet die nächste Runde</div>':'<button class="sky-score-next" onclick="Game.nextRound()">WEITER <span>❯❯</span></button>';
 const centerItems=royalGridMarkup(focus,{counting,isActive:true});
 return `<div class="royal-modal royal-round-modal sky-score-scene ${counting?'royal-counting sky-score-counting':''}" role="region" aria-label="Punkteabrechnung nach Runde ${Number(summary.round)}">
   <div class="sky-score-header"><div class="sky-score-logo"><span>SKYJO</span><strong>ACTION</strong><i class="sky-logo-card lc1"></i><i class="sky-logo-card lc2"></i><i class="sky-logo-card lc3"></i></div><h2>✧ &nbsp; PUNKTEABRECHNUNG &nbsp; ✧</h2><div class="sky-score-round-label">RUNDE ${Number(summary.round)}</div></div>
   <div class="sky-score-body">
     <div class="sky-score-side left">${left.map(renderSide).join('')}</div>
     <div class="sky-score-center">
        <div class="sky-score-center-head"><span class="sky-score-big-rank">${Number(focus.index)+1}</span><h3>${escapeHTML(focus.name)}</h3></div>
        <div class="sky-score-center-content">
          <section class="sky-score-board-wrap" aria-label="12-Karten-Feld von ${escapeHTML(focus.name)}"><div class="sky-score-board">${centerItems}</div><div class="sky-score-glow-caption">${counting?'<span class="royal-count-headline">Die Karten werden einzeln ausgezählt …</span>':'Alle Karten ausgezählt'}</div></section>
          <section class="sky-score-parchment" aria-label="Karten-Zwischensumme"><h4>ZWISCHENSUMME</h4><div class="sky-score-progress royal-count-progress">${counting?`Spieler ${countIndex+1} von ${players.length} · Karte 0 von ${(focus.items||[]).length}`:'Alle Karten gezählt'}</div><div class="sky-score-entries">${entries}</div><div class="sky-score-parchment-total"><span>RUNDE</span><strong class="sky-score-main-running royal-current-header-total">${currentRound}</strong></div><div class="royal-doubling-line"></div></section>
        </div>
     </div>
     <div class="sky-score-side right">${right.map(renderSide).join('')}${royalScoreTableMarkup(summary,{counting,countIndex})}</div>
   </div>
   <div class="sky-score-mobile-table">${royalScoreTableMarkup(summary,{counting,countIndex,mobile:true})}</div>
   <div class="sky-score-mobile-peers">${others.map(renderSide).join('')}</div>
   ${overflow.length?`<div class="sky-score-overflow">${overflow.map(renderSide).join('')}</div>`:''}
   <div class="sky-score-footer"><button class="sky-score-review" ${counting?'disabled':'onclick="Game.showRoundOverview()"'}>▥ &nbsp; RUNDENÜBERSICHT</button><span class="sky-score-footer-explainer royal-current-equation">${counting?'Die Rundenpunkte werden Spieler für Spieler ermittelt.':'Alle Spieler wurden einzeln abgerechnet.'}</span>${counting?'<div class="sky-score-counting-hint">⏳ Spielerweise Kartenzählung läuft …</div>':extraButtons}</div>
 </div>`
}
function showRoundOverview(){
 const s=state?.lastRoundSummary;if(!s)return;
 const content=[...(s.players||[])].sort((a,b)=>a.round-b.round).map((p,i)=>`<div class="sky-overview-row"><span>${i+1}.</span><b>${escapeHTML(p.name)}</b><strong>${scoreFmt(p.round)} Rundenpunkte</strong><em>${p.total} Gesamtpunkte</em></div>`).join('');
 modal(`<div class="royal-modal royal-round-modal sky-overview"><h2>RUNDENÜBERSICHT · RUNDE ${Number(s.round)}</h2>${content}<div class="sky-overview-actions"><button class="primary" onclick="Game.openRoyalRoundSummary()">← Zurück zur Abrechnung</button></div></div>`,false)
}
function buildRoyalFinaleModal(summary){
 const ranked=[...(summary.players||[])].sort((a,b)=>a.total-b.total||a.round-b.round);
 const first=ranked[0]||null, second=ranked[1]||null, third=ranked[2]||null;
 const makePodium=(p,pos,cls)=>p?`<div class="royal-podium-card ${cls}"><div class="royal-podium-medal">${pos}</div><div class="royal-podium-name">${escapeHTML(p.name)}</div><div class="royal-podium-score"><small>PUNKTE</small><b data-royal-counter="${Number(p.total)}" aria-label="${Number(p.total)} Punkte">${p.total}</b></div></div>`:'';
 const extras=ranked.slice(3).map((p,i)=>`<div class="royal-extra-rank"><span>#${i+4}</span><b>${escapeHTML(p.name)}</b><em>${p.total} Punkte</em></div>`).join('');
 const leftBtn=`<button onclick="Game.showFinaleDetails()">DETAILS ANZEIGEN</button>`;
 let midBtn='';
 let rightBtn='';
 if(cloud.enabled){
   if(isHostDevice()){
     midBtn=`<button class="primary royal-cta" onclick="Game.returnFinishedGameToRoomLobby()">NEUE RUNDE</button>`;
     rightBtn=`<button onclick="Game.backToLobby()">ZURÜCK ZUM HAUPTMENÜ</button>`
   }else{
     midBtn=`<button class="primary royal-cta" onclick="Game.backToLobby()">NEUE RUNDE</button>`;
     rightBtn=`<button onclick="Game.closeModal()">SCHLIESSEN</button>`
   }
 }else{
   midBtn=`<button class="primary royal-cta" onclick="Game.restart()">NEUE RUNDE</button>`;
   rightBtn=`<button onclick="Game.backToLobby()">ZURÜCK ZUM HAUPTMENÜ</button>`
 }
 return `<div class="royal-modal royal-finale-modal">
   <div class="royal-finale-title">SKYJO <span>ACTION</span></div>
   <div class="royal-finale-subtitle">GROSSES FINALE</div>
   <div class="royal-finale-round">ENDSTAND</div>
   <div class="royal-stage-wrap">
     <div class="royal-curtain left"></div>
     <div class="royal-curtain right"></div>
     <div class="royal-podium-grid">
       <div class="royal-podium-slot second">${makePodium(second,2,'second')}</div>
       <div class="royal-podium-slot first"><div class="royal-winner-ribbon">SIEGER</div>${makePodium(first,1,'first')}</div>
       <div class="royal-podium-slot third">${makePodium(third,3,'third')}</div>
     </div>
     ${extras?`<div class="royal-extra-board">${extras}</div>`:''}
   </div>
   <div class="modal-actions royal-bottom-actions royal-finale-actions">${leftBtn}${midBtn}${rightBtn}</div>
 </div>`
}
function openRoyalRoundSummary(){
 const s=state?.lastRoundSummary;
 if(!s)return;
 modal(buildRoyalRoundSummaryModal(s),false)
}
function openRoyalFinaleSummary(){
 const s=state?.lastRoundSummary;
 if(!s)return;
 modal(buildRoyalFinaleModal(s),false)
}
function setRoundSummaryFocus(index){roundSummaryFocus=Number(index);openRoyalRoundSummary()}
function showFinaleDetails(){openRoyalRoundSummary()}
function maybeShowRoundSummary(force=false){
 const s=state?.lastRoundSummary;
 if(force)roundSummarySeen='';
 if(!s||s.id===roundSummarySeen)return;
 if(scoreSequencePlayback?.id===s.id)return;
 roundSummarySeen=s.id;
 if(s.ended)openRoyalFinaleSummary();
 else openRoyalRoundSummary()
}
async function nextRound(){
 if(cloud.enabled&&!isHostDevice()){toast('Nur der Host startet die nächste Runde.');return}
 if(!state||state.phase!=='betweenRounds'){toast('Die nächste Runde kann gerade nicht gestartet werden.');return}
 closeModal();
 const starter=Number.isInteger(state.roundEnder)?state.roundEnder:0;
 state.startPlayer=starter;
 state.round++;
 log(`${state.players[starter].name} hat die vorige Runde beendet und beginnt Runde ${state.round}.`);
 beginRound();

 if(!cloud.enabled)return;

 const desiredGame=clone(state);
 const desiredRound=Number(desiredGame.round||0);
 toast(`☁ Runde ${desiredRound} wird für alle Spieler gestartet …`);

 // Erst den normalen, bereits geplanten Save fertig werden lassen.
 await waitForCloudIdle(5000);

 // Danach serverseitig prüfen, ob exakt die neue Runde angekommen ist.
 let remote=await fetchCloudRoom(cloud.room,false);
 const remoteRound=Number(remote?.state?.game?.round||0);
 const remotePhase=remote?.state?.game?.phase||'';
 if(remote?.found&&isRoomDoc(remote.state)&&remoteRound===desiredRound&&remotePhase==='initialReveal'){
   if(Number(remote.rev||0)>Number(cloud.rev||0))applyCloudDoc(remote.state,remote.rev||0);
   toast(`☁ Runde ${desiredRound} läuft jetzt auf allen Geräten`);
   return
 }

 // Falls der normale Save wegen einer Revision/Race Condition verlorenging:
 // neuesten Raum holen und NUR den game-Teil durch die vom Host erzeugte neue Runde ersetzen.
 if(remote?.found&&isRoomDoc(remote.state)){
   const forced=clone(remote.state);
   forced.game=clone(desiredGame);
   forced.lobby.status='playing';
   const baseRev=Number(remote.rev||0);
   const out=await postCloudDoc(forced,baseRev);
   if(out?.ok){
     cloud.doc=forced;
     cloud.rev=Number(out.rev)||baseRev;
     cloud.lastPushedJSON=JSON.stringify(forced);
     cloud.lastStatus='online';
     cloud.serverOK=true;
     state=clone(desiredGame);
     ui=restorePlayUIFromState();
     try{localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch(_e){}
     render();
     toast(`☁ Runde ${desiredRound} wurde synchronisiert`);
     return
   }
   if(out?.conflict){
     const fresh=await fetchCloudRoom(cloud.room,false);
     if(fresh?.found&&isRoomDoc(fresh.state)&&Number(fresh.state?.game?.round||0)===desiredRound){
       applyCloudDoc(fresh.state,fresh.rev||0);
       toast(`☁ Runde ${desiredRound} wurde synchronisiert`);
       return
     }
   }
 }

 cloud.lastStatus='error';
 cloud.lastError=`Runde ${desiredRound} konnte nicht bestätigt werden. Bitte kurz Aktualisieren drücken.`;
 render();
 toast('⚠ Neue Runde konnte nicht an alle Geräte bestätigt werden')
}
function modal(html,closable=true){
 const back=$('#modalBack'),m=$('#modal'),royal=html.includes('royal-round-modal')||html.includes('royal-finale-modal');
 back.classList.toggle('royal-active',royal);m.classList.toggle('royal-host',royal);
 m.innerHTML=html+(closable?'<div class="modal-actions"><button onclick="Game.closeModal()">Schließen</button></div>':'');
 m.scrollTop=0;back.classList.add('show');
 if(royal&&!html.includes('royal-counting'))requestAnimationFrame(()=>animateRoyalScoring(m));
}
function closeModal(){const b=$('#modalBack');if(b){b.classList.remove('show','royal-active');$('#modal')?.classList.remove('royal-host')}}
function animateRoyalScoring(root){
 const targets=[...root.querySelectorAll('[data-royal-counter]')];
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 if(!targets.length||reduced)return;
 const starts=targets.map(el=>({el,target:Number(el.dataset.royalCounter),label:el.textContent})).filter(x=>Number.isFinite(x.target));
 starts.forEach(({el})=>{el.textContent='0'});
 const duration=950,start=performance.now();
 function step(now){
  const progress=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-progress,3);
  for(const {el,target,label} of starts){if(!el.isConnected)return;el.textContent=progress===1?label:String(Math.round(target*ease))}
  if(progress<1)requestAnimationFrame(step)
 }
 requestAnimationFrame(step)
} 
function showRules(){modal(`<div class="rules"><h3>Regeln dieser Fan-Umsetzung</h3><p class="note">Eigenständige, nicht offizielle Browser-Umsetzung ohne Originalgrafiken. Die Regeln sind in eigenen Worten zusammengefasst.</p><h4>Ziel</h4><p>Über mehrere Runden möglichst wenige Punkte sammeln. Sobald nach einer Runde mindestens ein Spieler ${state?state.target:100} oder mehr Gesamtpunkte hat, endet das Spiel; der niedrigste Gesamtstand gewinnt.</p><h4>Aufbau</h4><ul><li>Jeder Spieler erhält 12 Spielkarten im 4×3-Raster und deckt 2 beliebige Karten auf.</li><li>Es gibt einen Spielkarten-Nachzieh- und Ablagestapel sowie vier offen ausliegende Aktionskarten, einen Aktions-Nachziehstapel und eine Aktions-Ablage.</li><li>In Runde 1 beginnt, wer mit den zwei Startkarten die höchste Summe hat; bei Gleichstand entscheidet diese digitale Fassung zufällig. Ab Runde 2 beginnt der Spieler, der die vorherige Runde beendet hat.</li></ul><h4>Ein Zug – genau eine Hauptaktion</h4><ul><li><b>Spielkarte ziehen:</b> Ablagekarte muss sofort getauscht werden. Vom verdeckten Stapel darfst du die Karte ansehen, tauschen oder ablegen; beim Ablegen musst du eine eigene verdeckte Karte aufdecken.</li><li><b>Aktionskarte ziehen:</b> offen aus der Vierer-Auslage oder verdeckt vom Stapel. Sie darf frühestens im nächsten eigenen Zug gespielt werden.</li><li><b>Aktionskarte spielen/ablegen:</b> ihr Effekt ersetzt den normalen Zug. Unbenutzte Aktionskarten zählen am Rundenende je +10.</li></ul><h4>Sterne</h4><ul><li>Ein neu aufgedeckter bzw. passend platzierter Stern gibt einmalig sofort eine Aktionskarte. Auch ein offen vom Ablagestapel genommener Stern löst dies aus.</li><li>Sterne/Joker haben während des Spiels den Grundwert 0. Bei der Rundenabrechnung übernimmt jeder verbliebene Joker automatisch die niedrigste Zahl, die in seiner waagerechten Reihe oder senkrechten Spalte noch liegt. Beispiel: −2 und 3 in derselben Linie → der Joker zählt −2. Gibt es dort keine Zahl, bleibt er 0.</li><li>Reine Jokergruppen werden automatisch entfernt: drei Joker in einer vollständigen Spalte bzw. vier Joker in einer waagerechten Reihe geben genau einmal −10 bzw. −15 Punkte. Die abgeräumten Joker zählen danach nicht mehr einzeln, auch nicht mit einem übernommenen negativen Nachbarwert. Jede Jokerkarte darf nur zu einer abgeräumten Gruppe gehören.</li></ul><h4>Gleiche Reihen</h4><p>Komplette senkrechte oder waagerechte Reihen mit mindestens 3 noch vorhandenen Karten aus derselben Zahl werden direkt am Spielfeld markiert. Eine neu vollständige Kombination bleibt immer auf dem Brett liegen – es erscheint keine Nachfrage und sie wird während des normalen Spiels nicht automatisch entfernt. In deinem eigenen Zug kannst du sie über „Reihe entfernen“ bzw. „Spalte entfernen“ freiwillig selbst auflösen; das verbraucht nicht deine normale Hauptaktion. Auch Minuszahlen dürfen entfernt werden. Die abgeräumten Karten liegen gesperrt unter der Ablage und können nicht gezogen oder später neu eingemischt werden. Die normale oberste Ablagekarte bleibt ziehbar.</p><h4>🔢 Straßen &amp; gleiche Zahlen (optional)</h4><p>Gleiche Zahlen dürfen in vollständigen 3er-Spalten und 4er-Reihen immer wie bisher entfernt werden. Bei eingeschaltetem Zusatzmodus sind <b>gleiche Zahlen UND Straßen</b> erlaubt. Nur wenn der Host diese Hausregel vor dem Raumstart einschaltet, dürfen <b>vollständige Linien</b> mit unmittelbar auf- oder absteigenden <b>offenen Zahlenkarten und Joker-Platzhaltern</b> freiwillig abgeräumt werden: <b>senkrechte Spalte mit genau 3 Karten</b> (z. B. 5–6–7) oder <b>waagerechte Reihe mit genau 4 Karten</b> (z. B. 4–5–6–7). <b>Teilreihen mit nur 3 von 4 waagerechten Karten sind nicht erlaubt.</b> Es darf keine Lücke geben. Ein oder mehrere Joker dürfen fehlende Zahlen ersetzen, auch rückwärts (z. B. 5–★–3 = 5–4–3). Reine Jokergruppen behalten ihre eigenen −10/−15 Bonuspunkte. Abgeräumte Joker und Zahlen werden nicht erneut gewertet. Auch bei gleichen Zahlen und Jokergruppen dürfen nur vollständige Reihen oder Spalten abgeräumt werden. Ohne diese Option bleibt die zusätzliche Straßenregel abgeschaltet; gleiche Zahlen bleiben weiterhin erlaubt.</p><h4>Rundenende</h4><p>Sobald ein Spieler die letzte verdeckte Karte bei sich oder einem Mitspieler aufdeckt, erhalten <b>alle anderen Spieler in normaler Zugreihenfolge jeweils noch genau einen letzten Zug</b>. Bei 3 Spielern heißt das: Beendet Spieler A die Runde, spielen danach noch B und C jeweils einmal. Erst dann beginnt die Abrechnung. Ab dann dürfen Aktionskarten nicht mehr gespielt oder freiwillig abgelegt werden. Danach werden alle noch verdeckten Karten langsam nacheinander aufgedeckt. Anschließend werden vollständige gleiche Reihen und Spalten automatisch geprüft: Reine Jokergruppen werden immer abgeräumt und ausschließlich mit ihrem festen Gruppenbonus bewertet. Andere Kombinationen werden nur abgeräumt, wenn das Entfernen punktetechnisch gleich gut oder besser ist. Eine Joker-Kombination mit günstigeren Minuspunkten darf deshalb bewusst liegen bleiben. Erst danach beginnt die Punktewertung. Der Spieler, der die Runde beendet hat, beginnt die nächste Runde und deckt dort auch zuerst seine Startkarten auf.</p><p>Hat der Rundenbeender nicht allein den niedrigsten Rundenwert, wird sein positiver Rundenwert verdoppelt. Bei 0 oder negativen Rundenpunkten gibt es keine Verdopplung.</p><h4>Aktionskarten</h4><ul>${Object.values(ACTIONS).map(a=>`<li><b>${a.icon} ${a.name}:</b> ${a.desc}</li>`).join('')}</ul><h4>Varianten aus der Anleitung</h4><p class="note">Diese vier Varianten sind hier als Regelreferenz enthalten; die automatische Spiellogik der Datei nutzt den vollständigen Standardmodus für 2–8 Spieler.</p><ul><li><b>Ein Kartendeck:</b> 5–10 Aktionskarten werden ins Spielkartendeck gemischt; beim Ziehen/Aufdecken darf man sie behalten oder ablegen und zieht danach noch eine Spielkarte (2–6 Spieler).</li><li><b>Zahlen + Sterne:</b> ohne Aktionskarten (2–6 Spieler).</li><li><b>Nur Zahlen:</b> ohne Sterne und Aktionskarten (2–4 Spieler).</li><li><b>Große Runde:</b> bis zu 10 Spieler mit 9 Karten im 3×3-Raster; zu Beginn wird nur 1 Karte aufgedeckt.</li></ul><p class="note"><b>Meteoritenschauer:</b> Die gedruckte Regel nennt als entfernbares Ziel Zahlen-, Stern- oder Aktionskarten. Wird hier eine Aktionskarte getroffen, legt die digitale Fassung die gezogene Ersatz-Spielkarte als offene Zusatzkarte neben das Raster; sie zählt bei der Wertung und kann später wie eine Spielkarte getauscht werden.</p><p class="note"><b>Diese digitale Version:</b> Die Anzahl der Joker-/Sternkarten ist im Startmenü von 0–30 einstellbar. „Joker-Spezialeffekte AUS“ lässt Sterne weiterhin als echte Joker/Wildcards funktionieren; während des Spiels ist ihr Grundwert 0, bei der Endabrechnung gilt weiterhin die beste Zahl aus Reihe/Spalte. Auch der Jokerbonus bleibt aktiv: 3 Sterne = −10 Punkte, 4 waagerechte Sterne = −15 Punkte. Deaktiviert werden nur die Aktionskarten und die Gratis-Aktionskarte beim Aufdecken eines Sterns.</p><p class="note"><b>Blanko-Ideenkarten:</b> Die Packung enthält Karten für eigene Hausregeln. Da sie keinen festen Effekt besitzen, sind sie nicht Teil des automatisierten Regelsets.</p></div>`)}
function showLog(){modal(`<h3>Spielverlauf</h3><div class="log">${(state?.log||[]).map(x=>`<div>${escapeHTML(x)}</div>`).join('')}</div>`)}

async function returnFinishedGameToRoomLobby(){if(SKYJO_IN_HUB){returnToSharedHub();return;}
 if(!cloud.enabled||!cloud.room||!isRoomDoc(cloud.doc)){await backToLobby();return}
 if(!isHostDevice()){toast('Nur der Host kann alle Spieler gemeinsam in die Raum-Lobby zurückholen.');return}
 if(!state||state.phase!=='gameOver'){toast('Das Spiel ist noch nicht beendet.');return}

 closeModal();
 toast('🏠 Alle Spieler werden in die Raum-Lobby zurückgeholt …');
 await waitForCloudIdle(3000);

 for(let attempt=0;attempt<3;attempt++){
   let baseDoc=isRoomDoc(cloud.doc)?clone(cloud.doc):null;
   let baseRev=Number(cloud.rev)||0;

   if(attempt>0||!baseDoc){
     const fresh=await fetchCloudRoom(cloud.room,false);
     if(!fresh?.found||!isRoomDoc(fresh.state)){
       toast('Online-Raum konnte nicht geladen werden.');
       return
     }
     baseDoc=clone(fresh.state);
     baseRev=Number(fresh.rev)||0
   }

   baseDoc.game=null;
   baseDoc.lobby.status='lobby';
   delete baseDoc.lobby.startedAt;
   baseDoc.lobby.finishedAt=Date.now();

   const out=await postCloudDoc(baseDoc,baseRev);
   if(out?.ok){
     cloud.doc=baseDoc;
     cloud.rev=Number(out.rev)||baseRev;
     cloud.lastPushedJSON=JSON.stringify(baseDoc);
     cloud.lastStatus='online';
     cloud.pending=false;
     cloud.pendingJSON='';
     state=null;
     ui={mode:'none',data:{},selected:[]};
     roundSummarySeen='';
     scoreSequenceSeen='';
     try{localStorage.removeItem(SAVE_KEY)}catch(_e){}
     render();
     toast('🏠 Alle Spieler sind wieder in der Raum-Lobby');
     return
   }

   if(!out?.conflict)break;
   await sleep(140+attempt*120)
 }

 toast('⚠ Rückkehr in die Raum-Lobby fehlgeschlagen. Bitte erneut drücken.')
}

async function restart(){if(SKYJO_IN_HUB){returnToSharedHub();return;}if(cloud.enabled&&!isHostDevice()){toast('Nur der Host kann das Online-Spiel neu starten.');return}if(!confirm(cloud.enabled?'Online-Spiel beenden und mit allen Spielern in die Raum-Lobby zurückkehren?':'Aktuelles Spiel wirklich löschen und neu starten?'))return;clearTimeout(aiTimer);aiBusy=false;aiActing=false;aiScheduledKey='';try{localStorage.removeItem(SAVE_KEY)}catch(_e){}if(cloud.enabled&&cloud.room&&isRoomDoc(cloud.doc)){await waitForCloudIdle(2500);const next=clone(cloud.doc);next.game=null;next.lobby.status='lobby';delete next.lobby.startedAt;const out=await postCloudDoc(next,cloud.rev);if(out?.conflict){if(out.remote)applyCloudDoc(out.remote,out.rev);toast('Raum wurde inzwischen geändert – bitte erneut versuchen.');return}if(!out?.ok){toast(cloud.lastError||'Online-Spiel konnte nicht zurückgesetzt werden.');return}cloud.doc=next;cloud.lastPushedJSON=JSON.stringify(next);state=null;ui={mode:'none',data:{},selected:[]};render();toast('↩ Alle Spieler sind wieder in der Online-Lobby');return}state=null;ui={mode:'none',data:{},selected:[]};render()}
function setupView(){
 const selectedMode=cloud.enabled?'cloud':skyjoLocalVariant;
 const online=selectedMode==='cloud';
 const nm=escapeHTML(cloud.myName||'');
 const cfgRoom=escapeHTML(cloud.room||'');
 const st=cloud.lastError?`<div class="online-status err">⚠ ${escapeHTML(cloud.lastError)}</div>`:(cloud.serverOK===true?'<div class="online-status ok">● SKYJO-Server erreichbar</div>':'');
 const nav=`<nav class="skyjo-banner-nav" aria-label="Navigation"><a href="../index.html">← Spielauswahl</a><a href="?mode=${online?'local':'online'}">${online?'🏠 Lokal spielen':'🌐 Online spielen'}</a></nav>`;
 const title=online?'Online spielen':'Lokal spielen';
 const desc=online?'Erstelle einen Raum oder tritt einem bestehenden Spiel bei. Jeder spielt auf seinem eigenen Gerät.':'Spielt gemeinsam auf einem Gerät oder fordere bis zu drei Computergegner heraus.';
 const shared=`<section class="skyjo-section"><div class="skyjo-section-title"><span class="skyjo-step">⚙</span><div><h3>Spielregeln einstellen</h3><small>${online?'Diese Einstellungen gelten für einen neu erstellten Raum.':'Gelten für die nächste lokale Partie.'}</small></div></div>
   <div class="skyjo-settings"><div class="field"><label for="target">Zielpunktzahl</label><input id="target" type="number" min="20" max="500" value="100"></div>
     <div class="field"><label for="jokerCount">Anzahl Jokerkarten</label><input id="jokerCount" type="number" min="0" max="30" step="1" value="8"><div class="joker-off-note">Standard: 8</div></div>
     <div id="specialSetupField" class="field span-2" style="display:none"><label for="beginner">Aktionskarten-Modus</label><select id="beginner"><option value="0">Alle Aktionskarten</option><option value="1">Ohne Dieb &amp; Meteorit</option></select></div>
     <div class="field span-2"><label>Joker-Spezialeffekte</label><div id="jokerSpecialCard" class="joker-special-card disabled"><div class="joker-special-top"><div class="joker-special-icon">✨</div><div class="joker-special-copy"><b>Zusatzfähigkeiten für Joker</b><small>Der Joker bleibt Wildcard und nimmt in der Endwertung den günstigsten Wert seiner Reihe oder Spalte an.</small></div><label class="joker-switch"><input id="jokerEnabled" type="checkbox" aria-label="Joker-Spezialeffekte aktivieren" onchange="Game.toggleJokerSpecialUI()"><span class="joker-slider"></span></label></div><div class="joker-special-body"><div class="joker-state-pill" id="jokerSpecialState">AUS</div><div class="joker-special-grid"><div class="joker-special-good"><h4>Mit Spezialeffekten</h4><ul><li>⭐ Stern aktiviert Gratis-Aktionen</li><li>⚡ Aktionskarten sind aktiv</li><li>🎯 Voller Action-Modus</li></ul></div><div class="joker-special-off"><h4>Wenn AUS</h4><ul><li>🃏 Joker bleibt Wildcard</li><li>🎯 Günstigster Reihen-/Spaltenwert zählt</li><li>🏅 Jokerbonus bleibt erhalten</li><li>🚫 Keine Aktions- und Gratis-Aktionen</li></ul></div></div></div></div></div>
     <div class="field span-2"><label>Spielmodus · Straßen &amp; gleiche Zahlen</label><div id="streetModeCard" class="joker-special-card disabled street-mode-card"><div class="joker-special-top"><div class="joker-special-icon">🔢</div><div class="joker-special-copy"><b>🔢 Straßen &amp; gleiche Zahlen</b><small><b>AN:</b> Gleiche Zahlen (5–5–5 / 5–5–5–5) UND auf- oder absteigende Straßen (5–6–7 / 4–5–6–7) dürfen abgeräumt werden. <b>AUS:</b> Nur gleiche Zahlen wie im Standardspiel. Immer nur vollständig offene 3er-Spalten oder 4er-Reihen; keine Teilreihen. Joker dürfen die fehlenden Zahlen in einer Straße ersetzen (z. B. 3–★–5). Reine Jokergruppen zählen weiterhin nur ihren eigenen Bonus.</small></div><label class="joker-switch"><input id="streetModeEnabled" type="checkbox" aria-label="Straßen zusätzlich zu gleichen Zahlen erlauben" onchange="Game.toggleStreetModeUI()"><span class="joker-slider"></span></label></div><div class="joker-special-body"><div class="joker-state-pill" id="streetModeState">AUS · nur gleiche Zahlen</div><div class="street-mode-example"><span>5</span><span>6</span><span>7</span><small>Straße (nur AN)</small><span>5</span><span>5</span><span>5</span><small>Gleiche (immer)</small></div></div></div></div>
   </div></section>`;
 const cloudSection=`<section id="cloudBox" class="skyjo-section"><div class="skyjo-section-title"><span class="skyjo-step">🌐</span><div><h3>Online-Spielraum</h3><small>Raum erstellen oder mit einem Code beitreten</small></div></div>
   <div class="online-mode-grid"><div class="field"><label for="onlineName">Dein Spielername</label><input id="onlineName" maxlength="24" value="${nm}" placeholder="Dein Name"></div><div class="field"><label for="cloudRoom">Raumcode</label><input id="cloudRoom" maxlength="20" value="${cfgRoom}" placeholder="Code eingeben oder generieren"></div></div>
   <div class="online-actions"><button class="secondary" onclick="Game.generateCloudRoom()">🎲 Neuen Code</button><button class="primary" onclick="Game.createOnlineRoom()">👑 Raum erstellen</button><button class="primary" onclick="Game.joinOnlineRoom()">🔗 Beitreten</button></div>
   ${st}<p class="skyjo-note">Für ein neues Spiel: Name eingeben und „Raum erstellen“ wählen. Mitspieler öffnen „Online spielen“, geben denselben Code ein und wählen „Beitreten“. Der Host startet nach dem Beitritt das Spiel.</p>
   <div class="skyjo-secondary-tools"><span class="skyjo-note">☁ Synchronisierung über Render</span><button class="secondary" onclick="Game.resetOnlineClient()">↻ Verbindung zurücksetzen</button></div></section>`;
 const localSection=`<section class="skyjo-section"><div class="skyjo-section-title"><span class="skyjo-step">🎮</span><div><h3>Mit wem möchtest du spielen?</h3><small>Wähle Mitspieler auf einem Gerät oder Computergegner</small></div></div>
   <input id="cloudMode" type="hidden" value="${selectedMode}">
   <div class="mode-toggle"><button type="button" class="mode-btn ${selectedMode==='local'?'active':''}" data-mode="local" onclick="Game.selectSetupMode('local')"><span class="mode-emoji">👥</span><span><b>Mit Freunden</b><small>Alle auf einem Gerät</small></span></button><button type="button" class="mode-btn ${selectedMode==='ai'?'active':''}" data-mode="ai" onclick="Game.selectSetupMode('ai')"><span class="mode-emoji">🤖</span><span><b>Gegen Computer</b><small>1–3 KI-Gegner</small></span></button></div>
 </section>`;
 const localNames=`<section id="localBox" class="skyjo-section" style="display:${selectedMode==='local'?'block':'none'}"><div class="skyjo-section-title"><span class="skyjo-step">👥</span><div><h3>Lokale Mitspieler</h3><small>Alle spielen abwechselnd am selben Bildschirm</small></div></div><div class="field"><label for="playerCount">Spielerzahl</label><select id="playerCount" onchange="Game.updateNames()">${[2,3,4,5,6,7,8].map(n=>`<option ${n===2?'selected':''}>${n}</option>`).join('')}</select></div><div id="names" class="names"></div>${hasLocalSave()?'<button class="secondary wide resume-local-btn" onclick="Game.resumeLocalGame()">▶ Gespeichertes Spiel fortsetzen</button>':''}<button class="primary wide skyjo-launch" onclick="Game.startFromSetup()">▶ Lokales Spiel starten</button></section>`;
 const aiSection=`<section id="aiBox" class="skyjo-section" style="display:${selectedMode==='ai'?'block':'none'}"><div class="skyjo-section-title"><span class="skyjo-step">🤖</span><div><h3>Computergegner</h3><small>Leicht, normal oder mit strategischem Expert-Verhalten</small></div></div><div class="ai-setup-card"><div class="ai-grid"><div class="field"><label for="aiHumanName">Dein Name</label><input id="aiHumanName" maxlength="24" value="Spieler 1"></div><div class="field"><label for="aiCount">Computergegner</label><select id="aiCount"><option value="1">1 Computer</option><option value="2">2 Computer</option><option value="3">3 Computer</option></select></div><div class="field"><label for="aiDifficulty">Schwierigkeit</label><select id="aiDifficulty"><option value="easy">Leicht</option><option value="normal">Normal</option><option value="hard" selected>Experte · plant voraus (empfohlen)</option></select></div></div><p class="skyjo-note">Die Experten-KI plant zwei Züge voraus, berücksichtigt Spaltenabbau, Joker und Gegnerchancen. Verdeckte Karten bleiben geheim.</p><button class="primary wide skyjo-launch" style="margin-top:12px" onclick="Game.startAIFromSetup()">🤖 Gegen Computer starten</button></div></section>`;
 return `<div class="panel hero skyjo-entry ${online?'skyjo-online':'skyjo-local'}"><header class="skyjo-banner">${nav}<span class="skyjo-eyebrow">🎴 SKYJO ACTION · PREMIUM LOBBY</span><h2>SKYJO <span class="skyjo-gradient">${title}</span></h2><p>${desc}</p><div class="skyjo-facts"><span>✨ Joker &amp; Spezialaktionen</span><span>🎴 Flüssige Kartenbewegung</span><span>${online?'☁ Echter Mehrspieler':'🤖 Computergegner möglich'}</span></div></header>
 <div class="skyjo-content">${online?`<input id="cloudMode" type="hidden" value="cloud">${cloudSection}${shared}`:`${localSection}${shared}${localNames}${aiSection}`}</div></div>`;
}
function toggleJokerSpecialUI(){const cb=$('#jokerEnabled'),f=$('#specialSetupField'),card=$('#jokerSpecialCard'),label=$('#jokerSpecialState');const on=!!(cb&&cb.checked);if(f)f.style.display=on?'flex':'none';if(card){card.classList.toggle('enabled',on);card.classList.toggle('disabled',!on)}if(label)label.textContent=on?'AKTIV':'AUS'}
function toggleStreetModeUI(){const cb=$('#streetModeEnabled'),card=$('#streetModeCard'),label=$('#streetModeState');const on=!!cb?.checked;if(card){card.classList.toggle('enabled',on);card.classList.toggle('disabled',!on)}if(label)label.textContent=on?'AN · Straßen + gleiche Zahlen':'AUS · nur gleiche Zahlen'}
function updateNames(){const pc=$('#playerCount'),box=$('#names');if(!pc||!box)return;const n=Number(pc.value),previous=[...document.querySelectorAll('.pname')].map(x=>x.value);box.innerHTML=Array.from({length:n},(_,i)=>`<div class="field"><label>Spieler ${i+1}</label><input class="pname" value="${escapeHTML(previous[i]||`Spieler ${i+1}`)}"></div>`).join('')}
function lobbyView(){const d=cloud.doc,l=d.lobby,set=l.settings||{},me=myPlayerIndex(),host=isHostDevice();const players=l.players.map((p,i)=>`<div class="player-slot ${i===me?'me':''}"><div class="num">${i+1}</div><div class="who"><b>${escapeHTML(p.name)}${i===me?'<span class="you-tag">DU</span>':''}</b><small>${p.id===l.hostId?'Host':'Mitspieler'}</small></div><div>${p.id===l.hostId?'👑':'✓'}</div></div>`).join('');return `<div class="panel lobby-card"><div class="lobby-head"><div><h2 style="margin:0">Online-Lobby · ${escapeHTML(cloud.room)}</h2><p class="hint">${l.players.length}/8 Spieler im Raum</p></div><button onclick="Game.leaveOnlineRoom()">← Lobby verlassen</button></div><div class="player-list">${players}</div><div class="lobby-settings"><div class="setting-chip"><small>Ziel</small><b>${Number(set.target)||100} Punkte</b></div><div class="setting-chip"><small>Jokerkarten</small><b>${Number.isInteger(set.jokerCount)?set.jokerCount:8}</b></div><div class="setting-chip"><small>Joker-Spezialeffekt</small><b>${set.jokerEnabled===false?'AUS':'AN'}</b></div><div class="setting-chip street-setting-chip"><small>🔢 Straßen &amp; Gleiche</small><b>${set.streetModeEnabled===true?'AN · Straßen und gleiche Zahlen':'AUS · nur gleiche Zahlen'}</b></div></div><div class="setup-separator"></div>${SKYJO_IN_HUB?'<div class="waiting-note">Verbunden mit der gemeinsamen Spiele-Lobby. Die Partie startet automatisch …</div><button onclick="Game.toGameHub()">🏠 Zum gemeinsamen Raum</button>':host?(l.players.length>=2?'<button class="primary wide" onclick="Game.startOnlineGame()">🎮 Online-Spiel starten</button>':'<div class="waiting-note">Warte auf mindestens einen weiteren Spieler …</div>'):'<div class="waiting-note">Host startet das Spiel, sobald alle bereit sind …</div>'}</div>`}
async function startFromSetup(){try{sessionStorage.removeItem(SKIP_RESUME_KEY)}catch(_e){}if($('#cloudMode')?.value==='cloud'){toast('Online bitte „Raum erstellen“ oder „Beitreten“ verwenden');return}const names=[...document.querySelectorAll('.pname')].map((x,i)=>x.value.trim()||`Spieler ${i+1}`),target=Math.max(20,Number($('#target').value)||100),beginner=$('#beginner').value==='1',jokerCount=Math.max(0,Math.min(30,Math.floor(Number($('#jokerCount').value)||0))),jokerEnabled=!!$('#jokerEnabled').checked;cloud.enabled=false;cloud.room='';cloud.doc=null;cloud.rev=0;cloudConfigSave();startGame(names,target,beginner,jokerCount,jokerEnabled,null,!!$('#streetModeEnabled')?.checked)}
async function startAIFromSetup(){try{sessionStorage.removeItem(SKIP_RESUME_KEY)}catch(_e){}const human=String($('#aiHumanName')?.value||'Spieler 1').trim()||'Spieler 1',count=Math.max(1,Math.min(3,Number($('#aiCount')?.value)||1)),difficulty=['easy','normal','hard'].includes($('#aiDifficulty')?.value)?$('#aiDifficulty').value:'normal',target=Math.max(20,Number($('#target')?.value)||100),beginner=$('#beginner')?.value==='1',jokerCount=Math.max(0,Math.min(30,Math.floor(Number($('#jokerCount')?.value)||0))),jokerEnabled=!!$('#jokerEnabled')?.checked;const names=[human,...Array.from({length:count},(_,i)=>count===1?'Computer':`Computer ${i+1}`)],flags=names.map((_,i)=>i>0),difficulties=names.map((_,i)=>i>0?difficulty:'normal');cloud.enabled=false;cloud.room='';cloud.doc=null;cloud.rev=0;cloudConfigSave();startGame(names,target,beginner,jokerCount,jokerEnabled,{flags,difficulties},!!$('#streetModeEnabled')?.checked)}


let aiTimer=null,aiBusy=false,aiActing=false,aiScheduledKey='';
function isAIPlayer(pi){return !!(state?.players?.[Number(pi)]?.isAI)}
function isAIActor(){return !!(!cloud.enabled&&state&&isAIPlayer(actorIndex()))}
function aiDifficulty(pi){const d=state?.players?.[pi]?.aiDifficulty;return ['easy','normal','hard'].includes(d)?d:'normal'}
function aiIsExpert(pi){return aiDifficulty(pi)==='hard'}
function aiStateKey(){if(!state)return'';return [state.phase,state.turnNo,state.setupPlayer,state.setupRevealed,state.currentPlayer,ui.mode,state.pendingMatch?.pi??'',state.motionFeed?.length||0].join(':')}
function scheduleAIIfNeeded(delay=700){if(cloud.enabled||!state||aiBusy||toiletPauseActive())return;const pi=actorIndex();if(pi<0||!isAIPlayer(pi))return;const key=aiStateKey();if(aiScheduledKey===key)return;aiScheduledKey=key;clearTimeout(aiTimer);aiTimer=setTimeout(async()=>{aiScheduledKey='';await runAIActor(pi)},Math.max(180,delay))}
async function aiWaitMotion(max=7200){await sleepMs(45);const end=Date.now()+max;while((motionBusy||motionQueueBusy)&&Date.now()<end)await sleepMs(45);if(motionBusy&&!motionQueueBusy)unlockMotion(true);await sleepMs(60)}
async function aiDo(fn){aiActing=true;try{return await fn()}finally{aiActing=false}}
function aiNoise(diff){return diff==='easy'?(Math.random()*4-2):diff==='normal'?(Math.random()*1.0-.5):0}
function aiCandidateValue(c){if(!c)return 99;if(c.type==='star')return 0;return Number(c.value||0)}
function aiCardKey(c){if(!c)return'';return c.type==='star'?'star':`n:${Number(c.value)}`}
function aiBaseCounts(){const m={};m['n:-2']=3;m['n:0']=11;for(const v of [-1,1,2,3,4,5,6,7,8,9,10,11,12])m[`n:${v}`]=7;m.star=Math.max(0,Math.min(30,Number(state?.jokerCount??8)));return m}
function aiDecCount(m,c){const k=aiCardKey(c);if(k&&m[k]>0)m[k]--}
function aiHiddenKnowledgeCard(aiPi,c){if(!c||c.faceUp)return null;const k=state?.players?.[aiPi]?.aiKnowledge?.[c.id];return k&&typeof k==='object'?k:null}
function aiUnseenDistribution(aiPi,extraKnown=[]){const counts=aiBaseCounts();for(const p of (state?.players||[])){for(const c of [...(p.grid||[]),...(p.extras||[])])if(c?.faceUp)aiDecCount(counts,c)}for(const c of (state?.playDiscard||[]))aiDecCount(counts,c);for(const c of (state?.removedCards||[]))aiDecCount(counts,c);for(const p of (state?.players||[])){for(const c of [...(p.grid||[]),...(p.extras||[])]){const k=aiHiddenKnowledgeCard(aiPi,c);if(k)aiDecCount(counts,k)}}for(const c of extraKnown||[])aiDecCount(counts,c);const out=[];for(const [k,count] of Object.entries(counts)){if(count<=0)continue;if(k==='star')out.push({card:{type:'star',value:null,faceUp:true},count});else out.push({card:{type:'number',value:Number(k.slice(2)),faceUp:true},count})}return out}
function aiExpectedUnknown(aiPi,extraKnown=[]){const d=aiUnseenDistribution(aiPi,extraKnown);let n=0,s=0;for(const x of d){n+=x.count;s+=x.count*aiCandidateValue(x.card)}return n?s/n:4.5}
function aiExpectedUnknownVariance(aiPi,extraKnown=[]){const d=aiUnseenDistribution(aiPi,extraKnown),mean=aiExpectedUnknown(aiPi,extraKnown);let n=0,s=0;for(const x of d){n+=x.count;s+=x.count*Math.pow(aiCandidateValue(x.card)-mean,2)}return n?s/n:12}
function aiSlotExpectedValue(aiPi,c,extraKnown=[]){if(!c)return 0;if(c.faceUp)return cardPoints(c);const k=aiHiddenKnowledgeCard(aiPi,c);if(k)return aiCandidateValue(k);return aiExpectedUnknown(aiPi,extraKnown)}
function aiLineIndexesFor(idx){return [[Math.floor(idx/4)*4,Math.floor(idx/4)*4+1,Math.floor(idx/4)*4+2,Math.floor(idx/4)*4+3],[idx%4,idx%4+4,idx%4+8]]}
function aiLineScoreCards(cards){if(cards.length<3)return 0;const visible=cards.filter(Boolean).filter(c=>c.faceUp);const nums=visible.filter(c=>c.type==='number');const stars=visible.filter(c=>c.type==='star').length;const freq={};for(const c of nums)freq[c.value]=(freq[c.value]||0)+1;const best=Math.max(0,...Object.values(freq));let score=0;if(visible.length===cards.length){const values=Object.keys(freq);if(values.length===0&&stars===cards.length)score+=cards.length===4?15:10;else if(values.length===1&&best+stars===cards.length){const sum=cards.reduce((a,c)=>a+Math.max(0,cardPoints(c)),0);score+=6+sum*.9+cards.length*.5}}else{if(best+stars>=2)score+=(best+stars-1)*1.8;if(stars&&best)score+=.8}return score}
function aiLinePotential(pi,idx,candidate){const p=state.players[pi];if(!candidate||idx<0||idx>11)return 0;let score=0;for(const ids of aiLineIndexesFor(idx)){const cards=ids.map(i=>i===idx?{...candidate,faceUp:true}:p.grid[i]).filter(Boolean);score+=aiLineScoreCards(cards)}return score}
function aiSameCardValue(a,b){if(!a||!b)return false;if(a.type!==b.type)return false;return a.type==='star'||Number(a.value)===Number(b.value)}
function aiLineDelta(pi,idx,old,candidate){const after=aiLinePotential(pi,idx,candidate);if(!old?.faceUp)return after;const before=aiLinePotential(pi,idx,old);return after-before}
function aiExpectedBoardScore(pi,observerPi=pi){const p=state.players[pi];let s=0;for(const c of [...p.grid,...p.extras])if(c)s+=aiSlotExpectedValue(observerPi,c);if(jokerSpecialsEnabled())s+=(p.actions?.length||0)*10;return s}
function aiEndgameProfile(pi){const own=state.players[pi],ownHidden=totalHidden(own),ownScore=aiExpectedBoardScore(pi,pi);let bestOpp=Infinity,minOppHidden=99;for(let i=0;i<state.players.length;i++){if(i===pi)continue;bestOpp=Math.min(bestOpp,aiExpectedBoardScore(i,pi));minOppHidden=Math.min(minOppHidden,totalHidden(state.players[i]))}const ahead=ownScore<=bestOpp-2;const behind=ownScore>=bestOpp+5;return {ownHidden,ownScore,bestOpp,minOppHidden,ahead,behind,pressure:minOppHidden<=2}}

/* === V103: faire zweizügige KI-Vorausschau ===
   Verdeckte Karten werden nur als Wahrscheinlichkeitsverteilung modelliert.
   Nur Karten aus der regulären Erleuchtungs-Kenntnis dürfen gesondert einfließen.
   Die Zukunftsrechnung verändert weder Spielstand noch Kartendeck. */
const AI103_LINES=[...Array.from({length:3},(_,r)=>[r*4,r*4+1,r*4+2,r*4+3]),...Array.from({length:4},(_,c)=>[c,c+4,c+8])];
function ai103Context(pi){
 const d=aiUnseenDistribution(pi),n=d.reduce((a,x)=>a+x.count,0)||1;
 const mean=d.reduce((a,x)=>a+x.count*aiCandidateValue(x.card),0)/n;
 const probabilities={};for(const x of d)probabilities[aiCardKey(x.card)]=x.count/n;
 const end=aiEndgameProfile(pi);
 const p=state.players[pi],known=p.aiKnowledge||{};
 function wrap(c){if(!c)return null;if(c.faceUp)return {type:c.type,value:c.value,faceUp:true};
   const k=known[c.id];return {type:'hidden',faceUp:false,known:k&&typeof k==='object'?{type:k.type,value:k.value}:null};}
 return {pi,distribution:d,probabilities,mean,end,
   grid:p.grid.map(wrap),extras:p.extras.map(wrap),
   futureWeight:aiDifficulty(pi)==='hard'?.58:.34};
}
function ai103Number(c,ctx){
 if(!c)return 0;if(c.faceUp)return c.type==='star'?0:Number(c.value||0);
 if(c.known)return aiCandidateValue(c.known);
 return ctx.mean;
}
function ai103StarValue(grid,idx,ctx){
 const nums=[];
 for(const ids of aiLineIndexesFor(idx))for(const k of ids){if(k===idx)continue;const c=grid[k];if(!c)continue;
   if(c.faceUp&&c.type==='number')nums.push(Number(c.value)||0);
   else if(!c.faceUp&&c.known?.type==='number')nums.push(Number(c.known.value)||0);
 }
 /* Unbekannte Nachbarn können den Endwert noch senken; keine tatsächlichen
    verdeckten Kartenwerte lesen. */
 const unknownNeighbors=aiLineIndexesFor(idx).flat().some(k=>k!==idx&&grid[k]&&!grid[k].faceUp&&!grid[k].known);
 if(unknownNeighbors)nums.push(Math.min(2,ctx.mean));
 return nums.length?Math.min(...nums):0;
}
function ai103LineBonus(grid,ctx){
 let total=0;
 for(const ids of AI103_LINES){const cards=ids.map(i=>grid[i]).filter(Boolean);if(cards.length<3)continue;
   const visibles=cards.filter(c=>c.faceUp),hidden=cards.length-visibles.length;
   const nums=visibles.filter(c=>c.type==='number');
   const stars=visibles.filter(c=>c.type==='star').length;
   const distinct=[...new Set(nums.map(c=>Number(c.value)))];
   if(!distinct.length){if(stars===cards.length)total+=cards.length===4?14:10;else if(stars>=2)total+=stars*1.1;continue;}
   let best=0;
   for(const value of distinct){
     const matches=nums.filter(c=>Number(c.value)===value).length;
     const miss=hidden+(nums.length-matches);
     if(miss>2||matches+stars<2)continue;
     const p=Math.min(.96,(ctx.probabilities['n:'+value]||0)+(ctx.probabilities.star||0));
     const chance=miss===0?1:miss===1?1-Math.pow(1-p,3):Math.min(.55,3*p*p);
     /* Entfernen spart insbesondere hohe positive Zahlen. Niedrige und negative
        Paare behalten gegebenenfalls einen strategischen Joker-/Punktewert. */
     const save=Math.max(0,value)*(matches+miss)+stars*.7;
     const reward=(save*.7+(matches+stars)*1.1)*chance*(miss===0?1:miss===1?.95:.55);
     if(reward>best)best=reward;
   }
   total+=best;
 }
 return Math.min(43,total);
}
function ai103BoardFitness(grid,extras,ctx){
 let points=0,hidden=0,stars=0;
 for(let i=0;i<grid.length;i++){const c=grid[i];if(!c)continue;
   if(!c.faceUp)hidden++;
   if(c.faceUp&&c.type==='star'){stars++;points+=ai103StarValue(grid,i,ctx)}
   else points+=ai103Number(c,ctx);
 }
 for(const c of extras){if(!c)continue;if(!c.faceUp)hidden++;points+=ai103Number(c,ctx)}
 /* Bonus für vollständig reine Jokerlinien ist Teil der Endwertung. */
 let pure=0;
 for(const ids of AI103_LINES){
   const line=ids.map(i=>grid[i]).filter(Boolean);
   if(line.length>=3&&line.every(c=>c.faceUp&&c.type==='star'))pure=Math.max(pure,line.length===4?15:10);
 }
 const e=ctx.end,closingRisk=e.ownHidden<=3&&!e.ahead&&e.bestOpp<e.ownScore-2;
 const pressure=e.pressure&&e.ahead?1.20:e.pressure?.65:.28;
 const hurry=closingRisk?-.60:pressure;
 return -points+ai103LineBonus(grid,ctx)*.79+pure*.78-hidden*hurry;
}
function ai103NextDrawGain(grid,extras,ctx){
 const base=ai103BoardFitness(grid,extras,ctx),dist=ctx.distribution;
 let expectation=0,weight=0;
 for(const item of dist){
   const next={type:item.card.type,value:item.card.value,faceUp:true};
   let best=0;
   for(let i=0;i<grid.length;i++){
     if(!grid[i])continue;
     const modified=grid.slice();modified[i]=next;
     const delta=ai103BoardFitness(modified,extras,ctx)-base;
     if(delta>best)best=delta;
   }
   for(let i=0;i<extras.length;i++){
     if(!extras[i])continue;
     const modified=extras.slice();modified[i]=next;
     const delta=ai103BoardFitness(grid,modified,ctx)-base;
     if(delta>best)best=delta;
   }
   /* Statt willkürlich gezogener Zukunftskarten die exakte öffentliche
      Kartentypverteilung verwenden. */
   expectation+=item.count*best;weight+=item.count;
 }
 return weight?expectation/weight:0;
}
function ai103TargetPlan(ctx,zone,idx,candidate){
 const card={type:candidate.type,value:candidate.value,faceUp:true};
 const grid=zone==='grid'?ctx.grid.slice():ctx.grid;
 const extras=zone==='extra'?ctx.extras.slice():ctx.extras;
 if(zone==='grid')grid[idx]=card;else extras[idx]=card;
 return {grid,extras};
}
function ai103EndPenalty(ctx,candidate,target){
 const end=ctx.end;
 if(end.ownHidden!==1||!target?.hidden)return 0;
 const old=target.zone==='grid'?ctx.grid[target.idx]:ctx.extras[target.idx];
 const outgoing=ai103Number(old,ctx);
 const projected=end.ownScore-outgoing+aiCandidateValue(candidate);
 const gap=projected-end.bestOpp;
 /* Der Rundenauslöser erhält bei nicht alleiniger Bestwertung doppelte
    positive Rundenpunkte. Bei Rückstand nicht blind die letzte Karte aufdecken. */
 if(gap>=-.1&&projected>0)return Math.min(30,10+Math.max(0,gap)*1.5);
 return gap<-3?-2:1.5;
}
function ai103RankTargets(pi,candidate,targets){
 if(!targets.length||aiDifficulty(pi)==='easy')return targets;
 const ctx=ai103Context(pi);
 const current=ai103BoardFitness(ctx.grid,ctx.extras,ctx);
 const ranked=[];
 /* Jeder mögliche Tauschplatz wird betrachtet: selbst ein heute schwacher
    Tausch kann eine wertvolle Spalte für den nächsten Zug vorbereiten. */
 for(const t of targets){
   const after=ai103TargetPlan(ctx,t.zone,t.idx,candidate);
   const immediate=ai103BoardFitness(after.grid,after.extras,ctx)-current;
   const future=ai103NextDrawGain(after.grid,after.extras,ctx);
   const defence=aiDifficulty(pi)==='hard'&&t.old?.faceUp?aiOpponentDiscardThreat(pi,t.old).score*.16:0;
   const urgency=ctx.end.ahead&&ctx.end.pressure&&t.hidden?1.1:ctx.end.behind&&ctx.end.ownHidden<=2&&t.hidden?-.75:0;
   const score=immediate+ctx.futureWeight*future+t.score*.16-defence+urgency-ai103EndPenalty(ctx,candidate,t);
   ranked.push({...t,score,planImmediate:immediate,planFuture:future});
 }
 return ranked.sort((a,b)=>b.score-a.score);
}
function ai103DeckValue(pi){
 const ctx=ai103Context(pi);
 const expect=ai103NextDrawGain(ctx.grid,ctx.extras,ctx);
 /* Zieht man schlecht, ist Ablegen + Aufdecken eine echte Alternative. */
 const reveal=aiDiscardRevealUtility(pi);
 return Math.max(reveal,expect*.92)+ctx.futureWeight*expect*.22;
}

function aiTargets(pi,candidate){const p=state.players[pi],diff=aiDifficulty(pi),candVal=aiCandidateValue(candidate),out=[],end=aiEndgameProfile(pi);for(let i=0;i<p.grid.length;i++){const old=p.grid[i];if(!old)continue;const hidden=!old.faceUp,oldVal=aiSlotExpectedValue(pi,old,[candidate]),lineDelta=aiLineDelta(pi,i,old,candidate);let score=(oldVal-candVal)+lineDelta+aiNoise(diff);if(hidden){const known=!!aiHiddenKnowledgeCard(pi,old);score+=candVal<=0?1.4:candVal<=3?.8:candVal<=5?.25:0;if(known)score+=.35;if(diff==='hard'){if(end.ahead&&(end.ownHidden<=3||end.pressure))score+=1.0;if(end.behind&&end.ownHidden<=2)score-=1.1}}else{const same=aiSameCardValue(old,candidate),numericGain=cardPoints(old)-candVal;if(same)score-=9;if(cardPoints(old)<0)score-=6;else if(cardPoints(old)===0&&candVal>=0&&lineDelta<3.5)score-=4.8;else if(numericGain<=0&&lineDelta<1.3)score-=3.2;if(lineDelta>=5)score+=2.3}if(candidate?.type==='star')score+=hidden?2.7:1.6;out.push({zone:'grid',idx:i,score,old,lineDelta,hidden})}for(let i=0;i<p.extras.length;i++){const old=p.extras[i];if(!old)continue;const hidden=!old.faceUp,oldVal=aiSlotExpectedValue(pi,old,[candidate]);let score=oldVal-candVal+aiNoise(diff);if(hidden)score+=candVal<=1?1.0:.25;else{if(aiSameCardValue(old,candidate))score-=9;if(cardPoints(old)<0)score-=6;if(cardPoints(old)-candVal<=0)score-=3}out.push({zone:'extra',idx:i,score,old,lineDelta:0,hidden})}return aiDifficulty(pi)==="easy"?out.sort((a,b)=>b.score-a.score):ai103RankTargets(pi,candidate,out)}
function aiBestTarget(pi,candidate){const a=aiTargets(pi,candidate);if(!a.length)return null;const diff=aiDifficulty(pi);if(diff==='easy'&&a.length>1&&Math.random()<.32)return a[Math.min(a.length-1,Math.floor(Math.random()*Math.min(3,a.length)))];return a[0]}
function aiRevealPositionScore(pi,zone,idx){const p=state.players[pi],arr=zone==='grid'?p.grid:p.extras,c=arr[idx];if(!c||c.faceUp)return-999;let score=.4;if(zone==='extra')return score;const known=aiHiddenKnowledgeCard(pi,c);if(known){const v=aiCandidateValue(known);score+=v>=8?2.4:v>=5?1.4:v<=0?-.8:.3}for(const ids of aiLineIndexesFor(idx)){const others=ids.filter(i=>i!==idx).map(i=>p.grid[i]).filter(Boolean);const vis=others.filter(x=>x.faceUp),stars=vis.filter(x=>x.type==='star').length,freq={};for(const x of vis)if(x.type==='number')freq[x.value]=(freq[x.value]||0)+1;const best=Math.max(0,...Object.values(freq));if(best+stars>=2)score+=2.2;else if(best+stars===1)score+=.5}const end=aiEndgameProfile(pi);if(end.ahead&&end.pressure)score+=.6;if(end.behind&&end.ownHidden<=2)score-=.7;return score}
function aiChooseReveal(pi){const p=state.players[pi],hidden=[];p.grid.forEach((c,i)=>{if(c&&!c.faceUp)hidden.push({zone:'grid',idx:i,score:aiRevealPositionScore(pi,'grid',i)})});p.extras.forEach((c,i)=>{if(c&&!c.faceUp)hidden.push({zone:'extra',idx:i,score:aiRevealPositionScore(pi,'extra',i)})});if(!hidden.length)return null;hidden.sort((a,b)=>b.score-a.score);const diff=aiDifficulty(pi);if(diff==='easy'&&hidden.length>1)return hidden[Math.floor(Math.random()*hidden.length)];if(diff==='normal'&&hidden.length>1&&Math.random()<.2)return hidden[Math.floor(Math.random()*Math.min(3,hidden.length))];return hidden[0]}
function aiDiscardRevealUtility(pi){const r=aiChooseReveal(pi),end=aiEndgameProfile(pi);let u=r?.score||0;if(end.ahead&&end.pressure)u+=.8;if(end.behind&&end.ownHidden<=2)u-=.7;return u}
function aiExpectedDeckUtility(pi){if(aiDifficulty(pi)!=="easy")return ai103DeckValue(pi);const d=aiUnseenDistribution(pi),total=d.reduce((s,x)=>s+x.count,0);if(!total)return 0;let sum=0;for(const x of d){const target=aiBestTarget(pi,x.card),keep=target?target.score:-99,drop=aiDiscardRevealUtility(pi);sum+=x.count*Math.max(keep,drop)}return sum/total}
function aiKeepThreshold(pi,fromDiscard=false){const diff=aiDifficulty(pi);if(diff==='easy')return fromDiscard?1.9:1.15;if(diff==='normal')return fromDiscard?.9:.45;const e=aiEndgameProfile(pi);let t=fromDiscard?.15:-.1;if(e.ahead&&(e.pressure||e.ownHidden<=2))t-=.55;if(e.behind&&e.ownHidden<=2)t+=.65;return t}

/* === V15.1 DEFENSIVE AI: Gegnerische Ablage-Chancen mitrechnen === */
function aiNextPlayerAfter(pi){
 if(!state||!state.players?.length)return -1;
 if(state.extraTurns>0)return pi;
 if(state.roundEnder!==null&&Array.isArray(state.finalTurnQueue)&&state.finalTurnQueue.length)return state.finalTurnQueue[0];
 return (pi+1)%state.players.length
}
function aiPublicLineCompletionThreat(observerPi,oppPi,idx,candidate){
 const p=state.players[oppPi];
 if(!p||idx<0||idx>11||!candidate)return {score:0,complete:false,label:''};
 let best={score:0,complete:false,label:''};
 const lines=aiLineIndexesFor(idx);
 for(const ids of lines){
   const cards=ids.map(i=>i===idx?{...candidate,faceUp:true}:p.grid[i]).filter(Boolean);
   if(cards.length<3||cards.some(c=>!c.faceUp))continue;
   const nums=cards.filter(c=>c.type==='number');
   const stars=cards.filter(c=>c.type==='star').length;
   const values=[...new Set(nums.map(c=>Number(c.value)))];
   let complete=false,pureStars=false;
   if(values.length===1&&nums.length+stars===cards.length)complete=true;
   else if(values.length===0&&stars===cards.length){complete=true;pureStars=true}
   if(!complete)continue;
   const positiveRemoved=cards.reduce((s,c)=>s+Math.max(0,cardPoints(c)),0);
   const negativeKept=Math.abs(cards.reduce((s,c)=>s+Math.min(0,cardPoints(c)),0));
   /* Positive Zahlenreihen sind besonders gefährlich: Gegner kann viele Punkte sofort loswerden.
      Reine Jokergruppen sind ebenfalls wertvoll, werden aber etwas niedriger gewichtet,
      da sie je nach Spielsituation lieber für den Jokerbonus liegen bleiben können. */
   let score=pureStars?(cards.length===4?11:8.5):(8+positiveRemoved*.72+cards.length*.55);
   if(negativeKept>0&&!pureStars)score-=negativeKept*.55;
   const kind=ids.length===4?'Reihe':'Spalte';
   const value=pureStars?'Joker':(values[0]??'');
   if(score>best.score)best={score,complete:true,label:`${kind} ${value}`};
 }
 return best
}
function aiOpponentCardOpportunity(observerPi,oppPi,candidate){
 const p=state.players[oppPi];
 if(!p||oppPi===observerPi||!candidate)return {score:0,direct:0,target:null,label:''};
 const candVal=aiCandidateValue(candidate);
 let best={score:0,direct:0,target:null,label:''};
 for(let idx=0;idx<p.grid.length;idx++){
   const old=p.grid[idx];
   if(!old)continue;
   const completion=aiPublicLineCompletionThreat(observerPi,oppPi,idx,candidate);
   let numericGain=0;
   if(old.faceUp)numericGain=Math.max(0,cardPoints(old)-candVal);
   else{
     /* Keine verdeckte Gegnerkarte ausspähen: nur statistischen Erwartungswert benutzen. */
     const expected=aiExpectedUnknown(observerPi,[candidate]);
     numericGain=Math.max(0,expected-candVal)*.55
   }
   /* Bereits sichtbares Reihenpotenzial ist öffentlich und darf strategisch berücksichtigt werden. */
   let publicPotential=0;
   for(const ids of aiLineIndexesFor(idx)){
     const others=ids.filter(i=>i!==idx).map(i=>p.grid[i]).filter(Boolean).filter(c=>c.faceUp);
     const stars=others.filter(c=>c.type==='star').length;
     const freq={};
     for(const c of others)if(c.type==='number')freq[c.value]=(freq[c.value]||0)+1;
     const matching=Math.max(0,...Object.values(freq))+stars;
     if(matching>=2)publicPotential+=candidate.type==='star'?2.6:1.0;
     else if(matching===1)publicPotential+=.25
   }
   const score=completion.score+numericGain*.72+publicPotential;
   if(score>best.score)best={
     score,
     direct:completion.complete?completion.score:0,
     target:{zone:'grid',idx},
     label:completion.label||''
   }
 }
 /* Zusatzkarten können zwar günstig getauscht werden, erzeugen aber keine Rasterreihe. */
 for(let idx=0;idx<(p.extras||[]).length;idx++){
   const old=p.extras[idx];
   if(!old)continue;
   const numericGain=old.faceUp?Math.max(0,cardPoints(old)-candVal):Math.max(0,aiExpectedUnknown(observerPi,[candidate])-candVal)*.45;
   const score=numericGain*.6;
   if(score>best.score)best={score,direct:0,target:{zone:'extra',idx},label:''}
 }
 return best
}
function aiOpponentDiscardThreat(aiPi,candidate){
 if(!state||!candidate)return {score:0,direct:0,opponent:-1,label:''};
 const next=aiNextPlayerAfter(aiPi);
 let best={score:0,direct:0,opponent:-1,label:''};
 for(let oi=0;oi<state.players.length;oi++){
   if(oi===aiPi)continue;
   const chance=aiOpponentCardOpportunity(aiPi,oi,candidate);
   /* Der direkt folgende Spieler hat das Erstzugriffsrecht auf die Ablage.
      Weitere Gegner werden nur schwach berücksichtigt, falls die Karte liegen bleibt. */
   const weight=oi===next?1:(state.players.length===2?0:.24);
   const score=chance.score*weight,direct=chance.direct*weight;
   if(score>best.score)best={score,direct,opponent:oi,label:chance.label,target:chance.target}
 }
 return best
}
function aiExpectedOutgoingDiscardThreat(pi,target){
 if(!target?.old)return 0;
 const old=target.old;
 if(old.faceUp)return aiOpponentDiscardThreat(pi,old).score;
 const known=aiHiddenKnowledgeCard(pi,old);
 if(known)return aiOpponentDiscardThreat(pi,{...known,faceUp:true}).score;
 /* Bei einer unbekannten eigenen verdeckten Karte kennt auch die KI deren Wert nicht.
    Deshalb wird der erwartete Gefahrenwert über die Restverteilung berechnet. */
 const d=aiUnseenDistribution(pi);
 let n=0,s=0;
 for(const x of d){n+=x.count;s+=x.count*aiOpponentDiscardThreat(pi,x.card).score}
 return n?s/n:0
}
function aiDrawnCardDecision(pi,candidate,target){
 const diff=aiDifficulty(pi),threshold=aiKeepThreshold(pi,false);
 const baseKeep=target?target.score:-99;
 const threat=aiOpponentDiscardThreat(pi,candidate);
 if(diff==='easy'){
   return {keep:!!target&&baseKeep>=threshold,threat,keepUtility:baseKeep,dropUtility:aiDiscardRevealUtility(pi),reason:''}
 }
 const outgoing=target?aiExpectedOutgoingDiscardThreat(pi,target):99;
 const reveal=aiDiscardRevealUtility(pi);
 if(diff==='normal'){
   /* Normal erkennt vor allem offensichtliche sofortige Dreier-/Viererreihen. */
   const defensive=threat.direct>=8&&target&&baseKeep>=-2.4;
   return {
     keep:!!target&&(baseKeep>=threshold||defensive),
     threat,keepUtility:baseKeep-outgoing*.28,dropUtility:reveal-threat.score*.42,
     reason:defensive?'verhindert eine direkte Gegnerreihe':''
   }
 }
 /* Expert: echte Folgenabwägung.
    Behalten = eigener Nutzen minus Gefahr der herausgetauschten Karte.
    Abwerfen = Nutzen des Aufdeckens minus Nutzen, den die Ablage dem Gegner schenkt. */
 const keepUtility=baseKeep-outgoing*.58;
 const plan=ai103Context(pi);
 let dropUtility=reveal+ai103NextDrawGain(plan.grid,plan.extras,plan)*.37-threat.score*.76;
 if(plan.end.ownHidden===1&&!plan.end.ahead&&plan.end.ownScore>0){
   dropUtility-=Math.min(28,9+Math.max(0,plan.end.ownScore-plan.end.bestOpp)*1.2);
 }
 const strategicallyNecessary=threat.direct>=7.5&&baseKeep>=-4.0;
 const keep=!!target&&(
   (baseKeep>=threshold&&keepUtility>=dropUtility-.35) ||
   strategicallyNecessary ||
   keepUtility>=dropUtility+.20
 );
 return {
   keep,threat,outgoing,keepUtility,dropUtility,
   reason:strategicallyNecessary?(threat.label?`blockiert ${threat.label}`:'blockiert eine fertige Gegnerkombination'):(keepUtility>dropUtility?'vermeidet eine starke Ablagevorlage':'')
 }
}
function aiShouldTakeDiscard(pi,top,target){
 if(!top||!target)return false;
 const diff=aiDifficulty(pi),threshold=aiKeepThreshold(pi,true);
 const threat=aiOpponentDiscardThreat(pi,top);
 if(diff==='easy')return target.score>=threshold;
 const outgoing=aiExpectedOutgoingDiscardThreat(pi,target);
 if(diff==='normal'){
   /* Eine offen daliegende Karte, die dem nächsten Gegner sofort eine starke Reihe gäbe,
      wird auch von Normal häufiger defensiv genommen. */
   if(threat.direct>=9&&target.score>=-1.8)return true;
   return target.score>=threshold
 }
 const deckU=aiExpectedDeckUtility(pi);
 const denial=Math.max(-4,Math.min(12,threat.score-outgoing));
 const effective=target.score+denial*.62;
 return effective>=Math.max(threshold,deckU-.10)
}
function aiShouldResolveOptionalMatch(pi,m){const p=state.players[pi];if(m.pureStars)return false;const sum=m.idx.reduce((s,i)=>s+(p.grid[i]?cardPoints(p.grid[i]):0),0),end=aiEndgameProfile(pi);if(sum>0)return true;if(sum<0)return false;return end.ahead&&end.pressure&&end.ownHidden>0}
function aiActionBaseValue(type){return ({double:9.5,draw3:7.8,defense:6.4,meteor:6.2,thief:6.0,swapother:5.1,enlight:3.8,ownswap:3.2,react:4.2})[type]||1}
function aiBestOwnSwap(pi){const p=state.players[pi],ids=p.grid.map((c,i)=>c?.faceUp?i:-1).filter(i=>i>=0);let best=null;const before=ids.reduce((s,i)=>s+aiLinePotential(pi,i,p.grid[i]),0);for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){const ia=ids[a],ib=ids[b],ca=p.grid[ia],cb=p.grid[ib];if(aiSameCardValue(ca,cb))continue;p.grid[ia]=cb;p.grid[ib]=ca;const after=ids.reduce((s,i)=>s+aiLinePotential(pi,i,p.grid[i]),0);p.grid[ia]=ca;p.grid[ib]=cb;const gain=after-before;if(!best||gain>best.gain)best={ia,ib,gain}}return best}
function aiBestOtherSwap(pi){const me=state.players[pi];let own=null;me.grid.forEach((c,i)=>{if(c?.faceUp){const v=cardPoints(c);if(!own||v>own.v)own={pi,idx:i,v,c}}});if(!own)return null;let opp=null;for(let oi=0;oi<state.players.length;oi++){if(oi===pi)continue;state.players[oi].grid.forEach((c,i)=>{if(c?.faceUp){const v=cardPoints(c);const gain=own.v-v;if(!opp||gain>opp.gain)opp={pi:oi,idx:i,v,c,gain}}})}return opp&&opp.gain>1?{own,opp,gain:opp.gain}:null}
function aiBestThiefTarget(pi){const pri={double:10,draw3:9,meteor:8,defense:7,thief:6,swapother:5,ownswap:4,enlight:3,react:2};let best=null;for(let oi=0;oi<state.players.length;oi++){if(oi===pi)continue;state.players[oi].actions.forEach((a,ai)=>{const score=pri[a.type]||1;if(!best||score>best.score)best={pi:oi,ai,a,score}})}return best}
function aiMeteorChoice(pi,targetPi){const p=state.players[targetPi],expected=aiExpectedUnknown(pi),opts=[];p.grid.forEach((c,i)=>{if(!c)return;if(c.faceUp){const v=cardPoints(c),hurt=expected-v+(c.type==='star'?2:0);opts.push({zone:'grid',idx:i,score:hurt})}else opts.push({zone:'grid',idx:i,score:-.4})});p.extras.forEach((c,i)=>{if(c?.faceUp)opts.push({zone:'extra',idx:i,score:expected-cardPoints(c)})});opts.sort((a,b)=>b.score-a.score);return opts[0]||null}
function aiBestEnlightLine(pi){const p=state.players[pi],codes=['r0','r1','r2','c0','c1','c2','c3'];let best=null;for(const code of codes){const ids=lineIndexes(code),hidden=ids.filter(i=>p.grid[i]&&!p.grid[i].faceUp),vis=ids.map(i=>p.grid[i]).filter(Boolean).filter(c=>c.faceUp);if(!hidden.length)continue;let score=hidden.length*1.2;const stars=vis.filter(c=>c.type==='star').length,freq={};for(const c of vis)if(c.type==='number')freq[c.value]=(freq[c.value]||0)+1;score+=Math.max(0,...Object.values(freq))*1.1+stars*.8;if(!best||score>best.score)best={code,ids,score}}return best}
function aiActionValue(pi,a){const type=a.type,p=state.players[pi],end=aiEndgameProfile(pi),normal=aiExpectedDeckUtility(pi);let v=aiActionBaseValue(type);if(type==='ownswap')v=(aiBestOwnSwap(pi)?.gain||0)+1;if(type==='swapother')v=(aiBestOtherSwap(pi)?.gain||0)+1;if(type==='thief')v=(aiBestThiefTarget(pi)?.score||0)+2;if(type==='enlight')v=(aiBestEnlightLine(pi)?.score||0)+1;if(type==='meteor'){let sum=0;for(let oi=0;oi<state.players.length;oi++)if(oi!==pi)sum+=Math.max(0,aiMeteorChoice(pi,oi)?.score||0);v=2+sum}if(type==='react'){let best=0;for(const x of state.actionDiscard||[])if(x.type!=='react')best=Math.max(best,aiActionBaseValue(x.type));v=best?best-.5:0}if(type==='defense'&&state.players.some((q,i)=>i!==pi&&q.actions?.some(x=>ACTIONS[x.type]?.kind==='attack')))v+=1.5;if(end.pressure)v+=type==='double'||type==='draw3'?1.2:0;if(p.actions.length>=2)v+=1.0;return {value:v,normal}}
function aiActionDecision(pi){if(!jokerSpecialsEnabled()||state.roundEnder!==null)return null;const p=state.players[pi],avail=p.actions.map((a,i)=>({a,i})).filter(x=>actionAvailable(x.a,p));if(!avail.length)return null;const diff=aiDifficulty(pi);if(diff!=='hard'){for(const type of ['double','defense']){const x=avail.find(x=>x.a.type===type);if(x&&(diff!=='easy'||Math.random()<.55))return {kind:'play',...x}}if(p.actions.length>=2||totalHidden(p)<=3)return {kind:'discard',...avail[0]};return null}const ranked=avail.map(x=>({...x,...aiActionValue(pi,x.a)})).sort((a,b)=>b.value-a.value);const best=ranked[0],end=aiEndgameProfile(pi);if(best&&best.value>=best.normal+.45)return {kind:'play',...best};if((p.actions.length>=2||end.pressure||end.ownHidden<=2)&&ranked.length){const worst=[...ranked].sort((a,b)=>a.value-b.value)[0];return {kind:'discard',...worst}}return null}
function aiPickMarketIndex(owner=state.currentPlayer){let best=-1,score=-Infinity;state.market.forEach((a,i)=>{if(!a)return;const s=aiDifficulty(owner)==='hard'?aiActionValue(owner,a).value:aiActionBaseValue(a.type);if(s>score){score=s;best=i}});return best}
async function aiResolveStarChoice(){const owner=ui.data?.owners?.[ui.data.ownerIndex];if(!isAIPlayer(owner))return false;await sleepMs(320);const i=aiPickMarketIndex(owner);if(i>=0&&state.market[i])await aiDo(()=>takeActionMarket(i,true));else await aiDo(()=>takeActionBlind(true));await aiWaitMotion();return true}
async function aiInitialReveal(pi){const p=state.players[pi];while(state?.phase==='initialReveal'&&state.setupPlayer===pi&&state.setupRevealed<2){const hidden=p.grid.map((c,i)=>c&&!c.faceUp?i:-1).filter(i=>i>=0);if(!hidden.length)break;let idx;if(state.setupRevealed===0)idx=hidden[Math.floor(Math.random()*hidden.length)];else{const first=p.grid.findIndex(c=>c?.faceUp);const candidates=hidden.filter(i=>Math.floor(i/4)!==Math.floor(first/4)&&(i%4)!==(first%4));idx=(candidates.length?candidates:hidden)[Math.floor(Math.random()*(candidates.length?candidates:hidden).length)]}await sleepMs(360);await aiDo(()=>selectCard(pi,'grid',idx));await aiWaitMotion();if(ui.mode==='starChoice'){await aiResolveStarChoice();await aiWaitMotion()}}}
function aiRememberLine(pi,code){const p=state.players[pi],ids=lineIndexes(code);p.aiKnowledge=p.aiKnowledge||{};for(const idx of ids){const c=p.grid[idx];if(c&&!c.faceUp)p.aiKnowledge[c.id]={type:c.type,value:c.value}}}
function aiDirectOwnSwap(pi,plan){const p=state.players[pi],a=p.grid[plan.ia],b=p.grid[plan.ib];p.grid[plan.ia]=b;p.grid[plan.ib]=a;setWatch('action-play',{actor:pi,title:'ordnet eigene Karten strategisch neu',typeLabel:'EXPERT-KI',text:'Reihenpotenzial verbessert'});log(`${p.name} tauscht zwei eigene offene Karten.`);afterMutation('finishTurn')}
function aiDirectOtherSwap(pi,plan){if(!plan){finishTurn();return}if(consumeDefense(plan.opp.pi)){finishTurn();return}const a=state.players[pi].grid[plan.own.idx],b=state.players[plan.opp.pi].grid[plan.opp.idx];state.players[pi].grid[plan.own.idx]=b;state.players[plan.opp.pi].grid[plan.opp.idx]=a;setWatch('action-play',{actor:pi,title:'tauscht gezielt mit einem Mitspieler',typeLabel:'EXPERT-KI',text:`${state.players[plan.opp.pi].name}: ${plan.opp.v} ↔ ${plan.own.v}`});log(`${state.players[pi].name} tauscht eine offene Karte mit ${state.players[plan.opp.pi].name}.`);afterMutation('finishTurn')}
async function aiExecuteActionCard(pi,a,reactivated=false){const type=a.type,p=state.players[pi];if(type==='react'){state.heldReacts=state.heldReacts||[];state.heldReacts.push(a);let best=null;for(let i=0;i<state.actionDiscard.length;i++){const x=state.actionDiscard[i];if(x.type==='react')continue;const v=aiActionValue(pi,x).value;if(!best||v>best.v)best={i,a:x,v}}if(!best){finishTurn();return true}const [picked]=state.actionDiscard.splice(best.i,1);setWatch('action-play',{actor:pi,actionType:picked.type,srcId:`player-${pi}`,dstId:`player-${pi}`,title:`reaktiviert ${ACTIONS[picked.type].name}`,typeLabel:'EXPERT-KI',text:'beste verfügbare Aktion aus der Ablage'});return aiExecuteActionCard(pi,picked,true)}state.actionDiscard.push(a);setWatch('action-play',{actor:pi,actionType:a.type,srcId:`player-${pi}`,dstId:`player-${pi}`,title:`spielt ${ACTIONS[a.type].name}`,typeLabel:'COMPUTER-AKTION',text:reactivated?'durch Reaktivierung':ACTIONS[a.type].desc});log(`${p.name} spielt „${ACTIONS[a.type].name}“.`);if(type==='double'){state.extraTurns+=2;finishTurn();return true}if(type==='defense'){state.extraTurns+=1;finishTurn();return true}if(type==='draw3'){startDraw3();return true}if(type==='meteor'){startMeteor();return true}if(type==='enlight'){const line=aiBestEnlightLine(pi);if(line){aiRememberLine(pi,line.code);log(`${p.name} merkt sich eine Reihe/Spalte durch Erleuchtung.`)}finishTurn();return true}if(type==='ownswap'){const plan=aiBestOwnSwap(pi);if(plan&&plan.gain>.5)aiDirectOwnSwap(pi,plan);else finishTurn();return true}if(type==='swapother'){aiDirectOtherSwap(pi,aiBestOtherSwap(pi));return true}if(type==='thief'){const t=aiBestThiefTarget(pi);if(!t){state.extraTurns+=1;finishTurn();return true}if(consumeDefense(t.pi)){state.extraTurns+=1;finishTurn();return true}const target=state.players[t.pi],[stolen]=target.actions.splice(t.ai,1);stolen.availableOwnTurn=p.ownTurn+2;stolen.stolen=true;p.actions.push(stolen);state.extraTurns+=1;log(`${p.name} stiehlt ${target.name} „${ACTIONS[stolen.type].name}“.`);finishTurn();return true}finishTurn();return true}
async function aiExecuteAction(pi,d){const p=state.players[pi];if(!d||!p.actions[d.i])return false;const [a]=p.actions.splice(d.i,1);if(d.kind==='discard'){state.actionDiscard.push(a);setWatch('action-play',{actor:pi,actionType:a.type,srcId:`player-${pi}`,dstId:`player-${pi}`,title:`legt ${ACTIONS[a.type].name} ab`,typeLabel:'COMPUTER-AKTION',text:'vermeidet die +10-Punkte-Strafe'});log(`${p.name} legt „${ACTIONS[a.type].name}“ ab.`);finishTurn();return true}return aiExecuteActionCard(pi,a,false)}
async function aiHandleDraw3(pi){if(ui.mode!=='draw3Choose')return;const cards=ui.data.cards||[];if(!cards.length){await aiDo(()=>draw3None());return}const choices=cards.map((card,i)=>{const target=aiBestTarget(pi,card);return {i,card,target,score:target?.score??-99}}).sort((a,b)=>b.score-a.score);const best=choices[0],drop=aiDiscardRevealUtility(pi),threshold=aiKeepThreshold(pi,false);await sleepMs(260);if(best?.target&&best.score>=Math.max(threshold,drop-.15)){await aiDo(()=>draw3Pick(best.i));await aiWaitMotion()}else{await aiDo(()=>draw3None());await aiWaitMotion();if(ui.mode==='flipOwn'){const r=aiChooseReveal(pi);if(r){await sleepMs(180);await aiDo(()=>selectCard(pi,r.zone,r.idx));await aiWaitMotion()}}}}
async function aiHandleMeteor(pi){if(ui.mode!=='meteorSelect')return;const targetPi=Number(ui.data.target),pick=aiMeteorChoice(pi,targetPi);await sleepMs(240);if(pick){await aiDo(()=>meteorChoose(pick.zone,pick.idx));await aiWaitMotion()}else{await aiDo(()=>meteorNext());await aiWaitMotion()}}
async function aiHandleMatchReady(pi){const matches=findMatches(pi);if(!matches.length){if(state.pendingMatch)continueMatchReady();return}const chosen=matches.find(m=>aiShouldResolveOptionalMatch(pi,m));if(chosen){await aiDo(()=>resolveBoardMatch(pi,matches.indexOf(chosen)));await aiWaitMotion()}else{await aiDo(()=>continueMatchReady());await aiWaitMotion()}}
async function aiTakeTurn(pi){
 if(!state||state.currentPlayer!==pi||ui.mode!=='turnChoice')return;
 const completed=findMatches(pi);
 const removable=completed.find(m=>aiShouldResolveOptionalMatch(pi,m));
 if(removable){
   await sleepMs(180);
   await aiDo(()=>resolveBoardMatch(pi,completed.indexOf(removable)));
   await aiWaitMotion();
   return;
 }
 const action=aiActionDecision(pi);
 if(action){await sleepMs(430);await aiExecuteAction(pi,action);await aiWaitMotion();return}
 const top=state.playDiscard[state.playDiscard.length-1],dt=top?aiBestTarget(pi,top):null;
 if(top&&dt&&aiShouldTakeDiscard(pi,top,dt)&&!discardArrivalPending()){
   const deny=aiOpponentDiscardThreat(pi,top);
   if(aiDifficulty(pi)==='hard'&&deny.direct>=7.5)log(`${state.players[pi].name} nimmt ${cardShortText(top)} auch defensiv, um ${state.players[deny.opponent]?.name||'dem Gegner'} keine starke Kombination zu geben.`);
   await sleepMs(420);await aiDo(()=>drawFromDiscard());await aiWaitMotion();
   if(state.currentPlayer===pi&&ui.mode==='discardSwap'){await sleepMs(250);await aiDo(()=>selectCard(pi,dt.zone,dt.idx));await aiWaitMotion()}
   return
 }
 await sleepMs(440);await aiDo(()=>drawFromDeck());await aiWaitMotion();
 if(state.currentPlayer!==pi||ui.mode!=='drawnDecision')return;
 const c=ui.data.card,target=aiBestTarget(pi,c),decision=aiDrawnCardDecision(pi,c,target);
 if(decision.keep&&target){
   if(decision.reason&&decision.threat?.score>=5){
     const opp=state.players[decision.threat.opponent]?.name||'Gegner';
     log(`${state.players[pi].name} behält ${cardShortText(c)} strategisch: ${decision.reason} bei ${opp}.`)
   }
   await sleepMs(280);await aiDo(()=>selectCard(pi,target.zone,target.idx));await aiWaitMotion();return
 }
 await sleepMs(270);await aiDo(()=>discardDrawn());await aiWaitMotion();
 if(state.currentPlayer===pi&&ui.mode==='flipOwn'){
   const r=aiChooseReveal(pi);
   if(r){await sleepMs(260);await aiDo(()=>selectCard(pi,r.zone,r.idx));await aiWaitMotion()}
 }
}
async function runAIActor(pi){if(aiBusy||cloud.enabled||!state||!isAIPlayer(pi)||toiletPauseActive())return;aiBusy=true;try{for(let guard=0;guard<24;guard++){await aiWaitMotion();if(!state||cloud.enabled||actorIndex()!==pi||!isAIPlayer(pi)||toiletPauseActive())break;if(state.phase==='initialReveal'){if(ui.mode==='starChoice'){await aiResolveStarChoice();continue}await aiInitialReveal(pi);if(state.phase==='initialReveal'&&state.setupPlayer===pi&&state.setupRevealed>=2)setupContinue();continue}if(state.phase!=='play')break;if(ui.mode==='starChoice'){await aiResolveStarChoice();continue}if(ui.mode==='matchReady'||state.pendingMatch){await aiHandleMatchReady(pi);continue}if(ui.mode==='draw3Choose'){await aiHandleDraw3(pi);continue}if(ui.mode==='draw3Target'){const t=aiBestTarget(pi,ui.data.card);if(t){await aiDo(()=>selectCard(pi,t.zone,t.idx));await aiWaitMotion();continue}else{break}}if(ui.mode==='meteorSelect'){await aiHandleMeteor(pi);continue}if(ui.mode==='turnChoice'){await aiTakeTurn(pi);continue}if(ui.mode==='flipOwn'){const r=aiChooseReveal(pi);if(r){await aiDo(()=>selectCard(pi,r.zone,r.idx));await aiWaitMotion();continue}}break}}catch(e){console.warn('[AI V103]',e);toast('🤖 Computerzug wurde sicher beendet');if(state?.phase==='play'&&state.currentPlayer===pi&&ui.mode==='turnChoice')finishTurn()}finally{aiBusy=false;aiActing=false;scheduleAIIfNeeded(420)}}


function cardClass(c){if(!c)return'empty';if(!c.faceUp)return'back';if(c.type==='star')return'star';if(c.value<0)return'neg';if(c.value===0)return'zero';if(c.value<=4)return'low';if(c.value<=8)return'mid';return'high'}
function cardHTML(c,forceFace=false,clickable=false,selected=false){if(!c)return`<div class="card empty"></div>`;const face=forceFace||c.faceUp,cls=face?(c.type==='star'?'star':c.value<0?'neg':c.value===0?'zero':c.value<=4?'low':c.value<=8?'mid':'high'):'back';const v=face?(c.type==='star'?'★':c.value):'';const off='';return `<div class="card ${cls} ${off} ${clickable?'clickable':''} ${selected?'selected':''}">${face?`<span class="corner tl">${v}</span><span class="center-value">${v}</span><span class="corner br">${v}</span>`:''}</div>`}
function actionHTML(a,clickable=false,selected=false){if(!a)return'';const m=ACTIONS[a.type],locked=state&&state.players[state.currentPlayer]&&state.players[state.currentPlayer].actions.includes(a)&&!actionAvailable(a,state.players[state.currentPlayer]);const kindLabel=m.kind==='attack'?'ANGRIFF':m.kind==='defense'?'SCHUTZ':'AKTION';return `<div class="action-card action-${escapeHTML(a.type)} ${m.kind==='attack'?'attack':m.kind==='defense'?'defense':''} ${clickable?'clickable':''} ${selected?'selected':''} ${locked?'disabled':''}" data-action-type="${escapeHTML(a.type)}"><span class="action-type">${kindLabel}</span><div class="emoji">${m.icon}</div><b>${m.name}</b><small>${m.desc}</small>${locked?'<span class="lock">🔒</span>':''}</div>`}
function boardCardClickable(pi,zone,idx){if(!state||toiletPauseActive())return false;if(isAIActor()&&!aiActing)return false;if(cloud.enabled&&!isMyActorDevice())return false;const mode=ui.mode;if(mode==='setupReveal')return pi===state.setupPlayer&&zone==='grid';if(['drawnDecision','discardSwap','drawnSwap','flipOwn','ownSwapSelect','draw3Target'].includes(mode))return pi===state.currentPlayer;if(mode==='otherSwapSelect')return pi===ui.data.a||pi===ui.data.b;if(mode==='meteorSelect')return pi===ui.data.target;return false}
function isSelected(pi,zone,idx){return ui.selected.some(s=>s.pi===pi&&s.zone===zone&&s.idx===idx)}
function playerHTML(p,pi){const activePhase=state.phase==='play'||state.phase==='initialReveal',active=activePhase&&pi===actorIndex();const mine=cloud.enabled&&pi===myPlayerIndex();const matches=(state.phase==='play')?findMatches(pi):[];const matchSet=new Set(matches.flatMap(m=>m.idx));const canResolve=state.phase==='play'&&pi===state.currentPlayer&&!p.isAI&&ui.mode==='turnChoice'&&(!cloud.enabled||isMyActorDevice())&&!motionBusy;const cards=p.grid.map((c,i)=>`<div id="cell-${pi}-grid-${i}" class="card-slot ${matchSet.has(i)?'match-ready-slot':''}" onclick="Game.selectCard(${pi},'grid',${i})">${cardHTML(c,false,boardCardClickable(pi,'grid',i),isSelected(pi,'grid',i))}</div>`).join('');const extras=p.extras.map((c,i)=>`<div id="cell-${pi}-extra-${i}" class="card-slot" onclick="Game.selectCard(${pi},'extra',${i})">${cardHTML(c,false,boardCardClickable(pi,'extra',i),isSelected(pi,'extra',i))}</div>`).join('');const acts=p.actions.map((a,i)=>`<div onclick="Game.selectActionCard(${pi},${i})">${actionHTML(a,(ui.mode==='chooseActionTurn'&&pi===state.currentPlayer)||(ui.mode==='meteorSelect'&&pi===ui.data.target),false)}</div>`).join('');const total=Math.max(1,12+p.extras.length),hidden=totalHidden(p),pct=Math.max(0,Math.min(100,Math.round(((total-hidden)/total)*100)));const hue=[43,188,145,282,18,215,325,92][pi%8];const matchActions=matches.length?`<div class="match-actions"><div class="match-actions-title">✨ ${state.streetModeEnabled===true?'Straßen &amp; gleiche Zahlen':'Gleiche Zahlen'} · vollständige Linie selbst entfernen</div>${matches.map((m,i)=>`<button class="match-resolve-btn optional ${m.street?'street-match-btn':''} ${canResolve?'':'disabled'}" ${canResolve?`onclick="Game.resolveBoardMatch(${pi},${i})"`:'disabled'}>${m.street?'🔢 Straße entfernen':m.pureStars?'⭐ Jokergruppe entfernen':m.name.startsWith('Reihe')?'🟰 Gleiche Reihe entfernen':'🟰 Gleiche Spalte entfernen'} · ${escapeHTML(m.label.replace(/^.*?:\s*/,''))}</button>`).join('')}</div>`:'';return `<section id="player-${pi}" data-player="${pi}" class="player ${active?'active':''} ${mine?'mine':''} ${p.isAI?'ai-player':''}" style="--player-hue:${hue}">${active?`<div class="active-turn-banner"><span>${p.isAI?'🤖':'🎯'}</span><b>${mine?'DEIN ZUG':p.isAI?'COMPUTER AM ZUG':'JETZT AM ZUG'}</b></div>`:''}<div class="player-head"><div class="player-title"><div class="avatar">${pi+1}</div><div class="player-meta"><div class="player-name">${escapeHTML(p.name)} ${p.isAI?'<span class="ai-tag">🤖 COMPUTER</span>':''} ${mine?'<span class="you-tag">DU</span>':''} ${active?'<span class="active-tag">🎯 AM ZUG</span>':''}</div><div class="hint player-meta-chips"><span class="meta-chip hidden-chip">▦ ${hidden} verdeckt</span>${jokerSpecialsEnabled()?`<span class="meta-chip action-chip">⚡ ${p.actions.length} Aktionen</span>`:''}</div><div class="reveal-meter"><i style="width:${pct}%"></i></div></div></div><div class="score-stack"><div class="scorechip"><small>GESAMT</small><b>${p.total}</b></div><div class="progress-chip">${pct}%</div></div></div><div class="gridwrap"><div class="grid">${cards}</div>${p.extras.length?`<div class="extras"><h5>Zusatzkarten</h5><div class="extra-row">${extras}</div></div>`:''}</div>${matchActions}${jokerSpecialsEnabled()&&p.actions.length?`<div class="actions-owned action-only-ui"><div class="owned-title">⚡ Eigene Aktionskarten</div>${acts}</div>`:''}</section>`}
function instructionText(){if(!state)return'';const p=current(),actorPhase=state.phase==='play'||state.phase==='initialReveal';if(actorPhase&&isAIActor()&&!aiActing){const ap=state.players[actorIndex()]||p;return `🤖 ${escapeHTML(ap.name)} überlegt …`;}if(actorPhase&&cloud.enabled&&!isMyActorDevice()){const ai=actorIndex(),n=state.players[ai]?.name||'Mitspieler';return `Warte auf ${escapeHTML(n)} …`}switch(ui.mode){case'setupReveal':return `${state.players[state.setupPlayer].name}: ${2-state.setupRevealed} Startkarte(n) aufdecken`;case'turnChoice':{if(state.roundEnder!==null){const later=(state.finalTurnQueue||[]).map(i=>state.players[i]?.name).filter(Boolean);return `🔔 Schlussrunde · ${p.name} hat seinen letzten Zug${later.length?` · danach ${later.join(' → ')}`:''}`;}return jokerSpecialsEnabled()?`${p.name}: Stapel, Ablage oder Aktionskarte direkt antippen`:`${p.name}: Nachziehstapel oder Ablage antippen`;}case'drawnDecision':return `Gezogene Karte: Zielfeld antippen → alte Karte aufdecken → offen auf Ablage → danach Handkarte ins Feld`;case'matchReady':return `✨ Fertige Kombination bleibt liegen – du kannst sie selbst entfernen`;case'roundReveal':{const st=ui.data?.stage||state.roundClose?.stage;if(st==='remove')return `✨ Rundenende: Kombinationen werden mit Joker-Endwerten geprüft …`;if(st==='ready')return `📊 Alle Karten offen – Punktewertung startet gleich …`;const i=ui.data?.index||state.roundClose?.revealIndex||0,t=ui.data?.total||state.roundClose?.revealOrder?.length||0;return `🔄 Rundenende: verdeckte Karten werden nacheinander aufgedeckt${t?` · ${i}/${t}`:''}`;}case'scoreSequence':return `📊 Score Show: Punkte werden langsam Karte für Karte addiert …`;case'discardSwap':return `${p.name}: Zielfeld wählen – Ablagekarte wird sichtbar eingetauscht`;case'drawnSwap':return `${p.name}: Zielfeld wählen – Karte fliegt dorthin, alte Karte zur Ablage`;case'flipOwn':return `${p.name}: Eine verdeckte eigene Karte aufdecken`;case'chooseActionTurn':return `${p.name}: Aktionskarte wählen`;case'ownSwapSelect':return `${p.name}: Zwei eigene Karten wählen`;case'otherSwapSelect':return `Je eine Karte bei den zwei gewählten Spielern wählen`;case'meteorSelect':return `☄️ Karte bei ${state.players[ui.data.target].name} wählen`;case'draw3Target':return `${p.name}: Zielkarte für die gewählte Karte bestimmen`;case'scoringResolve':return `Rundenwertung wird aufgelöst`;default:return `${p.name}`}}
function bottomButtons(){
 if(!state)return'';
 if(state.phase==='gameOver'){
   if(cloud.enabled){
     return isHostDevice()
       ?`<button class="primary" onclick="Game.returnFinishedGameToRoomLobby()">🏠 Alle zurück in Raum-Lobby</button><button onclick="Game.maybeShowRoundSummary(true)">🏆 Ergebnis</button>`
       :`<div class="waiting-note">🏁 Spiel beendet · warte auf den Host oder gehe selbst zum Menü.</div><button class="primary" onclick="Game.backToLobby()">🏠 Zum Menü</button><button onclick="Game.maybeShowRoundSummary(true)">🏆 Ergebnis</button>`
   }
   return `<button class="primary" onclick="Game.backToLobby()">🏠 Zum Menü</button><button onclick="Game.maybeShowRoundSummary(true)">🏆 Ergebnis</button>`
 }
if(isAIActor()&&!aiActing)return '<span class="ai-thinking">Computer denkt <span class="ai-dots"><i></i><i></i><i></i></span></span>';if(motionBusy)return '<span class="turn-state-pill">🎴 Kartenbewegung …</span>';if(cloud.enabled&&!isMyActorDevice())return '<div class="waiting-note">Nicht dein Zug – Spiel wird automatisch synchronisiert.</div>';if(ui.mode==='turnChoice'){const dp=discardArrivalPending(),db=`<button ${dp?'disabled title="Karte landet noch"':'onclick="Game.drawFromDiscard()"'}>🂠 ${dp?'landet …':'Ablage'}</button>`;return jokerSpecialsEnabled()?`<button onclick="Game.drawFromDeck()">🎴 Ziehstapel</button>${db}<button class="primary" onclick="Game.chooseActionTurn()">⚡ Eigene Aktion</button><button onclick="Game.takeActionBlind(false)">⚡ Verdeckt</button>`:`<button onclick="Game.drawFromDeck()">🎴 Ziehstapel</button>${db}`;}if(ui.mode==='drawnDecision')return `<span class="turn-state-pill mine">☝ Zielfeld antippen: erst aufdecken, dann tauschen · 🗑 Ablage = wegwerfen</span>`;if(ui.mode==='matchReady')return `<span class="turn-state-pill mine">✨ Kombination bleibt liegen</span>`;if(ui.mode==='roundReveal')return `<span class="turn-state-pill mine">🔄 Rundenabschluss läuft automatisch</span>`;if(ui.mode==='chooseActionTurn')return `<button onclick="Game.cancelActionChoice()">↩ Zurück</button>`;return''}
const emojiReactionSeen=new Set();
const EMOJI_REACTIONS=['👍','😂','🤣','HAHA','HEINZ','STROM','🎁','😮','😭','😡','👏','🔥','❤️','🤔'];

const TABLE_MESSAGE_MS=10000;
let tableAnnouncementTimer=null;
let currentTableAnnouncement=null;
function activeTableAnnouncement(){
 if(!currentTableAnnouncement)return null;
 const remaining=Number(currentTableAnnouncement.expiresAt||0)-Date.now();
 if(remaining<=0){currentTableAnnouncement=null;return null}
 return {...currentTableAnnouncement,remainingMs:remaining}
}
function clearTableAnnouncement(){
 if(tableAnnouncementTimer){clearTimeout(tableAnnouncementTimer);tableAnnouncementTimer=null}
 currentTableAnnouncement=null;
 syncTableAnnouncementMount()
}
function tableAnnouncementHTML(a){
 return `<div class="table-message-card kind-${escapeHTML(a.kind||'fun')}"><div class="table-message-icon">${escapeHTML(a.icon||'💬')}</div><div class="table-message-copy"><div class="table-message-head"><div class="table-message-kicker">${escapeHTML(a.title||'INFO')}</div>${a.by?`<div class="table-message-by">von ${escapeHTML(a.by)}</div>`:''}</div><div class="table-message-text">${escapeHTML(a.text||'')}</div><div class="table-message-foot">${a.ref?`<div class="table-message-ref">${escapeHTML(a.ref)}</div>`:'<div></div>'}<div class="table-message-note">sichtbar für 10 Sekunden</div></div><div class="table-message-progress"><i></i></div></div></div>`
}
function positionTableAnnouncementZone(){
 const zone=document.getElementById('tableMessageZone');
 const board=zone?.closest('.table-area');
 const center=board?.querySelector('.center-table');
 const anchor=center?.querySelector('.handbox')||center;
 if(!zone||!board||!center||!anchor||zone.classList.contains('empty'))return;
 const boardRect=board.getBoundingClientRect();
 const centerRect=center.getBoundingClientRect();
 const anchorRect=anchor.getBoundingClientRect();
 const card=zone.querySelector('.table-message-card');
 const width=Math.max(0,Math.min(anchorRect.width,window.innerWidth-12));
 const overlapsHorizontally=r=>r.right>anchorRect.left+10&&r.left<anchorRect.left+width-10;
 // On mobile, players can sit *under* the middle pile. Their card grids
 // must never be covered by a text notification.
 let cardsEnd=centerRect.bottom;
 for(const el of board.querySelectorAll('.player')){
   const r=el.getBoundingClientRect();
   if(overlapsHorizontally(r))cardsEnd=Math.max(cardsEnd,r.bottom)
 }
 const availableInside=Math.max(0,boardRect.bottom-cardsEnd-16);
 const measured=card?.getBoundingClientRect()?.height||0;
 const required=Math.max(100,measured);
 zone.style.width=`${width}px`;
 if(availableInside>=required+3){
   zone.classList.remove('compact-overlay','tight-message');
   zone.style.position='absolute';
   zone.style.top=`${Math.max(0,cardsEnd-boardRect.top+12)}px`;
   zone.style.bottom='auto';
   zone.style.left=`${Math.max(0,anchorRect.left-boardRect.left)}px`;
   zone.style.maxHeight=`${Math.floor(availableInside)}px`;
   if(card){card.style.maxHeight=`${Math.floor(availableInside)}px`;card.style.overflowY='auto'}
 }else{
   // Use only the already vacant viewport above the reaction strip.
   // The notice is slim when the free space is slim; it adds no page height.
   const dockTop=document.querySelector('.bottom-actions')?.getBoundingClientRect()?.top??window.innerHeight;
   const emptyViewport=Math.max(0,Math.floor(dockTop-Math.max(0,cardsEnd)-7));
   const maxHeight=Math.min(168,Math.max(0,emptyViewport));
   zone.classList.add('compact-overlay');
   zone.classList.toggle('tight-message',maxHeight<110);
   zone.style.position='fixed';
   zone.style.top='auto';
   zone.style.bottom=`${Math.max(8,Math.round(window.innerHeight-dockTop+5))}px`;
   zone.style.left=`${Math.max(6,Math.min(anchorRect.left,window.innerWidth-width-6))}px`;
   zone.style.maxHeight=`${Math.max(0,maxHeight)}px`;
   if(card){card.style.maxHeight=`${Math.max(0,maxHeight)}px`;card.style.overflowY='auto'}
   // When there is no unobstructed viewport space, park the notice in the
   // free table padding instead of hiding or painting over somebody's cards.
   if(maxHeight<38){
     zone.style.position='absolute';
     zone.style.left=`${Math.max(0,anchorRect.left-boardRect.left)}px`;
     zone.style.top=`${Math.max(0,cardsEnd-boardRect.top+7)}px`;
     zone.style.bottom='auto';
     const padding=document.querySelector('.app')?.getBoundingClientRect().bottom-boardRect.bottom;
     const padRoom=Math.max(32,Math.min(118,Math.floor(padding||0)-12));
     zone.style.maxHeight=`${padRoom}px`;
     if(card){card.style.maxHeight=`${padRoom}px`;card.style.overflowY='auto'}
   }
 }
}
function syncTableAnnouncementMount(){
 const zone=document.getElementById('tableMessageZone');
 const mount=document.getElementById('tableMessageMount');
 if(!zone||!mount)return;
 const a=activeTableAnnouncement();
 mount.innerHTML='';
 zone.classList.toggle('empty',!a);
 if(!a){zone.style.display='none';return}
 zone.style.display='block';
 mount.innerHTML=tableAnnouncementHTML(a);
 positionTableAnnouncementZone();
 const card=mount.firstElementChild;
 const bar=card?.querySelector('.table-message-progress i');
 requestAnimationFrame(()=>{
   if(card)card.classList.add('show');
   if(bar){bar.style.transitionDuration=`${Math.max(250,a.remainingMs)}ms`;requestAnimationFrame(()=>bar.classList.add('run'))}
 })
}
function showTableAnnouncement(entry,remainingMs=TABLE_MESSAGE_MS){
 if(!entry?.text)return;
 if(tableAnnouncementTimer){clearTimeout(tableAnnouncementTimer);tableAnnouncementTimer=null}
 currentTableAnnouncement={id:entry.id||uid(),kind:entry.kind||'fun',icon:entry.icon||'💬',title:entry.title||'INFO',text:String(entry.text||''),ref:entry.ref||'',by:entry.by||'',expiresAt:Date.now()+Math.max(500,remainingMs)};
 syncTableAnnouncementMount();
 tableAnnouncementTimer=setTimeout(()=>{currentTableAnnouncement=null;tableAnnouncementTimer=null;syncTableAnnouncementMount()},Math.max(500,remainingMs)+40)
}
function tableMessageZoneHTML(){return `<div id="tableMessageZone" class="table-message-zone empty"><div id="tableMessageMount"></div></div>`}
function isSurpriseReaction(emoji){return String(emoji||'')==='SURP'||String(emoji||'')==='🎁'}


const GAME_JOKES=[
 'Warum können Geister so schlecht lügen? Weil man durch sie hindurchsieht.',
 'Was macht ein Keks unter einem Baum? Krümel.',
 'Warum nehmen Skelette nie an Streit teil? Sie haben nicht den Mumm dazu.',
 'Was ist orange und läuft durch den Wald? Eine Wanderine.',
 'Was macht ein Mathematiker im Garten? Er zieht Wurzeln.',
 'Warum können Seeräuber keinen Kreisumfang berechnen? Weil sie Pi raten.',
 'Was ist grün und klopft an die Tür? Ein Klopfsalat.',
 'Was liegt am Strand und spricht undeutlich? Eine Nuschel.',
 'Warum ging der Pilz auf die Party? Weil er ein Champignon war.',
 'Was sagt der große Stift zum kleinen Stift? Wachs-mal-Stift!',
 'Warum sind Fische so schlau? Weil sie immer in Schulen schwimmen.',
 'Was ist braun und schwimmt unter Wasser? Ein U-Brot.',
 'Was macht ein Clown im Büro? Faxen.',
 'Wie nennt man einen Bumerang, der nicht zurückkommt? Stock.',
 'Was sagt die Null zur Acht? Schicker Gürtel!',
 'Warum können Bienen so gut rechnen? Weil sie den Summen kennen.',
 'Was macht ein Elektriker morgens? Er steht unter Spannung.',
 'Was ist weiß und stört beim Essen? Eine Lawine.',
 'Was ist rot und schlecht für die Zähne? Ein Backstein.',
 'Warum ging der Computer zum Arzt? Er hatte einen Virus.',
 'Was sagt ein Hai, nachdem er einen Clown gefressen hat? Schmeckt irgendwie komisch.',
 'Was macht eine Wolke, wenn sie juckt? Sie fliegt zum Wolkenkratzer.',
 'Was ist gelb und schießt? Eine Banone.',
 'Warum trinkt der Vampir keinen Kaffee? Weil er schon genug Blutdruck hat.',
 'Was ist unsichtbar und riecht nach Karotten? Ein Kaninchenpups.',
 'Wie heißt ein Spanier ohne Auto? Carlos.',
 'Was macht ein Frosch im Fitnessstudio? Quak-Squats.',
 'Warum haben Kalender so viele Freunde? Weil sie viele Dates haben.',
 'Wie heißt ein helles Mammut? Hellmut.',
 'Was sagt der eine Aufzug zum anderen? Ich glaube, ich komme runter.',
 'Warum hat der Besen schlechte Laune? Weil er immer ausgekehrt wird.',
 'Was macht ein Pirat am Computer? Er drückt die Enterbeute.',
 'Warum ging die Uhr in die Schule? Weil sie tickende Argumente hatte.',
 'Wie nennt man einen schlauen Bäcker? Brotfessor.',
 'Was sagt der Stuhl zum Tisch? Du hast echt gute Beine.',
 'Warum essen Informatiker keine Schokolade? Wegen der Cookies.',
 'Was ist klein, grün und dreieckig? Das kleine grüne Dreieck.',
 'Warum ist der Ballon pleite? Weil er ständig abgehoben hat.',
 'Was macht ein Schneemann im Sommer? Eine Pfütze.',
 'Wie heißt ein Hund ohne Beine? Ist egal, er kommt sowieso nicht.',
 'Warum war der Kühlschrank beleidigt? Weil man ihn dauernd kaltgestellt hat.',
 'Was sagt ein Baum zum anderen? Lass uns mal abhängen.',
 'Wie nennt man einen nervösen Igel? Einen Stachelkopf.',
 'Warum tragen Kühe Glocken? Weil ihre Hörner nicht funktionieren.',
 'Was ist schwarz-weiß und sitzt auf der Schaukel? Ein Schwinguin.',
 'Warum können Bleistifte nicht heiraten? Weil sie keinen richtigen Punkt setzen können.',
 'Was macht ein Apfel im Fitnessstudio? Er stemmt Birnen.',
 'Warum sind Geheimagenten schlechte DJs? Weil sie ständig undercover sind.',
 'Wie nennt man einen sehr höflichen Ritter? Sir Viette.',
 'Was sagt der Toast zum Brot? Du bist heute aber scheibchenweise gut drauf.'
];
GAME_JOKES.push(
 'Warum ging der Bleistift zum Therapeuten? Weil er sich ausgestrichen fühlte.',
 'Was macht eine Tomate auf dem Computer? Sie drückt Ketchup.',
 'Warum lieben Vögel WLAN? Wegen der guten Verbindungen.',
 'Wie nennt man ein müdes Auto? Einen Schlafwagen.',
 'Was macht ein Brot im Krankenhaus? Es wird belegt.',
 'Warum können Kühe nicht flüstern? Weil sie nur muh-tiviert sprechen.',
 'Wie heißt ein intelligenter Berg? Cleverest.',
 'Warum tragen Lampen keine Mützen? Weil sie schon Schirme haben.',
 'Was sagt der Kugelschreiber zum Blatt? Ich fühl mich zu dir hingezogen.',
 'Warum sind Treppen schlechte Geheimnisträger? Weil immer etwas durchsickert.',
 'Wie nennt man eine entspannte Gurke? Chillrike.',
 'Was macht ein Handy im Fitnessstudio? Es trainiert Empfang.',
 'Warum ging die Banane ins Büro? Weil sie krumm Karriere machen wollte.',
 'Was macht eine Ente mit Akten? Sie abheften. Quak.',
 'Wie heißt ein Kaugummi, der nachdenkt? Grübelmint.',
 'Warum reden Pflanzen so ungern? Weil sie lieber wachsen lassen.',
 'Was macht ein Sofa beim Arzt? Es sitzt die Sache aus.',
 'Warum lachen Uhren nie zu spät? Weil sie den richtigen Zeitpunkt haben.',
 'Wie nennt man einen höflichen Käse? Bittebert.',
 'Was macht ein Gabelstapler im Urlaub? Er hebt ab.',
 'Warum war das Feuerzeug beleidigt? Weil es übergangen wurde.',
 'Was ist grau und kann nicht schwimmen? Ein Parkplatz.',
 'Wie nennt man einen Bäcker mit Sonnenbrand? Toasty.',
 'Warum mögen Waschmaschinen keine Witze? Weil sie Schleudertrauma bekommen.',
 'Was macht ein Löffel beim Fußball? Er spielt in der Schale.',
 'Warum wurde der Staubsauger Künstler? Er hatte Saugkraft.',
 'Wie nennt man eine nervöse Zitrone? Eine Zittrone.',
 'Warum kann der Mond nicht lügen? Weil alles ans Licht kommt.',
 'Was macht ein Taschenrechner am Wochenende? Er schaltet ab.',
 'Wie heißt ein sehr glücklicher Föhn? Heiter bis luftig.'
);

let jokePopupEl=null;
let jokePopupTimer=null;
let lastJokeSeen='';

function clearJokePopup(){
 if(jokePopupTimer){clearTimeout(jokePopupTimer);jokePopupTimer=null}
 if(jokePopupEl){try{jokePopupEl.remove()}catch(_e){}jokePopupEl=null}
}

function showJokePopup(joke,remainingMs=TABLE_MESSAGE_MS){
 if(!joke)return;
 clearJokePopup();
 showTableAnnouncement({kind:'joke',icon:'😂',title:'WITZ FÜR ZWISCHENDURCH',text:joke},remainingMs)
}

function syncGameJoke(){
 const j=state?.funJoke;
 if(!j?.id||j.id===lastJokeSeen)return;
 const age=Date.now()-Number(j.ts||0);
 if(age<0||age>TABLE_MESSAGE_MS){lastJokeSeen=j.id;return}
 lastJokeSeen=j.id;
 showJokePopup(j.text,TABLE_MESSAGE_MS-age)
}

function tellRandomJoke(){
 if(!state)return;
 if(toiletPauseActive()){toast('🚽 Erst die Toilettenpause beenden – dann gibt’s wieder Witze.');return}
 let pool=GAME_JOKES;
 const previous=state.funJoke?.text||'';
 if(pool.length>1)pool=pool.filter(j=>j!==previous);
 const joke=pool[Math.floor(Math.random()*pool.length)]||GAME_JOKES[0];
 state.funJoke={id:uid(),text:joke,ts:Date.now(),by:toiletPauseActor().name};
 save();
 syncGameJoke();
 toast('😂 Witz kommt!')
}

function jokeSideButtonHTML(){
 if(!state||!['initialReveal','play'].includes(state.phase)||toiletPauseActive())return '';
 return `<button type="button" class="joke-side-btn" onclick="Game.tellRandomJoke()" title="Zufälligen Witz anzeigen" aria-label="Zufälligen Witz anzeigen"><span class="joke-side-icon">😂</span><span class="joke-side-label">WITZ</span></button>`
}



const GAME_BIBLE_VERSES=[
 {ref:'Philipper 4,13',text:'Ich vermag alles durch den, der mich mächtig macht, Christus.'},
 {ref:'Sprüche 16,3',text:'Befiehl dem HERRN deine Werke, so werden deine Anschläge fortgehen.'},
 {ref:'Sprüche 3,5',text:'Verlaß dich auf den HERRN von ganzem Herzen und verlaß dich nicht auf deinen Verstand.'},
 {ref:'Sprüche 3,6',text:'Sondern gedenke an ihn in allen deinen Wegen, so wird er dich recht führen.'},
 {ref:'Psalm 37,5',text:'Befiehl dem HERRN deine Wege und hoffe auf ihn; er wird\'s wohl machen.'},
 {ref:'Psalm 118,24',text:'Dies ist der Tag, den der HERR macht; lasset uns freuen und fröhlich darinnen sein.'},
 {ref:'Psalm 23,1',text:'Der HERR ist mein Hirte; mir wird nichts mangeln.'},
 {ref:'Psalm 27,1',text:'Der HERR ist mein Licht und mein Heil; vor wem sollte ich mich fürchten?'},
 {ref:'Psalm 46,2',text:'Gott ist unsre Zuversicht und Stärke, eine Hilfe in den großen Nöten.'},
 {ref:'Psalm 55,23',text:'Wirf dein Anliegen auf den HERRN; der wird dich versorgen.'},
 {ref:'Psalm 56,4',text:'Wenn ich mich fürchte, so hoffe ich auf dich.'},
 {ref:'Psalm 84,13',text:'HERR Zebaoth, wohl dem Menschen, der sich auf dich verläßt!'},
 {ref:'Psalm 90,12',text:'Lehre uns bedenken, daß wir sterben müssen, auf daß wir klug werden.'},
 {ref:'Psalm 119,105',text:'Dein Wort ist meines Fußes Leuchte und ein Licht auf meinem Wege.'},
 {ref:'Psalm 133,1',text:'Siehe, wie fein und lieblich ist\'s, daß Brüder einträchtig beieinander wohnen!'},
 {ref:'Jesaja 40,31',text:'Die auf den HERRN harren, kriegen neue Kraft.'},
 {ref:'Jesaja 41,10',text:'Fürchte dich nicht, ich bin mit dir; weiche nicht, denn ich bin dein Gott.'},
 {ref:'Jesaja 43,2',text:'So du durchs Wasser gehst, will ich bei dir sein.'},
 {ref:'Jeremia 17,7',text:'Gesegnet aber ist der Mann, der sich auf den HERRN verläßt.'},
 {ref:'Jeremia 29,11',text:'Denn ich weiß wohl, was ich für Gedanken über euch habe, spricht der HERR: Gedanken des Friedens.'},
 {ref:'Matthäus 5,9',text:'Selig sind die Friedfertigen; denn sie werden Gottes Kinder heißen.'},
 {ref:'Matthäus 5,16',text:'Also lasset euer Licht leuchten vor den Leuten.'},
 {ref:'Matthäus 6,34',text:'Darum sorget nicht für den andern Morgen; denn der morgende Tag wird für das Seine sorgen.'},
 {ref:'Matthäus 7,12',text:'Alles nun, was ihr wollt, daß euch die Leute tun sollen, das tut ihr ihnen auch.'},
 {ref:'Matthäus 11,28',text:'Kommet her zu mir alle, die ihr mühselig und beladen seid; ich will euch erquicken.'},
 {ref:'Matthäus 18,20',text:'Wo zwei oder drei versammelt sind in meinem Namen, da bin ich mitten unter ihnen.'},
 {ref:'Matthäus 19,26',text:'Bei den Menschen ist\'s unmöglich; aber bei Gott sind alle Dinge möglich.'},
 {ref:'Matthäus 22,39',text:'Du sollst deinen Nächsten lieben wie dich selbst.'},
 {ref:'Markus 9,23',text:'Alle Dinge sind möglich dem, der da glaubt.'},
 {ref:'Markus 10,27',text:'Bei den Menschen ist\'s unmöglich, aber nicht bei Gott; denn alle Dinge sind möglich bei Gott.'},
 {ref:'Lukas 6,31',text:'Wie ihr wollt, daß euch die Leute tun sollen, also tut ihnen gleich auch ihr.'},
 {ref:'Lukas 12,25',text:'Welcher ist unter euch, ob er schon darum sorget, der da könnte eine Elle seiner Länge zusetzen?'},
 {ref:'Johannes 8,12',text:'Ich bin das Licht der Welt; wer mir nachfolgt, der wird nicht wandeln in der Finsternis.'},
 {ref:'Johannes 13,34',text:'Ein neu Gebot gebe ich euch, daß ihr euch untereinander liebet.'},
 {ref:'Johannes 14,1',text:'Euer Herz erschrecke nicht! Glaubet an Gott und glaubet an mich!'},
 {ref:'Johannes 14,6',text:'Ich bin der Weg und die Wahrheit und das Leben.'},
 {ref:'Johannes 15,12',text:'Das ist mein Gebot, daß ihr euch untereinander liebet, gleichwie ich euch liebe.'},
 {ref:'Johannes 16,33',text:'In der Welt habt ihr Angst; aber seid getrost, ich habe die Welt überwunden.'},
 {ref:'Römer 5,3-4',text:'Trübsal bringt Geduld; Geduld aber bringt Erfahrung; Erfahrung aber bringt Hoffnung.'},
 {ref:'Römer 8,28',text:'Wir wissen aber, daß denen, die Gott lieben, alle Dinge zum Besten dienen.'},
 {ref:'Römer 12,10',text:'Die brüderliche Liebe untereinander sei herzlich.'},
 {ref:'Römer 12,12',text:'Seid fröhlich in Hoffnung, geduldig in Trübsal, haltet an am Gebet.'},
 {ref:'Römer 12,18',text:'Ist es möglich, soviel an euch ist, so habt mit allen Menschen Frieden.'},
 {ref:'Römer 14,19',text:'Darum lasset uns dem nachstreben, was zum Frieden dient und was zur Besserung untereinander dient.'},
 {ref:'1. Korinther 10,31',text:'Ihr esset nun oder trinket oder was ihr tut, so tut es alles zu Gottes Ehre.'},
 {ref:'1. Korinther 13,4',text:'Die Liebe ist langmütig und freundlich.'},
 {ref:'1. Korinther 13,7',text:'Sie verträgt alles, sie glaubt alles, sie hofft alles, sie duldet alles.'},
 {ref:'1. Korinther 16,14',text:'Alle eure Dinge lasset in der Liebe geschehen!'},
 {ref:'2. Korinther 5,7',text:'Denn wir wandeln im Glauben, und nicht im Schauen.'},
 {ref:'2. Korinther 12,9',text:'Laß dir an meiner Gnade genügen; denn meine Kraft ist in den Schwachen mächtig.'},
 {ref:'Galater 5,22',text:'Die Frucht aber des Geistes ist Liebe, Freude, Friede, Geduld, Freundlichkeit.'},
 {ref:'Galater 6,9',text:'Lasset uns aber Gutes tun und nicht müde werden.'},
 {ref:'Epheser 4,2',text:'Mit aller Demut und Sanftmut, mit Geduld, und vertraget einer den andern in der Liebe.'},
 {ref:'Epheser 4,32',text:'Seid aber untereinander freundlich, herzlich und vergebet einer dem andern.'},
 {ref:'Epheser 6,10',text:'Zuletzt, meine Brüder, seid stark in dem HERRN und in der Macht seiner Stärke.'},
 {ref:'Philipper 2,3',text:'Nichts tut durch Zank oder eitle Ehre; sondern durch Demut achte einer den andern höher denn sich selbst.'},
 {ref:'Philipper 4,4',text:'Freuet euch in dem HERRN allewege! Und abermals sage ich: Freuet euch!'},
 {ref:'Philipper 4,6',text:'Sorget nichts! sondern in allen Dingen lasset eure Bitten im Gebet und Flehen mit Danksagung vor Gott kund werden.'},
 {ref:'Kolosser 3,13',text:'Vertraget einer den andern und vergebet euch untereinander.'},
 {ref:'Kolosser 3,15',text:'Der Friede Gottes regiere in euren Herzen.'},
 {ref:'1. Thessalonicher 5,16',text:'Seid allezeit fröhlich.'},
 {ref:'1. Thessalonicher 5,17',text:'Betet ohne Unterlaß.'},
 {ref:'1. Thessalonicher 5,18',text:'Seid dankbar in allen Dingen.'},
 {ref:'Hebräer 10,24',text:'Lasset uns untereinander unser selbst wahrnehmen mit Reizen zur Liebe und guten Werken.'},
 {ref:'Hebräer 11,1',text:'Es ist aber der Glaube eine gewisse Zuversicht des, das man hofft.'},
 {ref:'Hebräer 12,1',text:'Lasset uns laufen durch Geduld in dem Kampf, der uns verordnet ist.'},
 {ref:'Jakobus 1,19',text:'Ein jeglicher Mensch sei schnell, zu hören, langsam aber, zu reden, und langsam zum Zorn.'},
 {ref:'Jakobus 1,22',text:'Seid aber Täter des Worts und nicht Hörer allein.'},
 {ref:'Jakobus 4,10',text:'Demütiget euch vor Gott, so wird er euch erhöhen.'},
 {ref:'1. Petrus 4,8',text:'Vor allen Dingen aber habt untereinander eine inbrünstige Liebe.'},
 {ref:'1. Petrus 5,7',text:'Alle eure Sorge werfet auf ihn; denn er sorgt für euch.'},
 {ref:'1. Johannes 4,7',text:'Ihr Lieben, lasset uns untereinander liebhaben; denn die Liebe ist von Gott.'},
 {ref:'1. Johannes 4,19',text:'Lasset uns ihn lieben; denn er hat uns zuerst geliebt.'}
];
GAME_BIBLE_VERSES.push(
 {ref:'Psalm 16,11',text:'Du tust mir kund den Weg zum Leben.'},
 {ref:'Psalm 18,2',text:'Herzlich lieb habe ich dich, HERR, meine Stärke.'},
 {ref:'Psalm 19,15',text:'Lass dir wohlgefallen die Rede meines Mundes und das Gespräch meines Herzens vor dir, HERR.'},
 {ref:'Psalm 28,7',text:'Der HERR ist meine Stärke und mein Schild.'},
 {ref:'Psalm 31,25',text:'Seid getrost und unverzagt alle, die ihr des HERRN harret.'},
 {ref:'Psalm 32,8',text:'Ich will dich unterweisen und dir den Weg zeigen, den du gehen sollst.'},
 {ref:'Psalm 34,9',text:'Schmecket und sehet, wie freundlich der HERR ist.'},
 {ref:'Psalm 37,4',text:'Habe deine Lust am HERRN; der wird dir geben, was dein Herz wünschet.'},
 {ref:'Psalm 61,3',text:'Führe mich auf einen hohen Felsen.'},
 {ref:'Psalm 62,2',text:'Meine Seele ist stille zu Gott, der mir hilft.'},
 {ref:'Psalm 63,4',text:'Deine Gnade ist besser als Leben.'},
 {ref:'Psalm 73,28',text:'Aber das ist meine Freude, daß ich mich zu Gott halte.'},
 {ref:'Psalm 86,11',text:'Weise mir, HERR, deinen Weg, daß ich wandle in deiner Wahrheit.'},
 {ref:'Psalm 91,11',text:'Denn er hat seinen Engeln befohlen über dir, daß sie dich behüten auf allen deinen Wegen.'},
 {ref:'Psalm 103,2',text:'Lobe den HERRN, meine Seele, und vergiß nicht, was er dir Gutes getan hat.'},
 {ref:'Psalm 121,2',text:'Meine Hilfe kommt vom HERRN, der Himmel und Erde gemacht hat.'},
 {ref:'Sprüche 17,17',text:'Ein Freund liebt allezeit.'},
 {ref:'Sprüche 18,10',text:'Der Name des HERRN ist ein festes Schloß.'},
 {ref:'Jesaja 26,3',text:'Du erhältst stets Frieden nach gewisser Zusage; denn man verläßt sich auf dich.'},
 {ref:'Jesaja 30,15',text:'Durch Stillesein und Hoffen würdet ihr stark sein.'},
 {ref:'Klagelieder 3,22-23',text:'Die Güte des HERRN ist\'s, daß wir nicht gar aus sind; seine Barmherzigkeit hat noch kein Ende, sondern sie ist alle Morgen neu.'},
 {ref:'Micha 6,8',text:'Es ist dir gesagt, Mensch, was gut ist: Gottes Wort halten und Liebe üben und demütig sein vor deinem Gott.'},
 {ref:'Matthäus 28,20',text:'Siehe, ich bin bei euch alle Tage bis an der Welt Ende.'},
 {ref:'Lukas 1,37',text:'Bei Gott ist kein Ding unmöglich.'},
 {ref:'Johannes 10,10',text:'Ich bin gekommen, daß sie das Leben und volle Genüge haben sollen.'},
 {ref:'Johannes 14,27',text:'Den Frieden lasse ich euch, meinen Frieden gebe ich euch.'},
 {ref:'Römer 15,13',text:'Der Gott der Hoffnung erfülle euch mit aller Freude und Frieden im Glauben.'},
 {ref:'2. Timotheus 1,7',text:'Gott hat uns nicht gegeben den Geist der Furcht, sondern der Kraft und der Liebe und der Zucht.'},
 {ref:'Hebräer 13,8',text:'Jesus Christus gestern und heute und derselbe auch in Ewigkeit.'},
 {ref:'Offenbarung 3,20',text:'Siehe, ich stehe vor der Tür und klopfe an.'}
);

let biblePopupEl=null;
let biblePopupTimer=null;
let lastBibleVerseSeen='';

function clearBiblePopup(){
 if(biblePopupTimer){clearTimeout(biblePopupTimer);biblePopupTimer=null}
 if(biblePopupEl){try{biblePopupEl.remove()}catch(_e){}biblePopupEl=null}
}

function showBibleVersePopup(entry,remainingMs=TABLE_MESSAGE_MS){
 if(!entry?.text)return;
 clearBiblePopup();
 showTableAnnouncement({kind:'bible',icon:'📖',title:'BIBELVERS',text:'„'+entry.text+'“',ref:entry.ref||'',by:entry.by||''},remainingMs)
}

function syncBibleVerse(){
 const v=state?.bibleVerse;
 if(!v?.id||v.id===lastBibleVerseSeen)return;
 const age=Date.now()-Number(v.ts||0);
 if(age<0||age>TABLE_MESSAGE_MS){lastBibleVerseSeen=v.id;return}
 lastBibleVerseSeen=v.id;
 showBibleVersePopup(v,TABLE_MESSAGE_MS-age)
}

function showRandomBibleVerse(){
 if(!state)return;
 if(toiletPauseActive()){toast('🚽 Erst die Toilettenpause beenden.');return}
 let pool=GAME_BIBLE_VERSES;
 const previous=state.bibleVerse?.ref||'';
 if(pool.length>1)pool=pool.filter(v=>v.ref!==previous);
 const entry=pool[Math.floor(Math.random()*pool.length)]||GAME_BIBLE_VERSES[0];
 state.bibleVerse={id:uid(),ref:entry.ref,text:entry.text,ts:Date.now(),by:toiletPauseActor().name};
 save();
 syncBibleVerse();
 toast('📖 Bibelvers')
}

function bibleSideButtonHTML(){
 if(!state||!['initialReveal','play'].includes(state.phase)||toiletPauseActive())return '';
 return `<button type="button" class="bible-side-btn" onclick="Game.showRandomBibleVerse()" title="Passenden Bibelvers anzeigen" aria-label="Passenden Bibelvers anzeigen"><span class="bible-side-icon">📖</span><span class="bible-side-label">BIBEL</span></button>`
}

const HEINZ_QUOTES=[
 'Ei, jetzt mal ganz langsam – die Welt läuft net fort.',
 'Also ehrlich, so ebbes muss man sich erst mal leisten können.',
 'Do guckschte, gell? Genau so isses nämlich.',
 'Ich sach dir eins: normal is des heut alles nimmer.',
 'Mach nur, aber nachher net wundern, wenn’s kracht.',
 'Also des hätt ich dir gleich sagen können.',
 'Wenn man’s gscheit macht, spart man sich den Ärger hintendran.',
 'Manche Leit brauche für alles zwei Anläufe und drei Erklärungen.',
 'Jetzt hör doch emol uff so rumzudibbele.',
 'Das is wieder typisch – groß anfangen und dann nix dahinter.',
 'Ei jo, irgendwer muss hier ja noch den Überblick behalten.',
 'So kann das doch kein Mensch vernünftig planen.',
 'Erst macht jeder, was er will, und hinterher fragt man mich.',
 'Man muss net alles gut finden, nur weil’s neu aussieht.',
 'Ganz ruhig – am End stellt sich raus, es war halb so wild.',
 'Wenn ich des net selbst gesehen hätt, ich würd’s net glauben.',
 'Man kann’s kompliziert machen – oder man hört direkt auf mich.',
 'Jetzt sei doch net so hibbelig, eins nach dem annern.',
 'Da brauchste dich wirklich net drüber zu freuen.',
 'Also ich will ja nix sagen – aber recht hab ich trotzdem.',
 'Ei, warum einfach, wenn’s auch umständlich geht?',
 'So, jetzt machen mer das erst mal ordentlich und dann gugge mer weiter.',
 'Do fehlt doch vorne und hinten die Vernunft.',
 'Wenn jeder ein bissje nachdenkt, wär schon viel geholfen.',
 'Ich hab ja nix dagegen – aber so geht’s halt net.',
 'Des hab ich kommen sehen, noch bevor’s angefangen hat.',
 'Jetzt net nervös werden, davon wird’s auch net besser.',
 'Manche Sache erledige sich von selbst, wenn mer net dauernd dran rumfummelt.',
 'Ei jo, des is genau die Sorte Idee, die hinterher keiner gehabt haben will.',
 'Am End war’s wieder ganz einfach – nur vorher wollt’s keiner glauben.',
 'Jetzt mach emol halblang, wir sinn doch net auf der Flucht.',
 'Do wird wieder diskutiert, bis keiner mehr weiß, um was es eigentlich ging.',
 'Ei jo, Hauptsach jeder hat was gesagt.',
 'Früher hat mer sowas einfach gemacht und net erst drei Sitzunge gebraucht.',
 'Wenn das so weitergeht, brauch ich erst mal einen Kaffee.',
 'Man kann auch mit Anlauf am Ziel vorbeischießen.',
 'Jetzt stell dich net so an, des is doch kein Hexewerk.',
 'Do muss mer net studiert haben, um zu sehen, dass des nix wird.',
 'Ich sag nix mehr – ich merk mir’s nur.',
 'Ei, genau deswegen wollt ich des von Anfang an anders machen.',
 'Manche Leit schaffe Probleme, wo vorher gar keine waren.',
 'Jetzt machen mer eins nach dem annern, sonst wird gar nix fertig.',
 'Do kannste hundertmal erklären, wenn keiner zuhört.',
 'Ich hab Zeit, aber net für jeden Quatsch.',
 'Ei jo, wenn’s wenigstens funktionieren tät.',
 'Man muss auch mal wissen, wann genug gebabbelt is.',
 'Jetzt isses passiert, und plötzlich will’s wieder keiner gewesen sein.',
 'Do siehste mal, Planung ersetzt manchmal doch den Zufall.',
 'Ei, des wär mir ja schon wieder zu modern.',
 'Am End muss es einer machen – und meistens weiß ich schon, wer.'
];
HEINZ_QUOTES.push(
 'Do is wieder mehr Theater als Inhalt dabei.',
 'Ei jo, wenn’s schee macht, warum net.',
 'Jetzt gugge mer erst mal, bevor wieder jeder losschimpft.',
 'Des sieht wichtig aus, muss aber noch lang net sinnvoll sein.',
 'Mit Ruhe kommt mer oft weiter als mit Rumgehampel.',
 'Do draußen wird’s net besser, wenn mer hier drin verrückt spielt.',
 'Jetzt wird wieder alles drei Nummern größer erzählt.',
 'Ei, des is so eine Idee mit Anlauf ins Fettnäpfche.',
 'Man muss net alles kommentiere, was einem gerade einfällt.',
 'Also da hat einer gedacht – aber leider der Falsche.',
 'Do merkste gleich, wer vorbereitet war und wer nur geschniegelt.',
 'Wenn mer’s sauber anfängt, muss mer hinten net flicken.',
 'Ei jo, ich kenn des: erst lachen se, später machen se’s genauso.',
 'Jetzt bleib emol uffm Teppich, der Tag hat noch genug Baustellen.',
 'Des Problem is net groß – nur die Aufregung drumrum.',
 'Wenn jeder nur halb so viel redet, wird doppelt so viel geschafft.',
 'Ei, ich hätt’s dir ja gesagt, aber hören muss mer halt auch.',
 'Do is mehr Scheinwerfer als Substanz dran.',
 'Jetzt machen mer net aus jedem Mückestich ein Wildschwein.',
 'Ordnung spart Wege – und Nerve gleich mit.',
 'Ei jo, des klingt erst mal schön, bis mer’s benutzen muss.',
 'Ich bin ja entspannt, aber net grenzenlos.',
 'Do brauchste keinen Ausschuss, nur gesunden Menschenverstand.',
 'Erst wenn’s rappelt, merken manche, dass überhaupt was lief.',
 'Ei, Hauptsach am Schluss weiß einer noch, wo vorne is.',
 'Des kann mer so machen – wenn mer mutig genug is.',
 'Jetzt red net drumrum, mach lieber grad raus, was Sache is.',
 'Ei jo, ein bisschen Stil darf trotz Chaos schon sein.',
 'Wenn’s passt, passt’s. Und wenn net, dann war’s wenigstens lehrreich.',
 'Do guck: Kaum bleibt mer ruhig, klappt’s auf einmal doch.'
);

const STROMBERG_QUOTES=[
 "Die Zahlen sind super. Wenn man die schlechten einfach mal weglässt.",
 "Bei uns ist jeder wichtig. Manche halt vor allem fürs Gruppenfoto.",
 "Motivation ist schön. Aber ein funktionierender Drucker wäre mir lieber.",
 "Ein guter Chef delegiert nicht Probleme, sondern Erfolgschancen.",
 "Wenn alle mitdenken, wird es hier erstaunlich still.",
 "Wir sind wie eine Familie. Nur ohne Erbe und mit mehr Meetings.",
 "Das nennt sich Teamgeist: Einer macht’s und alle waren dabei.",
 "Eine offene Tür ist gut. Besonders wenn man schnell rausmuss.",
 "Ich bin nicht ungeduldig. Die anderen sind nur unfassbar langsam.",
 "Wer hier Karriere machen will, braucht vor allem einen guten Kalender.",
 "Wir sparen nicht am Personal. Wir verteilen nur die Arbeit großzügiger.",
 "Meine Stärke ist Zuhören. Solange keiner zu lange redet.",
 "Konflikte löse ich diplomatisch: Ich setze ein Meeting an.",
 "Hier ist niemand ersetzbar. Außer natürlich laut Stellenplan.",
 "Ein Problem ist erst ein Problem, wenn es schriftlich bei mir liegt.",
 "Ich habe immer ein offenes Ohr. Das andere ist für den Feierabend reserviert.",
 "Mein Führungsstil ist flexibel: Ich habe immer die passende Ausrede.",
 "Wenn das Projekt scheitert, hatten wir immerhin einen schönen Projektnamen.",
 "Wir sollten nicht nach Schuldigen suchen. Die kennen sich schon selbst.",
 "Was mich auszeichnet? Ich kann Verantwortung sehr überzeugend verteilen.",
 "In der Krise zeigt sich, wer mitarbeitet. Und wer PowerPoint kann.",
 "Neue Ideen sind willkommen, sobald sie meine alten bestätigen.",
 "Manche Mitarbeiter sind echte Rohdiamanten. Leider ohne Schleifpapier.",
 "Ich halte mich nicht für unfehlbar. Ich werde nur selten korrigiert.",
 "Ein guter Plan besteht aus drei Punkten: Kaffee, Hoffnung, Vertagen.",
 "Wer pünktlich Feierabend macht, hat offenbar seine Mails nicht gelesen.",
 "Ich nenne das keine Kontrolle. Ich nenne es betreutes Selbstmanagement.",
 "Das Budget ist knapp. Aber an Ausreden haben wir keinen Mangel.",
 "Mit einem freundlichen Lächeln lässt sich fast jede Deadline verschieben.",
 "Wir sind eine moderne Firma. Sogar die Probleme kommen digital.",
 "Ein bisschen Druck schadet nicht. Sagt meistens der, der keinen hat.",
 "Unsere Fehlerkultur ist hervorragend: Jeder kennt die Fehler der anderen.",
 "Ich hätte das sofort entschieden, wenn ich gewusst hätte, worum es geht.",
 "Man muss Prioritäten setzen. Meine stehen meistens ganz oben.",
 "Hier wird keiner klein gehalten. Die Bürostühle sind nur zu niedrig.",
 "Wer Veränderung will, soll erst mal das Passwort aktualisieren.",
 "Bei so viel Kompetenz im Raum würde ich lieber noch jemanden einladen.",
 "Ich arbeite lösungsorientiert: Hauptsache, das Problem liegt woanders.",
 "Ein Mitarbeitergespräch ist wie ein Wetterbericht: viel Gerede, wenig Einfluss.",
 "Wenn alle an einem Strang ziehen, fragt keiner, wo der Strang befestigt ist.",
 "Unterschätzen Sie nie die Macht eines falsch gesetzten Häkchens.",
 "Wir haben keine Hierarchieprobleme. Nur unterschiedliche Höhenlagen.",
 "Nicht jeder muss glänzen. Es reicht, wenn mein Büro gut beleuchtet ist.",
 "Ich kann mit Kritik umgehen. Am besten im ungelesenen Ordner.",
 "Unser Betriebsklima ist prima. Zumindest wenn die Heizung funktioniert.",
 "Ich fördere Eigeninitiative. Vor allem, wenn sie mir Arbeit abnimmt.",
 "Ein voller Terminkalender sieht auch dann nach Erfolg aus, wenn nichts passiert.",
 "Wer immer Ja sagt, hat die letzte Besprechung wohl nicht verstanden.",
 "Ich bin für flache Hierarchien. Solange mein Stuhl höher bleibt.",
 "Man kann alles erklären. Nur nicht, warum der Kopierer schon wieder streikt."
];
STROMBERG_QUOTES.push(
 "Erfolg ist, wenn hinterher alle nicken und keiner weiß, warum.",
 "Ich mag kurze Wege. Vor allem zur Kaffeemaschine.",
 "Transparenz ist wichtig. Deshalb sieht man auch jeden Fehler so schön.",
 "Ein gutes Team erkennt man daran, dass am Ende jemand anderes schuld ist.",
 "Führung heißt, auch im Chaos noch geschniegelt zu wirken.",
 "Manchmal braucht es Visionen. Manchmal reicht auch ein funktionierender Drucker.",
 "Wer Zahlen liebt, sollte nicht so genau hinschauen.",
 "Meine Tür steht offen. Außer wenn ich drin meine Ruhe will.",
 "Im Büro gewinnt nicht der Beste, sondern der mit dem freien Meetingraum.",
 "Vertrauen ist gut, Rückmeldung im CC ist besser.",
 "Ich bin kein Kontrollfreak. Ich mag nur Überraschungen ungern, wenn sie mich betreffen.",
 "Produktivität ist auch eine Frage der Perspektive. Von außen sieht fast alles nach Arbeit aus.",
 "Man muss Leute mitnehmen. Notfalls auch gegen ihre Laufrichtung.",
 "Krisen sind Chancen. Vor allem für neue Präsentationen.",
 "Ein Chef muss nahbar sein. Aber bitte nicht zu nah vor Feierabend.",
 "Wenn die Lösung teuer ist, nennen wir es Strategie.",
 "Verantwortung ist wie ein Staffelstab: Man muss sie im richtigen Moment weiterreichen.",
 "Aus Fehlern lernt man. Manche lernen bei uns Vollzeit.",
 "Ich bin sehr teamorientiert. Mein Team soll schließlich wissen, was ich denke.",
 "Gute Ideen erkenne ich daran, dass sie hinterher mir zugeschrieben werden können.",
 "Wer die E-Mail schreibt, besitzt kurz die Wahrheit.",
 "Meetings sind wie Zimmerpflanzen: Wenn man sie zu oft gießt, wird alles matschig.",
 "Ich fördere Talente. Besonders die, die meine Sätze beenden können.",
 "Am Ende zählt das Ergebnis. Zwischendrin zählt der Kalender.",
 "Ein Leitbild ersetzt zwar nichts, sieht aber neben dem Empfang sehr gut aus.",
 "Ich bin offen für Neues, sofern es den alten Plan bestätigt.",
 "Druck erzeugt Diamanten. Oder krankheitsbedingte Ausfälle.",
 "Wer freundlich lächelt, kann auch schlechte Nachrichten fast wie Motivation verkaufen.",
 "Hier wird keiner allein gelassen. Es gucken immer mindestens drei Leute zu.",
 "Wenn man lange genug professionell schaut, halten es manche schon für Führung."
);
const SURPRISE_QUOTES=[
 'Heute ist ein guter Tag, um unnötig dramatisch gelassen zu bleiben.',
 'Manchmal ist der beste Plan, so zu tun, als hätte man einen.',
 'Wenn schon Chaos, dann bitte mit Stil und Snacks.',
 'Nicht alles braucht Sinn – manches reicht schon als gute Geschichte.',
 'Du musst nicht perfekt sein. Nur interessant genug für den nächsten Zug.',
 'Ein bisschen Unsinn hält die Strategie geschmeidig.',
 'Wenn es komisch wird, bist du wahrscheinlich auf dem richtigen Feld.',
 'Es gibt Tage, da gewinnt nicht der Beste, sondern der Hartnäckigste mit Glück.',
 'Ruhe bewahren: Wahrscheinlich sieht es nur von außen nach Problem aus.',
 'Man kann auch elegant stolpern.',
 'Manche Siege erkennt man erst, wenn die Aufregung vorbei ist.',
 'Wer lacht, hat kurz die Oberhand über das Durcheinander.',
 'Heute bitte freundlich zu dir selbst sein – der Rest ist Bonus.',
 'Wenn ein Plan knirscht, ist er wenigstens in Bewegung.',
 'Zwischen Zufall und Genie liegt oft nur gutes Timing.',
 'Große Momente fangen manchmal mit einem kleinen Quatsch an.',
 'Ein brillanter Einfall trägt nicht immer Krawatte.',
 'Auch ein Umweg kann stilvoll zum Ziel führen.',
 'Nicht erschrecken: Vielleicht läuft es gerade besser als gedacht.',
 'Das Leben ist zu kurz für langweilige Reaktionen.',
 'Mut klingt selten ordentlich, funktioniert aber trotzdem.',
 'Manchmal ist Durchwurschteln nur verkleidete Kreativität.',
 'Wer schmunzelt, denkt oft schon einen Zug weiter.',
 'Ein frecher Gedanke spart manchmal drei ernste Gesichter.',
 'Wenn nichts klappt, klapp wenigstens die Haltung nicht zusammen.',
 'Es darf ruhig ein bisschen funkeln, auch mitten im Kartenchaos.',
 'Heute ist ein guter Zeitpunkt, um das Beste aus dem Ungeplanten zu machen.',
 'Witz schlägt Panik. Fast immer.',
 'Die besten Überraschungen kommen selten mit Bedienungsanleitung.',
 'Du musst nicht alles kontrollieren, um souverän auszusehen.',
 'Gelassenheit ist auch nur Mut im Schlafanzug.',
 'Manchmal ist die klügste Antwort ein breites Grinsen.',
 'Große Energie entsteht oft aus kleinen Albernheiten.',
 'Selbst der verrückteste Spielzug zählt, wenn er funktioniert.',
 'Es ist nie zu spät für einen unerwartet guten Gedanken.',
 'Aus Versehen genial ist auch genial.',
 'Nicht jedes Risiko ist mutig – aber jedes Lachen hilft.',
 'Zwischen Ernst und Spaß liegt oft die beste Idee.',
 'Das war vielleicht kein Meisterplan, aber definitiv ein Moment.',
 'Auch ohne Krone darf man königlich reagieren.',
 'Wer improvisiert, hat zumindest schon angefangen.',
 'Ein bisschen Glanz schadet keiner Runde.',
 'Wenn du keine Antwort hast, hab wenigstens Charme.',
 'Abenteuer beginnt manchmal genau da, wo Routine genervt aufgibt.',
 'Heute ruhig mal so tun, als wäre alles extra so geplant.',
 'Kleine Eskalation, großer Unterhaltungswert.',
 'Ein Lächeln ist die eleganteste Form von Gegenwehr.',
 'Humor ist ein Bonuszug für die Seele.',
 'Unterschätze nie den Effekt eines gut platzierten Aha-Moments.',
 'Wenn schon Überraschung, dann bitte mit goldener Kante.'
];
function randomSurpriseQuote(exclude=''){
 let pool=SURPRISE_QUOTES;
 if(pool.length>1&&exclude)pool=pool.filter(q=>q!==exclude);
 return pool[Math.floor(Math.random()*pool.length)]||SURPRISE_QUOTES[0]
}
let strombergQuoteBag=[];
let strombergLastIndex=-1;
function nextStrombergQuoteIndex(){
 if(!strombergQuoteBag.length){
  strombergQuoteBag=STROMBERG_QUOTES.map((_,i)=>i);
  for(let i=strombergQuoteBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[strombergQuoteBag[i],strombergQuoteBag[j]]=[strombergQuoteBag[j],strombergQuoteBag[i]]}
  if(strombergQuoteBag.length>1&&strombergQuoteBag[strombergQuoteBag.length-1]===strombergLastIndex){
   [strombergQuoteBag[0],strombergQuoteBag[strombergQuoteBag.length-1]]=[strombergQuoteBag[strombergQuoteBag.length-1],strombergQuoteBag[0]];
  }
 }
 const index=strombergQuoteBag.pop();strombergLastIndex=index;return index;
}
function isStrombergReaction(emoji){return /^SB[0-9]{2}$/.test(String(emoji||''))}

function randomHeinzQuote(exclude=''){
 let pool=HEINZ_QUOTES;
 if(pool.length>1&&exclude)pool=pool.filter(q=>q!==exclude);
 return pool[Math.floor(Math.random()*pool.length)]||HEINZ_QUOTES[0]
}

const TOILET_QUOTES=[
 'Die Karten warten. Der Darm nicht.',
 'Kurze Sitzung – diesmal ohne Punktewertung.',
 'Der Thron ruft. SKYJO muss kurz warten.',
 'Bitte nicht drängeln – hier läuft ein wichtiges Geschäft.',
 'Wer aufs Klo muss, darf keinen Zug überspringen – nur kurz pausieren.',
 'Eine Runde für die Verdauung, danach wieder für die Karten.',
 'Der nächste Zug kommt direkt nach der Spülung.',
 'Auch Champions müssen mal auf den Porzellanthron.',
 'Pause! Einer spielt gerade die braune Sonderkarte.',
 'Keine Sorge: Das Spiel ist nicht abgestürzt – nur jemand sitzt fest.',
 'Die Mission läuft – bitte kurz keine Störung im Kontrollzentrum.',
 'Kurzer Boxenstopp auf Keramik, gleich geht das Rennen weiter.',
 'Erst drücken, dann wieder Karten drücken.',
 'Auch große Taktiker brauchen manchmal eine stille Denkpause.',
 'Das Spiel macht kurz Pipi-Pause.',
 'Zwischen Spülung und Sieg liegt manchmal nur ein Knopfdruck.',
 'Bitte Geduld – hier wird gerade Ballast abgeworfen.',
 'Porzellanthron belegt – Wiederaufnahme nach ordnungsgemäßer Landung.',
 'Ein kleiner Schritt fürs Bad, ein großer fürs Bauchgefühl.',
 'Kurz weg vom Tisch, voll im Geschäft.'
];

function toiletPauseActive(){
 return !!state?.toiletPause?.active
}

function toiletPauseActor(){
 if(!state?.players?.length)return {index:0,name:'Spieler'};
 let index=0;
 if(cloud.enabled){
   const me=myPlayerIndex();
   index=me>=0?me:state.currentPlayer
 }else if(state.players.some(p=>p.isAI)){
   const human=state.players.findIndex(p=>!p.isAI);
   index=human>=0?human:state.currentPlayer
 }else index=state.currentPlayer;
 return {index,name:state.players[index]?.name||'Spieler'}
}

function pauseForToilet(){
 if(!state)return;
 if(!['initialReveal','play'].includes(state.phase)){
   toast('🚽 Toilettenpause ist gerade nicht nötig – die Runde läuft nicht.');
   return
 }
 if(toiletPauseActive()){
   toast('🚽 Das Spiel ist bereits pausiert.');
   return
 }

 const who=toiletPauseActor();
 const quote=TOILET_QUOTES[Math.floor(Math.random()*TOILET_QUOTES.length)];
 state.toiletPause={
   active:true,
   id:uid(),
   byIndex:who.index,
   byName:who.name,
   byDevice:cloud.enabled?cloud.deviceId:'local',
   quote,
   ts:Date.now()
 };

 try{closeModal()}catch(_e){}
 clearGameAnnouncement();
 clearJokePopup();
 clearBiblePopup();
 save();
 render();
 toast(`🚽 ${who.name} macht Toilettenpause`);
 haptic([25,50,25])
}

function canResumeToiletPause(){
 if(!toiletPauseActive())return false;
 if(!cloud.enabled)return true;
 return state.toiletPause.byDevice===cloud.deviceId
}

function resumeToiletPause(){
 if(!toiletPauseActive())return;
 if(!canResumeToiletPause()){
   toast(`⏳ ${state.toiletPause?.byName||'Der Toilettengänger'} muss die Pause beenden.`);
   return
 }

 const who=state.toiletPause?.byName||'Spieler';
 state.toiletPause=null;
 save();
 render();
 toast(`✅ ${who} ist zurück – weiter geht's!`);
 haptic([18,30,18]);
 setTimeout(()=>{resumeTransientFlow();scheduleAIIfNeeded(380)},70)
}

function toiletPauseButtonHTML(){
 if(!state||!['initialReveal','play'].includes(state.phase))return '';
 if(toiletPauseActive())return '';
 return `<button type="button" class="toilet-side-btn" onclick="Game.pauseForToilet()" title="Scheißhaus-Pause" aria-label="Spiel für Toilettenpause anhalten"><span class="toilet-side-icon">🚽</span><span class="toilet-side-label">PAUSE</span></button>`
}

function toiletPauseOverlayHTML(){
 if(!toiletPauseActive())return '';
 const p=state.toiletPause||{};
 const mine=canResumeToiletPause();
 return `<div class="toilet-pause-overlay" role="dialog" aria-modal="true" aria-live="assertive">
   <div class="toilet-pause-card">
     <div class="toilet-roll">🧻</div>
     <div class="toilet-big-icon">🚽</div>
     <div class="toilet-kicker">SCHEISSHÄUSCHEN-PAUSE</div>
     <div class="toilet-pause-title">SPIEL PAUSIERT</div>
     <div class="toilet-pauser">${escapeHTML(p.byName||'Ein Spieler')} sitzt gerade auf dem Thron.</div>
     <blockquote class="toilet-quote">„${escapeHTML(p.quote||TOILET_QUOTES[0])}“</blockquote>
     ${mine
       ?`<button class="toilet-resume-btn" onclick="Game.resumeToiletPause()">✅ FORTSETZEN</button><div class="toilet-wait-note">Drück erst, wenn das Geschäft erledigt ist. 😄</div>`
       :`<div class="toilet-waiting"><span>⏳</span><b>Warten auf ${escapeHTML(p.byName||'den Toilettengänger')}</b><small>Das Spiel läuft automatisch weiter, sobald dort „Fortsetzen“ gedrückt wird.</small></div>`}
   </div>
 </div>`
}

function reactionActorIndex(){
 if(!state?.players?.length)return 0;
 if(cloud.enabled){const me=myPlayerIndex();return me>=0?me:state.currentPlayer}
 if(state.players.some(p=>p.isAI)){const human=state.players.findIndex(p=>!p.isAI);return human>=0?human:state.currentPlayer}
 return state.currentPlayer
}
function emojiReactionBarHTML(){
 if(!state)return '';
 return `<div class="emoji-reaction-bar"><span class="emoji-bar-label">REAKTIONEN ›</span><div class="emoji-reaction-list">${EMOJI_REACTIONS.map(e=>`<button type="button" class="emoji-reaction-btn ${e==='HAHA'?'haha-reaction-btn':''} ${e==='HEINZ'?'heinz-reaction-btn':''} ${e==='STROM'?'stromberg-reaction-btn':''}" onclick="Game.sendEmojiReaction('${e}')" title="${e==='STROM'?'Stromberg-inspirierter Bürospruch':e==='HEINZ'?'Heinz-Spruch':e==='HAHA'?'Haha-Sticker':e==='🎁'?'Überraschungsspruch':e+' senden'}" aria-label="${e==='STROM'?'Stromberg-Bürospruch senden':e==='🎁'?'Überraschungsspruch senden':e+' senden'}">${e==='HAHA'?'<span class="haha-mini">HA<br>HA</span>':(e==='HEINZ'?'<span class="heinz-mini"><span>👴</span>HEINZ</span>':e==='STROM'?'<span class="stromberg-mini"><span class="stromberg-avatar-mini" aria-hidden="true"></span><strong>CHEF</strong><em>STROM</em></span>':e==='🎁'?'<span class="surprise-mini"><span>🎁</span><em>WOW</em></span>':e)}</button>`).join('')}</div></div>`
}
function sendEmojiReaction(emoji){
 if(!state||!EMOJI_REACTIONS.includes(emoji))return;
 const actor=reactionActorIndex();
 if(actor<0||actor>=state.players.length)return;
 const prevHeinz=(state?.reactionFeed||[]).slice().reverse().find(x=>x?.emoji==='HEINZ')?.text||'';
 const prevSurprise=(state?.reactionFeed||[]).slice().reverse().find(x=>isSurpriseReaction(x?.emoji))?.text||'';
 const quoteIndex=emoji==='STROM'?nextStrombergQuoteIndex():-1;
 const surpriseText=emoji==='🎁'?randomSurpriseQuote(prevSurprise):'';
 const wireEmoji=quoteIndex>=0?`SB${String(quoteIndex).padStart(2,'0')}`:(emoji==='🎁'?'SURP':emoji);
 const r={id:uid(),actor,emoji:wireEmoji,ts:Date.now(),text:emoji==='HEINZ'?randomHeinzQuote(prevHeinz):quoteIndex>=0?STROMBERG_QUOTES[quoteIndex]:surpriseText};
 showEmojiReaction(r);
 if(cloud.enabled&&cloud.room){
   fetchJSON(`${CLOUD_BASE}/skyjo/${encodeURIComponent(cloud.room)}/reaction`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r),timeoutMs:8000}).then(({r:resp,j})=>{if(resp?.ok&&j?.reactionSeq)cloud.reactionSeq=Math.max(Number(cloud.reactionSeq||0),Number(j.reactionSeq||0))}).catch(e=>console.warn('[skyjo reaction]',e));
   return;
 }
 if(!Array.isArray(state.reactionFeed))state.reactionFeed=[];
 state.reactionFeed.push(r);
 if(state.reactionFeed.length>24)state.reactionFeed=state.reactionFeed.slice(-24);
 save()
}
function showEmojiReaction(r){
 if(!r?.id||emojiReactionSeen.has(r.id))return;
 emojiReactionSeen.add(r.id);
 if(emojiReactionSeen.size>120){const first=emojiReactionSeen.values().next().value;emojiReactionSeen.delete(first)}
 const isHaha=r.emoji==='HAHA';
 const isHeinz=r.emoji==='HEINZ';
 const isStromberg=isStrombergReaction(r.emoji);
 const isSurprise=isSurpriseReaction(r.emoji);
 if(isHeinz){
   showTableAnnouncement({kind:'heinz',icon:'👴',title:'HEINZ · ZUFALLSSPRUCH',text:r.text||randomHeinzQuote(),by:state?.players?.[Number(r.actor)]?.name||''},TABLE_MESSAGE_MS);
   haptic(7);
   return
 }
 if(isStromberg){
   const index=Number(String(r.emoji).slice(2));
   const quote=r.text||STROMBERG_QUOTES[index]||STROMBERG_QUOTES[0];
   showTableAnnouncement({kind:'stromberg',icon:'👔',title:'STROMBERG · BÜROSPRÜCHE',text:'„'+quote+'“',by:state?.players?.[Number(r.actor)]?.name||''},TABLE_MESSAGE_MS);
   haptic(7);
   return
 }
 if(isSurprise){
   showTableAnnouncement({kind:'surprise',icon:'🎁',title:'ÜBERRASCHUNG',text:r.text||randomSurpriseQuote(),by:state?.players?.[Number(r.actor)]?.name||''},TABLE_MESSAGE_MS);
   haptic(7);
   return
 }
 const fx=document.createElement('div');
 fx.className=`emoji-reaction-fx global ${isHaha?'haha-sticker-fx':''}`;
 if(isHaha)fx.textContent='HAHA!';
 else fx.textContent=r.emoji;
 document.body.appendChild(fx);
 haptic(7);
 setTimeout(()=>fx.classList.add('show'),20);
 const perf=uiPrefs.performance!==false;
 const leaveMs=perf?850:1250;
 const removeMs=perf?1250:1850;
 setTimeout(()=>fx.classList.add('leave'),leaveMs);
 setTimeout(()=>fx.remove(),removeMs)
}
function runEmojiReactions(){
 const list=state?.reactionFeed||[],now=Date.now();
 for(const r of list){
   if(!r?.id||emojiReactionSeen.has(r.id))continue;
   if(now-Number(r.ts||0)>9000){emojiReactionSeen.add(r.id);continue}
   showEmojiReaction(r)
 }
}
function gameView(){
 const discardView=visualDiscardState(),topDiscard=discardView.top,discardCount=discardView.count,discardPending=discardView.pending,specials=jokerSpecialsEnabled(),buriedCount=state.removedCards?.length||0;
 const canDirect=!toiletPauseActive()&&ui.mode==='turnChoice'&&(!cloud.enabled||isMyActorDevice())&&!motionBusy;
 const canDropHeld=!toiletPauseActive()&&ui.mode==='drawnDecision'&&ui.data?.card&&(!cloud.enabled||isMyActorDevice())&&!motionBusy&&!discardPending&&!isAIActor();
 const actorPhase=state.phase==='play'||state.phase==='initialReveal';const turnLabel=!actorPhase?(state.phase==='roundReveal'?'🔄 Rundenabschluss':state.phase==='betweenRounds'?'📊 Runde beendet':state.phase==='gameOver'?'🏆 Spiel beendet':'☁ Synchronisiert'):(isMyActorDevice()?'🟢 Dein Zug':'⏳ Warten');const mp=cloud.enabled?`<div class="multiplayer-bar"><b>☁ Raum ${escapeHTML(cloud.room)} · ${escapeHTML(cloud.myName||'Spieler')}</b><span class="turn-state-pill ${actorPhase&&isMyActorDevice()?'mine':''}">${turnLabel}</span></div>`:'';
 const deckClick=canDirect?'onclick="Game.drawFromDeck()" role="button" tabindex="0"':'';
 const discardTakeClick=canDirect&&topDiscard&&!discardPending?'onclick="Game.drawFromDiscard()" role="button" tabindex="0"':'';
 const discardDropClick=canDropHeld?'onclick="Game.discardDrawn()" role="button" tabindex="0" title="Gezogene Karte hier ablegen"':'';
 const discardClick=discardDropClick||discardTakeClick;
 const discardClass=canDropHeld?'discard-drop-target enabled':(discardTakeClick?'enabled':'');
 const discardTip=discardPending?'landet …':(canDropHeld?'🗑 HIER ABLEGEN':(discardTakeClick?'Nehmen':'Ablage'));
 const playArea=`<div class="pile-row premium-piles"><div class="pile-unit"><span class="pile-overline">NACHZIEHEN</span><div id="play-deck-pile" class="pile-card-hit ${canDirect?'enabled':''}" ${deckClick}><span class="pile-count-chip">${state.playDeck.length}</span>${cardHTML({type:'number',value:0,faceUp:false},false,canDirect)}<span class="pile-tip">${canDirect?'Ziehen':'Nachziehstapel'}</span></div></div><div class="pile-unit"><span class="pile-overline">ABLAGE</span><div id="play-discard-pile" class="pile-card-hit ${discardClass} ${buriedCount?'has-buried':''}" ${discardClick} data-buried="${buriedCount}"><span class="pile-count-chip discard-count">${discardCount}</span>${cardHTML(topDiscard,true,!!discardClick)}${buriedCount?`<span class="buried-mini">${buriedCount} gesperrt darunter</span>`:''}<span class="pile-tip">${discardTip}</span></div></div></div>`;
 const actionArea=specials?`<div class="pilebox action-pilebox action-only-ui"><div class="section-heading"><span class="section-icon">⚡</span><div><h4>Aktionskarten</h4><small>Offen oder verdeckt antippen</small></div></div><div class="market">${actionBlindStackHTML(canDirect)}${state.market.map((a,i)=>a?`<div id="market-${i}" class="market-hit ${canDirect?'enabled':''}" ${canDirect?`onclick="Game.takeActionMarket(${i},false)" role="button" tabindex="0"`:''}>${actionHTML(a,canDirect)}</div>`:'').join('')}</div><div class="count">Aktionsstapel ${state.actionDeck.length} · Ablage ${state.actionDiscard.length}</div></div>`:'';
 const centerTable=`<section class="panel center-table ${specials?'':'specials-off'}"><div class="handbox">${handZoneHTML()}</div><div class="pilebox play-pilebox"><div class="section-heading"><span class="section-icon">🎴</span><div><h4>Spielkarten</h4><small>Direkt antippen</small></div></div>${playArea}<div class="count">${state.playDeck.length} im Stapel · ${discardCount} ziehbare Ablagekarte${discardCount===1?'':'n'}${buriedCount?` · ${buriedCount} gesperrt darunter`:''}${discardPending?' · Karte unterwegs':''}</div></div>${actionArea}</section>`;
 const playersHTML=state.players.map(playerHTML);
 const boards=(()=>{
 // Reference layout: the local player's board always occupies the large bottom seat.
 // Other players are placed clockwise in the four corners; unused seats remain dim.
 const own=preferredViewPlayerIndex();
 const others=state.players.map((_,i)=>i).filter(i=>i!==own);
 const seat=(index,label)=>index<others.length
  ?`<div class="sky-reference-seat sky-reference-${label}">${playersHTML[others[index]]}</div>`
  :`<div class="sky-reference-seat sky-reference-${label} sky-reference-empty" aria-label="Freier Spielerplatz"><span>Freier Platz</span></div>`;
 const standings=state.players.map((p,i)=>({name:p.name,total:Number(p.total)||0,index:i})).sort((a,b)=>a.total-b.total);
 const duoReference=state.players.length===2&&selectedSkyBoard==='illustrated';
 const duoControls=duoReference?`<nav class="sky-duo-controls" aria-label="Kartenaktionen">
 <button type="button" class="sky-duo-control draw" ${canDirect?'onclick="Game.drawFromDeck()"':''} ${canDirect?'':'disabled'}><span>🃏</span><b>Karte ziehen</b><small>Vom Nachziehstapel</small></button>
 <button type="button" class="sky-duo-control discard" ${discardClick||''} ${discardClick?'':'disabled'}><span>🎴</span><b>Karte ablegen</b><small>${canDropHeld?'Gezogene Karte ablegen':'Ablagestapel verwenden'}</small></button>
 <button type="button" class="sky-duo-control special" onclick="document.querySelector('.sky-reference-layout .action-pilebox')?.scrollIntoView({behavior:'smooth',block:'center'})" ${specials?'':'disabled'}><span>⚡</span><b>Aktion</b><small>Spezialkarten nutzen</small></button>
 </nav>`:'';
 const scoreboard=`<aside class="sky-reference-sidebar" aria-label="Zwischenstände und Spielinformationen">
 <section class="sky-reference-info"><h3>🏆 Zwischenstände</h3><div class="sky-reference-score-head"><span>Spieler</span><span>Gesamt</span></div>
 ${standings.map((p,i)=>`<div class="sky-reference-score-row ${p.index===own?'sky-reference-score-me':''}"><span>${i+1}. ${escapeHTML(p.name)}</span><strong>${p.total}</strong></div>`).join('')}</section>
 <section class="sky-reference-info"><h3>📋 Aktuelle Runde</h3>
 <p>🎯 ${escapeHTML(state.players[actorIndex()]?.name||'Spieler')} ist am Zug</p>
 <p>🃏 Nachziehstapel: ${state.playDeck.length} Karten</p>
 <p>🔄 Runde ${state.round} · Ziel ${state.target}</p>
 <p>⭐ SKYJO Action</p></section></aside>`;
 return `<div class="table-area sky-reference-layout" data-sky-seats="${state.players.length}"><div class="sky-reference-center">${centerTable}</div>${seat(0,'tl')}${seat(1,'tr')}${seat(2,'bl')}${seat(3,'br')}<div class="sky-reference-own">${playersHTML[own]||''}</div>${scoreboard}${duoControls}</div>`;
})();
 const boardsWithMessage=boards.replace(/<\/div>\s*$/,tableMessageZoneHTML()+'</div>');
 const closing=state.phase==='roundReveal'?`<div class="round-close-banner ${escapeHTML(state.roundClose?.stage||'reveal')}"><span>${state.roundClose?.stage==='remove'?'✨':state.roundClose?.stage==='ready'?'📊':'🔄'}</span><div><b>${state.roundClose?.stage==='remove'?'Kombinationen werden punkteschonend geprüft':state.roundClose?.stage==='ready'?'Aufdecken abgeschlossen':'Rundenende · alle Karten werden aufgedeckt'}</b><small>${state.roundClose?.stage==='remove'?`${state.roundClose?.removedGroups||0} entfernt · ${state.roundClose?.keptBetterGroups||0} bewusst behalten`:state.roundClose?.stage==='ready'?'Punktewertung startet gleich':`${state.roundClose?.revealIndex||0}/${state.roundClose?.revealOrder?.length||0} verdeckte Karten`}</small></div></div>`:'';
 const scoreCurtain=['roundReveal','scoring','scoringSequence'].includes(state.phase)?`<div class="sky-score-privacy-curtain" aria-live="polite"><div class="sky-score-privacy-core"><span>✦</span><strong>PUNKTEABRECHNUNG</strong><small>Die Karten werden für die Auszählung vorbereitet …</small></div></div>`:'';
 return `${mp}${closing}${scoreCurtain}<div class="luxe-tool-dock" aria-label="Spiel-Extras">${toiletPauseButtonHTML()}${jokeSideButtonHTML()}${bibleSideButtonHTML()}</div><div class="status premium-status"><div class="stat round-stat" data-icon="◷"><b>${state.round}</b><span>${state.streetModeEnabled===true?'🔢 Straßen + Gleiche · Runde':'Runde'}</span></div><div class="stat turn-stat" data-icon="●"><b>${escapeHTML(current().name)}</b><span>${['roundReveal','scoring','scoringSequence'].includes(state.phase)?'Rundenende':'am Zug'}</span></div><div class="stat deck-stat" data-icon="▤"><b>${state.playDeck.length}</b><span>Nachziehstapel</span></div><div class="stat target-stat" data-icon="◎"><b>${state.target}</b><span>Spielende ab</span></div><div class="stat joker-stat joker-stat-manage" data-icon="★" onclick="Game.showJokerCountManager()" role="button" tabindex="0" title="Jokeranzahl im laufenden Spiel erhöhen oder verringern"><b>${state.jokerCount??8} · ${specials?'AN':'AUS'}</b><span>Joker · antippen zum Ändern</span></div></div>${boardsWithMessage}<div class="bottom-actions"><div class="bottom-inner"><div class="instruction">${instructionText()}</div><div class="action-buttons">${bottomButtons()}</div>${emojiReactionBarHTML()}</div></div><div class="motion-status-pill"><i></i><span id="motionStatusText">Kartenbewegung läuft …</span></div>${toiletPauseOverlayHTML()}` }

function resumeTransientFlow(){
 if(!state||isModalOpen()||toiletPauseActive())return;
 if(ui.mode==='matchReady'){state.pendingMatch=null;ui={mode:'turnChoice',data:{},selected:[]};save();render();return}
 if(!canControlFlow())return;
 if(ui.mode==='draw3Choose'){setTimeout(showDraw3Modal,40);return}
 if(ui.mode==='enlightSelect'){if(ui.data?.viewed){const pi=Number(ui.data.pi),code=ui.data.code,p=state.players[pi],cards=lineIndexes(code).map(i=>p.grid[i]).filter(Boolean);modal(`<h3>Nur ${escapeHTML(current().name)} schauen</h3><p>${escapeHTML(p.name)} · ${code[0]==='r'?'Reihe':'Spalte'} ${Number(code.slice(1))+1}</p><div class="pile-row">${cards.map(c=>cardHTML(c,true,false)).join('')}</div><div class="modal-actions"><button class="primary" onclick="Game.finishEnlightenment()">Fertig</button></div>`,false)}else setTimeout(showEnlightenmentSetupModal,40);return}
 if(ui.mode==='reactivate'){setTimeout(showReactivationModal,40);return}
 if(ui.mode==='otherSwapSetup'){setTimeout(showOtherSwapSetupModal,40);return}
 if(ui.mode==='thiefSelect'){setTimeout(showThiefModal,40);return}
 if(ui.mode==='ownSwapSelect'&&ui.selected?.length===2){setTimeout(ownSwapOrientation,40);return}
 if(ui.mode==='otherSwapSelect'&&ui.selected?.length===2){setTimeout(otherSwapOrientation,40);return}
 if(ui.mode==='starChoice'){setTimeout(showStarChoice,40);return}
}
function render(){if(state?.pendingMatch)state.pendingMatch=null;if(ui.mode==='matchReady')ui={mode:'turnChoice',data:{},selected:[]};
const viewportLock=captureViewportLock();
if(motionBusy&&state?.phase==='play'&&ui.mode==='turnChoice'){const latest=state?.motionFeed?.[state.motionFeed.length-1];if(!latest||Number(latest.actor)!==Number(state.currentPlayer))unlockMotion(false)}const app=$('#app');let content;if(cloud.enabled&&isRoomDoc(cloud.doc)&&!cloud.doc.game)content=lobbyView();else if(!state)content=setupView();else content=gameView();app.innerHTML=`<div class="topbar"><div class="brand"><div class="brandmark"></div><div class="brand-copy"><h1>SKYJO <span style="color:var(--accent)">ACTION</span></h1><div class="brand-subline"><small>V15.49 · Joker-Straßen</small><span class="edition-chip">ROYAL TABLE</span></div></div></div><div class="top-actions">${cloudBadgeHTML()}${state?'<button class="iconbtn focus-btn" onclick="Game.focusMyBoard()" title="Zu meinem Feld">🎯</button>':''}<button class="iconbtn utility-btn" onclick="Game.refreshPage()" title="Seite komplett aktualisieren"><span class="utility-ico">🔄</span><b>Aktualisieren</b></button><button class="iconbtn utility-btn" onclick="Game.backToLobby()" title="Zurück zur Start-Lobby"><span class="utility-ico">🏠</span><b>Lobby</b></button><button id="soundBtn" class="iconbtn sound-btn" onclick="Game.toggleSound()" title="Sound">${uiPrefs.sound?'🔊':'🔇'}</button><button id="fullscreenBtn" class="iconbtn fs-btn" onclick="Game.toggleFullscreen()" title="Vollbild">⛶</button><button class="iconbtn" onclick="Game.showDisplaySettings()" title="Darstellung">⚙</button><button class="iconbtn" onclick="Game.showRules()" title="Regeln">📖</button>${state?'<button class="iconbtn" onclick="Game.showLog()" title="Spielverlauf">🧾</button><button class="iconbtn" onclick="Game.restart()" title="Neu starten">↻</button>':''}</div></div>${state?'<div class="skyjo-hub-strip"><button type="button" class="skyjo-hub-link" onclick="Game.toGameHub()" title="Zu allen vier Spielen">🏠 Zur Spielauswahl</button></div>':''}${content}`;restoreViewportLock(viewportLock);if(!state&&!isRoomDoc(cloud.doc))setTimeout(()=>{updateNames();toggleCloudFields();toggleJokerSpecialUI()},0);syncBodyMode();if(state){save();runWatchFx();runEmojiReactions();syncGameJoke();syncBibleVerse();syncTableAnnouncementMount();maybeStartRoundClose();maybeStartScoreSequence();if((state.phase==='betweenRounds'||state.phase==='gameOver')&&state.lastRoundSummary)setTimeout(maybeShowRoundSummary,80);setTimeout(resumeTransientFlow,70);setTimeout(syncGameAnnouncements,35);scheduleAIIfNeeded()}}
function cancelActionChoice(){ui={mode:'turnChoice',data:{},selected:[]};render()}
function escapeHTML(s){return String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}

// Sicherheitsnetz: Browser-Tab-Wechsel oder unterbrochene Animationen dürfen das Spiel nie blockieren.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&motionBusy&&!motionQueueBusy&&motionBusyUntil&&Date.now()>motionBusyUntil)unlockMotion(true)});
window.addEventListener('pageshow',()=>{if(motionBusy&&!motionQueueBusy)unlockMotion(true)});
window.Game={render,updateNames,startFromSetup,startAIFromSetup,resumeLocalGame,selectCard,drawFromDeck,drawFromDiscard,keepDrawn,discardDrawn,takeActionMarket,takeActionBlind,chooseActionTurn,selectActionCard,confirmPlayAction,confirmDiscardAction,finishOwnSwap,draw3Pick,draw3None,showEnlightenment,finishEnlightenment,reactivate,beginOtherSwapSelection,finishOtherSwap,thiefPick,chooseMatch,skipOptionalMatches,closeModal,showRules,showLog,restart,nextRound,returnFinishedGameToRoomLobby,cancelActionChoice,loadCloudRoom,resetOnlineClient,generateCloudRoom,toggleCloudFields,createOnlineRoom,joinOnlineRoom,startOnlineGame,leaveOnlineRoom,refreshPage,backToLobby,toGameHub,toggleFullscreen,toggleSound,toggleHaptic,toggleCinematic,toggleAutoFocus,togglePerformance,focusMyBoard,showDisplaySettings,showJokerCountManager,addJokersToGame,adjustJokersInGame,setMotionLevel,resolveBoardMatch,continueMatchReady,maybeShowMatchPrompt,maybeShowRoundSummary,openRoyalRoundSummary,openRoyalFinaleSummary,showRoundOverview,setRoundSummaryFocus,showFinaleDetails,toggleJokerSpecialUI,toggleStreetModeUI,selectSetupMode,sendEmojiReaction,pauseForToilet,resumeToiletPause,tellRandomJoke,showRandomBibleVerse};

window.addEventListener('pageshow',e=>{
 if(!e.persisted)return;
 try{
   closeModal();
   document.querySelectorAll('.score-sequence-overlay,.finale-confetti,.game-fx,.fx-spark,.game-announcement,.joke-popup,.bible-popup').forEach(el=>el.remove())
 }catch(_e){}
 roundSummarySeen='';scoreSequenceSeen='';
 if(cloud.enabled&&cloud.room){
   state=null;ui={mode:'none',data:{},selected:[]};render();restoreOnlineRoom()
 }else if(state?.phase==='gameOver'){
   state=null;ui={mode:'none',data:{},selected:[]};render()
 }
});
window.addEventListener('beforeunload',()=>{try{if(state)save();flushLocalSaveNow()}catch(_e){}});
document.addEventListener('fullscreenchange',syncFullscreenState);
document.addEventListener('webkitfullscreenchange',syncFullscreenState);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&(isFullscreen()||pseudoFullscreen))requestWakeLock()});
window.addEventListener('resize',()=>{syncChromeButtons();positionTableAnnouncementZone()},{passive:true});
let tableMessageScrollFrame=0;
window.addEventListener('scroll',()=>{
 if(!currentTableAnnouncement||tableMessageScrollFrame)return;
 tableMessageScrollFrame=requestAnimationFrame(()=>{tableMessageScrollFrame=0;positionTableAnnouncementZone()})
},{passive:true});
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;const k=String(e.key||'').toLowerCase();if(k==='f'){e.preventDefault();toggleFullscreen();return}if(k==='s'){e.preventDefault();showDisplaySettings();return}if(k==='m'&&state){e.preventDefault();focusMyBoard();return}if(k==='l'&&state){e.preventDefault();showLog();return}if(!state||!isMyActorDevice())return;if(k==='d'&&ui.mode==='turnChoice'){e.preventDefault();drawFromDeck()}else if(k==='a'&&ui.mode==='turnChoice'){e.preventDefault();drawFromDiscard()}});

cloudConfigLoad();
async function bootSharedHubSkyjo(){
  // The Firebase profile scripts are loaded with defer; wait for their account state.
  cloud.enabled=true;cloud.room=SKYJO_HUB_GAME;cloud.doc=null;cloud.rev=0;
  document.getElementById('app').innerHTML='<div class="panel lobby-card"><h2>🃏 SKYJO Action</h2><p>Verbindung zur gemeinsamen Spiele-Lobby wird hergestellt …</p></div>';
  let user=null;
  for(let i=0;i<80;i++){
    const profile=window.SpielOnline?.state?.();
    if(profile?.status==='online'&&profile?.user){user=profile.user;break;}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  if(!user){
    document.getElementById('app').innerHTML='<div class="panel lobby-card"><h2>Online-Anmeldung fehlt</h2><p>Bitte mit deinem Spielerprofil anmelden und die Partie erneut öffnen.</p><button onclick="Game.toGameHub()">Zur gemeinsamen Lobby</button></div>';
    return;
  }
  try{
    const token=await user.getIdToken();
    const res=await fetch(CLOUD_BASE+'/api/hub/rooms/'+encodeURIComponent(SKYJO_HUB_CODE)+'/skyjo-bootstrap',{
      method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({matchId:SKYJO_HUB_MATCH}),cache:'no-store'});
    const payload=await res.json();
    if(!res.ok||!payload.ok||payload.gameCode!==SKYJO_HUB_GAME||payload.matchId!==SKYJO_HUB_MATCH)
      throw Error(payload.error||'MATCH_NOT_FOUND');
    cloud.deviceId=payload.seatId;
    cloud.myName=window.SpielOnline?.state?.()?.profile?.name||user.email||'Spieler';
    switchCloudRoomContext(payload.gameCode);cloud.enabled=true;
    cloudConfigSave();
    if(!isRoomDoc(payload.roomState))throw Error('SKYJO_ROOM_INVALID');
    applyCloudDoc(payload.roomState,payload.rev);
    startCloudPolling();
    if(payload.host&&!cloud.doc.game){
      // One server-assigned host launches the pre-configured game, never opens another room.
      setTimeout(()=>{if(SKYJO_IN_HUB&&isRoomDoc(cloud.doc)&&cloud.doc.lobby.status==='lobby')void startOnlineGame();},180);
    }
  }catch(e){
    console.error('[SKYJO hub bootstrap]',e);
    document.getElementById('app').innerHTML='<div class="panel lobby-card"><h2>Verbindung fehlgeschlagen</h2><p>Die SKYJO-Partie konnte nicht geladen werden ('+escapeHTML(e.message||'Unbekannter Fehler')+').</p><button onclick="Game.toGameHub()">Zur gemeinsamen Lobby</button></div>';
  }
}
if(SKYJO_IN_HUB){cloud.enabled=true;cloud.room=SKYJO_HUB_GAME;}
let skipResume=false;try{skipResume=sessionStorage.getItem(SKIP_RESUME_KEY)==='1'}catch(_e){}

let saved=!cloud.enabled&&!skipResume&&!SKYJO_NEW_ENTRY?load():null;
/* Abgeschlossene lokale Partien sind Historie, kein fortsetzbarer Spielstand.
   Sonst kann die Siegerliste beim nächsten Öffnen sofort wieder erscheinen. */
if(saved?.phase==='gameOver'){
  try{localStorage.removeItem(SAVE_KEY)}catch(_e){}
  saved=null;
  state=null;
  ui={mode:'none',data:{},selected:[]};
  roundSummarySeen='';
  scoreSequenceSeen=''
}
if(saved){state=saved;ui=restorePlayUIFromState();}

try{
  closeModal();
  document.querySelectorAll('.score-sequence-overlay,.finale-confetti,.game-fx,.fx-spark,.game-announcement,.joke-popup,.bible-popup').forEach(el=>el.remove())
}catch(_e){}

if(!SKYJO_IN_HUB)render();
if(SKYJO_IN_HUB)void bootSharedHubSkyjo();
else if(cloud.enabled&&cloud.room&&!SKYJO_NEW_ENTRY){restoreOnlineRoom()}
})();
