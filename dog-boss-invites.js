/* 100 Tore: lightweight team boss invitations for event pages and Deal lobby.
 * Authenticated WebSocket message only, no Firestore polling or writes.
 * Entering an arena or pressing Ready invites teammates; combat is server-owned.
 */
(()=>{'use strict';
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const WS=API.replace(/^https:/,'wss:').replace(/^http:/,'ws:')+'/dog/updates';
 const ROOT=new URL('./',document.currentScript?.src||location.href);
 const bossPath=/(?:^|\/)dog-(?:boss10|group-boss)\.html$/.test(location.pathname);
 const VALID_GATE=gate=>Number.isInteger(gate)&&gate>=10&&gate<=100&&gate%10===0;
 if(bossPath||typeof WebSocket!=='function')return;
 const account=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s.user?.uid&&typeof s.user.getIdToken==='function'?s.user:null;
 };
 let uid=null,ws=null,epoch=0,subscribed=false,connecting=false,denied=false;
 let retry=null,failures=0,pendingGate=null,visibleGate=null,notice=null,interval=null;
 const seen=new Map();
 const isVisible=()=>!document.hidden;
 const clearIntervalNotice=()=>{if(interval!==null)clearInterval(interval);interval=null};
 const detachNotice=()=>{clearIntervalNotice();notice?.remove();notice=null;visibleGate=null};
 const closeSocket=()=>{
  epoch++;subscribed=false;connecting=false;
  if(retry!==null)clearTimeout(retry);
  retry=null;const prev=ws;ws=null;if(prev)try{prev.close()}catch{}
 };
 const arenaUrl=gate=>{
  const dest=new URL(gate===10?'dog-boss10.html':'dog-group-boss.html',ROOT);
  if(gate!==10)dest.searchParams.set('gate',String(gate));
  const room=new URLSearchParams(location.search).get('room');
  if(room&&/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room))dest.searchParams.set('room',room);
  return dest.href;
 };
 function showInvite(gate,reason='entered'){
  if(!VALID_GATE(gate)||!isVisible()){pendingGate=gate;return;}
  if(visibleGate===gate)return;
  const last=seen.get(gate)||0;
  if(Date.now()-last<60_000)return; // Two teammates clicking ready is one invitation.
  seen.set(gate,Date.now());pendingGate=null;detachNotice();visibleGate=gate;
  const bar=document.createElement('section');
  bar.className='dog-boss-invite';bar.setAttribute('role','dialog');
  bar.setAttribute('aria-label','Einladung zum gemeinsamen Bosskampf');
  bar.style.cssText='position:fixed;z-index:99990;left:50%;bottom:18px;transform:translateX(-50%);width:min(94vw,540px);box-sizing:border-box;padding:16px 18px;border:2px solid #f4ce82;border-radius:19px;background:linear-gradient(145deg,#182448,#341e49);color:#ffefcf;box-shadow:0 13px 50px #000b,0 0 30px #e6ac6360;text-align:center;font:600 15px/1.45 system-ui';
  const title=document.createElement('strong');title.textContent='🐉 Dein Team ruft dich zu Boss '+gate+'!';
  const invitation=reason==='ready'?'Ein Mitspieler ist bereit.':'Ein Mitspieler hat die Bossarena betreten.';
  title.style.cssText='display:block;font-size:19px;color:#ffdc85;margin-bottom:5px';
  const desc=document.createElement('p');desc.style.cssText='margin:0 0 12px;color:#e2e6fa';
  const row=document.createElement('div');row.style.cssText='display:flex;gap:9px;justify-content:center;flex-wrap:wrap';
  const go=document.createElement('button');go.type='button';go.textContent='⚔️ Zur Bossarena';
  const stay=document.createElement('button');stay.type='button';stay.textContent='Hierbleiben';
  for(const b of [go,stay])b.style.cssText='min-height:42px;border:1px solid #efcd87;border-radius:11px;padding:8px 14px;cursor:pointer;font:800 14px system-ui';
  go.style.background='linear-gradient(#ffe7a5,#c89140)';go.style.color='#321c0b';
  stay.style.background='#273a61';stay.style.color='#eaf2ff';
  const navigate=()=>{
   detachNotice();
   location.assign(arenaUrl(gate));
  };
  go.addEventListener('click',navigate);
  stay.addEventListener('click',detachNotice);
  row.append(go,stay);bar.append(title,desc,row);
  document.body.append(bar);notice=bar;
  let seconds=6;
  desc.textContent=invitation+' Automatischer Wechsel in '+seconds+' Sekunden. Du entscheidest danach selbst über „Bereit“.';
  interval=setInterval(()=>{
   if(!isVisible()){clearIntervalNotice();return;}
   if(document.querySelector('dialog[open]')){clearIntervalNotice();desc.textContent='Ein offenes Fenster bleibt erhalten. Du kannst freiwillig zur Bossarena wechseln.';return;}
   seconds--;
   if(seconds<=0){navigate();return;}
   desc.textContent=invitation+' Automatischer Wechsel in '+seconds+' Sekunden. Du entscheidest danach selbst über „Bereit“.';
  },1000);
 }
 const schedule=()=>{
  if(retry!==null||denied||document.hidden)return;
  const delay=Math.min(30000,2000*2**Math.min(failures++,4));
  retry=setTimeout(()=>{retry=null;void connect()},delay);
 };
 async function connect(){
  const u=account();
  if(!u){closeSocket();uid=null;return;}
  if(u.uid!==uid){closeSocket();uid=u.uid;denied=false;failures=0;seen.clear();}
  if(denied||connecting||subscribed||document.hidden)return;
  const generation=++epoch;connecting=true;
  try{
   const token=await u.getIdToken();
   if(generation!==epoch||account()?.uid!==uid)return;
   const socket=new WebSocket(WS);ws=socket;
   socket.onopen=()=>{if(generation!==epoch)return;
    socket.send(JSON.stringify({type:'subscribe',idToken:token,gate:0,scope:'team'}));
   };
   socket.onmessage=e=>{
    if(generation!==epoch)return;
    let msg;try{msg=JSON.parse(e.data)}catch{return}
    if(msg?.type==='error'&&msg.code==='DENIED'){denied=true;subscribed=false;return;}
    if(msg?.type==='subscribed'&&msg.gate===0){subscribed=true;connecting=false;failures=0;return;}
    if(msg?.type==='invite'&&subscribed&&VALID_GATE(msg.gate))showInvite(msg.gate,msg.reason);
   };
   socket.onerror=()=>{subscribed=false;};
   socket.onclose=()=>{
    if(generation!==epoch)return;
    ws=null;subscribed=false;connecting=false;
    if(!denied)schedule();
   };
  }catch{if(generation===epoch){connecting=false;schedule();}}
 }
 function resume(){
  if(!isVisible())return;
  if(pendingGate!==null){const gate=pendingGate;pendingGate=null;showInvite(gate)}
  void connect();
 }
 window.addEventListener('spielonline-change',()=>void connect());
 window.addEventListener('dog-team-joined',()=>{
  // Newly enrolled players may have received DENIED before choosing their hero.
  denied=false;closeSocket();void connect();
 });
 document.addEventListener('visibilitychange',()=>{
  if(!isVisible()){if(visibleGate!==null){pendingGate=visibleGate;detachNotice()}return;}
  resume();
 });
 window.addEventListener('pagehide',()=>{closeSocket();detachNotice()});
 window.addEventListener('load',resume);
 void connect();
})();
