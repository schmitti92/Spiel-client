/**
 * Lichtertal Christmas tree personal prize board.
 * The server owns every level, eligible action, random outcome and receipt.
 * We request status only upon opening the tree area or after an upgrade;
 * no Firebase polling, localStorage grants or client random numbers.
 */
export const TREE_PRIZE_PREVIEW=Object.freeze([
 {level:1,icon:'🏞️',title:'Vollbild-Hintergrund'},
 {level:2,icon:'👤',title:'Weihnachtsprofilbild'},
 {level:3,icon:'🃏',title:'Kartendesign'},
 {level:4,icon:'🎲',title:'Weihnachts-Spielbrett'},
 ...Array.from({length:6},(_,i)=>({level:i+5,icon:'🎁',title:'Zufällige Überraschung'}))
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
   const state=item.state||'locked';
   const wrap=make('article','tree-reward');
   wrap.dataset.status=state;
   wrap.append(make('span','tree-reward-level','LEVEL '+item.level));
   wrap.append(make('span','tree-reward-icon',item.prize?.icon||item.icon||'🎁'));
   wrap.append(make('strong','tree-reward-title',item.prize?.name||item.title));
   const message=state==='collected'?'✅ Gesammelt':state==='ready'?'🎁 Abholbereit':'🔒 Gesperrt';
   wrap.append(make('span','tree-reward-status',message));
   if(state==='ready'){
    const button=make('button','tree-reward-claim',busy?'Wird geprüft …':'🎁 Abholen');
    button.type='button';button.disabled=busy;
    button.setAttribute('aria-label','Weihnachtsbaum Level '+item.level+' Preis abholen');
    button.addEventListener('click',()=>void claim(item.level));
    wrap.append(button);
   }
   grid.append(wrap);
  }
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
  busy=true;render();say('🎄 Dein Preis wird auf Render ausgelost und gespeichert …');
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
