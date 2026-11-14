/* Deal or No Deal · SKYJO 100 Tore Special prize inbox.
   Rewards were credited atomically by the server during the SKYJO slot ceremony;
   this dialog acknowledges the already-settled prizes without paying twice. */
(function(){
'use strict';
const api=()=>String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const user=()=>window.SpielOnline?.state?.()?.user;
const esc=s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;':'&quot;'}[ch]));
const emoji={chest:'📦',pack:'🎴',hammer:'🔨',joker:'🃏',minigame:'🎟️',monster:'👹',cash:'💰',wildcard:'❓'};
let shownAccount='',checking=false,pending=[],cachedAccount='';
async function request(url,method,body){
 const u=user();if(!u||typeof u.getIdToken!=='function')throw Error('LOGIN_REQUIRED');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
 try{
  const response=await fetch(api()+url,{method,signal:controller.signal,cache:'no-store',
   headers:{Authorization:'Bearer '+await u.getIdToken(),...(method==='POST'?{'Content-Type':'application/json'}:{})},
   ...(method==='POST'?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(!response.ok||data?.ok!==true)throw Error(data?.error||'Die Gewinne konnten nicht geladen werden.');
  return data;
 }finally{clearTimeout(timeout)}
}
function close(){document.getElementById('skyjo-inbox-overlay')?.remove();}
function display(items){
 close();if(!items.length)return;
 const total=items.reduce((n,x)=>n+Number(x.slots||0),0);
 const cards=items.slice().reverse().map(item=>{
  const prizes=(item.prizes||[]).map(p=>'<div class="skyjo-inbox-prize"><span>'+(emoji[p.kind]||'🎁')+'</span><strong>'+
   esc(p.label||'Gewinn')+'</strong><small>'+(p.rarity==='mythic'?'🌈 MYTHISCH':p.rarity==='legendary'?'👑 LEGENDÄR':p.rarity==='epic'?'💜 EPISCH':'')+'</small></div>').join('');
  return '<section class="skyjo-inbox-round"><h3>🎰 SKYJO Runde '+Number(item.round||0)+
   ' · '+Number(item.slots||0)+' Gewinne</h3><div class="skyjo-inbox-prizes">'+prizes+'</div></section>';
 }).join('');
 const root=document.createElement('section');root.id='skyjo-inbox-overlay';
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
 root.setAttribute('aria-label','SKYJO-Belohnungen in Deal or No Deal einsammeln');
 root.innerHTML='<div class="skyjo-inbox-panel"><header><span>✦ GOLDSTUDIO · MONSTER SLOTS ✦</span>'+
  '<h2>🎁 DEINE SKYJO-GEWINNE!</h2><p>Du hast <b>'+total+'</b> Slot-Gewinne in SKYJO Action erspielt. '+
  'Sie wurden dir bereits sicher gutgeschrieben. Hier kannst du sie alle ansehen und bestätigen.</p></header>'+
  '<main class="skyjo-inbox-scroll">'+cards+'</main>'+
  '<footer><p id="skyjo-inbox-status" role="status">Alle Gewinne sind bereits in deinem Deal-or-No-Deal-Inventar.</p>'+
  '<button id="skyjo-inbox-collect" type="button">✅ ALLE '+total+' GEWINNE EINSAMMELN</button></footer></div>';
 document.body.append(root);
 root.querySelector('#skyjo-inbox-collect').addEventListener('click',async()=>{
  const button=root.querySelector('#skyjo-inbox-collect'),status=root.querySelector('#skyjo-inbox-status');
  if(button.disabled)return;
  button.disabled=true;button.textContent='⏳ Gewinne werden bestätigt …';
  try{
   await request('/api/deal-or-no-deal/skyjo-special/inbox/ack','POST',{ids:items.map(i=>i.id)});
   close();pending=[];shownAccount='';window.dispatchEvent(new CustomEvent('deal-skyjo-rewards-collected'));
  }catch(e){status.textContent='⚠ '+String(e.message||e)+' · bitte erneut versuchen';button.disabled=false;button.textContent='🔁 Erneut einsammeln';}
 });
 root.querySelector('#skyjo-inbox-collect')?.focus({preventScroll:true});
}
async function check(){
 const u=user();if(!u?.uid||checking)return;
 if(shownAccount===u.uid)return;
 checking=true;const account=u.uid;
 try{
  const data=await request('/api/deal-or-no-deal/skyjo-special/inbox','GET');
  if(user()?.uid!==account)return;
  const items=Array.isArray(data.items)?data.items.filter(x=>x?.id&&Array.isArray(x.prizes)):[];
  shownAccount=account;cachedAccount=account;pending=items;
  if(items.length)display(items);
 }catch(e){console.warn('[skyjo prize inbox]',String(e.message||e));}
 finally{checking=false}
}
window.addEventListener('spielonline-change',()=>{if(user()?.uid!==cachedAccount){shownAccount='';close();}void check()});
window.addEventListener('load',()=>setTimeout(check,1600));
setTimeout(check,3000);
})();