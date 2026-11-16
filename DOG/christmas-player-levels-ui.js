/** Personal DOG level UI. Level-1 starter redemption is verified on Render. */
export function initDogPlayerLevels(){
 const $=id=>document.getElementById(id);
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const status=$('dog-level-status'),grid=$('dog-level-rewards'),refresh=$('dog-level-refresh');
 const user=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s?.user?.getIdToken?s.user:null;
 };
 const format=n=>Number(n||0).toLocaleString('de-DE');
 let pending=null,requestId=0,levelData=null,claimPending=false;
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
   const claimed=Boolean(data.levelRewardClaims?.[1]);
   reward.textContent=entry?.configured&&entry?.reward?
    (n===1?(claimed?'✅ ':'🎁 '):(reached?'✅ ':'🔒 '))+(entry.reward.title||'Belohnung'):'🎁 Belohnung folgt';
   card.append(badge,head,threshold,reward);
   if(n===1){
    const detail=document.createElement('small');
    detail.textContent=claimed?'✅ Startgutscheine bereits abgeholt · in Rubbellose einlösbar':
     '🎁 1× Geschenkelinie · 1× Schneeflocken-Bingo · 1× Wichtelpfad · 1× Premium';
    card.append(detail);
    if(!claimed){
     const button=document.createElement('button');
     button.type='button';button.className='dog-level-starter-claim';
     button.textContent='🎟️ Vier Startgutscheine abholen';
     button.disabled=claimPending;button.addEventListener('click',()=>void claimStarter(button));
     card.append(button);
    }
   }
   grid.append(card);
  }
 }
 async function claimStarter(button){
  if(claimPending||!user())return;
  const current=user(),identity=current.uid;
  claimPending=true;if(button)button.disabled=true;
  try{
   const token=await current.getIdToken();
   if(user()?.uid!==identity)return;
   const res=await fetch(base+'/api/hub/dog/level/rewards/claim',{
    method:'POST',mode:'cors',cache:'no-store',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({level:1})
   });
   const data=await res.json().catch(()=>({}));
   if(!res.ok||data.ok!==true||data.levelRewardClaims?.[1]!==true)throw Error(data.error||'STARTER_REWARD_FAILED');
   if(user()?.uid!==identity)return;
   if(levelData){levelData={...levelData,levelRewardClaims:{...levelData.levelRewardClaims,1:true}};render(levelData)}
   message('🎉 Je ein Gutschein für alle vier Rubbellose ist deinem Profil gutgeschrieben.');
  }catch(error){message('⚠️ Startgutscheine konnten nicht abgeholt werden: '+(error.message||'Verbindung prüfen'),true)}
  finally{claimPending=false;if(button)button.disabled=false}
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
   levelData=result;
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
  requestId++;levelData=null;$('dog-level-summary').hidden=true;grid.replaceChildren();
  message('Profil gewechselt – bitte Level neu laden.');
  if($('tab-level')?.getAttribute('aria-selected')==='true')void load();
 });
 return {load};
}
