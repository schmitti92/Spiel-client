/** V8: read-only, authenticated dashboard for server-verified match results. */
(function(){
'use strict';
const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const GAMES={barikade:'Barikade',kreuz:'KreuzKunter',skyjo:'SKYJO Action',business:'Das große Business'};
let generation=0,lastUid=null,loading=false;
const $=id=>document.getElementById(id);
function text(id,v){const n=$(id);if(n)n.textContent=String(v);}
function tile(name,s){const el=document.createElement('div');el.className='v8-result-tile';
 const title=document.createElement('strong');title.textContent=name;
 const desc=document.createElement('span');desc.textContent=`${s.games||0} Partien · ${s.wins||0} Siege`;
 el.append(title,desc);return el;}
function draw(data){
 const d=data.stats||{},n=Number(d.games)||0,w=Number(d.wins)||0;
 text('stat-launches',n);text('stat-games',w);
 text('profile-stat-caption',`Offiziell bestätigte Online-Partien: ${n} · Siege: ${w} · Niederlagen: ${Number(d.losses)||0} · Unentschieden: ${Number(d.draws)||0}.`);
 const grid=$('v8-game-totals');if(grid){grid.replaceChildren();for(const [key,label] of Object.entries(GAMES)){
   if(['skyjo','business'].includes(key)){const t=tile(label,{games:0,wins:0});t.lastChild.textContent='Offizielle Wertung in Vorbereitung';grid.append(t);}else grid.append(tile(label,d.byGame?.[key]||{}));
 }}
 const history=$('v8-match-history');if(history){history.replaceChildren();const matches=Array.isArray(data.matches)?data.matches:[];
  if(!matches.length){const p=document.createElement('p');p.className='v8-empty';p.textContent='Noch keine bestätigten Partien. Nach einer vollständig angemeldeten Online-Partie erscheint dein Ergebnis hier.';history.append(p);}
  for(const m of matches){const line=document.createElement('div');line.className='v8-match-row';
   const left=document.createElement('span');const date=new Date(Number(m.finishedAt)||Date.now());left.textContent=`${GAMES[m.game]||m.game} · ${date.toLocaleDateString('de-DE')}`;
   const right=document.createElement('strong');right.textContent=m.place==='win'?'🏆 Sieg':m.place==='draw'?'🤝 Unentschieden':'🎲 Partie beendet';
   line.append(left,right);history.append(line);
  }
 }
 const trophies=$('achievement-list');if(trophies){
  const first=trophies.querySelector('.achievement.locked');if(first&&w>0){first.classList.remove('locked');const label=first.querySelector('small');if(label)label.textContent='Durch eine bestätigte Partie freigeschaltet';}
 }
}
function showError(message){text('v8-stats-status',message);}
function clearDashboard(){text('stat-launches','–');text('stat-games','–');text('profile-stat-caption','Noch keine bestätigten Ergebnisse geladen.');$('v8-game-totals')?.replaceChildren();$('v8-match-history')?.replaceChildren();}
async function load(){
 const s=window.SpielOnline?.state?.();const p=s?.profile;
 if(s?.status!=='online'||!s.user||p?.setupComplete===false){lastUid=null;generation++;return;}
 const uid=s.user.uid;if(lastUid!==uid)clearDashboard();lastUid=uid;const g=++generation;loading=true;
 text('v8-stats-status','☁️ Bestätigte Ergebnisse werden geladen …');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),90000);
 try{
  const token=await s.user.getIdToken();
  const response=await fetch(`${API}/api/profile/stats`,{cache:'no-store',headers:{Authorization:`Bearer ${token}`},signal:controller.signal});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||`HTTP ${response.status}`);
  if(g!==generation||window.SpielOnline?.state?.()?.user?.uid!==uid)return;
  draw(data);text('v8-stats-status','✅ Offizielle Statistik synchronisiert');
 }catch(e){if(g===generation)showError('⚠️ Ergebnisse konnten nicht geladen werden. Profil und Spiele funktionieren weiterhin.');}
 finally{clearTimeout(timer);if(g===generation)loading=false;}
}
window.addEventListener('spielonline-change',()=>{const s=window.SpielOnline?.state?.();if(s?.status==='online'){if(s.user?.uid!==lastUid||!loading)void load();}else{generation++;lastUid=null;clearDashboard();}});
window.addEventListener('spielprofil-change',()=>void load());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void load());else void load();
})();
