/* DOG forge D2 · cinematic presentation only.
   No HTTP requests, no inventory writes, no speculative success result.
   The real forge request and pending receipt remain entirely in dog-forge-ui.js. */
(()=>{'use strict';
 const dialog=document.getElementById('forge-ceremony');
 const stage=document.getElementById('forge-ceremony-art');
 const heading=document.getElementById('forge-ceremony-title');
 const status=document.getElementById('forge-ceremony-status');
 const caption=document.getElementById('forge-ceremony-caption');
 const skipButton=document.getElementById('forge-ceremony-skip');
 if(!dialog||!stage||!heading||!status||!caption||!skipButton)return;
 const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const tiers=level=>level<=5?1:level<=10?2:level<=15?3:level<=19?4:5;
 const duration=Object.freeze({success:1550,legendary:2550,failure:1050,exchange:1050});
 let active=false,skipped=false,activeItem=null,pendingTimer=null,pendingFinish=null;
 function artPath(item,level){
  const id=item?.id,group=item?.group;
  if(group==='equipment'&&(id==='weapon'||id==='armor'))
   return './dog-forge-art/'+id+'-'+tiers(Number(level)||1)+'.svg';
  if((group==='attack'||group==='defense')&&/^[a-z_]{2,35}$/.test(id||''))
   return './dog-forge-art/skill-'+id+'.svg';
  return null;
 }
 function showArt(item,level){
  stage.replaceChildren();
  const path=artPath(item,level);
  if(!path){
   const fallback=document.createElement('span');
   fallback.className='ceremony-placeholder';
   fallback.textContent=item?.icon||'⚒️';
   stage.append(fallback);return;
  }
  const img=document.createElement('img');
  img.className='ceremony-item-image';
  img.src=path;img.alt='';img.decoding='async';img.loading='eager';
  img.addEventListener('error',()=>{
   if(!img.isConnected)return;
   const fallback=document.createElement('span');
   fallback.className='ceremony-placeholder';
   fallback.textContent=item?.icon||(item?.id==='armor'?'🛡️':'⚔️');
   img.replaceWith(fallback);
  },{once:true});
  stage.append(img);
 }
 function settle(){
  if(pendingTimer!==null){window.clearTimeout(pendingTimer);pendingTimer=null;}
  if(pendingFinish){const resolve=pendingFinish;pendingFinish=null;resolve();}
 }
 function closeStage(){
  if(dialog.open)dialog.close();
 }
 function abort(){
  active=false;skipped=true;activeItem=null;
  settle();closeStage();
  dialog.dataset.phase='idle';
 }
 function skip(){
  if(!active)return;
  skipped=true;
  closeStage();
  settle();
 }
 function start({item,level}={}){
  abort();
  active=true;skipped=reduce();activeItem=item||null;
  if(skipped)return;
  heading.textContent=(item?.name||'Deine Ausrüstung')+' wird geschmiedet';
  status.textContent='Dein Schmiedeauftrag wird vom Server verarbeitet …';
  caption.textContent='Der Hammer fällt. Der Ausgang steht noch nicht fest.';
  dialog.dataset.phase='smithing';
  dialog.classList.toggle('ceremony-is-skill',item?.group!=='equipment');
  const talent=item?.id;
  dialog.style.setProperty('--ceremony-accent',talent==='regeneration'?'#68d59a':
   talent==='evasion'?'#72d6ed':talent==='blocking'?'#7fa9ed':
   talent==='last_stand'?'#d195ff':item?.group==='attack'?'#f6a45f':'#ffd081');
  showArt(item,level);
  try{dialog.showModal();}
  catch{skipped=true;}
 }
 function finish(result){
  if(!active||skipped)return Promise.resolve();
  const success=result?.type==='exchange'||result?.success===true;
  const oldLevel=Number(result?.oldLevel)||1;
  const newLevel=Number(result?.newLevel)||oldLevel;
  const transformed=success&&activeItem?.group==='equipment'&&tiers(oldLevel)!==tiers(newLevel);
  if(transformed)showArt(activeItem,newLevel);
  const phase=success?(transformed?'legendary':'success'):'failure';
  dialog.dataset.phase=phase;
  status.textContent=success?
   (transformed?'✦ Neue Ausrüstungsoptik freigeschaltet!':'✦ Der Schmiedeauftrag ist gelungen!'):
   'Die Verbesserung ist fehlgeschlagen.';
  caption.textContent=success?
   (transformed?'Deine Ausrüstung erstrahlt in neuer Gestalt.':
    'Die Macht des Schmiedefeuers hat dein Werk vollendet.'):
   'Die Stufe bleibt bestehen. Die eingesetzten Rohstoffe wurden verbraucht.';
  return new Promise(resolve=>{
   pendingFinish=resolve;
   pendingTimer=window.setTimeout(()=>{
    if(!active)return;
    active=false;activeItem=null;skipped=true;
    settle();closeStage();
   },duration[phase]);
  });
 }
 skipButton.addEventListener('click',skip);
 // Background tabs must never leave a pending visual timer blocking the result.
 document.addEventListener('visibilitychange',()=>{if(document.hidden)skip();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();skip();});
 dialog.addEventListener('close',()=>{if(active&&!skipped)skip();});
 window.DogForgeCeremony=Object.freeze({start,finish,abort});
})();