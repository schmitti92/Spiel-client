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
function render(){
 if(!state){root.innerHTML='<p>Dein Online-Spielstand ist noch nicht gestartet.</p><button id="ice-start">❄️ Online-Spiel starten</button>';document.getElementById('ice-start').onclick=()=>run('start');return}
 const finished=state.finished,done=state.completed>=70,number=Math.min(70,state.completed+1);
 const src=names[(number-1)%names.length]?'./Weihnachtsbilder/'+encodeURIComponent(names[(number-1)%names.length]):'';
 root.innerHTML='<div class="ice-stats"><strong>Bild '+number+' / 70</strong><strong>💰 '+money(state.balance)+'</strong><strong>🔐 '+state.peekJokers+' Joker gewonnen</strong></div>'+
 '<div class="ice-tools">'+['single','double','lucky'].map((k,i)=>'<button data-hammer="'+k+'" class="'+(window.iceHammer===k?'chosen':'')+'">'+['🔨 Einfach','🔨 Doppel','✨ Glück'][i]+' · '+((state.freeHammers?.[k]||0)>0?'Gratis ('+state.freeHammers[k]+')':money([300000,500000,1000000][i]))+'</button>').join('')+'</div>'+
 '<p class="ice-help">💡 Die einfachen Hammerschläge sind kostenlos. Weitere Hammerarten kannst du mit gewonnenem Event-Geld nutzen.</p><div class="ice-board">'+(src?'<img alt="Weihnachtsbild '+number+'" src="'+src+'">':'<div class="ice-placeholder">🎄</div>')+
 '<div class="ice-tiles">'+Array.from({length:20},(_,i)=>'<button data-tile="'+i+'" '+(busy||finished||done||state.opened.includes(i)?'disabled':'')+' class="'+(state.opened.includes(i)||finished||done?'gone':'')+'" aria-label="Eisfeld '+(i+1)+'">❄️</button>').join('')+'</div></div>'+
 (finished?'<section class="ice-gift"><div class="ice-gift-icon">🎁</div><strong>🌟 Weihnachtsstern gefunden!</strong><p>'+(()=>{const g=state.prizes?.find(x=>x.number===state.completed);return g?(g.kind==='money'?'💰 '+money(g.amount)+' gewonnen':g.kind==='hammer'?'🔨 Gratis-Hammer gewonnen: '+g.hammer:'🔐 Kofferblick-Joker gewonnen'):'Dieses Bild ist abgeschlossen. Eine bereits früher ausgegebene Belohnung wird nicht erneut gutgeschrieben.'})()+'</p></section>':'')+
 (finished&&!done?'<button id="ice-next">➡️ Nächstes Weihnachtsbild</button>':done?'<p>🏆 Alle 70 Bilder geschafft!</p>':'');
 root.insertAdjacentHTML('beforeend','<button id="ice-reset">↻ Spiel zurücksetzen</button><p style="font-size:12px;opacity:.8">Kein Testguthaben. Pro Bild stehen 20 kostenlose einfache Hammerschläge bereit. Bereits erhaltene Online-Joker bleiben beim Zurücksetzen erhalten; frühere Bildgewinne werden nicht erneut ausgezahlt.</p>');
 let stored=null;try{stored=JSON.parse(sessionStorage.getItem('christmasIcePending')||'null')}catch{}
 if(stored?.uid===user()?.uid&&stored.requestId&&stored.type&&stored.key){
  root.insertAdjacentHTML('beforeend','<button id="ice-recover">🔄 Letzte Aktion sicher wiederholen</button>');
  root.querySelector('#ice-recover').onclick=()=>{pending={key:stored.key,requestId:stored.requestId};run(stored.type,stored.extra||{})};
 }
 root.querySelector('#ice-reset').onclick=()=>{if(confirm('Das Weihnachtsevent wirklich von Bild 1 neu beginnen? Bereits erhaltene Joker bleiben erhalten, Gewinne früherer Bilder werden nicht erneut ausgezahlt.'))run('reset')};
 root.querySelectorAll('[data-hammer]').forEach(b=>b.onclick=()=>{window.iceHammer=b.dataset.hammer;render()});
 root.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>run('strike',{index:Number(b.dataset.tile),hammer:window.iceHammer||'single'}));
 const next=root.querySelector('#ice-next');if(next)next.onclick=()=>run('next');
}
async function run(type,extra={}){
 if(busy)return;busy=true;message('⏳ Aktion wird gespeichert …');
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
document.getElementById('ice-reload').onclick=load;
document.getElementById('ice-online-tab').onclick=()=>{document.getElementById('ice-offline').hidden=true;document.getElementById('ice-online-panel').hidden=false;load()};
document.getElementById('ice-offline-tab').onclick=()=>{document.getElementById('ice-offline').hidden=false;document.getElementById('ice-online-panel').hidden=true};
document.getElementById('ice-offline').hidden=true;
document.getElementById('ice-online-panel').hidden=false;
load();
})();
