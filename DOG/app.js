import {createGame,exchangeCard,legalActions,takeAction,cancelSeven,botAction,COLORS} from './engine.js';

const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='spielportal:dog:local-v1';
const names=['Rot','Blau','Grün','Gelb'];
let game,selectedCard=null,available=[],revealed=false,aiTimer=null,lastTurn=null,humans=1;
const cardsLabel=t=>t==='swap'?'⇄':t==='joker'?'★':t==='1/11'?'1/11':t;
function recover(){
  try{
    const g=JSON.parse(localStorage.getItem(KEY));
    if(g?.schemaVersion===1&&g.ruleset==='classic-dog'&&Array.isArray(g.pieces)&&g.pieces.length===16&&g.players?.length===4&&Array.isArray(g.hands)&&g.hands.length===4){game=g;humans=g.players.filter(x=>!x.bot).length;return true;}
  }catch(_){}
  return false;
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(game));}catch(_){}}
function newGame(){
  if(aiTimer){clearTimeout(aiTimer);aiTimer=null;}
  humans=Number($('human-count').value)||1;
  game=createGame({names:['Du','Spieler Blau','Spieler Grün','Spieler Gelb'],bots:[0,1,2,3].map(i=>i>=humans)});
  revealed=false;selectedCard=null;lastTurn=null;
  save();render();scheduleAI();
}
function isHumanExchange(){
  if(game.phase!=='exchange')return -1;
  return game.players.findIndex(p=>!p.bot&&game.exchanges[p.seat]===null);
}
function currentHuman(){
  if(game.phase==='exchange')return isHumanExchange();
  if(game.phase==='play'||game.phase==='seven')return game.players[game.current].bot?-1:game.current;
  return -1;
}
function activeSeat(){
  if(game.phase==='exchange')return isHumanExchange();
  return game.current;
}
function boardPoint(index){
  const unit=580/16;
  if(index<16)return {x:90+index*unit,y:90};
  if(index<32)return {x:670,y:90+(index-16)*unit};
  if(index<48)return {x:670-(index-32)*unit,y:670};
  return {x:90,y:670-(index-48)*unit};
}
function goalPoint(owner,idx){
  const t=202+idx*42;
  return [{x:t,y:t},{x:760-t,y:t},{x:760-t,y:760-t},{x:t,y:760-t}][owner];
}
function homePoint(owner,index){
  const c=[[235,140],[525,140],[525,620],[235,620]][owner];
  return {x:c[0]+(index%2?22:-22),y:c[1]+(index>1?22:-22)};
}
function piecePoint(piece){
  if(piece.place==='track')return boardPoint(piece.pos);
  if(piece.place==='goal')return goalPoint(piece.owner,piece.pos);
  return homePoint(piece.owner,piece.id%4);
}
function escapeAttr(s){return escape(s);}
function drawBoard(){
  let html='<defs><linearGradient id="table" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#254456"/><stop offset=".5" stop-color="#132c3f"/><stop offset="1" stop-color="#132235"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="7"/></filter></defs>';
  html+='<rect x="9" y="9" width="742" height="742" rx="35" fill="url(#table)" stroke="#a68a5a" stroke-width="12"/>';
  html+='<rect x="32" y="32" width="696" height="696" rx="22" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="3"/>';
  for(let seat=0;seat<4;seat++){
    const color=COLORS[seat];
    const start=boardPoint(seat*16),goal=goalPoint(seat,3);
    html+='<path d="M '+start.x+' '+start.y+' L '+goal.x+' '+goal.y+'" stroke="'+color+'" stroke-opacity=".25" stroke-width="25" stroke-linecap="round"/>';
    for(let g=0;g<4;g++){
      const p=goalPoint(seat,g);
      html+='<circle cx="'+p.x+'" cy="'+p.y+'" r="18.5" fill="'+color+'" fill-opacity=".18" stroke="'+color+'" stroke-opacity=".75" stroke-width="2.5"/>';
    }
    for(let j=0;j<4;j++){
      const p=homePoint(seat,j);
      html+='<circle cx="'+p.x+'" cy="'+p.y+'" r="18" fill="#05151e" fill-opacity=".55" stroke="'+color+'" stroke-opacity=".6" stroke-width="2"/>';
    }
  }
  for(let i=0;i<64;i++){
    const {x,y}=boardPoint(i),start=i%16===0,seat=Math.floor(i/16);
    html+='<circle cx="'+x+'" cy="'+y+'" r="'+(start?19:15.8)+'" fill="'+(start?COLORS[seat]:'#e0e9ed')+'" fill-opacity="'+(start?'.81':'.90')+'" stroke="'+(start?'#ffffff':'#82a1ae')+'" stroke-width="'+(start?3:1.4)+'"/>';
    if(start)html+='<text x="'+x+'" y="'+(y+5)+'" text-anchor="middle" font-size="12" fill="#07131e" font-weight="900">S</text>';
  }
  html+='<circle cx="380" cy="380" r="51" fill="#081a29" stroke="#d0ab62" stroke-width="3"/><text x="380" y="386" text-anchor="middle" fill="#f6e2af" font-size="30" font-weight="900" letter-spacing="2">DOG</text>';
  const actions=available;
  const targets=new Set(actions.flatMap(m=>[m.pieceId,m.targetId].filter(x=>Number.isInteger(x))));
  for(const p of game.pieces){
    const pt=piecePoint(p),hi=targets.has(p.id),color=COLORS[p.owner];
    if(hi)html+='<circle cx="'+pt.x+'" cy="'+pt.y+'" r="28" fill="'+color+'" fill-opacity=".30" filter="url(#glow)"/>';
    html+='<g class="'+(hi?'can-pick':'')+'" data-piece="'+p.id+'"><circle cx="'+pt.x+'" cy="'+(pt.y+2)+'" r="17.5" fill="#00151c" fill-opacity=".75"/><circle cx="'+pt.x+'" cy="'+pt.y+'" r="15" fill="'+color+'" stroke="'+(hi?'#ffffff':'#172a30')+'" stroke-width="'+(hi?4:2)+'"/><circle cx="'+(pt.x-4)+'" cy="'+(pt.y-5)+'" r="4" fill="#ffffff" fill-opacity=".48"/><text x="'+pt.x+'" y="'+(pt.y+5)+'" text-anchor="middle" fill="#061821" font-size="14" font-weight="900">'+(p.id%4+1)+'</text></g>';
  }
  $('board').innerHTML=html;
}
function actionLabel(m){
  const figure=m.pieceId!==undefined?'Figur '+((m.pieceId%4)+1):'';
  if(m.type==='start')return '🚀 '+figure+' starten';
  if(m.type==='swap')return '🔄 '+figure+' mit '+names[Math.floor(m.targetId/4)]+' '+((m.targetId%4)+1)+' tauschen';
  if(m.type==='emptySwap')return '↔ Tauschkarte ohne Wirkung ablegen';
  if(m.type==='seven')return '🔥 7 Schritte aufteilen';
  if(m.type==='seven-step')return figure+' · '+m.steps+' Schritt'+(m.steps===1?'':'e')+(m.to?.startsWith('goal')?' ins Ziel':'');
  if(m.type==='move')return figure+' · '+Math.abs(m.steps)+' '+(m.steps<0?'rückwärts':'vorwärts')+(m.to?.startsWith('goal')?' ins Ziel':'')+(m.captures?.length?' · '+m.captures.length+' geschlagen':'');
  return 'Karte spielen';
}
function renderPlayers(){
  const seats=game.players.map(p=>{
    const own=game.pieces.filter(x=>x.owner===p.seat),goal=own.filter(x=>x.place==='goal').length,turn=activeSeat()===p.seat&&game.phase!=='finished';
    const hand=game.hands[p.seat].length,exchange=game.phase==='exchange'&&game.exchanges[p.seat]!==null;
    return '<div class="seat '+(turn?'on':'')+'" style="--seat:'+COLORS[p.seat]+'"><span class="seat-mark"></span><span class="seat-name">'+escape(p.name)+(p.bot?' 🤖':' 👤')+'</span><b>'+goal+'/4</b><span class="seat-extra">'+(exchange?'✓ Karte getauscht':hand+' Karten')+'</span></div>';
  }).join('');
  $('players').innerHTML=seats;
}
function renderHand(){
  const seat=currentHuman(),title=$('hand-title'),hand=$('hand'),actions=$('moves'),button=$('show-hand');
  actions.innerHTML='';hand.innerHTML='';
  if(game.phase==='finished'){title.textContent='🏆 Partie beendet';button.hidden=true;return;}
  if(seat<0){title.textContent='🤖 Bots spielen';button.hidden=true;return;}
  if(lastTurn!==seat){revealed=false;selectedCard=null;lastTurn=seat;}
  button.hidden=false;button.textContent=revealed?'🙈 Hand verdecken':'🃏 Karten ansehen';
  title.textContent=game.phase==='exchange'?'🔐 '+game.players[seat].name+': Karte an Partner geben':game.phase==='seven'?'🔥 Die 7 verteilen – noch '+(7-game.seven.spent)+' Schritte':'🎯 '+game.players[seat].name+' ist am Zug';
  if(!revealed){hand.innerHTML='<div class="hand-veil">Deine Karten sind verdeckt. Tippe auf „Karten ansehen“.</div>';return;}
  if(game.phase==='seven'){
    available=legalActions(game,seat);
    hand.innerHTML='<div class="hand-veil">Wähle eine Figur und wie viele Schritte sie laufen soll. Alle 7 Schritte müssen verwendet werden.</div>';
    const cancel=document.createElement('button');cancel.className='secondary move-button';cancel.textContent='↶ Sieben zurücknehmen';cancel.addEventListener('click',()=>{game=cancelSeven(game,seat);selectedCard=null;save();render();});actions.appendChild(cancel);
  }else{
    const cards=game.hands[seat];
    const exchange=game.phase==='exchange';
    hand.innerHTML=cards.map((c,i)=>'<button type="button" class="playing-card '+(selectedCard===c.id?'picked ':'')+(c.type==='joker'||['swap','7','4','1/11','13'].includes(c.type)?'special':'')+'" data-card="'+c.id+'"><small>'+(c.type==='joker'?'JOKER':c.type==='swap'?'TAUSCH':'DOG')+'</small><strong>'+cardsLabel(c.type)+'</strong><em>'+(exchange?'weitergeben':(c.type==='7'?'7 teilen':c.type==='swap'?'Tauschen':'Spielen'))+'</em></button>').join('');
    available=exchange?[]:selectedCard!==null?legalActions(game,seat).filter(m=>m.cardId===selectedCard):[];
    if(exchange&&selectedCard!==null){
      available=[{type:'exchange',cardId:selectedCard}];
    }
  }
  if(game.phase==='seven')available=legalActions(game,seat);
  if(available.length>0){
    const unique=available.slice(0,170);
    actions.insertAdjacentHTML('beforeend',unique.map((m,i)=>'<button type="button" class="move-button" data-move="'+i+'">'+escape(actionLabel(m))+'</button>').join(''));
    $('move-help').textContent='Wähle einen erlaubten Zug. Tipp: Die hervorgehobenen Figuren sind spielbar.';
  }else $('move-help').textContent=game.phase==='exchange'?'Wähle eine Karte, die du verdeckt deinem Partner geben möchtest.':'Wähle zuerst eine Karte aus deiner Hand.';
}
function render(){
  if(!game)return;
  $('human-count').value=String(humans);
  $('round').textContent=String(game.round);
  $('phase').textContent=game.phase==='exchange'?'Geheimer Kartentausch':game.phase==='seven'?'7 verteilen':game.phase==='finished'?'Spielende':'Kartenrunde';
  const active=activeSeat();
  $('turn').textContent=game.phase==='finished'?'🏆 Team '+(game.winner===0?'Rot / Grün':'Blau / Gelb')+' gewinnt!':game.phase==='exchange'?'Karten werden getauscht':active>=0?game.players[active].name+' ist dran':'Bots spielen';
  $('history').innerHTML=game.history.map(t=>'<div>'+escape(t)+'</div>').join('');
  renderPlayers();
  available=game.phase==='seven'&&revealed?legalActions(game,game.current):[];
  drawBoard();renderHand();drawBoard();
  $('status').textContent='Klassische Regeln • Teams Rot/Grün und Blau/Gelb • Spielstand wird lokal gesichert';
  $('winner').hidden=game.phase!=='finished';
  if(game.phase==='finished')$('winner-title').textContent='Team '+(game.winner===0?'Rot / Grün':'Blau / Gelb')+' gewinnt!';
  $('selected-info').textContent=selectedCard?'Karte ausgewählt: '+cardsLabel(game.hands[currentHuman()]?.find(c=>c.id===selectedCard)?.type||''):'';
}
function onCard(id){
  const seat=currentHuman();if(seat<0||!revealed)return;
  selectedCard=selectedCard===id?null:id;
  render();
}
function onMove(i){
  const seat=currentHuman();if(seat<0||!revealed)return;
  const move=available[i];if(!move)return;
  try{
    if(game.phase==='exchange')game=exchangeCard(game,seat,move.cardId);
    else game=takeAction(game,seat,move);
    selectedCard=null;revealed=false;lastTurn=null;available=[];save();render();scheduleAI();
  }catch(e){$('status').textContent='⚠️ '+e.message;}
}
function scheduleAI(){
  if(aiTimer){clearTimeout(aiTimer);aiTimer=null;}
  if(!game||game.phase==='finished')return;
  if(game.phase==='exchange'){
    for(let i=0;i<4;i++)if(game.players[i].bot && game.exchanges[i]===null){
      const move=botAction(game,i);if(move){game=exchangeCard(game,i,move.cardId);save();}
    }
    render();
  }
  if((game.phase==='play'||game.phase==='seven')&&game.players[game.current].bot){
    aiTimer=setTimeout(()=>{
      aiTimer=null;
      try{
        const move=botAction(game,game.current);
        if(move)game=takeAction(game,game.current,move);
        else throw Error('Bot findet keinen erlaubten Zug');
        save();render();scheduleAI();
      }catch(e){$('status').textContent='⚠️ Botfehler: '+e.message;}
    },250);
  }
}
$('hand').addEventListener('click',e=>{const btn=e.target.closest('[data-card]');if(btn)onCard(Number(btn.dataset.card));});
$('moves').addEventListener('click',e=>{const btn=e.target.closest('[data-move]');if(btn)onMove(Number(btn.dataset.move));});
$('board').addEventListener('click',e=>{
  const node=e.target.closest('[data-piece]');if(!node)return;
  const id=Number(node.dataset.piece),matches=available.filter(a=>a.pieceId===id);
  if(matches.length===1){onMove(available.indexOf(matches[0]));return;}
  if(matches.length>1){$('move-help').textContent='Für diese Figur gibt es '+matches.length+' Möglichkeiten. Wähle unten den passenden Zug.';document.querySelector('#moves')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
});
$('show-hand').addEventListener('click',()=>{revealed=!revealed;render();});
$('new-game').addEventListener('click',()=>{if(confirm('Neue Partie starten? Der aktuelle Spielstand wird ersetzt.'))newGame();});
$('human-count').addEventListener('change',()=>{if(confirm('Spielerzahl ändern und eine neue Partie beginnen?'))newGame();else $('human-count').value=String(humans);});
$('rules-button').addEventListener('click',()=>{$('rules').showModal();});
$('rules-close').addEventListener('click',()=>{$('rules').close();});
if(!recover())newGame();else{render();scheduleAI();}
