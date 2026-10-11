/** SPIELEPORTAL V9: ausschließlich bestätigte Serverergebnisse, mit Konto-Isolation.
 * Statistik und Erfolge dürfen niemals durch einen Profil-Render überschrieben werden.
 * XP/Level werden vom Server aus verifizierten Matches abgeleitet.
 */
(function(){
'use strict';
const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const GAMES={barikade:'Barikade',kreuz:'KreuzKunter',skyjo:'SKYJO Action',business:'Das große Business'};
const $=id=>document.getElementById(id);
const RETRYABLE=new Set([408,425,429,500,502,503,504]);
const number=x=>Number.isSafeInteger(x)&&x>=0?x:0;
let sequence=0, controller=null, loading=false, lastUid=null, lastSuccess=0, lastAttempt=0, lastData=null;
function text(id,value){const el=$(id);if(el)el.textContent=String(value);}
function online(){const s=window.SpielOnline?.state?.();return s?.status==='online'&&s.user?.uid&&s.profile?.setupComplete!==false?s:null;}
function accountId(){return online()?.user?.uid||null;}
function countAchievements(s){const g=number(s?.games),w=number(s?.wins),by=s?.byGame||{};
 return {profile:true,firstwin:w>=1,fivewins:w>=5,tenmatches:g>=10,versatile:number(by.barikade?.games)>=1&&number(by.kreuz?.games)>=1};
}
function renderAchievements(s,available){
 const earned=available?countAchievements(s):{profile:true};
 document.querySelectorAll('[data-achievement]').forEach(el=>{
  const key=el.dataset.achievement,isEarned=!!earned[key];
  el.classList.toggle('locked',!isEarned);el.setAttribute('aria-label',isEarned?'Erfolg freigeschaltet':'Erfolg noch gesperrt');
  const status=el.querySelector('[data-achievement-state]');
  if(status)status.textContent=isEarned?'✓ Freigeschaltet':key==='profile'?'Konto eingerichtet':'Noch nicht erreicht';
 });
 text('stat-achievements',available?Object.values(earned).filter(Boolean).length:'–');
}
function resultTile(key,name,record,ready){
 const el=document.createElement('div');el.className='v9-result-tile'+(ready?' verified':' pending');
 const h=document.createElement('div');h.className='v9-result-head';
 const t=document.createElement('strong');t.textContent=name;
 const flag=document.createElement('span');flag.className='v9-game-flag';flag.textContent=ready?'✓ Verifiziert':'⏳ In Arbeit';
 h.append(t,flag);el.append(h);
 const desc=document.createElement('p');desc.textContent=ready?'Serverbestätigte Online-Partien':'Offizielle Ergebnisprüfung noch nicht aktiv';el.append(desc);
 if(ready){
  const a=document.createElement('div');a.className='v9-game-numbers';
  for(const [value,label] of [[number(record?.games),'Partien'],[number(record?.wins),'Siege'],[number(record?.losses),'Niederlagen']]){
   const wrap=document.createElement('div'),b=document.createElement('b'),small=document.createElement('small');
   b.textContent=String(value);small.textContent=label;wrap.append(b,small);a.append(wrap);
  }el.append(a);
 }return el;
}
function formatDate(ts){const n=Number(ts);if(!Number.isFinite(n)||n<=0)return 'Datum nicht verfügbar';
 const d=new Date(n);return Number.isNaN(d.getTime())?'Datum nicht verfügbar':d.toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'});
}
function paintHistory(data){
 const container=$('v8-match-history');if(!container)return;
 container.replaceChildren();
 const game=$('v9-filter-game')?.value||'all',result=$('v9-filter-result')?.value||'all';
 const matches=Array.isArray(data.matches)?data.matches:[];
 const filtered=matches.filter(m=>(game==='all'||m.game===game)&&(result==='all'||m.place===result));
 text('v9-history-count',`${filtered.length} von ${matches.length} zuletzt bestätigten Partien`);
 if(!filtered.length){const p=document.createElement('p');p.className='v8-empty';
  p.textContent=matches.length?'Keine Partien mit diesen Filtern gefunden.':'Noch keine bestätigten Partien. Sobald eine gewertete Online-Partie abgeschlossen ist, erscheint sie hier.';
  container.append(p);return;
 }
 for(const m of filtered){
  const row=document.createElement('div');row.className='v9-match-row';
  const badge=document.createElement('span');badge.className='v9-match-icon';badge.textContent=m.place==='win'?'🏆':m.place==='draw'?'🤝':'🎲';
  const body=document.createElement('div');body.className='v9-match-desc';
  const title=document.createElement('b');title.textContent=GAMES[m.game]||'Online-Partie';
  const sub=document.createElement('small');sub.textContent=formatDate(m.finishedAt);body.append(title,sub);
  const state=document.createElement('span');state.className='v9-match-result '+(m.place==='win'?'won':m.place==='draw'?'drawn':'lost');
  state.textContent=m.place==='win'?'Sieg':m.place==='draw'?'Unentschieden':'Niederlage';
  row.append(badge,body,state);container.append(row);
 }
}
function paintProgress(progress,ready){
 if(!ready||!progress||!Number.isSafeInteger(progress.total)||!Number.isSafeInteger(progress.level)){
  text('v9-level','–');text('v9-total-xp','–');text('v9-xp-next','Wertung wird geladen');text('v9-xp-fraction','–');
  const bar=$('v9-xp-progress');if(bar){bar.style.width='0%';bar.setAttribute('aria-valuenow','0');}
  return;
 }
 const level=number(progress.level),total=number(progress.total),next=number(progress.needed);
 const into=number(progress.intoLevel),required=Math.max(1,number(progress.forNextLevel));
 const percent=Math.min(100,Math.round(into/required*100));
 text('v9-level',level);text('v9-total-xp',total.toLocaleString('de-DE'));text('v9-xp-next',`${next.toLocaleString('de-DE')} XP bis Level ${level+1}`);
 text('v9-xp-fraction',`${into.toLocaleString('de-DE')} / ${required.toLocaleString('de-DE')} XP`);
 const bar=$('v9-xp-progress');if(bar){bar.style.width=percent+'%';bar.setAttribute('aria-valuenow',String(percent));}
}
function draw(data){
 const d=data.stats||{},g=number(d.games),w=number(d.wins),losses=number(d.losses),draws=number(d.draws);
 text('stat-launches',g);text('stat-games',w);text('stat-win-rate',g?Math.round(w/g*100)+' %':'0 %');
 text('profile-stat-caption',g?`${g} bestätigte Partien · ${w} Siege · ${losses} Niederlagen · ${draws} Unentschieden`:'Dein Profil ist bereit. Bisher wurden noch keine Online-Partien offiziell bestätigt.');
 renderAchievements(d,true);paintProgress(data.progress,true);
 const grid=$('v8-game-totals');if(grid){grid.replaceChildren();for(const [key,label] of Object.entries(GAMES))grid.append(resultTile(key,label,d.byGame?.[key],key==='barikade'||key==='kreuz'));}
 paintHistory(data);
 const streak=$('v9-insights');if(streak){streak.replaceChildren();
  const value=[{label:'Siege',n:w},{label:'Niederlagen',n:losses},{label:'Unentschieden',n:draws}];
  for(const e of value){const r=document.createElement('div');r.className='v9-insight-row';
   const top=document.createElement('div'),lab=document.createElement('span'),cnt=document.createElement('b');lab.textContent=e.label;cnt.textContent=String(e.n);top.append(lab,cnt);
   const track=document.createElement('div');track.className='v9-insight-track';const fill=document.createElement('i');fill.style.width=(g?Math.min(100,e.n/g*100):0)+'%';track.append(fill);r.append(top,track);streak.append(r);}
 }
}
function clear(){lastData=null;lastSuccess=0;
 for(const id of ['stat-launches','stat-games','stat-achievements','stat-win-rate'])text(id,'–');
 text('profile-stat-caption','Deine bestätigten Ergebnisse werden nach der Anmeldung geladen.');
 text('v9-history-count','');$('v8-game-totals')?.replaceChildren();$('v8-match-history')?.replaceChildren();$('v9-insights')?.replaceChildren();
 renderAchievements(null,false);paintProgress(null,false);
}
function busy(value){loading=value;const button=$('v8-stats-refresh');if(button){button.disabled=value;button.setAttribute('aria-busy',String(value));}}
function invalidate(){++sequence;controller?.abort();controller=null;lastUid=null;lastAttempt=0;busy(false);clear();text('v8-stats-status','🔐 Bitte melde dich für deine persönlichen Statistiken an.');}
function pause(ms,signal){return new Promise((resolve,reject)=>{const t=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
 function abort(){clearTimeout(t);reject(Object.assign(new Error('Aborted'),{name:'AbortError'}));}
 if(signal?.aborted)return abort();signal?.addEventListener('abort',abort,{once:true});});}
async function load({manual=false}={}){
 const s=online();if(!s){if(lastUid||loading)invalidate();else text('v8-stats-status','🔐 Für persönliche Statistiken anmelden.');return;}
 const uid=s.user.uid;if(!manual&&loading&&lastUid===uid)return;
 if(!manual&&lastUid===uid&&lastSuccess&&Date.now()-lastSuccess<30000)return;
 if(uid!==lastUid)clear();lastUid=uid;lastAttempt=Date.now();const n=++sequence;
 controller?.abort();const ctrl=new AbortController();controller=ctrl;busy(true);
 text('v8-stats-status','☁️ Deine verifizierten Spielergebnisse werden geladen …');
 const timeout=setTimeout(()=>ctrl.abort(),90000);
 try{
  const token=await s.user.getIdToken();if(!token||ctrl.signal.aborted)throw Error('LOGIN_REQUIRED');
  let data=null;
  for(let attempt=0;attempt<3;attempt++){
   const response=await fetch(`${API}/api/profile/stats`,{cache:'no-store',headers:{Authorization:`Bearer ${token}`},signal:ctrl.signal});
   if(!response.ok){if(RETRYABLE.has(response.status)&&attempt<2){text('v8-stats-status','⏳ Render startet möglicherweise. Erneuter Versuch …');await pause(attempt?3200:1400,ctrl.signal);continue;}
    throw Error('HTTP '+response.status);}
   data=await response.json();if(!data?.ok)throw Error('INVALID_STATS');break;
  }
  if(n!==sequence||accountId()!==uid)return;
  lastData=data;draw(data);lastSuccess=Date.now();text('v8-stats-status','✅ Aktuell · Die Zahlen kommen aus abgeschlossenen, serverbestätigten Partien.');
 }catch(e){if(n!==sequence||accountId()!==uid||ctrl.signal.aborted)return;
  text('v8-stats-status',lastSuccess?'⚠️ Server nicht erreichbar. Zuletzt geladene Werte bleiben sichtbar.':'⚠️ Statistiken nicht erreichbar. Bitte später erneut laden.');
 }finally{clearTimeout(timeout);if(n===sequence){controller=null;busy(false);}}
}
function onAccountChange(){const uid=accountId();if(!uid){invalidate();return;}
 if(lastUid!==uid)void load();else if(!loading&&!lastSuccess)void load();}
window.SpielStats={snapshot(uid){return uid&&uid===lastUid&&uid===accountId()&&lastSuccess&&lastData?JSON.parse(JSON.stringify(lastData)):null;},refresh(){return load({manual:true});}};
window.addEventListener('spielonline-change',onAccountChange);
window.addEventListener('spielprofil-change',()=>{if(accountId()!==lastUid||!lastSuccess)void load();});
window.addEventListener('focus',()=>{if(accountId()&&!loading&&Date.now()-lastAttempt>60000)void load();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&accountId()&&!loading&&Date.now()-lastAttempt>60000)void load();});
function init(){
 $('v8-stats-refresh')?.addEventListener('click',()=>void load({manual:true}));
 $('v9-filter-game')?.addEventListener('change',()=>{if(lastData&&lastUid===accountId())paintHistory(lastData);});
 $('v9-filter-result')?.addEventListener('change',()=>{if(lastData&&lastUid===accountId())paintHistory(lastData);});
 clear();void load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
