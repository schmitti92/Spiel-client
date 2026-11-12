/* DOG forge UI: compact, data driven, user-scoped, server-authoritative. */
(()=>{'use strict';
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const $=id=>document.getElementById(id);
 const room=new URLSearchParams(location.search).get('room')||'';
 if(/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room)){
  const back='./dog-expedition.html?room='+encodeURIComponent(room);
  $('forge-back').href=back;$('forge-materials').href=back;
  if($('forge-boss'))$('forge-boss').href='./dog-boss.html?room='+encodeURIComponent(room);
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
 const merchantMode=document.body?.dataset.dogArea==='merchant';
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
  {limit:10,title:'Geschmiedet',weapon:'Schmiedeklinge',armor:'Lederpanzer'},
  {limit:20,title:'Verstärkt',weapon:'Stahlklinge',armor:'Stahlpanzer'},
  {limit:30,title:'Runenwerk',weapon:'Runenklinge',armor:'Runenrüstung'},
  {limit:40,title:'Arkan',weapon:'Astralklinge',armor:'Astralrüstung'},
  {limit:50,title:'Legendär',weapon:'Drachenklinge',armor:'Drachenrüstung'}
 ]);
 const stageFor=level=>Math.max(1,STAGES.findIndex(s=>level<=s.limit)+1||5);
 const heroClass=()=>view?.heroClass||null;
 const gearName=(id,level)=>window.DogHeroEquipment?.name(heroClass(),id,level)||
  STAGES[stageFor(level)-1][id];
 const displayName=item=>item?.group==='equipment'?gearName(item.id,levelFor(item.id)):item?.name||'Verbesserung';
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
 let uid=null,view=null,busy=false,tab=merchantMode?'exchange':'equipment',selected='weapon',tradeGroup='equipment',loadSerial=0,readyOnly=false,confirmData=null,exchangeConfirmData=null,goalId=null,sessionEpoch=0,lastLoadedAt=0,loadingUid=null,loadingPromise=null;
 let chronicleView=undefined,chronicleUid=undefined,stockView=undefined,stockUid=undefined;
 const sectionExpanded={equipment:true,attack:false,defense:false};
 const goalKey=account=>'dog:forge:goal:'+account;
 const loadGoal=account=>{
  try{const id=localStorage.getItem(goalKey(account));
   return id&&/^[a-z_]{2,35}$/.test(id)?id:null;
  }catch{return null;}
 };
 function setGoal(id){
  if(!uid||!view||busy)return;
  goalId=itemFor(id)?(goalId===id?null:id):null;
  try{if(goalId)localStorage.setItem(goalKey(uid),goalId);
   else localStorage.removeItem(goalKey(uid));}catch{}
  render();
 }
 function exchangeHints(quote){
  const suggestions=[];
  for(const [id,cost] of Object.entries(quote?.cost||{})){
   const missing=Math.max(0,cost-have(id));
   if(!missing)continue;
   const group=MATERIALS.find(g=>g.values.some(entry=>entry[0]===id));
   const idx=group?.values.findIndex(entry=>entry[0]===id)??-1;
   if(idx<1)continue;
   const source=group.values[idx-1][0],reserve=quote.cost[source]||0;
   const spare=Math.max(0,have(source)-reserve);
   const possible=Math.min(100,Math.floor(spare/10),1000000-have(id));
   if(possible>0)suggestions.push({id,source,missing,possible,group:group.group});
  }
  return suggestions;
 }
 function renderGoal(){
  const box=$('forge-goal-banner'),item=itemFor(goalId);
  if(!uid||!item||!view){box.hidden=true;return;}
  box.hidden=false;
  const level=levelFor(item.id),quote=quoteFor(item.id);
  const icon=$('forge-goal-visual');icon.replaceChildren();
  icon.append(item.group==='equipment'?gearVisual(item.id,level,true):skillVisual(item,true));
  $('forge-goal-title').textContent=displayName(item)+' · Stufe '+level+' / '+item.maxLevel;
  let percent=0;
  if(quote?.maxed){
   percent=100;
   $('forge-goal-desc').textContent='🏆 Maximale Stufe erreicht – neues Ziel auswählen.';
  }else if(quote){
   const cost=Object.entries(quote.cost||{});
   const needed=cost.reduce((n,[,v])=>n+v,0);
   const owned=cost.reduce((n,[id,v])=>n+Math.min(v,have(id)),0);
   percent=needed?Math.round(100*owned/needed):0;
   const missing=cost.filter(([id,v])=>have(id)<v)
    .map(([id,v])=>money(v-have(id))+' × '+(material[id]?.name||id));
   $('forge-goal-desc').textContent=missing.length?'Fehlt noch: '+missing.join(' · '):
    '✓ Alle Rohstoffe für die nächste Verbesserung vorhanden!';
  }else $('forge-goal-desc').textContent='Verbesserung wird geladen …';
  $('forge-goal-progress').style.width=percent+'%';
  $('forge-goal-open').disabled=busy;
  $('forge-goal-clear').disabled=busy;
 }

 // One graphic asset for each equipment appearance tier (independent of balance).
 function gearVisual(id,level,compact=false){
  const stage=stageFor(level);
  const root=node('span','gear-visual gear-stage-'+stage+(compact?' compact':''));
  const img=node('img','gear-illustration');
  img.src=window.DogHeroEquipment?.image(heroClass(),id,level)||
   './dog-forge-art/'+id+'-'+stage+'.svg';
  img.alt=gearName(id,level)+' · Stufe '+level;
  img.loading=compact?'lazy':'eager';img.decoding='async';
  img.addEventListener('error',()=>{
   const fallback=window.DogHeroEquipment?.fallbackImage(heroClass(),id,level);
   if(img.dataset.fallbackAttempted!=='yes'&&fallback&&img.getAttribute('src')!==fallback){
    img.dataset.fallbackAttempted='yes';img.src=fallback;return;
   }
   img.hidden=true;root.append(node('span','gear-fallback',id==='weapon'?'⚔️':'🛡️'));
  });
  root.append(img);
  if(!compact)root.append(node('span','gear-stage-label',gearName(id,level)+' · Stufe '+level));
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
 // Fail closed: an unsafe unrecorded POST could spend resources without a
 // replayable request ID if localStorage is disabled or full.
 const savePending=(account,data)=>{
  try{
   const serialized=JSON.stringify(data),key=pendingKey(account);
   localStorage.setItem(key,serialized);
   return localStorage.getItem(key)===serialized;
  }catch{return false;}
 };
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
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),20000):null;
  try{
   const response=await fetch(API+'/api/dog/forge/'+route,{
    method,cache:'no-store',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:data?JSON.stringify(data):undefined,
    ...(controller?{signal:controller.signal}:{})
   });
   const payload=await response.json().catch(()=>({error:'DOG_FORGE_UNAVAILABLE'}));
   if(!response.ok||payload.ok!==true)throw Error(payload.error||'DOG_FORGE_UNAVAILABLE');
   if(auth()?.user?.uid!==account)throw Error('ACCOUNT_CHANGED');
   return payload;
  }catch(error){
   if(controller?.signal.aborted)throw Error('FORGE_REQUEST_TIMEOUT');
   throw error;
  }finally{if(timer!==null)clearTimeout(timer);}
 }
 const levelFor=id=>view?.hero?.levels?.[id]??(id==='weapon'||id==='armor'?1:0);
 const quoteFor=id=>view?.quotes?.find(q=>q.itemId===id);
 const canUpgradeItem=id=>{const q=quoteFor(id);return !!q&&!q.maxed&&q.affordable;};
 const have=id=>view?.inventory?.resources?.[id]||0;
 const itemFor=id=>view?.items?.find(x=>x.id===id);
 const usable=()=>!!uid&&auth()?.user?.uid===uid&&!!view&&!busy&&!pending(uid);
 function header(){
  const state=auth();
  $('forge-player').textContent=state?.profile?.name||state?.user?.displayName||'Nicht angemeldet';
  const invested=view?view.items.reduce((sum,i)=>sum+Math.max(0,levelFor(i.id)-(i.baseLevel||0)),0):0;
  $('forge-player-note').textContent=view?(merchantMode?'Dein Rohstoffhandel ist bereit':'Bereit für deine nächste Verbesserung'):'Persönliches Heldenprofil';
  const classLabel=$('forge-class-badge');
  if(classLabel)classLabel.textContent=window.DogHeroEquipment?.label(heroClass())||'Held noch nicht gewählt';
  document.body.dataset.heroClass=window.DogHeroEquipment?.normalize(heroClass())||'';
  const cap=$('forge-gate-cap');
  if(cap){
   cap.hidden=!view||!Number.isSafeInteger(view.forgeLevel);
   if(!cap.hidden)cap.textContent='⚒️ Gemeinsame Schmiedestufe '+
    view.forgeLevel+'/10 · Fähigkeiten bis Level '+view.skillsCap+'/50';
  }
  $('forge-rank').textContent='✦ '+rankFor(invested);
  const avatar=$('hero-emblem-art'),armorStage=stageFor(levelFor('armor'));
  const appearance=(heroClass()||'generic')+':'+armorStage;
  if(avatar.dataset.appearance!==appearance){
   avatar.dataset.appearance=appearance;
   avatar.dataset.stage=String(armorStage);
   avatar.dataset.fallbackAttempted='';
   avatar.onerror=()=>{
    const fallback=window.DogHeroEquipment?.fallbackImage(heroClass(),'armor',levelFor('armor'))||
     './dog-forge-art/armor-'+armorStage+'.svg';
    if(avatar.dataset.fallbackAttempted!=='yes'&&avatar.getAttribute('src')!==fallback){
     avatar.dataset.fallbackAttempted='yes';avatar.src=fallback;
    }else avatar.hidden=true;
   };
   avatar.hidden=false;
   avatar.src=window.DogHeroEquipment?.image(heroClass(),'armor',levelFor('armor'))||
    './dog-forge-art/armor-'+armorStage+'.svg';
  }
  $('hero-emblem').className='character-emblem gear-stage-'+armorStage;
  for(const id of ['weapon','armor']){
   const value=levelFor(id);
   const el=$(id==='weapon'?'forge-weapon-level':'forge-armor-level');
   el.replaceChildren(document.createTextNode(String(value)));
   const small=node('small',null,'/50');el.append(small);
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
  if(chronicleView===view&&chronicleUid===uid)return;
  chronicleView=view;chronicleUid=uid;
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
   const title=isUpgrade?displayName(def):(material[entry.from]?.name||'Rohstoff')+' → '+(material[entry.to]?.name||'Rohstoff');
   const result=isUpgrade?(success?'✓ Stufe '+entry.level:'Fehlschlag · Stufe '+entry.level):'10 : 1 getauscht';
   details.append(node('strong',null,title),node('small',null,result));
   const at=Number(entry.at||0);
   const date=at?new Date(at).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}):'–';
   row.append(icon,details,node('span','journal-date',date));journal.append(row);
  }
 }
 function renderGallery(){
  const gallery=window.DogForgeGallery;
  if(!gallery)return;
  const hero=view?.hero||null;
  const invested=hero&&view?.items?
   view.items.reduce((sum,item)=>sum+Math.max(0,(hero.levels?.[item.id]??item.baseLevel)-item.baseLevel),0):0;
  const milestones=hero?MILESTONES.map(m=>{
   const current=milestoneValue(m,hero);
   return {id:m.key+'-'+m.goal,icon:m.icon,title:m.title,goal:m.goal,
    current,unlocked:current>=m.goal};
  }):[];
  gallery.render(hero&&uid?{uid,hero,items:view.items,milestones,
   rank:rankFor(invested),player:$('forge-player').textContent,heroClass:heroClass()}:null);
 }
 function renderStock(){
  if(stockView===view&&stockUid===uid)return;
  stockView=view;stockUid=uid;
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
  const areas=merchantMode?[tab]:['equipment','attack','defense'];
  for(const group of areas){
   let target=container;
   if(!merchantMode){
    const headings={equipment:'⚔️ Waffen & Rüstung',attack:'💥 Angriff',defense:'🛡️ Abwehr'};
    const block=node('section','forge-item-group forge-item-group-'+group);
    const heading=node('div','forge-area-heading');
    heading.append(node('h3',null,headings[group]));
    const toggle=node('button','forge-section-toggle');
    toggle.type='button';
    toggle.setAttribute('aria-controls','forge-area-grid-'+group);
    toggle.setAttribute('aria-expanded',String(sectionExpanded[group]));
    toggle.title=sectionExpanded[group]?'Weniger anzeigen':'Weitere anzeigen';
    toggle.setAttribute('aria-label',headings[group]+' – '+toggle.title);
    const count=set.filter(item=>item.group===group).length;
    toggle.append(node('span','forge-section-count',
     group==='equipment'?count+' Gegenstände':
      (sectionExpanded[group]?count:Math.min(3,count))+' von '+count+' Fähigkeiten'));
    toggle.append(node('span','forge-section-chevron',sectionExpanded[group]?'⌃':'⌄'));
    toggle.addEventListener('click',()=>{sectionExpanded[group]=!sectionExpanded[group];render();});
    heading.append(toggle);
    const grid=node('div','forge-area-grid');
    grid.id='forge-area-grid-'+group;
    if(group==='equipment'&&!sectionExpanded.equipment)grid.hidden=true;
    block.append(heading,grid);container.append(block);target=grid;
   }
   const all=set.filter(x=>x.group===group);
  const items=readyOnly?all.filter(x=>canUpgradeItem(x.id)):
   [...all].sort((a,b)=>Number(canUpgradeItem(b.id))-Number(canUpgradeItem(a.id)));
  if(!items.length){
   const textValue=!view?'Schmiedewerte werden geladen …':
    readyOnly?'Hier ist gerade keine Verbesserung möglich. Sammle Rohstoffe oder zeige alle an.':
    'Keine Verbesserungen vorhanden.';
   target.append(node('p','list-placeholder',textValue));
   if(view&&readyOnly){
    const show=node('button','show-all-forge','Alle anzeigen');
    show.type='button';show.addEventListener('click',()=>{readyOnly=false;render();});
    target.append(show);
   }
   continue;
  }
  const visibleItems=!merchantMode&&group!=='equipment'&&!sectionExpanded[group]?
   items.slice(0,3):(!merchantMode&&group==='equipment'&&!sectionExpanded.equipment?[]:items);
  for(const item of visibleItems){
   const card=node('div','forge-item-quick');
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
   const name=node('strong',null,displayName(item));
   name.title=displayName(item);
   info.append(name,node('small',null,'Stufe '+levelFor(item.id)+' / '+item.maxLevel));
   if(goalId===item.id)info.append(node('small','goal-mark','🎯 Mein Schmiedeziel'));
   const q=quoteFor(item.id);
   if(q){
    const stateText=q.maxed?'✦ Maximal':q.locked?'🔒 Gesperrt':q.affordable?'✓ Bereit':'Rohstoffe fehlen';
    info.append(node('span','item-ready-tag '+(q.maxed?'maxed-tag':q.affordable?'ready-tag':'missing-tag'),stateText));
   }
   const track=node('div','item-bar'),fill=node('span');
   fill.style.width=Math.min(100,Math.round(levelFor(item.id)/item.maxLevel*100))+'%';
   track.append(fill);info.append(track);button.append(icon,info);
   button.addEventListener('click',()=>{tab=item.group;selected=item.id;render();});
   card.append(button);
   // A quick upgrade uses exactly the existing confirmation, quote and receipt flow.
   // Buttons are siblings, never nested; selecting a card still opens its details.
   if(canUpgradeItem(item.id)){
    const plus=node('button','forge-quick-upgrade','+');
    plus.type='button';plus.disabled=!usable();
    plus.setAttribute('aria-label',displayName(item)+' verbessern auf Stufe '+q.nextLevel);
    plus.title=displayName(item)+' verbessern auf Stufe '+q.nextLevel;
    plus.addEventListener('click',event=>{
     event.stopPropagation();
     const current=quoteFor(item.id);
     if(!usable()||!current||current.maxed||current.locked||!current.affordable)return;
     tab=item.group;selected=item.id;render();
     openUpgradeConfirm(item,current);
    });
    card.append(plus);
   }
   target.append(card);
  }
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
  if(!usable()||!quote||quote.maxed||quote.locked||!quote.affordable)return;
  const dialog=$('forge-confirm');
  confirmData={itemId:item.id,expectedLevel:quote.level};
  const art=$('forge-confirm-art');art.replaceChildren();
  art.append(item.group==='equipment'?gearVisual(item.id,quote.level,true):skillVisual(item,true));
  $('forge-confirm-title').textContent=displayName(item);
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
  const item=itemFor(selected)||{id:selected,name:'Waffe',icon:'⚔️',summary:'Wähle eine Verbesserung aus.',maxLevel:50};
  const quote=quoteFor(selected),level=levelFor(selected);
  const head=node('div','upgrade-top');
  head.append(node('span','eyebrow','VERBESSERUNG'),node('span','forge-tag',tabLabels[tab]||'⚒️ SCHMIEDE'));
  root.append(head);
  const goalButton=node('button','forge-goal-pin'+(goalId===item.id?' active':''),
   goalId===item.id?'🎯 Ziel gesetzt · entfernen':'☆ Als Schmiedeziel merken');
  goalButton.type='button';goalButton.disabled=!uid||!view||busy;
  goalButton.setAttribute('aria-pressed',String(goalId===item.id));
  goalButton.addEventListener('click',()=>setGoal(item.id));
  root.append(goalButton);
  const panel=root.closest('.upgrade-panel');
  // SCH-UI-04: graphical change only. Keep existing quote and server confirmation.
  const hero=node('div','forge-upgrade-hero');
  const details=node('div','forge-upgrade-details');
  if(item.group==='equipment'){
   panel?.style.removeProperty('--skill-accent');
   panel?.style.removeProperty('--skill-glow');
   const scene=node('div','gear-display gear-scene-'+stageFor(level));
   scene.append(gearVisual(item.id,level));hero.append(scene);
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
   scene.append(groupLabel);hero.append(scene);
  }
  details.append(node('span','forge-upgrade-kind',
   item.group==='equipment'?(item.id==='armor'?'🛡️ RÜSTUNG':'⚔️ WAFFE'):
    item.group==='attack'?'💥 ANGRIFF':'🛡️ ABWEHR'));
  details.append(node('h2',null,displayName(item)),node('p','upgrade-summary',item.summary));
  const line=node('div','level-line'),left=node('span','left','STUFE'),right=node('strong','value',String(level));
  right.append(node('span',null,' / '+item.maxLevel));line.append(left,right);details.append(line);
  const track=node('div','level-progress'),fill=node('span');
  fill.style.width=(Math.min(1,level/item.maxLevel)*100)+'%';
  track.append(fill);details.append(track);
  details.append(node('div','level-next',
   quote?.maxed?'✦ Maximalstufe erreicht':'Als Nächstes: Stufe '+(quote?.nextLevel??'–')));
  hero.append(details);root.append(hero);
  if(item.group==='equipment'){
   const stage=stageFor(level);
   const teaser=node('div','evolution-teaser'+(stage===5?' evolution-final':''));
   if(stage<5){
    const nextLevel=STAGES[stage-1].limit+1;
    const next=STAGES[stage];
    teaser.append(gearVisual(item.id,nextLevel,true));
    const details=node('div','evolution-description');
    details.append(node('small',null,'NÄCHSTE AUSSEHENSSTUFE'),
     node('strong',null,gearName(item.id,nextLevel)),
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

  const missing=Object.entries(quote.cost||{}).filter(([id,need])=>have(id)<need)
   .map(([id,need])=>({id,needed:need-have(id)}));
  const forgeNeeded=Math.min(10,Math.ceil(quote.nextLevel/5));
  const costHead=node('div','cost-heading forge-cost-heading');
  costHead.append(node('h3',null,'Rohstoffe für Stufe '+quote.nextLevel));
  costHead.append(node('span','forge-cost-badge '+(quote.locked?'blocked':missing.length?'missing':'ready'),
   quote.locked?'🔒 Gesperrt':missing.length?'⚠️ '+missing.length+' fehlen':'✓ Vorhanden'));
  const costGrid=node('div','cost-list forge-compact-cost-list');
  for(const [id,need] of Object.entries(quote.cost||{}))costGrid.append(costTile(id,need));
  root.append(costHead,costGrid);
  if(quote.locked||missing.length){
   const reason=quote.locked?
    '🔒 Schmiedestufe '+forgeNeeded+' nötig. Oben aufsteigen (aktuelle Grenze: Level '+quote.unlockedMaxLevel+').':
    'Es fehlen: '+missing.map(m=>money(m.needed)+' × '+(material[m.id]?.name||m.id)).join(' · ');
   const notice=node('p','forge-cost-notice '+(quote.locked?'locked':'missing'),reason);
   notice.id='forge-action-status';root.append(notice);
  }
  const suggestions=missing.length?exchangeHints(quote):[];
  if(suggestions.length){
   const exchange=node('details','forge-exchange-suggestions');
   exchange.append(node('summary',null,'💎 Tauschmöglichkeiten beim Händler'));
   for(const suggestion of suggestions){
    const count=Math.min(suggestion.missing,suggestion.possible);
    exchange.append(node('div','smart-exchange-row',
     money(count)+' × '+(material[suggestion.id]?.name||suggestion.id)+
     ' aus '+money(count*10)+' × '+(material[suggestion.source]?.name||suggestion.source)));
   }
   root.append(exchange);
  }
  const actionPanel=node('div','forge-action-panel');
  const preview=node('div','upgrade-preview');
  const before=node('div','preview-value'),after=node('div','preview-value next');
  before.append(node('small',null,'JETZT'),node('strong',null,'Stufe '+level));
  after.append(node('small',null,'DANACH'),node('strong',null,'Stufe '+quote.nextLevel));
  preview.append(before,node('span','preview-arrow','➜'),after);
  if(['attack_power','vitality','resilience'].includes(item.id))
   preview.append(node('span','preview-bonus','+1 % Grundwert je Stufe'));
  const chance=node('div','forge-ready');
  chance.append(node('span',null,'Erfolgschance'),node('b',null,quote.successChance+' %'));
  actionPanel.append(preview,chance);
  const text=quote.locked?'🔒 Schmiedestufe '+forgeNeeded+' nötig':
   missing.length?'Rohstoffe fehlen':
   '⚒️ '+(item.group==='equipment'?'Schmieden':'Verbessern')+' · Stufe '+quote.nextLevel;
  const button=node('button','forge-action',text);
  button.type='button';button.disabled=!usable()||!quote.affordable||!!quote.locked;
  if(quote.locked||missing.length)button.setAttribute('aria-describedby','forge-action-status');
  button.addEventListener('click',()=>openUpgradeConfirm(item,quote));
  actionPanel.append(button);
  if(item.group==='equipment'&&quote.successChance<100)
   actionPanel.append(node('p','upgrade-foot','⚠️ Fehlschlag: Rohstoffe verbraucht, Stufe bleibt.'));
  root.append(actionPanel);
 }
 function closeExchangeConfirm(){
  const dialog=$('forge-exchange-confirm');
  if(dialog.open)dialog.close();
  exchangeConfirmData=null;
 }
 function openExchangeConfirm(resourceId,count){
  if(!usable()||!Number.isSafeInteger(count)||count<1||count>100)return;
  const info=material[resourceId],group=MATERIALS.find(g=>g.group===info?.group);
  const idx=group?.values.findIndex(x=>x[0]===resourceId)??-1;
  if(idx<0||idx>=4)return;
  const target=group.values[idx+1];
  if(have(resourceId)<count*10||have(target[0])+count>1000000)return;
  exchangeConfirmData={resourceId,count};
  $('forge-exchange-confirm-title').textContent=count+' × '+target[2]+' erhalten';
  $('forge-exchange-confirm-description').textContent=
   'Du tauschst '+money(count*10)+' × '+info.name+' gegen '+money(count)+' × '+target[2]+'.';
  $('forge-exchange-confirm-preview').textContent=
   'Danach: '+money(have(resourceId)-count*10)+' × '+info.name+
   ' · '+money(have(target[0])+count)+' × '+target[2];
  const dialog=$('forge-exchange-confirm');
  if(!dialog.open)dialog.showModal();
 }
 function renderExchange(){
  const root=$('upgrade-content');root.replaceChildren();
  const head=node('div','upgrade-top');
  head.append(node('span','eyebrow','ALCHEMISTENWERKSTATT'),node('span','forge-tag','10 : 1'));
  root.append(head,node('div','upgrade-symbol','💎'));
  root.append(node('h2',null,'Rohstofftausch'),
   node('p','upgrade-summary','10 gleiche Rohstoffe → 1 höherwertiger · bis zu 100 Tausche pro Auftrag'));
  const tabs=node('div','exchange-groups');
  for(const group of MATERIALS){
   const btn=node('button',tradeGroup===group.group?'active':'',group.label);
   btn.type='button';btn.disabled=!view;
   btn.addEventListener('click',()=>{tradeGroup=group.group;render();});
   tabs.append(btn);
  }
  root.append(tabs);
  const group=MATERIALS.find(g=>g.group===tradeGroup)||MATERIALS[2];
  const list=node('div','exchange-list');
  for(let i=0;i<4;i++){
   const from=group.values[i],to=group.values[i+1],stock=have(from[0]);
   const maxBatch=Math.min(100,Math.floor(stock/10),1000000-have(to[0]));
   const row=node('div','exchange-row multi-exchange-row');
   row.append(node('span','exchange-icon',from[1]));
   const label=node('span','exchange-mat',from[2]);
   label.append(node('small',null,'Vorrat: '+money(stock)));
   row.append(label,node('span','exchange-arrow','→'),
    node('span','exchange-target',to[1]+' '+to[2]));
   const controls=node('div','exchange-controls');
   const select=node('select','exchange-quantity');
   select.setAttribute('aria-label','Anzahl Tausche: '+from[2]);
   const qty=[...new Set([1,5,10,25,maxBatch])]
    .filter(n=>n>=1&&n<=maxBatch).sort((a,b)=>a-b);
   for(const n of qty){
    const opt=node('option',null,n===maxBatch&&n>1?'Maximal: '+n+' ×':n+' ×');
    opt.value=String(n);select.append(opt);
   }
   select.disabled=!usable()||maxBatch<1;
   const preview=node('small','exchange-quantity-preview');
   const button=node('button','exchange-submit','Tauschen');
   button.type='button';button.disabled=!usable()||maxBatch<1;
   const update=()=>{
    const count=Number(select.value)||1;
    preview.textContent=money(count*10)+' abgeben → '+money(count)+' erhalten';
    button.textContent=count===1?'1 × tauschen':count+' × tauschen';
   };
   select.addEventListener('change',update);
   if(qty.length){select.value='1';update();}
   else preview.textContent='Zu wenig Materialien';
   button.addEventListener('click',()=>{
    const count=Number(select.value);
    if(!usable()||!Number.isSafeInteger(count)||count<1||count>maxBatch)return;
    if(count===1)void action('exchange',{resourceId:from[0]});
    else openExchangeConfirm(from[0],count);
   });
   controls.append(select,preview,button);row.append(controls);list.append(row);
  }
  root.append(list);
  root.append(node('p','upgrade-foot',
   'Jeder Mehrfachtausch wird einmalig in einer sicheren Servertransaktion verarbeitet.'));
 }
 function render(){
  const all=view?.items?.filter(x=>x.group===tab)||[];
  if(tab!=='exchange'&&all.length){
   const available=all.filter(x=>canUpgradeItem(x.id));
   if(readyOnly&&available.length&&!available.some(x=>x.id===selected))selected=available[0].id;
   else if(!all.some(x=>x.id===selected))selected=(readyOnly&&available.length?available[0]:all[0]).id;
  }
  const toolbar=$('forge-list-toolbar');toolbar.hidden=tab==='exchange';
  const readyCount=(merchantMode?all:(view?.items||[])).filter(x=>canUpgradeItem(x.id)).length;
  $('forge-ready-count').textContent=String(readyCount);
  const filter=$('forge-ready-filter');filter.disabled=!view||busy;
  filter.setAttribute('aria-pressed',String(readyOnly));
  filter.classList.toggle('active',readyOnly);
  $('forge-list-summary').textContent=view?
   readyCount+' von '+(merchantMode?all.length:(view?.items||[]).length)+' bereit':'Verbesserungen laden …';
  for(const button of document.querySelectorAll('.forge-tab')){
   const isActive=button.dataset.tab===tab;
   button.classList.toggle('active',isActive);
   button.setAttribute('aria-selected',String(isActive));
  }
  const currentAccount=auth()?.user?.uid===uid;
  $('forge-retry-wrap').hidden=!currentAccount||!pending(uid);
  $('forge-retry').disabled=!currentAccount||!uid||busy;
  $('forge-refresh').disabled=busy;
  header();renderList();merchantMode?renderExchange():renderUpgrade();renderGoal();renderChronicle();renderStock();renderGallery();
  if(!merchantMode&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')
   window.dispatchEvent(new CustomEvent('dog-forge-view',{detail:{uid,view,busy}}));
 }
 const closeModal=()=>{const dialog=$('forge-result');if(dialog.open)dialog.close();};
 function resultDialog(result,newlyUnlocked=[]){
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
   subtitle=success?displayName(item)+' · Stufe '+result.newLevel:
    'Rohstoffe verbraucht · Stufe '+result.newLevel+' bleibt';
   achievement=success?(before!==after&&equip?'✦ NEUE AUSSEHENSSTUFE ✦':'STUFE '+result.oldLevel+'  ➜  '+result.newLevel):
    'STUFE '+result.oldLevel+' BLEIBT';
  }else if(result.type==='exchange'){
   const from=material[result.from],to=material[result.to];
   art.append(node('span','skill-result-emblem','💎'));
   subtitle=money(result.spent||10)+' × '+(from?.name||result.from)+
    ' → '+money(result.received||1)+' × '+(to?.name||result.to);
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
  const reward=$('forge-result-new-unlock'),openRewards=$('forge-result-gallery');
  const hasReward=newlyUnlocked.length>0;
  reward.hidden=!hasReward;openRewards.hidden=!hasReward;
  if(hasReward){
   reward.textContent='🏆 Neu freigeschaltet: '+newlyUnlocked.map(m=>m.title).join(' · ')+
    ' – Titel und Rahmen jetzt in deiner Galerie!';
  }else reward.textContent='';
  if(!dialog.open)dialog.showModal();
 }
 // One in-flight GET per account. Auth switches still start a new account load.
 function reload(){
  const account=auth()?.user?.uid||null;
  if(account&&loadingUid===account&&loadingPromise)return loadingPromise;
  const work=loadNow();
  loadingUid=account;loadingPromise=work;
  void work.finally(()=>{if(loadingPromise===work){loadingUid=null;loadingPromise=null;}});
  return work;
 }
 async function loadNow(){
  const state=auth(),requestIndex=++loadSerial;
  if(!state){
   uid=null;view=null;goalId=null;lastLoadedAt=0;
   closeConfirm();closeExchangeConfirm();closeModal();
   status('Bitte melde dich mit deinem Online-Profil an, um die Schmiede zu nutzen.','bad');
   $('forge-player').textContent='Nicht angemeldet';render();return;
  }
  const account=state.user.uid;
  if(uid!==account){
   uid=account;view=null;lastLoadedAt=0;goalId=loadGoal(account);
   closeConfirm();closeExchangeConfirm();closeModal();
  }
  status('⚒️ Heldenwerte werden geladen …');
  render();
  try{
   const payload=await request('GET','me',null,account);
   if(uid!==account||requestIndex!==loadSerial)return;
   view=payload;lastLoadedAt=Date.now();
   status(pending(account)?'⚠️ Noch nicht bestätigte Aktion – bitte sicher wiederholen.':
    merchantMode?'💎 Händler bereit. Tausche Rohstoffe im Verhältnis 10 : 1.':
     '✦ Bereit. Wähle eine Waffe, Rüstung oder Fähigkeit.',
    pending(account)?'bad':'good');
  }catch(e){
   if(uid!==account||requestIndex!==loadSerial)return;
   view=null;lastLoadedAt=0;
   status('⚠️ Schmiede konnte nicht geladen werden. Prüfe die Serververbindung und aktualisiere.','bad');
  }
  render();
 }
 async function action(type,data,retry=false){
  if(busy||!uid||!view)return;
  const account=uid,startEpoch=sessionEpoch;
  if(auth()?.user?.uid!==account){void reload();return;}
  const old=pending(account);
  if(old&&!retry){status('Bitte zuerst die offene Aktion sicher wiederholen.','bad');return;}
  if(retry&&!old)return;
  const op=old||{id:newId(),action:type,payload:data};
  if(!old&&!savePending(account,op)){
   status('⚠️ Der Browser konnte die Auftragskennung nicht speichern. Kein Material wurde verbraucht. Bitte Speicherzugriff prüfen.','bad');
   return;
  }
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
   if(uid!==account||sessionEpoch!==startEpoch||auth()?.user?.uid!==account)
    throw Error('ACCOUNT_CHANGED');
   const beforeHero=view?.hero||null;
   clearPending(account);view=response;lastLoadedAt=Date.now();
   // Announce only newly completed milestones for this confirmed action.
   // Receipts recovered after reconnect never celebrate a second time.
   const unlocked=!response.replayed&&beforeHero&&view?.hero?
    MILESTONES.filter(m=>milestoneValue(m,beforeHero)<m.goal&&
     milestoneValue(m,view.hero)>=m.goal):[];
   status(response.replayed?'✓ Auftrag sicher wiederhergestellt.':'✓ Auftrag serverseitig gespeichert.','good');
   // Wait only for an optional local visual flourish, never for server authority.
   if(ceremonyStarted&&!response.replayed){
    try{await window.DogForgeCeremony?.finish?.(response.result);}catch{}
   }
   if(uid!==account)return;
   resultDialog(response.result,unlocked);
  }catch(e){
   try{window.DogForgeCeremony?.abort?.();}catch{}
   if(uid!==account)return;
   const error=e.message;
   if(['STALE_FORGE_LEVEL','DOG_MATERIALS_MISSING','FORGE_MAX_LEVEL','DOG_FORGE_BOSS_REQUIRED','INVALID_FORGE_ITEM',
    'INVALID_EXCHANGE_RESOURCE','INVALID_EXCHANGE_COUNT','DOG_MATERIALS_LIMIT',
    'INVALID_FORGE_REQUEST'].includes(error)){
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
   busy=false;$('forge-workspace').classList.remove('forging');
   if(sessionEpoch!==startEpoch||auth()?.user?.uid!==account){
    view=null;lastLoadedAt=0;goalId=null;
    closeConfirm();closeExchangeConfirm();closeModal();
    render();void reload();
   }else render();
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
 $('forge-goal-open').addEventListener('click',()=>{
  const item=itemFor(goalId);
  if(!item||busy)return;
  tab=item.group;selected=item.id;readyOnly=false;render();
  $('forge-workspace')?.scrollIntoView?.({block:'start',behavior:'smooth'});
 });
 $('forge-goal-clear').addEventListener('click',()=>setGoal(goalId));
 $('forge-exchange-confirm-x').addEventListener('click',closeExchangeConfirm);
 $('forge-exchange-confirm-cancel').addEventListener('click',closeExchangeConfirm);
 $('forge-exchange-confirm').addEventListener('close',()=>{exchangeConfirmData=null;});
 $('forge-exchange-confirm-submit').addEventListener('click',()=>{
  const req=exchangeConfirmData;
  if(!req||!usable())return;
  const group=MATERIALS.find(g=>g.values.some(x=>x[0]===req.resourceId));
  const idx=group?.values.findIndex(x=>x[0]===req.resourceId)??-1;
  const to=idx>=0&&idx<4?group.values[idx+1][0]:null;
  if(!to||have(req.resourceId)<req.count*10||have(to)+req.count>1000000){
   closeExchangeConfirm();status('↻ Rohstoffbestand geändert. Bitte neu prüfen.','bad');
   void reload();return;
  }
  closeExchangeConfirm();
  void action('exchange',{resourceId:req.resourceId,count:req.count});
 });
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
 window.DogForgeState=()=>({uid,view,busy});
 window.DogForgeReload=()=>reload();
 $('forge-refresh').addEventListener('click',()=>void reload());
 $('forge-retry').addEventListener('click',()=>{
  const op=pending(uid);
  if(op)void action(op.action,op.payload,true);
 });
 $('forge-result-x').addEventListener('click',closeModal);
 $('forge-result-ok').addEventListener('click',closeModal);
 $('forge-result-gallery').addEventListener('click',()=>{
  closeModal();
  window.DogForgeGallery?.open?.();
 });
 window.addEventListener('dog-forge-gallery-ready',()=>renderGallery());
 // Reduce Firestore reads on repetitive auth notifications and quick tab returns.
 function refreshIfStale(){
  const account=auth()?.user?.uid||null;
  if(account!==uid||!view||Date.now()-lastLoadedAt>45000)void reload();
  else{header();renderGallery();}
 }
 function onAuthChanged(){
  const account=auth()?.user?.uid||null;
  if(busy){
   if(account!==uid){
    sessionEpoch++;
    view=null;goalId=null;lastLoadedAt=0;
    closeConfirm();closeExchangeConfirm();closeModal();
    try{window.DogForgeCeremony?.abort?.();}catch{}
    render();
    status('↻ Spielerprofil gewechselt. Der alte Auftrag bleibt für dieses Profil sicher wiederholbar.','bad');
   }
   return;
  }
  refreshIfStale();
 }
 window.addEventListener('spielonline-change',onAuthChanged);
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&!busy)refreshIfStale();
 });
 render();void reload();
})();
