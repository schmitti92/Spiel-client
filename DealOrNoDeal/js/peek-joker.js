'use strict';
/* Kofferblick: private API response, never put amount in shared game state. */
(()=>{
 const style=document.createElement('style');
 style.textContent=`#peek-launch{position:fixed;right:12px;bottom:12px;z-index:1100;border:1px solid #eac979;border-radius:18px;background:linear-gradient(135deg,#322344,#7954a6);color:white;font-weight:800;padding:11px 16px;box-shadow:0 5px 25px #0008;cursor:pointer}#peek-launch:disabled{opacity:.55}#peek-dialog{position:fixed;inset:0;z-index:3100;background:#080914e8;display:grid;place-items:center;padding:12px}#peek-dialog[hidden]{display:none!important}#peek-panel{position:relative;box-sizing:border-box;width:min(680px,96vw);max-height:94dvh;overflow:auto;border:2px solid #d7b86b;border-radius:20px;background:linear-gradient(150deg,#161a33,#38294e);color:#fff;padding:18px;text-align:center;box-shadow:0 20px 70px #000c}#peek-panel h2{margin:0 0 8px}#peek-cases{display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:5px;margin:12px 0}#peek-cases button{min-width:0;padding:8px 0;border-radius:7px;border:1px solid #d5b16d;background:#76542b;color:white;font-weight:700;cursor:pointer}#peek-cases button:disabled{opacity:.25;cursor:not-allowed}#peek-cases button.own{background:#6b438a;border:2px solid #e9b8ff}#peek-result{font-size:clamp(22px,5vw,36px);font-weight:900;color:#f6d883;margin:12px 0}#peek-panel .peek-btn{border:1px solid #efcf82;background:#362d53;color:#fff;padding:10px 18px;border-radius:10px;margin:4px;cursor:pointer}#peek-panel .peek-btn:disabled{opacity:.45}#peek-note{font-size:13px;opacity:.85}#peek-error{color:#ffb6b6;min-height:1em}@media(max-width:650px){#peek-cases{grid-template-columns:repeat(9,minmax(0,1fr))}#peek-panel{padding:10px}#peek-cases button{padding:6px 0}#peek-launch{bottom:6px;right:6px}}`;
 document.head.append(style);
 const launch=document.createElement('button');launch.id='peek-launch';launch.type='button';launch.hidden=true;launch.textContent='🔐 Kofferblick';document.body.append(launch);
 const dialog=document.createElement('div');dialog.id='peek-dialog';dialog.hidden=true;
 dialog.innerHTML='<section id="peek-panel" role="dialog" aria-modal="true" aria-labelledby="peek-title"><h2 id="peek-title">🔐 Geheimer Kofferblick</h2><p id="peek-note">Nur du siehst den Betrag. Auch dein eigener Koffer ist erlaubt.</p><p id="peek-balance">Joker werden geprüft …</p><div id="peek-cases"></div><div id="peek-result" aria-live="polite"></div><p id="peek-error" role="alert"></p><button class="peek-btn" id="peek-confirm" type="button" hidden>1 Joker für diesen Koffer einsetzen</button><button class="peek-btn" id="peek-close" type="button">Schließen</button></section>';
 document.body.append(dialog);
 const el=id=>document.getElementById(id);
 let selected=null,balance=0,loading=false,receipt=null;
 const active=()=>typeof g!=='undefined'&&g&&['open','reveal','decision'].includes(g.phase)&&g.players?.some(p=>p.id===myId()&&p.deal===null);
 const api=async(method,path,body)=>{
  const u=user();if(!u)throw Error('Bitte anmelden');
  const token=await u.getIdToken();
  const r=await fetch(base+'/api/deal-or-no-deal/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'SERVER_ERROR');return data;
 };
 function refresh(){launch.hidden=!active();if(!dialog.hidden&&(!active()||!user()))close()}
 function close(){dialog.hidden=true;selected=null;receipt=null;el('peek-result').textContent='';el('peek-error').textContent=''}
 function draw(){
  const root=el('peek-cases');root.replaceChildren();
  if(!active())return;
  const own=g.players.find(p=>p.id===myId())?.case;
  for(let i=0;i<26;i++){
   const b=document.createElement('button');b.type='button';b.textContent=String(i+1);b.classList.toggle('own',own===i);
   b.title='Koffer '+(i+1)+(own===i?' (dein Koffer)':'');
   b.disabled=loading||balance<1||g.opened.includes(i)||g.pending?.case===i||selected!==null&&selected!==i;
   b.onclick=()=>{selected=i;receipt=crypto.randomUUID();el('peek-confirm').hidden=false;el('peek-confirm').textContent='1 Joker für Koffer '+(i+1)+' einsetzen';el('peek-error').textContent='';draw()};
   root.append(b);
  }
  el('peek-confirm').disabled=loading||selected===null||balance<1;
 }
 async function open(){
  if(!active())return;
  dialog.hidden=false;selected=null;receipt=null;loading=true;
  el('peek-result').textContent='';el('peek-error').textContent='';el('peek-confirm').hidden=true;
  el('peek-balance').textContent='Jokerbestand wird geprüft …';draw();
  try{const data=await api('GET','peek/me');balance=data.balance;el('peek-balance').textContent='Verfügbare Joker: '+balance;
   if(!balance)el('peek-error').textContent='Noch keine Online-Joker vorhanden. Offline-Joker können aus Sicherheitsgründen nicht automatisch übertragen werden.';
  }catch(e){balance=0;el('peek-error').textContent='Bestand konnte nicht geladen werden: '+e.message}
  finally{loading=false;draw()}
 }
 async function confirm(){
  if(loading||selected===null||balance<1||!active())return;
  const chosen=selected;loading=true;el('peek-confirm').disabled=true;el('peek-error').textContent='';el('peek-result').textContent='🔒 Geheimnis wird enthüllt …';draw();
  try{
   const data=await api('POST',encodeURIComponent(code)+'/peek',{case:chosen,requestId:receipt});
   balance=data.balance;el('peek-balance').textContent='Verfügbare Joker: '+balance;
   el('peek-result').textContent='Koffer '+(chosen+1)+': '+eur(data.amount);
   el('peek-note').textContent='Nur auf deinem Gerät sichtbar. Der Koffer bleibt verschlossen.';
   el('peek-confirm').hidden=true;
   selected=null;receipt=null;
  }catch(e){el('peek-result').textContent='';el('peek-error').textContent='Kofferblick fehlgeschlagen: '+e.message+'. Erneut versuchen ist möglich.'}
  finally{loading=false;draw()}
 }
 launch.addEventListener('click',open);el('peek-close').addEventListener('click',close);
 el('peek-confirm').addEventListener('click',confirm);
 window.addEventListener('deal-game-state-change',refresh);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)close()});
 refresh();
})();
