/* DOG forge UI: compact, data driven, user-scoped, server-authoritative. */
(()=>{'use strict';
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const $=id=>document.getElementById(id);
 const room=new URLSearchParams(location.search).get('room')||'';
 if(/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room)){
  const back='./dog-expedition.html?room='+encodeURIComponent(room);
  $('forge-back').href=back;$('forge-materials').href=back;
 }
 const MATERIALS=[
  {group:'attack',label:'⚔️ Angriff',values:[
   ['focus_dust','🌫️','Fokusstaub'],['power_crystal','💎','Kraftkristall'],['battle_essence','🔮','Kampfessenz'],
   ['war_rune','✨','Kriegsrune'],['soul_shard','🌟','Seelensplitter']]},
  {group:'defense',label:'🛡️ Abwehr',values:[
   ['life_dust','🌿','Lebensstaub'],['guard_crystal','🪨','Schutzkristall'],['life_essence','💚','Lebensessenz'],
   ['guardian_rune','🔷','Wächterrune'],['phoenix_feather','🪽','Phönixfeder']]},
  {group:'equipment',label:'🔨 Ausrüstung',values:[
   ['iron','🪨','Eisenerz'],['forge_coal','🪵','Schmiedekohle'],['steel_core','🔩','Stahlkern'],
   ['mithril','💠','Mithril'],['dragonsteel','🐉','Drachenstahl']]}
 ];
 const material=Object.fromEntries(MATERIALS.flatMap(g=>g.values.map(([id,icon,name],index)=>[
  id,{id,icon,name,index,group:g.group}
 ])));
 const tabLabels={equipment:'⚔️ Ausrüstung',attack:'💥 Angriff',defense:'🛡️ Abwehr',exchange:'💎 Tausch'};
 // Independent look-and-feel tokens: extending a skill requires one entry and one SVG.
 // Attack = warm tones, defense = restorative/cool tones. No combat data lives here.
 const SKILL_ART=Object.freeze({
  destruction:{accent:'#ef4e64',glow:'#ef4e6460'},
  precision:{accent:'#f1c463',glow:'#f1c46350'},
  double_strike:{accent:'#ff994d',glow:'#ff994d5e'},
  attack_power:{accent:'#e75864',glow:'#e7586456'},
  critical:{accent:'#f9c65a',glow:'#f9c65a60'},
  regeneration:{accent:'#4ed59c',glow:'#4ed59c55'},
  blocking:{accent:'#699fe5',glow:'#699fe555'},
  evasion:{accent:'#5dd6dc',glow:'#5dd6dc50'},
  resilience:{accent:'#9baed0',glow:'#9baed050'},
  vitality:{accent:'#ef7d9d',glow:'#ef7d9d52'},
  last_stand:{accent:'#c38cff',glow:'#c38cff60'}
 });
 const STAGES=Object.freeze([
  {limit:5,title:'Geschmiedet',weapon:'Schmiedeklinge',armor:'Lederpanzer'},
  {limit:10,title:'Verstärkt',weapon:'Stahlklinge',armor:'Stahlpanzer'},
  {limit:15,title:'Runenwerk',weapon:'Runenklinge',armor:'Runenrüstung'},
  {limit:19,title:'Arkan',weapon:'Astralklinge',armor:'Astralrüstung'},
  {limit:20,title:'Legendär',weapon:'Drachenklinge',armor:'Drachenrüstung'}
 ]);
 const stageFor=level=>Math.max(1,STAGES.findIndex(s=>level<=s.limit)+1||5);
 const rankFor=total=>total>=450?'Legende':total>=280?'Meister':total>=160?'Veteran':
  total>=80?'Kämpfer':total>=35?'Rekrut':total>=12?'Lehrling':'Neuling';
 // Decorative achievements are derived from the authenticated hero's real levels
 // and lifetime counters. They don't alter gameplay or need extra database writes.
 const MILESTONES=Object.freeze([
  {icon:'⚒️',title:'Erster Funke',key:'successes',goal:1},
  {icon:'🌟',title:'Lehrschmied',key:'successes',goal:10},
  {icon:'🏅',title:'Meisterhand',key:'successes',goal:50},
  {icon:'💎',title:'Alchemistenpfad',key:'exchanges',goal:10},
  {icon:'🗡️',title:'Stahl erwacht',key:'weapon',goal:6},
  {icon:'🔮',title:'Runenschmied',key:'weapon',goal:11},
  {icon:'🐉',title:'Drachenschmied',key:'weapon',goal:20},
  {icon:'🛡️',title:'Wächterrüstung',key:'armor',goal:20},
  {icon:'✨',title:'Vollendete Kunst',key:'maxSkill',goal:50}
 ]);
 const money=n=>Math.max(0,Number(n)||0).toLocaleString('de-DE');
 const node=(tag,className,textValue)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(textValue!==undefined)el.textContent=String(textValue);
  return el;
 };
 let uid=null,view=null,busy=false,tab='equipment',selected='weapon',tradeGroup='equipment',loadSerial=0,readyOnly=false,confirmData=null;
 // One graphic asset for each equipment appearance tier (independent of balance).
 function gearVisual(id,level,compact=false){
  const stage=stageFor(level),config=STAGES[stage-1];
  const root=node('span','gear-visual gear-stage-'+stage+(compact?' compact':''));
  const img=node('img','gear-illustration');
  img.src='./dog-forge-art/'+id+'-'+stage+'.svg';
  img.alt=(id==='weapon'?config.weapon:config.armor)+' · Stufe '+level;
  img.loading=compact?'lazy':'eager';img.decoding='async';
  img.addEventListener('error',()=>{
   img.hidden=true;root.append(node('span','gear-fallback',id==='weapon'?'⚔️':'🛡️'));
  },{once:true});
  root.append(img);
  if(!compact)root.append(node('span','gear-stage-label',config[id]+' · Stufe '+level));
  return root;
 }
 function skillVisual(item,compact=false){
  const theme=SKILL_ART[item?.id];
  const root=node('span','skill-visual'+(compact?' compact':''));
  root.style.setProperty('--skill-accent',theme?.accent||'#d8b778');
  root.style.setProperty('--skill-glow',theme?.glow||'#d8b77840');
  if(theme){
   const img=node('img','skill-illustration');
   img.src='./dog-forge-art/skill-'+item.id+'.svg';
   img.alt=item.name+' – Fähigkeitssymbol';
   img.loading=compact?'lazy':'eager';img.decoding='async';
   img.addEventListener('error',()=>{
    img.hidden=true;
    root.append(node('span','skill-fallback',item.icon||'✨'));
   },{once:true});
   root.append(img);
  }else root.append(node('span','skill-fallback',item?.icon||'✨'));
  return root;
 }
 const auth=()=>{
  const state=window.SpielOnline?.state?.();
  return state?.status==='online'&&state.user?.uid&&state.profile?.setupComplete!==false?state:null;
 };
 const pendingKey=account=>'dog:forge:pending:'+account;
 function pending(account){
  if(!account)return null;
  try{
   const data=JSON.parse(localStorage.getItem(pendingKey(account))||'null');
   if(data&&/^[A-Za-z0-9_-]{12,90}$/.test(data.id)&&
      ['upgrade','exchange'].includes(data.action)&&data.payload&&typeof data.payload==='object')
    return data;
  }catch{}
  return null;
 }
 const savePending=(account,data)=>{try{localStorage.setItem(pendingKey(account),JSON.stringify(data));}catch{}};
 const clearPending=account=>{try{localStorage.removeItem(pendingKey(account));}catch{}};
 const newId=()=>{
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?'forge-'+uuid:'forge-'+Date.now()+'-'+Math.random().toString(36).slice(2,14);
 };
 function status(message,type=''){
  $('forge-status').textContent=message;
  $('forge-status').className='forge-status'+(type?' '+type:'');
 }
 async function request(method,route,data,account){
  const state=auth();
  if(!state||state.user.uid!==account)throw Error('LOGIN_REQUIRED');
  const token=await state.user.getIdToken();
  const response=await fetch(API+'/api/dog/forge/'+route,{
   method,cache:'no-store',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:data?JSON.stringify(data):undefined
  });
  const payload=await response.json().catch(()=>({error:'DOG_FORGE_UNAVAILABLE'}));
  if(!response.ok||payload.ok!==true)throw Error(payload.error||'DOG_FORGE_UNAVAILABLE');
  if(auth()?.user?.uid!==account)throw Error('ACCOUNT_CHANGED');
  return payload;
 }
 const levelFor=id=>view?.hero?.levels?.[id]??(id==='weapon'||id==='armor'?1:0);
 const quoteFor=id=>view?.quotes?.find(q=>q.itemId===id);
 const canUpgradeItem=id=>{const q=quoteFor(id);return !!q&&!q.maxed&&q.affordable;};
 const have=id=>view?.inventory?.resources?.[id]||0;
 const itemFor=id=>view?.items?.find(x=>x.id===id);
 const usable=()=>!!uid&&!!view&&!busy&&!pending(uid);
 function header(){
  const state=auth();
  $('forge-player').textContent=state?.profile?.name||state?.user?.displayName||'Nicht angemeldet';
  const invested=view?view.items.reduce((sum,i)=>sum+Math.max(0,levelFor(i.id)-(i.baseLevel||0)),0):0;
  $('forge-player-note').textContent=view?'Bereit für deine nächste Verbesserung':'Persönliches Heldenprofil';
  $('forge-rank').textContent='✦ '+rankFor(invested);
  const avatar=$('hero-emblem-art'),armorStage=stageFor(levelFor('armor'));
  if(avatar.dataset.stage!==String(armorStage)){
   avatar.dataset.stage=String(armorStage);
   avatar.src='./dog-forge-art/armor-'+armorStage+'.svg';
  }
  $('hero-emblem').className='character-emblem gear-stage-'+armorStage;
  for(const id of ['weapon','armor']){
   const value=levelFor(id);
   const el=$(id==='weapon'?'forge-weapon-level':'forge-armor-level');
   el.replaceChildren(document.createTextNode(String(value)));
   const small=node('small',null,'/20');el.append(small);
  }
  for(const group of ['attack','defense']){
   const total=view?.items?.filter(x=>x.group===group).reduce((sum,x)=>sum+levelFor(x.id),0)||0;
   $('forge-'+(group==='attack'?'attack':'defense')+'-total').textContent=money(total);
  }
 }
 function milestoneValue(def,hero){
  if(def.key==='weapon'||def.key==='armor')return Number(hero?.levels?.[def.key]||1);
  if(def.key==='maxSkill'){
   const skills=(view?.items||[]).filter(x=>x.group!=='equipment');
   return Math.max(0,...skills.map(x=>Number(hero?.levels?.[x.id]||0)));
  }
  return Number(hero?.[def.key]||0);
 }
 function renderChronicle(){
  const hero=view?.hero;
  const stats=$('forge-chronicle-stats');stats.replaceChildren();
  const attempts=Number(hero?.crafts||0),success=Number(hero?.successes||0);
  const fail=Number(hero?.failures||0),trade=Number(hero?.exchanges||0);
  const rate=attempts?Math.round(success/attempts*100):0;
  for(const [name,value] of [
   ['Versuche',attempts],['Erfolge',success],['Fehlschläge',fail],
   ['Tauschvorgänge',trade],['Erfolgsquote',attempts?rate+' %':'–']
  ]){
   const tile=node('div','chronicle-stat');
   tile.append(node('small',null,name),node('strong',null,typeof value==='number'?money(value):value));
   stats.append(tile);
  }
  const achievements=$('forge-achievements');achievements.replaceChildren();
  let completed=0;
  for(const milestone of MILESTONES){
   const value=hero?milestoneValue(milestone,hero):0;
   const unlocked=!!hero&&value>=milestone.goal;
   if(unlocked)completed++;
   const tile=node('div','milestone'+(unlocked?' unlocked':' locked'));
   tile.append(node('span','milestone-icon',milestone.icon));
   const main=node('span','milestone-main');
   main.append(node('strong',null,milestone.title));
   main.append(node('small',null,unlocked?'✓ Freigeschaltet':
    money(Math.min(value,milestone.goal))+' / '+money(milestone.goal)));
   const bar=node('span','milestone-progress'),fill=node('span');
   fill.style.width=Math.min(100,value/milestone.goal*100)+'%';
   bar.append(fill);main.append(bar);
   tile.append(main);achievements.append(tile);
  }
  $('forge-achievements-count').textContent=completed+' / '+MILESTONES.length;
  const journal=$('forge-journal');journal.replaceChildren();
  const entries=Array.isArray(hero?.recent)?hero.recent:[];
  if(!entries.length){
   journal.append(node('p','journal-empty',hero?
    'Noch keine neuen Einträge. Frühere Versuche werden nicht rückwirkend angezeigt.':
    'Nach dem Anmelden erscheinen hier deine letzten Vorgänge.'));
   return;
  }
  for(const entry of entries.slice(0,10)){
   const isUpgrade=entry.type==='upgrade';
   const def=isUpgrade?itemFor(entry.itemId):null;
   const success=entry.success===true;
   const row=node('div','journal-entry '+(isUpgrade?(success?'journal-success':'journal-failure'):'journal-trade'));
   const icon=node('span','journal-icon',isUpgrade?(success?'✨':'🌑'):'💎');
   const details=node('span','journal-content');
   const title=isUpgrade?(def?.name||'Verbesserung'):(material[entry.from]?.name||'Rohstoff')+' → '+(material[entry.to]?.name||'Rohstoff');
   const result=isUpgrade?(success?'✓ Stufe '+entry.level:'Fehlschlag · Stufe '+entry.level):'10 : 1 getauscht';
   details.append(node('strong',null,title),node('small',null,result));
   const at=Number(entry.at||0);
   const date=at?new Date(at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'–';
   row.append(icon,details,node('span','journal-date',date));journal.append(row);
  }
 }
 function renderStock(){
  const container=$('forge-stock-groups');container.replaceChildren();
  for(const group of MATERIALS){
   const section=node('section','stock-group');
   section.append(node('h3',null,group.label));
   for(const [id,icon,name] of group.values){
    const data=material[id],row=node('div','stock-row rarity-'+data.index);
    row.append(node('span',null,icon),node('span',null,name),node('strong','stock-num',view?money(have(id)):'–'));
    section.append(row);
   }
   container.append(section);
  }
 }
 function renderList(){
  const container=$('forge-item-list');container.replaceChildren();
  const set=view?.items||[];
  if(tab==='exchange'){
   for(const group of MATERIALS){
    const button=node('button','item-choice'+(tradeGroup===group.group?' selected':''));
    button.type='button';button.disabled=!view;
    button.append(node('span','item-icon',group.label.split(' ')[0]));
    const info=node('span','item-info');
    info.append(node('strong',null,group.label.split(' ').slice(1).join(' ')));
    info.append(node('small',null,'5 Rohstoffarten'));
    button.append(info);
    button.addEventListener('click',()=>{tradeGroup=group.group;render();});
    container.append(button);
   }
   return;
  }
  const all=set.filter(x=>x.group===tab);
  const items=readyOnly?all.filter(x=>canUpgradeItem(x.id)):
   [...all].sort((a,b)=>Number(canUpgradeItem(b.id))-Number(canUpgradeItem(a.id)));
  if(!items.length){
   const textValue=!view?'Schmiedewerte werden geladen …':
    readyOnly?'Hier ist gerade keine Verbesserung möglich. Sammle Rohstoffe oder zeige alle an.':
    'Keine Verbesserungen vorhanden.';
   container.append(node('p','list-placeholder',textValue));
   if(view&&readyOnly){
    const show=node('button','show-all-forge','Alle anzeigen');
    show.type='button';show.addEventListener('click',()=>{readyOnly=false;render();});
    container.append(show);
   }
   return;
  }
  for(const item of items){
   const button=node('button','item-choice'+(selected===item.id?' selected':''));
   button.type='button';button.setAttribute('aria-pressed',String(selected===item.id));
   const isEquipment=item.group==='equipment';
   button.classList.toggle('gear-entry',isEquipment);
   button.classList.toggle('skill-entry',!isEquipment);
   if(isEquipment)button.dataset.stage=String(stageFor(levelFor(item.id)));
   else{
    const theme=SKILL_ART[item.id];
    button.style.setProperty('--skill-accent',theme?.accent||'#d8b778');
    button.style.setProperty('--skill-glow',theme?.glow||'#d8b77840');
   }
   const icon=isEquipment?gearVisual(item.id,levelFor(item.id),true):skillVisual(item,true);
   const info=node('span','item-info');
   info.append(node('strong',null,item.name),node('small',null,'Stufe '+levelFor(item.id)+' / '+item.maxLevel));
   const q=quoteFor(item.id);
   if(q){
    const stateText=q.maxed?'✦ Maximal':q.affordable?'✓ Bereit':'Rohstoffe fehlen';
    info.append(node('span','item-ready-tag '+(q.maxed?'maxed-tag':q.affordable?'ready-tag':'missing-tag'),stateText));
   }
   const track=node('div','item-bar'),fill=node('span');
   fill.style.width=Math.min(100,Math.round(levelFor(item.id)/item.maxLevel*100))+'%';
   track.append(fill);info.append(track);button.append(icon,info);
   button.addEventListener('click',()=>{selected=item.id;render();});
   container.append(button);
  }
 }
 function costTile(id,amount){
  const info=material[id]||{icon:'💎',name:id,index:0};
  const stock=have(id),enough=stock>=amount;
  const tile=node('div','cost-item rarity-'+info.index+(enough?' enough':''));
  tile.append(node('span','cost-icon',info.icon));
  const details=node('span','cost-info');
  details.append(node('strong',null,info.name));
  details.append(node('small',null,money(stock)+' / '+money(amount)+
   (enough?' ✓':' · fehlt '+money(amount-stock))));
  const progress=node('span','cost-progress'+(enough?' complete':''));
  progress.setAttribute('role','progressbar');
  progress.setAttribute('aria-label',info.name+' vorhanden');
  progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',String(amount));
  progress.setAttribute('aria-valuenow',String(Math.min(stock,amount)));
  const fill=node('span','cost-progress-fill');
  fill.style.width=Math.min(100,Math.round(stock/amount*100))+'%';
  progress.append(fill);details.append(progress);
  tile.append(details);return tile;
 }
 function openUpgradeConfirm(item,quote){
  if(!usable()||!quote||quote.maxed||!quote.affordable)return;
  const dialog=$('forge-confirm');
  confirmData={itemId:item.id,expectedLevel:quote.level};
  const art=$('forge-confirm-art');art.replaceChildren();
  art.append(item.group==='equipment'?gearVisual(item.id,quote.level,true):skillVisual(item,true));
  $('forge-confirm-title').textContent=item.name;
  $('forge-confirm-step').textContent='Stufe '+quote.level+'  ➜  '+quote.nextLevel;
  const costRoot=$('forge-confirm-cost');costRoot.replaceChildren();
  for(const [id,amount] of Object.entries(quote.cost))costRoot.append(costTile(id,amount));
  $('forge-confirm-chance').textContent=quote.successChance+' %';
  const risky=quote.successChance<100;
  const warning=$('forge-confirm-warning');
  warning.classList.toggle('risky',risky);
  warning.textContent=risky?
   '⚠️ Fehlschlag: Rohstoffe weg, Stufe bleibt erhalten.':
   '✓ Die Rohstoffe werden nach dem Bestätigen verbraucht.';
  $('forge-confirm-submit').textContent=item.group==='equipment'?'⚒️ Jetzt schmieden':'✦ Jetzt verbessern';
  if(!dialog.open)dialog.showModal();
 }
 function closeConfirm(){
  const dialog=$('forge-confirm');
  if(dialog.open)dialog.close();
  confirmData=null;
 }
 function renderUpgrade(){
  const root=$('upgrade-content');root.replaceChildren();
  const item=itemFor(selected)||{id:selected,name:'Waffe',icon:'⚔️',summary:'Wähle eine Verbesserung aus.',maxLevel:20};
  const quote=quoteFor(selected),level=levelFor(selected);
  const head=node('div','upgrade-top');
  head.append(node('span','eyebrow','VERBESSERUNG'),node('span','forge-tag',tabLabels[tab]||'⚒️ SCHMIEDE'));
  root.append(head);
  const panel=root.closest('.upgrade-panel');
  if(item.group==='equipment'){
   panel?.style.removeProperty('--skill-accent');
   panel?.style.removeProperty('--skill-glow');
   const scene=node('div','gear-display gear-scene-'+stageFor(level));
   scene.append(gearVisual(item.id,level));root.append(scene);
  }else{
   const theme=SKILL_ART[item.id];
   if(panel){
    panel.style.setProperty('--skill-accent',theme?.accent||'#d8b778');
    panel.style.setProperty('--skill-glow',theme?.glow||'#d8b77840');
   }
   const scene=node('div','skill-display');
   scene.append(skillVisual(item));
   const groupLabel=node('span','skill-group-label',
     item.group==='attack'?'⚔️ ANGRIFFSFÄHIGKEIT':'🛡️ VERTEIDIGUNGSFÄHIGKEIT');
   scene.append(groupLabel);root.append(scene);
  }
  root.append(node('h2',null,item.name),node('p','upgrade-summary',item.summary));
  const line=node('div','level-line'),left=node('span','left','AUSBAUSTUFE'),right=node('strong','value',String(level));
  right.append(node('span',null,' / '+item.maxLevel));line.append(left,right);root.append(line);
  const track=node('div','level-progress'),fill=node('span');
  fill.style.width=(Math.min(1,level/item.maxLevel)*100)+'%';
  track.append(fill);root.append(track);
  root.append(node('div','level-next',quote?.maxed?'✦ Maximalstufe erreicht':'Nächste Stufe: '+(quote?.nextLevel??'–')));
  if(item.group==='equipment'){
   const stage=stageFor(level);
   const teaser=node('div','evolution-teaser'+(stage===5?' evolution-final':''));
   if(stage<5){
    const nextLevel=STAGES[stage-1].limit+1;
    const next=STAGES[stage];
    teaser.append(gearVisual(item.id,nextLevel,true));
    const details=node('div','evolution-description');
    details.append(node('small',null,'NÄCHSTE AUSSEHENSSTUFE'),
     node('strong',null,next[item.id]),
     node('span',null,'Ab Stufe '+nextLevel+' · Vorschau'));
    teaser.append(details);
    teaser.append(node('span','evolution-lock','🔒'));
   }else{
    teaser.append(node('span','evolution-crown','👑'));
    const details=node('div','evolution-description');
    details.append(node('small',null,'LEGENDÄR'),
     node('strong',null,'Endgültige Ausrüstungsoptik freigeschaltet'));
    teaser.append(details);
   }
   root.append(teaser);
  }
  root.append(node('div','upgrade-rule'));
  if(!quote){root.append(node('p','upgrade-summary','Dein Held wird geladen …'));return;}
  if(quote.maxed){
   root.append(node('div','maxed','🏆 Meisterstufe erreicht'));
   return;
  }
  const costHead=node('div','cost-heading');
  costHead.append(node('h3',null,'Benötigte Rohstoffe'),node('span',null,'Stufe '+quote.nextLevel));
  const grid=node('div','cost-list');
  for(const [id,amount] of Object.entries(quote.cost||{}))grid.append(costTile(id,amount));
  root.append(costHead,grid);
  const missing=Object.entries(quote.cost||{})
   .filter(([id,amount])=>have(id)<amount)
   .map(([id,amount])=>({id,needed:amount-have(id)}));
  const hint=node('div','material-hint '+(missing.length?'missing':'ready'));
  hint.textContent=missing.length?
   '🎯 Noch '+missing.map(m=>money(m.needed)+' × '+(material[m.id]?.name||m.id)).join(' · '):
   '✓ Alle Rohstoffe vorhanden';
  root.append(hint);
  // A short visual preview; boss combat coefficients remain adjustable.
  const preview=node('div','upgrade-preview');
  const current=node('div','preview-value');
  current.append(node('small',null,'JETZT'),node('strong',null,'Stufe '+level));
  const arrow=node('span','preview-arrow','➜');
  const future=node('div','preview-value next');
  future.append(node('small',null,'DANACH'),node('strong',null,'Stufe '+quote.nextLevel));
  preview.append(current,arrow,future);
  if(['attack_power','vitality','resilience'].includes(item.id)){
   preview.append(node('span','preview-bonus','+1 % Grundwert je Stufe · vorläufig'));
  }
  root.append(preview);
  const rate=node('div','forge-ready'),label=node('span',null,'Erfolgschance');
  const chance=node('b',null,quote.successChance+' %');
  if(!quote.affordable){label.textContent='Rohstoffe fehlen';label.className='not-ready';}
  rate.append(label,chance);root.append(rate);
  const button=node('button','forge-action','⚒️ '+(item.group==='equipment'?'Schmieden':'Verbessern')+' · Stufe '+quote.nextLevel);
  button.type='button';button.disabled=!usable()||!quote.affordable;
  button.addEventListener('click',()=>openUpgradeConfirm(item,quote));
  root.append(button);
  root.append(node('p','upgrade-foot',item.group==='equipment'?'Fehlschlag: Rohstoffe verbraucht, Stufe bleibt.':'Fähigkeitsstufen gelingen garantiert.'));
 }
 function renderExchange(){
  const root=$('upgrade-content');root.replaceChildren();
  const head=node('div','upgrade-top');head.append(node('span','eyebrow','ALCHEMISTENWERKSTATT'),node('span','forge-tag','10 : 1'));
  root.append(head,node('div','upgrade-symbol','💎'));
  const h=node('h2',null,'Rohstofftausch'),desc=node('p','upgrade-summary','10 gleiche Rohstoffe → 1 höherwertiger');
  root.append(h,desc);
  const tabs=node('div','exchange-groups');
  for(const group of MATERIALS){
   const button=node('button',tradeGroup===group.group?'active':'',group.label);
   button.type='button';button.disabled=!view;
   button.addEventListener('click',()=>{tradeGroup=group.group;render();});
   tabs.append(button);
  }
  root.append(tabs);
  const selectedGroup=MATERIALS.find(g=>g.group===tradeGroup)||MATERIALS[2];
  const list=node('div','exchange-list');
  for(let i=0;i<4;i++){
   const from=selectedGroup.values[i],to=selectedGroup.values[i+1],amount=have(from[0]);
   const row=node('div','exchange-row');
   row.append(node('span','exchange-icon',from[1]));
   const left=node('span','exchange-mat',from[2]);
   left.append(node('small',null,'Vorrat: '+money(amount)));
   row.append(left,node('span','exchange-arrow','→'));
   const target=node('span','exchange-target',to[1]+' '+to[2]);
   row.append(target);
   const button=node('button',null,'10 : 1');
   button.type='button';button.disabled=!usable()||amount<10;
   button.title='10 × '+from[2]+' gegen 1 × '+to[2];
   button.addEventListener('click',()=>void action('exchange',{resourceId:from[0]}));
   row.append(button);list.append(row);
  }
  root.append(list);
  root.append(node('p','upgrade-foot','Nur innerhalb derselben Kategorie.'));
 }
 function render(){
  const all=view?.items?.filter(x=>x.group===tab)||[];
  if(tab!=='exchange'&&all.length){
   const available=all.filter(x=>canUpgradeItem(x.id));
   if(readyOnly&&available.length&&!available.some(x=>x.id===selected))selected=available[0].id;
   else if(!all.some(x=>x.id===selected))selected=(readyOnly&&available.length?available[0]:all[0]).id;
  }
  const toolbar=$('forge-list-toolbar');toolbar.hidden=tab==='exchange';
  const readyCount=all.filter(x=>canUpgradeItem(x.id)).length;
  $('forge-ready-count').textContent=String(readyCount);
  const filter=$('forge-ready-filter');filter.disabled=!view||busy;
  filter.setAttribute('aria-pressed',String(readyOnly));
  filter.classList.toggle('active',readyOnly);
  $('forge-list-summary').textContent=view?
   readyCount+' von '+all.length+' bereit':'Verbesserungen laden …';
  for(const button of document.querySelectorAll('.forge-tab')){
   const isActive=button.dataset.tab===tab;
   button.classList.toggle('active',isActive);
   button.setAttribute('aria-selected',String(isActive));
  }
  $('forge-retry-wrap').hidden=!pending(uid);
  $('forge-retry').disabled=!uid||busy;
  $('forge-refresh').disabled=busy;
  header();renderList();tab==='exchange'?renderExchange():renderUpgrade();renderChronicle();renderStock();
 }
 const closeModal=()=>{const dialog=$('forge-result');if(dialog.open)dialog.close();};
 function resultDialog(result){
  const dialog=$('forge-result'),art=$('forge-result-art');
  art.replaceChildren();
  let kind='exchange',emoji='💎',heading='Tausch gelungen',subtitle='Materialien sicher umgebucht.',achievement='';
  if(result.type==='upgrade'){
   const item=itemFor(result.itemId),equip=item?.group==='equipment',success=!!result.success;
   kind=success?(equip?'equipment-success':'skill-success'):'failure';
   if(equip)art.append(gearVisual(result.itemId,result.newLevel));
   else art.append(skillVisual(item));
   const before=stageFor(result.oldLevel),after=stageFor(result.newLevel);
   emoji=success?'✦':'✕';
   heading=success?(equip?'Erfolgreich geschmiedet!':'Fähigkeit verbessert!'):'Schmieden fehlgeschlagen';
   subtitle=success?(item?.name||'Verbesserung')+' · Stufe '+result.newLevel:
    'Rohstoffe verbraucht · Stufe '+result.newLevel+' bleibt';
   achievement=success?(before!==after&&equip?'✦ NEUE AUSSEHENSSTUFE ✦':'STUFE '+result.oldLevel+'  ➜  '+result.newLevel):
    'STUFE '+result.oldLevel+' BLEIBT';
  }else if(result.type==='exchange'){
   const from=material[result.from],to=material[result.to];
   art.append(node('span','skill-result-emblem','💎'));
   subtitle='10 × '+(from?.name||result.from)+' → 1 × '+(to?.name||result.to);
   achievement='ROHSTOFFTAUSCH';
  }
  dialog.className='forge-result result-'+kind;
  const resultTheme=result?.type==='upgrade'?SKILL_ART[result.itemId]:null;
  if(resultTheme){
   dialog.style.setProperty('--skill-accent',resultTheme.accent);
   dialog.style.setProperty('--skill-glow',resultTheme.glow);
  }else{
   dialog.style.removeProperty('--skill-accent');
   dialog.style.removeProperty('--skill-glow');
  }
  $('forge-result-icon').textContent=emoji;
  $('forge-result-heading').textContent=heading;
  $('forge-result-text').textContent=subtitle;
  $('forge-result-achievement').textContent=achievement;
  if(!dialog.open)dialog.showModal();
 }
 async function reload(){
  const state=auth(),requestIndex=++loadSerial;
  if(!state){
   uid=null;view=null;closeConfirm();closeModal();
   status('Bitte melde dich mit deinem Online-Profil an, um die Schmiede zu nutzen.','bad');
   $('forge-player').textContent='Nicht angemeldet';render();return;
  }
  const account=state.user.uid;
  if(uid!==account){uid=account;view=null;closeConfirm();closeModal();}
  status('⚒️ Heldenwerte werden geladen …');
  render();
  try{
   const payload=await request('GET','me',null,account);
   if(uid!==account||requestIndex!==loadSerial)return;
   view=payload;
   status(pending(account)?'⚠️ Noch nicht bestätigte Aktion – bitte sicher wiederholen.':
    '✦ Bereit. Wähle eine Verbesserung oder tausche Rohstoffe.',
    pending(account)?'bad':'good');
  }catch(e){
   if(uid!==account||requestIndex!==loadSerial)return;
   view=null;
   status('⚠️ Schmiede konnte nicht geladen werden. Prüfe die Serververbindung und aktualisiere.','bad');
  }
  render();
 }
 async function action(type,data,retry=false){
  if(busy||!uid||!view)return;
  const account=uid;
  const old=pending(account);
  if(old&&!retry){status('Bitte zuerst die offene Aktion sicher wiederholen.','bad');return;}
  if(retry&&!old)return;
  const op=old||{id:newId(),action:type,payload:data};
  if(!old)savePending(account,op);
  busy=true;++loadSerial;render();
  $('forge-workspace').classList.add('forging');
  status('⚒️ Die Schmiede verarbeitet deinen Auftrag …');
  // The ceremony never starts a request or changes hero state.
  // Safe replays skip the theatrical forging: they only recover a receipt.
  let ceremonyStarted=false;
  if(!retry&&op.action==='upgrade'){
   const item=itemFor(op.payload.itemId);
   try{
    if(item&&window.DogForgeCeremony){
     window.DogForgeCeremony.start({item,level:levelFor(item.id)});
     ceremonyStarted=true;
    }
   }catch{/* Presentation must never block an authorized request. */}
  }
  try{
   const response=await request('POST',op.action,{requestId:op.id,...op.payload},account);
   if(uid!==account)return;
   clearPending(account);view=response;
   status(response.replayed?'✓ Auftrag sicher wiederhergestellt.':'✓ Auftrag serverseitig gespeichert.','good');
   // Wait only for an optional local visual flourish, never for server authority.
   if(ceremonyStarted&&!response.replayed){
    try{await window.DogForgeCeremony?.finish?.(response.result);}catch{}
   }
   if(uid!==account)return;
   resultDialog(response.result);
  }catch(e){
   try{window.DogForgeCeremony?.abort?.();}catch{}
   if(uid!==account)return;
   const error=e.message;
   if(['STALE_FORGE_LEVEL','DOG_MATERIALS_MISSING','FORGE_MAX_LEVEL','INVALID_FORGE_ITEM',
    'INVALID_EXCHANGE_RESOURCE','INVALID_FORGE_REQUEST'].includes(error)){
    clearPending(account);
    // Only definitive server rejections are safe to discard; ambiguous network
    // responses keep their request ID and require explicit replay.
    await reload();
    if(uid===account&&view)status(error==='DOG_MATERIALS_MISSING'?
     '⚠️ Rohstoffe reichen nicht mehr. Bestand wurde aktualisiert.':
     '↻ Heldenstufen und Rohstoffe wurden neu geladen.','bad');
   }else{
    status('⚠️ Ergebnis unklar. Bitte „Sicher wiederholen“ wählen – kein doppelter Verbrauch.','bad');
   }
  }finally{
   try{window.DogForgeCeremony?.abort?.();}catch{}
   busy=false;$('forge-workspace').classList.remove('forging');render();
  }
 }
 for(const button of document.querySelectorAll('.forge-tab')){
  button.addEventListener('click',()=>{
   tab=button.dataset.tab;
   if(tab!=='exchange'&&!(view?.items||[]).some(i=>i.group===tab&&i.id===selected))
    selected=(view?.items||[]).find(i=>i.group===tab)?.id||({equipment:'weapon',attack:'destruction',defense:'regeneration'})[tab];
   render();
  });
 }
 $('forge-ready-filter').addEventListener('click',()=>{
  if(!view||busy)return;
  readyOnly=!readyOnly;render();
 });
 $('forge-confirm-x').addEventListener('click',closeConfirm);
 $('forge-confirm-cancel').addEventListener('click',closeConfirm);
 $('forge-confirm').addEventListener('close',()=>{confirmData=null;});
 $('forge-confirm-submit').addEventListener('click',()=>{
  const requested=confirmData;
  if(!requested||!usable())return;
  const current=quoteFor(requested.itemId);
  if(!current||current.level!==requested.expectedLevel||current.maxed||!current.affordable){
   closeConfirm();status('↻ Daten geändert. Bitte erneut auswählen.','bad');void reload();return;
  }
  closeConfirm();
  void action('upgrade',requested);
 });
 $('forge-refresh').addEventListener('click',()=>void reload());
 $('forge-retry').addEventListener('click',()=>{
  const op=pending(uid);
  if(op)void action(op.action,op.payload,true);
 });
 $('forge-result-x').addEventListener('click',closeModal);
 $('forge-result-ok').addEventListener('click',closeModal);
 window.addEventListener('spielonline-change',()=>{if(!busy)void reload();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)void reload();});
 render();void reload();
})();
