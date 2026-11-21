/**
 * Mission 3: LOCAL prototype for work packages 1–4.
 * Never changes official rooms, campaign progression or real rewards.
 */
import {cardVisual} from '../card-visuals.js?v=11';
import {drawMission3Board} from './mission-3-board.js?v=1';
import {createMission3,mission3LegalMoves,mission3Play,mission3ChooseGrinchMove,mission3SetPreviewStage,mission3NextPreviewDeal,mission3Validate,MISSION3_STAGE_NAMES,MISSION3_COLORS} from './mission-3-rules.js?v=3';
const $=id=>document.getElementById(id),KEY='grinch-m3-local-prototype-v2';
let game=null,chosenCard=null,chosenPiece=null,botTimer=null,busy=false,toastTimer=null;
let myThawResearch=0;
async function loadLocalResearch(){
 const state=window.SpielOnline?.state?.(),user=state?.status==='online'?state.user:null;
 if(!user?.getIdToken)return;
 try{
  const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\\/+$/,'');
  const response=await fetch(base+'/api/hub/dog/research',{cache:'no-store',
   headers:{Authorization:'Bearer '+await user.getIdToken()}});
  const data=await response.json();
  if(response.ok&&data?.ok&&window.SpielOnline?.state?.()?.user?.uid===user.uid){
   myThawResearch=Math.max(0,Math.min(2,Number(data.research?.levels?.thaw)||0));render();
  }
 }catch{myThawResearch=0;}
}
function node(tag,value,parent,cls=''){
 const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;parent.append(el);return el;
}
function toast(msg){
 const el=$('m3-toast');el.textContent=msg;el.classList.add('visible');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2500);
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(game));}catch{toast('Speichern lokal nicht möglich.');}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');return mission3Validate(s)?s:null;}catch{return null;}}
function resetSelection(){chosenCard=game?.seven?.cardId||null;chosenPiece=null;}
function moves(){
 return game&&game.current!==3&&chosenCard
  ?mission3LegalMoves(game).filter(m=>m.cardId===chosenCard):[];
}
function label(m){
 if(m.kind==='emptySwap')return 'Tauschkarte ablegen (keine Tauschfigur verfügbar)';
 const p=game.pieces.find(x=>x.id===m.pieceId),n=p?Number(p.id.slice(1))+1:1;
 if(m.kind==='start')return 'Figur '+n+' auf das Startfeld setzen';
 if(m.kind==='swap'){
  const t=game.pieces.find(x=>x.id===m.targetId);
  return 'Figur '+n+' mit '+game.players[t.owner].name+' Figur '+(Number(t.id.slice(1))+1)+' tauschen';
 }
 return 'Figur '+n+': '+(m.kind==='seven'?'7 teilen – '+m.distance+' Schritte':m.distance<0?Math.abs(m.distance)+' Schritte rückwärts':m.distance+' Schritte vorwärts')+
  (game.hands[game.current].find(c=>c.id===m.cardId)?.type==='joker'?' (Joker als '+m.as+')':'');
}
function render(){
 if(!game)return;
 const stage=game.stageAtDeal;
 $('m3-phase').textContent='Kartenphase '+game.phase+' · Zug '+(game.turn+1);
 $('m3-stage-active').textContent=['🟢 Leicht','🟠 Mittel','🔴 Finale'][stage];
 $('m3-stage-label').textContent=(stage+1)+' · '+MISSION3_STAGE_NAMES[stage];
 $('m3-grinch-per-turn').textContent=(stage+1)+' Grinch-Aktion'+(stage?'en':'');
 $('m3-stage-select').value=String(game.stage);
 const curse=game.lastCurse;
 $('m3-curse-status').textContent=!curse?'🎲 Nach der letzten Handkarte jeder Kartenphase: zufälliger Grinch-Fluch.':
  curse.type==='freeze'?'❄️ Letzter Fluch: '+game.players[curse.owner].name+' Figur '+(Number(curse.pieceId.slice(1))+1)+' wurde zwei eigene Züge eingefroren.':
  curse.type==='knockback'?'💥 Letzter Fluch: '+game.players[curse.owner].name+' Figur '+(Number(curse.pieceId.slice(1))+1)+' wurde '+curse.distance+' Felder zurückgeworfen.':
  '🎲 Letzter Fluch: kein mögliches Ziel.';
 $('m3-turn').textContent=game.current===3?'😈 Grinch spielt '+game.grinchActionsLeft+' Kartenaktion(en)':
  '👑 '+game.players[game.current].name+' ist am Zug'+(game.seven?' · 7: noch '+(7-game.seven.spent)+' Schritte':'');
 const players=$('m3-players');players.replaceChildren();
 for(const user of game.players){
  const pieces=game.pieces.filter(p=>p.owner===user.owner);
  const box=node('div','',players,'m3-player'+(user.owner===game.current?' active':''));
  const head=node('div','',box,'m3-player-top'),tag=node('div','',head,'m3-player-label');
  const dot=node('span','',tag,'m3-player-dot');dot.style.setProperty('--color',MISSION3_COLORS[user.owner]);
  node('span',user.name,tag);if(user.owner===game.current)node('span','👑',head);
  node('small',pieces.filter(p=>p.place==='track').length+'/'+pieces.length+' auf dem Brett · '+
   pieces.filter(p=>p.place==='home').length+' im Haus',box);
  if(user.owner<3){
   const prisoners=pieces.filter(p=>p.place==='captured').length;
   const frozen=pieces.filter(p=>p.frozenTurns>0).length;
   if(prisoners||frozen)node('small',(prisoners?'🔒 '+prisoners+' gefangen':'')+
    (prisoners&&frozen?' · ':'')+(frozen?'❄️ '+frozen+' eingefroren':''),box,'m3-captures');
  }
  node('small','🃏 '+game.hands[user.owner].length+(user.owner===3?' verdeckte':'')+' Karten',box);
 }
 $('m3-own-cards').textContent=game.current===3?'🤖 Grinch · '+game.hands[3].length+' verdeckt':game.hands[game.current].length+' eigene Karten';
 $('m3-draw').textContent=game.draw.length+' Karten';
 $('m3-discard').textContent=game.discard.length+' Karten';
 const top=game.lastPlayedCard;
 $('m3-last').textContent=top===null?'–':top==='swap'?'⇄':top==='joker'?'★':top;
 $('m3-last').title=top?'Zuletzt gespielt: '+top:'Ablagestapel leer';
 const hand=$('m3-hand'),target=$('m3-moves');hand.replaceChildren();target.replaceChildren();
 if(myThawResearch){
  const used=Number.isInteger(game.researchThaws)?game.researchThaws:0;
  node('div','🛡️ Weihnachtsschutz · '+Math.max(0,myThawResearch-used)+' Befreiung(en) übrig. Tippe eine eingefrorene Figur an – auch eine von Freunden.',target,'m3-empty');
 }
 if(game.current===3){
  node('div','🤖 '+game.hands[3].length+' verdeckte Grinch-Handkarten',hand,'m3-empty');
  node('p','😈 Die taktische KI analysiert mögliche Angriffe und plant bis zu drei Kartenaktionen. Sie kennt nur ihre eigene Hand.',target);
 }else{
  if(game.seven)chosenCard=game.seven.cardId;
  for(const c of game.hands[game.current]){
   const btn=document.createElement('button');btn.type='button';
   btn.className='m3-card'+(chosenCard===c.id?' selected':'');
   btn.disabled=busy||(Boolean(game.seven)&&game.seven.cardId!==c.id);
   btn.setAttribute('aria-label','DOG-Karte '+c.type);
   node('span',c.type==='swap'?'⇄':c.type==='joker'?'★':c.type,btn);
   const asset=cardVisual(c.type);
   if(asset.image){
    const img=document.createElement('img');img.alt='';img.loading='eager';
    img.src='../'+asset.image.replace(/^\.\//,'');
    img.onerror=()=>{if(asset.fallbackImage&&!img.dataset.backup){
     img.dataset.backup='1';img.src='../'+asset.fallbackImage.replace(/^\.\//,'');
    }else img.remove();};
    btn.append(img);
   }
   btn.addEventListener('click',()=>{
    if(game.seven)return;
    chosenCard=chosenCard===c.id?null:c.id;chosenPiece=null;render();
   });
   hand.append(btn);
  }
  if(!game.hands[game.current].length)node('div','Keine Karten auf der Hand',hand,'m3-empty');
  if(!chosenCard)node('p','Wähle zuerst eine Handkarte. Dann kannst du eine eigene Figur antippen oder den Zug direkt auswählen.',target);
  else{
   const all=moves(),available=chosenPiece?all.filter(m=>m.pieceId===chosenPiece):all;
   if(!available.length)node('p','Mit dieser Karte ist derzeit kein Zug möglich.',target);
   for(const m of available){
    const b=node('button',label(m),target);b.type='button';b.disabled=busy;
    b.addEventListener('click',()=>play(m));
   }
  }
 }
 const log=$('m3-history');log.replaceChildren();
 for(const message of game.history)node('p',message,log);
 drawMission3Board($('m3-board'),game,{selectedPiece:chosenPiece,onPieceClick:clickPawn});
}
function clickPawn(id){
 if(!game||busy)return;
 const frozen=game.pieces.find(p=>p.id===id&&p.place==='track'&&p.frozenTurns>0);
 if(frozen&&myThawResearch>(game.researchThaws||0)){
  // Mission 3 is a local non-reward prototype: the account determines the
  // rank but all mutations remain local until the online mission exists.
  frozen.frozenTurns=0;
  game.researchThaws=(game.researchThaws||0)+1;
  game.revision=(game.revision||0)+1;
  game.history=['🛡️ Weihnachtsschutz befreit '+game.players[frozen.owner].name+' Figur '+(Number(id.slice(1))+1)+'.',...game.history].slice(0,12);
  save();render();toast('🛡️ Eingefrorene Figur sofort befreit!');return;
 }
 if(game.current===3)return;
 const opts=moves();
 if(chosenPiece){
  const hits=opts.filter(x=>x.pieceId===chosenPiece&&x.targetId===id);
  if(hits.length===1){play(hits[0]);return;}
 }
 const available=opts.filter(x=>x.pieceId===id);
 if(!available.length){toast('Wähle eine passende Karte und eine spielbare Figur.');return;}
 chosenPiece=id;render();
 if(available.length===1)play(available[0]);
}
function bot(){
 clearTimeout(botTimer);
 if(!game||game.current!==3)return;
 busy=true;render();
 botTimer=setTimeout(()=>{
  try{
   const selected=mission3ChooseGrinchMove(game);
   if(!selected)throw Error('Keine gültige Grinch-Kartenaktion');
   game=mission3Play(game,3,selected);resetSelection();save();
   busy=false;render();
   if(game.current===3)bot();
  }catch(e){busy=false;toast('Grinch-Testzug: '+e.message);render();}
 },520);
}
function play(m){
 if(!game||busy||game.current===3)return;
 try{
  game=mission3Play(game,game.current,m);resetSelection();save();render();
  if(game.current===3)bot();
 }catch(e){toast(e.message);}
}
$('m3-change-stage').addEventListener('click',()=>{
 if(!game||busy)return;
 game=mission3SetPreviewStage(game,Number($('m3-stage-select').value));
 save();render();toast('Stufe gespeichert. Neue Grinch-Karten erst ab der nächsten Verteilung.');
});
$('m3-next-deal').addEventListener('click',()=>{
 if(!game||busy)return;
 try{
  game=mission3NextPreviewDeal(game);resetSelection();save();render();
  toast('Neue Kartenphase: Grinch '+game.hands[3].length+' Karten.');
 }catch(e){toast(e.message);}
});
$('m3-new').addEventListener('click',()=>{
 if(busy||!confirm('Neuen lokalen Spieltest beginnen?'))return;
 clearTimeout(botTimer);try{localStorage.removeItem(KEY);}catch{}
 game=null;chosenCard=null;chosenPiece=null;
 $('m3-setup').showModal();
});
$('m3-start').addEventListener('click',()=>{
 const names=[0,1,2].map(i=>$('m3-name-'+i).value.trim()||['Rot','Blau','Gelb'][i]);
 try{
  game=createMission3(undefined,names);resetSelection();save();
  $('m3-setup').close();render();if(game.current===3)bot();
  toast('🎮 Mission 3 – lokaler Test gestartet.');
 }catch(e){toast(e.message);}
});
window.addEventListener('spielonline-change',()=>{myThawResearch=0;void loadLocalResearch()});
void loadLocalResearch();
game=load();
if(game){render();if(game.current===3)bot();}
else $('m3-setup').showModal();
