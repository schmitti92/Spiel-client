/* SKYJO Action UI improvements: independent of game rules and checksum modules. */
(()=>{'use strict';
const VERSION='fd13cb079fb1';
let lastTurn='',lastToastAt=0,updating=false;
function highlightPlayer(name,playing){
 const players=[...document.querySelectorAll('.player')];
 const normalize=s=>String(s||'').normalize('NFKC').trim().replace(/\\s+/g,' ').toLocaleLowerCase('de');
 const target=normalize(name);
 let match=null;
 if(playing&&target){
   // Prefer the actual player name header; names can be wrapped in spans or include badges.
   const selectors=['.player-name','.player-header','.player-head','.player-title','.name','h2','h3','h4','header','strong','b'];
   for(const selector of selectors){
     for(const el of players){
       const nodes=el.querySelectorAll(selector);
       if([...nodes].some(n=>normalize(n.textContent)===target)){match=el;break;}
     }
     if(match)break;
   }
   if(!match){
     match=players.find(el=>[...el.querySelectorAll('*')].some(n=>n.children.length===0&&normalize(n.textContent)===target))||null;
   }
   if(!match){
     match=players.find(el=>normalize(el.textContent).includes(target))||null;
   }
 }
 players.forEach(el=>el.classList.toggle('sky-active-glow',playing&&el===match));
}

const tag=(name,cls)=>{const el=document.createElement(name);el.className=cls;document.body.append(el);return el;};
const indicator=tag('div','sky-turn-indicator');indicator.hidden=true;indicator.setAttribute('role','status');
const notice=tag('aside','skyjo-update-notice');notice.hidden=true;notice.setAttribute('role','alert');
const heading=document.createElement('strong');heading.textContent='🆕 Neue SKYJO-Version verfügbar!';
const msg=document.createElement('div');msg.textContent='Es gibt Verbesserungen. Bitte aktualisiere das Spiel, damit alle mit der neuen Version spielen.';
const reload=document.createElement('button');reload.textContent='🔄 Jetzt aktualisieren';
const later=document.createElement('button');later.textContent='Später';later.className='dismiss';
reload.addEventListener('click',async()=>{
 reload.disabled=true;
 reload.textContent='⏳ Aktualisiere …';
 try{
   const keys=await caches.keys();
   await Promise.all(keys.map(key=>caches.delete(key)));
 }catch(e){console.warn('[SKYJO] Cache konnte nicht vollständig gelöscht werden',e);}
 const url=new URL(location.href);
 url.searchParams.set('skyjo_refresh',String(Date.now()));
 location.replace(url.toString());
});
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
 indicator.hidden=true;
 highlightPlayer(name,playing);
 if(playing){
   // Persistent top banner intentionally removed; only the active board glows.
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
 .then(data=>{
   if(!data.version)return;
   const latest=String(data.version);
   const lastReload=Number(sessionStorage.getItem('skyjo_version_refresh_at')||0);
   if(latest===VERSION||freshLoad&&Date.now()-lastReload<120000){
     notice.hidden=true;
     return;
   }
   notice.hidden=false;
 })
 .catch(()=>{})
 .finally(()=>{updating=false;});
}
setInterval(updateTurn,400);
setInterval(syncServerCheck,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncServerCheck();});
window.addEventListener('focus',syncServerCheck);
updateTurn();syncServerCheck();
})();
