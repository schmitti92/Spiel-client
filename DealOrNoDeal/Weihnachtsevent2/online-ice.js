'use strict';
(()=>{
const root=document.getElementById('ice-online'),status=document.getElementById('ice-online-status');
const names=["IMG-20261108-WA0000.jpg","IMG-20261108-WA0001.jpg","IMG-20261108-WA0002.jpg","IMG-20261108-WA0003.jpg","IMG-20261108-WA0004.jpg","IMG-20261108-WA0005.jpg","IMG-20261108-WA0006.jpg","IMG-20261108-WA0007.jpg","IMG-20261108-WA0011.jpg","IMG-20261108-WA0012.jpg","IMG-20261108-WA0013.jpg","IMG-20261108-WA0014.jpg","IMG-20261108-WA0015.jpg","IMG-20261108-WA0016.jpg","IMG-20261108-WA0017.jpg","IMG-20261108-WA0018.jpg","IMG-20261108-WA0023.jpg","IMG-20261108-WA0024.jpg","IMG-20261108-WA0025.jpg","IMG-20261108-WA0027.jpg","IMG-20261108-WA0030.jpg","IMG-20261108-WA0032.jpg","IMG-20261108-WA0033.jpg","IMG-20261108-WA0034.jpg","IMG-20261108-WA0035.jpg","IMG-20261108-WA0036.jpg","IMG-20261108-WA0038.jpg","IMG-20261108-WA0040.jpg","IMG-20261108-WA0041.jpg","IMG-20261108-WA0042.jpg","IMG-20261108-WA0043.jpg","IMG-20261108-WA0045.jpg","IMG-20261108-WA0046.jpg","IMG-20261108-WA0047.jpg","IMG-20261108-WA0048(1).jpg","IMG-20261108-WA0051.jpg","IMG-20261108-WA0052.jpg","IMG-20261108-WA0053.jpg","IMG-20261108-WA0054.jpg","IMG-20261108-WA0056.jpg","IMG-20261108-WA0065.jpg","IMG-20261108-WA0067.jpg","IMG-20261108-WA0068.jpg","IMG-20261108-WA0069.jpg","IMG-20261108-WA0070.jpg","IMG-20261108-WA0074.jpg","IMG-20261108-WA0075.jpg","IMG-20261108-WA0077.jpg","IMG-20261108-WA0079.jpg","IMG-20261108-WA0081.jpg","IMG-20261108-WA0084.jpg","IMG-20261108-WA0085.jpg","IMG-20261108-WA0086.jpg","IMG-20261108-WA0089.jpg","IMG-20261108-WA0091.jpg","IMG-20261108-WA0092.jpg","IMG-20261108-WA0094.jpg","IMG-20261108-WA0097.jpg","IMG-20261108-WA0099.jpg","IMG-20261108-WA0104.jpg","IMG-20261108-WA0105.jpg","IMG-20261108-WA0109.jpg","IMG-20261108-WA0110.jpg","IMG-20261108-WA0111.jpg","IMG-20261108-WA0113(1).jpg","IMG-20261108-WA0114.jpg","IMG-20261108-WA0121.jpg","motion_photo_3952067152776055351.jpg","motion_photo_4388198511032034292.jpg","motion_photo_6120708326686891259.jpg"];
const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
let state=null,busy=false,pending=null;
const money=n=>(Number(n||0)/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const user=()=>{const a=window.SpielOnline?.state?.();return a?.status==='online'?a.user:null};
function message(t){status.textContent=t;status.hidden=/^✅ Online-Modus verbunden\.?$/.test(t)}
async function request(type,body){
 const u=user();if(!u)throw Error('Bitte zuerst im Spielerprofil anmelden.');
 const token=await u.getIdToken();
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
 try{
  const pendingId=type==='GET'?String(body?.pendingId||''):'';
  const endpoint=api+'/api/christmas-ice/'+(type==='GET'?'me':'action')+(pendingId?'?pendingId='+encodeURIComponent(pendingId):'');
  const response=await fetch(endpoint,{method:type,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',signal:controller.signal,body:type==='GET'?undefined:(body?JSON.stringify(body):undefined)});
  const data=await response.json();if(!response.ok||!data.ok){const error=new Error(data.error||'SERVER_ERROR');error.confirmedRejection=true;throw error}return data;
 }catch(error){
  if(error?.name==='AbortError')throw Error('Zeitüberschreitung nach 25 Sekunden');
  throw error;
 }finally{clearTimeout(timeout)}
}
const id=()=>crypto.randomUUID();
const ICE_PENDING_KEY='christmasIcePending';
const ICE_PENDING_DURABLE_KEY='christmasIcePendingV2';
function validPending(item){
 return item?.uid===user()?.uid&&/^[A-Za-z0-9_-]{12,90}$/.test(item.requestId||'')&&
  (item.expectedPicture===undefined||(Number.isInteger(item.expectedPicture)&&item.expectedPicture>=1&&item.expectedPicture<=70))&&
  ['start','strike','next','reset'].includes(item.type)&&typeof item.key==='string'&&
  item.extra&&typeof item.extra==='object';
}
function readPending(){
 // Session storage preserves old clients; local storage additionally survives
 // tab closure and navigation from the Christmas-event hub.
 try{const item=JSON.parse(sessionStorage.getItem(ICE_PENDING_KEY)||'null');if(validPending(item))return item}catch{}
 try{
  const item=JSON.parse(localStorage.getItem(ICE_PENDING_DURABLE_KEY)||'null');
  if(validPending(item)&&Number.isFinite(item.savedAt)&&Date.now()-item.savedAt<48*60*60*1000)return item;
 }catch{}
 return null;
}
function rememberPending(item){
 try{sessionStorage.setItem(ICE_PENDING_KEY,JSON.stringify(item))}catch{}
 try{localStorage.setItem(ICE_PENDING_DURABLE_KEY,JSON.stringify({...item,savedAt:Date.now()}))}catch{}
}
function forgetPending(){
 pending=null;
 try{sessionStorage.removeItem(ICE_PENDING_KEY)}catch{}
 try{localStorage.removeItem(ICE_PENDING_DURABLE_KEY)}catch{}
}
let galleryPage=0,showAllGallery=false,largeGalleryImage=null,confirmedHit=null,celebrationDelayTimer=null,celebration=null,wheelTimer=null;
function recoveredGift(){
 // Rebuild only the presentation from already confirmed state after a reload.
 // Never draw another reward or re-run an action; image 70 is also recoverable.
 if(!state?.finished||celebration)return;
 const gift=(state.prizes||[]).find(g=>g.number===state.completed);
 const title=!gift?'🎄 Bild abgeschlossen':gift.kind==='money'?'💰 Geldgewinn':gift.kind==='joker'?'🔐 Kofferblick-Joker':'🔨 Gratis-Hammer';
 const detail=!gift?'Bereits erhaltene Belohnungen werden nicht erneut gutgeschrieben.':gift.kind==='money'?money(gift.amount):gift.kind==='joker'?'1 Kofferblick-Joker':({single:'Einfacher Hammer',double:'Doppelhammer',lucky:'Glückshammer'}[gift.hammer]||'Hammer')+' erhalten';
 celebration={number:state.completed,title,detail,kind:gift?.kind||'other',hammer:gift?.hammer||null,amount:gift?.amount||0,stage:'image'};
}

function render(){
 if(state){
  // Reuse the progress this page already has for the shared event overview.
  try{
   const uid=user()?.uid;
   if(uid)sessionStorage.setItem('christmas-hub-v1-ice-'+uid,JSON.stringify({
    at:Date.now(),values:{completed:Math.max(0,Math.min(70,Number(state.completed)||0))}
   }));
  }catch(_){}
 }
 if(!state){root.innerHTML='<p>Dein Online-Spielstand ist noch nicht gestartet.</p><button id="ice-start">❄️ Online-Spiel starten</button><button id="ice-check">🔄 Spielstand prüfen</button>';root.querySelector('#ice-start').onclick=()=>run('start');root.querySelector('#ice-check').onclick=()=>load();return}
 const finished=!!state.finished,done=state.completed>=70,number=Math.min(70,state.completed+(finished?0:1));
 // Tile difficulty is authoritative from the server; fall back to the known
 // milestone only for old cached responses, never infer it from local storage.
 const completedImages=Number(state.completed)||0,earnedImages=Number(state.maxRewarded)||0;
 const reportedTiles=Number(state.tilesRequired||state.tileCount);
 const fallbackMilestone=completedImages>20||(completedImages===20&&!finished)?30
  :completedImages>10||(completedImages===10&&!finished)?25:20;
 const completedMilestone=finished&&(completedImages===10||completedImages===20);
 const earnedMilestone=completedMilestone?20:earnedImages>=20?30:earnedImages>=10?25:20;
 // Use server-authoritative tilesRequired; recover older cached responses safely.
 const tileCount=[20,25,30].includes(Number(state.tilesRequired))?Number(state.tilesRequired)
  :Math.max(fallbackMilestone,earnedMilestone,[20,25,30].includes(reportedTiles)?reportedTiles:20);
 const openedTiles=Math.min(tileCount,Array.isArray(state.opened)?state.opened.length:0);
 const fullClearPhase=tileCount>=25;
 const tileLayoutClass=tileCount===30?' ice-tiles-30':fullClearPhase?' ice-tiles-25':'';
 const photo=n=>'./Weihnachtsbilder/'+encodeURIComponent(names[(n-1)%names.length]);
 const chosen=window.iceHammer||'single';
 const labels={single:'Einfacher Hammer',double:'Doppelhammer',lucky:'Glückshammer'};
 const emojis={single:'🔨',double:'⚒️',lucky:'✨'};
 const hammerArt={single:'hammer-einfach.webp',double:'hammer-doppel.webp',lucky:'hammer-glueck.webp'};
 const costs={single:30000000,double:50000000,lucky:100000000};
 const price=k=>(state.freeHammers?.[k]||0)>0?'Gewonnen ('+state.freeHammers[k]+')':money(costs[k]);
 const first=galleryPage*6+1;
 const thumbs=Array.from({length:6},(_,i)=>first+i).filter(n=>n<=70).map(n=>'<button class="v44-thumb '+(n>state.completed+1?'locked':'')+(n===number&&!done?' current-preview':'')+'" data-preview="'+n+'" title="Bild '+n+'"'+(n===number&&!done?' aria-current="step"':'')+'>'+(n<=state.completed?'<img loading="lazy" src="'+photo(n)+'" alt="Bild '+n+'">':n===number?'❄️':'🔒')+'<span>'+n+'</span></button>').join('');
 // Fixed asset IDs are verified from the GitHub upload and the numbers
 // printed on the original generated images. Milestone 40 may be uploaded
 // later; its image automatically falls back to the existing chest asset.
 const milestoneIllustrations={
  10:'file_000000009fd8821091325d0ec9e0df96.png',
  20:'file_000000001d048210aa9786488fa7ba80.png',
  30:'file_0000000084dc8210b4c45821586b3190.png',
  40:'file_00000000857882108b0bc8eab4ef7920.png',
  50:'file_000000009c908210bf0c6fba6a2b5d49.png',
  60:'file_000000007eec8211a47e82be8eefa98d.png',
  70:'file_00000000134c82109685ad9abdc7d1f4.png'
 };
 // Presentation-only image path. A completed milestone never credits any new reward.
 const milestoneImage=n=>n===20&&Math.max(Number(state.completed)||0,Number(state.maxRewarded)||0)>=20?'../../Kniffel/Bilder/weihnachtswuerfel-5.png':'./Weihnachtsbilder/'+(milestoneIllustrations[n]||'originalgrafik-15.webp');
 const nextMilestone=state.completed>=70?70:Math.ceil((state.completed+1)/10)*10;
 const remainingMilestone=Math.max(0,nextMilestone-state.completed);
 const progressIntro='<div class="v44-progress-intro">'
  +'<div class="v44-progress-copy"><strong>✨ Deine Reise durch 70 Weihnachtsbilder</strong><span>'
  +(state.completed>=70?'🏆 Alle 70 Weihnachtsbilder gemeistert!':'🎯 Nächster Meilenstein: Bild '+nextMilestone+' · noch '+remainingMilestone+' Bild'+(remainingMilestone===1?'':'er')+' bis zum nächsten Geschenk')
  +'</span></div><div class="v44-progress-count">'+state.completed+' / 70 Bilder abgeschlossen</div>'
  +'<div class="v44-progress-meter" role="progressbar" aria-label="Fortschritt der Weihnachtsbilder" aria-valuemin="0" aria-valuemax="70" aria-valuenow="'+state.completed+'"><i style="width:'+(state.completed/70*100)+'%"></i></div></div>';
 const milestones=Array.from({length:7},(_,i)=>(i+1)*10).map(n=>{
  const unlocked=(n===20?Math.max(Number(state.completed)||0,Number(state.maxRewarded)||0):Number(state.completed)||0)>=n,current=!unlocked&&n===nextMilestone;
  const first=n===10,final=n===70;
  const title=first?(unlocked?'Jan Schlappen':'Geheime Belohnung'):n===20?(unlocked?'🎲 Weihnachtswürfel für Kniffel':'Geheime Belohnung'):final?'Weihnachtsfinale':'Geheime Schatztruhe';
  const stateText=unlocked?'✅ Meilenstein erreicht':current?'🎁 Noch '+(n-state.completed)+' Bild'+(n-state.completed===1?'':'er'):'🔒 Noch gesperrt';
  const art=n===20&&unlocked?milestoneImage(n):'./Weihnachtsbilder/'+milestoneIllustrations[n];
  return '<article class="v44-reward '+(unlocked?'done':current?'current':'locked')+'" data-milestone="'+n+'" aria-label="Meilenstein bei '+n+' von 70 Bildern: '+stateText+'">'
   +'<div class="v44-reward-top"><div class="v44-reward-step">MEILENSTEIN</div><strong class="v44-reward-number">'+n+'<small>/70</small></strong></div>'
   +'<div class="v44-reward-art"><img src="'+art+'" alt="'+(n===20&&unlocked?'Weihnachtswürfel für Kniffel':'Weihnachts-Schatztruhe für Meilenstein '+n)+'" loading="lazy" decoding="async" width="160" height="160" onerror="this.onerror=null;this.src=\'./Weihnachtsbilder/originalgrafik-15.webp\'"></div>'
   +'<strong class="v44-reward-title">'+title+'</strong><small class="v44-reward-status">'+stateText+'</small></article>';
 }).join('');
 root.innerHTML='<div class="v44-app"><div class="v44-recovery-bar" role="group" aria-label="Sichere Spielstand-Reparatur"><span>'+(readPending()?'⚠️ Letzte Aktion noch offen':'🔐 Spielstand wird online gesichert')+'</span><button id="ice-recover" type="button">'+(readPending()?'🔄 Letzte Aktion abschließen':'🔄 Spielstand prüfen')+'</button></div><header class="v44-head"><div class="v44-plaque v44-chapter-plaque">❄️ KAPITEL 2 · BILDERZAUBER</div><div class="v44-heading"><h1>Die magischen Weihnachtsbilder</h1><p>70 Bilder · Eisfelder freilegen · Meilenstein-Belohnungen</p></div><div class="v44-plaque">💰 '+money(state.balance)+'</div></header>'+
 '<div class="v44-layout"><section class="v44-panel v44-gallery-panel"><h2>🖼️ Bildergalerie</h2><div class="v44-gallery">'+thumbs+'</div><div class="v44-gallery-nav"><button id="v44-prev" '+(galleryPage===0?'disabled':'')+'>❮</button><span>Bilder '+first+'–'+Math.min(first+5,70)+'</span><button id="v44-nextpage" '+(first+5>=70?'disabled':'')+'>❯</button></div><button id="v44-gallery-all" class="v44-gallery-all">🖼️ Alle 70 Bilder ansehen</button><div class="v44-gallery-stats"><div class="v44-gallery-stat"><strong>🖼️ '+state.completed+'/70</strong>Bilder geschafft</div><div class="v44-gallery-stat"><strong>🔐 '+state.peekJokers+'</strong>Kofferblick-Joker</div></div></section>'+
 '<section class="v44-panel v44-board-panel"><h2>❄️ Bild '+number+' von 70</h2><div class="v44-ice-meter" aria-label="'+openedTiles+' von '+tileCount+' Eisfeldern geöffnet"><span>🧊 '+openedTiles+'/'+tileCount+' Eisfelder</span><div><i style="width:'+(openedTiles/tileCount*100)+'%"></i></div></div><div class="ice-board v44-board"><img alt="Weihnachtsbild '+number+'" src="'+photo(number)+'"><div class="ice-tiles'+tileLayoutClass+'">'+Array.from({length:tileCount},(_,i)=>'<button data-tile="'+i+'" '+(busy||finished||done||state.opened.includes(i)?'disabled':'')+' class="'+(state.opened.includes(i)||finished||done?'gone':'')+'" aria-label="Eisfeld '+(i+1)+' von '+tileCount+'">❄</button>').join('')+'</div></div><p class="v44-instruction">'+(finished?(done?'🏆 Alle 70 Weihnachtsbilder abgeschlossen!':'✅ Dieses Bild ist bereits fertig! Starte das nächste Weihnachtsbild, um wieder hämmern zu können.'):number>=23?'🧊 Kein Stern mehr: Zerstöre alle '+tileCount+' Eisblöcke, um das Bild vollständig freizulegen.':fullClearPhase?'🌟 '+tileCount+' Eisfelder: Finde den versteckten Stern! Er öffnet das ganze Bild sofort.':'🔨 Wähle einen Hammer und finde den versteckten Stern!')+'</p>'+(finished&&!done?'<button type="button" id="ice-next-board">➡️ Nächstes Bild starten und weiter Eis aufbrechen</button>':'')+'</section>'+
 '<section class="v44-panel v44-hammer-panel"><h2>🔨 Wähle deinen Hammer</h2><div class="v44-hammers">'+['single','double','lucky'].map(k=>'<button class="v44-hammer '+(chosen===k?'selected':'')+'" data-hammer="'+k+'" aria-pressed="'+(chosen===k?'true':'false')+'"><span class="v44-hammer-icon"><img class="v44-hammer-art" src="./Weihnachtsbilder/'+hammerArt[k]+'" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="v44-hammer-fallback" hidden>'+emojis[k]+'</span></span><span><strong>'+labels[k]+'</strong><small>'+({single:'1 Eisfeld',double:'2 Eisfelder',lucky:'3–6 Eisfelder'}[k])+'</small><b>'+price(k)+'</b></span></button>').join('')+'</div></section></div>'+
 '<div class="v44-panel v44-progress"><h2>🎁 Meilensteine & Fortschritt</h2>'+progressIntro+'<div class="v44-rewards">'+milestones+'</div><div class="v44-actions">'+(finished&&!done?'<button id="ice-next">➡️ Nächstes Weihnachtsbild</button>':'')+(done?'<button id="v44-finale-open" class="v44-finale-button">🏆 Großes Weihnachtsfinale ansehen</button>':'')+'</div></div>'+
 (celebration?.stage==='image'&&!celebrationDelayTimer&&state.finished&&Number(state.completed)>=celebration.number
 ?'<div class="v44-big-reveal" role="dialog" aria-modal="true" aria-labelledby="v44-big-reveal-title"><div class="v44-big-reveal-card">'
 +'<div class="v44-big-reveal-snow" aria-hidden="true">'+Array.from({length:12},(_,i)=>'<i style="--n:'+i+'"></i>').join('')+'</div>'
 +'<div class="v44-big-reveal-kicker">✦ WEIHNACHTSEVENT 2 · BILDERZAUBER ✦</div>'
 +'<h2 id="v44-big-reveal-title">'+(celebration.number>=23?'🧊 Alle Eisblöcke entfernt!':'🌟 Bild freigelegt!')+'</h2>'
 +'<div class="v44-big-reveal-number">Bild '+celebration.number+' von 70 abgeschlossen</div>'
 +'<div class="v44-big-reveal-frame"><img src="'+photo(celebration.number)+'" alt="Vollständig freigelegtes Weihnachtsbild '+celebration.number+'" decoding="async"><span class="v44-big-reveal-sparkle" aria-hidden="true">✧ ✦ ❄ ✧ ✦ ❄ ✧</span></div>'
 +'<p>🎄 Dein Weihnachtsbild wurde erfolgreich freigelegt. Dein Gewinn ist bereits sicher gespeichert.</p>'
 +'<button type="button" id="v44-big-reveal-continue">🎁 Weihnachtsgeschenk ansehen</button>'
 +'</div></div>':'')+
 (celebration&&celebration.stage!=='image'&&!celebrationDelayTimer?'<div class="v44-celebration" role="dialog" aria-modal="true" aria-label="Weihnachtsbild und Geschenk"><div class="v44-celebration-card '+(celebration.stage==='milestone'?'v44-celebration-milestone':'')+'"><div class="v44-celebration-sparkles">✦ ❄ ✧ ⭐ ✧ ❄ ✦</div><div class="v44-celebration-star">'+(celebration.number>=23?'🧊':'🌟')+'</div><h2>'+(celebration.stage==='milestone'?'🎁 Dein Weihnachts-Meilenstein!':celebration.number>=23?'Alle Eisblöcke entfernt!':'Weihnachtsstern gefunden!')+'</h2><p>🎄 Bild '+celebration.number+' von 70 abgeschlossen</p>'+(celebration.stage==='milestone'?
 '<div class="v44-milestone-unlock" data-milestone="'+celebration.number+'">'
 +'<div class="v44-milestone-kicker">✦ MEILENSTEIN ERREICHT ✦</div>'
 +'<div class="v44-milestone-treasure"><span class="v44-milestone-rays" aria-hidden="true"></span><img src="'+milestoneImage(celebration.number)+'" alt="Weihnachts-Schatztruhe für Meilenstein '+celebration.number+'" width="350" height="350" decoding="async"></div>'
 +'<strong class="v44-milestone-title">'+celebration.number+' von 70 Weihnachtsbildern!</strong>'
 +'<p class="v44-milestone-message">'+(celebration.number===10
  ?'🎭 Jan Schlappen freigeschaltet! Du kannst ihn jetzt in der Deal-or-No-Deal-Lobby auswählen. Die Freischaltung bleibt nach einem Spiel-Reset erhalten.'
  :celebration.number===20?'🎲 Weihnachtswürfel freigeschaltet! Deine sechs roten Würfel mit goldenen Augen sind ab jetzt in Kniffel (lokal und online) verfügbar. Melde dich mit demselben Profil an und schalte das Design nach Wunsch an oder aus. Die Freischaltung bleibt nach einem Reset bestehen.'
  :'🎄 Meilenstein geschafft! Deine reguläre Bildbelohnung ist online gespeichert. Für diesen Meilenstein gibt es derzeit keine zusätzliche Freischaltung.')+'</p>'
 +'<span class="v44-milestone-seal">🎖️ WEIHNACHTS-ERFOLG</span></div>'
 +'<button id="v44-celebration-close">'+(state.completed>=70?'🏆 Abschluss ansehen':'➡️ Nächstes Weihnachtsbild')+'</button>'
 :celebration.stage==='gift'?'<div class="v44-gift-stage"><div class="v44-gift-box" aria-hidden="true">🎁</div><strong>Dein Weihnachtsgeschenk wartet!</strong><small>Dein Gewinn wurde bereits sicher online verbucht.</small></div><button id="v44-gift-open">🎁 Geschenk öffnen</button>':(celebration.kind==='hammer'?'<div class="v44-prize-wheel" aria-hidden="true"><div class="v44-prize-wheel-face '+(celebration.stage==='wheel'?'v44-wheel-spinning':'v44-wheel-settled')+'" style="--v44-wheel-end:'+({single:2790,double:2637,lucky:2547}[celebration.hammer]||2430)+'deg"><span>🔨 Einfach 50 %</span><span>🔨 Doppel 35 %</span><span>🔨 Glück 15 %</span></div><div class="v44-prize-wheel-arrow">▼</div></div>':'')+'<p class="v44-wheel-caption">'+(celebration.stage==='wheel'?'🎡 Dein Hammer wird ausgelost …':'🎁 Dein bestätigter Gewinn')+'</p>'+(celebration.stage==='wheel'?'<div class="v44-wheel-wait" role="status">✨ Das Glücksrad dreht sich …</div>':'<div class="v44-celebration-gift v44-gift-unwrapped '+(celebration.kind==='money'?'v44-money-prize':'')+'">'+(celebration.kind==='money'?'<div class="v27-money-stage" id="v27MoneyStage"><div class="v27-money-label">DEIN WEIHNACHTSGEWINN</div><div class="v27-money-value" id="v44-money-count" aria-live="off">0 €</div><div class="v27-money-track" role="progressbar" aria-label="Geldgewinn" aria-valuemin="0" aria-valuemax="2000000" aria-valuenow="0"><div class="v27-money-fill" id="v27MoneyFill"></div></div><div class="v27-money-scale"><span>0 €</span><span>1.000.000 €</span><span>2.000.000 €</span></div><div class="v27-money-final" id="v27MoneyFinal">Die Geldleiste füllt sich …</div></div>':'')+(celebration.kind==='money'?'':'<strong>'+celebration.title+'</strong><span>'+celebration.detail+'</span>')+'</div><button id="v44-celebration-close">'+(state.completed>=70?'🏆 Finale ansehen':'➡️ Nächstes Weihnachtsbild')+'</button>'))+'</div></div>':'')+
 (showAllGallery?'<div class="v44-gallery-overlay" role="dialog" aria-modal="true" aria-label="Alle Weihnachtsbilder"><div class="v44-gallery-dialog"><div class="v44-gallery-dialog-head"><strong>🖼️ Deine Weihnachtsbilder ('+state.completed+'/70)</strong><button id="v44-gallery-close">✕ Schließen</button></div><div class="v44-gallery-all-grid">'+Array.from({length:70},(_,i)=>i+1).map(n=>'<div class="v44-gallery-all-item '+(n>state.completed?'locked':'')+'">'+(n<=state.completed?'<button class="v44-gallery-open-image" data-large-image="'+n+'" aria-label="Freigeschaltetes Weihnachtsbild '+n+' groß ansehen"><img loading="lazy" src="'+photo(n)+'" alt="Weihnachtsbild '+n+'"><span>🔍 Vergrößern</span></button>':'<span>🔒</span>')+'<small>Bild '+n+'</small></div>').join('')+'</div></div></div>':'')+(showAllGallery&&largeGalleryImage&&largeGalleryImage<=state.completed?'<div class="v44-image-lightbox" role="dialog" aria-modal="true" aria-label="Weihnachtsbild '+largeGalleryImage+' groß ansehen"><div class="v44-image-viewer"><div class="v44-image-viewer-top"><strong>🖼️ Weihnachtsbild '+largeGalleryImage+' von 70</strong><button id="v44-image-close" aria-label="Großansicht schließen">✕ Schließen</button></div><div class="v44-image-viewer-stage"><button id="v44-image-prev" '+(largeGalleryImage<=1?'disabled':'')+' aria-label="Vorheriges Bild">❮</button><img src="'+photo(largeGalleryImage)+'" alt="Freigeschaltetes Weihnachtsbild '+largeGalleryImage+' in Großansicht"><button id="v44-image-next" '+(largeGalleryImage>=state.completed?'disabled':'')+' aria-label="Nächstes Bild">❯</button></div><p>Mit den Pfeilen zwischen freigeschalteten Bildern wechseln</p></div></div>':'')+'<p class="v44-note">🔐 Fortschritt und Belohnungen werden online gespeichert. Kontostand aus Deal or No Deal. Kostenlose Hammer gibt es ausschließlich als Siegerbonus vom Hammerrad.</p></div>';
 const milestoneImg=root.querySelector('.v44-milestone-treasure img');
 if(milestoneImg)milestoneImg.addEventListener('error',()=>{
  milestoneImg.src='./Weihnachtsbilder/originalgrafik-15.webp';
 },{once:true});
 const moneyCount=root.querySelector('#v44-money-count');
 if(moneyCount&&celebration?.kind==='money'){
  const amount=Number(celebration.amount||0),meter=root.querySelector('.v27-money-track'),fill=root.querySelector('#v27MoneyFill'),stage=root.querySelector('#v27MoneyStage'),final=root.querySelector('#v27MoneyFinal'),close=root.querySelector('#v44-celebration-close');
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const duration=reduced?150:3500,start=performance.now();
  if(close){close.disabled=true;close.textContent='Gewinn wird ermittelt …'}
  const finish=()=>{
   if(!moneyCount.isConnected)return;
   moneyCount.textContent=money(amount);
   if(fill)fill.style.width=(Math.min(100,amount/20000))+'%';
   if(meter)meter.setAttribute('aria-valuenow',String(amount));
   if(stage)stage.classList.add('v27-finished');
   if(final)final.textContent='✦ GEWONNEN! ✦';
   if(close){close.disabled=false;close.textContent=state.completed>=70?'🏆 Finale ansehen':'Gewinn abholen'}
  };
  const frame=now=>{
   if(!moneyCount.isConnected)return;
   const t=Math.min(1,(now-start)/duration),eased=1-(1-t)**3,value=Math.round(amount*eased);
   moneyCount.textContent=money(value);
   if(meter)meter.setAttribute('aria-valuenow',String(value));
   if(fill)fill.style.width=(Math.min(100,value/20000))+'%';
   if(t<1)requestAnimationFrame(frame);else finish();
  };
  requestAnimationFrame(frame);
 }
 const finaleOpen=root.querySelector('#v44-finale-open');if(finaleOpen)finaleOpen.onclick=()=>{celebration={number:70,title:'🏆 Weihnachtsmeister!',detail:'Alle 70 Weihnachtsbilder sind abgeschlossen. Deine Gewinne bleiben online gespeichert.',stage:'finale'};render()};
 const bigRevealContinue=root.querySelector('#v44-big-reveal-continue');
 if(bigRevealContinue)bigRevealContinue.onclick=()=>{
  if(!celebration||celebration.stage!=='image'||!state?.finished||state.completed<celebration.number)return;
  celebration.stage='gift';render();
 };
 const giftOpen=root.querySelector('#v44-gift-open');if(giftOpen)giftOpen.onclick=()=>{if(celebration){if(celebration.kind!=='hammer'){celebration.stage='reward';render();return}celebration.stage='wheel';render();clearTimeout(wheelTimer);const current=celebration;wheelTimer=setTimeout(()=>{if(celebration===current&&celebration.stage==='wheel'){celebration.stage='reward';render()}},8500)}};
 const closeCelebration=root.querySelector('#v44-celebration-close');if(closeCelebration)closeCelebration.onclick=()=>{if(celebration&&celebration.stage==='reward'&&celebration.number%10===0&&!celebration.milestoneShown){celebration.milestoneShown=true;celebration.stage='milestone';render();return}if(state.finished&&state.completed<70){closeCelebration.disabled=true;closeCelebration.textContent='⏳ Nächstes Bild wird geladen …';run('next')}else{celebration=null;render()}};
 const allGallery=root.querySelector('#v44-gallery-all');if(allGallery)allGallery.onclick=()=>{showAllGallery=true;render()};const closeGallery=root.querySelector('#v44-gallery-close');if(closeGallery)closeGallery.onclick=()=>{showAllGallery=false;largeGalleryImage=null;render()};const galleryOverlay=root.querySelector('.v44-gallery-overlay');if(galleryOverlay)galleryOverlay.onclick=e=>{if(e.target===galleryOverlay){showAllGallery=false;render()}};
 root.querySelectorAll('[data-large-image]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.largeImage);if(n>0&&n<=state.completed){largeGalleryImage=n;render()}});
 const closeLarge=root.querySelector('#v44-image-close');if(closeLarge)closeLarge.onclick=()=>{largeGalleryImage=null;render()};
 const prevLarge=root.querySelector('#v44-image-prev');if(prevLarge)prevLarge.onclick=()=>{largeGalleryImage=Math.max(1,largeGalleryImage-1);render()};
 const nextLarge=root.querySelector('#v44-image-next');if(nextLarge)nextLarge.onclick=()=>{largeGalleryImage=Math.min(state.completed,largeGalleryImage+1);render()};
 const lightbox=root.querySelector('.v44-image-lightbox');if(lightbox)lightbox.onclick=e=>{if(e.target===lightbox){largeGalleryImage=null;render()}};
 root.querySelector('#v44-prev').onclick=()=>{galleryPage=Math.max(0,galleryPage-1);render()};
 root.querySelector('#v44-nextpage').onclick=()=>{galleryPage=Math.min(11,galleryPage+1);render()};
 root.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.preview);if(n<=state.completed){showAllGallery=true;largeGalleryImage=n;render();return}if(n===number){message(number>=23?'🧊 Ab Bild 23 wird das Bild erst enthüllt, wenn alle '+tileCount+' Eisfelder entfernt wurden.':'❄️ Das aktuelle Bild wird erst nach dem Sternfund vollständig enthüllt.');return}message(n<=state.completed?'🖼️ Bild '+n+' wurde bereits abgeschlossen. Dein aktuelles Bild bleibt '+number+'.':'🔒 Bild '+n+' wird erst später freigeschaltet.')});
 // Hammer selection is presentation-only: retain the ice board, decoded
 // images and ongoing effects instead of rebuilding the entire event DOM.
 root.querySelectorAll('[data-hammer]').forEach(b=>b.onclick=()=>{
  if(busy)return;
  window.iceHammer=b.dataset.hammer;
  root.querySelectorAll('[data-hammer]').forEach(choice=>{
   const selected=choice.dataset.hammer===window.iceHammer;
   choice.classList.toggle('selected',selected);
   choice.setAttribute('aria-pressed',String(selected));
  });
 });
 root.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>{
  if(busy||b.disabled)return;
  // An old pending hit must be reconciled BEFORE the balance check: its
  // debit can have already happened, and the visible client balance may be
  // stale. This is a GET receipt check, never a second paid strike.
  if(readPending()){
   message('🔄 Letzten Hammerschlag sicher abgleichen … Danach erneut auf ein Eisfeld tippen.');
   const info=root.querySelector('.v44-instruction');
   if(info)info.textContent='🔄 Alter Schlag wird sicher überprüft. Danach kannst du wieder auf Eis tippen.';
   void load();
   return;
  }
  const hammer=window.iceHammer||'single';
  if((state.freeHammers?.[hammer]||0)<1&&Number(state.balance||0)<costs[hammer]){
   const warning='⚠️ '+labels[hammer]+' kostet '+money(costs[hammer])+'. Guthaben: '+money(state.balance)+'. Wähle einen Gratis-Hammer oder sammle Eventguthaben.';
   message(warning);
   const info=root.querySelector('.v44-instruction');if(info)info.textContent=warning;
   return;
  }
  // Immediate feedback stays on the board during a slow authenticated POST.
  // It does not open, charge or hide a tile until the server confirms it.
  b.classList?.add('ice-strike-wait');
  b.setAttribute?.('aria-busy','true');
  const instruction=root.querySelector('.v44-instruction');
  if(instruction)instruction.textContent='⏳ '+labels[hammer]+' wird eingesetzt … Der Server bestätigt den Eisbruch.';
  // Visual cues are optional: a faulty graphics module may not block a
  // server-authorized ice hit. Only the server decides which tiles open.
  try{window.ChristmasIceHammerFX?.cue(b,hammer)}catch(error){console.warn('[Ice] Animation nicht verfügbar',error)}
  void run('strike',{index:Number(b.dataset.tile),hammer});
 });
 if(confirmedHit){
  const effect=confirmedHit;confirmedHit=null;
  try{window.ChristmasIceHammerFX?.confirmed(root.querySelector('.v44-board'),effect)}
  catch(error){console.warn('[Ice] Treffer-Animation nicht verfügbar',error)}
 }
 const next=root.querySelector('#ice-next');if(next)next.onclick=()=>run('next');
 const nextAtBoard=root.querySelector('#ice-next-board');if(nextAtBoard)nextAtBoard.onclick=()=>run('next');
 const repair=root.querySelector('#ice-recover');
 if(repair)repair.onclick=()=>load();
}
async function run(type,extra={}){
 if(busy)return;
 // A timed-out request may already have committed. Never replace its id with a new action.
 const unresolved=readPending();
 if(unresolved){
  const same=unresolved.type===type&&JSON.stringify(unresolved.extra||{})===JSON.stringify(extra);
  if(!same){
   message('🔄 Alte Aktion erkannt. Der Spielstand wird automatisch sicher abgeglichen …');
   await load();
   if(readPending())message('⚠️ Alte Aktion noch ungeklärt. Bitte „Spielstand prüfen“ verwenden.');
   else message('✅ Alte Aktion abgeglichen. Jetzt erneut auf das gewünschte Eisfeld tippen.');
   return;
  }
  pending={key:unresolved.key,requestId:unresolved.requestId};
 }
 busy=true;message('⏳ Aktion wird gespeichert …');
 const key=type==='strike'?'strike:'+String(state?.completed)+':'+extra.index+':'+extra.hammer:type+':'+String(state?.completed);
 // Reusing the original request ID is essential even when completed has changed.
 const requestId=unresolved?.requestId||(pending?.key===key?pending.requestId:id());
 pending={key:unresolved?.key||key,requestId};
 // A new strike is bound to its original picture. A recovered strike
 // reuses that number, never a later number from an updated game state.
 const expectedPicture=type==='strike'
  ?(unresolved?unresolved.expectedPicture:Number(state?.completed||0)+1)
  :undefined;
 rememberPending({uid:user()?.uid,key:pending.key,requestId,extra,type,
  ...(expectedPicture!==undefined?{expectedPicture}:{})});
 try{
  const beforeOpened=type==='strike'?new Set(state?.opened||[]):null;
  const data=await request('POST',{type,requestId,...extra,
   ...(expectedPicture!==undefined?{expectedPicture}:{})});
  const wasFinished=!!state?.finished,oldCompleted=Number(state?.completed||0);
  state=data.state;pending=null;
  // Server response remains authoritative: replayed or rejected requests
  // never invent ice shatters, payments or prizes.
  if(type==='strike'&&!data.result?.replayed){
   const targets=Array.isArray(data.result?.targets)?data.result.targets:[];
   const nowOpened=new Set(Array.isArray(state?.opened)?state.opened:[]);
   const newlyOpened=[...new Set(targets)]
    .filter(i=>Number.isInteger(i)&&i>=0&&nowOpened.has(i)&&!beforeOpened.has(i));
   if(newlyOpened.length){
    confirmedHit={hammer:extra.hammer,targets:newlyOpened,anchor:extra.index,finished:!!state.finished};
    if(state.finished&&!wasFinished){
     clearTimeout(celebrationDelayTimer);
     celebrationDelayTimer=setTimeout(()=>{celebrationDelayTimer=null;render()},950);
    }
   }
  }
  if(type==='start'&&!state.goldenHammerGift2026){try{const bonus=await request('POST',{type:'welcome',requestId:id()});state=bonus.state;message('🎁 Willkommensgeschenk: 3 goldene Glückshammer!')}catch{}}
  if(type==='strike'&&state.finished&&!wasFinished){
   const gift=data.result?.gift;
   const title=gift?(gift.kind==='money'?'💰 Geldgewinn':gift.kind==='joker'?'🔐 Kofferblick-Joker':'🔨 Gratis-Hammer'):'⭐ Bild abgeschlossen';
   const detail=gift?(gift.kind==='money'?money(gift.amount):gift.kind==='joker'?'1 Kofferblick-Joker':({single:'Einfacher Hammer',double:'Doppelhammer',lucky:'Glückshammer'}[gift.hammer]||'Hammer')+' erhalten'):'Bereits erhaltene Belohnungen werden nicht erneut gutgeschrieben.';
   celebration={number:Number(state.completed||oldCompleted+1),title,detail,kind:gift?.kind||'other',hammer:gift?.hammer||null,amount:gift?.amount||0,stage:'image'};
  }else if(type==='next'||type==='reset'){clearTimeout(wheelTimer);clearTimeout(celebrationDelayTimer);celebrationDelayTimer=null;confirmedHit=null;celebration=null;}
  forgetPending();
  if(data.result?.gift){const gift=data.result.gift;message('🎁 '+(gift.kind==='joker'?'Kofferblick-Joker gewonnen!':gift.kind==='money'?money(gift.amount)+' gewonnen!':'Gratis-Hammer gewonnen: '+gift.hammer))}
  else if(data.result?.found)message(Number(state.completed)>=23?'🧊 Alle Eisblöcke entfernt! Dieses Bild wurde bereits früher belohnt.':'🌟 Stern gefunden! Dieses Bild wurde bereits bei einem früheren Durchlauf belohnt.');
  else message('✅ Fortschritt serverseitig gespeichert.');
 }catch(e){if(e.confirmedRejection){forgetPending();message('⚠️ '+e.message+' – die Aktion wurde vom Server abgelehnt. Du kannst wieder einen Hammer auswählen.')}else{message('⚠️ '+e.message+' – Verbindung unklar. Bitte dieselbe Aktion sicher wiederholen.')}}
 finally{busy=false;render()}
}
async function load(){
 if(busy)return;
 busy=true;message('⏳ Spielstand wird geprüft …');
 let shouldRecover=false;
 try{
  const stored=readPending();
  const data=await request('GET',stored?{pendingId:stored.requestId}:undefined);
  state=data.state;
  // An uncertain POST is always retried using its ORIGINAL request ID.
  // A successful receipt proves the debit already happened, so do not replay.
  const confirmed=!!stored&&data.pendingAction?.applied===true;
  if(confirmed)forgetPending();
  // A receipt may have rotated out of the bounded lastActions history.
  // A strike whose target is already open, or whose picture is already past,
  // cannot be charged again. Clear that stale local lock safely.
  const oldStrike=stored?.type==='strike';
  const oldIndex=stored?.extra?.index;
  const pictureNow=Number(state?.completed||0)+1;
  const oldPicture=stored?.expectedPicture;
  const staleStrike=!!oldStrike&&!!state&&!confirmed&&
   ((Number.isInteger(oldIndex)&&Array.isArray(state.opened)&&state.opened.includes(oldIndex))||
    (Number.isInteger(oldPicture)&&(oldPicture!==pictureNow||state.finished)));
  if(staleStrike)forgetPending();
  // If there is no progress document, an old strike cannot block a new game.
  if(stored&&!state)forgetPending();
  shouldRecover=!!stored&&!confirmed&&!staleStrike&&!!state;
  if(state&&!state.goldenHammerGift2026){
   try{
    const bonus=await request('POST',{type:'welcome',requestId:id()});
    state=bonus.state;
    if(bonus.result?.granted)message('🎁 Einmaliges Geschenk: 3 goldene Glückshammer wurden gutgeschrieben!');
   }catch(error){message('⚠️ Willkommensgeschenk konnte noch nicht geprüft werden: '+error.message)}
  }
  if(confirmed||staleStrike)message('✅ Vorheriger Hammerschlag abgeglichen. Du kannst wieder Eis aufbrechen.');
  else if(shouldRecover)message('🔄 Offene Aktion wird automatisch sicher wiederholt …');
  else message('✅ Online-Spielstand aktuell. Hammerauswahl ist freigegeben.');
  // Release the load lock before painting, otherwise all closed ice tiles
  // remain disabled until a separate re-render (previously hammer selection).
  recoveredGift();busy=false;render();
 }catch(e){
  shouldRecover=false;
  message('⚠️ '+e.message);
  root.innerHTML='<button id="ice-retry">🔄 Verbindung erneut prüfen</button>';
  root.querySelector('#ice-retry').onclick=load;
 }finally{busy=false}
 // A missing receipt means the client must retry ONCE with the same ID.
 // Rejections release the lock; network timeouts keep the visible repair button.
 if(shouldRecover){
  const old=readPending();
  if(old)await run(old.type,old.extra||{});
 }
}
document.addEventListener('keydown',e=>{if(!showAllGallery)return;if(e.key==='Escape'){if(largeGalleryImage)largeGalleryImage=null;else showAllGallery=false;render()}else if(largeGalleryImage&&e.key==='ArrowLeft'){largeGalleryImage=Math.max(1,largeGalleryImage-1);render()}else if(largeGalleryImage&&e.key==='ArrowRight'){largeGalleryImage=Math.min(state?.completed||1,largeGalleryImage+1);render()}});
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
// The redundant reload header was removed; startup must not depend on its button.
const reloadButton=document.getElementById('ice-reload');
if(reloadButton)reloadButton.onclick=loadWhenReady;
window.addEventListener('spielonline-change',()=>{
 const a=window.SpielOnline?.state?.();
 if(a?.status==='online'&&a.user){
  if(!state&&!busy)loadWhenReady();
 }else if(!busy){state=null;accountReady();}
});
loadWhenReady();
})();
