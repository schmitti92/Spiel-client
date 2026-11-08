'use strict';
(()=>{
const root=document.getElementById('ice-online'),status=document.getElementById('ice-online-status');
const names=["IMG-20261108-WA0000.jpg","IMG-20261108-WA0001.jpg","IMG-20261108-WA0002.jpg","IMG-20261108-WA0003.jpg","IMG-20261108-WA0004.jpg","IMG-20261108-WA0005.jpg","IMG-20261108-WA0006.jpg","IMG-20261108-WA0007.jpg","IMG-20261108-WA0011.jpg","IMG-20261108-WA0012.jpg","IMG-20261108-WA0013.jpg","IMG-20261108-WA0014.jpg","IMG-20261108-WA0015.jpg","IMG-20261108-WA0016.jpg","IMG-20261108-WA0017.jpg","IMG-20261108-WA0018.jpg","IMG-20261108-WA0023.jpg","IMG-20261108-WA0024.jpg","IMG-20261108-WA0025.jpg","IMG-20261108-WA0027.jpg","IMG-20261108-WA0030.jpg","IMG-20261108-WA0032.jpg","IMG-20261108-WA0033.jpg","IMG-20261108-WA0034.jpg","IMG-20261108-WA0035.jpg","IMG-20261108-WA0036.jpg","IMG-20261108-WA0038.jpg","IMG-20261108-WA0040.jpg","IMG-20261108-WA0041.jpg","IMG-20261108-WA0042.jpg","IMG-20261108-WA0043.jpg","IMG-20261108-WA0045.jpg","IMG-20261108-WA0046.jpg","IMG-20261108-WA0047.jpg","IMG-20261108-WA0048(1).jpg","IMG-20261108-WA0051.jpg","IMG-20261108-WA0052.jpg","IMG-20261108-WA0053.jpg","IMG-20261108-WA0054.jpg","IMG-20261108-WA0056.jpg","IMG-20261108-WA0065.jpg","IMG-20261108-WA0067.jpg","IMG-20261108-WA0068.jpg","IMG-20261108-WA0069.jpg","IMG-20261108-WA0070.jpg","IMG-20261108-WA0074.jpg","IMG-20261108-WA0075.jpg","IMG-20261108-WA0077.jpg","IMG-20261108-WA0079.jpg","IMG-20261108-WA0081.jpg","IMG-20261108-WA0084.jpg","IMG-20261108-WA0085.jpg","IMG-20261108-WA0086.jpg","IMG-20261108-WA0089.jpg","IMG-20261108-WA0091.jpg","IMG-20261108-WA0092.jpg","IMG-20261108-WA0094.jpg","IMG-20261108-WA0097.jpg","IMG-20261108-WA0099.jpg","IMG-20261108-WA0104.jpg","IMG-20261108-WA0105.jpg","IMG-20261108-WA0109.jpg","IMG-20261108-WA0110.jpg","IMG-20261108-WA0111.jpg","IMG-20261108-WA0113(1).jpg","IMG-20261108-WA0114.jpg","IMG-20261108-WA0121.jpg","motion_photo_3952067152776055351.jpg","motion_photo_4388198511032034292.jpg","motion_photo_6120708326686891259.jpg"];
const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
let state=null,busy=false,pending=null;
const money=n=>Number(n||0).toLocaleString('de-DE')+' €';
const user=()=>{const a=window.SpielOnline?.state?.();return a?.status==='online'?a.user:null};
function message(t){status.textContent=t}
async function request(type,body){
 const u=user();if(!u)throw Error('Bitte zuerst im Spielerprofil anmelden.');
 const token=await u.getIdToken();
 const response=await fetch(api+'/api/christmas-ice/'+(type==='GET'?'me':'action'),{method:type,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',body:body?JSON.stringify(body):undefined});
 const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');return data;
}
const id=()=>crypto.randomUUID();
let galleryPage=0,showAllGallery=false,impactTimer=null,celebration=null,wheelTimer=null;
function render(){
 if(!state){root.innerHTML='<p>Dein Online-Spielstand ist noch nicht gestartet.</p><button id="ice-start">❄️ Online-Spiel starten</button>';root.querySelector('#ice-start').onclick=()=>run('start');return}
 const finished=!!state.finished,done=state.completed>=70,number=Math.min(70,state.completed+1);
 const photo=n=>'./Weihnachtsbilder/'+encodeURIComponent(names[(n-1)%names.length]);
 const chosen=window.iceHammer||'single';
 const labels={single:'Einfacher Hammer',double:'Doppelhammer',lucky:'Glückshammer'};
 const emojis={single:'🔨',double:'⚒️',lucky:'✨'};
 const hammerArt={single:'hammer-einfach.webp',double:'hammer-doppel.webp',lucky:'hammer-glueck.webp'};
 const costs={single:0,double:500000,lucky:1000000};
 const price=k=>(state.freeHammers?.[k]||0)>0?'Gratis ('+state.freeHammers[k]+')':k==='single'?'Kostenlos':money(costs[k]);
 const first=galleryPage*6+1;
 const thumbs=Array.from({length:6},(_,i)=>first+i).filter(n=>n<=70).map(n=>'<button class="v44-thumb '+(n>state.completed+1?'locked':'')+'" data-preview="'+n+'" title="Bild '+n+'">'+(n<=state.completed?'<img loading="lazy" src="'+photo(n)+'" alt="Bild '+n+'">':n===number?'❄️':'🔒')+'<span>'+n+'</span></button>').join('');
 const milestones=Array.from({length:7},(_,i)=>(i+1)*10).map(n=>'<div class="v44-reward '+(state.completed>=n?'done':number<=n&&number>n-10?'current':'')+'"><span>🎁</span><strong>'+n+'/70</strong></div>').join('');
 root.innerHTML='<div class="v44-app"><header class="v44-head"><div class="v44-plaque">🎄 Weihnachtsevent 2</div><div class="v44-heading"><h1>Die magischen Weihnachtsbilder</h1><p>⭐ 70 Bilder · Sternsuche · Überraschungsbelohnungen ⭐</p></div><button id="v44-fullscreen" class="v44-fullscreen" title="Vollbild umschalten">⛶ Vollbild</button><div class="v44-plaque">💰 '+money(state.balance)+'</div></header>'+
 '<div class="v44-layout"><section class="v44-panel v44-gallery-panel"><h2>🖼️ Bildergalerie</h2><div class="v44-gallery">'+thumbs+'</div><div class="v44-gallery-nav"><button id="v44-prev" '+(galleryPage===0?'disabled':'')+'>❮</button><span>Bilder '+first+'–'+Math.min(first+5,70)+'</span><button id="v44-nextpage" '+(first+5>=70?'disabled':'')+'>❯</button></div><button id="v44-gallery-all" class="v44-gallery-all">🖼️ Alle 70 Bilder ansehen</button><p>🔓 '+state.completed+' von 70 Bildern abgeschlossen</p><p>🔐 '+state.peekJokers+' Kofferblick-Joker</p></section>'+
 '<section class="v44-panel v44-board-panel"><h2>❄️ Bild '+number+' von 70</h2><div class="v44-ice-meter" aria-label="'+state.opened.length+' von 20 Eisfeldern geöffnet"><span>🧊 '+state.opened.length+'/20 Eisfelder</span><div><i style="width:'+(Math.min(20,state.opened.length)*5)+'%"></i></div></div><div class="ice-board v44-board"><img alt="Weihnachtsbild '+number+'" src="'+photo(number)+'"><div class="ice-tiles">'+Array.from({length:20},(_,i)=>'<button data-tile="'+i+'" '+(busy||finished||done||state.opened.includes(i)?'disabled':'')+' class="'+(state.opened.includes(i)||finished||done?'gone':'')+'" aria-label="Eisfeld '+(i+1)+'">❄</button>').join('')+'</div></div><p class="v44-instruction">🔨 Wähle einen Hammer und tippe auf ein Eisfeld.</p></section>'+
 '<section class="v44-panel v44-hammer-panel"><h2>🔨 Wähle deinen Hammer</h2><div class="v44-hammers">'+['single','double','lucky'].map(k=>'<button class="v44-hammer '+(chosen===k?'selected':'')+'" data-hammer="'+k+'"><span class="v44-hammer-icon"><img class="v44-hammer-art" src="./Weihnachtsbilder/'+hammerArt[k]+'" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="v44-hammer-fallback" hidden>'+emojis[k]+'</span></span><span><strong>'+labels[k]+'</strong><small>'+({single:'1 Eisfeld',double:'2 Eisfelder',lucky:'3–6 Eisfelder'}[k])+'</small><b>'+price(k)+'</b></span></button>').join('')+'</div></section></div>'+
 '<div class="v44-panel v44-progress"><h2>🎁 Meilensteine & Fortschritt</h2><div class="v44-rewards">'+milestones+'</div><div class="v44-actions">'+(finished&&!done?'<button id="ice-next">➡️ Nächstes Weihnachtsbild</button>':'')+(done?'<button id="v44-finale-open" class="v44-finale-button">🏆 Großes Weihnachtsfinale ansehen</button>':'')+'<button id="ice-reset">↻ Spiel zurücksetzen</button></div></div>'+
 (celebration?'<div class="v44-celebration" role="dialog" aria-modal="true" aria-label="Weihnachtsstern und Geschenk"><div class="v44-celebration-card"><div class="v44-celebration-sparkles">✦ ❄ ✧ ⭐ ✧ ❄ ✦</div><div class="v44-celebration-star">🌟</div><h2>Weihnachtsstern gefunden!</h2><p>🎄 Bild '+celebration.number+' von 70 abgeschlossen</p>'+(celebration.stage==='gift'?'<div class="v44-gift-stage"><div class="v44-gift-box" aria-hidden="true">🎁</div><strong>Dein Weihnachtsgeschenk wartet!</strong><small>Dein Gewinn wurde bereits sicher online verbucht.</small></div><button id="v44-gift-open">🎁 Geschenk öffnen</button>':(celebration.kind==='hammer'?'<div class="v44-prize-wheel" aria-hidden="true"><div class="v44-prize-wheel-face" style="--v44-wheel-end:'+({single:2790,double:2637,lucky:2547}[celebration.hammer]||2430)+'deg"><span>🔨 Einfach 50 %</span><span>🔨 Doppel 35 %</span><span>🔨 Glück 15 %</span></div><div class="v44-prize-wheel-arrow">▼</div></div>':'')+'<p class="v44-wheel-caption">'+(celebration.stage==='wheel'?'🎡 Dein Hammer wird ausgelost …':'🎁 Dein bestätigter Gewinn')+'</p>'+(celebration.stage==='wheel'?'<div class="v44-wheel-wait" role="status">✨ Das Glücksrad dreht sich …</div>':'<div class="v44-celebration-gift v44-gift-unwrapped"><strong>'+celebration.title+'</strong><span>'+celebration.detail+'</span></div><button id="v44-celebration-close">'+(state.completed>=70?'🏆 Finale ansehen':'➡️ Nächstes Weihnachtsbild')+'</button>'))+'</div></div>':'')+
 (showAllGallery?'<div class="v44-gallery-overlay" role="dialog" aria-modal="true" aria-label="Alle Weihnachtsbilder"><div class="v44-gallery-dialog"><div class="v44-gallery-dialog-head"><strong>🖼️ Deine Weihnachtsbilder ('+state.completed+'/70)</strong><button id="v44-gallery-close">✕ Schließen</button></div><div class="v44-gallery-all-grid">'+Array.from({length:70},(_,i)=>i+1).map(n=>'<div class="v44-gallery-all-item '+(n>state.completed?'locked':'')+'">'+(n<=state.completed?'<img loading="lazy" src="'+photo(n)+'" alt="Weihnachtsbild '+n+'">':'<span>🔒</span>')+'<small>Bild '+n+'</small></div>').join('')+'</div></div></div>':'')+'<p class="v44-note">🔐 Fortschritt und Belohnungen werden online gespeichert. Kein Testguthaben.</p></div>';
 const finaleOpen=root.querySelector('#v44-finale-open');if(finaleOpen)finaleOpen.onclick=()=>{celebration={number:70,title:'🏆 Weihnachtsmeister!',detail:'Alle 70 Weihnachtsbilder sind abgeschlossen. Deine Gewinne bleiben online gespeichert.',stage:'reward'};render()};
 const giftOpen=root.querySelector('#v44-gift-open');if(giftOpen)giftOpen.onclick=()=>{if(celebration){if(celebration.kind!=='hammer'){celebration.stage='reward';render();return}celebration.stage='wheel';render();clearTimeout(wheelTimer);const current=celebration;wheelTimer=setTimeout(()=>{if(celebration===current&&celebration.stage==='wheel'){celebration.stage='reward';render()}},8500)}};
 const closeCelebration=root.querySelector('#v44-celebration-close');if(closeCelebration)closeCelebration.onclick=()=>{if(state.finished&&state.completed<70){closeCelebration.disabled=true;closeCelebration.textContent='⏳ Nächstes Bild wird geladen …';run('next')}else{celebration=null;render()}};
 const allGallery=root.querySelector('#v44-gallery-all');if(allGallery)allGallery.onclick=()=>{showAllGallery=true;render()};const closeGallery=root.querySelector('#v44-gallery-close');if(closeGallery)closeGallery.onclick=()=>{showAllGallery=false;render()};const galleryOverlay=root.querySelector('.v44-gallery-overlay');if(galleryOverlay)galleryOverlay.onclick=e=>{if(e.target===galleryOverlay){showAllGallery=false;render()}};
 const fullscreen=root.querySelector('#v44-fullscreen');if(fullscreen)fullscreen.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch(e){message('Vollbild ist in diesem Browser nicht verfügbar.')}};
 root.querySelector('#v44-prev').onclick=()=>{galleryPage=Math.max(0,galleryPage-1);render()};
 root.querySelector('#v44-nextpage').onclick=()=>{galleryPage=Math.min(11,galleryPage+1);render()};
 root.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.preview);if(n===number){message('❄️ Das aktuelle Bild wird erst nach dem Sternfund vollständig enthüllt.');return}message(n<=state.completed?'🖼️ Bild '+n+' wurde bereits abgeschlossen. Dein aktuelles Bild bleibt '+number+'.':'🔒 Bild '+n+' wird erst später freigeschaltet.')});
 root.querySelectorAll('[data-hammer]').forEach(b=>b.onclick=()=>{window.iceHammer=b.dataset.hammer;render()});
 root.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>{if(busy||b.disabled)return;const hammer=window.iceHammer||'single';const board=root.querySelector('.v44-board');if(board){const impact=document.createElement('div');impact.className='v44-impact';impact.setAttribute('aria-hidden','true');const a=b.getBoundingClientRect(),p=board.getBoundingClientRect();impact.style.left=(a.left+a.width/2-p.left)+'px';impact.style.top=(a.top+a.height/2-p.top)+'px';impact.innerHTML='<span class="v44-impact-hammer">'+({single:'🔨',double:'⚒️',lucky:'✨'}[hammer]||'🔨')+'</span>'+Array.from({length:9},(_,i)=>'<i style="--a:'+(i*40)+'deg;--d:'+(34+i%3*14)+'px"></i>').join('');board.appendChild(impact);clearTimeout(impactTimer);impactTimer=setTimeout(()=>impact.remove(),750)}b.classList.add('cracking');run('strike',{index:Number(b.dataset.tile),hammer});});
 const next=root.querySelector('#ice-next');if(next)next.onclick=()=>run('next');
 root.querySelector('#ice-reset').onclick=()=>{if(confirm('Das Weihnachtsevent wirklich von Bild 1 neu beginnen? Bereits erhaltene Joker und gewonnene Hammer bleiben erhalten; frühere Bildgewinne werden nicht erneut ausgezahlt.'))run('reset')};
 let stored=null;try{stored=JSON.parse(sessionStorage.getItem('christmasIcePending')||'null')}catch{}
 if(stored?.uid===user()?.uid&&stored.requestId&&stored.type&&stored.key){
  const b=document.createElement('button');b.id='ice-recover';b.textContent='🔄 Letzte Aktion sicher wiederholen';root.querySelector('.v44-actions').appendChild(b);
  b.onclick=()=>{pending={key:stored.key,requestId:stored.requestId};run(stored.type,stored.extra||{})};
 }
}
async function run(type,extra={}){
 if(busy)return;
 // A timed-out request may already have committed. Never replace its id with a new action.
 let unresolved=null;try{unresolved=JSON.parse(sessionStorage.getItem('christmasIcePending')||'null')}catch{}
 if(unresolved?.uid===user()?.uid&&unresolved.requestId){
  const same=unresolved.type===type&&JSON.stringify(unresolved.extra||{})===JSON.stringify(extra);
  if(!same){message('⚠️ Zuerst die ausstehende Aktion mit „Letzte Aktion sicher wiederholen“ abschließen. So werden keine Hammerschläge doppelt berechnet.');render();return}
  pending={key:unresolved.key,requestId:unresolved.requestId};
 }
 busy=true;message('⏳ Aktion wird gespeichert …');
 const key=type==='strike'?'strike:'+String(state?.completed)+':'+extra.index+':'+extra.hammer:type+':'+String(state?.completed);
 let requestId=pending?.key===key?pending.requestId:id();
 pending={key,requestId};
 try{sessionStorage.setItem('christmasIcePending',JSON.stringify({uid:user()?.uid,key,requestId,extra,type}))}catch{}
 try{
  const data=await request('POST',{type,requestId,...extra});
  const wasFinished=!!state?.finished,oldCompleted=Number(state?.completed||0);
  state=data.state;pending=null;
  if(type==='strike'&&state.finished&&!wasFinished){
   const gift=data.result?.gift;
   const title=gift?(gift.kind==='money'?'💰 Geldgewinn':gift.kind==='joker'?'🔐 Kofferblick-Joker':'🔨 Gratis-Hammer'):'⭐ Bild abgeschlossen';
   const detail=gift?(gift.kind==='money'?money(gift.amount):gift.kind==='joker'?'1 Kofferblick-Joker':({single:'Einfacher Hammer',double:'Doppelhammer',lucky:'Glückshammer'}[gift.hammer]||'Hammer')+' erhalten'):'Bereits erhaltene Belohnungen werden nicht erneut gutgeschrieben.';
   celebration={number:Number(state.completed||oldCompleted+1),title,detail,kind:gift?.kind||'other',hammer:gift?.hammer||null,stage:'gift'};
  }else if(type==='next'||type==='reset'){clearTimeout(wheelTimer);celebration=null;}
  try{sessionStorage.removeItem('christmasIcePending')}catch{}
  if(data.result?.gift){const gift=data.result.gift;message('🎁 '+(gift.kind==='joker'?'Kofferblick-Joker gewonnen!':gift.kind==='money'?money(gift.amount)+' gewonnen!':'Gratis-Hammer gewonnen: '+gift.hammer))}
  else if(data.result?.found)message('🌟 Stern gefunden! Dieses Bild wurde bereits bei einem früheren Durchlauf belohnt.');
  else message('✅ Fortschritt serverseitig gespeichert.');
  render();
 }catch(e){message('⚠️ '+e.message+' – du kannst dieselbe Aktion erneut versuchen.');render()}
 finally{busy=false;render()}
}
async function load(){
 if(busy)return;busy=true;message('⏳ Online-Spielstand laden …');
 try{const data=await request('GET');state=data.state;message('✅ Online-Modus verbunden.');render()}
 catch(e){message('⚠️ '+e.message);root.innerHTML='<button id="ice-retry">Erneut verbinden</button>';root.querySelector('#ice-retry').onclick=load}
 finally{busy=false}
}
window.iceHammer='single';
function accountReady(){
 const auth=window.SpielOnline?.state?.();
 if(auth?.status==='online'&&auth.user)return true;
 if(auth?.status==='guest'||auth?.status==='unconfigured'){
  message('🔐 Bitte zuerst im Spielerprofil anmelden.');
  root.innerHTML='<button id="ice-login">🔐 Spielerprofil anmelden</button>';
  root.querySelector('#ice-login').onclick=()=>window.SpielOnline?.openLogin?.();
 }else if(auth?.status==='error'){
  message('⚠️ Spielerprofil-Verbindung: '+(auth.error||'Bitte erneut versuchen.'));
  root.innerHTML='<button id="ice-profile-retry">🔄 Profilverbindung erneut prüfen</button>';
  root.querySelector('#ice-profile-retry').onclick=()=>window.SpielOnline?.refresh?.().catch(()=>{});
 }else{
  message('⏳ Spielerprofil wird geladen …');
  root.innerHTML='<p>Die sichere Anmeldung wird geprüft. Bitte einen Moment warten.</p>';
 }
 return false;
}
async function loadWhenReady(){
 if(!accountReady())return;
 await load();
}
document.getElementById('ice-reload').onclick=loadWhenReady;
window.addEventListener('spielonline-change',()=>{
 const a=window.SpielOnline?.state?.();
 if(a?.status==='online'&&a.user){
  if(!state&&!busy)loadWhenReady();
 }else if(!busy){state=null;accountReady();}
});
loadWhenReady();
})();
