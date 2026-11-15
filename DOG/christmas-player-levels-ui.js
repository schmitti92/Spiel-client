/**
 * Personal DOG levels. Rewards are deliberately placeholders: no claims,
 * credits or unlocks can be triggered by this view.
 */
export function initDogPlayerLevels(){
 const $=id=>document.getElementById(id);
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const status=$('dog-level-status'),grid=$('dog-level-rewards'),refresh=$('dog-level-refresh');
 const user=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s?.user?.getIdToken?s.user:null;
 };
 const format=n=>Number(n||0).toLocaleString('de-DE');
 let pending=null,requestId=0;
 function message(text,error=false){
  status.textContent=text;
  status.dataset.error=String(error);
 }
 function render(data){
  const level=data.level;
  if(!level||!Number.isInteger(level.level))throw Error('DOG_LEVEL_DATA_INVALID');
  $('dog-level-current').textContent=String(level.level);
  $('dog-level-xp-total').textContent=format(level.totalXp)+' EP';
  const next=level.nextLevel;
  $('dog-level-next').textContent=next===null?'Maximallevel erreicht 🎉':
   'Level '+next+' · noch '+format(level.xpRemaining)+' EP';
  const bar=$('dog-level-progress');
  bar.value=level.progressPercent;
  bar.setAttribute('aria-valuenow',String(level.progressPercent));
  $('dog-level-progress-text').textContent=next===null?
   'Level 10 von 10 abgeschlossen':format(level.xpIntoLevel)+' / '+format(level.xpForNextLevel)+' EP zum nächsten Level';
  $('dog-level-matches').textContent=format(level.totalVerifiedMatches);
  $('dog-level-last').textContent=level.totalVerifiedMatches?
   '+'+format(level.lastEarnedXp)+' EP bei der letzten Partie':'Noch keine Partie für Level-EP abgeschlossen';
  grid.replaceChildren();
  const rewards=Array.isArray(level.rewards)?level.rewards:[];
  for(let n=1;n<=10;n++){
   const reached=n<=level.level;
   const entry=rewards.find(x=>x.level===n);
   const card=document.createElement('article');
   card.className='dog-level-tile'+(reached?' reached':'')+(n===level.level?' current':'');
   const badge=document.createElement('span');
   badge.className='dog-level-badge';badge.textContent=String(n).padStart(2,'0');
   const head=document.createElement('div');head.className='dog-level-tile-head';
   const title=document.createElement('h4');title.textContent='Level '+n;
   const state=document.createElement('small');
   state.textContent=reached?'✓ Erreicht':'🔒 Noch gesperrt';
   head.append(title,state);
   const threshold=document.createElement('p');threshold.className='dog-level-threshold';
   const thresholds=[0,100,250,450,700,1000,1350,1750,2200,2700];
   threshold.textContent= n===1?'Startlevel':'Ab '+format(thresholds[n-1])+' EP';
   const reward=document.createElement('div');reward.className='dog-level-reward';
   reward.textContent=entry?.configured&&entry?.reward?'🎁 Belohnung vorbereitet':'🎁 Belohnung folgt';
   card.append(badge,head,threshold,reward);
   grid.append(card);
  }
 }
 async function load(){
  if(pending)return pending;
  const current=user(),tokenId=++requestId;
  if(!current){
   $('dog-level-summary').hidden=true;grid.replaceChildren();
   message('🔐 Bitte melde dich mit deinem Online-Spielerprofil an.',true);
   return;
  }
  message('⭐ Dein persönlicher Level-Fortschritt wird geladen …');
  refresh.disabled=true;
  pending=(async()=>{
   const token=await current.getIdToken();
   if(tokenId!==requestId||user()?.uid!==current.uid)return;
   const response=await fetch(base+'/api/hub/dog/level',{
    method:'GET',mode:'cors',cache:'no-store',headers:{Authorization:'Bearer '+token}
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok||result.ok!==true)throw Error(result.error||'LEVEL_SERVER_ERROR');
   if(tokenId!==requestId||user()?.uid!==current.uid)return;
   render(result);
   $('dog-level-summary').hidden=false;
   message('🎄 Level und Erfahrungspunkte sind mit deinem persönlichen Profil verknüpft.');
  })();
  try{await pending;}catch(error){
   if(tokenId===requestId){
    $('dog-level-summary').hidden=true;grid.replaceChildren();
    message('⚠️ Level-Daten konnten nicht geladen werden. Bitte versuche es erneut.',true);
   }
  }finally{pending=null;refresh.disabled=false;}
 }
 refresh.addEventListener('click',()=>void load());
 window.addEventListener('spielonline-change',()=>{
  requestId++;$('dog-level-summary').hidden=true;grid.replaceChildren();
  message('Profil gewechselt – bitte Level neu laden.');
  if($('tab-level')?.getAttribute('aria-selected')==='true')void load();
 });
 return {load};
}
