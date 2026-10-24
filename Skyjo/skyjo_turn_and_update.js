/* SKYJO Action UI improvements: independent of game rules and checksum modules. */
(()=>{'use strict';
const VERSION='2026-10-24-turn-update-1';
let lastTurn='',lastToastAt=0,updating=false;
function highlightPlayer(name,playing){
 const players=[...document.querySelectorAll('.player')];
 let match=null;
 for(const el of players){
   const header=el.querySelector('.player-name,.player-head,.player-header,.name,h3,h4,strong,b');
   const label=(header?.textContent||'').trim();
   if(playing&&name&&(label===name||label.startsWith(name+' ')||label.startsWith(name+'\n'))) {match=el;break;}
 }
 if(!match&&playing){match=players.find(el=>[...el.querySelectorAll('b,strong,h3,h4')].some(n=>n.textContent.trim()===name))||null;}
 players.forEach(el=>{el.classList.toggle('sky-active-glow',el===match&&playing);});
}

const tag=(name,cls)=>{const el=document.createElement(name);el.className=cls;document.body.append(el);return el;};
const indicator=tag('div','sky-turn-indicator');indicator.hidden=true;indicator.setAttribute('role','status');
const notice=tag('aside','skyjo-update-notice');notice.hidden=true;notice.setAttribute('role','alert');
const heading=document.createElement('strong');heading.textContent='🆕 Neue SKYJO-Version verfügbar!';
const msg=document.createElement('div');msg.textContent='Es gibt Verbesserungen. Bitte aktualisiere das Spiel, damit alle mit der neuen Version spielen.';
const reload=document.createElement('button');reload.textContent='🔄 Jetzt aktualisieren';
const later=document.createElement('button');later.textContent='Später';later.className='dismiss';
reload.addEventListener('click',()=>{location.reload();});
later.addEventListener('click',()=>{notice.hidden=true;});
notice.append(heading,msg,reload,later);
function clean(t){const span=document.createElement('span');span.innerHTML=t;return (span.textContent||'').trim();}
function updateTurn(){
 const game=document.querySelector('.turn-stat');
 if(!game||!window.Game){indicator.hidden=true;lastTurn='';return;}
 const name=clean(game.querySelector('b')?.textContent||'');
 if(!name){indicator.hidden=true;return;}
 const pill=document.querySelector('.turn-state-pill');
 const playing=/am Zug/i.test(game.textContent||'')&&!/Rundenende/i.test(game.textContent||'');
 const mine=playing?(!pill||pill.classList.contains('mine')):false;
 const key=name+'|'+playing+'|'+mine;
 indicator.hidden=!playing;
 highlightPlayer(name,playing);
 if(playing){
   indicator.textContent=mine?'🎯 DU BIST DRAN!':'🎯 '+name+' IST AM ZUG';
   indicator.classList.toggle('mine',mine);
 }
 if(key!==lastTurn){
   const old=lastTurn;lastTurn=key;
   if(old&&mine&&playing&&Date.now()-lastToastAt>1300){
     lastToastAt=Date.now();
     const toast=document.querySelector('#toast');
     if(toast){toast.textContent='🎯 DU BIST DRAN!';toast.classList.add('show');setTimeout(()=>{if(toast.textContent==='🎯 DU BIST DRAN!')toast.classList.remove('show');},2600);}
   }
 }
}
function syncServerCheck(){
 if(updating||document.hidden)return;
 updating=true;
 fetch('skyjo_ui_version.json?ts='+Date.now(),{cache:'no-store'})
 .then(r=>{if(!r.ok)throw Error('version unavailable');return r.json()})
 .then(data=>{if(data.version&&data.version!==VERSION)notice.hidden=false;})
 .catch(()=>{})
 .finally(()=>{updating=false;});
}
setInterval(updateTurn,400);
setInterval(syncServerCheck,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncServerCheck();});
window.addEventListener('focus',syncServerCheck);
updateTurn();syncServerCheck();
})();
