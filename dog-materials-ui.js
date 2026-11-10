/* DOG material chest client. Server-owned inventory only: no local rewards. */
(()=>{'use strict';
 const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const $=id=>document.getElementById(id);
 const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('de-DE');
 const ITEM=Object.freeze({
  iron:{icon:'🪨',name:'Eisenerz'},
  crystal:{icon:'💎',name:'Kristalle'},
  rune:{icon:'✨',name:'Runensteine'}
 });
 let currentUid=null,inventory=null,busy=false,loadIndex=0;
 const auth=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s.user?.uid&&s.profile?.setupComplete!==false?s:null;
 };
 const keyFor=uid=>'dog:materials:pending-open:'+uid;
 function getPending(uid){
  try{const v=localStorage.getItem(keyFor(uid));return v&&/^[A-Za-z0-9_-]{12,90}$/.test(v)?v:null}
  catch{return null}
 }
 function storePending(uid,id){
  try{localStorage.setItem(keyFor(uid),id)}catch{}
 }
 function clearPending(uid){
  try{localStorage.removeItem(keyFor(uid))}catch{}
 }
 function newId(){
  const random=globalThis.crypto?.randomUUID?.();
  if(random)return 'chest-'+random;
  // ID is for idempotency only; the authenticated server decides eligibility.
  return 'chest-'+Date.now()+'-'+Math.random().toString(36).slice(2,14);
 }
 const message=(text,type='')=>{
  $('status').textContent=text;
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
 function renderInventory(){
  const canOpen=!!currentUid&&!!inventory&&inventory.unopened>0&&!busy;
  $('open-chest').disabled=!canOpen;
  $('open-chest').textContent=getPending(currentUid||'')?'↻ Öffnung sicher wiederholen':'✨ Kiste öffnen';
  $('refresh').disabled=busy;
  $('chest-art').classList.toggle('has-box',canOpen);
  $('chest-art').textContent=inventory?.unopened?'🧰':'📦';
  $('chest-art').setAttribute('aria-label',inventory?.unopened?'Ungeöffnete Materialienkiste':'Keine ungeöffnete Kiste');
  $('chest-count').textContent=inventory?fmt(inventory.unopened):'–';
  $('chest-description').textContent=inventory?.unopened===1?'1 ungeöffnete Kiste wartet auf dich':
   inventory?.unopened>1?fmt(inventory.unopened)+' ungeöffnete Kisten in deinem Profil':
    'Noch keine Kiste – spiele eine bestätigte Online-Partie';
  for(const kind of ['iron','crystal','rune'])$(kind).textContent=inventory?fmt(inventory.resources?.[kind]):'–';
  $('earned').textContent=inventory?'Verdiente Kisten: '+fmt(inventory.earned)+' · Geöffnete Kisten: '+fmt(inventory.opened):
   'Verdiente Kisten: – · Geöffnete Kisten: –';
  const history=$('history');history.replaceChildren();
  if(!inventory?.recent?.length){
   const li=document.createElement('li');
   li.textContent='Deine letzten sechs Schatzfunde erscheinen nach dem Öffnen hier.';
   history.append(li);return;
  }
  for(const item of inventory.recent.slice(0,6)){
   const li=document.createElement('li');
   const amount=document.createElement('strong');amount.textContent='🎁 '+fmt(item.count)+' Rohstoffe';
   const details=document.createElement('span');
   details.textContent=Object.entries(ITEM).filter(([kind])=>item.items?.[kind]>0)
    .map(([kind,meta])=>meta.icon+' '+fmt(item.items[kind])).join(' · ');
   li.append(amount,details);
   history.append(li);
  }
 }
 function renderReward(drop){
  const reward=$('reward');
  reward.hidden=false;
  $('reward-title').textContent=drop.count===1?'Ein Rohstoff für deine zukünftige Waffe!':
   fmt(drop.count)+' Rohstoffe für deine zukünftige Waffe!';
  const items=$('reward-items');items.replaceChildren();
  for(const [kind,meta] of Object.entries(ITEM)){
   if(!drop.items?.[kind])continue;
   const pill=document.createElement('span');pill.className='drop-pill';
   pill.textContent=meta.icon+' '+fmt(drop.items[kind])+' × '+meta.name;
   items.append(pill);
  }
 }
 async function reload(){
  const state=auth();
  const id=++loadIndex;
  if(!state){
   currentUid=null;inventory=null;busy=false;
   $('account').textContent='🔒 Bitte melde dich mit deinem Online-Spielerprofil an.';
   message('Ohne Online-Profil sind noch keine Kisten speicherbar. Anmeldung über das Spieleportal.');
   $('reward').hidden=true;renderInventory();return;
  }
  const uid=state.user.uid;
  if(currentUid!==uid){currentUid=uid;inventory=null;$('reward').hidden=true}
  $('account').textContent='👤 '+String(state.profile?.name||state.user?.displayName||'Online-Spieler');
  message('🔄 Kisten und Rohstoffe werden vom Server geladen …');
  renderInventory();
  try{
   const data=await request('GET','me',null,uid);
   if(id!==loadIndex||currentUid!==uid)return;
   inventory=data.inventory;
   const pending=getPending(uid);
   message(pending?'⚠️ Eine frühere Öffnung ist noch ungeklärt. Drücke „Öffnung sicher wiederholen“; es entsteht kein zweiter Gewinn.':
    inventory.unopened>0?'✨ Deine Kiste wartet! Jeder Gewinn wird dauerhaft im Online-Profil gespeichert.':
    '📦 Nach deiner nächsten bestätigten Barikade- oder KreuzKunter-Partie gibt es eine neue Kiste.',pending?'danger':'good');
  }catch(e){
   if(id!==loadIndex)return;
   message('⚠️ Inventar konnte nicht geladen werden. '+(
    e.message==='LOGIN_REQUIRED'?'Bitte anmelden.':'Prüfe deine Verbindung und drücke „Inventar aktualisieren“.'
   ),'danger');
  }
  renderInventory();
 }
 async function openChest(){
  const state=auth();if(!state||busy||!inventory)return;
  const uid=state.user.uid;
  let id=getPending(uid);
  if(!id&&inventory.unopened<=0)return;
  id=id||newId();
  storePending(uid,id);
  busy=true;renderInventory();
  $('reward').hidden=true;$('chest-art').classList.add('opening');
  message('⚒️ Der Server öffnet deine Kiste und bestimmt die Rohstoffe …');
  try{
   const result=await request('POST','open',{requestId:id},uid);
   if(currentUid!==uid)return;
   inventory=result.inventory;
   clearPending(uid);
   renderReward(result.drop);
   message(result.replayed?'✅ Die bereits abgeschlossene Kistenöffnung wurde sicher wiederhergestellt.':
    '🎉 Kiste geöffnet! Die Materialien liegen dauerhaft in deinem Inventar.','good');
  }catch(e){
   if(currentUid!==uid)return;
   if(['INVALID_REQUEST_ID','NO_DOG_CHESTS'].includes(e.message)){
    clearPending(uid);
    message(e.message==='NO_DOG_CHESTS'
     ?'📦 Keine ungeöffnete Kiste vorhanden. Inventar wird aktualisiert.'
     :'⚠️ Ungültige Kistenanfrage. Bitte erneut versuchen.','danger');
    await reload();
   }else{
    message('⚠️ Die Öffnung konnte nicht bestätigt werden. Über denselben Button wird die Aktion sicher wiederholt – ohne zusätzliche Kiste zu verbrauchen.','danger');
   }
  }finally{
   busy=false;$('chest-art').classList.remove('opening');renderInventory();
  }
 }
 $('open-chest').addEventListener('click',()=>void openChest());
 $('refresh').addEventListener('click',()=>void reload());
 window.addEventListener('spielonline-change',()=>void reload());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)void reload()});
 void reload();
})();
