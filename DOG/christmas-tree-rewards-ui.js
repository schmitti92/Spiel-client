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
 const grid=document.getElementById('tree-reward-list');
 const feedback=document.getElementById('tree-reward-feedback');
 const counter=document.getElementById('tree-reward-counter');
 if(!grid||!feedback||!counter)throw Error('TREE_REWARD_UI_MISSING');
 let status=null,busy=false,callIndex=0;
 const make=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=String(value);
  return node;
 };
 const say=message=>{feedback.textContent=message};
 const render=()=>{
  grid.replaceChildren();
  counter.textContent=(status?.collected||0)+' / 10 abgeholt';
  const records=Array.isArray(status?.rewards)?status.rewards:TREE_PRIZE_PREVIEW;
  for(const item of records){
   const state=status?(item.state||'locked'):'unknown';
   const wrap=make('article','tree-reward');
   wrap.dataset.status=state;
   wrap.append(make('span','tree-reward-level','LEVEL '+item.level));
   wrap.append(make('span','tree-reward-icon',item.prize?.icon||item.icon||'🎁'));
   wrap.append(make('strong','tree-reward-title',item.prize?.name||item.title));
   const message=state==='collected'?'✅ Gesammelt':state==='ready'?'🎁 Abholbereit':state==='locked'?'🔒 Gesperrt':'🔎 Online prüfen';
   wrap.append(make('span','tree-reward-status',message));
   if(state==='ready'){
    const button=make('button','tree-reward-claim',busy?'Wird geprüft …':'🎁 Abholen');
    button.type='button';button.disabled=busy;
    button.setAttribute('aria-label','Weihnachtsbaum Level '+item.level+' Preis abholen');
    button.addEventListener('click',()=>void claim(item.level));
    wrap.append(button);
   }
   grid.append(wrap);
   // Mirror only Render-confirmed gift statuses into the milestone timeline.
   const milestone=document.querySelector('#tree-steps [data-tree-step="'+item.level+'"]');
   if(milestone){
    milestone.dataset.status=state;
    const icon=milestone.querySelector('[data-tree-gift-icon]');
    const label=milestone.querySelector('[data-tree-prize-title]');
    const badge=milestone.querySelector('[data-tree-status]');
    if(icon)icon.textContent=item.prize?.icon||item.icon||'🎁';
    if(label)label.textContent=item.prize?.name||item.title;
    if(badge)badge.textContent=message;
    milestone.querySelector('.tree-step-claim')?.remove();
    if(state==='ready'){
     const mini=make('button','tree-step-claim',busy?'Wird geprüft …':'🎁 Jetzt abholen');
     mini.type='button';mini.disabled=busy;
     mini.setAttribute('aria-label','Preis für Baumstufe '+item.level+' abholen');
     mini.addEventListener('click',()=>void claim(item.level));
     milestone.append(mini);
    }
   }
  }
  const current=document.querySelector('#tree-steps .tree-step.selected');
  const currentStatus=current?.querySelector('[data-tree-status]')?.textContent;
  const heroStatus=document.getElementById('tree-current-prize-status');
  if(heroStatus&&currentStatus)heroStatus.textContent=currentStatus;
 };
 const load=async()=>{
  const index=++callIndex;
  if(!roomValid){status=null;render();say('Öffne das Weihnachtsdorf aus deinem Online-DOG-Raum, um echte Preise zu erhalten.');return}
  if(!loggedIn()){status=null;render();say('🔐 Bitte mit deinem Online-Profil anmelden.');return}
  try{
   const result=await request('tree-rewards');
   if(index!==callIndex)return;
   if(!Array.isArray(result.treeRewards?.rewards)||result.treeRewards.rewards.length!==10)throw Error('TREE_REWARD_STATUS_INVALID');
   status=result.treeRewards;
   render();
   say(status.available>0?'🎁 '+status.available+' Weihnachtsgeschenk(e) können abgeholt werden.':
    'Alle erreichbaren Baumpreise sind bereits abgeholt.');
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
