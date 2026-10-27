/* Local-only layout mapping; uses existing DOM and never changes game state. */
(()=>{'use strict';
if(new URLSearchParams(location.search).get('mode')!=='local')return;
const CSS=`
@media(min-width:900px) and (orientation:landscape){
body.skyjo-local-layout-ready .table-area.three-player-layout{display:grid!important;grid-template-columns:minmax(0,37fr) minmax(0,25fr) minmax(0,34fr)!important;gap:1.3vw!important;align-items:stretch!important;min-height:min(66vh,680px)!important}
body.skyjo-local-layout-ready .table-area.three-player-layout .own-seat{grid-column:1!important;grid-row:1!important;min-width:0!important;align-self:stretch!important}
body.skyjo-local-layout-ready .table-area.three-player-layout .center-table{grid-column:2!important;grid-row:1!important;display:grid!important;grid-template-rows:43fr 57fr!important;gap:9px!important;min-width:0!important}
body.skyjo-local-layout-ready .table-area.three-player-layout .mini-players-stack{grid-column:3!important;grid-row:1!important;display:grid!important;grid-template-rows:1fr 1fr!important;gap:10px!important;min-width:0!important}
body.skyjo-local-layout-ready .table-area.three-player-layout .own-seat .player{min-height:100%!important}
body.skyjo-local-layout-ready .table-area.three-player-layout .mini-player-wrap:first-child .player-head{background:linear-gradient(100deg,#88233b,#d83b57,#7e1b31)!important;color:#fff!important}
body.skyjo-local-layout-ready .table-area.three-player-layout .mini-player-wrap:nth-child(2) .player-head{background:linear-gradient(100deg,#125f3c,#31a469,#0d4c31)!important;color:#fff!important}
body.skyjo-local-layout-ready .table-area.three-player-layout .mini-player-wrap:first-child .gridwrap{background:radial-gradient(ellipse,#6f2337,#240d1b)!important}
body.skyjo-local-layout-ready .table-area.three-player-layout .mini-player-wrap:nth-child(2) .gridwrap{background:radial-gradient(ellipse,#135e39,#08271b)!important}
body.skyjo-local-layout-ready .table-area.three-player-layout .center-table .handbox,
body.skyjo-local-layout-ready .table-area.three-player-layout .center-table .premium-piles{min-height:0!important;height:100%!important}
body.skyjo-local-layout-ready .status.premium-status{margin-top:9px!important}
}`;
const style=document.createElement('style');style.id='skyjo-local-layout-runtime';style.textContent=CSS;document.head.append(style);
let previous=false;
function update(){
 const board=document.querySelector('.table-area.three-player-layout');
 const active=!!board && board.querySelectorAll('.player').length>=3;
 if(active!==previous){document.body.classList.toggle('skyjo-local-layout-ready',active);previous=active}\n const diagnostic=document.getElementById('skyjo-layout-diagnostic');if(diagnostic){const count=document.querySelectorAll('.player').length;diagnostic.textContent='Layout: '+(active?'AKTIV':'NICHT AKTIV')+' · Board: '+(board?'gefunden':'fehlt')+' · Spieler: '+count+' · Mitte: '+(!!document.querySelector('.center-table'))+' · Rechts: '+(!!document.querySelector('.mini-players-stack'));}
}
document.addEventListener('DOMContentLoaded',()=>{\n const diagnostic=document.createElement('div');diagnostic.id='skyjo-layout-diagnostic';diagnostic.setAttribute('role','status');diagnostic.style.cssText='position:fixed;bottom:96px;left:12px;z-index:2147483000;padding:7px 12px;background:#08202df0;color:#ffe09d;border:1px solid #d4ac63;border-radius:9px;font:12px system-ui;pointer-events:none;max-width:70vw';if(new URLSearchParams(location.search).has('layoutDebug'))document.body.append(diagnostic);
 update();const app=document.getElementById('app')||document.body;
 const observer=new MutationObserver(update);observer.observe(app,{childList:true,subtree:true});
});
})();