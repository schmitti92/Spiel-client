/** Persönlicher DOG-Sammlerpass mit 50 serverbestätigten Leveln. */
export function initDogPlayerLevels(){
 const $=id=>document.getElementById(id);
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const status=$('dog-level-status'),grid=$('dog-level-rewards'),refresh=$('dog-level-refresh');
 const nav=$('dog-level-range-nav');
 const user=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s?.user?.getIdToken?s.user:null;
 };
 const format=n=>Number(n||0).toLocaleString('de-DE');
 const ticketNames={
  gifts:'Geschenkelinie',snow_collect:'Schneeflocken-Bingo',
  elf:'Wichtelpfad',tic_tac_toe:'DOG Tic-Tac-Toe',
  number_one_20:'Glückszahl 1',premium_27:'Premium 27',
  dog_jackpot_9:'Finde DOG!'
 };
 const tierInfo={
  simple:{icon:'🎟️',name:'Einfach',className:'simple'},
  medium:{icon:'🎫',name:'Mittel',className:'medium'},
  premium:{icon:'💎',name:'Premium',className:'premium'}
 };
 let pending=null,requestId=0,levelData=null,claimPending=false,selectedRange=0;
 const element=(tag,cls,txt)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(txt!==undefined)node.textContent=txt;
  return node;
 };
 function message(text,error=false){
  status.textContent=text;status.dataset.error=String(error);
 }
 function claims(data){
  return data?.levelRewardClaims&&typeof data.levelRewardClaims==='object'?data.levelRewardClaims:{};
 }
 function describeVoucher(v){
  const name=ticketNames[v.id]||'Rubbellos';
  return String(v.count||1)+'× '+name;
 }
 function showRanges(maxLevel,currentLevel){
  const rangeCount=Math.ceil(maxLevel/10);
  nav.replaceChildren();
  for(let i=0;i<rangeCount;i++){
   const begin=i*10+1,end=Math.min(maxLevel,begin+9);
   const button=element('button','dog-level-range'+(selectedRange===i?' selected':''),
    String(begin).padStart(2,'0')+'–'+String(end).padStart(2,'0'));
   button.type='button';button.setAttribute('aria-pressed',String(selectedRange===i));
   button.title='Level '+begin+' bis '+end+' anzeigen';
   if(currentLevel>=begin&&currentLevel<=end)button.classList.add('contains-current');
   button.addEventListener('click',()=>{selectedRange=i;render(levelData);});
   nav.append(button);
  }
 }
 function render(data){
  if(!data?.level||!Number.isInteger(data.level.level))throw Error('DOG_LEVEL_DATA_INVALID');
  const level=data.level,maxLevel=Number.isInteger(level.maxLevel)?level.maxLevel:50;
  const all=Array.isArray(level.rewards)?level.rewards:[];
  const thresholds=Array.isArray(level.thresholds)?level.thresholds:null;
  const flags=claims(data);
  $('dog-level-current').textContent=String(level.level);
  $('dog-level-max').textContent=String(maxLevel);
  $('dog-level-xp-total').textContent=format(level.totalXp)+' EP';
  $('dog-level-next').textContent=level.nextLevel===null?'Maximallevel erreicht 🎉':
   'Level '+level.nextLevel+' · noch '+format(level.xpRemaining)+' EP';
  const bar=$('dog-level-progress');
  bar.value=Math.max(0,Math.min(100,Number(level.progressPercent)||0));
  bar.setAttribute('aria-valuenow',String(bar.value));
  $('dog-level-progress-text').textContent=level.nextLevel===null?
   'Alle '+maxLevel+' Level geschafft!':format(level.xpIntoLevel)+' / '+format(level.xpForNextLevel)+' EP zum nächsten Level';
  $('dog-level-matches').textContent=format(level.totalVerifiedMatches);
  $('dog-level-last').textContent=level.totalVerifiedMatches?
   '+'+format(level.lastEarnedXp)+' EP bei der letzten Partie':'Noch keine abgeschlossene DOG-Partie';
  const bonus=Number.isInteger(data.academyXpPercent)?data.academyXpPercent:0;
  $('dog-level-academy').textContent=bonus?'+'+bonus+' % XP durch die Akademie':'Grundstufe · noch kein XP-Bonus';
  const collected=Object.values(flags).filter(Boolean).length;
  $('dog-level-claimed').textContent=format(collected)+' / '+maxLevel;
  const nextClaim=all.find(x=>x.level<=level.level&&!flags[x.level]&&x.configured);
  const nextLocked=all.find(x=>x.level>level.level&&x.configured);
  $('dog-level-coming').textContent=nextClaim?
   '🎁 Level '+nextClaim.level+': Belohnung abholbereit':
   nextLocked?'🔒 Nächste Belohnung auf Level '+nextLocked.level:
   '🏆 Alle Level-Belohnungen erreicht!';
  if(selectedRange>=Math.ceil(maxLevel/10))selectedRange=0;
  showRanges(maxLevel,level.level);
  grid.replaceChildren();
  const start=selectedRange*10+1,end=Math.min(maxLevel,start+9);
  $('dog-level-range-title').textContent='Level '+start+'–'+end;
  for(let n=start;n<=end;n++){
   const entry=all.find(x=>x.level===n),reward=entry?.reward;
   const reached=n<=level.level,claimed=Boolean(flags[n]),claimable=reached&&!claimed;
   const milestone=n%10===0;
   const card=element('article','dog-level-tile'+(reached?' reached':'')+
    (claimed?' claimed':'')+(claimable?' claimable':'')+
    (n===level.level?' current':'')+(milestone?' milestone':''));
   const top=element('div','dog-level-card-top');
   top.append(element('span','dog-level-badge',String(n).padStart(2,'0')));
   top.append(element('span','dog-level-state',claimed?'✓ Abgeholt':claimable?'🎁 Bereit':'🔒 Gesperrt'));
   card.append(top);
   const title=element('h4','dog-level-card-title','Level '+n);
   card.append(title);
   const threshold=element('p','dog-level-threshold',n===1?'Startlevel':
    'Ab '+format(thresholds?.[n-1]??(100*(n-1)+25*(n-1)*(n-2)))+' EP');
   card.append(threshold);
   if(milestone)card.append(element('div','dog-level-milestone-label','✦ MEILENSTEIN ✦'));
   if(reward?.type==='feature'||reward?.type==='cardEdition'||reward?.type==='pieceShape')
    card.append(element('div','dog-level-special',reward.title));
   const items=element('div','dog-level-prizes');
   for(const v of reward?.vouchers||[]){
    const info=tierInfo[v.tier]||tierInfo.simple;
    const chip=element('div','dog-level-prize '+info.className);
    chip.append(element('span','dog-level-prize-icon',info.icon));
    const detail=element('div','dog-level-prize-content');
    detail.append(element('strong','',describeVoucher(v)));
    detail.append(element('small','',info.name+'-Los · kostenlos einlösbar'));
    chip.append(detail);
    items.append(chip);
   }
   if(!items.children.length)items.append(element('span','','Belohnung folgt'));
   card.append(items);
   if(claimable){
    const button=element('button','dog-level-claim','🎁 Belohnung abholen');
    button.type='button';button.disabled=claimPending;
    button.addEventListener('click',()=>void claimReward(n));
    card.append(button);
   }else if(claimed){
    card.append(element('div','dog-level-redeemed','✓ Gutscheine im Rubbellos-Konto'));
   }
   grid.append(card);
  }
 }
 async function claimReward(n){
  if(claimPending||!user()||!levelData||n>levelData.level.level)return;
  const current=user(),identity=current.uid;
  claimPending=true;render(levelData);
  try{
   const token=await current.getIdToken();
   if(user()?.uid!==identity)return;
   const res=await fetch(base+'/api/hub/dog/level/rewards/claim',{
    method:'POST',mode:'cors',cache:'no-store',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({level:n})
   });
   const data=await res.json().catch(()=>({}));
   if(!res.ok||data.ok!==true||data.levelRewardClaims?.[n]!==true)
    throw Error(data.error||'DOG_LEVEL_REWARD_FAILED');
   if(user()?.uid!==identity)return;
   levelData={...levelData,levelRewardClaims:{...data.levelRewardClaims}};
   render(levelData);
   message('🎉 Level '+n+': Deine Rubbellos-Gutscheine sind gutgeschrieben! Öffne den Bereich „Rubbellose“, um sie einzulösen.');
  }catch(error){
   message('⚠️ Belohnung konnte nicht abgeholt werden: '+(error.message||'Verbindung prüfen'),true);
  }finally{
   claimPending=false;
   if(levelData&&user()?.uid===identity)render(levelData);
  }
 }
 async function load(){
  if(pending)return pending;
  const current=user(),tokenId=++requestId;
  if(!current){
   $('dog-level-summary').hidden=true;grid.replaceChildren();nav.replaceChildren();
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
   const wasEmpty=!levelData;
   levelData=result;
   if(wasEmpty)selectedRange=Math.floor((result.level.level-1)/10);
   render(result);
   $('dog-level-summary').hidden=false;
   message('🎄 Dein Level und deine Rubbellos-Gutscheine sind mit deinem persönlichen Profil verknüpft.');
  })();
  try{await pending;}catch(error){
   if(tokenId===requestId){
    $('dog-level-summary').hidden=true;grid.replaceChildren();nav.replaceChildren();
    message('⚠️ Level-Daten konnten nicht geladen werden. Bitte versuche es erneut.',true);
   }
  }finally{pending=null;refresh.disabled=false;}
 }
 refresh.addEventListener('click',()=>void load());
 $('dog-level-to-scratch')?.addEventListener('click',()=>$('tab-scratch')?.click());
 window.addEventListener('spielonline-change',()=>{
  requestId++;levelData=null;selectedRange=0;
  $('dog-level-summary').hidden=true;grid.replaceChildren();nav.replaceChildren();
  message('Profil gewechselt – bitte Level neu laden.');
  if($('tab-level')?.getAttribute('aria-selected')==='true')void load();
 });
 return {load};
}
