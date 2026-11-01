/** Eier-Chaos offline view. Shared engine owns rules; this view owns animation and pointer input only. */
import {eggAt,EGG_COUNT} from './game.js';
export function mount(container,host){
 const style=document.createElement('style');
 style.textContent=`#egg-shell .egg-broken{position:absolute;font-size:clamp(15px,2.6vw,27px);line-height:1;pointer-events:none;opacity:.9;z-index:1}#egg-basket{z-index:2}#egg-menu{position:absolute;right:12px;bottom:12px;z-index:6}#egg-shell{position:relative}#egg-shell:fullscreen #egg-controls,#egg-shell.egg-fallback-fullscreen #egg-controls{position:absolute;bottom:12px;right:12px;z-index:7;background:rgba(16,28,43,.8);border-radius:12px;padding:4px}#egg-shell:fullscreen #egg-menu,#egg-shell.egg-fallback-fullscreen #egg-menu{position:static}#egg-shell:fullscreen #egg-stage,#egg-shell.egg-fallback-fullscreen #egg-stage{margin-bottom:50px}#egg-stage .egg.rotten{font-size:clamp(27px,4vw,42px)}#egg-shell{display:flex;flex-direction:column;gap:8px;min-height:0}#egg-shell h2,#egg-shell p{margin:0}#egg-shell:fullscreen,#egg-shell.egg-fallback-fullscreen{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;margin:0;padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));background:#101c2b;color:#f4f7ff;z-index:99999;overflow:hidden;box-sizing:border-box}#egg-shell:fullscreen #egg-stage,#egg-shell.egg-fallback-fullscreen #egg-stage{height:auto;min-height:0;flex:1;border-radius:12px}#egg-shell:fullscreen #egg-controls,#egg-shell.egg-fallback-fullscreen #egg-controls{margin:0;flex-shrink:0;justify-content:center}#egg-shell:fullscreen #egg-controls button,#egg-shell.egg-fallback-fullscreen #egg-controls button{padding:8px 12px}#egg-shell:fullscreen h2,#egg-shell.egg-fallback-fullscreen h2{font-size:clamp(16px,2.4vw,24px)}#egg-shell:fullscreen #egg-hud,#egg-shell.egg-fallback-fullscreen #egg-hud{flex-shrink:0}#egg-shell:fullscreen #egg-basket,#egg-shell.egg-fallback-fullscreen #egg-basket{font-size:clamp(58px,11vh,100px)}#egg-stage{position:relative;overflow:hidden;touch-action:none;height:min(65dvh,560px);min-height:300px;border-radius:22px;border:3px solid #9ed4f5;background:linear-gradient(#80c9f6,#d6f4ff 72%,#8cbd69 73%,#4c8945);user-select:none}#egg-stage .egg.rotten{filter:drop-shadow(0 0 7px #7bc54a)}#egg-stage .egg.special{filter:drop-shadow(0 0 8px #ffd54f);font-size:clamp(28px,4.5vw,45px)}#egg-stage .egg{position:absolute;font-size:clamp(24px,4vw,39px);transform:translate(-50%,-50%);pointer-events:none}#egg-basket{position:absolute;bottom:2%;left:50%;transform:translateX(-50%);font-size:clamp(58px,9vw,88px);pointer-events:none}#egg-hud{display:flex;justify-content:space-between;gap:10px;font-weight:800;font-size:clamp(18px,3vw,26px)}#egg-controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}#egg-controls button{padding:12px 18px;border-radius:12px;border:0;background:#f2c46d;color:#18283c;font-weight:800}#egg-result{display:none;position:absolute;inset:5%;z-index:5;overflow:auto;padding:18px;border-radius:20px;background:rgba(13,34,55,.93);color:#fff;white-space:pre-wrap;font-size:clamp(18px,3vw,26px);font-weight:700;text-align:center;align-content:center}#egg-result:not([hidden]){display:block}`;
 style.textContent+=`#egg-shell{background:#133c62}#egg-stage{border:4px solid #b67837;background:radial-gradient(ellipse at 50% 72%,#d5f9a8 0%,transparent 42%),linear-gradient(180deg,#4aaaf0 0%,#b4e6ff 48%,#c6e4b2 60%,#79c14e 61%,#3b8d32 100%);box-shadow:inset 0 0 35px #244b2666,0 3px 14px #0004}#egg-stage:before{content:'🌳          🏡         🌲';position:absolute;top:42%;left:0;width:100%;font-size:clamp(22px,5vw,70px);text-align:center;opacity:.68;white-space:pre;pointer-events:none}#egg-coop{position:absolute;left:0;top:0;width:100%;height:24%;z-index:3;pointer-events:none;background:linear-gradient(180deg,#9b3c24 0 16%,#d46b39 17% 24%,#5b301c 25% 81%,#a56834 82% 88%,#623618 89%);border-bottom:5px solid #d4a05a;box-shadow:0 5px 12px #54321677}#egg-coop:before{content:'';position:absolute;inset:0 0 auto;height:17%;background:repeating-linear-gradient(110deg,#9b3224 0 30px,#c65a34 30px 60px);box-shadow:0 3px 3px #351c13}#egg-coop .hen{position:absolute;bottom:-3%;transform:translateX(-50%);width:15%;display:flex;align-items:center;justify-content:center;flex-direction:column;font-size:clamp(23px,4.3vw,61px);line-height:1;filter:drop-shadow(1px 3px 2px #2b160f);white-space:nowrap}#egg-coop .hen.brown{filter:sepia(.7) saturate(1.6) drop-shadow(1px 3px 2px #2b160f)}#egg-coop .hen .nest{font-size:clamp(13px,2.5vw,32px);line-height:.6}#egg-stage .egg{z-index:2;filter:drop-shadow(0 3px 2px #244a4388)}#egg-stage .egg.special{filter:drop-shadow(0 0 11px #ffe400)}#egg-stage .egg.rotten{filter:drop-shadow(0 0 9px #72d82c)}#egg-stage .egg-broken{z-index:2}#egg-basket{bottom:5%;z-index:4;filter:drop-shadow(0 5px 4px #3a2716)}#egg-hud{background:#153653;border:2px solid #c18b4e;border-radius:12px;padding:6px 12px;color:#fff;text-shadow:0 2px 2px #0008}#egg-shell h2{color:#ffe6b0;text-shadow:0 2px 2px #0007}#egg-shell:fullscreen #egg-stage,#egg-shell.egg-fallback-fullscreen #egg-stage{margin-bottom:48px}@media(max-height:550px){#egg-coop .hen{font-size:clamp(20px,5vh,40px)}#egg-shell h2{display:none}}`;
 style.textContent+=`#egg-stage{background:#77b94b url('./games/eier-chaos/assets/background.svg') center center/cover no-repeat}#egg-stage:before{content:none;display:none}#egg-coop{background:transparent url('./games/eier-chaos/assets/coop.svg') center top/100% 100% no-repeat}#egg-coop:before{display:none}#egg-coop .hen.brown{filter:sepia(.7) saturate(1.6) drop-shadow(1px 3px 2px #2b160f)}`;
 style.textContent+=`#egg-basket{width:clamp(100px,14vw,200px);height:clamp(72px,10vw,130px);background:url('./games/eier-chaos/assets/basket.svg') center/contain no-repeat;font-size:0}#egg-coop .hen{width:13%;height:75%;bottom:0;background:center bottom/contain no-repeat url('./games/eier-chaos/assets/hen-white.svg')}#egg-coop .hen.brown{background-image:url('./games/eier-chaos/assets/hen-brown.svg');filter:drop-shadow(1px 3px 2px #2b160f)}#egg-coop .hen span{display:none}#egg-stage .egg{width:clamp(28px,3.7vw,53px);height:clamp(38px,5vw,69px);background:url('./games/eier-chaos/assets/egg-normal.svg') center/contain no-repeat;font-size:0}#egg-stage .egg.special{background-image:url('./games/eier-chaos/assets/egg-golden.svg')}#egg-stage .egg.rotten{background-image:url('./games/eier-chaos/assets/egg-rotten.svg')}#egg-stage .egg-broken{font-size:0;width:clamp(32px,5vw,70px);height:clamp(15px,2.3vw,32px);background:url('./games/eier-chaos/assets/broken-normal.svg') center bottom/contain no-repeat;opacity:.85}#egg-basket{font-size:clamp(60px,9vw,100px)}`;
 const shell=document.createElement('div');shell.id='egg-shell';
 const heading=document.createElement('h2');heading.textContent='🥚 Eier-Chaos';
 const info=document.createElement('p');info.textContent='60 Sekunden · Ziehe den Korb mit dem Finger und fange die fallenden Eier. Alle Spieler bekommen dieselbe Eierfolge. 40 Eier in den ersten 20 Sekunden, dann 70 und zuletzt 90. ⭐ Goldene Eier +3 Punkte, faule Eier -1 Punkt, normale Eier +1 Punkt. Verpasste Eier geben keine Minuspunkte.';
 const hud=document.createElement('div');hud.id='egg-hud';
 const stage=document.createElement('div');stage.id='egg-stage';stage.setAttribute('aria-label','Spielfeld: Korb mit Finger bewegen');
 const coop=document.createElement('div');coop.id='egg-coop';
 const lanes=[.105,.263,.421,.579,.737,.895];
 lanes.forEach((x,i)=>{const hen=document.createElement('div');hen.className='hen '+(i%2?'brown':'white');hen.style.left=(x*100)+'%';hen.innerHTML='<span>🐔</span><span class="nest">🪹</span>';coop.append(hen);});
 const basket=document.createElement('div');basket.id='egg-basket';basket.textContent='';stage.append(coop,basket);
 const controls=document.createElement('div');controls.id='egg-controls';
 const menu=document.createElement('button');menu.textContent='☰ Menü';menu.id='egg-menu';menu.hidden=true;
 const start=document.createElement('button');start.textContent='▶ Spiel starten';
 const again=document.createElement('button');again.textContent='↻ Nochmal spielen';
 const back=document.createElement('button');back.textContent='← Zur Auswahl';
 const fullscreen=document.createElement('button');fullscreen.textContent='⛶ Vollbild';fullscreen.setAttribute('aria-label','Vollbild ein- oder ausschalten');
 controls.append(start,again,back,fullscreen);controls.append(menu);
 const result=document.createElement('div');result.id='egg-result';result.hidden=true;result.setAttribute('aria-live','polite');stage.append(result);
 shell.append(heading,info,hud,stage,controls);container.append(style,shell);
 let running=false,raf=0,last=0,carry=0,disposed=false,menuOpen=false;
 menu.onclick=()=>{menuOpen=!menuOpen;renderControls(host.snapshot().state);};
 function renderControls(state){const active=running&&!state.finished;start.hidden=active;menu.hidden=!active;back.hidden=active&&!menuOpen;fullscreen.hidden=active&&!menuOpen;again.hidden=!state.finished;menu.textContent=menuOpen?'✕ Schließen':'☰ Menü';}
 const updateFullscreen=()=>{fullscreen.textContent=document.fullscreenElement===shell?'⛶ Vollbild beenden':'⛶ Vollbild';};
 fullscreen.onclick=async()=>{try{if(document.fullscreenElement===shell)await document.exitFullscreen();else if(shell.requestFullscreen)await shell.requestFullscreen();else shell.classList.toggle('egg-fallback-fullscreen');}catch{shell.classList.toggle('egg-fallback-fullscreen');}updateFullscreen();};
 document.addEventListener('fullscreenchange',updateFullscreen);
 const owner=()=>host.snapshot().players[0].id;
 const human=()=>host.snapshot().players.find(p=>p.type==='human')?.id;
 const move=e=>{
  if(!running||!human())return;
  const rect=stage.getBoundingClientRect();
  host.dispatch(human(),{type:'move',x:Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))});
 };
 stage.addEventListener('pointerdown',e=>{stage.setPointerCapture(e.pointerId);move(e)});
 stage.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')move(e)});
 function stop(){running=false;cancelAnimationFrame(raf);raf=0;}
 function frame(now){
  if(!running||disposed)return;
  carry+=Math.min(100,Math.max(0,now-last));last=now;
  while(carry>=50&&running){
   carry-=50;
   const snap=host.snapshot();
   if(snap.state.finished){stop();break}
   for(const p of snap.players.filter(p=>p.type==='bot'))host.botTurn(p.id);
   host.dispatch(owner(),{type:'tick',ms:50});
  }
  if(running)raf=requestAnimationFrame(frame);
 }
 start.onclick=()=>{if(running)return;
  // Fullscreen requests must originate from the user's start-button gesture.
  if(document.fullscreenElement!==shell&&!shell.classList.contains('egg-fallback-fullscreen')){
   if(shell.requestFullscreen){try{const request=shell.requestFullscreen();Promise.resolve(request).catch(()=>{if(!disposed&&!document.fullscreenElement)shell.classList.add('egg-fallback-fullscreen');updateFullscreen();});}catch{shell.classList.add('egg-fallback-fullscreen');}}
   else shell.classList.add('egg-fallback-fullscreen');
  }
  running=true;menuOpen=false;renderControls(host.snapshot().state);last=performance.now();carry=0;start.disabled=true;raf=requestAnimationFrame(frame);
 };
 again.onclick=()=>{stop();menuOpen=false;host.restart();result.textContent='';result.hidden=true;info.hidden=false;renderControls(host.snapshot().state);};
 back.onclick=()=>{stop();disposed=true;document.removeEventListener('fullscreenchange',updateFullscreen);if(document.fullscreenElement===shell)document.exitFullscreen().catch(()=>{});shell.classList.remove('egg-fallback-fullscreen');host.exit()};
 return {render(snapshot){
  const s=snapshot.state,player=human()||owner();
  hud.textContent='⏱ '+Math.ceil((60000-s.elapsedMs)/1000)+' s  ·  🥚 '+(s.scores[player]||0)+' Punkte  ·  Stufe '+(s.elapsedMs<20000?1:s.elapsedMs<40000?2:3);
  info.hidden=running||s.elapsedMs>0;
  basket.style.left=(s.baskets[player]*100)+'%';
  stage.querySelectorAll('.egg,.egg-broken').forEach(el=>el.remove());
  const caught=new Set(s.caught[player]||[]);
  if(!s.finished)for(let i=0;i<EGG_COUNT;i++){
   const e=eggAt(i),progress=(s.elapsedMs-e.spawnMs)/(e.landMs-e.spawnMs);
   if(progress<0||progress>=1||e.spawnMs>=60000)continue;
   const node=document.createElement('div');node.className=e.special?'egg special':e.rotten?'egg rotten':'egg';node.textContent='';node.style.left=(e.x*100)+'%';node.style.top=(progress*61+25)+'%';stage.append(node);
  }
  // Missed eggs break on the ground and remain there until replay.
  const pieces=document.createDocumentFragment();
  for(let i=0;i<EGG_COUNT;i++){
   const e=eggAt(i);
   if(e.landMs>s.elapsedMs||caught.has(i))continue;
   const broken=document.createElement('div');broken.className='egg-broken';
   broken.textContent='';broken.style.filter=e.rotten?'hue-rotate(65deg) saturate(1.6)':e.special?'sepia(.6) saturate(2)':'none';
   broken.style.left=(e.x*100)+'%';
   broken.style.bottom=(2+(i%4)*1.5)+'%';
   broken.style.transform='translateX(-50%) rotate('+((i*47)%70-35)+'deg)';
   pieces.append(broken);
  }
  stage.append(pieces);
  if(s.finished){
   stop();
   const ranking=Object.entries(s.scores).sort((a,b)=>b[1]-a[1]);
   result.textContent='🏆 Siegerehrung\\n\\n'+ranking.map(([id,score],i)=>(i+1)+'. '+(id===player?'Du':id)+' – '+score+' Eier').join('\\n');
   result.hidden=false;
  }else{result.hidden=true;}
  start.disabled=running||s.finished;renderControls(s);
 }};
}
