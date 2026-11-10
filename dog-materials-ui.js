/* DOG – authenticated chest inventory: 5 expedition types + 3 legacy types. */
(()=>{'use strict';
 const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const $=id=>document.getElementById(id);
 const room=new URLSearchParams(location.search).get('room')||'';
 if(/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room)){
  $('dog-back-deal').href='./DealOrNoDeal/lobby.html?room='+encodeURIComponent(room)+'&stay=1';
  for(const id of ['forge-launch','forge-from-storage']){
   const link=$(id);if(link)link.href='./dog-forge.html?room='+encodeURIComponent(room);
  }
  for(const id of ['boss-launch','boss-from-storage']){
   const link=$(id);if(link)link.href='./dog-boss.html?room='+encodeURIComponent(room);
  }
  for(const id of ['map-launch','map-waypoint']){
   const link=$(id);if(link)link.href='./dog-tor-map.html?room='+encodeURIComponent(room);
  }
  for(const id of ['boss10-launch','boss10-waypoint']){
   const link=$(id);if(link)link.href='./dog-boss10.html?room='+encodeURIComponent(room);
  }
  for(const id of ['ascension-launch','ascension-waypoint']){
   const link=$(id);if(link)link.href='./dog-ascension.html?room='+encodeURIComponent(room);
  }
 }
 const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('de-DE');
 const EXPEDITION_TIERS=Object.freeze(['wood','iron','silver','gold','legendary']);
 const TIER=Object.freeze({
  wood:{label:'Holzkiste',icon:'🪵'},
  iron:{label:'Eisenkiste',icon:'🔩'},
  silver:{label:'Silberkiste',icon:'🥈'},
  gold:{label:'Goldkiste',icon:'🏆'},
  legendary:{label:'Legendäre Truhe',icon:'💎'},
  small:{label:'Kleine Rohstoffkiste (Bestand)',icon:'📦'},
  medium:{label:'Mittlere Rohstoffkiste (Bestand)',icon:'💎'},
  large:{label:'Große Rohstoffkiste (Bestand)',icon:'🐉'},
  legacy:{label:'Bestandskiste',icon:'🎁'}
 });
 const GROUPS=Object.freeze([
  {id:'attack',label:'⚔️ Angriffsfähigkeiten',items:[
   ['focus_dust','🌫️','Fokusstaub'],['power_crystal','💎','Kraftkristall'],['battle_essence','🔮','Kampfessenz'],
   ['war_rune','✨','Kriegsrune'],['soul_shard','🌟','Seelensplitter']]},
  {id:'defense',label:'🛡️ Verteidigungsfähigkeiten',items:[
   ['life_dust','🌿','Lebensstaub'],['guard_crystal','🪨','Schutzkristall'],['life_essence','💚','Lebensessenz'],
   ['guardian_rune','🔷','Wächterrune'],['phoenix_feather','🪽','Phönixfeder']]},
  {id:'equipment',label:'🔨 Waffen & Rüstung',items:[
   ['iron','🪨','Eisenerz'],['forge_coal','🪵','Schmiedekohle'],['steel_core','🔩','Stahlkern'],
   ['mithril','💠','Mithril'],['dragonsteel','🐉','Drachenstahl']]}
 ]);
 const RARITY=['Gewöhnlich','Ungewöhnlich','Selten','Episch','Legendär'];
 const META=Object.fromEntries(GROUPS.flatMap(group=>group.items.map(([id,icon,name],rarity)=>[
  id,{id,icon,name,group:group.id,rarity,label:RARITY[rarity]}
 ])));
 let currentUid=null,inventory=null,busy=false,loadIndex=0;
 const auth=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s.user?.uid&&s.profile?.setupComplete!==false?s:null;
 };
 const keyFor=uid=>'dog:materials:pending-open:'+uid;
 function getPending(uid){
  try{
   const stored=localStorage.getItem(keyFor(uid));
   if(!stored)return null;
   if(/^[A-Za-z0-9_-]{12,90}$/.test(stored))return {id:stored,tier:null};
   const data=JSON.parse(stored);
   if(data&&/^[A-Za-z0-9_-]{12,90}$/.test(data.id)&&
     (data.tier===null||Object.hasOwn(TIER,data.tier)))return data;
  }catch{}
  return null;
 }
 function storePending(uid,id,tier){
  try{
   const value=JSON.stringify({id,tier});
   localStorage.setItem(keyFor(uid),value);
   return localStorage.getItem(keyFor(uid))===value;
  }catch{return false}
 }
 function clearPending(uid){try{localStorage.removeItem(keyFor(uid))}catch{}}
 function newId(){
  const random=globalThis.crypto?.randomUUID?.();
  return random?'chest-'+random:'chest-'+Date.now()+'-'+Math.random().toString(36).slice(2,14);
 }
 const message=(value,type='')=>{
  $('status').textContent=value;
  $('status').className='status'+(type?' '+type:'');
 };
 async function request(method,route,body,uid){
  const s=auth();
  if(!s||s.user.uid!==uid)throw Error('LOGIN_REQUIRED');
  const token=await s.user.getIdToken();
  const response=await fetch(api+'/api/dog/materials/'+route,{
   method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   cache:'no-store',body:body?JSON.stringify(body):undefined
  });
  const result=await response.json().catch(()=>({error:'SERVER_UNAVAILABLE'}));
  if(!response.ok||!result?.ok){
   const error=new Error(result?.error||'SERVER_UNAVAILABLE');
   error.status=response.status;throw error;
  }
  if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
  return result;
 }
 function chestCounts(){
  if(!inventory)return {small:0,medium:0,large:0,legacy:0};
  return inventory.chests||{small:0,medium:0,large:0,legacy:inventory.unopened||0};
 }
 function expeditionCounts(){
  const totals=Object.fromEntries(EXPEDITION_TIERS.map(tier=>[tier,0]));
  for(const offer of inventory?.expeditionChests||[]){
   if(Object.hasOwn(totals,offer.tier))totals[offer.tier]+=offer.quantity||0;
  }
  return totals;
 }
 function normalizeItems(raw={}){
  const out={...raw};
  if(out.power_crystal===undefined&&out.crystal!==undefined)out.power_crystal=out.crystal;
  if(out.war_rune===undefined&&out.rune!==undefined)out.war_rune=out.rune;
  return out;
 }
 function createLootItem(key,count,{history=false}={}){
  const meta=META[key];
  if(!meta||!count)return null;
  const node=document.createElement('div');
  node.className='loot-item rarity-'+meta.rarity+(history?' history-loot':'');
  const icon=document.createElement('span');
  icon.className='loot-icon';icon.textContent=meta.icon;icon.setAttribute('aria-hidden','true');
  const title=document.createElement('span');
  title.className='loot-name';title.textContent=meta.name;
  const quantity=document.createElement('strong');
  quantity.className='loot-quantity';quantity.textContent='×'+fmt(count);
  const rarity=document.createElement('small');
  rarity.className='loot-rarity';rarity.textContent=meta.label;
  node.append(icon,title,quantity,rarity);
  return node;
 }
 function renderInventory(){
  const pending=getPending(currentUid||'');
  const chests=chestCounts(),expedition=expeditionCounts();
  const eligible=!!currentUid&&!!inventory&&!busy&&!pending;
  for(const tier of EXPEDITION_TIERS){
   $(tier+'-count').textContent=inventory?fmt(expedition[tier]):'–';
   $('open-'+tier).disabled=!eligible||!(expedition[tier]>0);
  }
  for(const tier of ['small','medium','large']){
   $(tier+'-count').textContent=inventory?fmt(chests[tier]||0):'–';
   $('open-'+tier).disabled=!eligible||!(chests[tier]>0);
  }
  const legacy=chests.legacy||0;
  $('legacy-crates').hidden=!inventory||legacy===0;
  $('legacy-count').textContent=fmt(legacy);
  $('open-legacy').disabled=!eligible||legacy===0;
  $('retry-wrap').hidden=!pending;
  $('retry-pending').disabled=!currentUid||busy;
  $('refresh').disabled=busy;
  const hasBoxes=!!inventory?.unopened;
  $('chest-art').classList.toggle('has-box',hasBoxes&&!busy);
  $('chest-art').textContent=hasBoxes?'🧰':'📦';
  $('chest-art').setAttribute('aria-label',hasBoxes?'Ungeöffnete Rohstoffkisten':'Keine ungeöffneten Kisten');
  $('chest-count').textContent=inventory?fmt(inventory.unopened):'–';
  $('chest-description').textContent=hasBoxes?
   (inventory.unopened===1?'1 ungeöffnete Kiste wartet auf dich':fmt(inventory.unopened)+' ungeöffnete Kisten warten auf dich'):
   'Noch keine Kiste – spiele Deal or No Deal online';
  $('earned').textContent=inventory?'Verdiente Kisten: '+fmt(inventory.earned)+' · Geöffnete Kisten: '+fmt(inventory.opened):
   'Verdiente Kisten: – · Geöffnete Kisten: –';
  const groups=$('resource-groups');
  groups.replaceChildren();
  const items=normalizeItems(inventory?.resources);
  for(const group of GROUPS){
   const section=document.createElement('section');section.className='inventory-group';
   const title=document.createElement('h3');title.textContent=group.label;section.append(title);
   const container=document.createElement('div');container.className='inventory-resources';
   for(const [key,icon,name] of group.items){
    const meta=META[key],node=document.createElement('div');
    node.className='resource-cell rarity-'+meta.rarity;
    const iconEl=document.createElement('span');iconEl.className='resource-icon';iconEl.textContent=icon;
    const amount=document.createElement('strong');amount.textContent=inventory?fmt(items[key]||0):'–';
    const label=document.createElement('small');label.textContent=name;
    node.append(iconEl,amount,label);container.append(node);
   }
   section.append(container);groups.append(section);
  }
  const history=$('history');history.replaceChildren();
  if(!inventory?.recent?.length){
   const li=document.createElement('li');li.textContent='Deine letzten sechs Schatzfunde erscheinen nach dem Öffnen hier.';
   history.append(li);return;
  }
  for(const item of inventory.recent.slice(0,6)){
   const li=document.createElement('li');
   const strong=document.createElement('strong');
   strong.textContent=(TIER[item.tier]?.icon||'🎁')+' '+fmt(item.count)+' Rohstoffe';
   const details=document.createElement('span');
   const normalized=normalizeItems(item.items);
   details.textContent=Object.entries(META).filter(([key])=>normalized[key]>0)
    .map(([key,meta])=>meta.icon+' '+fmt(normalized[key])).join(' · ');
   li.append(strong,details);history.append(li);
  }
 }
 function closeReward(){
  const dialog=$('reward-dialog');
  if(dialog.open)dialog.close();
 }
 function renderReward(drop){
  const dialog=$('reward-dialog'),tier=TIER[drop?.tier]||TIER.legacy;
  $('reward-title').textContent=tier.icon+' '+tier.label+' · '+fmt(drop.count)+' Rohstoffe';
  const area=$('reward-items');area.replaceChildren();
  const items=normalizeItems(drop.items);
  let epic=0,legendary=0;
  for(const group of GROUPS){
   const entries=group.items.filter(([key])=>items[key]>0);
   if(!entries.length)continue;
   const section=document.createElement('section');section.className='loot-group';
   const title=document.createElement('h3');title.textContent=group.label;
   const grid=document.createElement('div');grid.className='loot-grid';
   for(const [key] of entries){
    const element=createLootItem(key,items[key]);
    if(element)grid.append(element);
    if(META[key].rarity===3)epic+=items[key];
    if(META[key].rarity===4)legendary+=items[key];
   }
   section.append(title,grid);area.append(section);
  }
  const highlight=$('reward-highlight');
  highlight.hidden=!(epic||legendary);
  highlight.className='reward-highlight'+(legendary?' has-legendary':' has-epic');
  highlight.textContent=legendary?'🌟 Legendärer Fund! '+fmt(legendary)+' legendäre Rohstoffe':
   '✨ Epischer Fund! '+fmt(epic)+' epische Rohstoffe';
  if(!dialog.open)dialog.showModal();
 }
 async function reload(){
  const state=auth(),load=++loadIndex;
  if(!state){
   currentUid=null;inventory=null;busy=false;
   closeReward();
   $('account').textContent='🔒 Bitte melde dich mit deinem Online-Spielerprofil an.';
   message('Ohne Online-Profil sind noch keine Kisten speicherbar. Anmeldung über das Spieleportal.');
   renderInventory();return;
  }
  const uid=state.user.uid;
  if(currentUid!==uid){currentUid=uid;inventory=null;closeReward();}
  $('account').textContent='👤 '+String(state.profile?.name||state.user?.displayName||'Online-Spieler');
  message('🔄 Kisten und Rohstoffe werden vom Server geladen …');
  renderInventory();
  try{
   const data=await request('GET','me',null,uid);
   if(load!==loadIndex||currentUid!==uid)return;
   inventory=data.inventory;
   const pending=getPending(uid);
   message(pending?'⚠️ Eine Kistenöffnung ist noch ungeklärt. Bitte „Kistenöffnung sicher wiederholen“ wählen.':
    inventory.unopened>0?'📦 Deine Rohstoffkisten warten auf dich. Klicke die gewünschte Sorte zum Öffnen an.':
    '📦 Nach der nächsten abgeschlossenen Deal-or-No-Deal-Online-Partie gibt es eine neue Kiste.',
    pending?'danger':'good');
  }catch(e){
   if(load!==loadIndex)return;
   message('⚠️ Inventar konnte nicht geladen werden. '+(e.message==='LOGIN_REQUIRED'?
    'Bitte anmelden.':'Prüfe deine Verbindung und aktualisiere das Inventar.'),'danger');
  }
  renderInventory();
 }
 async function openChest(tier=null){
  const state=auth();
  if(!state||busy||!inventory)return;
  const uid=state.user.uid;
  const pending=getPending(uid);
  if(!pending&&(!tier||!((Object.hasOwn(TIER,tier)&&(
   EXPEDITION_TIERS.includes(tier)?expeditionCounts()[tier]:chestCounts()[tier]))>0)))return;
  const id=pending?.id||newId(),requestTier=pending?.tier??tier;
  if(!pending&&!storePending(uid,id,requestTier)){
   message('⚠️ Die Kistenöffnung konnte nicht sicher gespeichert werden. Bitte Speicherfunktion des Browsers prüfen.','danger');
   return;
  }
  busy=true;++loadIndex;
  renderInventory();closeReward();
  $('chest-art').classList.add('opening');
  message('⚒️ Deine Kiste wird vom Server geöffnet …');
  try{
   const result=await request('POST','open',
    {requestId:id,...(requestTier?{tier:requestTier}:{})},uid);
   if(currentUid!==uid)return;
   inventory=result.inventory;
   clearPending(uid);
   renderReward(result.drop);
   message(result.replayed?'✅ Die bereits abgeschlossene Kistenöffnung wurde sicher wiederhergestellt.':
    '🎉 Kiste geöffnet! Alle Rohstoffe sind im persönlichen Inventar gespeichert.','good');
  }catch(e){
   if(currentUid!==uid)return;
   if(['INVALID_REQUEST_ID','NO_DOG_CHESTS','NO_DOG_CHEST_TYPE','INVALID_DOG_CHEST_TIER'].includes(e.message)){
    clearPending(uid);
    message('⚠️ Kistensorte nicht verfügbar oder Anfrage ungültig. Das Inventar wird aktualisiert.','danger');
    await reload();
   }else{
    message('⚠️ Die Öffnung ist noch nicht bestätigt. Bitte „Kistenöffnung sicher wiederholen“ benutzen; du verbrauchst keine zweite Kiste.','danger');
   }
  }finally{
   busy=false;$('chest-art').classList.remove('opening');renderInventory();
  }
 }
 for(const tier of [...EXPEDITION_TIERS,'small','medium','large','legacy']){
  $('open-'+tier).addEventListener('click',()=>void openChest(tier));
 }
 $('retry-pending').addEventListener('click',()=>void openChest());
 $('close-reward').addEventListener('click',closeReward);
 $('close-reward-bottom').addEventListener('click',closeReward);
 $('refresh').addEventListener('click',()=>void reload());
 window.addEventListener('spielonline-change',()=>void reload());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)void reload();});
 void reload();
})();
