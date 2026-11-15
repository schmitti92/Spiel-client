/**
 * Lichtertal Christmas tree: ten predetermined prizes, visible before earning.
 * The server decides whether the stage is reached and writes the one-time
 * receipt; this module only displays and requests the predefined prize.
 */
export const TREE_PRIZE_PREVIEW=Object.freeze([
 Object.freeze({"level":1,"icon":"🏞️","title":"Märchenhafter Weihnachtswald","unlockId":"christmas2026:scene:01"}),
 Object.freeze({"level":2,"icon":"🎅","title":"Weihnachtsmann","unlockId":"christmas2026:avatar:01"}),
 Object.freeze({"level":3,"icon":"🃏","title":"Winterzauber · Blau","unlockId":"christmas2026:cards:kartendesign-02"}),
 Object.freeze({"level":4,"icon":"🎲","title":"Weihnachtsdorf","unlockId":"christmas2026:board:weihnachtsdorf"}),
 Object.freeze({"level":5,"icon":"🍪","title":"Weihnachtsplätzchen","unlockId":"christmas2026:emoji:05"}),
 Object.freeze({"level":6,"icon":"🛡️","title":"Sternengold","unlockId":"christmas2026:nameframe:01"}),
 Object.freeze({"level":7,"icon":"👑","title":"Eiskrone","unlockId":"christmas2026:activeicon:02"}),
 Object.freeze({"level":8,"icon":"🃏","title":"Weihnachtsglanz · Rot-Grün-Gold","unlockId":"christmas2026:cards:kartendesign-03"}),
 Object.freeze({"level":9,"icon":"🌌","title":"Magischer Polarlicht-Fjord","unlockId":"christmas2026:scene:05"}),
 Object.freeze({"level":10,"icon":"🏰","title":"Polarlichtpalast","unlockId":"christmas2026:board:polarlichtpalast"}),
]);
export function initChristmasTreeRewards({request,roomValid,loggedIn}){
 const feedback=document.getElementById('tree-reward-feedback');
 const timeline=document.getElementById('tree-steps');
 if(!feedback||!timeline)throw Error('TREE_REWARD_UI_MISSING');
 let status=null,busy=false,callIndex=0;
 const make=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=String(value);
  return node;
 };
 const say=message=>{
  feedback.textContent=message||'';
  feedback.hidden=!message;
 };
 const render=()=>{
  const records=Array.isArray(status?.rewards)?status.rewards:TREE_PRIZE_PREVIEW;
  for(const item of records){
   const state=status?(item.state||'locked'):'unknown';
   const milestone=timeline.querySelector('[data-tree-step="'+item.level+'"]');
   if(!milestone)continue;
   milestone.dataset.status=state;
   const icon=milestone.querySelector('[data-tree-gift-icon]');
   const label=milestone.querySelector('[data-tree-prize-title]');
   const badge=milestone.querySelector('[data-tree-status]');
   if(icon)icon.textContent=item.prize?.icon||item.icon||'🎁';
   if(label)label.textContent=item.prize?.name||item.title;
   if(badge)badge.textContent=state==='collected'?'✅ Gesammelt':state==='ready'?'🎁 Abholbereit':state==='locked'?'🔒 Gesperrt':'';
   milestone.querySelector('.tree-step-claim')?.remove();
   if(state==='ready'){
    const button=make('button','tree-step-claim',busy?'Wird geprüft …':'🎁 Jetzt abholen');
    button.type='button';
    button.disabled=busy;
    button.setAttribute('aria-label','Preis für Baumstufe '+item.level+' abholen');
    button.addEventListener('click',()=>void claim(item.level));
    milestone.append(button);
   }
  }
 };
 const load=async()=>{
  const index=++callIndex;
  if(!roomValid){status=null;render();say('');return}
  if(!loggedIn()){status=null;render();say('');return}
  try{
   const result=await request('tree-rewards');
   if(index!==callIndex)return;
   if(!Array.isArray(result.treeRewards?.rewards)||result.treeRewards.rewards.length!==10)throw Error('TREE_REWARD_STATUS_INVALID');
   status=result.treeRewards;
   render();
   say('');
  }catch(error){
   if(index!==callIndex)return;
   status=null;render();say('⚠️ Baumpreise nicht abrufbar: '+(error?.message||'Serverfehler'));
  }
 };
 const claim=async level=>{
  if(busy||!roomValid||!loggedIn()||!Number.isInteger(level))return;
  busy=true;render();say('🎄 Dein festgelegter Preis wird auf Render geprüft und gutgeschrieben …');
  try{
   const result=await request('tree-rewards/claim','POST',{level});
   if(!result?.prize||result?.treeRewards?.rewards?.length!==10)throw Error('TREE_REWARD_CLAIM_INVALID');
   status=result.treeRewards;
   say((result.replayed?'✅ Bereits gewonnen: ':'🎉 Neu gewonnen: ')+result.prize.icon+' '+result.prize.name+' ('+result.prize.label+').');
  }catch(error){
   const messages={
    JOIN_DOG_FIRST:'Bitte zuerst in der Spiellobby bei DOG auf „Beitreten“ drücken.',
    DOG_NOT_SELECTED:'Bitte zuerst DOG in der Spiellobby auswählen.',
    TREE_LEVEL_NOT_REACHED:'Der gemeinsame Weihnachtsbaum hat diese Stufe noch nicht erreicht.',
    LOGIN_REQUIRED:'Bitte zuerst mit deinem Online-Spielerprofil anmelden.',
    NOT_A_MEMBER:'Bitte aus deinem gemeinsamen DOG-Raum ins Event wechseln.'
   };
   say('⚠️ '+(messages[error?.message]||('Preis konnte nicht abgeholt werden: '+(error?.message||'Serverfehler'))));
  }finally{busy=false;render()}
 };
 render();
 return {load,getStatus:()=>status};
}
