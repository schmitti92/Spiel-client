/** Eier-Chaos offline view. Shared engine owns rules; this view owns animation and pointer input only. */
import {eggAt,EGG_COUNT} from './game.js';
export function mount(container,host){
 const style=document.createElement('style');
 style.textContent=`#egg-shell{display:flex;flex-direction:column;gap:8px;min-height:0}#egg-shell h2,#egg-shell p{margin:0}#egg-shell:fullscreen,#egg-shell.egg-fallback-fullscreen{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;margin:0;padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));background:#101c2b;color:#f4f7ff;z-index:99999;overflow:hidden;box-sizing:border-box}#egg-shell:fullscreen #egg-stage,#egg-shell.egg-fallback-fullscreen #egg-stage{height:auto;min-height:0;flex:1;border-radius:12px}#egg-shell:fullscreen #egg-controls,#egg-shell.egg-fallback-fullscreen #egg-controls{margin:0;flex-shrink:0;justify-content:center}#egg-shell:fullscreen #egg-controls button,#egg-shell.egg-fallback-fullscreen #egg-controls button{padding:8px 12px}#egg-shell:fullscreen h2,#egg-shell.egg-fallback-fullscreen h2{font-size:clamp(16px,2.4vw,24px)}#egg-shell:fullscreen #egg-hud,#egg-shell.egg-fallback-fullscreen #egg-hud{flex-shrink:0}#egg-shell:fullscreen #egg-basket,#egg-shell.egg-fallback-fullscreen #egg-basket{font-size:clamp(58px,11vh,100px)}#egg-stage{position:relative;overflow:hidden;touch-action:none;height:min(65dvh,560px);min-height:300px;border-radius:22px;border:3px solid #9ed4f5;background:linear-gradient(#80c9f6,#d6f4ff 72%,#8cbd69 73%,#4c8945);user-select:none}#egg-stage .egg.rotten{filter:drop-shadow(0 0 7px #7bc54a)}#egg-stage .egg.special{filter:drop-shadow(0 0 8px #ffd54f);font-size:clamp(28px,4.5vw,45px)}#egg-stage .egg{position:absolute;font-size:clamp(24px,4vw,39px);transform:translate(-50%,-50%);pointer-events:none}#egg-basket{position:absolute;bottom:2%;left:50%;transform:translateX(-50%);font-size:clamp(58px,9vw,88px);pointer-events:none}#egg-hud{display:flex;justify-content:space-between;gap:10px;font-weight:800;font-size:clamp(18px,3vw,26px)}#egg-controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}#egg-controls button{padding:12px 18px;border-radius:12px;border:0;background:#f2c46d;color:#18283c;font-weight:800}#egg-result{display:none;position:absolute;inset:5%;z-index:5;overflow:auto;padding:18px;border-radius:20px;background:rgba(13,34,55,.93);color:#fff;white-space:pre-wrap;font-size:clamp(18px,3vw,26px);font-weight:700;text-align:center;align-content:center}#egg-result:not([hidden]){display:block}`;
 const shell=document.createElement('div');shell.id='egg-shell';
 const heading=document.createElement('h2');heading.textContent='🥚 Eier-Chaos';
 const info=document.createElement('p');info.textContent='60 Sekunden · Ziehe den Korb mit dem Finger und fange die fallenden Eier. Alle Spieler bekommen dieselbe Eierfolge. 40 Eier in den ersten 20 Sekunden, dann 70 und zuletzt 90. ⭐ Goldene Eier +3 Punkte, faule Eier -1 Punkt, normale Eier +1 Punkt. Verpasste Eier geben keine Minuspunkte.';
 const hud=document.createElement('div');hud.id='egg-hud';
 const stage=document.createElement('div');stage.id='egg-stage';stage.setAttribute('aria-label','Spielfeld: Korb mit Finger bewegen');
 const basket=document.createElement('div');basket.id='egg-basket';basket.textContent='🧺';stage.append(basket);
 const controls=document.createElement('div');controls.id='egg-controls';
 const start=document.createElement('button');start.textContent='▶ Spiel starten';
 const again=document.createElement('button');again.textContent='↻ Nochmal spielen';
 const back=document.createElement('button');back.textContent='← Zur Auswahl';
 const fullscreen=document.createElement('button');fullscreen.textContent='⛶ Vollbild';fullscreen.setAttribute('aria-label','Vollbild ein- oder ausschalten');
 controls.append(start,again,back,fullscreen);
 const result=document.createElement('div');result.id='egg-result';result.hidden=true;result.setAttribute('aria-live','polite');stage.append(result);
 shell.append(heading,info,hud,stage,controls);container.append(style,shell);
 let running=false,raf=0,last=0,carry=0,disposed=false;
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
 start.onclick=()=>{if(running)return;running=true;last=performance.now();carry=0;start.disabled=true;raf=requestAnimationFrame(frame)};
 again.onclick=()=>{stop();host.restart();result.textContent='';result.hidden=true;info.hidden=false;};
 back.onclick=()=>{stop();disposed=true;document.removeEventListener('fullscreenchange',updateFullscreen);if(document.fullscreenElement===shell)document.exitFullscreen().catch(()=>{});host.exit()};
 return {render(snapshot){
  const s=snapshot.state,player=human()||owner();
  hud.textContent='⏱ '+Math.ceil((60000-s.elapsedMs)/1000)+' s  ·  🥚 '+(s.scores[player]||0)+' Punkte  ·  Stufe '+(s.elapsedMs<20000?1:s.elapsedMs<40000?2:3);
  info.hidden=running||s.elapsedMs>0;
  basket.style.left=(s.baskets[player]*100)+'%';
  stage.querySelectorAll('.egg').forEach(el=>el.remove());
  if(!s.finished)for(let i=0;i<EGG_COUNT;i++){
   const e=eggAt(i),progress=(s.elapsedMs-e.spawnMs)/(e.landMs-e.spawnMs);
   if(progress<0||progress>=1||e.spawnMs>=60000)continue;
   const node=document.createElement('div');node.className=e.special?'egg special':e.rotten?'egg rotten':'egg';node.textContent=e.special?'🌟':e.rotten?'🟢':'🥚';node.style.left=(e.x*100)+'%';node.style.top=(progress*83+4)+'%';stage.append(node);
  }
  if(s.finished){
   stop();
   const ranking=Object.entries(s.scores).sort((a,b)=>b[1]-a[1]);
   result.textContent='🏆 Siegerehrung\\n\\n'+ranking.map(([id,score],i)=>(i+1)+'. '+(id===player?'Du':id)+' – '+score+' Eier').join('\\n');
   result.hidden=false;
  }else{result.hidden=true;}
  start.disabled=running||s.finished;again.hidden=!s.finished;
 }};
}
