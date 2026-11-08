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
let galleryPage=0,previousFinished=false;
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
 const thumbs=Array.from({length:6},(_,i)=>first+i).filter(n=>n<=70).map(n=>'<button class="v44-thumb '+(n>state.completed+1?'locked':'')+'" data-preview="'+n+'" title="Bild '+n+'">'+(n<=state.completed?'<img loading="lazy" src="'+photo(n)+'" alt="Bild '+n+'">':n===number?'<img loading="lazy" src="'+photo(n)+'" alt="Aktuelles Bild">':'🔒')+'<span>'+n+'</span></button>').join('');
 const milestones=Array.from({length:7},(_,i)=>(i+1)*10).map(n=>'<div class="v44-reward '+(state.completed>=n?'done':number<=n&&number>n-10?'current':'')+'"><span>🎁</span><strong>'+n+'/70</strong></div>').join('');
 root.innerHTML='<div class="v44-app"><header class="v44-head"><div class="v44-plaque">🎄 Weihnachtsevent 2</div><div class="v44-heading"><h1>Die magischen Weihnachtsbilder</h1><p>⭐ 70 Bilder · Sternsuche · Überraschungsbelohnungen ⭐</p></div><div class="v44-plaque">💰 '+money(state.balance)+'</div></header>'+
 '<div class="v44-layout"><section class="v44-panel v44-gallery-panel"><h2>🖼️ Bildergalerie</h2><div class="v44-gallery">'+thumbs+'</div><div class="v44-gallery-nav"><button id="v44-prev" '+(galleryPage===0?'disabled':'')+'>❮</button><span>Bilder '+first+'–'+Math.min(first+5,70)+'</span><button id="v44-nextpage" '+(first+5>=70?'disabled':'')+'>❯</button></div><p>🔓 '+state.completed+' von 70 Bildern abgeschlossen</p><p>🔐 '+state.peekJokers+' Kofferblick-Joker</p></section>'+
 '<section class="v44-panel v44-board-panel"><h2>❄️ Bild '+number+' von 70</h2><div class="ice-board v44-board"><img alt="Weihnachtsbild '+number+'" src="'+photo(number)+'"><div class="ice-tiles">'+Array.from({length:20},(_,i)=>'<button data-tile="'+i+'" '+(busy||finished||done||state.opened.includes(i)?'disabled':'')+' class="'+(state.opened.includes(i)||finished||done?'gone':'')+'" aria-label="Eisfeld '+(i+1)+'">❄</button>').join('')+'</div></div><p class="v44-instruction">🔨 Wähle einen Hammer und tippe auf ein Eisfeld.</p></section>'+
 '<section class="v44-panel v44-hammer-panel"><h2>🔨 Wähle deinen Hammer</h2><div class="v44-hammers">'+['single','double','lucky'].map(k=>'<button class="v44-hammer '+(chosen===k?'selected':'')+'" data-hammer="'+k+'"><span class="v44-hammer-icon"><img class="v44-hammer-art" src="./v44-grafiken/'+hammerArt[k]+'" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="v44-hammer-fallback" hidden>'+emojis[k]+'</span></span><span><strong>'+labels[k]+'</strong><small>'+({single:'1 Eisfeld',double:'2 Eisfelder',lucky:'Glückschance'}[k])+'</small><b>'+price(k)+'</b></span></button>').join('')+'</div></section></div>'+
 '<div class="v44-panel v44-progress"><h2>🎁 Meilensteine & Fortschritt</h2><div class="v44-rewards">'+milestones+'</div><div class="v44-actions">'+(finished&&!done?'<button id="ice-next">➡️ Nächstes Weihnachtsbild</button>':'')+(done?'<strong>🏆 Alle 70 Bilder geschafft!</strong>':'')+'<button id="ice-reset">↻ Spiel zurücksetzen</button></div></div>'+
 (finished?'<div class="v44-victory"><div class="v44-star">🌟</div><strong>Weihnachtsstern gefunden!</strong><p>'+(()=>{const g=state.prizes?.find(x=>x.number===state.completed);return g?(g.kind==='money'?'💰 '+money(g.amount)+' gewonnen':g.kind==='hammer'?'🔨 Gratis-Hammer: '+g.hammer:'🔐 Kofferblick-Joker gewonnen'):'Dieses Bild ist abgeschlossen. Bereits erhaltene Belohnungen werden nicht erneut ausgezahlt.'})()+'</p></div>':'')+
 '<p class="v44-note">🔐 Fortschritt und Belohnungen werden online gespeichert. Kein Testguthaben.</p></div>';
 root.querySelector('#v44-prev').onclick=()=>{galleryPage=Math.max(0,galleryPage-1);render()};
 root.querySelector('#v44-nextpage').onclick=()=>{galleryPage=Math.min(11,galleryPage+1);render()};
 root.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.preview);if(n===number)return;message(n<=state.completed?'🖼️ Bild '+n+' wurde bereits abgeschlossen. Dein aktuelles Bild bleibt '+number+'.':'🔒 Bild '+n+' wird erst später freigeschaltet.')});
 root.querySelectorAll('[data-hammer]').forEach(b=>b.onclick=()=>{window.iceHammer=b.dataset.hammer;render()});
 root.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>{if(busy)return;b.classList.add('cracking');run('strike',{index:Number(b.dataset.tile),hammer:window.iceHammer||'single'});});
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
  state=data.state;pending=null;
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
