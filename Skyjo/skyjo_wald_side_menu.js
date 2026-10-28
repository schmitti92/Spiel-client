/* Lokales Wald-Menü: bestehende Topbar-Buttons bleiben erhalten. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('mode')!=='local')return;
let open=false,queued=false;
const active=()=>document.body.classList.contains('is-playing')&&document.body.dataset.skyjoLocalBoard==='wald';
function sync(){
 const enabled=active();document.body.classList.toggle('skyjo-wald-menu-enabled',enabled);
 if(!enabled){open=false;document.body.classList.remove('skyjo-wald-menu-open');return}
 const joker=document.querySelector('#app .status.premium-status .joker-stat');
 if(!joker)return;
 let btn=document.getElementById('skyjo-wald-menu-toggle');
 if(!btn){
  btn=document.createElement('button');btn.id='skyjo-wald-menu-toggle';btn.type='button';
  btn.setAttribute('aria-label','Spielmenü öffnen');btn.setAttribute('aria-expanded',String(open));
  btn.addEventListener('click',e=>{e.stopPropagation();open=!open;update()});
  const stats=joker.closest('.status.premium-status');
  stats.insertBefore(btn,stats.firstElementChild);
 }
 update();
}
function update(){
 document.body.classList.toggle('skyjo-wald-menu-open',open&&active());
 const btn=document.getElementById('skyjo-wald-menu-toggle');
 if(btn){btn.textContent=open?'✕':'☰';btn.setAttribute('aria-expanded',String(open));btn.setAttribute('aria-label',open?'Spielmenü schließen':'Spielmenü öffnen')}
}
document.addEventListener('pointerdown',e=>{if(!open)return;if(e.target.closest('#skyjo-wald-menu-toggle, #app .topbar'))return;open=false;update()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open){open=false;update()}});
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}
function init(){sync();const app=document.getElementById('app');if(app)new MutationObserver(schedule).observe(app,{childList:true,subtree:false})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();