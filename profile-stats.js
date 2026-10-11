/** Spielerportal V8B – read-only statistics: retry, account isolation and recovery.
 * Match results come exclusively from the authenticated server API.
 */
(function(){
'use strict';
const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const GAMES={barikade:'Barikade',kreuz:'KreuzKunter',skyjo:'SKYJO Action',business:'Das große Business'};
const $=id=>document.getElementById(id);
const RETRYABLE=new Set([408,425,429,500,502,503,504]);
let sequence=0,controller=null,loading=false,lastUid=null,lastSuccess=0,lastAttempt=0;
function text(id,value){const node=$(id);if(node)node.textContent=String(value);}
function online(){const s=window.SpielOnline?.state?.();return s?.status==='online'&&s.user&&s.profile?.setupComplete!==false?s:null;}
function trophy(win){const el=document.querySelector('[data-achievement="first-win"]');if(!el)return;
 el.classList.toggle('locked',!win);el.setAttribute('aria-label',win?'Erster Sieg freigeschaltet':'Erster Sieg gesperrt');
 const small=el.querySelector('small');if(small)small.textContent=win?'Durch bestätigten Online-Sieg freigeschaltet':'Eine bestätigte Online-Partie gewinnen';}
function resultTile(name,record,ready){const el=document.createElement('div');el.className='v8-result-tile';
 const title=document.createElement('strong');title.textContent=name;
 const desc=document.createElement('span');desc.textContent=ready?`${record?.games||0} Partien · ${record?.wins||0} Siege`:'Offizielle Wertung in Vorbereitung';
 el.append(title,desc);return el;}
function draw(data){
 const d=data.stats||{},n=Math.max(0,Number(d.games)||0),w=Math.max(0,Number(d.wins)||0);
 text('stat-launches',n);text('stat-games',w);text('stat-achievements',w>0?2:1);
 text('profile-stat-caption',`Offiziell bestätigt: ${n} Partien · ${w} Siege · ${Math.max(0,Number(d.losses)||0)} Niederlagen · ${Math.max(0,Number(d.draws)||0)} Unentschieden.`);
 const grid=$('v8-game-totals');if(grid){grid.replaceChildren();for(const [key,label] of Object.entries(GAMES))grid.append(resultTile(label,d.byGame?.[key],key==='barikade'||key==='kreuz'));}
 const history=$('v8-match-history');if(history){history.replaceChildren();const matches=Array.isArray(data.matches)?data.matches:[];
  if(!matches.length){const p=document.createElement('p');p.className='v8-empty';p.textContent='Noch keine bestätigten Partien. Eine vollständig angemeldete, abgeschlossene Online-Partie erscheint später hier.';history.append(p);}
  for(const match of matches.slice(0,12)){
   const row=document.createElement('div');row.className='v8-match-row';
   const left=document.createElement('span');const timestamp=Number(match.finishedAt);const when=Number.isFinite(timestamp)?new Date(timestamp):null;
   left.textContent=`${GAMES[match.game]||'Online-Partie'} · ${when&&!Number.isNaN(when.getTime())?when.toLocaleDateString('de-DE'):'Datum unbekannt'}`;
   const right=document.createElement('strong');right.textContent=match.place==='win'?'🏆 Sieg':match.place==='draw'?'🤝 Unentschieden':'🎲 Niederlage';
   row.append(left,right);history.append(row);
  }
 }
 trophy(w>0);
}
function clearDashboard(){
 text('stat-launches','–');text('stat-games','–');text('stat-achievements','–');
 text('profile-stat-caption','Noch keine bestätigten Ergebnisse geladen.');
 $('v8-game-totals')?.replaceChildren();$('v8-match-history')?.replaceChildren();trophy(false);
}
function updateBusy(value){loading=value;const btn=$('v8-stats-refresh');if(btn){btn.disabled=value;btn.setAttribute('aria-busy',String(value));}}
function invalidate(){sequence++;if(controller)controller.abort();controller=null;lastUid=null;lastSuccess=0;updateBusy(false);clearDashboard();text('v8-stats-status','🔐 Anmeldung erforderlich, um persönliche Statistiken zu sehen.');}
function pause(ms,signal){return new Promise((resolve,reject)=>{
 const tid=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
 function abort(){clearTimeout(tid);reject(Object.assign(new Error('Aborted'),{name:'AbortError'}));}
 if(signal?.aborted)return abort();signal?.addEventListener('abort',abort,{once:true});
});}
async function load({manual=false}={}){
 const current=online();if(!current){if(lastUid||loading)invalidate();else text('v8-stats-status','🔐 Anmeldung erforderlich, um persönliche Statistiken zu sehen.');return;}
 const uid=current.user.uid;
 if(!manual&&loading&&lastUid===uid)return;
 if(!manual&&lastUid===uid&&lastSuccess&&Date.now()-lastSuccess<30000)return;
 if(lastUid!==uid){clearDashboard();lastSuccess=0;}
 lastUid=uid;lastAttempt=Date.now();const requestId=++sequence;
 if(controller)controller.abort();const myController=new AbortController();controller=myController;
 updateBusy(true);text('v8-stats-status','☁️ Offizielle Spielergebnisse werden geladen …');
 const kill=setTimeout(()=>myController.abort(),95000);
 try{
  const token=await current.user.getIdToken();
  if(!token||myController.signal.aborted)throw new Error('LOGIN_REQUIRED');
  let data;
  for(let i=0;i<3;i++){
   const response=await fetch(`${API}/api/profile/stats`,{cache:'no-store',headers:{Authorization:`Bearer ${token}`},signal:myController.signal});
   if(!response.ok){
    if(RETRYABLE.has(response.status)&&i<2){text('v8-stats-status','⏳ Render ist möglicherweise gerade im Startvorgang. Neuer Versuch …');await pause(i===0?1400:3200,myController.signal);continue;}
    throw new Error(`HTTP ${response.status}`);
   }
   data=await response.json();if(!data?.ok)throw new Error(String(data?.error||'INVALID_STATS'));
   break;
  }
  if(requestId!==sequence||online()?.user.uid!==uid)return;
  draw(data);lastSuccess=Date.now();text('v8-stats-status','✅ Offizielle Statistik synchronisiert');
 }catch(e){
  if(requestId!==sequence||online()?.user.uid!==uid||myController.signal.aborted)return;
  text('v8-stats-status',lastSuccess?'⚠️ Statistik derzeit nicht erreichbar. Die zuletzt geladenen Werte bleiben sichtbar.':'⚠️ Statistik gerade nicht erreichbar. Bitte später erneut versuchen.');
 }finally{clearTimeout(kill);if(requestId===sequence){controller=null;updateBusy(false);}}
}
function onAccountChange(){const s=online();if(!s){invalidate();return;}if(s.user.uid!==lastUid)void load();else if(!loading&&!lastSuccess)void load();}
window.addEventListener('spielonline-change',onAccountChange);
window.addEventListener('spielprofil-change',()=>{if(online()?.user.uid!==lastUid||!lastSuccess)void load();});
window.addEventListener('focus',()=>{if(online()&&!loading&&Date.now()-lastAttempt>60000)void load();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&online()&&!loading&&Date.now()-lastAttempt>60000)void load();});
function init(){$('v8-stats-refresh')?.addEventListener('click',()=>void load({manual:true}));void load();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
