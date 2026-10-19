(()=>{'use strict';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),code=params.get('room')||'',api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const names=['Du (Host)','🤖 Testspieler 1','🤖 Testspieler 2'];let boards=[],turn=0,discard=null,roundDone=false,auto=false,timer=null,hostVerified=false,history=[];
const rand=()=>Math.floor(Math.random()*16)-2;
const visible=cards=>cards.filter(x=>x!==null).length;
function stop(){auto=false;if(timer){clearTimeout(timer);timer=null}const b=$('auto-test');if(b)b.textContent='🤖 Auto-Test starten'}
function reset(){stop();boards=Array.from({length:3},()=>Array(12).fill(null));turn=0;discard=null;roundDone=false;history=[];render()}
function score(cards){return cards.reduce((sum,x)=>sum+(x===null?0:x),0)}
function render(){
 $('boards').replaceChildren();
 boards.forEach((cards,i)=>{
  const section=document.createElement('section');section.className='board'+(i===0?' self':'')+(turn%3===i&&!roundDone?' active-turn':'');
  const h=document.createElement('h2');h.textContent=names[i]+(turn%3===i&&!roundDone?' • dran':'');section.append(h);
  const grid=document.createElement('div');grid.className='grid';
  cards.forEach((value,n)=>{const card=document.createElement(i===0?'button':'div');if(i===0){card.type='button';card.disabled=roundDone||turn%3!==0||value!==null;card.title=card.disabled?'':'Diese Karte aufdecken';card.addEventListener('click',()=>revealHost(n))}card.className='card '+(value===null?'face-down':value<0?'open neg':value===0?'open zero':value<=4?'open low':value<=8?'open mid':'open high');card.textContent=value===null?'SKYJO':String(value);card.setAttribute('aria-label',value===null?'Karte '+(n+1)+' verdeckt':String(value));grid.append(card)});
  section.append(grid);$('boards').append(section)
 });
 const total=boards.reduce((n,b)=>n+visible(b),0);
 $('remaining').textContent=String(Math.max(0,114-total));
 $('discard').textContent=discard===null?'–':String(discard);
 $('status').textContent=roundDone?'🏆 Testdurchlauf beendet':names[turn%3]+' ist dran';
 $('step').disabled=roundDone;
 if(roundDone){$('status').textContent+=' · '+names.map((n,i)=>n+': '+score(boards[i])+' P.').join(' · ')}else if(turn%3===0){$('status').textContent='👑 Du bist dran – eigene Karte antippen oder Zug simulieren'}
}
function applyMove(i,at){if(roundDone||i!==turn%3||boards[i][at]!==null)return false;const value=rand();boards[i][at]=value;discard=value;history.push({player:i,position:at,value});turn++;if(boards.every(b=>b.every(v=>v!==null))){roundDone=true;stop()}render();return true}
function step(){if(roundDone)return;const i=turn%3,hidden=boards[i].flatMap((v,n)=>v===null?[n]:[]);if(hidden.length)applyMove(i,hidden[Math.floor(Math.random()*hidden.length)])}
function revealHost(n){if(!hostVerified||auto||roundDone||turn%3!==0)return;applyMove(0,n)}
function schedule(){if(!auto||roundDone)return;timer=setTimeout(()=>{if(document.hidden){stop();return}step();schedule()},650)}
$('step').addEventListener('click',()=>{stop();step()});
$('reset').addEventListener('click',reset);
const autoBtn=document.createElement('button');autoBtn.id='auto-test';autoBtn.type='button';autoBtn.textContent='🤖 Auto-Test starten';$('scene').querySelector('footer').append(autoBtn);
autoBtn.onclick=()=>{if(auto){stop();return}if(!hostVerified)return;if(roundDone)reset();auto=true;autoBtn.textContent='⏸ Auto-Test stoppen';schedule()};
async function boot(){
 try{
  if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw Error('Kein gültiger Raumcode.');
  let user=null;
  for(let i=0;i<30;i++){const s=window.SpielOnline?.state?.();if(s?.status==='online'&&s.user?.getIdToken){user=s.user;break}await new Promise(r=>setTimeout(r,300))}
  if(!user)throw Error('Bitte anmelden.');
  const token=await user.getIdToken();
  const res=await fetch(api+'/api/hub/rooms/'+code,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!res.ok)throw Error('Raum konnte nicht geprüft werden.');
  const data=await res.json();
  if(!data?.room?.host||data.room.game!=='skyjo')throw Error('Nur der Host einer SKYJO-Lobby darf diese Vorschau öffnen.');
  hostVerified=true;$('guard').textContent='✔ Host bestätigt – isolierte Vorschau bereit';$('game').hidden=false;reset()
 }catch(e){$('guard').textContent='⛔ '+e.message}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
window.addEventListener('pagehide',stop);
boot();
})();