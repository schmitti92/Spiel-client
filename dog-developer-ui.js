/* Chris-only developer controls for the real DOG 100-Gates expedition.
 * Visibility is a convenience. Every action is protected by the server's
 * UID-bound pilot owner record, and all changes use Firestore transactions.
 */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const root=$('dog-developer-dialog'),open=$('dog-developer-open');
 if(!root||!open)return;
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const labels={iron:'Eisen',forge_coal:'Schmiedekohle',steel_core:'Stahlkern',
  mithril:'Mithril',dragonsteel:'Drachenstahl',wood:'Holz',stone:'Stein',
  crystal:'Kristall',rune:'Rune'};
 const state=()=>window.SpielOnline?.state?.();
 const logged=()=>{const s=state();return s?.status==='online'&&
  s.user?.uid&&typeof s.user?.getIdToken==='function'?s:null;};
 const isChris=()=>!!logged()&&
  String(state()?.profile?.name||'').trim().toLocaleLowerCase('de-DE')==='chris';
 let ready=false,busy=false,epoch=0,pending=null;
 const message=(value)=>{$('dog-developer-status').textContent=value;};
 const setBusy=value=>{
  busy=value;
  root.querySelectorAll('button[data-dev-preset],#dog-developer-prepare-boss,#dog-developer-add-materials,#dog-developer-cooldown')
   .forEach(button=>{button.disabled=value||!ready;});
 };
 async function api(method,route,body){
  const account=logged();
  if(!account)throw Error('LOGIN_REQUIRED');
  const uid=account.user.uid,token=await account.user.getIdToken();
  if(logged()?.user.uid!==uid)throw Error('ACCOUNT_CHANGED');
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timeout=controller?setTimeout(()=>controller.abort(),18000):null;
  try{
   const response=await fetch(API+'/api/dog/developer/'+route,{
    method,cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),...(controller?{signal:controller.signal}:{})
   });
   const data=await response.json().catch(()=>({ok:false,error:'DOG_DEVELOPER_UNAVAILABLE'}));
   if(logged()?.user.uid!==uid)throw Error('ACCOUNT_CHANGED');
   if(!response.ok||data.ok!==true)throw Error(data.error||'DOG_DEVELOPER_UNAVAILABLE');
   return data;
  }finally{if(timeout!==null)clearTimeout(timeout);}
 }
 const id=()=> 'dev-'+(globalThis.crypto?.randomUUID?.()||
  Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,15));
 function setResourceOptions(resources){
  const picker=$('dog-developer-resource'),selected=picker.value;
  picker.replaceChildren();
  const all=document.createElement('option');all.value='all';all.textContent='Alle 15 Rohstoffarten';picker.append(all);
  for(const [i,resource] of resources.entries()){
   const opt=document.createElement('option');opt.value=resource;
   opt.textContent=labels[resource]||resource.replaceAll('_',' ').replace(/^./,x=>x.toUpperCase());
   picker.append(opt);
  }
  if([...picker.options].some(x=>x.value===selected))picker.value=selected;
 }
 async function checkAccess(){
  const version=++epoch;
  open.hidden=!isChris();
  ready=false;setBusy(false);
  if(open.hidden){if(root.open)root.close();return;}
  message('Prüfe den privaten Entwicklerzugang …');
  try{
   const result=await api('GET','status');
   if(version!==epoch)return;
   ready=result.botsReady===true;
   $('dog-developer-bots-warning').hidden=ready;
   if(Array.isArray(result.resources))setResourceOptions(result.resources);
   const noWait=result.bossCooldownDisabled===true;
   $('dog-developer-cooldown').checked=noWait;
   $('dog-developer-cooldown-state').textContent=noWait?
    '✅ Testmodus: Bosskämpfe ohne zehn Minuten Wartezeit':
    '⏱️ Normale Boss-Pause: 10 Minuten nach einer Niederlage';
   message(ready?'✅ Entwicklerzugang bestätigt. Du kannst Tore, Bosse und Rohstoffe testen.':
    '🔐 Bitte zuerst Nova und Titan im 100-Tore-Event mit dem privaten Freigabecode hinzufügen.');
  }catch(error){
   if(version!==epoch)return;
   ready=false;
   $('dog-developer-bots-warning').hidden=false;
   message(error.message==='DOG_DEVELOPER_NOT_AVAILABLE'?
    '🔐 Der private Entwicklerzugang muss erst über „Zwei Testspieler hinzufügen“ aktiviert werden.':
    '⚠️ Entwicklerzugang derzeit nicht erreichbar: '+error.message);
  }finally{if(version===epoch)setBusy(false);}
 }
 async function apply(inputs,label,needsConfirm){
  if(busy||!ready)return;
  if(needsConfirm&&!window.confirm(
   label+'? Dieser Test ersetzt den gespeicherten Torstand von Chris, Nova und Titan einschließlich späterer Boss-Siege.'))return;
  const serialized=JSON.stringify(inputs);
  if(pending?.serialized!==serialized)pending={serialized,requestId:id()};
  setBusy(true);message('⏳ '+label+' – speichere serverseitig …');
  try{
   const result=await api('POST','apply',{...inputs,requestId:pending.requestId});
   pending=null;
   message(inputs.action==='cooldown'?
    (inputs.disabled?'✅ Die Boss-Pause ist deaktiviert. Sofortiger neuer Versuch möglich.':
     '✅ Die normale 10-Minuten-Boss-Pause ist wieder aktiv.'):
    inputs.action==='materials'?
    '✅ Testmaterialien erfolgreich gutgeschrieben. Öffne das Rohstofflager oder die Schmiede.':
    '✅ '+label+'! Die Tor-Karte und die Boss-Arena sind jetzt vorbereitet.');
   window.dispatchEvent(new Event('dog-developer-updated'));
  }catch(error){
   message(error.message==='DOG_DEVELOPER_FIGHT_ACTIVE'?
    '⏳ Ein Gruppenboss-Kampf läuft noch. Beende ihn zuerst, dann erneut versuchen.':
    '⚠️ Änderung nicht gespeichert: '+error.message+' · Bei unsicherer Verbindung dieselbe Aktion erneut drücken.');
  }finally{setBusy(false);}
 }
 open.addEventListener('click',()=>{
  if(!isChris())return;
  if(typeof root.showModal==='function')root.showModal();
  else root.open=true;
  void checkAccess();
 });
 $('dog-developer-close').addEventListener('click',()=>root.close());
 root.querySelectorAll('[data-dev-preset]').forEach(button=>{
  button.addEventListener('click',()=>{
   const gate=Number(button.dataset.devPreset);
   if(![9,19,99].includes(gate))return;
   void apply({action:'preset',gate},gate===99?'Alle Tore bis 99 freischalten':'Bis Tor '+gate+' freischalten',true);
  });
 });
 $('dog-developer-prepare-boss').addEventListener('click',()=>{
  const gate=Number($('dog-developer-boss').value);
  if(!Number.isInteger(gate)||gate<10||gate>100||gate%10!==0)return;
  void apply({action:'boss',gate},'Boss '+gate+' vorbereiten',true);
 });
 $('dog-developer-cooldown').addEventListener('change',event=>{
  const disabled=event.target.checked;
  // The server owns the setting. Re-read its confirmed value after a
  // successful change or a network error; do not trust an unsaved click.
  void apply({action:'cooldown',disabled},
   disabled?'10-Minuten-Boss-Pause ausschalten':'10-Minuten-Boss-Pause einschalten',false)
   .finally(()=>void checkAccess());
 });
 $('dog-developer-add-materials').addEventListener('click',()=>{
  const resource=$('dog-developer-resource').value,amount=Number($('dog-developer-amount').value);
  if(![10,100,1000].includes(amount))return;
  void apply({action:'materials',resource,amount},'Rohstoffe hinzufügen',false);
 });
 window.addEventListener('spielonline-change',()=>void checkAccess());
 window.addEventListener('dog-developer-updated',()=>{if(isChris())void checkAccess();});
 setTimeout(()=>void checkAccess(),1250);
 void checkAccess();
})();
