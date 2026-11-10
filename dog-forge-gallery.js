/* The 100 Gates — D4 personal hall of heroes.
 * Presentation only. Unlocks come exclusively from authenticated forge hero data.
 * Player-chosen cosmetics are stored locally per account; no combat bonuses or reads. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const dialog=$('forge-gallery'),openButton=$('forge-gallery-open');
 if(!dialog||!openButton)return;
 const PREF_PREFIX='dog:forge:gallery:v1:';
 const TITLES=Object.freeze([
  {id:'novice',name:'Schmiedelehrling',icon:'⚒️'},
  {id:'spark',name:'Hüter des ersten Funkens',icon:'🔥',milestone:'successes-1'},
  {id:'apprentice',name:'Lehrschmied der 100 Tore',icon:'🌟',milestone:'successes-10'},
  {id:'alchemist',name:'Alchemist der Runen',icon:'💎',milestone:'exchanges-10'},
  {id:'steel',name:'Träger der Stahlklinge',icon:'⚔️',milestone:'weapon-6'},
  {id:'rune',name:'Meister der Runenschmiede',icon:'🔮',milestone:'weapon-11'},
  {id:'master',name:'Meisterhand der Esse',icon:'🏅',milestone:'successes-50'},
  {id:'guardian',name:'Wächter der Hundert Tore',icon:'🛡️',milestone:'armor-20'},
  {id:'dragon',name:'Legendärer Drachenschmied',icon:'🐉',milestone:'weapon-20'},
  {id:'perfect',name:'Vollendeter Schmied',icon:'✨',milestone:'maxSkill-50'}
 ]);
 const FRAMES=Object.freeze([
  {id:'basic',name:'Einfacher Schmiederahmen',icon:'⚒️'},
  {id:'ember',name:'Glutrahmen',icon:'🔥',milestone:'successes-1'},
  {id:'silver',name:'Silberrahmen',icon:'🌟',milestone:'successes-10'},
  {id:'alchemist',name:'Kristallrahmen',icon:'💎',milestone:'exchanges-10'},
  {id:'steel',name:'Stahlrahmen',icon:'⚔️',milestone:'weapon-6'},
  {id:'rune',name:'Runenrahmen',icon:'🔮',milestone:'weapon-11'},
  {id:'gold',name:'Meisterrahmen',icon:'🏅',milestone:'successes-50'},
  {id:'guardian',name:'Wächterrahmen',icon:'🛡️',milestone:'armor-20'},
  {id:'dragon',name:'Drachenrahmen',icon:'🐉',milestone:'weapon-20'},
  {id:'astral',name:'Astralrahmen',icon:'✨',milestone:'maxSkill-50'}
 ]);
 const STAGE_NAMES=Object.freeze({
  weapon:['Schmiedeklinge','Stahlklinge','Runenklinge','Astralklinge','Drachenklinge'],
  armor:['Lederpanzer','Stahlpanzer','Runenrüstung','Astralrüstung','Drachenrüstung']
 });
 const stage=level=>level>=20?5:level>=16?4:level>=11?3:level>=6?2:1;
 const make=(tag,klass,content)=>{
  const e=document.createElement(tag);if(klass)e.className=klass;
  if(content!==undefined)e.textContent=String(content);return e;
 };
 const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('de-DE');
 let state=null,prefs={title:'auto',frame:'auto'};
 function readPrefs(uid){
  try{
   const raw=JSON.parse(localStorage.getItem(PREF_PREFIX+uid)||'null');
   return {title:typeof raw?.title==='string'?raw.title:'auto',
    frame:typeof raw?.frame==='string'?raw.frame:'auto'};
  }catch{return {title:'auto',frame:'auto'};}
 }
 function savePrefs(){
  if(!state?.uid)return;
  try{localStorage.setItem(PREF_PREFIX+state.uid,JSON.stringify(prefs));}catch{}
 }
 const unlockedSet=()=>new Set((state?.milestones||[]).filter(m=>m.unlocked).map(m=>m.id));
 const canUse=(reward,set)=>!reward.milestone||set.has(reward.milestone);
 function effective(catalog,selection,set){
  const chosen=catalog.find(e=>e.id===selection);
  if(chosen&&canUse(chosen,set))return chosen;
  return [...catalog].reverse().find(e=>canUse(e,set))||catalog[0];
 }
 function imageFor(id,level){
  const img=make('img','gallery-equip-image');
  img.src='./dog-forge-art/'+id+'-'+stage(level)+'.svg';
  img.alt='';
  img.loading='lazy';img.decoding='async';
  img.addEventListener('error',()=>{
   if(img.isConnected)img.replaceWith(make('span','gallery-equip-fallback',id==='weapon'?'⚔️':'🛡️'));
  },{once:true});
  return img;
 }
 function rewardProgress(reward){
  const milestone=(state?.milestones||[]).find(m=>m.id===reward.milestone);
  return milestone?fmt(Math.min(milestone.current,milestone.goal))+' / '+fmt(milestone.goal):'';
 }
 function updateBanner(title,frame){
  const name=$('forge-display-title'),emblem=$('hero-emblem');
  if(name)name.textContent=title.icon+' '+title.name;
  if(emblem){
   for(const reward of FRAMES)emblem.classList.remove('forge-frame-'+reward.id);
   emblem.classList.add('forge-frame-'+frame.id);
   emblem.setAttribute('data-frame-title',frame.name);
  }
  const galleryName=$('forge-gallery-current-title');
  if(galleryName)galleryName.textContent=title.icon+' '+title.name;
  const portrait=$('forge-gallery-portrait');
  if(portrait){
   portrait.className='gallery-hero-portrait forge-frame-'+frame.id;
   portrait.setAttribute('aria-label',frame.name+' mit deiner Rüstung');
  }
 }
 function choiceGrid(rootId,catalog,kind,set,actual){
  const root=$(rootId);root.replaceChildren();
  const auto=make('button','gallery-choice'+(prefs[kind]==='auto'?' selected':''),'✨ Automatisch');
  auto.type='button';auto.setAttribute('aria-pressed',String(prefs[kind]==='auto'));
  auto.append(make('small',null,'Höchster freigeschalteter '+(kind==='title'?'Titel':'Rahmen')));
  auto.addEventListener('click',()=>select(kind,'auto'));
  root.append(auto);
  for(const reward of catalog){
   const unlocked=canUse(reward,set);
   const selected=prefs[kind]===reward.id;
   const btn=make('button','gallery-choice'+(selected?' selected':'')+(unlocked?'':' locked'));
   btn.type='button';btn.disabled=!unlocked;
   btn.setAttribute('aria-pressed',String(selected));
   btn.append(make('span','gallery-choice-icon',unlocked?reward.icon:'🔒'));
   const info=make('span','gallery-choice-info');
   info.append(make('strong',null,reward.name));
   info.append(make('small',null,unlocked?'✓ Freigeschaltet':
    'Gesperrt · '+rewardProgress(reward)));
   btn.append(info);
   if(unlocked)btn.addEventListener('click',()=>select(kind,reward.id));
   root.append(btn);
  }
 }
 function renderDetail(set,title,frame){
  const portrait=$('forge-gallery-portrait');portrait.replaceChildren();
  portrait.append(imageFor('armor',Number(state.hero.levels?.armor)||1));
  $('forge-gallery-name').textContent=state.player||'Dein Held';
  $('forge-gallery-rank').textContent='✦ '+(state.rank||'Neuling');
  $('forge-gallery-milestone-count').textContent=
   (state.milestones||[]).filter(m=>m.unlocked).length+' / '+(state.milestones||[]).length;
  $('forge-gallery-success-count').textContent=fmt(state.hero.successes);
  const gear=$('forge-gallery-gear');gear.replaceChildren();
  for(const id of ['weapon','armor']){
   const level=Number(state.hero.levels?.[id])||1;
   const tile=make('div','gallery-gear-card gallery-gear-'+id);
   tile.dataset.stage=String(stage(level));
   const imageBox=make('div','gallery-gear-art');
   imageBox.append(imageFor(id,level));
   tile.append(imageBox,make('strong',null,STAGE_NAMES[id][stage(level)-1]),
    make('small',null,(id==='weapon'?'⚔️ Waffe':'🛡️ Rüstung')+' · Stufe '+level+' / 20'));
   gear.append(tile);
  }
  choiceGrid('forge-gallery-titles',TITLES,'title',set,title);
  choiceGrid('forge-gallery-frames',FRAMES,'frame',set,frame);
  const rewards=$('forge-gallery-rewards');rewards.replaceChildren();
  for(const m of state.milestones||[]){
   const tile=make('div','gallery-reward'+(m.unlocked?' unlocked':' locked'));
   tile.append(make('span','gallery-reward-icon',m.unlocked?m.icon:'🔒'));
   const details=make('span','gallery-reward-info');
   details.append(make('strong',null,m.title));
   details.append(make('small',null,m.unlocked?'✓ Belohnung freigeschaltet':
    fmt(m.current)+' / '+fmt(m.goal)));
   const track=make('span','gallery-reward-track'),fill=make('span');
   fill.style.width=Math.max(0,Math.min(100,Math.round(100*m.current/m.goal)))+'%';
   track.append(fill);details.append(track);tile.append(details);rewards.append(tile);
  }
 }
 function select(kind,id){
  if(!state?.uid||!state.hero)return;
  const catalog=kind==='title'?TITLES:FRAMES;
  const reward=catalog.find(x=>x.id===id);
  if(id!=='auto'&&(!reward||!canUse(reward,unlockedSet())))return;
  prefs[kind]=id;savePrefs();paint();
 }
 function paint(){
  if(!state?.hero||!state.uid){
   openButton.disabled=true;openButton.textContent='🏆 Heldengalerie';
   const title=$('forge-display-title');if(title)title.textContent='Schmiedelehrling';
   const emblem=$('hero-emblem');if(emblem){
    for(const reward of FRAMES)emblem.classList.remove('forge-frame-'+reward.id);
   }
   if(dialog.open)dialog.close();
   return;
  }
  openButton.disabled=false;openButton.textContent='🏆 Meine Heldengalerie';
  const unlocked=unlockedSet();
  const title=effective(TITLES,prefs.title,unlocked);
  const frame=effective(FRAMES,prefs.frame,unlocked);
  updateBanner(title,frame);
  if(dialog.open)renderDetail(unlocked,title,frame);
 }
 function render(payload){
  const next=payload?.uid&&payload?.hero?payload:null;
  // Frequent busy/selection redraws reuse the same authoritative hero object.
  // Avoid recreating gallery images and unlock cards for unchanged state.
  if(!next&&!state)return;
  if(next&&state&&next.uid===state.uid&&next.hero===state.hero&&
     next.rank===state.rank&&next.player===state.player)return;
  if(next?.uid!==state?.uid)prefs=next?readPrefs(next.uid):{title:'auto',frame:'auto'};
  state=next;
  paint();
 }
 function open(){
  if(!state?.uid||!state?.hero)return;
  if(!dialog.open)dialog.showModal();
  paint();
 }
 function close(){if(dialog.open)dialog.close();}
 openButton.addEventListener('click',open);
 $('forge-gallery-close').addEventListener('click',close);
 $('forge-gallery-done').addEventListener('click',close);
 window.DogForgeGallery=Object.freeze({render,open,close});
 window.dispatchEvent(new Event('dog-forge-gallery-ready'));
})();