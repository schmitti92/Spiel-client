// Host economy panel shared by the Deal studio and lobby.
(()=>{
 'use strict';
 const DEFAULT={prices:{doubleBoost:300000000,dogSmall:200000000,dogLarge:400000000,dogPremium:600000000,dogPlatinum:2000000000,goldRare:25000000,goldLegendary:150000000},doubleBoostEnabled:true,packsEnabled:true,revision:0};
 const FIELDS=[
  ['doubleBoost','💎 ×2-Auszahlungsbonus'],
  ['dogSmall','🎁 DOG Normalpaket'],
  ['dogLarge','🥇 DOG Goldpaket'],
  ['dogPremium','👑 DOG Premiumpaket'],
  ['dogPlatinum','💠 DOG Platinpaket'],
  ['goldRare','🎴 Goldstudio Seltenes Paket'],
  ['goldLegendary','🌟 Goldstudio Legendäres Paket']
 ];
 const room=new URLSearchParams(location.search).get('room')?.toUpperCase()||'';
 const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const inLobby=location.pathname.endsWith('lobby.html');
 const parent=inLobby?document.querySelector('.lobby-shortcuts'):document.querySelector('.studio-header-controls');
 let current=structuredClone(DEFAULT),isHost=false,loadedUid='',loading=null,busy=false,dirty=false,lastFocus=null;
 const active=()=>{const state=window.SpielOnline?.state?.();return state?.status==='online'&&state.user?.getIdToken?state.user:null};
 const euros=c=>(c/100).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
 function emit(config){window.dispatchEvent(new CustomEvent('deal-economy-updated',{detail:config}));}
 function apply(config){
  if(!config?.prices)return;
  if((Number(config.revision)||0)<(Number(current.revision)||0))return;
  current=config;emit(current);
  if(!dirty&&!dialog.hidden)fill(current);
 }
 window.DealEconomy={current:()=>current,load:force=>load(Boolean(force))};
 if(!parent||!/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room))return;
 const trigger=document.createElement('button');
 trigger.type='button';trigger.className=(inLobby?'button ':'studio-tool ')+'deal-economy-trigger';
 trigger.textContent='⚙️ Host-Preise';trigger.title='Preise und Spielwirtschaft einstellen – nur für den Raumhost';
 trigger.hidden=true;parent.append(trigger);
 const backdrop=document.createElement('div');backdrop.className='deal-economy-backdrop';backdrop.hidden=true;
 const dialog=document.createElement('section');dialog.className='deal-economy-modal';dialog.hidden=true;
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','deal-economy-title');
 dialog.innerHTML='<div class="deal-economy-head"><div><small>GOLDSTUDIO · HOSTVERWALTUNG</small><h2 id="deal-economy-title">⚙️ Preise & Einstellungen</h2></div><button class="deal-economy-close" type="button" aria-label="Schließen">✕</button></div><p class="deal-economy-note">Diese Preise gelten global für alle Spieler und alle Räume. Käufe werden immer vom Server geprüft. Änderungen betreffen keine bereits bezahlten Käufe.</p><form id="deal-economy-form"><div class="deal-economy-fields"></div><div class="deal-economy-switches"><label><input name="doubleBoostEnabled" type="checkbox"> 💎 ×2-Bonus anbieten</label><label><input name="packsEnabled" type="checkbox"> 🎴 Kartenpakete zum Kauf anbieten</label></div><p class="deal-economy-status" role="status" aria-live="polite"></p><div class="deal-economy-actions"><button type="button" class="deal-economy-reset">↺ Standardpreise</button><button type="submit" class="deal-economy-save">✓ Speichern</button></div></form>';
 const form=dialog.querySelector('form'),fields=dialog.querySelector('.deal-economy-fields'),status=dialog.querySelector('.deal-economy-status');
 for(const [key,label] of FIELDS){
  const entry=document.createElement('label');entry.className='deal-economy-field';
  const name=document.createElement('span');name.textContent=label;
  const unit=document.createElement('div');unit.className='deal-economy-input';
  const field=document.createElement('input');field.type='number';field.name=key;field.min='0';field.max='50000000';field.step='1';field.required=true;field.inputMode='numeric';
  const eur=document.createElement('strong');eur.textContent='€';
  unit.append(field,eur);entry.append(name,unit);fields.append(entry);
 }
 document.body.append(backdrop,dialog);
 const close=()=>{dialog.hidden=true;backdrop.hidden=true;document.body.classList.remove('deal-economy-open');dirty=false;(lastFocus||trigger).focus()};
 const fill=value=>{
  for(const [key] of FIELDS)form.elements.namedItem(key).value=String(Math.round(value.prices[key]/100));
  form.elements.namedItem('doubleBoostEnabled').checked=value.doubleBoostEnabled!==false;
  form.elements.namedItem('packsEnabled').checked=value.packsEnabled!==false;
  dirty=false;
 };
 function open(){
  if(!isHost||busy)return;
  lastFocus=document.activeElement;fill(current);
  dialog.hidden=false;backdrop.hidden=false;document.body.classList.add('deal-economy-open');
  status.textContent='Aktueller Stand · '+(current.updatedAt?new Date(current.updatedAt).toLocaleString('de-DE'):'Standardpreise');
  dialog.querySelector('.deal-economy-close').focus();
 }
 trigger.onclick=open;
 dialog.querySelector('.deal-economy-close').onclick=close;backdrop.onclick=close;
 document.addEventListener('keydown',event=>{if(dialog.hidden)return;if(event.key==='Escape'){event.preventDefault();close();}});
 form.oninput=()=>{dirty=true;status.textContent='Ungespeicherte Änderungen';};
 dialog.querySelector('.deal-economy-reset').onclick=()=>{
  fill(DEFAULT);dirty=true;status.textContent='Standardwerte vorgemerkt – zum Übernehmen speichern.';
 };
 async function send(method,body){
  const u=active();if(!u)throw Error('Bitte anmelden.');
  const token=await u.getIdToken();
  const res=await fetch(api+'/api/deal-or-no-deal/'+encodeURIComponent(room)+'/economy',{
   method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
   cache:'no-store',body:body?JSON.stringify(body):undefined
  });
  let json;try{json=await res.json()}catch{throw Error('Serverantwort unlesbar');}
  if(!res.ok||!json.ok)throw Error(json.error||'SERVER_ERROR');
  return json;
 }
 async function load(force=false){
  const u=active();if(!u||!room)return;
  if(!force&&loadedUid===u.uid)return;
  if(loading)return loading;
  loading=(async()=>{
   try{
    const data=await send('GET');
    if(active()?.uid!==u.uid)return;
    loadedUid=u.uid;isHost=data.isHost===true;trigger.hidden=!isHost;
    apply(data.economy);
   }catch(e){
    if(force)throw e;
    console.warn('Host economy:',e.message);
    trigger.hidden=true;
   }
  })();
  try{return await loading}finally{loading=null}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!isHost)return;
  const prices={};
  for(const [key] of FIELDS){
   const input=form.elements.namedItem(key),value=Number(input.value);
   if(!input.value.trim()||!Number.isSafeInteger(value)||value<0||value>50000000){status.textContent='Bitte für alle Preise ganze Eurobeträge von 0 bis 50.000.000 eingeben.';input.focus();return}
   prices[key]=value*100;
  }
  busy=true;const save=dialog.querySelector('.deal-economy-save');save.disabled=true;status.textContent='⏳ Speichere Preise für alle Spieler …';
  try{
   const result=await send('POST',{prices,doubleBoostEnabled:form.elements.namedItem('doubleBoostEnabled').checked,packsEnabled:form.elements.namedItem('packsEnabled').checked});
   current=result.economy;dirty=false;emit(current);fill(current);
   status.textContent='✅ Einstellungen gespeichert · '+new Date(current.updatedAt).toLocaleString('de-DE');
   window.DogAlbumSeason2?.refresh?.();
  }catch(e){
   status.textContent='⚠️ Speichern fehlgeschlagen: '+e.message;
   if(e.message==='HOST_ONLY'){isHost=false;trigger.hidden=true}
  }finally{busy=false;save.disabled=false}
 });
 window.addEventListener('deal-economy-updated',event=>{
  if(event.detail!==current)apply(event.detail);
 });
 window.addEventListener('spielonline-change',()=>{
  const uid=active()?.uid||'';
  if(uid!==loadedUid){isHost=false;trigger.hidden=true;loadedUid='';current=structuredClone(DEFAULT);if(!uid&& !dialog.hidden)close();}
  if(uid)void load();
 });
 void load();
})();
