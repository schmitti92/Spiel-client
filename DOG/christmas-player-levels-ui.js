/**
 * Golden Lichtertal player-level page: presentation only.
 * All XP, wins and prize claims come from the authenticated Render server.
 */
export function initDogPlayerLevels(){
 const $=id=>document.getElementById(id);
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const status=$('dog-level-status'),grid=$('dog-level-rewards'),nav=$('dog-level-range-nav');
 const refresh=$('dog-level-refresh'),scroller=$('dog-level-cards-scroll');
 const prev=$('dog-level-range-prev'),next=$('dog-level-range-next');
 const user=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s?.user?.getIdToken?s.user:null;
 };
 const format=n=>Number(n||0).toLocaleString('de-DE');
 const element=(tag,cls,content)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(content!==undefined)node.textContent=content;
  return node;
 };
 const ticketArt={
  simple:'./weihnachtsevent-bilder/geschichtenbuch-grafiken/32_Rubbellos_Einfach.png',
  medium:'./weihnachtsevent-bilder/geschichtenbuch-grafiken/33_Rubbellos_Mittel.png',
  premium:'./weihnachtsevent-bilder/geschichtenbuch-grafiken/34_Rubbellos_Premium.png'
 };
 const ticketLabels={simple:'einfaches Los',medium:'mittleres Los',premium:'Premium-Los'};
 const specialArt={
  'dog-design-studio':{emoji:'🎨',label:'Brettdesigner'},
  'kartendesign-05':{image:'./assets/karten/kartendesign-05/8.png',label:'Nikolaus-Kartendeck'},
  'dog-pawn-3d':{emoji:'♟️',label:'3D-Spielfiguren'}
 };
 const rangeIcons=['⭐','🎁','🎟️','🎄','👑'];
 let pending=null,requestId=0,levelData=null,claimPending=false,selectedRange=0;
 let announcement='';
 function message(content,error=false){
  announcement=content;status.textContent=content;status.dataset.error=String(error);
 }
 function claimFlags(data){
  return data?.levelRewardClaims&&typeof data.levelRewardClaims==='object'?data.levelRewardClaims:{};
 }
 function updateAvatar(){
  const state=window.SpielOnline?.state?.();
  const profile=state?.profile||{};
  const name=String(profile.name||state?.user?.displayName||'Spieler').trim().slice(0,32);
  $('dog-level-player-name').textContent=name||'Spieler';
  const avatar=$('dog-level-avatar');
  avatar.textContent='👤';
  avatar.style.backgroundImage='';avatar.style.backgroundSize='';
  avatar.style.backgroundPosition='';
  const pic=profile.avatarImage;
  if(typeof pic==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(pic)){
   avatar.textContent='';
   avatar.style.backgroundImage='url("'+pic+'")';
   avatar.style.backgroundSize='cover';avatar.style.backgroundPosition='center';
  }else if(Number.isInteger(profile.avatar)&&profile.avatar>=0&&profile.avatar<8){
   avatar.textContent='';
   avatar.style.backgroundImage='url("../profile-avatars.webp")';
   avatar.style.backgroundSize='400% 200%';
   avatar.style.backgroundPosition=(profile.avatar%4)*100/3+'% '+Math.floor(profile.avatar/4)*100+'%';
  }else if(typeof state?.user?.photoURL==='string'&&/^https:\/\//.test(state.user.photoURL)){
   avatar.textContent='';
   avatar.style.backgroundImage='url("'+state.user.photoURL.replace(/["'()\\]/g,'')+'")';
   avatar.style.backgroundSize='cover';avatar.style.backgroundPosition='center';
  }
  avatar.setAttribute('aria-label','Profilbild von '+(name||'Spieler'));
 }
 function voucherSummary(items){
  if(!items?.length)return 'Belohnung folgt';
  if(items.length===4&&items.reduce((total,v)=>total+v.count,0)===4)return '4 Startlose (verschiedene)';
  return items.map(({tier,count})=>{
   const name=ticketLabels[tier]||'Rubbellos';
   return count+'× '+(count===1?name:tier==='simple'?'einfache Lose':
    tier==='medium'?'mittlere Lose':'Premium-Lose');
  }).join(' + ');
 }
 function renderRanges(max,current){
  nav.replaceChildren();
  const count=Math.ceil(max/10);
  selectedRange=Math.max(0,Math.min(count-1,selectedRange));
  for(let i=0;i<count;i++){
   const start=i*10+1,end=Math.min(max,start+9);
   const button=element('button','dog-level-range'+(i===selectedRange?' selected':''));
   button.type='button';
   button.setAttribute('aria-pressed',String(i===selectedRange));
   button.setAttribute('aria-label','Level '+start+' bis '+end+' anzeigen');
   const icon=element('span','dog-pass-range-icon',rangeIcons[i]||'⭐');
   icon.setAttribute('aria-hidden','true');
   button.append(icon,element('span','', 'Level '+start+'–'+end));
   if(current>=start&&current<=end)button.classList.add('contains-current');
   button.addEventListener('click',()=>changeRange(i));
   nav.append(button);
  }
  prev.disabled=selectedRange===0;
  next.disabled=selectedRange===count-1;
 }
 function image(path,cls,alt){
  const img=element('img',cls);
  img.src=path;img.alt=alt;img.loading='lazy';
  img.decoding='async';
  return img;
 }
 function visualForReward(reward){
  const area=element('div','dog-pass-art');
  const special=specialArt[reward?.id];
  if(special){
   if(special.image){
    area.append(image(special.image,'dog-pass-special-art',special.label));
   }else{
    area.append(element('span','dog-pass-special-emoji',special.emoji));
   }
  }else{
   const kinds=[...new Set((reward?.vouchers||[]).map(v=>v.tier))];
   const shown=kinds.slice(0,2);
   for(const kind of shown){
    if(ticketArt[kind])area.append(image(ticketArt[kind],'dog-pass-ticket-art',
      kind==='premium'?'Premium-Rubbellos':kind==='medium'?'Mittleres Rubbellos':'Einfaches Rubbellos'));
   }
   if(!shown.length)area.append(element('span','dog-pass-special-emoji','🎁'));
   const total=(reward?.vouchers||[]).reduce((n,v)=>n+Number(v.count||0),0);
   if(total>1)area.append(element('span','dog-pass-quantity','×'+total));
  }
  return area;
 }
 function renderCard(n,entry,level,flags){
  const reward=entry?.reward;
  const reached=n<=level.level,claimed=Boolean(flags[n]),claimable=reached&&!claimed;
  const card=element('article','dog-level-tile'+(reached?' reached':'')+
   (claimed?' claimed':'')+(claimable?' claimable':'')+
   (n===level.level?' current':'')+(n%10===0?' milestone':''));
  card.setAttribute('aria-label','Level '+n+', '+(claimed?'Belohnung abgeholt':claimable?'Belohnung abholbereit':'gesperrt'));
  const top=element('div','dog-level-card-top');
  top.append(element('h4','dog-level-card-title','Level '+n));
  card.append(top);
  const xp=n===1?'Startlevel':
   'Ab '+format(100*(n-1)+25*(n-1)*(n-2))+' EP';
  card.append(element('p','dog-level-threshold',xp));
  card.append(visualForReward(reward));
  const copy=element('div','dog-pass-reward-copy');
  const special=specialArt[reward?.id];
  if(special){
   copy.append(element('strong','',special.label));
   copy.append(element('small','','+ '+voucherSummary(reward?.vouchers)));
  }else{
   copy.append(element('strong','',voucherSummary(reward?.vouchers)));
  }
  card.append(copy);
  if(claimed){
   card.append(element('div','dog-level-redeemed','✓ Abgeholt'));
  }else if(claimable){
   const button=element('button','dog-level-claim','🎁 Abholen');
   button.type='button';button.disabled=claimPending;
   button.setAttribute('aria-label',n===1?'Vier Startgutscheine abholen':'Belohnung für Level '+n+' abholen');
   button.addEventListener('click',()=>void claimReward(n));
   card.append(button);
  }else{
   card.append(element('div','dog-pass-locked','🔒 Gesperrt'));
  }
  return card;
 }
 function render(data){
  const level=data?.level;
  if(!level||!Number.isInteger(level.level))throw Error('DOG_LEVEL_DATA_INVALID');
  const max=Number.isInteger(level.maxLevel)&&level.maxLevel>0?level.maxLevel:50;
  const all=Array.isArray(level.rewards)?level.rewards:[];
  const flags=claimFlags(data);
  updateAvatar();
  $('dog-level-current').textContent=String(level.level);
  $('dog-level-max').textContent=String(max);
  const target=level.nextLevel===null?level.totalXp:level.totalXp+level.xpRemaining;
  $('dog-level-xp-total').textContent=format(level.totalXp)+' / '+format(target)+' EP';
  $('dog-level-next').textContent=level.nextLevel===null?'🎉 Maximallevel erreicht!':
   'Noch '+format(level.xpRemaining)+' EP bis Level '+level.nextLevel;
  const percentage=Math.max(0,Math.min(100,Number(level.progressPercent)||0));
  const meter=$('dog-level-progress');
  meter.value=percentage;meter.setAttribute('aria-valuenow',String(percentage));
  $('dog-level-progress-percent').textContent=percentage+' %';
  $('dog-level-matches').textContent=format(level.totalVerifiedMatches);
  $('dog-level-wins').textContent=format(level.wins||0);
  const claimed=Object.values(flags).filter(Boolean).length;
  $('dog-level-claimed').textContent=format(claimed)+' / '+max;
  const firstClaim=all.find(x=>x.configured&&x.level<=level.level&&!flags[x.level]);
  const nextReward=firstClaim||all.find(x=>x.configured&&x.level>level.level);
  $('dog-level-coming').textContent=nextReward?'Level '+nextReward.level:
   'Alle abgeholt!';
  const bonus=Number.isInteger(data.academyXpPercent)?data.academyXpPercent:0;
  const researchBonus=Number.isInteger(data.researchXpPercent)?data.researchXpPercent:0;
  const researchWin=Number.isInteger(data.researchWinXpPercent)?data.researchWinXpPercent:0;
  $('dog-level-academy').textContent=[bonus?'Akademie +'+bonus+' %':null,
    researchBonus?'Wichtelwissen +'+researchBonus+' %':null,
    researchWin?'Siegerakademie +'+researchWin+' % Sieger-XP':null].filter(Boolean).join(' · ')||'Grundstufe';
  $('dog-level-last').textContent=level.totalVerifiedMatches?
   'Letzte Partie: +'+format(level.lastEarnedXp)+' EP':'Noch keine DOG-Partie abgeschlossen';
  renderRanges(max,level.level);
  grid.replaceChildren();
  const begin=selectedRange*10+1,end=Math.min(max,begin+9);
  $('dog-level-range-title').textContent='Level '+begin+'–'+end+' von '+max+' · Wische horizontal für weitere Karten.';
  for(let n=begin;n<=end;n++){
   grid.append(renderCard(n,all.find(item=>item.level===n),level,flags));
  }
 }
 function changeRange(nextRange){
  if(!levelData)return;
  const max=levelData.level?.maxLevel||50;
  const rangeCount=Math.ceil(max/10);
  selectedRange=Math.max(0,Math.min(rangeCount-1,nextRange));
  render(levelData);
  scroller.scrollLeft=0;
 }
 async function claimReward(n){
  if(claimPending||!user()||!levelData||n>levelData.level.level)return;
  const current=user(),uid=current.uid;
  claimPending=true;render(levelData);
  try{
   const token=await current.getIdToken();
   if(user()?.uid!==uid)return;
   const reply=await fetch(base+'/api/hub/dog/level/rewards/claim',{
    method:'POST',mode:'cors',cache:'no-store',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({level:n})
   });
   const result=await reply.json().catch(()=>({}));
   if(!reply.ok||result.ok!==true||result.levelRewardClaims?.[n]!==true)
    throw Error(result.error||'DOG_LEVEL_REWARD_FAILED');
   if(user()?.uid!==uid)return;
   levelData={...levelData,levelRewardClaims:{...result.levelRewardClaims}};
   message('🎉 Level '+n+': Deine Gutscheine wurden im Rubbellos-Konto gutgeschrieben.');
  }catch(error){
   message('⚠️ Belohnung konnte nicht abgeholt werden: '+(error.message||'Verbindung prüfen'),true);
  }finally{
   claimPending=false;
   if(user()?.uid===uid&&levelData)render(levelData);
  }
 }
 async function load(){
  if(pending)return pending;
  const current=user(),id=++requestId;
  if(!current){
   $('dog-level-summary').hidden=true;
   grid.replaceChildren();nav.replaceChildren();
   message('🔐 Bitte melde dich mit deinem Online-Spielerprofil an.',true);
   return;
  }
  message('⭐ Dein persönlicher Level-Fortschritt wird geladen …');
  refresh.disabled=true;
  pending=(async()=>{
   const token=await current.getIdToken();
   if(requestId!==id||user()?.uid!==current.uid)return;
   const response=await fetch(base+'/api/hub/dog/level',{
    method:'GET',mode:'cors',cache:'no-store',
    headers:{Authorization:'Bearer '+token}
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok||result.ok!==true)throw Error(result.error||'DOG_LEVEL_SERVER_ERROR');
   if(requestId!==id||user()?.uid!==current.uid)return;
   levelData=result;
   render(result);
   $('dog-level-summary').hidden=false;
   message('🎄 Alle Level, EP und Rubbellos-Gutscheine sind mit deinem persönlichen Profil verknüpft.');
  })();
  try{await pending;}
  catch(error){
   if(id===requestId){
    $('dog-level-summary').hidden=true;grid.replaceChildren();nav.replaceChildren();
    message('⚠️ Level-Daten konnten nicht geladen werden. Bitte erneut versuchen.',true);
   }
  }finally{pending=null;refresh.disabled=false;}
 }
 refresh.addEventListener('click',()=>void load());
 prev.addEventListener('click',()=>changeRange(selectedRange-1));
 next.addEventListener('click',()=>changeRange(selectedRange+1));
 $('dog-level-to-scratch')?.addEventListener('click',()=>$('tab-scratch')?.click());
 $('dog-level-to-research')?.addEventListener('click',()=>$('tab-research')?.click());
 window.addEventListener('spielonline-change',()=>{
  const previous=levelData;
  requestId++;levelData=null;selectedRange=0;
  $('dog-level-summary').hidden=true;
  grid.replaceChildren();nav.replaceChildren();
  message('Profil aktualisiert – bitte Level neu laden.');
  if($('tab-level')?.getAttribute('aria-selected')==='true')void load();
 });
 return {load};
}
